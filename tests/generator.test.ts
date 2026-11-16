import { describe, expect, it, vi } from "vitest";
import { buildEpisodePackage, generateEpisodePackage } from "@/lib/episode/generator";
import { StoryContextGenerationError } from "@/lib/episode/story-context";
import type { EpisodeLLM } from "@/lib/episode/generator";
import { allFit, beats, beatsResponse, brief, storyContext } from "./fixtures";

function fakeLLM(overrides: Partial<EpisodeLLM> = {}): EpisodeLLM {
	return {
		completeStoryContext: vi.fn(async () => storyContext),
		completeStoryBeats: vi.fn(async () => beatsResponse),
		judgeToneFit: vi.fn(async () => allFit),
		...overrides,
	};
}

const input = { location: "abandoned lighthouse", era: "1920s", atmosphere: "foggy and tense" };

describe("generateEpisodePackage", () => {
	it("generates the story context from the validated brief and includes it in the package", async () => {
		const llm = fakeLLM();

		const result = await generateEpisodePackage(input, llm);

		expect(llm.completeStoryContext).toHaveBeenCalledTimes(1);
		expect(llm.completeStoryContext).toHaveBeenCalledWith(
			expect.objectContaining({ location: "Abandoned Lighthouse", era: "1920s" }),
		);
		expect(result.status).toBe("complete");
		if (result.status === "complete") {
			expect(result.package.storyContext).toEqual(storyContext);
			expect(result.package.script).not.toBe("");
			expect(result.package.scenePrompts).toHaveLength(beats.length);
		}
	});

	it("propagates story context failures and produces no package", async () => {
		const llm = fakeLLM({
			completeStoryContext: vi.fn(async () => {
				throw new Error("boom");
			}),
		});

		await expect(generateEpisodePackage(input, llm)).rejects.toBeInstanceOf(
			StoryContextGenerationError,
		);
	});

	it("returns needs-input without calling the LLM when the brief is incomplete", async () => {
		const llm = fakeLLM();

		const result = await generateEpisodePackage({ location: "lighthouse" }, llm);

		expect(result.status).toBe("needs-input");
		expect(llm.completeStoryContext).not.toHaveBeenCalled();
	});
});

describe("buildEpisodePackage", () => {
	it("attaches the given story context without modifying it", () => {
		const episodePackage = buildEpisodePackage(brief, storyContext, beats);

		expect(episodePackage.storyContext).toBe(storyContext);
		expect(episodePackage.brief).toBe(brief);
	});
});
