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
		mimeType: "image/svg+xml";
		extension: "svg";
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
