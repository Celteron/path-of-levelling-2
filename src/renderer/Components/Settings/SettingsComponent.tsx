import { useState } from "react";
import { Rnd } from "react-rnd";
import { GeneralSettingsComponent } from "./GeneralSettingsComponent";
import { GemSettingsComponent } from "./GemSettingsComponent";
import { AboutSettingsComponent } from "./AboutSettingsComponent";
import { ActNotesSettingsComponent } from "./ActNotesSettingsComponent";
import { ZoneNotesSettingsComponent } from "./ZoneNotesSettingsComponent";
import { useConfirmDiscardUnsavedChanges } from "./unsavedChanges";
import { useOverlayPosition } from "../useOverlayPosition";

type SettingsPage = "General" | "Gems" | "Act Notes" | "Zone Notes" | "About";

export function SettingsComponent({
	setFontSizeFunction,
	fontSize,
	overlayOpacity,
	onOverlayOpacityChange,
}: {
	setFontSizeFunction: (n: number) => void;
	fontSize: number;
	overlayOpacity: number;
	onOverlayOpacityChange: (overlayOpacity: number) => void;
}) {
	const [activePage, setActivePage] = useState<SettingsPage>("General");
	// Pages unmount when switching, so their unsaved edits would be lost without a warning
	const [pageHasUnsavedChanges, setPageHasUnsavedChanges] = useState(false);

	const confirmDiscard = useConfirmDiscardUnsavedChanges();
	const changePage = async (page: SettingsPage) => {
		if (page === activePage || !(await confirmDiscard(pageHasUnsavedChanges))) return;
		setPageHasUnsavedChanges(false);
		setActivePage(page);
	};
	const [isHovered, setIsHovered] = useState(false);
	const [moveMode, setMoveMode] = useState(false);

	const { position, onDragStop, onResizeStop } = useOverlayPosition(
		window.electron.getSettingsOverlayPositionSettings,
		window.electron.saveSettingsOverlayPositionSettings,
	);

	return (
		<Rnd
			size={{ width: position.width, height: position.height }}
			position={{ x: position.x, y: position.y }}
			onDragStop={onDragStop}
			onResizeStop={onResizeStop}
			style={{ backgroundColor: "rgba(50, 50, 50, 0.7)" }}
			bounds="parent"
			disableDragging={!moveMode}
			enableResizing={moveMode}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			resizeHandleComponent={
				moveMode
					? {
							bottomRight: <div className="RndResizeCircleHandle"></div>,
						}
					: {}
			}
		>
			<div className="SettingsOverlay">
				{/* Banner */}
				<div className="SettingsBanner">
					Settings - Path of Levelling 2{/* Hidden Move Button */}
					{isHovered && !moveMode && (
						<div className="SettingsMenu">
							<button onClick={() => setMoveMode(true)}>Move/Resize</button>
						</div>
					)}
					{moveMode && (
						<div className="SettingsMenu">
							<button onClick={() => setMoveMode(false)}>Done</button>
						</div>
					)}
				</div>
				{/* Sidebar*/}
				<div className="SettingsSidebar">
					<button
						className={`SidebarTab${activePage === "General" ? " Active" : ""}`}
						onClick={() => changePage("General")}
					>
						<h3>General</h3>
					</button>
					<button
						className={`SidebarTab${activePage === "Gems" ? " Active" : ""}`}
						onClick={() => changePage("Gems")}
					>
						<h3>Gems</h3>
					</button>
					<button
						className={`SidebarTab${activePage === "Act Notes" ? " Active" : ""}`}
						onClick={() => changePage("Act Notes")}
					>
						<h3>Act Notes</h3>
					</button>
					<button
						className={`SidebarTab${activePage === "Zone Notes" ? " Active" : ""}`}
						onClick={() => changePage("Zone Notes")}
					>
						<h3>Zone Notes</h3>
					</button>
					<button
						className={`SidebarTab${activePage === "About" ? " Active" : ""}`}
						onClick={() => changePage("About")}
					>
						<h3>About</h3>
					</button>
				</div>
				{/* Main Content */}
				<div className="SettingsPageContent">
					{activePage === "General" && (
						<GeneralSettingsComponent
							fontSize={fontSize}
							setFontSizeFunction={setFontSizeFunction}
							overlayOpacity={overlayOpacity}
							onOverlayOpacityChange={onOverlayOpacityChange}
						/>
					)}
					{activePage === "Gems" && (
						<GemSettingsComponent onUnsavedChangesChange={setPageHasUnsavedChanges} />
					)}
					{activePage === "Act Notes" && (
						<ActNotesSettingsComponent onUnsavedChangesChange={setPageHasUnsavedChanges} />
					)}
					{activePage === "Zone Notes" && (
						<ZoneNotesSettingsComponent onUnsavedChangesChange={setPageHasUnsavedChanges} />
					)}
					{activePage === "About" && <AboutSettingsComponent />}
				</div>
			</div>
		</Rnd>
	);
}
