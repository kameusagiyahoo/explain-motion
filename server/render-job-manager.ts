import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { CancelSignal } from "@remotion/renderer";
import { makeCancelSignal } from "@remotion/renderer";
import type { RenderJob, RenderJobStatus } from "@/lib/render-jobs/schema";
import type { VideoPlan } from "@/lib/video-plan/schema";

export type RenderRunner = (options: {
  plan: VideoPlan;
  outputLocation: string;
  cancelSignal: CancelSignal;
  onPhase: (phase: "bundling" | "rendering") => void;
  onProgress: (progress: number) => void;
}) => Promise<void>;

type InternalJob = RenderJob & {
  plan: VideoPlan;
  outputLocation: string;
  cancel: (() => void) | null;
  cancelRequested: boolean;
};

export class RenderQueueFullError extends Error {}

export class RenderJobManager {
  private readonly jobs = new Map<string, InternalJob>();
  private readonly queue: string[] = [];
  private running = false;

  constructor(
    private readonly runner: RenderRunner,
    private readonly outputDir: string,
    private readonly maxPending = 3,
    private readonly retentionMs = 30 * 60 * 1000,
    private readonly now = () => Date.now(),
  ) {}

  async create(plan: VideoPlan): Promise<RenderJob> {
    const pending = [...this.jobs.values()].filter((job) =>
      ["queued", "bundling", "rendering"].includes(job.status),
    ).length;
    if (pending >= this.maxPending) {
      throw new RenderQueueFullError("Render queue is full.");
    }

    await mkdir(this.outputDir, { recursive: true });
    const id = randomUUID();
    const timestamp = new Date(this.now()).toISOString();
    const job: InternalJob = {
      id,
      status: "queued",
      progress: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: null,
      downloadAvailable: false,
      error: null,
      plan,
      outputLocation: path.join(this.outputDir, `${id}.mp4`),
      cancel: null,
      cancelRequested: false,
    };
    this.jobs.set(id, job);
    this.queue.push(id);
    queueMicrotask(() => void this.drain());
    return this.publicJob(job);
  }

  get(id: string): RenderJob | null {
    const job = this.jobs.get(id);
    return job ? this.publicJob(job) : null;
  }

  getDownloadPath(id: string): string | null {
    const job = this.jobs.get(id);
    return job?.status === "completed" && job.downloadAvailable ? job.outputLocation : null;
  }

  async cancel(id: string): Promise<RenderJob | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    if (!["queued", "bundling", "rendering"].includes(job.status)) return this.publicJob(job);
    const wasQueued = job.status === "queued";
    job.cancel?.();
    job.cancelRequested = true;
    this.update(job, "cancelled", job.progress);
    const queueIndex = this.queue.indexOf(id);
    if (queueIndex >= 0) this.queue.splice(queueIndex, 1);
    if (wasQueued) await rm(job.outputLocation, { force: true });
    return this.publicJob(job);
  }

  async cleanupExpired(): Promise<void> {
    const current = this.now();
    for (const [id, job] of this.jobs) {
      if (job.cancel !== null) continue;
      if (!job.expiresAt || Date.parse(job.expiresAt) > current) continue;
      await rm(job.outputLocation, { force: true });
      this.jobs.delete(id);
    }
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    const id = this.queue.shift();
    if (!id) return;
    const job = this.jobs.get(id);
    if (!job || job.status !== "queued") {
      queueMicrotask(() => void this.drain());
      return;
    }

    this.running = true;
    const cancellation = makeCancelSignal();
    job.cancel = cancellation.cancel;
    try {
      await this.runner({
        plan: job.plan,
        outputLocation: job.outputLocation,
        cancelSignal: cancellation.cancelSignal,
        onPhase: (phase) => {
          if (!job.cancelRequested) this.update(job, phase, phase === "bundling" ? 0.02 : Math.max(job.progress, 0.1));
        },
        onProgress: (progress) => {
          if (!job.cancelRequested) this.update(job, "rendering", 0.1 + Math.min(1, Math.max(0, progress)) * 0.9);
        },
      });
      if (!job.cancelRequested) {
        this.update(job, "completed", 1);
        job.downloadAvailable = true;
        job.expiresAt = new Date(this.now() + this.retentionMs).toISOString();
      }
    } catch (error) {
      if (!job.cancelRequested) {
        this.update(job, "failed", job.progress);
        job.error = error instanceof Error ? error.message.slice(0, 300) : "Render failed.";
        job.expiresAt = new Date(this.now() + this.retentionMs).toISOString();
      }
      await rm(job.outputLocation, { force: true });
    } finally {
      job.cancel = null;
      this.running = false;
      queueMicrotask(() => void this.drain());
    }
  }

  private update(job: InternalJob, status: RenderJobStatus, progress: number): void {
    job.status = status;
    job.progress = Math.round(progress * 1000) / 1000;
    job.updatedAt = new Date(this.now()).toISOString();
    if (status === "cancelled") job.expiresAt = new Date(this.now() + this.retentionMs).toISOString();
  }

  private publicJob(job: InternalJob): RenderJob {
    const { id, status, progress, createdAt, updatedAt, expiresAt, downloadAvailable, error } = job;
    return { id, status, progress, createdAt, updatedAt, expiresAt, downloadAvailable, error };
  }
}
