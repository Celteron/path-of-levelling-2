import { ReactNode, useContext, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import { OverlayPosition } from "../../main/zodSchemas/schemas";
import { OverlayInteractiveContext } from "./overlayInteractive";
import { useOverlayPosition } from "./useOverlayPosition";

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
	const { position, onDragStop, onResizeStop } = useOverlayPosition(loadPosition, savePosition);
	const [moveMode, setMoveMode] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [hasFocus, setHasFocus] = useState(false);
	const interactive = useContext(OverlayInteractiveContext);

	useEffect(() => {
		if (interactive) return;
		setMoveMode(false);
		setIsHovered(false);
	}, [interactive]);

	// While moving, the panel takes its saved size so it can be placed for when it has content
	const isCollapsed = collapsed && !moveMode;

	return (
		<Rnd
			size={{ width: position.width, height: isCollapsed ? "auto" : position.height }}
			position={{ x: position.x, y: position.y }}
			onDragStop={onDragStop}
			onResizeStop={onResizeStop}
			// Panels may overlap; the one in use must not be covered by its neighbours
			style={{ zIndex: isHovered || hasFocus || moveMode ? 1 : "auto" }}
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
