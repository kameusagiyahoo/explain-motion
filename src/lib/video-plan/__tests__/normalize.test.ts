import { describe, expect, it } from "vitest";
import { generateMockVideoPlan } from "@/lib/ai/mockVideoPlan";
import { durationOfScenes, normalizeVideoPlan } from "../normalize";

describe("normalizeVideoPlan", () => {
  it("keeps scene durations equal to the target and is idempotent", () => {
    const source = generateMockVideoPlan({ prompt: "DNAとは？", durationSeconds: 60, audience: "general", style: "simple", language: "ja" });
    const plan = normalizeVideoPlan({ ...source, scenes: source.scenes.map((scene) => ({ ...scene, durationSeconds: 2 })) });
    expect(durationOfScenes(plan)).toBe(60);
    expect(plan.scenes.every((scene) => scene.durationSeconds >= 2)).toBe(true);
    expect(normalizeVideoPlan(plan)).toEqual(plan);
  });
});
