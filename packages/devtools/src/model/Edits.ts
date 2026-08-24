/**
 * The weakenings: one edit per thing the input gives the subject.
 *
 * This is the sweep that answers **"which of these grants is load-bearing?"** —
 * take each one away in turn and see what the policy says. It is the question a
 * reviewer holding an allow actually has, and it is not answerable by reading a
 * trace: a trace says which nodes were consulted, not which grant would have
 * been missed if it were gone. `anyOf` makes the difference concrete — two
 * grants both satisfying one branch means neither is load-bearing, and the
 * trace shows only the first.
 *
 * The strengthenings are the mirror question and live in `Remedies.ts`; they
 * need the policy, which these do not.
 *
 * **Everything derived here is a removal from `SimulationInput`, never from the
 * question.** The action and the resource are what is being asked, not what the
 * subject holds, so dropping them would produce `MissingAction` rows that say
 * nothing about the subject's standing.
 */
import type { ActedEventInput, RelationshipEdgeInput } from "@qadi/core";
import type { SimulationEdit } from "./SimulationEdit.ts";
import { composeEdits } from "./SimulationEdit.ts";
import type { SimulationInput } from "./SimulationInput.ts";

/**
 * Every single-step weakening, in the input's own order.
 *
 * Order is roles, permissions, subject attributes, fixture attributes,
 * relationships, then events — and within each, the order the input listed
 * them. Determinism is the property that matters (the same input yields the
 * same rows in the same places, so a reviewer comparing two sweeps compares
 * like with like); this particular order is chosen because it runs from what a
 * subject *is* toward what the world around them says.
 */
export const singleEdits = (input: SimulationInput): ReadonlyArray<SimulationEdit> =>
  dedupeByLabel([
    ...roleDrops(input),
    ...permissionDrops(input),
    ...subjectAttributeDrops(input),
    ...fixtureAttributeDrops(input),
    ...relationshipDrops(input),
    ...eventDrops(input),
  ]);

/**
 * How many second-order rows a sweep will run before it stops.
 *
 * Pairs grow as n²/2, so a subject with a dozen grants is sixty-six extra
 * evaluations from one click — against `Live` that is sixty-six round trips.
 * The cap is a number rather than a policy so a caller can raise it knowingly,
 * and `pairEdits` reports what it dropped rather than truncating in silence.
 */
export const DEFAULT_MAX_PAIRS = 50;

export interface PairSweep {
  readonly pairs: ReadonlyArray<SimulationEdit>;
  /** Pairs the cap excluded. Zero when every pair fits. */
  readonly omitted: number;
}

/**
 * Every unordered pair of the given edits, capped.
 *
 * Second-order matters because first-order can be uniformly uninformative:
 * where two grants each independently satisfy an `anyOf`, dropping either one
 * changes nothing and the single-edit sweep reports six rows of *no change*.
 * Dropping both is the row that names the branch. So this is opt-in rather than
 * default — it is the answer to a question the first sweep raises, not one to
 * ask before it has been raised.
 *
 * Unordered: `a + b` and `b + a` reach the same input for every edit this
 * package derives, and running both would double the cost to restate a row.
 */
export const pairEdits = (
  edits: ReadonlyArray<SimulationEdit>,
  max: number = DEFAULT_MAX_PAIRS,
): PairSweep => {
  // Counted arithmetically rather than accumulated, so the cap can stop the
  // walk early and still report honestly. `Math.max` so an empty list counts
  // zero rather than `-0`, which `deepStrictEqual` distinguishes and a reader
  // would not.
  const total = (edits.length * Math.max(0, edits.length - 1)) / 2;
  const pairs: Array<SimulationEdit> = [];

  for (const [first, second] of combinations(edits)) {
    if (pairs.length >= max) break;
    pairs.push(composeEdits(first, second));
  }

  return { pairs, omitted: total - pairs.length };
};

/**
 * Every unordered pair, lazily.
 *
 * A generator rather than two nested loops so the cap is **one** `break` rather
 * than two: written with nested loops the outer guard is unreachable by any
 * input the inner guard does not already stop, and an unreachable branch is one
 * no test can pin. Laziness is also what makes the cap cheap — fifty pairs out
 * of a thousand edits walks the outer list once rather than a thousand times.
 *
 * `entries` and `slice` rather than subscripts, for the same reason: indexing
 * would need two `!== undefined` guards that no input can reach.
 */
function* combinations(
  edits: ReadonlyArray<SimulationEdit>,
): Generator<readonly [SimulationEdit, SimulationEdit]> {
  for (const [index, first] of edits.entries()) {
    for (const second of edits.slice(index + 1)) yield [first, second];
  }
}

/**
 * The first edit of each label.
 *
 * An input may list the same role twice, or the same relationship edge twice —
 * both are legal and neither is worth two identical rows. Labels are the
 * identity because they are what the sweep is keyed by on screen; two edits
 * that read the same and do the same thing *are* the same row.
 */
const dedupeByLabel = (edits: ReadonlyArray<SimulationEdit>): ReadonlyArray<SimulationEdit> => {
  const seen = new Set<string>();
  return edits.filter((edit) => {
    if (seen.has(edit.label)) return false;
    seen.add(edit.label);
    return true;
  });
};

const weaken = (
  kind: SimulationEdit["kind"],
  label: string,
  apply: (self: SimulationInput) => SimulationInput,
): SimulationEdit => ({ kind, direction: "Weaken", label, apply });

/**
 * Applying an edit to an input that does not list the field at all leaves that
 * input exactly as it was.
 *
 * `apply` is public and composes, so nothing stops an edit derived from one
 * input running against another. Rebuilding the field as an empty one would
 * turn "no roles listed" into "an empty role list" — indistinguishable to the
 * evaluator, but not to a panel diffing the two inputs, and a row claiming to
 * have changed something it did not is the one thing a what-if table must never
 * do.
 */
const roleDrops = (input: SimulationInput): ReadonlyArray<SimulationEdit> =>
  (input.subject.roles ?? []).map((role) =>
    weaken("DropRole", `without role ${role}`, (self) => {
      const held = self.subject.roles;
      if (held === undefined) return self;
      return { ...self, subject: { ...self.subject, roles: held.filter((r) => r !== role) } };
    }),
  );

const permissionDrops = (input: SimulationInput): ReadonlyArray<SimulationEdit> =>
  (input.subject.permissions ?? []).map((key) =>
    weaken("DropPermission", `without permission ${key}`, (self) => {
      const held = self.subject.permissions;
      if (held === undefined) return self;
      return { ...self, subject: { ...self.subject, permissions: held.filter((p) => p !== key) } };
    }),
  );

/**
 * Subject attributes and resolver fixtures are dropped separately, and labelled
 * apart, because they are answered by different ports and a reviewer needs to
 * know which one mattered. An attribute present in both is resolved from the
 * subject ([INV-QD-025]), so dropping only the fixture changes nothing — which
 * is itself the finding, and it is only legible if the two rows are
 * distinguishable.
 */
const subjectAttributeDrops = (input: SimulationInput): ReadonlyArray<SimulationEdit> =>
  Object.keys(input.subject.attributes ?? {}).map((key) =>
    weaken("DropSubjectAttribute", `without subject attribute ${key}`, (self) => {
      const held = self.subject.attributes;
      if (held === undefined) return self;
      return { ...self, subject: { ...self.subject, attributes: omitKey(held, key) } };
    }),
  );

const fixtureAttributeDrops = (input: SimulationInput): ReadonlyArray<SimulationEdit> =>
  Object.keys(input.attributes ?? {}).map((key) =>
    weaken("DropFixtureAttribute", `without resolver attribute ${key}`, (self) => {
      const held = self.attributes;
      if (held === undefined) return self;
      return { ...self, attributes: omitKey(held, key) };
    }),
  );

const relationshipDrops = (input: SimulationInput): ReadonlyArray<SimulationEdit> =>
  (input.relationships ?? []).map((edge) =>
    weaken("DropRelationship", `without ${edgeLabel(edge, input.subject.id)}`, (self) => {
      const held = self.relationships;
      if (held === undefined) return self;
      return { ...self, relationships: held.filter((other) => !sameEdge(edge, other)) };
    }),
  );

const eventDrops = (input: SimulationInput): ReadonlyArray<SimulationEdit> =>
  (input.history ?? []).map((event) =>
    weaken("DropEvent", `without ${eventLabel(event, input.subject.id)}`, (self) => {
      const held = self.history;
      if (held === undefined) return self;
      return { ...self, history: held.filter((other) => !sameEvent(event, other)) };
    }),
  );

/**
 * Field by field rather than by reference or by `Equal.equals`.
 *
 * By reference would be enough for edits this module derives — they are built
 * from the very array they filter — but `apply` is public and composes, so a
 * pair edit runs the second filter over an array the first one rebuilt. Those
 * elements are the same objects today; relying on it would make the correctness
 * of a sweep depend on an implementation detail of the shallow copy above it.
 */
export const sameEdge = (a: RelationshipEdgeInput, b: RelationshipEdgeInput): boolean =>
  a.subjectId === b.subjectId && a.relation === b.relation && a.resourceId === b.resourceId;

export const sameEvent = (a: ActedEventInput, b: ActedEventInput): boolean =>
  a.subjectId === b.subjectId && a.event === b.event && a.resourceId === b.resourceId;

/**
 * The subject is named only when it is not the one being simulated.
 *
 * A fixture list is usually all about the subject in the form, and repeating
 * their id on every row is noise; an edge belonging to somebody else is the
 * unusual case and is exactly the one worth spelling out.
 */
const edgeLabel = (edge: RelationshipEdgeInput, subjectId: string): string =>
  edge.subjectId === subjectId
    ? `relationship ${edge.relation} on ${edge.resourceId}`
    : `relationship ${edge.relation} on ${edge.resourceId} for ${edge.subjectId}`;

const eventLabel = (event: ActedEventInput, subjectId: string): string =>
  event.subjectId === subjectId
    ? `event ${event.event} on ${event.resourceId}`
    : `event ${event.event} on ${event.resourceId} by ${event.subjectId}`;

/** A copy without one key. `delete` on a copy would do, but this stays an expression. */
const omitKey = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
