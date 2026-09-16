import { describe, expect, it } from "vitest";
import { generateMockVideoPlan } from "@/lib/ai/mockVideoPlan";
import { videoPlanSchema } from "../schema";

describe("videoPlanSchema", () => {
  it("accepts a valid discriminated VideoPlan", () => { const plan = generateMockVideoPlan({ prompt: "ブラックホールとは？", durationSeconds: 30, audience: "beginner", style: "tech", language: "ja" }); expect(videoPlanSchema.parse(plan).scenes).toHaveLength(7); });
  it("rejects unknown scene types", () => { expect(() => videoPlanSchema.parse({ version: 1, title: "x", language: "ja", fps: 30, durationSeconds: 30, style: "tech", scenes: [{ id: "x", type: "code", durationSeconds: 30 }] })).toThrow(); });
});
