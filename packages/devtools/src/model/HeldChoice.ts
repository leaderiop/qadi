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
 *
 * `makeHeldChoice` is the cell underneath it, and what a session embeds: it
 * holds the list and the choice and publishes nothing. A session that
 * embedded the store instead would publish twice per command, once from the
 * store and once from its own snapshot (ARCH-74, BEH-QD-466), so the store is the
 * cell for a screen with nothing else to remember, and a session owns its
 * own publish around the cell.
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

/** The value a choice holds, or nothing for `Empty`. */
export const heldValue = <A>(choice: HeldChoice<A>): A | undefined =>
  choice._tag === "Empty" ? undefined : choice.value;

/** Where a choice is in the list, or nothing for one that is not listed now. */
export const heldIndex = <A>(choice: HeldChoice<A>): number | undefined =>
  choice._tag === "Listed" ? choice.index : undefined;

/**
 * A list and a choice held from it, with no store around them.
 *
 * Each command answers whether it changed anything, so the owner publishes
 * exactly once per effective command. Nothing is pinned at construction: an
 * owner that wants the head held calls `pin`, and one that must not (a
 * simulation seeded from a replayed row) simply does not.
 */
export interface HeldChoiceCell<A> {
  /** The list as it is now. */
  readonly list: () => ReadonlyArray<A>;
  /** The value held, or nothing while the default still follows the head. */
  readonly held: () => A | undefined;
  /** Where the choice is in the list as it is now. */
  readonly resolve: () => HeldChoice<A>;
  /** Replaces the list. False, and nothing changes, for a list of the same elements. Never pins. */
  readonly setList: (list: ReadonlyArray<A>) => boolean;
  /** Holds the head once, so the first value shown stays shown. */
  readonly pin: () => void;
  /** Holds a value by identity-under-`same`, not by position. False when it is already held. */
  readonly choose: (value: A) => boolean;
}

export const makeHeldChoice = <A>(
  initial: ReadonlyArray<A>,
  same: (a: A, b: A) => boolean,
): HeldChoiceCell<A> => {
  let list = initial;
  let held: A | undefined;
  return {
    list: () => list,
    held: () => held,
    resolve: () => resolveHeld(list, held, same),
    setList: (next) => {
      if (sameElements(next, list)) return false;
      list = next;
      return true;
    },
    pin: () => {
      held = pinHead(list, held);
    },
    choose: (value) => {
      if (held !== undefined && same(held, value)) return false;
      held = value;
      return true;
    },
  };
};

export const makeHeldChoiceStore = <A>(
  initial: ReadonlyArray<A>,
  same: (a: A, b: A) => boolean,
): HeldChoiceStore<A> => {
  const cell = makeHeldChoice(initial, same);
  cell.pin();
  const build = (): HeldChoiceSnapshot<A> => ({ list: cell.list(), choice: cell.resolve() });
  const store = makeExternalStore(build());

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    setList: (next) => {
      if (!cell.setList(next)) return;
      cell.pin();
      store.publish(build());
    },
    choose: (value) => {
      if (cell.choose(value)) store.publish(build());
    },
  };
};
