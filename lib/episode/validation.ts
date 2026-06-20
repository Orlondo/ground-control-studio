import type {
	EpisodeBrief,
	EpisodeBriefInput,
	EpisodeFieldName,
	EpisodeGenerationResult,
} from "./types";
import {
	canonicalizeEpisodeField,
	createNormalizedKey,
	normalizeEpisodeField,
} from "./normalization";

function hasMeaningfulText(value: string | undefined): value is string {
	return typeof value === "string" && normalizeEpisodeField(value).length > 0;
}

function buildMissingFields(input: EpisodeBriefInput): EpisodeFieldName[] {
	const missingFields: EpisodeFieldName[] = [];

	if (!hasMeaningfulText(input.location)) {
		missingFields.push("location");
	}

	if (!hasMeaningfulText(input.era)) {
		missingFields.push("era");
	}

	if (!hasMeaningfulText(input.atmosphere)) {
		missingFields.push("atmosphere");
	}

	return missingFields;
}

export function validateEpisodeBrief(
	input: EpisodeBriefInput,
):
	| { ok: true; brief: EpisodeBrief }
	| { ok: false; missingFields: EpisodeFieldName[]; message: string } {
	const missingFields = buildMissingFields(input);

	if (missingFields.length > 0) {
		return {
			ok: false,
			missingFields,
			message: `Please provide ${missingFields.join(", ")} to generate an episode package.`,
		};
	}

	const location = normalizeEpisodeField(input.location ?? "");
	const era = normalizeEpisodeField(input.era ?? "");
	const atmosphere = normalizeEpisodeField(input.atmosphere ?? "");

	const canonicalLocation = canonicalizeEpisodeField(location);
	const canonicalEra = canonicalizeEpisodeField(era);
	const canonicalAtmosphere = canonicalizeEpisodeField(atmosphere);

	return {
		ok: true,
		brief: {
			location: canonicalLocation,
			era: canonicalEra,
			atmosphere: canonicalAtmosphere,
			normalizedKey: createNormalizedKey({
				location: canonicalLocation,
				era: canonicalEra,
				atmosphere: canonicalAtmosphere,
			}),
		},
	};
}

export function toIncompleteResult(
	missingFields: EpisodeFieldName[],
	message: string,
): EpisodeGenerationResult {
	return {
		status: "needs-input",
		missingFields,
		message,
	};
}