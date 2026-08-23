/**
 * Announcing that a server seed was superseded by this client's own answer.
 *
 * I-0 made the client's answer win ([INV-QD-028](../../../spec/invariants.md)),
 * which is correct and silent. Silence is the problem this module solves: a
 * developer whose client wiring is incomplete now gets a guarded control that
 * appears on first paint and vanishes on hydration, on every page, with nothing
 * naming the cause.
 *
 * `console` and `process.env` are ambient globals, which AGENTS.md §6 otherwise
 * keeps out of this codebase, and these are the first of either in it. They are
 * confined to this file for the reason `EvaluationId.ts` confines
 * `crypto.randomUUID`: a boundary that lives in one named file stays visible
 * rather than dissolving into convention
 * ([ADR-QD-041](../../../spec/decisions/041-a-mismatch-is-announced.md)).
 */
import type { Decision, Policy, Resource } from "@qadi/core";
import { isAllowed } from "@qadi/core";

/** A server seed and this client's own answer, disagreeing about one question. */
export interface HydrationMismatch {
  readonly policy: Policy;
  /** The resource the question was asked about, if any. */
  readonly resource: Resource | undefined;
  /** What the server said, as hydrated. */
  readonly seeded: Decision;
  /** What this client decided — the answer now in effect. */
  readonly decided: Decision;
}

export type HydrationMismatchReporter = (mismatch: HydrationMismatch) => void;

/**
 * Whether the two answers disagree.
 *
 * The **verdict** only. Two allows differing in `visibleFields` or obligations
 * are not a mismatch: what a developer sees, and what this exists to explain,
 * is a control appearing and then disappearing. Field-set differences would
 * report every projection difference as a wiring problem.
 */
export const isMismatch = (seeded: Decision, decided: Decision): boolean =>
  isAllowed(seeded) !== isAllowed(decided);

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

const verdict = (decision: Decision): string =>
  isAllowed(decision) ? "allowed" : "denied";

const warnMismatch = (mismatch: HydrationMismatch): void => {
  // The client's reason is the payload: after a `HasRelationship` policy meets
  // an unwired resolver it reads "no relationship resolver is wired, so no
  // 'owner' relation to 'doc-1' can be confirmed", which is the diagnosis.
  const because =
    mismatch.decided._tag === "Deny" ? ` — ${mismatch.decided.reason}` : "";
  // The **client's** trace names the policy, not the seed's. A hydrated trace is
  // a reduced projection whose `policyTag` is the server's root — and for a
  // payload shipped without `includeTrace` it is a stand-in, `"AllOf"`, naming
  // nothing. Only this client's own trace is guaranteed to describe the policy
  // actually in question.
  console.warn(
    `[qadi] hydration mismatch for ${mismatch.decided.trace.policyTag}: the server ` +
      `${verdict(mismatch.seeded)}, this client ${verdict(mismatch.decided)}${because}. ` +
      `This client's answer is the one in effect.`,
  );
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
  supplied ?? (isDevelopment() ? warnMismatch : undefined);

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

const warnDropped = (dropped: ReadonlyArray<unknown>): void => {
  console.warn(
    `[qadi] dehydrateDecisions dropped ${dropped.length} decision(s) belonging to a ` +
      `different subject than the payload's. A payload mixing subjects has no safe ` +
      `reading, so the others were discarded — check what fed this call.`,
  );
};

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
  supplied ?? (isDevelopment() ? warnDropped : undefined);
