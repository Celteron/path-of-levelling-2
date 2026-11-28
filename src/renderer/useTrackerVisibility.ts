import { useEffect, useState } from "react";

type TrackerHotkey = Exclude<HotkeyEvent["hotkey"], "ToggleSettings">;

// Fails to compile when a tracker hotkey is added without its field here
const FIELD_OF_HOTKEY: Record<TrackerHotkey, keyof TrackerVisibility> = {
	ToggleZoneNotes: "zoneNotesOpen",
	ToggleLayoutImages: "layoutImagesOpen",
	ToggleLevelTracker: "levelTrackerOpen",
	ToggleGemTracker: "gemTrackerOpen",
	ToggleGuide: "guideOpen",
};

/**
 * Whether the settings are open and which trackers are shown, as main keeps them. The trackers stay
 * hidden (null) until main reports the visibility saved at the last app start, so windows the user
 * hid never flash up.
 */
export function useTrackerVisibility(): { settingsOpen: boolean; visibility: TrackerVisibility | null } {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [visibility, setVisibility] = useState<TrackerVisibility | null>(null);

	useEffect(() => {
		// Hotkeys pressed before the saved state arrives are newer than it
		const liveChanges: Partial<TrackerVisibility> = {};
		window.electron.subscribeToHotkeys(({ hotkey, value }) => {
			if (hotkey === "ToggleSettings") {
				setSettingsOpen(value);
				return;
			}
			liveChanges[FIELD_OF_HOTKEY[hotkey]] = value;
			setVisibility((current) => current && { ...current, [FIELD_OF_HOTKEY[hotkey]]: value });
		});
		window.electron.getTrackerVisibility().then((saved) => setVisibility({ ...saved, ...liveChanges }));
	}, []);

	return { settingsOpen, visibility };
}
