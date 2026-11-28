/**
 * The overlay never navigates away from itself: links open in the default browser, and only
 * https ones, so no local file or script URL can load with the app's preload
 */
export function externalLink(url: string): string | undefined {
	try {
		return new URL(url).protocol === "https:" ? url : undefined;
	} catch {
		return undefined;
	}
}
