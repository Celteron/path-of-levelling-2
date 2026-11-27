import { BrowserWindow } from "electron";
import log from "electron-log";
import fs from "fs";
import { objectFactory } from "../objectFactory.js";
import { ipcWebContentsSend } from "../ipc/ipcWrappers.js";
import { inGameWorldFromLogTail, parseLogChunk } from "../logParser.js";
import { readFileTail } from "../fileTail.js";

/** Enough log to contain the last login or zone line of a session */
const LOG_TAIL_BYTES = 256 * 1024;

export class LogWatcherService {
	watchedFilePath: string = "";
	previousFileSize: number;

	constructor() {
		this.previousFileSize = 0;

		log.info("LogWatcherService constructed");
	}

	init() {
		log.info("LogWatcherService initialised");
	}

	/** Watches the Client.txt from the settings, replacing the file watched so far */
	watchClientTxt(mainWindow: BrowserWindow) {
		log.info("Trying to subscribe to Client.txt");
		this.stopWatching();
		const filePathGuess = objectFactory.getSettingsService().getClientTxtPath();

		try {
			this.previousFileSize = fs.statSync(filePathGuess).size;
		} catch (error) {
			// Shows a warning in the settings asking the user to fix the Client.txt path
			objectFactory.getStateTracker().logWatcherActive = false;

			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				log.error(`Could not subscribe to client txt changes, wrong client path! ${filePathGuess}`);
			} else {
				log.error(`Could not subscribe to client txt changes, unknown error for path: ${filePathGuess}`, error);
			}
			return;
		}

		objectFactory.getStateTracker().logWatcherActive = true;
		this.watchedFilePath = filePathGuess;
		log.info("Successfully subscribed to Client.txt");

		// New lines only arrive on the next game event; until then the end of the log tells
		// whether the game sits at the login/character select screen.
		objectFactory.getStateTracker().inGameWorld = inGameWorldFromLogTail(
			readFileTail(filePathGuess, LOG_TAIL_BYTES),
		);

		fs.watchFile(this.watchedFilePath, (current, previous) => {
			const data = this.readNewLines(current, previous);
			if (!data) return;

			const shouldUpdateZoneTracker =
				data.zoneCode !== "" && objectFactory.getZoneTracker().saveZoneFromCode(data.zoneCode);

			const shouldUpdateLevelTracker = data.monsterLevel > 0 || data.playerLevel > 0;
			if (shouldUpdateLevelTracker) {
				objectFactory.getLevelTracker().savePlayerOrMonsterLevel(data.playerLevel, data.monsterLevel);
			}

			const shouldUpdateGemTracker = data.playerLevel > 0;
			if (shouldUpdateGemTracker) {
				objectFactory.getGemTracker().setGemSetupFromPlayerLevel(data.playerLevel);
			}

			// The guide checks every zone change, also towns/interludes unknown to the ZoneTracker
			const guideChanged = data.zoneCodes
				.map((zoneCode) => objectFactory.getGuideTracker().onZoneEntered(zoneCode))
				.some(Boolean);

			// Send the changes to the renderer
			if (guideChanged) {
				ipcWebContentsSend(
					"guideUpdates",
					mainWindow.webContents,
					objectFactory.getGuideTracker().getGuideView(),
				);
			}

			if (data.atLoginScreen !== undefined) {
				objectFactory.getStateTracker().inGameWorld = !data.atLoginScreen;
				ipcWebContentsSend("gameWorldUpdates", mainWindow.webContents, !data.atLoginScreen);
			}

			if (shouldUpdateZoneTracker) {
				ipcWebContentsSend(
					"zoneUpdatesFromLog",
					mainWindow.webContents,
					objectFactory.getZoneTracker().getZoneDataDto(),
				);
			}

			// We always update the zone layout images, even if the zone wasn't found, the images
			// should still be cleared in saveZoneFromCode, so here we're just updating the UI
			ipcWebContentsSend(
				"zoneLayoutImageUpdates",
				mainWindow.webContents,
				objectFactory.getZoneTracker().zoneImageFilePaths,
			);

			if (shouldUpdateLevelTracker) {
				ipcWebContentsSend(
					"subscribeToLevelUpdates",
					mainWindow.webContents,
					objectFactory.getLevelTracker().getLevelDataDto(),
				);
			}

			if (shouldUpdateGemTracker) {
				ipcWebContentsSend(
					"subscribeToGemUpdates",
					mainWindow.webContents,
					objectFactory.getGemTracker().getGemDataDto(),
				);
			}
		});
	}

	stopWatching() {
		if (!this.watchedFilePath) return;
		fs.unwatchFile(this.watchedFilePath);
		this.watchedFilePath = "";
	}

	/** Reads the lines appended since the last call; undefined if the file was not modified */
	readNewLines(current: fs.Stats, previous: fs.Stats) {
		// mtime is the last modification time
		if (current.mtime <= previous.mtime) {
			return;
		}

		const newFileSize = fs.statSync(objectFactory.getSettingsService().getClientTxtPath()).size;
		let sizeDiff = newFileSize - this.previousFileSize;

		// A negative difference means the file was truncated (the game recreated it), so read all of it
		if (sizeDiff < 0) {
			this.previousFileSize = 0;
			sizeDiff = newFileSize;
		}

		const buffer = Buffer.alloc(sizeDiff);
		const fileDescriptor = fs.openSync(objectFactory.getSettingsService().getClientTxtPath(), "r");
		fs.readSync(fileDescriptor, buffer, 0, sizeDiff, this.previousFileSize);
		fs.closeSync(fileDescriptor);
		this.previousFileSize = newFileSize;

		const data = parseLogChunk(buffer.toString());
		log.info("New lines had data", data);
		return data;
	}
}
