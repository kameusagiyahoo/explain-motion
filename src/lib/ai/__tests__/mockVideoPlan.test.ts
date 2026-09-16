import { describe, expect, it } from "vitest";
import { generateMockVideoPlan } from "../mockVideoPlan";

describe("generateMockVideoPlan", () => {
  it("creates a playable black-hole plan without API access", () => { const plan = generateMockVideoPlan({ prompt: "ブラックホールとは？", durationSeconds: 30, audience: "beginner", style: "tech", language: "ja" }); expect(plan.durationSeconds).toBe(30); expect(new Set(plan.scenes.map((scene) => scene.type)).size).toBeGreaterThanOrEqual(4); expect(plan.scenes[0].type).toBe("title"); expect(plan.scenes.at(-1)?.type).toBe("summary"); });
});
