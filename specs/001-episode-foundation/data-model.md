# Data Model: Episode Package Foundation

## EpisodeBrief

Represents the user-supplied creative brief for a single episode request.

Fields:
- `location: string` - required, trimmed, non-empty
- `era: string` - required, trimmed, non-empty
- `atmosphere: string` - required, trimmed, non-empty
- `normalizedKey: string` - derived, canonical representation used to keep generation deterministic

Validation rules:
- All three user inputs must be present before generation can produce a complete package.
- Input strings should be trimmed before validation and normalization.
- Missing or vague values return an incomplete-request state instead of inferred content.

Relationship:
- One EpisodeBrief produces one EpisodePackage when the request is complete.

## EpisodePackage

Canonical output artifact for a complete Phase 1 request.

Fields:
- `brief: EpisodeBrief` - source brief used to derive the package
- `title: string`
- `script: string`
- `scenePrompts: ScenePrompt[]`
- `thumbnailPrompt: string`
- `shortFormClipIdeas: ClipIdea[]`
- `description: string`
- `tags: string[]`
- `generatorVersion: string` - internal traceability marker for deterministic output rules

Validation rules:
- Every package must contain all required deliverables.
- Text fields should stay tightly aligned to the source brief.
- Tags, prompts, and clip ideas must remain text-only and scope-locked to planning content.

Relationship:
- EpisodePackage is derived from exactly one EpisodeBrief.

## ScenePrompt

Represents one scene-level prompt inside the package.

Fields:
- `order: number` - positive integer to preserve sequence
- `prompt: string` - concise scene description tied to the brief

Validation rules:
- Scene prompts must be ordered and non-empty.
- Prompt text should remain coherent with the package title and script.

## ClipIdea

Represents one short-form clip concept derived from the episode package.

Fields:
- `order: number` - positive integer to preserve sequence
- `idea: string` - concise short-form content concept

Validation rules:
- Clip ideas must stay text-only and derived from the package theme.
- Clip ideas should not imply editing, publishing, or media generation workflows.

## EpisodeGenerationResult

Discriminated result type used to represent either a complete package or an incomplete request.

Fields:
- `status: "complete" | "needs-input"`
- `package?: EpisodePackage`
- `missingFields?: Array<"location" | "era" | "atmosphere">`
- `message?: string`

Validation rules:
- `status = "complete"` requires `package`.
- `status = "needs-input"` requires a clear message and the missing fields list.

Relationship:
- This wrapper keeps incomplete requests explicit without inventing missing creative intent.

## State Flow

1. User enters location, era, and atmosphere.
2. Inputs are trimmed and normalized.
3. Validation checks whether all required fields are present and usable.
4. The generator returns either a complete EpisodePackage or a needs-input result.
5. The UI renders the result directly for review.