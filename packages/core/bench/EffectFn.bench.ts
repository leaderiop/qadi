/**
 * `Effect.fn` vs `Effect.fnUntraced`, measured — the question AGENTS.md §5a's
 * benchmarking discipline (ADR-QD-034) has never been extended to.
 *
 * `Effect.fnUntraced` is used **zero** times in this codebase. Every effectful
 * function in `packages/core/src` is `Effect.fn(function* …)` per AGENTS.md §5,
 * named so it also gets a span. Reading `effect@4.0.0-rc.112`'s
 * `internal/effect.ts` directly (not trusting a description of it) shows what a
 * *named* `Effect.fn(name)(...)` call adds around the plain generator that
 * `Effect.fnUntraced` also wraps:
 *
 *   - `fn`'s outer call (once per `Effect.fn(name)(...)` **definition**, not
 *     per invocation) captures `defError = new globalThis.Error()` at
 *     `internal/effect.ts:1233`, with `Error.stackTraceLimit` temporarily
 *     dropped to 2.
 *   - Every **call** through the returned function (`internal/effect.ts:1263`)
 *     does three things `fnUntraced`'s call path does not:
 *     1. A second `new globalThis.Error()` (`callError`, line 1276) — same
 *        stack-trace-limit dance, on every call this time, not once.
 *     2. `useSpan` (line 1280 → `internal/effect.ts:5893`), which resolves the
 *        current fiber, reads `TracerEnabled`/`Tracer.Tracer`/`ClockRef`/
 *        `TracerTimingEnabled`/`TracerSpanAnnotations` off it, and allocates a
 *        span object either way (`makeSpanUnsafe`, line 5725) — a real
 *        `tracer.span(...)` when propagation is enabled, a `noopSpan(...)`
 *        when it is not. `TracerEnabled` defaults to `true`
 *        (`internal/effect.ts:94`'s import, backing `withTracerEnabled` at
 *        line 5677) and nothing in this codebase disables it, so evaluation
 *        always takes the real-span branch.
 *     3. `updateService(CurrentStackFrame, ...)` (line 1278), allocating a
 *        frame record — `{ name, stack, parent: { name, stack, parent: prev } }`
 *        — on every call, chained onto whatever frame the caller already had.
 *
 *   `Effect.fnUntraced` (`internal/effect.ts:1199`) does none of this: a call
 *   is `suspend(() => fromIteratorUnsafe(body.apply(this, arguments)))` and
 *   nothing else.
 *
 * The composite/`allOf`/`anyOf`/`rules` evaluation spans this ticket exists to
 * measure are exactly the shape above: `evaluateAllOf`, `evaluateAnyOf`,
 * `evaluateRules` and `evaluate` itself (`Evaluate.ts`) are each a *named*
 * `Effect.fn`, so each one pays the per-call cost on every policy node that
 * reaches it. `evaluateNode` is deliberately a plain `switch`, not wrapped at
 * all (§5a) — the wrapping happens once per *combinator* node, not once per
 * leaf, which is why the two workloads below differ by exactly one wrapped
 * call rather than by the leaf count.
 *
 * ## What this file does not do
 *
 * It does not modify `Evaluate.ts`. Ticket #101 (this file) is measurement
 * only; adopting `fnUntraced` anywhere is ticket #102's decision, blocked on
 * these numbers existing. Two things are measured instead, both without
 * touching production code:
 *
 * 1. **Isolated per-call overhead** — the same trivial generator body, wrapped
 *    once with `Effect.fn("qadi.bench.identity")` and once with
 *    `Effect.fnUntraced`, run through `Effect.runSync`. This isolates the
 *    wrapper machinery exactly as `Dispatch.bench.ts` isolates the dispatch
 *    mechanism: the body does the same (trivial) work either way, so the
 *    difference is what the wrapper adds around it.
 *
 * 2. **A shadow evaluator** standing in for `Evaluate.ts`'s combinator-wrapping
 *    shape, without its business logic. It reuses `Evaluate.ts`'s own
 *    `Effect.fn("qadi.allOf")`/`Effect.fnUntraced` call pattern — one wrapped
 *    call per `AllOf`-shaped node, recursing into children exactly as
 *    `evaluateAllOf`/`evaluateNode` do — over node trees shaped like
 *    `Evaluate.bench.ts`'s own `one` (a bare leaf), `wide`/`matchers` (one
 *    `AllOf` of several leaves) and `deep` (ten nested combinator levels).
 *    What is *not* reproduced is `evaluateAllOf`'s fold/short-circuit logic,
 *    `evaluateMatcher`'s dispatch, or any attribute/relationship/signature
 *    resolution — none of that touches the tracing question this file
 *    answers, and reimplementing it would just be a second, unmeasured copy
 *    of `Evaluate.ts` to keep in sync. This is why the result below is
 *    reported as an **end-to-end effect on this call shape**, not as "the
 *    percentage adopting `fnUntraced` would save" — a real evaluation also
 *    spends time in matcher dispatch, attribute lookups and fold logic that
 *    this file does not touch and that dilutes the same absolute overhead
 *    further.
 *
 * ## Results (2026-09-09, `pnpm bench`, this file and `Evaluate.bench.ts`, each
 * run 3×)
 *
 * Ranges, not figures — `Dispatch.bench.ts`'s own doc comment explains why:
 * absolute throughput on a development machine moves by roughly 30% between
 * runs, so only the direction and order of magnitude transfer.
 *
 * **1. Per-call overhead, isolated** (`identityTraced`/`identityUntraced`, one
 * call per iteration): `Effect.fn` costs **≈3.05–3.2 µs/call**;
 * `Effect.fnUntraced` costs **≈0.28–0.36 µs/call**. The difference —
 * **≈2.7–2.9 µs/call** — is what the audit predicted qualitatively (an
 * `Error()` capture, a span, a frame record, all per call) and is now a
 * number: two `new Error()` captures, one real or noop span allocation
 * through `makeSpanUnsafe`, and one `CurrentStackFrame` frame-record
 * allocation, every single named `Effect.fn` call. As a ratio that is
 * **≈8.6–11.5× slower**, wider than `switch`-vs-`Match`'s 1.6–7.7× because the
 * `fnUntraced` baseline here is itself under half a microsecond — a small
 * denominator makes the ratio move a lot for the same absolute noise, which
 * is why the µs figures above are the ones to anchor on, not the ratio.
 * The 11-calls-per-iteration variant of the same isolated bench (below,
 * matching the call count `nested(10)` drives) reproduces the identical
 * per-call cost linearly: ≈2.78–2.89 µs/call either way it is counted.
 *
 * **2. Shadow evaluator, per shape** (this file's own end-to-end numbers —
 * `Effect.fn` vs `Effect.fnUntraced` on the *same* trivial recursion, only the
 * wrapper differs):
 *
 * | Shape                                       | Wrapped calls | `Effect.fn` mean | `Effect.fnUntraced` mean | slower by |
 * | -------------------------------------------- | -------------- | ----------------- | -------------------------- | --------- |
 * | `simple` (mirrors `one node`)                 | 1              | ≈3.15–3.16 µs      | ≈0.34–0.36 µs               | ≈8.8–9.3×  |
 * | `flat(4)` (mirrors `matcher-heavy — 3 refs`)  | 2              | ≈6.14–6.19 µs      | ≈0.65–0.67 µs               | ≈9.2–9.5×  |
 * | `flat(8)` (mirrors `wide — allOf of 8`)       | 2              | ≈6.36–6.76 µs      | ≈0.85–0.85 µs               | ≈7.5–7.9×  |
 * | `nested(10)` (mirrors `deep — 10 levels`)     | 11             | ≈33.95–34.98 µs    | ≈2.33–2.45 µs               | ≈14.3–14.6× |
 *
 * The absolute gap scales almost exactly linearly with wrapped-call count —
 * ≈2.8 µs for 1 call, ≈5.5 µs for 2, ≈31.6–32.5 µs for 11 — which is the same
 * ≈2.7–2.9 µs/call measured in isolation above, confirming the two benchmarks
 * agree with each other.
 *
 * **3. End-to-end effect on a real evaluation, estimated.** This file's shadow
 * evaluator has no matcher dispatch, attribute lookup, or fold logic — the
 * cost `Evaluate.bench.ts` actually measures for `one node`
 * (≈8.6–9.0 µs), `matcher-heavy — 3 refs` (≈16.5–17.9 µs), `wide — allOf of 8`
 * (≈14.1–15.2 µs) and `deep — 10 levels` (≈50.1–54.6 µs), all measured the same
 * day. Dividing the isolated per-call overhead (≈2.7–2.9 µs) times each
 * shape's wrapped-call count by that real end-to-end time — the same
 * two-step method ADR-QD-034 used (isolated cost × call count ÷ real
 * evaluation time) — gives the estimated share of a real evaluation spent in
 * `Effect.fn`'s tracing machinery:
 *
 * | Real workload            | Wrapped `Effect.fn` calls | Estimated tracing share |
 * | ------------------------- | -------------------------- | -------------------------- |
 * | `one node`                 | 1 (`evaluate`)              | **≈30–35%**                 |
 * | `matcher-heavy — 3 refs`   | 2 (`evaluate` + `allOf`)    | **≈30–36%**                 |
 * | `wide — allOf of 8`        | 2 (`evaluate` + `allOf`)    | **≈36–43%**                 |
 * | `deep — 10 levels`         | 11 (`evaluate` + 10 combinators) | **≈54–66%**            |
 *
 * This is a materially larger effect than ADR-QD-034 found for `switch` vs
 * `Match` (2–4% / under 1%), and the reason is arithmetic, not a different
 * kind of cost: every evaluation in this library already pays for at least
 * one named `Effect.fn` call (the outer `evaluate` itself), that call alone
 * costs ≈2.7–2.9 µs, and the fastest real evaluation this library performs is
 * itself only ≈8.6–9.0 µs — so a fixed per-call cost that would be
 * negligible against a slower operation is close to a third of the total
 * here. This is an **estimate**, not a direct A/B of `Evaluate.ts` (ticket
 * #101 does not modify it — see above), and like ADR-QD-034's own figures it
 * should be read as a snapshot of one machine on one day, not a continuously
 * verified property; a change to `Evaluate.ts`'s combinator count, matcher
 * cost, or Effect's own span implementation would move the denominator
 * without this file being re-run.
 */
import * as Effect from "effect/Effect";
import { bench, describe } from "vitest";

const options = { time: 1000, warmupTime: 300 };

// --- 1. isolated per-call overhead ------------------------------------------

/**
 * Same trivial body wrapped both ways, so the only difference between the two
 * benches below is what each wrapper adds around an identical generator.
 */
const identityTraced = Effect.fn("qadi.bench.identity")(function* (n: number) {
  return n;
});

const identityUntraced = Effect.fnUntraced(function* (n: number) {
  return n;
});

describe("Effect.fn vs Effect.fnUntraced — one call", () => {
  bench("Effect.fn", () => {
    Effect.runSync(identityTraced(1));
  }, options);

  bench("Effect.fnUntraced", () => {
    Effect.runSync(identityUntraced(1));
  }, options);
});

/**
 * 11 calls per iteration — the same count `nested(10)` below drives through
 * the shadow evaluator (10 combinator wraps plus the outer `evaluate`-shaped
 * one), so this and the shadow-evaluator "nested" bench can be read side by
 * side: this isolates the wrapper alone at that call count, that one adds the
 * (trivial) recursion and leaf work around it.
 */
const callCount = 11;

describe(`Effect.fn vs Effect.fnUntraced — ${callCount} calls`, () => {
  bench("Effect.fn", () => {
    for (let i = 0; i < callCount; i++) Effect.runSync(identityTraced(i));
  }, options);

  bench("Effect.fnUntraced", () => {
    for (let i = 0; i < callCount; i++) Effect.runSync(identityUntraced(i));
  }, options);
});

// --- 2. shadow evaluator: Evaluate.ts's wrapping shape, without its logic ---

/**
 * A node tree with exactly two shapes, mirroring the two `Evaluate.ts` cares
 * about for this question: a leaf (nothing wrapped — `evaluateNode`'s
 * `HasPermission` arm returns `Effect.succeed` directly, un-spanned) and an
 * `allOf`-shaped combinator (wrapped in a named `Effect.fn`/`Effect.fnUntraced`
 * on every evaluation, recursing into its children exactly as
 * `evaluateAllOf`/`evaluateNode` do).
 */
interface Node {
  readonly kind: "leaf" | "allOf";
  readonly children?: ReadonlyArray<Node>;
}

const leaf: Node = { kind: "leaf" };

/** Mirrors `Evaluate.bench.ts`'s `one` — a bare `hasPermission`, no combinator. */
const simple: Node = leaf;

/**
 * Mirrors `wide`/`matchers` — a single `AllOf` node over several leaves. Both
 * of those real workloads wrap exactly **one** combinator call regardless of
 * child count, because `Effect.fn`/`Effect.fnUntraced` wrap the whole
 * `evaluateAllOf` function, not a per-child step — reproduced here the same
 * way.
 */
const flat = (width: number): Node => ({
  kind: "allOf",
  children: Array.from({ length: width }, () => leaf),
});

/**
 * Mirrors `deep` — ten nested combinator levels, so ten wrapped calls plus the
 * outer one. Production alternates `AllOf`/`AnyOf` tags at each level; that
 * distinction is invisible to this question (both are named `Effect.fn` calls
 * of the same shape), so `nested` stays uniformly `allOf`-tagged rather than
 * reproducing a second, `anyOf`-only wrapper that would measure nothing new.
 */
const nested = (depth: number): Node =>
  Array.from({ length: depth }).reduce<Node>(
    (inner) => ({ kind: "allOf", children: [inner, leaf] }),
    leaf,
  );

// Two module-scope, mutually-recursive pairs — one traced, one not — each
// matching `evaluateNode`'s shape exactly: a leaf answers with `Effect.succeed`
// directly and un-spanned; an `allOf` node recurses through a named
// `Effect.fn`/`Effect.fnUntraced` wrapper, one call per node regardless of its
// child count.

const evaluateNodeTraced = (node: Node): Effect.Effect<boolean> =>
  node.kind === "leaf" ? Effect.succeed(true) : evaluateAllOfTraced(node);

const evaluateAllOfTraced = Effect.fn("qadi.bench.allOf")(function* (node: Node) {
  for (const child of node.children ?? []) yield* evaluateNodeTraced(child);
  return true;
});

const evaluateNodeUntraced = (node: Node): Effect.Effect<boolean> =>
  node.kind === "leaf" ? Effect.succeed(true) : evaluateAllOfUntraced(node);

const evaluateAllOfUntraced = Effect.fnUntraced(function* (node: Node) {
  for (const child of node.children ?? []) yield* evaluateNodeUntraced(child);
  return true;
});

/**
 * The outer wrap, mirroring `evaluate = Effect.fn("qadi.evaluate")(...)` —
 * every evaluation, even a bare leaf, pays this one regardless of what
 * `evaluateNode` dispatches to.
 */
const runTraced = Effect.fn("qadi.bench.evaluate")(function* (node: Node) {
  return yield* evaluateNodeTraced(node);
});

const runUntraced = Effect.fnUntraced(function* (node: Node) {
  return yield* evaluateNodeUntraced(node);
});

const wide = flat(8);
const matcherHeavy = flat(4);
const deep = nested(10);

describe("Effect.fn vs Effect.fnUntraced — shadow evaluator", () => {
  bench("simple — 1 wrapped call — Effect.fn", () => {
    Effect.runSync(runTraced(simple));
  }, options);
  bench("simple — 1 wrapped call — Effect.fnUntraced", () => {
    Effect.runSync(runUntraced(simple));
  }, options);

  bench("matcher-heavy shape — flat(4), 2 wrapped calls — Effect.fn", () => {
    Effect.runSync(runTraced(matcherHeavy));
  }, options);
  bench("matcher-heavy shape — flat(4), 2 wrapped calls — Effect.fnUntraced", () => {
    Effect.runSync(runUntraced(matcherHeavy));
  }, options);

  bench("wide shape — flat(8), 2 wrapped calls — Effect.fn", () => {
    Effect.runSync(runTraced(wide));
  }, options);
  bench("wide shape — flat(8), 2 wrapped calls — Effect.fnUntraced", () => {
    Effect.runSync(runUntraced(wide));
  }, options);

  bench("deep shape — nested(10), 11 wrapped calls — Effect.fn", () => {
    Effect.runSync(runTraced(deep));
  }, options);
  bench("deep shape — nested(10), 11 wrapped calls — Effect.fnUntraced", () => {
    Effect.runSync(runUntraced(deep));
  }, options);
});
