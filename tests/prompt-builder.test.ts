import { describe, expect, it } from "vitest";
import type { ValidatedGenerateImageAssetsRequest } from "@/lib/assets/contracts";
import { validateGenerateImageAssetsRequest } from "@/lib/assets/contracts";
import { buildTargets } from "@/lib/assets/generation-service";
import { formatStoryContext, withStoryContext } from "@/lib/assets/prompt-builder";
import { buildEpisodePackage } from "@/lib/episode/generator";
import { beats, brief, storyContext } from "./fixtures";

describe("formatStoryContext", () => {
	it("includes every story context field", () => {
		const block = formatStoryContext(storyContext);

		expect(block).toContain(
			"Characters: Mara (lighthouse keeper in her 40s, grey wool coat, red scarf); Tobias (young telegraph boy, flat cap, brass-buttoned jacket)",
		);
		expect(block).toContain(`Setting: ${storyContext.setting}`);
		expect(block).toContain(`Era: ${storyContext.era}`);
		expect(block).toContain(`Lighting and palette: ${storyContext.lightingAndPalette}`);
		expect(block).toContain("Props: brass oil lamp, logbook");
		expect(block).toContain(`Art style: ${storyContext.artStyle}`);
	});
});

describe("withStoryContext", () => {
	it("prepends the story context block to the prompt", () => {
		const prompt = withStoryContext(storyContext, "Mara lights the lamp.");

		expect(prompt.startsWith(formatStoryContext(storyContext))).toBe(true);
		expect(prompt.endsWith("Image: Mara lights the lamp.")).toBe(true);
	});
});

describe("buildTargets", () => {
	const episodePackage = buildEpisodePackage(brief, storyContext, beats);
	const request: ValidatedGenerateImageAssetsRequest = {
		episodePackageId: "pkg-1",
		normalizedKey: brief.normalizedKey,
		includeThumbnail: true,
		sceneIndexes: beats.map((_, index) => index),
		package: episodePackage,
	};

	it("prepends the same story context to every scene and the thumbnail", () => {
		const targets = buildTargets(request);
		const block = formatStoryContext(storyContext);

		expect(targets).toHaveLength(beats.length + 1);
		expect(targets.map((target) => target.assetType)).toEqual([
			"thumbnail",
			...beats.map(() => "scene"),
		]);
		for (const target of targets) {
			expect(target.promptText.startsWith(block)).toBe(true);
		}
		expect(targets[0].promptText).toBe(withStoryContext(storyContext, episodePackage.thumbnailPrompt));
		episodePackage.scenePrompts.forEach((scene, index) => {
			expect(targets[index + 1].promptText).toBe(withStoryContext(storyContext, scene.prompt));
		});
	});
});

describe("validateGenerateImageAssetsRequest", () => {
	it("rejects packages without a valid story context", () => {
		const { storyContext: _omitted, ...withoutContext } = buildEpisodePackage(brief, storyContext, beats);
		void _omitted;

		const result = validateGenerateImageAssetsRequest(
			{ episodePackageId: "pkg-1", package: withoutContext },
			brief.normalizedKey,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.issues.some((issue) => issue.field === "package.storyContext")).toBe(true);
		}
	});

	it("accepts packages with a valid story context", () => {
		const result = validateGenerateImageAssetsRequest(
			{ episodePackageId: "pkg-1", package: buildEpisodePackage(brief, storyContext, beats) },
			brief.normalizedKey,
		);

		expect(result.ok).toBe(true);
	});
});
