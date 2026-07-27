/**
 * The matcher DSL used by attribute policies.
 *
 * Like {@link Policy}, matchers are defined once as a Schema and the TypeScript
 * type is derived from it, so the wire format and the type cannot drift.
 *
 * Matchers compare an attribute value against a literal, another field of the
 * subject or resource, or a nested structure. They are pure data: no closures,
 * so a matcher survives serialization.
 */
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
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

/** Attribute equals the referenced value. */
export const eq = (ref: ValueRef): Matcher => ({ _tag: "Eq", ref });
/** Attribute does not equal the referenced value. */
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
/** Numeric attribute is >= value. */
export const gte = (value: number): Matcher => ({ _tag: "Gte", value });
/** Numeric attribute is < value. */
export const lt = (value: number): Matcher => ({ _tag: "Lt", value });
/** Array or string attribute contains the value. */
export const contains = (value: unknown): Matcher => ({ _tag: "Contains", value });
/** Applies a matcher to a nested field of an object attribute. */
export const fieldMatch = (field: string, matcher: Matcher): Matcher => ({
  _tag: "FieldMatch",
  field,
  matcher,
});
/** At least one element of an array attribute satisfies the matcher. */
export const someMatch = (matcher: Matcher): Matcher => ({ _tag: "SomeMatch", matcher });
/** Every element of an array attribute satisfies the matcher. */
export const everyMatch = (matcher: Matcher): Matcher => ({ _tag: "EveryMatch", matcher });
/** Applies a matcher to the length of an array or string attribute. */
export const size = (matcher: Matcher): Matcher => ({ _tag: "Size", matcher });

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/** True for a non-null object. Arrays included — `Size`/`SomeMatch` need them. */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** Reads a dot-path out of a value, returning undefined at any missing step. */
export const getByPath = (input: unknown, path: string): unknown => {
  if (path === "") return input;
  let current: unknown = input;
  for (const part of path.split(".")) {
    if (!isObject(current)) return undefined;
    current = current[part];
  }
  return current;
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
  readonly subjectId: string;
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
      // then compares against and denies. This is the only thing standing where
      // `Match.tagsExhaustive` would stand, and it costs nothing at runtime
      // (ADR-QD-034). A tag was added here once already: `ActionRef`.
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
    case "Eq":
      return value === resolveRef(self.ref, context);
    case "Neq":
      return value !== resolveRef(self.ref, context);
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
      return typeof value === "number" && value >= self.value;
    case "Lt":
      return typeof value === "number" && value < self.value;
    case "Contains":
      return containsValue(value, self.value);
    case "FieldMatch":
      return isObject(value) && evaluateMatcher(self.matcher, value[self.field], context);
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
