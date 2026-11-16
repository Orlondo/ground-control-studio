import { describe, expect, it, vi } from "vitest";
import { buildTargets } from "@/lib/assets/generation-service";
import { NO_TEXT_RULE } from "@/lib/assets/prompt-builder";
import { buildEpisodePackage, generateEpisodePackage, type EpisodeLLM } from "@/lib/episode/generator";
import {
	StoryBeatsGenerationError,
	generateStoryBeats,
	validateStoryBeats,
	validateToneVerdicts,
	type StoryBeatsLLM,
} from "@/lib/episode/story-beats";
import { allFit, beats, beatsResponse, brief, storyContext } from "./fixtures";

function withBeat(index: number, patch: Record<string, unknown>) {
	return { beats: beatsResponse.beats.map((beat, i) => (i === index ? { ...beat, ...patch } : beat)) };
}

function fakeBeatsLLM(responses: unknown[], verdicts: unknown[] = [allFit, allFit]): StoryBeatsLLM {
	const completeStoryBeats = vi.fn();
	responses.forEach((response) => completeStoryBeats.mockResolvedValueOnce(response));
	const judgeToneFit = vi.fn();
	verdicts.forEach((verdict) => judgeToneFit.mockResolvedValueOnce(verdict));
	return { completeStoryBeats, judgeToneFit };
}

describe("validateStoryBeats", () => {
	it("accepts 4–6 complete beats and numbers them in order", () => {
		const result = validateStoryBeats(beatsResponse);

		expect(result).toEqual({ ok: true, value: beats });
	});

	it("allows an emotion to return later in the arc", () => {
		const result = validateStoryBeats(beatsResponse);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value[0].emotion).toBe(result.value[4].emotion);
		}
	});

	it("rejects an empty beat", () => {
		const result = validateStoryBeats({ beats: [...beatsResponse.beats.slice(0, 4), {}] });

		expect(result).toEqual({ ok: false, issues: ["Beat 5 is empty."] });
	});

	it("rejects a beat without an emotion", () => {
		const result = validateStoryBeats(withBeat(1, { emotion: "  " }));

		expect(result).toEqual({ ok: false, issues: ["Beat 2 is missing: emotion."] });
	});

	it("rejects adjacent beats with the same emotion, case-insensitively", () => {
		const result = validateStoryBeats(withBeat(2, { emotion: "Unease" }));

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.issues[0]).toContain("Beats 2 and 3 share the emotion");
		}
	});

	it.each([
		["too few", 3],
		["too many", 7],
	])("rejects %s beats", (_label, count) => {
		const list = Array.from({ length: count }, (_, i) => ({
			...beatsResponse.beats[0],
			emotion: `emotion ${i}`,
		}));

		const result = validateStoryBeats({ beats: list });

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.issues[0]).toContain(`got ${count}`);
		}
	});

	it("rejects a response without a beats list", () => {
		expect(validateStoryBeats(null).ok).toBe(false);
		expect(validateStoryBeats({ beats: "none" }).ok).toBe(false);
	});
});

describe("validateToneVerdicts", () => {
	it("returns no issues when every beat fits", () => {
		expect(validateToneVerdicts(allFit, "haunted", beats)).toEqual([]);
	});

	it("reports a clashing emotion with the judge's reason", () => {
		const verdicts = {
			verdicts: allFit.verdicts.map((v) => (v.order === 3 ? { ...v, fitsTone: false, reason: "too cheerful" } : v)),
		};

		expect(validateToneVerdicts(verdicts, "haunted", beats)).toEqual([
			'Beat 3 emotion "dread" clashes with the tone "haunted": too cheerful',
		]);
	});

	it("reports missing verdicts and malformed output", () => {
		expect(validateToneVerdicts({ verdicts: allFit.verdicts.slice(1) }, "haunted", beats)).toEqual([
			"Tone judge returned no verdict for beat 1.",
		]);
		expect(validateToneVerdicts({}, "haunted", beats)).toHaveLength(1);
	});
});

describe("generateStoryBeats", () => {
	it("returns validated beats and passes the brief tone to the judge", async () => {
		const llm = fakeBeatsLLM([beatsResponse]);

		await expect(generateStoryBeats(brief, storyContext, llm)).resolves.toEqual(beats);
		expect(llm.completeStoryBeats).toHaveBeenCalledWith({ brief, storyContext, previousIssues: [] });
		expect(llm.judgeToneFit).toHaveBeenCalledWith({ tone: brief.atmosphere, beats });
	});

	it("retries once with the issues when a beat has no emotion, then succeeds", async () => {
		const llm = fakeBeatsLLM([withBeat(1, { emotion: "" }), beatsResponse], [allFit]);

		await expect(generateStoryBeats(brief, storyContext, llm)).resolves.toEqual(beats);
		expect(llm.completeStoryBeats).toHaveBeenCalledTimes(2);
		expect(llm.completeStoryBeats).toHaveBeenLastCalledWith({
			brief,
			storyContext,
			previousIssues: ["Beat 2 is missing: emotion."],
		});
		expect(llm.judgeToneFit).toHaveBeenCalledTimes(1);
	});

	it("retries once when the judge reports a tone clash, then succeeds", async () => {
		const clash = { verdicts: allFit.verdicts.map((v) => (v.order === 2 ? { ...v, fitsTone: false } : v)) };
		const llm = fakeBeatsLLM([beatsResponse, beatsResponse], [clash, allFit]);

		await expect(generateStoryBeats(brief, storyContext, llm)).resolves.toEqual(beats);
		expect(llm.completeStoryBeats).toHaveBeenCalledTimes(2);
		expect(vi.mocked(llm.completeStoryBeats).mock.calls[1][0].previousIssues[0]).toContain("clashes with the tone");
	});

	it("throws StoryBeatsGenerationError after two invalid attempts", async () => {
		const llm = fakeBeatsLLM([withBeat(0, { emotion: "" }), { beats: [] }]);

		const failure = generateStoryBeats(brief, storyContext, llm);

		await expect(failure).rejects.toBeInstanceOf(StoryBeatsGenerationError);
		await expect(failure).rejects.toThrow("invalid after 2 attempts: Expected 4–6 beats but got 0.");
		expect(llm.completeStoryBeats).toHaveBeenCalledTimes(2);
	});

	it("throws after two tone clashes", async () => {
		const clash = { verdicts: allFit.verdicts.map((v) => ({ ...v, fitsTone: false })) };
		const llm = fakeBeatsLLM([beatsResponse, beatsResponse], [clash, clash]);

		await expect(generateStoryBeats(brief, storyContext, llm)).rejects.toThrow(/clashes with the tone/);
		expect(llm.judgeToneFit).toHaveBeenCalledTimes(2);
	});

	it("fails immediately without retrying when the LLM call errors", async () => {
		const llm: StoryBeatsLLM = {
			completeStoryBeats: vi.fn(async () => {
				throw new Error("OpenAI authentication failed — check OPENAI_API_KEY.");
			}),
			judgeToneFit: vi.fn(),
		};

		await expect(generateStoryBeats(brief, storyContext, llm)).rejects.toThrow(
			"Story beat generation failed: OpenAI authentication failed",
		);
		expect(llm.completeStoryBeats).toHaveBeenCalledTimes(1);
		expect(llm.judgeToneFit).not.toHaveBeenCalled();
	});

	it("fails immediately when the tone judge call errors", async () => {
		const llm = fakeBeatsLLM([beatsResponse], []);
		vi.mocked(llm.judgeToneFit).mockRejectedValueOnce(new Error("OpenAI rate limit reached."));

		await expect(generateStoryBeats(brief, storyContext, llm)).rejects.toThrow("Story beat tone check failed");
		expect(llm.completeStoryBeats).toHaveBeenCalledTimes(1);
	});
});

describe("episode built from one beat list", () => {
	const episodePackage = buildEpisodePackage(brief, storyContext, beats);

	it("builds the script from the beat summaries in order", () => {
		expect(episodePackage.script.split("\n\n")).toEqual(beats.map((b) => `${b.order}. ${b.summary}`));
	});

	it("builds one scene prompt per beat with its panel number, emotion, action and visual directions", () => {
		expect(episodePackage.scenePrompts).toHaveLength(beats.length);
		episodePackage.scenePrompts.forEach((scene, index) => {
			const beat = beats[index];
			expect(scene.order).toBe(beat.order);
			expect(scene.prompt).toContain(`Panel ${beat.order} of ${beats.length}.`);
			expect(scene.prompt).toContain(`Emotion: ${beat.emotion}`);
			expect(scene.prompt).toContain(`Action: ${beat.action}`);
			expect(scene.prompt).toContain(`Composition: ${beat.composition}`);
			expect(scene.prompt).toContain(`Framing: ${beat.framing}`);
			expect(scene.prompt).toContain(`Lighting: ${beat.lighting}`);
			expect(scene.prompt).toContain(`Expression: ${beat.expression}`);
		});
	});

	it("sends every scene and the thumbnail with the beat's emotion and the no-text rule", () => {
		const targets = buildTargets({
			episodePackageId: "pkg-1",
			normalizedKey: brief.normalizedKey,
			includeThumbnail: true,
			sceneIndexes: beats.map((_, i) => i),
			package: episodePackage,
		});

		expect(targets).toHaveLength(beats.length + 1);
		for (const target of targets) {
			expect(target.promptText).toContain(NO_TEXT_RULE);
		}
		expect(targets[0].promptText).toContain(`overall ${brief.atmosphere.toLowerCase()} tone`);
		targets.slice(1).forEach((target, index) => {
			expect(target.promptText).toContain(`Emotion: ${beats[index].emotion}`);
			expect(target.promptText).toContain(`Action: ${beats[index].action}`);
		});
	});
});

describe("generateEpisodePackage with beats", () => {
	const input = { location: "abandoned lighthouse", era: "1920s", atmosphere: "foggy and tense" };

	it("runs story context, then beats with that context, then builds the package", async () => {
		const calls: string[] = [];
		const llm: EpisodeLLM = {
			completeStoryContext: vi.fn(async () => {
				calls.push("context");
				return storyContext;
			}),
			completeStoryBeats: vi.fn(async () => {
				calls.push("beats");
				return beatsResponse;
			}),
			judgeToneFit: vi.fn(async () => {
				calls.push("tone");
				return allFit;
			}),
		};

		const result = await generateEpisodePackage(input, llm);

		expect(calls).toEqual(["context", "beats", "tone"]);
		expect(vi.mocked(llm.completeStoryBeats).mock.calls[0][0].storyContext).toEqual(storyContext);
		expect(result.status).toBe("complete");
		if (result.status === "complete") {
			expect(result.package.beats).toEqual(beats);
		}
	});

	it("propagates beat failures and produces no package", async () => {
		const llm: EpisodeLLM = {
			completeStoryContext: vi.fn(async () => storyContext),
			completeStoryBeats: vi.fn(async () => ({ beats: [] })),
			judgeToneFit: vi.fn(),
		};

		await expect(generateEpisodePackage(input, llm)).rejects.toBeInstanceOf(StoryBeatsGenerationError);
	});
});
