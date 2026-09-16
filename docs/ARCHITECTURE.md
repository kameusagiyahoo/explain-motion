# Architecture

```mermaid
flowchart TD
  U[User] --> E[Editor UI]
  E --> A[POST /api/generate-plan]
  A --> G{OPENAI_API_KEY?}
  G -->|yes| O[OpenAI Responses API\nStructured Output]
  G -->|no| M[MockVideoPlanGenerator]
  O --> V[VideoPlan]
  M --> V
  V --> Z[Zod validation]
  Z --> N[Duration Normalizer]
  N --> R[SceneRenderer registry]
  R --> C[Remocn + Remotion]
  C --> P[@remotion/player]
  C --> X[Local MP4 render]
```

## Boundaries

- The client owns form state, Player state, Storyboard selection, and safe plan edits.
- The Route Handler owns secrets and chooses OpenAI or Mock mode.
- The AI layer produces data only. It cannot generate, inject, or evaluate React.
- `VideoPlan` is the stable contract between analysis/planning and visual rendering.
- The renderer maps a discriminated `scene.type` through `sceneRegistry`; adding a Scene does not grow a central switch statement.
- All video motion is derived from `frame`, `fps`, `interpolate`, or Remotion transitions. Browser timers are used only for the loading label, never the video.

## Duration model

The normalizer validates the raw plan, proportionally redistributes whole seconds with a two-second minimum, and revalidates the result. Scene seconds always sum to `VideoPlan.durationSeconds`. Transition overlap is offset in the Remotion sequence lengths so the final composition remains exactly 30, 60, or 90 seconds.

## Rendering strategy

The browser uses `@remotion/player`. The MVP CLI uses `remotion render` on a local Node machine. A web Export button is intentionally omitted until a production renderer (dedicated Node, Lambda, or another current Remotion-supported option) is chosen with authentication, rate limits, storage, and cost controls.

## Scene regeneration

`POST /api/regenerate-scene` receives the validated VideoPlan, selected index, original request, and audience. The server sends only the selected scene plus its immediate neighbors to OpenAI. The returned structured scene must retain the original discriminant; the server then forcibly preserves `id` and `durationSeconds` and runs Zod validation again. Mock Mode follows the same response contract.
