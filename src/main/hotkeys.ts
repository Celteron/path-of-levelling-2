// Shared by the main process and the renderer, so it must stay free of Node and Electron imports

/** Every global hotkey, in the order the settings list them */
export const HOTKEY_LABELS = {
	toggleSettings: "Show/hide settings",
	toggleZoneNotes: "Show/hide zone notes",
	toggleLayoutImages: "Show/hide layout images",
	toggleLevelTracker: "Show/hide level tracker",
	toggleGemTracker: "Show/hide gem tracker",
	toggleGuide: "Show/hide leveling guide",
	guideNext: "Leveling guide next page",
	guidePrevious: "Leveling guide previous page",
	toggleAllTrackers: "Show/hide all trackers",
	toggleTimer: "Pause/resume campaign timer",
} as const;

export type HotkeyAction = keyof typeof HOTKEY_LABELS;
export type Hotkeys = Record<HotkeyAction, string>;

export const DEFAULT_HOTKEYS: Hotkeys = {
	toggleSettings: "Ctrl+Alt+S",
	toggleZoneNotes: "Ctrl+Alt+Z",
	toggleLayoutImages: "Ctrl+Alt+I",
	toggleLevelTracker: "Ctrl+Alt+L",
	toggleGemTracker: "Ctrl+Alt+G",
	toggleGuide: "Ctrl+Alt+J",
	guideNext: "Ctrl+Alt+N",
	guidePrevious: "Ctrl+Alt+B",
	toggleAllTrackers: "Ctrl+Alt+A",
	toggleTimer: "Ctrl+Alt+P",
};

export const HOTKEY_ACTIONS = Object.keys(HOTKEY_LABELS) as HotkeyAction[];

export const HOTKEY_RULE = "Use Ctrl or Alt (and maybe Shift) with a letter, a digit or F1–F24";

/**
 * Ctrl or Alt is required: without them the hotkey would fire while typing in the game chat.
 * Only letters, digits and F-keys, the keys every keyboard layout and Electron agree on.
 */
export function isValidAccelerator(accelerator: unknown): accelerator is string {
	return (
		typeof accelerator === "string" &&
		/^(?=.*(Ctrl|Alt)\+)(Ctrl\+)?(Alt\+)?(Shift\+)?([A-Z0-9]|F([1-9]|1\d|2[0-4]))$/i.test(accelerator)
	);
}

/**
 * The accelerator for a key press, or undefined while it is no valid hotkey (e.g. modifiers only).
 * The letter comes from the key, so a QWERTZ Z is Z; when AltGr (= Ctrl+Alt on Windows) turns it
 * into another character, the physical key is used instead.
 */
export function acceleratorFromKeyEvent(event: KeyboardEvent): string | undefined {
	const typed = /^[a-z0-9]$/i.test(event.key) ? event.key.toUpperCase() : undefined;
	const physical = /^(Key([A-Z])|Digit([0-9])|(F\d{1,2}))$/.exec(event.code);
	const key = typed ?? (physical && (physical[2] ?? physical[3] ?? physical[4]));
	if (!key) return undefined;

	const modifiers = [event.ctrlKey && "Ctrl", event.altKey && "Alt", event.shiftKey && "Shift"].filter(Boolean);
	const accelerator = [...modifiers, key].join("+");
	return isValidAccelerator(accelerator) ? accelerator : undefined;
}

/** The defaults with the valid stored changes on top */
export function effectiveHotkeys(stored: unknown): Hotkeys {
	const changes = typeof stored === "object" && stored !== null ? (stored as Record<string, unknown>) : {};
	const hotkeys = { ...DEFAULT_HOTKEYS };
	for (const action of HOTKEY_ACTIONS) {
		const accelerator = changes[action];
		if (isValidAccelerator(accelerator)) hotkeys[action] = accelerator;
	}
	return hotkeys;
}

type Shortcuts = { register: (accelerator: string, callback: () => void) => boolean; unregisterAll: () => void };

/** Replaces all global hotkeys; returns the actions whose hotkey another app already holds */
export function registerHotkeys(
	shortcuts: Shortcuts,
	hotkeys: Hotkeys,
	handlers: Record<HotkeyAction, () => void>,
): HotkeyAction[] {
	shortcuts.unregisterAll();
	return HOTKEY_ACTIONS.filter((action) => {
		try {
			return !shortcuts.register(hotkeys[action], handlers[action]);
		} catch {
			return true;
		}
	});
}
