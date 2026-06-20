# Quickstart: OpenAI Image Provider Integration

**Phase 1 output for**: `003-openai-image-provider`

This guide covers how to validate the feature end-to-end: real image generation via OpenAI, dev fallback with the local SVG provider, and missing-key rejection.

---

## Prerequisites

- Node.js ≥ 18
- The app is running locally (`npm run dev`)
- `openai` package installed (`npm install openai`)
- An existing `EpisodePackage` in your local store (created via the Phase 1 episode foundation flow)

---

## Step 1: Install the new dependency

```bash
npm install openai
```

Verify the package appears in `package.json` under `dependencies`.

---

## Step 2: Configure `OPENAI_API_KEY`

The provider reads `OPENAI_API_KEY` from `process.env` at construction time. Set it in your `.env.local` file (this file is `.gitignore`d and must never be committed):

```dotenv
# .env.local
OPENAI_API_KEY=sk-...your-key-here...
```

> **Security**: Never hard-code the key. Never commit `.env.local`. The provider throws a 500-level error at startup if the key is absent when `OpenAIImageProvider` is selected.

Restart the dev server after changing `.env.local`:

```bash
npm run dev
```

---

## Scenario A — Real image generation (OPENAI_API_KEY set and valid)

**What to verify**: A generation request returns real PNG images, not SVG stubs.

**Steps**:

1. Trigger image generation for an existing episode:

   ```bash
   curl -s -X POST \
     "http://localhost:3000/api/episodes/<normalizedKey>/assets/images/generate" \
     -H "Content-Type: application/json" \
     -d '{}' | jq .
   ```

   Replace `<normalizedKey>` with a real key (e.g. `abandon-lunar-archive--future-noir--quite-haunted-and-reflective`).

2. **Expected**: Response JSON with `status: "success"` or `status: "partial-success"`, and `assets` array entries with `reference.mimeType: "image/png"` and `reference.viewUrl` pointing to `.png` files.

3. Verify the PNG file exists and is viewable:

   ```bash
   curl -I "http://localhost:3000<viewUrl from response>"
   ```

   **Expected**: `Content-Type: image/png`, HTTP 200.

4. Call the retrieval endpoint:

   ```bash
   curl -s "http://localhost:3000/api/episodes/<normalizedKey>/assets/images" | jq .
   ```

   **Expected**: Same asset records with `reference.mimeType: "image/png"`. Traceability fields (`normalizedKey`, `assetType`, `promptRef`, `promptText`) are present and match the episode package.

---

## Scenario B — Partial success (one prompt fails)

**What to verify**: A batch where one prompt is rejected returns `partial-success` with successful assets still available.

**Steps**:

1. Edit or construct an episode package whose prompt text includes a word that triggers a content-policy rejection from OpenAI (e.g. a prompt containing "reject" if testing against the local provider, or an actual policy-violating prompt against OpenAI).

2. Trigger generation as in Scenario A.

3. **Expected**:
   - `status: "partial-success"` in the response.
   - Successful assets have `reference.mimeType: "image/png"` and valid `viewUrl`.
   - Failed assets have `status: "failure"`, `errorCode` set to one of the documented codes (e.g. `CONTENT_POLICY_REJECTION`), and no `reference` field.

---

## Scenario C — Missing API key (dev fallback)

**What to verify**: When `OPENAI_API_KEY` is not set, the app falls back to `LocalDeterministicImageProvider` and returns SVG stubs without crashing.

**Steps**:

1. Remove or comment out `OPENAI_API_KEY` from `.env.local` and restart:

   ```bash
   npm run dev
   ```

2. Trigger generation as in Scenario A.

3. **Expected**: Response JSON with assets containing `reference.mimeType: "image/svg+xml"` and `.svg` viewUrls. No 500 error. The response indicates the local deterministic provider was used (SVG output is the signal).

---

## Scenario D — Invalid/expired API key

**What to verify**: An invalid key produces a clear authentication error, not a generic 500.

**Steps**:

1. Set `OPENAI_API_KEY=sk-invalid` in `.env.local` and restart.

2. Trigger generation.

3. **Expected**: Generation result with `status: "failure"` (or `partial-success` if some pass), and failed asset records with `errorCode: "AUTH_ERROR"`. The raw OpenAI error message must NOT appear in the response.

---

## Quality Gate Checklist

Before marking the feature ready for review:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds
- [ ] Scenario A: real PNG images returned for valid key
- [ ] Scenario B: partial-success with mapped error codes
- [ ] Scenario C: SVG fallback works with no key set
- [ ] Scenario D: `AUTH_ERROR` code for invalid key, no raw OpenAI message leaked
- [ ] `.env.local` is listed in `.gitignore`
