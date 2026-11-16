import OpenAI from "openai";
import { formatStoryContext } from "@/lib/assets/prompt-builder";
import { DEFAULT_STORY_MODEL, describeOpenAIError } from "./openai-story-context-client";
import {
	MAX_BEATS,
	MIN_BEATS,
	type StoryBeatsLLM,
	type StoryBeatsRequest,
	type ToneFitRequest,
} from "./story-beats";

const BEATS_SYSTEM_PROMPT = [
	"You are a story editor and storyboard artist planning a wordless illustrated episode.",
	`Break the episode into ${MIN_BEATS} to ${MAX_BEATS} story beats that form a clear cause-and-effect sequence a viewer can follow from the images alone.`,
	"The brief's atmosphere is the overall tone. Give each beat its own emotion within that tone so the episode has an emotional arc;",
	"adjacent beats must have different emotions, though the arc may return to an earlier feeling (for example calm at the end).",
	"For each beat give: summary (one sentence of narration for the script), emotion (a single word or short phrase),",
	"action (what visibly happens, naming the recurring characters and props), composition, framing (camera shot and angle),",
	"lighting (how light and color express the emotion), and expression (the characters' faces and body language).",
	"Convey every emotion visually; never rely on text, captions, signs, letters or speech bubbles.",
	"Respond only with JSON matching the provided schema.",
].join(" ");

const TONE_SYSTEM_PROMPT = [
	"You judge whether each story beat's emotion fits within an episode's overall tone.",
	"An emotion fits if it can plausibly occur in a story with that tone, including quieter or contrasting moments that serve the tone",
	"(for a haunted tone, unease, dread, terror, grief or quiet relief fit; slapstick glee or party excitement do not).",
	"Return one verdict per beat with its order, fitsTone, and a short reason.",
	"Respond only with JSON matching the provided schema.",
].join(" ");

const BEAT_FIELDS = ["summary", "emotion", "action", "composition", "framing", "lighting", "expression"] as const;

const STORY_BEATS_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["beats"],
	properties: {
		beats: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: [...BEAT_FIELDS],
				properties: Object.fromEntries(BEAT_FIELDS.map((field) => [field, { type: "string" }])),
			},
		},
	},
} as const;

const TONE_VERDICTS_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["verdicts"],
	properties: {
		verdicts: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["order", "fitsTone", "reason"],
				properties: {
					order: { type: "integer" },
					fitsTone: { type: "boolean" },
					reason: { type: "string" },
				},
			},
		},
	},
} as const;

export class OpenAIStoryBeatsClient implements StoryBeatsLLM {
	private readonly client: OpenAI;
	private readonly model: string;

	constructor(options: { apiKey?: string; model?: string } = {}) {
		const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error("OPENAI_API_KEY is not set — cannot generate story beats.");
		}
		this.client = new OpenAI({ apiKey });
		this.model = options.model ?? process.env.OPENAI_STORY_MODEL ?? DEFAULT_STORY_MODEL;
	}

	completeStoryBeats({ brief, storyContext, previousIssues }: StoryBeatsRequest): Promise<unknown> {
		const lines = [
			`Location: ${brief.location}`,
			`Era: ${brief.era}`,
			`Overall tone: ${brief.atmosphere}`,
			"",
			formatStoryContext(storyContext),
		];
		if (previousIssues.length > 0) {
			lines.push("", "Your previous answer was rejected. Fix these issues:", ...previousIssues.map((issue) => `- ${issue}`));
		}
		return this.completeJson(BEATS_SYSTEM_PROMPT, lines.join("\n"), "story_beats", STORY_BEATS_SCHEMA);
	}

	judgeToneFit({ tone, beats }: ToneFitRequest): Promise<unknown> {
		const content = [
			`Overall tone: ${tone}`,
			...beats.map((beat) => `Beat ${beat.order}: emotion "${beat.emotion}" — ${beat.summary}`),
		].join("\n");
		return this.completeJson(TONE_SYSTEM_PROMPT, content, "tone_verdicts", TONE_VERDICTS_SCHEMA);
	}

	private async completeJson(
		system: string,
		user: string,
		name: string,
		schema: Record<string, unknown>,
	): Promise<unknown> {
		let completion: OpenAI.Chat.Completions.ChatCompletion;
		try {
			completion = await this.client.chat.completions.create({
				model: this.model,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: user },
				],
				response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
			});
		} catch (error) {
			throw new Error(describeOpenAIError(error), { cause: error });
		}

		const content = completion.choices[0]?.message?.content;
		if (!content) {
			throw new Error("Empty response from OpenAI.");
		}

		try {
			return JSON.parse(content) as unknown;
		} catch {
			throw new Error("OpenAI response was not valid JSON.");
		}
	}
}
