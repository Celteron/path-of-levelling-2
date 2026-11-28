import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useConfirmDiscardUnsavedChanges, useUnsavedChanges } from "./unsavedChanges";
import { useConfirm } from "../useConfirm";
import { LockNoteOption } from "../../../main/zodSchemas/schemas";
import { BUILD_NAME_MAX_LENGTH, parseBuildName } from "../../../main/buildName";

type EditableNote = { lockNoteOption: LockNoteOption; notes: string };

export type NotesSettingsState<Note> = { buildName: string; allBuildNames: string[]; notes: Note[] };

/** Main process calls behind a notes page; every build change returns the new page state */
export type NotesSettingsApi<Note> = {
	load: () => Promise<NotesSettingsState<Note>>;
	selectBuild: (buildName: string) => Promise<NotesSettingsState<Note>>;
	addBuild: (buildName: string) => Promise<NotesSettingsState<Note>>;
	deleteBuild: (buildName: string) => Promise<NotesSettingsState<Note>>;
	save: (buildName: string, notes: Note[]) => Promise<NotesSettingsState<Note>>;
	copyFromBuild: (buildName: string, buildToCopyName: string) => Promise<NotesSettingsState<Note>>;
	/** Returns the shipped default of one note */
	resetNote: (noteId: string) => Promise<Note>;
};

const ADD_BUILD = "__add__";

function getLockButtonProps(lockNoteOption: LockNoteOption, notesName: string) {
	switch (lockNoteOption) {
		case "unlocked":
			return {
				label: "Automatically Update",
				title: "Notes will update when the app is updated. Click to lock.",
				disabled: false,
			};
		case "locked":
			return {
				label: "Do Not Update",
				title: "Notes will not update when the app is updated. Click to unlock.",
				disabled: false,
			};
		case "lockedCannotUnlock":
			return {
				label: "Cannot Update (Custom Notes)",
				title: `Custom ${notesName} cannot be updated. Reset this note for updates.`,
				disabled: true,
			};
	}
}

/**
 * Settings page to edit one kind of notes (act or zone notes) per build: pick, add or delete a
 * build, copy the notes of another build, edit, lock or reset single notes and save them.
 */
export function NotesSettingsPage<Note extends EditableNote>({
	title,
	api,
	noteId,
	noteLabel,
	onUnsavedChangesChange,
}: {
	/** Page heading, e.g. "Act Notes" */
	title: string;
	api: NotesSettingsApi<Note>;
	/** Unique key of a note, sent to resetNote. Pass a stable function: it is an effect dependency. */
	noteId: (note: Note) => string;
	noteLabel: (note: Note) => string;
	onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}) {
	const [selectedBuild, setSelectedBuild] = useState("");
	const [allBuildNames, setAllBuildNames] = useState<string[]>([]);
	const [addingBuild, setAddingBuild] = useState(false);
	const [newBuildName, setNewBuildName] = useState("");
	const [buildToCopyName, setBuildToCopyName] = useState("");

	const [editableNotes, setEditableNotes] = useState<Note[]>([]);
	// Last state loaded from/saved to main, to detect unsaved edits
	const [savedNotes, setSavedNotes] = useState<Note[]>([]);
	const confirm = useConfirm();
	const confirmDiscard = useConfirmDiscardUnsavedChanges();
	const hasUnsavedChanges = useUnsavedChanges(savedNotes, editableNotes, onUnsavedChangesChange);

	const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
	const containerRef = useRef<HTMLDivElement | null>(null);
	// Loaded once per mount, independent of the identity of the api passed in
	const loadOnMount = useRef(api.load);

	const loadNotes = (notes: Note[]) => {
		setEditableNotes(notes);
		setSavedNotes(notes);
	};
	const loadState = (state: NotesSettingsState<Note>) => {
		setSelectedBuild(state.buildName);
		setBuildToCopyName(""); // the chosen build may have been deleted or selected
		setAllBuildNames(state.allBuildNames);
		loadNotes(state.notes);
	};

	useEffect(() => {
		loadOnMount.current().then((state) => {
			// The stored build may have been deleted meanwhile
			setSelectedBuild(state.allBuildNames.includes(state.buildName) ? state.buildName : "Default");
			setAllBuildNames(state.allBuildNames);
			setEditableNotes(state.notes);
			setSavedNotes(state.notes);
		});
	}, []);

	const parsedNewBuildName = parseBuildName(newBuildName);
	const canAddBuild = parsedNewBuildName !== undefined && !allBuildNames.includes(parsedNewBuildName);
	const notesName = title.toLowerCase();
	const canCopy = buildToCopyName !== selectedBuild && allBuildNames.includes(buildToCopyName);

	const handleBuildDropdownSelection = async (event: ChangeEvent<HTMLSelectElement>) => {
		// Read before awaiting: React resets the controlled select to the current build meanwhile
		const value = event.target.value;
		if (!(await confirmDiscard(hasUnsavedChanges))) return;
		if (value === ADD_BUILD) {
			setAddingBuild(true);
			setNewBuildName("");
		} else {
			setAddingBuild(false);
			api.selectBuild(value).then(loadState);
		}
	};

	const handleAddBuild = () => {
		if (parsedNewBuildName === undefined || !canAddBuild) return;
		api.addBuild(parsedNewBuildName).then((state) => {
			loadState(state);
			setAddingBuild(false);
			setNewBuildName("");
		});
	};

	const handleDeleteBuild = async () => {
		if (selectedBuild && (await confirm(`Delete build "${selectedBuild}"? This cannot be undone.`, "Delete"))) {
			api.deleteBuild(selectedBuild).then(loadState);
		}
	};

	const handleCopyFromBuild = async () => {
		if (!canCopy) return;
		// Copying saves right away, over the saved notes and any unsaved edits on this page
		const question = `Replace the ${notesName} of "${selectedBuild}" with those of "${buildToCopyName}"? Unsaved changes are lost.`;
		if (!(await confirm(question, "Replace"))) return;
		api.copyFromBuild(selectedBuild, buildToCopyName).then((state) => loadNotes(state.notes));
	};

	// Replaces one note and keeps the others, including their unsaved edits
	const updateNote = (id: string, update: (note: Note) => Note) =>
		setEditableNotes((notes) => notes.map((note) => (noteId(note) === id ? update(note) : note)));

	/** Notes edited in the overlay since this page loaded win, unless they were edited here too */
	const handleSave = async () => {
		const latest = await api.load();
		const editedHere = (note: Note) => {
			const saved = savedNotes.find((savedNote) => noteId(savedNote) === noteId(note));
			return saved?.notes !== note.notes || saved.lockNoteOption !== note.lockNoteOption;
		};
		const notes =
			latest.buildName === selectedBuild
				? editableNotes.map((note) =>
						editedHere(note)
							? note
							: (latest.notes.find((latestNote) => noteId(latestNote) === noteId(note)) ?? note),
					)
				: editableNotes;
		api.save(selectedBuild, notes).then((state) => loadNotes(state.notes));
	};

	const handleReset = (id: string) => {
		api.resetNote(id).then((defaultNote) => updateNote(id, () => defaultNote));
	};

	const handleLockToggle = (id: string, lockNoteOption: LockNoteOption) => {
		if (lockNoteOption === "lockedCannotUnlock") return;
		updateNote(id, (note) => ({ ...note, lockNoteOption: lockNoteOption === "unlocked" ? "locked" : "unlocked" }));
	};

	/** Grows a textarea to its content without letting the page scroll jump */
	const autoResize = (id: string) => {
		const textarea = textareaRefs.current[id];
		const container = containerRef.current;
		if (!textarea || !container) return;

		const previousScrollTop = container.scrollTop;
		const previousScrollHeight = container.scrollHeight;
		const { selectionStart, selectionEnd } = textarea;

		textarea.style.height = "auto";
		textarea.style.height = textarea.scrollHeight + "px";
		textarea.selectionStart = selectionStart;
		textarea.selectionEnd = selectionEnd;

		// Keep the caret in view when the textarea grew
		const scrollDiff = container.scrollHeight - previousScrollHeight;
		if (scrollDiff > 0) container.scrollTop = previousScrollTop + scrollDiff;
	};

	useEffect(() => {
		editableNotes.forEach((note) => autoResize(noteId(note)));
	}, [editableNotes, noteId]);

	const renderNoteBlock = (note: Note) => {
		const id = noteId(note);
		const label = noteLabel(note);
		const lockButton = getLockButtonProps(note.lockNoteOption, notesName);
		return (
			<div key={id} className="NotesSettingsBlock">
				<label>
					{label}
					<textarea
						ref={(element) => {
							textareaRefs.current[id] = element;
						}}
						value={note.notes ?? ""}
						onChange={(event) => updateNote(id, (current) => ({ ...current, notes: event.target.value }))}
						className="NotesSettingsTextarea"
						style={{ overflow: "hidden", resize: "vertical" }}
					/>
				</label>
				<button
					type="button"
					className={`NotesSettingsLockButton NotesSettingsLockButton--${note.lockNoteOption}`}
					onClick={() => handleLockToggle(id, note.lockNoteOption)}
					title={lockButton.title}
					disabled={lockButton.disabled}
				>
					{lockButton.label}
				</button>
				<button
					type="button"
					className="NotesSettingsResetButton"
					onClick={() => handleReset(id)}
					title={`Reset the notes for ${label} to the default`}
				>
					Reset
				</button>
			</div>
		);
	};

	return (
		<div className="NotesSettingsComponent" ref={containerRef}>
			<h3>{title}</h3>

			<div className="NotesSettingsBuildRow">
				<label htmlFor="build-select">Select Build:</label>
				<select
					id="build-select"
					value={addingBuild ? ADD_BUILD : selectedBuild}
					onChange={handleBuildDropdownSelection}
					className="NotesSettingsBuildSelect"
				>
					{allBuildNames.map((buildName) => (
						<option key={buildName} value={buildName}>
							{buildName}
						</option>
					))}
					<option value={ADD_BUILD}>Add build...</option>
				</select>
				{/* Default is the fallback of every other build and cannot be deleted */}
				{!addingBuild && selectedBuild !== "Default" && (
					<button
						type="button"
						className="NotesSettingsDeleteBuildButton"
						onClick={handleDeleteBuild}
						title="Delete current build"
					>
						Delete Build
					</button>
				)}
			</div>

			{!addingBuild && (
				<div className="NotesSettingsCopyRow">
					<button
						type="button"
						className="NotesSettingsCopyButton"
						onClick={handleCopyFromBuild}
						disabled={!canCopy}
						title={`Copy ${notesName} from another build`}
					>
						Copy {title} From:
					</button>
					<select
						className="NotesSettingsCopySelect"
						value={buildToCopyName}
						onChange={(event) => setBuildToCopyName(event.target.value)}
					>
						<option value="">Select build...</option>
						{allBuildNames
							.filter((name) => name !== selectedBuild)
							.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
					</select>
				</div>
			)}

			{addingBuild && (
				<div className="NotesSettingsAddBuildContainer">
					<input
						type="text"
						value={newBuildName}
						onChange={(event) => setNewBuildName(event.target.value)}
						placeholder="Enter new build name"
						maxLength={BUILD_NAME_MAX_LENGTH}
						className="NotesSettingsAddBuildInput"
					/>
					<button
						type="button"
						className="NotesSettingsAddBuildButton"
						onClick={handleAddBuild}
						disabled={!canAddBuild}
					>
						Create
					</button>
				</div>
			)}

			<div className="NotesSettingsBlocksContainer">{editableNotes.map(renderNoteBlock)}</div>

			<div className="NotesSettingsBanner">
				<button type="button" className="NotesSettingsSaveButton" onClick={handleSave}>
					Save
				</button>
			</div>
		</div>
	);
}
