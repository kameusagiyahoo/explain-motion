import { ZodError } from "zod";
import { generateVideoPlan } from "@/lib/ai/generateVideoPlan";
import { generatePlanRequestSchema } from "@/lib/video-plan/schema";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = generatePlanRequestSchema.parse(body);
    const result = await generateVideoPlan(input);
    return Response.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "JSONリクエストの形式が正しくありません。" }, { status: 400 });
    if (error instanceof ZodError) return Response.json({ error: "入力またはVideoPlanの形式が正しくありません。", details: error.issues }, { status: 400 });
    const message = error instanceof Error ? error.message : "Unknown error";
    const isRateLimit = /429|rate.?limit/i.test(message);
    const isTimeout = /timeout|timed out/i.test(message);
    return Response.json({ error: isRateLimit ? "OpenAI APIの利用上限に達しました。少し待って再試行してください。" : isTimeout ? "AIの応答が時間内に完了しませんでした。再試行してください。" : "VideoPlanを生成できませんでした。設定を確認して再試行してください。" }, { status: isRateLimit ? 429 : isTimeout ? 504 : 500 });
  }
}
