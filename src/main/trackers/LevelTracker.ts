import log from "electron-log";
import { objectFactory } from "../objectFactory.js";
import { StoreService } from "../services/StoreService.js";
import { levelStatus } from "../levelingGuide.js";
import { experienceMultiplier } from "../experience.js";

export class LevelTracker {
	playerLevel: number = 0;
	monsterLevel: number = 0;
	expMulti: number = 0;

	constructor(storeService: StoreService) {
		this.savePlayerOrMonsterLevel(
			storeService.getGameSetting("lastSessionState.playerLevel"),
			storeService.getGameSetting("lastSessionState.monsterLevel"),
			true,
		);
	}

	init() {}

	getLevelDataDto(): LevelDataDto {
		const recommendedLevel = objectFactory.getGuideTracker().getRecommendedLevel();
		return {
			playerLevel: this.playerLevel,
			monsterLevel: this.monsterLevel,
			expMulti: this.expMulti,
			recommendedLevel,
			levelStatus: recommendedLevel && levelStatus(this.playerLevel, recommendedLevel),
		};
	}

	// It's a huge pain to have a bunch of ifs all over the place to update monster and
	// player level separately, so I just made this method work whenever you need it to.
	// Just pass 0 or don't pass anything at all if you don't want to update one of them.
	savePlayerOrMonsterLevel(playerLevel: number = 0, monsterLevel: number = 0, updateOnly: boolean = false) {
		if (playerLevel == 0 && monsterLevel == 0) return;

		if (playerLevel > 0) this.playerLevel = playerLevel;
		if (monsterLevel > 0) this.monsterLevel = monsterLevel;

		this.recalculateEXPModifier();

		// There are a few reasons we want to update locally, but not save.
		// Biggest example is when the app is first starting up and loading from file,
		// don't need to immediately write to that file.
		if (!updateOnly) objectFactory.getStateTracker().saveSessionState();
	}

	recalculateEXPModifier() {
		this.expMulti = experienceMultiplier(this.playerLevel, this.monsterLevel);
		log.info(
			"Experience multiplier",
			this.expMulti,
			"for level",
			this.playerLevel,
			"in area level",
			this.monsterLevel,
		);
	}
}
