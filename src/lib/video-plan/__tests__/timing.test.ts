import { describe, expect, it } from "vitest";
import { generateMockVideoPlan } from "@/lib/ai/mockVideoPlan";
import { normalizeVideoPlan } from "../normalize";
import { videoPlanSchema } from "../schema";
import { isVideoPlanV2, updateNarrationForScene } from "../timing";

const input = { prompt: "ブラックホールとは？", durationSeconds: 30 as const, audience: "beginner" as const, style: "tech" as const, language: "ja" as const };

describe("VideoPlan v2 timing", () => {
  it("generates one narration and timed captions for every scene", () => {
    const plan = generateMockVideoPlan(input);
    expect(isVideoPlanV2(plan)).toBe(true);
    if (!isVideoPlanV2(plan)) throw new Error("Expected VideoPlan v2.");
    expect(plan.narration.segments).toHaveLength(plan.scenes.length);
    expect(new Set(plan.captions.cues.map((cue) => cue.sceneId))).toEqual(new Set(plan.scenes.map((scene) => scene.id)));
    expect(plan.captions.cues.every((cue) => cue.startMs < cue.endMs && cue.endMs <= 30_000)).toBe(true);
  });

  it("retimes tracks after duration normalization and stays idempotent", () => {
    const source = generateMockVideoPlan(input);
    const plan = normalizeVideoPlan({ ...source, scenes: source.scenes.map((scene) => ({ ...scene, durationSeconds: 2 })) });
    expect(normalizeVideoPlan(plan)).toEqual(plan);
    if (!isVideoPlanV2(plan)) throw new Error("Expected VideoPlan v2.");
    let startMs = 0;
    for (const scene of plan.scenes) {
      const endMs = startMs + scene.durationSeconds * 1000;
      const segment = plan.narration.segments.find((item) => item.sceneId === scene.id);
      expect(segment?.startMs).toBeGreaterThanOrEqual(startMs);
      expect(segment?.endMs).toBeLessThanOrEqual(endMs);
      startMs = endMs;
    }
  });

  it("keeps version 1 plans valid", () => {
    const source = generateMockVideoPlan(input);
    if (!isVideoPlanV2(source)) throw new Error("Expected VideoPlan v2.");
    const legacy = videoPlanSchema.parse({ version: 1, title: source.title, language: source.language, fps: source.fps, durationSeconds: source.durationSeconds, style: source.style, scenes: source.scenes });
    expect(legacy.version).toBe(1);
  });

  it("regenerates cues when narration text changes", () => {
    const source = generateMockVideoPlan(input);
    if (!isVideoPlanV2(source)) throw new Error("Expected VideoPlan v2.");
    const sceneId = source.scenes[0].id;
    const updated = updateNarrationForScene(source, sceneId, "新しいナレーションです。字幕にも反映します。");
    expect(updated.narration.segments.find((item) => item.sceneId === sceneId)?.text).toContain("新しいナレーション");
    expect(updated.captions.cues.filter((cue) => cue.sceneId === sceneId).map((cue) => cue.text).join("")).toContain("字幕にも反映");
  });
});
