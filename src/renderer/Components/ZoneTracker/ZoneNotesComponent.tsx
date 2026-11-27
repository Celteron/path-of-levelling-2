import { useEffect, useState } from "react";
import { TrackerPanel } from "../TrackerPanel";

export function ZoneNotesComponent({ guideShown }: { guideShown: boolean }) {
	const [zone, setZone] = useState<ZoneDataDto | null>(null);

	useEffect(() => {
		// The panel remounts whenever it is toggled, so the listener must not outlive it
		const unsubscribe = window.electron.subscribeToZoneNotesUpdates(setZone);
		window.electron.getZoneState().then(setZone);
		return unsubscribe;
	}, []);

	const selectAct = (actName: string) => window.electron.postActSelected(actName).then(setZone);
	const selectZone = (zoneName: string) =>
		zone && window.electron.postZoneSelected({ zoneSelected: zoneName, actSelected: zone.act }).then(setZone);

	const showZoneNotes = zone && !(guideShown && zone.zoneNotesCoveredByGuide);

	return (
		<TrackerPanel
			label="Act and zone notes"
			loadPosition={window.electron.getZoneOverlayPositionSettings}
			savePosition={window.electron.saveZoneOverlayPositionSettings}
		>
			{zone && (
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
					<p className="PanelNotes">{zone.actNotes}</p>
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
					{showZoneNotes && <p className="PanelNotes">{zone.zoneNotes}</p>}
				</>
			)}
		</TrackerPanel>
	);
}
