import OpenAI from "openai";
import type { StoryContextLLM } from "./story-context";
import type { EpisodeBrief } from "./types";

export const DEFAULT_STORY_MODEL = "gpt-4.1-mini";

const SYSTEM_PROMPT = [
	"You are a visual development lead preparing a story bible for an illustrated episode.",
	"From the episode brief, define the shared visual facts every image in the episode must keep consistent.",
	"Invent one to three recurring characters with concrete, visual appearance details (age, build, clothing, colors, distinguishing features).",
	"Describe the setting, era, lighting and color palette, recurring props, and a single art style in concrete visual terms.",
	"Respond only with JSON matching the provided schema.",
].join(" ");

const STORY_CONTEXT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["characters", "setting", "era", "lightingAndPalette", "props", "artStyle"],
	properties: {
		characters: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["name", "appearance"],
				properties: {
					name: { type: "string" },
					appearance: { type: "string" },
				},
			},
		},
		setting: { type: "string" },
		era: { type: "string" },
		lightingAndPalette: { type: "string" },
		props: { type: "array", items: { type: "string" } },
		artStyle: { type: "string" },
	},
} as const;

export function describeOpenAIError(error: unknown): string {
	if (error instanceof OpenAI.APIError) {
		if (error.status === 401) return "OpenAI authentication failed — check OPENAI_API_KEY.";
		if (error.status === 429) return "OpenAI rate limit reached.";
		if (error.status === 404) return "OpenAI story model not found — check OPENAI_STORY_MODEL.";
		return `OpenAI request failed${error.status ? ` with status ${error.status}` : ""}.`;
	}
	return "OpenAI request failed.";
}

export class OpenAIStoryContextClient implements StoryContextLLM {
	private readonly client: OpenAI;
	private readonly model: string;

	constructor(options: { apiKey?: string; model?: string } = {}) {
		const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error("OPENAI_API_KEY is not set — cannot generate story context.");
		}
		this.client = new OpenAI({ apiKey });
		this.model = options.model ?? process.env.OPENAI_STORY_MODEL ?? DEFAULT_STORY_MODEL;
	}

	async completeStoryContext(brief: EpisodeBrief): Promise<unknown> {
		let completion: OpenAI.Chat.Completions.ChatCompletion;
		try {
			completion = await this.requestCompletion(brief);
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

	private requestCompletion(brief: EpisodeBrief) {
		return this.client.chat.completions.create({
			model: this.model,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: `Location: ${brief.location}\nEra: ${brief.era}\nAtmosphere: ${brief.atmosphere}`,
				},
			],
			response_format: {
				type: "json_schema",
				json_schema: { name: "story_context", strict: true, schema: STORY_CONTEXT_SCHEMA },
			},
		});
	}
}
