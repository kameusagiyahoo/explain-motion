import { describe, expect, it } from "vitest";
import { generateMockRegeneratedScene } from "../regenerateScene";
import { generateMockVideoPlan } from "../mockVideoPlan";
import { sceneSchema } from "@/lib/video-plan/schema";

describe("scene regeneration", () => {
  it("changes copy while preserving scene identity and duration", () => {
    const plan = generateMockVideoPlan({ prompt: "ブラックホールとは？", durationSeconds: 30, audience: "beginner", style: "tech", language: "ja" });
    for (const scene of plan.scenes) {
      const regenerated = sceneSchema.parse(generateMockRegeneratedScene(scene));
      expect(regenerated.id).toBe(scene.id);
      expect(regenerated.type).toBe(scene.type);
      expect(regenerated.durationSeconds).toBe(scene.durationSeconds);
      expect(regenerated).not.toEqual(scene);
    }
  });
});
