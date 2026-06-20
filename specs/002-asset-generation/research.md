# Research: Episode Asset Generation (Phase 2)

## Image generation orchestration model

- Decision: Use a request-oriented generation workflow that records one `EpisodeAssetGenerationRequest` and one `ImageAssetRecord` per generation attempt (thumbnail and each scene prompt), with aggregate status computed as `success`, `partial-success`, or `failure`.
- Rationale: The spec requires clear mixed-outcome behavior and per-asset traceability. A request aggregate plus per-asset attempts satisfies FR-004, FR-007, FR-008, and FR-009 without over-scoping into later media phases.
- Alternatives considered: All-or-nothing batch generation (rejected because it discards successful assets on partial failure), or per-asset standalone requests only (rejected because it weakens request-level status reporting).

## Provider integration boundary

- Decision: Introduce a provider adapter contract for image generation (`generateImage(prompt, context)`) so prompt-to-image execution can vary without changing domain models.
- Rationale: The feature must stay tightly focused on image generation behavior while allowing safe provider substitution and deterministic error mapping in records.
- Alternatives considered: Calling one provider SDK directly from route handlers (rejected because it couples transport, orchestration, and provider concerns), and deferring adapter design until implementation (rejected because contract clarity is needed in planning artifacts).

## Storage and delivery reference strategy

- Decision: Model delivery through `ImageAssetReference` objects that include stable view and download URLs; persist generated asset metadata alongside storage keys and availability metadata.
- Rationale: FR-005 and FR-010 require usable references plus retrieval by normalizedKey. Separating metadata records from storage implementation keeps delivery behavior stable.
- Alternatives considered: Returning only raw binary responses per request (rejected because retrieval and downstream consumption require durable references), or provider-hosted ephemeral URLs only (rejected because reference stability and traceability become harder to guarantee).

## Retrieval contract shape

- Decision: Expose retrieval by normalizedKey with a collection response that includes request summaries and per-asset records, not just successful outputs.
- Rationale: Operators and downstream consumers need both successful assets and failure context for rerun decisions and auditing.
- Alternatives considered: Return successful assets only (rejected because it hides failure reasons and weakens observability), or require requestId for retrieval only (rejected because FR-010 explicitly requires normalizedKey retrieval).

## Duplicate and in-progress request handling

- Decision: Enforce one active generation request per normalizedKey and return a deterministic conflict response for concurrent duplicate requests, while preserving existing completed records.
- Rationale: The spec includes duplicate in-progress requests as an edge case. Explicit active-request semantics avoid accidental double generation and ambiguous status.
- Alternatives considered: Allow unrestricted concurrent generation (rejected because it risks duplicate assets and inconsistent traceability), or silently coalesce duplicates without signaling (rejected because clients need explicit operational state).

## Phase boundary enforcement

- Decision: Explicitly exclude voice generation, video assembly, and publishing behavior from contracts and models.
- Rationale: FR-011 and FR-012 require strict scope locking to still-image generation, storage, and delivery in Phase 2.
- Alternatives considered: Adding placeholder fields for audio/video outputs (rejected because placeholders invite scope creep and violate current phase constraints).
