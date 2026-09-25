# TODO

## Completed after MVP

- Scene-level Mock/OpenAI regeneration with adjacent narrative context, Structured Output validation, and fixed scene identity/duration.
- Dedicated Node MP4 render jobs with service-to-service authentication, bounded single-worker queue, progress, cancellation, and expiring private downloads through the Next.js proxy.
- Backward-compatible VideoPlan v2 narration/caption timing with deterministic `@remotion/captions` rendering and automatic retiming after duration edits.
- Visual regression coverage for every Scene type across Simple, Pop, and Tech themes, plus the v2 caption overlay.
- Deterministic Japanese typography fitting, bundled font readiness, overflow guards, and maximum-length visual regression cases for every Scene type.
- Atomic single-node render-job persistence with restart recovery, schema validation, configurable persistent-volume path, and missing-output detection.
- Text/URL input-adapter contract with server-only extraction, source citations, response limits, redirect validation, and DNS-rebinding-resistant private-network blocking.

## Next priorities

1. Add an external transactional queue, object storage, and deployment-level user authorization before horizontal scaling beyond one renderer.
2. Connect optional TTS audio to the VideoPlan v2 narration timeline while preserving silent preview and Mock Mode.
3. Add a content-addressed render cache for repeated VideoPlans.
4. Add the PDF input adapter using the established `AnalyzedContent` contract.
5. Improve article extraction with canonical metadata, structured data, and multilingual encoding detection.

PDF/CSV/GitHub adapters remain later phases. The MVP deliberately has no fake web-export button.
