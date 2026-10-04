/**
 * Server-rendered decisions, seeded into a client registry.
 *
 * Without this a server-rendered page shows every guarded control in its pending
 * state and re-decides after mount — a visible flash, and a round trip per policy
 * the page already knows the answer to.
 *
 * Both functions are **pure and synchronous**. Nothing here touches React; the
 * output of `hydrateDecisions` is `QadiProviderProps.initialValues`.
 *
 * The security shape of this module is the point, and it is
 * [ADR-QD-028](../../../spec/decisions/028-decision-hydration.md): a payload is
 * authorization state crossing a network, so it is **bound to a subject id**, it
 * **carries no trace** by default, and every entry it cannot verify is
 * **dropped** rather than trusted.
 *
 * The public interface over `HydrationEngine.ts`, which owns the payload codec,
 * the seed atoms and the precedence rule, and stays out of the barrel
 * (ADR-QD-039). What a consumer may hold is re-exported here **by name**.
 */
import type { AuthSubject } from "@qadi/core";
import { countDropped } from "./HydrationCounts.ts";
import type { DecisionEntry, DehydratedDecisions, DehydratedPayload, HydrateOptions, InitialValues } from "./HydrationEngine.ts";
import { dehydratedPayload, dehydrateEntry } from "./HydrationEngine.ts";
import { droppedEntriesReporter } from "./HydrationWarning.ts";
import type { QadiAtoms } from "./QadiAtoms.ts";

// Named explicitly rather than reached through the barrel: `HydrationWarning.ts`
// and `HydrationEngine.ts` stay out of it (AGENTS.md §9), and `.d.ts` emission has
// to be able to name what `HydrateOptions` refers to (TS2883). The same re-export
// `QadiAtoms.ts` makes for `HydrationMismatch`, for the same reason.
export type { HydrationDrop, HydrationDropReporter } from "./HydrationWarning.ts";
export type { DecisionEntry, DehydratedDecisions, DehydratedEntry } from "./HydrationEngine.ts";
export type { DehydratedDecisionsV1, DehydratedEntryV1, DehydratedPayload } from "./HydrationEngine.ts";
export type { HydrateOptions } from "./HydrationEngine.ts";
export type { AllowDisclosure, ClientDecision, DenyDisclosure } from "./SeededDecision.ts";
export type { SeededDecision } from "./SeededDecision.ts";
export { SeededAllow, SeededDeny, isSeeded, permits } from "./SeededDecision.ts";

export interface DehydrateOptions {
  /**
   * Ship the full trace, and a denial's reason.
   *
   * Off by default, and the default is the security decision. A trace names every
   * node's tag, its label and the sentence explaining why it refused — a
   * description of the policy's internal structure plus which branch this subject
   * failed, readable by anyone with developer tools and by any script on the page.
   * Withheld, an entry carries `disclosure: { _tag: "Withheld" }` and neither.
   */
  readonly includeTrace?: boolean;
  /**
   * Called with the entries discarded for belonging to another subject.
   *
   * Supplying this replaces the development-mode console warning and runs in
   * production, exactly as `onHydrationMismatch` does — a payload mixing
   * subjects means something upstream fed this call two users' decisions, which
   * is a bug worth alerting on rather than only logging.
   *
   * It observes; it cannot change the outcome. The entries are dropped either
   * way ([BEH-QD-146](../../../spec/behaviors/19-hydration.md)) — the only safe
   * reading of a mixed payload is to trust none of it.
   */
  readonly onDropped?: (dropped: ReadonlyArray<DecisionEntry>) => void;
}

/**
 * Projects decisions into a payload safe to embed in a server-rendered page.
 *
 * Every entry must belong to the same subject; the first one's `subjectId` names
 * the payload and any entry disagreeing with it is **dropped**, because a payload
 * mixing subjects is a bug whose only safe reading is to trust none of it.
 */
export const dehydrateDecisions = (
  entries: ReadonlyArray<DecisionEntry>,
  options?: DehydrateOptions,
): DehydratedDecisions => {
  // `undefined`, not `""` (EC-06): an empty `entries` names no subject at
  // all, and `""` is not a value `SubjectId` can actually hold, so it read as
  // data rather than as "nothing here." `subjectId` is `undefined` only when
  // `entries` is already empty, so the filter below still reduces to `[]`
  // in that case with no special-casing needed.
  const subjectId = entries[0]?.decision.subjectId;
  const includeTrace = options?.includeTrace ?? false;

  const kept = entries.filter((e) => e.decision.subjectId === subjectId);

  // Said, not merely done. Dropping is correct and specified; doing it in
  // silence is what let a server ship one row where it meant to ship a thousand
  // and see nothing wrong.
  if (kept.length !== entries.length) {
    countDropped("ForeignSubject", entries.length - kept.length);
    const report = droppedEntriesReporter(options?.onDropped);
    if (report !== undefined) {
      report(entries.filter((e) => e.decision.subjectId !== subjectId));
    }
  }

  // Counted here rather than left to the caller. A count is what makes the
  // *other* end legible: `qadi_hydration_seeded_total` next to this one is the
  // difference between "hydration ran" and "hydration ran and did nothing".
  return dehydratedPayload(
    subjectId,
    kept.map((entry) => dehydrateEntry(entry, includeTrace)),
  );
};

/**
 * Turns a payload into `initialValues` for `QadiProvider`.
 *
 * **Drops** every entry whose `subjectId` is not this subject's, and every entry
 * whose shape or policy this client cannot verify. A dropped entry leaves its atom
 * `Initial`, so the client asks the question properly — the page flashes, which is
 * exactly what would have happened without hydration and is the correct outcome
 * for a payload that cannot be verified.
 *
 * Not throwing is deliberate, **whatever the payload is**: it arrives as JSON in
 * a page, and `JSON.parse` yields `any`, so a value that is not even an envelope
 * is dropped and counted like any other. A cache serving one user's page to
 * another is a misconfiguration, and turning it into a blank page would be a
 * worse outcome than re-deciding. Trusting it would be a breach.
 *
 * Every one of those exits is **announced and counted**. They were all silent,
 * which made a page that re-decided everything from scratch indistinguishable
 * from one that had nothing to hydrate.
 *
 * Accepts the current payload and the one before it (no `version` field); the
 * older one always seeds with its trace withheld.
 *
 * Delegates to {@link QadiAtoms.hydrate}, the capability the atom set closes over
 * its own seed atoms. An atom set that merely forwards `decision`/`decisionFor`
 * — a spread copy, a wrapper — therefore seeds the same questions its inner one
 * does, which is correct: its decision atoms are the real ones.
 */
export const hydrateDecisions = (
  atoms: QadiAtoms,
  dehydrated: DehydratedPayload,
  subject: AuthSubject,
  options?: HydrateOptions,
): InitialValues => atoms.hydrate(dehydrated, subject, options);
