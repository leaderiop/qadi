"use client";
/**
 * Qadi state as Effect atoms.
 *
 * An authorization decision is asynchronous, shared between components, and
 * invalidated by events outside React — a login, a role change, a revoked
 * grant. That is a reactive graph, and `effect/reactivity` already
 * models one, so this package is a binding over it rather than a bespoke cache.
 *
 * The atoms defined here have no React dependency at all. React enters only in
 * `QadiProvider.tsx`, which subscribes to them. That split is deliberate: it
 * keeps the caching and lifetime rules testable without rendering anything, and
 * it is what makes one shared evaluation per policy possible — the predecessor
 * re-ran the whole evaluation in every component that asked the same question.
 */
import type {
  AuthSubject,
  Decision,
  EvaluationError,
  Policy,
  Resource,
  StandingEvaluationServices,
} from "@qadi/core";
import { CurrentSubject, DecisionCache, evaluate, subjectEquivalence } from "@qadi/core";
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Reactivity from "effect/reactivity/Reactivity";
import {
  type DehydratedDecisions,
  type HydrateOptions,
  type HydrationMismatchReporter,
  type InitialValues,
  type SeededQuestion,
  hydrateWith,
  makeSeededQuestion,
  resolveMismatchReporter,
} from "./HydrationEngine.ts";
import type { GateRegistry } from "./GateRegistry.ts";
import { makeGateRegistry } from "./GateRegistry.ts";
import { gateIdCollisionReporter } from "./HydrationWarning.ts";
import type { DecisionResult } from "./DecisionOutcome.ts";
import type { AskedQuestion } from "./QuestionBook.ts";
import { makeQuestionBook } from "./QuestionBook.ts";

// `HydrationWarning.ts` is out of the barrel — its ambient-global boundary is
// not a public surface — so the two types callers name are re-exported here.
export type { HydrationMismatch, HydrationMismatchReporter } from "./HydrationEngine.ts";
// Declared in `QuestionBook.ts`, which imports nothing local (ADR-QD-037).
export type { AskedQuestion } from "./QuestionBook.ts";

/**
 * The services a Qadi runtime layer supplies.
 *
 * `CurrentSubject` is excluded on purpose. It changes per user, so it is
 * provided per evaluation from {@link QadiAtoms.subject} rather than baked
 * into the runtime — a login must not rebuild the attribute resolver.
 */
export type QadiRuntimeServices = StandingEvaluationServices;

/**
 * The layer a Qadi runtime is built from.
 *
 * Construction must not fail. A resolver that cannot be built is a wiring
 * defect, and turning it into an error on every subsequent decision would
 * report a startup problem as an authorization problem for the life of the
 * process. Callers with a fallible layer resolve it at startup, or use
 * `Layer.orDie`.
 */
export type QadiLayer = Layer.Layer<
  QadiRuntimeServices,
  never,
  AtomRegistry.AtomRegistry | Reactivity.Reactivity
>;

/** The reactivity key every decision atom is registered under. */
const DECISIONS_KEY = "qadi/decisions";

export interface QadiAtoms {
  /** The runtime the decision atoms evaluate in. */
  readonly runtime: Atom.AtomRuntime<QadiRuntimeServices>;
  /** The subject under authorization. `undefined` means "not known yet". */
  readonly subject: Atom.Writable<AuthSubject | undefined>;
  /**
   * The decision for a policy, against one resource or with none in scope.
   *
   * The same atom for an equal question for as long as this atom set tracks it,
   * regardless of garbage collection (BEH-QD-065): the atom set's question book
   * holds it strongly, and forgets it only when `sweepEvictions` drops the
   * question while no reader holds it open.
   *
   * **A `resource` is a key, and a key must not be mutated after its first use
   * (BL-05).** Equality is structural and its comparison is cached per object
   * pair, so a caller who mutates a `resource` in place after asking keeps
   * hitting the entry made against the pre-mutation shape. `useInvalidate` does
   * not help: it recomputes the cached decision behind an existing key, it does
   * not give a mutated object a new one. Treat a `resource` as immutable for as
   * long as any component might still be asking about it.
   */
  readonly decision: (policy: Policy, resource?: Resource) => Atom.Atom<DecisionResult>;
  /**
   * Several questions, read as one record.
   *
   * Each entry is still the shared {@link QadiAtoms.decision} atom; grouping only
   * means a reader re-renders once rather than once per question. The same atom
   * for an equal record. Not tracked or seeded itself, so a collected group costs
   * only a re-derivation.
   */
  readonly decisions: (
    questions: Readonly<Record<string, AskedQuestion>>,
  ) => Atom.Atom<Readonly<Record<string, DecisionResult>>>;
  /** Writing to this discards every decision and re-evaluates the mounted ones. */
  readonly invalidate: Atom.AtomResultFn<void, void>;
  /**
   * Every question this atom set has been asked, in the order first asked.
   *
   * Keyed by **question**, not by component instance, because `Atom.family` keys
   * structurally: ten `<Can policy={isAdmin}>` in different places in the tree
   * are one atom, and the atom layer cannot tell them apart. What is *asking* is
   * {@link QadiAtoms.gates}, beside this
   * ([ADR-QD-080](../../../spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md),
   * superseding the module-scope registry of ADR-QD-053). The devtools panel
   * joins the two structurally, with `Equal.equals`, because `@qadi/devtools`
   * does not depend on this package.
   *
   * Read the verdict for each with `decision`, which is what keeps a
   * stale entry rendering as re-checking rather than as its old answer
   * ([ADR-QD-017](../../../spec/decisions/017-stale-decisions-are-not-decisions.md)).
   *
   * Bounded: `sweepEvictions` drops the oldest questions no reader is holding
   * once `maxTrackedQuestions` is exceeded, and never one a mounted gate still has
   * open — see `QuestionBook.ts`.
   */
  readonly asked: () => ReadonlyArray<AskedQuestion>;
  /**
   * Every live guard under this atom set: the "asking" half of the panel.
   *
   * Owned by the same atom set as {@link QadiAtoms.asked}, so the two share one
   * scope and one lifetime. Every instrumented `QadiProvider` over this atom set
   * writes here unless it was handed its own `gates`. Read it with `instances()`
   * and `subscribe()`, or with `useGateInstances()` inside a provider. Empty for
   * the atom set's life when nothing is instrumented.
   */
  readonly gates: GateRegistry;
  /**
   * Evicts tracked questions with no reader currently holding them, until at
   * most `maxTrackedQuestions` remain — or until every question left over
   * that bound is still live, in which case it stops there rather than
   * dropping something in use.
   *
   * A plain `Effect.sync` over this atom set's own closure state, requiring
   * no service and touching nothing in `AtomRegistry` — deliberately, so it
   * cannot go anywhere near the `scheduleTask`/`defaultIdleTTL` knob AGENTS.md
   * §13 documents as off-limits (it also governs the registry's core
   * value-dispatch/notify batching, and wiring it for idle-atom GC once
   * already silently coalesced away a required intermediate render). Meant
   * to be run periodically by whatever owns this atom set's lifecycle —
   * `QadiProvider` forks it on `Schedule.spaced` at mount and interrupts that
   * fiber at unmount — rather than invoked once. Eviction order among
   * eligible (non-live) entries is oldest-first, the same FIFO choice
   * `DecisionCache.ts`'s own bounded mode makes and for the same reason:
   * nothing here claims "recently used" predicts "will be asked again"
   * better than "recently added" does.
   */
  readonly sweepEvictions: Effect.Effect<void>;
  /**
   * Seeds this atom set from a server's dehydrated payload.
   *
   * The capability `hydrateDecisions` calls — **prefer `hydrateDecisions`**, which
   * is the documented entry point and checks the payload the same way. It lives on
   * the atom set because the seed atoms do: each is private to this closure,
   * reachable by neither reflection nor import, which is what ADR-QD-039 actually
   * requires (a consumer holding a seed atom could write an authorization decision
   * straight into a registry, bypassing the subject check and the evaluator).
   *
   * Never throws, and drops what it cannot verify — see `hydrateDecisions`. A
   * wrapper that forwards `decision` can forward this too, and a
   * hand-built test double supplies its own: that is the caller's code, not a
   * trust crossing.
   */
  readonly hydrate: (
    dehydrated: DehydratedDecisions,
    subject: AuthSubject,
    options?: HydrateOptions,
  ) => InitialValues;
}

/**
 * The default for {@link QadiAtomsOptions.maxTrackedQuestions}.
 *
 * Generous enough that no application built against pre-eviction `@qadi/react`
 * should notice it, while still being an actual bound: unlike
 * `decisionCacheLayer`'s deliberately unbounded default (`DecisionCache.ts`'s
 * own doc comment — safe because that cache is meant to be scoped to one
 * request), this package's atoms are the long-lived case: a single-page
 * session that asks many distinct (policy, resource) combinations over
 * hours has nothing else bounding `asked()` or the question book's handles,
 * which is exactly the audited leak this default closes.
 */
const DEFAULT_MAX_TRACKED_QUESTIONS = 500;

export interface QadiAtomsOptions {
  /**
   * Called when this client's own answer disagrees with the server's seed.
   *
   * Supplying this replaces the development-mode console warning. It runs in
   * production too, which is the point of exposing it: a server and a client
   * disagreeing about an authorization question is signal worth reporting, and
   * it usually means one of the two is wired differently from the other.
   *
   * Called at most once per question, when this client first answers it. It
   * observes; it cannot change the outcome — the client's answer is already the
   * one in effect by the time this runs ([INV-QD-028](../../../spec/invariants.md)).
   */
  readonly onHydrationMismatch?: HydrationMismatchReporter;
  /**
   * Called once per id when two live guards under this atom set minted the same
   * React `useId` (two hydrated roots do).
   *
   * Supplying this replaces the development-mode console warning, and runs in
   * production too. Both guards stay listed; the second under a disambiguated
   * `id`. The fix at the source is a distinct `identifierPrefix` per root.
   */
  readonly onGateIdCollision?: (id: string) => void;
  /**
   * The most distinct questions this atom set keeps in `asked()` and its own
   * question book at once.
   *
   * Once exceeded, `sweepEvictions` drops the oldest questions with no reader
   * currently holding them — never one a mounted gate still has open. Must be
   * a positive integer; defaults to `DEFAULT_MAX_TRACKED_QUESTIONS`.
   */
  readonly maxTrackedQuestions?: number;
}

/**
 * Equality for the `subject` atom: {@link subjectEquivalence}, tolerating `undefined`.
 *
 * `makeSubject`/`fromRoles` (`AuthSubject.ts`) return a fresh plain object on
 * every call, by design. `AtomRegistry`'s write path treats *any* referentially
 * distinct write as a real change and invalidates every dependent, and every
 * decision atom reads `subject`. A host that constructs its subject inline —
 * `<QadiProvider subject={makeSubject({ id: user.id, roles: user.roles })} />`
 * in a component that re-renders — would otherwise re-run every mounted
 * decision on every render, though who is asking never changed (RC-01).
 *
 * The comparison is `@qadi/core`'s own, the one `DecisionCache`'s key uses, so a
 * nested attribute object that is equal by structure no longer counts as a change
 * either. This used to be a separate, shallow `Object.is`-per-key walk.
 */
const subjectsEqual = (a: AuthSubject | undefined, b: AuthSubject | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && subjectEquivalence(a, b));

/**
 * Builds the atom set for one authorization context.
 *
 * Call this once per context, at module scope. An application that serves
 * several tenants in one process calls it once per tenant; the atoms are
 * distinct objects, so their decisions cannot be confused for one another.
 */
export const makeQadiAtoms = (
  layer: QadiLayer,
  options?: QadiAtomsOptions,
): QadiAtoms => {
  const runtime = Atom.runtime(layer);
  const subject = Atom.make<AuthSubject | undefined>(undefined).pipe(
    Atom.withEquality(subjectsEqual),
  );
  const report = resolveMismatchReporter(options?.onHydrationMismatch);
  const collisionReporter = gateIdCollisionReporter(options?.onGateIdCollision);
  const gates = makeGateRegistry(
    collisionReporter === undefined ? {} : { onIdCollision: collisionReporter },
  );

  const seededDecision = (
    policy: Policy,
    resource: Resource | undefined,
    live: () => () => void,
  ) =>
    makeSeededQuestion<EvaluationError>({
      policy,
      resource,
      report,
      computedFor: (seed) =>
        runtime
          .atom((get): Effect.Effect<Decision, EvaluationError, QadiRuntimeServices> => {
            const current = get(subject);
            // No subject yet is not a denial — it is an unanswerable question. An
            // effect that never settles leaves the atom `Initial`, which is exactly
            // "still loading". Returning a Deny here would render every guarded
            // control as forbidden for the first frame after a page load.
            if (current === undefined) return Effect.never;
            // A re-check continues the server's evaluation rather than starting an
            // unrelated one, so it carries that evaluation's id. Without this the
            // two halves of a hydrated decision cannot be joined by anything: the
            // payload carries an id, the client minted a fresh one, and nothing
            // related them (BEH-QD-186).
            //
            // `get.once`, not `get`: reading the seed reactively would make every
            // re-evaluation depend on the seed atom, so a seed set or cleared after
            // mount would re-run a computation whose answer it cannot change. The id
            // is correlation metadata, not an input to the decision.
            const seeded = get.once(seed);
            return evaluate(policy, {
              ...(resource === undefined ? {} : { resource }),
              ...(seeded === undefined ? {} : { evaluationId: seeded.evaluationId }),
            }).pipe(Effect.provideService(CurrentSubject, current));
          })
          .pipe(runtime.factory.withReactivity([DECISIONS_KEY])),
      // Marks this question live for as long as this computation stays cached.
      // The count goes up first, inside the reader, and the release is the
      // reader's finalizer: a recompute (dispose, then a synchronous re-read) is
      // never seen by `sweepEvictions` as a drop to zero — see `QuestionBook.ts`.
      track: (get) => {
        get.addFinalizer(live());
      },
    });

  // **What this closure owns, and who may reach it.** Everything per-atom-set
  // lives here and nowhere at module scope: the question book (one
  // `SeededQuestion` per question, from `HydrationEngine.ts`, holding its private
  // seed atom and the one atom a consumer reads, and the liveness the eviction
  // sweep needs), the grouped-read family, and the `hydrate` capability that
  // closes over the book. Nothing outside `makeQadiAtoms` can reach a seed atom —
  // that is ADR-QD-039's requirement, met by scope rather than by a side table
  // keyed on this object. Anything else that needs to be scoped to one atom set
  // (a gate registry, say) belongs in this closure and on the `QadiAtoms`
  // interface, in the same shape.
  //
  // The book keys **structurally** (a `MutableHashMap`, which compares with
  // `Equal.equals`), so two separately constructed but equal policies share one
  // atom and sharing survives a policy built inline in render. Hoisting is still
  // worth doing, for hashing cost rather than correctness: the hash is cached per
  // object, so a fresh object each render re-walks the whole policy tree.
  // `v4-reactivity-smoke.test.ts` pins this; a bump to reference keying would
  // silently stop inline policies sharing.
  const book = makeQuestionBook<SeededQuestion<EvaluationError>>({
    capacity: options?.maxTrackedQuestions ?? DEFAULT_MAX_TRACKED_QUESTIONS,
    build: (question, live) => seededDecision(question.policy, question.resource, live),
  });

  const decision = (policy: Policy, resource?: Resource): Atom.Atom<DecisionResult> =>
    book.open({ policy, resource }).read;

  // Keyed structurally by the record, like every other family here. Its values
  // are weakly held, which only costs a re-derivation: a group is neither tracked
  // nor seeded, and each entry it reads is the book's strongly held atom.
  const decisions = Atom.family((questions: Readonly<Record<string, AskedQuestion>>) =>
    Atom.make((get) => {
      const out: Record<string, DecisionResult> = {};
      for (const [key, question] of Object.entries(questions)) {
        out[key] = get(decision(question.policy, question.resource));
      }
      return out;
    }),
  );

  const sweepEvictions: Effect.Effect<void> = Effect.sync(book.sweep);

  /**
   * Discards every decision, and every cached answer behind one.
   *
   * **The cache is cleared first, and that ordering is the whole fix.**
   * `Reactivity.invalidate` makes the mounted atoms recompute immediately, and a
   * `DecisionCache` still holding the previous answer serves it straight back —
   * so the ports are never re-asked, the verdict cannot change, and the button
   * that exists to notice a revoked grant is the one thing guaranteed not to.
   *
   * It was silent, which is what made it dangerous. Nothing failed and nothing
   * logged; the atoms really were discarded and really were recomputed, and the
   * recomputation was answered from memory. An application without a cache in
   * its layer worked, so every test of this passed
   * ([BEH-QD-070](../../../spec/behaviors/09-react.md)) until one was written
   * with a cache in it.
   *
   * `serviceOption`, because `DecisionCache` is optional — an atom set without
   * one must not fail here, and most do not have one.
   */
  const invalidate = runtime.fn((_: void) =>
    Effect.gen(function* () {
      const cache = yield* Effect.serviceOption(DecisionCache);
      if (Option.isSome(cache)) yield* cache.value.clear;
      yield* Reactivity.invalidate([DECISIONS_KEY]);
    })
  );

  const atoms: QadiAtoms = {
    runtime,
    subject,
    decision,
    decisions,
    invalidate,
    // A fresh array of the questions, so a reader cannot mutate the atom set's own
    // record of what it has been asked (or reach a question's liveness count,
    // which is not part of the public `AskedQuestion` shape).
    asked: book.asked,
    gates,
    sweepEvictions,
    // The one place a seed atom is looked up, and it never leaves this closure:
    // `hydrateWith` is handed the lookup, not the atoms.
    hydrate: (dehydrated, hydrateSubject, hydrateOptions) =>
      hydrateWith(
        (policy, resource) => book.open({ policy, resource }).seed,
        dehydrated,
        hydrateSubject,
        hydrateOptions,
      ),
  };

  return atoms;
};
