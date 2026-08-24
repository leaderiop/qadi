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
import { getByPath, isSecurityLabel, permissionKey } from "@qadi/core";
import type { HistoryScope, Matcher, Permission, Policy, Resource, ValueRef } from "@qadi/core";
import { sameEdge, sameEvent } from "./Edits.ts";
import type { SimulationEdit } from "./SimulationEdit.ts";
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
 * **`Not` is not descended into.** Satisfying a requirement under a negation
 * makes the enclosing node deny, so a remedy there is a removal — and every
 * removal expressible over a subject's own grants is already offered by
 * `singleEdits`. Descending would relabel anti-remedies as strengthenings,
 * which inverts the one thing this table is read for.
 */
export const remedyEdits = (policy: Policy, input: SimulationInput): RemedySweep => {
  const built = requirementsOf(policy)
    .map((requirement) => remedyFor(requirement, input))
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
 */
export const satisfyingValue = (matcher: Matcher, input: SimulationInput): Synthesised =>
  witness(matcher)(input);

const value = (v: unknown): Synthesised => ({ _tag: "Value", value: v });
const cannot = (reason: string): Synthesised => ({ _tag: "Unsynthesisable", reason });

const mapValue = (self: Synthesised, f: (v: unknown) => Synthesised): Synthesised =>
  self._tag === "Value" ? f(self.value) : self;

/**
 * Built once at module scope, returning a function per arm — the shape
 * AGENTS.md §5a prescribes for a dispatcher that needs a second argument.
 */
const witness: (self: Matcher) => (input: SimulationInput) => Synthesised = Match.type<Matcher>()
  .pipe(
    Match.tagsExhaustive({
      Eq: (m) => (input: SimulationInput) => refValue(m.ref, input),
      // Conservative on purpose. Where the reference does resolve, any distinct
      // value serves and `null` is distinct from everything except itself.
      // Where it does not, this declines rather than guessing: an unresolvable
      // reference reads as `undefined` at evaluation time, so `null` would in
      // fact match — but relying on that would make a remedy's correctness
      // depend on a coincidence between two modules.
      Neq: (m) => (input: SimulationInput) =>
        mapValue(refValue(m.ref, input), (v) => value(v === null ? false : null)),
      Dominates: (m) => (input: SimulationInput) =>
        mapValue(refValue(m.ref, input), (v) =>
          isSecurityLabel(v)
            ? // A label dominates itself, so the reference's own value is the
              // least witness — and the only one derivable without the lattice.
              value(v)
            : cannot("`dominates` compares security labels and this reference is not one"),
        ),
      In: (m) => () =>
        m.values.length === 0
          ? cannot("an empty `in` accepts nothing")
          : value(m.values[0]),
      Exists: () => () => value(true),
      Gte: (m) => () => value(m.value),
      Lt: (m) => () => value(m.value - 1),
      Contains: (m) => () => value([m.value]),
      FieldMatch: (m) => (input: SimulationInput) =>
        mapValue(witness(m.matcher)(input), (v) => value({ [m.field]: v })),
      SomeMatch: (m) => (input: SimulationInput) => mapValue(witness(m.matcher)(input), (v) => value([v])),
      // One element satisfies "every" as surely as it satisfies "some", and a
      // one-element array is the smallest witness of both.
      EveryMatch: (m) => (input: SimulationInput) => mapValue(witness(m.matcher)(input), (v) => value([v])),
      // Two refusals rather than one, because they are two different things
      // wrong with the policy: `size(eq(literal("two")))` compares a length
      // against a string and can never match anything, while `size(gte(1e6))`
      // is satisfiable and merely beyond what a panel should allocate.
      Size: (m) => (input: SimulationInput) =>
        mapValue(witness(m.matcher)(input), (v) => {
          if (typeof v !== "number") return cannot(`a size is a number, and ${render(v)} is not`);
          return Number.isInteger(v) && v >= 0 && v <= MAX_SYNTHESISED_LENGTH
            ? value(Array.from({ length: v }, () => null))
            : cannot(`no array of length ${String(v)} can be built`);
        }),
    }),
  );

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
 */
const refValue = (ref: ValueRef, input: SimulationInput): Synthesised => {
  if (ref._tag === "LiteralRef") return value(ref.value);
  if (ref._tag === "SubjectIdRef") return value(input.subject.id);
  if (ref._tag === "ActionRef") {
    return input.action === undefined
      ? cannot("the check names no action")
      : value(input.action);
  }
  const from = ref._tag === "SubjectRef" ? input.subject.attributes : input.resource;
  const found = getByPath(from, ref.path);
  return found === undefined
    ? cannot(`nothing at ${ref._tag === "SubjectRef" ? "subject" : "resource"} path ${ref.path}`)
    : value(found);
};

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
  | { readonly _tag: "Acted"; readonly event: string; readonly scope: HistoryScope };

/**
 * Every requirement in the tree, outermost first.
 *
 * Duplicates are kept here and collapsed by label in `remedyEdits`: two nodes
 * asking for the same role are one remedy, but they are two requirements and
 * this function's job is to report the tree faithfully.
 */
const requirementsOf: (self: Policy) => ReadonlyArray<Requirement> = Match.type<Policy>().pipe(
  Match.tagsExhaustive({
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
    AllOf: (p) => p.policies.flatMap(requirementsOf),
    AnyOf: (p) => p.policies.flatMap(requirementsOf),
    Rules: (p) => p.rules.flatMap((rule) => requirementsOf(rule.condition)),
    Not: () => [],
    Obliged: (p) => requirementsOf(p.policy),
    Labeled: (p) => requirementsOf(p.policy),
  }),
);

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

/**
 * `undefined` means *no row at all* — the input already meets this requirement,
 * so there is nothing to propose and nothing to explain. A `Skip` is the other
 * case: a remedy that ought to exist and could not be built, which the panel
 * shows.
 */
const remedyFor = (self: Requirement, input: SimulationInput): Built | undefined => {
  if (self._tag === "Role") {
    // Optional chaining rather than `?? []`: an empty default is a literal
    // nothing can distinguish from any other empty default, which leaves a
    // branch no test can pin.
    if (input.subject.roles?.includes(self.role) === true) return undefined;
    return strengthen("GrantRole", `with role ${self.role}`, (input_) => ({
      ...input_,
      subject: {
        ...input_.subject,
        roles: [...(input_.subject.roles ?? []), self.role],
      },
    }));
  }

  if (self._tag === "Permission") {
    // Kept as a `Permission` all the way here rather than as its key, so the
    // key is derived once by the same function the evaluator's lookup uses.
    // Carrying the string and re-splitting it on a colon is exactly what the
    // predecessor's wire format did, and it mangled any segment containing one.
    const key = permissionKey(self.permission);
    if (input.subject.permissions?.some((held) => held === key) === true) return undefined;
    return strengthen("GrantPermission", `with permission ${key}`, (input_) => ({
      ...input_,
      subject: { ...input_.subject, permissions: [...(input_.subject.permissions ?? []), key] },
    }));
  }

  if (self._tag === "Action") {
    if (input.action === self.action) return undefined;
    return strengthen("SetAction", `with action ${self.action}`, (input_) => ({
      ...input_,
      action: self.action,
    }));
  }

  if (self._tag === "SubjectAttribute") {
    const witnessed = satisfyingValue(self.matcher, input);
    if (witnessed._tag === "Unsynthesisable") {
      return skip(`subject attribute ${self.attribute}`, witnessed.reason);
    }
    return strengthen(
      "SetSubjectAttribute",
      `with subject attribute ${self.attribute} = ${render(witnessed.value)}`,
      (input_) => ({
        ...input_,
        subject: {
          ...input_.subject,
          attributes: { ...input_.subject.attributes, [self.attribute]: witnessed.value },
        },
      }),
    );
  }

  if (self._tag === "ResourceAttribute") {
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
  }

  const resourceId = resourceIdOf(input.resource);
  if (self._tag === "Relationship") {
    if (resourceId === undefined) {
      return skip(`relationship ${self.relation}`, "the check names no resource id");
    }
    const edge = { subjectId: input.subject.id, relation: self.relation, resourceId };
    if (input.relationships?.some((held) => sameEdge(held, edge)) === true) return undefined;
    return strengthen(
      "AddRelationship",
      `with relationship ${self.relation} on ${resourceId}`,
      (input_) => ({ ...input_, relationships: [...(input_.relationships ?? []), edge] }),
    );
  }

  // `Acted`. Both scopes need a resource id, because that is what an event
  // record carries — `Any` widens the *question*, not the fixture.
  if (resourceId === undefined) {
    return skip(`event ${self.event}`, "the check names no resource id");
  }
  const event = { subjectId: input.subject.id, event: self.event, resourceId };
  if (input.history?.some((held) => sameEvent(held, event)) === true) return undefined;
  return strengthen("AddEvent", `with event ${self.event} on ${resourceId}`, (input_) => ({
    ...input_,
    history: [...(input_.history ?? []), event],
  }));
};

const resourceIdOf = (resource: Resource | undefined): string | undefined => {
  const id = resource?.["id"];
  return typeof id === "string" ? id : undefined;
};

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
