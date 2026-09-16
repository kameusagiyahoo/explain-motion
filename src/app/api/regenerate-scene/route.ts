import { ZodError } from "zod";
import { regenerateScene } from "@/lib/ai/regenerateScene";
import { regenerateSceneRequestSchema } from "@/lib/video-plan/schema";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = regenerateSceneRequestSchema.parse(body);
    return Response.json(await regenerateScene(input));
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "JSONリクエストの形式が正しくありません。" }, { status: 400 });
    if (error instanceof ZodError) return Response.json({ error: "Scene再生成リクエストの形式が正しくありません。", details: error.issues }, { status: 400 });
    const message = error instanceof Error ? error.message : "Unknown error";
    const isRateLimit = /429|rate.?limit/i.test(message);
    const isTimeout = /timeout|timed out/i.test(message);
    return Response.json({ error: isRateLimit ? "OpenAI APIの利用上限に達しました。少し待って再試行してください。" : isTimeout ? "Scene再生成が時間内に完了しませんでした。" : "Sceneを再生成できませんでした。元のSceneは変更されていません。" }, { status: isRateLimit ? 429 : isTimeout ? 504 : 500 });
  }
}
