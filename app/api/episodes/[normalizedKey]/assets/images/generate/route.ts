import { NextResponse } from "next/server";
import {
	validateGenerateImageAssetsRequest,
	type ApiErrorResponse,
} from "@/lib/assets/contracts";
import {
	AssetGenerationConflictError,
	getEpisodeAssetGenerationService,
} from "@/lib/assets/generation-service";

function jsonError(
	status: number,
	error: string,
	message: string,
	issues?: ApiErrorResponse["issues"],
) {
	const body: ApiErrorResponse = { error, message };
	if (issues) {
		body.issues = issues;
	}
	return NextResponse.json(body, { status });
}

export async function POST(
	request: Request,
	context: { params: Promise<{ normalizedKey: string }> },
) {
	const { normalizedKey } = await context.params;
	if (!normalizedKey) {
		return jsonError(400, "INVALID_PATH", "normalizedKey path parameter is required.");
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
	}

	const validated = validateGenerateImageAssetsRequest(payload, normalizedKey);
	if (!validated.ok) {
		return jsonError(400, "VALIDATION_ERROR", validated.message, validated.issues);
	}

	const service = getEpisodeAssetGenerationService();
	try {
		const result = await service.generate(validated.value);
		if (result.status === "failure") {
			return NextResponse.json(result, { status: 500 });
		}
		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		if (error instanceof AssetGenerationConflictError) {
			return jsonError(409, "REQUEST_IN_PROGRESS", error.message);
		}

		return jsonError(500, "INTERNAL_ERROR", "Unable to generate image assets.");
	}
}
