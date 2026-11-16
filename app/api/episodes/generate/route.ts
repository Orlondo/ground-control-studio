import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/lib/assets/contracts";
import { generateEpisodePackage, type EpisodeLLM } from "@/lib/episode/generator";
import { OpenAIStoryBeatsClient } from "@/lib/episode/openai-story-beats-client";
import { OpenAIStoryContextClient } from "@/lib/episode/openai-story-context-client";
import { StoryBeatsGenerationError } from "@/lib/episode/story-beats";
import { StoryContextGenerationError } from "@/lib/episode/story-context";
import type { EpisodeBriefInput } from "@/lib/episode/types";

function jsonError(status: number, error: string, message: string) {
	const body: ApiErrorResponse = { error, message };
	return NextResponse.json(body, { status });
}

function readBriefInput(payload: unknown): EpisodeBriefInput | null {
	if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
		return null;
	}
	const record = payload as Record<string, unknown>;
	const pick = (value: unknown) => (typeof value === "string" ? value : undefined);
	return {
		location: pick(record.location),
		era: pick(record.era),
		atmosphere: pick(record.atmosphere),
	};
}

export async function POST(request: Request) {
	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
	}

	const input = readBriefInput(payload);
	if (!input) {
		return jsonError(400, "VALIDATION_ERROR", "Request body must be an object.");
	}

	const llm: EpisodeLLM = {
		completeStoryContext: (brief) => new OpenAIStoryContextClient().completeStoryContext(brief),
		completeStoryBeats: (beatsRequest) => new OpenAIStoryBeatsClient().completeStoryBeats(beatsRequest),
		judgeToneFit: (toneRequest) => new OpenAIStoryBeatsClient().judgeToneFit(toneRequest),
	};

	try {
		const result = await generateEpisodePackage(input, llm);
		if (result.status === "needs-input") {
			return NextResponse.json(result, { status: 400 });
		}
		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		if (error instanceof StoryContextGenerationError) {
			return jsonError(502, "STORY_CONTEXT_FAILED", error.message);
		}
		if (error instanceof StoryBeatsGenerationError) {
			return jsonError(502, "STORY_BEATS_FAILED", error.message);
		}
		return jsonError(500, "INTERNAL_ERROR", "Unable to generate episode package.");
	}
}
