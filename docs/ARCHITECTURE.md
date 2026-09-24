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
  E --> J[Next.js render-job proxy]
  J --> S[Dedicated Node render service]
  S --> Q[Bounded in-memory queue]
  Q --> B[Remotion bundle + renderer]
  B --> D[Expiring private MP4]
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

For VideoPlan v2, the same pass retimes narration segments and caption cues to the normalized scene boundaries. The timing calculation is deterministic and expressed in absolute milliseconds. VideoPlan v1 remains accepted and renders through the same scene pipeline without a caption overlay.

## Rendering strategy

The browser uses `@remotion/player`. The CLI uses `remotion render`. Web export crosses a deliberate process boundary: Next.js proxies requests and keeps `RENDER_API_TOKEN` server-side, while a dedicated long-running Node process owns Chromium, `@remotion/bundler`, and `@remotion/renderer`.

The service executes one render at a time, caps pending work, validates every VideoPlan, reports progress, supports cancellation through Remotion’s cancel signal, and removes private files after a configurable TTL. It binds to localhost by default and refuses a non-local bind without bearer authentication. The queue and metadata are in memory, so a durable queue/object store and deployment-level end-user authentication remain prerequisites for horizontal production scaling.

## Typography and overflow

Video rendering waits for the bundled Noto Sans JP variable font before measuring or drawing text. Shared text helpers use Remotion's layout utilities to fit content to explicit line and width constraints. Japanese text receives grapheme-level break opportunities for measurement, while authored spaces remain intact. If schema-valid text still cannot fit at the minimum font size, it is shortened deterministically with an ellipsis. `SceneFrame` clips as a final safety boundary, and maximum-length fixtures for all seven Scene types are covered by visual regression tests.

## Scene regeneration

`POST /api/regenerate-scene` receives the validated VideoPlan, selected index, original request, and audience. The server sends only the selected scene plus its immediate neighbors to OpenAI. The returned structured scene must retain the original discriminant; the server then forcibly preserves `id` and `durationSeconds` and runs Zod validation again. Mock Mode follows the same response contract.
