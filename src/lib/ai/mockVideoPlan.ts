import { normalizeVideoPlan } from "@/lib/video-plan/normalize";
import type { GeneratePlanRequest, VideoPlan } from "@/lib/video-plan/schema";

export function generateMockVideoPlan(input: GeneratePlanRequest): VideoPlan {
  const isBlackHole = /ブラックホール|black\s*hole/i.test(input.prompt);
  const subject = isBlackHole ? "ブラックホール" : input.prompt.replace(/[。！？!?]+$/u, "").slice(0, 42);

  return normalizeVideoPlan({
    version: 1,
    title: `${subject}とは？`,
    language: input.language,
    fps: 30,
    durationSeconds: input.durationSeconds,
    style: input.style,
    scenes: [
      { id: "scene-1", type: "title", durationSeconds: 4, headline: `${subject}とは？`, subheadline: isBlackHole ? "宇宙で最も不思議な天体" : "短時間で本質をつかむ" },
      { id: "scene-2", type: "text", durationSeconds: 4, headline: isBlackHole ? "重力が非常に強い" : "まず、核となる考え方", body: isBlackHole ? "ブラックホールでは光さえ脱出できません。" : `${subject}を、特徴・仕組み・意味の順に整理します。`, highlights: isBlackHole ? ["光さえ脱出できない"] : ["特徴", "仕組み", "意味"] },
      { id: "scene-3", type: "steps", durationSeconds: 5, headline: isBlackHole ? "生まれるまで" : "理解のステップ", steps: isBlackHole ? ["巨大な星", "核融合が停止", "重力崩壊", "ブラックホール"] : ["全体像を見る", "要素に分ける", "関係をつなぐ", "要点を確認"] },
      { id: "scene-4", type: "comparison", durationSeconds: 4, headline: "比べると違いが見える", left: { title: isBlackHole ? "普通の星" : "表面的な理解", body: isBlackHole ? "光が脱出できる" : "用語だけを覚える" }, right: { title: isBlackHole ? "ブラックホール" : "構造的な理解", body: isBlackHole ? "光も脱出できない" : "因果関係までつかむ" } },
      { id: "scene-5", type: "diagram", durationSeconds: 5, headline: isBlackHole ? "境界を越えると戻れない" : "概念のつながり", nodes: isBlackHole ? [{ id: "space", label: "宇宙空間", detail: "光が進む" }, { id: "horizon", label: "事象の地平面", detail: "戻れない境界" }, { id: "center", label: "中心", detail: "強い重力" }] : [{ id: "input", label: "問い", detail: "知りたいこと" }, { id: "model", label: "構造", detail: "関係を整理" }, { id: "insight", label: "理解", detail: "説明できる" }], edges: isBlackHole ? [{ from: "space", to: "horizon", label: "接近" }, { from: "horizon", to: "center", label: "落下" }] : [{ from: "input", to: "model", label: "分析" }, { from: "model", to: "insight", label: "説明" }] },
      { id: "scene-6", type: "number", durationSeconds: 3, value: isBlackHole ? 299792 : 3, suffix: isBlackHole ? " km/s" : "つ", label: isBlackHole ? "光の速度。それでも脱出できません" : "特徴・仕組み・意味で整理" },
      { id: "scene-7", type: "summary", durationSeconds: 5, headline: `${subject}の要点`, points: isBlackHole ? ["巨大な星から生まれる", "非常に強い重力を持つ", "光さえ脱出できない"] : ["全体像から始める", "要素と関係を分ける", "自分の言葉で説明する"] },
    ],
  });
}
