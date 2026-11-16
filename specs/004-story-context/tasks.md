---
description: "Task list for Shared Story Context for Episode Images"
---

# Tasks: Shared Story Context for Episode Images

**Input**: Design documents from `/specs/004-story-context/`

**Prerequisites**: plan.md, spec.md

**Tests**: Requested. Unit tests cover StoryContext generation and prompt building.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Add `vitest` dev dependency, `vitest.config.ts` with the `@/` alias, and an `npm test` script.
- [X] T002 [P] Update `specs/001-episode-foundation/spec.md` to drop the same-brief-same-package guarantee.

## Phase 2: Foundational

- [X] T003 Add `StoryCharacter` and `StoryContext` types and `EpisodePackage.storyContext` in `lib/episode/types.ts` (FR-001).

## Phase 3: User Story 1 - Shared story context (P1)

- [X] T004 [US1] Implement `StoryContextLLM`, `validateStoryContext`, `generateStoryContext`, and `StoryContextGenerationError` in `lib/episode/story-context.ts` (FR-002, FR-003, FR-005).
- [X] T005 [US1] Implement `OpenAIStoryContextClient` in `lib/episode/openai-story-context-client.ts` with default model `gpt-4.1-mini` and `OPENAI_STORY_MODEL` override (FR-008).
- [X] T006 [US1] Split `lib/episode/generator.ts` into `buildEpisodePackage` and async `generateEpisodePackage` that runs the StoryContext step before the script (FR-002).
- [X] T007 [US1] Add `POST /api/episodes/generate` in `app/api/episodes/generate/route.ts` (FR-005, FR-007).
- [X] T008 [US1] Update `app/page.tsx` to call the route, show errors, and render the StoryContext.

## Phase 4: User Story 2 - Context on every image prompt (P1)

- [X] T009 [US2] Add `formatStoryContext` and `withStoryContext` in `lib/assets/prompt-builder.ts`.
- [X] T010 [US2] Prepend the story context in `buildTargets` in `lib/assets/generation-service.ts` for every scene and the thumbnail (FR-004).
- [X] T011 [US2] Require a valid `package.storyContext` in `validateGenerateImageAssetsRequest` in `lib/assets/contracts.ts`.

## Phase 5: User Story 3 - Explicit failures (P2)

- [X] T012 [US3] Map missing key, API errors, and invalid output to `StoryContextGenerationError` and a `502 STORY_CONTEXT_FAILED` response (FR-005).

## Phase 6: Tests and Polish

- [X] T013 [P] Unit tests for `generateStoryContext` and `validateStoryContext` (success, LLM error, malformed output, missing fields).
- [X] T014 [P] Unit tests for `formatStoryContext`, `withStoryContext`, and `buildTargets` prefixing every scene and the thumbnail.
- [X] T015 [P] Unit tests for `generateEpisodePackage` ordering (StoryContext before script) and failure propagation.
- [X] T016 Update README and `.github/copilot-instructions.md`; run `npm test`, `npm run lint`, `npm run build`.

## Dependencies

- T003 blocks T004 to T011. T004 blocks T005 to T007. T009 blocks T010.
