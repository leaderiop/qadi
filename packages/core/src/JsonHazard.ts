/**
 * The walk that decides whether a value survives JSON as itself, and the
 * rebuild that turns a value that does into a `Schema.Json`.
 *
 * Extracted from `SinkCodec.ts` (ARCH-31 T3) so the remote port wire
 * (`PortWireEncode.ts`) refuses exactly what a sink record refuses — a `Set`,
 * a `bigint`, `NaN`, a cycle — rather than carrying a second, drifting
 * statement of the same hazards. The walk is moved verbatim; `SinkCodec.ts`
 * imports it back and its tests pass unmodified.
 *
 * Package-private: not in the barrel (AGENTS.md §9, ADR-QD-099). It imports
 * `SinkWire.ts` only, and no port module (ADR-QD-037).
 */
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import type * as Schema from "effect/Schema";
import { EncodeRefusal } from "./SinkWire.ts";
import type { OpaqueKind, WirePath } from "./SinkWire.ts";

/**
 * A container the walk has entered and not yet left: an array's items, or an
 * object's own enumerable string keys.
 */
interface WalkFrame {
  readonly container: object;
  readonly items: ReadonlyArray<unknown> | undefined;
  readonly keys: ReadonlyArray<string>;
  readonly length: number;
  readonly depth: number;
  index: number;
}

/**
 * The `OpaqueKind` of each built-in brand JSON cannot carry. A lookup table
 * rather than a dispatch: any brand absent here (and not `Object`/`Array`) is
 * `"OtherBuiltIn"`. Binary data is recognised by `ArrayBuffer.isView` or its
 * buffer brands, since each typed array has a brand of its own.
 */
const OPAQUE_KIND_BY_BRAND: ReadonlyMap<string, OpaqueKind> = new Map<string, OpaqueKind>([
  ["Map", "Map"],
  ["Set", "Set"],
  ["WeakMap", "WeakMap"],
  ["WeakSet", "WeakSet"],
  ["RegExp", "RegExp"],
  ["Promise", "Promise"],
  ["Error", "Error"],
  ["ArrayBuffer", "BinaryData"],
  ["SharedArrayBuffer", "BinaryData"],
  ["DataView", "BinaryData"],
  ["Boolean", "BoxedPrimitive"],
  ["Number", "BoxedPrimitive"],
  ["String", "BoxedPrimitive"],
]);

/** `"Set"` for a `Set`: the `Object.prototype.toString` brand, unwrapped. */
const brandOf = (value: object): string => Object.prototype.toString.call(value).slice(8, -1);

const opaqueKindOf = (value: object, brand: string): OpaqueKind =>
  ArrayBuffer.isView(value) ? "BinaryData" : (OPAQUE_KIND_BY_BRAND.get(brand) ?? "OtherBuiltIn");

const hasCustomToJSON = (value: object): boolean =>
  Predicate.hasProperty(value, "toJSON") && typeof value.toJSON === "function";

const hasEnumerableSymbolKey = (value: object): boolean =>
  Object.getOwnPropertySymbols(value).some((key) => Object.prototype.propertyIsEnumerable.call(value, key));

/** A plain object — `Object.prototype` or no prototype — needs no brand lookup. */
const isPlainObject = (value: object): boolean => {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const NO_KEYS: ReadonlyArray<string> = [];

/**
 * The first value in an encoded record that would not survive JSON as itself,
 * or `undefined` when the whole value round-trips.
 *
 * One iterative walk with one mutable on-path set, the technique the retired `isJsonSafe`
 * used, over the *encoded* output — so it cannot miss a field the way per-field
 * guards did: whatever the encode emitted is what it checks. Its depth count
 * matches `exceedsJsonDepth`'s (the root is depth 0, each child one more, and
 * any value deeper than `maxDepth` is refused), so it refuses exactly what a
 * receiver's depth guard would.
 *
 * An `undefined` object property is absence, not a hazard: JSON drops the key
 * and decode reads it as absent, and `Schema`'s own encoded output carries such
 * keys for unset optional fields. An `undefined` array element is refused,
 * because JSON writes it as `null`. A valid `Date` is accepted and crosses as
 * its ISO string, a named normalisation. The path is rebuilt from the stack
 * only when a hazard is found, so the accepting walk allocates no paths.
 */
export const wireHazard = (root: unknown, maxDepth: number): EncodeRefusal | undefined => {
  const onPath = new Set<object>();
  const stack: Array<WalkFrame> = [];
  const pathHere = (): WirePath =>
    stack.map((frame) => (frame.items === undefined ? (frame.keys[frame.index - 1] ?? "") : frame.index - 1));

  const visit = (value: unknown, depth: number, isElement: boolean): EncodeRefusal | undefined => {
    if (value === undefined) {
      return isElement ? EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "undefined-element" }) : undefined;
    }
    if (depth > maxDepth) return EncodeRefusal.TooDeep({ path: pathHere(), maxDepth });
    if (value === null || typeof value === "string" || typeof value === "boolean") return undefined;
    if (typeof value === "number") {
      return Number.isFinite(value) ? undefined : EncodeRefusal.NonFinite({ path: pathHere() });
    }
    if (typeof value === "function") return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "function" });
    if (typeof value === "symbol") return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "symbol" });
    if (typeof value === "bigint") return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "bigint" });
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? EncodeRefusal.NonFinite({ path: pathHere() }) : undefined;
    }
    if (onPath.has(value)) return EncodeRefusal.Circular({ path: pathHere() });
    if (Array.isArray(value)) {
      onPath.add(value);
      stack.push({ container: value, items: value, keys: NO_KEYS, length: value.length, depth, index: 0 });
      return undefined;
    }
    if (hasCustomToJSON(value)) {
      return EncodeRefusal.Opaque({ path: pathHere(), kind: "CustomToJSON", brand: brandOf(value) });
    }
    if (!isPlainObject(value)) {
      const brand = brandOf(value);
      if (brand !== "Object") return EncodeRefusal.Opaque({ path: pathHere(), kind: opaqueKindOf(value, brand), brand });
    }
    if (hasEnumerableSymbolKey(value)) return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "symbol" });
    const keys = Object.keys(value);
    onPath.add(value);
    stack.push({ container: value, items: undefined, keys, length: keys.length, depth, index: 0 });
    return undefined;
  };

  const atRoot = visit(root, 0, false);
  if (atRoot !== undefined) return atRoot;
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame === undefined) break;
    if (frame.index >= frame.length) {
      onPath.delete(frame.container);
      stack.pop();
      continue;
    }
    const index = frame.index;
    frame.index += 1;
    const child: unknown =
      frame.items === undefined ? Reflect.get(frame.container, frame.keys[index] ?? "") : frame.items[index];
    const refusal = visit(child, frame.depth + 1, frame.items !== undefined);
    if (refusal !== undefined) return refusal;
  }
  return undefined;
};


/**
 * Builds a fresh `Schema.Json` from a value the walk has accepted.
 *
 * Arrays are mapped and plain objects rebuilt from their own enumerable
 * entries, so the result shares no structure with the input and needs no type
 * assertion to be a `Schema.Json`. An `undefined` property is absence (the
 * walk's own rule); a valid `Date` is its ISO string (the walk's named
 * normalisation). Total only on a value `wireHazard` accepted.
 */
const rebuildJson = (value: unknown): Schema.Json => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(rebuildJson);
  if (typeof value === "object") {
    // `fromEntries` defines own data properties, so a `__proto__` key stays a key.
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]): [string, Schema.Json] => [key, rebuildJson(entry)]),
    );
  }
  return null;
};

const encodeFailed = (error: unknown): EncodeRefusal =>
  EncodeRefusal.EncodeFailed({ message: error instanceof Error ? error.message : String(error) });

/**
 * An object's own entries as a detached record of `Schema.Json`, or the first
 * reason the object has no JSON form.
 *
 * {@link toJson} for a value already known to be a record — a resource — so the
 * caller gets the record type without an assertion.
 */
export const toJsonRecord = (
  value: Readonly<Record<string, unknown>>,
  maxDepth: number,
): Result.Result<{ readonly [key: string]: Schema.Json }, EncodeRefusal> => {
  const walked = Result.try({ try: () => wireHazard(value, maxDepth), catch: encodeFailed });
  if (Result.isFailure(walked)) return Result.fail(walked.failure);
  if (walked.success !== undefined) return Result.fail(walked.success);
  return Result.try({
    try: () =>
      Object.fromEntries(
        Object.entries(value)
          .filter(([, entry]) => entry !== undefined)
          .map(([key, entry]): [string, Schema.Json] => [key, rebuildJson(entry)]),
      ),
    catch: encodeFailed,
  });
};

/**
 * `value` as a detached `Schema.Json`, or the first reason it has no JSON form.
 *
 * Never throws: a getter that throws while the walk inspects the value is an
 * `EncodeFailed` refusal. The result is a copy, so mutating the input
 * afterwards does not change it.
 */
export const toJson = (value: unknown, maxDepth: number): Result.Result<Schema.Json, EncodeRefusal> => {
  const walked = Result.try({ try: () => wireHazard(value, maxDepth), catch: encodeFailed });
  if (Result.isFailure(walked)) return Result.fail(walked.failure);
  if (walked.success !== undefined) return Result.fail(walked.success);
  return Result.try({ try: () => rebuildJson(value), catch: encodeFailed });
};
