// Extend the 'Window' interface to include all the methods that we put in preload.cts,

import { ActNote, ZoneNote, OverlayPosition } from "../zodSchemas/schemas.js";

// so that in react land we can write 'window.electron.someMethod' with type safety.
declare global {
	interface Window {
		electron: {
			// --- SETTINGS --- //
			subscribeToHotkeys: (callback: (hotkeyEvent: HotkeyEvent) => void) => void;
			getFontScalingFactor: () => Promise<number>;
			getFontSize: () => Promise<number>;
			saveFontSize: (fontSize: number) => void;
			getOverlayOpacity: () => Promise<number>;
			saveOverlayOpacity: (overlayOpacity: number) => void;

			// Client.txt tracking
			getIsClientWatcherActive: () => Promise<boolean>;
			getClientPath: () => Promise<string>;
			saveClientPath: (clientTxtPath: string) => Promise<boolean>;

			// Gem Settings
			getGemSettingsState: () => Promise<GemSettingsDto>;
			saveGemSetupsForBuild: (saveGemSetupsDto: SaveGemSetupsRequest) => Promise<GemSettingsDto>;
			postBuildSelected: (buildName: string) => Promise<GemSettingsDto>;
			postAddNewBuild: (buildName: string) => Promise<GemSettingsDto>;
			postDeleteBuild: (buildName: string) => Promise<GemSettingsDto>;
			postImportPob: (input: string) => Promise<PobImportResultDto>;

			// Act Notes Settings
			getActNotesSettingsState: () => Promise<ActNotesSettingsDto>;
			saveActNotesForBuild: (saveActNotesDto: SaveActNotesRequest) => Promise<ActNotesSettingsDto>;
			postCopyActNotesFromBuild: (
				copyActNotesFromBuildRequest: CopyActNotesFromBuildRequest,
			) => Promise<ActNotesSettingsDto>;
			postResetActNoteForAct: (actName: string) => Promise<ActNote>;
			postBuildSelectedFromActNotes: (buildName: string) => Promise<ActNotesSettingsDto>;
			postAddNewBuildFromActNotes: (buildName: string) => Promise<ActNotesSettingsDto>;
			postDeleteBuildFromActNotes: (buildName: string) => Promise<ActNotesSettingsDto>;

			// Zone Notes Settings
			getZoneNotesSettingsState: () => Promise<ZoneNotesSettingsDto>;
			saveZoneNotesForBuild: (saveZoneNotesDto: SaveZoneNotesRequest) => Promise<ZoneNotesSettingsDto>;
			postCopyZoneNotesFromBuild: (
				copyZoneNotesFromBuildRequest: CopyZoneNotesFromBuildRequest,
			) => Promise<ZoneNotesSettingsDto>;
			postResetZoneNoteForZone: (zoneCode: string) => Promise<ZoneNote>;
			postBuildSelectedFromZoneNotes: (buildName: string) => Promise<ZoneNotesSettingsDto>;
			postAddNewBuildFromZoneNotes: (buildName: string) => Promise<ZoneNotesSettingsDto>;
			postDeleteBuildFromZoneNotes: (buildName: string) => Promise<ZoneNotesSettingsDto>;

			// Position Settings
			getSettingsOverlayPositionSettings: () => Promise<OverlayPosition>;
			saveSettingsOverlayPositionSettings: (overlayPosition: OverlayPosition) => void;
			getZoneOverlayPositionSettings: () => Promise<OverlayPosition>;
			saveZoneOverlayPositionSettings: (overlayPosition: OverlayPosition) => void;
			getLayoutImagesOverlayPositionSettings: () => Promise<OverlayPosition>;
			saveLayoutImagesOverlayPositionSettings: (overlayPosition: OverlayPosition) => void;
			getLevelOverlayPositionSettings: () => Promise<OverlayPosition>;
			saveLevelOverlayPositionSettings: (overlayPosition: OverlayPosition) => void;
			getGemOverlayPositionSettings: () => Promise<OverlayPosition>;
			saveGemOverlayPositionSettings: (overlayPosition: OverlayPosition) => void;

			/// --- TRACKERS --- //
			// Zone Tracker
			/** Returns an unsubscribe function */
			subscribeToZoneNotesUpdates: (callback: (zoneDataDto: ZoneDataDto) => void) => () => void;
			getZoneState: () => Promise<ZoneDataDto>;
			postActSelected: (actSelected: string) => Promise<ZoneDataDto>;
			postZoneSelected: (zoneSelectedRequest: ZoneSelectedRequest) => Promise<ZoneDataDto>;

			/** Returns an unsubscribe function */
			subscribeToZoneLayoutImageUpdates: (callback: (paths: string[]) => void) => () => void;
			getLayoutImagePaths: () => Promise<string[]>;

			// Level Tracker
			/** Returns an unsubscribe function */
			subscribeToLevelUpdates: (callback: (levelDataDto: LevelDataDto) => void) => () => void;
			/** Returns an unsubscribe function */
			subscribeToGameWorldUpdates: (callback: (inGameWorld: boolean) => void) => () => void;
			getInGameWorld: () => Promise<boolean>;

			// Leveling guide
			/** Returns an unsubscribe function */
			subscribeToGuideUpdates: (callback: (guideDataDto: GuideDataDto) => void) => () => void;
			getGuideState: () => Promise<GuideDataDto>;
			postGuideStep: (delta: 1 | -1) => Promise<GuideDataDto>;
			postGuideReset: () => Promise<GuideDataDto>;
			saveGuidePrefs: (prefs: GuidePrefsRequest) => Promise<GuideDataDto>;
			getGuideOverlayPositionSettings: () => Promise<OverlayPosition>;
			saveGuideOverlayPositionSettings: (guideSettings: OverlayPosition) => void;
			getLevelState: () => Promise<LevelDataDto>;

			// Gem Tracker
			/** Returns an unsubscribe function */
			subscribeToGemUpdates: (callback: (gemDataDto: GemDataDto) => void) => () => void;
			getGemState: () => Promise<GemDataDto>;
			postGemLevelSelected: (gemLevelSelected: number) => Promise<GemDataDto>;
		};
	}
}
