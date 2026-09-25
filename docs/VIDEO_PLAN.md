# VideoPlan

`VideoPlan` is the contract boundary between AI and the video engine. Input analyzers may change; rendering remains stable because every input becomes the same validated plan.

```text
Text ─┐
URL ──┤
PDF ──┤
CSV ──┼→ Semantic model / explanation planner → VideoPlan → Renderer → Video
GitHub┤
Logs ─┘
```

## Top-level contract

```ts
type BaseVideoPlan = {
  title: string;
  language: string;
  fps: 30;
  durationSeconds: 30 | 60 | 90;
  style: "simple" | "pop" | "tech";
  scenes: Scene[];
};

type VideoPlanV1 = BaseVideoPlan & {version: 1};

type VideoPlanV2 = BaseVideoPlan & {
  version: 2;
  narration: {segments: NarrationSegment[]};
  captions: {
    enabled: boolean;
    preset: "subtitles" | "highlight";
    cues: CaptionCue[];
  };
};

type VideoPlan = VideoPlanV1 | VideoPlanV2;
```

`Scene` is a Zod discriminated union on `type`. Every scene contains `id`, `type`, and integer `durationSeconds`.

## Scene types

- `title`: headline and nullable subheadline.
- `text`: concise headline/body plus up to three highlights.
- `comparison`: left and right title/body pairs.
- `steps`: two to six ordered steps.
- `diagram`: reusable nodes and directed edges; endpoints refer to node IDs.
- `number`: numeric value, nullable suffix, and label. Renderer performs deterministic count-up.
- `summary`: two to four closing points.

The exact authoritative schema is `src/lib/video-plan/schema.ts`. Text limits prevent unreadable slides. IDs and diagram relationships remain data, not arbitrary drawing code.

## Validation path

```text
OpenAI Structured Output (JSON Schema generated from Zod)
  → SDK parsed output
  → independent Zod parse
  → duration normalizer
  → final Zod parse
  → VideoPlan
```

Mock mode enters the same normalizer and validator. Invalid JSON, unsupported scene types, missing fields, empty scenes, and invalid durations cannot reach the renderer.

Text and URL adapters first produce the same `AnalyzedContent` shape: a title, bounded plain text, excerpt, and citations. The planner consumes that semantic input and still returns only a VideoPlan. Citations are returned beside the plan as provenance for the workspace rather than being mixed into renderer instructions, preserving VideoPlan as the AI/video-engine contract.

Version 2 adds one narration segment and at least one caption cue for every scene. Caption cues use absolute milliseconds and the official Remotion `Caption` fields (`text`, `startMs`, `endMs`, `timestampMs`, and `confidence`) plus `sceneId` and `pageBreakAfter`. After scene durations change, the normalizer deterministically retimes both narration and captions so every cue remains inside its scene.

## Versioning

Both `version: 1` and `version: 2` are accepted. Existing v1 plans render unchanged without captions; new Mock and OpenAI plans use v2. Future breaking field semantics require a new version and an explicit migration rather than silently changing the renderer contract.
