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
import * as Schema from "effect/Schema";

// ---------------------------------------------------------------------------
// Value references
// ---------------------------------------------------------------------------

const SubjectRef = Schema.TaggedStruct("SubjectRef", { path: Schema.String });
const ResourceRef = Schema.TaggedStruct("ResourceRef", { path: Schema.String });
const LiteralRef = Schema.TaggedStruct("LiteralRef", { value: Schema.Unknown });

export const ValueRef = Schema.Union([SubjectRef, ResourceRef, LiteralRef]);
export type ValueRef = typeof ValueRef.Type;

/** References a field of the subject by dot-path. */
export const subject = (path: string): ValueRef => ({ _tag: "SubjectRef", path });
/** References a field of the resource by dot-path. */
export const resource = (path: string): ValueRef => ({ _tag: "ResourceRef", path });
/** A constant value. */
export const literal = (value: unknown): ValueRef => ({ _tag: "LiteralRef", value });

// ---------------------------------------------------------------------------
// Matcher expressions
// ---------------------------------------------------------------------------

export type Matcher =
  | { readonly _tag: "Eq"; readonly ref: ValueRef }
  | { readonly _tag: "Neq"; readonly ref: ValueRef }
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

/** The subject and resource a matcher may reference. */
export interface MatcherContext {
  readonly subject: Readonly<Record<string, unknown>>;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
}

const resolveRef = (ref: ValueRef, context: MatcherContext): unknown => {
  switch (ref._tag) {
    case "SubjectRef":
      return getByPath(context.subject, ref.path);
    case "ResourceRef":
      return getByPath(context.resource, ref.path);
    case "LiteralRef":
      return ref.value;
  }
};

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
