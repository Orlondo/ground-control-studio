# Research: Episode Package Foundation

## Deterministic generation approach

- Decision: Implement the episode generator as pure TypeScript functions that derive the EpisodePackage from normalized brief input.
- Rationale: Pure functions are the simplest way to guarantee repeatability for the same brief while keeping Phase 1 local, testable, and free of persistence or external services.
- Alternatives considered: Server actions with stored results, API routes backed by a database, or remote model calls. Those options were rejected because they add nondeterminism, infra overhead, or scope beyond Phase 1.

## Validation boundary approach

- Decision: Use explicit TypeScript types plus small runtime guards at the form/input boundary rather than adding a schema dependency.
- Rationale: The repository does not already include a validation library, and Phase 1 only needs a narrow set of required strings. Hand-rolled checks keep the dependency footprint small while still satisfying the constitution requirement for runtime validation.
- Alternatives considered: Zod or a similar schema package. Rejected for now because it adds a new dependency without improving the narrow Phase 1 use case enough to justify it.

## Output shape and traceability

- Decision: Treat EpisodePackage as the canonical output shape and include normalized brief metadata so the package stays traceable to the source intent.
- Rationale: The spec requires a stable artifact that reviewers can compare across runs. Including the normalized brief in the domain model makes the relationship between input and output explicit without adding persistence.
- Alternatives considered: Separate output fragments with no shared wrapper, or a loose freeform response object. Rejected because they make review and deterministic comparison harder.

## UI integration approach

- Decision: Keep the feature inside the existing Next.js app router page flow and render results directly in the web app.
- Rationale: The current repository is a single-app Next.js project and Phase 1 is a reviewable planning experience, not a service boundary.
- Alternatives considered: Separate frontend/backend apps or a dedicated API layer. Rejected because the feature does not need distributed architecture.