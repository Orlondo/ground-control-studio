import type { EpisodeBriefInput } from "./types";

function compactWhitespace(value: string): string {
	return value.trim().replace(/\s+/g, " ");
}

function normalizePunctuation(value: string): string {
	return value
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
		.replace(/[-_]+/g, " ");
}

export function normalizeText(value: string): string {
	return compactWhitespace(normalizePunctuation(value)).toLowerCase();
}

export function titleCase(value: string): string {
	return compactWhitespace(value)
		.toLowerCase()
		.split(" ")
		.map((word) => {
			if (!word) {
				return word;
			}

			return `${word[0].toUpperCase()}${word.slice(1)}`;
		})
		.join(" ");
}

export function createNormalizedKey(input: EpisodeBriefInput): string {
	const location = normalizeText(input.location ?? "");
	const era = normalizeText(input.era ?? "");
	const atmosphere = normalizeText(input.atmosphere ?? "");

	return [location, era, atmosphere].join(" | ");
}

export function normalizeEpisodeField(value: string): string {
	return compactWhitespace(value);
}

export function canonicalizeEpisodeField(value: string): string {
	return titleCase(normalizeText(value));
}