/**
 * The measurement AGENTS.md §5a defers to.
 *
 * §5a bans dispatching on a `_tag` with `switch` and grants four exceptions, on
 * the grounds that they run once per policy node per evaluation and their
 * handlers close over per-call state — so the `Match.type<T>()` matcher cannot be
 * built once at module scope, which is the form §5a prefers. The exception has
 * always been recorded as "converting them needs a benchmark first", and until
 * now no benchmark existed. So the cost was unmeasured and the exception rested
 * on an argument rather than a number.
 *
 * `resolveRef` is transcribed here **exactly** — five real arms, each a
 * one-liner, and `getByPath` is the real exported one. Production's `resolveRef`
 * additionally carries a sixth `default` arm assigning the scrutinee to `never`
 * (CCR-QD-040/ADR-QD-034's exhaustiveness guard, §5a) — free at runtime and
 * omitted here because it contributes nothing to measure, not because this
 * comparison forgot it. Three shapes are compared:
 *
 *   switch          what the code does today
 *   Match, hoisted  the matcher built once, returning a closure over the context
 *   Match, per call `Match.value(...)` rebuilt on every dispatch
 *
 * The hoisted form is the interesting one and the reason this file exists. A
 * matcher built at module scope cannot see the per-call context, so each arm has
 * to return a function that takes it — trading a `switch` for a matcher lookup
 * *plus* a closure allocation and a second call. That is the trade §5a asserts is
 * a bad one, and it is measurable.
 *
 * Read this together with `Evaluate.bench.ts`, which measures what share of a
 * whole evaluation dispatch even accounts for. A ratio here is only worth acting
 * on in proportion to that share.
 */
import * as Match from "effect/Match";
import { test } from "vitest";
import { intersectFields } from "../src/Decision.ts";
import type { VisibleFields } from "../src/Decision.ts";
import { getByPath } from "../src/Matcher.ts";
import type { ValueRef } from "../src/Matcher.ts";
import type { FieldStrategy } from "../src/Policy.ts";

interface Context {
  readonly subject: Readonly<Record<string, unknown>>;
  readonly subjectId: string;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  readonly action: string | undefined;
}

// --- the three implementations ---------------------------------------------

/** Exactly what `Matcher.ts` does today. */
const viaSwitch = (ref: ValueRef, context: Context): unknown => {
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
  }
};

/**
 * The form §5a prefers, built once. Each arm returns a function of the context,
 * because the matcher is built before any context exists.
 */
const hoisted: (ref: ValueRef) => (context: Context) => unknown = Match.type<ValueRef>().pipe(
  Match.tagsExhaustive({
    SubjectRef: (ref) => (context: Context) => getByPath(context.subject, ref.path),
    SubjectIdRef: () => (context: Context) => context.subjectId,
    ResourceRef: (ref) => (context: Context) => getByPath(context.resource, ref.path),
    ActionRef: () => (context: Context) => context.action,
    LiteralRef: (ref) => () => ref.value,
  }),
);

const viaMatchHoisted = (ref: ValueRef, context: Context): unknown => hoisted(ref)(context);

/** `Match.value`, which rebuilds the matcher on every call but closes over the context directly. */
const viaMatchValue = (ref: ValueRef, context: Context): unknown =>
  Match.value(ref).pipe(
    Match.tagsExhaustive({
      SubjectRef: (r) => getByPath(context.subject, r.path),
      SubjectIdRef: () => context.subjectId,
      ResourceRef: (r) => getByPath(context.resource, r.path),
      ActionRef: () => context.action,
      LiteralRef: (r) => r.value,
    }),
  );

// --- inputs ----------------------------------------------------------------

const context: Context = {
  subject: { id: "u1", department: "cardiology", clearance: { level: 3 } },
  subjectId: "u1",
  resource: { ownerId: "u1", department: "cardiology" },
  action: "read",
};

/**
 * Every arm, in a fixed rotation. One `_tag` repeated would let the JIT
 * monomorphise the switch into a single comparison and flatter it against a
 * matcher lookup that stays polymorphic — the opposite of the real workload,
 * where a policy tree mixes refs.
 */
const refs: ReadonlyArray<ValueRef> = [
  { _tag: "SubjectRef", path: "department" },
  { _tag: "SubjectIdRef" },
  { _tag: "ResourceRef", path: "ownerId" },
  { _tag: "ActionRef" },
  { _tag: "LiteralRef", value: "cardiology" },
  { _tag: "SubjectRef", path: "clearance.level" },
];

const options = { time: 1000, warmupTime: 300 };

test("resolveRef — one dispatch", async ({ bench }) => {
  await bench.compare(
    bench("switch", () => {
      for (const ref of refs) viaSwitch(ref, context);
    }),
    bench("Match, hoisted", () => {
      for (const ref of refs) viaMatchHoisted(ref, context);
    }),
    bench("Match, per call", () => {
      for (const ref of refs) viaMatchValue(ref, context);
    }),
    options,
  );
});

/**
 * The same three, at the rate a *policy tree* dispatches: `evaluateMatcher`
 * recurses, so a realistic node count multiplies whatever the per-dispatch
 * difference is. 64 keeps it representative of a non-trivial policy rather than
 * of a microbenchmark.
 */
const treeSize = 64;
// `refs` cycled and truncated to `treeSize`, rather than indexed by
// `index % refs.length` — the same rotation, without a lookup
// `noUncheckedIndexedAccess` would otherwise type as possibly `undefined` for
// an invariant (the modulus never exceeds `refs.length`) the loop already
// guarantees outright.
const tree: ReadonlyArray<ValueRef> = Array.from(
  { length: Math.ceil(treeSize / refs.length) },
  () => refs,
)
  .flat()
  .slice(0, treeSize);

test("resolveRef — 64 dispatches, one policy tree", async ({ bench }) => {
  await bench.compare(
    bench("switch", () => {
      for (const ref of tree) viaSwitch(ref, context);
    }),
    bench("Match, hoisted", () => {
      for (const ref of tree) viaMatchHoisted(ref, context);
    }),
    bench("Match, per call", () => {
      for (const ref of tree) viaMatchValue(ref, context);
    }),
    options,
  );
});

// ---------------------------------------------------------------------------
// `mergeFields` — the fourth budgeted switch, on the `FieldStrategy` literal
// union, measured for ARCH-12's D-12-b: whether replacing it with an
// own-property law table (`Object.hasOwn` + a property load + an indirect call)
// costs anything at the dispatch site. The plan's rule: take the table if it is
// within 1.2× of the switch per dispatch and `Evaluate.bench.ts`'s two
// field-heavy means stay within run-to-run noise (≤ 10%).
//
// Every arm does the real merge work (`intersectFields`, a single-`Set` union,
// `First`'s pass-through), so the comparison is dispatch in proportion to the
// merge it selects, not dispatch alone. `intersectFields` is bound locally: a
// cross-module call pays a module-runner getter per call under vitest bench,
// which is not production cost and would be paid identically by all three.
// ---------------------------------------------------------------------------

type FieldSets = ReadonlyArray<VisibleFields>;

const intersect = intersectFields;

const mergeIntersection = (sets: FieldSets): VisibleFields =>
  sets.reduce<VisibleFields>((acc, cur) => intersect(acc, cur), undefined);

const mergeUnion = (sets: FieldSets): VisibleFields => {
  if (sets.length === 0) return undefined;
  const merged = new Set<string>();
  for (const set of sets) {
    if (set === undefined) return undefined;
    for (const field of set) merged.add(field);
  }
  return [...merged].sort();
};

const mergeFirst = (sets: FieldSets): VisibleFields => (sets.length === 0 ? undefined : sets[0]);

/** Transcribed from `Evaluate.ts`'s `mergeFields`, `default` arm included. */
const mergeViaSwitch = (strategy: FieldStrategy, sets: FieldSets): VisibleFields => {
  switch (strategy) {
    case "Intersection":
      return mergeIntersection(sets);
    case "Union":
      return mergeUnion(sets);
    case "First":
      return mergeFirst(sets);
    default: {
      const exhaustive: never = strategy;
      void exhaustive;
      return [];
    }
  }
};

interface Row {
  readonly merge: (sets: FieldSets) => VisibleFields;
  readonly decidedByFirst: boolean;
}
const LAWS: Readonly<Record<FieldStrategy, Row>> = {
  Intersection: { merge: mergeIntersection, decidedByFirst: false },
  Union: { merge: mergeUnion, decidedByFirst: false },
  First: { merge: mergeFirst, decidedByFirst: true },
};
const FAIL_CLOSED: Row = { merge: () => [], decidedByFirst: false };

/** The D-12-b(b) shape: one own-property law table, read through `Object.hasOwn`. */
const mergeViaTable = (strategy: FieldStrategy, sets: FieldSets): VisibleFields =>
  (Object.hasOwn(LAWS, strategy) ? LAWS[strategy] : FAIL_CLOSED).merge(sets);

/** `Match.value` rebuilt per call — the form a naive §5a conversion produces. */
const mergeViaMatchValue = (strategy: FieldStrategy, sets: FieldSets): VisibleFields =>
  Match.value(strategy).pipe(
    Match.when("Intersection", () => mergeIntersection(sets)),
    Match.when("Union", () => mergeUnion(sets)),
    Match.when("First", () => mergeFirst(sets)),
    Match.orElse((): VisibleFields => []),
  );

/** A small, realistic allowing-children input: three overlapping restrictions. */
const fieldSets: FieldSets = [
  ["id", "title", "shared.a"],
  ["id", "body", "shared.**"],
  ["id", "shared.a", "author"],
];

/** Every strategy, in a fixed rotation, for the reason `refs` rotates arms above. */
const strategies: ReadonlyArray<FieldStrategy> = ["Intersection", "Union", "First"];

test("mergeFields — one dispatch", async ({ bench }) => {
  await bench.compare(
    bench("switch", () => {
      for (const strategy of strategies) mergeViaSwitch(strategy, fieldSets);
    }),
    bench("own-property table", () => {
      for (const strategy of strategies) mergeViaTable(strategy, fieldSets);
    }),
    bench("Match, per call", () => {
      for (const strategy of strategies) mergeViaMatchValue(strategy, fieldSets);
    }),
    options,
  );
});
