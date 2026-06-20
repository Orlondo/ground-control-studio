---
description: "Task list for OpenAI Image Provider Integration"
---

# Tasks: OpenAI Image Provider Integration

**Input**: Design documents from `/specs/003-openai-image-provider/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Organization**: Single user story (P1 core swap) with P2/P3 error-handling tasks included inline. No tests requested.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Install the new dependency and prepare the environment configuration.

- [ ] T001 Install `openai` npm package: `npm install openai` and verify it appears in `package.json` `dependencies`
- [ ] T002 [P] Create `.env.local` at repository root with `OPENAI_API_KEY=sk-...your-key-here...` placeholder (file is already `.gitignore`d — do not commit a real key)

**Checkpoint**: `openai` in `node_modules`; `.env.local` present with placeholder key.

---

## Phase 2: Foundational (Type contract widening)

**Purpose**: Widen `ProviderGenerationResult` so downstream consumers accept both SVG and PNG output before the new provider is wired in.

**⚠️ CRITICAL**: Must be complete before Phase 3 — the new provider returns `"image/png"` / `"png"` which the current literal types reject.

- [ ] T003 Widen the `ok: true` branch of `ProviderGenerationResult` in `lib/assets/provider-adapter.ts`: change `mimeType: "image/svg+xml"` → `mimeType: string` and `extension: "svg"` → `extension: string`

**Checkpoint**: TypeScript accepts `mimeType: "image/png"` and `extension: "png"` at the type level — run `npm run build` to confirm no type errors before proceeding.

---

## Phase 3: User Story 1 — Generate real images via OpenAI (Priority: P1) 🎯 MVP

**Goal**: Implement `OpenAIImageProvider` behind the existing `ImageProviderAdapter` boundary so the pipeline returns real AI-generated PNGs instead of SVG stubs when `OPENAI_API_KEY` is set.

**Independent Test**: Set `OPENAI_API_KEY` in `.env.local`, start `npm run dev`, call `POST /api/episodes/<normalizedKey>/assets/images/generate`, and confirm the response contains `reference.mimeType: "image/png"` with a valid `.png` file accessible via `GET` on the returned `viewUrl`.

### Implementation for User Story 1

- [ ] T004 [US1] Implement `OpenAIImageProvider` class in `lib/assets/provider-adapter.ts`:
  - Constructor reads `process.env.OPENAI_API_KEY`; throws immediately if absent (hard startup failure per FR-004)
  - `generateImage()` calls OpenAI Images API with `model: "gpt-image-2"`, `response_format: "b64_json"`
  - Decodes the `b64_json` string to a `Buffer` and returns `{ ok: true, bytes, mimeType: "image/png", extension: "png" }`
  - On primary model failure, retries once with `model: "gpt-image-1"` before recording a failure (FR-003)
  - Maps OpenAI error types to internal error codes (auth → `AUTH_FAILURE`, content policy → `PROMPT_REJECTED`, rate limit → `RATE_LIMITED`, other → `PROVIDER_ERROR`) — no raw provider messages in results (FR-006)

- [ ] T005 [US1] Wire provider selection into the singleton factory in `lib/assets/generation-service.ts`:
  - Import `OpenAIImageProvider` alongside `LocalDeterministicImageProvider`
  - In `getEpisodeAssetGenerationService()`: use `OpenAIImageProvider` when `process.env.OPENAI_API_KEY` is set, otherwise fall back to `LocalDeterministicImageProvider`

**Checkpoint**: User Story 1 fully functional — real PNG assets stored and retrievable. Retrieval endpoint returns `mimeType: "image/png"` for newly generated assets.

---

## Phase 4: User Story 2 — Partial success (Priority: P2)

**Goal**: Verify partial-success behavior is preserved with the new provider (per-prompt failures mapped to internal error codes, successful assets still available).

**Independent Test**: Trigger a generation request where at least one prompt causes an OpenAI error; confirm response has `status: "partial-success"`, successful assets have valid references, failed asset records contain a mapped (not raw) error reason.

*No additional implementation tasks required* — partial-success is handled by the existing `EpisodeAssetGenerationService` aggregation logic; the error-code mapping implemented in T004 is sufficient. Verify by manual quickstart scenario.

---

## Phase 5: User Story 3 — Missing / invalid key feedback (Priority: P3)

**Goal**: Operators receive a clear configuration error (not a generic provider failure) when `OPENAI_API_KEY` is absent or rejected by OpenAI.

**Independent Test**: Remove `OPENAI_API_KEY` from `.env.local`, restart dev server, submit a generation request, and confirm the response includes a distinct error indicating a configuration problem.

*No additional implementation tasks required* — the constructor guard implemented in T004 covers missing-key rejection (FR-004). Auth error mapping in T004 covers the invalid-key case (FR-006). Verify by manual quickstart scenario.

---

## Phase 6: Quality Gates & Documentation

**Purpose**: Confirm the implementation passes all quality gates and quickstart instructions are accurate.

- [ ] T006 [P] Update `specs/003-openai-image-provider/quickstart.md` Step 2 env-var instructions to reflect the actual `.env.local` format (already drafted in quickstart.md — confirm it matches the implemented provider construction behavior)
- [ ] T007 Run `npm run lint` and fix any lint errors
- [ ] T008 Run `npm run build` and confirm zero TypeScript or build errors

**Checkpoint**: All quality gates pass. Feature is ready for human review before merge.

---

## Dependencies

```
T001 (install package) ──────────────────────────────────────► T004 (OpenAIImageProvider)
T002 (env.local)  ──────────────────────────────────────────► T004
T003 (type widening) ────────────────────────────────────────► T004 ──► T005 ──► T007 ──► T008
T006 (quickstart docs) — independent, can run in parallel with T007/T008
```

## Parallel Execution (User Story 1)

T001, T002, T006 can all start immediately and run concurrently. T003 must complete before T004. T005 depends on T004. T007 and T008 are the final gate.

## Implementation Strategy

**MVP scope**: T001 → T003 → T004 → T005 — this alone delivers the full P1 user story. Quality gates (T007, T008) and documentation (T006) are fast follow-ons. P2 and P3 are verified by the existing aggregation logic and the error mapping in T004; no extra code is needed.
