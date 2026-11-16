# Implementation Plan: Emotional Story Beats for Episode Panels

**Branch**: `005-story-beats` | **Spec**: [spec.md](./spec.md)

## Summary

Add an LLM beat step between StoryContext and package assembly. Beats are validated in code, judged for tone fit by a second LLM call, retried once with feedback, and then used as the only source for the script and scene prompts.

## Flow

```
validateEpisodeBrief → generateStoryContext → generateStoryBeats → buildEpisodePackage(brief, context, beats)
                                                 ├─ llm.completeStoryBeats({ brief, storyContext, previousIssues })
                                                 ├─ validateStoryBeats(raw)          (count, completeness, adjacent emotions)
                                                 └─ llm.judgeToneFit({ tone, beats }) → validateToneVerdicts
                                                    (any issue → retry once → StoryBeatsGenerationError)
```

## Files

- `lib/episode/types.ts`: `StoryBeat`, `EpisodePackage.beats`.
- `lib/episode/story-beats.ts` (new): `StoryBeatsLLM`, `validateStoryBeats`, `validateToneVerdicts`, `generateStoryBeats`, `StoryBeatsGenerationError`.
- `lib/episode/openai-story-beats-client.ts` (new): `OpenAIStoryBeatsClient` with `completeStoryBeats` and `judgeToneFit` (strict JSON schemas, `gpt-4.1-mini`).
- `lib/episode/openai-story-context-client.ts`: export the shared model resolution and error description.
- `lib/episode/generator.ts`: `buildScript(beats)`, `buildScenePrompts(beats)`, `buildThumbnailPrompt(brief, storyContext)`; `generateEpisodePackage(input, llm: EpisodeLLM)`; version `3.0.0`.
- `lib/assets/prompt-builder.ts`: `NO_TEXT_RULE` added to every image prompt by `withStoryContext`.
- `app/api/episodes/generate/route.ts`: map `StoryBeatsGenerationError` → `502 STORY_BEATS_FAILED`.
- `app/page.tsx`: Story Beats panel.

## Constitution Check

- Spec-first: this spec precedes code.
- Typed contracts + runtime validation of all LLM output.
- No silent fallbacks; explicit error codes.
- Quality gates: `npm test`, `npm run lint`, `npm run build`.
