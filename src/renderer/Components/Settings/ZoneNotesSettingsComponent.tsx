import { ZoneNote } from "../../../main/zodSchemas/schemas";
import { NotesSettingsApi, NotesSettingsPage } from "./NotesSettingsPage";

const toState = (dto: ZoneNotesSettingsDto) => ({
	buildName: dto.buildName,
	allBuildNames: dto.allBuildNames,
	notes: dto.allZoneNotes ?? [],
});

const zoneNotesApi: NotesSettingsApi<ZoneNote> = {
	load: () => window.electron.getZoneNotesSettingsState().then(toState),
	selectBuild: (buildName) => window.electron.postBuildSelectedFromZoneNotes(buildName).then(toState),
	addBuild: (buildName) => window.electron.postAddNewBuildFromZoneNotes(buildName).then(toState),
	deleteBuild: (buildName) => window.electron.postDeleteBuildFromZoneNotes(buildName).then(toState),
	save: (buildName, notes) => window.electron.saveZoneNotesForBuild({ buildName, allZoneNotes: notes }).then(toState),
	copyFromBuild: (buildName, buildToCopyName) =>
		window.electron.postCopyZoneNotesFromBuild({ buildName, buildToCopyName }).then(toState),
	resetNote: (zoneCode) => window.electron.postResetZoneNoteForZone(zoneCode),
};

// Zone names repeat across acts (e.g. town names), so the zone code identifies a note
const zoneCode = (note: ZoneNote) => note.zoneCode;
const zoneName = (note: ZoneNote) => note.zoneName;

export function ZoneNotesSettingsComponent({
	onUnsavedChangesChange,
}: {
	onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}) {
	return (
		<NotesSettingsPage
			title="Zone Notes"
			api={zoneNotesApi}
			noteId={zoneCode}
			noteLabel={zoneName}
			onUnsavedChangesChange={onUnsavedChangesChange}
		/>
	);
}
