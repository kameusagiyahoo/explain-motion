import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { Readable } from "node:stream";
import { analyzedContentSchema, type AnalyzedContent, type ContentInput } from "./schema";

const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_CONTENT_CHARACTERS = 12_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 12_000;
const allowedContentTypes = ["text/html", "application/xhtml+xml", "text/plain"];

type ResolveHost = (hostname: string) => Promise<Array<{ address: string; family: number }>>;
type FetchUrl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type AnalyzeOptions = {
  fetchUrl?: FetchUrl;
  resolveHost?: ResolveHost;
};

export class ContentAnalysisError extends Error {
  constructor(message: string, readonly status = 422) {
    super(message);
    this.name = "ContentAnalysisError";
  }
}

export async function analyzeContent(input: ContentInput, options: AnalyzeOptions = {}): Promise<AnalyzedContent> {
  if (input.type === "text") {
    const text = normalizeWhitespace(input.text);
    return analyzedContentSchema.parse({
      inputType: "text",
      title: conciseTitle(text),
      text,
      excerpt: text.slice(0, 700),
      citations: [],
    });
  }

  const fetched = await fetchPublicDocument(input.url, options);
  const extracted = extractDocument(fetched.body, fetched.contentType);
  if (extracted.text.length < 80) {
    throw new ContentAnalysisError("URLから説明に十分な本文を抽出できませんでした。別のページを指定してください。");
  }
  const title = (extracted.title || new URL(fetched.url).hostname).slice(0, 200);
  return analyzedContentSchema.parse({
    inputType: "url",
    title,
    text: extracted.text.slice(0, MAX_CONTENT_CHARACTERS),
    excerpt: extracted.text.slice(0, 700),
    citations: [{ id: "source-1", title, url: fetched.url }],
  });
}

async function fetchPublicDocument(rawUrl: string, options: AnalyzeOptions) {
  const resolveHost = options.resolveHost ?? resolvePublicHost;
  let current = new URL(rawUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    await assertPublicUrl(current, resolveHost);
    let response: Response;
    try {
      const fetchUrl = options.fetchUrl ?? ((input, init) => fetchWithValidatedLookup(input, init, resolveHost));
      response = await fetchUrl(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
          "User-Agent": "ExplainMotion/0.1 (+https://github.com/kameusagiyahoo/explain-motion)",
        },
      });
    } catch (error) {
      if (error instanceof ContentAnalysisError) throw error;
      const timedOut = error instanceof Error && /timeout|aborted/i.test(error.message);
      throw new ContentAnalysisError(timedOut ? "URLの取得がタイムアウトしました。" : "URLを取得できませんでした。", timedOut ? 504 : 422);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new ContentAnalysisError("URLのリダイレクト先が不正です。");
      if (redirect === MAX_REDIRECTS) throw new ContentAnalysisError("URLのリダイレクト回数が上限を超えました。");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ContentAnalysisError(`URLの取得に失敗しました（HTTP ${response.status}）。`);
    }

    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (!allowedContentTypes.includes(contentType)) {
      await response.body?.cancel();
      throw new ContentAnalysisError("初版ではHTMLまたはプレーンテキストのURLのみ利用できます。");
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      await response.body?.cancel();
      throw new ContentAnalysisError("URLの内容が大きすぎます。1MB以下のページを指定してください。", 413);
    }
    return { url: current.toString(), contentType, body: await readLimitedBody(response) };
  }
  throw new ContentAnalysisError("URLを取得できませんでした。");
}

function fetchWithValidatedLookup(input: string | URL | Request, init: RequestInit | undefined, resolveHost: ResolveHost): Promise<Response> {
  const url = input instanceof Request ? new URL(input.url) : new URL(input.toString());
  const transport = url.protocol === "https:" ? https : http;
  const lookupForRequest: LookupFunction = (hostname, _options, callback) => {
    void resolveHost(hostname).then((addresses) => {
      if (addresses.length === 0) throw new ContentAnalysisError("URLのホスト名を解決できませんでした。");
      if (addresses.some(({ address }) => !isPublicAddress(address))) {
        throw new ContentAnalysisError("ローカルまたはプライベートネットワークのURLは利用できません。", 400);
      }
      if (_options.all) {
        callback(null, addresses);
        return;
      }
      const selected = addresses[0];
      callback(null, selected.address, selected.family);
    }).catch((error: unknown) => callback(error instanceof Error ? error : new Error("DNS lookup failed."), "", 4));
  };

  return new Promise((resolve, reject) => {
    const request = transport.request(url, {
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers)),
      lookup: lookupForRequest,
      signal: init?.signal ?? undefined,
    }, (response) => {
      const status = response.statusCode ?? 500;
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
        else if (value !== undefined) headers.set(name, String(value));
      }
      const body = [204, 205, 304].includes(status) ? null : Readable.toWeb(response) as ReadableStream<Uint8Array>;
      resolve(new Response(body, { status, statusText: response.statusMessage, headers }));
    });
    request.setTimeout(FETCH_TIMEOUT_MS, () => request.destroy(new Error("URL request timed out.")));
    request.on("error", reject);
    request.end();
  });
}

async function assertPublicUrl(url: URL, resolveHost: ResolveHost): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) throw new ContentAnalysisError("URLはhttpまたはhttpsを指定してください。", 400);
  if (url.username || url.password) throw new ContentAnalysisError("認証情報を含むURLは利用できません。", 400);
  if (url.port && !((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))) {
    throw new ContentAnalysisError("非標準ポートのURLは利用できません。", 400);
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new ContentAnalysisError("ローカルネットワークのURLは利用できません。", 400);
  }
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolveHost(hostname).catch(() => []);
  if (addresses.length === 0) throw new ContentAnalysisError("URLのホスト名を解決できませんでした。");
  if (addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new ContentAnalysisError("ローカルまたはプライベートネットワークのURLは利用できません。", 400);
  }
}

async function resolvePublicHost(hostname: string) {
  return lookup(hostname, { all: true, verbatim: true });
}

function isPublicAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) return isPublicAddress(normalized.slice(7));
  if (isIP(normalized) === 4) {
    const [a, b, c] = normalized.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0 && [0, 2].includes(c)) || (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (isIP(normalized) === 6) {
    const firstGroup = Number.parseInt(normalized.split(":")[0], 16);
    const globalUnicast = firstGroup >= 0x2000 && firstGroup <= 0x3fff;
    return globalUnicast && !normalized.startsWith("2001:0:") && !normalized.startsWith("2001:db8") && !normalized.startsWith("2002:");
  }
  return false;
}

async function readLimitedBody(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new ContentAnalysisError("URLの内容が大きすぎます。1MB以下のページを指定してください。", 413);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function extractDocument(body: string, contentType: string): { title: string; text: string } {
  if (contentType === "text/plain") return { title: "", text: normalizeWhitespace(body) };
  const title = stripTags(decodeEntities(firstMatch(body, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/iu) ||
    firstMatch(body, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/iu) ||
    firstMatch(body, /<title[^>]*>([\s\S]*?)<\/title>/iu) || firstMatch(body, /<h1[^>]*>([\s\S]*?)<\/h1>/iu)));
  const primary = firstMatch(body, /<article\b[^>]*>([\s\S]*?)<\/article>/iu) || firstMatch(body, /<main\b[^>]*>([\s\S]*?)<\/main>/iu) || body;
  const withoutNoise = primary
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<(script|style|noscript|svg|template|form|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
    .replace(/<(br|p|div|section|article|main|h[1-6]|li|tr)\b[^>]*>/giu, "\n")
    .replace(/<[^>]+>/gu, " ");
  return { title: normalizeWhitespace(title), text: normalizeWhitespace(decodeEntities(withoutNoise)) };
}

function firstMatch(value: string, pattern: RegExp): string {
  return value.match(pattern)?.[1] ?? "";
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/gu, " ");
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (entity, key: string) => {
    if (key.startsWith("#x")) return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
    if (key.startsWith("#")) return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
    return named[key.toLowerCase()] ?? entity;
  });
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/gu, "").replace(/[\t ]+/gu, " ").replace(/\n\s*\n+/gu, "\n").trim();
}

function conciseTitle(text: string): string {
  return text.split(/\n|[。！？!?]/u)[0].trim().slice(0, 200) || text.slice(0, 200);
}
