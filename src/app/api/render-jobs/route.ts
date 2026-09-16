import { ZodError } from "zod";
import { createRenderJobSchema } from "@/lib/render-jobs/schema";
import { renderServiceFetch, renderServiceUnavailable } from "@/lib/render-jobs/service-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = createRenderJobSchema.parse(await request.json());
    const upstream = await renderServiceFetch("/renders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "JSONリクエストの形式が正しくありません。" }, { status: 400 });
    if (error instanceof ZodError) return Response.json({ error: "VideoPlanの形式が正しくありません。", details: error.issues }, { status: 400 });
    return renderServiceUnavailable();
  }
}
