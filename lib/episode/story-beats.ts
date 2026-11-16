import type { EpisodeBrief, StoryBeat, StoryContext } from "./types";

export const MIN_BEATS = 4;
export const MAX_BEATS = 6;
export const MAX_BEAT_ATTEMPTS = 2;

export interface StoryBeatsRequest {
	brief: EpisodeBrief;
	storyContext: StoryContext;
	previousIssues: string[];
}

export interface ToneFitRequest {
	tone: string;
	beats: StoryBeat[];
}

export interface StoryBeatsLLM {
	completeStoryBeats(request: StoryBeatsRequest): Promise<unknown>;
	judgeToneFit(request: ToneFitRequest): Promise<unknown>;
}

export class StoryBeatsGenerationError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = "StoryBeatsGenerationError";
	}
}

export type StoryBeatsValidationResult =
	| { ok: true; value: StoryBeat[] }
	| { ok: false; issues: string[] };

const BEAT_TEXT_FIELDS = [
	"summary",
	"emotion",
	"action",
	"composition",
	"framing",
	"lighting",
	"expression",
] as const;

function readText(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function sameEmotion(a: string, b: string): boolean {
	return a.toLowerCase() === b.toLowerCase();
}

export function validateStoryBeats(raw: unknown): StoryBeatsValidationResult {
	const list =
		typeof raw === "object" && raw !== null && !Array.isArray(raw)
			? (raw as Record<string, unknown>).beats
			: undefined;

	if (!Array.isArray(list)) {
		return { ok: false, issues: ["Response must be an object with a beats list."] };
	}

	const issues: string[] = [];
	if (list.length < MIN_BEATS || list.length > MAX_BEATS) {
		issues.push(`Expected ${MIN_BEATS}–${MAX_BEATS} beats but got ${list.length}.`);
	}

	const beats: StoryBeat[] = [];
	list.forEach((entry, index) => {
		const order = index + 1;
		if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
			issues.push(`Beat ${order} is empty.`);
			return;
		}
		const record = entry as Record<string, unknown>;
		const values: Partial<Record<(typeof BEAT_TEXT_FIELDS)[number], string>> = {};
		const missing: string[] = [];
		for (const field of BEAT_TEXT_FIELDS) {
			const value = readText(record[field]);
			if (value) {
				values[field] = value;
			} else {
				missing.push(field);
			}
		}
		if (missing.length === BEAT_TEXT_FIELDS.length) {
			issues.push(`Beat ${order} is empty.`);
			return;
		}
		if (missing.length > 0) {
			issues.push(`Beat ${order} is missing: ${missing.join(", ")}.`);
			return;
		}
		beats.push({ order, ...(values as Omit<StoryBeat, "order">) });
	});

	for (let index = 1; index < beats.length; index += 1) {
		const previous = beats[index - 1];
		const current = beats[index];
		if (current.order === previous.order + 1 && sameEmotion(previous.emotion, current.emotion)) {
			issues.push(
				`Beats ${previous.order} and ${current.order} share the emotion "${current.emotion}"; adjacent beats must differ.`,
			);
		}
	}

	if (issues.length > 0) {
		return { ok: false, issues };
	}

	return { ok: true, value: beats };
}

export function validateToneVerdicts(raw: unknown, tone: string, beats: StoryBeat[]): string[] {
	const list =
		typeof raw === "object" && raw !== null && !Array.isArray(raw)
			? (raw as Record<string, unknown>).verdicts
			: undefined;

	if (!Array.isArray(list)) {
		return ["Tone judge response must be an object with a verdicts list."];
	}

	const issues: string[] = [];
	for (const beat of beats) {
		const verdict = list.find(
			(entry) =>
				typeof entry === "object" &&
				entry !== null &&
				(entry as Record<string, unknown>).order === beat.order,
		) as Record<string, unknown> | undefined;

		if (!verdict || typeof verdict.fitsTone !== "boolean") {
			issues.push(`Tone judge returned no verdict for beat ${beat.order}.`);
			continue;
		}

		if (!verdict.fitsTone) {
			const reason = readText(verdict.reason);
			issues.push(
				`Beat ${beat.order} emotion "${beat.emotion}" clashes with the tone "${tone}"${reason ? `: ${reason}` : "."}`,
			);
		}
	}

	return issues;
}

async function callLLM<T>(step: string, call: () => Promise<T>): Promise<T> {
	try {
		return await call();
	} catch (error) {
		const reason = error instanceof Error ? error.message : "unknown error";
		throw new StoryBeatsGenerationError(`Story beat ${step} failed: ${reason}`, { cause: error });
	}
}

export async function generateStoryBeats(
	brief: EpisodeBrief,
	storyContext: StoryContext,
	llm: StoryBeatsLLM,
): Promise<StoryBeat[]> {
	const tone = brief.atmosphere;
	let issues: string[] = [];

	for (let attempt = 1; attempt <= MAX_BEAT_ATTEMPTS; attempt += 1) {
		const raw = await callLLM("generation", () =>
			llm.completeStoryBeats({ brief, storyContext, previousIssues: issues }),
		);

		const validated = validateStoryBeats(raw);
		if (!validated.ok) {
			issues = validated.issues;
			continue;
		}

		const verdicts = await callLLM("tone check", () =>
			llm.judgeToneFit({ tone, beats: validated.value }),
		);

		issues = validateToneVerdicts(verdicts, tone, validated.value);
		if (issues.length === 0) {
			return validated.value;
		}
	}

	throw new StoryBeatsGenerationError(
		`Story beats were invalid after ${MAX_BEAT_ATTEMPTS} attempts: ${issues.join(" ")}`,
	);
}
