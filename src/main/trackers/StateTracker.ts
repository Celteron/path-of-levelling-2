import { objectFactory } from "../objectFactory.js";
import type { TrackerVisibility } from "./trackerVisibility.js";

// Session state shared by the main process modules, e.g. which windows are open and whether the log
// watcher runs. saveSessionState persists zone and levels for the next app start; the shown tracker
// windows are saved on every change.
export class StateTracker {
	settingsOpen: boolean = false;
	zoneNotesOpen: boolean = true;
	layoutImagesOpen: boolean = true;
	levelTrackerOpen: boolean = true;
	gemTrackerOpen: boolean = true;
	guideOpen: boolean = true;
	/** false at login/character select; true until Client.txt says otherwise */
	inGameWorld: boolean = true;

	logWatcherActive: boolean = false;

	constructor() {}

	init() {
		Object.assign(this, objectFactory.getStoreService().getGameSetting("trackerVisibility"));
	}

	getTrackerVisibility(): TrackerVisibility {
		const { zoneNotesOpen, layoutImagesOpen, levelTrackerOpen, gemTrackerOpen, guideOpen } = this;
		return { zoneNotesOpen, layoutImagesOpen, levelTrackerOpen, gemTrackerOpen, guideOpen };
	}

	setTrackerVisibility(change: Partial<TrackerVisibility>) {
		Object.assign(this, change);
		objectFactory.getStoreService().setGameSetting("trackerVisibility", this.getTrackerVisibility());
	}

	saveSessionState() {
		objectFactory.getStoreService().setGameSetting("lastSessionState", {
			zoneCode: objectFactory.getZoneTracker().zoneCode,
			playerLevel: objectFactory.getLevelTracker().playerLevel,
			monsterLevel: objectFactory.getLevelTracker().monsterLevel,
		});
	}

	getIsClientWatcherActive(): boolean {
		return this.logWatcherActive;
	}
}
