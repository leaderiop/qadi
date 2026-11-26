---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 07
subsystem: testing
tags: [earlier-checks, ledger, computed-rows, scratch-copies, red-evidence]

requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: 91-check.mjs (scratch, variant, commit modes), the recorded phase_base, the subject table of 91-01-PLAN.md, 91-pinned-check.mjs (the earlier-held rows)
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: 90-earlier-checks.mjs, the script this ports, and Phase 90's own scripts, now among the runs
provides:
  - 91-earlier-checks.mjs, with RUNS (87), LEDGER, COMPUTED, --measure and a 75-case --self-test
  - 91-RED-EVIDENCE.md with three more blocks (earlier-unexplained, earlier-unmoved, earlier-row-without-run)
affects: [91-09 through 91-19 (each commit that moves an earlier check's output is a computed row keyed on its subject), 91-20 (re-measures the predicted rows), 91-21 close]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 1170c318f6699fe7ee36ea82f194eeff465fa68d
plan_head_after: 0cd6fc7c153ad79a491331bf1b5b2d8b84cd924e
commits: 2

actuals:
  tokens: 17500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a reasons row names each reason with `<n>` for any line number, so it is keyed on the path and never on a line a later commit will choose"
    - "a computed row is a list of lines, each present always, after a subject exists, or until a subject exists; a row is clean when none applies"
    - "Phase 90's scripts run from a copy shaped like a repository (a phase directory, scripts/lib, a node_modules link, a git init), their self-tests from its root"

key-files:
  created:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-earlier-checks.mjs
  modified:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md

key-decisions:
  - "The ledger is measured on a clone at phase_base (head 69e5247d205949df7396dfacb0a29bc96a02f321, branch arch-wave-16), so plan 03's register bump is itself a computed move"
  - "Predicted rows were rehearsed on a clone with eleven planted commits carrying the exact subjects, run at the twelve states between the HEAD and the last commit: all twelve match"
  - "The runs of Phase 90 are the text judges and the pinned check; the modes that clone, compile, run pnpm or key on the script's own git path are not run"

requirements-completed: []

duration: 150min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 07: The earlier-phase checks Summary

**`91-earlier-checks.mjs` re-runs Phases 85 to 90's checks (87 runs) from scratch copies against a ledger measured on a clone at `phase_base`; the 13 rows this phase moves are computed, each keyed on the exact subject of the commit that moves it, and the check has been seen failing on an unexplained move, a missing move and a row with no run.**

## What was built

`91-earlier-checks.mjs` (plain Node ESM, refuses to run unless the working directory holds `.planning/phases`, finds each earlier directory by its `QD-NN-` prefix under `.planning/phases/` or `.planning/milestones/*-phases/`, only reads them). Modes: no argument (prints `<check>: exit <n>: <line>` per run, then `earlier-checks: 87 runs, all match their rows`), `--measure` (prints every run as a ledger row and judges nothing), `--self-test` (75 cases on planted outputs and planted subject lists).

At start it reads the subject table of `91-01-PLAN.md` and fails before any run if a subject the ledger keys on is not in it (a paraphrase) or if two commits carry one.

**Runs (87).** The 72 of `90-earlier-checks.mjs` (Phases 85 to 89), plus Phase 90's: `90-check.mjs` `base`, `scan-ids`, `scan-forbidden`, `trailers`, `records`, `records --close`, `port-facts`, `scoped-route derived`, `scoped-route route`; `90-pinned-check.mjs` plain and `--all-applied`; and the four Phase 90 `--self-test`s (`90-check.mjs`, `90-pinned-check.mjs`, `90-mutation.mjs`, `90-earlier-checks.mjs`). Phase 86's `provider-forwards-only` is a fixed exit-0 row with no computed move (`provider-forwards-only: the provider builds the owner once and only forwards to it`).

**Measured base.** `node 91-check.mjs scratch earlier-base --at phase_base` made the clone (head `69e5247d205949df7396dfacb0a29bc96a02f321`, branch `arch-wave-16`); this script was copied into its phase directory, uncommitted, and run there with `--measure`: 87 rows in 91 s, all exit 0 except the ten that were already exit 1 at Phase 90 (the two `scan-ids` reason sets of 85 and 86, 87's pinned set, the five `scan-forbidden` rows of 85 to 89, 88's and 89's `records --close`).

## The computed rows

Each row is a list of lines with a condition; clean when none applies. Subjects are copied byte for byte from the table of `91-01-PLAN.md`.

| Row | Base (measured) | Moves at | Line after |
| --- | --------------- | -------- | ---------- |
| `86-pinned-check.mjs` | exit 0, `pinned: 59 files hold their base text, 1 of 1 born files held` | `refactor(91-11): fold the gate registry constructor into the gate writer` | 10 lines `packages/react/test/<gate file> is reported as M against its base, not unchanged` |
| | | `refactor(91-13): fold the hydration entry points into the hydration engine` | 8 hydration files, same form |
| | | `docs(91-19): name the registry lease's one caller` | `packages/react/src/RegistryLease.ts is reported as M against its base, not unchanged` |
| `89-pinned-check.mjs` | exit 0, `pinned: 46 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied` | `refactor(91-12): fold the sequence check's public home into the archive facts` | seven lines: `SequenceIntegrity.ts was deleted`, `AuditArchive.test.ts`, `SequenceIntegrity.test.ts`, `ForeignRows.test.ts` (between importHostBatch and importFaults), `AdmissionOrder.characterisation.test.ts` (between header and import), `BatchReadOnce.test.ts`, and `index.ts`, each with `<n>` for the line |
| | | `refactor(91-09): name the audit barrel's exports per module` | the `packages/audit/src/index.ts: differs from its base text at line <n>` line alone (it stays once the audit fold exists) |
| `90-pinned-check.mjs`, `--all-applied` | exit 0, `408 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied` | `refactor(91-10): fold the port span decoder into the span machinery` | `packages/core/test/PortSpan.test.ts: differs from its base text at line <n>` |
| `scan-forbidden` of 85 to 89 | exit 1, `AGENTS.md differs from phase_base: no budget moves` | `refactor(91-10): ...` (first commit that edits `scripts/check-house-style.mjs`) | the AGENTS.md line and `scripts/check-house-style.mjs differs from phase_base: no budget moves` |
| `90-check.mjs scan-forbidden` | exit 0, clean | `refactor(91-10): ...` | `AGENTS.md differs from phase_base outside its section 3: only that section may change` and the budget-file line |
| `88-check.mjs records --close` | README 1.416, traceability 1.335, invariants 1.235 (each not 1.414 / 1.333 / 1.233 above the base's) and `5 changesets are added since phase_base, not one` | README at `feat(91-03): add the surface-diff tool and run its self-test in the merge gate` (1.417, exists at HEAD); traceability at `docs(91-16): record the named barrels decision` (1.336); invariants at `docs(91-17): state the folded behaviours and the surface invariants` (1.236); the count at `chore(91-18): add the core, react and audit patch changesets` (5 to 8) | |
| `89-check.mjs records --close` | the same three registers (not 1.415 / 1.334 / 1.234) and `4 changesets ...` | the same three subjects, plus `spec/behaviors/33-audit-pipeline.md` 1.34 at the behaviours subject, `spec/decisions/110-...md` 1.5 at `docs(91-18): note the folds on the decisions they touch`, the count 4 to 7 | |
| `90-check.mjs records --close` | exit 0, clean | README (not 1.416) at the `feat(91-03)` subject, traceability, invariants and `spec/behaviors/30-port-calls.md` 1.27 at the behaviours subject, `spec/overview.md` 1.148 at `docs(91-17): name each folded export at its new home`, and at the changeset subject `6 changesets are added since phase_base, not 3` and one `.changeset/<core\|react\|audit>-named-barrel.md is not one of ...` line each | |

The `trailers` rows of 87 to 90 are pattern rows (`trailers: <n> commits since phase_base, each with the one trailer`). The `scan-ids` rows of 85 to 90 do not move.

**Measured vs predicted.** The rows that exist at HEAD (`feat(91-03)`'s README bump in the three closes) are measured: the real run passes with them. Every other subject's commit does not exist yet, so its row is a prediction. Each prediction was rehearsed: a scratch clone at HEAD took eleven planted commits with the exact subjects of plans 09 to 13, 16 to 19 (the import edits the folds make, a deleted `SequenceIntegrity.ts`, minor-revision bumps of each register, three changeset files, an AGENTS.md section 7a clause and a budget comment), and the script was run at each of the twelve states from HEAD to the last commit: **all twelve exit 0 with `earlier-checks: 87 runs, all match their rows`**. The rehearsal fixed the exact wording of every moved line, which the plan could only list by file.

## How the script was seen failing

Each block was written by `91-check.mjs variant <name> <label> script 91-earlier-checks.mjs` on its own scratch clone of the committed HEAD, exit 1 (`91-RED-EVIDENCE.md`):

| Label | Edit in the scratch clone | Recorded finding |
| ----- | ------------------------- | ---------------- |
| `earlier-unexplained` | scratch commit `chore(91-99): touch` swaps two import lines of `packages/react/test/GateWriter.test.tsx` | `86-pinned-check.mjs: expected exit 0, got exit 1: packages/react/test/GateWriter.test.tsx is reported as M against its base, not unchanged` |
| `earlier-unmoved` | scratch commit with the exact decoder-fold subject that touches only `91-SURFACE.md` | `85-check.mjs scan-forbidden: missing reason "scripts/check-house-style.mjs differs from phase_base: no budget moves"` (and likewise 86 to 89); the full finding set, read from the clone's stderr, also holds `90-check.mjs scan-forbidden`, `90-pinned-check.mjs` and `90-pinned-check.mjs --all-applied: expected exit 1, got exit 0` |
| `earlier-row-without-run` | the clone's copy of the script has the `86-check.mjs records --close` run deleted | `missing run: 86-check.mjs records --close` |

## Task Commits

1. Task 1: `2e8089e1` `chore(91-07): add the earlier-phase checks` (exactly the script)
2. Task 2: `0cd6fc7c` `docs(91-07): record the earlier-phase checks seen failing` (exactly `91-RED-EVIDENCE.md`)

Each carries the one trailer; `91-check.mjs commit` passes for both.

## Verification

- `node 91-earlier-checks.mjs --self-test` passes (75); the real run exits 0 with `earlier-checks: 87 runs, all match their rows`; `pnpm exec oxlint` over the script is clean.
- `91-check.mjs scan-ids` clean; `91-check.mjs trailers` reports 22 commits since the base, each with the one trailer.

## Deviations from Plan

### Plan defects and gaps resolved by the smallest honest reading

**1. [Plan defect] Phase 90's scripts cannot run from `<S>/earlier/p90/` as the other phases' do.**
- **Found during:** Task 1, running `90-check.mjs` from a copy.
- **Issue:** the Phase 90 scripts (a) refuse a directory whose name does not start with `QD-90-`, (b) import `../../../scripts/lib/typescript-server-child.mjs` and `typescript` by a path relative to their own directory, and (c) build a planted clone from the relative path between the working directory and their own directory, so their `--self-test` needs that path to stay under the working directory. The 85 to 89 scripts had none of the three.
- **Before:** a flat copy under `<S>/earlier/p90/`.
- **After:** `<S>/earlier/p90/` is shaped like a small repository: `.planning/phases/QD-90-earlier/` (the four scripts, the base and close records, `90-BENCH.md`, `90-RED-EVIDENCE.md`, `bench/`), `scripts/lib/typescript-server-child.mjs` (copied), `node_modules` (a link to the repository's) and a `git init`. The judging runs use the repository root as the working directory; the four `--self-test`s run from `p90`. No Phase 90 file is edited and no constant of a Phase 90 script is changed.

**2. [Plan wording] "every other `90-check.mjs` mode its `close` runs" is not run in full.**
- **Issue:** of the modes `90-check.mjs close` runs, `sixth-port close` and `routing-landed` clone and compile in a scratch root named `qd90` that the Phase 90 script owns (they left `<tmp>/qd90/sixth-*` and `routing-landed*` behind when probed; I removed those), `circular` runs `pnpm`, and `bench` and the mutation `landed` modes compare a commit's paths with the script's own directory, which a copy changes (probed: exit 1 from a copy for that reason alone). No earlier phase's list ran its own `circular`, `compare` or `landed` either.
- **Resolution:** the runs are the text judges the plan names (`port-facts`, `scoped-route derived`, `scoped-route route`, with `records --close`, `scan-ids`, `scan-forbidden`, `trailers`, `base`, `records`), the pinned check in both modes, and the four self-tests: 15 runs, 87 in all (the plan wanted at least 80). `pnpm circular` and the mutation records are judged by `91-check.mjs close` and `pnpm check`.

**3. [Plan gap] The plan's mover list leaves out the decision note.**
- **Issue:** `89-check.mjs records --close` judges `spec/decisions/110-an-archives-facts-are-computed-once.md`, which `docs(91-18): note the folds on the decisions they touch` bumps once, and `spec/behaviors/33-audit-pipeline.md` and `30-port-calls.md`, which the behaviours subject bumps. The list named only the registers, the overview and the changeset counts.
- **Resolution:** both are rows, keyed on those subjects (measured on the rehearsal).

**4. [Plan wording] The AGENTS.md line and the budget-file line.**
- **Issue:** the plan says the `scan-forbidden` rows of 85 to 90 gain their `scripts/check-house-style.mjs` line and 90's its `AGENTS.md` line. Measured on the rehearsal: 85 to 89 already print the AGENTS.md line at the base and gain only the budget-file line; 90 (clean at the base) gains two lines, `AGENTS.md differs from phase_base outside its section 3: only that section may change` and the budget-file line. The A3 assumption of the research is resolved by that measurement.

**5. [Plan wording] `QadiProvider.tsx` under the gate subject.**
- The 86 pinned check holds only the react tests and `RegistryLease.ts`, so `QadiProvider.tsx` moves no 86 row (it is read by `provider-forwards-only`, a fixed row that the rehearsal kept at exit 0 at all twelve states).

No earlier script reads `spec/roadmap.md`, `CONTRIBUTING.md` or `spec/process/definitions-of-done.md`, so plan 15's edits to them key no row.

### Choices the plan left open (autonomous, most complete option)

- A subject that two commits carry is a finding of its own, not a state a row can be in.
- A line with a number is a pattern (`<n>`) in every `reasons` row, not only the three pinned rows, so a reworded line fails whichever way.
- `--measure` prints each run as a ledger-row literal, so the base can be re-measured and a prediction corrected by a reviewed edit, never a widened row.

## Risk for later plans

Every row keyed on a subject whose commit does not exist yet is a prediction (rehearsed, not measured on the real commit). The ones most likely to need a reviewed correction in plan 20: the 91-19 sweep subject can touch a held react or audit file under a subject no row names; the 91-17 behaviours commit may bump documents beyond the four the plan lists; the audit fold's actual import edits decide which of 89's seven lines appear (a file edited inside a declared region would stop being reported).

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None: a planning script and an evidence file; no source, network or schema change.

## Self-Check: PASSED

- `91-earlier-checks.mjs` exists; the real run exits 0 with `earlier-checks: 87 runs, all match their rows`.
- `2e8089e1` and `0cd6fc7c` are ancestors of HEAD, each with the one trailer.
- `91-RED-EVIDENCE.md` holds `earlier-unexplained`, `earlier-unmoved` and `earlier-row-without-run`, each with exit 1.
