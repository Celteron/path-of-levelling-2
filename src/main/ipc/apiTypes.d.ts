// Ambient (global) types: preload.cts is a CommonJS script that cannot import TypeScript modules,
// so preload, main and renderer all reach the IPC types through this declaration file.

/** Mapping from channel name to return type sent from Main->Renderer */
type channelReturnTypeMapping = {
	// --- SETTINGS --- //
	// Position Settings
	getSettingsOverlayPositionSettings: OverlayPosition;
	saveSettingsOverlayPositionSettings: void;
	getZoneOverlayPositionSettings: OverlayPosition;
	saveZoneOverlayPositionSettings: void;
	getLayoutImagesOverlayPositionSettings: OverlayPosition;
	saveLayoutImagesOverlayPositionSettings: void;
	getLevelOverlayPositionSettings: OverlayPosition;
	saveLevelOverlayPositionSettings: void;
	getGemOverlayPositionSettings: OverlayPosition;
	saveGemOverlayPositionSettings: void;

	getFontScalingFactor: number;
	getFontSize: number;
	saveFontSize: number;
	getOverlayOpacity: number;
	getTrackerVisibility: TrackerVisibility;
	saveOverlayOpacity: void;
	getCampaignRunsFolder: string;
	saveCampaignRunsFolder: string;
	getHotkeys: HotkeysDto;
	saveHotkey: HotkeysDto;
	postHotkeysPaused: void;

	getClientPath: string;
	saveClientPath: boolean;
	getIsClientWatcherActive: boolean;

	Hotkeys: HotkeyEvent;

	// Gem Settings
	getGemSettingsState: GemSettingsDto;
	postBuildSelected: GemSettingsDto;
	postAddNewBuild: GemSettingsDto;
	postDeleteBuild: GemSettingsDto;
	saveGemSetupsForBuild: GemSettingsDto;
	postImportPob: PobImportResultDto;

	// Act Notes Settings
	getActNotesSettingsState: ActNotesSettingsDto;
	saveActNotesForBuild: ActNotesSettingsDto;
	postCopyActNotesFromBuild: ActNotesSettingsDto;
	postResetActNoteForAct: ActNote; // Send back the default Act Note, DON'T reset the whole screen
	postBuildSelectedFromActNotes: ActNotesSettingsDto;
	postAddNewBuildFromActNotes: ActNotesSettingsDto;
	postDeleteBuildFromActNotes: ActNotesSettingsDto;

	// Zone Notes Settings
	getZoneNotesSettingsState: ZoneNotesSettingsDto;
	saveZoneNotesForBuild: ZoneNotesSettingsDto;
	postCopyZoneNotesFromBuild: ZoneNotesSettingsDto;
	postResetZoneNoteForZone: ZoneNote; // Send back the default Zone Note, DON'T reset the whole screen
	postBuildSelectedFromZoneNotes: ZoneNotesSettingsDto;
	postAddNewBuildFromZoneNotes: ZoneNotesSettingsDto;
	postDeleteBuildFromZoneNotes: ZoneNotesSettingsDto;

	// --- TRACKERS --- //
	// Zone Tracker
	zoneUpdatesFromLog: ZoneDataDto;
	getZoneState: ZoneDataDto;
	postActSelected: ZoneDataDto;
	postZoneSelected: ZoneDataDto;
	saveNoteFromOverlay: ZoneDataDto;

	zoneLayoutImageUpdates: string[];
	getLayoutImagePaths: string[];

	// Level Tracker
	subscribeToLevelUpdates: LevelDataDto;

	// Login/character select vs. game world
	gameWorldUpdates: boolean;
	getInGameWorld: boolean;

	// Campaign timer
	timerUpdates: TimerDto;
	getTimerState: TimerDto;
	postTimerToggle: TimerDto;
	postTimerReset: TimerDto;

	// Leveling Guide
	guideUpdates: GuideDataDto;
	getGuideState: GuideDataDto;
	postGuideStep: GuideDataDto;
	postGuideReset: GuideDataDto;
	saveGuidePrefs: GuideDataDto;
	getGuideOverlayPositionSettings: OverlayPosition;
	saveGuideOverlayPositionSettings: void;
	getLevelState: LevelDataDto;

	// Gem Tracker
	subscribeToGemUpdates: GemDataDto;
	getGemState: GemDataDto;
	postGemLevelSelected: GemDataDto;
};

/** Mapping from channel name to request type sent from Renderer->Main */
type channelRequestTypeMapping = {
	// --- SETTINGS --- //
	// Position Settings
	saveSettingsOverlayPositionSettings: OverlayPosition;
	saveZoneOverlayPositionSettings: OverlayPosition;
	saveLayoutImagesOverlayPositionSettings: OverlayPosition;
	saveLevelOverlayPositionSettings: OverlayPosition;
	saveGemOverlayPositionSettings: OverlayPosition;

	saveFontSize: number;
	saveOverlayOpacity: number;
	saveCampaignRunsFolder: string;
	saveHotkey: SaveHotkeyRequest;
	postHotkeysPaused: boolean;

	saveClientPath: string;

	postBuildSelected: string;
	postAddNewBuild: string;
	postDeleteBuild: string;
	saveGemSetupsForBuild: SaveGemSetupsRequest;
	postImportPob: string; // PoB export code or pobb.in/pastebin link

	postBuildSelectedFromActNotes: string;
	saveActNotesForBuild: SaveActNotesRequest;
	postCopyActNotesFromBuild: CopyActNotesFromBuildRequest;
	postResetActNoteForAct: string;
	postAddNewBuildFromActNotes: string;
	postDeleteBuildFromActNotes: string;

	postBuildSelectedFromZoneNotes: string;
	saveZoneNotesForBuild: SaveZoneNotesRequest;
	postCopyZoneNotesFromBuild: CopyZoneNotesFromBuildRequest;
	postResetZoneNoteForZone: string;
	postAddNewBuildFromZoneNotes: string;
	postDeleteBuildFromZoneNotes: string;

	// --- TRACKERS --- //
	// Zone Tracker
	postZoneSelected: ZoneSelectedRequest;
	saveNoteFromOverlay: SaveNoteRequest;
	postActSelected: string;

	// Gem Tracker
	postGemLevelSelected: number;

	// Leveling Guide
	postGuideStep: 1 | -1;
	saveGuidePrefs: GuidePrefsRequest;
	saveGuideOverlayPositionSettings: OverlayPosition;
};

// --- Settings --- //
type TrackerVisibility = import("../trackers/trackerVisibility.js").TrackerVisibility;

type HotkeysDto = {
	hotkeys: import("../hotkeys.js").Hotkeys;
	/** Actions whose hotkey another app already holds */
	failed: import("../hotkeys.js").HotkeyAction[];
	/** Why the last change was refused */
	error?: string;
};

type SaveHotkeyRequest = { action: import("../hotkeys.js").HotkeyAction; accelerator: string };

type HotkeyEvent = {
	hotkey:
		| "ToggleSettings"
		| "ToggleZoneNotes"
		| "ToggleLayoutImages"
		| "ToggleLevelTracker"
		| "ToggleGemTracker"
		| "ToggleGuide";
	value: boolean;
};

type SaveGemSetupsRequest = {
	buildName: string;
	allGemSetups: GemSetup[];
};

type GemSettingsDto = {
	buildName: string;
	allBuildNames: string[];
	allGemSetupLevels: number[];
	allGemSetups: GemSetup[];
};

type SaveActNotesRequest = {
	buildName: string;
	allActNotes: ActNote[];
};

type CopyActNotesFromBuildRequest = {
	buildName: string;
	buildToCopyName: string;
};

// Mirrors PobImportResult in src/main/pob/pobImport.ts
type PobImportResultDto =
	{ ok: true; gemSetups: GemSetup[] } | { ok: false; error: "invalidInput" | "downloadFailed" | "noPoe2Gems" };

type ActNotesSettingsDto = {
	buildName: string;
	allBuildNames: string[];
	allActNotes: ActNote[];
};

type SaveZoneNotesRequest = {
	buildName: string;
	allZoneNotes: ZoneNote[];
};

type CopyZoneNotesFromBuildRequest = {
	buildName: string;
	buildToCopyName: string;
};

type ZoneNotesSettingsDto = {
	buildName: string;
	allBuildNames: string[];
	allZoneNotes: ZoneNote[];
};

// --- Trackers --- //
/** A note edited in the overlay, for the act or zone it was written for */
type SaveNoteRequest =
	{ kind: "act"; actName: string; notes: string } | { kind: "zone"; zoneCode: string; notes: string };

type ZoneSelectedRequest = {
	zoneSelected: string;
	actSelected: string;
};

type ZoneDataDto = {
	act: string;
	zone: string;
	zoneCode: string;
	allActs: string[];
	allZonesInAct: string[];
	actNotes: string;
	zoneNotes: string;
	/** The zone note is the shipped tip, which the leveling guide already covers */
	zoneNotesCoveredByGuide: boolean;
};

type LevelDataDto = {
	playerLevel: number;
	monsterLevel: number;
	expMulti: number;
	/** Recommended character level for the current zone, from the leveling guide */
	recommendedLevel?: import("../zodSchemas/schemas.js").RecommendedLevel;
	/** Character level against recommendedLevel */
	levelStatus?: import("../levelingGuide.js").LevelStatus;
};

type GuideDataDto = import("../trackers/GuideTracker.js").GuideDto;
type GuidePrefsRequest = import("../levelingGuide.js").GuidePrefs;

type GemDataDto = {
	allGemSetupLevels: number[];
	gemSetupLevel: number;
	gemLinks: string[];
};

/** Campaign timer; the current act's time is acts' last ms plus the time since runningSince */
type TimerDto = {
	acts: { act: string; ms: number }[];
	/** Date.now() at the start of the running interval; null while not counting */
	runningSince: number | null;
	paused: boolean;
	finished: boolean;
	/** Best time per act over the finished runs */
	bests: Record<string, number>;
};
