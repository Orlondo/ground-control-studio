# Implementation Plan: OpenAI Image Provider Integration

**Branch**: `003-openai-image-provider` | **Date**: 2026-06-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from [spec.md](spec.md)

## Summary

Replace `LocalDeterministicImageProvider` in `lib/assets/provider-adapter.ts` with an `OpenAIImageProvider` that calls the OpenAI Images API (`gpt-image-2` primary, `gpt-image-1` fallback) over HTTP, decodes `b64_json` responses to binary Buffer, and passes the result to the existing `StorageAdapter`. The local SVG provider is retained as a dev fallback when `OPENAI_API_KEY` is absent. No other modules, routes, contracts, or UI change.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js 16.2.9 (React 19.2.4)

**Primary Dependencies**: `openai` npm package (new), existing Next.js app-router pipeline; Node.js built-ins (`crypto`, `Buffer`)

**Storage**: `PublicFileStorageAdapter` — unchanged. Accepts `Buffer` + `extension` + `mimeType`.

**Testing**: `npm run lint`, `npm run build`, manual quickstart scenarios (success, partial-success, missing-key rejection)

**Target Platform**: Web application — server-side Next.js route handler (`app/api/episodes/[normalizedKey]/assets/images/generate/route.ts`)

**Project Type**: Web application (single-project Next.js)

**Performance Goals**: Each image generation call completes within OpenAI's latency bounds (~10–30 s); rate-limit retry adds at most 5× that plus back-off overhead

**Constraints**: Still-image generation only. `OPENAI_API_KEY` absence is a hard startup failure for `OpenAIImageProvider`. `LocalDeterministicImageProvider` must remain available as dev fallback. No other files change.

**Scale/Scope**: Single provider class replacing another; no schema migrations, no new routes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-First Delivery**: pass. Spec exists; plan precedes tasks and implementation.
- **II. Scope-Locked Phase Execution**: pass. Scope is explicitly limited to `provider-adapter.ts` replacement. Routes, UI, billing, auth, multi-provider abstraction are out of scope.
- **III. Typed Contracts and Validation**: pass. `ProviderGenerationResult` union type updated to cover PNG output alongside SVG; no external contract shape changes. `OPENAI_API_KEY` validated at provider construction time.
- **IV. Quality Gates Before Merge**: pass. Lint + build required; quickstart scenarios documented.
- **V. Human Review and Traceability**: pass. All design decisions traceable to spec requirements; human review required before commit.

*Post-design re-check*: pass. Research and design preserve scope lock, typed boundaries, and traceability without constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-openai-image-provider/
├── plan.md         ← this file
├── research.md     ← Phase 0 output
├── data-model.md   ← Phase 1 output
└── quickstart.md   ← Phase 1 output
```

### Source Code (repository root)

Only one file changes at the source level:

```text
lib/
└── assets/
    └── provider-adapter.ts   ← add OpenAIImageProvider; retain LocalDeterministicImageProvider;
                                 update ProviderGenerationResult union to allow PNG output
package.json                  ← add openai npm dependency
```

## Complexity Tracking

No constitution violations. No complexity justification required.
