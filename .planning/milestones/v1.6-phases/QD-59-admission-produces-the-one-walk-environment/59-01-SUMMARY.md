---
phase: QD-59-admission-produces-the-one-walk-environment
plan: 01
subsystem: core
tags: [evidence, benchmark-gate, reserved-ids, api-surface, phase-base]
phase_base: 83cbd5c5ed728f88c969c1ad4d8db3df653d71e7
requires: []
provides:
  - phase_base, the commit every later plan in the phase is measured against
  - the gate of record shown to have measured phase_base's source and to reproduce # gate: pass
  - the base facts the change removes, with their lines at phase_base
  - ten reserved ids confirmed free at phase_base
  - the 933-export API surface baseline
affects: [59-02, 59-03, 59-04, 59-05, 59-06, 59-07, 59-08, 59-09, 59-10]
actuals:
  tokens: 5000
  tasks: 2
  commits: 0
plan_head_before: 83cbd5c5ed728f88c969c1ad4d8db3df653d71e7
plan_head_after: 83cbd5c5ed728f88c969c1ad4d8db3df653d71e7
tech-stack:
  added: []
  patterns: ["evidence-only plan: the benchmark gate of research is accepted as the gate of record only after its source is shown identical to the phase base and its analysis re-derived byte for byte"]
key-files:
  created:
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-01-SUMMARY.md
  modified: []
key-decisions:
  - "The gate of record is research's 3 + 3 run (D-11); it stands for phase_base because the source is byte-identical to the gate head and both analyses reproduce"
  - "The base has 13 six-argument sites, not CONTEXT's 11: 9 recursive, 3 dispatcher hand-offs and the root (D-16)"
requirements-completed: [WENV-01, WX-02, WX-03]
duration: 6min
completed: 2026-11-19
status: complete
---

# Phase QD-59 Plan 01: Evidence on the untouched base

**phase_base `83cbd5c5`, the benchmark gate of record re-proved against its source (0 of 35 workloads slower), the 13 six-argument `evaluateNode` sites the change removes, ten reserved ids free, and the 933-export surface baseline.**

No task commit: the plan is evidence only and the output commit below is its only commit. `commits: 0` counts task commits;
`plan_head_after` equals `plan_head_before` because the SUMMARY commit cannot name itself.

## Gate of record

WENV-01 (D-04, D-11). The gate ran in research against `e9b98bb8`; only `.planning/` documents were committed since.
Nothing was re-measured: `bench/ab.sh` and `pnpm bench` were not run and nothing under `bench/` was written (the
re-analysis ran on copies in a temporary directory; `git status --porcelain -- .planning/phases/QD-59-.../bench` is empty).

Source diff, `git diff --stat e9b98bb8e2b3d43ccae6801704a24a7cea3e10c1 83cbd5c5ed728f88c969c1ad4d8db3df653d71e7 -- packages scripts stryker.config.mjs package.json pnpm-lock.yaml pnpm-workspace.yaml ':(glob)tsconfig*.json'`: empty.

Prototype hash, `shasum -a 256 research-probes/proto-p1.patch.txt`:
`7cd868b63554766fe928355e9d4478a166df91fc12d20ec6ad40b7015b144ee3`. `git apply --check` of it on the working tree exits 0.

`59-BENCH.md` front matter, verbatim (each line indented two spaces so that no line here starts with `phase_base: `, which Task 2's `sed -n "s/^phase_base: //p"` would read as a second base):

```
  verdict: pursue
  phase_base: e9b98bb8e2b3d43ccae6801704a24a7cea3e10c1
  measured_at: e9b98bb8e2b3d43ccae6801704a24a7cea3e10c1
  prototype: research-probes/proto-p1.patch.txt
  prototype_sha256: 7cd868b63554766fe928355e9d4478a166df91fc12d20ec6ad40b7015b144ee3
  statistic: median of per-run minima; band = max(10%, the base's spread of that statistic) (D-04)
  slower: 0
```

`bench/gate/meta.txt` (the gate of record, 3 + 3), verbatim:

```
head: e9b98bb8e2b3d43ccae6801704a24a7cea3e10c1
patch: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-59-admission-produces-the-one-walk-environment/research-probes/proto-p1.patch.txt
patch_sha256: 7cd868b63554766fe928355e9d4478a166df91fc12d20ec6ad40b7015b144ee3
head_label: base
patched_label: proto
rounds: 3
node: v26.13.0
cpu: Apple M3 Pro
start: 2026-11-19T03:20:09Z
```

`bench/gate-r2/meta.txt` (corroboration, 5 + 5), verbatim:

```
head: e9b98bb8e2b3d43ccae6801704a24a7cea3e10c1
patch: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-59-admission-produces-the-one-walk-environment/research-probes/proto-p1.patch.txt
patch_sha256: 7cd868b63554766fe928355e9d4478a166df91fc12d20ec6ad40b7015b144ee3
head_label: base
patched_label: proto
rounds: 5
node: v26.13.0
cpu: Apple M3 Pro
start: 2026-11-19T03:25:10Z
```

Last five lines of `bench/gate/analysis.tsv`:

```
# workloads: 35
# slower: 0
# geomean_d_min_pct: -1.15
# worst_d_min: 6.7 filter — 500 items, concurrency :: sequential (default)
# gate: pass
```

Last five lines of `bench/gate-r2/analysis.tsv`:

```
# workloads: 35
# slower: 0
# geomean_d_min_pct: -0.03
# worst_d_min: 5.6 evaluate — width scaling :: width 8
# gate: pass
```

Self-test, `node bench/analyze.mjs --self-test`: `self-test: 4 passed`.

Re-analysis: the run JSONs and `meta.txt` of each run were copied to a temporary directory and
`node bench/analyze.mjs <tmp>/<dir> base proto` ran on each (exit 0); the new `analysis.tsv` is byte-identical (`cmp -s`)
to the committed one for both `gate` and `gate-r2`. Both end `# gate: pass` with `# slower: 0`.

Host load when this plan ran (1, 5, 15 minute): 8.82, 11.74, 15.09. Nothing was measured here, so it does not bear on the gate.

Result: the gate of record measured `phase_base`'s source (identical to the gate head) and reproduces `# gate: pass`.
The WENV-01 edge row stays `unclassified`, as the plan flagged; research's run is accepted as evidence on that basis.

## Base facts

Read at `phase_base` (`83cbd5c5`) with `git show 83cbd5c5:<file> | /usr/bin/grep -n`. Every site matched.

`packages/core/src/Walk.ts`:

- `const evaluateNode = (` `:319`, with `policy: Policy, subject: AuthSubject, request: Evaluation, matcherContext: MatcherContext, depth: number, maxDepth: number` on `:320-325`. It is not exported.
- 9 recursive six-argument calls with `depth + 1`: `:410` (`Not`), `:425` (`Obliged`), `:443` (`Labeled`), `:562` and `:582` (`evaluateAllOf`, sequential and concurrent), `:699` and `:713` (`evaluateAnyOf`, sequential and concurrent), `:797-802` (`evaluateRules` sequential, the call split over lines, `depth + 1,` on `:802`), `:827` (`evaluateRules` concurrent, `rule.condition`).
- 3 dispatcher hand-offs, `evaluateAllOf` `:399`, `evaluateAnyOf` `:402`, `evaluateRules` `:405`, each `(policy, subject, request, matcherContext, depth, maxDepth)`.
- 1 root call `:905`, `return evaluateNode(policy, subject, request, admitted.success.matcherContext, 0, maxDepth);`.
- 9 + 3 + 1 = 13 sites (D-16: 13, not CONTEXT's 11).
- `walk` builds `supplied: { action: question.action !== undefined, resource: question.resource !== undefined },` `:898`, inside the `request: Evaluation` literal (`:894-899`); `const admitted = admit(question);` precedes the root call.

`packages/core/src/Predicate.ts`:

- `const supplied: Supplied<true> = { action: action !== undefined, resource: true };` `:360`.
- `const admitted = admit(question);` `:661`.

`packages/core/src/Admission.ts`:

- `Admitted` holds `readonly question: Question,` `:37` and `readonly matcherContext: MatcherContext,` `:38`.
- `export const admit = (question: Question): Result.Result<Admitted, PolicyTooDeep> =>` `:43`: one argument.

`packages/core/test/Admission.test.ts`: `assert.strictEqual(admitted.success.question.policy._tag, "HasRole");` `:78`.

`packages/core/test/WalkEnvironment.tst.ts`: absent (`git ls-tree` of `packages/core/test/` at the base lists no `WalkEnvironment*`).

## Reserved numbers

WX-02 (D-10). `git grep -lwF -- <id> 83cbd5c5 -- spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts`:

| id | files naming it at phase_base |
|---|---|
| ARCH-106 | none |
| ADR-QD-172 | none |
| CCR-QD-450 | none |
| BEH-QD-631 | none |
| BEH-QD-632 | none |
| BEH-QD-633 | none |
| BEH-QD-634 | none |
| BEH-QD-635 | none |
| INV-QD-363 | none |
| INV-QD-364 | none |

`git ls-tree --name-only 83cbd5c5 spec/decisions/ | grep '^spec/decisions/172-'`: no match (exit 1).

Reservation file, `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`: `{"CCR": 452, "ADR": 174, "BEH": 645, "INV": 368}`
(the verify compares it with whitespace removed: `{"CCR":452,"ADR":174,"BEH":645,"INV":368}`).
`node scripts/next-id.mjs` was never run.

## API surface base

WX-03 (D-14). `pnpm -s spec:api < /dev/null` at `phase_base`:

```
api-surface: 933 export(s) documented across 9 package(s)
```

`ls .changeset | wc -l` prints `39` (the baseline for the phase's "no changeset" claim, D-14).

59-04, 59-09 and 59-10 compare against this line; it does not move.

## Deviations from Plan

None - plan executed exactly as written, apart from one verify-script defect worked around in the SUMMARY text.

**1. [Verify-script defect, orchestrator-authorised class] `sed -n "s/^phase_base: //p"` reads every line starting `phase_base: `**
- **Found during:** Task 2 (the reserved-ids verify and the precondition)
- **Issue:** the plan asks for `59-BENCH.md`'s front matter verbatim, whose `phase_base: e9b98bb8…` line then matched the sed and gave two bases.
- **Fix:** the quoted front matter is indented two spaces (stated beside it), so only the real front-matter line matches. The verify scripts are unchanged.
- **Files modified:** this SUMMARY only.
- **Verification:** the reserved-ids verify and the precondition exit 0.

The plan's HEAD note says `5636a626`; HEAD is `83cbd5c5` (the plan commit). Only `.planning/` documents sit between them,
and the first verify checks the source against the gate head, so `phase_base` is HEAD as the plan's step 1 says.

## Known Stubs

None.

## Threat Flags

None. No source file was created or modified.

## Self-Check: PASSED

All five verifies were run against this file before it was committed (results in the output of this plan's run): Task 1's
two (`the gate of record holds for 83cbd5c5`; `both gate runs re-analyse to # gate: pass, byte for byte`) and Task 2's three
(`the base facts hold at 83cbd5c5`; `ten reserved ids free at 83cbd5c5`; the 933-export line).
