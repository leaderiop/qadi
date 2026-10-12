/**
 * Every developer-facing signal `@qadi/react` can raise, and the one place any
 * of them reaches the console.
 *
 * Seven signals live here, as one closed union ({@link DeveloperSignal}): a
 * server seed superseded by this client's own answer, two React roots minting
 * one gate id, a dehydrated payload that mixed subjects, a hydration drop, and
 * the three situations `QadiProvider` detects (instrumentation in a production
 * bundle, an `atoms` prop replaced after mount, a gate registry guards cannot
 * write to). One module-scope `Match` gives each its sentence and one function,
 * `say`, is the only `console` reference in the library. A new signal is a new
 * union member, and the compiler asks for its sentence.
 *
 * **Resolution.** Each resolver below reads `supplied ?? default`. A supplied
 * reporter replaces the default outright and runs in production: a caller
 * routing signals to telemetry does not also want them on the console, and one
 * that does can call `console.warn` itself. The default speaks only under its
 * own condition, which is development for every signal except
 * `InstrumentedInProduction`.
 *
 * `console` and `process.env` are ambient globals, which AGENTS.md §6 otherwise
 * keeps out of this codebase. They are confined to this file for the reason
 * `EvaluationId.ts` confines `crypto.randomUUID`: a boundary that lives in one
 * named file stays visible rather than dissolving into convention
 * ([ADR-QD-041](../../../spec/decisions/041-a-mismatch-is-announced.md)), and
 * since the confinement had already leaked once, `scripts/check-house-style.mjs`'s
 * `no-ambient-console` rule now fails any other package source file that reaches
 * for either.
 */
import type { ClientHydrationDropReason, Decision, Policy, Resource } from "@qadi/core";
import { hydrationDropMeaning } from "@qadi/core";
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import type { SeededDecision } from "./SeededDecision.ts";
import { permits } from "./SeededDecision.ts";

/** A server seed and this client's own answer, disagreeing about one question. */
export interface HydrationMismatch {
  readonly policy: Policy;
  /** The resource the question was asked about, if any. */
  readonly resource: Resource | undefined;
  /** What the server said, as hydrated — a projection, not an evaluation. */
  readonly seeded: SeededDecision;
  /** What this client decided — the answer now in effect. */
  readonly decided: Decision;
}

export type HydrationMismatchReporter = (mismatch: HydrationMismatch) => void;

/**
 * Whether to warn by default.
 *
 * The literal `process.env.NODE_ENV` text is load-bearing rather than
 * idiomatic: esbuild and Vite `define` substitute exactly that member
 * expression, so a production build folds this to `false` and eliminates the
 * `console.warn` below with it. `globalThis.process?.env?.["NODE_ENV"]` would
 * be tidier and would not be substituted, which is why it is not used. The
 * `typeof` guard is what keeps unbundled ESM from throwing `ReferenceError` in
 * a browser, where `process` does not exist at all.
 */
export const isDevelopment = (): boolean =>
  typeof process !== "undefined" && process.env.NODE_ENV !== "production";

/**
 * Every signal this library raises.
 *
 * Closed, and a union rather than a string: adding a signal is a new member
 * here, a sentence in {@link describeSignal}, and nothing else. The three
 * members `QadiProvider` raises are also the public {@link ProviderSignal}.
 */
type DeveloperSignal = Data.TaggedEnum<{
  /** `HydrationMismatch` is the public interface above; the member is named for the event. */
  SeedSuperseded: { readonly mismatch: HydrationMismatch };
  GateIdCollision: { readonly id: string };
  /** `dehydrateDecisions` dropped entries decided for another subject. */
  PayloadMixedSubjects: { readonly count: number };
  HydrationDropped: {
    readonly reason: ClientHydrationDropReason;
    readonly count: number;
    readonly wholePayload: boolean;
  };
  InstrumentedInProduction: {};
  AtomsReplaced: {};
  UnwritableGateRegistry: {};
}>;

const DeveloperSignal = Data.taggedEnum<DeveloperSignal>();

const verdict = (decision: Decision | SeededDecision): string =>
  permits(decision) ? "allowed" : "denied";

/** A sentence that begins mid-clause elsewhere, begun here. */
const sentence = (clause: string): string => `${clause.charAt(0).toUpperCase()}${clause.slice(1)}`;

/**
 * What to say about each signal.
 *
 * Built once at module scope (AGENTS.md §5a) and exhaustive, so a signal without
 * a sentence is a compile error rather than one that fails quietly.
 *
 * Each hydration sentence names the **fix**, not just the fact, by printing the
 * reason's `remedy` from `@qadi/core`'s `hydrationDropMeaning`: a developer
 * meeting one is looking at a page that re-decided everything from scratch and
 * has no other clue why. Counts and reasons are named, never entries — a dropped
 * decision belongs to *another subject*, and printing it would be the disclosure
 * the drop exists to prevent.
 */
const describeSignal: (signal: DeveloperSignal) => string = Match.type<DeveloperSignal>().pipe(
  Match.tagsExhaustive({
    SeedSuperseded: ({ mismatch }) => {
      // The client's reason is the payload: after a `HasRelationship` policy meets
      // an unwired resolver it reads "no relationship resolver could confirm the
      // 'owner' relation to 'doc-1'", which is the diagnosis.
      const because =
        mismatch.decided._tag === "Deny" ? ` — ${mismatch.decided.reason}` : "";
      // The **client's** trace names the policy, because a seed carries no trace
      // unless the server disclosed one (`Disclosure.Withheld` is the default), and
      // even a disclosed one is the server's evaluation, not the one now in effect.
      // Only this client's own trace is the evaluation that actually answered the
      // question.
      return (
        `[qadi] hydration mismatch for ${mismatch.decided.trace.policyTag}: the server ` +
        `${verdict(mismatch.seeded)}, this client ${verdict(mismatch.decided)}${because}. ` +
        `This client's answer is the one in effect.`
      );
    },
    GateIdCollision: ({ id }) =>
      `[qadi] two React roots minted the gate id "${id}" for one gate registry. ` +
      `Both guards are kept, the second under a disambiguated panel id. Give each ` +
      `root a distinct \`identifierPrefix\` in its hydrateRoot/createRoot options ` +
      `to fix the cause.`,
    PayloadMixedSubjects: ({ count }) =>
      `[qadi] dehydrateDecisions dropped ${count} decision(s) belonging to a ` +
      `different subject than the payload's. ` +
      `${sentence(hydrationDropMeaning("ForeignSubject").remedy)}.`,
    HydrationDropped: ({ reason, count, wholePayload }) => {
      // A refusal of the payload whole is not "zero decisions lost" when the
      // payload carried none, so it is announced as a refusal and the count is
      // only what the payload held.
      const lead = wholePayload
        ? `[qadi] hydrateDecisions refused the payload (${count} decision(s) in it): `
        : `[qadi] hydrateDecisions did not seed ${count} decision(s): `;
      return (
        `${lead}${hydrationDropMeaning(reason).remedy}. ` +
        `Those questions will be asked again from scratch.`
      );
    },
    InstrumentedInProduction: () =>
      "[qadi] <QadiProvider instrument> is true outside development. This is a debug " +
      "affordance: it registers every guarded control's policy, resource and verdict " +
      "for @qadi/devtools, readable by any script on the page. Pass instrument only in " +
      "development, or gate it the way you gate the devtools dock itself.",
    AtomsReplaced: () =>
      "[qadi] <QadiProvider>'s `atoms` prop changed identity after mount. " +
      "makeQadiAtoms() must be called once per context, at module scope " +
      "(or memoised) — this provider's registry is not rebuilt for a new " +
      "atom set, so the new atoms' initial values are silently ignored and " +
      "decisions from the previous atom set keep answering until this " +
      "provider unmounts.",
    UnwritableGateRegistry: () =>
      "[qadi] <QadiProvider>'s `gates` was not built by makeGateRegistry(); " +
      "guards under this provider will not register.",
  }),
);

/** The library's one console write. */
const say = (signal: DeveloperSignal): void => {
  console.warn(describeSignal(signal));
};

/**
 * The reporter an atom set will use, or `undefined` for none.
 *
 * A supplied callback replaces the warning outright rather than adding to it: a
 * caller routing mismatches to telemetry does not also want them on the
 * console, and one that does can call `console.warn` itself.
 */
export const hydrationMismatchReporter = (
  supplied: HydrationMismatchReporter | undefined,
): HydrationMismatchReporter | undefined =>
  supplied ??
  (isDevelopment() ? (mismatch) => say(DeveloperSignal.SeedSuperseded({ mismatch })) : undefined);

/**
 * Told when two live guards registered the same id with one gate registry.
 *
 * React's `useId` is unique within a root; two hydrated roots derive ids from
 * tree position and so collide. The registry keeps both guards (the second under
 * a disambiguated id) and says so once per id.
 */
export type GateIdCollisionReporter = (id: string) => void;

/**
 * The reporter a gate registry will use, or `undefined` for none.
 *
 * The sibling of {@link hydrationMismatchReporter}: a development-mode warning
 * by default, replaced outright by a supplied callback, which then runs in
 * production too.
 */
export const gateIdCollisionReporter = (
  supplied: GateIdCollisionReporter | undefined,
): GateIdCollisionReporter | undefined =>
  supplied ?? (isDevelopment() ? (id) => say(DeveloperSignal.GateIdCollision({ id })) : undefined);

/**
 * Told which entries a payload discarded.
 *
 * Generic in the element, so this module needs no import from `Hydration.ts` —
 * which would be a cycle, and a needless one: nothing here reads an entry. The
 * default reporter counts them and says nothing about their contents, because a
 * dropped decision belongs to *another subject* and printing it would be the
 * disclosure the drop exists to prevent.
 */
export type DroppedEntriesReporter<A> = (dropped: ReadonlyArray<A>) => void;

/**
 * The reporter `dehydrateDecisions` will use, or `undefined` for none.
 *
 * The sibling of {@link hydrationMismatchReporter}, deliberately the same shape:
 * a development-mode warning by default, replaced outright by a supplied
 * callback, which then runs in production too. A payload mixing subjects is a
 * cache-key bug on the server, and worth alerting on rather than only logging.
 */
export const droppedEntriesReporter = <A,>(
  supplied: DroppedEntriesReporter<A> | undefined,
): DroppedEntriesReporter<A> | undefined =>
  supplied ??
  (isDevelopment()
    ? (dropped) => say(DeveloperSignal.PayloadMixedSubjects({ count: dropped.length }))
    : undefined);

/**
 * Entries a client refused to seed, and why.
 *
 * Generic in the element for the reason {@link DroppedEntriesReporter} is: the
 * entry type lives in `Hydration.ts`, which imports this module, and nothing
 * here reads an entry.
 *
 * The reason is carried because each case has a different cause and a different
 * fix, and a bare count cannot tell them apart. The payload-level ones
 * (`PayloadSubjectMismatch`, `UnsupportedPayloadVersion`, `MalformedPayload`)
 * reject the payload whole, so `entries` is then every entry in it.
 */
export interface HydrationDrop<A> {
  readonly reason: ClientHydrationDropReason;
  readonly entries: ReadonlyArray<A>;
  /**
   * Whether the payload was refused whole rather than entry by entry.
   *
   * `entries` is then every entry the payload carried (possibly none, where the
   * value was not an envelope at all), and a count of them says nothing about
   * what was lost: the refusal is the event.
   */
  readonly wholePayload: boolean;
}

export type HydrationDropReporter<A> = (drop: HydrationDrop<A>) => void;

/**
 * The reporter `hydrateDecisions` will use, or `undefined` for none.
 *
 * One of this module's reporters, deliberately the same shape as the others: a
 * development-mode warning by default, replaced outright by a supplied
 * callback, which then runs in production.
 *
 * It exists because hydration had silent exits and this file had closed only
 * the one on the dehydrate side. A payload could name the wrong subject, carry
 * an entry malformed apart from its policy, or carry a policy that would not
 * decode, and in every case `hydrateDecisions` returned and said nothing — so
 * "hydration isn't working" had no signal attached to it at all. The current
 * set of reasons is `ClientHydrationDropReason` in `@qadi/core`.
 */
export const hydrationDropReporter = <A,>(
  supplied: HydrationDropReporter<A> | undefined,
): HydrationDropReporter<A> | undefined =>
  supplied ??
  (isDevelopment()
    ? ({ reason, entries, wholePayload }) =>
        say(DeveloperSignal.HydrationDropped({ reason, count: entries.length, wholePayload }))
    : undefined);

/**
 * What `QadiProvider` can tell a developer.
 *
 * Closed: a fourth situation is a new member here and in {@link DeveloperSignal},
 * never a widening of this type.
 *
 * - `InstrumentedInProduction`: `instrument` is `true` outside development.
 * - `AtomsReplaced`: the `atoms` prop changed identity after mount.
 * - `UnwritableGateRegistry`: `instrument` is on and the `gates` prop was not
 *   built by `makeGateRegistry()`, so its guards register nothing.
 */
export type ProviderSignal = Extract<
  DeveloperSignal,
  {
    readonly _tag: "InstrumentedInProduction" | "AtomsReplaced" | "UnwritableGateRegistry";
  }
>;

/** Told what `QadiProvider` detected, in place of the console default. */
export type ProviderSignalReporter = (signal: ProviderSignal) => void;

/**
 * The constructors `QadiProvider` raises its signals with.
 *
 * A record of functions rather than the union's own constructors, so the provider
 * can build exactly its three and no hydration signal.
 */
export const providerSignals = {
  instrumentedInProduction: (): ProviderSignal => DeveloperSignal.InstrumentedInProduction(),
  atomsReplaced: (): ProviderSignal => DeveloperSignal.AtomsReplaced(),
  unwritableGateRegistry: (): ProviderSignal => DeveloperSignal.UnwritableGateRegistry(),
};

/**
 * Whether the production-instrumentation warning has already fired.
 *
 * Module scope, not per-provider: several `QadiProvider`s can share one
 * process, and the point is a single signal that instrumentation reached a
 * production bundle at all, not one line per provider instance. It is the one
 * piece of process state in the library, kept in the one file allowed ambient
 * state; a supplied reporter bypasses it and is told once per mount instead.
 */
let warnedInstrumentedInProduction = false;

/**
 * The console default for the provider's signals, each under its own condition.
 *
 * `InstrumentedInProduction` is raised by the provider only outside development,
 * so its default needs just the once-per-process latch. The other two are raised
 * in any environment (a supplied reporter hears them in production) and speak on
 * the console only in development.
 */
const sayProviderSignal: ProviderSignalReporter = Match.type<ProviderSignal>().pipe(
  Match.tagsExhaustive({
    InstrumentedInProduction: (signal) => {
      if (warnedInstrumentedInProduction) return;
      warnedInstrumentedInProduction = true;
      say(signal);
    },
    AtomsReplaced: (signal) => {
      if (isDevelopment()) say(signal);
    },
    UnwritableGateRegistry: (signal) => {
      if (isDevelopment()) say(signal);
    },
  }),
);

/**
 * The reporter `QadiProvider` will use.
 *
 * Unlike the hydration resolvers this never returns `undefined`: the provider
 * detects each situation itself, and the default decides per signal whether it
 * speaks. A supplied callback replaces the default outright and runs in
 * production.
 */
export const providerSignalReporter = (
  supplied: ProviderSignalReporter | undefined,
): ProviderSignalReporter => supplied ?? sayProviderSignal;
