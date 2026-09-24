import { randomUUID } from "node:crypto";
import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { CancelSignal } from "@remotion/renderer";
import { makeCancelSignal } from "@remotion/renderer";
import type { RenderJob, RenderJobStatus } from "@/lib/render-jobs/schema";
import type { VideoPlan } from "@/lib/video-plan/schema";
import { FileRenderJobStore, type PersistedRenderJob, type RenderJobStore } from "./render-job-store";

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
  private initializePromise: Promise<void> | null = null;
  private persistence = Promise.resolve();
  private readonly store: RenderJobStore;

  constructor(
    private readonly runner: RenderRunner,
    private readonly outputDir: string,
    private readonly maxPending = 3,
    private readonly retentionMs = 30 * 60 * 1000,
    private readonly now = () => Date.now(),
    store?: RenderJobStore,
  ) {
    this.store = store ?? new FileRenderJobStore(path.join(outputDir, "render-jobs.json"));
  }

  async initialize(): Promise<void> {
    this.initializePromise ??= this.restore();
    await this.initializePromise;
  }

  async create(plan: VideoPlan): Promise<RenderJob> {
    await this.initialize();
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
    try {
      await this.persist();
    } catch (error) {
      this.jobs.delete(id);
      this.queue.splice(this.queue.indexOf(id), 1);
      throw error;
    }
    this.scheduleDrain();
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
    await this.initialize();
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
    await this.persist();
    return this.publicJob(job);
  }

  async cleanupExpired(): Promise<void> {
    await this.initialize();
    const current = this.now();
    let changed = false;
    for (const [id, job] of this.jobs) {
      if (job.cancel !== null) continue;
      if (!job.expiresAt || Date.parse(job.expiresAt) > current) continue;
      await rm(job.outputLocation, { force: true });
      this.jobs.delete(id);
      changed = true;
    }
    if (changed) await this.persist();
  }

  async close(): Promise<void> {
    await this.initialize();
    await this.persist();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    const id = this.queue.shift();
    if (!id) return;
    const job = this.jobs.get(id);
    if (!job || job.status !== "queued") {
      this.scheduleDrain();
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
          if (!job.cancelRequested) {
            this.update(job, phase, phase === "bundling" ? 0.02 : Math.max(job.progress, 0.1));
            void this.persist().catch((error: unknown) => console.error("Failed to persist render phase.", error));
          }
        },
        onProgress: (progress) => {
          if (!job.cancelRequested) this.update(job, "rendering", 0.1 + Math.min(1, Math.max(0, progress)) * 0.9);
        },
      });
      if (!job.cancelRequested) {
        this.update(job, "completed", 1);
        job.downloadAvailable = true;
        job.expiresAt = new Date(this.now() + this.retentionMs).toISOString();
        await this.persist();
      }
    } catch (error) {
      if (!job.cancelRequested) {
        this.update(job, "failed", job.progress);
        job.error = error instanceof Error ? error.message.slice(0, 300) : "Render failed.";
        job.expiresAt = new Date(this.now() + this.retentionMs).toISOString();
      }
      await rm(job.outputLocation, { force: true });
      await this.persist();
    } finally {
      job.cancel = null;
      this.running = false;
      this.scheduleDrain();
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

  private async restore(): Promise<void> {
    await mkdir(this.outputDir, { recursive: true });
    const storedJobs = await this.store.load();
    const current = this.now();
    let changed = false;

    for (const stored of storedJobs) {
      const outputLocation = path.join(this.outputDir, `${stored.id}.mp4`);
      if (stored.expiresAt && Date.parse(stored.expiresAt) <= current) {
        await rm(outputLocation, { force: true });
        changed = true;
        continue;
      }

      const job: InternalJob = { ...stored, outputLocation, cancel: null, cancelRequested: false };
      if (["queued", "bundling", "rendering"].includes(job.status)) {
        await rm(outputLocation, { force: true });
        job.status = "queued";
        job.progress = 0;
        job.updatedAt = new Date(current).toISOString();
        job.downloadAvailable = false;
        job.error = null;
        job.expiresAt = null;
        this.queue.push(job.id);
        changed = true;
      } else if (job.status === "completed" && !(await fileExists(outputLocation))) {
        job.status = "failed";
        job.downloadAvailable = false;
        job.error = "Render output is missing.";
        job.updatedAt = new Date(current).toISOString();
        job.expiresAt = new Date(current + this.retentionMs).toISOString();
        changed = true;
      }
      this.jobs.set(job.id, job);
    }

    if (changed) await this.persist();
    if (this.queue.length > 0) this.scheduleDrain();
  }

  private persist(): Promise<void> {
    const snapshot = [...this.jobs.values()].map((job): PersistedRenderJob => {
      const { id, status, progress, createdAt, updatedAt, expiresAt, downloadAvailable, error, plan } = job;
      return { id, status, progress, createdAt, updatedAt, expiresAt, downloadAvailable, error, plan };
    });
    this.persistence = this.persistence.catch(() => undefined).then(() => this.store.save(snapshot));
    return this.persistence;
  }

  private scheduleDrain(): void {
    queueMicrotask(() => {
      void this.drain().catch((error: unknown) => console.error("Render queue stopped after an unexpected error.", error));
    });
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
