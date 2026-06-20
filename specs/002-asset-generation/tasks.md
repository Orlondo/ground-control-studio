# Tasks: Episode Asset Generation (Phase 2)

**Input**: Design documents from `/specs/002-asset-generation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/image-assets.openapi.yaml

**Tests**: No dedicated automated test tasks are included because the feature spec does not explicitly require TDD or new automated tests for this phase. Validation is covered via quickstart scenarios plus lint/build quality gates.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create core files and module boundaries for image asset generation.

- [X] T001 Create asset domain contracts module in lib/assets/contracts.ts
- [X] T002 Create provider adapter interface for prompt-to-image generation in lib/assets/provider-adapter.ts
- [X] T003 [P] Create storage adapter interface for persisted image references in lib/assets/storage-adapter.ts
- [X] T004 [P] Create repository module for generation requests and asset records in lib/assets/repository.ts
- [X] T005 [P] Add generated asset root placeholder for tracked storage path in public/generated-assets/.gitkeep

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared infrastructure required before any user story work.

**CRITICAL**: Complete this phase before implementing user stories.

- [X] T006 Implement runtime request/result validators and status helpers in lib/assets/contracts.ts
- [X] T007 Implement file-backed persistence for EpisodeAssetGenerationRequest records in lib/assets/repository.ts
- [X] T008 [P] Implement file-backed persistence for ImageAssetRecord entries in lib/assets/repository.ts
- [X] T009 [P] Implement local provider adapter with deterministic success/failure mapping in lib/assets/provider-adapter.ts
- [X] T010 [P] Implement storage adapter for writing files and building view/download URLs in lib/assets/storage-adapter.ts
- [X] T011 Implement generation orchestration service for thumbnail and scene attempts in lib/assets/generation-service.ts

**Checkpoint**: Foundation complete; user stories can now be implemented.

---

## Phase 3: User Story 1 - Generate complete image assets for an episode (Priority: P1) 🎯 MVP

**Goal**: Generate one thumbnail and one scene image per scene prompt from an EpisodePackage and return usable references.

**Independent Test**: Submit a valid EpisodePackage to POST /api/episodes/{normalizedKey}/assets/images/generate and verify thumbnail + scene assets return with view/download URLs and traceability metadata.

### Implementation for User Story 1

- [X] T012 [US1] Implement generation POST route request validation and service wiring in app/api/episodes/[normalizedKey]/assets/images/generate/route.ts
- [X] T013 [US1] Map successful generation output to contract-compliant API response in app/api/episodes/[normalizedKey]/assets/images/generate/route.ts
- [X] T014 [P] [US1] Add client action to submit EpisodePackage image generation requests in app/page.tsx
- [X] T015 [US1] Render generated thumbnail and scene assets with view/download links in app/page.tsx
- [X] T016 [US1] Include normalizedKey and episodePackageId traceability fields in UI result panels in app/page.tsx

**Checkpoint**: User Story 1 is independently functional and demoable (MVP).

---

## Phase 4: User Story 2 - Handle partial success clearly (Priority: P2)

**Goal**: Surface mixed outcomes with clear request-level status and per-asset failure reasons while preserving successful assets.

**Independent Test**: Trigger one failing prompt and one successful prompt in the same generation request; verify partial-success status, accurate counts, failure reasons, and retained success references.

### Implementation for User Story 2

- [X] T017 [US2] Implement request-level success/partial-success/failure aggregation logic in lib/assets/generation-service.ts
- [X] T018 [US2] Persist failure records with errorReason and prompt linkage in lib/assets/repository.ts
- [X] T019 [US2] Return partial-success status and mixed asset outcomes from POST route in app/api/episodes/[normalizedKey]/assets/images/generate/route.ts
- [X] T020 [P] [US2] Render succeededCount, failedCount, and per-asset error messages in app/page.tsx

**Checkpoint**: User Story 2 mixed-outcome behavior is independently verifiable.

---

## Phase 5: User Story 3 - Retrieve and deliver generated image references (Priority: P3)

**Goal**: Retrieve stable generated-asset records by normalizedKey for downstream display/download workflows.

**Independent Test**: After generation, call GET /api/episodes/{normalizedKey}/assets/images and verify all records include metadata, status, and references for successful assets.

### Implementation for User Story 3

- [X] T021 [US3] Implement repository query for all requests and asset records by normalizedKey in lib/assets/repository.ts
- [X] T022 [US3] Implement GET retrieval route returning RetrievalResult payload in app/api/episodes/[normalizedKey]/assets/images/route.ts
- [X] T023 [P] [US3] Add client retrieval action to load existing assets by normalizedKey in app/page.tsx
- [X] T024 [US3] Render retrieval metadata for thumbnail/scene type and status in app/page.tsx

**Checkpoint**: User Story 3 retrieval flow is independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, validation, and phase-scope checks.

- [X] T025 [P] Align quickstart payloads and endpoint examples with implemented routes in specs/002-asset-generation/quickstart.md
- [X] T026 [P] Document Phase 2 image generation and retrieval usage in README.md
- [X] T027 Add implementation notes and requirement traceability updates in specs/002-asset-generation/plan.md
- [X] T028 Execute lint/build quality gates and record completion in specs/002-asset-generation/tasks.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): No dependencies.
- Phase 2 (Foundational): Depends on Phase 1 and blocks all user stories.
- Phase 3 (US1): Depends on Phase 2.
- Phase 4 (US2): Depends on Phase 2 and builds on US1 generation flow.
- Phase 5 (US3): Depends on Phase 2 and generated records; can begin after US1 endpoint contracts are stable.
- Phase 6 (Polish): Depends on completion of selected user stories.

### User Story Dependencies

- US1 (P1): No dependency on other user stories after Foundational.
- US2 (P2): Depends on US1 generation request flow to express mixed outcomes.
- US3 (P3): Depends on persisted records from generation flow (US1/US2).

---

## Parallel Opportunities

- Setup parallel tasks: T003, T004, T005.
- Foundational parallel tasks: T008, T009, T010 (after T006/T007 interfaces are in place).
- US1 parallel tasks: T014 can run after T012 route contract shape is clear.
- US2 parallel tasks: T020 can run while backend aggregation logic (T017-T019) is implemented.
- US3 parallel tasks: T023 can run while retrieval route (T022) is being implemented.

---

## Parallel Example: User Story 1

```bash
# Parallelizable US1 work after API contract is stable:
Task T014: Add client action to submit EpisodePackage image generation requests in app/page.tsx
Task T015: Render generated thumbnail and scene assets with view/download links in app/page.tsx
```

## Parallel Example: User Story 2

```bash
# Parallelizable US2 work once partial-success shape is agreed:
Task T018: Persist failure records with errorReason and prompt linkage in lib/assets/repository.ts
Task T020: Render succeededCount, failedCount, and per-asset error messages in app/page.tsx
```

## Parallel Example: User Story 3

```bash
# Parallelizable US3 work with retrieval response contract:
Task T022: Implement GET retrieval route returning RetrievalResult payload in app/api/episodes/[normalizedKey]/assets/images/route.ts
Task T023: Add client retrieval action to load existing assets by normalizedKey in app/page.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) generation endpoint + UI rendering.
3. Validate US1 independently via quickstart Scenario A.
4. Demo and lock baseline before mixed-outcome and retrieval work.

### Incremental Delivery

1. Setup + Foundational infrastructure.
2. US1 complete generation flow.
3. US2 partial-success clarity and failure handling.
4. US3 retrieval and downstream consumption support.
5. Polish docs and quality-gate verification.

### Suggested MVP Scope

- MVP = Phase 1 + Phase 2 + Phase 3 (US1 only).
- Defer US2/US3 if timeline requires fastest value delivery.

---

## Notes

- All tasks use strict checklist format: `- [ ] T### [P?] [US?] Description with file path`.
- `[US#]` labels are only used in user story phases.
- Keep Phase 2 implementation scope locked to still images, storage, and delivery only.
