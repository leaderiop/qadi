/**
 * A choice from a list, held by its value and read back against the list as it is now.
 *
 * Positions move. A decision on a policy below the head moves it to the head,
 * and a policy's first decision inserts a row and shifts every index by one, so
 * a choice stored as an index silently names a different item the next time the
 * list is rebuilt. This module is the one place the rule lives: the choice is a
 * value, compared with a caller-supplied equality, and `resolveHeld` says where
 * it is now — or that it is no longer anywhere.
 *
 * `Selection.ts` is the precedent, for log rows keyed by row key: an evicted
 * value is a third state ("a row that scrolled off is an event"), not a silent
 * return to nothing chosen, and not a silent swap to a neighbour either
 * (ADR-QD-048: "a label is a display string, never an identity"). An evicted
 * value is still a value in hand, so nothing is lost by keeping it.
 *
 * Package-private: it is not in the barrel (ADR-QD-099). The simulator session,
 * the policy explorer and the role viewer each supply their list and their
 * equality; none of them clamps an index.
 *
 * `makeHeldChoiceStore` is the same rule as a store, for a screen that has
 * nothing else to remember (the role viewer): owned by the dock, so a choice
 * outlives the tab it is shown on (INV-QD-107).
 */
import { makeExternalStore, sameElements } from "./ExternalStore.ts";

/** Where a held choice is, against the current list. */
export type HeldChoice<A> =
  | { readonly _tag: "Empty" }
  | { readonly _tag: "Listed"; readonly value: A; readonly index: number }
  | { readonly _tag: "Evicted"; readonly value: A };

/**
 * Resolves `held` against `list`.
 *
 * Nothing held reads as the head (`Empty` for an empty list): a caller that
 * wants the default not to follow the head pins it first with `pinHead`.
 * A held value that is listed resolves to the **list's own element**, the
 * newest object, so a label or a tally read from it is current. The first match
 * wins when the list holds equal elements.
 */
export const resolveHeld = <A>(
  list: ReadonlyArray<A>,
  held: A | undefined,
  same: (a: A, b: A) => boolean,
): HeldChoice<A> => {
  if (held === undefined) {
    const head = list[0];
    return head === undefined ? { _tag: "Empty" } : { _tag: "Listed", value: head, index: 0 };
  }
  const index = list.findIndex((candidate) => same(candidate, held));
  const found = list[index];
  return found === undefined
    ? { _tag: "Evicted", value: held }
    : { _tag: "Listed", value: found, index };
};

/**
 * The value to hold: the one already held, else the head of the list.
 *
 * What makes the default stop following the head once there is one.
 */
export const pinHead = <A>(list: ReadonlyArray<A>, held: A | undefined): A | undefined =>
  held ?? list[0];

/** What a held-choice store publishes: the list as it is now, and where the choice is in it. */
export interface HeldChoiceSnapshot<A> {
  readonly list: ReadonlyArray<A>;
  readonly choice: HeldChoice<A>;
}

/** A held choice over a list the owner keeps current. */
export interface HeldChoiceStore<A> {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => HeldChoiceSnapshot<A>;
  /** The list as it is now. Pins the head once, so the first value shown stays shown. */
  readonly setList: (list: ReadonlyArray<A>) => void;
  /** Holds a value by identity-under-`same`, not by position. A no-op when it is already held. */
  readonly choose: (value: A) => void;
}

export const makeHeldChoiceStore = <A>(
  initial: ReadonlyArray<A>,
  same: (a: A, b: A) => boolean,
): HeldChoiceStore<A> => {
  let list = initial;
  let held: A | undefined = pinHead(list, undefined);
  const build = (): HeldChoiceSnapshot<A> => ({ list, choice: resolveHeld(list, held, same) });
  const store = makeExternalStore(build());

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    setList: (next) => {
      if (sameElements(next, list)) return;
      list = next;
      held = pinHead(list, held);
      store.publish(build());
    },
    choose: (value) => {
      if (held !== undefined && same(held, value)) return;
      held = value;
      store.publish(build());
    },
  };
};
