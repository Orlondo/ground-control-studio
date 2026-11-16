# Feature Specification: OpenAI Image Provider Integration

**Feature Branch**: `003-openai-image-provider`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "Replace the local deterministic SVG image provider in liminal-episode-studio with the same OpenAI image provider strategy used in the sibling repository interior-image-factory."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate real images via OpenAI behind the existing adapter boundary (Priority: P1)

As an operator, I can trigger episode image generation and receive real AI-generated images from OpenAI instead of placeholder SVGs, without any changes to the rest of the asset generation pipeline.

**Why this priority**: This is the entire purpose of the feature. If the provider swap does not produce actual images from OpenAI, the feature delivers no value.

**Independent Test**: Configure `OPENAI_API_KEY` in the environment, trigger an image generation request for an existing EpisodePackage, and verify that the returned asset records contain real image files (not SVG stubs) with viewable and downloadable references.

**Acceptance Scenarios**:

1. **Given** `OPENAI_API_KEY` is configured and valid, **When** a generation request is submitted for an EpisodePackage with a thumbnail prompt, **Then** the system returns a real image asset stored and referenced in the same format as the previous provider output.
2. **Given** `OPENAI_API_KEY` is configured and valid, **When** a generation request is submitted with scene prompts, **Then** each scene prompt produces a real image asset stored and referenced consistently.
3. **Given** the new provider is in use, **When** results are returned, **Then** traceability from each asset to its source normalizedKey and prompt is preserved exactly as before.
4. **Given** the new provider is in use, **When** the asset retrieval endpoint is called, **Then** asset records are returned in the same structure as before the provider swap.

---

### User Story 2 - Handle partial success from the OpenAI provider per prompt (Priority: P2)

As an operator, I can review which individual image generations succeeded and which failed due to OpenAI errors, and continue using the successful outputs without retrying the whole batch.

**Why this priority**: OpenAI generation can fail per-prompt due to content policy, rate limits, or transient errors. The existing partial-success contract must be preserved with provider-specific failure reasons mapped to the internal error schema.

**Independent Test**: Trigger generation where at least one prompt causes an OpenAI rejection or error (e.g., using a prompt that violates content policy or by simulating a provider error). Verify the response carries partial-success status, successful assets are available, and failed assets include a mapped error reason rather than a raw provider error.

**Acceptance Scenarios**:

1. **Given** one prompt causes an OpenAI-side failure, **When** the generation request completes, **Then** the request-level status is partial-success, successful assets have valid references, and the failed asset record includes a mapped error reason.
2. **Given** all prompts fail on the OpenAI side, **When** the generation request completes, **Then** the request-level status is failure and no broken or partial asset files are persisted.
3. **Given** a provider-specific error (rate limit, network timeout, content policy), **When** the asset record is created for that failure, **Then** the error reason is expressed in terms of the internal error code schema, not raw OpenAI API messages.

---

### User Story 3 - Receive clear feedback when the OpenAI key is missing or invalid (Priority: P3)

As an operator, I can quickly identify that a generation failure is caused by a missing or invalid API key rather than a prompt-level or system-level problem.

**Why this priority**: Configuration errors should surface with actionable diagnostic information; silent failures or generic errors make the system hard to operate.

**Independent Test**: Remove or corrupt `OPENAI_API_KEY` in the environment, submit a generation request, and verify the system returns a distinct, operator-readable error indicating a configuration problem rather than a prompt-level failure.

**Acceptance Scenarios**:

1. **Given** `OPENAI_API_KEY` is absent from the environment, **When** a generation request is made, **Then** the system rejects the request at startup/configuration time with a clear error indicating the missing key.
2. **Given** `OPENAI_API_KEY` is present but rejected by OpenAI, **When** a generation request is submitted, **Then** the failure is mapped to an authentication error code distinct from prompt-level failures.

---

### Edge Cases

- `OPENAI_API_KEY` is set but expired or revoked mid-session.
- A prompt is valid but OpenAI applies content filtering and returns a rejection.
- OpenAI returns an unexpected response shape (missing image data field).
- The image model (`gpt-image-2`) rejects the request or is unavailable; the system records a failure with an accurate error code (no fallback model — `gpt-image-1` has been retired).
- Rate limiting causes some prompts in a batch to fail while others succeed (partial-success must be preserved).
- Network timeout occurs during image download/retrieval after the generation API call succeeds.
- A generation request is submitted with a very large number of scene prompts; throughput and ordering must remain deterministic.
- Storage write fails after successful image generation; the error must surface without losing the generation outcome metadata.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replace the local deterministic SVG provider with an OpenAI-backed image generation implementation behind the existing `ImageProviderAdapter` boundary, without altering the adapter interface contract.
- **FR-002**: The system MUST use `gpt-image-2` as the primary image generation model for all still-image prompts.
- **FR-003**: The system MUST NOT fall back to another image model when a `gpt-image-2` call fails; it records a generation failure for that prompt. *(Amended: the original `gpt-image-1` fallback was removed because that model has been retired.)*
- **FR-004**: The system MUST read `OPENAI_API_KEY` from the process environment and MUST reject configuration at initialization time if the key is absent.
- **FR-005**: The system MUST NOT hard-code or embed API keys, and secrets MUST be supplied exclusively via environment configuration for this repository.
- **FR-006**: The system MUST map OpenAI provider errors to internal error codes — `AUTH_FAILURE` only for genuine authentication errors (HTTP 401 or `invalid_api_key`), `PERMISSION_DENIED` (403), `PROMPT_REJECTED` (content policy / moderation), `INVALID_REQUEST` (other 400/404/422), `RATE_LIMITED` (429 after retries), `PROVIDER_ERROR` (5xx, network, empty response) — without leaking raw provider error messages into asset records or API responses.
- **FR-006a**: The system MUST log the raw OpenAI error (HTTP status, model, and response body) on the server for every failed call, without logging the API key.
- **FR-007**: The system MUST preserve partial-success behavior: when one or more prompt generations fail, successful assets MUST remain available and the request-level status MUST correctly reflect partial-success.
- **FR-008**: The system MUST store generated image bytes using the existing file-backed storage adapter, producing asset records with the same structure as the previous provider (viewable reference, downloadable reference, traceability fields).
- **FR-009**: The system MUST preserve per-asset traceability from each generated image to the source normalizedKey, asset type (thumbnail or scene), and source prompt text.
- **FR-010**: The system MUST continue to support retrieval of generated asset records by normalizedKey with no changes to the retrieval path.
- **FR-011**: The scope of this feature is limited to still-image generation only; voice, video, publishing, auth, billing, and multi-provider abstraction work are explicitly out of scope.

### Key Entities

- **ImageProviderAdapter**: Existing interface boundary that the new OpenAI provider implements. The interface contract is unchanged; only the implementation behind it is replaced.
- **ProviderGenerationRequest**: Existing request structure passed to the adapter (normalizedKey, assetType, sceneIndex, promptText). Unchanged.
- **ProviderGenerationResult**: Existing discriminated union result type (ok/failure). The new provider MUST produce results conforming to this type; the `mimeType` and `extension` fields will reflect the actual image format returned by OpenAI rather than SVG.
- **OPENAI_API_KEY**: Environment variable required for the new provider. Must be present at initialization; absence is a hard startup failure for the provider.
- **Image Model**: `gpt-image-2` only. Model selection is internal to the provider implementation and not exposed through the adapter interface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of image generation requests that previously returned SVG stubs now return real AI-generated images when `OPENAI_API_KEY` is valid and the prompts are accepted by the provider.
- **SC-002**: Partial-success behavior is fully preserved: a batch where one or more prompts fail returns successful assets for all succeeded prompts, with zero regressions in the partial-success contract.
- **SC-003**: All asset records produced by the new provider are retrievable by normalizedKey using the existing retrieval endpoint with no changes to response structure.
- **SC-004**: A missing or invalid `OPENAI_API_KEY` produces a distinguishable, operator-readable configuration error within one request cycle — not a silent failure or generic crash.
- **SC-005**: Provider errors are mapped to internal error codes in every failure scenario; zero raw OpenAI error messages surface in asset records or API responses.
- **SC-006**: Only genuine authentication errors are reported as `AUTH_FAILURE`; every other OpenAI error maps to its own code and its raw body appears in the server log.

## Assumptions

- The existing `ImageProviderAdapter` interface and `ProviderGenerationResult` type are stable and will not be changed as part of this feature; the new implementation must conform to them as-is.
- The existing file-backed storage adapter is capable of storing any binary image format returned by OpenAI (e.g., PNG); no storage changes are required.
- `OPENAI_API_KEY` is the only credential required to call the OpenAI Images API for this feature; no organization ID or project key is assumed to be needed.
- The interior-image-factory repository's approach to error handling is the reference implementation; the specific API client library or HTTP mechanism chosen for this repo must integrate with the existing adapter pattern rather than being copied verbatim.
- Concurrency strategy beyond per-prompt 429 retries with exponential back-off is out of scope for this feature.
- The OpenAI Images API is available over standard HTTPS; no proxy or private endpoint configuration is required.
- This feature does not add or change any public-facing API endpoints; all changes are internal to the provider layer.
