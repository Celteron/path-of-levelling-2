import { ChangeEvent, useEffect, useState } from "react";
import { HotkeySettings } from "./HotkeySettings";
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "../../../main/fontSize";

export function GeneralSettingsComponent({
	fontSize,
	setFontSizeFunction,
	overlayOpacity,
	onOverlayOpacityChange,
}: {
	fontSize: number;
	setFontSizeFunction: (n: number) => void;
	overlayOpacity: number;
	onOverlayOpacityChange: (overlayOpacity: number) => void;
}) {
	// Setting up the Client Path inputs
	const [clientPath, setClientPath] = useState("");
	const [isClientPathSaveClicked, setIsClientPathSaveClicked] = useState(false);
	const [isClientWatcherActive, setIsClientWatcherActive] = useState(false);

	// An edited path is not saved yet, so the button goes back to "Save"
	const handleClientPathChange = (event: ChangeEvent<HTMLInputElement>) => {
		setClientPath(event.target.value);
		setIsClientPathSaveClicked(false);
	};

	// Setting up the Font Size inputs
	const [fontSizeInput, setFontSizeInput] = useState(String(fontSize));

	useEffect(() => {
		setFontSizeInput(String(fontSize));
	}, [fontSize]);

	const handleSaveFontSize = () => {
		const parsed = parseInt(fontSizeInput, 10);
		if (isNaN(parsed)) return;
		// Main keeps the old size for sizes out of bounds, so apply what it saved
		window.electron.saveFontSize(parsed).then((saved) => {
			setFontSizeFunction(saved);
			setFontSizeInput(String(saved));
		});
	};

	const handleOverlayOpacityChange = (percent: string) => {
		const opacity = Number(percent) / 100;
		onOverlayOpacityChange(opacity);
		window.electron.saveOverlayOpacity(opacity);
	};

	// Get initial state - this is required for the input to show the current client path.
	useEffect(() => {
		window.electron.getClientPath().then((clientPath) => {
			setClientPath(clientPath);
		});
	}, []);

	// Post the clientPath provided by the user and get a bool saying whether or not the
	// log watcher was activated.
	const handleSaveClientPathClicked = () => {
		window.electron.saveClientPath(clientPath).then((isWatcherActive) => {
			setIsClientWatcherActive(isWatcherActive);
			setIsClientPathSaveClicked(true);
		});
	};

	// Get initial state for whether or not the client log reader was attached.
	useEffect(() => {
		window.electron.getIsClientWatcherActive().then((isClientWatcherActive: boolean) => {
			setIsClientWatcherActive(isClientWatcherActive);
		});
	}, []);

	// Folder of the CSV file that every finished campaign run is appended to
	const [campaignRunsFolder, setCampaignRunsFolder] = useState("");
	useEffect(() => {
		window.electron.getCampaignRunsFolder().then(setCampaignRunsFolder);
	}, []);

	const getClientPathSaveButtonText = () => {
		if (isClientPathSaveClicked) {
			return "Saved!";
		}
		return "Save";
	};

	const conditionalDisplayClientWatcherWarning = () => {
		if (isClientWatcherActive) {
			return;
		}

		return (
			<p className="ClientWatcherNotActiveWarning">
				Cannot access Path Of Exile 2 logs! Please update your path!
			</p>
		);
	};

	return (
		<div className="GeneralSettingsComponent">
			<h3>General Settings</h3>
			<div className="FontSizeUpdaterWrapper">
				<label className="SettingsLabel" htmlFor="font-size">
					Font Size:
				</label>
				<input
					id="font-size"
					className="FontSizeInput"
					name="fontSize"
					value={fontSizeInput}
					onChange={(e) => setFontSizeInput(e.target.value)}
					type="number"
					min={FONT_SIZE_MIN}
					max={FONT_SIZE_MAX}
				/>
				<button onClick={handleSaveFontSize} style={{ marginLeft: 8 }} aria-label="Save font size">
					Save
				</button>
			</div>
			<div className="OverlayOpacityWrapper">
				<label className="SettingsLabel" htmlFor="overlay-opacity">
					Window opacity
				</label>
				<input
					id="overlay-opacity"
					type="range"
					min={20}
					max={100}
					step={5}
					value={Math.round(overlayOpacity * 100)}
					onChange={(e) => handleOverlayOpacityChange(e.target.value)}
				/>
				<span>{Math.round(overlayOpacity * 100)}%</span>
			</div>
			<HotkeySettings />
			<div className="CampaignRunsFolderWrapper">
				<label className="SettingsLabel" htmlFor="campaign-runs-folder">
					Campaign runs folder
				</label>
				<input
					id="campaign-runs-folder"
					className="ClientPathInput"
					value={campaignRunsFolder}
					onChange={(e) => setCampaignRunsFolder(e.target.value)}
					title="Finished runs are added to a CSV file in this folder. Leave empty for Documents/PoL2."
				/>
				<button
					aria-label="Save campaign runs folder"
					onClick={() =>
						window.electron.saveCampaignRunsFolder(campaignRunsFolder).then(setCampaignRunsFolder)
					}
				>
					Save
				</button>
			</div>
			<div className="ClientPathUpdaterWrapper">
				<h3>Enter your Client.txt Path here</h3>
				<div>
					<p>Required for automatic updating. Path should look like this:</p>
					<p>{"<path-to-steam>"}/steamapps/common/Path of Exile 2/logs/Client.txt</p>
					{conditionalDisplayClientWatcherWarning()}
					<label className="SettingsLabel">
						Path:
						<input
							autoComplete={clientPath}
							className="ClientPathInput"
							name="clientPath"
							value={clientPath}
							onChange={handleClientPathChange}
						/>
						<button
							className="SaveClientPathSettingsButton"
							title="saveClientPath"
							onClick={handleSaveClientPathClicked}
						>
							{getClientPathSaveButtonText()}
						</button>
					</label>
				</div>
			</div>
		</div>
	);
}
