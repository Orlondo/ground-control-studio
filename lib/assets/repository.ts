import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
	EpisodeAssetGenerationRequest,
	ImageAssetRecord,
} from "./contracts";

interface AssetDatabase {
	requests: EpisodeAssetGenerationRequest[];
	assets: ImageAssetRecord[];
}

export interface AssetRepository {
	createRequest(request: EpisodeAssetGenerationRequest): Promise<void>;
	updateRequest(
		normalizedKey: string,
		requestId: string,
		update: Partial<EpisodeAssetGenerationRequest>,
	): Promise<EpisodeAssetGenerationRequest | null>;
	findActiveRequest(normalizedKey: string): Promise<EpisodeAssetGenerationRequest | null>;
	saveAsset(record: ImageAssetRecord): Promise<void>;
	listByNormalizedKey(normalizedKey: string): Promise<AssetDatabase>;
}

function createEmptyDatabase(): AssetDatabase {
	return { requests: [], assets: [] };
}

export class FileAssetRepository implements AssetRepository {
	private readonly rootDir: string;

	constructor(rootDir = path.join(process.cwd(), ".specify", "runtime", "assets")) {
		this.rootDir = rootDir;
	}

	private async getFilePath(normalizedKey: string): Promise<string> {
		await mkdir(this.rootDir, { recursive: true });
		return path.join(this.rootDir, `${normalizedKey}.json`);
	}

	private async read(normalizedKey: string): Promise<AssetDatabase> {
		const filePath = await this.getFilePath(normalizedKey);
		try {
			const content = await readFile(filePath, "utf8");
			const parsed = JSON.parse(content) as AssetDatabase;
			return {
				requests: parsed.requests ?? [],
				assets: parsed.assets ?? [],
			};
		} catch {
			return createEmptyDatabase();
		}
	}

	private async write(normalizedKey: string, data: AssetDatabase): Promise<void> {
		const filePath = await this.getFilePath(normalizedKey);
		await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
	}

	async createRequest(request: EpisodeAssetGenerationRequest): Promise<void> {
		const data = await this.read(request.normalizedKey);
		data.requests.push(request);
		await this.write(request.normalizedKey, data);
	}

	async updateRequest(
		normalizedKey: string,
		requestId: string,
		update: Partial<EpisodeAssetGenerationRequest>,
	): Promise<EpisodeAssetGenerationRequest | null> {
		const data = await this.read(normalizedKey);
		const index = data.requests.findIndex((request) => request.requestId === requestId);
		if (index < 0) {
			return null;
		}

		const next = { ...data.requests[index], ...update };
		data.requests[index] = next;
		await this.write(normalizedKey, data);
		return next;
	}

	async findActiveRequest(normalizedKey: string): Promise<EpisodeAssetGenerationRequest | null> {
		const data = await this.read(normalizedKey);
		const active = data.requests.find(
			(request) => request.status === "queued" || request.status === "in-progress",
		);
		return active ?? null;
	}

	async saveAsset(record: ImageAssetRecord): Promise<void> {
		const data = await this.read(record.normalizedKey);
		data.assets.push(record);
		await this.write(record.normalizedKey, data);
	}

	async listByNormalizedKey(normalizedKey: string): Promise<AssetDatabase> {
		return this.read(normalizedKey);
	}
}
