---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 08
subsystem: testing
status: complete
tags: [earlier-checks, ledger, computed-rows, red-evidence]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: f8532cffd3842ece845547afaf6233a2abed1c62
plan_head_after: e577a757f2db00aa939d67d1d1922cc5bd951c98

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: 90-check.mjs scratch, variant and commit modes (plan 02), 90-mutation-base.json (plan 01)
provides:
  - 90-earlier-checks.mjs, Phases 85 to 89's checks run from scratch copies against a measured 72-row ledger
  - 7 computed rows keyed on the exact subjects plans 14 and 15 must commit with
  - 2 scratch variants in 90-RED-EVIDENCE.md (`earlier-guard-unexplained`, `earlier-records-unbumped`)
affects: [QD-90 plans 14 and 15 (their commit subjects are binding), plan 16 (runs this script; the earlier dir under the scratch root needs removing)]

requirements-completed: []

actuals:
  tokens: 14000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a computed ledger row is a function of the commit subjects since phase_base: the unmoved line while its explaining subject is absent, the moved line once it exists"
    - "the guard rows of five earlier scan-forbidden modes move together on one subject, because each holds AGENTS.md against its own phase_base"

key-files:
  created:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-earlier-checks.mjs
  modified:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md

key-decisions:
  - "The copies live under `<S>/earlier/p85` to `p89` (the action's `OUT` is `<S>/earlier`); the must-have's shorter `<S>/p85` wording is the same directories one level up."
  - "An empty run list or an empty ledger is a finding of its own (`no run to judge`, `no ledger row to judge by`), so a script that ran nothing cannot pass."

duration: 20min
completed: 2026-11-26
---

# Phase 90 Plan 08: The Earlier-Phase Checks Summary

**`90-earlier-checks.mjs` runs Phases 85 to 89's checks (72 runs, 20 seconds) from scratch copies against a ledger measured at this plan's HEAD, and moves exactly seven rows by commit subject: the two `records --close` rows and the five `scan-forbidden` AGENTS.md guard rows.**

## The run at HEAD

`node 90-earlier-checks.mjs` prints 72 lines (`<check>: exit <n>: <line>`) and exits 0. 68 are `exit 0` and 4 are `exit 1`, the measured findings carried from Phase 89's ledger (`85` and `86` `scan-ids`, `87-pinned-check.mjs`, and `88-check.mjs records --close`, which now exits 1 on Phase 89's own revision lines). The text is byte-identical across two runs on one tree. `--self-test` passes (68 cases), `pnpm exec oxlint` on the script is clean. The 13 added rows measured as the research expected: 89's `base`, `scan-ids`, `scan-forbidden`, `trailers` (79 commits, a pattern), `admission-step`, `entry-points-first`, `records`, `records --close` (clean), `89-pinned-check.mjs` (`pinned: 46 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied`) and the four `--self-test` rows (381, 57, 92, 47 passed).

## The computed rows and the subjects they key on

Written before the commits exist; plans 14 and 15 must commit with exactly these subjects.

| Subject | `88 records --close` | `89 records --close` | the five `scan-forbidden` rows |
| ------- | -------------------- | -------------------- | ------------------------------ |
| `docs(90-14): record the port facts decision` | `spec/README.md ... 1.416, not 1.414`, `spec/traceability.md ... 1.335, not 1.333` | `spec/README.md ... 1.416, not 1.415`, `spec/traceability.md ... 1.335, not 1.334` | no change |
| `docs(90-14): state the port facts in the behaviors and invariants` | `spec/invariants.md ... 1.235, not 1.233` | `spec/invariants.md ... 1.235, not 1.234` | no change |
| `chore(90-15): add the breaking minor changeset` | `3 changesets are added since phase_base, not one` | `2 changesets are added since phase_base, not one` | no change |
| `docs(90-15): state a new port's facts in the house rules` | no change | no change | exit 1, exactly `AGENTS.md differs from phase_base: no budget moves` |

88's close is exit 1 with four lines at every state (each replaced by its moved line once its subject exists); 89's close is exit 0 and clean until any of its subjects exists, then exit 1 with exactly the lines whose subject exists; the guard rows are exit 0 and clean until the house-rules subject, then exit 1 with exactly the one guard line.

## Seen failing (2 blocks in 90-RED-EVIDENCE.md)

| Variant | Edit on a scratch clone of HEAD | Printed |
| ------- | ------------------------------- | ------- |
| `earlier-guard-unexplained` | one line of `AGENTS.md` section 3 changed, committed as `docs(90-99): scratch only` | exit 1; all five rows `85..89-check.mjs scan-forbidden: expected exit 0, got exit 1: AGENTS.md differs from phase_base: no budget moves` (the clone's full run shows no other row moving) |
| `earlier-records-unbumped` | one change-history row appended to `spec/README.md` under `docs(90-14): record the port facts decision`, the revision not bumped | exit 1; `88-check.mjs records --close` missing `spec/README.md ... 1.416, not 1.414` and `spec/traceability.md ... 1.335, not 1.333`, unexpected `1.415, not 1.414` and `1.334, not 1.333`; `89-check.mjs records --close: expected exit 1, got exit 0` |

Both scratch clones were removed; no commit on the main tree carries `docs(90-99): scratch only` (`git log --all` finds none). Three sabotaged copies of the script (the guard expectation made always clean, the 88 move removed, the 89 move removed) and one with the empty-run finding removed were seen failing `--self-test`.

## Task Commits

1. **Task 1: the script** - `28895f3d` `chore(90-08): add the earlier-phase checks` (the script alone)
2. **Task 2: the evidence** - `e577a757` `docs(90-08): record the earlier-phase checks seen failing` (90-RED-EVIDENCE.md alone)

`90-check.mjs commit` accepts both subjects, and `90-check.mjs trailers` reports 25 commits since phase_base, each with the one trailer.

## Deviations from Plan

### Choices the plan left open (recorded, most complete option taken)

1. **Copy location.** The must-have says `<S>/p85` to `<S>/p89`; the action says `OUT` is `<S>/earlier`. The script copies to `<S>/earlier/p85` to `p89` (the action's form), leaving `<S>` itself for the scratch clones. The close must remove `<S>` (it holds `earlier/` after any run of this script) before `scratch-clean --check`.
2. **Empty findings.** `judgeLedger` also fails an empty run list or an empty ledger (WX-01 "empty"), beyond the missing-run and unexpected-run findings 89's judge already had.
3. **Self-test breadth.** 68 cases (89's script had 47): each computed family is read before, between and after its subjects, in both directions, plus the guard row whose subject exists with a clean run and the reverse.
4. **88's close is a computed row of its own shape.** Phase 89's ledger moved it by changing the clean line; here its base is already exit 1 with four lines, so each line carries its base and moved text (`EXPLAINING_88`).

### Plan defects

None. The measured rows, the 72-line count and the AGENTS.md finding were as the plan stated; the research's assumption that 89's close would start naming revision lines was confirmed on the scratch variant, not only derived (the third clone state, README unbumped, printed the expected 88 and 89 differences).

## What only plans 14 and 15 can show

The moved lines for the subjects of plans 14 and 15 are computed, not yet printed by a real commit: the variants seed one subject on a clone with the revision not bumped, so they prove the rows fail on a wrong move. That the bumped values are exactly `1.416`/`1.335`/`1.235`, the changeset counts 3 and 2, and that no commit other than the house-rules one edits AGENTS.md (nor `scripts/check-house-style.mjs` or `.oxlintrc.json`), is shown only when those plans commit. A different count there is a finding to explain, not a row to widen.

## Known Stubs

None.

## Threat Flags

None. T-90-16 (an earlier check's output explained after the fact) is mitigated by subjects written here before the commits; T-90-17 (an earlier script edited to pass) is mitigated by copying and running, never editing (no file under an earlier phase directory is changed).

## Issues Encountered

- The first run of the self-test passed on the first try, so four sabotaged copies of the script were made to see it fail (see above); one sabotage crashed the self-test rather than failing a named case, which still exits non-zero.

## Denied commands

None.

## Not done

- No coverage, Stryker, bench or `pnpm check:pr` run: the plan writes a phase script and evidence only, no source or test.
- The scratch root still holds `earlier/` (the copies the last run made), `ab-routing.log`, `bench-routing` and `bench-routing-patch` (plan 06's); `scratch-clean` was not run, the close decides when.

## Self-Check: PASSED

- `90-earlier-checks.mjs`, `90-RED-EVIDENCE.md` and this file exist; commits `28895f3d` and `e577a757` are ancestors of HEAD; `90-check.mjs commit` accepted both subjects with exactly their one path each; `90-check.mjs trailers` reports 25 commits since phase_base, each with the one trailer.
- `node 90-earlier-checks.mjs --self-test` passes (68), `node 90-earlier-checks.mjs` exits 0 with 72 lines, `pnpm exec oxlint` is clean, the evidence file holds the two new blocks each with exit 1, and no `.vitest/` directory exists.
