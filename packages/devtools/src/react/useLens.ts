"use client";
/**
 * The lens's document adapter: the three listeners picking needs while the session is
 * picking, and the overlay over the guards the session names.
 *
 * The rules are the session's (`LensSession.ts`, ADR-QD-193), so this holds no React
 * state: it reads the session and the guard list, draws what they say and forwards
 * what the document does. Keeping it that thin leaves `Lens.ts` a set of pure DOM
 * operations that a test can drive without rendering.
 *
 * Every `document` reference is inside an effect. The dock is a client
 * component, so effects do not run on a server, and reaching for `document`
 * during render would be the one thing that breaks a server-rendered host.
 */
import { useEffect } from "react";
import type { ReadableStore } from "../model/ExternalStore.ts";
import type { QuestionsSnapshot } from "../model/Gates.ts";
import { isPicking, type LensSession, type LensSnapshot } from "../model/LensSession.ts";
import { boxesOf, clearLens, drawLens, gateIdAt, gateIdOfClick } from "./Lens.ts";
import { useStoreSnapshot } from "./useStoreSnapshot.ts";

/**
 * Both snapshots the adapter read, so the panel holds one subscription to each store.
 *
 * Package-private: it stays out of both barrels.
 */
export interface UseLens {
  readonly lens: LensSnapshot;
  readonly questions: QuestionsSnapshot;
}

/**
 * Drives the highlight overlay and the pick interaction over the page.
 *
 * Picking stops on the pick, on `Escape`, and on unmount — three exits, because
 * a debugging mode that can be entered and not left makes the page unusable
 * until it is reloaded. The exit on unmount is its own effect, keyed on the
 * session alone: were it the listeners' cleanup, a highlight that ended picking
 * would run it and cancel the highlight it had just drawn.
 *
 * Reads both stores and returns both snapshots, so a panel that draws from them holds
 * one subscription to each and not a second. The overlay is drawn over the guards the
 * hook's own subscription to the questions store read, and the handlers read the same
 * store when an event arrives, so a guard that registers while picking adds no listener.
 * The questions store is subscribed first and the lens second, the order the panel
 * subscribed in before the adapter took both.
 */
export const useLens = (
  lens: LensSession,
  questions: ReadableStore<QuestionsSnapshot>,
): UseLens => {
  const read = useStoreSnapshot(questions);
  const snapshot = useStoreSnapshot(lens);
  const instances = read.instances;
  const highlighted: ReadonlyArray<string> = snapshot.highlighted;
  const picking = isPicking(snapshot);

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

  // Keyed on the mode and not on the guards: the handlers read the guards when the
  // event arrives, so a guard that registers while picking adds no listener.
  useEffect(() => {
    if (!picking) return;

    const move = (event: PointerEvent): void => {
      // `undefined` where the pointer is over nothing guarded — including over the dock
      // itself, which is not inside a guard and so resolves to nothing without
      // needing to know anything about the dock.
      lens.hover(
        gateIdAt(document, event.clientX, event.clientY, questions.getSnapshot().instances),
      );
    };

    const choose = (event: MouseEvent): void => {
      // Swallowed, so picking a guarded button does not also press it. Only
      // when a guard was actually found — otherwise the dock's own controls
      // would stop working the moment picking was on.
      const id = gateIdOfClick(document, event, questions.getSnapshot().instances);
      // `choose` notifies only when the pick moved, so a throw means it did: the click
      // stays swallowed, and the subscriber's failure is not caught here.
      let consumed = true;
      try {
        consumed = lens.choose(id);
      } finally {
        if (consumed) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    const cancel = (event: KeyboardEvent): void => {
      if (event.key === "Escape") lens.cancel();
    };

    // Capture, so the click is intercepted before the page's target and bubble handlers
    // see it; bubble would be too late, the application would already have acted. A
    // listener the page put on the window's capture phase, or on the document's before
    // this one, still sees the click: `stopPropagation` does not reach either.
    document.addEventListener("pointermove", move);
    document.addEventListener("click", choose, true);
    document.addEventListener("keydown", cancel);

    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("click", choose, true);
      document.removeEventListener("keydown", cancel);
    };
  }, [picking, lens, questions]);

  useEffect(
    () => () => {
      lens.cancel();
    },
    [lens],
  );

  return { lens: snapshot, questions: read };
};
