import {
	GuidePage,
	GuideStep,
	LevelingGuide,
	LevelingGuideZodSchema,
	RecommendedLevel,
} from "./zodSchemas/schemas.js";

// Pure leveling guide logic without Electron imports, so it can be unit tested.
// Page targets and auto-advance follow Exile UI, where the guide data comes from.

export interface GuidePrefs {
	/** League start shows "leaguestart" pages/steps, later runs show "twinkrun" ones */
	leagueStart: boolean;
	showOptional: boolean;
}

/** Validates guide data at the edge; broken data disables the guide instead of crashing */
export function parseLevelingGuide(json: unknown): LevelingGuide | null {
	const result = LevelingGuideZodSchema.safeParse(json);
	return result.success ? result.data : null;
}

function matchesRun(variant: GuidePage["variant"], leagueStart: boolean): boolean {
	return variant === "all" || (variant === "leaguestart") === leagueStart;
}

export function visibleSteps(page: GuidePage, prefs: GuidePrefs): GuideStep[] {
	return page.steps.filter(
		(step) => matchesRun(step.variant, prefs.leagueStart) && (prefs.showOptional || !step.optional)
	);
}

/**
 * The zone that completes a page: the last zone link in its steps (hints excluded). Optional
 * steps count, like in Exile UI, so hiding them does not change where the guide advances.
 */
export function pageTarget(page: GuidePage, leagueStart: boolean): string | null {
	let target: string | null = null;
	for (const step of page.steps) {
		if (!matchesRun(step.variant, leagueStart)) continue;
		for (const segment of step.segments) {
			if (segment.kind === "zone") target = segment.code;
		}
	}
	return target;
}

/** Next/previous page that applies to the run type, clamped to the guide */
export function stepPage(guide: LevelingGuide, pageIndex: number, delta: 1 | -1, leagueStart: boolean): number {
	// delta arrives via IPC; anything else would loop forever or skip pages
	if (delta !== 1 && delta !== -1) return pageIndex;
	for (let index = pageIndex + delta; index >= 0 && index < guide.pages.length; index += delta) {
		if (matchesRun(guide.pages[index].variant, leagueStart)) return index;
	}
	return pageIndex;
}

/** Entering the current page's target zone advances one page, any other zone changes nothing */
export function advanceOnZoneEntered(
	guide: LevelingGuide,
	pageIndex: number,
	zoneCode: string,
	leagueStart: boolean
): number {
	const page = guide.pages[pageIndex];
	if (!page || pageTarget(page, leagueStart) !== zoneCode.toUpperCase()) return pageIndex;
	return stepPage(guide, pageIndex, 1, leagueStart);
}

/**
 * Restores saved progress. The saved target identifies the page even if a guide update shifted
 * the page indices; otherwise the index is clamped. Anything unreadable starts at the beginning.
 */
export function restorePageIndex(guide: LevelingGuide, saved: unknown, leagueStart: boolean): number {
	const lastIndex = Math.max(guide.pages.length - 1, 0);
	const { pageIndex, pageTarget: savedTarget } = (saved ?? {}) as { pageIndex?: unknown; pageTarget?: unknown };
	if (typeof pageIndex !== "number" || !Number.isInteger(pageIndex)) return 0;

	const clamped = Math.min(Math.max(pageIndex, 0), lastIndex);
	if (typeof savedTarget !== "string") return clamped;

	const candidates = guide.pages
		.map((page, index) => ({ index, page, target: pageTarget(page, leagueStart) }))
		.filter((candidate) => candidate.target === savedTarget && matchesRun(candidate.page.variant, leagueStart))
		.sort((a, b) => Math.abs(a.index - pageIndex) - Math.abs(b.index - pageIndex));
	return candidates[0]?.index ?? clamped;
}

export type LevelStatus = "below" | "within" | "above";

/**
 * Where the character level stands against a zone recommendation; "13+" has no upper bound.
 * Undefined while the level is unknown (0 until the log reports a level up).
 */
export function levelStatus(playerLevel: number, recommended: RecommendedLevel): LevelStatus | undefined {
	if (playerLevel <= 0) return undefined;
	if (playerLevel < recommended.min) return "below";
	if (playerLevel > recommended.max && !recommended.label.trim().endsWith("+")) return "above";
	return "within";
}

export function recommendationFor(guide: LevelingGuide, zoneCode: string): RecommendedLevel | undefined {
	return guide.areas[zoneCode.toUpperCase()]?.recommendedLevel;
}

/**
 * The shipped zone tips duplicate what the guide says, so they are left to the guide. Notes the
 * user wrote are always shown, and without a guide (PoE1, broken guide file) all notes are.
 */
export function guideCoversZoneNote(guideAvailable: boolean, zoneNote: string, shippedZoneNote: string | undefined): boolean {
	return guideAvailable && shippedZoneNote !== undefined && zoneNote === shippedZoneNote;
}

/** What the guide overlay shows; steps are already filtered so the renderer stays simple */
export interface GuideView extends GuidePrefs {
	enabled: boolean;
	pageIndex: number;
	pageCount: number;
	actName: string;
	steps: GuideStep[];
	targetZoneName: string | null;
	sourceVersion: string;
}

export function guideView(guide: LevelingGuide | null, pageIndex: number, prefs: GuidePrefs): GuideView {
	const page = guide?.pages[pageIndex];
	if (!guide || !page) {
		return { enabled: false, pageIndex: 0, pageCount: 0, actName: "", steps: [], targetZoneName: null, sourceVersion: "", ...prefs };
	}

	const target = pageTarget(page, prefs.leagueStart);
	return {
		enabled: true,
		pageIndex,
		pageCount: guide.pages.length,
		actName: guide.acts[page.act]?.name ?? "",
		steps: visibleSteps(page, prefs),
		targetZoneName: target ? (guide.areas[target]?.name ?? target) : null,
		sourceVersion: guide.source.version,
		...prefs,
	};
}
