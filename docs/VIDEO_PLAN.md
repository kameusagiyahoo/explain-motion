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
type VideoPlan = {
  version: 1;
  title: string;
  language: string;
  fps: 30;
  durationSeconds: 30 | 60 | 90;
  style: "simple" | "pop" | "tech";
  scenes: Scene[];
};
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

## Versioning

`version: 1` is mandatory. Breaking field semantics require a new version and migration rather than silently changing the renderer contract.
