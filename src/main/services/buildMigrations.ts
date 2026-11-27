type StoredBuildV1 = { actNotes?: object[] } & Record<string, unknown>;

/**
 * Build store v2 added zone notes. Act notes written under v1 were all user notes, so they are
 * locked to keep them from being replaced by updated default notes. An existing lock option wins.
 */
export function migrateBuildsV1ToV2(builds: Record<string, StoredBuildV1> | undefined) {
	return Object.fromEntries(
		Object.entries(builds ?? {}).map(([buildName, build]) => [
			buildName,
			{
				...build,
				actNotes: (build.actNotes ?? []).map((actNote) => ({
					lockNoteOption: "lockedCannotUnlock",
					...actNote,
				})),
				zoneNotes: [],
			},
		]),
	);
}
