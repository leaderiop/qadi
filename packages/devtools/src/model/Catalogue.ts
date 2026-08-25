/**
 * Which policies exist, and how each of them has been deciding.
 *
 * **Observed rather than registered**, and that is the whole design. Every
 * `DecisionRecord` already carries the `Policy` it evaluated
 * ([BEH-QD-183](../../../../spec/behaviors/24-decision-sink.md)), so the set of
 * policies an application actually uses is derivable from the timeline with no
 * new API, no registration call sites, and no service that exists only for a
 * debug view. The alternative — a `PolicyRegistry` on the `PermissionRegistry`
 * precedent — buys only the policies nobody has evaluated yet, and an optional
 * `Catalogue` supplies those at a fraction of the cost.
 *
 * The honest limit is stated rather than hidden: a rail built from observation
 * shows what has run. A policy that has never been evaluated appears only if the
 * application names it, and is marked as never evaluated when it does.
 */
import * as Equal from "effect/Equal";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import type { Policy, Role } from "@qadi/core";
import { inspect } from "./Inspect.ts";
import type { Timeline, TimelineEntry } from "./Timeline.ts";
import { verdictOf, type Verdict } from "./Verdict.ts";

/** Policies and roles an application names, whether or not they have run. */
export interface Catalogue {
  readonly policies?: Readonly<Record<string, Policy>>;
  readonly roles?: ReadonlyArray<Role>;
}

export interface PolicySighting {
  readonly policy: Policy;
  readonly label: string;
  /** Decisions made against this policy. Zero for a declared, never-evaluated one. */
  readonly count: number;
  readonly allows: number;
  readonly denies: number;
  readonly errors: number;
  /** When it last decided. Absent when it never has. */
  readonly lastAt: number | undefined;
}

/**
 * A short name for a policy, for a list.
 *
 * Derived from `inspect` rather than from a second walk of the policy tree: the
 * root node of that tree already carries the phrasing for every variant —
 * `Labeled` yields the author's own name, a leaf yields its requirement — and
 * writing the same dispatch again here is the shape of duplication this codebase
 * treats as a defect ([INV-QD-018](../../../../spec/invariants.md)).
 *
 * **A label is a display string, never an identity.** Two different policies can
 * derive the same one, and they stay two entries.
 */
export const policyLabel = (policy: Policy): string => {
  const node = inspect(policy, undefined);
  // Arity only where it disambiguates: `all of (2)` says something, while
  // `not (1)` and `canPublish (1)` say nothing and cost a reader a glance.
  //
  // Nothing else is appended — an earlier version put the duty id on an
  // `obliged` label and needed a guard for a `detail` that is always present,
  // which the mutation gate reported as dead. The tree already names the duty,
  // and a caller who wants a distinct name in the rail has `labeled`.
  const branching = node.kind === "All" || node.kind === "Any" || node.kind === "Table";
  return branching ? `${node.label} (${node.children.length})` : node.label;
};

/**
 * Every policy the timeline has seen, most recently decided first.
 *
 * Grouped by `Equal.equals`, which is **structural** for plain objects in
 * Effect v4 — the same property `Atom.family` relies on to share one atom
 * between two independently constructed but equal policies, and one that
 * `packages/react/test/v4-reactivity-smoke.test.ts` pins precisely because a
 * change either way would be silent and serious. Two components building the
 * same policy inline therefore contribute to one row, which is what a reader
 * expects and what the evaluator already does.
 *
 * `MutableHashMap` rather than a linear scan with `Equal.equals`: the scan is
 * what `pairedEntries` does and is fine there, where the comparison is two
 * strings. Here it is a deep walk of a policy tree per pair, and a bounded
 * timeline of 500 rows against fifty distinct policies would do twenty-five
 * thousand of them per render.
 */
export const policiesSeen = (self: Timeline): ReadonlyArray<PolicySighting> => {
  const grouped = MutableHashMap.empty<Policy, Mutable>();

  // Walked **newest first**, so the map's insertion order is already
  // most-recently-decided first and there is no comparator here at all.
  //
  // That is not a micro-optimisation, it is the avoidance of a second ordering
  // rule: the timeline is already totally ordered, `at` and all
  // ([INV-QD-039](../../../../spec/invariants.md)), so borrowing its order
  // means this screen cannot disagree with the log about which decision came
  // last. A comparator here would also have had to re-solve `NaN`, which the
  // timeline already solved once.
  for (const entry of [...self.entries].reverse()) {
    // An orphan is an obligation outcome; it carries no policy, so there is
    // nothing here to attribute.
    if (entry._tag !== "TimelineDecision") continue;
    const policy = entry.decision.policy;
    // Set unconditionally: re-setting a key to the tally already stored there
    // is a no-op, so a guard for it had no observable else.
    const tally = Option.getOrUndefined(MutableHashMap.get(grouped, policy)) ?? fresh(policy, entry);
    MutableHashMap.set(grouped, policy, tally);
    record(tally, entry);
  }

  return [...MutableHashMap.values(grouped)].map(seal);
};

/**
 * The observed policies, plus any the application named that have not run.
 *
 * A declared policy that *has* run is not duplicated — it is matched
 * structurally, exactly as two observed occurrences are — but it does take the
 * declared name, since a name someone chose beats a structural summary.
 */
export const catalogueOf = (
  self: Timeline,
  declared?: Catalogue,
): ReadonlyArray<PolicySighting> => {
  const seen = policiesSeen(self);
  const named = Object.entries(declared?.policies ?? {});

  const relabelled = seen.map((sighting) => {
    const match = named.find(([, policy]) => Equal.equals(policy, sighting.policy));
    return match === undefined ? sighting : { ...sighting, label: match[0] };
  });

  const unseen = named
    .filter(([, policy]) => !seen.some((sighting) => Equal.equals(policy, sighting.policy)))
    .map(([label, policy]): PolicySighting => ({
      policy,
      label,
      count: 0,
      allows: 0,
      denies: 0,
      errors: 0,
      lastAt: undefined,
    }));

  // Declared-but-unrun after the observed ones: a reader opening this screen is
  // looking at what their application is doing, not at what it could do.
  return [...relabelled, ...unseen];
};

/**
 * A tally under construction.
 *
 * `lastAt` is a plain number here where `PolicySighting` allows it to be
 * absent, and the difference is the point: a tally exists only because an entry
 * created it, so it always has a time — while a *declared* sighting has never
 * decided and genuinely has none.
 *
 * Counts are a record keyed by verdict rather than three fields behind three
 * `if`s. An orphan never reaches here, so the `Unknown` bucket stays empty —
 * but writing that as `else { errors += 1 }` would have been a branch no test
 * could distinguish from the truth, which is exactly what the mutation gate
 * reported.
 */
interface Mutable {
  readonly policy: Policy;
  readonly label: string;
  readonly byVerdict: Record<Verdict, number>;
  count: number;
  readonly lastAt: number;
}

const fresh = (policy: Policy, entry: TimelineEntry): Mutable => ({
  policy,
  // Once per distinct policy rather than once per record: the label walks the
  // policy tree, and a busy timeline holds five hundred rows.
  label: policyLabel(policy),
  byVerdict: { Allow: 0, Deny: 0, Error: 0, Unknown: 0 },
  count: 0,
  // The walk is newest-first, so the entry that creates the tally is the latest
  // one — and nothing after it may overwrite this.
  lastAt: entry.at,
});

const record = (tally: Mutable, entry: TimelineEntry): void => {
  tally.count += 1;
  tally.byVerdict[verdictOf(entry)] += 1;
};

const seal = (tally: Mutable): PolicySighting => ({
  policy: tally.policy,
  label: tally.label,
  count: tally.count,
  allows: tally.byVerdict.Allow,
  denies: tally.byVerdict.Deny,
  errors: tally.byVerdict.Error,
  lastAt: tally.lastAt,
});
