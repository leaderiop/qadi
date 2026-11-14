/**
 * One question's seed, the atom that computes its decision, and the atom a consumer reads.
 *
 * The seed-to-evaluation link lives here whole (ADR-QD-155): the slot a question
 * keeps its server seeds in and the grant a registry holds to one (ADR-QD-149),
 * the computing atom that carries a seed's evaluation id into the client's own
 * evaluation (BEH-QD-186), and the derivation that gives the client's answer
 * precedence over the seed ([INV-QD-028](../../../spec/invariants.md)).
 * `HydrationEngine.ts` is the payload codec that fills the slot; `QadiAtoms.ts`
 * opens one question per book entry and hands it the runtime, the subject atom
 * and the book's `live`.
 *
 * Private, and out of the barrel on purpose (AGENTS.md §9, ADR-QD-099), for
 * [ADR-QD-039](../../../spec/decisions/039-a-seed-is-not-an-authority.md)'s
 * reason: a consumer that could reach a seed slot could write an authorization
 * decision straight into the registry, bypassing the subject check and the
 * evaluator. This file imports nothing from `HydrationEngine.ts`, `QadiAtoms.ts`,
 * `QadiProvider.tsx` or `Hydration.ts`, so no cycle (counting `import type`
 * edges, ADR-QD-037) can form through it.
 *
 * No `"use client"`: this must also run under a server render.
 */
import type {
  AuthSubject,
  Decision,
  EvaluationError,
  Policy,
  Resource,
  StandingEvaluationServices,
} from "@qadi/core";
import { CurrentSubject, evaluate, isAllowed } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { HydrationMismatchReporter } from "./DeveloperSignals.ts";
import { HydrationEvent, emitHydration } from "./HydrationEvent.ts";
import type { ClientDecision, SeededDecision } from "./SeededDecision.ts";
import { permits } from "./SeededDecision.ts";

/**
 * Whether the two answers disagree.
 *
 * The **verdict** only. Two allows differing in `visibleFields` or obligations
 * are not a mismatch: what a developer sees, and what this exists to explain,
 * is a control appearing and then disappearing. Field-set differences would
 * report every projection difference as a wiring problem.
 */
export const isMismatch = (seeded: SeededDecision, decided: Decision): boolean =>
  permits(seeded) !== isAllowed(decided);

/**
 * Where one question keeps the seeds it was handed, and how it gives one to a registry.
 *
 * Closure-private to an atom set. `hold` keeps the decision in the question and
 * returns the `initialValues` pair that gives a registry a grant to it: the
 * decision itself never enters a registry, so a registry that was not given the
 * grant cannot read it (ADR-QD-149).
 * What the pair's atom and value are is the slot's own business.
 */
export interface SeedSlot {
  readonly hold: (decision: SeededDecision) => readonly [Atom.Atom<unknown>, unknown];
}

/**
 * What a registry holds in place of a seed.
 *
 * Opaque, and a class so that `instanceof` tells one from the `undefined` an
 * unseeded registry holds. The question keeps the decision it stands for.
 */
class SeedGrant {
  readonly kind = "SeedGrant";
}

/**
 * Announcement state for one question, kept **per registry**.
 *
 * Two providers over the same atom set — two tabs, or a server render followed
 * by the client's own registry — each get their own first answer, and each must
 * report its own first disagreement. A single closure flag shared across every
 * registry that ever reads this atom would let only the first registry's first
 * answer ever be announced or counted; every other registry's genuinely-first
 * re-check would silently join the "already announced" branch of a flag it never
 * flipped. Held in a `WeakMap<AtomRegistry, …>` rather than a bare closure
 * variable, scoped to one question because nothing outside it needs the map.
 */
interface AnnounceState {
  /**
   * Announced once per question **per registry**, the first time that
   * registry's client answers it for itself — absorbing StrictMode's double
   * render, which a value comparison would report twice.
   */
  announced: boolean;
}

/** The reactivity key every decision atom is registered under. */
export const DECISIONS_KEY = "qadi/decisions";

/** A question's seed slot, and the atom a consumer reads the decision through. */
export interface SeededQuestion {
  /** Where `hydrate` keeps a server decision. Never reachable from outside. */
  readonly seed: SeedSlot;
  /** The decision atom: the client's answer, or the seed until it has one. */
  readonly read: Atom.Atom<AsyncResult.AsyncResult<ClientDecision, EvaluationError>>;
}

/**
 * Builds one question's seed slot, the atom that computes its decision, and the
 * atom that reads through both.
 *
 * A decision and the seed that covers its first frames are **separate atoms**,
 * and that separation is the whole of INV-QD-028. A seed written directly into
 * the decision atom is *preserved over the value that atom computes*:
 * `AtomRegistry` sets `preserveInitialValueOnBuild` for a seeded node and, when
 * the build finishes with the node still awaiting a value, keeps the seed and
 * throws the computed value away. An effect that settles asynchronously escapes
 * that, because it publishes through `setSelf` on a later turn — but one that
 * settles **synchronously** returns its value straight out of the read, and the
 * seed wins permanently. Every policy that needs no resolver settles
 * synchronously, so that was the common case, and it left a subject holding a
 * server-issued allow they no longer qualified for. Keeping the two apart makes
 * the precedence explicit and one-directional instead of a consequence of when
 * an effect happens to settle.
 *
 * The seeds live in the question, not in a registry. A registry removes a node
 * nothing holds one macrotask after it is created, so a seed written into one
 * was lost to a gate that mounted later, hid and showed, or remounted. The
 * question keeps each decision under an opaque {@link SeedGrant}; a registry
 * holds only the grant, in one node that stays alive, and reads a seed only
 * through a grant node that is already there, never creating one, and never
 * after its own client has answered. So a registry that was not seeded reads
 * none, an unseeded question leaves no node, and the seed is forgotten with the
 * question's handle (ADR-QD-149).
 *
 * Exactly one `Atom.readable` per question, as before: the grant atom is
 * never read through a registry's `get`, so it adds no dependency, no
 * notification and no batching, and with them no change to the render sequences
 * `QadiProvider.test.tsx` pins.
 *
 * The reader follows the question book's liveness rule, stated once at
 * `BookOptions.build` in `QuestionBook.ts`.
 */
export const makeSeededQuestion = (input: {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  /** The runtime the computation evaluates in. */
  readonly runtime: Atom.AtomRuntime<StandingEvaluationServices>;
  /** The atom set's own subject atom, the kept-alive one every question reads. */
  readonly subject: Atom.Atom<AuthSubject | undefined>;
  readonly report: HydrationMismatchReporter | undefined;
  /** The question book's liveness count for this question (`BookOptions.build`). */
  readonly live: () => () => void;
}): SeededQuestion => {
  const { policy, resource, runtime, subject, report, live } = input;
  // Kept alive, so a registry given the grant keeps it however long no gate reads it.
  const grantAtom = Atom.make<SeedGrant | undefined>(undefined).pipe(Atom.keepAlive);
  const seeds = new WeakMap<SeedGrant, SeededDecision>();
  // `getNodes`, never `get`: a read that created the node would leave one for every
  // question asked, seeded or not. No node means this registry was not given a seed.
  const seededIn = (registry: AtomRegistry.AtomRegistry): SeededDecision | undefined => {
    const node = registry.getNodes().get(grantAtom);
    if (node === undefined) return undefined;
    const held = node.valueOption();
    return Option.isSome(held) && held.value instanceof SeedGrant ? seeds.get(held.value) : undefined;
  };
  const computed = runtime
    .atom((get): Effect.Effect<Decision, EvaluationError, StandingEvaluationServices> => {
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
      // Read from the registry's grant without subscribing, so a seed given
      // later cannot re-run a computation whose answer it does not change. The
      // id is correlation metadata, not an input to the decision.
      const seeded = seededIn(get.registry);
      return evaluate(policy, {
        ...(resource === undefined ? {} : { resource }),
        ...(seeded === undefined ? {} : { evaluationId: seeded.evaluationId }),
      }).pipe(Effect.provideService(CurrentSubject, current));
    })
    .pipe(runtime.factory.withReactivity([DECISIONS_KEY]));

  const announceState = new WeakMap<AtomRegistry.AtomRegistry, AnnounceState>();
  const announceStateFor = (registry: AtomRegistry.AtomRegistry): AnnounceState => {
    const existing = announceState.get(registry);
    if (existing !== undefined) return existing;
    const created: AnnounceState = { announced: false };
    announceState.set(registry, created);
    return created;
  };

  const read = Atom.readable((get): AsyncResult.AsyncResult<ClientDecision, EvaluationError> => {
    get.addFinalizer(live());

    const state = announceStateFor(get.registry);
    const result = get(computed);
    // `Initial` is the only state in which this client has never answered for
    // itself. The moment it has — allow, deny or failure — that answer is
    // authoritative and the seed is spent. That includes while a *later*
    // re-check is in flight: a re-checking result already carries its own
    // previous decision, and falling back to the seed there would resurrect
    // something older still.
    if (!AsyncResult.isInitial(result)) {
      if (!state.announced) {
        state.announced = true;
        // Counting must happen whether or not a reporter is wired. The lookup
        // registers no dependency, so an atom set without a reporter still
        // "reads exactly the atoms it read before — no reporter, no added
        // dependency, no change". It is also the honest read here: the seed is
        // already spent in this branch, so re-running on a later seed change
        // could not change the answer.
        const seeded = seededIn(get.registry);
        if (seeded !== undefined) {
          // A failure is not a disagreement. The client could not answer, so
          // there is nothing for the server's answer to disagree with, and
          // reporting one would be INV-QD-006 in reverse. It is still a
          // re-check: the question was seeded and has now been asked again.
          const mismatch =
            AsyncResult.isSuccess(result) && isMismatch(seeded, result.value)
              ? { policy, resource, seeded, decided: result.value }
              : undefined;
          emitHydration(HydrationEvent.Rechecked({ mismatch }), { mismatch: report });
        }
      }
      return result;
    }
    // Never after this registry's client has answered, even when a later `Initial`
    // (the subject cleared) asks again: the seed is spent (BEH-QD-151).
    const seeded = state.announced ? undefined : seededIn(get.registry);
    return seeded === undefined ? result : AsyncResult.success(seeded);
  });

  const seed: SeedSlot = {
    hold: (decision) => {
      const grant = new SeedGrant();
      seeds.set(grant, decision);
      return [grantAtom, grant];
    },
  };

  return { seed, read };
};
