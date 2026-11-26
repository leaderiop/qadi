---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 20
subsystem: process
tags: [earlier-phase-ledger, merge-gate, records-close]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the earlier-phase ledger (91-07), every fold, record and sweep commit (91-09 to 91-19)
provides:
  - the earlier-phase ledger holds on the landed tree with no row added (87 runs, all match)
  - the records close judge reads a phrase across a hand-wrapped line break
  - pnpm check:pr green on the landed tree (18 of 19 steps, mutation skipped)
affects: [91-21 (close)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 3c569f3b
plan_head_after: 3191f5d32c4e80e45e8c85b57c3e8f54de670ae1
commits: 1

actuals:
  tokens: 30000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a record judge reads a required phrase with whitespace collapsed, because the documents it reads wrap by hand"

key-files:
  created: []
  modified:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-check.mjs

key-decisions:
  - "The AGENTS.md section 16 mismatch was the judge's, not the document's: the sentence names a path outside its own package, with the line wrap between own and package; the judge now collapses whitespace (decided autonomously)"
  - "No unused-name cleanup was needed in 91-earlier-checks.mjs: the names the editor listed are used or absent (see Task 1)"

requirements-completed: []
status: complete
---

# Phase 91 Plan 20: Earlier-phase ledger reconciled and the merge gate run Summary

The earlier phases' checks already matched their ledger rows at the landed tree, so no row was added and no reconcile commit was made; the one real finding was `91-check.mjs records --close` refusing AGENTS.md section 16 over a line wrap, fixed in the judge with a self-test row, and `pnpm check:pr` exits 0.

## Task 1: the earlier-phase ledger

`node 91-earlier-checks.mjs` run at `3c569f3b` (before any change): exit 0, `earlier-checks: 87 runs, all match their rows`, 53 s. Run again at `3191f5d3`: the same. `--self-test`: `self-test: 76 passed`, and `pnpm exec oxlint` on the file exits 0. Phase 86's `provider-forwards-only` row is at exit 0 (`provider-forwards-only: the provider builds the owner once and only forwards to it`).

**No row added, so no `chore(91-20): reconcile the earlier-phase ledger with the landed commits` commit** (the plan's empty case). Every difference from phase_base is a predicted `COMPUTED` row, and measured (`--measure`) equals predicted in each:

| Row | Measured at HEAD | Predicted by | Commit that moves it |
| --- | ---------------- | ------------ | -------------------- |
| 85 to 89 `scan-forbidden` (five) | exit 1, 2 reasons each: the AGENTS.md line and the budget file line | `decoderFold` | `136830bf refactor(91-10)`; AGENTS.md also edited by `da1e5f4a feat(91-15)`, the budget file by `b06f18ce`, `da1e5f4a` |
| 90 `scan-forbidden` | exit 1, 2 reasons: AGENTS.md outside section 3, budget file | `decoderFold` | the same commits |
| 86 `pinned-check` | exit 1, 20 reasons: ten gate files, eight hydration files, `RegistryLease.ts`, `ServerRender.test.tsx` | `gateFold`, `hydrationFold`, `lease`, `sweep` | `45e366ac`, `b06f18ce`, `0a7abe7e`, `743f6f85` |
| 89 `pinned-check` | exit 1, 7 reasons | `auditBarrel`, `auditFold` | `b646c87b`, `8eadbc55` |
| 90 `pinned-check` and `--all-applied` | exit 1, 1 reason each: `PortSpan.test.ts` | `decoderFold` | `136830bf` |
| 87 `records --close` | exit 1, 1 reason: ADR-QD-047 not at 1.24 | `amendments` | `feb8264e` |
| 88 `records --close` | exit 1, 4 reasons | `surface`, `decision`, `behaviours`, `changesets` | `e0c321d1`, `6bda9c04`, `a2ddaa5e`, `94cea732` |
| 89 `records --close` | exit 1, 7 reasons | the same plus `decisionNotes`, `sweep` | adds `7fceb163`, `743f6f85` |
| 90 `records --close` | exit 1, 9 reasons | the same plus `overview` | adds `e1e46d45` |

Every subject the ledger keys on is in the `91-01-PLAN.md` table and carried by exactly one commit (the script checks both at start).

### Every commit since phase_base accounted for

74 commits at `3191f5d3` (73 before this plan's one). 14 are the table subjects the ledger keys on (listed above). The remaining plan commits are the per-plan `docs(91-NN)` record and complete commits and the other table subjects that move no earlier row (91-01 to 91-08, 91-14, 91-15 rule, 91-16 decision, 91-17 behaviours). The ten off-table commits the orchestrator listed are each a fix or a count that moves no ledger row: `8d9967bb` (README gate line), `1bc8e418` (91-10 interpreter fold held to its three paths), `3870cf5a` (roadmap step count), `8b5fac85` (91-16: ledgers the 87 close, which is the `amendments` row above), `dde9c676`, `685e7b4d`, `2c6f9750` (91-check.mjs readings), `f961469b` (pinned check comment kind), `484d0327` (keys the 86 pinned row on the sweep, the `sweep` row), `c6ab1351` (keys the 89 close on the sweep's decision note, the `sweep` row). Plus this plan's `3191f5d3`.

### Unused names in `91-earlier-checks.mjs`

The editor's list does not match the file on disk (oxlint on it exits 0). Resolved name by name:

- `mkdtempSync` and `tmpdir`: used, in the self-test's scratch directory (`mkdtempSync(join(realpathSync(tmpdir()), "qd91-st-"))`). Kept.
- `PINNED_87`: used, it is the `87-pinned-check.mjs` reasons row. Kept.
- `basename`, `fileURLToPath`, `PINNED_89_MOVES`, `PINNED_90_MOVES`, `GUARD_MOVES`, `GUARD_MOVES_90`: not present anywhere in the repository (searched `.planning` and `scripts`); a stale editor buffer. Nothing to delete or wire.
- The 89 and 90 pinned moves are judged by live rows: `PINNED_89` and `PINNED_90` feed the `pinned89` and `pinned90` computations, which the `89-pinned-check.mjs`, `90-pinned-check.mjs` and `90-pinned-check.mjs --all-applied` runs are compared against (self-test rows "89's pinned row passes in each of its states" and "the decoder subject moves 90's pinned rows, both runs"). The `scan-forbidden` moves are judged by `GUARD_85_TO_89` and `GUARD_90`, the `guard` and `guard90` computations behind the six `scan-forbidden` runs (self-test rows "with the decoder subject each of the five adds the budget file line and 90's holds the two lines" and "no scan-forbidden row is widened"). None is a dead table.

## Task 2: the merge gate

`pnpm check:pr`, run once, alone, in the background, at HEAD `3191f5d3`: **exit 0**, `run-check: ran 18 of 19 steps; "pnpm mutation" was skipped (release PRs run it).` Duration 276 s. Steps: typecheck, lint, circular, test:tstyche, coverage, test:bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website, spec:publish, bench:self-test, surface:self-test (`surface-diff self-test: 20 passed`, last output line). No root `.vitest/` or `.stryker-tmp/` was left.

The three phase checks, at `3191f5d3`:

- `node 91-pinned-check.mjs`: exit 0, `pinned: 515 held, 27 declared (27 applied), 4 born, 27 earlier-held, clean`.
- `node 91-check.mjs trailers`: exit 0, `trailers: 74 commits since phase_base, each with the one trailer`.
- `node 91-check.mjs scan-ids`: exit 0, `scan-ids: no id or phase wording in added lines`.

Also `node 91-check.mjs records --close`: exit 0, `records: the pinned-by lists name tests that exist, and every record of the phase is written`; `node 91-check.mjs --self-test`: `self-test: 477 passed`; the ledger re-run at `3191f5d3`: exit 0, 87 runs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The records close judge read AGENTS.md section 16 as missing a phrase it holds**
- **Found during:** orchestrator-assigned reconciliation (decision 2)
- **Issue:** `91-check.mjs records --close` printed `AGENTS.md section 16 does not name outside its own package`. Section 16 does say it ("names a path outside its own" / "package or into a `src/` tree (check 3c)"), but the paragraph wraps by hand between `own` and `package`, and `needAll` matched each required phrase as raw text.
- **Fix:** `needAll` now collapses runs of whitespace in the text and in each token before matching (the file's own `collapse`), so a line break reads as one space. The document was not changed: the sentence already states what check 3c refuses. Two self-test rows: a phrase wrapped across a line passes; a phrase with a word dropped by a wrap (`outside its\npackage`) still fails with the same reason. The existing "an AGENTS section 16 without the phrase" row still fails as before.
- **Files modified:** `.planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-check.mjs`
- **Commit:** `3191f5d3 fix(91-15): read the section 16 sentence across its line wrap`, keyed to plan 15 because 91-15 wrote the section 16 paragraph (the form 91-17 and 91-18 used for their judge fixes).

### Plan defects

None. The plan's expected empty case held (no `COMPUTED` row added, no reconcile commit); the editor's unused-name list was stale (above), not a defect of the plan.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None: no source or shipped file was edited.

## Self-Check: PASSED

- `91-check.mjs`: found, committed in `3191f5d3` (ancestor of HEAD).
- Verified: `node 91-earlier-checks.mjs` exit 0 (87 runs), `pnpm check:pr` exit 0 (18 of 19 steps), `91-pinned-check.mjs`, `trailers`, `scan-ids`, `records --close` exit 0.
