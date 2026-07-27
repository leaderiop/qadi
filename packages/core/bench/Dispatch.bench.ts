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
 * `resolveRef` is transcribed here **exactly** — five arms, each a one-liner, and
 * `getByPath` is the real exported one — so this is a complete comparison of that
 * dispatcher rather than an analogy. Three shapes are compared:
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
import { bench, describe } from "vitest";
import { getByPath } from "../src/Matcher.ts";
import type { ValueRef } from "../src/Matcher.ts";

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

describe("resolveRef — one dispatch", () => {
  bench("switch", () => {
    for (const ref of refs) viaSwitch(ref, context);
  }, options);

  bench("Match, hoisted", () => {
    for (const ref of refs) viaMatchHoisted(ref, context);
  }, options);

  bench("Match, per call", () => {
    for (const ref of refs) viaMatchValue(ref, context);
  }, options);
});

/**
 * The same three, at the rate a *policy tree* dispatches: `evaluateMatcher`
 * recurses, so a realistic node count multiplies whatever the per-dispatch
 * difference is. 64 keeps it representative of a non-trivial policy rather than
 * of a microbenchmark.
 */
const tree: ReadonlyArray<ValueRef> = Array.from(
  { length: 64 },
  (_, index) => refs[index % refs.length]!,
);

describe("resolveRef — 64 dispatches, one policy tree", () => {
  bench("switch", () => {
    for (const ref of tree) viaSwitch(ref, context);
  }, options);

  bench("Match, hoisted", () => {
    for (const ref of tree) viaMatchHoisted(ref, context);
  }, options);

  bench("Match, per call", () => {
    for (const ref of tree) viaMatchValue(ref, context);
  }, options);
});
