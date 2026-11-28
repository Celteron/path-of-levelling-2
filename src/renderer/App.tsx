import { CSSProperties, useEffect, useState } from "react";
import "./App.css";
import { GemTrackerComponent } from "./Components/GemTrackerComponent";
import { GuideTrackerComponent } from "./Components/GuideTrackerComponent";
import { LevelTrackerComponent } from "./Components/LevelTrackerComponent";
import { SettingsComponent } from "./Components/Settings/SettingsComponent";
import { ZoneNotesComponent } from "./Components/ZoneTracker/ZoneNotesComponent";
import { LayoutImagesComponent } from "./Components/ZoneTracker/LayoutImagesComponent";
import { useInGameWorld } from "./useInGameWorld";
import { useTrackerVisibility } from "./useTrackerVisibility";
import { ConfirmProvider } from "./Components/ConfirmDialog";
import { OverlayInteractiveContext } from "./Components/overlayInteractive";

function App() {
	const { settingsOpen: settingsActive, visibility } = useTrackerVisibility();
	// Trackers are hidden on the login/character select screen, but stay visible while the
	// settings are open so they can still be moved and resized there.
	const inGameWorld = useInGameWorld();
	const showTrackers = inGameWorld || settingsActive;
	// One window less: the notes sit inside the guide while it is shown
	const renderNotes = (inGuide: boolean) => visibility?.zoneNotesOpen && <ZoneNotesComponent inGuide={inGuide} />;

	const [fontSize, setFontSize] = useState(11);
	const [overlayOpacity, setOverlayOpacity] = useState(0.85);

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
					<SettingsComponent
						shown={settingsActive}
						fontSize={fontSize}
						setFontSizeFunction={setFontSize}
						overlayOpacity={overlayOpacity}
						onOverlayOpacityChange={setOverlayOpacity}
					/>
					{showTrackers && visibility && (
						<>
							{!visibility.guideOpen && renderNotes(false)}
							{visibility.layoutImagesOpen && <LayoutImagesComponent />}
							{visibility.levelTrackerOpen && <LevelTrackerComponent />}
							{visibility.gemTrackerOpen && <GemTrackerComponent />}
							{visibility.guideOpen && <GuideTrackerComponent renderNotes={renderNotes} />}
						</>
					)}
				</ConfirmProvider>
			</OverlayInteractiveContext.Provider>
		</div>
	);
}

export default App;
