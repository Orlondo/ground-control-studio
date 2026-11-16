# Liminal Episode Studio

Liminal Episode Studio is a Next.js + TypeScript project built with a Spec Kit workflow.

- Phase 1: Deterministic EpisodePackage generation from `location`, `era`, and `atmosphere`.
- Phase 2: Still-image asset generation and retrieval (thumbnail + scene images) with traceable records.
- Phase 4: LLM-generated StoryContext (characters, setting, era, lighting and palette, props, art style) prepended to every image prompt so an episode's images stay consistent.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Quality Gates

Run before merge:

```bash
npm test
npm run lint
npm run build
```

## Episode Generation API

```bash
POST /api/episodes/generate   # body: { location, era, atmosphere }
```

- Runs on the server. Validates the brief, generates a StoryContext with OpenAI, then builds the EpisodePackage.
- Requires `OPENAI_API_KEY`. The model defaults to `gpt-4.1-mini` and can be overridden with `OPENAI_STORY_MODEL`.
- Returns `400` with `status: "needs-input"` for incomplete briefs, and `502` with `error: "STORY_CONTEXT_FAILED"` if the key is missing or the LLM call fails or returns invalid output. There is no fallback context.

## Phase 2 Image Asset APIs

Generate image assets:

```bash
POST /api/episodes/{normalizedKey}/assets/images/generate
```

Retrieve generated assets:

```bash
GET /api/episodes/{normalizedKey}/assets/images
```

### Notes

- Asset generation is intentionally local and deterministic for this phase.
- Prompts containing `unsafe`, `invalid`, `reject`, `fail`, or `error` simulate provider failure to exercise partial-success handling.
- Generated image files are written to `public/generated-assets/{normalizedKey}/`.
- File-backed request and asset records are stored under `.specify/runtime/assets/`.

## Spec Kit Workflow

This repository uses Spec Kit as the default workflow:

1. `constitution`
2. `specify`
3. `plan`
4. `tasks`
5. `implement`

Specs for the current feature are under `specs/004-story-context/`.
