---
description: "Task list for Emotional Story Beats for Episode Panels"
---

# Tasks: Emotional Story Beats for Episode Panels

**Input**: `/specs/005-story-beats/` spec.md, plan.md

**Tests**: Requested. Beats validation, tone judge, retry/error paths, and prompt building.

## Phase 1: Foundational

- [X] T001 Add `StoryBeat` and `EpisodePackage.beats` in `lib/episode/types.ts` (FR-001).

## Phase 2: User Story 1 - Emotional beats (P1)

- [X] T002 [US1] Implement `lib/episode/story-beats.ts`: `validateStoryBeats`, `validateToneVerdicts`, `generateStoryBeats` with one retry, `StoryBeatsGenerationError` (FR-002–FR-005).
- [X] T003 [US1] Implement `OpenAIStoryBeatsClient` in `lib/episode/openai-story-beats-client.ts` (FR-002, FR-003).

## Phase 3: User Story 2 - One beat list drives script and panels (P1)

- [X] T004 [US2] Build script and scene prompts from beats in `lib/episode/generator.ts`; run beats after StoryContext (FR-006).
- [X] T005 [US2] Add `NO_TEXT_RULE` to every image prompt in `lib/assets/prompt-builder.ts` (FR-007).
- [X] T006 [US2] Render beats in `app/page.tsx`.

## Phase 4: User Story 3 - Clear failures (P1)

- [X] T007 [US3] Map `StoryBeatsGenerationError` to `502 STORY_BEATS_FAILED` in `app/api/episodes/generate/route.ts` (FR-005).

## Phase 5: Tests and quality gates

- [X] T008 Add `tests/story-beats.test.ts`; extend generator and prompt-builder tests (SC-002, SC-003).
- [X] T009 Run `npm test`, `npm run lint`, `npm run build` (SC-004).
