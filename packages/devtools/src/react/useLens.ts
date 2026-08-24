"use client";
/**
 * The lens as a React affordance: what is highlighted, and whether we are picking.
 *
 * State lives here rather than in `Lens.ts` so that module stays a set of pure
 * DOM operations that a test can drive without rendering — the split
 * `useTimeline.ts` makes against `TimelineStore.ts`, for the same reason.
 *
 * Every `document` reference is inside an effect. The dock is a client
 * component, so effects do not run on a server, and reaching for `document`
 * during render would be the one thing that breaks a server-rendered host.
 */
import { useCallback, useEffect, useState } from "react";
import type { GateInstanceLike } from "../model/Gates.ts";
import { boxesOf, clearLens, drawLens, gateIdAt } from "./Lens.ts";

export interface Lens {
  /** The instances currently drawn over. */
  readonly highlighted: ReadonlyArray<string>;
  readonly picking: boolean;
  /**
   * The instance the reader last picked off the page.
   *
   * Held here rather than acted on with a `querySelector`, so the row that
   * needs to reveal itself does it from its own ref. A panel looking its own
   * rows up by attribute would be re-inventing the string lookup `Lens.ts`
   * deliberately avoids, inside the one place a ref is trivially available.
   */
  readonly picked: string | undefined;
  /** Draws over these instances, replacing whatever was drawn. */
  readonly highlight: (ids: ReadonlyArray<string>) => void;
  readonly clear: () => void;
  readonly togglePicking: () => void;
}

/**
 * Drives the highlight overlay and the pick interaction.
 *
 * Picking stops on the pick, on `Escape`, and on unmount — three exits, because
 * a debugging mode that can be entered and not left makes the page unusable
 * until it is reloaded.
 */
export const useLens = (instances: ReadonlyArray<GateInstanceLike>): Lens => {
  const [highlighted, setHighlighted] = useState<ReadonlyArray<string>>([]);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string | undefined>(undefined);

  // Measured in an effect, not in a handler, so the boxes are computed after
  // React has committed — a guard whose state just changed may have only now
  // rendered the thing being measured.
  useEffect(() => {
    if (highlighted.length === 0) {
      clearLens(document);
      return;
    }
    const wanted = instances.filter((instance) => highlighted.includes(instance.id));
    drawLens(document, boxesOf(wanted));

    return () => {
      clearLens(document);
    };
  }, [highlighted, instances]);

  useEffect(() => {
    if (!picking) return;

    const move = (event: PointerEvent): void => {
      const id = gateIdAt(document, event.clientX, event.clientY, instances);
      // `[]` where the pointer is over nothing guarded — including over the dock
      // itself, which is not inside a guard and so resolves to nothing without
      // needing to know anything about the dock.
      setHighlighted(id === undefined ? [] : [id]);
    };

    const choose = (event: MouseEvent): void => {
      const id = gateIdAt(document, event.clientX, event.clientY, instances);
      if (id === undefined) return;
      // Swallowed, so picking a guarded button does not also press it. Only
      // when a guard was actually found — otherwise the dock's own controls
      // would stop working the moment picking was on.
      event.preventDefault();
      event.stopPropagation();
      setPicking(false);
      setHighlighted([]);
      setPicked(id);
    };

    const cancel = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      setPicking(false);
      setHighlighted([]);
    };

    // Capture, so the click is intercepted before the page's own handlers see
    // it. Bubble would be too late: the application would already have acted.
    document.addEventListener("pointermove", move);
    document.addEventListener("click", choose, true);
    document.addEventListener("keydown", cancel);

    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("click", choose, true);
      document.removeEventListener("keydown", cancel);
    };
  }, [picking, instances]);

  const highlight = useCallback((ids: ReadonlyArray<string>) => {
    setHighlighted(ids);
  }, []);

  const clear = useCallback(() => {
    setHighlighted([]);
  }, []);

  const togglePicking = useCallback(() => {
    setPicking((was) => !was);
    setHighlighted([]);
    setPicked(undefined);
  }, []);

  return { highlighted, picking, picked, highlight, clear, togglePicking };
};
