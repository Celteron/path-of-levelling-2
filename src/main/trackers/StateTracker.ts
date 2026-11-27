import { objectFactory } from "../objectFactory.js";

// Session state shared by the main process modules, e.g. which windows are open and whether the log
// watcher runs. saveSessionState persists zone and levels for the next app start.
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

	init() {}

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
