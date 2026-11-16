import type {
	ClipIdea,
	EpisodeBrief,
	EpisodeBriefInput,
	EpisodeGenerationResult,
	EpisodePackage,
	ScenePrompt,
	StoryBeat,
	StoryContext,
} from "./types";
import { normalizeEpisodeField, titleCase } from "./normalization";
import { toIncompleteResult, validateEpisodeBrief } from "./validation";
import { generateStoryContext, type StoryContextLLM } from "./story-context";
import { generateStoryBeats, type StoryBeatsLLM } from "./story-beats";

export type EpisodeLLM = StoryContextLLM & StoryBeatsLLM;

const GENERATOR_VERSION = "3.0.0";

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

function buildScript(beats: StoryBeat[]): string {
	return beats.map((beat) => `${beat.order}. ${beat.summary}`).join("\n\n");
}

function buildScenePrompt(beat: StoryBeat, totalBeats: number): string {
	return [
		`Panel ${beat.order} of ${totalBeats}.`,
		`Emotion: ${beat.emotion} — convey it through composition, lighting, framing and character expression.`,
		`Action: ${beat.action}`,
		`Composition: ${beat.composition}`,
		`Framing: ${beat.framing}`,
		`Lighting: ${beat.lighting}`,
		`Expression: ${beat.expression}`,
	].join("\n");
}

function buildScenePrompts(beats: StoryBeat[]): ScenePrompt[] {
	return beats.map((beat) => ({ order: beat.order, prompt: buildScenePrompt(beat, beats.length) }));
}

function buildThumbnailPrompt(brief: EpisodeBrief, storyContext: StoryContext): string {
	const cast = storyContext.characters.map((character) => character.name).join(" and ");
	return `Episode thumbnail that conveys the overall ${brief.atmosphere.toLowerCase()} tone: ${cast} in ${storyContext.setting}, bold composition, clear focal contrast, expressive faces and lighting.`;
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

export function buildEpisodePackage(
	brief: EpisodeBrief,
	storyContext: StoryContext,
	beats: StoryBeat[],
): EpisodePackage {
	return {
		brief,
		storyContext,
		title: buildTitle(brief),
		beats,
		script: buildScript(beats),
		scenePrompts: buildScenePrompts(beats),
		thumbnailPrompt: buildThumbnailPrompt(brief, storyContext),
		shortFormClipIdeas: buildClipIdeas(brief),
		description: buildDescription(brief),
		tags: buildTags(brief),
		generatorVersion: GENERATOR_VERSION,
	};
}

export async function generateEpisodePackage(
	input: EpisodeBriefInput,
	llm: EpisodeLLM,
): Promise<EpisodeGenerationResult> {
	const validated = validateEpisodeBrief(input);

	if (!validated.ok) {
		return toIncompleteResult(validated.missingFields, validated.message);
	}

	const storyContext = await generateStoryContext(validated.brief, llm);
	const beats = await generateStoryBeats(validated.brief, storyContext, llm);

	return {
		status: "complete",
		package: buildEpisodePackage(validated.brief, storyContext, beats),
	};
}
