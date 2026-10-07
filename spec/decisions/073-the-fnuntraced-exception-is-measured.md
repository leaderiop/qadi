# ADR-QD-073 — The `fnUntraced` exception is measured, and drawn at exactly three functions

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-073                                   |
> | Revision       | 1.4                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.4 (2026-10-07): note — `evaluateAllOf`, `evaluateAnyOf` and `evaluateRules` moved to `Walk.ts` with the interpreter; the set and the budget count (3) are unchanged (ADR-QD-100, CCR-QD-189). 1.3 (2026-10-05): addendum — a single child-walk driver replacing the three dispatchers was measured and not adopted; the three functions and the budget are unchanged (ARCH-13, CCR-QD-176)<br>1.2 (2026-10-04): amendment note only — the traced port reads it lists now live in `PortAccess.ts`; the three `fnUntraced` dispatchers and the budget are unchanged (ADR-QD-077, CCR-QD-153)<br>1.1 (2026-09-19): PN-01 — the Context section's comparison against AGENTS.md §5a's numbers corrected to cite the per-dispatch ratios that survive ADR-QD-034's 2026-09-07 addendum, rather than the "2–4%/under 1%" end-to-end figures that addendum retracts as stale<br>1.0 (2026-09-09): Initial release (issue #102, CCR-QD-145) |

---

## Context

AGENTS.md §5 has always read "every effectful function is `Effect.fn(function*
…)`. Name it when a span is wanted" — and in practice every effectful function
in this codebase is named, so every one also gets a span. `Effect.fnUntraced`
is Effect's own escape from that cost, and it was used **zero** times anywhere
in `packages/*/src` until this ticket.

Issue #101 measured what the named form buys over the untraced one and left
the question of adopting it explicitly open (`EffectFn.bench.ts`'s own doc
comment: "whether to adopt `fnUntraced` anywhere is a separate question").
Reading `effect@4.0.0-rc.112`'s own source (`internal/effect.ts`) rather than
trusting a description of it: a named `Effect.fn(name)(...)` call captures a
second `new Error()` (for a symbolicated stack trace on failure), resolves the
current fiber to allocate a span through `makeSpanUnsafe` (real or noop,
`TracerEnabled` defaults `true` and nothing here disables it), and allocates a
`CurrentStackFrame` record — three things `Effect.fnUntraced`'s call path
(`suspend(() => fromIteratorUnsafe(body.apply(this, arguments)))`) does not do
at all. Isolated, that costs **≈2.7–2.9 µs/call**, ≈8.6–11.5× `fnUntraced`'s
own cost, which is itself under half a microsecond.

Put in proportion against `Evaluate.bench.ts`, ticket #101 estimated this as
**≈30–43%** of a matcher-heavy or wide evaluation and **≈54–66%** of a
ten-level-deep one — larger than the *per-dispatch* ratios AGENTS.md §5a
records for switch-vs-`Match` (**1.6–2.4×**, **3.5–7.7×**) because every
evaluation already pays for at least one named `Effect.fn` call (`evaluate`
itself), and the fastest real evaluation this library performs is itself only
≈8.6–9.0 µs, so a ≈2.7–2.9 µs fixed cost is a large fraction of the total.
(PN-01, 2026-09-19 audit: an earlier revision of this paragraph compared
against §5a's "2–4%/under 1%" *end-to-end* figures instead. Those are exactly
the numbers [ADR-QD-034's 2026-09-07 addendum](./034-the-switch-exception-is-measured.md#addendum-2026-09-07-the-benchmark-has-drifted-and-was-never-re-run)
retracts as stale and unreproduced — derived from a "four refs, seventeen
dispatches" workload `Evaluate.bench.ts` no longer matches — so citing them
here repeated the same staleness one ADR over. The per-dispatch ratios above
survive that addendum and are the correct comparison.)

## Decision

**Convert exactly three functions in `packages/core/src/Evaluate.ts` from
`Effect.fn(name)` to `Effect.fnUntraced`: `evaluateAllOf`, `evaluateAnyOf`,
`evaluateRules`.** These are the per-policy-node composite dispatchers —
`evaluateNode`'s `AllOf`/`AnyOf`/`Rules` arms call exactly one of them per
node, every evaluation, recursing into `evaluateNode` for each child. They are
where the measured cost concentrates, for the same reason a `switch` at a
per-node dispatch site earns AGENTS.md §5a's exception: paid once per node,
not once per call site.

### What stays traced, and why

Six other named `Effect.fn` calls in the same file are **explicitly out of
scope**, per ADR-QD-051 ("a span says what was asked, and a tracer is what
reads it back"):

- `resolveAttribute`, `evaluateActed`, `evaluateHasRelationship`,
  `evaluateHasCustom`, `evaluateHasSignature` — the five port-call wrappers.
  Each names a real I/O boundary a deployment's tracer needs to see (a slow
  attribute store, a relationship lookup that fans out) — product
  observability, not incidental cost, and none of the five runs once per
  policy node the way the three converted functions do.
- `evaluate` itself — the root span every evaluation's tracer attaches
  decision data to (ADR-QD-009). Untracing it would mean a deployment loses
  the one span that answers "was this evaluation allowed" without instrumenting
  its own call site.

`requireScopedResourceId`, a small helper `evaluateActed` calls, was also
considered and rejected: it is not a per-node dispatch point, and nothing in
the audit that raised this ticket found a reason to convert it.

### What the measurement says

`EffectFn.bench.ts` (issue #101) supplies the isolated per-call cost;
`Evaluate.bench.ts`, re-run before and after this conversion on the same
machine, the same day, 2–3 runs each, supplies the real denominator:

| Workload | Wrapped calls converted | Before | After | Change |
| -------- | ----------------------- | ------ | ----- | ------ |
| `one node` (no composite reached) | 0 | ≈8.3 µs | ≈8.1 µs | ~unchanged (control) |
| `resolver miss` (no composite reached) | 0 | ≈15.1 µs | ≈14.5 µs | ~unchanged (control) |
| `wide` — `allOf` of 8 | 1 | ≈14.1 µs | ≈9.9 µs | **≈−30%** |
| `matcher-heavy` — 3 refs | 1 | ≈17.6 µs | ≈11.9 µs | **≈−32%** |
| `obligation-heavy` — `allOf` of 8 distinct obligations | 1 | ≈18.5 µs | ≈13.3 µs | **≈−28%** |
| `field-heavy` — `allOf` of 8 under `Intersection` | 1 | ≈34.0 µs | ≈28.0 µs | **≈−18%** |
| `deep` — 10 nested combinator levels | 10 | ≈49.2 µs | ≈12.6 µs | **≈−74%** |

The two workloads that never reach `evaluateAllOf`/`evaluateAnyOf`/
`evaluateRules` at all (`one node`, `resolver miss`) move by less than
run-to-run noise in either direction — the control that confirms the
improvement on the other five is attributable to this conversion, not to
machine variance between runs. `field-heavy`'s smaller percentage is expected:
its own denominator is dominated by field-lattice intersection work across
eight children, which this conversion does not touch, so the same ≈2.7–2.9 µs
saved is a smaller fraction of a larger total. `deep`'s **≈74%** exceeds
ticket #101's own ≈54–66% estimate for that shape — ten wrapped calls removed,
not the one-or-two the other workloads convert, and the estimate's own
arithmetic (isolated cost × call count ÷ real evaluation time) predicted
exactly this scaling.

Ranges, not figures, for the same reason AGENTS.md §5a's own numbers are
ranges: absolute throughput on a development machine moves by roughly 30%
between runs, so only the direction and order of magnitude are load-bearing.

> **Amended 2026-10-04 (CCR-QD-153, [ADR-QD-077](./077-both-interpreters-read-ports-through-one-module.md)) — names only.**
> The traced port reads this ADR lists (`resolveAttribute`, `evaluateActed`,
> `evaluateHasRelationship`, `evaluateHasCustom`, `evaluateHasSignature`) moved to
> `PortAccess.ts` as `readAttribute`, `askActedAny`/`askActedForResource`,
> `askRelationship`, `askCustom` and `askSignature`, still named `Effect.fn`. The
> three `fnUntraced` dispatchers and `UNTRACED_BUDGET` are unchanged; the
> `evaluateActed`-family names remain in `Evaluate.ts` as plain functions that turn
> an answer into a verdict.

### What did not change

`Trace.children`/`policyTag`/`reason`/`visibleFields`/`obligations` are built
by `allow`/`deny`/`stepAllOf`/`finishAllOf`/`stepAnyOf`/`finishAnyOf` and the
plain object literals `evaluateRules` returns — all application data,
constructed identically regardless of what wraps the surrounding generator. A
span disappearing is observable only to a tracer, never to a caller reading a
`Decision`. This was a claim, not yet a proven one in this codebase, before
this ticket: `Evaluate.test.ts`'s "observability" suite now has a test driving
a policy through all three converted dispatchers — under `Union`/
`Intersection` field strategies, `PermitOverrides` combining, and a carried
obligation — that asserts both the absence of the `qadi.allOf`/`qadi.anyOf`/
`qadi.rules` spans and a byte-for-byte `deepStrictEqual` of the resulting
`Trace` tree against a literal expected object. It passed against the
pre-conversion code (proving the trace shape was already correct) and again,
unchanged, after the conversion (proving the conversion did not move it) —
TDD in the literal sense, not merely "these functions have test coverage."

## Alternatives considered

**Convert all eight named `Effect.fn` calls in `Evaluate.ts`, including
`evaluate` and the five port wrappers.** Rejected on ADR-QD-051's own grounds:
those six name a genuine event a tracer needs to see, and the audit that
opened this ticket found no measurement suggesting their cost is
disproportionate the way the three composite dispatchers' is — they each run
once per port call, not once per policy node.

**Convert `requireScopedResourceId` too**, on the grounds that it is called
from inside a hot path (`evaluateActed`). Rejected: it is a small helper
invoked once per `HasActed`/`HasNotActed` node reached, not a dispatcher that
recurses into the rest of the tree the way `evaluateAllOf`/`evaluateAnyOf`/
`evaluateRules` do, and nothing in the ticket or the audit that raised it gave
a benchmark-backed reason to include it. Left as `Effect.fn`, matching the
ticket's own instruction not to expand scope without one.

**Leave the exception undocumented — three inline comments and no ADR.**
Considered, since AGENTS.md's own doc-comment convention (lead with the
"what", the "why" after) would tolerate it. Rejected for the same reason
§5a's four-switch exception got CCR-QD-039's enforcement rather than staying a
comment: an exception with no gate rots the moment someone converts a fourth
function without reading the comment on the first three. `UNTRACED_BUDGET` in
`scripts/check-house-style.mjs` and this ADR's table in AGENTS.md §5 are
checked against each other the same way `SWITCH_BUDGET` is — deviation fails
in both directions.

**A stored benchmark baseline, checked by `pnpm bench --compare`.** Rejected
for the reason ADR-QD-034's own "Alternatives considered" gives for the same
proposal: a timing threshold on a shared CI runner fails for reasons that have
nothing to do with the change under test. `pnpm bench` remains a tool a
reviewer runs, not a merge gate.

## Consequences

AGENTS.md §5 now carries a second, narrower default alongside its "every
effectful function is `Effect.fn`" rule — mirroring how §5a already carries
`SWITCH_BUDGET` beside "dispatch with `Match`, not `switch`". A reviewer
proposing a fourth `Effect.fnUntraced` site anywhere in `packages/*/src` will
fail `pnpm lint` until AGENTS.md §5's table and `UNTRACED_BUDGET` both name it
— the same friction that has kept `SWITCH_BUDGET` at exactly four members
since CCR-QD-039.

`evaluateAllOf`, `evaluateAnyOf` and `evaluateRules` no longer produce
`qadi.allOf`/`qadi.anyOf`/`qadi.rules` spans. A deployment's trace viewer that
was reading those specific span names (rather than the decision data
`qadi.evaluate` itself carries) will see them disappear; nothing else in the
public API changes, and `Trace.children` continues to name every combinator
node that was evaluated by tag, independent of any span.

> **Addendum 2026-10-05 (CCR-QD-176) — a single child-walk driver was measured and not adopted.**
>
> **What was proposed.** The three functions above carry three near-identical
> copies of one child loop: walk the children in order and stop at the first
> step that settles the composite, or, under `concurrency`, run every child,
> fold the exits by declaration index, and re-raise the first failure by index
> (ADR-QD-026). The 2026-10-05 architecture review proposed one driver,
> `walkChildren`, as the only `Effect.fnUntraced` site, with the three folds
> moved into an Effect-free `CombinatorFold.ts` (ARCH-13). The concrete cost of
> the duplication is on record: CCR-QD-152's schedule fix needed three edits,
> and the first pass missed `Rules`. The review itself conditioned the change
> on a benchmark showing the driver costs nothing, because these are the
> functions that run once per composite node on every evaluation.
>
> **What was measured.** Variants were built on copies of `packages/core/src`
> at `e1d4cb6` and checked first: each type-checks, and each passes the core
> suite unchanged (41 files, 1273 tests for the two driver variants; the four
> evaluator files, 358 tests, for the folds-only one). In the order the plan
> tries them:
>
> - **S2** — a generic driver in its own module, `ChildWalk.ts`, with one
>   `runChild` closure per composite node.
> - **S1** — an evaluator-specific driver inside `Evaluate.ts`, with no closure.
> - **S0** — the folds moved to `CombinatorFold.ts`, with the three
>   `fnUntraced` loops kept.
> - **S2i** — S2 with both new modules inlined into `Evaluate.ts`. It measures
>   only, and separates vitest's module-getter cost from the change's own cost.
>
> **A** is today's code and **A′** a byte-identical copy of it, the noise
> control. All variants ran in one process, interleaved, rotating order. There
> were two methods, each over all 26 composite, depth-scaling, width-scaling and
> concurrency workloads of `Evaluate.bench.ts`:
>
> - **Paired vitest bench**, 6 runs per session.
> - **In-process Node harness** with live ESM bindings and no getters,
>   2 × 9 rounds × 250 ms per session.
>
> There were two sessions, on an Apple M3 Pro (12 cores) with Node 22.22.0.
> Session 1 ran at a 1-minute load average of **165–198**. Session 2 ran at
> **17–181**, mostly 20–50. The machine was shared with unrelated builds
> throughout.
>
> **Result: DROP, under the gate's own inconclusive rule.** The gate needs the
> noise band `N_w = |A′/A − 1|` to stay under 10% on every workload. In both
> sessions the harness gave **N_w > 10% on 16 of 26 workloads** (up to 59%
> and 61%). Over the six vitest runs, A's own p75 spread was **5–183%**. That
> makes both sessions inconclusive. The planning spike earlier the same day,
> at load 13–31, had already been inconclusive. The gate counts a second
> inconclusive result as a DROP, because the burden of proof is on the change.
>
> **What the noise does not hide.** The per-run *minimum* latency is the one
> statistic the load barely moves, and it was reproducible across both
> sessions. A′ stayed within ±3% of A on 21 of 26 workloads in session 1 and
> 24 of 26 in session 2, and within ±9% on every one. Each cell
> below is A's minimum latency over V's (> 1: V faster), session 1 / session 2:
>
> | Workload | A′ | S0 | S1 | S2 | S2i |
> | -------- | -- | -- | -- | -- | --- |
> | `one node` (no composite, control) | 1.02 / 0.98 | 0.99 / 0.99 | 1.06 / 0.99 | 1.06 / 0.99 | 1.07 / 1.01 |
> | `deep` — 10 levels | 1.07 / 1.00 | 0.94 / 0.92 | 0.98 / 0.93 | 1.01 / 0.92 | 1.05 / 1.00 |
> | `deep rules` — 10 nested | 0.99 / 0.98 | 0.85 / 0.89 | 0.89 / 0.92 | 0.90 / 0.90 | 0.98 / 0.99 |
> | `depth 40` | 1.03 / 1.01 | 0.87 / 0.87 | 0.86 / 0.87 | 0.86 / 0.86 | 0.98 / 0.97 |
> | `width 32` | 0.99 / 0.99 | 0.87 / 0.89 | 0.92 / 0.94 | 0.90 / 0.92 | 0.98 / 0.98 |
> | `anyOf First` — 8 | 1.03 / 1.01 | 0.90 / 0.94 | 0.93 / 0.96 | 0.94 / 0.96 | 0.99 / 1.00 |
> | `allOf` 8, `concurrency: "unbounded"` | 1.00 / 1.08 | 0.79 / 0.84 | 0.78 / 0.86 | 0.79 / 0.85 | 0.83 / 0.86 |
> | `anyOf Union` 8, `concurrency: "unbounded"` | 1.01 / 1.01 | 0.78 / 0.78 | 0.74 / 0.80 | 0.80 / 0.80 | 0.79 / 0.83 |
>
> Read as a direction, never as a figure ("ranges, not figures", above), the
> data shows two separate costs:
>
> 1. **The module split costs up to 15% on the sequential composite workloads,
>    and the loss grows with depth.** S2i inlines the same code and recovers it
>    to within A′'s band, so under vitest this cost is the module-runner getter
>    artefact. The harness was meant to tell artefact from real cost, and it
>    could not do so at this noise level.
> 2. **The concurrent `allOf`/`anyOf` path costs 14–26% in every variant,
>    S2i included.** That cost is real. To avoid indexing `exits` under
>    `noUncheckedIndexedAccess`, the shared driver pairs each exit with its
>    child through an `Effect.map` per child. Today's `AllOf`/`AnyOf` branches
>    need no pairing, because their fold reads only the trace, so they pay
>    nothing; only `evaluateRules` already pays it. A shared driver must carry
>    the child for `Rules`, so it puts that cost on all three.
>
> Neither rung passes, whichever reading of the noise is taken. Even with the
> getter loss excused by S2i, the driver is measurably slower on the
> concurrent path. The ladder therefore ends at DROP, and nothing was
> committed: the three functions, `UNTRACED_BUDGET`, AGENTS.md §5's table and
> this ADR's Decision are unchanged.
>
> **What would justify reopening it.** Four things would:
>
> - a quiet-machine measurement with every `N_w` ≤ 10%, which this addendum
>   could not obtain;
> - an Effect release that changes what `fromIteratorUnsafe`, `Effect.exit` or
>   `Effect.map` cost on this path;
> - a driver whose concurrent branch pairs exits with children without a
>   per-child `Effect` and without an unchecked index;
> - a fourth composite tag, which would make a fourth copy of the loop.
>
> A new argument is not enough; it needs a new measurement. The benchmark
> coverage that made this measurement possible stays: `rules` × 3 algorithms,
> `anyOf` `First`/`Union`, and per-combinator concurrency workloads in
> `Evaluate.bench.ts` (ARCH-13 T1). So does the BEH-QD-134 correction
> (CCR-QD-171).

---

_Related: [ADR-QD-034](./034-the-switch-exception-is-measured.md) ·
[ADR-QD-051](./051-a-span-says-what-was-asked.md) ·
`packages/core/bench/EffectFn.bench.ts` (issue #101) ·
`packages/core/bench/Evaluate.bench.ts`_

> **Note (CCR-QD-189).** The three functions now live in `packages/core/src/Walk.ts`; `UNTRACED_BUDGET` is keyed there with the same count. `walk` itself is a plain function returning `Effect.suspend`, neither traced nor budgeted.
