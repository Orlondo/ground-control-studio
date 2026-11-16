import type { StoryContext } from "@/lib/episode/types";

export function formatStoryContext(context: StoryContext): string {
	const characters = context.characters
		.map((character) => `${character.name} (${character.appearance})`)
		.join("; ");

	return [
		"Story context (keep consistent across every image in this episode):",
		`Characters: ${characters}`,
		`Setting: ${context.setting}`,
		`Era: ${context.era}`,
		`Lighting and palette: ${context.lightingAndPalette}`,
		`Props: ${context.props.join(", ")}`,
		`Art style: ${context.artStyle}`,
	].join("\n");
}

export function withStoryContext(context: StoryContext, prompt: string): string {
	return `${formatStoryContext(context)}\n\nImage: ${prompt}`;
}
