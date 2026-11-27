import { useEffect, useState } from "react";
import { TrackerPanel } from "./TrackerPanel";

const STATUS_TEXT: Record<NonNullable<LevelDataDto["levelStatus"]>, string> = {
	below: "Under-levelled",
	within: "On track",
	above: "Over-levelled",
};

/** Typographic minus, so negative differences read as clearly as positive ones */
const signed = (value: number) => (value < 0 ? `−${-value}` : `+${value}`);

export function LevelTrackerComponent() {
	const [level, setLevel] = useState<LevelDataDto | null>(null);

	useEffect(() => {
		// The panel remounts whenever it is toggled, so the listener must not outlive it
		const unsubscribe = window.electron.subscribeToLevelUpdates(setLevel);
		window.electron.getLevelState().then(setLevel);
		return unsubscribe;
	}, []);

	return (
		<TrackerPanel
			label="Level"
			loadPosition={window.electron.getLevelOverlayPositionSettings}
			savePosition={window.electron.saveLevelOverlayPositionSettings}
		>
			{level && (
				<>
					<div className="PanelHeader">
						<span className="PanelTitle">Lvl {level.playerLevel}</span>
						<span title="Area level and your level difference to it">
							Area {level.monsterLevel} ({signed(level.playerLevel - level.monsterLevel)})
						</span>
						<span className="LevelXp" title="Experience multiplier" data-penalty={level.expMulti < 1}>
							XP {Math.round(level.expMulti * 100)}%
						</span>
					</div>
					{level.recommendedLevel && level.levelStatus && (
						<p
							className="LevelAdvice"
							data-status={level.levelStatus}
							title="Recommended character level for this zone (Exile UI)"
						>
							Recommended {level.recommendedLevel.label.replace(/\s*\|\s*/, "–")} ·{" "}
							{STATUS_TEXT[level.levelStatus]}
						</p>
					)}
				</>
			)}
		</TrackerPanel>
	);
}
