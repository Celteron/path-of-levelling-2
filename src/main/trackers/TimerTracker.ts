import log from "electron-log";
import { objectFactory } from "../objectFactory.js";
import path from "path";
import { StoreService } from "../services/StoreService.js";
import { getProfile } from "../profiles/profiles.js";
import { appendCampaignRun, bestActTimes } from "../campaignRunLog.js";
import {
	CampaignTimer,
	campaignTimer,
	restoreCampaignTimer,
	storedCampaignTimer,
	TimerEvent,
} from "../campaignTimer.js";

/** Holds the campaign timer, stores its settled times and gives the renderer its state */
export class TimerTracker {
	private timer: CampaignTimer;

	constructor(storeService: StoreService) {
		this.timer = restoreCampaignTimer(storeService.getGameSetting("campaignTimer"));
	}

	init() {}

	apply(event: TimerEvent) {
		const wasFinished = this.timer.finished;
		this.timer = campaignTimer(this.timer, event);
		objectFactory.getStoreService().setGameSetting("campaignTimer", storedCampaignTimer(this.timer));
		// Only a zone entry (the endgame town) finishes a run
		if (event.type === "zoneEntered" && this.timer.finished && !wasFinished) this.recordRun(event.at);
		log.info("Campaign timer", event.type, this.timer.acts.at(-1), this.timer.pauseReasons);
	}

	/** Pauses or resumes by hand; a timer that has not run yet starts in the act of zoneCode */
	togglePause(at: number, zoneCode: string) {
		const counting = this.timer.runningSince !== null;
		this.apply(
			counting ? { type: "pause", at, reason: "manual" } : { type: "resume", at, reason: "manual", zoneCode },
		);
	}

	private recordRun(finishedAt: number) {
		const run = { finishedAt, acts: this.timer.acts };
		objectFactory.getStoreService().setGameSetting("campaignRuns", [...this.runs(), run]);
		const folder = objectFactory.getSettingsService().getCampaignRunsFolder();
		appendCampaignRun(path.join(folder, `pol2-campaign-runs-${getProfile().Id}.csv`), run);
	}

	private runs() {
		return objectFactory.getStoreService().getGameSetting("campaignRuns") ?? [];
	}

	getTimerDto(): TimerDto {
		return {
			acts: this.timer.acts,
			runningSince: this.timer.runningSince,
			paused: this.timer.pauseReasons.length > 0,
			finished: this.timer.finished,
			bests: bestActTimes(this.runs()),
		};
	}
}
