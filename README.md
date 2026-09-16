# ExplainMotion

ExplainMotion turns a short explanation request into a structured `VideoPlan`, then renders that plan as a deterministic Remotion video. The LLM is the director; Remotion is the renderer. The LLM never writes or evaluates React code.

> Screenshot placeholder — add `docs/images/workspace.png` after the first public release.

## Architecture

```text
Text → Content Analyzer → Explanation Planner → VideoPlan → Scene Registry → Remocn + Remotion → Player / MP4
```

`VideoPlan` is validated twice in AI mode: OpenAI Structured Outputs first, then the local Zod schema. A duration normalizer guarantees that scene durations sum to 30, 60, or 90 seconds. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/VIDEO_PLAN.md](docs/VIDEO_PLAN.md).

## Setup

Requirements: Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

Open the printed localhost URL. Enter `ブラックホールとは？` and choose **Generate video plan**.

## Mock Mode

No API key is required. If `OPENAI_API_KEY` is missing or empty, the server uses `MockVideoPlanGenerator`. The complete flow remains available: Generate → validated VideoPlan → Player → Storyboard → editing.

## OpenAI API setup

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```dotenv
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5-mini
```

The key is read only by `src/app/api/generate-plan/route.ts` and server-side AI code. Never prefix it with `NEXT_PUBLIC_`. The model can be changed without editing source code. The integration uses the Responses API with `zodTextFormat`, followed by an independent `videoPlanSchema.parse()`.

## Development

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Remotion preview

The main Next.js workspace embeds `@remotion/player` with play, pause, seek, and fullscreen controls. To use Remotion Studio directly:

```bash
npm run studio
```

## MP4 render

```bash
npm run render
# or
npm run render:sample
```

The sample is written to `output/explain-motion.mp4`. Local CLI rendering is intentionally separate from the web API; production server rendering will be selected later from Remotion's supported deployment options.

## Project structure

```text
src/
├── app/                    # Next.js UI and POST /api/generate-plan
├── components/             # editor, Player, Storyboard, copied Remocn sources
├── lib/ai/                 # OpenAI and Mock generators
├── lib/video-plan/         # Zod contract, types, duration normalizer
├── remotion/               # CLI composition root
└── video/                  # registry, themes, and seven scene renderers
```

## Current MVP

- Text input with 30/60/90 sec, audience, style, and Japanese-first language settings
- Mock AI mode and OpenAI Responses API mode
- Seven discriminated scene types and registry-based renderer
- Simple, Pop, and Tech video themes
- Deterministic frame/fps animations and fade/slide transitions
- Real Remocn copy-paste components in rendered scenes
- Storyboard seeking and immediate headline/body/points/steps/duration edits
- Local H.264 MP4 render, tests, and CI

## Roadmap

Phase 1 (this repository): Text → Explanation Video. Later phases add URL, PDF, CSV/data charts, GitHub analysis, voice, and a universal explanation engine. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Official references

- [Remotion documentation](https://www.remotion.dev/docs/)
- [Remotion Agent Skills](https://github.com/remotion-dev/skills)
- [Remocn](https://github.com/Remocn/remocn)
- [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
