/**
 * The matcher DSL used by attribute policies.
 *
 * Like {@link Policy}, the `Matcher` type is hand-written first — recursive
 * types need a named declaration to close the `Schema.suspend` loop — and
 * the `Schema.TaggedStruct` variants below are then built and type-asserted
 * against it, so the wire format and the type cannot drift.
 *
 * Matchers compare an attribute value against a literal, another field of the
 * subject or resource, or a nested structure. They are pure data: no closures,
 * so a matcher survives serialization.
 */
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
import type { SubjectId } from "./Identity.ts";
import { isSecurityLabel, labelDominates } from "./SecurityLabel.ts";

// ---------------------------------------------------------------------------
// Value references
// ---------------------------------------------------------------------------

const SubjectRef = Schema.TaggedStruct("SubjectRef", { path: Schema.String });
const SubjectIdRef = Schema.TaggedStruct("SubjectIdRef", {});
const ResourceRef = Schema.TaggedStruct("ResourceRef", { path: Schema.String });
const ActionRef = Schema.TaggedStruct("ActionRef", {});
const LiteralRef = Schema.TaggedStruct("LiteralRef", { value: Schema.Unknown });

export const ValueRef = Schema.Union([
  SubjectRef,
  SubjectIdRef,
  ResourceRef,
  ActionRef,
  LiteralRef,
]);
export type ValueRef = typeof ValueRef.Type;

/**
 * References a field of the subject's **attributes** by dot-path.
 *
 * Identity is not reachable this way: `subject("id")` means the attribute named
 * `id`, which is normally absent. Use {@link subjectId} for the subject's own
 * identifier.
 */
export const subject = (path: string): ValueRef => ({ _tag: "SubjectRef", path });
/**
 * References the subject's own identifier.
 *
 * A distinct variant rather than a reserved path, so that an attribute happening
 * to be called `id` can never shadow it — or be shadowed by it.
 */
export const subjectId = (): ValueRef => ({ _tag: "SubjectIdRef" });
/** References a field of the resource by dot-path. */
export const resource = (path: string): ValueRef => ({ _tag: "ResourceRef", path });
/**
 * References the action the caller is performing.
 *
 * The action is a property of the *request*, not a grant the subject holds —
 * it is never derived from a permission token's action segment, and comparing
 * the two would conflate "may write" with "is writing" (ADR-QD-018).
 */
export const action = (): ValueRef => ({ _tag: "ActionRef" });
/** A constant value. */
export const literal = (value: unknown): ValueRef => ({ _tag: "LiteralRef", value });

// ---------------------------------------------------------------------------
// Matcher expressions
// ---------------------------------------------------------------------------

export type Matcher =
  | { readonly _tag: "Eq"; readonly ref: ValueRef }
  | { readonly _tag: "Neq"; readonly ref: ValueRef }
  | { readonly _tag: "Dominates"; readonly ref: ValueRef }
  | { readonly _tag: "In"; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "Exists" }
  | { readonly _tag: "Gte"; readonly value: number }
  | { readonly _tag: "Lt"; readonly value: number }
  | { readonly _tag: "Contains"; readonly value: unknown }
  | { readonly _tag: "FieldMatch"; readonly field: string; readonly matcher: Matcher }
  | { readonly _tag: "SomeMatch"; readonly matcher: Matcher }
  | { readonly _tag: "EveryMatch"; readonly matcher: Matcher }
  | { readonly _tag: "Size"; readonly matcher: Matcher };

/**
 * Single suspended self-reference, shared by every recursive position.
 * Factoring it out is the documented v4 idiom for recursive unions.
 */
const MatcherRef = Schema.suspend((): Schema.Codec<Matcher> => Matcher);

const Eq = Schema.TaggedStruct("Eq", { ref: ValueRef });
const Neq = Schema.TaggedStruct("Neq", { ref: ValueRef });
const Dominates = Schema.TaggedStruct("Dominates", { ref: ValueRef });
const In = Schema.TaggedStruct("In", { values: Schema.Array(Schema.Unknown) });
const Exists = Schema.TaggedStruct("Exists", {});
const Gte = Schema.TaggedStruct("Gte", { value: Schema.Number });
const Lt = Schema.TaggedStruct("Lt", { value: Schema.Number });
const Contains = Schema.TaggedStruct("Contains", { value: Schema.Unknown });
const FieldMatch = Schema.TaggedStruct("FieldMatch", {
  field: Schema.String,
  matcher: MatcherRef,
});
const SomeMatch = Schema.TaggedStruct("SomeMatch", { matcher: MatcherRef });
const EveryMatch = Schema.TaggedStruct("EveryMatch", { matcher: MatcherRef });
const Size = Schema.TaggedStruct("Size", { matcher: MatcherRef });

export const Matcher: Schema.Codec<Matcher> = Schema.Union([
  Eq,
  Neq,
  Dominates,
  In,
  Exists,
  Gte,
  Lt,
  Contains,
  FieldMatch,
  SomeMatch,
  EveryMatch,
  Size,
]);

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/**
 * Attribute equals the referenced value.
 *
 * Compares with `===`, so an attribute resolved to `NaN` never equals
 * anything — including another `NaN`. `inArray` below compares with
 * `Array.prototype.includes` (SameValueZero), under which `NaN` DOES match
 * itself, so `inArray([x])` is not a drop-in replacement for `eq(literal(x))`
 * when `x` is `NaN`. Left as `===` deliberately rather than unified with
 * `inArray`: `predicate-sql` compiles `Eq` to SQL `=`, whose own NaN
 * comparison is likewise always false, and switching to SameValueZero here
 * would decouple in-process evaluation from what the compiled query actually
 * does. Pinned in `Matcher.test.ts`, not fixed.
 */
export const eq = (ref: ValueRef): Matcher => ({ _tag: "Eq", ref });
/**
 * Attribute does not equal the referenced value.
 *
 * `eq` and `neq` are both total: a `ValueRef` that cannot be resolved (a
 * typo'd `subject`/`resource` path, most commonly) resolves to `undefined`
 * rather than failing, the same way an unresolved `dominates` operand above
 * resolves to "not a `SecurityLabel`" rather than failing.
 *
 * Both now fail closed on that, symmetrically: `eq`/`neq` require **both**
 * resolved operands to be defined before comparing, so an absent operand —
 * on either side, including a genuinely missing attribute value, not only
 * an unresolved ref — denies rather than participating in the comparison.
 *
 * This was not always true for `neq`. `neq(ref)` against an unresolved `ref`
 * used to compare `value !== undefined`, which is `true` for every attribute
 * value that isn't itself `undefined` — a typo'd path ALLOWED.
 * `hasAttribute("state", neq(subject("stae")))` read as "state is not stae"
 * and was actually "always true" (CCR-QD-112). This supersedes an earlier
 * call (commit `dab09bc`, ".scratch/qadi-audit-fix/issues/118-eq-neq-unresolved-ref-asymmetry.md")
 * to document and pin the fail-open behavior as intentional rather than fix
 * it — that reasoning considered only the ref-resolution case ("no
 * resolution failure to surface... nothing for `neq` to deny because of")
 * and not BEH-QD-026's general "a reference that resolves to nothing
 * denies" requirement, `INV-QD-007`'s evidence claim (which this behavior
 * already contradicted), or `INV-QD-032`'s prior record of the identical
 * fail-open shape reaching production in `@qadi/http` (see
 * https://github.com/leaderiop/qadi/issues/36 for the fuller reasoning).
 * `Eq` had a milder version of the same gap: two absent operands compared
 * `undefined === undefined` and matched, treating two unknowns as equal to
 * each other. `exists()` is this DSL's purpose-built way to test for
 * absence; `Eq` no longer doubles as an implicit second one, so
 * `eq(literal(undefined))` no longer matches an absent value either. Pinned
 * in both directions in `Matcher.test.ts`.
 */
export const neq = (ref: ValueRef): Matcher => ({ _tag: "Neq", ref });
/**
 * The attribute's security label **dominates** the referenced one — at least as
 * high, and at least as broad.
 *
 * The first matcher beyond `eq`/`neq` to take a `ValueRef`, and that is the
 * point: dominance relates two *live* values, which the numeric matchers cannot
 * do because `gte` and `lt` take a plain number.
 *
 * Both rules of Bell–LaPadula are this one comparison with the operands
 * exchanged — never a negation, which is why a boolean answer is safe here:
 *
 * ```ts
 * hasAttribute("clearance", dominates(resource("label")))        // no read up
 * hasResourceAttribute("label", dominates(subject("clearance"))) // no write down
 * ```
 *
 * Denies when either side is not a `SecurityLabel`. That is resolved data
 * behaving as resolved data always has — `gte(3)` on `undefined` is false too —
 * and not the missing-caller-argument case that `MissingAction` covers.
 */
export const dominates = (ref: ValueRef): Matcher => ({ _tag: "Dominates", ref });
/** Attribute is one of the listed values. */
export const inArray = (values: ReadonlyArray<unknown>): Matcher => ({ _tag: "In", values });
/** Attribute is present and not null. */
export const exists = (): Matcher => ({ _tag: "Exists" });
/**
 * Numeric attribute is >= value.
 *
 * Both the bound and the resolved attribute value are checked with
 * `Number.isFinite` at evaluation time (see `evaluateMatcher`'s `Gte` case),
 * mirroring `SecurityLabel.isSecurityLabel`'s rejection of `Infinity`/`NaN`
 * levels. A `Matcher` crosses the same untrusted-JSON trust boundary a
 * `Policy` does (§7 of AGENTS.md, ADR-QD-002): JSON has no literal spelling
 * for `Infinity`, but `1e400` still decodes to it, so a bound is exactly as
 * reachable from untrusted data as a `SecurityLabel` level is — and so is a
 * resolved attribute stored the same way and read back with `JSON.parse`.
 * Left unguarded on either side, an `Infinity` operand would dominate every
 * finite value it is compared against via `>=` — the identical failure mode
 * `isSecurityLabel` closes (CCR-QD-115: the value side was unguarded until
 * this, so an `Infinity`-valued attribute satisfied every `gte(...)` bound
 * regardless of the bound itself).
 */
export const gte = (value: number): Matcher => ({ _tag: "Gte", value });
/**
 * Numeric attribute is < value.
 *
 * See {@link gte} — both operands are checked the same way, for the same
 * reason.
 */
export const lt = (value: number): Matcher => ({ _tag: "Lt", value });
/**
 * Array or string attribute contains the value.
 *
 * String containment requires a same-kind (string) needle: `contains(1)`
 * against the string attribute `"1"` denies, with no numeric-to-string
 * coercion the way `Array.prototype.includes` doesn't require type matching
 * against array elements. See `containsValue` below.
 */
export const contains = (value: unknown): Matcher => ({ _tag: "Contains", value });
/** Applies a matcher to a nested field of an object attribute. */
export const fieldMatch = (field: string, matcher: Matcher): Matcher => ({
  _tag: "FieldMatch",
  field,
  matcher,
});
/** At least one element of an array attribute satisfies the matcher. */
export const someMatch = (matcher: Matcher): Matcher => ({ _tag: "SomeMatch", matcher });
/**
 * Every element of an array attribute satisfies the matcher.
 *
 * A present but empty array ALLOWS: `[].every(...)` is vacuously `true` in
 * JS regardless of the predicate, and `everyMatch` inherits that rather than
 * special-casing it away. This is the same vacuous-truth convention `allOf`
 * uses elsewhere in this codebase for an empty conjunction — deliberate, not
 * an oversight, though the two are NOT interchangeable: `everyMatch` still
 * DENIES an *absent* attribute (`Array.isArray(undefined)` is `false`, which
 * short-circuits before "every" gets a chance to be vacuous), so a present
 * `tags: []` and a missing `tags` are not equivalent inputs the way a reader
 * might expect. Pinned in `Matcher.test.ts`, both directions.
 */
export const everyMatch = (matcher: Matcher): Matcher => ({ _tag: "EveryMatch", matcher });
/** Applies a matcher to the length of an array or string attribute. */
export const size = (matcher: Matcher): Matcher => ({ _tag: "Size", matcher });

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/** True for a non-null object. Arrays included — `Size`/`SomeMatch` need them. */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * Reads a dot-path out of a value, returning undefined at any missing step.
 *
 * `Object.hasOwn` rather than `current[part]` alone: `path` comes off a
 * `SubjectRef`/`ResourceRef` in a decoded `Policy`, which `Policy.ts`
 * documents as re-parsed from untrusted JSON. Without the own-property guard,
 * a path like `__proto__.constructor` resolves prototype-chain members
 * instead of `undefined` — a read, not a write, but it breaks the isolation
 * every other matcher branch assumes. `readAttribute` (`Evaluate.ts`) and
 * `FieldPath.ts` both already guard the same way; this closed the one place
 * that hadn't.
 *
 * Walks `path` with `indexOf` rather than `path.split(".")`: this is the most
 * frequently called allocator in the library — once per `SubjectRef`/
 * `ResourceRef` resolution, per matcher node, per evaluation, and once more
 * per element under `filter`/`decideSubjects` — and `split` pays for an
 * intermediate segment array on every call in addition to the per-segment
 * substrings, which are unavoidable since a property lookup needs an actual
 * string key. Same segments, same order, same behavior at every boundary
 * `split` produced (a trailing dot's empty final segment, a doubled dot's
 * empty middle segment, a single segment with no dot at all) — pinned in
 * `Matcher.test.ts` rather than merely asserted here.
 */
export const getByPath = (input: unknown, path: string): unknown => {
  if (path === "") return input;
  let current: unknown = input;
  let start = 0;
  const length = path.length;
  for (;;) {
    const dot = path.indexOf(".", start);
    const end = dot === -1 ? length : dot;
    const part = path.slice(start, end);
    if (!isObject(current) || !Object.hasOwn(current, part)) return undefined;
    current = current[part];
    if (dot === -1) return current;
    start = dot + 1;
  }
};

const lengthOf = (value: unknown): number | undefined => {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "string") return value.length;
  return undefined;
};

const containsValue = (value: unknown, needle: unknown): boolean => {
  if (Array.isArray(value)) return value.includes(needle);
  if (typeof value === "string" && typeof needle === "string") return value.includes(needle);
  return false;
};

/** The subject, resource and action a matcher may reference. */
export interface MatcherContext {
  /** The subject's attributes. Its identity is `subjectId`, kept separate. */
  readonly subject: Readonly<Record<string, unknown>>;
  readonly subjectId: SubjectId;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  /** What the caller is doing. `undefined` when none was supplied. */
  readonly action: string | undefined;
}

const resolveRef = (ref: ValueRef, context: MatcherContext): unknown => {
  switch (ref._tag) {
    case "SubjectRef":
      return getByPath(context.subject, ref.path);
    case "SubjectIdRef":
      return context.subjectId;
    case "ResourceRef":
      return getByPath(context.resource, ref.path);
    case "ActionRef":
      return context.action;
    case "LiteralRef":
      return ref.value;
    default: {
      // Unreachable, and not decoration. The return type is `unknown` — a
      // resolved attribute may legitimately be `undefined` — so an unhandled tag
      // would compile and silently resolve to `undefined`, which every matcher
      // then compares against and denies. That was not true of `Neq` until
      // CCR-QD-112: its absent-operand case matched rather than denied, so an
      // unhandled tag would have widened access instead of merely refusing
      // silently. This is the only thing standing where `Match.tagsExhaustive`
      // would stand, and it costs nothing at runtime (ADR-QD-034). A tag was
      // added here once already: `ActionRef`.
      const exhaustive: never = ref;
      return exhaustive;
    }
  }
};

/**
 * True when a matcher reads the action anywhere within it.
 *
 * The evaluator asks this *before* running the matcher. `evaluateMatcher` is
 * total — it cannot fail — so an absent action would otherwise resolve to
 * `undefined`, match nothing, and be reported as a denial. A caller who forgot
 * to pass the action would then read that as "not authorized" rather than as
 * the wiring error it is (INV-QD-011).
 */
export const referencesAction: (self: Matcher) => boolean = Match.type<Matcher>().pipe(
  Match.tagsExhaustive({
    Eq: (m) => m.ref._tag === "ActionRef",
    Neq: (m) => m.ref._tag === "ActionRef",
    Dominates: (m) => m.ref._tag === "ActionRef",
    FieldMatch: (m) => referencesAction(m.matcher),
    SomeMatch: (m) => referencesAction(m.matcher),
    EveryMatch: (m) => referencesAction(m.matcher),
    Size: (m) => referencesAction(m.matcher),
    In: () => false,
    Exists: () => false,
    Gte: () => false,
    Lt: () => false,
    Contains: () => false,
  }),
);

/**
 * True when a matcher reads the resource anywhere within it.
 *
 * Asked by the predicate translator rather than the evaluator, and for the
 * mirror-image reason. A matcher that reads the resource compares against a
 * *column*, and a translator that folded it against the absent resource would
 * emit a filter built from `undefined` — a silent widening or narrowing with no
 * error to announce it (ADR-QD-024).
 */
export const referencesResource: (self: Matcher) => boolean = Match.type<Matcher>().pipe(
  Match.tagsExhaustive({
    Eq: (m) => m.ref._tag === "ResourceRef",
    Neq: (m) => m.ref._tag === "ResourceRef",
    Dominates: (m) => m.ref._tag === "ResourceRef",
    FieldMatch: (m) => referencesResource(m.matcher),
    SomeMatch: (m) => referencesResource(m.matcher),
    EveryMatch: (m) => referencesResource(m.matcher),
    Size: (m) => referencesResource(m.matcher),
    In: () => false,
    Exists: () => false,
    Gte: () => false,
    Lt: () => false,
    Contains: () => false,
  }),
);

/**
 * Evaluates a matcher against a value.
 *
 * Pure and synchronous: matchers never perform I/O, so they need no Effect.
 * Attribute *resolution* may be effectful, but that happens before this point.
 */
export const evaluateMatcher = (
  self: Matcher,
  value: unknown,
  context: MatcherContext,
): boolean => {
  switch (self._tag) {
    case "Eq": {
      const other = resolveRef(self.ref, context);
      // Fails closed on either side: an absent operand is unknown, not
      // "equal to nothing", so this denies even when `value` and `other`
      // are undefined for the same reason (CCR-QD-112).
      return value !== undefined && other !== undefined && value === other;
    }
    case "Neq": {
      const other = resolveRef(self.ref, context);
      // Mirrors `Eq` (CCR-QD-112): an absent operand denies rather than
      // matching. Before this, `value !== resolveRef(...)` was `true`
      // whenever exactly one side was `undefined`.
      return value !== undefined && other !== undefined && value !== other;
    }
    case "Dominates": {
      // Incomparable labels deny, which is what a dominance test means. The
      // four-valued `compareLabels` exists for explaining that; a matcher only
      // answers "did this match".
      const other = resolveRef(self.ref, context);
      return (
        isSecurityLabel(value) && isSecurityLabel(other) && labelDominates(value, other)
      );
    }
    case "In":
      return self.values.includes(value);
    case "Exists":
      return value !== undefined && value !== null;
    case "Gte":
      // `value` is guarded the same way the bound is (see `gte`'s doc
      // comment): an attribute that itself decoded to `Infinity` must not
      // dominate every bound the way an unguarded one would (CCR-QD-115).
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        Number.isFinite(self.value) &&
        value >= self.value
      );
    case "Lt":
      // Symmetric with `Gte` above, for the same reason and the same doc
      // comment — `Infinity < finiteBound` already fails closed without this,
      // but the guard is added for consistency rather than left asymmetric.
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        Number.isFinite(self.value) &&
        value < self.value
      );
    case "Contains":
      return containsValue(value, self.value);
    // `Object.hasOwn` rather than `value[self.field]` alone, for the same
    // reason `getByPath` above needs it: `field` is attacker-writable in a
    // decoded policy, and without the guard `self.field` naming
    // `__proto__`/`constructor`/etc. would read the prototype chain instead
    // of reporting the field absent. A genuinely missing own property still
    // evaluates the inner matcher against `undefined`, exactly as before.
    case "FieldMatch":
      return (
        isObject(value) &&
        evaluateMatcher(
          self.matcher,
          Object.hasOwn(value, self.field) ? value[self.field] : undefined,
          context,
        )
      );
    case "SomeMatch":
      return (
        Array.isArray(value) && value.some((v) => evaluateMatcher(self.matcher, v, context))
      );
    case "EveryMatch":
      return (
        Array.isArray(value) && value.every((v) => evaluateMatcher(self.matcher, v, context))
      );
    case "Size": {
      const length = lengthOf(value);
      return length !== undefined && evaluateMatcher(self.matcher, length, context);
    }
  }
};
