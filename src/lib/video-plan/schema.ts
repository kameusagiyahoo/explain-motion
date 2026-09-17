import { z } from "zod";

export const videoStyleSchema = z.enum(["simple", "pop", "tech"]);
export const audienceSchema = z.enum(["beginner", "general", "expert"]);

const sceneBase = {
  id: z.string().min(1).max(80),
  durationSeconds: z.number().int().min(2).max(30),
};

export const titleSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("title"),
  headline: z.string().min(1).max(80),
  subheadline: z.string().max(120).nullable(),
});

export const textSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("text"),
  headline: z.string().min(1).max(80),
  body: z.string().min(1).max(180),
  highlights: z.array(z.string().max(40)).max(3),
});

const comparisonItemSchema = z.object({
  title: z.string().min(1).max(50),
  body: z.string().min(1).max(100),
});

export const comparisonSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("comparison"),
  headline: z.string().min(1).max(80),
  left: comparisonItemSchema,
  right: comparisonItemSchema,
});

export const stepsSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("steps"),
  headline: z.string().min(1).max(80),
  steps: z.array(z.string().min(1).max(50)).min(2).max(6),
});

export const diagramSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("diagram"),
  headline: z.string().min(1).max(80),
  nodes: z.array(z.object({
    id: z.string().min(1).max(40),
    label: z.string().min(1).max(50),
    detail: z.string().max(80).nullable(),
  })).min(2).max(6),
  edges: z.array(z.object({
    from: z.string().min(1).max(40),
    to: z.string().min(1).max(40),
    label: z.string().max(40).nullable(),
  })).min(1).max(8),
});

export const numberSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("number"),
  value: z.number(),
  suffix: z.string().max(20).nullable(),
  label: z.string().min(1).max(100),
});

export const summarySceneSchema = z.object({
  ...sceneBase,
  type: z.literal("summary"),
  headline: z.string().min(1).max(80),
  points: z.array(z.string().min(1).max(80)).min(2).max(4),
});

export const sceneSchema = z.discriminatedUnion("type", [
  titleSceneSchema,
  textSceneSchema,
  comparisonSceneSchema,
  stepsSceneSchema,
  diagramSceneSchema,
  numberSceneSchema,
  summarySceneSchema,
]);

const videoPlanBase = {
  title: z.string().min(1).max(100),
  language: z.string().min(2).max(10),
  fps: z.literal(30),
  durationSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  style: videoStyleSchema,
  scenes: z.array(sceneSchema).min(1).max(16),
};

export const videoPlanV1Schema = z.object({
  version: z.literal(1),
  ...videoPlanBase,
});

export const narrationSegmentSchema = z.object({
  sceneId: z.string().min(1).max(80),
  text: z.string().min(1).max(280),
  startMs: z.number().int().min(0),
  endMs: z.number().int().positive(),
});

export const captionCueSchema = z.object({
  sceneId: z.string().min(1).max(80),
  text: z.string().min(1).max(80),
  startMs: z.number().int().min(0),
  endMs: z.number().int().positive(),
  timestampMs: z.number().int().min(0).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  pageBreakAfter: z.boolean(),
});

export const videoPlanV2Schema = z.object({
  version: z.literal(2),
  ...videoPlanBase,
  narration: z.object({ segments: z.array(narrationSegmentSchema).min(1).max(16) }),
  captions: z.object({
    enabled: z.boolean(),
    preset: z.enum(["subtitles", "highlight"]),
    cues: z.array(captionCueSchema).min(1).max(256),
  }),
}).superRefine((plan, context) => {
  const sceneIds = new Set(plan.scenes.map((scene) => scene.id));
  const durationMs = plan.durationSeconds * 1000;
  const validateTiming = (item: { sceneId: string; startMs: number; endMs: number }, path: (string | number)[]) => {
    if (!sceneIds.has(item.sceneId)) context.addIssue({ code: "custom", path: [...path, "sceneId"], message: "Timing entry references an unknown scene." });
    if (item.endMs <= item.startMs || item.endMs > durationMs) context.addIssue({ code: "custom", path, message: "Timing entry must fit inside the video." });
  };
  plan.narration.segments.forEach((item, index) => validateTiming(item, ["narration", "segments", index]));
  plan.captions.cues.forEach((item, index) => validateTiming(item, ["captions", "cues", index]));
  for (const scene of plan.scenes) {
    if (plan.narration.segments.filter((segment) => segment.sceneId === scene.id).length !== 1) context.addIssue({ code: "custom", path: ["narration", "segments"], message: `Scene ${scene.id} must have exactly one narration segment.` });
    if (!plan.captions.cues.some((cue) => cue.sceneId === scene.id)) context.addIssue({ code: "custom", path: ["captions", "cues"], message: `Scene ${scene.id} must have at least one caption cue.` });
  }
});

export const videoPlanSchema = z.discriminatedUnion("version", [videoPlanV1Schema, videoPlanV2Schema]);

export const generatePlanRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(4000),
  durationSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  audience: audienceSchema,
  style: videoStyleSchema,
  language: z.enum(["ja", "en"]),
});

export type VideoStyle = z.infer<typeof videoStyleSchema>;
export type Audience = z.infer<typeof audienceSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type VideoPlanV1 = z.infer<typeof videoPlanV1Schema>;
export type VideoPlanV2 = z.infer<typeof videoPlanV2Schema>;
export type VideoPlan = z.infer<typeof videoPlanSchema>;
export type CaptionCue = z.infer<typeof captionCueSchema>;
export type NarrationSegment = z.infer<typeof narrationSegmentSchema>;
export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;

export const regenerateSceneRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(4000),
  audience: audienceSchema,
  plan: videoPlanSchema,
  sceneIndex: z.number().int().min(0),
}).superRefine((value, context) => {
  if (value.sceneIndex >= value.plan.scenes.length) {
    context.addIssue({ code: "custom", path: ["sceneIndex"], message: "Scene index is outside the VideoPlan." });
  }
});

export const regeneratedSceneOutputSchema = z.object({ scene: sceneSchema });
export type RegenerateSceneRequest = z.infer<typeof regenerateSceneRequestSchema>;
