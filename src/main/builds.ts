import { WebContents } from "electron";
import { objectFactory } from "./objectFactory.js";
import { ipcWebContentsSend } from "./ipc/ipcWrappers.js";

/** Makes buildName the current build and loads its gem setups and its act and zone notes */
export function activateBuild(buildName: string) {
	objectFactory.getSettingsService().saveBuildName(buildName);

	const gemTracker = objectFactory.getGemTracker();
	gemTracker.loadGemSetup(buildName);
	gemTracker.setGemSetupFromPlayerLevel(objectFactory.getLevelTracker().playerLevel);

	const zoneTracker = objectFactory.getZoneTracker();
	zoneTracker.loadActNotes();
	zoneTracker.loadZoneNotes();
}

/** Creates an empty build and makes it the current build */
export function createBuild(buildName: string) {
	objectFactory.getGemTracker().saveNewBuild(buildName);
	activateBuild(buildName);
}

/** Makes buildName the current build unless it already is, keeping a gem setup picked by hand */
export function useBuild(buildName: string) {
	if (buildName !== objectFactory.getSettingsService().getBuildName()) activateBuild(buildName);
}

/** Deletes a build and goes back to the Default build, which every other build falls back to */
export function removeBuild(buildName: string) {
	if (buildName === "Default") return;
	objectFactory.getGemTracker().deleteBuild(buildName);
	activateBuild("Default");
}

/** Sends the overlay panels that depend on the build (gems, act and zone notes) their new state */
export function sendBuildState(webContents: WebContents) {
	ipcWebContentsSend("subscribeToGemUpdates", webContents, objectFactory.getGemTracker().getGemDataDto());
	ipcWebContentsSend("zoneUpdatesFromLog", webContents, objectFactory.getZoneTracker().getZoneDataDto());
}
