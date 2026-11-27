import { useEffect, useState } from "react";

/**
 * Whether the player is in the game world (not at login/character select). Hidden until main
 * reports the state read from the end of Client.txt, so the overlay does not flash at login.
 */
export function useInGameWorld(): boolean {
	const [inGameWorld, setInGameWorld] = useState(false);

	useEffect(() => {
		let liveUpdateReceived = false;
		const unsubscribe = window.electron.subscribeToGameWorldUpdates((value) => {
			liveUpdateReceived = true;
			setInGameWorld(value);
		});
		window.electron.getInGameWorld().then((value) => {
			// A live update is newer than the startup state
			if (!liveUpdateReceived) setInGameWorld(value);
		});
		return unsubscribe;
	}, []);

	return inGameWorld;
}
