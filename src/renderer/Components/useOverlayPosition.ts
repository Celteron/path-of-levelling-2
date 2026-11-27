import { useEffect, useRef, useState } from "react";
import { RndDragCallback, RndResizeCallback } from "react-rnd";
import { OverlayPosition } from "../../main/zodSchemas/schemas";

/**
 * Position and size of an overlay window: loaded once on mount, saved after every drag or resize.
 * Returns the position plus the handlers to pass to react-rnd.
 */
export function useOverlayPosition(
	loadPosition: () => Promise<OverlayPosition>,
	savePosition: (position: OverlayPosition) => void,
) {
	const [position, setPosition] = useState<OverlayPosition>({ x: 0, y: 0, height: "200px", width: "400px" });
	// Loaded once per mount, independent of the identity of the function passed in
	const loadPositionOnMount = useRef(loadPosition);

	useEffect(() => {
		loadPositionOnMount.current().then(setPosition);
	}, []);

	const save = (newPosition: OverlayPosition) => {
		setPosition(newPosition);
		savePosition(newPosition);
	};
	const onDragStop: RndDragCallback = (_, d) => save({ ...position, x: d.x, y: d.y });
	const onResizeStop: RndResizeCallback = (_, __, ref, ___, newPosition) =>
		save({ ...newPosition, height: ref.style.height, width: ref.style.width });

	return { position, onDragStop, onResizeStop };
}
