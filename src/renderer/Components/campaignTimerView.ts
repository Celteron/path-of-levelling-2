import { useEffect, useState } from "react";

/** 59:59, then 1:00:00 */
export function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor(totalSeconds / 60) % 60;
	const seconds = String(totalSeconds % 60).padStart(2, "0");
	return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** Time per act at `now`; the running interval belongs to the current (last) act */
export function actTimesAt(timer: TimerDto, now: number) {
	const running = timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince);
	return timer.acts.map((act, index) => ({
		act: act.act,
		ms: index === timer.acts.length - 1 ? act.ms + running : act.ms,
	}));
}

/** Timer state from the main process plus the current time, updated every second while counting */
export function useCampaignTimer() {
	const [timer, setTimer] = useState<TimerDto | null>(null);
	const [now, setNow] = useState(Date.now);
	const counting = timer !== null && timer.runningSince !== null;

	useEffect(() => {
		// The panel remounts whenever it is toggled, so the listener must not outlive it
		const unsubscribe = window.electron.subscribeToTimerUpdates(setTimer);
		window.electron.getTimerState().then(setTimer);
		return unsubscribe;
	}, []);

	useEffect(() => {
		if (!counting) return;
		setNow(Date.now());
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, [counting]);

	return { timer, setTimer, now };
}
