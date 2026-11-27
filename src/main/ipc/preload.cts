/// <reference path="./apiTypes.d.ts" />
const electron = require("electron");

// The preload script cannot import modules, so its typed IPC wrappers live here instead of in
// ipcWrappers.ts.
// The Window interface gives type safety in Renderer; channelReturnTypeMapping and
// channelRequestTypeMapping gives type safety in Main, these ipcWrappers throw errors when the
// type mappings and the Window interface don't line up. This ensures the type hints on either side
// actually match each other

/** Type safe wrapper for get requests from Renderer->Main */
function ipcRendererInvokeGet<K extends keyof channelReturnTypeMapping>(
	channel: K,
): Promise<channelReturnTypeMapping[K]> {
	return electron.ipcRenderer.invoke(channel as string);
}

/** Type safe wrapper for get requests from Renderer->Main which expect a response */
function ipcRendererInvokePost<K extends keyof channelReturnTypeMapping>(
	channel: K,
	request: K extends keyof channelRequestTypeMapping ? channelRequestTypeMapping[K] : undefined,
): Promise<channelReturnTypeMapping[K]> {
	return electron.ipcRenderer.invoke(channel as string, request as any);
}

/** Subscribes to a main->renderer channel and returns the matching unsubscribe function */
function ipcRendererOn<K extends keyof channelReturnTypeMapping>(
	channel: K,
	callback: (event: Electron.IpcRendererEvent, payload: channelReturnTypeMapping[K]) => void,
): () => void {
	electron.ipcRenderer.on(channel, callback);
	return () => {
		electron.ipcRenderer.removeListener(channel, callback);
	};
}

electron.contextBridge.exposeInMainWorld("electron", {
	// Settings
	subscribeToHotkeys: (callback) => {
		return ipcRendererOn("Hotkeys", (_, args: HotkeyEvent) => {
			callback(args);
		});
	},
	getFontSize: async () => ipcRendererInvokeGet("getFontSize"),
	saveFontSize: async (fontSize: number) => ipcRendererInvokePost("saveFontSize", fontSize),
	getOverlayOpacity: async () => ipcRendererInvokeGet("getOverlayOpacity"),
	saveOverlayOpacity: async (overlayOpacity: number) => ipcRendererInvokePost("saveOverlayOpacity", overlayOpacity),

	getIsClientWatcherActive: async () => ipcRendererInvokeGet("getIsClientWatcherActive"),
	getClientPath: async () => ipcRendererInvokeGet("getClientPath"),
	saveClientPath: async (clientTxtPath: string) => ipcRendererInvokePost("saveClientPath", clientTxtPath),

	// Position Settings
	getFontScalingFactor: async () => ipcRendererInvokeGet("getFontScalingFactor"),
	getSettingsOverlayPositionSettings: async () => ipcRendererInvokeGet("getSettingsOverlayPositionSettings"),
	saveSettingsOverlayPositionSettings: async (settingsOverlaySettings) =>
		ipcRendererInvokePost("saveSettingsOverlayPositionSettings", settingsOverlaySettings),

	getZoneOverlayPositionSettings: async () => ipcRendererInvokeGet("getZoneOverlayPositionSettings"),
	saveZoneOverlayPositionSettings: async (zoneSettings) =>
		ipcRendererInvokePost("saveZoneOverlayPositionSettings", zoneSettings),

	getLayoutImagesOverlayPositionSettings: async () => ipcRendererInvokeGet("getLayoutImagesOverlayPositionSettings"),
	saveLayoutImagesOverlayPositionSettings: async (layoutImagesSettings) =>
		ipcRendererInvokePost("saveLayoutImagesOverlayPositionSettings", layoutImagesSettings),

	getLevelOverlayPositionSettings: async () => ipcRendererInvokeGet("getLevelOverlayPositionSettings"),
	saveLevelOverlayPositionSettings: async (levelSettings) =>
		ipcRendererInvokePost("saveLevelOverlayPositionSettings", levelSettings),

	getGemOverlayPositionSettings: async () => ipcRendererInvokeGet("getGemOverlayPositionSettings"),
	saveGemOverlayPositionSettings: async (gemSettings) =>
		ipcRendererInvokePost("saveGemOverlayPositionSettings", gemSettings),

	// Methods for the zone tracker
	subscribeToZoneNotesUpdates: (callback) => {
		return ipcRendererOn("zoneUpdatesFromLog", (_, args) => {
			callback(args);
		});
	},
	getZoneState: async () => ipcRendererInvokeGet("getZoneState"),
	postActSelected: async (actSelected: string) => ipcRendererInvokePost("postActSelected", actSelected),
	postZoneSelected: async (zoneSelectedRequest) => ipcRendererInvokePost("postZoneSelected", zoneSelectedRequest),

	subscribeToZoneLayoutImageUpdates: (callback) => {
		return ipcRendererOn("zoneLayoutImageUpdates", (_, args) => {
			callback(args);
		});
	},
	getLayoutImagePaths: async () => ipcRendererInvokeGet("getLayoutImagePaths"),

	// Login/character select vs. game world
	subscribeToGameWorldUpdates: (callback) =>
		ipcRendererOn("gameWorldUpdates", (_, inGameWorld) => callback(inGameWorld)),
	getInGameWorld: async () => ipcRendererInvokeGet("getInGameWorld"),

	// Campaign timer
	subscribeToTimerUpdates: (callback) => ipcRendererOn("timerUpdates", (_, timer) => callback(timer)),
	getTimerState: async () => ipcRendererInvokeGet("getTimerState"),
	postTimerToggle: async () => ipcRendererInvokeGet("postTimerToggle"),
	postTimerReset: async () => ipcRendererInvokeGet("postTimerReset"),

	// Leveling guide
	subscribeToGuideUpdates: (callback) => ipcRendererOn("guideUpdates", (_, guide) => callback(guide)),
	getGuideState: async () => ipcRendererInvokeGet("getGuideState"),
	postGuideStep: async (delta: 1 | -1) => ipcRendererInvokePost("postGuideStep", delta),
	postGuideReset: async () => ipcRendererInvokeGet("postGuideReset"),
	saveGuidePrefs: async (prefs: GuidePrefsRequest) => ipcRendererInvokePost("saveGuidePrefs", prefs),
	getGuideOverlayPositionSettings: async () => ipcRendererInvokeGet("getGuideOverlayPositionSettings"),
	saveGuideOverlayPositionSettings: async (guideSettings) =>
		ipcRendererInvokePost("saveGuideOverlayPositionSettings", guideSettings),

	// Methods for the level tracker
	subscribeToLevelUpdates: (callback) => {
		return ipcRendererOn("subscribeToLevelUpdates", (_, args) => {
			callback(args);
		});
	},
	getLevelState: async () => ipcRendererInvokeGet("getLevelState"),

	// Methods for the gem TRACKER
	subscribeToGemUpdates: (callback) => {
		return ipcRendererOn("subscribeToGemUpdates", (_, args) => {
			callback(args);
		});
	},
	getGemState: async () => ipcRendererInvokeGet("getGemState"),
	postGemLevelSelected: async (gemLevelSelected) => ipcRendererInvokePost("postGemLevelSelected", gemLevelSelected),

	// Methods for the gem SETTINGS
	getGemSettingsState: async () => ipcRendererInvokeGet("getGemSettingsState"),
	postBuildSelected: async (buildName) => ipcRendererInvokePost("postBuildSelected", buildName),
	postAddNewBuild: async (buildName) => ipcRendererInvokePost("postAddNewBuild", buildName),
	postDeleteBuild: async (buildName) => ipcRendererInvokePost("postDeleteBuild", buildName),
	saveGemSetupsForBuild: async (response) => ipcRendererInvokePost("saveGemSetupsForBuild", response),
	postImportPob: async (input: string) => ipcRendererInvokePost("postImportPob", input),

	// Methods for the act notes SETTINGS
	getActNotesSettingsState: async () => ipcRendererInvokeGet("getActNotesSettingsState"),
	saveActNotesForBuild: async (response) => ipcRendererInvokePost("saveActNotesForBuild", response),
	postCopyActNotesFromBuild: async (response) => ipcRendererInvokePost("postCopyActNotesFromBuild", response),
	postResetActNoteForAct: async (actName) => ipcRendererInvokePost("postResetActNoteForAct", actName),
	postBuildSelectedFromActNotes: async (buildName) =>
		ipcRendererInvokePost("postBuildSelectedFromActNotes", buildName),
	postAddNewBuildFromActNotes: async (buildName) => ipcRendererInvokePost("postAddNewBuildFromActNotes", buildName),
	postDeleteBuildFromActNotes: async (buildName) => ipcRendererInvokePost("postDeleteBuildFromActNotes", buildName),

	// Methods for the zone notes SETTINGS
	getZoneNotesSettingsState: async () => ipcRendererInvokeGet("getZoneNotesSettingsState"),
	saveZoneNotesForBuild: async (response) => ipcRendererInvokePost("saveZoneNotesForBuild", response),
	postCopyZoneNotesFromBuild: async (response) => ipcRendererInvokePost("postCopyZoneNotesFromBuild", response),
	postResetZoneNoteForZone: async (zoneCode) => ipcRendererInvokePost("postResetZoneNoteForZone", zoneCode),
	postBuildSelectedFromZoneNotes: async (buildName) =>
		ipcRendererInvokePost("postBuildSelectedFromZoneNotes", buildName),
	postAddNewBuildFromZoneNotes: async (buildName) => ipcRendererInvokePost("postAddNewBuildFromZoneNotes", buildName),
	postDeleteBuildFromZoneNotes: async (buildName) => ipcRendererInvokePost("postDeleteBuildFromZoneNotes", buildName),
} satisfies Window["electron"]);
