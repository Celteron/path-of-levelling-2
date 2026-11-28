import { app, BrowserWindow, globalShortcut, shell, Menu, screen, Tray, nativeImage, net } from "electron";
import log from "electron-log";
import { OVERLAY_WINDOW_OPTS, OverlayController } from "electron-overlay-window";
import electronUpdater, { type AppUpdater } from "electron-updater";
import path from "path";
import { LogWatcherService } from "./services/LogWatcherService.js";
import { getDesktopIconPath, getPreloadPath, getUIPath, isDev } from "./pathResolver.js";
import { externalLink } from "./navigation.js";
import { objectFactory } from "./objectFactory.js";
import { activateBuild, createBuild, removeBuild, sendBuildState, useBuild } from "./builds.js";
import { TimerEvent } from "./campaignTimer.js";
import { getProfile } from "./profiles/profiles.js";
import { ipcMainHandle, ipcWebContentsSend } from "./ipc/ipcWrappers.js";
import { toggleAllTrackers } from "./trackers/trackerVisibility.js";
import { HotkeyAction, registerHotkeys } from "./hotkeys.js";
import { importPob, readPobDownload } from "./pob/pobImport.js";
import { GuidePrefsZodSchema, SaveNoteZodSchema, OverlayOpacityZodSchema } from "./zodSchemas/schemas.js";

// Only allow one instance of the app
if (!app.requestSingleInstanceLock()) {
	log.info("Another instance of the app is already running, quitting this one.");
	// app.quit() is asynchronous: whenReady() below still resolves, so the second instance would run
	// the settings migration and create a window/tray before quitting. exit() stops it immediately.
	app.exit(0);
}

export function getAutoUpdater(): AppUpdater {
	// Using destructuring to access autoUpdater due to the CommonJS module of 'electron-updater'.
	// It is a workaround for ESM compatibility issues, see https://github.com/electron-userland/electron-builder/issues/7976.
	const { autoUpdater } = electronUpdater;
	return autoUpdater;
}

getAutoUpdater().logger = log;
log.transports.file.level = "info";
log.info("App starting...");

// Basically remove the scale factor people use on windows - we only need to scale font size
// not the whole window, so this stops padding etc from taking up the whole screen.
app.commandLine.appendSwitch("high-dpi-support", "1");
app.commandLine.appendSwitch("force-device-scale-factor", "1");

app.whenReady().then(async () => {
	await objectFactory.getMigrationService().MigrateOnStartup();

	setTimeout(
		createWindow,
		process.platform === "linux" ? 1000 : 0, // https://github.com/electron/electron/issues/16809
	);

	// Auto updates
	getAutoUpdater().checkForUpdatesAndNotify();
});

// Check for update on startup
getAutoUpdater().on("update-available", (message) => {
	log.info("Checked for update, received:", message);
});

async function createWindow() {
	// Set up the tray
	const trayImage = nativeImage.createFromPath(getDesktopIconPath());
	if (trayImage.isEmpty()) log.info("Tray image failed to load, tray icon will not display!");

	const tray = new Tray(trayImage);
	tray.setToolTip(`Path Of Levelling 2 v${app.getVersion()}`);
	tray.setContextMenu(
		Menu.buildFromTemplate([
			{
				label: "Switch To PoE1",
				click: () => {
					objectFactory.switchProfile("poe1");
				},
			},
			{
				label: "Switch To PoE2",
				click: () => {
					objectFactory.switchProfile("poe2");
				},
			},
			{
				label: "Quit",
				click: () => {
					app.quit();
				},
			},
		]),
	);

	// Set up main window
	const mainWindow = new BrowserWindow({
		...OVERLAY_WINDOW_OPTS,
		icon: trayImage,
		webPreferences: {
			preload: path.join(getPreloadPath()),
		},
	});

	// Links (e.g. to the documentation) open in the browser, never inside the overlay or in a new
	// app window, which would get the preload API
	const openInBrowser = (url: string) => {
		const link = externalLink(url);
		if (link) shell.openExternal(link);
	};
	mainWindow.webContents.on("will-navigate", (event, url) => {
		event.preventDefault();
		openInBrowser(url);
	});
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		openInBrowser(url);
		return { action: "deny" };
	});

	if (isDev()) {
		mainWindow.loadURL("http://localhost:5123");
		mainWindow.webContents.openDevTools({ mode: "detach", activate: false });
	} else {
		mainWindow.loadFile(path.join(getUIPath()));
	}

	log.info("Attaching to window:", getProfile().windowName);
	OverlayController.attachByTitle(mainWindow, getProfile().windowName);

	// Reads new Client.txt lines, updates the trackers and pushes the new state to the renderer
	objectFactory.getLogWatcherService().watchClientTxt(mainWindow);

	createIPCEventListeners(mainWindow, objectFactory.getLogWatcherService());

	applyHotkeys(mainWindow);

	OverlayController.events.addListener("focus", async () => {
		// When the overlay gains focus, if the user had settings open (i.e. window
		// is interactable), the overlay will be recreated WITHOUT interaction.
		// So, we sleep to wait for window to be created then enable interaction.
		await new Promise((f) => setTimeout(f, 100));
		mainWindow.setIgnoreMouseEvents(!objectFactory.getStateTracker().settingsOpen);
	});

	pauseTimerWhileAway(mainWindow);

	// Uh still unfamiliar with this package so just logging all events
	if (isDev()) LogOverlayEventCalls();
}

function updateTimer(mainWindow: BrowserWindow, event: TimerEvent) {
	objectFactory.getTimerTracker().apply(event);
	ipcWebContentsSend("timerUpdates", mainWindow.webContents, objectFactory.getTimerTracker().getTimerDto());
}

/** Like Exile UI, the campaign timer does not count while the player is in another app */
function pauseTimerWhileAway(mainWindow: BrowserWindow) {
	// The settings take the focus from the game on purpose; that is still playing time
	OverlayController.events.addListener("blur", () => {
		if (!objectFactory.getStateTracker().settingsOpen) {
			updateTimer(mainWindow, { type: "pause", at: Date.now(), reason: "unfocused" });
		}
	});
	OverlayController.events.addListener("focus", () =>
		updateTimer(mainWindow, { type: "resume", at: Date.now(), reason: "unfocused" }),
	);
	// The game was closed
	OverlayController.events.addListener("detach", () =>
		updateTimer(mainWindow, { type: "pause", at: Date.now(), reason: "unfocused" }),
	);
	// Settles and stores the running time; after the next start the timer waits for the player
	app.on("before-quit", () =>
		objectFactory.getTimerTracker().apply({ type: "pause", at: Date.now(), reason: "appStart" }),
	);
}

function createIPCEventListeners(mainWindow: BrowserWindow, logWatcher: LogWatcherService) {
	ipcMainHandle("getFontScalingFactor", async () => {
		const { height } = screen.getPrimaryDisplay().workAreaSize;
		return height / 1080; // return a scaling factor to scale up text with resolution
	});

	ipcMainHandle("getFontSize", async () => {
		return objectFactory.getSettingsService().getFontSize();
	});

	ipcMainHandle("saveFontSize", async (_, fontSize) => {
		objectFactory.getSettingsService().saveFontSize(fontSize);
		return objectFactory.getSettingsService().getFontSize();
	});

	ipcMainHandle("getTrackerVisibility", async () => objectFactory.getStateTracker().getTrackerVisibility());

	ipcMainHandle("getOverlayOpacity", async () => {
		return objectFactory.getSettingsService().getOverlayOpacity();
	});

	ipcMainHandle("saveOverlayOpacity", async (_, overlayOpacity) => {
		const validOpacity = OverlayOpacityZodSchema.safeParse(overlayOpacity);
		if (validOpacity.success) objectFactory.getSettingsService().saveOverlayOpacity(validOpacity.data);
	});

	ipcMainHandle("getHotkeys", async () => hotkeysDto());

	ipcMainHandle("saveHotkey", async (_, request) => {
		const error = objectFactory.getSettingsService().saveHotkey(request?.action, request?.accelerator);
		applyHotkeys(mainWindow);
		return hotkeysDto(error);
	});

	// While a hotkey is recorded in the settings, the global ones must not catch the key presses
	ipcMainHandle("postHotkeysPaused", async (_, paused) => {
		if (paused === true) globalShortcut.unregisterAll();
		else applyHotkeys(mainWindow);
	});

	ipcMainHandle("getCampaignRunsFolder", async () => objectFactory.getSettingsService().getCampaignRunsFolder());

	ipcMainHandle("saveCampaignRunsFolder", async (_, folder) =>
		objectFactory.getSettingsService().saveCampaignRunsFolder(folder),
	);

	// Handle events from the General Settings overlay
	ipcMainHandle("getClientPath", async () => {
		return objectFactory.getSettingsService().getClientTxtPath();
	});

	ipcMainHandle("saveClientPath", async (_, clientTxtPath) => {
		return objectFactory.getSettingsService().saveClientTxtPath(clientTxtPath, mainWindow, logWatcher);
	});

	ipcMainHandle("getIsClientWatcherActive", async () => {
		return objectFactory.getStateTracker().getIsClientWatcherActive();
	});

	// Handle events from the Zone Tracker
	ipcMainHandle("getZoneState", async () => {
		ipcWebContentsSend(
			"zoneLayoutImageUpdates",
			mainWindow.webContents,
			objectFactory.getZoneTracker().zoneImageFilePaths,
		);

		return objectFactory.getZoneTracker().getZoneDataDto();
	});

	ipcMainHandle("postActSelected", async (_, actSelected) => {
		objectFactory.getZoneTracker().saveZoneFromActName(actSelected);
		ipcWebContentsSend(
			"zoneLayoutImageUpdates",
			mainWindow.webContents,
			objectFactory.getZoneTracker().zoneImageFilePaths,
		);
		return objectFactory.getZoneTracker().getZoneDataDto();
	});

	ipcMainHandle("postZoneSelected", async (event, zoneSelectedRequest) => {
		log.info("Updating zone from zoneSelectedRequest:", zoneSelectedRequest);
		// Update zone based on zone and act selected
		objectFactory
			.getZoneTracker()
			.saveZoneFromZoneNameAndActName(zoneSelectedRequest.zoneSelected, zoneSelectedRequest.actSelected);

		// Send updated layout images
		ipcWebContentsSend(
			"zoneLayoutImageUpdates",
			mainWindow.webContents,
			objectFactory.getZoneTracker().zoneImageFilePaths,
		);

		// Return updated zone data
		return objectFactory.getZoneTracker().getZoneDataDto();
	});

	ipcMainHandle("saveNoteFromOverlay", async (_, note) => {
		const validNote = SaveNoteZodSchema.safeParse(note);
		if (validNote.success) objectFactory.getZoneTracker().saveNote(validNote.data);
		return objectFactory.getZoneTracker().getZoneDataDto();
	});

	ipcMainHandle("getLayoutImagePaths", async () => {
		return objectFactory.getZoneTracker().zoneImageFilePaths;
	});

	ipcMainHandle("getInGameWorld", async () => objectFactory.getStateTracker().inGameWorld);

	// Handle events from the leveling guide
	ipcMainHandle("getGuideState", async () => objectFactory.getGuideTracker().getGuideView());

	ipcMainHandle("postGuideStep", async (_, delta) => {
		objectFactory.getGuideTracker().step(delta);
		return objectFactory.getGuideTracker().getGuideView();
	});

	ipcMainHandle("postGuideReset", async () => {
		objectFactory.getGuideTracker().reset();
		return objectFactory.getGuideTracker().getGuideView();
	});

	ipcMainHandle("saveGuidePrefs", async (_, prefs) => {
		const validPrefs = GuidePrefsZodSchema.safeParse(prefs);
		if (validPrefs.success) objectFactory.getGuideTracker().savePrefs(validPrefs.data);
		return objectFactory.getGuideTracker().getGuideView();
	});

	// Handle events from the level tracker
	ipcMainHandle("getLevelState", async () => {
		return objectFactory.getLevelTracker().getLevelDataDto();
	});

	// Handle events from the gem tracker
	ipcMainHandle("getGemState", async () => {
		return objectFactory.getGemTracker().getGemDataDto();
	});

	ipcMainHandle("postGemLevelSelected", async (_, gemLevelSelected) => {
		objectFactory.getGemTracker().setGemSetupFromPlayerLevel(gemLevelSelected);
		return objectFactory.getGemTracker().getGemDataDto();
	});

	// --- Handle events from the gem SETTINGS --- //
	ipcMainHandle("getGemSettingsState", async () => {
		return objectFactory.getGemTracker().getGemSettingsDto();
	});

	// Every settings page can switch, add and delete builds. Each change also updates the gem and
	// notes panels, since they show the current build.
	const gemTracker = () => objectFactory.getGemTracker();
	const zoneTracker = () => objectFactory.getZoneTracker();
	const afterBuildChange = <T>(settingsDto: () => T): T => {
		sendBuildState(mainWindow.webContents);
		return settingsDto();
	};

	ipcMainHandle("postBuildSelected", async (_, buildName) => {
		activateBuild(buildName);
		return afterBuildChange(() => gemTracker().getGemSettingsDto());
	});

	ipcMainHandle("postAddNewBuild", async (_, buildName) => {
		createBuild(buildName);
		return afterBuildChange(() => gemTracker().getGemSettingsDto());
	});

	ipcMainHandle("postDeleteBuild", async (_, buildName) => {
		removeBuild(buildName);
		return afterBuildChange(() => gemTracker().getGemSettingsDto());
	});

	// Only parses and returns the setups, the user reviews and saves them in the settings
	ipcMainHandle("postImportPob", async (_, input) => importPob(input, downloadPobExport));

	ipcMainHandle("saveGemSetupsForBuild", async (_, request) => {
		gemTracker().saveGemBuild(request.buildName, request.allGemSetups);
		activateBuild(request.buildName);
		return afterBuildChange(() => gemTracker().getGemSettingsDto());
	});

	// --- Campaign timer --- //
	ipcMainHandle("getTimerState", async () => objectFactory.getTimerTracker().getTimerDto());

	ipcMainHandle("postTimerToggle", async () => {
		objectFactory.getTimerTracker().togglePause(Date.now(), zoneTracker().zoneCode);
		return objectFactory.getTimerTracker().getTimerDto();
	});

	ipcMainHandle("postTimerReset", async () => {
		objectFactory.getTimerTracker().apply({ type: "reset" });
		return objectFactory.getTimerTracker().getTimerDto();
	});

	// --- Handle events from the Act Notes SETTINGS --- //
	ipcMainHandle("getActNotesSettingsState", async () => {
		return zoneTracker().getActNotesSettingsDto();
	});

	ipcMainHandle("postBuildSelectedFromActNotes", async (_, buildName) => {
		activateBuild(buildName);
		return afterBuildChange(() => zoneTracker().getActNotesSettingsDto());
	});

	ipcMainHandle("postAddNewBuildFromActNotes", async (_, buildName) => {
		createBuild(buildName);
		return afterBuildChange(() => zoneTracker().getActNotesSettingsDto());
	});

	ipcMainHandle("postDeleteBuildFromActNotes", async (_, buildName) => {
		removeBuild(buildName);
		return afterBuildChange(() => zoneTracker().getActNotesSettingsDto());
	});

	ipcMainHandle("saveActNotesForBuild", async (_, request) => {
		useBuild(request.buildName);
		zoneTracker().saveActNotes(request.buildName, request.allActNotes);
		return afterBuildChange(() => zoneTracker().getActNotesSettingsDto());
	});

	ipcMainHandle("postCopyActNotesFromBuild", async (_, request) => {
		useBuild(request.buildName);
		zoneTracker().CopyActNotesFromBuild(request.buildName, request.buildToCopyName);
		return afterBuildChange(() => zoneTracker().getActNotesSettingsDto());
	});

	ipcMainHandle("postResetActNoteForAct", async (_, actName) => {
		return zoneTracker().resetActNoteForAct(actName);
	});

	// --- Handle events from the Zone Notes SETTINGS --- //
	ipcMainHandle("getZoneNotesSettingsState", async () => {
		return zoneTracker().getZoneNotesSettingsDto();
	});

	ipcMainHandle("postBuildSelectedFromZoneNotes", async (_, buildName) => {
		activateBuild(buildName);
		return afterBuildChange(() => zoneTracker().getZoneNotesSettingsDto());
	});

	ipcMainHandle("postAddNewBuildFromZoneNotes", async (_, buildName) => {
		createBuild(buildName);
		return afterBuildChange(() => zoneTracker().getZoneNotesSettingsDto());
	});

	ipcMainHandle("postDeleteBuildFromZoneNotes", async (_, buildName) => {
		removeBuild(buildName);
		return afterBuildChange(() => zoneTracker().getZoneNotesSettingsDto());
	});

	ipcMainHandle("saveZoneNotesForBuild", async (_, request) => {
		useBuild(request.buildName);
		zoneTracker().saveZoneNotes(request.buildName, request.allZoneNotes);
		return afterBuildChange(() => zoneTracker().getZoneNotesSettingsDto());
	});

	ipcMainHandle("postCopyZoneNotesFromBuild", async (_, request) => {
		useBuild(request.buildName);
		zoneTracker().CopyZoneNotesFromBuild(request.buildName, request.buildToCopyName);
		return afterBuildChange(() => zoneTracker().getZoneNotesSettingsDto());
	});

	ipcMainHandle("postResetZoneNoteForZone", async (_, zoneCode) => {
		return zoneTracker().resetZoneNoteForZone(zoneCode);
	});

	// Handle UI window position events
	ipcMainHandle("getSettingsOverlayPositionSettings", async () => {
		return objectFactory.getSettingsService().getSettingsOverlayPositionSettings();
	});

	ipcMainHandle("saveSettingsOverlayPositionSettings", async (event, settingsOverlaySettings) => {
		objectFactory.getSettingsService().saveSettingsOverlayPositionSettings(settingsOverlaySettings);
	});

	ipcMainHandle("getZoneOverlayPositionSettings", async () => {
		return objectFactory.getSettingsService().getZoneOverlayPositionSettings();
	});

	ipcMainHandle("saveZoneOverlayPositionSettings", async (_, zoneSettings) => {
		objectFactory.getSettingsService().saveZoneOverlayPositionSettings(zoneSettings);
	});

	ipcMainHandle("getLayoutImagesOverlayPositionSettings", async () => {
		return objectFactory.getSettingsService().getLayoutImagesOverlayPositionSettings();
	});

	ipcMainHandle("saveLayoutImagesOverlayPositionSettings", async (event, layoutImageSettings) => {
		objectFactory.getSettingsService().saveLayoutImagesOverlayPositionSettings(layoutImageSettings);
	});

	ipcMainHandle("getLevelOverlayPositionSettings", async () => {
		return objectFactory.getSettingsService().getLevelOverlayPositionSettings();
	});

	ipcMainHandle("saveLevelOverlayPositionSettings", async (_, levelSettings) => {
		objectFactory.getSettingsService().saveLevelOverlayPositionSettings(levelSettings);
	});

	ipcMainHandle("getGemOverlayPositionSettings", async () => {
		return objectFactory.getSettingsService().getGemOverlayPositionSettings();
	});

	ipcMainHandle("saveGemOverlayPositionSettings", async (_, gemSettings) => {
		objectFactory.getSettingsService().saveGemOverlayPositionSettings(gemSettings);
	});

	ipcMainHandle("getGuideOverlayPositionSettings", async () => {
		return objectFactory.getGuideTracker().getOverlayPosition();
	});

	ipcMainHandle("saveGuideOverlayPositionSettings", async (_, guideSettings) => {
		objectFactory.getGuideTracker().saveOverlayPosition(guideSettings);
	});
}

let failedHotkeys: HotkeyAction[] = [];

/** (Re-)registers the global hotkeys from the settings */
function applyHotkeys(mainWindow: BrowserWindow) {
	const hotkeys = objectFactory.getSettingsService().getHotkeys();
	failedHotkeys = registerHotkeys(globalShortcut, hotkeys, hotkeyHandlers(mainWindow));
	if (failedHotkeys.length > 0) log.warn("Hotkeys held by another app:", failedHotkeys);
}

function hotkeysDto(error?: string): HotkeysDto {
	return { hotkeys: objectFactory.getSettingsService().getHotkeys(), failed: failedHotkeys, error };
}

function hotkeyHandlers(mainWindow: BrowserWindow): Record<HotkeyAction, () => void> {
	const stepGuide = (delta: 1 | -1) => {
		objectFactory.getGuideTracker().step(delta);
		ipcWebContentsSend("guideUpdates", mainWindow.webContents, objectFactory.getGuideTracker().getGuideView());
	};
	return {
		toggleSettings: () => {
			objectFactory.getStateTracker().settingsOpen = !objectFactory.getStateTracker().settingsOpen;

			ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
				hotkey: "ToggleSettings",
				value: objectFactory.getStateTracker().settingsOpen,
			});

			// The overlay library hides the overlay when another app gets focus, but only if it knows
			// whether the overlay or the game should be focused next. Toggling mouse events alone
			// left the overlay focused: it stayed on top of other apps and showed up in Alt+Tab.
			if (mainWindow.isVisible()) {
				if (objectFactory.getStateTracker().settingsOpen) OverlayController.activateOverlay();
				else OverlayController.focusTarget();
			} else {
				// Game not attached: focusing would show a detached overlay window
				mainWindow.setIgnoreMouseEvents(!objectFactory.getStateTracker().settingsOpen);
			}
		},
		toggleZoneNotes: () => {
			const stateTracker = objectFactory.getStateTracker();
			stateTracker.setTrackerVisibility({ zoneNotesOpen: !stateTracker.zoneNotesOpen });
			ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
				hotkey: "ToggleZoneNotes",
				value: stateTracker.zoneNotesOpen,
			});
		},
		toggleLayoutImages: () => {
			const stateTracker = objectFactory.getStateTracker();
			stateTracker.setTrackerVisibility({ layoutImagesOpen: !stateTracker.layoutImagesOpen });
			ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
				hotkey: "ToggleLayoutImages",
				value: stateTracker.layoutImagesOpen,
			});
		},
		toggleLevelTracker: () => {
			const stateTracker = objectFactory.getStateTracker();
			stateTracker.setTrackerVisibility({ levelTrackerOpen: !stateTracker.levelTrackerOpen });
			ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
				hotkey: "ToggleLevelTracker",
				value: stateTracker.levelTrackerOpen,
			});
		},
		toggleGemTracker: () => {
			const stateTracker = objectFactory.getStateTracker();
			stateTracker.setTrackerVisibility({ gemTrackerOpen: !stateTracker.gemTrackerOpen });
			ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
				hotkey: "ToggleGemTracker",
				value: stateTracker.gemTrackerOpen,
			});
		},
		toggleGuide: () => {
			// Without a guide (PoE1) the hidden flag would break the all-trackers hotkey's "all shown" check
			if (!objectFactory.getGuideTracker().getGuideView().enabled) return;
			const stateTracker = objectFactory.getStateTracker();
			stateTracker.setTrackerVisibility({ guideOpen: !stateTracker.guideOpen });
			ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
				hotkey: "ToggleGuide",
				value: stateTracker.guideOpen,
			});
		},
		guideNext: () => stepGuide(1),
		guidePrevious: () => stepGuide(-1),
		toggleAllTrackers: () => {
			const stateTracker = objectFactory.getStateTracker();
			const visibility = toggleAllTrackers(stateTracker);
			stateTracker.setTrackerVisibility(visibility);

			const webContents = mainWindow.webContents;
			ipcWebContentsSend("Hotkeys", webContents, { hotkey: "ToggleZoneNotes", value: visibility.zoneNotesOpen });
			ipcWebContentsSend("Hotkeys", webContents, {
				hotkey: "ToggleLayoutImages",
				value: visibility.layoutImagesOpen,
			});
			ipcWebContentsSend("Hotkeys", webContents, {
				hotkey: "ToggleLevelTracker",
				value: visibility.levelTrackerOpen,
			});
			ipcWebContentsSend("Hotkeys", webContents, {
				hotkey: "ToggleGemTracker",
				value: visibility.gemTrackerOpen,
			});
			ipcWebContentsSend("Hotkeys", webContents, { hotkey: "ToggleGuide", value: visibility.guideOpen });
		},
		toggleTimer: () => {
			objectFactory.getTimerTracker().togglePause(Date.now(), objectFactory.getZoneTracker().zoneCode);
			ipcWebContentsSend("timerUpdates", mainWindow.webContents, objectFactory.getTimerTracker().getTimerDto());
		},
	};
}

/** Downloads a PoB export on user request, pobb.in and pastebin answer with the plain code */
async function downloadPobExport(url: string): Promise<string> {
	const response = await net.fetch(url, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) throw new Error(`PoB download failed with HTTP ${response.status}: ${url}`);
	return readPobDownload(response);
}

//-----------------------testing
function LogOverlayEventCalls() {
	// Still getting used to the events so uhhhhh just log when all of them are used.
	OverlayController.events.addListener("attach", (params) => {
		log.info("attach event emitted", params);
	});

	OverlayController.events.addListener("detach", () => {
		log.info("detach event emitted ");
	});

	OverlayController.events.addListener("fullscreen", () => {
		log.info("fullscreen event emitted");
	});

	OverlayController.events.addListener("moveresize", (params) => {
		log.info("moveresize event emitted ", params);
	});

	OverlayController.events.addListener("blur", (params) => {
		log.info("blur event emitted ", params);
	});

	OverlayController.events.addListener("focus", (params) => {
		log.info("focus event emitted ", params);
	});
}
