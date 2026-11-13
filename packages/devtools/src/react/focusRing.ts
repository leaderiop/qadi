/**
 * The dock's own focus ring, drawn on the element through the CSSOM.
 *
 * The package is inline-only with no stylesheet (`theme.ts`), so `:focus-visible` cannot
 * be written as a rule; these handlers reproduce it. A CSSOM write is CSP-safe where an
 * injected stylesheet is not, and it holds no React state: the ring is the
 * element's own style, set on focus and cleared on blur.
 *
 * Package-private: it is in no barrel and so not importable (AGENTS.md §9, ADR-QD-099).
 */
import type { FocusEvent } from "react";
import { colors } from "./theme.ts";

export const focusRingProps = {
  onFocus: (event: FocusEvent<HTMLElement>) => {
    const { currentTarget } = event;
    if (!currentTarget.matches(":focus-visible")) return;
    currentTarget.style.outline = `2px solid ${colors.accent}`;
    currentTarget.style.outlineOffset = "-2px";
  },
  onBlur: (event: FocusEvent<HTMLElement>) => {
    event.currentTarget.style.outline = "";
    event.currentTarget.style.outlineOffset = "";
  },
};
