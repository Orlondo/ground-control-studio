# Feature Specification: Episode Asset Generation (Phase 2)

**Feature Branch**: `[002-asset-generation]`
**Created**: 2026-06-19
**Status**: Draft
**Input**: User description: "Create a new Spec Kit feature specification on branch 002-asset-generation for Phase 2: Episode Asset Generation. Context: Phase 1 already generates a deterministic EpisodePackage (title, script, scene prompts, thumbnail prompt, short-form ideas, description, tags). Phase 2 goal is to create real media assets for each episode, starting with still images first. Keep this phase tightly scoped to image asset generation and storage/delivery, not voice or video yet."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate complete image assets for an episode (Priority: P1)

As a creator, I can generate a thumbnail image and scene images from an existing EpisodePackage so I can review actual visual assets instead of text prompts.

**Why this priority**: This is the primary Phase 2 value. Without generated images, the phase does not deliver tangible media assets.

**Independent Test**: Submit a valid EpisodePackage with thumbnail and scene prompts, then verify that one thumbnail image and scene image outputs are produced with viewable/downloadable references.

**Acceptance Scenarios**:

1. **Given** an EpisodePackage with a thumbnail prompt and scene prompts, **When** image generation is requested, **Then** the system generates a thumbnail image and one image per scene prompt.
2. **Given** successful generation, **When** the response is returned, **Then** each generated image includes references that allow viewing and downloading.
3. **Given** a completed generation request, **When** a user inspects the returned assets, **Then** each asset is traceable to the source EpisodePackage and normalizedKey.

---

### User Story 2 - Handle partial success clearly (Priority: P2)

As an operator, I can see which images succeeded and which failed in one request so I can continue work without losing successful outputs.

**Why this priority**: Image generation can fail per prompt; clear partial-success behavior protects throughput and reduces rework.

**Independent Test**: Trigger a request where at least one prompt fails and at least one prompt succeeds, then verify the response status and per-asset outcomes clearly separate successes and failures.

**Acceptance Scenarios**:

1. **Given** a mixed-outcome generation run, **When** the response is returned, **Then** the overall request status is partial-success and includes counts for succeeded and failed assets.
2. **Given** failed asset attempts, **When** results are reviewed, **Then** each failure includes a clear reason and identifies which prompt/asset type failed.
3. **Given** partial success, **When** users access results, **Then** successful assets remain available via their references.

---

### User Story 3 - Retrieve and deliver generated image references (Priority: P3)

As a consumer of episode outputs, I can access stable references for generated images so downstream workflows can display or download assets consistently.

**Why this priority**: Asset delivery is necessary to make generation output usable outside the immediate generation action.

**Independent Test**: After generation, request episode assets by normalizedKey and verify each listed asset includes metadata and valid view/download references.

**Acceptance Scenarios**:

1. **Given** previously generated image assets for an episode, **When** assets are retrieved by normalizedKey, **Then** the full set of generated asset records is returned.
2. **Given** an asset record, **When** it is viewed in a client, **Then** metadata distinguishes thumbnail versus scene assets and includes generation status.

---

### Edge Cases

- Thumbnail prompt is present but scene prompts are empty.
- One or more scene prompts are invalid, unsafe, or rejected while others succeed.
- Duplicate generation request is submitted for the same normalizedKey while a prior request is in progress.
- Source EpisodePackage exists but is missing normalizedKey linkage.
- Storage or reference delivery fails after an image is generated.
- Very large scene counts increase request duration and require clear in-progress versus completed status.
- Retrieval is requested for a normalizedKey with no generated assets.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept an existing EpisodePackage as the source input for image asset generation.
- **FR-002**: The system MUST generate exactly one thumbnail image from the EpisodePackage thumbnail prompt when the prompt is available and valid.
- **FR-003**: The system MUST generate scene images from each scene prompt in the EpisodePackage.
- **FR-004**: The system MUST create an asset record for each generation attempt, including successful and failed attempts.
- **FR-005**: The system MUST return a viewable reference and a downloadable reference for each successfully generated image asset.
- **FR-006**: The system MUST preserve traceability from each asset record to the source EpisodePackage identifier and normalizedKey.
- **FR-007**: The system MUST return a request-level status that supports success, partial-success, and failure outcomes.
- **FR-008**: The system MUST include per-asset status in responses, identifying asset type (thumbnail or scene), source prompt link, and error reason when generation fails.
- **FR-009**: The system MUST return successful asset references even when one or more assets in the same request fail.
- **FR-010**: The system MUST support retrieval of generated asset records and references by normalizedKey.
- **FR-011**: The system MUST keep this phase limited to still image generation, storage, and delivery.
- **FR-012**: The system MUST NOT include voice generation, video assembly, or publishing automation in this phase.

### Key Entities *(include if feature involves data)*

- **EpisodeAssetGenerationRequest**: A request to generate still images for one EpisodePackage; includes source EpisodePackage identifier, normalizedKey, request timestamp, and requested asset scope.
- **ImageAssetRecord**: A persistent record for one generated or attempted image; includes asset identifier, normalizedKey, source prompt reference, asset type (thumbnail or scene), generation status, error details (if failed), and creation timestamp.
- **ImageAssetReference**: Delivery references for a successful image asset; includes a view reference and download reference plus any expiration/availability metadata.
- **AssetGenerationResult**: Aggregated outcome for one request; includes overall status (success, partial-success, failure), succeeded/failed counts, and the collection of per-asset records.
- **EpisodePackageLink**: Traceability metadata connecting generated assets to the originating EpisodePackage and normalizedKey.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a test set of 30 valid EpisodePackages, at least 95% of thumbnail generation attempts complete with a usable asset reference.
- **SC-002**: In a test set of 30 valid EpisodePackages, at least 90% of scene prompt generation attempts complete with usable asset references.
- **SC-003**: 100% of successful image assets are retrievable by normalizedKey and include both view and download references.
- **SC-004**: 100% of mixed-outcome requests report partial-success status with accurate succeeded and failed counts.
- **SC-005**: 100% of generated asset records include traceability metadata to source EpisodePackage and normalizedKey.
- **SC-006**: 0 production behaviors in this phase perform voice generation, video assembly, or publishing automation.

## Assumptions

- Phase 1 EpisodePackage generation is already available and provides stable thumbnail and scene prompts.
- A normalizedKey is available for every EpisodePackage entering this phase.
- Users of this phase need still-image assets first, and can defer audio/video workflows to later phases.
- Generated image references can be made available for both viewing and downloading through existing delivery channels.
- Generation providers may fail per prompt; partial-success is an expected and acceptable operational state.

## Non-Goals

- Generating voice-over, narration, or any audio assets.
- Assembling scene images into videos or animated sequences.
- Publishing automation to external social or content platforms.
