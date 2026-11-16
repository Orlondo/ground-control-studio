# Implementation Plan: Shared Story Context for Episode Images

**Branch**: `004-story-context` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from [spec.md](spec.md)

## Summary

Add a `StoryContext` to `EpisodePackage`, generate it with an LLM (OpenAI `gpt-4.1-mini` via the `openai` SDK, structured JSON output) in a dedicated `generateStoryContext` step that runs before the script is built, and prepend a formatted story context block to every scene and thumbnail prompt when image targets are built. Episode generation moves from the browser to a new server route so the API key stays on the server. LLM failures surface as `STORY_CONTEXT_FAILED` with no fallback. The image provider is untouched.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js 16.2.9 (React 19.2.4)

**Primary Dependencies**: `openai` npm SDK (already installed); `vitest` (new, dev only)

**Storage**: Unchanged.

**Testing**: `npm test` (Vitest unit tests with a fake LLM client, no network), `npm run lint`, `npm run build`

**Target Platform**: Server-side Next.js route handlers plus the existing client page

**Constraints**: No changes to `lib/assets/provider-adapter.ts`. No generic fallback context. Model overridable via `OPENAI_STORY_MODEL`.

## Constitution Check

- **I. Spec-First Delivery**: pass. This spec, plan, and tasks precede implementation.
- **II. Scope-Locked Phase Execution**: pass. In scope: StoryContext type, LLM step, prompt prefixing, server route, UI wiring, tests. Out of scope: review/edit UI, provider/model changes, script/scene template rewrites.
- **III. Typed Contracts and Validation**: pass. `StoryContext` is typed and validated at runtime both on LLM output and on the image generation request payload.
- **IV. Quality Gates Before Merge**: pass. Adds unit tests; lint, build, and tests required.
- **V. Human Review and Traceability**: pass. Changes go through a PR; tasks map to FRs.

## Design

- `lib/episode/types.ts`: `StoryCharacter`, `StoryContext`; `EpisodePackage.storyContext`.
- `lib/episode/story-context.ts`: `StoryContextLLM` interface, `validateStoryContext(raw)`, `generateStoryContext(brief, llm)`, `StoryContextGenerationError`.
- `lib/episode/openai-story-context-client.ts` (server-only): `OpenAIStoryContextClient` implementing `StoryContextLLM` with `chat.completions.create` and a strict JSON schema. Throws when `OPENAI_API_KEY` is missing.
- `lib/episode/generator.ts`: `buildEpisodePackage(brief, storyContext)` (pure, synchronous) and async `generateEpisodePackage(input, llm)` that validates the brief, calls `generateStoryContext`, then builds the package.
- `lib/assets/prompt-builder.ts`: `formatStoryContext(context)` and `withStoryContext(context, prompt)`.
- `lib/assets/generation-service.ts`: `buildTargets` prepends the story context to every target prompt.
- `lib/assets/contracts.ts`: `validateGenerateImageAssetsRequest` requires a valid `package.storyContext`.
- `app/api/episodes/generate/route.ts`: `POST` returns `200` package, `400` needs-input, `502` `STORY_CONTEXT_FAILED`.
- `app/page.tsx`: submit calls the route, shows errors, and renders the StoryContext.

Prefixing happens when image targets are built, not when the package is built, so a later review/edit of StoryContext changes the images without rebuilding prompts.

## Project Structure

```text
specs/004-story-context/   spec.md, plan.md, tasks.md
lib/episode/               types.ts, story-context.ts (new), openai-story-context-client.ts (new), generator.ts
lib/assets/                prompt-builder.ts (new), generation-service.ts, contracts.ts
app/api/episodes/generate/route.ts (new)
app/page.tsx
tests/                     Vitest unit tests (new)
vitest.config.ts (new), package.json (test script, vitest)
```

## Complexity Tracking

No constitution violations.
