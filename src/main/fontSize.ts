// Shared by the main process and the renderer, so it must stay free of Node and Electron imports

/** The settings window scales with the font size too: outside these bounds it can't be used to fix it.
 * The maximum leaves room for the default on 6K+ screens (11 px per 1080 px of height). */
export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 48;

export function isValidFontSize(fontSize: unknown): fontSize is number {
	return Number.isInteger(fontSize) && (fontSize as number) >= FONT_SIZE_MIN && (fontSize as number) <= FONT_SIZE_MAX;
}
