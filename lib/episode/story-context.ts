import type { EpisodeBrief, StoryCharacter, StoryContext } from "./types";

export interface StoryContextLLM {
	completeStoryContext(brief: EpisodeBrief): Promise<unknown>;
}

export class StoryContextGenerationError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = "StoryContextGenerationError";
	}
}

export type StoryContextValidationResult =
	| { ok: true; value: StoryContext }
	| { ok: false; issues: string[] };

function readText(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readTextList(value: unknown): string[] | null {
	if (!Array.isArray(value)) {
		return null;
	}
	const items = value.map(readText);
	return items.every((item): item is string => item !== null) ? items : null;
}

function readCharacters(value: unknown): StoryCharacter[] | null {
	if (!Array.isArray(value)) {
		return null;
	}
	const characters: StoryCharacter[] = [];
	for (const entry of value) {
		if (typeof entry !== "object" || entry === null) {
			return null;
		}
		const record = entry as Record<string, unknown>;
		const name = readText(record.name);
		const appearance = readText(record.appearance);
		if (!name || !appearance) {
			return null;
		}
		characters.push({ name, appearance });
	}
	return characters;
}

export function validateStoryContext(raw: unknown): StoryContextValidationResult {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		return { ok: false, issues: ["storyContext must be an object."] };
	}

	const record = raw as Record<string, unknown>;
	const issues: string[] = [];

	const characters = readCharacters(record.characters);
	if (!characters || characters.length === 0) {
		issues.push("characters must be a non-empty list of { name, appearance }.");
	}

	const setting = readText(record.setting);
	if (!setting) issues.push("setting is required.");

	const era = readText(record.era);
	if (!era) issues.push("era is required.");

	const lightingAndPalette = readText(record.lightingAndPalette);
	if (!lightingAndPalette) issues.push("lightingAndPalette is required.");

	const props = readTextList(record.props);
	if (!props || props.length === 0) {
		issues.push("props must be a non-empty list of strings.");
	}

	const artStyle = readText(record.artStyle);
	if (!artStyle) issues.push("artStyle is required.");

	if (issues.length > 0 || !characters || !setting || !era || !lightingAndPalette || !props || !artStyle) {
		return { ok: false, issues };
	}

	return {
		ok: true,
		value: { characters, setting, era, lightingAndPalette, props, artStyle },
	};
}

export async function generateStoryContext(
	brief: EpisodeBrief,
	llm: StoryContextLLM,
): Promise<StoryContext> {
	let raw: unknown;
	try {
		raw = await llm.completeStoryContext(brief);
	} catch (error) {
		const reason = error instanceof Error ? error.message : "unknown error";
		throw new StoryContextGenerationError(`Story context generation failed: ${reason}`, {
			cause: error,
		});
	}

	const validated = validateStoryContext(raw);
	if (!validated.ok) {
		throw new StoryContextGenerationError(
			`Story context generation returned invalid output: ${validated.issues.join(" ")}`,
		);
	}

	return validated.value;
}
