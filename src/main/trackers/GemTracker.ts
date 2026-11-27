import log from "electron-log";
import { objectFactory } from "../objectFactory.js";
import { SettingsService } from "../services/Settings.js";
import { LevelTracker } from "./LevelTracker.js";
import { Build, DefaultGemBuild, GemBuild, GemSetup } from "../zodSchemas/schemas.js";

/**
 * Tracks the gem setup for the current character level. It also owns the build list (selected
 * build, create, delete) because no other module manages builds yet; a dedicated build module
 * would be the better home once builds get more features.
 */
export class GemTracker {
	buildName: string = "Default";
	allBuildNames: string[] = ["Default"];
	gemBuild: GemBuild = Object();

	// Current setup - shown in the UI
	gemSetup: GemSetup = Object();
	allGemSetups: GemSetup[] = Object();
	allGemSetupLevels: number[] = [0];

	constructor(settingsService: SettingsService, levelTracker: LevelTracker) {
		this.loadGemSetup(settingsService.getBuildName());
		this.setGemSetupFromPlayerLevel(levelTracker.playerLevel);
	}

	init() {}

	getGemDataDto(): GemDataDto {
		return {
			allGemSetupLevels: this.allGemSetupLevels,
			gemSetupLevel: this.gemSetup.level,
			gemLinks: this.gemSetup.gemLinks,
		};
	}

	getGemSettingsDto(): GemSettingsDto {
		return {
			buildName: this.buildName,
			allBuildNames: this.allBuildNames,
			allGemSetupLevels: this.allGemSetupLevels,
			allGemSetups: this.allGemSetups,
		};
	}

	saveNewBuild(newBuildName: string) {
		log.info("Saving new build:", newBuildName);

		if (objectFactory.getStoreService().getBuild(newBuildName)) {
			log.warn("Build already exists, not saving:", newBuildName);
			return;
		}

		const newBuild: Build = {
			buildName: newBuildName,
			gemBuild: DefaultGemBuild.parse({}),
			actNotes: [],
			zoneNotes: [],
		};

		objectFactory.getStoreService().setBuild(newBuildName, newBuild);

		this.allBuildNames = objectFactory.getStoreService().getAllBuildNames();
	}

	deleteBuild(buildName: string) {
		log.info("Deleting build:", buildName);

		// Every other build falls back to Default, so it must stay
		if (buildName === "Default") {
			log.warn("The Default build cannot be deleted");
			return;
		}

		if (!objectFactory.getStoreService().getBuild(buildName)) {
			log.warn("Build does not exist, not deleting:", buildName);
			return;
		}

		objectFactory.getStoreService().deleteBuild(buildName);
	}

	loadGemSetup(buildName: string) {
		log.info("Trying to load gem setups");

		this.buildName = buildName;
		this.allBuildNames = objectFactory.getStoreService().getAllBuildNames();

		let build = objectFactory.getStoreService().getBuild(buildName);

		if (!build) {
			log.warn("Could not load gem setup, build does not exist: " + buildName);
			log.warn("Loading default gem setup");
			build = objectFactory.getStoreService().getBuild("Default")!;
		}

		this.gemBuild = build.gemBuild;
		this.allGemSetups = build.gemBuild.gemSetups;

		// This is used to populate the dropdown in the UI
		this.allGemSetupLevels = this.allGemSetups.map((setup: GemSetup) => {
			return setup.level;
		});

		log.info("Successfully loaded gem setups");
	}

	/** Returns true if the gem setup changed, i.e. the renderer needs an update */
	setGemSetupFromPlayerLevel(playerLevel: number): boolean {
		const foundGemSetup = this.allGemSetups.findLast((gemSetup) => playerLevel >= gemSetup.level);

		if (foundGemSetup === undefined) {
			log.info("Could not find gem setup matching level", playerLevel);
			return false;
		}
		if (foundGemSetup === this.gemSetup) {
			log.info("Gem setup found, but same as existing. No changes made.");
			return false;
		}

		this.gemSetup = foundGemSetup;
		return true;
	}

	saveGemBuild(buildName: string, gemSetups: GemSetup[]) {
		log.info("Saving gem setups for build:", buildName);
		log.info(gemSetups);

		const newGemBuild = {
			changedByUser: true,
			gemSetups: gemSetups,
		};

		objectFactory.getStoreService().setBuild(buildName, {
			...(objectFactory.getStoreService().getBuild(buildName) ?? {
				buildName: buildName,
				actNotes: [],
				zoneNotes: [],
			}),
			gemBuild: newGemBuild,
		});
	}
}
