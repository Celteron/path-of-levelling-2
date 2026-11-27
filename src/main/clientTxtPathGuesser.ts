import path from "path";

// Pure Client.txt discovery without Electron imports, so it can be unit tested with a fake
// file system. pathResolver.ts wires it up with the real fs and platform-specific roots.

export interface FileProbe {
	isReadable(filePath: string): boolean;
	/** Returns the file content, or undefined if the file cannot be read */
	readText(filePath: string): string | undefined;
}

export interface ClientTxtGuessOptions {
	/** Exact Client.txt paths that are checked first, in order */
	directGuesses: string[];
	/** Steam install directories; their libraryfolders.vdf lists further libraries */
	steamRoots: string[];
	/** Folder name below steamapps/common, e.g. "Path of Exile 2" */
	gameFolderName: string;
	fs: FileProbe;
}

/**
 * Extracts all library paths from Steam's libraryfolders.vdf (Valve KeyValues format).
 * Only the `"path" "<value>"` pairs matter; values escape backslashes as `\\`.
 */
export function parseSteamLibraryFolders(vdfContent: string): string[] {
	const pathEntry = /"path"\s+"((?:[^"\\]|\\.)*)"/g;
	return Array.from(vdfContent.matchAll(pathEntry), (match) => match[1].replace(/\\\\/g, "\\"));
}

/** Returns the first readable Client.txt, or undefined if the game cannot be found */
export function guessClientTxtPath(options: ClientTxtGuessOptions): string | undefined {
	const { directGuesses, steamRoots, gameFolderName, fs } = options;

	// A Steam root is always a library itself, even when its libraryfolders.vdf is missing
	const libraries = steamRoots.flatMap((steamRoot) => {
		const vdf = fs.readText(path.join(steamRoot, "steamapps", "libraryfolders.vdf"));
		return [steamRoot, ...(vdf ? parseSteamLibraryFolders(vdf) : [])];
	});

	const libraryGuesses = libraries.map((library) =>
		path.join(library, "steamapps", "common", gameFolderName, "logs", "Client.txt")
	);

	return [...directGuesses, ...libraryGuesses].find((guess) => fs.isReadable(guess));
}
