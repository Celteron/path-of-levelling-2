import { inflateSync } from "zlib";
import type { GemSetup } from "../zodSchemas/schemas.js";

// Pure Path of Building import without Electron imports, so it can be unit tested.
// PoB's XML is flat and machine-written, so a few regexes are enough and avoid an XML dependency.

/** Decodes a PoB export code (URL-safe base64 of zlib-deflated XML). Undefined if invalid. */
export function decodePobCode(code: string): string | undefined {
	const base64 = code.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
	if (!base64) return undefined;

	try {
		return inflateSync(Buffer.from(base64, "base64")).toString("utf-8");
	} catch {
		return undefined;
	}
}

/**
 * Turns the skill sets of a PoE2 PoB build into PoL2 gem setups: one setup per skill set, one
 * "Active - Support - Support" link per socket group. Guides usually name skill sets after the
 * level they apply from ("Level 12-24", "Act 2 (lvl 16+)"), see levelFromTitle.
 * Returns undefined if the XML is not a PoE2 build or contains no gems.
 */
export function gemSetupsFromPobXml(xml: string): GemSetup[] | undefined {
	if (!xml.includes("<PathOfBuilding2>")) return undefined;

	const skillSets = Array.from(xml.matchAll(/<SkillSet\b([^>]*)>([\s\S]*?)<\/SkillSet>/g));
	let previousLevel = 0;

	const gemSetups = skillSets
		.map(([, attributes, body]) => {
			const level = levelFromTitle(readAttributes(attributes).title ?? "") ?? previousLevel + 1;
			previousLevel = level;
			return { level, gemLinks: gemLinksFromSkillSet(body), gemSources: [] };
		})
		.filter((gemSetup) => gemSetup.gemLinks.length > 0)
		.sort((a, b) => a.level - b.level);

	return gemSetups.length > 0 ? gemSetups : undefined;
}

/** The number after "level"/"lvl"/"lv", else the first number of the title */
function levelFromTitle(title: string): number | undefined {
	const match = title.match(/\b(?:level|lvl|lv)\.?\s*(\d+)/i) ?? title.match(/\d+/);
	return match ? parseInt(match[1] ?? match[0]) : undefined;
}

function gemLinksFromSkillSet(skillSetBody: string): string[] {
	return Array.from(skillSetBody.matchAll(/<Skill\b([^>]*)>([\s\S]*?)<\/Skill>/g))
		.filter(([, attributes]) => readAttributes(attributes).enabled !== "false")
		.map(([, , skillBody]) => {
			const gems = Array.from(skillBody.matchAll(/<Gem\b([^>]*?)\/?>/g))
				.map(([, attributes]) => readAttributes(attributes))
				.filter((gem) => gem.enabled !== "false" && gem.nameSpec);
			// Active gem first, then its supports, regardless of the order in PoB. Support ids are
			// "Metadata/Items/Gems/Support…" (mostly SupportGem…, a few special ones like SupportOlrot…)
			const isSupport = (gem: Record<string, string>) => /\/Support/i.test(gem.gemId ?? "");
			return [...gems.filter((gem) => !isSupport(gem)), ...gems.filter(isSupport)]
				.map((gem) => gem.nameSpec)
				.join(" - ");
		})
		.filter((gemLink) => gemLink.length > 0);
}

const xmlEntities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function readAttributes(attributes: string): Record<string, string> {
	return Object.fromEntries(
		Array.from(attributes.matchAll(/(\w+)="([^"]*)"/g), ([, name, value]) => [
			name,
			value.replace(/&(amp|lt|gt|quot|apos);/g, (_, entity: string) => xmlEntities[entity]),
		])
	);
}

const pasteSites: { pattern: RegExp; rawUrl: (id: string) => string }[] = [
	{ pattern: /^(?:https?:\/\/)?(?:www\.)?pobb\.in\/([\w-]+)\/?$/i, rawUrl: (id) => `https://pobb.in/${id}/raw` },
	{
		pattern: /^(?:https?:\/\/)?(?:www\.)?pastebin\.com\/(?:raw\/)?(\w+)\/?$/i,
		rawUrl: (id) => `https://pastebin.com/raw/${id}`,
	},
];

/** Raw export URL for a pobb.in/pastebin link, undefined for anything else */
export function pobDownloadUrl(input: string): string | undefined {
	const trimmed = input.trim();
	for (const site of pasteSites) {
		const id = trimmed.match(site.pattern)?.[1];
		if (id) return site.rawUrl(id);
	}
	return undefined;
}

export type PobImportResult =
	| { ok: true; gemSetups: GemSetup[] }
	| { ok: false; error: "invalidInput" | "downloadFailed" | "noPoe2Gems" };

/**
 * Imports gem setups from a PoB export code or a pobb.in/pastebin link. The download is injected
 * so the main process decides how to fetch (timeout, user-triggered only) and tests stay offline.
 */
export async function importPob(
	input: string,
	download: (url: string) => Promise<string>
): Promise<PobImportResult> {
	const url = pobDownloadUrl(input);
	let code = input;
	if (url) {
		try {
			code = await download(url);
		} catch {
			return { ok: false, error: "downloadFailed" };
		}
	}

	const xml = decodePobCode(code);
	if (!xml) return { ok: false, error: "invalidInput" };

	const gemSetups = gemSetupsFromPobXml(xml);
	return gemSetups ? { ok: true, gemSetups } : { ok: false, error: "noPoe2Gems" };
}
