/**
 * Every developer-facing signal `@qadi/react` can raise, and the one place any
 * of them reaches the console.
 *
 * Eight signals live here, as one closed union ({@link DeveloperSignal}): a
 * server seed superseded by this client's own answer, two React roots minting
 * one gate id, an entry a dehydration left out, a hydration drop, a
 * reporter the host supplied that threw, and the three situations
 * `QadiProvider` detects (instrumentation in a production
 * bundle, an `atoms` prop replaced after mount, a gate registry guards cannot
 * write to). One module-scope `Match` gives each its sentence and one function,
 * `say`, is the only `console` reference in the library. A new signal is a new
 * union member, and the compiler asks for its sentence.
 *
 * **Resolution.** Each resolver below returns the supplied reporter, contained,
 * or else the default. A supplied reporter replaces the default outright and
 * runs in production: a caller routing signals to telemetry does not also want
 * them on the console, and one that does can call `console.warn` itself. The default speaks only under its
 * own condition, which is development for every signal except
 * `InstrumentedInProduction`.
 *
 * **A supplied reporter observes; it cannot change the outcome.** Each resolver
 * wraps what it is handed once, in {@link contain}, so a reporter that throws is
 * announced as `ReporterThrew` and then ignored: the result, the seeds, the
 * counts and the render are what they would have been had it returned (ARCH-60).
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
import type {
  ClientHydrationDropReason,
  Decision,
  DehydrationDropReason,
  HydrationDropReason,
  Policy,
  Resource,
} from "@qadi/core";
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
  /** `dehydrateDecisions` left entries out of a payload, for one reason. */
  DehydrationDropped: { readonly reason: DehydrationDropReason; readonly count: number };
  HydrationDropped: {
    readonly reason: ClientHydrationDropReason;
    readonly count: number;
    readonly wholePayload: boolean;
  };
  /** A reporter the host supplied threw; what it was told about stands. */
  ReporterThrew: { readonly reporter: ReporterName; readonly error: unknown };
  InstrumentedInProduction: {};
  AtomsReplaced: {};
  UnwritableGateRegistry: {};
}>;

/** A hook a host can supply, named as the option it is passed through. */
type ReporterName = "onHydrationMismatch" | "onGateIdCollision" | "onDropped" | "onDeveloperSignal";

const DeveloperSignal = Data.taggedEnum<DeveloperSignal>();

const verdict = (decision: Decision | SeededDecision): string =>
  permits(decision) ? "allowed" : "denied";

/**
 * An error as one short line: `name: message` for an `Error`, else its string
 * form. Only the error: never the value the reporter was handed, which may be
 * another subject's decision.
 */
const errorLine = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

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
    DehydrationDropped: ({ reason, count }) =>
      `[qadi] dehydrateDecisions dropped ${count} decision(s): ${hydrationDropMeaning(reason).remedy}.`,
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
    ReporterThrew: ({ reporter, error }) =>
      `[qadi] the ${reporter} reporter you supplied threw (${errorLine(error)}). ` +
      `The outcome it was told about stands — nothing was skipped, seeded ` +
      `differently or left uncounted. Fix the reporter.`,
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
 * A supplied reporter that cannot change the outcome it observes.
 *
 * Wrapped once, at resolution: a throw is announced as `ReporterThrew` and
 * swallowed, so the caller carries on exactly as if the reporter had returned.
 * Said in **every** environment, because the host replaced the default and
 * nothing else will ever say it (BEH-QD-230's reason for announcing a drop at
 * all). The library's own defaults are not wrapped: `say` does not throw.
 */
const contain =
  <A,>(reporter: ReporterName, supplied: (value: A) => void) =>
  (value: A): void => {
    try {
      supplied(value);
    } catch (error) {
      say(DeveloperSignal.ReporterThrew({ reporter, error }));
    }
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
  supplied === undefined
    ? isDevelopment()
      ? (mismatch) => say(DeveloperSignal.SeedSuperseded({ mismatch }))
      : undefined
    : contain("onHydrationMismatch", supplied);

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
  supplied === undefined
    ? isDevelopment()
      ? (id) => say(DeveloperSignal.GateIdCollision({ id }))
      : undefined
    : contain("onGateIdCollision", supplied);

/**
 * Entries a payload discarded, and why: the one drop shape both ends report.
 *
 * Generic in the entry, so this module needs no import from `HydrationEvent.ts`
 * (a cycle, and a needless one: nothing here reads an entry), and in the reason,
 * so the dehydrate side's hook says `DehydrationDropReason` and the hydrate
 * side's says `ClientHydrationDropReason` — the default, so `HydrationDrop<A>`
 * still means the hydrate side. One function typed over the whole
 * `HydrationDropReason` union serves both (ARCH-60, D-53-b option-a).
 *
 * The reason is carried because each case has a different cause and a different
 * fix, and a bare count cannot tell them apart. The payload-level ones
 * (`PayloadSubjectMismatch`, `UnsupportedPayloadVersion`, `MalformedPayload`,
 * `PayloadTooDeep`) reject the payload whole, so `entries` is then every entry in
 * it. The dehydrate side builds a payload and never refuses one whole, so its
 * `wholePayload` is always `false`.
 */
export interface HydrationDrop<A, R extends HydrationDropReason = ClientHydrationDropReason> {
  readonly reason: R;
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

export type HydrationDropReporter<A, R extends HydrationDropReason = ClientHydrationDropReason> = (
  drop: HydrationDrop<A, R>,
) => void;

/**
 * The development default for entries `dehydrateDecisions` left out.
 *
 * Counts them and says nothing about their contents, because a dropped decision
 * may belong to *another subject* and printing it would be the disclosure the
 * drop exists to prevent.
 */
export const saysDehydrationDropped: HydrationDropReporter<unknown, DehydrationDropReason> = ({
  reason,
  entries,
}) => say(DeveloperSignal.DehydrationDropped({ reason, count: entries.length }));

/** The development default for entries, or a payload, `hydrateDecisions` did not seed. */
export const saysHydrationDropped: HydrationDropReporter<unknown> = ({ reason, entries, wholePayload }) =>
  say(DeveloperSignal.HydrationDropped({ reason, count: entries.length, wholePayload }));

/**
 * The drop reporter one end will use, or `undefined` for none.
 *
 * One of this module's reporters, deliberately the same shape as the others: a
 * development-mode warning by default, replaced outright by a supplied
 * callback, which then runs in production too. Generic in the reason so both
 * ends resolve through it; which sentence the default says is the caller's
 * `byDefault` — {@link saysDehydrationDropped} for the slot a `LeftOut` event is
 * announced to, {@link saysHydrationDropped} for the one `PayloadRefused` and
 * `EntriesDropped` are — so it is chosen by the event's tag, never by testing
 * the reason string.
 *
 * It exists because hydration had silent exits. An entry left out of a payload
 * is a bug on the server (a cache key mixing two users' decisions, a policy the
 * schema cannot carry), and a payload the client cannot verify left "hydration
 * isn't working" with no signal attached to it at all. The current reasons are
 * `HydrationDropReason` in `@qadi/core`.
 */
export const hydrationDropReporter = <A, R extends HydrationDropReason = ClientHydrationDropReason>(
  supplied: HydrationDropReporter<A, R> | undefined,
  byDefault: HydrationDropReporter<A, R>,
): HydrationDropReporter<A, R> | undefined =>
  supplied === undefined ? (isDevelopment() ? byDefault : undefined) : contain("onDropped", supplied);

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
): ProviderSignalReporter =>
  supplied === undefined ? sayProviderSignal : contain("onDeveloperSignal", supplied);
