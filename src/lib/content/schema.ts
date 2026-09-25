import { z } from "zod";
import { audienceSchema, videoStyleSchema } from "@/lib/video-plan/schema";

export const contentInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().trim().min(3).max(4000) }),
  z.object({ type: z.literal("url"), url: z.string().trim().url().max(2048) }),
]);

export const generateFromContentRequestSchema = z.object({
  input: contentInputSchema,
  durationSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  audience: audienceSchema,
  style: videoStyleSchema,
  language: z.enum(["ja", "en"]),
});

export const citationSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(200),
  url: z.string().url(),
});

export const analyzedContentSchema = z.object({
  inputType: z.enum(["text", "url"]),
  title: z.string().min(1).max(200),
  text: z.string().min(3).max(12_000),
  excerpt: z.string().min(1).max(700),
  citations: z.array(citationSchema).max(8),
});

export type ContentInput = z.infer<typeof contentInputSchema>;
export type GenerateFromContentRequest = z.infer<typeof generateFromContentRequestSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type AnalyzedContent = z.infer<typeof analyzedContentSchema>;

export type PublicContentSource = Pick<AnalyzedContent, "inputType" | "title" | "excerpt" | "citations">;
