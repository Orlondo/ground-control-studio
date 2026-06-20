import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { ImageAssetReference } from "./contracts";

export interface StoreAssetInput {
	normalizedKey: string;
	assetId: string;
	extension: string;
	mimeType: string;
	bytes: Buffer;
}

export interface StorageAdapter {
	storeAsset(input: StoreAssetInput): Promise<ImageAssetReference>;
}

export class PublicFileStorageAdapter implements StorageAdapter {
	private readonly rootDir: string;
	private readonly publicUrlPrefix: string;

	constructor(
		rootDir = path.join(process.cwd(), "public", "generated-assets"),
		publicUrlPrefix = "/generated-assets",
	) {
		this.rootDir = rootDir;
		this.publicUrlPrefix = publicUrlPrefix;
	}

	async storeAsset(input: StoreAssetInput): Promise<ImageAssetReference> {
		const episodeDir = path.join(this.rootDir, input.normalizedKey);
		await mkdir(episodeDir, { recursive: true });

		const fileName = `${input.assetId}.${input.extension}`;
		const absolutePath = path.join(episodeDir, fileName);
		await writeFile(absolutePath, input.bytes);

		const storageKey = `${input.normalizedKey}/${fileName}`;
		const viewUrl = `${this.publicUrlPrefix}/${storageKey}`;
		const downloadUrl = `${viewUrl}?download=1`;

		return {
			viewUrl,
			downloadUrl,
			storageKey,
			mimeType: input.mimeType,
			byteSize: input.bytes.byteLength,
		};
	}
}
