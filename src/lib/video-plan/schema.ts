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

export const videoPlanSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1).max(100),
  language: z.string().min(2).max(10),
  fps: z.literal(30),
  durationSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  style: videoStyleSchema,
  scenes: z.array(sceneSchema).min(1).max(16),
});

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
export type VideoPlan = z.infer<typeof videoPlanSchema>;
export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;
