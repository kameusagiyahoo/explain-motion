# TODO

## Completed after MVP

- Scene-level Mock/OpenAI regeneration with adjacent narrative context, Structured Output validation, and fixed scene identity/duration.
- Dedicated Node MP4 render jobs with service-to-service authentication, bounded single-worker queue, progress, cancellation, and expiring private downloads through the Next.js proxy.
- Backward-compatible VideoPlan v2 narration/caption timing with deterministic `@remotion/captions` rendering and automatic retiming after duration edits.

## Next priorities

1. Replace the per-process render queue/files with a durable queue, object storage, and deployment-level user authorization before horizontal scaling.
2. Add visual regression tests for representative frames across all themes and scene types.
3. Add Japanese typography fitting and overflow measurement for unusually long AI output.
4. Add the first URL content analyzer with citations and an input-adapter contract.
5. Connect optional TTS audio to the VideoPlan v2 narration timeline while preserving silent preview and Mock Mode.

PDF/CSV/GitHub adapters remain later phases. The MVP deliberately has no fake web-export button.
