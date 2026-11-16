import type { EpisodeBrief, StoryContext } from "@/lib/episode/types";

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
