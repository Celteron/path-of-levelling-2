import { StoredCampaignTimer, StoredCampaignTimerZodSchema } from "./zodSchemas/schemas.js";

/**
 * Campaign timer: total time and time per act. An act begins when
 * one of its zones is entered for the first time; going back to an earlier act keeps counting on
 * the latest one. All times come from one clock (Date.now() in the caller).
 */

export type PauseReason = "manual" | "unfocused" | "loginScreen" | "appStart";

export type ActTime = { act: string; ms: number };

export type CampaignTimer = {
	/** Settled time per act in order of first entry; the last one is the current act */
	acts: ActTime[];
	/** Start of the running interval not yet added to the current act; null while not counting */
	runningSince: number | null;
	/** The timer counts only while there is no reason to pause */
	pauseReasons: PauseReason[];
	/** Set on entering the endgame; only a reset starts a new run */
	finished: boolean;
};

export type TimerEvent =
	| { type: "zoneEntered"; at: number; zoneCode: string }
	| { type: "pause"; at: number; reason: PauseReason }
	/** A manual resume of a timer that has not started yet starts it in the act of zoneCode */
	| { type: "resume"; at: number; reason: PauseReason; zoneCode?: string }
	| { type: "reset" };

const ENDGAME_TOWN = "G_ENDGAME_TOWN";
// Entering a zone or resuming by hand proves the player is in the game again
const RESOLVED_BY_PLAYER: readonly PauseReason[] = ["appStart", "loginScreen"];

export const initialCampaignTimer = (): CampaignTimer => ({
	acts: [],
	runningSince: null,
	pauseReasons: [],
	finished: false,
});

/** Act of a zone code: G1_… is Act 1, P2_… Interlude 2, PoE1's 3_1_1 Act 3; undefined otherwise */
export function actOfZone(zoneCode: string): string | undefined {
	const campaign = /^([GP])(\d+)_/i.exec(zoneCode);
	if (campaign) return `${campaign[1].toUpperCase() === "G" ? "Act" : "Interlude"} ${Number(campaign[2])}`;

	const poe1 = /^(\d+)_\d/.exec(zoneCode);
	return poe1 ? `Act ${Number(poe1[1])}` : undefined;
}

/** Stored times after an app start; paused until the player enters a zone */
export function restoreCampaignTimer(stored: unknown): CampaignTimer {
	const parsed = StoredCampaignTimerZodSchema.safeParse(stored);
	return {
		...initialCampaignTimer(),
		...(parsed.success ? parsed.data : {}),
		pauseReasons: ["appStart"],
	};
}

export function storedCampaignTimer(timer: CampaignTimer): StoredCampaignTimer {
	return { acts: timer.acts, finished: timer.finished };
}

export function campaignTimer(timer: CampaignTimer, event: TimerEvent): CampaignTimer {
	if (event.type === "reset") return initialCampaignTimer();

	const next = settle(timer, event.at);
	switch (event.type) {
		case "pause":
			next.pauseReasons = addReason(next.pauseReasons, event.reason);
			break;
		case "resume": {
			const manual = event.reason === "manual";
			next.pauseReasons = next.pauseReasons.filter(
				(reason) => reason !== event.reason && !(manual && RESOLVED_BY_PLAYER.includes(reason)),
			);
			if (manual && next.acts.length === 0 && event.zoneCode) startIn(next, event.zoneCode);
			break;
		}
		case "zoneEntered":
			next.pauseReasons = next.pauseReasons.filter((reason) => !RESOLVED_BY_PLAYER.includes(reason));
			enterZone(next, event.zoneCode);
			break;
	}
	next.runningSince = isCounting(next) ? event.at : null;
	return next;
}

/** Adds the time since runningSince to the current act; never negative if the clock jumps back */
function settle(timer: CampaignTimer, at: number): CampaignTimer {
	const acts = timer.acts.map((act) => ({ ...act }));
	if (timer.runningSince !== null && acts.length > 0) {
		acts[acts.length - 1].ms += Math.max(0, at - timer.runningSince);
	}
	return { ...timer, acts, pauseReasons: [...timer.pauseReasons] };
}

function enterZone(timer: CampaignTimer, zoneCode: string) {
	if (timer.finished) return;
	if (zoneCode.toUpperCase() === ENDGAME_TOWN) {
		if (timer.acts.length > 0) timer.finished = true;
		return;
	}

	const act = actOfZone(zoneCode);
	if (act === undefined) return;
	if (timer.acts.length === 0) {
		// A new run starts on its own only at the beginning of the campaign
		if (act === "Act 1") timer.acts.push({ act, ms: 0 });
	} else if (!timer.acts.some((known) => known.act === act)) {
		timer.acts.push({ act, ms: 0 });
	}
}

function startIn(timer: CampaignTimer, zoneCode: string) {
	const act = actOfZone(zoneCode);
	if (act !== undefined && !timer.finished) timer.acts.push({ act, ms: 0 });
}

function addReason(reasons: PauseReason[], reason: PauseReason) {
	return reasons.includes(reason) ? reasons : [...reasons, reason];
}

function isCounting(timer: CampaignTimer) {
	return timer.acts.length > 0 && !timer.finished && timer.pauseReasons.length === 0;
}
