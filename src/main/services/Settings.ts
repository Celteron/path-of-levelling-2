import { app, BrowserWindow } from "electron";
import path from "path";
import { LogWatcherService } from "./LogWatcherService.js";
import { OverlayPosition, readOverlayOpacity } from "../zodSchemas/schemas.js";
import { objectFactory } from "../objectFactory.js";
import {
	DEFAULT_HOTKEYS,
	effectiveHotkeys,
	HOTKEY_ACTIONS,
	HOTKEY_LABELS,
	HOTKEY_RULE,
	HotkeyAction,
	Hotkeys,
	isValidAccelerator,
} from "../hotkeys.js";

export class SettingsService {
	constructor() {}

	init() {}

	getFontSize(): number {
		return objectFactory.getStoreService().getGlobalSetting("fontSize");
	}

	saveFontSize(fontSize: number) {
		objectFactory.getStoreService().setGlobalSetting("fontSize", fontSize);
	}

	getOverlayOpacity(): number {
		return readOverlayOpacity(objectFactory.getStoreService().getGlobalSetting("overlayOpacity"));
	}

	saveOverlayOpacity(overlayOpacity: number) {
		objectFactory.getStoreService().setGlobalSetting("overlayOpacity", overlayOpacity);
	}

	getCampaignRunsFolder(): string {
		const folder = objectFactory.getStoreService().getGlobalSetting("campaignRunsFolder");
		return folder || path.join(app.getPath("documents"), "PoL2");
	}

	/** Saves an absolute folder, or the default for an empty one; anything else keeps the folder */
	saveCampaignRunsFolder(folder: unknown): string {
		const trimmed = typeof folder === "string" ? folder.trim() : undefined;
		if (trimmed === "" || (trimmed && path.isAbsolute(trimmed))) {
			objectFactory.getStoreService().setGlobalSetting("campaignRunsFolder", trimmed);
		}
		return this.getCampaignRunsFolder();
	}

	getHotkeys(): Hotkeys {
		return effectiveHotkeys(objectFactory.getStoreService().getGlobalSetting("hotkeys"));
	}

	/** Saves a hotkey; returns why it was refused, or undefined. Only changed hotkeys are stored. */
	saveHotkey(action: HotkeyAction, accelerator: unknown): string | undefined {
		if (!HOTKEY_ACTIONS.includes(action)) return "Unknown action";
		if (!isValidAccelerator(accelerator)) return HOTKEY_RULE;
		const hotkeys = this.getHotkeys();
		const usedBy = HOTKEY_ACTIONS.find(
			(other) => other !== action && hotkeys[other].toLowerCase() === accelerator.toLowerCase(),
		);
		if (usedBy) return `Already used for: ${HOTKEY_LABELS[usedBy]}`;

		const changed = Object.fromEntries(
			HOTKEY_ACTIONS.map((a) => [a, a === action ? accelerator : hotkeys[a]] as const).filter(
				([a, value]) => value !== DEFAULT_HOTKEYS[a],
			),
		);
		objectFactory.getStoreService().setGlobalSetting("hotkeys", changed);
		return undefined;
	}

	getClientTxtPath(): string {
		return objectFactory.getStoreService().getGameSetting("clientTxtPath");
	}

	saveClientTxtPath(newPath: string, mainWindow: BrowserWindow, logWatcher: LogWatcherService): boolean {
		const unchanged = newPath === this.getClientTxtPath() && objectFactory.getStateTracker().logWatcherActive;
		if (unchanged) return true; // a restart would skip the lines written since the last poll

		objectFactory.getStoreService().setGameSetting("clientTxtPath", newPath);
		// Also restart a running watcher: it still watches the previous file
		logWatcher.watchClientTxt(mainWindow);

		return objectFactory.getStateTracker().logWatcherActive;
	}

	getBuildName(): string {
		return objectFactory.getStoreService().getGameSetting("buildName");
	}

	saveBuildName(buildName: string) {
		objectFactory.getStoreService().setGameSetting("buildName", buildName);
	}

	getSettingsOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting("uiSettings").settingsOverlayPosition;
	}

	saveSettingsOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting("uiSettings.settingsOverlayPosition", newSettings);
	}

	getZoneOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting("uiSettings.zoneTrackerPosition");
	}

	saveZoneOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting("uiSettings.zoneTrackerPosition", newSettings);
	}

	getLayoutImagesOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting("uiSettings.layoutImagesTrackerPosition");
	}

	saveLayoutImagesOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting("uiSettings.layoutImagesTrackerPosition", newSettings);
	}

	getLevelOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting("uiSettings.levelTrackerPosition");
	}

	saveLevelOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting("uiSettings.levelTrackerPosition", newSettings);
	}

	getGemOverlayPositionSettings(): OverlayPosition {
		return objectFactory.getStoreService().getGameSetting("uiSettings.gemTrackerPosition");
	}

	saveGemOverlayPositionSettings(newSettings: OverlayPosition) {
		objectFactory.getStoreService().setGameSetting("uiSettings.gemTrackerPosition", newSettings);
	}
}
