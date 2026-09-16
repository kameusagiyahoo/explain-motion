import { z } from "zod";
import { renderServiceFetch, renderServiceUnavailable } from "@/lib/render-jobs/service-client";

export const runtime = "nodejs";
const idSchema = z.string().uuid();
type Context = { params: Promise<{ id: string }> };

async function proxy(method: "GET" | "DELETE", context: Context): Promise<Response> {
  try {
    const id = idSchema.parse((await context.params).id);
    const upstream = await renderServiceFetch(`/renders/${id}`, { method });
    return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Render job IDが正しくありません。" }, { status: 400 });
    return renderServiceUnavailable();
  }
}

export function GET(_request: Request, context: Context) {
  return proxy("GET", context);
}

export function DELETE(_request: Request, context: Context) {
  return proxy("DELETE", context);
}
