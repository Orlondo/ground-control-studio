"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { generateEpisodePackage } from "@/lib/episode/generator";
import type { EpisodeGenerationResult } from "@/lib/episode/types";

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

	const canSubmit =
		form.location.trim() !== "" && form.era.trim() !== "" && form.atmosphere.trim() !== "";

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setResult(generateEpisodePackage(form));
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
									disabled={!canSubmit}
									className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
								>
									Generate Episode Package
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
							The output stays text-only and deterministic so you can compare, revise, and plan without extra workflow steps. Scope lock: no auth, database, publishing, image generation, or voice generation.
						</p>
					</div>

					<div className="mt-6">
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
				</section>
			</div>
		</main>
	);
}