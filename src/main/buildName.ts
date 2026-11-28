// Shared by the main process and the renderer, so it must stay free of Node and Electron imports

/** Longest shipped build name is 40 characters; a pasted PoB code is thousands */
export const BUILD_NAME_MAX_LENGTH = 50;

/** The trimmed build name, or undefined for an empty, multi-line or overlong one */
export function parseBuildName(name: unknown): string | undefined {
	if (typeof name !== "string") return undefined;
	const trimmed = name.trim();
	// Characters below a space are control characters: line breaks, tabs
	const valid = trimmed !== "" && trimmed.length <= BUILD_NAME_MAX_LENGTH && ![...trimmed].some((c) => c < " ");
	return valid ? trimmed : undefined;
}
