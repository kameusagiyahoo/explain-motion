import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateMockVideoPlan } from "@/lib/ai/mockVideoPlan";
import { RenderJobManager, RenderQueueFullError, type RenderRunner } from "../render-job-manager";

const plan = generateMockVideoPlan({ prompt: "ブラックホールとは？", durationSeconds: 30, audience: "beginner", style: "tech", language: "ja" });
let outputDir: string;

beforeEach(async () => { outputDir = await mkdtemp(path.join(os.tmpdir(), "explain-motion-jobs-")); });
afterEach(async () => { await rm(outputDir, { recursive: true, force: true }); });

describe("RenderJobManager", () => {
  it("reports render phases and completion", async () => {
    const runner: RenderRunner = async ({ onPhase, onProgress }) => { onPhase("bundling"); onPhase("rendering"); onProgress(0.5); onProgress(1); };
    const manager = new RenderJobManager(runner, outputDir);
    const created = await manager.create(plan);
    await vi.waitFor(() => expect(manager.get(created.id)?.status).toBe("completed"));
    expect(manager.get(created.id)).toMatchObject({ progress: 1, downloadAvailable: true, error: null });
    expect(manager.getDownloadPath(created.id)).toBe(path.join(outputDir, `${created.id}.mp4`));
  });

  it("cancels an active render without turning it into a failure", async () => {
    const runner: RenderRunner = ({ cancelSignal, onPhase }) => new Promise((_resolve, reject) => { onPhase("rendering"); cancelSignal(() => reject(new Error("cancelled"))); });
    const manager = new RenderJobManager(runner, outputDir);
    const created = await manager.create(plan);
    await vi.waitFor(() => expect(manager.get(created.id)?.status).toBe("rendering"));
    await manager.cancel(created.id);
    await vi.waitFor(() => expect(manager.get(created.id)?.status).toBe("cancelled"));
    expect(manager.get(created.id)?.error).toBeNull();
  });

  it("enforces the pending job quota", async () => {
    const runner: RenderRunner = ({ cancelSignal }) => new Promise((_resolve, reject) => cancelSignal(() => reject(new Error("cancelled"))));
    const manager = new RenderJobManager(runner, outputDir, 1);
    const first = await manager.create(plan);
    await expect(manager.create(plan)).rejects.toBeInstanceOf(RenderQueueFullError);
    await manager.cancel(first.id);
  });

  it("removes expired job metadata", async () => {
    let current = Date.now();
    const manager = new RenderJobManager(async () => undefined, outputDir, 1, 1_000, () => current);
    const created = await manager.create(plan);
    await vi.waitFor(() => expect(manager.get(created.id)?.status).toBe("completed"));
    current += 1_001;
    await manager.cleanupExpired();
    expect(manager.get(created.id)).toBeNull();
  });
});
