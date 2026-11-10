/**
 * The strengthenings: for each thing the policy asks for, an edit that supplies it.
 *
 * `Edits.ts` answers "which of my grants is load-bearing?" — the question a
 * reviewer holding an **allow** has. This answers the other one, and it is the
 * question a reviewer holding a **denial** has: *what would fix it?* Dropping
 * grants can never turn a denial into an allow, so on the screen where it
 * matters most the weakening sweep produces a table of rows that all say the
 * same nothing.
 *
 * Answering it needs the policy, which the weakenings do not: the candidates
 * are exactly the requirements the policy names.
 *
 * **The interesting part is attributes.** "Grant the `editor` role" is a name
 * lifted straight out of the ADT; "set `clearance` to something satisfying
 * `gte(5)`" means reading a matcher backwards to a witness. `satisfyingValue`
 * does that, and it says so when it cannot rather than inventing a value that
 * quietly fails to match — a remedy row that does not remedy is worse than an
 * absent one, because the reviewer reads it as "and even that would not help".
 */
import * as Match from "effect/Match";
import {
  foldMatcherCases,
  foldPolicyCases,
  getByPath,
  isSecurityLabel,
  judgeMatcher,
  makeSubjectId,
  permissionKey,
  resourceIdOf,
} from "@qadi/core";
import type {
  HistoryScope,
  Matcher,
  MatcherCases,
  MatcherContext,
  Permission,
  Policy,
  PolicyCases,
  ValueRef,
} from "@qadi/core";
import type { SimulationEdit } from "./SimulationEdit.ts";
import { fieldOps, grant } from "./SimulationFields.ts";
import type { SimulationInput } from "./SimulationInput.ts";

/**
 * A value that would satisfy a matcher, or why none could be produced.
 *
 * A union rather than `unknown | undefined`, because `undefined` is a value an
 * attribute can genuinely hold — it is what an absent one resolves to — so the
 * two would be indistinguishable exactly where the distinction matters.
 */
export type Synthesised =
  | { readonly _tag: "Value"; readonly value: unknown }
  | { readonly _tag: "Unsynthesisable"; readonly reason: string };

/** A requirement no remedy could be built for, and why — the panel says so rather than hiding it. */
export interface SkippedRemedy {
  readonly requirement: string;
  readonly reason: string;
}

export interface RemedySweep {
  readonly edits: ReadonlyArray<SimulationEdit>;
  readonly skipped: ReadonlyArray<SkippedRemedy>;
}

/**
 * One edit per requirement the policy names that the input does not already meet.
 *
 * "Does not already meet" is a **syntactic** check, and deliberately so for
 * roles, permissions, edges and events: those are set membership, and asking
 * the evaluator would cost one run per candidate to learn what a lookup
 * answers. Attributes get no such check — a key present with the wrong value is
 * precisely the case worth a row — so a remedy that changes nothing is offered,
 * and the sweep reports it as *no change*. That is a finding too: it says the
 * attribute was never the problem.
 *
 * **`Not` is not descended into**, and neither is a `Rules` row whose `effect`
 * is `"Deny"`. Satisfying a requirement under a negation, or under a deny row's
 * condition, makes the enclosing node deny, so a remedy there is a removal —
 * and every removal expressible over a subject's own grants is already offered
 * by `singleEdits`. Descending would relabel anti-remedies as strengthenings,
 * which inverts the one thing this table is read for.
 */
export const remedyEdits = (policy: Policy, input: SimulationInput): RemedySweep => {
  const built = requirementsOf(policy)
    .map((requirement) => remedyFor(requirement)(input))
    .filter((one): one is Built => one !== undefined);

  return {
    // Partitioned rather than dispatched in one pass: each side then tests its
    // own tag, so mislabelling *either* one drops that side's rows and a test
    // notices. A single `if (_tag === "Skip") … else …` cannot see a broken
    // `"Edit"`, because everything that is not a skip falls into it.
    edits: dedupeBy(
      built.filter(isEdit).map((one) => one.edit),
      (edit) => edit.label,
    ),
    // Rebuilt rather than passed whole: `Built` carries a `_tag` to discriminate
    // it here, and `SkippedRemedy` declares two fields. Handing the wider value
    // on would ship a third that no consumer's type mentions.
    skipped: dedupeBy(
      built
        .filter(isSkip)
        .map((one) => ({ requirement: one.requirement, reason: one.reason })),
      (one) => one.requirement,
    ),
  };
};

const dedupeBy = <A>(items: ReadonlyArray<A>, key: (item: A) => string): ReadonlyArray<A> => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(key(item))) return false;
    seen.add(key(item));
    return true;
  });
};

/**
 * A value that would make this matcher accept, read out of the matcher itself.
 *
 * Exported because it is the piece worth testing directly — a sweep exercises
 * it only through whichever matchers its policy happens to use, which is a poor
 * way to find out that `Size` produces an array of the wrong length.
 *
 * Every witness is built so the evaluator's own comparison succeeds on it:
 * `Eq` compares with `===`, so a literal object is passed through by reference
 * rather than copied; `Contains` and `SomeMatch` want the needle *inside* an
 * array; `Size` wants a value with a `length`.
 *
 * **And every leaf witness is checked, not just built** (BEH-QD-223, ARCH-08
 * D-08-i). The arms below read each matcher backwards, which is a second belief
 * about what a comparison accepts — and that belief lagged the evaluator's:
 * `gte(Infinity)`, `eq(literal(NaN))` and `eq(literal(undefined))` all produced a
 * witness `judgeMatcher` rejects. So a leaf's witness is judged by
 * `judgeMatcher` itself before it is offered, and declined if it does not hold.
 * Only leaves are judged: a wrapper's witness holds exactly when its one child's
 * does, by construction of the wrapping (`{field: v}`, `[v]`, an array of length
 * `v`), so checking the leaf checks the whole — and judging a leaf never
 * recurses, so the fold stays stack-safe at any depth. Comparison semantics live
 * in the leaves, so whatever they do next, a remedy cannot lie about them.
 */
export const satisfyingValue = (matcher: Matcher, input: SimulationInput): Synthesised => {
  return foldMatcherCases(matcher, witnessCases(input, contextOf(input)));
};

/** The evaluator's view of a simulation input, so a witness is judged against what `evaluate` would see. */
const contextOf = (input: SimulationInput): MatcherContext => ({
  subject: input.subject.attributes ?? {},
  subjectId: makeSubjectId(input.subject.id),
  resource: input.resource,
  action: input.action,
});

/**
 * A leaf's witness, kept only if `judgeMatcher` holds it. Only the leaf arms
 * call it; a wrapper's witness passes through unjudged (see `satisfyingValue`).
 */
const checked = (node: Matcher, found: Synthesised, context: MatcherContext): Synthesised =>
  found._tag === "Value" && judgeMatcher(node, found.value, context) !== "Held"
    ? cannot("the synthesised value does not satisfy the matcher")
    : found;

const value = (v: unknown): Synthesised => ({ _tag: "Value", value: v });
const cannot = (reason: string): Synthesised => ({ _tag: "Unsynthesisable", reason });

const mapValue = (self: Synthesised, f: (v: unknown) => Synthesised): Synthesised =>
  self._tag === "Value" ? f(self.value) : self;

/**
 * A node's witness from its folded wrapped matcher, each arm receiving it in the
 * tag's own shape (`MatcherCases`): a wrapper its one child's witness, a leaf
 * only its node (ARCH-17).
 *
 * Built per call because the arms close over the simulation input and the
 * evaluator's view of it; every **leaf** arm goes through {@link checked}. The
 * recursive arms read their one folded child instead of calling back into
 * themselves, so `satisfyingValue` cannot overflow the stack on a deeply nested
 * matcher (ARCH-02 N2).
 */
const witnessCases = (input: SimulationInput, context: MatcherContext): MatcherCases<Synthesised> => ({
  Eq: (m) => checked(m, refValue(m.ref)(input), context),
  // Conservative on purpose. Where the reference does resolve, any distinct
  // value serves and `null` is distinct from everything except itself.
  // Where it does not, this declines rather than guessing: an unresolvable
  // reference reads as `undefined` at evaluation time, so `null` would in
  // fact match — but relying on that would make a remedy's correctness
  // depend on a coincidence between two modules.
  Neq: (m) =>
    checked(
      m,
      mapValue(refValue(m.ref)(input), (v) => value(v === null ? false : null)),
      context,
    ),
  Dominates: (m) =>
    checked(
      m,
      mapValue(refValue(m.ref)(input), (v) =>
        isSecurityLabel(v)
          ? // A label dominates itself, so the reference's own value is the
            // least witness — and the only one derivable without the lattice.
            value(v)
          : cannot("`dominates` compares security labels and this reference is not one"),
      ),
      context,
    ),
  In: (m) =>
    checked(
      m,
      m.values.length === 0 ? cannot("an empty `in` accepts nothing") : value(m.values[0]),
      context,
    ),
  Exists: (m) => checked(m, value(true), context),
  // The bound itself, when it is a finite number: a non-finite bound has no
  // value at or above it that `atLeastVerdict` accepts, so it declines with a
  // specific reason here rather than the leaf check's generic one — the
  // mirror of `Lt`'s guard below.
  Gte: (m) =>
    checked(
      m,
      Number.isFinite(m.value)
        ? value(m.value)
        : cannot(`no value at least ${String(m.value)} can be synthesised`),
      context,
    ),
  // `m.value - 1` is not a witness for every threshold: float rounding
  // swallows the subtraction once `m.value` is large enough (1e308 and its
  // own predecessor are the same float), and `Infinity`/`NaN` have no
  // predecessor at all — `Infinity - 1` is still `Infinity`, which does
  // not satisfy `lt`. The finiteness check and the strict-decrease check
  // together catch both: BEH-QD-223 requires a synthesised value to
  // actually satisfy the matcher, and declining beats a row that lies.
  Lt: (m) =>
    checked(
      m,
      Number.isFinite(m.value) && m.value - 1 < m.value
        ? value(m.value - 1)
        : cannot(`no value less than ${String(m.value)} can be synthesised`),
      context,
    ),
  Contains: (m) => checked(m, value([m.value]), context),
  FieldMatch: (m, child) => mapValue(child, (v) => value({ [m.field]: v })),
  SomeMatch: (_m, child) => mapValue(child, (v) => value([v])),
  // One element satisfies "every" as surely as it satisfies "some", and a
  // one-element array is the smallest witness of both.
  EveryMatch: (_m, child) => mapValue(child, (v) => value([v])),
  // Two refusals rather than one, because they are two different things
  // wrong with the policy: `size(eq(literal("two")))` compares a length
  // against a string and can never match anything, while `size(gte(1e6))`
  // is satisfiable and merely beyond what a panel should allocate.
  Size: (_m, child) =>
    mapValue(child, (v) => {
      if (typeof v !== "number") return cannot(`a size is a number, and ${render(v)} is not`);
      return Number.isInteger(v) && v >= 0 && v <= MAX_SYNTHESISED_LENGTH
        ? value(Array.from({ length: v }, () => null))
        : cannot(`no array of length ${String(v)} can be built`);
    }),
});

/**
 * The longest array a `Size` witness will build.
 *
 * `size(gte(1_000_000))` is a legal policy and building its witness would
 * allocate a million nulls inside a debug panel's render path. The cap is small
 * because a sweep is about *whether* a length matters, not about the length.
 */
const MAX_SYNTHESISED_LENGTH = 64;

/**
 * What a value reference points at, in the terms the input can supply.
 *
 * `SubjectRef` reads the subject's **attributes**, not the resolver's fixtures:
 * that is what `resolveRef` does, and a witness derived from a different source
 * than the comparison uses would be a second implementation of the same lookup.
 *
 * A `Match` rather than an if-chain, per AGENTS.md §5a: `ValueRef` is a
 * five-tag union, and an if-chain compiles a sixth tag as an unhandled
 * `undefined` instead of a build error. Built once at module scope, mirroring
 * `witness` above.
 */
const refValue: (ref: ValueRef) => (input: SimulationInput) => Synthesised = Match.type<ValueRef>().pipe(
  Match.tagsExhaustive({
    LiteralRef: (ref) => (_input: SimulationInput) => value(ref.value),
    SubjectIdRef: () => (input: SimulationInput) => value(input.subject.id),
    ActionRef: () => (input: SimulationInput) =>
      input.action === undefined ? cannot("the check names no action") : value(input.action),
    SubjectRef: (ref) => (input: SimulationInput) => {
      const found = getByPath(input.subject.attributes, ref.path);
      return found === undefined
        ? cannot(`nothing at subject path ${ref.path}`)
        : value(found);
    },
    ResourceRef: (ref) => (input: SimulationInput) => {
      const found = getByPath(input.resource, ref.path);
      return found === undefined
        ? cannot(`nothing at resource path ${ref.path}`)
        : value(found);
    },
  }),
);

// ---------------------------------------------------------------------------
// What the policy asks for
// ---------------------------------------------------------------------------

type Requirement =
  | { readonly _tag: "Role"; readonly role: string }
  | { readonly _tag: "Permission"; readonly permission: Permission }
  | { readonly _tag: "SubjectAttribute"; readonly attribute: string; readonly matcher: Matcher }
  | { readonly _tag: "ResourceAttribute"; readonly attribute: string; readonly matcher: Matcher }
  | { readonly _tag: "Relationship"; readonly relation: string }
  | { readonly _tag: "Action"; readonly action: string }
  | { readonly _tag: "Acted"; readonly event: string; readonly scope: HistoryScope }
  | {
      readonly _tag: "Signature";
      readonly meaning: string;
      readonly signerRole: string | undefined;
      readonly scope: HistoryScope;
    }
  | { readonly _tag: "Custom"; readonly name: string };

/** Joins requirement lists in order, with a loop so a very wide node is never spread into arguments. */
const concat = (
  lists: Iterable<ReadonlyArray<Requirement>>,
): ReadonlyArray<Requirement> => {
  const joined: Array<Requirement> = [];
  for (const list of lists) for (const requirement of list) joined.push(requirement);
  return joined;
};

/**
 * One node's requirements, from its already-folded children, each arm receiving
 * them in the tag's own shape (`PolicyCases`): a wrapper its one child's list, a
 * `Rules` table one `{ rule, result }` per row (ARCH-17).
 *
 * Built once at module scope, per AGENTS.md §5a. `Not` ignores its folded child
 * and `Rules` keeps only the children of `Permit` rows: that is the
 * anti-remedy rule, now applied where the children arrive rather than by not
 * descending.
 */
const requirementCases: PolicyCases<ReadonlyArray<Requirement>> = {
  HasPermission: (p) => [{ _tag: "Permission" as const, permission: p.permission }],
  HasRole: (p) => [{ _tag: "Role" as const, role: p.role }],
  HasAttribute: (p) => [
    { _tag: "SubjectAttribute" as const, attribute: p.attribute, matcher: p.matcher },
  ],
  HasResourceAttribute: (p) => [
    { _tag: "ResourceAttribute" as const, attribute: p.attribute, matcher: p.matcher },
  ],
  HasRelationship: (p) => [{ _tag: "Relationship" as const, relation: p.relation }],
  HasAction: (p) => [{ _tag: "Action" as const, action: p.action }],
  HasActed: (p) => [{ _tag: "Acted" as const, event: p.event, scope: p.scope }],
  // The remedy for "has not acted" is to remove the event, which `singleEdits`
  // already offers for every event the fixtures list.
  HasNotActed: () => [],
  // Opaque, externally-registered logic: there is no matcher to read a witness
  // out of, no set membership to strengthen, and `SimulationInput` has no form
  // vocabulary for its answer (ADR-QD-055). It is *named* as skipped rather
  // than passed over, because a requirement no remedy could be built for must
  // be said so (BEH-QD-222).
  HasCustom: (p) => [{ _tag: "Custom" as const, name: p.name }],
  // The node carries everything `askSignature` matches on - the meaning, the
  // signer role when it names one, and the scope - so the remedy is built from
  // it exactly as `AddEvent` is built from `HasActed`.
  HasSignature: (p) => [
    { _tag: "Signature" as const, meaning: p.meaning, signerRole: p.signerRole, scope: p.scope },
  ],
  AllOf: (_p, children) => concat(children),
  AnyOf: (_p, children) => concat(children),
  // Only `Permit` rows: a rule's `condition` is evaluated for applicability,
  // and satisfying a `Deny` row's condition makes *that* row apply, which
  // means denying, not allowing. Descending into it here would offer "grant
  // this" as a fix for exactly the thing that would trigger the deny — the
  // same anti-remedy `Not` is excluded for below, and for the same reason.
  Rules: (_p, rows) =>
    concat(rows.filter(({ rule }) => rule.effect === "Permit").map(({ result }) => result)),
  Not: () => [],
  Obliged: (_p, child) => child,
  Labeled: (_p, child) => child,
};

/**
 * Every requirement in the tree, outermost first.
 *
 * Duplicates are kept here and collapsed by label in `remedyEdits`: two nodes
 * asking for the same role are one remedy, but they are two requirements and
 * this function's job is to report the tree faithfully.
 *
 * Folded through `@qadi/core`'s `foldPolicyCases`, so a caller-held policy of any
 * nesting depth cannot overflow it: `remedyEdits` is reached from `sweepPlan` and
 * `whatIf` with no `maxDepth` to consult, and the old recursion crashed at about
 * 2,000 levels (256 for `Rules`) (ARCH-02 C7). Concatenation copies match the
 * old `flatMap` (O(leaves × nesting depth)), which is not a regression.
 */
const requirementsOf = (self: Policy): ReadonlyArray<Requirement> =>
  foldPolicyCases(self, requirementCases);


// ---------------------------------------------------------------------------
// Requirement → edit
// ---------------------------------------------------------------------------

type BuiltEdit = { readonly _tag: "Edit"; readonly edit: SimulationEdit };
type BuiltSkip = { readonly _tag: "Skip" } & SkippedRemedy;
type Built = BuiltEdit | BuiltSkip;

const isEdit = (self: Built): self is BuiltEdit => self._tag === "Edit";
const isSkip = (self: Built): self is BuiltSkip => self._tag === "Skip";

const strengthen = (
  kind: SimulationEdit["kind"],
  label: string,
  apply: (self: SimulationInput) => SimulationInput,
): Built => ({ _tag: "Edit", edit: { kind, direction: "Strengthen", label, apply } });

const skip = (requirement: string, reason: string): Built => ({
  _tag: "Skip",
  requirement,
  reason,
});

const NO_RESOURCE_ID = "the check names no resource id";
const CUSTOM_HAS_NO_FIELD =
  "a custom predicate's answer has no form field; run against Snapshot or Live";

/** A built edit, for the arms that take a field's grant from the table. */
const edit = (self: SimulationEdit): Built => ({ _tag: "Edit", edit: self });

/**
 * `undefined` means *no row at all* — the input already meets this requirement,
 * so there is nothing to propose and nothing to explain. A `Skip` is the other
 * case: a remedy that ought to exist and could not be built, which the panel
 * shows.
 *
 * A `Match` rather than an if-chain, per AGENTS.md §5a: the last arm of the chain
 * this replaced was an implicit fall-through to `Acted`, so a new requirement
 * compiled into someone else's remedy (lost ARCH-48 `950977f`, T2). Built once
 * at module scope; each arm returns a function of the input. The held-field arms
 * take their lens, their presence test and their edit from the field table
 * (`SimulationFields.ts`); `Action` and `ResourceAttribute` change the
 * *question*, not a held field, and stay hand-written.
 */
const remedyFor: (self: Requirement) => (input: SimulationInput) => Built | undefined =
  Match.type<Requirement>().pipe(
    Match.tagsExhaustive({
      Role: (self) => (input: SimulationInput) =>
        fieldOps("roles").holds(input, self.role)
          ? undefined
          : edit(grant("roles", self.role, `with role ${self.role}`)),

      // Kept as a `Permission` all the way here rather than as its key, so the
      // key is derived once by the same function the evaluator's lookup uses.
      // Carrying the string and re-splitting it on a colon is exactly what the
      // predecessor's wire format did, and it mangled any segment containing one.
      Permission: (self) => (input: SimulationInput) => {
        const key = permissionKey(self.permission);
        return fieldOps("permissions").holds(input, key)
          ? undefined
          : edit(grant("permissions", key, `with permission ${key}`));
      },

      Action: (self) => (input: SimulationInput) =>
        input.action === self.action
          ? undefined
          : strengthen("SetAction", `with action ${self.action}`, (input_) => ({
              ...input_,
              action: self.action,
            })),

      SubjectAttribute: (self) => (input: SimulationInput) => {
        const witnessed = satisfyingValue(self.matcher, input);
        if (witnessed._tag === "Unsynthesisable") {
          return skip(`subject attribute ${self.attribute}`, witnessed.reason);
        }
        return edit(
          grant(
            "subjectAttributes",
            [self.attribute, witnessed.value],
            `with subject attribute ${self.attribute} = ${render(witnessed.value)}`,
          ),
        );
      },

      ResourceAttribute: (self) => (input: SimulationInput) => {
        if (input.resource === undefined) {
          return skip(`resource attribute ${self.attribute}`, "the check names no resource");
        }
        const witnessed = satisfyingValue(self.matcher, input);
        if (witnessed._tag === "Unsynthesisable") {
          return skip(`resource attribute ${self.attribute}`, witnessed.reason);
        }
        return strengthen(
          "SetResourceAttribute",
          `with resource attribute ${self.attribute} = ${render(witnessed.value)}`,
          (input_) => ({
            ...input_,
            resource: { ...input_.resource, [self.attribute]: witnessed.value },
          }),
        );
      },

      Relationship: (self) => (input: SimulationInput) => {
        const resourceId = resourceIdOf(input.resource);
        if (resourceId === undefined) return skip(`relationship ${self.relation}`, NO_RESOURCE_ID);
        const edge = { subjectId: input.subject.id, relation: self.relation, resourceId };
        return fieldOps("relationships").holds(input, edge)
          ? undefined
          : edit(grant("relationships", edge, `with relationship ${self.relation} on ${resourceId}`));
      },

      // Both scopes need a resource id, because that is what an event record
      // carries — `Any` widens the *question*, not the fixture.
      Acted: (self) => (input: SimulationInput) => {
        const resourceId = resourceIdOf(input.resource);
        if (resourceId === undefined) return skip(`event ${self.event}`, NO_RESOURCE_ID);
        const event = { subjectId: input.subject.id, event: self.event, resourceId };
        return fieldOps("history").holds(input, event)
          ? undefined
          : edit(grant("history", event, `with event ${self.event} on ${resourceId}`));
      },

      // `Resource` scope is answered from a row stored with that resource id; `Any`
      // only from a subject-global row, which has none (`askSignature`,
      // INV-QD-120). So the remedy's row carries the resource id exactly when the
      // question does, and is "already met" only by a row that would answer it —
      // a node naming no signer role is met by a row with any role, so this is
      // the port's match rather than `sameSignature`'s equality.
      Signature: (self) => (input: SimulationInput) => {
        const resourceId = self.scope === "Resource" ? resourceIdOf(input.resource) : undefined;
        if (self.scope === "Resource" && resourceId === undefined) {
          return skip(`signature ${self.meaning}`, NO_RESOURCE_ID);
        }
        const met = fieldOps("signatures")
          .elements(input)
          .some(
            (held) =>
              held.subjectId === input.subject.id &&
              held.resourceId === resourceId &&
              held.meaning === self.meaning &&
              (self.signerRole === undefined || held.signerRole === self.signerRole),
          );
        if (met) return undefined;
        const signature = {
          subjectId: input.subject.id,
          meaning: self.meaning,
          ...(self.signerRole === undefined ? {} : { signerRole: self.signerRole }),
          ...(resourceId === undefined ? {} : { resourceId }),
        };
        return edit(
          grant(
            "signatures",
            signature,
            `with signature ${self.meaning}${resourceId === undefined ? "" : ` on ${resourceId}`}${
              self.signerRole === undefined ? "" : ` as ${self.signerRole}`
            }`,
          ),
        );
      },

      Custom: (self) => () => skip(`custom predicate ${self.name}`, CUSTOM_HAS_NO_FIELD),
    }),
  );

/**
 * Short enough for a row label.
 *
 * A string is shown bare — `= low`, not `= "low"` — and everything else as
 * JSON. `JSON.stringify` answers `undefined` for the values it cannot
 * represent, and `String` renders that as the word, which is the right label
 * for a policy only an absent attribute satisfies.
 */
const render = (v: unknown): string =>
  typeof v === "string" ? v : String(JSON.stringify(v));
