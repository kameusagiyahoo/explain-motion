import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { renderJobSchema } from "@/lib/render-jobs/schema";
import { videoPlanSchema } from "@/lib/video-plan/schema";

const persistedRenderJobSchema = renderJobSchema.extend({ plan: videoPlanSchema });
const persistedRenderJobsSchema = z.array(persistedRenderJobSchema);

export type PersistedRenderJob = z.infer<typeof persistedRenderJobSchema>;

export interface RenderJobStore {
  load(): Promise<PersistedRenderJob[]>;
  save(jobs: PersistedRenderJob[]): Promise<void>;
}

export class FileRenderJobStore implements RenderJobStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<PersistedRenderJob[]> {
    try {
      const contents = await readFile(this.filePath, "utf8");
      return persistedRenderJobsSchema.parse(JSON.parse(contents));
    } catch (error) {
      if (isMissingFile(error)) return [];
      throw error;
    }
  }

  async save(jobs: PersistedRenderJob[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(jobs)}\n`, { encoding: "utf8", mode: 0o600 });
      await rename(temporaryPath, this.filePath);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
