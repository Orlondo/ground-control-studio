# Feature Specification: Episode Package Foundation

**Feature Branch**: `[001-phase-one]`
**Created**: 2026-06-20
**Status**: Draft
**Input**: User description: "Liminal Episode Studio Phase 1. Build a deterministic episode-generation foundation for a Next.js + TypeScript app. User inputs are location, era, and atmosphere. Outputs are title, script, scene prompts, thumbnail prompt, short-form clip ideas, description, and tags. Scope constraints: no auth, no database, no publishing pipeline, no image generation, no voice generation, and keep the scope strictly Phase 1."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a complete episode package (Priority: P1)

As a creator, I can provide a location, era, and atmosphere and receive a complete episode package that is ready for review.

**Why this priority**: This is the core value of Phase 1. Without a complete package, the feature does not deliver a usable episode foundation.

**Independent Test**: Provide the three required inputs and verify that the returned package contains every required deliverable in a single response.

**Acceptance Scenarios**:

1. **Given** a valid location, era, and atmosphere, **When** generation is requested, **Then** the package includes a title, script, scene prompts, thumbnail prompt, short-form clip ideas, description, and tags.
2. **Given** a valid brief, **When** the package is reviewed, **Then** the outputs read as one coherent episode concept rather than unrelated fragments.

---

### User Story 2 - Trace the package back to the brief (Priority: P2)

As a reviewer, I can see the normalized brief behind each package so that teams can compare, approve, and discuss results for the same brief.

**Why this priority**: Reviewers need to know which brief produced a package. As of [004-story-context](../004-story-context/spec.md), packages include an LLM-generated StoryContext, so the same brief is not guaranteed to produce the same package.

**Independent Test**: Submit the same brief more than once, including variants with different capitalization or spacing, and confirm the normalized key is identical.

**Acceptance Scenarios**:

1. **Given** the same location, era, and atmosphere, **When** generation is repeated, **Then** the package carries the same normalized key and brief.
2. **Given** a brief entered with different capitalization, spacing, or punctuation, **When** it is submitted, **Then** it resolves to the same normalized key.

---

### User Story 3 - Keep Phase 1 strictly scoped (Priority: P3)

As a product owner, I can confirm the feature stays limited to text-based episode planning so that Phase 1 remains narrow and predictable.

**Why this priority**: Scope control prevents Phase 1 from drifting into later-phase capabilities that would slow delivery and blur the product boundary.

**Independent Test**: Review the generated package and confirm that it contains only the approved Phase 1 deliverables.

**Acceptance Scenarios**:

1. **Given** a request that implies visual or audio production, **When** the request is handled, **Then** the response remains limited to text-based episode planning and excludes those workflows.
2. **Given** the feature is reviewed, **When** scope is checked, **Then** there is no authentication, persistence, publishing, image generation, or voice generation behavior in Phase 1.

---

### Edge Cases

- One or more inputs are missing or too vague to support a coherent episode package.
- The same brief is entered with different capitalization, spacing, or punctuation.
- The location, era, and atmosphere suggest conflicting tones that must still resolve into one cohesive concept.
- A request implies out-of-scope capabilities such as publishing, image generation, or voice generation.
- The brief is broad enough that multiple episode directions are possible, but the output still needs a single decisive package.
- Tags or scene prompts risk becoming generic unless they remain tightly tied to the supplied brief.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept location, era, and atmosphere as the only required creative inputs for a Phase 1 episode request.
- **FR-002**: The system MUST return a complete EpisodePackage containing a title, script, scene prompts, thumbnail prompt, short-form clip ideas, description, and tags.
- **FR-003**: The system MUST define EpisodePackage as the canonical output shape for every episode request so the result can be reviewed as a consistent artifact.
- **FR-004**: The system MUST preserve a clear relationship between the input brief and the resulting EpisodePackage so reviewers can trace the package back to the source intent.
- **FR-005**: The system MUST derive the same normalized key from the same input brief, regardless of capitalization, spacing, or punctuation. Identical EpisodePackage content for the same brief is no longer required (see 004-story-context).
- **FR-006**: The system MUST keep Phase 1 strictly text-focused and MUST NOT include authentication, user accounts, persistent storage, publishing, image generation, or voice generation.
- **FR-007**: The system MUST handle incomplete or insufficiently specific inputs by prompting for missing creative context or returning a clearly incomplete-request state instead of inventing missing intent.
- **FR-008**: The system MUST keep outputs usable as a standalone planning artifact without requiring external workflow steps.
- **FR-009**: The system MUST keep the EpisodePackage structure consistent across all generated episodes, regardless of topic, tone, or setting.

### Key Entities *(include if feature involves data)*

- **EpisodeBrief**: The user-supplied creative input, consisting of location, era, and atmosphere.
- **EpisodePackage**: The canonical output artifact for one episode concept, containing the approved Phase 1 deliverables and a clear connection to the source brief.
- **ScenePrompt**: A single scene-level prompt that helps shape the episode visually.
- **ClipIdea**: A short-form clip concept derived from the episode package for later content exploration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a sample of 20 valid requests, 20 out of 20 return every required EpisodePackage deliverable.
- **SC-002**: In 10 repeated runs using the same brief (including casing/spacing variants), 10 out of 10 produce the same normalized key.
- **SC-003**: At least 9 out of 10 reviewers can understand the episode concept and intended mood from the package without asking for extra clarification.
- **SC-004**: Zero accepted packages include authentication, persistence, publishing, image generation, or voice generation behavior.
- **SC-005**: At least 90% of first-time testers can complete a request using only location, era, and atmosphere and receive a usable package on the first attempt.

## Assumptions

- Users can describe a location, an era, and an atmosphere with enough detail to seed a coherent episode idea.
- Phase 1 is text-only and does not persist user data between sessions.
- The same brief is not guaranteed to produce the same EpisodePackage, because the StoryContext is generated by an LLM (004-story-context). Normalization of the brief remains deterministic.
- No authentication or account management is required for this phase.
- The EpisodePackage shape is the shared contract for downstream planning work in later phases.
