"use client";
/**
 * The one hook every gate kind reads, identifies and registers through, and its
 * one-question door.
 *
 * Above `QadiAtoms.ts`, so {@link GateAtoms} is taken from it and cannot drift.
 * Out of the barrel (AGENTS.md §9): the kind is not a caller's to choose, and a
 * consumer able to pass one could register a `<Can>` that does not exist.
 * {@link GateScopeContext} is internal, so the writer never reaches the public
 * `QadiContextValue` (ADR-QD-111 D-49-a).
 *
 * `useGate` is the one-question door into {@link useGates}: every single-question
 * surface (`Can`, `Cannot`, `useCan`, `useDecision`, `useDecisionSuspense`,
 * `useProjected`) calls it naming itself, so one instance registers once, as
 * itself. That matters because the surfaces nest: `Can` used to call
 * `useDecision`, and `useCan` still would, so registering inside `useDecision`
 * and again inside its callers would report one `<Can>` as two instances, one of
 * them mislabelled. `useDecision` is simply the case whose name is `"useDecision"`.
 *
 * The read, the identity, the marker rule and the registration all live in this
 * module's `useGates`, which reads the result once with `outcomeOf` and registers
 * through the write side's `reconcile`; the one object it returns is both what
 * the registry records and what the surface renders from, so the panel and the
 * guard cannot disagree about what is on screen.
 */
import type { Policy, Resource } from "@qadi/core";
import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Record from "effect/Record";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type * as Atom from "effect/reactivity/Atom";
import { createContext, useContext, useEffect, useId, useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { DecisionOutcome, DecisionResult } from "./DecisionOutcome.ts";
import { outcomeOf } from "./DecisionOutcome.ts";
import { reconcile, sameIdentity } from "./GateWriter.ts";
import type { GateIdentity, GateKind, GateRenderState, GateWriter, Registered } from "./GateWriter.ts";
import { MissingQadiProviderError } from "./MissingQadiProviderError.ts";
import type { QadiAtoms } from "./QadiAtoms.ts";
import type { AskedQuestion } from "./QuestionBook.ts";

/**
 * What each kind is, stated once.
 *
 * `wraps`: whether the surface has a node to point at. `Can` and `Cannot` wrap
 * children; a hook returns a value to a component that may render nothing, so it
 * is enumerable and not locatable. `grouped`: whether one hook instance asks
 * several questions and so mints one id per entry name (`usePolicies`,
 * `useQuestions`). A `Record` over {@link GateKind}, so a ninth kind fails to
 * compile until both are decided.
 */
const KIND_FACTS: Readonly<
  Record<GateKind, { readonly wraps: boolean; readonly grouped: boolean }>
> = {
  Can: { wraps: true, grouped: false },
  Cannot: { wraps: true, grouped: false },
  useCan: { wraps: false, grouped: false },
  useDecision: { wraps: false, grouped: false },
  useDecisionSuspense: { wraps: false, grouped: false },
  usePolicies: { wraps: false, grouped: true },
  useProjected: { wraps: false, grouped: false },
  useQuestions: { wraps: false, grouped: true },
};

/**
 * Registers a set of guards with `writer` for as long as they are mounted.
 *
 * One hook asking several questions (`usePolicies`, `useQuestions`) registers one
 * instance per question, each under its own `id`; a single-question guard passes
 * one identity, so there is one lifecycle implementation and not two.
 *
 * `writer` is `undefined` when instrumentation is off, and then every effect
 * returns immediately: the hooks run unconditionally because the rules of hooks
 * do not bend for a debug feature, and what the flag changes is what they do.
 * `identities` and `states` are index-aligned, and `id`s are unique within a call.
 */
export const useGateRegistrations = (
  writer: GateWriter | undefined,
  identities: ReadonlyArray<GateIdentity>,
  states: ReadonlyArray<GateRenderState>,
): void => {
  // The identities as they last *changed*, so the effect below keys on "did the
  // set of questions this hook asks actually change" and not on "did the caller
  // build a new array or a new policy object this render". `policy` and `resource`
  // compare by reference, and AGENTS.md §13 blesses passing them inline in render;
  // depending on them directly would unregister and re-register every instance on
  // every render of a caller doing exactly that. `atom` is what makes that safe:
  // the book keys it structurally, so it is the same reference across renders for
  // an equal policy and resource. `latest` still lets the effect body report the
  // current policy and resource.
  const stableRef = useRef(identities);
  const previous = stableRef.current;
  if (
    previous.length !== identities.length ||
    !identities.every((identity, i) => {
      const before = previous[i];
      return before !== undefined && sameIdentity(identity, before);
    })
  ) {
    stableRef.current = identities;
  }
  const stable = stableRef.current;
  const latest = useRef(identities);
  latest.current = identities;
  const statesRef = useRef(states);
  statesRef.current = states;
  const registered = useRef<ReadonlyMap<string, Registered>>(new Map());

  // The writer going away, or the hook unmounting, ends every registration.
  useEffect(() => {
    if (writer === undefined) return;
    // Read when the cleanup runs, not when the effect does: `reconcile` replaces
    // the map in the ref, so one captured here would never hold a handle.
    return () => {
      for (const { handle } of registered.current.values()) handle.unregister();
      registered.current = new Map();
    };
  }, [writer]);

  // Identity lifecycle only: an instance that is new, or whose question changed,
  // registers; one that is gone unregisters; one that is unchanged is left alone.
  // `state` is deliberately not here — see the effect below. Re-registering is the
  // right cost only when what is being asked has actually changed, not on every
  // answer to the same question.
  useEffect(() => {
    if (writer === undefined) return;
    registered.current = reconcile(
      writer,
      registered.current,
      stable,
      stable.map((_, i) => {
        const now = latest.current[i];
        return now === undefined
          ? undefined
          : { policy: now.policy, resource: now.resource, state: statesRef.current[i] ?? "Pending" };
      }),
    );
  }, [writer, stable]);

  // The per-render state update, split from the effect above (AGENTS.md §13
  // still holds: this mutates the registered instance's `state` field and
  // notifies at most once, it does not decide what anything renders). Without
  // this split every decision state transition tore the instance down and
  // rebuilt it — two notifications where one update is enough.
  const stateKey = states.join("|");
  useEffect(() => {
    if (writer === undefined) return;
    stable.forEach((identity, i) => {
      const state = statesRef.current[i];
      if (state !== undefined) registered.current.get(identity.id)?.handle.update(state);
    });
  }, [writer, stable, stateKey]);
};

/**
 * The two openers a gate reads through, taken from {@link QadiAtoms} so they
 * cannot drift (ARCH-76).
 */
export type GateAtoms = Pick<QadiAtoms, "decision" | "decisions">;


/**
 * What a gate needs from its provider: the atoms to read through and the writer
 * to register with.
 *
 * `writer` is `undefined` whenever the provider is not instrumented, or when its
 * registry was not built by `makeGateRegistry`; either way nothing registers and
 * no marker renders (D-01, D-06).
 */
export interface GateScope {
  readonly atoms: GateAtoms;
  readonly writer: GateWriter | undefined;
}

/**
 * The context `QadiProvider` provides a {@link GateScope} through.
 *
 * Only `QadiProvider` provides it, and it is internal: the writer must never
 * reach `QadiContextValue`, which is public through `useQadiContext`, because a
 * consumer able to reach the writer could register a `<Can>` that does not exist
 * (ADR-QD-080, ADR-QD-099).
 */
export const GateScopeContext = createContext<GateScope | null>(null);

/** What one question's gate gives the surface that asked it. */
export interface GateRead {
  /**
   * This question's decision atom. A surface that must suspend on it
   * (`useDecisionSuspense`) suspends on this one and opens none of its own.
   */
  readonly atom: Atom.Atom<DecisionResult>;
  /** The raw result, for `useDecision`, which hands it on unread (ADR-QD-017's opt-in). */
  readonly result: DecisionResult;
  /** What the result means: the one read every other surface renders from. */
  readonly outcome: DecisionOutcome;
  /** React's own id for this instance, so a marker can be labelled with it. */
  readonly id: string;
  /**
   * Attached to the marker element, or `undefined` when uninstrumented.
   *
   * `undefined` rather than an unused ref, so a component can tell whether to
   * render a marker at all by asking one question, and so an uninstrumented
   * tree renders byte for byte what it rendered before.
   */
  readonly ref: RefObject<HTMLSpanElement | null> | undefined;
}

/** What {@link useGates} returns: the group's raw record, and one read per question. */
export interface Gates<K extends string> {
  /** The group's raw results, which the grouped hooks hand back unread (ADR-QD-093(d)). */
  readonly results: Readonly<Record<string, DecisionResult>>;
  readonly entries: Readonly<Record<K, GateRead>>;
}

/**
 * A result not yet in the group.
 *
 * Fail-closed: `outcomeOf` reads an `Initial` as `Pending`, never `Allowed`, so
 * a question the group does not yet hold is treated as not known yet.
 */
const NOT_YET: DecisionResult = AsyncResult.initial();

/** The enclosing scope, or `MissingQadiProviderError` naming `kind` outside a provider. */
const useGateScope = (kind: GateKind): GateScope => {
  const scope = useContext(GateScopeContext);
  if (scope === null) throw new MissingQadiProviderError(kind);
  return scope;
};

/**
 * Reads a set of questions, identifies each as a gate, and registers them while
 * instrumentation is on.
 *
 * The one hook every gate kind goes through: the grouped read, the per-entry
 * atom lookup, {@link GateIdentity} construction, the rule that only `Can` and
 * `Cannot` wrap a marker, the marker ref, and registration. A one-question
 * surface passes a record of one. Every hook runs unconditionally, because the
 * rules of hooks do not bend for a debug feature; what the flag changes is what
 * the registration effects *do*, which is nothing when the writer is `undefined`.
 *
 * Each entry's result is read once, with `outcomeOf`, and that one object is both
 * what the registry records (`outcome._tag`) and what the surface renders from,
 * so the panel and the guard cannot disagree about what is on screen.
 */
export const useGates = <K extends string>(
  kind: GateKind,
  questions: Readonly<Record<K, AskedQuestion>>,
): Gates<K> => {
  const scope = useGateScope(kind);
  const { wraps, grouped } = KIND_FACTS[kind];
  // A performance hoist, not the source of correctness: the atom set's `decisions`
  // family keys structurally, so a fresh call every render returns the same atom.
  const group = useMemo(() => scope.atoms.decisions(questions), [scope.atoms, questions]);
  const results = useAtomValue(group);
  // `id` stays React's raw `useId`: it is hydration-stable and is what
  // `data-qadi-gate` renders. Only the registry rewrites an id, and only on a
  // collision (ADR-QD-080).
  const base = useId();
  const marker = useRef<HTMLSpanElement | null>(null);
  // Keyed on `group`, not `questions`, so an equal re-render, which yields the
  // same group, looks nothing up. This is the identity `sameIdentity` compares,
  // and the group atom stands for the structural question set.
  const atomOf = useMemo(
    () =>
      Record.map(questions, (question) =>
        scope.atoms.decision(question.policy, question.resource),
      ),
    [scope.atoms, group],
  );

  const entries = Record.map(
    questions,
    (_question, name): GateRead => {
      const result = results[name] ?? NOT_YET;
      return {
        atom: atomOf[name],
        result,
        outcome: outcomeOf(result),
        id: grouped ? `${base}/${name}` : base,
        ref: scope.writer !== undefined && wraps ? marker : undefined,
      };
    },
  );
  const identities = Record.map(
    questions,
    (question, name): GateIdentity => ({
      id: entries[name].id,
      kind,
      atom: atomOf[name],
      wraps,
      policy: question.policy,
      resource: question.resource,
      marker,
    }),
  );
  useGateRegistrations(
    scope.writer,
    Record.values(identities),
    Record.values(entries).map((entry) => entry.outcome._tag),
  );

  return { results, entries };
};

/** Reads one question's decision, and registers the reader while instrumentation is on. */
export const useGate = (kind: GateKind, policy: Policy, resource?: Resource): GateRead => {
  // Memoised on the policy and resource, so a hoisted policy keeps one record and
  // therefore one group.
  const questions = useMemo(() => ({ question: { policy, resource } }), [policy, resource]);
  return useGates(kind, questions).entries.question;
};
