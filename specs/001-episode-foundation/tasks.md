# Tasks: Episode Package Foundation

**Input**: Design documents from `/specs/001-episode-foundation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: No explicit automated tests were requested. Include validation tasks only where they are directly implied by the plan or quickstart.

**Organization**: Tasks are grouped by phase and by user story so each story can be implemented and reviewed independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing Next.js app shell and visual baseline for the Episode Studio flow.

- [ ] T001 [P] Replace the default landing content in app/page.tsx with the Episode Studio scaffold and placeholder sections for brief input and output review.
- [ ] T002 [P] Update app/layout.tsx metadata, root title, and body shell so the app presents as Liminal Episode Studio instead of the starter template.
- [ ] T003 [P] Establish the app-wide visual foundation in app/globals.css with the episode studio color system, spacing, and responsive layout primitives.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared domain layer that every user story depends on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [ ] T004 [P] Define the canonical episode domain types in lib/episode/types.ts for EpisodeBrief, EpisodePackage, ScenePrompt, ClipIdea, and EpisodeGenerationResult.
- [ ] T005 [P] Implement runtime input guards and incomplete-request handling in lib/episode/validation.ts for trimmed location, era, and atmosphere values.
- [ ] T006 [P] Implement deterministic normalization helpers in lib/episode/normalization.ts to canonicalize spacing, punctuation, and casing into a normalizedKey.
- [ ] T007 Implement the pure episode generator in lib/episode/generator.ts so validated briefs produce a typed EpisodePackage or an explicit needs-input result.

**Checkpoint**: The shared episode domain module is ready, and the user stories can now be implemented independently.

---

## Phase 3: User Story 1 - Generate a complete episode package (Priority: P1) 🎯 MVP

**Goal**: A creator can enter location, era, and atmosphere and receive a complete episode package ready for review.

**Independent Test**: Submit all three required inputs in the UI and verify that the response includes title, script, scene prompts, thumbnail prompt, short-form clip ideas, description, and tags in one coherent package.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Build the episode brief form and submit flow in app/page.tsx for location, era, and atmosphere entry.
- [ ] T009 [P] [US1] Style the brief form, result panels, and responsive layout states in app/globals.css so the generated package is readable on desktop and mobile.
- [ ] T010 [US1] Render the complete EpisodePackage in app/page.tsx by wiring the form submission to lib/episode/generator.ts and displaying title, script, scene prompts, thumbnail prompt, short-form clip ideas, description, and tags.
- [ ] T011 [US1] Surface incomplete-request results in app/page.tsx using the messages from lib/episode/validation.ts so the UI prompts for missing creative context instead of inventing output.

**Checkpoint**: User Story 1 should now deliver the core Phase 1 value on its own.

---

## Phase 4: User Story 2 - Reproduce the same package from the same brief (Priority: P2)

**Goal**: Re-entering the same brief returns the same package so teams can compare and review a stable result.

**Independent Test**: Submit the same brief more than once, including variants with different capitalization or spacing, and confirm the EpisodePackage content remains identical.

### Implementation for User Story 2

- [ ] T012 [P] [US2] Canonicalize whitespace, punctuation, and casing into a stable normalizedKey in lib/episode/normalization.ts.
- [ ] T013 [US2] Make lib/episode/generator.ts derive repeatable EpisodePackage content from the normalized brief and a stable generatorVersion.
- [ ] T014 [P] [US2] Expose normalized brief metadata in app/page.tsx so repeated submissions can be compared visually during review.

**Checkpoint**: User Story 2 should now be reproducible without changing the core package shape from User Story 1.

---

## Phase 5: User Story 3 - Keep Phase 1 strictly scoped (Priority: P3)

**Goal**: The feature stays text-only and excludes later-phase capabilities.

**Independent Test**: Review the interface and generated output to confirm that there is no auth, database, publishing pipeline, image generation, or voice generation behavior.

### Implementation for User Story 3

- [ ] T015 [P] [US3] Add scope-locked status copy and empty-state messaging in app/page.tsx that explicitly excludes auth, persistence, publishing, image generation, and voice generation.
- [ ] T016 [US3] Tighten scope-safe output construction in lib/episode/generator.ts so generated content stays limited to text-based episode planning.
- [ ] T017 [P] [US3] Document Phase 1 scope boundaries and validation expectations in specs/001-episode-foundation/quickstart.md for future reviewers.

**Checkpoint**: User Story 3 should confirm that Phase 1 remains narrow, text-only, and reviewable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup that applies across the feature.

- [ ] T018 Run npm run lint and npm run build, then fix any issues in app/page.tsx, app/layout.tsx, app/globals.css, or lib/episode/*.ts.
- [ ] T019 [P] Verify the quickstart scenarios manually in the browser: complete package generation, repeated-brief determinism, and scope checks using app/page.tsx.
- [ ] T020 [P] Final pass on copy and metadata in app/layout.tsx, app/globals.css, and app/page.tsx so the feature reads as a cohesive Episode Studio experience.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. Blocks all user stories.
- **User Stories (Phase 3+)**: Depend on the Foundational phase.
  - User stories can then proceed in priority order, or in parallel if staffing allows.
- **Polish (Phase 6)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational. This is the MVP.
- **User Story 2 (P2)**: Can start after Foundational. It reinforces determinism without changing the core output shape.
- **User Story 3 (P3)**: Can start after Foundational. It constrains scope and preserves the Phase 1 boundary.

### Within Each User Story

- Build shared UI or domain changes before dependent wiring.
- Keep each story independently reviewable and testable.
- Preserve the output shape established in Phase 2.

## Parallel Opportunities

- Setup tasks T001, T002, and T003 can run in parallel because they touch different files.
- Foundational tasks T004, T005, and T006 can run in parallel because they define separate domain concerns.
- User Story 1 tasks T008 and T009 can run in parallel because they split UI structure and styling.
- User Story 2 tasks T012 and T014 can run in parallel because one is domain normalization and the other is review metadata.
- User Story 3 tasks T015 and T017 can run in parallel because one is UI copy and the other is documentation.
- Polish tasks T019 and T020 can run in parallel after validation if no blocking issues are found.

## Parallel Example: User Story 1

```bash
Task: "Build the episode brief form and submit flow in app/page.tsx for location, era, and atmosphere entry."
Task: "Style the brief form, result panels, and responsive layout states in app/globals.css so the generated package is readable on desktop and mobile."
```

## Parallel Example: User Story 2

```bash
Task: "Canonicalize whitespace, punctuation, and casing into a stable normalizedKey in lib/episode/normalization.ts."
Task: "Expose normalized brief metadata in app/page.tsx so repeated submissions can be compared visually during review."
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational domain work.
3. Complete Phase 3 User Story 1.
4. Stop and validate that a complete package is generated and rendered correctly.

### Incremental Delivery

1. Ship the shared domain module first.
2. Add the complete package UI as the MVP.
3. Add deterministic normalization and comparison-ready behavior next.
4. Add scope guardrails and documentation last.
5. Finish with lint, build, and manual quickstart validation.

### Suggested MVP Scope

- Deliver User Story 1 only: complete episode package generation from location, era, and atmosphere.
- Keep later stories out of the MVP until the core package flow is verified.

## Notes

- [P] tasks can run in parallel when they touch different files and have no dependency on incomplete work.
- User story phases are intentionally independent so each story can be reviewed on its own.
- The quickstart validation tasks are included because the plan and quickstart explicitly call for lint, build, and manual browser verification.