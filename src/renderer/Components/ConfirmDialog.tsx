import { ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Confirm, ConfirmContext } from "./useConfirm";
import { OverlayInteractiveContext } from "./overlayInteractive";

type PendingQuestion = { message: string; confirmLabel: string; resolve: (confirmed: boolean) => void };

/**
 * Confirmation dialog inside the overlay. window.confirm opens a separate OS window, which on
 * Linux desktops shows up as its own window outside the overlay and can end up behind the game.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [question, setQuestion] = useState<PendingQuestion | null>(null);
	const interactive = useContext(OverlayInteractiveContext);

	// Closing the settings takes the mouse from the overlay: a dialog left open would cover the game
	useEffect(() => {
		if (interactive) return;
		setQuestion((pending) => {
			pending?.resolve(false);
			return null;
		});
	}, [interactive]);

	const confirm = useCallback<Confirm>(
		(message, confirmLabel = "OK") =>
			new Promise<boolean>((resolve) => {
				setQuestion((previous) => {
					previous?.resolve(false); // only one question at a time
					return { message, confirmLabel, resolve };
				});
			}),
		[],
	);

	const answer = (confirmed: boolean) => {
		question?.resolve(confirmed);
		setQuestion(null);
	};

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{question && <ConfirmDialog question={question} onAnswer={answer} />}
		</ConfirmContext.Provider>
	);
}

function ConfirmDialog({ question, onAnswer }: { question: PendingQuestion; onAnswer: (confirmed: boolean) => void }) {
	const cancelRef = useRef<HTMLButtonElement>(null);

	// Cancel is focused so a stray Enter never discards or deletes anything
	useEffect(() => cancelRef.current?.focus(), []);

	return (
		<div className="ConfirmBackdrop">
			<div
				className="ConfirmDialog"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirm-dialog-message"
				onKeyDown={(event) => {
					if (event.key === "Escape") onAnswer(false);
				}}
			>
				<p id="confirm-dialog-message">{question.message}</p>
				<div className="ConfirmDialogButtons">
					<button ref={cancelRef} onClick={() => onAnswer(false)}>
						Cancel
					</button>
					<button className="ConfirmDialogConfirm" onClick={() => onAnswer(true)}>
						{question.confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
