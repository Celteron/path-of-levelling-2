import React, { useState, useEffect } from "react";
import { GemSetup } from "../../../main/zodSchemas/schemas";
import { useConfirmDiscardUnsavedChanges, useUnsavedChanges } from "./unsavedChanges";
import { useConfirm } from "../useConfirm";

export function GemSettingsComponent({
	onUnsavedChangesChange,
}: {
	onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}) {
	const [selectedBuild, setSelectedBuild] = useState("");
	const [allBuildNames, setAllBuildNames] = useState<string[]>([]);
	const [addingBuild, setAddingBuild] = useState(false);
	const [newBuildName, setNewBuildName] = useState("");

	const [allGemSetups, setallGemSetups] = useState<GemSetup[]>([]);
	const [editableGemSetups, setEditableGemSetups] = useState<GemSetup[]>([]);
	const [pobInput, setPobInput] = useState("");
	const [pobImportError, setPobImportError] = useState("");
	// allGemSetups is the last state loaded from/saved to main
	const confirm = useConfirm();
	const confirmDiscard = useConfirmDiscardUnsavedChanges();
	const hasUnsavedChanges = useUnsavedChanges(allGemSetups, editableGemSetups, onUnsavedChangesChange);

	// Get initial state for gem dropdown
	useEffect(() => {
		window.electron.getGemSettingsState().then((response) => {
			if (!response.allBuildNames.includes(response.buildName)) {
				response.buildName = "Default";
			}

			setSelectedBuild(response.buildName);
			setAllBuildNames(response.allBuildNames);
			setallGemSetups(response.allGemSetups);
			setEditableGemSetups(
				response.allGemSetups.map((setup: GemSetup) => ({
					...setup,
					gemLinks: [...setup.gemLinks],
				})),
			);
		});
	}, []);

	const handleBuildDropdownSelection = async (event: React.ChangeEvent<HTMLSelectElement>) => {
		const value = event.target.value;
		if (!(await confirmDiscard(hasUnsavedChanges))) return;
		if (value === "__add__") {
			setAddingBuild(true);
			setNewBuildName("");
		} else {
			setAddingBuild(false);
			// Post the change to main process and get back the new build selected
			window.electron.postBuildSelected(event.target.value).then((response) => {
				setSelectedBuild(response.buildName);
				setAllBuildNames(response.allBuildNames);
				setallGemSetups(response.allGemSetups);
				setEditableGemSetups(
					response.allGemSetups.map((setup: GemSetup) => ({
						...setup,
						gemLinks: [...setup.gemLinks],
					})),
				);
			});
		}
	};

	const handleAddBuild = () => {
		if (!newBuildName.trim() || allBuildNames.includes(newBuildName.trim())) return;
		window.electron.postAddNewBuild(newBuildName.trim()).then((response) => {
			setSelectedBuild(response.buildName);
			setAllBuildNames(response.allBuildNames);
			setallGemSetups(response.allGemSetups);
			setEditableGemSetups(
				response.allGemSetups.map((setup: GemSetup) => ({
					...setup,
					gemLinks: [...setup.gemLinks],
				})),
			);
			setAddingBuild(false);
			setNewBuildName("");
		});
	};

	// Save handler for the banner button
	const handleSaveBuild = () => {
		const response = {
			buildName: selectedBuild,
			allGemSetups: editableGemSetups,
		};

		// Send updated gem setups and reload
		window.electron.saveGemSetupsForBuild(response).then((response) => {
			setSelectedBuild(response.buildName);
			setAllBuildNames(response.allBuildNames);
			setallGemSetups(response.allGemSetups);
			setEditableGemSetups(
				response.allGemSetups.map((setup: GemSetup) => ({
					...setup,
					gemLinks: [...setup.gemLinks],
				})),
			);
		});
	};

	const handleDeleteBuild = async () => {
		if (selectedBuild && (await confirm(`Delete build "${selectedBuild}"? This cannot be undone.`, "Delete"))) {
			window.electron.postDeleteBuild(selectedBuild).then((response) => {
				setSelectedBuild(response.buildName);
				setAllBuildNames(response.allBuildNames);
				setallGemSetups(response.allGemSetups);
				setEditableGemSetups(
					response.allGemSetups.map((setup: GemSetup) => ({
						...setup,
						gemLinks: [...setup.gemLinks],
					})),
				);
			});
		}
	};

	// Handle edits to level
	const pobImportErrors: Record<"invalidInput" | "downloadFailed" | "noPoe2Gems", string> = {
		invalidInput: "Paste a PoB export code or a pobb.in/pastebin link.",
		downloadFailed: "Could not download the build. Check the link and your connection.",
		noPoe2Gems: "No PoE2 skill sets with gems found in this build.",
	};

	/** Replaces the editor content with the imported setups, the user saves them explicitly */
	const handleImportPob = () => {
		window.electron.postImportPob(pobInput).then((result) => {
			if (!result.ok) {
				setPobImportError(pobImportErrors[result.error]);
				return;
			}
			setEditableGemSetups(result.gemSetups);
			setPobImportError("");
			setPobInput("");
		});
	};

	const handleLevelChange = (index: number, value: number) => {
		const newSetups = editableGemSetups.map((setup, i) => (i === index ? { ...setup, level: value } : setup));
		setEditableGemSetups(newSetups);
	};

	// Handle edits to gemLinks
	const handleGemLinksChange = (index: number, value: string) => {
		const linksArray = value.split("\n");
		const newSetups = editableGemSetups.map((setup, i) =>
			i === index ? { ...setup, gemLinks: linksArray } : setup,
		);
		setEditableGemSetups(newSetups);
	};

	return (
		<div className="GemSettingsComponent">
			<h3>Gems Settings</h3>
			<div className="GemSettingsBuildRow">
				<label htmlFor="build-select">Select Build:</label>
				<select
					id="build-select"
					value={addingBuild ? "__add__" : selectedBuild}
					onChange={handleBuildDropdownSelection}
					className="GemSettingsBuildSelect"
				>
					{allBuildNames.map((buildName) => (
						<option key={buildName} value={buildName}>
							{buildName}
						</option>
					))}
					<option value="__add__">Add build...</option>
				</select>
				{!addingBuild && (
					<button
						className="GemSettingsDeleteBuildButton"
						onClick={handleDeleteBuild}
						title="Delete current build"
					>
						Delete Build
					</button>
				)}
			</div>
			{addingBuild && (
				<div className="GemSettingsAddBuildContainer">
					<input
						type="text"
						value={newBuildName}
						onChange={(e) => setNewBuildName(e.target.value)}
						placeholder="Enter new build name"
						className="GemSettingsAddBuildInput"
					/>
					<button
						className="GemSettingsAddBuildButton"
						onClick={handleAddBuild}
						disabled={!newBuildName.trim() || allBuildNames.includes(newBuildName.trim())}
					>
						Create
					</button>
				</div>
			)}
			{!addingBuild && (
				<div className="GemSettingsBuildRow">
					<input
						type="text"
						value={pobInput}
						onChange={(e) => setPobInput(e.target.value)}
						placeholder="Paste PoB code or pobb.in link"
						aria-label="PoB export code or pobb.in/pastebin link"
						className="GemSettingsPobImportInput"
					/>
					<button onClick={handleImportPob} disabled={!pobInput.trim()}>
						Import from PoB
					</button>
				</div>
			)}
			{pobImportError && (
				<div role="alert" className="GemSettingsPobImportError">
					{pobImportError}
				</div>
			)}
			<div className="GemSettingsBlocksContainer">
				{editableGemSetups.map((setup, idx) => (
					<div key={idx} className="GemSettingsBlock">
						<label>
							Level:&nbsp;
							<input
								type="number"
								value={setup.level}
								onChange={(e) => handleLevelChange(idx, Number(e.target.value))}
								className="GemSettingsLevelInput"
							/>
						</label>
						<label>
							<textarea
								value={setup.gemLinks.join("\n")}
								onChange={(e) => handleGemLinksChange(idx, e.target.value)}
								rows={setup.gemLinks.length || 2}
								className="GemSettingsLinksTextarea"
							/>
						</label>
						<button
							className="GemSettingsRemoveBlockButton"
							onClick={() => {
								setEditableGemSetups(editableGemSetups.filter((_, i) => i !== idx));
							}}
							title="Remove block"
						>
							&times;
						</button>
					</div>
				))}
				<button
					className="GemSettingsAddBlockButton"
					onClick={() => {
						const lastLevel =
							editableGemSetups.length > 0 ? editableGemSetups[editableGemSetups.length - 1].level : 0;
						setEditableGemSetups([
							...editableGemSetups,
							{ level: lastLevel + 1, gemLinks: [], gemSources: [] },
						]);
					}}
				>
					+ Add Gem Setup
				</button>
			</div>
			<div className="GemSettingsBanner">
				<button className="GemSettingsSaveButton" onClick={handleSaveBuild}>
					Save
				</button>
			</div>
		</div>
	);
}
