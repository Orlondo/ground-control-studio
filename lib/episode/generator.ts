import type {
	ClipIdea,
	EpisodeBrief,
	EpisodeBriefInput,
	EpisodeGenerationResult,
	EpisodePackage,
	ScenePrompt,
} from "./types";
import { normalizeEpisodeField, titleCase } from "./normalization";
import { toIncompleteResult, validateEpisodeBrief } from "./validation";

const GENERATOR_VERSION = "1.0.0";

const OPENING_BEATS = [
	"a turning point emerges",
	"the first tension arrives",
	"an old pattern breaks",
	"the scene shifts into focus",
];

const MIDDLE_BEATS = [
	"the central mystery deepens",
	"a detail reframes the episode",
	"the atmosphere grows more specific",
	"the cast of ideas becomes more defined",
];

const CLOSING_BEATS = [
	"the episode lands on a decisive image",
	"the final beat keeps the mood unresolved",
	"the story closes with a strong visual echo",
	"the concept ends with a memorable emotional note",
];

const TAG_BANK = [
	"episode-planning",
	"story-design",
	"text-only",
	"deterministic",
	"phase-one",
];

const DISALLOWED_SCOPE_TERMS = [
	"login",
	"sign in",
	"database",
	"publish",
	"publishing",
	"image generation",
	"voice generation",
	"render video",
	"upload",
	"account",
];

function enforceScopeSafeText(value: string): string {
	let safe = value;

	for (const term of DISALLOWED_SCOPE_TERMS) {
		safe = safe.replace(new RegExp(term, "gi"), "planning");
	}

	return safe;
}

function stableHash(value: string): number {
	let hash = 2166136261;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

function pickStable<T>(items: readonly T[], seed: number, offset: number): T {
	return items[(seed + offset) % items.length];
}

function buildTitle(brief: EpisodeBrief): string {
	const seed = stableHash(brief.normalizedKey);
	const location = titleCase(brief.location);
	const atmosphere = titleCase(brief.atmosphere);
	const era = titleCase(brief.era);

	switch (seed % 3) {
		case 0:
			return `${atmosphere} at ${location}`;
		case 1:
			return `${era} Echoes: ${location}`;
		default:
			return `${location} in a ${atmosphere} ${era}`;
	}
}

function buildScript(brief: EpisodeBrief): string {
	const seed = stableHash(brief.normalizedKey);
	const opening = pickStable(OPENING_BEATS, seed, 0);
	const middle = pickStable(MIDDLE_BEATS, seed, 1);
	const closing = pickStable(CLOSING_BEATS, seed, 2);

	return enforceScopeSafeText([
		`Opening: In ${titleCase(brief.location)}, the ${brief.atmosphere} mood of the ${titleCase(brief.era)} era sets the stage while ${opening}.`,
		`Middle: The episode keeps its focus on ${normalizeEpisodeField(brief.location)} as ${middle}, linking every scene back to the original brief.`,
		`Close: The final movement leaves the audience with ${closing}, preserving a clear review-friendly episode concept.`,
	].join("\n\n"));
}

function buildScenePrompts(brief: EpisodeBrief): ScenePrompt[] {
	const seed = stableHash(brief.normalizedKey);
	const location = titleCase(brief.location);
	const era = titleCase(brief.era);
	const atmosphere = titleCase(brief.atmosphere);

	return [
		{
			order: 1,
			prompt: enforceScopeSafeText(
				`Introduce ${location} in a ${atmosphere.toLowerCase()} ${era.toLowerCase()} tone, emphasizing the core setting and visual mood.`,
			),
		},
		{
			order: 2,
			prompt: enforceScopeSafeText(
				`Shift deeper into the story at ${location} as the ${brief.atmosphere.toLowerCase()} atmosphere reveals the central tension.`,
			),
		},
		{
			order: 3,
			prompt: enforceScopeSafeText(
				`Resolve the episode with a decisive image that reflects ${pickStable(CLOSING_BEATS, seed, 1)}.`,
			),
		},
	];
}

function buildThumbnailPrompt(brief: EpisodeBrief): string {
	return enforceScopeSafeText(
		`Cinematic thumbnail planning prompt for ${titleCase(brief.location)} during the ${titleCase(brief.era)} era, with a ${titleCase(brief.atmosphere)} atmosphere, bold composition, and clear focal contrast.`,
	);
}

function buildClipIdeas(brief: EpisodeBrief): ClipIdea[] {
	const location = titleCase(brief.location);
	const atmosphere = titleCase(brief.atmosphere);

	return [
		{
			order: 1,
			idea: enforceScopeSafeText(
				`A short hook that opens on ${location} and explains why the ${atmosphere.toLowerCase()} tone matters.`,
			),
		},
		{
			order: 2,
			idea: enforceScopeSafeText(
				`A reaction-style recap that highlights the most memorable turning point in the episode package.`,
			),
		},
	];
}

function buildDescription(brief: EpisodeBrief): string {
	return enforceScopeSafeText(
		`A deterministic Phase 1 episode package set in ${titleCase(brief.location)} during the ${titleCase(brief.era)} era, shaped by a ${titleCase(brief.atmosphere)} atmosphere and designed for fast review. This output is planning-only and excludes auth, persistence, publishing, image generation, and voice generation workflows.`,
	);
}

function buildTags(brief: EpisodeBrief): string[] {
	const seed = stableHash(brief.normalizedKey);
	const derived = [
		normalizeEpisodeField(brief.location).replace(/\s+/g, "-"),
		normalizeEpisodeField(brief.era).replace(/\s+/g, "-"),
		normalizeEpisodeField(brief.atmosphere).replace(/\s+/g, "-"),
		pickStable(TAG_BANK, seed, 0),
		pickStable(TAG_BANK, seed, 2),
	];

	return Array.from(new Set(derived));
}

export function generateEpisodePackage(
	input: EpisodeBriefInput,
): EpisodeGenerationResult {
	const validated = validateEpisodeBrief(input);

	if (!validated.ok) {
		return toIncompleteResult(validated.missingFields, validated.message);
	}

	const brief = validated.brief;

	const episodePackage: EpisodePackage = {
		brief,
		title: buildTitle(brief),
		script: buildScript(brief),
		scenePrompts: buildScenePrompts(brief),
		thumbnailPrompt: buildThumbnailPrompt(brief),
		shortFormClipIdeas: buildClipIdeas(brief),
		description: buildDescription(brief),
		tags: buildTags(brief),
		generatorVersion: GENERATOR_VERSION,
	};

	return {
		status: "complete",
		package: episodePackage,
	};
}