import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  regenerateSceneRequestSchema,
  regeneratedSceneOutputSchema,
  sceneSchema,
  type RegenerateSceneRequest,
  type Scene,
} from "@/lib/video-plan/schema";

export type SceneRegenerationResult = { scene: Scene; mode: "openai" | "mock" };

const clip = (value: string, length: number) => value.slice(0, length);

export function generateMockRegeneratedScene(scene: Scene): Scene {
  switch (scene.type) {
    case "title":
      return { ...scene, subheadline: clip(`${scene.subheadline ?? "ポイントを整理"} — ひと目で理解`, 120) };
    case "text":
      return { ...scene, body: clip(`${scene.body} つまり「${scene.headline}」が重要です。`, 180) };
    case "comparison":
      return { ...scene, headline: clip(`違いを整理: ${scene.headline}`, 80) };
    case "steps":
      return { ...scene, headline: clip(`流れで理解: ${scene.headline}`, 80) };
    case "diagram":
      return { ...scene, headline: clip(`図で整理: ${scene.headline}`, 80) };
    case "number":
      return { ...scene, label: clip(`注目すべき数字 — ${scene.label}`, 100) };
    case "summary":
      return { ...scene, headline: clip(`もう一度確認: ${scene.headline}`, 80) };
  }
}

const preserveIdentity = (original: Scene, candidate: Scene): Scene => {
  if (candidate.type !== original.type) {
    throw new Error(`Regenerated scene changed type from ${original.type} to ${candidate.type}.`);
  }
  return sceneSchema.parse({ ...candidate, id: original.id, durationSeconds: original.durationSeconds });
};

export async function regenerateScene(rawInput: RegenerateSceneRequest): Promise<SceneRegenerationResult> {
  const input = regenerateSceneRequestSchema.parse(rawInput);
  const original = input.plan.scenes[input.sceneIndex];
  if (!process.env.OPENAI_API_KEY) {
    return { scene: sceneSchema.parse(generateMockRegeneratedScene(original)), mode: "mock" };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 2 });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
    store: false,
    instructions: `You are revising one scene in an explanation video. Return only the structured scene wrapper. Preserve the scene type, id, and duration. Improve clarity, pacing, and concise on-screen wording for the requested audience. Never return React or executable code. Diagram edges must reference node ids in the same scene.`,
    input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify({
      originalRequest: input.prompt,
      audience: input.audience,
      video: { title: input.plan.title, language: input.plan.language, style: input.plan.style },
      previousScene: input.plan.scenes[input.sceneIndex - 1] ?? null,
      sceneToRevise: original,
      nextScene: input.plan.scenes[input.sceneIndex + 1] ?? null,
    }) }] }],
    text: { format: zodTextFormat(regeneratedSceneOutputSchema, "regenerated_scene") },
  });

  if (!response.output_parsed) throw new Error("OpenAI returned no regenerated scene.");
  const candidate = regeneratedSceneOutputSchema.parse(response.output_parsed).scene;
  return { scene: preserveIdentity(original, candidate), mode: "openai" };
}
