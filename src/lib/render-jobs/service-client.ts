const serviceUrl = process.env.RENDER_SERVICE_URL?.trim() || "http://127.0.0.1:4100";
const serviceToken = process.env.RENDER_API_TOKEN?.trim() || "";

export async function renderServiceFetch(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const headers = new Headers(init.headers);
  if (serviceToken) headers.set("Authorization", `Bearer ${serviceToken}`);
  return fetch(new URL(path, serviceUrl), {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export function renderServiceUnavailable(): Response {
  return Response.json(
    { error: "MP4レンダーサービスに接続できません。別ターミナルで npm run render:server を起動してください。" },
    { status: 503 },
  );
}
