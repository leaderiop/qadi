/**
 * The dock's gate-registry watch and questions thunk, owned by a scope, with one failure policy.
 *
 * ADR-QD-162's watch left `DockModel` and the thunk left the diagnostics poll, where a
 * throw stopped every tab (ADR-QD-169). Both are host code, so both are guarded and a
 * throw is a statement in the snapshot, never a stop: nothing the host throws leaves
 * `makeGatesFeed`, `configure`, a registry listener or a tick.
 *
 * The thunk has a cadence of its own because `asked()` has no change signal. Its first
 * tick is one interval after it starts, since the build and each `configure` that hands a
 * new thunk read it themselves. A tick whose answer equals the last, or whose failure has
 * the same key, reads nothing else and publishes nothing. Two failures compare by a key (an
 * error's name and message, else its rendering), because one throw reads the same from any
 * call path where its rendered stack does not.
 *
 * Package-private (ADR-QD-099).
 */
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Schedule from "effect/Schedule";
import type * as Scope from "effect/Scope";
import { DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS } from "./DiagnosticsStore.ts";
import { makeExternalStore } from "./ExternalStore.ts";
import type { AskedQuestionLike, GateInstanceLike, GateRegistryLike } from "./Gates.ts";
import { makeSupersedingRun } from "./SupersedingRun.ts";

/** What the registry reads as: absent, the registry's own list, or why the read or the watch threw. */
export type RegistryRead = Data.TaggedEnum<{
  /** No registry was handed. */
  Unwatched: {};
  /** The registry's own array, never copied. */
  Read: { readonly instances: ReadonlyArray<GateInstanceLike> };
  /** `instances` or `subscribe` threw. */
  Failed: { readonly reason: string };
}>;

export const RegistryRead = Data.taggedEnum<RegistryRead>();

/** What the questions thunk reads as: absent, its answer, or why it threw. */
export type AskedRead = Data.TaggedEnum<{
  /** No thunk was handed. */
  Unhanded: {};
  Read: { readonly questions: ReadonlyArray<AskedQuestionLike> };
  /** The thunk, or comparing its answer, threw. */
  Failed: { readonly reason: string };
}>;

export const AskedRead = Data.taggedEnum<AskedRead>();

/** Both halves, in one value so no reader sees one without the other. */
export interface GatesSnapshot {
  readonly registry: RegistryRead;
  readonly asked: AskedRead;
}

/** What a host hands over: a registry to watch and a thunk to read, both its own. */
export interface GatesFeedInputs {
  readonly gates?: GateRegistryLike | undefined;
  readonly questions?: (() => ReadonlyArray<AskedQuestionLike>) | undefined;
  /** The thunk's cadence. Defaults to `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`. */
  readonly intervalMillis?: number | undefined;
}

export interface GatesFeed {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => GatesSnapshot;
  /** Re-reads the registry, re-subscribes when its identity moved or the last watch failed, reads a new thunk; publishes at most once. */
  readonly configure: (next: GatesFeedInputs) => void;
}

const REGISTRY_FALLBACK = "The registry threw a value that could not be described.";
const QUESTIONS_FALLBACK = "The questions threw a value that could not be described.";

interface Stated {
  readonly reason: string;
  readonly key: string;
}

/** What a throw is stated as, and what two throws are compared by. Total: a thrown value that cannot be rendered falls back. */
const stated = (thrown: unknown, fallback: string): Stated => {
  let reason = fallback;
  try {
    reason = Cause.pretty(Cause.die(thrown));
  } catch {
    // Keeps the fallback.
  }
  try {
    return { reason, key: thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : reason };
  } catch {
    return { reason, key: fallback };
  }
};

const UNWATCHED = RegistryRead.Unwatched();
const UNHANDED = AskedRead.Unhanded();

/** Builds the feed in the caller's scope; closing it releases the subscription and interrupts the cadence. */
export const makeGatesFeed = Effect.fn("qadi.devtools.makeGatesFeed")(function* (
  init?: GatesFeedInputs,
): Effect.fn.Return<GatesFeed, never, Scope.Scope> {
  let inputs: GatesFeedInputs = init ?? {};
  let registryNow = inputs.gates;
  let release = () => {};
  // Why `subscribe` threw, if it did: the registry's changes then may not reach the feed, until `configure` watches again.
  let watchFailure: Stated | undefined;
  let registryKey: string | undefined;
  let askedKey: string | undefined;
  const store = makeExternalStore<GatesSnapshot>({ registry: UNWATCHED, asked: UNHANDED });

  // Registered before the run, so on close the run's finalizer (interrupt, `closed()` true) runs first.
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      const held = release;
      release = () => {};
      try {
        held();
      } catch {
        // A closing feed has nowhere to state it.
      }
    }),
  );
  const runs = yield* makeSupersedingRun();

  const readRegistry = (): RegistryRead => {
    const previous = store.getSnapshot().registry;
    const previousKey = registryKey;
    registryKey = undefined;
    if (registryNow === undefined) return UNWATCHED;
    let failure = watchFailure;
    if (failure === undefined) {
      try {
        const instances = registryNow.instances();
        return RegistryRead.$is("Read")(previous) && previous.instances === instances
          ? previous
          : RegistryRead.Read({ instances });
      } catch (thrown) {
        failure = stated(thrown, REGISTRY_FALLBACK);
      }
    }
    registryKey = failure.key;
    return RegistryRead.$is("Failed")(previous) && previousKey === failure.key
      ? previous
      : RegistryRead.Failed({ reason: failure.reason });
  };

  const readAsked = (): AskedRead => {
    const thunk = inputs.questions;
    const previous = store.getSnapshot().asked;
    const previousKey = askedKey;
    askedKey = undefined;
    if (thunk === undefined) return UNHANDED;
    try {
      const questions = thunk();
      return AskedRead.$is("Read")(previous) && Equal.equals(previous.questions, questions)
        ? previous
        : AskedRead.Read({ questions });
    } catch (thrown) {
      const failure = stated(thrown, QUESTIONS_FALLBACK);
      askedKey = failure.key;
      return AskedRead.$is("Failed")(previous) && previousKey === failure.key
        ? previous
        : AskedRead.Failed({ reason: failure.reason });
    }
  };

  const publish = (registry: RegistryRead, asked: AskedRead) => {
    const current = store.getSnapshot();
    if (current.registry === registry && current.asked === asked) return;
    store.set({ registry, asked });
  };

  // A closed feed runs no host code: a notification after close reads no registry.
  const onRegistry = () => {
    if (runs.closed()) return;
    publish(readRegistry(), store.getSnapshot().asked);
  };

  // Releases the held subscription and takes the new one; both are host code and both are guarded.
  // The handle leaves the feed's state before it is called, so a release that throws neither skips the
  // new subscription nor runs again on the next `configure` or in the finalizer. A release that throws
  // is not stated: it belongs to a registry the feed no longer reads, and has nowhere honest to be shown.
  const watch = (registry: GateRegistryLike | undefined) => {
    const held = release;
    release = () => {};
    watchFailure = undefined;
    try {
      held();
    } catch {
      // The registry left behind may keep a listener, which only calls `onRegistry`.
    }
    if (runs.closed() || registry === undefined) return;
    try {
      release = registry.subscribe(onRegistry);
    } catch (thrown) {
      watchFailure = stated(thrown, REGISTRY_FALLBACK);
    }
  };

  const tick = () => {
    if (runs.closed()) return;
    const asked = readAsked();
    if (asked === store.getSnapshot().asked) return;
    publish(readRegistry(), asked);
  };

  const cadence = () => {
    if (inputs.questions === undefined) {
      runs.stop();
      return;
    }
    const interval = inputs.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS;
    runs.fork(
      runs.begin(),
      Effect.sleep(interval).pipe(
        Effect.andThen(Effect.repeat(Effect.sync(tick), Schedule.spaced(interval))),
        Effect.asVoid,
      ),
    );
  };

  watch(registryNow);
  publish(readRegistry(), readAsked());
  cadence();

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    configure: (next) => {
      if (runs.closed()) return;
      const before = inputs;
      inputs = next;
      if (next.gates !== registryNow || watchFailure !== undefined) {
        registryNow = next.gates;
        watch(registryNow);
      }
      let asked = store.getSnapshot().asked;
      if (next.questions !== before.questions || next.intervalMillis !== before.intervalMillis) {
        asked = readAsked();
        cadence();
      }
      publish(readRegistry(), asked);
    },
  };
});
