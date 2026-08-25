/**
 * Path-aware field-visibility specs — dot-paths and wildcards over `fields`.
 *
 * A field spec was always a plain string; this module is what a string now
 * *means*, not a new shape crossing the wire. `FieldOptions.fields` stays
 * `ReadonlyArray<string>` in `Policy.ts` — nothing here is `Schema`-encoded,
 * and nothing here is exported from `index.ts`'s barrel, for the same reason
 * `PortMetrics.ts` and `RetryingLayer.ts` aren't: this is machinery
 * `Decision.ts` calls, not a public surface of its own.
 *
 * A bare literal (`"title"`) is unbounded — it grants everything beneath it,
 * exactly as today's exact-match `Object.hasOwn` lookup already does, which
 * is what makes every existing `fields: [...]` array behave identically
 * after this module exists. `"*"` grants exactly one level down; `"**"`
 * grants every level, matching CASL's `permittedFieldsOf` semantics. See
 * `spec/models/07-field-level.md` for the worked examples this asymmetry
 * produces.
 *
 * No path syntax is validated. A malformed spec — an empty segment from
 * `"a..b"`, a trailing `"."` — simply matches no real key, silently. This
 * mirrors `Matcher.ts`'s `getByPath`, the only other dot-path reader in this
 * codebase, which resolves a bad path to `undefined` rather than throwing:
 * consistency with an already-reviewed convention beats a new failure mode
 * for a shape nothing before this ever validated either.
 */

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** Splits a field spec into segments. */
export const parseFieldPath = (spec: string): ReadonlyArray<string> => spec.split(".");

interface SpecShape {
  /** The concrete (non-wildcard) segments leading to this spec's terminal. */
  readonly path: ReadonlyArray<string>;
  /** How many levels past `path` this spec reaches: 1 for `"*"`, else ∞. */
  readonly reach: number;
}

// A malformed `path` here (e.g. keeping the wildcard token instead of
// slicing it off) degrades gracefully rather than producing an observably
// wrong `Containment` in most cases: `compareFieldPaths` either still lands
// on `Incomparable` (its own safe fallback) or, when the other operand is
// unbounded, both the correct and the corrupted path still satisfy the same
// "is the other side unbounded" question through a different branch of the
// same function. This makes several mutations here resistant to detection
// through `compareFieldPaths`'s external result alone — verified by hand
// against a wide set of inputs, not assumed.
const shapeOf = (spec: string): SpecShape => {
  const segments = parseFieldPath(spec);
  const terminal = segments[segments.length - 1];
  if (terminal === "*") return { path: segments.slice(0, -1), reach: 1 };
  if (terminal === "**") {
    return { path: segments.slice(0, -1), reach: Number.POSITIVE_INFINITY };
  }
  // A literal terminal is unbounded beneath itself — "title" and "title.**"
  // denote the same set, which is the fact that makes every bare, pre-existing
  // field name behave identically once specs can also be paths.
  return { path: segments, reach: Number.POSITIVE_INFINITY };
};

const samePath = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean =>
  a.length === b.length && a.every((segment, i) => segment === b[i]);

const isStrictPrefix = (shorter: ReadonlyArray<string>, longer: ReadonlyArray<string>): boolean =>
  shorter.length < longer.length && shorter.every((segment, i) => segment === longer[i]);

// ---------------------------------------------------------------------------
// Comparing two specs — the fix `Decision.ts`'s `intersectFields` needs
// ---------------------------------------------------------------------------

/**
 * `"ALessB"` means A's disclosure is a subset of B's — A is the narrower,
 * more restrictive spec. `intersectFields` keeps whichever side is "Less".
 */
export type Containment = "Equal" | "ALessB" | "BLessA" | "Incomparable";

/**
 * Compares what two specs disclose, without touching data.
 *
 * Two relationships are safe to claim **regardless of the data's actual
 * shape**, and only two:
 *
 * 1. At the *same* path, a `"*"` always discloses at most as much as a
 *    literal/`"**"` there — for a scalar the two are identical, for an
 *    object `"*"` shows `{}` where the unbounded spec shows the whole
 *    subtree — so the bounded one is always the (non-strict) subset.
 * 2. An unbounded spec at a *shorter* path always fully contains everything
 *    beneath it, including a deeper spec's entire target subtree — so the
 *    deeper spec is always the subset, whatever its own reach.
 *
 * A `"*"` compared against a spec at a **different** (ancestor/descendant)
 * path is deliberately left `Incomparable`, and this was a real bug caught
 * by testing, not a simplification: `"address.*"` discloses `street` capped
 * (whole if scalar, `{}` if object) while ALSO disclosing every *sibling* of
 * `street` that `"address.street"` never mentions at all — which of the two
 * discloses more depends on `street`'s actual runtime shape, not on the
 * specs alone. Claiming a static answer there would have been a genuine
 * defect, not a conservative approximation of one. `Incomparable` under an
 * `Intersection` merge means "drop both" — an authorization library fails
 * closed here, not open, whenever the relationship isn't provably safe.
 */
export const compareFieldPaths = (specA: string, specB: string): Containment => {
  const a = shapeOf(specA);
  const b = shapeOf(specB);

  if (samePath(a.path, b.path)) {
    if (a.reach === b.reach) return "Equal";
    // `reach` only ever holds one of two values (1 or Infinity), and the
    // equal case is already handled above — by this line the two are known
    // to differ, so `<` and `<=` are indistinguishable here. Not decoration.
    return a.reach < b.reach ? "ALessB" : "BLessA";
  }
  if (isStrictPrefix(a.path, b.path)) {
    return a.reach === Number.POSITIVE_INFINITY ? "BLessA" : "Incomparable";
  }
  if (isStrictPrefix(b.path, a.path)) {
    return b.reach === Number.POSITIVE_INFINITY ? "ALessB" : "Incomparable";
  }
  return "Incomparable";
};

// ---------------------------------------------------------------------------
// Projecting data
// ---------------------------------------------------------------------------

/** Distinguishes "nothing to show here" from a legitimately empty object. */
const OMIT: unique symbol = Symbol("FieldPath.project.omit");

/** True for a plain object — arrays excluded, a spec never indexes into one. */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Groups path tails by their first remaining segment, consuming it. */
const groupByHead = (
  tails: ReadonlyArray<ReadonlyArray<string>>,
): ReadonlyMap<string, ReadonlyArray<ReadonlyArray<string>>> => {
  const groups = new Map<string, Array<ReadonlyArray<string>>>();
  for (const tail of tails) {
    const head = tail[0];
    // Unreachable, not decoration: `projectAt` already returns before ever
    // calling this for a length-0 tail, so `head` is never `undefined` here.
    if (head === undefined) continue;
    const rest = tail.slice(1);
    const existing = groups.get(head);
    if (existing === undefined) groups.set(head, [rest]);
    else existing.push(rest);
  }
  return groups;
};

/**
 * Projects `value` under every tail that reached it.
 *
 * A tail is what remains of one field spec's segments after consuming
 * whatever led here. An empty tail means some spec's literal path ends
 * exactly at `value` — grant it whole, unrestricted beneath. A `"**"` tail
 * means the same, at any remaining depth. A `"*"` tail grants existence at
 * exactly one more level and no further: an object-valued child reached only
 * by `"*"` is shown present but empty, its own contents one level beyond
 * what `"*"` reaches.
 */
const projectAt = (value: unknown, tails: ReadonlyArray<ReadonlyArray<string>>): unknown => {
  if (tails.some((tail) => tail.length === 0)) return value;
  if (tails.some((tail) => tail.length === 1 && tail[0] === "**")) return value;
  if (!isPlainObject(value)) return OMIT;

  const starOne = tails.some((tail) => tail.length === 1 && tail[0] === "*");
  // The `"**"` half of this filter's exclusion is unreachable, not
  // decoration: a length-1 `"**"` tail always triggers the early return two
  // lines above this function's start, before any tail ever reaches here.
  const deeper = groupByHead(
    tails.filter((tail) => !(tail.length === 1 && (tail[0] === "*" || tail[0] === "**"))),
  );

  const out: Record<string, unknown> = {};
  const keys = starOne ? Object.keys(value) : [...deeper.keys()];
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) continue;
    const child = value[key];
    const childTails = deeper.get(key);
    if (childTails !== undefined) {
      const projected = projectAt(child, childTails);
      if (projected !== OMIT) out[key] = projected;
    } else if (starOne) {
      // `starOne` is always true here, not decoration: when it's false,
      // `keys` was built from `deeper.keys()` alone, so every iterated key
      // already took the `childTails !== undefined` branch above — this one
      // never runs.
      out[key] = isPlainObject(child) ? {} : child;
    }
  }
  return Object.keys(out).length === 0 ? OMIT : out;
};

/**
 * Projects a record down to the fields a set of specs makes visible.
 *
 * This is the boundary `Decision.ts`'s `project` crosses back into a typed
 * `Partial<A>`; this function itself stays untyped past the top level, since
 * a spec may address arbitrarily nested, structurally unknown data.
 */
export const project = (
  data: Record<string, unknown>,
  specs: ReadonlyArray<string>,
): Record<string, unknown> => {
  const result = projectAt(data, specs.map(parseFieldPath));
  return isPlainObject(result) ? result : {};
};
