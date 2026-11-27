import { app } from "electron";
import path from "path";
import fs from "fs";
import { ProfileId } from "./zodSchemas/schemas.js";
import { getProfile } from "./profiles/profiles.js";
import { FileProbe, guessClientTxtPath } from "./clientTxtPathGuesser.js";

export function isDev(): boolean {
	return process.env.NODE_ENV === "development";
}

export function getPreloadPath() {
	return path.join(
		app.getAppPath(),
		isDev() ? "." : "..", // Need to escape app.asar in production for any files listed in electron-builder.json
		"/dist-electron/ipc/preload.cjs" // Needs to be cjs so that it is compiled separately and can be accessed after compilation.
	);
}

export function getUIPath() {
	return path.join(app.getAppPath(), "/dist-react/index.html");
}

export function getDesktopIconPath() {
	return path.join(
		app.getAppPath(),
		isDev() ? "assets" : "dist-react",
		process.platform === "win32" ? "icon.ico" : "icon.png"
	);
}

export function getZoneNotesPath(profileId: ProfileId): string {
	// Path to the default Act and Zone notes - <profileId>/referenceData/zoneNotes.json
	return path.join(getProfilePath(profileId), "referenceData", "zoneNotes.json");
}

export function getZoneReferenceDataPath(profileId: ProfileId): string {
	return path.join(getProfilePath(profileId), "referenceData", "zoneReferenceData.json");
}

export function getZoneLayoutImagesAbsolutePath() {
	return path.join(
		app.getAppPath(),
		isDev() ? "assets/Layout Images" : "dist-react/Layout Images",
		getProfile().Id
	);
}

export function getBuildPath(profileId: ProfileId, buildName: string) {
	return path.join(getProfilePath(profileId), "/builds/", buildName);
}

export function getBuildsRootPath(profileId: ProfileId) {
	return path.join(getProfilePath(profileId), "/builds");
}

export function getProfilePath(profileId: ProfileId) {
	return path.join(app.getAppPath(), isDev() ? "." : "..", "src/main/profiles/", profileId);
}

/** Steam install directories that may contain libraryfolders.vdf, per platform */
function getSteamRoots(): string[] {
	if (process.platform === "win32") return ["C:/Program Files (x86)/Steam"];

	const home = app.getPath("home");
	return [
		path.join(home, ".local/share/Steam"),
		path.join(home, ".steam/steam"),
		path.join(home, ".var/app/com.valvesoftware.Steam/.local/share/Steam"), // Flatpak
	];
}

const realFileProbe: FileProbe = {
	isReadable: (filePath) => {
		try {
			fs.accessSync(filePath, fs.constants.R_OK);
			return true;
		} catch {
			return false;
		}
	},
	readText: (filePath) => {
		try {
			return fs.readFileSync(filePath, "utf-8");
		} catch {
			return undefined;
		}
	},
};

export function isReadableFile(filePath: string): boolean {
	return realFileProbe.isReadable(filePath);
}

/** Looks for Client.txt in the profile's guesses and all Steam libraries */
export function findClientTxtPathForProfileId(profileId: ProfileId): string | undefined {
	const profile = getProfile(profileId);
	return guessClientTxtPath({
		directGuesses: profile.logFilePathGuesses,
		steamRoots: getSteamRoots(),
		gameFolderName: profile.steamFolderName,
		fs: realFileProbe,
	});
}

/** Guesses a few file paths, if none are valid then return default */
export function guessClientTxtPathForProfileId(profileId: ProfileId): string {
	return findClientTxtPathForProfileId(profileId) ?? getProfile(profileId).defaultClientTxtPath;
}
