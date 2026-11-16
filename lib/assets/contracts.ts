import type { EpisodePackage } from "@/lib/episode/types";
import { validateStoryContext } from "@/lib/episode/story-context";

export type RequestLifecycleStatus =
	| "queued"
	| "in-progress"
	| "success"
	| "partial-success"
	| "failure";

export type AssetResultStatus = "success" | "failure";
export type AssetType = "thumbnail" | "scene";

export interface ImageAssetReference {
	viewUrl: string;
	downloadUrl: string;
	storageKey: string;
	mimeType: string;
	byteSize?: number;
	availableUntil?: string;
}

export interface PromptReference {
	kind: "thumbnailPrompt" | "scenePrompt";
	index?: number;
}

export interface ImageAssetRecord {
	assetId: string;
	requestId: string;
	episodePackageId: string;
	normalizedKey: string;
	assetType: AssetType;
	sceneIndex?: number;
	promptRef: PromptReference;
	promptText: string;
	status: AssetResultStatus;
	errorCode?: string;
	errorReason?: string;
	createdAt: string;
	reference?: ImageAssetReference;
}

export interface EpisodeAssetGenerationRequest {
	requestId: string;
	episodePackageId: string;
	normalizedKey: string;
	status: RequestLifecycleStatus;
	requestedAt: string;
	startedAt?: string;
	completedAt?: string;
	succeededCount: number;
	failedCount: number;
}

export interface AssetGenerationResult {
	requestId: string;
	normalizedKey: string;
	status: "success" | "partial-success" | "failure";
	succeededCount: number;
	failedCount: number;
	assets: ImageAssetRecord[];
}

export interface RetrievalResult {
	normalizedKey: string;
	requests: EpisodeAssetGenerationRequest[];
	assets: ImageAssetRecord[];
	totals: {
		total: number;
		success: number;
		failure: number;
	};
}

export interface GenerateImageAssetsRequest {
	episodePackageId: string;
	requestId?: string;
	assetScope?: {
		includeThumbnail?: boolean;
		sceneIndexes?: "all" | number[];
	};
	package: EpisodePackage;
}

export interface ValidatedGenerateImageAssetsRequest {
	episodePackageId: string;
	requestId?: string;
	normalizedKey: string;
	includeThumbnail: boolean;
	sceneIndexes: number[];
	package: EpisodePackage;
}

export interface ValidationIssue {
	field: string;
	message: string;
}

export type ValidationResult<T> =
	| { ok: true; value: T }
	| { ok: false; message: string; issues: ValidationIssue[] };

function hasText(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function readObject(value: unknown): Record<string, unknown> | null {
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}

	return null;
}

function readSceneIndexes(raw: unknown, maxScenes: number): number[] | null {
	if (raw === undefined || raw === "all") {
		return Array.from({ length: maxScenes }, (_, index) => index);
	}

	if (!Array.isArray(raw)) {
		return null;
	}

	const indexes: number[] = [];
	for (const value of raw) {
		if (!Number.isInteger(value) || value < 0 || value >= maxScenes) {
			return null;
		}
		if (!indexes.includes(value)) {
			indexes.push(value);
		}
	}

	return indexes;
}

export function validateGenerateImageAssetsRequest(
	payload: unknown,
	normalizedKeyFromPath: string,
): ValidationResult<ValidatedGenerateImageAssetsRequest> {
	const issues: ValidationIssue[] = [];
	const obj = readObject(payload);

	if (!obj) {
		return {
			ok: false,
			message: "Request body must be an object.",
			issues: [{ field: "body", message: "Expected JSON object." }],
		};
	}

	const episodePackageId = obj.episodePackageId;
	if (!hasText(episodePackageId)) {
		issues.push({
			field: "episodePackageId",
			message: "episodePackageId is required.",
		});
	}

	const requestId = obj.requestId;
	if (requestId !== undefined && !hasText(requestId)) {
		issues.push({ field: "requestId", message: "requestId must be a non-empty string." });
	}

	const episodePackage = obj.package as EpisodePackage | undefined;
	if (!episodePackage || typeof episodePackage !== "object") {
		issues.push({ field: "package", message: "package is required." });
	}

	if (issues.length > 0 || !episodePackage) {
		return {
			ok: false,
			message: "Invalid generation request payload.",
			issues,
		};
	}

	if (episodePackage.brief.normalizedKey !== normalizedKeyFromPath) {
		issues.push({
			field: "package.brief.normalizedKey",
			message: "Package normalizedKey must match the route normalizedKey.",
		});
	}

	const storyContext = validateStoryContext(episodePackage.storyContext);
	if (!storyContext.ok) {
		for (const message of storyContext.issues) {
			issues.push({ field: "package.storyContext", message });
		}
	}

	const scope = readObject(obj.assetScope);
	const includeThumbnail = scope?.includeThumbnail === false ? false : true;
	const sceneIndexes = readSceneIndexes(scope?.sceneIndexes, episodePackage.scenePrompts.length);
	if (sceneIndexes === null) {
		issues.push({
			field: "assetScope.sceneIndexes",
			message: "sceneIndexes must be 'all' or an array of valid scene indexes.",
		});
	}

	if (!includeThumbnail && (sceneIndexes ?? []).length === 0) {
		issues.push({
			field: "assetScope",
			message: "At least one asset target is required (thumbnail or sceneIndexes).",
		});
	}

	if (!hasText(episodePackage.thumbnailPrompt) && includeThumbnail) {
		issues.push({
			field: "package.thumbnailPrompt",
			message: "thumbnailPrompt is required when includeThumbnail is true.",
		});
	}

	if (issues.length > 0 || sceneIndexes === null || !hasText(episodePackageId)) {
		return {
			ok: false,
			message: "Invalid generation request payload.",
			issues,
		};
	}

	return {
		ok: true,
		value: {
			episodePackageId,
			requestId: hasText(requestId) ? requestId : undefined,
			normalizedKey: normalizedKeyFromPath,
			includeThumbnail,
			sceneIndexes,
			package: storyContext.ok
				? { ...episodePackage, storyContext: storyContext.value }
				: episodePackage,
		},
	};
}

export function deriveTerminalStatus(
	succeededCount: number,
	failedCount: number,
): AssetGenerationResult["status"] {
	if (succeededCount > 0 && failedCount > 0) {
		return "partial-success";
	}
	if (succeededCount > 0) {
		return "success";
	}
	return "failure";
}

export function toRetrievalResult(
	normalizedKey: string,
	requests: EpisodeAssetGenerationRequest[],
	assets: ImageAssetRecord[],
): RetrievalResult {
	const success = assets.filter((asset) => asset.status === "success").length;
	const failure = assets.length - success;

	return {
		normalizedKey,
		requests,
		assets,
		totals: {
			total: assets.length,
			success,
			failure,
		},
	};
}

export interface ApiErrorResponse {
	error: string;
	message: string;
	issues?: ValidationIssue[];
}
