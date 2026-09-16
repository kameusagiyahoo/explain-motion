import { z } from "zod";
import { videoPlanSchema } from "@/lib/video-plan/schema";

export const createRenderJobSchema = z.object({ plan: videoPlanSchema });
export const renderJobStatusSchema = z.enum(["queued", "bundling", "rendering", "completed", "failed", "cancelled"]);

export const renderJobSchema = z.object({
  id: z.string().uuid(),
  status: renderJobStatusSchema,
  progress: z.number().min(0).max(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  downloadAvailable: z.boolean(),
  error: z.string().nullable(),
});

export type CreateRenderJob = z.infer<typeof createRenderJobSchema>;
export type RenderJobStatus = z.infer<typeof renderJobStatusSchema>;
export type RenderJob = z.infer<typeof renderJobSchema>;
