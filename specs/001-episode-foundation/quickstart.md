# Quickstart: Episode Package Foundation

## Prerequisites

- Node.js installed locally
- Dependencies installed with `npm install`

## Run the app

1. Start the development server:

```bash
npm run dev
```

2. Open the local app in a browser.
3. Enter a location, era, and atmosphere.
4. Submit the request and verify that the UI returns a complete EpisodePackage.

Expected result:
- A single coherent episode concept appears with a title, script, scene prompts, thumbnail prompt, short-form clip ideas, description, and tags.

Validation expectations:
- The result includes the canonical traceability block (Location, Era, Atmosphere, Normalized Key).
- Missing or empty input values produce a clear needs-input state instead of inferred content.

## Determinism check

1. Submit the same brief twice without changing the inputs.
2. Compare the returned package content.
3. Repeat with different capitalization, spacing, or punctuation.

Expected result:
- The same normalized brief produces the same EpisodePackage content under the same conditions.

Validation expectations:
- Normalized Key remains identical across repeated submissions with casing/spacing/punctuation differences.
- Generator version remains stable for the same implementation revision.

## Scope check

1. Review the interface and the generated output.
2. Confirm that the feature remains text-only.
3. Confirm that there is no auth, database, publishing pipeline, image generation, or voice generation behavior.

Expected result:
- Phase 1 stays limited to episode planning and review.

Validation expectations:
- UI copy explicitly states Phase 1 planning-only boundaries.
- No generated output includes account, persistence, publishing, image-generation, or voice-generation workflow instructions.

## Validation commands

```bash
npm run lint
npm run build
```

Expected result:
- Lint passes.
- The Next.js build succeeds and type checks the feature code.