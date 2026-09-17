import type { Scene, VideoPlan, VideoPlanV1, VideoPlanV2 } from "./schema";
import { videoPlanV2Schema } from "./schema";

export const isVideoPlanV2 = (plan: VideoPlan): plan is VideoPlanV2 => plan.version === 2;

export function narrationTextForScene(scene: Scene): string {
  switch (scene.type) {
    case "title": return [scene.headline, scene.subheadline].filter(Boolean).join("。 ");
    case "text": return `${scene.headline}。 ${scene.body}`;
    case "comparison": return `${scene.headline}。 ${scene.left.title}は${scene.left.body}。 ${scene.right.title}は${scene.right.body}。`;
    case "steps": return `${scene.headline}。 ${scene.steps.join("、")}`;
    case "diagram": return `${scene.headline}。 ${scene.nodes.map((node) => node.label).join("から、")}`;
    case "number": return `${scene.value}${scene.suffix ?? ""}。 ${scene.label}`;
    case "summary": return `${scene.headline}。 ${scene.points.join("。 ")}`;
  }
}

export function upgradeVideoPlanToV2(plan: VideoPlanV1): VideoPlanV2 {
  const durationMs = plan.durationSeconds * 1000;
  const seed: VideoPlanV2 = {
    ...plan,
    version: 2,
    narration: { segments: plan.scenes.map((scene) => ({ sceneId: scene.id, text: narrationTextForScene(scene), startMs: 0, endMs: durationMs })) },
    captions: {
      enabled: true,
      preset: "highlight",
      cues: plan.scenes.flatMap((scene) => splitCaptionText(narrationTextForScene(scene), plan.language).map((text) => ({ sceneId: scene.id, text, startMs: 0, endMs: durationMs, timestampMs: 0, confidence: null, pageBreakAfter: false }))),
    },
  };
  return videoPlanV2Schema.parse(retimeVideoPlanV2(seed));
}

export function retimeVideoPlanV2(plan: VideoPlanV2): VideoPlanV2 {
  let sceneStartMs = 0;
  const segments: VideoPlanV2["narration"]["segments"] = [];
  const cues: VideoPlanV2["captions"]["cues"] = [];

  for (const scene of plan.scenes) {
    const sceneEndMs = sceneStartMs + scene.durationSeconds * 1000;
    const padding = Math.min(300, Math.floor((sceneEndMs - sceneStartMs) * 0.1));
    const startMs = sceneStartMs + padding;
    const endMs = sceneEndMs - padding;
    const existingSegment = plan.narration.segments.find((segment) => segment.sceneId === scene.id);
    const text = existingSegment?.text ?? narrationTextForScene(scene);
    segments.push({ sceneId: scene.id, text, startMs, endMs });

    const existingCueTexts = plan.captions.cues.filter((cue) => cue.sceneId === scene.id).map((cue) => cue.text);
    const cueTexts = existingCueTexts.length > 0 ? existingCueTexts : splitCaptionText(text, plan.language);
    const cueDuration = (endMs - startMs) / cueTexts.length;
    cueTexts.forEach((cueText, index) => {
      const cueStart = Math.round(startMs + cueDuration * index);
      const cueEnd = index === cueTexts.length - 1 ? endMs : Math.round(startMs + cueDuration * (index + 1));
      cues.push({ sceneId: scene.id, text: cueText, startMs: cueStart, endMs: cueEnd, timestampMs: cueStart, confidence: null, pageBreakAfter: index === cueTexts.length - 1 });
    });
    sceneStartMs = sceneEndMs;
  }

  return { ...plan, narration: { segments }, captions: { ...plan.captions, cues } };
}

export function updateNarrationForScene(plan: VideoPlanV2, sceneId: string, text: string): VideoPlanV2 {
  const trimmed = text.trim().slice(0, 280);
  if (!trimmed) return plan;
  return videoPlanV2Schema.parse(retimeVideoPlanV2({
    ...plan,
    narration: { segments: plan.narration.segments.map((segment) => segment.sceneId === sceneId ? { ...segment, text: trimmed } : segment) },
    captions: {
      ...plan.captions,
      cues: [
        ...plan.captions.cues.filter((cue) => cue.sceneId !== sceneId),
        ...splitCaptionText(trimmed, plan.language).map((cueText) => ({ sceneId, text: cueText, startMs: 0, endMs: plan.durationSeconds * 1000, timestampMs: 0, confidence: null, pageBreakAfter: false })),
      ],
    },
  }));
}

export function splitCaptionText(text: string, language: string): string[] {
  const compact = text.trim();
  if (!compact) return ["…"];
  if (language.toLowerCase().startsWith("ja")) {
    const characters = Array.from(compact);
    const chunks: string[] = [];
    for (let index = 0; index < characters.length; index += 14) chunks.push(characters.slice(index, index + 14).join(""));
    return chunks.slice(0, 16);
  }
  const words = compact.split(/\s+/u);
  const chunks: string[] = [];
  for (const word of words) {
    const current = chunks.at(-1);
    if (!current || current.length + word.length + 1 > 32) chunks.push(word);
    else chunks[chunks.length - 1] = `${current} ${word}`;
  }
  return chunks.slice(0, 16);
}
