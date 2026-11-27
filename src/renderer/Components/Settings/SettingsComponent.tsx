import { useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
// Import missing components
import { GeneralSettingsComponent } from './GeneralSettingsComponent';
import { GemSettingsComponent } from './GemSettingsComponent';
import { AboutSettingsComponent } from './AboutSettingsComponent';
import { ActNotesSettingsComponent } from './ActNotesSettingsComponent';
import { ZoneNotesSettingsComponent } from './ZoneNotesSettingsComponent';
import { useConfirmDiscardUnsavedChanges } from './unsavedChanges';

type SettingsPage = 'General' | 'Gems' | 'Act Notes' | 'Zone Notes' | 'About';

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
	const [activePage, setActivePage] = useState<SettingsPage>('General');
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

	// Setting up the draggable/resizable state
	const [rndState, setRndState] = useState({
		x: 0,
		y: 0,
		height: '200',
		width: '400',
	});

	// Get initial state for settings window position
	useEffect(() => {
		window.electron.getSettingsOverlayPositionSettings()
			.then((settingsOverlayPositionSettings: any) => {
				setRndState({
					x: settingsOverlayPositionSettings.x,
					y: settingsOverlayPositionSettings.y,
					height: settingsOverlayPositionSettings.height,
					width: settingsOverlayPositionSettings.width,
				});
			});
	}, []);

	const handleDrag = (e: any, d: any) => {
		// Send new settings to client to be saved
		window.electron.saveSettingsOverlayPositionSettings({
			...rndState,
			x: d.x,
			y: d.y,
		});

		setRndState({
			...rndState,
			x: d.x,
			y: d.y,
		});
	};

	// @ts-ignore
	const handleResize = (e, direction, ref, delta, position) => {
		// Send new settings to client to be saved
		window.electron.saveSettingsOverlayPositionSettings({
			...position,
			height: ref.style.height,
			width: ref.style.width,
		});

		setRndState({
			...position,
			height: ref.style.height,
			width: ref.style.width,
		});
	};

	// local editable font size input state
	const [fontSizeInput, setFontSizeInput] = useState(String(fontSize));

	useEffect(() => {
		setFontSizeInput(String(fontSize));
	}, [fontSize]);

	// save button handler to call parent setter
	const handleSaveFontSize = () => {
		const parsed = parseInt(fontSizeInput, 10);
		if (!isNaN(parsed)) {
			setFontSizeFunction(parsed);
		}
	};

	return (
		<Rnd
			size={{ width: rndState.width, height: rndState.height }}
			position={{ x: rndState.x, y: rndState.y }}
			onDragStop={(e, d) => handleDrag(e, d)}
			onResizeStop={(e, direction, ref, delta, position) =>
				handleResize(e, direction, ref, delta, position)
			}
			style={{ backgroundColor: 'rgba(50, 50, 50, 0.7)' }}
			bounds="parent"
			disableDragging={!moveMode}
			enableResizing={moveMode}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			resizeHandleComponent={
				moveMode
					? {
						bottomRight: (
							<div className="RndResizeCircleHandle"></div>
						),
					}
					: {}
			}
		>
			<div className="SettingsOverlay">
				{/* Banner */}
				<div className="SettingsBanner">
					Settings - Path of Levelling 2
					{/* Hidden Move Button */}
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
						className={`SidebarTab${activePage === 'General' ? ' Active' : ''}`}
						onClick={() => changePage('General')}
					>
						<h3>General</h3>
					</button>
					<button
						className={`SidebarTab${activePage === 'Gems' ? ' Active' : ''}`}
						onClick={() => changePage('Gems')}
					>
						<h3>Gems</h3>
					</button>
					<button
						className={`SidebarTab${activePage === 'Act Notes' ? ' Active' : ''}`}
						onClick={() => changePage('Act Notes')}
					>
						<h3>Act Notes</h3>
					</button>
					<button
						className={`SidebarTab${activePage === 'Zone Notes' ? ' Active' : ''}`}
						onClick={() => changePage('Zone Notes')}
					>
						<h3>Zone Notes</h3>
					</button>
					<button
						className={`SidebarTab${activePage === 'About' ? ' Active' : ''}`}
						onClick={() => changePage('About')}
					>
						<h3>About</h3>
					</button>
				</div>
				{/* Main Content */}
				<div className="SettingsPageContent">
					{activePage === 'General' && <GeneralSettingsComponent
						fontSize={fontSize}
						setFontSizeFunction={setFontSizeFunction}
						overlayOpacity={overlayOpacity}
						onOverlayOpacityChange={onOverlayOpacityChange} />}
					{activePage === 'Gems' && <GemSettingsComponent onUnsavedChangesChange={setPageHasUnsavedChanges} />}
					{activePage === 'Act Notes' && <ActNotesSettingsComponent onUnsavedChangesChange={setPageHasUnsavedChanges} />}
					{activePage === 'Zone Notes' && <ZoneNotesSettingsComponent onUnsavedChangesChange={setPageHasUnsavedChanges} />}
					{activePage === 'About' && <AboutSettingsComponent />}
				</div>
			</div>
		</Rnd>
	);
}