import { useContext, useEffect, useState } from "react";
import { TrackerPanel } from "./TrackerPanel";
import { actTimesAt, formatDuration, useCampaignTimer } from "./campaignTimerView";
import { OverlayInteractiveContext } from "./overlayInteractive";
import { useConfirm } from "./useConfirm";

const STATUS_TEXT: Record<NonNullable<LevelDataDto["levelStatus"]>, string> = {
	below: "Under-levelled",
	within: "On track",
	above: "Over-levelled",
};

/** Typographic minus, so negative differences read as clearly as positive ones */
const signed = (value: number) => (value < 0 ? `−${-value}` : `+${value}`);

export function LevelTrackerComponent() {
	const [level, setLevel] = useState<LevelDataDto | null>(null);
	const { timer, setTimer, now } = useCampaignTimer();
	const interactive = useContext(OverlayInteractiveContext);
	const confirm = useConfirm();

	useEffect(() => {
		// The panel remounts whenever it is toggled, so the listener must not outlive it
		const unsubscribe = window.electron.subscribeToLevelUpdates(setLevel);
		window.electron.getLevelState().then(setLevel);
		return unsubscribe;
	}, []);

	const started = timer !== null && timer.acts.length > 0;
	const resetTimer = async () => {
		if (await confirm("Reset the campaign timer? The times of this run are lost.", "Reset")) {
			window.electron.postTimerReset().then(setTimer);
		}
	};

	return (
		<TrackerPanel
			label="Level"
			loadPosition={window.electron.getLevelOverlayPositionSettings}
			savePosition={window.electron.saveLevelOverlayPositionSettings}
			// Fits its content: the timer and its act list come and go
			collapsed
			toolbar={
				timer && (
					<>
						{!timer.finished && (
							<button
								className="PanelButton"
								onClick={() => window.electron.postTimerToggle().then(setTimer)}
								title="Also by hotkey, see General settings"
							>
								{!started
									? "Start timer"
									: timer.runningSince === null
										? "Resume timer"
										: "Pause timer"}
							</button>
						)}
						{started && (
							<button className="PanelButton" onClick={resetTimer}>
								Reset timer
							</button>
						)}
					</>
				)
			}
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
							title="Recommended character level for this zone"
						>
							Recommended {level.recommendedLevel.label.replace(/\s*\|\s*/, "–")} ·{" "}
							{STATUS_TEXT[level.levelStatus]}
						</p>
					)}
				</>
			)}
			{timer && started && <CampaignTimer timer={timer} now={now} showActs={interactive} />}
		</TrackerPanel>
	);
}

function CampaignTimer({ timer, now, showActs }: { timer: TimerDto; now: number; showActs: boolean }) {
	const acts = actTimesAt(timer, now);
	const current = acts[acts.length - 1];
	const total = acts.reduce((sum, act) => sum + act.ms, 0);
	const state = timer.finished ? "finished" : timer.paused ? "paused" : "running";
	const suffix = { finished: " · Done", paused: " · Paused", running: "" }[state];

	return (
		<>
			<p className="CampaignTimer" role="timer" data-state={state} title="Campaign timer">
				{`${current.act} ${formatDuration(current.ms)} · Total ${formatDuration(total)}${suffix}`}
			</p>
			{showActs && (
				<ol className="CampaignTimerActs" aria-label="Time per act">
					{acts.map((act) => (
						<li key={act.act}>
							{`${act.act} ${formatDuration(act.ms)}`}
							{timer.bests[act.act] !== undefined && ` · PB ${formatDuration(timer.bests[act.act])}`}
						</li>
					))}
				</ol>
			)}
		</>
	);
}
