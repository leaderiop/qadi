# ADR-QD-076 — Mutation runs skip static mutants (`ignoreStatic`)

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-076                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-04                                     |
> | Status         | Accepted — narrows ADR-QD-025                  |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |

---

## Context

[ADR-QD-025](./025-mutation-testing.md) made mutation testing a merge gate and said there is **no ignore
list**: a mutant that cannot be killed is a finding to record, not a number to suppress, and suppressing
one "needs an ADR of its own". This is that ADR.

`pnpm mutation` is by far the longest step of `pnpm check` (CI legs take 40–50 minutes). Stryker's own
warning says why: a *static* mutant lives in code that runs once, at import time — module-scope tables,
`Schema` and brand definitions, regex constants, `Match.type` matchers built once (AGENTS.md §5a). Stryker
cannot tell which test covers such a mutant, so it re-runs the **whole** suite for each one.

Measured on this repository on 2026-10-04, same code, same machine, `packages/core`:

| | Mutants tested | Killed | Survived | Score | Wall clock |
| --- | --- | --- | --- | --- | --- |
| default | 3527 | 3130 (+50 timeout) | 316 | **90.16%** | 533 s |
| `ignoreStatic` | 2936 | 2645 (+50 timeout) | 210 | **91.79%** | 308 s |

Stryker flagged 717 mutants (20%) as static and estimated them at 88% of the run time; 591 were skipped.
Of those 591, **485 were killed and 106 survived**, so the skipped mutants were killed less often (82%) than
the rest of the package (90%) — which is why skipping them raises the score instead of lowering it.
`packages/predicate-sql` behaved the same way at small scale: 191 mutants, 97.91% → 98.01%, 16.2 s → 12.4 s.

`stryker.http.mjs` already recorded the mechanism from the other side (CCR-QD-119): module-scope survivors
in `@qadi/http` that, applied by hand, crash the whole test file at import — Stryker's documented
mis-scoring of static mutants under `coverageAnalysis: "perTest"`, not genuine gaps.

## Decision

**All six Stryker configs set `ignoreStatic: true`.** The `break: 80` threshold, `high`/`low` colours,
`coverageAnalysis: "perTest"` and the `mutate` globs are unchanged. There is still no per-file or per-pattern
ignore list: this is one global, mechanical option, not a judgement about any particular mutant.

## What this costs

About 17% of `packages/core`'s mutants (591 of 3527) no longer count, and **485 of them were being killed**:
a regression in module-scope logic — a changed regex in `SEGMENT_PATTERN`, an edited entry in a hoisted
`Match.type` table or a `CONTAINMENT_KEEP`-style lookup — is no longer caught *by the mutation gate*. It is
still caught by the ordinary test suite where a test exercises it, and by the coverage thresholds, but the
extra assurance mutation testing gave that code is gone.

A before/after was measured only for `core` and `predicate-sql`. The other four were run once with the
option on (2026-10-04): `devtools` 98.20%, `predicate-prisma` 95.14%, `audit` 86.05%, `http` 96.71%, all above
the break threshold of 80. They differ from the scores the roadmap quoted before (100.00%, 98.85%, 93.54%,
86.42%) — up for `http`, down for the rest — but those were older measurements, so how much of each change is
this option and how much is code drift is unknown. `audit` has the least headroom: 6 points above the gate.

## Reverting, or checking by hand

Set `ignoreStatic: false` in the config being examined and run `pnpm exec stryker run <config>`. Do this
before trusting a surprising module-scope change, and after a refactor that moves logic out of functions
into module-scope tables — that move is precisely what shifts mutants from counted to skipped.

## Consequences

**Positive**: `pnpm mutation` on `packages/core` is ~42% faster locally (533 s → 308 s); the mis-scored
static survivors `stryker.http.mjs` documents stop appearing; the score is closer to the one number it is
meant to be — "do the tests notice behaviour changes at run time".

**Negative**: the mutation gate no longer covers import-time code (above); the scores quoted in
`spec/roadmap.md` now mean *excluding static mutants* and are not comparable with earlier revisions.
