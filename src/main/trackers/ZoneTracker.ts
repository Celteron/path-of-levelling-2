import log from "electron-log";
import fs from "fs";
import path from "path";
import { getZoneLayoutImagesAbsolutePath, getZoneNotesPath, getZoneReferenceDataPath } from "../pathResolver.js";
import { objectFactory } from "../objectFactory.js";
import { StoreService } from "../services/StoreService.js";
import { getProfile } from "../profiles/profiles.js";
import {
	ZoneReference,
	ZoneCodeToZoneReference,
	ActNote,
	ZoneNote,
	DefaultActAndZoneNotes,
	DefaultGemBuild,
	LockNoteOptionZodSchema,
} from "../zodSchemas/schemas.js";
import { guideCoversZoneNote } from "../levelingGuide.js";

export class ZoneTracker {
	actName: string = "Act 1";
	zoneName: string = "The Riverwood";
	zoneCode: string = "G1_1";

	// Used to populate the dropdowns in UI
	allActs: string[] = [""];
	allZonesInAct: string[] = [""];

	// Used to populate zone layout images
	zoneImageFilePaths: string[] = [""];
	zoneReferenceData: ZoneCodeToZoneReference = Object();

	// Guide
	actNotes: string = "";
	zoneNotes: string = "";

	allActNotes: Array<ActNote> = [];
	allZoneNotes: Array<ZoneNote> = [];

	defaultZoneNotesPath: string = "";
	defaultActAndZoneNotes: DefaultActAndZoneNotes = Object();

	constructor(storeService: StoreService) {
		this.zoneReferenceData = JSON.parse(fs.readFileSync(getZoneReferenceDataPath(getProfile().Id), "utf-8"));

		// ...new Set() removes duplicates
		this.allActs = [...new Set(Object.values(this.zoneReferenceData).map((zoneReference) => zoneReference.act))];

		this.loadDefaultActAndZoneNotes();

		this.loadActNotes();
		this.loadZoneNotes();

		this.saveZoneFromCode(storeService.getGameSetting("lastSessionState.zoneCode"), true);
	}

	init() {}

	getZoneDataDto(): ZoneDataDto {
		return {
			act: this.actName,
			zone: this.zoneName,
			zoneCode: this.zoneCode,
			allActs: this.allActs,
			allZonesInAct: this.allZonesInAct,
			actNotes: this.actNotes,
			zoneNotes: this.zoneNotes,
			zoneNotesCoveredByGuide: guideCoversZoneNote(
				objectFactory.getGuideTracker().isAvailable(),
				this.zoneNotes,
				this.defaultActAndZoneNotes.zoneNotes?.find((zoneNote) => zoneNote.zoneCode === this.zoneCode)?.notes,
			),
		};
	}

	getActNotesSettingsDto(): ActNotesSettingsDto {
		const dto = {
			buildName: objectFactory.getGemTracker().buildName,
			allBuildNames: objectFactory.getGemTracker().allBuildNames,
			allActNotes: this.allActNotes,
		};
		return dto;
	}

	getZoneNotesSettingsDto(): ZoneNotesSettingsDto {
		const dto = {
			buildName: objectFactory.getGemTracker().buildName,
			allBuildNames: objectFactory.getGemTracker().allBuildNames,
			allZoneNotes: this.allZoneNotes,
		};
		return dto;
	}

	loadDefaultActAndZoneNotes() {
		this.defaultZoneNotesPath = getZoneNotesPath(getProfile().Id);
		log.info("Trying to load zone notes at path", this.defaultZoneNotesPath);

		try {
			this.defaultActAndZoneNotes = JSON.parse(fs.readFileSync(this.defaultZoneNotesPath, "utf-8"));
			log.info("Successfully loaded zone notes");
		} catch (error) {
			log.info("Could not load zone notes", error);
		}
	}

	/** Reads act notes from the current build and zips them with default notes to give a full set
	 * of act notes in memory.
	 */
	loadActNotes() {
		const currentBuild = objectFactory
			.getStoreService()
			.getBuild(objectFactory.getSettingsService().getBuildName());
		const userActNotes = currentBuild === undefined ? [] : currentBuild.actNotes;

		// Zip together the default act notes and user's act notes
		this.allActNotes = this.defaultActAndZoneNotes.actNotes.map((actNote) => {
			const userActNote = userActNotes.find((userActNotes) => userActNotes.actName === actNote.actName);

			return {
				lockNoteOption: userActNote?.lockNoteOption ?? actNote.lockNoteOption,
				actName: actNote.actName,
				notes: userActNote?.notes ?? actNote.notes,
			};
		});

		// Re-select the current Act and Zone to reload those notes into this.actNote and this.zoneNote
		this.saveZoneFromCode(this.zoneCode, true);
	}

	/** Reads zone notes from the current build and zips them with default notes to give a full set
	 * of zone notes in memory.
	 */
	loadZoneNotes() {
		const currentBuild = objectFactory
			.getStoreService()
			.getBuild(objectFactory.getSettingsService().getBuildName());
		const userZoneNotes = currentBuild === undefined ? [] : currentBuild.zoneNotes;

		// Zip together the default zone notes and user's zone notes
		this.allZoneNotes = this.defaultActAndZoneNotes.zoneNotes.map((zoneNote) => {
			const userZoneNote = userZoneNotes.find((userZoneNotes) => userZoneNotes.zoneCode === zoneNote.zoneCode);

			return {
				lockNoteOption: userZoneNote?.lockNoteOption ?? zoneNote.lockNoteOption,
				zoneCode: zoneNote.zoneCode,
				zoneName: zoneNote.zoneName,
				notes: userZoneNote?.notes ?? zoneNote.notes,
			};
		});

		// Re-select the current Act and Zone to re-load those notes into this.actNote and this.zoneNote
		this.saveZoneFromCode(this.zoneCode, true);
	}

	saveActNotes(buildName: string, newActNotes: Array<ActNote>) {
		// Notes which are different to the default note must be saved with lockedCannotUnlock
		const customActNotesToSave = newActNotes
			.filter(
				(newActNote) =>
					newActNote.notes !==
					this.defaultActAndZoneNotes.actNotes.find(
						(defaultActNote) => defaultActNote.actName == newActNote.actName,
					)?.notes,
			)
			.map((customActNote) => ({
				...customActNote,
				lockNoteOption: LockNoteOptionZodSchema.enum.lockedCannotUnlock,
			}));

		// Get the rest of the locked notes - these can remain as just 'locked'
		const lockedActNotesToSave = newActNotes.filter(
			(newActNote) =>
				(newActNote.lockNoteOption === LockNoteOptionZodSchema.enum.locked ||
					newActNote.lockNoteOption === LockNoteOptionZodSchema.enum.lockedCannotUnlock) &&
				!customActNotesToSave.some((customActNote) => customActNote.actName === newActNote.actName),
		);

		// Zip the lists together for saving
		const actNotesToSave = [...customActNotesToSave, ...lockedActNotesToSave];

		// Save the new notes to build - create a new build if required
		objectFactory.getStoreService().setBuild(buildName, {
			...(objectFactory.getStoreService().getBuild(buildName) ?? {
				buildName: buildName,
				gemBuild: DefaultGemBuild.parse({}),
				zoneNotes: [],
			}),
			actNotes: actNotesToSave,
		});

		// Re-load the notes from the build store into memory
		this.loadActNotes();
	}

	CopyActNotesFromBuild(buildName: string, buildToCopyName: string) {
		// A missing build has no notes to copy; copying [] would erase the notes of buildName
		const buildToCopy = objectFactory.getStoreService().getBuild(buildToCopyName);
		if (!buildToCopy) return;

		this.saveActNotes(buildName, buildToCopy.actNotes);
	}

	saveZoneNotes(buildName: string, newZoneNotes: Array<ZoneNote>) {
		// Notes which are different to the default note must be saved with lockedCannotUnlock
		const customZoneNotesToSave = newZoneNotes
			.filter(
				(newZoneNote) =>
					newZoneNote.notes !==
					this.defaultActAndZoneNotes.zoneNotes.find(
						(defaultZoneNote) => defaultZoneNote.zoneCode == newZoneNote.zoneCode,
					)?.notes,
			)
			.map((customZoneNote) => ({
				...customZoneNote,
				lockNoteOption: LockNoteOptionZodSchema.enum.lockedCannotUnlock,
			}));

		// Get the rest of the locked or lockedCannotUnlock notes - these can keep their status
		const lockedZoneNotesToSave = newZoneNotes.filter(
			(newZoneNote) =>
				(newZoneNote.lockNoteOption === LockNoteOptionZodSchema.enum.locked ||
					newZoneNote.lockNoteOption === LockNoteOptionZodSchema.enum.lockedCannotUnlock) &&
				!customZoneNotesToSave.some((customZoneNote) => customZoneNote.zoneCode === newZoneNote.zoneCode),
		);

		// Zip the lists together for saving
		const zoneNotesToSave = [...customZoneNotesToSave, ...lockedZoneNotesToSave];

		// Save the new notes to build - create a new build if required
		objectFactory.getStoreService().setBuild(buildName, {
			...(objectFactory.getStoreService().getBuild(buildName) ?? {
				buildName: buildName,
				gemBuild: DefaultGemBuild.parse({}),
				actNotes: [],
			}),
			zoneNotes: zoneNotesToSave,
		});

		// Re-load the notes from the build store into memory
		this.loadZoneNotes();
	}

	CopyZoneNotesFromBuild(buildName: string, buildToCopyName: string) {
		const buildToCopy = objectFactory.getStoreService().getBuild(buildToCopyName);
		if (!buildToCopy) return;

		this.saveZoneNotes(buildName, buildToCopy.zoneNotes);
	}

	// Remove the user's act note from the saved custom Act Notes
	resetActNoteForAct(actName: string): ActNote {
		const currentBuildName = objectFactory.getSettingsService().getBuildName();
		const currentBuild = objectFactory.getStoreService().getBuild(currentBuildName);

		// Without a saved build there is no custom note to remove
		if (!currentBuild)
			return this.defaultActAndZoneNotes.actNotes.find((defaultActNote) => defaultActNote.actName == actName)!;

		objectFactory.getStoreService().setBuild(currentBuildName, {
			...currentBuild,
			actNotes: currentBuild.actNotes.filter((existingActNote) => existingActNote.actName !== actName),
		});

		return this.defaultActAndZoneNotes.actNotes.find((defaultActNote) => defaultActNote.actName == actName)!;
	}

	// Remove the user's zone note from the saved array of custom Zone Notes
	resetZoneNoteForZone(zoneCode: string): ZoneNote {
		const currentBuildName = objectFactory.getSettingsService().getBuildName();
		const currentBuild = objectFactory.getStoreService().getBuild(currentBuildName);
		const defaultZoneNote = this.defaultActAndZoneNotes.zoneNotes.find(
			(defaultZoneNote) => defaultZoneNote.zoneCode == zoneCode,
		)!;

		// Without a saved build there is no custom note to remove
		if (!currentBuild) return defaultZoneNote;

		objectFactory.getStoreService().setBuild(currentBuildName, {
			...currentBuild,
			zoneNotes: currentBuild.zoneNotes.filter((existingZoneNote) => existingZoneNote.zoneCode !== zoneCode),
		});

		return defaultZoneNote;
	}

	/** Act picked in the UI: shows the first zone of that act */
	saveZoneFromActName(actName: string) {
		log.info("Saving zone from act name:", actName);

		// returns the first [key, value] pair for the act, which should give the first zone.
		const zoneCodeToZoneReference = Object.entries(this.zoneReferenceData).find(
			([, value]) => value.act === actName,
		);
		if (zoneCodeToZoneReference === undefined) {
			return false;
		}

		this.actName = actName;
		this.zoneName = zoneCodeToZoneReference[1].zoneName;
		this.zoneCode = zoneCodeToZoneReference[0];

		this.allZonesInAct = Object.entries(this.zoneReferenceData)
			.filter(([, value]) => value.act === this.actName)
			.map(([, value]) => value.zoneName);

		this.setZoneNotes();

		this.setZoneLayoutImagePaths(this.zoneCode);

		objectFactory.getStateTracker().saveSessionState();
	}

	/** Zone picked in the UI; zone names repeat across acts, so the act is needed too */
	saveZoneFromZoneNameAndActName(zoneName: string, actName: string) {
		log.info("Saving zone from act name:", actName, "and zone name:", zoneName);

		// returns the first [key, value] pair for the act, which should give the first zone.
		const zoneCodeToZoneReference = Object.entries(this.zoneReferenceData).find(
			([, value]) => value.act === actName && value.zoneName === zoneName,
		);

		if (zoneCodeToZoneReference === undefined) {
			log.info("Could not find zone for act name:", actName, "and zone name:", zoneName);
			return false;
		}

		this.actName = actName;
		this.zoneName = zoneCodeToZoneReference[1].zoneName;
		this.zoneCode = zoneCodeToZoneReference[0];

		this.allZonesInAct = Object.entries(this.zoneReferenceData)
			.filter(([, value]) => value.act === this.actName)
			.map(([, value]) => value.zoneName);

		this.setZoneNotes();

		this.setZoneLayoutImagePaths(this.zoneCode);

		objectFactory.getStateTracker().saveSessionState();
	}

	/**
	 * Zone entered in the game. Returns false for codes without zone data (towns, hideouts): then
	 * only the layout images are cleared and the notes stay. updateOnly skips saving the session.
	 */
	saveZoneFromCode(zoneCode: string, updateOnly: boolean = false): boolean {
		const zoneExists = this.setZoneFromCode(zoneCode);

		// If we couldn't find a zone with that code (e.g. in Town) then clear the layout images
		// and don't change the zone notes
		if (!zoneExists) {
			log.info("Could not find zone for zone code:", zoneCode);
			log.info("Clearing Zone Images");
			this.zoneImageFilePaths = [];
			return false;
		}

		// If we did find a zone with that code, we need to update the notes and layout images
		this.setZoneNotes();

		this.setZoneLayoutImagePaths(this.zoneCode);

		// There are a few reasons we want to update locally, but not save.
		// Biggest example is when the app is first starting up and loading from file,
		// don't need to immediately write to that file.
		if (!updateOnly) objectFactory.getStateTracker().saveSessionState();

		return true;
	}

	setZoneFromCode(zoneCode: string): boolean {
		const zoneReference: ZoneReference | undefined = this.zoneReferenceData[zoneCode];

		if (zoneReference === undefined) {
			return false;
		}

		this.actName = zoneReference.act;
		this.zoneName = zoneReference.zoneName;
		this.zoneCode = zoneCode;

		this.allZonesInAct = Object.entries(this.zoneReferenceData)
			.filter(([, value]) => value.act === this.actName)
			.map(([, value]) => value.zoneName);

		return true;
	}

	/** Shows the notes of the current act and zone; empty for an act or zone without notes */
	setZoneNotes() {
		this.actNotes = this.allActNotes.find((actNote) => actNote.actName === this.actName)?.notes ?? "";
		this.zoneNotes = this.allZoneNotes.find((zoneNote) => zoneNote.zoneCode === this.zoneCode)?.notes ?? "";
	}

	/** Sets the layout images of the zone; none for towns and zones without layout images */
	setZoneLayoutImagePaths(zoneCode: string) {
		log.info("Trying to get zone image paths for zone code", zoneCode);
		// Folders are named "<zone code> <zone name>". Compare the whole code: G1_1 must not match
		// G1_11, and readdirSync returns the folders in no particular order.
		const requiredDirectory = fs
			.readdirSync(getZoneLayoutImagesAbsolutePath())
			.find((directory) => directory.split(" ")[0] === zoneCode);

		if (!requiredDirectory) {
			this.zoneImageFilePaths = [];
			return;
		}

		// The renderer loads the images relative to its own page, where "Layout Images" is served
		this.zoneImageFilePaths = fs
			.readdirSync(path.join(getZoneLayoutImagesAbsolutePath(), requiredDirectory))
			.map((fileName) => path.join("Layout Images", getProfile().Id, requiredDirectory, fileName));
		log.info("Found zone image paths", this.zoneImageFilePaths);
	}
}
