# TODO

Prioritized after the MVP:

1. Add scene-level regeneration with the current scene and surrounding narrative as structured context.
2. Add a production render job service with authentication, quotas, progress, cancellation, and private output storage.
3. Add narration/caption timing fields to VideoPlan v2 without breaking v1 renders.
4. Add visual regression tests for representative frames across all themes and scene types.
5. Add Japanese typography fitting and overflow measurement for unusually long AI output.

Also evaluate URL/PDF input adapters only after these reliability tasks. The MVP deliberately has no fake scene-regenerate or web-export button.
