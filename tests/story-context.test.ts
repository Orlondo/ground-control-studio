import { describe, expect, it, vi } from "vitest";
import {
	generateStoryContext,
	StoryContextGenerationError,
	validateStoryContext,
	type StoryContextLLM,
} from "@/lib/episode/story-context";
import { brief, storyContext } from "./fixtures";

function fakeLLM(result: unknown | (() => Promise<unknown>)): StoryContextLLM {
	return {
		completeStoryContext: vi.fn(
			typeof result === "function" ? (result as () => Promise<unknown>) : async () => result,
		),
	};
}

describe("generateStoryContext", () => {
	it("returns the validated story context from the LLM", async () => {
		const llm = fakeLLM(storyContext);

		await expect(generateStoryContext(brief, llm)).resolves.toEqual(storyContext);
		expect(llm.completeStoryContext).toHaveBeenCalledWith(brief);
	});

	it("trims whitespace in LLM output", async () => {
		const llm = fakeLLM({ ...storyContext, setting: "  a lighthouse  " });

		const result = await generateStoryContext(brief, llm);

		expect(result.setting).toBe("a lighthouse");
	});

	it("throws StoryContextGenerationError when the LLM call fails", async () => {
		const llm = fakeLLM(async () => {
			throw new Error("OpenAI rate limit reached.");
		});

		const promise = generateStoryContext(brief, llm);

		await expect(promise).rejects.toBeInstanceOf(StoryContextGenerationError);
		await expect(promise).rejects.toThrow("OpenAI rate limit reached.");
	});

	it("throws StoryContextGenerationError on malformed output instead of falling back", async () => {
		await expect(generateStoryContext(brief, fakeLLM("not an object"))).rejects.toBeInstanceOf(
			StoryContextGenerationError,
		);
		await expect(generateStoryContext(brief, fakeLLM(null))).rejects.toBeInstanceOf(
			StoryContextGenerationError,
		);
	});

	it("throws StoryContextGenerationError when required fields are missing", async () => {
		const { artStyle: _artStyle, ...withoutArtStyle } = storyContext;
		void _artStyle;

		await expect(generateStoryContext(brief, fakeLLM(withoutArtStyle))).rejects.toThrow(
			/artStyle is required/,
		);
	});
});

describe("validateStoryContext", () => {
	it("accepts a complete story context", () => {
		expect(validateStoryContext(storyContext)).toEqual({ ok: true, value: storyContext });
	});

	it.each([
		["empty characters", { ...storyContext, characters: [] }, "characters"],
		["character without appearance", { ...storyContext, characters: [{ name: "Mara" }] }, "characters"],
		["blank setting", { ...storyContext, setting: "   " }, "setting"],
		["missing era", { ...storyContext, era: undefined }, "era"],
		["missing lighting", { ...storyContext, lightingAndPalette: 3 }, "lightingAndPalette"],
		["empty props", { ...storyContext, props: [] }, "props"],
		["non-string prop", { ...storyContext, props: ["lamp", 4] }, "props"],
	])("rejects %s", (_label, raw, field) => {
		const result = validateStoryContext(raw);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.issues.join(" ")).toContain(field);
		}
	});
});
