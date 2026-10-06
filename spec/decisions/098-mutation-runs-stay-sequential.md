# ADR-QD-098 — Mutation runs stay sequential: on four cores the gate is CPU-bound, and the faster options weaken it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-098                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-06                                     |
> | Status         | Accepted — amends ADR-QD-025                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-06): Initial (CCR-QD-184)         |

---

## Context

`pnpm mutation` is seven Stryker configurations — `packages/core`, the `@qadi/devtools` model,
`predicate-sql`, `predicate-prisma`, `audit`, `http` and `@qadi/react`'s decision read
([ADR-QD-025](./025-mutation-testing.md), steps 16–22 of `pnpm check`), joined by `&&` in the
`mutation` script, each pinned to `concurrency: 4`. They share no state: each run copies the
project into its own `.stryker-tmp/sandbox-*` and writes its own `reports/mutation-*`, so nothing
but the `&&` made them sequential. `CONTRIBUTING.md` called that "a known, chosen cost … revisiting
it is a real option, not yet taken".

It is nearly all of a CI leg. On the last green `main` run before this decision (run 37411518932,
`ubuntu-latest`, 4 vCPU, 16 GB):

| Configuration | Node 22.12.0 leg | Node 26 leg | Mutants tested | Timed out |
| --- | --- | --- | --- | --- |
| `stryker.config.mjs` (core) | 11m 24s | 17m 36s | 3418 | 44 |
| `stryker.devtools.mjs` | 8m 20s | 10m 36s | 1528 | 6 |
| `stryker.predicate-sql.mjs` | 24s | 36s | 68 | 0 |
| `stryker.predicate-prisma.mjs` | 28s | 37s | 132 | 0 |
| `stryker.audit.mjs` | 1m 02s | 1m 39s | 413 | 2 |
| `stryker.http.mjs` | 47s | 1m 03s | 209 | 0 |
| `stryker.react.mjs` | 15s | 20s | 8 | 0 |
| **`pnpm mutation`** | **22m 49s** of a 25m 12s leg | **32m 37s** of a 35m 42s leg | | |

The two legs ran the same commit on runners about 1.5× apart in speed (legs of the four runs
before took 31–42 minutes), and mutation was about 90% of each.

The question was whether the step can be made substantially faster without weakening what it
proves — every configuration still run on every `pnpm check`, each with its `break: 80` and
`ignoreStatic` ([ADR-QD-076](./076-mutation-runs-skip-static-mutants.md)), and no verdict changed.
Five measurements answer it.

### 1. The mutation phase is CPU-bound on four cores

Core at `concurrency: 4` in a Linux container pinned to four CPUs (`--cpuset-cpus=0-3`, so
`os.availableParallelism()` is 4, the runner's shape), sampling every 0.5 s how many of its threads
were runnable: about **1.7** during the dry run, which is one test process; **5.1–5.9** once four
workers are testing mutants; about **2.1** in a stretch where workers sat out timed-out mutants.
Each worker is a Stryker child process running Vitest — a main thread and a test thread, plus
V8's — so four of them already ask for more CPU than four cores have. What a scheduler can win on
this machine is only the time a run leaves cores idle: the dry runs (about 94 s of the Node 22
leg's 22m 49s, at under half the machine) and stalls on timed-out mutants.

### 2. Most of a mutant's cost is starting test files, not running tests

Core's dry run executes 1448 tests in about 21 s of test time. A mutant is covered by 43 tests in
3.4 test files on average (devtools: 27 in 2.5), Stryker runs 5.2 of them before the first failure
stops it, and the run costs about **0.77 worker-seconds per mutant** (650 s × 4 workers / 3388
mutants). The difference is per-file start-up: under Vitest's default `isolate: true` every test
file a mutant reaches gets a fresh worker thread and module graph, and importing the handful of
`effect` modules a test file uses costs **150–200 ms per fresh thread** in the same container — not
helped by Node's on-disk compile cache (`module.enableCompileCache()`), which was measured and made
no difference.

### 3. Timeouts are a small share

Of core's 44 timed-out mutants, 33 were stopped by Stryker's hit counter (an infinite loop through
instrumented code, detected without waiting) and 11 ran out the wall-clock budget — 1.5 × their
covering tests' time + `timeoutMS` + the dry run's overhead, about 29 s each; devtools had 2.
Another 66 mutants across the seven runs (core 26, devtools 20, http 14, audit 6) were killed by
Vitest's own 5 s test timeout — real hangs, in `DecisionCache`, `makeDecisionLog` and
`AttributeResolver.bounded` tests.

### 4. The verdicts are deterministic across runners — until the machine is starved

The two CI legs, on different hardware and Node versions, produced **identical** statuses for all
4214 of core's mutants. A local run of core on a 12-core workstation at a load average of 100–160
(another project's builds; each of the four workers got about a third of a core, 1946 s of user
CPU in 1744 s of wall time) did not: **18 differed**, 9 of them survivors scored as detected,
taking core from 93.74% to 94.00%. Eight were killed by one test — `FieldPath.test.ts`'s
20,000-level projection, which takes about 2 s in a plain run on a busy machine, ran past Vitest's
default 5 s under Stryker's instrumentation, and so "killed" every mutant it covers that it
otherwise survives. The ninth was a Stryker wall-clock timeout. In the four-CPU container the same
test failed Stryker's *dry run* outright ("Test timed out in 5000ms"), which aborts the gate, and
on the workstation at loads of 110–170 so did `Simplify.test.ts`'s 100k-deep and 250k-wide tests
and `Matcher.test.ts`'s 100k-wrapper walker — every stress test that relied on Vitest's default
timeout was one busy machine away from deciding a verdict.

So slowness is scored. A Timeout counts as detected, and a test that a slow machine pushes past
its own timeout kills whatever mutant is active. The CI legs agree because both stay inside those
margins; nothing guarantees a margin survives a machine made slower on purpose.

### 5. What concurrent runs would buy

From the CI timings, with the dry runs at the 1.7 threads they use and the mutation phases at four:

- **Two runs, two workers each** (total = cores, so per-test contention unchanged). Core is
  about as much work as the other six together, so it holds one lane alone and finishes on half
  the machine: about **2% faster** on the Node 22 leg (≈1335 s against 1364 s) and about **5%
  slower** on the Node 26 leg (≈2055 s against 1957 s), where core is the larger share. Not
  work-conserving — a lane that finishes leaves its cores idle — so it can lose to sequential.
- **Two runs, four workers each** (eight workers on four cores). Work-conserving, and at best
  about **8% faster** (≈1255 s), the most any scheduling can win with ~94 s of dry runs and ~150 s
  of stalls to fill. But runnable threads double — 11 against 5.5 on four CPUs — so every test runs
  about twice as slowly as today, against margins point 4 shows are not wide. The deep `FieldPath`
  test alone sits close enough to Vitest's 5 s to flip eight survivors.

## Decision

**The seven runs stay sequential, joined by `&&` as before.** Each configuration drops
`concurrency: 4` and takes Stryker's default — a worker per core, one fewer above four cores —
which is the same 4 on the CI runner and every core on a workstation, so per-test contention is
what CI has always calibrated against. Three further changes make the gate more honest without
making it faster:

1. **`check-dod-table.mjs` checks the Stryker configurations** (merge gate 11, before any mutation
   runs). Every `stryker*.mjs` at the repository root must be a `stryker run` step of `pnpm check`
   — a configuration added and not wired into `mutation` would otherwise exist only as a file — and
   each configuration's `thresholds.break` must be the percentage its row in
   `spec/process/definitions-of-done.md` promises ("at or above 80%"). Without a numeric `break`,
   Stryker reports a score and exits 0: a report, not a gate (ADR-QD-025). Neither was checked by
   anything before.
2. **Every stress test carries a 60 s timeout.** Many of the package suites' tests over 20,000- to
   250,000-node structures already did (`Explanation.test.ts`, `Evaluate.test.ts`,
   `Predicate.test.ts`, devtools' `Inspect`, `Remedies` and `WhatIf`); twenty-two did not —
   `RolesAndDepth` (5), `TreeFold` in core and devtools (4), `Matcher` (3), `FieldPath` (2),
   `Simplify` (2), `SinkCodec` (2), `Policy` (2), `Predicate` (1) and `AuditEntry` (1) — and now
   do. Raising the timeout of a test that passes can only move a mutation verdict from "killed by
   the clock" to whatever the assertions say, never from survived to killed, so it removes the
   load-dependent verdicts point 4 found, and the dry-run failures with them. None of the
   twenty-two kills a mutant by timing out on CI today (the 66 such kills are all elsewhere), so
   it costs CI nothing.
3. **`timeoutMS: 20000` is documented as load-bearing** in `stryker.config.mjs`: its slack is what
   keeps a mutant whose tests are merely slow from being scored as detected.

## Measurements

The CI figures above are the clean ones: dedicated four-vCPU runners, the same commit on two
legs. Everything below was measured on a shared 12-core workstation (Apple silicon, Node 22.22.0)
whose load average from other projects' work ran between 66 and 350 for the whole session, so
wall-clock times compare only roughly; load averages are given beside them, and per-mutant
statuses are compared with the CI run's reports, which is the comparison that decides whether a
change was weaker.

**Before and after, per configuration, interleaved** (A = the old `concurrency: 4`, B = the new
default, 11 workers on this machine; each B run immediately after its A run; load average at the
start of each run):

| Configuration | A wall (load) | B wall (load) | Score A / B / CI |
| --- | --- | --- | --- |
| `stryker.config.mjs` (core) | 2101 s (103) | — † | 93.74 / — / 93.74 |
| `stryker.devtools.mjs` | 1752 s (109) | 705 s (249) | 97.84 / 97.84 / 97.84 |
| `stryker.predicate-sql.mjs` | 190 s (111) | 234 s (302) | 95.59 / 95.59 / 95.59 |
| `stryker.predicate-prisma.mjs` | 89 s (308) | 41 s (223) | 91.67 / 91.67 / 91.67 |
| `stryker.audit.mjs` | 150 s (202) | 94 s (187) | 85.23 / 85.23 / 85.23 |
| `stryker.http.mjs` | 120 s (204) | 52 s (191) | 98.56 / 98.56 / 98.56 |
| `stryker.react.mjs` | 25 s (149) | 34 s (126) | 100.00 / 100.00 / 100.00 |

† Core's B run could not finish: at a load average of 310–350 its dry run exceeded Stryker's
five-minute dry-run limit. The six that finished took 2324 s under A and 1160 s under B — about
twice as fast, mostly in the two configurations large enough to keep eleven workers busy. Every
run's per-mutant statuses match CI's in verdict: the only differences are a mutant scored Timeout
on one side and Killed on the other (both detected) or a hit-limit timeout reported as a
wall-clock one.

**Core's verdicts, before and after the stress-test timeouts.** Before (the HEAD this ADR starts
from, `concurrency: 4`, load 100–160): 1744 s, 94.00%, 18 statuses different from CI and 9
survivors scored detected (point 4). After (A above, load 66–256): 2101 s, 93.74%, and **no**
verdict different from CI — 5 hit-limit timeouts reported as wall-clock ones.

**Indicative, in a four-CPU container on the same loaded host** (point 1's demand sampling ran
there): core at `concurrency: 4` tested 953 mutants in its first four minutes; the same with
`isolate: false` tested 1311–1382 — about 1.4×.

## Alternatives considered

**Run configurations concurrently** (`scripts/run-mutation.mjs`, a pool of two, failing if any
fails) — built and measured before this decision, then removed. On four cores it is either not
faster (two workers each) or faster by under a tenth at the price of doubling per-test slowdown
on a gate that scores slowness (four workers each); see point 5. The same runner would pay on a
larger machine, but there each configuration's own workers already take every core.

**Stryker incremental mode** (`incremental: true`, the incremental file kept between CI runs with
`actions/cache`). Rejected on correctness. Stryker reuses a mutant's previous result when the
mutated code and the tests that covered it are unchanged, and documents what it does not see: a
file that is neither mutated nor a test — a test helper, a fixture, `@qadi/testing`, another
package a suite imports (devtools' tests import `@qadi/core`), the lockfile, a Vitest config. Any
of those can turn a killed mutant into a survivor while the cached "Killed" is reused — a stale
cache hiding a surviving mutant. Keying the cache on every input would make it safe and useless:
GitHub scopes caches so that a `main` push cannot restore one a pull request saved, leaving
re-runs of an identical commit as the only hits. Whether a cache step breaks "`check.yml` runs
`pnpm check` and nothing else" (AGENTS.md §15) did not need deciding — `setup-node`'s `cache: pnpm`
already shows infrastructure is not a gate step — but a cache that changes which mutants are
tested changes what the gate proves, which is the line §15 draws.

**A shorter `timeoutMS`** (Stryker's default is 5000). It trims only the 13 wall-clock timeouts —
about 15 s of one worker each, under a minute per leg — while every second removed makes a slow
survivor likelier to be scored detected. Point 4 shows that direction is real.

**A shorter or longer Vitest `testTimeout` under Stryker.** Shorter kills slow survivors (weaker).
Longer is stricter but slower: the 66 real hangs Vitest kills at 5 s today would each run to
Stryker's ~29 s budget instead — roughly 26 extra worker-minutes per leg.

**`isolate: false` for the Vitest instance Stryker drives**, so a worker reuses its thread and
imported modules across test files and mutants. This is where a large win is — point 2's per-file
start-up is most of a mutant's cost — and an indicative run of core in the four-CPU container (on
a loaded host, so a ratio, not a figure) tested about **1.4×** as many mutants in the same time.
Rejected here because it is not provably equivalent: every test file would run against module
state that other files and earlier mutants left behind, a configuration the ordinary suite never
validates, and a mutant that leaves a module-level value corrupted could fail the next mutant's
tests — scoring it killed. Taking it needs its own ADR and evidence, gated rather than sampled
once, that per-mutant statuses are identical with and without isolation.

**Sharding across CI jobs or matrix entries.** A workflow that splits `pnpm check` into partial
jobs is a second definition of done (AGENTS.md §15).

**A larger runner.** The one lever that is neither scheduling nor semantics: with no pinned
`concurrency`, a configuration uses every core it is given, so more cores shorten the step without
touching a verdict. It is a billing and repository-settings decision, outside this ADR.

## Consequences

**Positive**: a workstation's `pnpm mutation` uses every core instead of four (the six configurations measured here ran about twice as fast on a 12-core machine). A
Stryker configuration can no longer be added without being run, or quietly stop breaking at the
score its row promises. No stress test's verdict depends on how busy the machine is, and the
dry-run failures that came with that are gone. The "real option, not yet taken" is taken, measured, and recorded, so the next attempt
starts from these numbers.

**Negative**: CI is not faster. On four cores the gate's cost is CPU spent starting test files,
and every lever that removes it changes what is being measured; this decision declines them rather
than hide that.

---

_Related: [ADR-QD-025](./025-mutation-testing.md) · [ADR-QD-076](./076-mutation-runs-skip-static-mutants.md) ·
[Definitions of Done](../process/definitions-of-done.md)_
