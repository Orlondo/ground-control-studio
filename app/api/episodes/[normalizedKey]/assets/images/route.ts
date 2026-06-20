import { NextResponse } from "next/server";
import { getEpisodeAssetGenerationService } from "@/lib/assets/generation-service";
import type { ApiErrorResponse } from "@/lib/assets/contracts";

function jsonError(status: number, error: string, message: string) {
	const body: ApiErrorResponse = { error, message };
	return NextResponse.json(body, { status });
}

export async function GET(
	_request: Request,
	context: { params: Promise<{ normalizedKey: string }> },
) {
	const { normalizedKey } = await context.params;
	if (!normalizedKey) {
		return jsonError(400, "INVALID_PATH", "normalizedKey path parameter is required.");
	}

	try {
		const service = getEpisodeAssetGenerationService();
		const result = await service.list(normalizedKey);
		if (result.assets.length === 0 && result.requests.length === 0) {
			return jsonError(404, "NOT_FOUND", `No image assets found for ${normalizedKey}.`);
		}
		return NextResponse.json(result, { status: 200 });
	} catch {
		return jsonError(500, "INTERNAL_ERROR", "Unable to fetch image assets.");
	}
}
