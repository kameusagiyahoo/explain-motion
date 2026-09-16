# TODO

## Completed after MVP

- Scene-level Mock/OpenAI regeneration with adjacent narrative context, Structured Output validation, and fixed scene identity/duration.

## Next priorities

1. Add a production render job service with authentication, quotas, progress, cancellation, and private output storage.
2. Add narration/caption timing fields to VideoPlan v2 without breaking v1 renders.
3. Add visual regression tests for representative frames across all themes and scene types.
4. Add Japanese typography fitting and overflow measurement for unusually long AI output.
5. Add the first URL content analyzer with citations and an input-adapter contract.

PDF/CSV/GitHub adapters remain later phases. The MVP deliberately has no fake web-export button.
