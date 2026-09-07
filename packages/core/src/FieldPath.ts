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

/**
 * A spec's shape — the concrete path leading to its terminal, and how far past
 * it the spec reaches. Exported so a caller comparing the same spec against
 * many others — `Decision.ts`'s `intersectFields`, pairwise over two whole
 * arrays — can compute each side's shape once with {@link shapeOf} and reuse
 * it across every pair via {@link compareShapes}, instead of paying
 * `parseFieldPath` + two array allocations again on every single comparison.
 */
export interface SpecShape {
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
export const shapeOf = (spec: string): SpecShape => {
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
export const compareFieldPaths = (specA: string, specB: string): Containment =>
  compareShapes(shapeOf(specA), shapeOf(specB));

/**
 * {@link compareFieldPaths}'s comparison, taking each side's already-computed
 * {@link SpecShape} rather than the raw spec strings.
 *
 * The split exists for `Decision.ts`'s `intersectFields`: comparing every spec
 * in one field set against every spec in another is O(|a|·|b|), and
 * `compareFieldPaths` alone would recompute `shapeOf` on both operands — a
 * `split(".")` plus two array allocations — on every single pair, most of them
 * redundant (each spec's shape depends on nothing but the spec itself). A
 * caller that hoists `shapeOf` outside its own loop and calls this instead
 * pays for each shape once, however many pairs it is compared across.
 */
export const compareShapes = (a: SpecShape, b: SpecShape): Containment => {
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
    // Unreachable, not decoration: `projectAt` checks `grantsWhole` before any
    // frame is built, so a length-0 tail never reaches here and `head` is
    // never `undefined`.
    if (head === undefined) continue;
    const rest = tail.slice(1);
    const existing = groups.get(head);
    if (existing === undefined) groups.set(head, [rest]);
    else existing.push(rest);
  }
  return groups;
};

/**
 * True when some tail grants whatever it reached whole — an empty tail, or a
 * bare `"**"`.
 *
 * An empty tail means some spec's literal path ends exactly there; a `"**"`
 * tail means the same, at any remaining depth. Either way there is nothing
 * left to redact beneath, whatever shape the value turns out to have — so this
 * is the one question answered before a value's own shape is even looked at.
 */
const grantsWhole = (tails: ReadonlyArray<ReadonlyArray<string>>): boolean =>
  tails.some((tail) => tail.length === 0) ||
  tails.some((tail) => tail.length === 1 && tail[0] === "**");

/**
 * One level of {@link projectAt}'s walk: the object being projected, the specs
 * still descending into it, and the result being assembled for it.
 *
 * `cursor` is the frame's own position in `keys`, so the driver loop can leave
 * a frame on the stack, descend into a child, and resume exactly where it left
 * off — which is what a function-call frame used to hold implicitly.
 */
interface Frame {
  readonly value: Record<string, unknown>;
  /** Path tails still descending, grouped by the key each descends into. */
  readonly deeper: ReadonlyMap<string, ReadonlyArray<ReadonlyArray<string>>>;
  /** Whether a bare `"*"` tail terminated at this level. */
  readonly starOne: boolean;
  readonly keys: ReadonlyArray<string>;
  cursor: number;
  /**
   * `Object.create(null)` rather than `{}`: `key` comes from
   * `Object.keys(value)` (untrusted data — JSON.parse gives an object its own
   * "__proto__" key without ever touching the real prototype, so
   * `Object.hasOwn` sees it) or from a policy-authored field spec segment this
   * module's own doc says is never validated. Either source can produce the
   * literal string "__proto__", and `out[key] = ...` on an ordinary object
   * literal would invoke `Object.prototype`'s `__proto__` *setter* rather than
   * create an own property — a null-prototype `out` has no such setter to
   * invoke, so the assignment is always a plain data property, whatever `key`
   * is.
   */
  readonly out: Record<string, unknown>;
  /** Where this frame's finished projection belongs; `undefined` at the root. */
  readonly parent: Frame | undefined;
  readonly parentKey: string;
}

const makeFrame = (
  value: Record<string, unknown>,
  tails: ReadonlyArray<ReadonlyArray<string>>,
  parent: Frame | undefined,
  parentKey: string,
): Frame => {
  const starOne = tails.some((tail) => tail.length === 1 && tail[0] === "*");
  // The `"**"` half of this filter's exclusion is unreachable, not decoration:
  // a length-1 `"**"` tail is `grantsWhole`, which every caller checks before
  // building a frame, so no such tail ever reaches here.
  const deeper = groupByHead(
    tails.filter((tail) => !(tail.length === 1 && (tail[0] === "*" || tail[0] === "**"))),
  );
  return {
    value,
    deeper,
    starOne,
    keys: starOne ? Object.keys(value) : [...deeper.keys()],
    cursor: 0,
    out: Object.create(null),
    parent,
    parentKey,
  };
};

/**
 * What a `"*"` alone discloses of `child` — the fallback when a deeper spec on
 * the same key contributed nothing.
 *
 * The two conditions compose rather than exclude one another: a sibling `"*"`
 * grants this key too, and the deeper spec's own projection failing must not
 * also erase the `"*"` grant that reached here independently. Without this a
 * policy author combining `"contact.*"` with `"contact.employer.name"` would
 * see `employer` vanish entirely whenever it's a scalar, rather than the whole
 * value `"*"` alone would have shown it.
 */
const starOneView = (child: unknown): unknown => (isPlainObject(child) ? {} : child);

/**
 * Projects `root` under every tail that reached it.
 *
 * A tail is what remains of one field spec's segments after consuming whatever
 * led here. A `"*"` tail grants existence at exactly one more level and no
 * further: an object-valued child reached only by `"*"` is shown present but
 * empty, its own contents one level beyond what `"*"` reaches.
 *
 * **Walks with an explicit array-backed stack, mirroring `exceedsJsonDepth`
 * (`DecodeDepthGuard.ts`) and `SinkCodec.ts`'s `isJsonSafe`, rather than
 * recursing.** This was function-call recursion, one frame per matching
 * segment, over two inputs a policy author controls: a `fields` spec, which
 * {@link parseFieldPath} splits with no length cap, and the resource it
 * descends. Both reach here from a `Policy` that ADR-QD-002 says is persisted
 * and re-parsed from untrusted JSON — and a dot-path's segment count is
 * invisible to `MAX_DECODE_DEPTH`, which bounds a policy's *structural*
 * nesting and never sees inside one long string. A crafted spec against a
 * correspondingly deep resource therefore raised a raw `RangeError` out of the
 * enforcement path itself (`Decision.ts`'s `project`, on every field-restricted
 * allow) — a crashed process rather than one decision failed closed, which is
 * the one outcome an authorization library must never produce. Every other
 * recursive walk over untrusted-derived input in this codebase had already been
 * converted for exactly this reason; this one had been missed (CCR-QD-115).
 *
 * The projection stays identical, node for node. Depth is now bounded by the
 * heap rather than the call stack, and the walk is still linear in the number
 * of nodes visited.
 */
const projectAt = (
  root: Record<string, unknown>,
  rootTails: ReadonlyArray<ReadonlyArray<string>>,
): unknown => {
  if (grantsWhole(rootTails)) return root;

  let result: unknown = OMIT;
  const stack: Array<Frame> = [makeFrame(root, rootTails, undefined, "")];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame === undefined) break;

    if (frame.cursor >= frame.keys.length) {
      stack.pop();
      const projected = Object.keys(frame.out).length === 0 ? OMIT : frame.out;
      const parent = frame.parent;
      if (parent === undefined) {
        result = projected;
      } else if (projected !== OMIT) {
        parent.out[frame.parentKey] = projected;
      } else if (parent.starOne) {
        // A frame is only ever pushed for a plain-object child, so the
        // `starOne` fallback here is always the `{}` half of `starOneView`.
        parent.out[frame.parentKey] = {};
      }
      continue;
    }

    const key = frame.keys[frame.cursor];
    frame.cursor += 1;
    // Unreachable, not decoration: `cursor` is bounded by `keys.length` above,
    // and `keys` holds no holes.
    if (key === undefined) continue;
    if (!Object.hasOwn(frame.value, key)) continue;

    const child = frame.value[key];
    const childTails = frame.deeper.get(key);
    if (childTails === undefined) {
      // `frame.starOne` is always true here, not decoration: when it's false,
      // `keys` was built from `deeper.keys()` alone, so every iterated key has
      // a `childTails` and this branch never runs.
      frame.out[key] = starOneView(child);
      continue;
    }
    if (grantsWhole(childTails)) {
      frame.out[key] = child;
      continue;
    }
    if (!isPlainObject(child)) {
      // The deeper spec expects more depth than the data has, so it discloses
      // nothing — but a sibling `"*"` that also reached this key still shows
      // the whole scalar, per {@link starOneView}.
      if (frame.starOne) frame.out[key] = starOneView(child);
      continue;
    }
    stack.push(makeFrame(child, childTails, frame, key));
  }

  return result;
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
