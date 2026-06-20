import { randomUUID } from "crypto";
import type {
	AssetGenerationResult,
	EpisodeAssetGenerationRequest,
	ImageAssetRecord,
	PromptReference,
	ValidatedGenerateImageAssetsRequest,
} from "./contracts";
import { deriveTerminalStatus, toRetrievalResult, type RetrievalResult } from "./contracts";
import {
	LocalDeterministicImageProvider,
	OpenAIImageProvider,
	type ImageProviderAdapter,
} from "./provider-adapter";
import { FileAssetRepository, type AssetRepository } from "./repository";
import { PublicFileStorageAdapter, type StorageAdapter } from "./storage-adapter";

export class AssetGenerationConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AssetGenerationConflictError";
	}
}

interface GenerationTarget {
	assetType: "thumbnail" | "scene";
	sceneIndex?: number;
	promptText: string;
	promptRef: PromptReference;
}

function buildTargets(
	request: ValidatedGenerateImageAssetsRequest,
): GenerationTarget[] {
	const targets: GenerationTarget[] = [];

	if (request.includeThumbnail) {
		targets.push({
			assetType: "thumbnail",
			promptText: request.package.thumbnailPrompt,
			promptRef: { kind: "thumbnailPrompt" },
		});
	}

	for (const sceneIndex of request.sceneIndexes) {
		const scene = request.package.scenePrompts[sceneIndex];
		if (!scene) {
			continue;
		}

		targets.push({
			assetType: "scene",
			sceneIndex,
			promptText: scene.prompt,
			promptRef: { kind: "scenePrompt", index: sceneIndex },
		});
	}

	return targets;
}

function makeRequestRecord(
	requestId: string,
	input: ValidatedGenerateImageAssetsRequest,
): EpisodeAssetGenerationRequest {
	return {
		requestId,
		episodePackageId: input.episodePackageId,
		normalizedKey: input.normalizedKey,
		status: "queued",
		requestedAt: new Date().toISOString(),
		succeededCount: 0,
		failedCount: 0,
	};
}

export class EpisodeAssetGenerationService {
	constructor(
		private readonly repository: AssetRepository,
		private readonly provider: ImageProviderAdapter,
		private readonly storage: StorageAdapter,
	) {}

	async generate(
		request: ValidatedGenerateImageAssetsRequest,
	): Promise<AssetGenerationResult> {
		const active = await this.repository.findActiveRequest(request.normalizedKey);
		if (active) {
			throw new AssetGenerationConflictError(
				`A generation request is already in progress for ${request.normalizedKey}.`,
			);
		}

		const requestId = request.requestId ?? randomUUID();
		const requestRecord = makeRequestRecord(requestId, request);
		await this.repository.createRequest(requestRecord);
		await this.repository.updateRequest(request.normalizedKey, requestId, {
			status: "in-progress",
			startedAt: new Date().toISOString(),
		});

		const targets = buildTargets(request);
		const assets: ImageAssetRecord[] = [];
		let succeededCount = 0;
		let failedCount = 0;

		for (const target of targets) {
			const generated = await this.provider.generateImage({
				normalizedKey: request.normalizedKey,
				assetType: target.assetType,
				sceneIndex: target.sceneIndex,
				promptText: target.promptText,
			});

			const assetId = randomUUID();
			if (generated.ok) {
				const reference = await this.storage.storeAsset({
					normalizedKey: request.normalizedKey,
					assetId,
					extension: generated.extension,
					mimeType: generated.mimeType,
					bytes: generated.bytes,
				});

				const record: ImageAssetRecord = {
					assetId,
					requestId,
					episodePackageId: request.episodePackageId,
					normalizedKey: request.normalizedKey,
					assetType: target.assetType,
					sceneIndex: target.sceneIndex,
					promptRef: target.promptRef,
					promptText: target.promptText,
					status: "success",
					createdAt: new Date().toISOString(),
					reference,
				};

				await this.repository.saveAsset(record);
				assets.push(record);
				succeededCount += 1;
				continue;
			}

			const failedRecord: ImageAssetRecord = {
				assetId,
				requestId,
				episodePackageId: request.episodePackageId,
				normalizedKey: request.normalizedKey,
				assetType: target.assetType,
				sceneIndex: target.sceneIndex,
				promptRef: target.promptRef,
				promptText: target.promptText,
				status: "failure",
				errorCode: generated.errorCode,
				errorReason: generated.errorReason,
				createdAt: new Date().toISOString(),
			};
			await this.repository.saveAsset(failedRecord);
			assets.push(failedRecord);
			failedCount += 1;
		}

		const status = deriveTerminalStatus(succeededCount, failedCount);
		await this.repository.updateRequest(request.normalizedKey, requestId, {
			status,
			succeededCount,
			failedCount,
			completedAt: new Date().toISOString(),
		});

		return {
			requestId,
			normalizedKey: request.normalizedKey,
			status,
			succeededCount,
			failedCount,
			assets,
		};
	}

	async list(normalizedKey: string): Promise<RetrievalResult> {
		const data = await this.repository.listByNormalizedKey(normalizedKey);
		return toRetrievalResult(normalizedKey, data.requests, data.assets);
	}
}

let serviceInstance: EpisodeAssetGenerationService | null = null;

function createProvider(): ImageProviderAdapter {
	if (process.env.OPENAI_API_KEY) {
		return new OpenAIImageProvider();
	}
	return new LocalDeterministicImageProvider();
}

export function getEpisodeAssetGenerationService(): EpisodeAssetGenerationService {
	if (!serviceInstance) {
		serviceInstance = new EpisodeAssetGenerationService(
			new FileAssetRepository(),
			createProvider(),
			new PublicFileStorageAdapter(),
		);
	}

	return serviceInstance;
}
