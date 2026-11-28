import type { z } from "zod";
import type { TrackerVisibilityZodSchema } from "../zodSchemas/schemas.js";

export type TrackerVisibility = z.infer<typeof TrackerVisibilityZodSchema>;

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
