import { useEffect, useState } from "react";
import { TrackerPanel } from "./TrackerPanel";

/** A setup is used from its level until the level before the next setup */
function levelRangeLabel(levels: number[], index: number): string {
	const level = levels[index];
	const next = levels[index + 1];
	if (next === undefined) return `Level ${level}+`;
	return next - 1 > level ? `Level ${level}–${next - 1}` : `Level ${level}`;
}

export function GemTrackerComponent() {
	const [gems, setGems] = useState<GemDataDto | null>(null);

	useEffect(() => {
		// The panel remounts whenever it is toggled, so the listener must not outlive it
		const unsubscribe = window.electron.subscribeToGemUpdates(setGems);
		window.electron.getGemState().then(setGems);
		return unsubscribe;
	}, []);

	const selectLevel = (value: string) => {
		const level = Number(value);
		if (Number.isFinite(level)) window.electron.postGemLevelSelected(level).then(setGems);
	};

	return (
		<TrackerPanel
			label="Gems"
			loadPosition={window.electron.getGemOverlayPositionSettings}
			savePosition={window.electron.saveGemOverlayPositionSettings}
		>
			{gems && (
				<>
					<select
						className="PanelSelect"
						aria-label="Gem setup"
						value={gems.gemSetupLevel}
						onChange={(event) => selectLevel(event.target.value)}
					>
						{gems.allGemSetupLevels.map((level, index) => (
							<option key={index} value={level}>
								{levelRangeLabel(gems.allGemSetupLevels, index)}
							</option>
						))}
					</select>
					<ul className="GemLinks">
						{gems.gemLinks.map((gemLink, index) => (
							<li key={index}>{gemLink}</li>
						))}
					</ul>
				</>
			)}
		</TrackerPanel>
	);
}
