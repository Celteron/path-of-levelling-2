import { useEffect } from "react";
import { useConfirm } from "../useConfirm";

/** Asks in the overlay before discarding unsaved edits. Resolves true if it is fine to continue. */
export function useConfirmDiscardUnsavedChanges(): (hasUnsavedChanges: boolean) => Promise<boolean> {
	const confirm = useConfirm();
	return (hasUnsavedChanges) =>
		hasUnsavedChanges ? confirm("You have unsaved changes. Discard them?", "Discard") : Promise.resolve(true);
}

/**
 * Compares the edited data with the last loaded/saved data and reports changes to the parent,
 * so leaving a settings page can warn instead of silently dropping the edits.
 */
export function useUnsavedChanges<T>(
	saved: T,
	edited: T,
	onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void,
): boolean {
	const hasUnsavedChanges = JSON.stringify(saved) !== JSON.stringify(edited);

	useEffect(() => {
		onUnsavedChangesChange?.(hasUnsavedChanges);
	}, [hasUnsavedChanges, onUnsavedChangesChange]);

	return hasUnsavedChanges;
}
