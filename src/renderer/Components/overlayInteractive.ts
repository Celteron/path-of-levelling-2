import { createContext } from "react";

/**
 * Whether the overlay currently receives the mouse, i.e. the settings are open. The panels get no
 * mouse events otherwise, so hover and move mode must not outlive the settings.
 */
export const OverlayInteractiveContext = createContext(true);
