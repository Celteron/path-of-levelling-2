import { app, BrowserWindow, globalShortcut, shell, Menu, screen, Tray, nativeImage, net } from "electron";
import log from "electron-log";
import { OVERLAY_WINDOW_OPTS, OverlayController } from "electron-overlay-window";
import electronUpdater, { type AppUpdater } from "electron-updater";
import path from "path";
import { LogWatcherService } from "./services/LogWatcherService.js";
import { getDesktopIconPath, getPreloadPath, getUIPath, isDev } from "./pathResolver.js";
import { objectFactory } from "./objectFactory.js";
import { activateBuild, createBuild, removeBuild, sendBuildState, useBuild } from "./builds.js";
import { TimerEvent } from "./campaignTimer.js";
import { getProfile } from "./profiles/profiles.js";
import { ipcMainHandle, ipcWebContentsSend } from "./ipc/ipcWrappers.js";
import { toggleAllTrackers } from "./trackers/trackerVisibility.js";
import { importPob } from "./pob/pobImport.js";
import { GuidePrefsZodSchema, OverlayOpacityZodSchema } from "./zodSchemas/schemas.js";

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

	// Prevent opening new windows within the app - open in browser instead
	// eg. links to documentation
	mainWindow.webContents.on("will-navigate", (event, url) => {
		// Check if the URL is outside our app
		const currentHost = new URL(mainWindow.webContents.getURL()).host;
		const requestedHost = new URL(url).host;

		if (requestedHost && requestedHost !== currentHost) {
			event.preventDefault(); // Prevent default navigation within the app
			shell.openExternal(url); // Open in external browser
		}
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

	registerGlobalHotkeys(mainWindow);

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

	ipcMainHandle("getOverlayOpacity", async () => {
		return objectFactory.getSettingsService().getOverlayOpacity();
	});

	ipcMainHandle("saveOverlayOpacity", async (_, overlayOpacity) => {
		const validOpacity = OverlayOpacityZodSchema.safeParse(overlayOpacity);
		if (validOpacity.success) objectFactory.getSettingsService().saveOverlayOpacity(validOpacity.data);
	});

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

function registerGlobalHotkeys(mainWindow: BrowserWindow) {
	// Pause/resume the campaign timer; starts it in the current act if it has not run yet
	globalShortcut.register("Ctrl+Alt+P", () => {
		objectFactory.getTimerTracker().togglePause(Date.now(), objectFactory.getZoneTracker().zoneCode);
		ipcWebContentsSend("timerUpdates", mainWindow.webContents, objectFactory.getTimerTracker().getTimerDto());
	});

	//Show/hide settings - default hidden
	globalShortcut.register("Ctrl+Alt+S", () => {
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
	});
	//Show/hide zone notes - default shown
	globalShortcut.register("Ctrl+Alt+z", () => {
		objectFactory.getStateTracker().zoneNotesOpen = !objectFactory.getStateTracker().zoneNotesOpen;

		ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
			hotkey: "ToggleZoneNotes",
			value: objectFactory.getStateTracker().zoneNotesOpen,
		});
	});
	//Show/hide layout images - default shown
	globalShortcut.register("Ctrl+Alt+i", () => {
		objectFactory.getStateTracker().layoutImagesOpen = !objectFactory.getStateTracker().layoutImagesOpen;

		ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
			hotkey: "ToggleLayoutImages",
			value: objectFactory.getStateTracker().layoutImagesOpen,
		});
	});
	//Show/hide level tracker - default shown
	globalShortcut.register("Ctrl+Alt+l", () => {
		objectFactory.getStateTracker().levelTrackerOpen = !objectFactory.getStateTracker().levelTrackerOpen;

		ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
			hotkey: "ToggleLevelTracker",
			value: objectFactory.getStateTracker().levelTrackerOpen,
		});
	});
	//Show/hide level tracker - default shown
	globalShortcut.register("Ctrl+Alt+g", () => {
		objectFactory.getStateTracker().gemTrackerOpen = !objectFactory.getStateTracker().gemTrackerOpen;

		ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
			hotkey: "ToggleGemTracker",
			value: objectFactory.getStateTracker().gemTrackerOpen,
		});
	});
	//Show/hide leveling guide - default shown
	globalShortcut.register("Ctrl+Alt+j", () => {
		// Without a guide (PoE1) the hidden flag would break Ctrl+Alt+A's "all shown" check
		if (!objectFactory.getGuideTracker().getGuideView().enabled) return;
		objectFactory.getStateTracker().guideOpen = !objectFactory.getStateTracker().guideOpen;

		ipcWebContentsSend("Hotkeys", mainWindow.webContents, {
			hotkey: "ToggleGuide",
			value: objectFactory.getStateTracker().guideOpen,
		});
	});
	//Leveling guide: next/previous page
	const stepGuide = (delta: 1 | -1) => {
		objectFactory.getGuideTracker().step(delta);
		ipcWebContentsSend("guideUpdates", mainWindow.webContents, objectFactory.getGuideTracker().getGuideView());
	};
	globalShortcut.register("Ctrl+Alt+n", () => stepGuide(1));
	globalShortcut.register("Ctrl+Alt+b", () => stepGuide(-1));
	//Show/hide all trackers at once (#3)
	globalShortcut.register("Ctrl+Alt+a", () => {
		const stateTracker = objectFactory.getStateTracker();
		const visibility = toggleAllTrackers(stateTracker);
		Object.assign(stateTracker, visibility);

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
		ipcWebContentsSend("Hotkeys", webContents, { hotkey: "ToggleGemTracker", value: visibility.gemTrackerOpen });
		ipcWebContentsSend("Hotkeys", webContents, { hotkey: "ToggleGuide", value: visibility.guideOpen });
	});
}

/** Downloads a PoB export on user request, pobb.in and pastebin answer with the plain code */
async function downloadPobExport(url: string): Promise<string> {
	const response = await net.fetch(url, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) throw new Error(`PoB download failed with HTTP ${response.status}: ${url}`);
	return response.text();
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
