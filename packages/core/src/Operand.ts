/**
 * The value a leaf compares, read as an own property.
 *
 * A decoded policy is untrusted input and may name any key. `JSON.parse` gives
 * an object an own `__proto__` key without touching its real prototype, so an
 * own key is data and an inherited `Object.prototype` member is not. An
 * inherited member therefore reads as absent, and a prototype-named key behaves
 * like any missing key, which denies (INV-QD-092).
 *
 * Before this module nine readers each restated that rule, and the reference
 * interpreter's row read did not: `evaluatePredicate` admitted a row on a
 * column named `constructor` that `evaluate` denied (ADR-QD-166).
 *
 * Pure and synchronous, with no spans: a read runs once per leaf per evaluation
 * and once per row, and allocates nothing. Package-private: kept out of the
 * barrel (AGENTS.md §9) and not exported from any entry point (ADR-QD-099).
 * `getByPath` reaches the public surface through `Matcher.ts`, beside
 * `judgeMatcher`.
 */

/** True for a non-null object. Arrays included — a path may step into one. */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * The value at `key`, or undefined when `key` is not an own property.
 *
 * An own key holding undefined reads undefined too; ask `isOwnKey` when that
 * matters.
 */
export const ownValue = <V>(cell: Readonly<Record<string, V>>, key: string): V | undefined =>
  Object.hasOwn(cell, key) ? cell[key] : undefined;

/**
 * True when `key` is an own property of `data`, one holding undefined included.
 *
 * A type predicate rather than a boolean: `Object.hasOwn` takes any `string`,
 * and a caller that then indexes `data` needs the key as `keyof A & string`.
 * Narrowing is the whole crossing, so the read after it needs no cast.
 */
export const isOwnKey = <A extends object>(data: A, key: string): key is keyof A & string =>
  Object.hasOwn(data, key);

/**
 * Reads a dot-path out of a value, returning undefined at any missing step.
 *
 * Each segment is read as an own property (`isOwnKey`): `path` comes off a
 * `SubjectRef`/`ResourceRef` in a decoded `Policy`, so a path like
 * `__proto__.constructor` must resolve to `undefined`, not to a prototype-chain
 * member.
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
 * `Operand.test.ts` rather than merely asserted here.
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
    if (!isObject(current) || !isOwnKey(current, part)) return undefined;
    current = current[part];
    if (dot === -1) return current;
    start = dot + 1;
  }
};
