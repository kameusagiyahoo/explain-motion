import { timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { ZodError } from "zod";
import { createRenderJobSchema } from "@/lib/render-jobs/schema";
import { RenderJobManager, RenderQueueFullError, type RenderRunner } from "./render-job-manager";

const projectRoot = process.cwd();
const port = readPositiveInteger("RENDER_SERVER_PORT", 4100);
const host = process.env.RENDER_SERVER_HOST?.trim() || "127.0.0.1";
const maxPending = readPositiveInteger("RENDER_MAX_PENDING", 3);
const retentionMinutes = readPositiveInteger("RENDER_RETENTION_MINUTES", 30);
const authToken = process.env.RENDER_API_TOKEN?.trim() ?? "";
if (!["127.0.0.1", "localhost", "::1"].includes(host) && !authToken) {
  throw new Error("RENDER_API_TOKEN is required when the render service listens outside localhost.");
}
const outputDir = path.resolve(projectRoot, "output", "jobs");
let bundlePromise: Promise<string> | null = null;

const runner: RenderRunner = async ({ plan, outputLocation, cancelSignal, onPhase, onProgress }) => {
  onPhase("bundling");
  bundlePromise ??= bundle({
    entryPoint: path.resolve(projectRoot, "src/remotion/index.ts"),
    enableCaching: true,
    onProgress: () => undefined,
    webpackOverride: (configuration) => ({
      ...configuration,
      resolve: {
        ...configuration.resolve,
        alias: { ...configuration.resolve?.alias, "@": path.resolve(projectRoot, "src") },
      },
    }),
  }).catch((error) => {
    bundlePromise = null;
    throw error;
  });
  const serveUrl = await bundlePromise;
  onPhase("rendering");
  const inputProps = { plan };
  const composition = await selectComposition({
    serveUrl,
    id: "ExplainMotion",
    inputProps,
    logLevel: "warn",
  });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps,
    cancelSignal,
    onProgress: ({ progress }) => onProgress(progress),
    logLevel: "warn",
  });
};

const manager = new RenderJobManager(runner, outputDir, maxPending, retentionMinutes * 60_000);
const cleanupTimer = setInterval(() => void manager.cleanupExpired(), 60_000);
cleanupTimer.unref();

const server = createServer(async (request, response) => {
  setSecurityHeaders(response);
  try {
    if (request.method === "GET" && request.url === "/health") {
      return json(response, 200, { ok: true });
    }
    if (!isAuthorized(request)) return json(response, 401, { error: "Unauthorized." });

    const url = new URL(request.url ?? "/", "http://render.local");
    if (request.method === "POST" && url.pathname === "/renders") {
      const input = createRenderJobSchema.parse(await readJson(request));
      return json(response, 202, { job: await manager.create(input.plan) });
    }

    const match = url.pathname.match(/^\/renders\/([0-9a-f-]{36})(\/download)?$/i);
    if (!match) return json(response, 404, { error: "Not found." });
    const id = match[1];
    if (match[2] === "/download" && request.method === "GET") {
      const filePath = manager.getDownloadPath(id);
      if (!filePath) return json(response, 404, { error: "Render output is not available." });
      const metadata = await stat(filePath);
      response.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": metadata.size,
        "Content-Disposition": `attachment; filename="explain-motion-${id}.mp4"`,
        "Cache-Control": "private, no-store",
      });
      createReadStream(filePath).pipe(response);
      return;
    }
    if (request.method === "GET") {
      const job = manager.get(id);
      return job ? json(response, 200, { job }) : json(response, 404, { error: "Render job was not found." });
    }
    if (request.method === "DELETE") {
      const job = await manager.cancel(id);
      return job ? json(response, 200, { job }) : json(response, 404, { error: "Render job was not found." });
    }
    return json(response, 405, { error: "Method not allowed." });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return json(response, 413, { error: error.message });
    if (error instanceof SyntaxError) return json(response, 400, { error: "Invalid JSON request." });
    if (error instanceof ZodError) return json(response, 400, { error: "Invalid VideoPlan.", details: error.issues });
    if (error instanceof RenderQueueFullError) return json(response, 429, { error: "Render queue is full. Try again later." });
    console.error(error);
    return json(response, 500, { error: "Render service failed to process the request." });
  }
});

server.listen(port, host, () => {
  console.log(`ExplainMotion render service listening on http://${host}:${port}`);
  if (!authToken) console.warn("RENDER_API_TOKEN is empty. This is allowed only for local development.");
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

function isAuthorized(request: IncomingMessage): boolean {
  if (!authToken) return true;
  const provided = request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedBuffer = Buffer.from(authToken);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new PayloadTooLargeError("Request body exceeds 1 MB.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
}

function readPositiveInteger(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

class PayloadTooLargeError extends Error {}
