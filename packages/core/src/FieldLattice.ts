/**
 * The field-visibility lattice, and what each `FieldStrategy` means over it.
 *
 * `undefined` is the lattice's **top** — an allow that names no restriction
 * shows every field — and `[]` is an ordinary, present restriction to zero
 * fields (see {@link VisibleFields}). A composite merges its allowing
 * children's sets by its `fieldStrategy`, and this module is the one place
 * that says what each strategy means: its n-ary merge, and the algebraic laws
 * other modules lean on instead of restating — `ShortCircuit.ts` asks whether
 * the merge is decided by its first input, `Simplify.ts` whether an empty
 * nested composite is the merge's unit and whether a one-input merge is the
 * identity.
 *
 * A value outside the union — reachable only in process, since decode rejects
 * it (ADR-QD-006) — **fails closed**: it merges to `[]`, every law reads
 * `false`, and the lookup is guarded by `Object.hasOwn`, so a key
 * `Object.prototype` supplies (`"toString"`, `"__proto__"`) is outside the
 * union too.
 *
 * The meaning used to be split four ways: the operations here lived in
 * `Decision.ts`, the strategy switch in `Evaluate.ts`'s `mergeFields`, the
 * short-circuit fact in a table of `ShortCircuit.ts`'s own, and the
 * associativity argument in `Simplify.ts`. Two of those disagreed with the
 * switch about unknown strategies and empty inputs, and both disagreements
 * widened what a caller could read (CCR-QD-174, ARCH-12; ADR-QD-092).
 *
 * Deliberately out of the barrel (AGENTS.md §9): `intersectFields`,
 * `unionFields`, `mergeFields` and `VisibleFields` reach `@qadi/core` through
 * `Decision.ts`'s re-exports; `fieldStrategyLaws`/`StrategyLaws` are for this
 * package's own adapters.
 */
import * as Match from "effect/Match";
import type { Containment } from "./FieldPath.ts";
import { compareShapes, shapeOf } from "./FieldPath.ts";
import type { FieldStrategy } from "./Policy.ts";

// ---------------------------------------------------------------------------
// The lattice
// ---------------------------------------------------------------------------

/**
 * A visible-field set, or the absence of one — and the absence is not
 * "nothing visible." `undefined` is this lattice's **top**: an allow that
 * names no restriction shows every field, the same way an `AllOf` with no
 * `fields` narrowing anywhere in it grants the whole record. `[]` (an empty,
 * *present* array) is a different, ordinary value — a restriction to zero
 * fields — and the two must never be confused for one another.
 *
 * Named rather than left as an inline `ReadonlyArray<string> | undefined` at
 * every one of its call sites (D8, issue #107): the invariant lived only in
 * comments repeated at each declaration, which is exactly the kind of fact a
 * reader skips past and a future edit can drift from silently, since nothing
 * checks that a comment stays attached to its field. A named alias puts the
 * same sentence in exactly one place and lets every signature below carry it
 * by reference — `intersectFields`/`unionFields`'s own bodies are the two
 * functions this invariant is load-bearing for, and both are typed against
 * this alias rather than restating the union.
 *
 * Deliberately **not** a branded type. Branding would force every caller
 * constructing or narrowing a visible-field set — `Policy.ts`'s per-node
 * `fields?` builders, `Qadi.ts`'s `project`, every fixture across this
 * workspace's tests — through an explicit `Brand.nominal`/unwrap step for a
 * union that is otherwise completely ordinary `ReadonlyArray<string> |
 * undefined` data, for no soundness gained: nothing here needs to forbid an
 * *arbitrary* array of strings from being treated as a visible-field set the
 * way, say, `SubjectId` forbids an arbitrary string from being treated as an
 * identity. The alias is scoped to this module's lattice functions and
 * the two record types whose fields flow through them (`Trace.visibleFields`,
 * `Allow.visibleFields`) — the same "field-visibility merge logic" this item
 * was scoped to — rather than swept through `Policy.ts`'s builder options,
 * `Explanation.ts`, `TraceDiff.ts`, `@qadi/react`'s `Hydration.ts` and
 * `@qadi/devtools`'s `Inspect.ts`, which describe the identical shape for a
 * related but distinct purpose (a policy-authoring input, an explanation
 * rendering, a diff, a wire payload, a devtools projection) in five other
 * files; widening the alias's reach that far is a larger, cross-package
 * rename this "softest item" of the sweep was explicitly scoped to avoid
 * forcing.
 */
export type VisibleFields = ReadonlyArray<string> | undefined;

/**
 * Which side a `Containment` result keeps, or neither.
 *
 * Built once at module scope rather than per pair: `intersectFields`'s loop
 * below runs this up to `|a|·|b|` times for a single node, and every one of
 * those pairs used to rebuild `Match.value(cmp)` — arms and all — from
 * scratch (AGENTS.md §5a favors a hoisted `Match.type` on exactly this kind
 * of per-node-or-hotter dispatch). `Match.exhaustive` still makes a future
 * `Containment` member a compile error here, same as before.
 *
 * `"Equal"` is its own answer, `"Either"`, rather than folded into `"B"`: two
 * specs that denote the same set (`"title"` and `"title.**"`) are both correct
 * to keep, and keeping the right-hand operand's text made which one survived
 * depend on argument position (ARCH-12 C5). `intersectFields` breaks the tie
 * by text instead.
 */
type ContainmentKeep = "A" | "B" | "Either" | undefined;
const CONTAINMENT_KEEP: (self: Containment) => ContainmentKeep = Match.type<
  Containment
>().pipe(
  Match.when("Equal", () => "Either" as const),
  Match.when("BLessA", () => "B" as const),
  Match.when("ALessB", () => "A" as const),
  Match.when("Incomparable", () => undefined),
  Match.exhaustive,
);

/**
 * Intersects two visible-field sets.
 *
 * `undefined` means "all fields" — the top of the lattice — so intersecting it
 * with any set yields that set.
 *
 * Pairwise via `compareFieldPaths` rather than an exact-string-set filter: a
 * field spec may be a dot-path with a `*`/`**` wildcard, and `"address.**"`
 * must intersect with `"address.street"` to `"address.street"`, not to `[]`
 * — an exact-string filter would silently deny something a caller's own
 * narrower spec already grants. Every pair with no subsumption relationship
 * contributes nothing (`Incomparable`), which is the conservative, fails-
 * closed direction.
 *
 * `shapeOf` runs once per spec, not once per pair. The comparison itself is
 * O(|a|·|b|), and `compareFieldPaths` computes both operands' `shapeOf` —
 * `split(".")` plus two array allocations — on every call; over the same
 * array pairwise-compared |b| (or |a|) times, that recomputed an identical
 * shape from scratch every time. `compareShapes` takes the already-computed
 * shape instead, so each spec's `shapeOf` is paid for exactly once here,
 * however many pairs it is compared across.
 *
 * The result is sorted before returning: `kept`'s insertion order otherwise
 * depends on which operand happens to be walked as the outer loop, so
 * `intersectFields([a,b],[c])` and `intersectFields([c],[a,b])` were equal as
 * sets but could differ as arrays — and that array becomes
 * `Allow.visibleFields`, which flows into `DecisionRecord` and the audit sink
 * wire path.
 *
 * Sorting alone did not make the output independent of operand order. Two
 * specs with the same shape (`"title"` and `"title.**"`, INV-QD-004) compare
 * `"Equal"`, and the right-hand one's text used to be kept, so swapping the
 * operands swapped the representative (ARCH-12 C5, CCR-QD-174). On `"Equal"`
 * the lexicographically smaller text is kept now, which makes the result
 * byte-for-byte commutative, and an n-ary fold byte-for-byte independent of
 * input order. The claim is exactly that — independent of order — and not
 * "canonical": when one side is `undefined` the other is returned as authored,
 * unsorted, and two policies naming one set with different text still produce
 * different bytes.
 */
export const intersectFields = (a: VisibleFields, b: VisibleFields): VisibleFields => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  // Paired with its own shape rather than parallel arrays walked by index:
  // `noUncheckedIndexedAccess` would otherwise type every lookup as possibly
  // `undefined`, for an invariant (same length, same order) a pairing already
  // guarantees outright.
  const shapedA = a.map((spec) => ({ spec, shape: shapeOf(spec) }));
  const shapedB = b.map((spec) => ({ spec, shape: shapeOf(spec) }));
  const kept: Array<string> = [];
  for (const specA of shapedA) {
    for (const specB of shapedB) {
      const cmp = compareShapes(specA.shape, specB.shape);
      // Hoisted to a module-scope table (`CONTAINMENT_KEEP`, AGENTS.md §5a:
      // `Match.type` builds its matcher once; `Match.value` rebuilds it per
      // call, which this O(|a|·|b|) loop calls up to |a|·|b| times per node).
      // `Incomparable` contributes nothing — the conservative, fails-closed
      // direction the doc comment above describes.
      const keep = CONTAINMENT_KEEP(cmp);
      if (keep === "B") kept.push(specB.spec);
      else if (keep === "A") kept.push(specA.spec);
      else if (keep === "Either") kept.push(specA.spec < specB.spec ? specA.spec : specB.spec);
    }
  }
  return [...new Set(kept)].sort();
};

/**
 * Unions two visible-field sets, preserving "all fields" as absorbing.
 *
 * No path-aware algorithm change needed here, unlike `intersectFields`:
 * applying every spec in both sides and unioning the results is correct
 * regardless of overlap — a redundant, subsumed entry (e.g. `"address.street"`
 * alongside `"address.**"`) projects identically to omitting it, so exact-set
 * union stays correct even though the strings themselves may now be paths.
 *
 * `mergeFields`'s `Union` row (below) does not fold through this pairwise —
 * it accumulates every child's set into one `Set` in a single pass, which is
 * why a repo-wide grep finds no production caller left for this export. It stays exported anyway, as `intersectFields`'s two-operand
 * counterpart on the public surface (`spec/overview.md`): a caller merging
 * exactly two field sets outside the evaluator — composing two independently
 * computed decisions' visibility, say — reaches for the same combinator
 * `intersectFields` already models, not a hand-rolled `Set` union. Deleting it
 * would be a breaking change to a documented export for a combinator that is
 * still correct and still cheap at this arity; the pattern this doc comment
 * used to warn readers about was folding it pairwise across N sets, which
 * nothing in this codebase does any more.
 *
 * Sorted before returning, for the reason `intersectFields` is: insertion
 * order would otherwise depend on which operand is walked first, and that
 * order reaches `Allow.visibleFields` on the wire.
 */
export const unionFields = (a: VisibleFields, b: VisibleFields): VisibleFields => {
  if (a === undefined || b === undefined) return undefined;
  return [...new Set([...a, ...b])].sort();
};

// ---------------------------------------------------------------------------
// What each strategy means
// ---------------------------------------------------------------------------

/**
 * What a field strategy means, as data its consumers read rather than restate.
 *
 * One closed record per strategy: the merge, and the three algebraic facts
 * other modules used to argue for in their own words. A fourth strategy is a
 * missing row in {@link fieldStrategyLaws}'s table — a compile error (TS2741),
 * not a forgotten arm somewhere else.
 */
export interface StrategyLaws {
  /** Merges allowing children's field sets, in declaration order (ADR-QD-026). */
  readonly merge: (sets: ReadonlyArray<VisibleFields>) => VisibleFields;
  /**
   * The merge depends on the first input alone, so an `anyOf` may stop at its
   * first allowing child (ADR-QD-013). `ShortCircuit.ts`'s `anyOfStopsAtAllow`
   * reads it.
   */
  readonly decidedByFirst: boolean;
  /**
   * `merge([])` — top, what an empty `allOf` grants — is the merge's unit, so
   * an empty nested composite of the same strategy may be absorbed into its
   * parent (`Simplify.ts`). Only `Intersection`: top *absorbs* a union, and
   * `First` has no unit at all.
   */
  readonly emptyIsUnit: boolean;
  /**
   * `merge([x])` discloses exactly `x`, so a one-child composite may be
   * replaced by its child (`Simplify.ts`). Disclosure, not bytes: `Union`
   * sorts its one input.
   */
  readonly singletonIsIdentity: boolean;
}

const mergeIntersection = (sets: ReadonlyArray<VisibleFields>): VisibleFields =>
  sets.reduce<VisibleFields>((acc, cur) => intersectFields(acc, cur), undefined);

/**
 * `Union`'s n-ary merge. Absorbing on `undefined`: if any allowing branch
 * grants all fields, the union grants all fields, since `undefined` is the top
 * of the lattice, not the empty set.
 *
 * Not `sets.reduce(unionFields)`: each pairwise step spread both sides into a
 * fresh array, wrapped that in a fresh `Set`, and spread the `Set` back out,
 * four allocations per iteration to rebuild everything accumulated so far from
 * scratch. Accumulating into one `Set` across a single pass and materializing
 * the result array exactly once avoids all of that; `FieldLattice.test.ts`
 * pins that it equals the pairwise fold byte for byte.
 *
 * Sorted for the reason `intersectFields`/`unionFields` are: `merged`'s
 * iteration order depends on which set contributed a field first, so the same
 * allowing children in a different order would otherwise produce different
 * `Allow.visibleFields` bytes.
 */
const mergeUnion = (sets: ReadonlyArray<VisibleFields>): VisibleFields => {
  if (sets.length === 0) return undefined;
  const merged = new Set<string>();
  for (const set of sets) {
    if (set === undefined) return undefined;
    for (const field of set) merged.add(field);
  }
  return [...merged].sort();
};

/** `First`'s merge: the first allowing child's set, verbatim and by reference. */
const mergeFirst = (sets: ReadonlyArray<VisibleFields>): VisibleFields =>
  sets.length === 0 ? undefined : sets[0];

/**
 * One row per strategy. Keyed by the closed `FieldStrategy` union, so a fourth
 * strategy cannot compile without its whole meaning written here.
 *
 * The booleans are evaluated at module load, so Stryker does not mutate them
 * (ADR-QD-076); `FieldLattice.test.ts` asserts every row's flags exactly, and
 * the law properties check each flag against the merge it describes.
 */
const LAWS: Readonly<Record<FieldStrategy, StrategyLaws>> = {
  Intersection: {
    merge: mergeIntersection,
    decidedByFirst: false,
    emptyIsUnit: true,
    singletonIsIdentity: true,
  },
  Union: {
    merge: mergeUnion,
    decidedByFirst: false,
    emptyIsUnit: false,
    singletonIsIdentity: true,
  },
  First: {
    merge: mergeFirst,
    decidedByFirst: true,
    emptyIsUnit: false,
    singletonIsIdentity: true,
  },
};

/**
 * The meaning of a strategy outside the union: no fields, and no law holds.
 *
 * Reachable only in process — decode rejects the value (ADR-QD-006) — and
 * load-bearing anyway, because this lattice has failed in the widening
 * direction before (ADR-QD-034, CM-07). `undefined` is the lattice's top, so
 * an unknown strategy answering it would show every field; `[]`, a present
 * but empty restriction, grants none, the one direction a field-strategy bug
 * must never fail in. Every law flag is `false`, so no consumer stops an
 * `anyOf` early, absorbs an empty child or unwraps a single one on its
 * account (ARCH-12 C3, C4).
 */
const FAIL_CLOSED: StrategyLaws = {
  merge: () => [],
  decidedByFirst: false,
  emptyIsUnit: false,
  singletonIsIdentity: false,
};

/**
 * Whether `value` is one of the closed union's strategies — a row of this
 * module's law table.
 *
 * `Object.hasOwn`, not `value in LAWS` or a bare `LAWS[value]`: a key
 * `Object.prototype` supplies (`"toString"`, `"constructor"`, `"__proto__"`)
 * would otherwise read an inherited member — truthy, and not a row — which is
 * how an `anyOf` once stopped at its first allow on a corrupt strategy and
 * granted every field (CCR-QD-174, ARCH-12 C3). A value that is not a string at
 * all (an untyped caller's `42` or `null`) is outside the union too.
 *
 * The one membership test for a strategy: {@link fieldStrategyLaws} reads it to
 * pick a row, and `Explanation.ts` reads it to say in words that a value is
 * outside the union rather than throw on it (ADR-QD-092 amendment, CCR-QD-183).
 */
export const isFieldStrategy = (value: unknown): value is FieldStrategy =>
  typeof value === "string" && Object.hasOwn(LAWS, value);

/**
 * What `strategy` means: its row, or {@link FAIL_CLOSED} for a value outside
 * the union, as {@link isFieldStrategy} judges it.
 */
export const fieldStrategyLaws = (strategy: FieldStrategy): StrategyLaws =>
  isFieldStrategy(strategy) ? LAWS[strategy] : FAIL_CLOSED;

/**
 * Merges a composite's allowing children's field sets by its `fieldStrategy`.
 *
 * The contract: it never grants a field no input granted; merging no inputs is
 * `undefined` (top) under the three known strategies; and a strategy outside
 * the union grants `[]`. Under `Intersection` and `Union` the result is
 * independent of input order, byte for byte; `First` is order-sensitive by
 * definition.
 *
 * Public for the reason ADR-QD-029 gives for `join`/`meet`: a caller composing
 * several decisions' visibility by strategy, made to reimplement this, will get
 * it wrong.
 */
export const mergeFields = (
  strategy: FieldStrategy,
  sets: ReadonlyArray<VisibleFields>,
): VisibleFields => fieldStrategyLaws(strategy).merge(sets);
