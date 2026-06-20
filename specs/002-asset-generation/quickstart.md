# Quickstart: Episode Asset Generation (Phase 2)

## Prerequisites

- Node.js installed locally
- Dependencies installed with `npm install`
- A valid EpisodePackage available from Phase 1 with:
  - `brief.normalizedKey`
  - `thumbnailPrompt`
  - one or more `scenePrompts` (optional for thumbnail-only scenario)

## Run the app

1. Start development server:

```bash
npm run dev
```

2. Confirm quality gates before validating flows:

```bash
npm run lint
npm run build
```

Expected result:
- Lint passes.
- Build/typecheck passes.

## Validation Scenario A: Full success image generation

1. Prepare a valid EpisodePackage payload for a known normalizedKey.
2. Call generation endpoint:

```bash
curl -X POST http://localhost:3000/api/episodes/{normalizedKey}/assets/images/generate \
  -H "Content-Type: application/json" \
  -d @payload.json
```

3. Verify response fields:
- `status` is `success` when all assets succeed.
- `succeededCount` equals expected asset total.
- Each asset has type metadata and `reference.viewUrl` + `reference.downloadUrl`.

Expected result:
- One thumbnail plus one image per scene prompt is returned with usable references.
- Every returned asset includes traceability fields (`episodePackageId`, `normalizedKey`, `promptRef`).

## Validation Scenario B: Partial-success behavior

1. Submit a request where at least one prompt is expected to fail (invalid/unsafe prompt) and one prompt remains valid.
2. Inspect response:
- Request-level `status` is `partial-success`.
- `succeededCount` and `failedCount` are both greater than zero.
- Failed assets include `errorReason` and prompt linkage.

Expected result:
- Successful assets remain available and include delivery references.
- Failed attempts are recorded with explicit error context.

## Validation Scenario C: Retrieval by normalizedKey

1. Call retrieval endpoint after one or more generation runs:

```bash
curl http://localhost:3000/api/episodes/{normalizedKey}/assets/images
```

2. Verify response:
- Includes all records for the normalizedKey.
- Distinguishes `thumbnail` versus `scene` asset types.
- Includes request aggregates and totals.

Expected result:
- Successful assets provide stable view/download references.
- Failure records remain visible for operational traceability.

## Validation Scenario D: Duplicate in-progress request guard

1. Trigger two generation requests for the same normalizedKey concurrently.
2. Verify one request is accepted and the duplicate receives conflict semantics.

Expected result:
- System prevents ambiguous duplicate in-progress runs.
- Existing completed assets remain retrievable.

## Scope Enforcement Check

1. Review API responses and generated artifacts.
2. Confirm no voice, video, or publishing workflow fields are present.

Expected result:
- Phase 2 implementation remains strictly limited to still image generation, storage, and delivery.

## Artifact References

- Plan: [plan.md](plan.md)
- Research decisions: [research.md](research.md)
- Data model: [data-model.md](data-model.md)
- API contracts: [contracts/image-assets.openapi.yaml](contracts/image-assets.openapi.yaml)
