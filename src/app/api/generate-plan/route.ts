import { ZodError } from "zod";
import { generateVideoPlan } from "@/lib/ai/generateVideoPlan";
import { analyzeContent, ContentAnalysisError } from "@/lib/content/analyzeContent";
import { generateFromContentRequestSchema, type PublicContentSource } from "@/lib/content/schema";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = generateFromContentRequestSchema.parse(body);
    const content = await analyzeContent(input.input);
    const result = await generateVideoPlan({
      prompt: content.title,
      durationSeconds: input.durationSeconds,
      audience: input.audience,
      style: input.style,
      language: input.language,
    }, content);
    const source: PublicContentSource = {
      inputType: content.inputType,
      title: content.title,
      excerpt: content.excerpt,
      citations: content.citations,
    };
    return Response.json({ ...result, source });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "JSONリクエストの形式が正しくありません。" }, { status: 400 });
    if (error instanceof ZodError) return Response.json({ error: "入力またはVideoPlanの形式が正しくありません。", details: error.issues }, { status: 400 });
    if (error instanceof ContentAnalysisError) return Response.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error ? error.message : "Unknown error";
    const isRateLimit = /429|rate.?limit/i.test(message);
    const isTimeout = /timeout|timed out/i.test(message);
    return Response.json({ error: isRateLimit ? "OpenAI APIの利用上限に達しました。少し待って再試行してください。" : isTimeout ? "AIの応答が時間内に完了しませんでした。再試行してください。" : "VideoPlanを生成できませんでした。設定を確認して再試行してください。" }, { status: isRateLimit ? 429 : isTimeout ? 504 : 500 });
  }
}
