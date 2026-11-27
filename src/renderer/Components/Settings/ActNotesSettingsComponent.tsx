import { ActNote } from "../../../main/zodSchemas/schemas";
import { NotesSettingsApi, NotesSettingsPage } from "./NotesSettingsPage";

const toState = (dto: ActNotesSettingsDto) => ({
	buildName: dto.buildName,
	allBuildNames: dto.allBuildNames,
	notes: dto.allActNotes ?? [],
});

const actNotesApi: NotesSettingsApi<ActNote> = {
	load: () => window.electron.getActNotesSettingsState().then(toState),
	selectBuild: (buildName) => window.electron.postBuildSelectedFromActNotes(buildName).then(toState),
	addBuild: (buildName) => window.electron.postAddNewBuildFromActNotes(buildName).then(toState),
	deleteBuild: (buildName) => window.electron.postDeleteBuildFromActNotes(buildName).then(toState),
	save: (buildName, notes) => window.electron.saveActNotesForBuild({ buildName, allActNotes: notes }).then(toState),
	copyFromBuild: (buildName, buildToCopyName) =>
		window.electron.postCopyActNotesFromBuild({ buildName, buildToCopyName }).then(toState),
	resetNote: (actName) => window.electron.postResetActNoteForAct(actName),
};

const actName = (note: ActNote) => note.actName;

export function ActNotesSettingsComponent({
	onUnsavedChangesChange,
}: {
	onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}) {
	return (
		<NotesSettingsPage
			title="Act Notes"
			api={actNotesApi}
			noteId={actName}
			noteLabel={actName}
			onUnsavedChangesChange={onUnsavedChangesChange}
		/>
	);
}
