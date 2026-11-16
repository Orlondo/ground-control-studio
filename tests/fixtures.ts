import type { EpisodeBrief, StoryBeat, StoryContext } from "@/lib/episode/types";

export const brief: EpisodeBrief = {
	location: "Abandoned Lighthouse",
	era: "1920s",
	atmosphere: "Foggy And Tense",
	normalizedKey: "abandoned lighthouse | 1920s | foggy and tense",
};

export const storyContext: StoryContext = {
	characters: [
		{ name: "Mara", appearance: "lighthouse keeper in her 40s, grey wool coat, red scarf" },
		{ name: "Tobias", appearance: "young telegraph boy, flat cap, brass-buttoned jacket" },
	],
	setting: "a weathered stone lighthouse on a rocky North Sea islet",
	era: "1920s",
	lightingAndPalette: "cold blue fog, warm amber lamp glow",
	props: ["brass oil lamp", "logbook"],
	artStyle: "painterly graphic novel, muted tones",
};

const beat = (order: number, emotion: string, summary: string, action: string): StoryBeat => ({
	order,
	summary,
	emotion,
	action,
	composition: `composition for beat ${order}`,
	framing: `framing for beat ${order}`,
	lighting: `lighting for beat ${order}`,
	expression: `expression for beat ${order}`,
});

export const beats: StoryBeat[] = [
	beat(1, "calm", "Mara trims the lamp as fog rolls in.", "Mara trims the brass oil lamp at the lantern-room window"),
	beat(2, "unease", "Tobias arrives with a telegram nobody sent.", "Tobias holds out a blank telegram on the stairs"),
	beat(3, "dread", "The logbook shows entries in Mara's hand from tomorrow.", "Mara stares at an open logbook by lamplight"),
	beat(4, "terror", "A silhouette appears in the lantern glass.", "A dark figure looms behind Mara in the lantern glass"),
	beat(5, "calm", "Dawn breaks and the lamp burns steady.", "Mara and Tobias watch the sunrise from the gallery"),
];

export const beatsResponse = {
	beats: beats.map(({ order: _order, ...rest }) => {
		void _order;
		return rest;
	}),
};

export const allFit = { verdicts: beats.map((b) => ({ order: b.order, fitsTone: true, reason: "fits" })) };
