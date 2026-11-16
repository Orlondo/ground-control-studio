"use client";

import Image from "next/image";
import { useState, type FormEvent, type ReactNode } from "react";
import type { EpisodeGenerationResult, StoryContext } from "@/lib/episode/types";
import type {
	AssetGenerationResult,
	ImageAssetRecord,
	RetrievalResult,
} from "@/lib/assets/contracts";

type EpisodeBriefForm = {
	location: string;
	era: string;
	atmosphere: string;
};

const initialForm: EpisodeBriefForm = {
	location: "",
	era: "",
	atmosphere: "",
};

function ResultPanel({
	title,
	children,
}: Readonly<{
	title: string;
	children: ReactNode;
}>) {
	return (
		<section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.24)] backdrop-blur-sm">
			<h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-100/80">
				{title}
			</h3>
			<div className="mt-4 text-sm leading-7 text-slate-100/92">{children}</div>
		</section>
	);
}

function AssetStatusPill({ status }: Readonly<{ status: "success" | "failure" }>) {
	return (
		<span
			className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
				status === "success"
					? "border border-emerald-300/30 bg-emerald-300/20 text-emerald-100"
					: "border border-rose-300/30 bg-rose-300/20 text-rose-100"
			}`}
		>
			{status}
		</span>
	);
}

function formatAssets(assets: ImageAssetRecord[]): ReactNode {
	if (assets.length === 0) {
		return <p className="text-sm text-slate-300">No image asset attempts are available yet.</p>;
	}

	return (
		<div className="grid gap-4 md:grid-cols-2">
			{assets.map((asset) => (
				<article
					key={asset.assetId}
					className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"
				>
					<div className="flex items-center justify-between gap-2">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">
							{asset.assetType}
						</p>
						<AssetStatusPill status={asset.status} />
					</div>

					{asset.status === "success" && asset.reference ? (
						<div className="space-y-2">
							<Image
								src={asset.reference.viewUrl}
								alt={`${asset.assetType} asset preview`}
								width={640}
								height={360}
								className="h-auto w-full rounded-xl border border-white/10"
								unoptimized
							/>
							<div className="flex gap-2 text-xs font-medium">
								<a
									href={asset.reference.viewUrl}
									target="_blank"
									rel="noreferrer"
									className="rounded-full border border-white/20 px-3 py-1 text-cyan-100 hover:bg-white/10"
								>
									View
								</a>
								<a
									href={asset.reference.downloadUrl}
									target="_blank"
									rel="noreferrer"
									className="rounded-full border border-white/20 px-3 py-1 text-cyan-100 hover:bg-white/10"
								>
									Download
								</a>
							</div>
						</div>
					) : (
						<p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
							{asset.errorReason ?? "Asset generation failed."}
						</p>
					)}

					<div className="space-y-1 text-xs text-slate-300">
						<p>
							<b>Asset ID:</b> {asset.assetId}
						</p>
						<p>
							<b>Episode Package ID:</b> {asset.episodePackageId}
						</p>
						<p>
							<b>Normalized Key:</b> {asset.normalizedKey}
						</p>
						<p>
							<b>Prompt Ref:</b> {asset.promptRef.kind}
							{typeof asset.promptRef.index === "number" ? ` (${asset.promptRef.index})` : ""}
						</p>
					</div>
				</article>
			))}
		</div>
	);
}

function formatList(items: string[]): ReactNode {
	return (
		<ul className="space-y-2">
			{items.map((item) => (
				<li key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
					{item}
				</li>
			))}
		</ul>
	);
}

function formatStoryContextPanel(context: StoryContext): ReactNode {
	return (
		<div className="space-y-2 text-sm text-slate-200/90">
			<div>
				<b>Characters:</b>
				<ul className="mt-1 space-y-1">
					{context.characters.map((character) => (
						<li key={character.name}>
							<b>{character.name}</b> — {character.appearance}
						</li>
					))}
				</ul>
			</div>
			<p>
				<b>Setting:</b> {context.setting}
			</p>
			<p>
				<b>Era:</b> {context.era}
			</p>
			<p>
				<b>Lighting and palette:</b> {context.lightingAndPalette}
			</p>
			<p>
				<b>Props:</b> {context.props.join(", ")}
			</p>
			<p>
				<b>Art style:</b> {context.artStyle}
			</p>
		</div>
	);
}

function formatResult(result: EpisodeGenerationResult): ReactNode {
	if (result.status === "needs-input") {
		return (
			<div className="space-y-4">
				<p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-amber-100">
					{result.message}
				</p>
				<p className="text-sm text-slate-300">
					Missing fields: {result.missingFields.join(", ")}
				</p>
			</div>
		);
	}

	const { package: episodePackage } = result;

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
				<p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/80">
					Episode Package
				</p>
				<h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
					{episodePackage.title}
				</h2>
				<p className="mt-3 text-sm text-slate-200/90">
					{episodePackage.description}
				</p>
			</div>

			<ResultPanel title="Story Context (shared by every image)">
				{formatStoryContextPanel(episodePackage.storyContext)}
			</ResultPanel>

			<div className="grid gap-4 md:grid-cols-2">
				<ResultPanel title="Script">
					<pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-100">{episodePackage.script}</pre>
				</ResultPanel>

				<ResultPanel title="Thumbnail Prompt">
					<p>{episodePackage.thumbnailPrompt}</p>
				</ResultPanel>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<ResultPanel title="Scene Prompts">
					{formatList(episodePackage.scenePrompts.map((scene) => `${scene.order}. ${scene.prompt}`))}
				</ResultPanel>

				<ResultPanel title="Short-Form Clip Ideas">
					{formatList(episodePackage.shortFormClipIdeas.map((idea) => `${idea.order}. ${idea.idea}`))}
				</ResultPanel>
			</div>

			<div className="grid gap-4 md:grid-cols-[1fr_auto]">
				<ResultPanel title="Tags">
					<div className="flex flex-wrap gap-2">
						{episodePackage.tags.map((tag) => (
							<span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-slate-100">
								#{tag}
							</span>
						))}
					</div>
				</ResultPanel>

				<ResultPanel title="Traceability">
					<div className="space-y-2 text-sm text-slate-200/90">
						<p>
							<b>Location:</b> {episodePackage.brief.location}
						</p>
						<p>
							<b>Era:</b> {episodePackage.brief.era}
						</p>
						<p>
							<b>Atmosphere:</b> {episodePackage.brief.atmosphere}
						</p>
						<p>
							<b>Normalized Key:</b> {episodePackage.brief.normalizedKey}
						</p>
						<p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">
							Generator v{episodePackage.generatorVersion}
						</p>
					</div>
				</ResultPanel>
			</div>
		</div>
	);
}

export default function Home() {
	const [form, setForm] = useState<EpisodeBriefForm>(initialForm);
	const [result, setResult] = useState<EpisodeGenerationResult | null>(null);
	const [assetGenerationResult, setAssetGenerationResult] =
		useState<AssetGenerationResult | null>(null);
	const [retrievalResult, setRetrievalResult] = useState<RetrievalResult | null>(null);
	const [retrievalKey, setRetrievalKey] = useState("");
	const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
	const [isRetrievingAssets, setIsRetrievingAssets] = useState(false);
	const [assetError, setAssetError] = useState<string | null>(null);
	const [isGeneratingEpisode, setIsGeneratingEpisode] = useState(false);
	const [episodeError, setEpisodeError] = useState<string | null>(null);

	const canSubmit =
		form.location.trim() !== "" && form.era.trim() !== "" && form.atmosphere.trim() !== "";

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setAssetGenerationResult(null);
		setRetrievalResult(null);
		setAssetError(null);
		setEpisodeError(null);
		setResult(null);
		setIsGeneratingEpisode(true);

		try {
			const response = await fetch("/api/episodes/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(form),
			});
			const data = (await response.json()) as EpisodeGenerationResult | { message?: string };

			if ("status" in data && (data.status === "complete" || data.status === "needs-input")) {
				setResult(data);
				return;
			}

			const message = "message" in data ? data.message : undefined;
			setEpisodeError(message ?? "Episode generation failed.");
		} catch {
			setEpisodeError("Episode generation failed.");
		} finally {
			setIsGeneratingEpisode(false);
		}
	}

	async function handleGenerateAssets() {
		if (!result || result.status !== "complete") {
			return;
		}

		const normalizedKey = result.package.brief.normalizedKey;
		setIsGeneratingAssets(true);
		setAssetError(null);

		try {
			const response = await fetch(
				`/api/episodes/${encodeURIComponent(normalizedKey)}/assets/images/generate`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						episodePackageId: `${normalizedKey}-package`,
						assetScope: {
							includeThumbnail: true,
							sceneIndexes: "all",
						},
						package: result.package,
					}),
				},
			);

			const data = (await response.json()) as
				| AssetGenerationResult
				| { message?: string };

			if (!response.ok) {
				const message = "message" in data ? data.message : undefined;
				setAssetError(message ?? "Image generation request failed.");
				return;
			}

			setAssetGenerationResult(data as AssetGenerationResult);
			setRetrievalKey(normalizedKey);
		} catch {
			setAssetError("Image generation request failed.");
		} finally {
			setIsGeneratingAssets(false);
		}
	}

	async function handleRetrieveAssets() {
		const key = retrievalKey.trim();
		if (!key) {
			setAssetError("Provide a normalized key to load assets.");
			return;
		}

		setIsRetrievingAssets(true);
		setAssetError(null);

		try {
			const response = await fetch(`/api/episodes/${encodeURIComponent(key)}/assets/images`);
			const data = (await response.json()) as RetrievalResult | { message?: string };

			if (!response.ok) {
				const message = "message" in data ? data.message : undefined;
				setAssetError(message ?? "Unable to retrieve assets for this normalized key.");
				return;
			}

			setRetrievalResult(data as RetrievalResult);
		} catch {
			setAssetError("Unable to retrieve assets for this normalized key.");
		} finally {
			setIsRetrievingAssets(false);
		}
	}

	return (
		<main className="min-h-screen">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_30px_120px_rgba(15,23,42,0.4)] backdrop-blur-xl">
					<div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
						<div className="space-y-6">
							<p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100">
								Phase 1 Episode Builder
							</p>
							<div className="space-y-4">
								<h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
									Liminal Episode Studio
								</h1>
								<p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
									Enter a location, era, and atmosphere, then generate a deterministic episode package with
									title, script, scene prompts, thumbnail prompt, short-form ideas, description, and tags.
								</p>
							</div>

							<div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
								<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
									<p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Input</p>
									<p className="mt-2">Location, era, atmosphere</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
									<p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Output</p>
									<p className="mt-2">Complete EpisodePackage</p>
								</div>
								<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
									<p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Scope</p>
									<p className="mt-2">Text-only Phase 1</p>
								</div>
							</div>
						</div>

						<form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/20">
							<div className="space-y-5">
								<div>
									<label htmlFor="location" className="text-sm font-medium text-slate-100">
										Location
									</label>
									<input
										id="location"
										value={form.location}
										onChange={(event) =>
											setForm((current) => ({ ...current, location: event.target.value }))
										}
										placeholder="An abandoned lunar archive"
										className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
									/>
								</div>

								<div>
									<label htmlFor="era" className="text-sm font-medium text-slate-100">
										Era
									</label>
									<input
										id="era"
										value={form.era}
										onChange={(event) => setForm((current) => ({ ...current, era: event.target.value }))}
										placeholder="Future noir"
										className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
									/>
								</div>

								<div>
									<label htmlFor="atmosphere" className="text-sm font-medium text-slate-100">
										Atmosphere
									</label>
									<input
										id="atmosphere"
										value={form.atmosphere}
										onChange={(event) =>
											setForm((current) => ({ ...current, atmosphere: event.target.value }))
										}
										placeholder="Quiet, haunted, and reflective"
										className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
									/>
								</div>

								<button
									type="submit"
									disabled={!canSubmit || isGeneratingEpisode}
									className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
								>
									{isGeneratingEpisode ? "Generating Story Context..." : "Generate Episode Package"}
								</button>
							</div>
						</form>
					</div>
				</section>

				<section className="rounded-[2rem] border border-white/10 bg-slate-950/50 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.28)] backdrop-blur-xl">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/80">Result</p>
							<h2 className="mt-2 text-2xl font-semibold text-white">Package Review</h2>
						</div>
						<p className="max-w-md text-right text-sm leading-6 text-slate-300">
							Each package gets an LLM-generated story context that is prepended to every image prompt (thumbnail + scene images) so the panels stay consistent.
						</p>
					</div>

					<div className="mt-6">
						{episodeError ? (
							<p className="mb-4 rounded-2xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
								{episodeError}
							</p>
						) : null}
						{result ? (
							formatResult(result)
						) : (
							<div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center text-slate-300">
								<p className="text-lg font-medium text-slate-100">Your episode package will appear here.</p>
								<p className="mt-2 text-sm">Fill in the three inputs above and generate the first Phase 1 episode.</p>
								<p className="mt-2 text-xs uppercase tracking-[0.18em] text-cyan-100/70">
									Planning-only scope: no accounts, persistence, publishing, image generation, or voice generation.
								</p>
							</div>
						)}
					</div>

					<div className="mt-8 grid gap-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5 md:grid-cols-[1fr_auto]">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
								Phase 2 Asset Generation
							</p>
							<p className="mt-2 text-sm text-slate-200">
								Generate image assets from the current EpisodePackage or retrieve previous records by normalized key.
							</p>
							<div className="mt-4 flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={handleGenerateAssets}
									disabled={isGeneratingAssets || !result || result.status !== "complete"}
									className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
								>
									{isGeneratingAssets ? "Generating Images..." : "Generate Image Assets"}
								</button>

								<input
									value={retrievalKey}
									onChange={(event) => setRetrievalKey(event.target.value)}
									placeholder="normalized-key"
									className="min-w-56 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
								/>
								<button
									type="button"
									onClick={handleRetrieveAssets}
									disabled={isRetrievingAssets}
									className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
								>
									{isRetrievingAssets ? "Loading..." : "Retrieve Assets"}
								</button>
							</div>
						</div>

						{assetGenerationResult ? (
							<div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-200">
								<p>
									<b>Request:</b> {assetGenerationResult.requestId}
								</p>
								<p>
									<b>Status:</b> {assetGenerationResult.status}
								</p>
								<p>
									<b>Succeeded:</b> {assetGenerationResult.succeededCount}
								</p>
								<p>
									<b>Failed:</b> {assetGenerationResult.failedCount}
								</p>
								<p>
									<b>Normalized Key:</b> {assetGenerationResult.normalizedKey}
								</p>
							</div>
						) : (
							<div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-xs text-slate-300">
								Asset status will appear here after generation.
							</div>
						)}
					</div>

					{assetError ? (
						<p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
							{assetError}
						</p>
					) : null}

					{assetGenerationResult ? (
						<div className="mt-6">
							<ResultPanel title="Generation Asset Records">
								{formatAssets(assetGenerationResult.assets)}
							</ResultPanel>
						</div>
					) : null}

					{retrievalResult ? (
						<div className="mt-6 space-y-4">
							<ResultPanel title="Retrieved Asset Records">
								<div className="space-y-3 text-xs text-slate-200">
									<p>
										<b>Normalized Key:</b> {retrievalResult.normalizedKey}
									</p>
									<p>
										<b>Total:</b> {retrievalResult.totals.total} | <b>Success:</b>{" "}
										{retrievalResult.totals.success} | <b>Failure:</b>{" "}
										{retrievalResult.totals.failure}
									</p>
								</div>
								{formatAssets(retrievalResult.assets)}
							</ResultPanel>
						</div>
					) : null}
				</section>
			</div>
		</main>
	);
}