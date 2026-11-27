import { z } from "zod";

// We define Zod schemas here becuase it makes validation & defaults easy,
// and we also export types based on these schemas so that we can add type safety
// everywhere (eg StoreService's getSetting() has type safety on the key provided
// and output)

// --- Type nesting helper --- //
// Since nested keys in stores are accessed with dot notation (eg .get('key.subkey')) this wrapper
// allows the user to get a collection of all keys in the store, including nested keys, for type
// checking.

// Limit recursion depth to prevent TS from infinite expansion
type DecrementDepth<D extends number> = D extends 5
	? 4
	: D extends 4
		? 3
		: D extends 3
			? 2
			: D extends 2
				? 1
				: D extends 1
					? 0
					: 0;

// Recursive helper: build dot-separated key paths up to Depth
export type NestedKeys<T, Depth extends number = 3> = [Depth] extends [never]
	? never
	: T extends object
		? {
				[K in keyof T & string]:
					K | (T[K] extends object ? `${K}.${NestedKeys<T[K], DecrementDepth<Depth>>}` : never);
			}[keyof T & string]
		: never;

// Resolve type of a dot path
export type DeepValue<T, Path extends string> = Path extends `${infer K}.${infer Rest}`
	? K extends keyof T
		? DeepValue<T[K], Rest>
		: never
	: Path extends keyof T
		? T[Path]
		: never;

// --- Type schemas for the GlobalSettings store --- //
export const ProfileId = z.enum(["poe1", "poe2"]);

/** Background opacity of the overlay windows; below 0.2 the panels get hard to read */
export const OverlayOpacityZodSchema = z.number().min(0.2).max(1);
const DEFAULT_OVERLAY_OPACITY = 0.85;
const StoredOverlayOpacityZodSchema = OverlayOpacityZodSchema.catch(DEFAULT_OVERLAY_OPACITY);

/**
 * Reads the stored opacity. The settings migration does not write back values replaced by .catch,
 * so a broken value stays in the store and has to be checked on every read.
 */
export function readOverlayOpacity(stored: unknown): number {
	return StoredOverlayOpacityZodSchema.parse(stored);
}

export const GlobalSettingsZodSchema = z.object({
	version: z.number().default(1),
	selectedProfile: z.enum(["poe1", "poe2"]).default("poe2"),
	fontSize: z.number().default(11),
	// .catch: a broken opacity must not fail validation, which would reset all global settings
	overlayOpacity: StoredOverlayOpacityZodSchema.default(DEFAULT_OVERLAY_OPACITY),
});

export type GlobalSettings = z.infer<typeof GlobalSettingsZodSchema>;
export type ProfileId = z.infer<typeof ProfileId>;

// --- Type schemas for the GameSettings store --- //
export const LastSessionStateZodSchema = z.object({
	zoneCode: z.string(),
	playerLevel: z.number(),
	monsterLevel: z.number(),
});

export const OverlayPositionZodSchema = z.object({
	x: z.number(),
	y: z.number(),
	height: z.string(),
	width: z.string(),
});

export const UiSettingsZodSchema = z.object({
	settingsOverlayPosition: OverlayPositionZodSchema,
	zoneTrackerPosition: OverlayPositionZodSchema,
	layoutImagesTrackerPosition: OverlayPositionZodSchema,
	levelTrackerPosition: OverlayPositionZodSchema,
	gemTrackerPosition: OverlayPositionZodSchema,
});

// Guide progress and panel position. A top-level game setting on purpose: migrations merge
// settings shallowly, a new key nested in uiSettings would reset existing users' settings.
export const LevelingGuideSettingsZodSchema = z.object({
	pageIndex: z.number().int().nonnegative(),
	/** Target zone of the saved page, finds the page again after guide updates */
	pageTarget: z.string().nullable(),
	leagueStart: z.boolean(),
	showOptional: z.boolean(),
	overlayPosition: OverlayPositionZodSchema,
});

/** Validates guide preferences coming from the renderer */
export const GuidePrefsZodSchema = LevelingGuideSettingsZodSchema.pick({ leagueStart: true, showOptional: true });

const defaultLevelingGuideSettings = {
	pageIndex: 0,
	pageTarget: null,
	leagueStart: true,
	showOptional: true,
	// Right of the other default windows, but inside a 1280x800 window (Steam Deck, 1366x768)
	overlayPosition: { x: 740, y: 24, height: "300px", width: "520px" },
};

export const GameSettingsZodSchema = z.object({
	version: z.number(),
	clientTxtPath: z.string(),
	buildName: z.string(),
	lastSessionState: LastSessionStateZodSchema,
	uiSettings: UiSettingsZodSchema,
	levelingGuide: LevelingGuideSettingsZodSchema,
});

// Default settings for each profile
// Must have exactly the shape of GameSettingsZodSchema, only with profile-specific defaults
export const DefaultPoE1GameSettings = GameSettingsZodSchema.extend({
	version: z.number().default(1),
	clientTxtPath: z.string().default("C:/SteamLibrary/steamapps/common/Path of Exile/logs/Client.txt"),
	buildName: z.string().default("Default"),
	lastSessionState: LastSessionStateZodSchema.default({
		zoneCode: "1_1_1",
		monsterLevel: 1,
		playerLevel: 1,
	}),
	uiSettings: UiSettingsZodSchema.default({
		settingsOverlayPosition: { x: 665, y: 221, height: "358px", width: "611px" },
		zoneTrackerPosition: { x: 22, y: 24, height: "263px", width: "516px" },
		layoutImagesTrackerPosition: { x: 58, y: 405, height: "200px", width: "400px" },
		levelTrackerPosition: { x: 61, y: 632, height: "19px", width: "335px" },
		gemTrackerPosition: { x: 0, y: 377, height: "53px", width: "516px" },
	}),
	levelingGuide: LevelingGuideSettingsZodSchema.default(defaultLevelingGuideSettings),
});

export const DefaultPoE2GameSettings = GameSettingsZodSchema.extend({
	version: z.number().default(1),
	clientTxtPath: z.string().default("C:/SteamLibrary/steamapps/common/Path of Exile 2/logs/Client.txt"),
	buildName: z.string().default("Default"),
	lastSessionState: LastSessionStateZodSchema.default({
		zoneCode: "G1_1",
		monsterLevel: 1,
		playerLevel: 1,
	}),
	uiSettings: UiSettingsZodSchema.default({
		settingsOverlayPosition: { x: 665, y: 221, height: "358px", width: "611px" },
		zoneTrackerPosition: { x: 22, y: 24, height: "263px", width: "516px" },
		layoutImagesTrackerPosition: { x: 58, y: 405, height: "200px", width: "400px" },
		levelTrackerPosition: { x: 61, y: 632, height: "19px", width: "335px" },
		gemTrackerPosition: { x: 0, y: 377, height: "53px", width: "516px" },
	}),
	levelingGuide: LevelingGuideSettingsZodSchema.default(defaultLevelingGuideSettings),
});

export type GameSettings = z.infer<typeof GameSettingsZodSchema>;
export type LastSessionState = z.infer<typeof LastSessionStateZodSchema>;
export type UiSettings = z.infer<typeof UiSettingsZodSchema>;
export type OverlayPosition = z.infer<typeof OverlayPositionZodSchema>;

// --- Type schemas for the Builds store --- //
export const GemSetupZodSchema = z.object({
	level: z.number(),
	gemLinks: z.array(z.string()),
	gemSources: z.array(z.string()),
});

// User can choose whether to have notes updated on app update (lock or unlock)
// There are some cases where a note cannot be unlocked, eg if a user creates a custom note
export const LockNoteOptionZodSchema = z.enum(["unlocked", "locked", "lockedCannotUnlock"]);

export const ZoneNoteZodSchema = z.object({
	lockNoteOption: LockNoteOptionZodSchema,
	zoneCode: z.string(),
	zoneName: z.string(),
	notes: z.string(),
});

export const ActNoteZodSchema = z.object({
	lockNoteOption: LockNoteOptionZodSchema,
	actName: z.string(),
	notes: z.string(),
});

export const GemBuildZodSchema = z.object({
	changedByUser: z.boolean(),
	gemSetups: z.array(GemSetupZodSchema),
});

export const BuildZodSchema = z.object({
	buildName: z.string(),
	gemBuild: GemBuildZodSchema,
	actNotes: z.array(ActNoteZodSchema),
	zoneNotes: z.array(ZoneNoteZodSchema),
});

// Builds are stored in a dict like BuildStore.builds["buildName"] = Build
export const BuildStoreZodSchema = z.object({
	version: z.number().default(1),
	builds: z.record(z.string(), BuildZodSchema),
});

export type BuildStore = z.infer<typeof BuildStoreZodSchema>;
export type Build = z.infer<typeof BuildZodSchema>;
export type GemBuild = z.infer<typeof GemBuildZodSchema>;
export type GemSetup = z.infer<typeof GemSetupZodSchema>;
export type ActNote = z.infer<typeof ActNoteZodSchema>;
export type ZoneNote = z.infer<typeof ZoneNoteZodSchema>;
export type LockNoteOption = z.infer<typeof LockNoteOptionZodSchema>;

export const DefaultGemBuild = GemBuildZodSchema.extend({
	changedByUser: z.boolean().default(true),
	gemSetups: z.array(GemSetupZodSchema).default([
		{
			level: 1,
			gemLinks: [],
			gemSources: [],
		},
	]),
});

// --- Zone Reference Data --- //

export const zoneReferenceZodSchema = z.object({
	act: z.string(),
	zoneName: z.string(),
});

export const ZoneReferenceDataZodSchema = z.record(z.string(), zoneReferenceZodSchema);

export type ZoneCodeToZoneReference = z.infer<typeof ZoneReferenceDataZodSchema>;
export type ZoneReference = z.infer<typeof zoneReferenceZodSchema>;

// --- Default Zone Notes --- //

export const DefaultZoneNotesZodSchema = z.object({
	actNotes: z.array(ActNoteZodSchema),
	zoneNotes: z.array(ZoneNoteZodSchema),
});

export type DefaultActAndZoneNotes = z.infer<typeof DefaultZoneNotesZodSchema>;

// --- Leveling Guide (converted from Exile UI, see scripts/exileUiGuide) --- //

export const GuideSegmentZodSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("text"), text: z.string(), color: z.string().optional() }),
	z.object({ kind: z.literal("icon"), icon: z.string() }),
	z.object({ kind: z.literal("zone"), code: z.string(), name: z.string() }),
	z.object({ kind: z.literal("quest"), item: z.string() }),
	z.object({ kind: z.literal("boss"), name: z.string() }),
	z.object({ kind: z.literal("arena"), name: z.string() }),
	z.object({ kind: z.literal("tag"), value: z.string() }),
	z.object({ kind: z.literal("separator") }),
]);

/** "leaguestart" steps/pages only show on league start, "twinkrun" ones only on later runs */
export const GuideVariantZodSchema = z.enum(["all", "leaguestart", "twinkrun"]);

export const GuideStepZodSchema = z.object({
	segments: z.array(GuideSegmentZodSchema),
	/** Sub-lines shown below the step, filtered together with it */
	hints: z.array(z.array(GuideSegmentZodSchema)),
	optional: z.boolean(),
	variant: GuideVariantZodSchema,
});

export const GuidePageZodSchema = z.object({
	/** Index into LevelingGuide.acts */
	act: z.number().int().nonnegative(),
	variant: GuideVariantZodSchema,
	steps: z.array(GuideStepZodSchema),
});

export const RecommendedLevelZodSchema = z.object({
	min: z.number(),
	max: z.number(),
	/** Original text, e.g. "12 | 13+" */
	label: z.string(),
});

export const GuideAreaZodSchema = z.object({
	name: z.string(),
	recommendedLevel: RecommendedLevelZodSchema.optional(),
});

export const LevelingGuideZodSchema = z.object({
	schemaVersion: z.literal(1),
	source: z.object({ name: z.string(), version: z.string(), license: z.string() }),
	acts: z.array(z.object({ name: z.string() })),
	pages: z.array(GuidePageZodSchema),
	/** Keyed by uppercase zone code, e.g. "G1_TOWN" */
	areas: z.record(z.string(), GuideAreaZodSchema),
});

export type GuideSegment = z.infer<typeof GuideSegmentZodSchema>;
export type GuideVariant = z.infer<typeof GuideVariantZodSchema>;
export type GuideStep = z.infer<typeof GuideStepZodSchema>;
export type GuidePage = z.infer<typeof GuidePageZodSchema>;
export type RecommendedLevel = z.infer<typeof RecommendedLevelZodSchema>;
export type GuideArea = z.infer<typeof GuideAreaZodSchema>;
export type LevelingGuide = z.infer<typeof LevelingGuideZodSchema>;
