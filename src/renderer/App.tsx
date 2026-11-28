import { CSSProperties, useEffect, useState } from "react";
import "./App.css";
import { GemTrackerComponent } from "./Components/GemTrackerComponent";
import { GuideTrackerComponent } from "./Components/GuideTrackerComponent";
import { LevelTrackerComponent } from "./Components/LevelTrackerComponent";
import { SettingsComponent } from "./Components/Settings/SettingsComponent";
import { ZoneNotesComponent } from "./Components/ZoneTracker/ZoneNotesComponent";
import { LayoutImagesComponent } from "./Components/ZoneTracker/LayoutImagesComponent";
import { useInGameWorld } from "./useInGameWorld";
import { ConfirmProvider } from "./Components/ConfirmDialog";
import { OverlayInteractiveContext } from "./Components/overlayInteractive";

function App() {
	const [settingsActive, setSettingsActive] = useState(false);
	const [zoneNotesActive, setZoneNotesActive] = useState(true);
	const [layoutImagesActive, setLayoutImagesActive] = useState(true);
	const [levelTrackerActive, setLevelTrackerActive] = useState(true);
	const [gemTrackerActive, setGemTrackerActive] = useState(true);
	const [guideActive, setGuideActive] = useState(true);
	// Trackers are hidden on the login/character select screen, but stay visible while the
	// settings are open so they can still be moved and resized there.
	const inGameWorld = useInGameWorld();
	const showTrackers = inGameWorld || settingsActive;
	// One window less: the notes sit inside the guide while it is shown
	const renderNotes = (inGuide: boolean) => zoneNotesActive && <ZoneNotesComponent inGuide={inGuide} />;

	const [fontSize, setFontSize] = useState(11);
	const [overlayOpacity, setOverlayOpacity] = useState(0.85);

	useEffect(() => {
		window.electron.subscribeToHotkeys((hotkeyEvent) => {
			switch (hotkeyEvent.hotkey) {
				case "ToggleSettings":
					setSettingsActive(hotkeyEvent.value);
					break;
				case "ToggleZoneNotes":
					setZoneNotesActive(hotkeyEvent.value);
					break;
				case "ToggleLayoutImages":
					setLayoutImagesActive(hotkeyEvent.value);
					break;
				case "ToggleLevelTracker":
					setLevelTrackerActive(hotkeyEvent.value);
					break;
				case "ToggleGemTracker":
					setGemTrackerActive(hotkeyEvent.value);
					break;
				case "ToggleGuide":
					setGuideActive(hotkeyEvent.value);
					break;
				default: {
					// Fails to compile when a hotkey is added without a case here
					const unhandled: never = hotkeyEvent.hotkey;
					return unhandled;
				}
			}
		});
	}, []);

	useEffect(() => {
		window.electron.getFontSize().then(setFontSize);
		window.electron.getOverlayOpacity().then(setOverlayOpacity);
	}, []);

	// Panels read the opacity from this custom property
	const overlayStyle = { fontSize, "--panel-opacity": overlayOpacity } as CSSProperties;

	return (
		<div style={overlayStyle} className={settingsActive ? "overlay-container-shown" : "overlay-container-hidden"}>
			<OverlayInteractiveContext.Provider value={settingsActive}>
				<ConfirmProvider>
					{settingsActive && (
						<SettingsComponent
							fontSize={fontSize}
							setFontSizeFunction={setFontSize}
							overlayOpacity={overlayOpacity}
							onOverlayOpacityChange={setOverlayOpacity}
						/>
					)}
					{showTrackers && (
						<>
							{!guideActive && renderNotes(false)}
							{layoutImagesActive && <LayoutImagesComponent />}
							{levelTrackerActive && <LevelTrackerComponent />}
							{gemTrackerActive && <GemTrackerComponent />}
							{guideActive && <GuideTrackerComponent renderNotes={renderNotes} />}
						</>
					)}
				</ConfirmProvider>
			</OverlayInteractiveContext.Provider>
		</div>
	);
}

export default App;
