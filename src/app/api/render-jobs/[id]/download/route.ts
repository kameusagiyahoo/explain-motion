import { z } from "zod";
import { renderServiceFetch, renderServiceUnavailable } from "@/lib/render-jobs/service-client";

export const runtime = "nodejs";
const idSchema = z.string().uuid();
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).id);
    const upstream = await renderServiceFetch(`/renders/${id}/download`, {}, 120_000);
    const headers = new Headers();
    for (const name of ["content-type", "content-length", "content-disposition"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("Cache-Control", "private, no-store");
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Render job IDが正しくありません。" }, { status: 400 });
    return renderServiceUnavailable();
  }
}
