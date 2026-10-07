/**
 * The book of questions an atom set has been asked: one handle per question,
 * how many readers hold it open, and which cold ones to forget.
 *
 * A question is a policy and, optionally, a resource. The book keys it
 * structurally (`MutableHashMap` compares with `Equal.equals`, as `Atom.family`
 * does), so two separately built but equal policies are one question, and it
 * holds the question's handle **strongly** for as long as the question is
 * tracked. That is the point of owning the keying rather than leaving it to
 * `Atom.family`, whose values are held weakly: after a garbage collection the
 * same question was given a new atom, evaluated twice, listed twice and had its
 * hydrated seed dropped (ADR-QD-103, BEH-QD-065, BEH-QD-198).
 *
 * Generic over the handle it stores and free of any `effect/reactivity` import,
 * so every rule here is testable with plain objects. `QadiAtoms.ts` is its one
 * adapter: the handle is a `SeededQuestion`, and the reader's `get.addFinalizer`
 * is wired to the `release` that {@link BookOptions.build}'s `live` returns.
 * `AskedQuestion` is declared here and re-exported from `QadiAtoms.ts`, so this
 * module imports nothing local (ADR-QD-037).
 *
 * **Liveness.** `live()` counts one more computation holding the question's
 * decision atom open, across every registry sharing the atom set; its release
 * counts one fewer. `AtomRegistry` runs the finalizer on a genuine teardown and
 * also on a recompute, and the two are told apart by timing rather than by the
 * count: `NodeImpl.invalidate` disposes the lifetime (the count drops to zero)
 * and then, synchronously and with no `yield*` in between, reads the atom again
 * (back to one). `sweep` runs on its own fiber, so it can never observe the
 * momentary zero of a question a registry still holds; only a real teardown
 * leaves a zero for it to find. `v4-reactivity-smoke.test.ts` pins that
 * synchronous dispose-then-reread, and `QadiAtoms.test.ts` pins the sweep
 * across an invalidation. `sweep` never drops an entry above zero, because that
 * would remove a mounted gate from `asked()` and from the devtools panel.
 *
 * **Re-admission.** A swept entry is out of the book, so the next `open` of that
 * question builds a fresh handle. A registry may still hold the old handle's
 * atom, though, and its reader calls `live()` again when it next runs. `live()`
 * puts the entry back (at the end of the order) unless another entry now owns
 * the key; in that case the old entry stays out of `asked()`, so a question is
 * never listed twice, and it still counts its readers so it dies with them.
 *
 * **Eviction.** Oldest first among cold entries, the FIFO choice
 * `DecisionCache.ts`'s own bounded mode makes and for the same reason: nothing
 * here claims "recently used" predicts "will be asked again" better than
 * "recently added" does. One pass per sweep. When every entry over the bound is
 * live the bound is best-effort and the sweep stops rather than drop one in use.
 * Eviction forgets the handle as well as the row, so a cold question's seed that
 * was never read can be forgotten with it.
 *
 * **A question's `resource` is a key and must not be mutated** after it is first
 * asked with (BL-05). `Equal` caches its comparison per object pair, so a
 * mutated object keeps hitting the entry made against its old shape; build a new
 * object for a new state.
 */
import type { Policy, Resource } from "@qadi/core";
import * as MutableHashMap from "effect/MutableHashMap";

/** One question an atom set has been asked. */
export interface AskedQuestion {
  readonly policy: Policy;
  /** Absent when the question was asked with no resource in scope. */
  readonly resource?: Resource | undefined;
}

export interface BookOptions<H> {
  /** The most cold questions the book keeps once swept. A positive integer. */
  readonly capacity: number;
  /**
   * Builds the handle for a question the book has not got. Called once per
   * tracked question.
   *
   * `live` is for the handle's reader to call, first thing, each time it runs:
   * it counts one more holder and returns the idempotent release to hand to the
   * reader's finalizer.
   */
  readonly build: (question: AskedQuestion, live: () => () => void) => H;
}

export interface QuestionBook<H> {
  /** The handle for an equal question: the one already tracked, else a new one. */
  readonly open: (question: AskedQuestion) => H;
  /** Forgets the oldest cold questions beyond `capacity`; never one held open. */
  readonly sweep: () => void;
  /** Every tracked question in the order first asked, as a fresh array. */
  readonly asked: () => ReadonlyArray<AskedQuestion>;
}

/** The structural key: the resource is always present, even when absent. */
interface Key {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
}

class Entry<H> {
  readonly key: Key;
  readonly question: AskedQuestion;
  readonly handle: H;
  liveCount = 0;
  inBook = true;

  constructor(question: AskedQuestion, build: (entry: Entry<H>) => H) {
    this.key = { policy: question.policy, resource: question.resource };
    this.question =
      question.resource === undefined
        ? { policy: question.policy }
        : { policy: question.policy, resource: question.resource };
    this.handle = build(this);
  }
}

/**
 * Builds an empty book.
 *
 * Throws on a capacity that is not a positive integer: a negative one makes the
 * sweep's bound unsatisfiable and a `NaN` one always false, silently turning
 * "bounded" into unbounded. Checked once here, as `decisionCacheLayer` checks
 * its own, rather than left to fail the first time a sweep runs.
 */
export const makeQuestionBook = <H>(options: BookOptions<H>): QuestionBook<H> => {
  const { capacity, build } = options;
  if (!(Number.isInteger(capacity) && capacity >= 1)) {
    throw new Error(`makeQadiAtoms: maxTrackedQuestions must be a positive integer, got ${capacity}`);
  }

  const entries = MutableHashMap.empty<Key, Entry<H>>();
  let order: Array<Entry<H>> = [];

  const admit = (entry: Entry<H>): void => {
    MutableHashMap.set(entries, entry.key, entry);
    order.push(entry);
    entry.inBook = true;
  };

  const open = (question: AskedQuestion): H => {
    const key: Key = { policy: question.policy, resource: question.resource };
    const existing = MutableHashMap.get(entries, key);
    if (existing._tag === "Some") return existing.value.handle;
    const created = new Entry<H>(question, (entry) =>
      build(entry.question, () => {
        // A swept entry whose atom a registry still holds: put it back, unless
        // a newer entry owns the key now.
        if (!entry.inBook && !MutableHashMap.has(entries, entry.key)) admit(entry);
        entry.liveCount += 1;
        let released = false;
        return () => {
          if (released) return;
          released = true;
          entry.liveCount -= 1;
        };
      }),
    );
    admit(created);
    return created.handle;
  };

  const sweep = (): void => {
    let excess = order.length - capacity;
    if (excess <= 0) return;
    const kept: Array<Entry<H>> = [];
    for (const entry of order) {
      if (excess > 0 && entry.liveCount === 0) {
        excess -= 1;
        entry.inBook = false;
        MutableHashMap.remove(entries, entry.key);
      } else {
        kept.push(entry);
      }
    }
    order = kept;
  };

  return { open, sweep, asked: () => order.map((entry) => entry.question) };
};
