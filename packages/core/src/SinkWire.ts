/**
 * The record wire's vocabulary: what `encodeSinkRecord` and `decodeSinkRecord`
 * refuse with, and the version they speak.
 *
 * A leaf, so `Errors.ts` (whose `SinkRecordNotEncodable` and
 * `SinkRecordNotDecodable` carry these types) and `SinkCodec.ts` (which raises
 * them) can both import it without a cycle: `Errors.ts` cannot import
 * `SinkCodec.ts` (ADR-QD-037, which counts type-only edges), and this module
 * imports only `effect`. The error classes stay in `Errors.ts` with the rest of
 * `QadiError`; only the vocabulary they name lives here (ADR-QD-095's ARCH-27
 * amendment). Package-private: the barrel re-exports every name, so nothing
 * here is reached by its own path.
 */
import * as Data from "effect/Data";
import * as Match from "effect/Match";

/**
 * The `_tag` of a `SinkRecord` — `"Decision"` or `"Obligations"`.
 *
 * Restated as a literal union rather than imported: `DecisionRecord.ts`
 * imports `EvaluationError` from `Errors.ts`, which imports this module, so
 * importing `SinkRecord` back — even as a type, which madge counts
 * (ADR-QD-037) — would be a cycle.
 * `Errors.tst.ts` pins it equal to `SinkRecord["_tag"]`, so the two cannot
 * drift.
 */
export type SinkRecordTag = "Decision" | "Obligations";

/**
 * Where in a record's wire form a refusal was found: object keys and array
 * indices from the wire record's root, e.g. `["resource", "tags"]`.
 */
export type WirePath = ReadonlyArray<string | number>;

/**
 * Which kind of object has no JSON form.
 *
 * Each is something `JSON.stringify` renders as `{}` (a `Map`, a `Set`, a
 * `RegExp`, an `Error`, a `Promise`), as an index object (binary data), as its
 * unboxed value (a boxed primitive), or through a `toJSON` of its own that the
 * receiver cannot reverse (`CustomToJSON`, a `URL` for example).
 * `OtherBuiltIn` is any other built-in brand.
 */
export type OpaqueKind =
  | "Map"
  | "Set"
  | "WeakMap"
  | "WeakSet"
  | "RegExp"
  | "BinaryData"
  | "Promise"
  | "Error"
  | "BoxedPrimitive"
  | "CustomToJSON"
  | "OtherBuiltIn";

/** A value JSON cannot carry at all: it would be dropped, or throw. */
export type UnrepresentableKind = "function" | "symbol" | "bigint" | "undefined-element";

/**
 * Why `encodeSinkRecord` refused a record.
 *
 * A closed union, so a reporter matching on it with `Match.tagsExhaustive` is a
 * compile error away from a new reason.
 *
 * - `Circular`: an object is its own ancestor at `path`.
 * - `TooDeep`: the wire form nests deeper than `maxDepth`, the bound every
 *   receiver's decode enforces, so a receiver would refuse it.
 * - `NonFinite`: `NaN`, `±Infinity` or an invalid `Date`, which JSON writes as
 *   `null`.
 * - `Unrepresentable`: a function, a symbol, a `bigint`, or `undefined` as an
 *   array element.
 * - `Opaque`: an object JSON renders as something it is not; `brand` is its
 *   `Object.prototype.toString` brand (`"Set"`, `"URL"`).
 * - `EncodeFailed`: the wire schema rejected the record, or inspecting it
 *   threw (a throwing getter, for example).
 */
export type EncodeRefusal = Data.TaggedEnum<{
  Circular: { readonly path: WirePath };
  TooDeep: { readonly path: WirePath; readonly maxDepth: number };
  NonFinite: { readonly path: WirePath };
  Unrepresentable: { readonly path: WirePath; readonly kind: UnrepresentableKind };
  Opaque: { readonly path: WirePath; readonly kind: OpaqueKind; readonly brand: string };
  EncodeFailed: { readonly message: string };
}>;

/** Constructors and guards for {@link EncodeRefusal}. */
export const EncodeRefusal = Data.taggedEnum<EncodeRefusal>();

/**
 * Where in the record an {@link EncodeRefusal} was found, or `undefined` for
 * `EncodeFailed`, which has no location.
 *
 * A module-scope `Match.tagsExhaustive` rather than `"path" in refusal`: the
 * presence of a field stood in for the tag, so a new variant with a location
 * under another name, or one that should have a path and lacks it, compiled and
 * silently reported no location (AGENTS.md §5a, ARCH-25). Now it is a compile
 * error here, beside the union.
 */
export const encodeRefusalPath: (self: EncodeRefusal) => WirePath | undefined = Match.type<EncodeRefusal>().pipe(
  Match.tagsExhaustive({
    Circular: (r) => r.path,
    TooDeep: (r) => r.path,
    NonFinite: (r) => r.path,
    Unrepresentable: (r) => r.path,
    Opaque: (r) => r.path,
    EncodeFailed: () => undefined,
  }),
);

/**
 * The log annotations every report of a refused record carries: which refusal,
 * where in the record, and which evaluation. Exactly three keys, and never a
 * value from the record (INV-QD-104).
 */
export type EncodeRefusalAnnotations = {
  readonly "qadi.refusal": EncodeRefusal["_tag"];
  readonly "qadi.path": string;
  readonly evaluationId: string;
};

/**
 * The annotations a refused record is reported with: the refusal's tag, its
 * path joined with `"."` (`""` when it has none), and the evaluation id.
 *
 * **Says where, never what** (INV-QD-104). Never a value from the record, and
 * never `EncodeFailed.message`, which is caller text: the default log
 * implementation copies annotations onto the current span, so an annotation is
 * span data and INV-QD-044's reasoning applies. Path segments are the keys of
 * the caller's own object, so a resource keyed by data puts that key here.
 */
export const encodeRefusalAnnotations = (self: {
  readonly refusal: EncodeRefusal;
  readonly evaluationId: string;
}): EncodeRefusalAnnotations => ({
  "qadi.refusal": self.refusal._tag,
  "qadi.path": encodeRefusalPath(self.refusal)?.join(".") ?? "",
  evaluationId: self.evaluationId,
});

/** `resource.tags`, or `the record` for a refusal found at the root. */
const where = (path: WirePath): string => (path.length === 0 ? "the record" : path.join("."));

/**
 * One sentence per {@link EncodeRefusal}, for a caller holding the refusal.
 *
 * `EncodeFailed`'s sentence carries its `message`, which can be text a caller
 * wrote (a throwing getter's message), so a sentence is never an annotation and
 * never a default log message (INV-QD-104); only an error's own `reason` field
 * carries it. `@qadi/audit` fills `AuditEntryNotEncodable.reason` with this.
 */
export const describeEncodeRefusal: (self: EncodeRefusal) => string = Match.type<EncodeRefusal>().pipe(
  Match.tagsExhaustive({
    Circular: (refusal) => `${where(refusal.path)}: a circular reference has no JSON form`,
    TooDeep: (refusal) =>
      `${where(refusal.path)}: nested deeper than ${refusal.maxDepth} levels, past what a reader will decode`,
    NonFinite: (refusal) => `${where(refusal.path)}: a non-finite number or invalid Date has no JSON form`,
    Unrepresentable: (refusal) => `${where(refusal.path)}: a ${refusal.kind} has no JSON form`,
    Opaque: (refusal) => `${where(refusal.path)}: a ${refusal.brand} has no JSON form`,
    EncodeFailed: (refusal) => `the record could not be encoded: ${refusal.message}`,
  }),
);

/**
 * A version of the record wire that `decodeSinkRecord` reads (ADR-QD-096).
 *
 * Version 2 carries `version: 2` and a decision's outcome as one tagged value.
 * It is the only one: version 1 — spelled by the absence of a `version` key,
 * the outcome as two optional fields `decided`/`failed`, written by every
 * `@qadi/core` before 0.10 — was read until 0.11.0 and is now refused as
 * `UnsupportedVersion` (ADR-QD-096's 2026-10-06 amendment). A closed union of
 * one member, kept rather than deleted because it is what
 * {@link DecodeRefusal}'s `UnsupportedVersion.supported` reports, and a
 * future version 3 is a full-union edit here, not a new export.
 *
 * Declared here rather than in `SinkCodec.ts` because {@link DecodeRefusal}
 * names it, and this leaf cannot import `SinkCodec.ts` (ADR-QD-037).
 */
export type WireVersion = 2;

/** Every wire version `decodeSinkRecord` reads: version 2, and only it. */
export const WIRE_VERSIONS: ReadonlyArray<WireVersion> = [2];

/**
 * Why `decodeSinkRecord` refused its input.
 *
 * A closed union, edited as a whole when a reason is added.
 *
 * - `NotJson`: the text did not parse as JSON (`decodeSinkRecordString` only).
 * - `TooDeep`: the input nests deeper than `maxDepth`; refused before the
 *   schema recurses into it.
 * - `Malformed`: the input is not a record of the version it claims — not a
 *   JSON object at all, or a `version: 2` record whose content does not match
 *   (an unknown `_tag`, a typo inside the embedded policy, a field of the wrong
 *   type).
 * - `UnsupportedVersion`: the input is an object whose `version` is not one
 *   this reader reads (`supported`). A different fix from `Malformed`: the
 *   other end runs a release this one does not speak to (ADR-QD-096). `version`
 *   is the value as sent, which may be any JSON value, and is `undefined` when
 *   the input names no version — a pre-0.10 (version-1) record, which 0.11.0
 *   no longer reads: re-encode it with 0.10.x, or upgrade its sender. A newer
 *   `version` means upgrade this reader.
 */
export type DecodeRefusal = Data.TaggedEnum<{
  NotJson: Record<never, never>;
  TooDeep: { readonly maxDepth: number };
  Malformed: { readonly message: string };
  UnsupportedVersion: { readonly version: unknown; readonly supported: ReadonlyArray<WireVersion> };
}>;

/** Constructors and guards for {@link DecodeRefusal}. */
export const DecodeRefusal = Data.taggedEnum<DecodeRefusal>();
