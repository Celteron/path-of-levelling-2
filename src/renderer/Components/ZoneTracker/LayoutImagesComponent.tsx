import { useEffect, useState } from "react";
import { TrackerPanel } from "../TrackerPanel";

export function LayoutImagesComponent() {
	const [filePaths, setFilePaths] = useState<string[]>([]);
	// Main sends [""] for zones without layout images
	const images = filePaths.filter((filePath) => filePath !== "");

	useEffect(() => {
		// The panel remounts whenever it is toggled, so the listener must not outlive it
		const unsubscribe = window.electron.subscribeToZoneLayoutImageUpdates(setFilePaths);
		window.electron.getLayoutImagePaths().then(setFilePaths);
		return unsubscribe;
	}, []);

	return (
		<TrackerPanel
			label="Zone layouts"
			collapsed={images.length === 0}
			loadPosition={window.electron.getLayoutImagesOverlayPositionSettings}
			savePosition={window.electron.saveLayoutImagesOverlayPositionSettings}
		>
			{images.length === 0 ? (
				<p className="PanelMuted PanelEmpty">No layout for this zone</p>
			) : (
				<div className="LayoutImageRow">
					{images.map((filePath, index) => (
						<img
							key={filePath}
							className="LayoutImage"
							src={filePath}
							alt={`Zone layout ${index + 1} of ${images.length}`}
							draggable={false}
						/>
					))}
				</div>
			)}
		</TrackerPanel>
	);
}
