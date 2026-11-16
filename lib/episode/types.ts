export type EpisodeFieldName = "location" | "era" | "atmosphere";

export interface EpisodeBrief {
	location: string;
	era: string;
	atmosphere: string;
	normalizedKey: string;
}

export interface ScenePrompt {
	order: number;
	prompt: string;
}

export interface ClipIdea {
	order: number;
	idea: string;
}

export interface StoryCharacter {
	name: string;
	appearance: string;
}

export interface StoryContext {
	characters: StoryCharacter[];
	setting: string;
	era: string;
	lightingAndPalette: string;
	props: string[];
	artStyle: string;
}

export interface EpisodePackage {
	brief: EpisodeBrief;
	storyContext: StoryContext;
	title: string;
	script: string;
	scenePrompts: ScenePrompt[];
	thumbnailPrompt: string;
	shortFormClipIdeas: ClipIdea[];
	description: string;
	tags: string[];
	generatorVersion: string;
}

export type EpisodeGenerationResult =
	| {
		status: "complete";
		package: EpisodePackage;
	}
	| {
		status: "needs-input";
		missingFields: EpisodeFieldName[];
		message: string;
	};

export interface EpisodeBriefInput {
	location?: string;
	era?: string;
	atmosphere?: string;
}