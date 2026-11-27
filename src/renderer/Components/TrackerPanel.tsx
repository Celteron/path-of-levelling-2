import { ReactNode, useContext, useEffect, useRef, useState } from "react";
import { OverlayInteractiveContext } from "./overlayInteractive";
import { Rnd, RndDragCallback, RndResizeCallback } from "react-rnd";
import { OverlayPosition } from "../../main/zodSchemas/schemas";

type TrackerPanelProps = {
	/** Accessible name of the panel */
	label: string;
	loadPosition: () => Promise<OverlayPosition>;
	savePosition: (position: OverlayPosition) => void;
	/** Panel-specific controls, shown next to Move/Resize while the panel is hovered */
	toolbar?: ReactNode;
	/** Shrinks the panel to its content, e.g. while there is nothing to show */
	collapsed?: boolean;
	children: ReactNode;
};

/**
 * Frame shared by all overlay windows: saved position and size, move/resize mode and a toolbar
 * that appears on hover. The overlay only receives the mouse while the settings are open, so
 * the toolbar is effectively a settings-mode control.
 */
export function TrackerPanel({
	label,
	loadPosition,
	savePosition,
	toolbar,
	collapsed = false,
	children,
}: TrackerPanelProps) {
	const [position, setPosition] = useState<OverlayPosition>({ x: 0, y: 0, height: "200px", width: "400px" });
	const [moveMode, setMoveMode] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [hasFocus, setHasFocus] = useState(false);
	const interactive = useContext(OverlayInteractiveContext);
	// Loaded once per mount, independent of the identity of the function passed in
	const loadPositionOnMount = useRef(loadPosition);

	useEffect(() => {
		loadPositionOnMount.current().then(setPosition);
	}, []);

	useEffect(() => {
		if (interactive) return;
		setMoveMode(false);
		setIsHovered(false);
	}, [interactive]);

	const save = (newPosition: OverlayPosition) => {
		setPosition(newPosition);
		savePosition(newPosition);
	};
	const handleDrag: RndDragCallback = (_, d) => save({ ...position, x: d.x, y: d.y });
	const handleResize: RndResizeCallback = (_, __, ref, ___, newPosition) =>
		save({ ...newPosition, height: ref.style.height, width: ref.style.width });

	// While moving, the panel takes its saved size so it can be placed for when it has content
	const isCollapsed = collapsed && !moveMode;

	return (
		<Rnd
			size={{ width: position.width, height: isCollapsed ? "auto" : position.height }}
			position={{ x: position.x, y: position.y }}
			onDragStop={handleDrag}
			onResizeStop={handleResize}
			bounds="parent"
			disableDragging={!moveMode}
			enableResizing={moveMode}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			resizeHandleComponent={moveMode ? { bottomRight: <div className="RndResizeCircleHandle"></div> } : {}}
		>
			<section
				className={isCollapsed ? "TrackerPanel TrackerPanelCollapsed" : "TrackerPanel"}
				aria-label={label}
				onFocus={() => setHasFocus(true)}
				onBlur={(event) => setHasFocus(event.currentTarget.contains(event.relatedTarget))}
			>
				{children}
				{interactive && (isHovered || hasFocus || moveMode) && (
					<footer className="TrackerPanelToolbar">
						{toolbar}
						<button className="PanelButton" onClick={() => setMoveMode(!moveMode)}>
							{moveMode ? "Done" : "Move/Resize"}
						</button>
					</footer>
				)}
			</section>
		</Rnd>
	);
}
