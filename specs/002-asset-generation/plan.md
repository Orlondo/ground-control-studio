# Implementation Plan: Episode Asset Generation (Phase 2)

**Branch**: `[002-asset-generation]` | **Date**: 2026-06-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from [spec.md](spec.md)

## Summary

Add Phase 2 still-image asset generation and delivery for an existing EpisodePackage. The feature generates one thumbnail plus one scene image per scene prompt, records every attempt (including failures), supports partial-success responses, and exposes stable retrieval by normalizedKey. The design stays scope-locked to image generation, storage, and delivery, using typed TypeScript domain models and runtime validation at API boundaries.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js 16.2.9 (React 19.2.4)

**Primary Dependencies**: Next.js app router and route handlers, Node.js built-ins (`fs/promises`, `path`, `crypto`), existing episode domain modules under `lib/episode/`

**Storage**: File-backed image artifact storage for this phase via a storage adapter abstraction; persisted generation records keyed by normalizedKey

**Testing**: `npm run lint`, `npm run build`, and end-to-end manual quickstart validation for success, partial-success, and retrieval flows

**Target Platform**: Web application with server-side handlers in the existing Next.js project

**Project Type**: Web application

**Performance Goals**: Return request acknowledgment quickly and provide clear terminal status (success/partial-success/failure) with per-asset outcomes for typical episode scene counts

**Constraints**: Phase-limited to still images only; no voice, video, or publishing automation; preserve traceability to EpisodePackage and normalizedKey for every asset attempt

**Scale/Scope**: Phase 2 adds one generation flow and one retrieval flow for thumbnail + scene image assets per episode within the single existing app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Spec-first delivery: pass. Feature spec exists and this plan is produced before tasks/implementation.
- Scope-locked phase execution: pass. The plan is explicitly limited to still-image generation, storage, and delivery; voice/video/publishing are excluded.
- Typed contracts and validation: pass. Plan includes explicit request/result/data models and runtime validation boundaries for generation/retrieval interfaces.
- Quality gates before merge: pass. The feature requires lint/build checks plus quickstart validation scenarios for success, partial-success, and retrieval.
- Human review and traceability: pass. Artifacts map spec requirements to design entities and contracts; human review remains required pre-commit.

Post-design re-check: pass. Research and design artifacts preserve scope lock, typed boundaries, and requirement traceability without introducing constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-asset-generation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── image-assets.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── globals.css
├── layout.tsx
├── page.tsx
└── api/
  └── episodes/
    └── [normalizedKey]/
      └── assets/
        └── images/
          ├── generate/route.ts
          └── route.ts

lib/
├── episode/
│   ├── generator.ts
│   ├── normalization.ts
│   ├── types.ts
│   └── validation.ts
└── assets/
  ├── contracts.ts
  ├── generation-service.ts
  ├── provider-adapter.ts
  ├── storage-adapter.ts
  └── repository.ts

public/
└── generated-assets/
  └── [normalizedKey]/
```

**Structure Decision**: Keep the feature in the existing single Next.js app. API surface is provided by route handlers under `app/api/`, while generation/storage/domain logic is isolated in `lib/assets/` as composable modules. Episode source types remain in `lib/episode/` for continuity with Phase 1.

## Complexity Tracking

No constitutional violations identified. Complexity exceptions are not required for this phase.
