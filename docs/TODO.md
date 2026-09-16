# TODO

## Completed after MVP

- Scene-level Mock/OpenAI regeneration with adjacent narrative context, Structured Output validation, and fixed scene identity/duration.
- Dedicated Node MP4 render jobs with service-to-service authentication, bounded single-worker queue, progress, cancellation, and expiring private downloads through the Next.js proxy.

## Next priorities

1. Replace the per-process render queue/files with a durable queue, object storage, and deployment-level user authorization before horizontal scaling.
2. Add narration/caption timing fields to VideoPlan v2 without breaking v1 renders.
3. Add visual regression tests for representative frames across all themes and scene types.
4. Add Japanese typography fitting and overflow measurement for unusually long AI output.
5. Add the first URL content analyzer with citations and an input-adapter contract.

PDF/CSV/GitHub adapters remain later phases. The MVP deliberately has no fake web-export button.
