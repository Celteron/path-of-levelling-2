import { BrowserWindow } from 'electron';
import { LogWatcherService } from './LogWatcherService.js';
import { OverlayPosition, UiSettings } from '../zodSchemas/schemas.js';
import { objectFactory } from '../objectFactory.js';

export class SettingsService {

	constructor() { }

	init() { }
	
	getFontSize(): number {
		return objectFactory.getStoreService().getGlobalSetting('fontSize') 
	}

	saveFontSize(fontSize: number) {
		objectFactory.getStoreService().setGlobalSetting('fontSize', fontSize);
	}

	getClientTxtPath(): string {
		return objectFactory.getStoreService().getGameSetting('clientTxtPath');
	}

	saveClientTxtPath(
		newPath: string,
		mainWindow: BrowserWindow,
		logWatcher: LogWatcherService
	): boolean {
		// Saving the same path again keeps the watcher: a restart skips the lines written since
		// its last poll
		const unchanged = newPath === this.getClientTxtPath() && objectFactory.getStateTracker().logWatcherActive;
		if (unchanged) return true;

		objectFactory.getStoreService().setGameSetting('clientTxtPath', newPath);

		// Also restart a running watcher, it still watches the previous file
		logWatcher.watchClientTxt(mainWindow);

		//Return the result
		return objectFactory.getStateTracker().logWatcherActive;
	}

	getBuildName(): string {
		return objectFactory.getStoreService().getGameSetting('buildName');
	}

	saveBuildName(buildName: string) {
		objectFactory.getStoreService().setGameSetting('buildName', buildName);
	}

	getSettingsOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting('uiSettings').settingsOverlayPosition;
	}

	saveSettingsOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting('uiSettings.settingsOverlayPosition', newSettings);
	}

	getZoneOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting('uiSettings.zoneTrackerPosition');
	}

	saveZoneOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting('uiSettings.zoneTrackerPosition', newSettings);
	}

	getLayoutImagesOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting('uiSettings.layoutImagesTrackerPosition');
	}

	saveLayoutImagesOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting('uiSettings.layoutImagesTrackerPosition', newSettings);
	}

	getLevelOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting('uiSettings.levelTrackerPosition');
	}

	saveLevelOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting('uiSettings.levelTrackerPosition', newSettings);
	}

	getGemOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting('uiSettings.gemTrackerPosition');
	}

	saveGemOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting('uiSettings.gemTrackerPosition', newSettings);
	}
}
