/**
 * The highlight lens as a headless session: what is drawn over the page, whether the
 * reader is picking, and the guard they picked.
 *
 * These rules lived in a hook's DOM handlers, reachable only by rendering the dock on
 * a page, so none of them fell under the model's tests or its mutation gate (the code
 * before ADR-QD-193). Here each is a plain call: picking and a pick cannot be held at
 * once, a pick while picking draws at most the one guard under the pointer, and a
 * command that moves nothing publishes nothing and keeps the snapshot reference, because
 * every command publishes through the store's `set`, so a reader of the store does not
 * render for it.
 *
 * `choose` answers whether the click it was given is consumed, which is what decides
 * whether the page sees it. A pick arms a one-shot reveal for its guard; `takeReveal`
 * answers true once and publishes nothing, so a row scrolls itself into view for the
 * pick that was made and not again on a later render. The reveal belongs to the moment
 * of its pick: `toggle`, `cancel` and `highlight` disarm it. A `hover` leaves it, and
 * moves nothing from `Idle`, which only a headless caller, or a script that dispatches a
 * second event in the click's task, can send one to. The pick is held by the guard's id
 * and only `choose` or `toggle` replaces it.
 *
 * Package-private (ADR-QD-099): the dock's model owns it and the document adapter
 * drives it. `DockSession` is the shape.
 */
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import { makeExternalStore, sameElements, type ReadableStore } from "./ExternalStore.ts";

/**
 * What the lens shows. While picking there is no pick and at most one guard is drawn,
 * so a pick while picking and two drawn guards while picking cannot be written.
 */
export type LensSnapshot = Data.TaggedEnum<{
  Idle: {
    readonly highlighted: ReadonlyArray<string>;
    readonly picked: string | undefined;
  };
  Picking: { readonly highlighted: readonly [] | readonly [string] };
}>;

export const LensSnapshot = Data.taggedEnum<LensSnapshot>();

/** The guard the reader picked, or nothing: while picking there is none. */
export const pickedOf: (snapshot: LensSnapshot) => string | undefined =
  Match.type<LensSnapshot>().pipe(
    Match.tagsExhaustive({
      Idle: ({ picked }) => picked,
      Picking: () => undefined,
    }),
  );

/** Whether the reader is picking a guard off the page. */
export const isPicking: (snapshot: LensSnapshot) => boolean =
  Match.type<LensSnapshot>().pipe(
    Match.tagsExhaustive({
      Idle: () => false,
      Picking: () => true,
    }),
  );

export interface LensSession extends ReadableStore<LensSnapshot> {
  /** Starts picking with nothing drawn and no pick, or stops it. */
  readonly toggle: () => void;
  /** While picking, draws the guard under the pointer, or nothing. */
  readonly hover: (id: string | undefined) => void;
  /**
   * While picking, over a guard: picks it and leaves picking. Whether the click is
   * consumed: true only for that move.
   */
  readonly choose: (id: string | undefined) => boolean;
  /** Stops picking and drops the pick; idle, clears the drawing and keeps the pick. */
  readonly cancel: () => void;
  /** Draws over these guards and ends picking, keeping the pick. */
  readonly highlight: (ids: ReadonlyArray<string>) => void;
  /**
   * Whether the reveal the pick armed for this guard is still to be taken; true once.
   * `toggle`, `cancel` and `highlight` disarm it; `hover` does not, and from `Idle` it
   * moves nothing, a state reached only headlessly or by a script in the click's task.
   */
  readonly takeReveal: (id: string) => boolean;
}

const NOTHING: readonly [] = [];
const IDLE = LensSnapshot.Idle({ highlighted: NOTHING, picked: undefined });

const toggled: (snapshot: LensSnapshot) => LensSnapshot = Match.type<LensSnapshot>().pipe(
  Match.tagsExhaustive({
    Idle: () => LensSnapshot.Picking({ highlighted: NOTHING }),
    Picking: () => IDLE,
  }),
);

const hovered: (snapshot: LensSnapshot) => (id: string | undefined) => LensSnapshot =
  Match.type<LensSnapshot>().pipe(
    Match.tagsExhaustive({
      Idle: (idle) => () => idle,
      Picking: (picking) => (id: string | undefined) => {
        const drawn: readonly [] | readonly [string] = id === undefined ? NOTHING : [id];
        return sameElements<string>(drawn, picking.highlighted)
          ? picking
          : LensSnapshot.Picking({ highlighted: drawn });
      },
    }),
  );

const chosen: (snapshot: LensSnapshot) => (id: string | undefined) => LensSnapshot =
  Match.type<LensSnapshot>().pipe(
    Match.tagsExhaustive({
      Idle: (idle) => () => idle,
      Picking: (picking) => (id: string | undefined) =>
        id === undefined
          ? picking
          : LensSnapshot.Idle({ highlighted: NOTHING, picked: id }),
    }),
  );

const cancelled: (snapshot: LensSnapshot) => LensSnapshot =
  Match.type<LensSnapshot>().pipe(
    Match.tagsExhaustive({
      Idle: (idle) =>
        idle.highlighted.length === 0
          ? idle
          : LensSnapshot.Idle({ highlighted: NOTHING, picked: idle.picked }),
      Picking: () => IDLE,
    }),
  );

type Draw = (ids: ReadonlyArray<string>) => LensSnapshot;

const highlighted: (snapshot: LensSnapshot) => Draw = Match.type<LensSnapshot>().pipe(
  Match.tagsExhaustive({
    Idle: (idle): Draw => (ids) =>
      sameElements(ids, idle.highlighted)
        ? idle
        : LensSnapshot.Idle({ highlighted: ids, picked: idle.picked }),
    Picking: (): Draw => (ids) =>
      LensSnapshot.Idle({ highlighted: ids, picked: undefined }),
  }),
);

export const makeLensSession = (): LensSession => {
  // The guard whose row is yet to reveal itself: armed by a pick, disarmed by the
  // reveal being taken or by `toggle`, `cancel` or `highlight`, whether or not those
  // moved the snapshot.
  let armed: string | undefined;

  const store = makeExternalStore<LensSnapshot>(IDLE);

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,

    toggle: () => {
      armed = undefined;
      store.set(toggled(store.getSnapshot()));
    },

    hover: (id) => {
      store.set(hovered(store.getSnapshot())(id));
    },

    choose: (id) => {
      const current = store.getSnapshot();
      const next = chosen(current)(id);
      if (next === current) return false;
      // Armed before the publish, so a listener told of the pick can take its reveal.
      armed = pickedOf(next);
      store.set(next);
      return true;
    },

    cancel: () => {
      armed = undefined;
      store.set(cancelled(store.getSnapshot()));
    },

    highlight: (ids) => {
      armed = undefined;
      store.set(highlighted(store.getSnapshot())(ids));
    },

    takeReveal: (id) => {
      if (armed !== id) return false;
      armed = undefined;
      return true;
    },
  };
};
