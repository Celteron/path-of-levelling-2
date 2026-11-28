import { useContext, useEffect, useState } from "react";
import { TrackerPanel } from "../TrackerPanel";
import { OverlayInteractiveContext } from "../overlayInteractive";

/**
 * Act and zone notes. Inside the leveling guide they have no window of their own, and the guide
 * already gives the shipped zone tips; otherwise they are a window like the other trackers.
 */
export function ZoneNotesComponent({ inGuide }: { inGuide: boolean }) {
	const interactive = useContext(OverlayInteractiveContext);
	const [zone, setZone] = useState<ZoneDataDto | null>(null);
	// The note being edited in the overlay, bound to its act or zone when editing started
	const [draft, setDraft] = useState<SaveNoteRequest | null>(null);

	useEffect(() => {
		// The panel remounts whenever it is toggled, so the listener must not outlive it
		const unsubscribe = window.electron.subscribeToZoneNotesUpdates(setZone);
		window.electron.getZoneState().then(setZone);
		return unsubscribe;
	}, []);

	const selectAct = (actName: string) => window.electron.postActSelected(actName).then(setZone);
	const selectZone = (zoneName: string) =>
		zone && window.electron.postZoneSelected({ zoneSelected: zoneName, actSelected: zone.act }).then(setZone);

	const showZoneNotes = zone && !(inGuide && zone.zoneNotesCoveredByGuide);

	const saveDraft = () =>
		draft &&
		window.electron.saveNoteFromOverlay(draft).then((updated) => {
			setZone(updated);
			setDraft(null);
		});

	const noteEditor = (note: SaveNoteRequest) => (
		<textarea
			className="PanelNoteEditor"
			aria-label={`Note for ${note.kind === "act" ? note.actName : zone?.zone}`}
			value={note.notes}
			autoFocus
			onChange={(event) => setDraft({ ...note, notes: event.target.value })}
		/>
	);

	const toolbar = draft ? (
		<>
			<button className="PanelButton" onClick={saveDraft}>
				Save note
			</button>
			<button className="PanelButton" onClick={() => setDraft(null)}>
				Cancel
			</button>
		</>
	) : (
		zone && (
			<>
				<button
					className="PanelButton"
					onClick={() => setDraft({ kind: "act", actName: zone.act, notes: zone.actNotes })}
				>
					Edit act note
				</button>
				<button
					className="PanelButton"
					onClick={() => setDraft({ kind: "zone", zoneCode: zone.zoneCode, notes: zone.zoneNotes })}
				>
					Edit zone note
				</button>
			</>
		)
	);

	const notes = zone && (
		<>
			<select
				className="PanelSelect"
				aria-label="Act"
				value={zone.act}
				onChange={(event) => selectAct(event.target.value)}
			>
				{zone.allActs.map((act) => (
					<option key={act} value={act}>
						{act}
					</option>
				))}
			</select>
			{draft?.kind === "act" ? noteEditor(draft) : <p className="PanelNotes">{zone.actNotes}</p>}
			<select
				className="PanelSelect"
				aria-label="Zone"
				value={zone.zone}
				onChange={(event) => selectZone(event.target.value)}
			>
				{zone.allZonesInAct.map((zoneName) => (
					<option key={zoneName} value={zoneName}>
						{zoneName}
					</option>
				))}
			</select>
			{draft?.kind === "zone"
				? noteEditor(draft)
				: showZoneNotes && <p className="PanelNotes">{zone.zoneNotes}</p>}
		</>
	);

	if (inGuide) {
		return (
			<section className="GuideNotes" aria-label="Act and zone notes">
				{/* On top: the guide's own toolbar covers its bottom edge */}
				{interactive && <div className="GuideNotesActions">{toolbar}</div>}
				{notes}
			</section>
		);
	}

	return (
		<TrackerPanel
			label="Act and zone notes"
			loadPosition={window.electron.getZoneOverlayPositionSettings}
			savePosition={window.electron.saveZoneOverlayPositionSettings}
			toolbar={toolbar}
		>
			{notes}
		</TrackerPanel>
	);
}
