# ADR-QD-073 — The `fnUntraced` exception is measured, and drawn at exactly three functions

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-073                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-09-09                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-09-09): Initial release (issue #102, CCR-QD-145) |

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
ten-level-deep one — larger than AGENTS.md §5a's switch-vs-`Match` numbers
(2–4%/under 1%) because every evaluation already pays for at least one named
`Effect.fn` call (`evaluate` itself), and the fastest real evaluation this
library performs is itself only ≈8.6–9.0 µs, so a ≈2.7–2.9 µs fixed cost is a
large fraction of the total.

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

---

_Related: [ADR-QD-034](./034-the-switch-exception-is-measured.md) ·
[ADR-QD-051](./051-a-span-says-what-was-asked.md) ·
`packages/core/bench/EffectFn.bench.ts` (issue #101) ·
`packages/core/bench/Evaluate.bench.ts`_
