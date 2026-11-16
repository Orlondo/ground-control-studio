import { createHash } from "crypto";

export interface ProviderGenerationRequest {
	normalizedKey: string;
	assetType: "thumbnail" | "scene";
	sceneIndex?: number;
	promptText: string;
}

export type ProviderGenerationResult =
	| {
		ok: true;
		bytes: Buffer;
		mimeType: string;
		extension: string;
	}
	| {
		ok: false;
		errorCode: string;
		errorReason: string;
	};

export interface ImageProviderAdapter {
	generateImage(request: ProviderGenerationRequest): Promise<ProviderGenerationResult>;
}

const FAILURE_PATTERN = /(unsafe|invalid|reject|fail|error)/i;

function colorForInput(input: string): string {
	const hash = createHash("sha256").update(input).digest("hex");
	return `#${hash.slice(0, 6)}`;
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function buildSvg(request: ProviderGenerationRequest): string {
	const colorA = colorForInput(`${request.normalizedKey}:${request.assetType}`);
	const colorB = colorForInput(request.promptText);
	const title = escapeXml(`${request.assetType.toUpperCase()} • ${request.normalizedKey}`);
	const prompt = escapeXml(request.promptText.slice(0, 180));

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorA}" />
      <stop offset="100%" stop-color="${colorB}" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)" />
  <rect x="44" y="44" width="1192" height="632" fill="rgba(2,6,23,0.32)" stroke="rgba(255,255,255,0.24)" />
  <text x="80" y="130" fill="white" font-family="Arial, sans-serif" font-size="44" font-weight="700">${title}</text>
  <text x="80" y="194" fill="rgba(241,245,249,0.9)" font-family="Arial, sans-serif" font-size="26">Deterministic local image asset</text>
  <foreignObject x="80" y="250" width="1120" height="360">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: #e2e8f0; font-size: 24px; line-height: 1.5;">
      ${prompt}
    </div>
  </foreignObject>
</svg>`;
}

const IMAGE_MODEL = "gpt-image-2";
const MAX_RETRIES = 5;
const MAX_RETRY_DELAY_MS = 30_000;

export type OpenAIErrorBody = { error?: { message?: string; code?: string | null; type?: string; param?: string | null } };

type ProviderFailure = Extract<ProviderGenerationResult, { ok: false }>;

const PROMPT_REJECTED_CODES = new Set(["content_policy_violation", "moderation_blocked"]);

function failure(errorCode: string, errorReason: string): ProviderFailure {
	return { ok: false, errorCode, errorReason };
}

export function mapOpenAIError(status: number, body: OpenAIErrorBody): ProviderFailure {
	const code = body.error?.code ?? "";
	const type = body.error?.type ?? "";

	if (status === 401 || code === "invalid_api_key") {
		return failure("AUTH_FAILURE", "OpenAI authentication failed — check OPENAI_API_KEY.");
	}

	if (status === 403) {
		return failure("PERMISSION_DENIED", "OpenAI denied access to the image model — check the API key's project and organization permissions.");
	}

	if (PROMPT_REJECTED_CODES.has(code) || type === "image_generation_user_error") {
		return failure("PROMPT_REJECTED", "Prompt rejected by OpenAI content policy.");
	}

	if (status === 429) {
		return failure("RATE_LIMITED", "OpenAI rate limit reached.");
	}

	if (status === 400 || status === 404 || status === 422) {
		return failure("INVALID_REQUEST", "OpenAI rejected the image request as invalid — see server logs for details.");
	}

	return failure("PROVIDER_ERROR", `Image generation failed (HTTP ${status}).`);
}

function logOpenAIError(model: string, status: number, rawBody: string): void {
	console.error(`[OpenAIImageProvider] ${model} request failed with HTTP ${status}: ${rawBody}`);
}

function isRateLimitStatus(status: number): boolean {
	return status === 429;
}

function retryDelayMs(attempt: number): number {
	const base = Math.min(Math.pow(2, attempt) * 1000, MAX_RETRY_DELAY_MS);
	const jitter = base * 0.1 * (Math.random() * 2 - 1);
	return Math.round(base + jitter);
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

type ImageGenerationResponse = { data?: Array<{ b64_json?: string | null }> };

async function callOpenAI(
	apiKey: string,
	model: string,
	prompt: string,
): Promise<{ ok: true; bytes: Buffer } | ProviderFailure> {
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
		let response: Response;
		let text: string;
		try {
			// GPT image models always return base64 and reject `response_format`.
			response = await fetch("https://api.openai.com/v1/images/generations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({ model, prompt, n: 1 }),
			});
			text = await response.text();
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			console.error(`[OpenAIImageProvider] ${model} request could not reach OpenAI: ${detail}`);
			return failure("PROVIDER_ERROR", "Could not reach OpenAI.");
		}

		if (!response.ok) {
			logOpenAIError(model, response.status, text);

			if (isRateLimitStatus(response.status) && attempt < MAX_RETRIES) {
				await sleep(retryDelayMs(attempt));
				continue;
			}

			let body: OpenAIErrorBody = {};
			try { body = JSON.parse(text) as OpenAIErrorBody; } catch { /* ignore */ }

			return mapOpenAIError(response.status, body);
		}

		let parsed: ImageGenerationResponse = {};
		try { parsed = JSON.parse(text) as ImageGenerationResponse; } catch { /* ignore */ }

		const b64 = parsed.data?.[0]?.b64_json;
		if (!b64) {
			console.error(`[OpenAIImageProvider] ${model} returned no image data: ${text.slice(0, 500)}`);
			return failure("PROVIDER_ERROR", "Empty image response from OpenAI.");
		}

		return { ok: true, bytes: Buffer.from(b64, "base64") };
	}

	return failure("RATE_LIMITED", "OpenAI rate limit reached after retries.");
}

export class OpenAIImageProvider implements ImageProviderAdapter {
	private readonly apiKey: string;

	constructor() {
		const key = process.env.OPENAI_API_KEY;
		if (!key) {
			throw new Error("OPENAI_API_KEY is not set — cannot initialise OpenAIImageProvider.");
		}
		this.apiKey = key;
	}

	async generateImage(
		request: ProviderGenerationRequest,
	): Promise<ProviderGenerationResult> {
		const result = await callOpenAI(this.apiKey, IMAGE_MODEL, request.promptText);

		if (!result.ok) {
			return result;
		}

		return { ok: true, bytes: result.bytes, mimeType: "image/png", extension: "png" };
	}
}

export class LocalDeterministicImageProvider implements ImageProviderAdapter {
	async generateImage(
		request: ProviderGenerationRequest,
	): Promise<ProviderGenerationResult> {
		if (FAILURE_PATTERN.test(request.promptText)) {
			return {
				ok: false,
				errorCode: "PROMPT_REJECTED",
				errorReason: "Prompt rejected by local policy simulation.",
			};
		}

		const svg = buildSvg(request);
		return {
			ok: true,
			bytes: Buffer.from(svg, "utf8"),
			mimeType: "image/svg+xml",
			extension: "svg",
		};
	}
}
