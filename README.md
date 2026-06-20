# Liminal Episode Studio

Liminal Episode Studio is a Next.js + TypeScript project built with a Spec Kit workflow.

- Phase 1: Deterministic EpisodePackage generation from `location`, `era`, and `atmosphere`.
- Phase 2: Still-image asset generation and retrieval (thumbnail + scene images) with traceable records.

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
npm run lint
npm run build
```

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

Specs for the current feature are under `specs/002-asset-generation/`.
