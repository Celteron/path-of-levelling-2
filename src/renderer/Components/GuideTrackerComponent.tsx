import { useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { TrackerPanel } from "./TrackerPanel";

type GuideStep = GuideDataDto["steps"][number];
type GuideSegment = GuideStep["segments"][number];

// Exile UI uses game images for these; PoL2 shows short text badges instead (no GGG assets).
const ICON_BADGES: Record<string, { label: string; title: string }> = {
	checkpoint: { label: "CP", title: "Checkpoint" },
	waypoint: { label: "WP", title: "Waypoint" },
	portal: { label: "TP", title: "Portal" },
	quest_2: { label: "!", title: "Quest" },
	"in-out2": { label: "⇄", title: "Entrance" },
	town2: { label: "Town", title: "Town" },
	arena: { label: "Arena", title: "Boss arena" },
	skill: { label: "Skill", title: "Skill gem" },
	skill2: { label: "Skill", title: "Skill gem" },
	support: { label: "Sup", title: "Support gem" },
	support2: { label: "Sup", title: "Support gem" },
	spirit2: { label: "Spirit", title: "Spirit gem" },
	rune: { label: "Rune", title: "Rune" },
	"b-rune": { label: "Rune", title: "Rune" },
	ring: { label: "Ring", title: "Ring" },
	flasks: { label: "Flask", title: "Flasks" },
	exa: { label: "Exa", title: "Exalted Orb" },
	regal: { label: "Regal", title: "Regal Orb" },
	gcp: { label: "GCP", title: "Gemcutter's Prism" },
	artificer: { label: "Art", title: "Artificer's Orb" },
	jeweller: { label: "Jwl", title: "Jeweller's Orb" },
};

/** Guide colours are hex without "#" or CSS colour names; anything else is ignored */
function cssColor(color: string | undefined): string | undefined {
	if (!color) return undefined;
	if (/^[0-9a-f]{6}$/i.test(color)) return `#${color}`;
	return /^[a-z]+$/i.test(color) ? color : undefined;
}

function Segment({ segment }: { segment: GuideSegment }) {
	switch (segment.kind) {
		case "text":
			return <span style={{ color: cssColor(segment.color) }}>{segment.text}</span>;
		case "icon": {
			const badge = ICON_BADGES[segment.icon] ?? { label: segment.icon, title: `Marker ${segment.icon}` };
			return (
				<span className="GuideBadge" title={badge.title} aria-label={badge.title} role="img">
					{badge.label}
				</span>
			);
		}
		case "zone":
			return <span className="GuideZone">{segment.name}</span>;
		case "quest":
			return <span className="GuideQuest">{segment.item}</span>;
		case "boss":
			return <span className="GuideBoss">{segment.name}</span>;
		case "arena":
			return <span className="GuideArena">{segment.name}</span>;
		case "tag":
			return <span className="GuideTag">{segment.value}</span>;
		case "separator":
			return (
				<span className="GuideSeparator" aria-hidden="true">
					·
				</span>
			);
		default: {
			const unhandled: never = segment;
			return unhandled;
		}
	}
}

function Segments({ segments }: { segments: GuideSegment[] }) {
	return segments.map((segment, index) => <Segment key={index} segment={segment} />);
}

export function GuideTrackerComponent() {
	const confirm = useConfirm();
	const [guide, setGuide] = useState<GuideDataDto | null>(null);

	useEffect(() => {
		// The panel remounts whenever it is toggled, so the listener must not outlive it
		const unsubscribe = window.electron.subscribeToGuideUpdates(setGuide);
		window.electron.getGuideState().then(setGuide);
		return unsubscribe;
	}, []);

	if (!guide?.enabled) return null;

	const step = (delta: 1 | -1) => window.electron.postGuideStep(delta).then(setGuide);
	const savePrefs = (prefs: GuidePrefsRequest) => window.electron.saveGuidePrefs(prefs).then(setGuide);
	const prefs = { leagueStart: guide.leagueStart, showOptional: guide.showOptional };
	const restart = async () => {
		if (await confirm("Restart the leveling guide from page 1, e.g. for a new character?", "Restart")) {
			window.electron.postGuideReset().then(setGuide);
		}
	};

	return (
		<TrackerPanel
			label="Leveling guide"
			loadPosition={window.electron.getGuideOverlayPositionSettings}
			savePosition={window.electron.saveGuideOverlayPositionSettings}
			toolbar={
				<>
					<button
						className="PanelButton"
						aria-pressed={guide.leagueStart}
						onClick={() => savePrefs({ ...prefs, leagueStart: !guide.leagueStart })}
					>
						League start
					</button>
					<button
						className="PanelButton"
						aria-pressed={guide.showOptional}
						onClick={() => savePrefs({ ...prefs, showOptional: !guide.showOptional })}
					>
						Optional steps
					</button>
					<button className="PanelButton" onClick={restart}>
						Restart guide
					</button>
					<span className="PanelMuted">Exile UI {guide.sourceVersion}</span>
				</>
			}
		>
			<header className="PanelHeader">
				<span className="PanelTitle">{guide.actName}</span>
				{guide.targetZoneName && <span className="GuideTarget">→ {guide.targetZoneName}</span>}
				<span className="PanelMuted">{`${guide.pageIndex + 1} / ${guide.pageCount}`}</span>
				<button
					className="PanelButton"
					aria-label="Previous page"
					title="Previous page (Ctrl+Alt+B)"
					onClick={() => step(-1)}
				>
					‹
				</button>
				<button
					className="PanelButton"
					aria-label="Next page"
					title="Next page (Ctrl+Alt+N)"
					onClick={() => step(1)}
				>
					›
				</button>
			</header>

			<ol className="GuideSteps">
				{guide.steps.map((guideStep, index) => (
					<li key={index} className={guideStep.optional ? "GuideStep GuideStepOptional" : "GuideStep"}>
						<Segments segments={guideStep.segments} />
						{guideStep.hints.map((hint, hintIndex) => (
							<div key={hintIndex} className="GuideHint">
								<Segments segments={hint} />
							</div>
						))}
					</li>
				))}
			</ol>
		</TrackerPanel>
	);
}
