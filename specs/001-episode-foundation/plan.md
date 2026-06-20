# Implementation Plan: Episode Package Foundation

**Branch**: `[001-phase-one]` | **Date**: 2026-06-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from [spec.md](spec.md)

## Summary

Build a deterministic, text-only episode generation foundation in the existing Next.js app. Phase 1 accepts only location, era, and atmosphere, then produces a stable EpisodePackage containing title, script, scene prompts, thumbnail prompt, short-form clip ideas, description, and tags. The implementation stays local to the browser UI, uses typed domain models plus lightweight runtime validation, and excludes auth, persistence, publishing, image generation, and voice generation.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js 16.2.9 with React 19.2.4

**Primary Dependencies**: Next.js app router, React, React DOM, Tailwind CSS 4, ESLint 9, TypeScript 5, npm scripts from `package.json`

**Storage**: N/A for Phase 1; generation is deterministic and does not persist user data

**Testing**: ESLint (`npm run lint`), Next.js build/typecheck (`npm run build`), and manual quickstart validation

**Target Platform**: Web browser via the existing Next.js app

**Project Type**: Web application

**Performance Goals**: Deterministic episode generation should feel immediate and complete within a single UI interaction, with no network dependency

**Constraints**: Text-only output, no auth, no database, no publishing pipeline, no image generation, no voice generation, no external model calls

**Scale/Scope**: Single-app Phase 1 feature inside the existing `app/` workspace, with a small shared domain layer under `lib/`

**External Contracts**: None required for Phase 1. The feature is a browser-based planning flow inside the existing app, so there is no public API, CLI surface, or cross-service interface to document yet.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Spec-first delivery: satisfied. The feature already has a spec and this plan is the next artifact before tasks or implementation.
- Scope-locked phase execution: satisfied. The plan keeps Phase 1 limited to text-based episode planning and rejects auth, persistence, publishing, image, and voice work.
- Typed contracts and validation: satisfied. The design calls for explicit TypeScript types for EpisodeBrief, EpisodePackage, and an incomplete-request result, plus runtime validation at the input boundary.
- Quality gates before merge: satisfied. Validation is limited to lint, build, and the quickstart checks in this phase.
- Human review and traceability: satisfied. The artifacts preserve requirement-to-design traceability and defer implementation details to tasks.

No constitution violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-episode-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md            # Phase 2 output, not created in this workflow
```

### Contracts

No contracts directory is required for Phase 1. The feature does not expose a public API, external service, or reusable package boundary; it stays inside the browser-based Next.js UI.

### Source Code (repository root)

```text
app/
├── globals.css
├── layout.tsx
└── page.tsx

lib/
└── episode/
    ├── generator.ts
    ├── normalization.ts
    ├── types.ts
    └── validation.ts
```

**Structure Decision**: Keep the user-facing flow in the existing Next.js `app/` directory and place the deterministic episode logic in a focused `lib/episode/` domain module. Phase 1 does not need a separate backend, contracts package, or persistence layer.

## Complexity Tracking

Not applicable. The constitution check passed without exceptions, and the feature is intentionally small: one browser-based flow, one shared domain module, and no external integration surface. No complexity exception is required.
