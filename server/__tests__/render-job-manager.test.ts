import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateMockVideoPlan } from "@/lib/ai/mockVideoPlan";
import { RenderJobManager, RenderQueueFullError, type RenderRunner } from "../render-job-manager";
import { FileRenderJobStore, type PersistedRenderJob } from "../render-job-store";

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

  it("requeues an interrupted render after a service restart", async () => {
    const id = "00000000-0000-4000-8000-000000000002";
    const timestamp = new Date().toISOString();
    const store = new FileRenderJobStore(path.join(outputDir, "render-jobs.json"));
    const interrupted: PersistedRenderJob = {
      id,
      status: "rendering",
      progress: 0.45,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: null,
      downloadAvailable: false,
      error: null,
      plan,
    };
    await store.save([interrupted]);

    const runner: RenderRunner = async ({ outputLocation, onPhase, onProgress }) => {
      onPhase("rendering");
      onProgress(1);
      await writeFile(outputLocation, "video");
    };
    const manager = new RenderJobManager(runner, outputDir);
    await manager.initialize();
    await vi.waitFor(() => expect(manager.get(id)?.status).toBe("completed"));
    await manager.close();

    const restored = new RenderJobManager(async () => { throw new Error("Completed jobs must not rerun."); }, outputDir);
    await restored.initialize();
    expect(restored.get(id)).toMatchObject({ status: "completed", progress: 1, downloadAvailable: true });
    expect(restored.getDownloadPath(id)).toBe(path.join(outputDir, `${id}.mp4`));
  });

  it("marks completed metadata as failed when its output is missing", async () => {
    const id = "00000000-0000-4000-8000-000000000003";
    const timestamp = new Date().toISOString();
    const store = new FileRenderJobStore(path.join(outputDir, "render-jobs.json"));
    await store.save([{
      id,
      status: "completed",
      progress: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      downloadAvailable: true,
      error: null,
      plan,
    }]);

    const manager = new RenderJobManager(async () => undefined, outputDir);
    await manager.initialize();
    expect(manager.get(id)).toMatchObject({
      status: "failed",
      downloadAvailable: false,
      error: "Render output is missing.",
    });
  });
});
