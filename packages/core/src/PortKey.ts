/**
 * The request key: one text per value that two values share exactly when
 * `Equal.equals` says they are equal, or a typed refusal.
 *
 * Every port description writes its `key` as `canonicalKey` over a tuple of
 * its arguments (ADR-QD-094). The JSON text this replaced collided requests
 * the evaluator tells apart — a `Date` and its ISO string, `NaN` and `null`,
 * `{ a: undefined }` and `{}`, a `Set` and the array of its members — so a
 * replay could answer one question with another's capture (ARCH-65).
 *
 * **The domain**, and how the key agrees with `Equal.equals` on it:
 *
 * - `undefined`, `null`, booleans, strings and bigints, by value.
 * - Numbers by value, with `-0` keyed as `0` and `NaN` as itself, distinct
 *   from `null` and `±Infinity`: `Equal` has `-0` equal to `0` and `NaN` to
 *   `NaN`.
 * - A `Date` by its time; every invalid `Date` keys alike, as `Equal` has them.
 * - A `RegExp` by its source and flags (`String(x)`), which is what `Equal`
 *   compares.
 * - An array by its indices only: a hole keys as `undefined`, and an extra own
 *   property is ignored, as `Equal` ignores it.
 * - A plain or null-prototype object by every own string key, non-enumerable
 *   included, in sorted order: `Equal` reads them all and ignores order. An
 *   `undefined`-valued key is present, not absent.
 * - A `Set` as the sorted multiset of its members' keys, a `Map` as the sorted
 *   multiset of its entries' keys: `Equal` matches members one-to-one, so two
 *   distinct `{ a: 1 }` members count twice.
 * - A subclass of `Date`, `RegExp`, `Array`, `Set` or `Map` keys as its base
 *   class, because `Equal` compares it as one (measured on `effect@4.1.2`).
 * - A shared, acyclic reference is fine and is keyed at each place it occurs.
 *
 * **Outside the domain** is a {@link KeyRefusal}, never a throw: a cycle
 * (`Equal` is coinductive there, and text is finite), a function or a symbol
 * (`Equal` compares them by identity), an object with a symbol key, a getter
 * or proxy trap that throws, a value implementing `Equal` itself, and every
 * other object. Such a class instance is refused rather than keyed because
 * `Equal` compares one over its own *and prototype* keys, which has
 * `new Number(1)` equal to `new Number(2)` and a `Uint8Array` equal to an
 * `Int8Array` of the same bytes; no text key can agree with that and stay
 * sound. That covers boxed primitives, binary data, `Error`, `Promise` and
 * Effect data types. One limit the key cannot see: an object opted out with
 * `Equal.byReference` is keyed by its structure, because the opt-out is
 * recorded inside `effect`.
 *
 * **The format**: every value is one self-delimiting token, so tokens joined by
 * `,` stay unambiguous — `u`, `n`, `t`, `f`; `d<number>;`; `b<bigint>;`;
 * `s<JSON string>`; `D<time>;`; `R<JSON string>`; `[a,b]`; `{"k":v}`;
 * `S{a,b}`; `M{k=v}`. Sorting is by UTF-16 code unit.
 *
 * The walk keeps its own stack of frames rather than recursing, so a value
 * nested 100,000 deep keys without a `RangeError` (the style of `JsonHazard.ts`'s
 * `wireHazard`). Package-private: not in the barrel.
 */
import * as Equal from "effect/Equal";
import * as Result from "effect/Result";
import { KeyRefusal } from "./PortDescription.ts";
import type { UnkeyableKind } from "./PortDescription.ts";

/** One child of a container: where it sits, and how to read it when its turn comes. */
type Child = readonly [segment: string | number, read: () => unknown];

/** A container the walk has entered and not yet closed. */
interface KeyFrame {
  readonly container: object;
  readonly children: Iterator<Child>;
  /** The container's token from its children's tokens, in reading order. */
  readonly close: (tokens: ReadonlyArray<string>) => string;
  readonly tokens: Array<string>;
}

const frame = (
  container: object,
  children: ReadonlyArray<Child>,
  close: (tokens: ReadonlyArray<string>) => string,
): KeyFrame => ({ container, children: children.values(), close, tokens: [] });

/** The constructor's name, or the `Object.prototype.toString` brand without one. */
const brandOf = (value: object): string => {
  const ctor: unknown = Reflect.get(value, "constructor");
  return typeof ctor === "function" && ctor.name !== ""
    ? ctor.name
    : Object.prototype.toString.call(value).slice(8, -1);
};

/** Every own string key, non-enumerable included, closed as sorted `"k":v` entries. */
const objectFrame = (container: object): KeyFrame => {
  const keys = Object.getOwnPropertyNames(container);
  return frame(
    container,
    keys.map((key): Child => [key, () => Reflect.get(container, key)]),
    (tokens) => `{${tokens.map((token, index) => `${JSON.stringify(keys[index])}:${token}`).toSorted().join(",")}}`,
  );
};

/** Indices only, a hole read as `undefined`. */
const arrayFrame = (container: ReadonlyArray<unknown>): KeyFrame =>
  frame(
    container,
    Array.from({ length: container.length }, (_, index): Child => [index, () => container[index]]),
    (tokens) => `[${tokens.join(",")}]`,
  );

const setFrame = (container: ReadonlySet<unknown>): KeyFrame =>
  frame(
    container,
    Array.from(container, (member, index): Child => [index, () => member]),
    (tokens) => `S{${tokens.toSorted().join(",")}}`,
  );

/** Each entry is two children, its key then its value, closed as `k=v`. */
const mapFrame = (container: ReadonlyMap<unknown, unknown>): KeyFrame =>
  frame(
    container,
    Array.from(container).flatMap(([key, value], index): Array<Child> => [
      [index, () => key],
      [index, () => value],
    ]),
    (tokens) =>
      `M{${tokens
        .flatMap((token, index) => (index % 2 === 1 ? [`${tokens[index - 1]}=${token}`] : []))
        .toSorted()
        .join(",")}}`,
  );

/**
 * The request key of `value`, or the first reason it has none.
 *
 * Never throws and never overflows the stack; see the module comment for the
 * domain, the format and its agreement with `Equal.equals`.
 */
export const canonicalKey = (value: unknown): Result.Result<string, KeyRefusal> => {
  const onPath = new Set<object>();
  const stack: Array<KeyFrame> = [];
  /** Where the value being read sits: one segment per open container. */
  const path: Array<string | number> = [];

  const unkeyable = (kind: UnkeyableKind, brand: string) =>
    Result.fail(KeyRefusal.Unkeyable({ path: [...path], kind, brand }));

  /** A leaf's token, a container's frame to walk, or why the value has no key. */
  const visit = (child: unknown): Result.Result<string | KeyFrame, KeyRefusal> => {
    if (child === undefined) return Result.succeed("u");
    if (child === null) return Result.succeed("n");
    if (typeof child === "boolean") return Result.succeed(child ? "t" : "f");
    if (typeof child === "number") return Result.succeed(`d${String(child)};`);
    if (typeof child === "bigint") return Result.succeed(`b${String(child)};`);
    if (typeof child === "string") return Result.succeed(`s${JSON.stringify(child)}`);
    if (typeof child === "symbol") return unkeyable("symbol", "Symbol");
    if (typeof child === "function") return unkeyable("function", "Function");
    if (onPath.has(child)) return Result.fail(KeyRefusal.Circular({ path: [...path] }));
    // `Equal` reads a Date, a RegExp, an array, a Set and a Map alike whatever
    // their subclass, so the key does too; it checks the first two before an
    // `Equal` implementation of the value's own.
    if (child instanceof Date) return Result.succeed(`D${String(child.getTime())};`);
    if (child instanceof RegExp) return Result.succeed(`R${JSON.stringify(String(child))}`);
    if (Equal.isEqual(child)) return unkeyable("instance", brandOf(child));
    if (Array.isArray(child)) return Result.succeed(arrayFrame(child));
    if (child instanceof Set) return Result.succeed(setFrame(child));
    if (child instanceof Map) return Result.succeed(mapFrame(child));
    const proto: unknown = Object.getPrototypeOf(child);
    if (proto !== Object.prototype && proto !== null) return unkeyable("instance", brandOf(child));
    if (Object.getOwnPropertySymbols(child).length > 0) return unkeyable("symbol-key", brandOf(child));
    return Result.succeed(objectFrame(child));
  };

  /** Folds each finished token into its parent, until the root's token is the key. */
  const walk = (): Result.Result<string, KeyRefusal> => {
    let next = visit(value);
    for (;;) {
      if (Result.isFailure(next)) return Result.fail(next.failure);
      const found = next.success;
      let top: KeyFrame;
      if (typeof found === "string") {
        const parent = stack[stack.length - 1];
        if (parent === undefined) return Result.succeed(found);
        parent.tokens.push(found);
        path.pop();
        top = parent;
      } else {
        onPath.add(found.container);
        stack.push(found);
        top = found;
      }
      const step = top.children.next();
      if (step.done === true) {
        onPath.delete(top.container);
        stack.pop();
        next = Result.succeed(top.close(top.tokens));
      } else {
        const [segment, read] = step.value;
        path.push(segment);
        next = visit(read());
      }
    }
  };

  return Result.try({
    try: walk,
    catch: (error) =>
      KeyRefusal.Unreadable({ path: [...path], message: error instanceof Error ? error.message : String(error) }),
  }).pipe(Result.flatMap((walked) => walked));
};
