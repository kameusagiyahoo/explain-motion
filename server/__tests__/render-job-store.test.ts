import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateMockVideoPlan } from "@/lib/ai/mockVideoPlan";
import { FileRenderJobStore, type PersistedRenderJob } from "../render-job-store";

const plan = generateMockVideoPlan({ prompt: "ブラックホールとは？", durationSeconds: 30, audience: "beginner", style: "tech", language: "ja" });
let directory: string;
let filePath: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "explain-motion-store-"));
  filePath = path.join(directory, "render-jobs.json");
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

describe("FileRenderJobStore", () => {
  it("round-trips validated render jobs through an atomic JSON file", async () => {
    const store = new FileRenderJobStore(filePath);
    const job = persistedJob();
    await store.save([job]);
    await expect(store.load()).resolves.toEqual([job]);
    expect(JSON.parse(await readFile(filePath, "utf8"))).toHaveLength(1);
  });

  it("returns an empty collection before the first save", async () => {
    await expect(new FileRenderJobStore(filePath).load()).resolves.toEqual([]);
  });

  it("rejects corrupt or schema-invalid state instead of losing jobs silently", async () => {
    await writeFile(filePath, JSON.stringify([{ id: "not-a-uuid" }]));
    await expect(new FileRenderJobStore(filePath).load()).rejects.toThrow();
  });
});

function persistedJob(): PersistedRenderJob {
  const timestamp = new Date(0).toISOString();
  return {
    id: "00000000-0000-4000-8000-000000000001",
    status: "queued",
    progress: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: null,
    downloadAvailable: false,
    error: null,
    plan,
  };
}
