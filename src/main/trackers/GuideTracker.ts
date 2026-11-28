import fs from "fs";
import log from "electron-log";
import { getLevelingGuidePath } from "../pathResolver.js";
import { getProfile } from "../profiles/profiles.js";
import { StoreService } from "../services/StoreService.js";
import {
	advanceOnZoneEntered,
	GuidePrefs,
	guideView,
	GuideView,
	pageTarget,
	parseLevelingGuide,
	recommendationFor,
	restorePageIndex,
	stepPage,
} from "../levelingGuide.js";
import { zoneRewards } from "../zoneRewards.js";
import { LevelingGuide, OverlayPosition, RecommendedLevel } from "../zodSchemas/schemas.js";

/** The guide page plus the permanent rewards of the zone the player is in */
export type GuideDto = GuideView & { zoneRewards: readonly string[] };

/** Holds the guide progress and persists it; the guide logic lives in levelingGuide.ts */
export class GuideTracker {
	private guide: LevelingGuide | null;
	private pageIndex = 0;
	private prefs: GuidePrefs;
	/** Raw zone code from Client.txt, also towns and interludes the ZoneTracker does not know */
	private currentZoneCode: string;

	constructor(private storeService: StoreService) {
		this.guide = GuideTracker.loadGuide();
		const settings = storeService.getGameSetting("levelingGuide");
		this.prefs = { leagueStart: settings.leagueStart, showOptional: settings.showOptional };
		this.currentZoneCode = storeService.getGameSetting("lastSessionState.zoneCode");
		if (this.guide) this.pageIndex = restorePageIndex(this.guide, settings, this.prefs.leagueStart);
	}

	init() {}

	/** Only PoE2 has a guide; a missing or broken file disables the guide panel */
	private static loadGuide(): LevelingGuide | null {
		const guidePath = getLevelingGuidePath(getProfile().Id);
		try {
			const guide = parseLevelingGuide(JSON.parse(fs.readFileSync(guidePath, "utf-8")));
			if (!guide) log.error("Leveling guide failed validation, guide disabled:", guidePath);
			return guide;
		} catch {
			log.info("No leveling guide for this profile:", guidePath);
			return null;
		}
	}

	isAvailable(): boolean {
		return this.guide !== null;
	}

	getGuideView(): GuideDto {
		return { ...guideView(this.guide, this.pageIndex, this.prefs), zoneRewards: zoneRewards(this.currentZoneCode) };
	}

	getRecommendedLevel(): RecommendedLevel | undefined {
		return this.guide ? recommendationFor(this.guide, this.currentZoneCode) : undefined;
	}

	/** Returns true if the guide page or the zone rewards changed */
	onZoneEntered(zoneCode: string): boolean {
		const rewardsChanged = zoneRewards(zoneCode) !== zoneRewards(this.currentZoneCode);
		this.currentZoneCode = zoneCode;
		if (!this.guide) return false;
		const pageChanged = this.setPage(
			advanceOnZoneEntered(this.guide, this.pageIndex, zoneCode, this.prefs.leagueStart),
		);
		return pageChanged || rewardsChanged;
	}

	step(delta: 1 | -1) {
		if (this.guide) this.setPage(stepPage(this.guide, this.pageIndex, delta, this.prefs.leagueStart));
	}

	reset() {
		this.setPage(0);
	}

	savePrefs(prefs: GuidePrefs) {
		this.prefs = prefs;
		this.save();
	}

	saveOverlayPosition(overlayPosition: OverlayPosition) {
		this.storeService.setGameSetting("levelingGuide.overlayPosition", overlayPosition);
	}

	getOverlayPosition(): OverlayPosition {
		return this.storeService.getGameSetting("levelingGuide.overlayPosition");
	}

	private setPage(pageIndex: number): boolean {
		if (pageIndex === this.pageIndex) return false;
		this.pageIndex = pageIndex;
		this.save();
		return true;
	}

	private save() {
		const page = this.guide?.pages[this.pageIndex];
		this.storeService.setGameSetting("levelingGuide", {
			...this.storeService.getGameSetting("levelingGuide"),
			...this.prefs,
			pageIndex: this.pageIndex,
			pageTarget: page ? pageTarget(page, this.prefs.leagueStart) : null,
		});
	}
}
