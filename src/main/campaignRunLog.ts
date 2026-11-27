import fs from "fs";
import path from "path";
import log from "electron-log";
import { ActTime } from "./campaignTimer.js";

/** A finished campaign run: when it ended (Date.now()) and the time per act */
export type CampaignRun = { finishedAt: number; acts: ActTime[] };

const pad = (n: number) => String(n).padStart(2, "0");

/** Always h:mm:ss, so spreadsheets read every row of the column as a duration */
function hoursMinutesSeconds(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	return `${Math.floor(seconds / 3600)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}

function localDateTime(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** One row per act plus a total row. Act names come from zone codes, so they need no CSV quoting. */
export function campaignRunCsv(run: CampaignRun): string {
	const finished = localDateTime(run.finishedAt);
	const total = run.acts.reduce((sum, act) => sum + act.ms, 0);
	return [...run.acts, { act: "Total", ms: total }]
		.map((act) => `${finished},${act.act},${hoursMinutesSeconds(act.ms)}\n`)
		.join("");
}

/** Appends the run to the CSV file. A failed write is only logged: the run is kept in the store. */
export function appendCampaignRun(file: string, run: CampaignRun) {
	try {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		const header = fs.existsSync(file) ? "" : "Finished,Act,Time\n";
		fs.appendFileSync(file, header + campaignRunCsv(run));
	} catch (error) {
		log.warn("Could not write the campaign run to", file, error);
	}
}

/** Best time per act over the given runs */
export function bestActTimes(runs: CampaignRun[]): Record<string, number> {
	const best: Record<string, number> = {};
	for (const run of runs) {
		for (const { act, ms } of run.acts) best[act] = Math.min(best[act] ?? Infinity, ms);
	}
	return best;
}
