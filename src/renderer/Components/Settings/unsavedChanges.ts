import { useEffect } from "react";

/** Asks before discarding unsaved edits. Returns true if it is fine to continue. */
export function confirmDiscardUnsavedChanges(hasUnsavedChanges: boolean): boolean {
	return !hasUnsavedChanges || window.confirm("You have unsaved changes. Discard them?");
}

/**
 * Compares the edited data with the last loaded/saved data and reports changes to the parent,
 * so leaving a settings page can warn instead of silently dropping the edits.
 */
export function useUnsavedChanges<T>(
	saved: T,
	edited: T,
	onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void
): boolean {
	const hasUnsavedChanges = JSON.stringify(saved) !== JSON.stringify(edited);

	useEffect(() => {
		onUnsavedChangesChange?.(hasUnsavedChanges);
	}, [hasUnsavedChanges, onUnsavedChangesChange]);

	return hasUnsavedChanges;
}
