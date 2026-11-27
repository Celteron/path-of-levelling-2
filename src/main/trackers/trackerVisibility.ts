export interface TrackerVisibility {
	zoneNotesOpen: boolean;
	layoutImagesOpen: boolean;
	levelTrackerOpen: boolean;
	gemTrackerOpen: boolean;
	guideOpen: boolean;
}

/**
 * Hides all trackers if all are shown, otherwise shows all of them (#3): one hotkey gives a quick
 * peek at everything even when single trackers were hidden before.
 */
export function toggleAllTrackers(visibility: TrackerVisibility): TrackerVisibility {
	// Named fields instead of Object.values: callers pass the whole StateTracker
	const { zoneNotesOpen, layoutImagesOpen, levelTrackerOpen, gemTrackerOpen, guideOpen } = visibility;
	const open = !(zoneNotesOpen && layoutImagesOpen && levelTrackerOpen && gemTrackerOpen && guideOpen);
	return {
		zoneNotesOpen: open,
		layoutImagesOpen: open,
		levelTrackerOpen: open,
		gemTrackerOpen: open,
		guideOpen: open,
	};
}
