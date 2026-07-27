# ADR-QD-034 — The switch exception is measured, and two of the four were unguarded

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-034                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-27                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-07-27): Initial release (CCR-QD-040) |

---

## Context

AGENTS.md §5a bans dispatching on a `_tag` with `switch` and grants four exceptions,
on the grounds that they run once per policy node per evaluation and their handlers
close over per-call state — so the `Match.type<T>()` matcher cannot be hoisted to
module scope, which is the form §5a prefers. The exception has always carried the same
qualifier: *converting them needs a benchmark first*.

No benchmark existed. The cost was therefore unmeasured, and the exception rested on an
argument about allocation that nobody had checked. CCR-QD-039 made the exception
*declared* and *enforced*; it could not make it *justified*.

## Decision

**The four switches stay, and both dispatchers that lacked an exhaustiveness net now
carry one.**

### What the measurement says

`packages/core/bench/` — `Dispatch.bench.ts` transcribes `resolveRef` exactly and
compares three forms; `Evaluate.bench.ts` supplies the denominator, because a ratio at
the dispatch site decides nothing without knowing dispatch's share of an evaluation.

| Form | Relative to `switch` |
| ---- | -------------------- |
| `switch` | — |
| `Match`, hoisted, arms returning a closure over the context | **1.6–2.4× slower** |
| `Match.value`, rebuilt per call | **3.5–7.7× slower** |

Per dispatch that is a difference of roughly 19–36 ns for the hoisted form. Against the
end-to-end figures — about 7 µs for a single-node evaluation, 14 µs for a policy with
four refs, 65 µs for ten levels of nesting, 7.5 µs per element under `filter` — the
matcher-heavy policy performs on the order of seventeen dispatches, so converting all
four would cost about **2–4% there and under 1% on a simple policy**.

Ranges rather than figures, deliberately. Absolute throughput on the development machine
varies by around 30% between runs and the ratios move with it; only the direction and
the order of magnitude transfer. A benchmark quoted to three significant figures from one
run of a laptop would be the same kind of evidence this repository replaced with
`stryker` (ADR-QD-025).

**So the honest summary is: the exception is real but small.** It is not the 10× that
would make it obvious, and it is not the noise that would make it indefensible. A 2–4%
regression on the hot path of an authorization library, in exchange for stylistic
consistency, is not a trade worth making — but it is close enough that the number
belongs in writing rather than in someone's recollection.

### The finding that mattered more

While measuring, the four dispatchers were checked for what §5a's preferred form
actually buys: `Match.tagsExhaustive` makes a new tag a **compile error**. A `switch`
does so only if its return type cannot absorb an implicit `undefined`. Tested directly,
by adding a tag and reading the compiler:

| Dispatcher | Return type | New tag caught? |
| ---------- | ----------- | --------------- |
| `evaluateNode` | a concrete `Effect<…>` | **yes** — TS2366 |
| `evaluateMatcher` | `boolean` | **yes** — TS2366 |
| `resolveRef` | `unknown` | **no** |
| `mergeFields` | `ReadonlyArray<string> \| undefined` | **no** |

The two with no net are exactly the two CCR-QD-039 found undeclared. A rule enforced by
memory had lost track of precisely the cases that needed it most, which is a better
argument for gating conventions than any amount of reasoning about them.

Both failure modes are silent, and they fail in opposite directions:

- `resolveRef` would resolve an unhandled ref to `undefined`, which every matcher then
  compares against and **denies**. Fail-closed, and still a wrong answer.
- `mergeFields` would merge to `undefined`, which is the **top** of the field lattice —
  [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)
  says `undefined` means *all fields*, not none. So an unhandled strategy **widens
  visibility**. Fail-open, on the dimension this library was rewritten to protect.

That second one is the reason this ADR exists rather than a note in the benchmark file.

Both now carry a `default` arm that assigns the scrutinee to `never`. It costs nothing
at runtime — the branch is unreachable — and it makes a new tag a compile error at the
same site `Match.tagsExhaustive` would. Verified by adding a sixth `ValueRef` member: the
guard fires (TS2322) alongside the two `Match`-based dispatchers in `Explanation.ts` and
`Predicate.ts` that had always caught it.

## Alternatives considered

**Convert all four to `Match`.** The consistent choice, and rejected on the measurement:
2–4% on the matcher-heavy path buys style, and the exhaustiveness half of the benefit is
now available for free. Reconsider if a future `Match` implementation closes the gap, or
if a profile ever shows dispatch is not where the time goes.

**Convert `resolveRef` and `mergeFields` only** — the two that were unguarded. Rejected
because it inverts the argument: those two are the *hottest* of the four, `resolveRef`
running per matcher node rather than per policy node. Paying the most for the smallest
gain would be the wrong half to convert.

**Leave them unguarded and rely on review.** Rejected. The tag that would break
`resolveRef` has been added before — `ActionRef`, when the action dimension shipped —
and review did not notice that the switch would absorb it silently. It is the same
"someone will remember" that CCR-QD-034, CCR-QD-038 and CCR-QD-039 each replaced.

**Suppress the guards from coverage and mutation with pragmas.** Rejected, and this is
the one worth stating plainly. The guards cost real numbers: line coverage 100% → 99.55%,
branch 98.41% → 98.02%, mutation 90.25% → 90.03%, since an unreachable branch cannot be
covered and its mutants cannot be killed. All still clear their thresholds with margin.
There is no precedent for a suppression pragma anywhere in this repository, and
introducing one to make a number look better would be dishonest about what the tools
measured — the lines genuinely do not execute, and a report saying so is correct.

**Make the benchmark a merge gate.** Rejected: a timing threshold on a shared CI runner
fails for reasons that have nothing to do with the change under test, which is the
property that made `continue-on-error` right for the mutation artefact upload
(CCR-QD-036). `pnpm bench` is a tool, not a gate, and `vitest bench --compare` is how a
future change argues about a regression.

## Consequences

`pnpm bench` exists and `packages/*/bench` is type-checked by `tsconfig.test.json` — an
unchecked benchmark would rot into a file that no longer compiles against the API it
claims to measure, which is the defect `spec/` gates against for documentation.

§5a no longer defers to a benchmark that does not exist. Its exception is now recorded
with a number and a direction, and the enforcement added in CCR-QD-039 has something to
enforce that someone can check.

Two lines of `packages/core` are permanently uncovered by construction, and that is
intended. A later reader tempted to "fix" the coverage by deleting a guard should read
the table above first: two of these four dispatchers accept a new tag silently, and one
of them widens field visibility when it does.

---

_Related: [ADR-QD-025](./025-mutation-testing.md) · [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top) · [Definitions of done](../process/definitions-of-done.md)_
