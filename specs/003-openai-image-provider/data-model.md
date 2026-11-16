# Data Model: OpenAI Image Provider Integration

**Phase 1 output for**: `003-openai-image-provider`

This feature introduces no new persistent data models. All entities below are pre-existing. The only change is a widening of the `ProviderGenerationResult` union type and the addition of the `OpenAIImageProvider` class.

---

> **Amended (004 follow-up):** `response_format` is no longer sent (GPT image models reject it), the `gpt-image-1` fallback was removed (model retired), and error codes now follow FR-006 in `spec.md`: `AUTH_FAILURE`, `PERMISSION_DENIED`, `PROMPT_REJECTED`, `INVALID_REQUEST`, `RATE_LIMITED`, `PROVIDER_ERROR`. Sections below that say otherwise are superseded.

## Modified: `ProviderGenerationResult` (in `lib/assets/provider-adapter.ts`)

Currently the success branch hard-codes SVG output:

```typescript
// BEFORE (current)
| {
    ok: true;
    bytes: Buffer;
    mimeType: "image/svg+xml";
    extension: "svg";
  }
```

After this feature, the success branch is widened to allow PNG (or other real image formats):

```typescript
// AFTER
| {
    ok: true;
    bytes: Buffer;
    mimeType: string;   // e.g. "image/png", "image/svg+xml"
    extension: string;  // e.g. "png", "svg"
  }
```

The failure branch is unchanged:

```typescript
| {
    ok: false;
    errorCode: string;
    errorReason: string;
  }
```

**Impact**: `generation-service.ts` passes `mimeType` and `extension` through to `StorageAdapter.storeAsset()` and `ImageAssetRecord` — both already accept `string`, so no downstream type changes are required.

---

## New: `OpenAIImageProvider` class

**Location**: `lib/assets/provider-adapter.ts` (added to the same file as the interface and `LocalDeterministicImageProvider`)

**Implements**: `ImageProviderAdapter`

### Constructor

| Parameter | Type | Source |
|---|---|---|
| `apiKey` | `string` | `process.env.OPENAI_API_KEY` (validated; throws `Error` with `.status=500` if absent) |

### Internal state

| Field | Type | Purpose |
|---|---|---|
| `client` | `OpenAI` | SDK client, initialized with `apiKey` |
| `PRIMARY_MODEL` | `"gpt-image-2"` | Primary model constant |
| `FALLBACK_MODEL` | `"gpt-image-1"` | Fallback model constant |
| `MAX_RETRIES` | `5` | Max rate-limit retry attempts |

### `generateImage(request: ProviderGenerationRequest): Promise<ProviderGenerationResult>`

**Behaviour**:
1. Call OpenAI with `PRIMARY_MODEL` using `client.images.generate({ model, prompt, response_format: "b64_json", n: 1 })`.
2. On `APIError` with `status === 429`: retry up to `MAX_RETRIES` times with exponential back-off (`min(2^attempt × 1000ms, 30 000ms)` ± 10% jitter).
3. On `APIError` with `status === 400` that signals model/size incompatibility: retry once with `FALLBACK_MODEL` (no further rate-limit retries for the fallback call).
4. On exhausted retries or non-retriable error: map to `ProviderGenerationResult { ok: false, errorCode, errorReason }` using the error code mapping from research.md.
5. On success: decode `response.data[0].b64_json` via `Buffer.from(b64, "base64")`, return `{ ok: true, bytes, mimeType: "image/png", extension: "png" }`.
6. If `b64_json` field is missing: return `{ ok: false, errorCode: "INVALID_PROVIDER_RESPONSE", errorReason: "..." }`.

---

## Retained: `LocalDeterministicImageProvider` class

Unchanged. Remains as dev fallback when `OPENAI_API_KEY` is not set.

---

## Existing: `ImageProviderAdapter` interface

Unchanged. Both providers implement the same interface.

```typescript
export interface ImageProviderAdapter {
  generateImage(request: ProviderGenerationRequest): Promise<ProviderGenerationResult>;
}
```

---

## Provider Selection (outside `provider-adapter.ts`)

The generation service instantiation point (route handler or a factory) selects the provider based on environment:

```typescript
const provider: ImageProviderAdapter = process.env.OPENAI_API_KEY
  ? new OpenAIImageProvider()
  : new LocalDeterministicImageProvider();
```

This logic lives in the existing `generation-service.ts` instantiation or route handler — it is not part of either provider class.

---

## Error Code Reference

Defined by convention (not a TypeScript enum at this phase) and recorded in `ImageAssetRecord.errorCode`:

| Code | Condition |
|---|---|
| `AUTH_ERROR` | OpenAI 401 Unauthorized |
| `CONTENT_POLICY_REJECTION` | OpenAI 400 content policy flag |
| `RATE_LIMIT_EXCEEDED` | 429 persists after all retries |
| `MODEL_UNAVAILABLE` | 400 model/size mismatch after fallback |
| `PROVIDER_ERROR` | 5xx or network timeout |
| `INVALID_PROVIDER_RESPONSE` | Missing or empty `b64_json` field |
| `PROMPT_REJECTED` | Local policy rejection (`LocalDeterministicImageProvider` only) |
