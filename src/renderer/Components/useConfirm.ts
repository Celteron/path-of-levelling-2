import { createContext, useContext } from "react";

export type Confirm = (message: string, confirmLabel?: string) => Promise<boolean>;

export const ConfirmContext = createContext<Confirm | null>(null);

/** Asks a question in the overlay's own dialog; needs a ConfirmProvider above */
export function useConfirm(): Confirm {
	const confirm = useContext(ConfirmContext);
	if (!confirm) throw new Error("useConfirm must be used inside a ConfirmProvider");
	return confirm;
}
