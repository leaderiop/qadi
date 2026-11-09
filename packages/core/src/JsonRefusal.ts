/**
 * The words a JSON wire refuses a value with, and the three readings of a refusal.
 *
 * Read by both wires, the sink record codec (`SinkCodec.ts`) and the remote port
 * wire (`PortWireEncode.ts`, through `JsonHazard.ts`'s walk), so neither depends
 * on the other's module for words about JSON rather than about records (ARCH-54,
 * ADR-QD-116). The record wire's own words (`WireVersion`, `DecodeRefusal`,
 * `SinkRecordTag`) stay in `SinkWire.ts`.
 *
 * A leaf that imports only `effect`, so `Errors.ts`, `SinkCodec.ts`,
 * `JsonHazard.ts` and the port modules can all import it without a cycle
 * (ADR-QD-037, which counts type-only edges). Package-private beyond the
 * barrel: the barrel re-exports every name, so nothing reaches it by its own
 * path (ADR-QD-099).
 */
import * as Data from "effect/Data";
import * as Match from "effect/Match";

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
 * Why a JSON wire refused a value: `encodeSinkRecord` refusing a record, or
 * `portWire`'s question and answer conversion refusing a port value.
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
