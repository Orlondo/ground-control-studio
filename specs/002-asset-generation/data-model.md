# Data Model: Episode Asset Generation (Phase 2)

## EpisodeAssetGenerationRequest

Represents one request to generate still-image assets from an existing EpisodePackage.

Fields:
- `requestId: string` - unique request identifier
- `episodePackageId: string` - source EpisodePackage identifier
- `normalizedKey: string` - canonical episode key used for grouping and retrieval
- `status: "queued" | "in-progress" | "success" | "partial-success" | "failure"`
- `assetScope: { includeThumbnail: boolean; sceneIndexes: number[] | "all" }`
- `requestedAt: string` - ISO timestamp
- `startedAt?: string` - ISO timestamp when execution begins
- `completedAt?: string` - ISO timestamp when execution finishes
- `succeededCount: number`
- `failedCount: number`

Validation rules:
- `episodePackageId` and `normalizedKey` are required and non-empty.
- `status` transitions are constrained to: `queued -> in-progress -> success|partial-success|failure`.
- `succeededCount + failedCount` must equal the number of attempted assets when terminal.

Relationships:
- One request has many `ImageAssetRecord` entries.
- One request is linked to one `EpisodePackageLink`.

## EpisodePackageLink

Traceability metadata connecting generated assets back to source package identity.

Fields:
- `episodePackageId: string`
- `normalizedKey: string`
- `generatorVersion?: string`
- `sourceCreatedAt?: string`

Validation rules:
- `episodePackageId` and `normalizedKey` are required for every request and asset record.

Relationships:
- One link can reference many requests and many image asset records.

## ImageAssetRecord

Represents one image generation attempt for thumbnail or scene output.

Fields:
- `assetId: string` - unique asset attempt identifier
- `requestId: string` - parent request reference
- `episodePackageId: string`
- `normalizedKey: string`
- `assetType: "thumbnail" | "scene"`
- `sceneIndex?: number` - required when `assetType = "scene"`
- `promptRef: { kind: "thumbnailPrompt" | "scenePrompt"; index?: number }`
- `promptText: string`
- `status: "success" | "failure"`
- `errorCode?: string`
- `errorReason?: string`
- `createdAt: string` - ISO timestamp
- `reference?: ImageAssetReference` - present only for successful assets

Validation rules:
- `promptText` is required and non-empty.
- `sceneIndex` is required for scene assets and forbidden for thumbnail assets.
- Failed records must include `errorReason`; successful records must include `reference`.

Relationships:
- Many records belong to one request.
- Many records share one `normalizedKey` for retrieval.

## ImageAssetReference

Delivery references for a successfully generated image asset.

Fields:
- `viewUrl: string`
- `downloadUrl: string`
- `storageKey: string`
- `mimeType: string` (expected image MIME type)
- `byteSize?: number`
- `availableUntil?: string` - optional ISO timestamp for expiring URLs

Validation rules:
- `viewUrl`, `downloadUrl`, and `storageKey` are required for successful records.
- URLs must be absolute or valid app-relative references accepted by clients.

## AssetGenerationResult

Response aggregate for generation requests.

Fields:
- `requestId: string`
- `normalizedKey: string`
- `status: "success" | "partial-success" | "failure"`
- `succeededCount: number`
- `failedCount: number`
- `assets: ImageAssetRecord[]`

Validation rules:
- `status = "success"` requires `failedCount = 0`.
- `status = "failure"` requires `succeededCount = 0`.
- `status = "partial-success"` requires both counts greater than zero.

## RetrievalResult

Collection response when fetching generated image assets by normalizedKey.

Fields:
- `normalizedKey: string`
- `requests: EpisodeAssetGenerationRequest[]`
- `assets: ImageAssetRecord[]`
- `totals: { total: number; success: number; failure: number }`

Validation rules:
- Assets returned must all match the requested `normalizedKey`.
- Totals must match the returned asset set.

## State Flow

1. Validate generation request against EpisodePackage availability and required prompt fields.
2. Create `EpisodeAssetGenerationRequest` as `queued` then `in-progress`.
3. Attempt thumbnail and scene generation according to scope.
4. Persist one `ImageAssetRecord` per attempt with success/failure outcome.
5. Compute terminal request status and counters.
6. Expose retrieval by normalizedKey with stable references for successful assets and error metadata for failures.
