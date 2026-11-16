# Research: OpenAI Image Provider Integration

**Phase 0 output for**: `003-openai-image-provider`

All NEEDS CLARIFICATION items from Technical Context are resolved below.

---

> **Amended (004 follow-up):** `response_format` is no longer sent (GPT image models reject it), the `gpt-image-1` fallback was removed (model retired), and error codes now follow FR-006 in `spec.md`: `AUTH_FAILURE`, `PERMISSION_DENIED`, `PROMPT_REJECTED`, `INVALID_REQUEST`, `RATE_LIMITED`, `PROVIDER_ERROR`. Sections below that say otherwise are superseded.

## 1. OpenAI Images API — `gpt-image-2` vs `gpt-image-1`

**Decision**: Use `openai` npm SDK, calling `client.images.generate()` with `response_format: "b64_json"`.

**Rationale**:
- The `openai` SDK handles auth headers, base URL, and typed response shapes out of the box.
- `response_format: "b64_json"` returns image bytes inline in the JSON response without requiring a second download fetch — simpler and safer than `url` format in server environments.
- `gpt-image-2` is the current recommended model. `gpt-image-1` is the designated fallback per FR-002/FR-003.

**Alternatives considered**:
- **Raw `fetch` to `https://api.openai.com/v1/images/generations`** (as used in `interior-image-factory`): viable, but the SDK provides typed errors and avoids manual header management. SDK preferred per "small, composable modules" constitution principle.
- **`url` response format**: requires a second HTTP fetch to download image bytes, adds failure surface, rejected.

**Image format**: `gpt-image-2` returns PNG by default when `response_format: "b64_json"` is specified. Extension: `png`, MIME type: `image/png`. The `ProviderGenerationResult` union in `provider-adapter.ts` must be widened to allow these values (previously only `svg`/`image/svg+xml`).

---

## 2. Rate-Limit Retry Strategy

**Decision**: Up to 5 retries with exponential back-off on HTTP 429 (rate limit) responses. Back-off formula: `min(2^attempt × 1000ms, 30 000ms)` with ±10% jitter.

**Rationale**:
- OpenAI rate limits are transient; 429 errors resolve within seconds to minutes for most tiers.
- The `openai` SDK exposes `APIError` with a `status` field; `status === 429` signals rate limiting.
- The `interior-image-factory` sibling uses single-shot batch API calls (no retry needed for batch submission), but synchronous real-time generation requires client-side retry logic.
- 5 retries with exponential back-off aligns with common OpenAI integration guidance and the user's explicit requirement.

**Retry scope**: Rate-limit retries apply per prompt, not per batch request. Other errors (authentication, content policy, network) are not retried — they fail immediately with a mapped error code.

**Alternatives considered**:
- Fixed-interval retry: simpler but increases total retry time and amplifies thundering-herd risk under sustained rate limiting.
- SDK-level `maxRetries`: the `openai` SDK supports `maxRetries` constructor option but applies it to all error types; selective 429-only retry implemented manually for precise control.

---

## 3. Model Fallback Logic (`gpt-image-2` → `gpt-image-1`)

**Decision**: On first call failure where the error indicates a model or size error (HTTP 400 with message matching `model` or `size` in the error text, or `APIError.status === 400`), retry once with `gpt-image-1` before recording a failure. Rate-limit retries are exhausted first, then model fallback is attempted.

**Rationale**: FR-003 requires fallback before recording failure. Model-not-supported and invalid-size errors are the documented triggers for falling back to `gpt-image-1`.

**Error discrimination**:
- `status 429` → rate limit, eligible for retry
- `status 400` with model/size message → model fallback
- `status 401` → authentication failure → `AUTH_ERROR` error code, no retry
- `status 400` content policy → `CONTENT_POLICY_REJECTION`, no retry
- `status 5xx` / network timeout → `PROVIDER_ERROR`, no retry

---

## 4. `OPENAI_API_KEY` Lifecycle

**Decision**: `OpenAIImageProvider` reads `process.env.OPENAI_API_KEY` in its constructor. If the key is absent, the constructor throws an `Error` with `message: "OPENAI_API_KEY is not set"` and a `.status = 500` property, matching the pattern in `interior-image-factory/lib/openaiBatch.ts`.

**Rationale**: FR-004/FR-005 require environment-only sourcing and startup-time rejection. Throwing in the constructor ensures the service composition layer (which instantiates the provider) surfaces the error at startup rather than on first use.

**Dev fallback**: `generation-service.ts` (or the route handler) uses `OpenAIImageProvider` when `OPENAI_API_KEY` is set, and `LocalDeterministicImageProvider` when it is not. This logic is outside the providers themselves — the providers do not know about each other.

---

## 5. Error Code Mapping

**Decision**: Map OpenAI error statuses to the internal error code schema:

| OpenAI condition | Internal `errorCode` |
|---|---|
| 401 Unauthorized | `AUTH_ERROR` |
| 400 content policy / flagged | `CONTENT_POLICY_REJECTION` |
| 429 exhausted after retries | `RATE_LIMIT_EXCEEDED` |
| 400 model/size mismatch after fallback | `MODEL_UNAVAILABLE` |
| 5xx / network timeout | `PROVIDER_ERROR` |
| Missing `b64_json` field in response | `INVALID_PROVIDER_RESPONSE` |

**Rationale**: FR-006 requires internal error codes, not raw provider messages. The existing `ImageAssetRecord.errorCode` field accepts any string; these codes are internal conventions, not typed enums at this phase.

---

## 6. `b64_json` Decoding

**Decision**: `Buffer.from(imageData.b64_json, "base64")` where `imageData` is the first element of `response.data`.

**Rationale**: OpenAI returns base64-encoded PNG bytes in the `b64_json` field. `Buffer.from(..., "base64")` converts to binary in-process. The existing `StorageAdapter.storeAsset()` accepts `Buffer` directly.

**Guard**: If `imageData.b64_json` is undefined or empty, return `ProviderGenerationResult` with `ok: false` and `errorCode: "INVALID_PROVIDER_RESPONSE"`.

---

## 7. `openai` npm Package Version

**Decision**: Install `openai` (latest stable, `^4.x` at time of writing) as a production dependency.

**Rationale**: `openai@4.x` provides the typed `OpenAI` client, `Images.generate()`, and `APIError` used in this implementation. No other new dependencies required.
