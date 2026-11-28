import { KeyboardEvent, useEffect, useState } from "react";
import {
	acceleratorFromKeyEvent,
	DEFAULT_HOTKEYS,
	HOTKEY_ACTIONS,
	HOTKEY_LABELS,
	HOTKEY_RULE,
	HotkeyAction,
} from "../../../main/hotkeys";

const MODIFIER_KEYS = ["Control", "Alt", "AltGraph", "Shift", "Meta"];

/** Global hotkeys: click one, press the new combination; Escape cancels */
export function HotkeySettings() {
	const [state, setState] = useState<HotkeysDto | null>(null);
	const [recording, setRecording] = useState<HotkeyAction | null>(null);
	const [hint, setHint] = useState("");

	useEffect(() => {
		window.electron.getHotkeys().then(setState);
	}, []);

	// The global hotkeys are paused while recording; resume them however the recording ends,
	// also when the settings close in between
	useEffect(() => {
		if (recording === null) return;
		return () => {
			window.electron.postHotkeysPaused(false);
		};
	}, [recording]);

	const startRecording = (action: HotkeyAction) => {
		setHint("");
		setRecording(action);
		window.electron.postHotkeysPaused(true);
	};

	const save = (action: HotkeyAction, accelerator: string) => {
		window.electron.saveHotkey({ action, accelerator }).then(setState);
	};

	const handleKeyDown = (action: HotkeyAction, event: KeyboardEvent<HTMLButtonElement>) => {
		if (recording !== action) return;
		event.preventDefault();
		if (event.key === "Escape") {
			setRecording(null);
			return;
		}
		const accelerator = acceleratorFromKeyEvent(event.nativeEvent);
		if (accelerator === undefined) {
			if (!MODIFIER_KEYS.includes(event.key)) setHint(HOTKEY_RULE);
			return;
		}
		setRecording(null);
		setHint("");
		save(action, accelerator);
	};

	if (state === null) return null;

	return (
		<div className="HotkeysWrapper">
			<h3>Hotkeys</h3>
			<p>Click a hotkey and press the new key combination. Escape cancels.</p>
			<table className="HotkeyTable">
				<tbody>
					{HOTKEY_ACTIONS.map((action) => {
						const label = HOTKEY_LABELS[action];
						const accelerator = state.hotkeys[action];
						return (
							<tr key={action}>
								<td>{label}</td>
								<td>
									<button
										className="HotkeyButton"
										aria-label={`Change hotkey: ${label}`}
										data-recording={recording === action}
										onClick={() => startRecording(action)}
										onKeyDown={(event) => handleKeyDown(action, event)}
										onBlur={() => recording === action && setRecording(null)}
									>
										{recording === action ? "Press keys…" : accelerator}
									</button>
								</td>
								<td>
									{state.failed.includes(action) && (
										<span className="HotkeyWarning">Not available: used by another app</span>
									)}
									{accelerator !== DEFAULT_HOTKEYS[action] && (
										<button
											aria-label={`Default: ${label}`}
											onClick={() => save(action, DEFAULT_HOTKEYS[action])}
										>
											Default
										</button>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			{hint && <p role="status">{hint}</p>}
			{state.error && (
				<p role="alert" className="HotkeyWarning">
					{state.error}
				</p>
			)}
		</div>
	);
}
