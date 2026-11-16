import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapOpenAIError, OpenAIImageProvider } from "@/lib/assets/provider-adapter";

const request = {
	normalizedKey: "harbor-1890s-foggy",
	assetType: "scene" as const,
	sceneIndex: 0,
	promptText: "A foggy harbor at dawn",
};

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function openAIError(message: string, type: string, code: string | null = null) {
	return { error: { message, type, code, param: null } };
}

describe("mapOpenAIError", () => {
	it.each([
		["401 invalid key", 401, openAIError("Incorrect API key provided", "invalid_request_error", "invalid_api_key"), "AUTH_FAILURE"],
		["invalid_api_key code without 401", 400, openAIError("Bad key", "invalid_request_error", "invalid_api_key"), "AUTH_FAILURE"],
		["403 unverified organization", 403, openAIError("Your organization must be verified to use the model", "invalid_request_error"), "PERMISSION_DENIED"],
		["content policy violation", 400, openAIError("Rejected by safety system", "invalid_request_error", "content_policy_violation"), "PROMPT_REJECTED"],
		["moderation blocked", 400, openAIError("Blocked by moderation", "invalid_request_error", "moderation_blocked"), "PROMPT_REJECTED"],
		["image_generation_user_error", 400, openAIError("Prompt not allowed", "image_generation_user_error"), "PROMPT_REJECTED"],
		["429 rate limit", 429, openAIError("Rate limit reached", "requests", "rate_limit_exceeded"), "RATE_LIMITED"],
		["400 unknown parameter", 400, openAIError("Unknown parameter: 'response_format'.", "invalid_request_error", "unknown_parameter"), "INVALID_REQUEST"],
		["400 invalid size", 400, openAIError("Invalid size", "invalid_request_error", "invalid_value"), "INVALID_REQUEST"],
		["404 model not found", 404, openAIError("The model does not exist", "invalid_request_error", "model_not_found"), "INVALID_REQUEST"],
		["500 server error", 500, openAIError("The server had an error", "server_error"), "PROVIDER_ERROR"],
		["503 with empty body", 503, {}, "PROVIDER_ERROR"],
	])("maps %s to %s", (_label, status, body, expected) => {
		expect(mapOpenAIError(status, body).errorCode).toBe(expected);
	});

	it("does not treat a generic invalid_request_error as an auth failure", () => {
		const result = mapOpenAIError(400, openAIError("Missing prompt", "invalid_request_error"));

		expect(result.errorCode).toBe("INVALID_REQUEST");
	});

	it("keeps raw OpenAI messages out of the error reason", () => {
		const result = mapOpenAIError(403, openAIError("Organization org-secret123 must be verified", "invalid_request_error"));

		expect(result.errorReason).not.toContain("org-secret123");
	});
});

describe("OpenAIImageProvider.generateImage", () => {
	const fetchMock = vi.fn<typeof fetch>();
	let consoleError: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
		vi.stubGlobal("fetch", fetchMock);
		consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		fetchMock.mockReset();
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.useRealTimers();
		consoleError.mockRestore();
	});

	it("calls gpt-image-2 without response_format and returns PNG bytes", async () => {
		const png = Buffer.from("png-bytes");
		fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: [{ b64_json: png.toString("base64") }] }));

		const result = await new OpenAIImageProvider().generateImage(request);

		expect(result).toEqual({ ok: true, bytes: png, mimeType: "image/png", extension: "png" });
		const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
		expect(body).toEqual({ model: "gpt-image-2", prompt: request.promptText, n: 1 });
		expect(body).not.toHaveProperty("response_format");
	});

	it("returns INVALID_REQUEST for a 400, logs the raw error, and does not call another model", async () => {
		const raw = openAIError("Unknown parameter: 'response_format'.", "invalid_request_error", "unknown_parameter");
		fetchMock.mockResolvedValueOnce(jsonResponse(400, raw));

		const result = await new OpenAIImageProvider().generateImage(request);

		expect(result).toMatchObject({ ok: false, errorCode: "INVALID_REQUEST" });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(consoleError).toHaveBeenCalledTimes(1);
		const logged = consoleError.mock.calls[0][0] as string;
		expect(logged).toContain("HTTP 400");
		expect(logged).toContain(JSON.stringify(raw));
		expect(logged).not.toContain("sk-test-key");
	});

	it("returns AUTH_FAILURE only for a genuine 401", async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse(401, openAIError("Incorrect API key provided", "invalid_request_error", "invalid_api_key")),
		);

		const result = await new OpenAIImageProvider().generateImage(request);

		expect(result).toMatchObject({ ok: false, errorCode: "AUTH_FAILURE" });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("returns PROVIDER_ERROR for a server error without falling back to another model", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(500, openAIError("The server had an error", "server_error")));

		const result = await new OpenAIImageProvider().generateImage(request);

		expect(result).toMatchObject({ ok: false, errorCode: "PROVIDER_ERROR" });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const models = fetchMock.mock.calls.map((call) => JSON.parse(call[1]?.body as string).model);
		expect(models).toEqual(["gpt-image-2"]);
	});

	it("returns PROVIDER_ERROR and logs when OpenAI cannot be reached", async () => {
		fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

		const result = await new OpenAIImageProvider().generateImage(request);

		expect(result).toMatchObject({ ok: false, errorCode: "PROVIDER_ERROR" });
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("fetch failed"));
	});

	it("returns PROVIDER_ERROR when the response has no image data", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: [] }));

		const result = await new OpenAIImageProvider().generateImage(request);

		expect(result).toMatchObject({ ok: false, errorCode: "PROVIDER_ERROR" });
	});

	it("retries 429s and then succeeds", async () => {
		vi.useFakeTimers();
		const png = Buffer.from("png-bytes");
		fetchMock
			.mockResolvedValueOnce(jsonResponse(429, openAIError("Rate limit reached", "requests", "rate_limit_exceeded")))
			.mockResolvedValueOnce(jsonResponse(200, { data: [{ b64_json: png.toString("base64") }] }));

		const pending = new OpenAIImageProvider().generateImage(request);
		await vi.runAllTimersAsync();

		expect(await pending).toMatchObject({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
