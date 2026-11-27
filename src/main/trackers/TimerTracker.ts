import log from "electron-log";
import { objectFactory } from "../objectFactory.js";
import { StoreService } from "../services/StoreService.js";
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
		this.timer = campaignTimer(this.timer, event);
		objectFactory.getStoreService().setGameSetting("campaignTimer", storedCampaignTimer(this.timer));
		log.info("Campaign timer", event.type, this.timer.acts.at(-1), this.timer.pauseReasons);
	}

	/** Pauses or resumes by hand; a timer that has not run yet starts in the act of zoneCode */
	togglePause(at: number, zoneCode: string) {
		const counting = this.timer.runningSince !== null;
		this.apply(
			counting ? { type: "pause", at, reason: "manual" } : { type: "resume", at, reason: "manual", zoneCode },
		);
	}

	getTimerDto(): TimerDto {
		return {
			acts: this.timer.acts,
			runningSince: this.timer.runningSince,
			paused: this.timer.pauseReasons.length > 0,
			finished: this.timer.finished,
		};
	}
}
