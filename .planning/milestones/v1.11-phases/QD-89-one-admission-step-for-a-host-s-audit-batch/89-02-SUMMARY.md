---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 02
subsystem: testing
tags: [audit, phase-check, shape-judge, records-judge, admission-step, entry-points-first]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
check_commit: c8c4a2ec
plan_head_before: 824c4325524e25bda5ae4bf909b6fbd2a809025c
plan_head_after: c8c4a2ec

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: 89-mutation-base.json (phase_base), the two born test files and the 89-RED-EVIDENCE.md line forms from plan 01
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: 88-check.mjs, the file the shared modes are ported from
provides:
  - 89-check.mjs, twelve modes and a self-test (377 passed), oxlint clean
  - admission-step [--module-only], entry-points-first [names] and records [--close], the three judges of the phase; each exits 1 on the base tree with its first reason
  - 89-RED-EVIDENCE.md, one `- check failed:` line per mode (twelve)
affects: [QD-89 plans 03 to 11]

actuals:
  tokens: 27000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a function read by its column-0 declaration up to the next column-0 word, so a class with a generic body before it cannot swallow it"
    - "a first statement that opens a control block is not an admission, even when the block calls the step"

key-files:
  created:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-check.mjs
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-02-SUMMARY.md
  modified:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-RED-EVIDENCE.md

key-decisions:
  - "records requires the heading of BEH-QD-253, 254 and 722 and a pinned-by paragraph only for 722 and BEH-QD-781 to 785; the base has no pinned-by paragraph for 253 or 254."
  - "The check derives the one phase directory a run may stage from its own location, so it names no phase directory as a literal."

patterns-established:
  - "a decision-number, plan-id, requirement-id, phase-id and placeholder scan with no phrase exemption outside .changeset/ and spec history"

requirements-completed: []

coverage:
  - id: D1
    description: "89-check.mjs holds the twelve modes, each a pure judge plus a thin reader, driven both ways by --self-test"
    verified_by: node 89-check.mjs --self-test (377 passed), oxlint clean, and the Task 1 and Task 2 verifies
  - id: D2
    description: "admission-step, entry-points-first and records --close state the shape the change must reach and exit 1 on the base tree with their first reason"
    verified_by: the Task 2 verify, and the evidence lines naming the first rule broken
  - id: D3
    description: "Every mode seen failing once, recorded, the check committed once with exactly its script and the evidence"
    verified_by: the Task 3 verify and 89-RED-EVIDENCE.md
---

# Phase 89 Plan 02: Port the phase check and add the admission judges Summary

**`89-check.mjs`: the 88 shared modes ported over the audit project and three new judges (the admission step, the first-statement rule of the four entry points, and the closing records), 377 self-test cases, each mode seen failing once on a real run.**

## Performance

- **Completed:** 2026-11-26 (start time not captured); **Tasks:** 3 (one tracer, two auto)
- **Files created:** 2 (the check and this summary), **modified:** 1 (the evidence file); no file under `packages` or `spec` changed.
- Scratch files lived in `$TMPDIR/qd89` (verify scripts, vitest JSON reports, the zero-base copy of the script and record, the message with no trailer); the two planted files in `packages/audit/test` were removed with plain commands and `git status --porcelain -- packages spec .changeset` shows nothing.

## Accomplishments

- **Tracer (Task 1):** `89-check.mjs` is `88-check.mjs` with the audit constants (`PLAN_SUBJECT` for 89, `PLANNING_HEAD` b1d9043b, `NEVER_STAGED` whose directory exception is built from the script's own directory name, `ID_TOKENS` for `ADMIT-0N`, `WX-0N`, `89-NN`, `QD-89`, `Phase 89`, `-NEXT` and a decision number, a phrase list with no exemption outside `.changeset/` and spec history, `isSrc` over `packages/{audit,core,devtools}/src`). `vitest` and `suite` run `--project audit` over `packages/audit/test`. On the live tree: `base` prints `phase_base`; the three plan 01 `commit` checks pass (the first with `--first`); `trailers` (4 commits), `scan-ids`, `scan-forbidden` and `seen-failing` on both born files pass; `vitest` prints `vitest: <n> rows in <m> files, 12 failed` and `suite` passes on that report.
- **Judges (Task 2):** `admission-step [--module-only]` (module missing, barrel or `exports` reach, exact imports with `./AuditEntry.ts` type-only, no entry-point module imported, no `Effect.` or `withSpan`, `Number.isFinite` and no bare `isFinite(`, `CodecMade.ts` byte-identical, and in the whole form one `NowNotFinite:` member key and the only callers of `rowsRefusal(` and `Number.isFinite(`); `entry-points-first [names]` (the first statement of `archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` and `planPurge` calls `admitBatch` or `admitRows`, `planPurge` does not call `planRetention`, `verifiedArchiveFacts` takes `AdmittedRows`); `records [--close]` (the pinned-by paragraphs of the kept and new behaviors name tests and titles that exist, and the close judges BEH-QD-781 to 785, INV-QD-423 and 424, the INV-QD-399 and 400 sources, BEH-QD-722, 253 and 254 links, ADR-QD-202 with its six audit rows and `Tests removed: 6.`, the index, ADR-QD-190 and 110, traceability, the CCR row, six revisions and the one changeset). Each clause has a passing twin and a failing variant in the self-test. On the base tree: `admission-step` (both forms) says `packages/audit/src/HostBatch.ts does not exist`, `entry-points-first` refuses the writer first, `records --close` refuses BEH-QD-781 first, `records` passes.
- **Evidence and commit (Task 3):** twelve `- check failed: <mode>: <first stderr line>` lines under `## 89-02 the phase check`, each from a real run, committed with the script as `chore(89-02): add the phase check` (c8c4a2ec) holding exactly those two files and the one trailer.

## Mode success lines

- `base`: the recorded `phase_base`
- `commit: <subject>`, `unchanged: <paths>`, `seen-failing: <file>`
- `vitest: <n> rows in <m> files, <k> failed` and `suite: <k> failing row(s), each red before; <n> base and <m> born test files ran`
- `scan-ids: no id or phase wording in added lines`, `scan-forbidden: no forbidden form in added lines`
- `trailers: <n> commits since phase_base, each with the one trailer`
- `admission-step: HostBatch.ts is a plain, package-private step with its five imports` (module only) and `admission-step: HostBatch.ts is the one plain, package-private admission step; NowNotFinite is stated once and rowsRefusal and Number.isFinite are asked only there`
- `entry-points-first: archiveAuditTrail, verifySequenceIntegrity, planRetention, planPurge each admit the batch first; planPurge does not call planRetention; verifiedArchiveFacts takes AdmittedRows`
- `records: the pinned-by lists name tests that exist` (and `, and every reserved record is written` with `--close`)

## Seen failing (the twelve evidence lines)

`base` (phase_base of forty zeros: `phase_base is not an ancestor of HEAD`), `commit` (the record alone: the commit holds two paths, not one), `unchanged` (`AdmissionOrder.characterisation.test.ts differs from phase_base`), `seen-failing` (`no failure line in the evidence for: no such title`), `vitest` (`the report names no test file`), `suite` (a whole audit report with `--green`: `B1 ... fails`), `scan-ids` (`// D-12` planted), `scan-forbidden` (`y as string` planted), `trailers` (`the message has 0 Co-Authored-By lines, not one`), `records` (`BEH-QD-781 has no heading in spec/behaviors/33-audit-pipeline.md`), `admission-step` (`packages/audit/src/HostBatch.ts does not exist`), `entry-points-first` (`archiveAuditTrail: the first statement of its body does not call admitBatch or admitRows: ...`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The module-scope reader of 88 merged statements after a class with a generic body**
- **Found during:** Task 2, running `entry-points-first` on the real tree: `planRetention: no body found in packages/audit/src/Retention.ts`.
- **Issue:** `export class RetentionInputInvalid extends Data.TaggedError(...)<{ ... }> {}` closes a brace at depth 0 before its own body, so `topLevel` started a statement at `> {}` and swallowed the interface and `planRetention` after it. This is the shortcut the 88 header already names for the reader.
- **Fix:** `functionOf` reads a declaration from its column-0 `const` or `function` to the next column-0 word, never through `topLevel`; the bodies' first statements are still read with `topLevel`. The self-test pins the class-then-interface-then-const shape and a name that only starts another name.
- **Files modified:** `89-check.mjs` (before its commit). **Commit:** c8c4a2ec.

### Plan notes

- **`records` pinned-by reading.** BEH-QD-253 and BEH-QD-254 carry no pinned-by paragraph on the base, so the plain `records` mode requires their heading and judges a paragraph only where one exists; BEH-QD-722 and BEH-QD-781 to 785 must have one naming existing tests. The pinned paragraphs of this document name tests by bare file name (`ForeignRows.test.ts`), so a name is read as a file in `packages/audit/test`, a `packages/...` path as written.
- **`NowNotFinite` key pattern.** The plan states `^\s*NowNotFinite\s*:`; the judge reads `(?:^|[{;,]|readonly)\s*NowNotFinite\s*:` so the single-line form of a declared type counts too (self-tested with the single-line form, a comment, a restatement and none).
- **A first statement that opens a control block is not an admission.** `entry-points-first` refuses a first statement starting `if`, `for`, `while`, `switch`, `try`, `do` or `else` even if the block calls the step, so a conditional admission cannot pass.
- **Import list order.** The reason lists the expected imports in the plan's order (`effect/Data, effect/Predicate, effect/Result, ./AuditEntry.ts (type), ./CodecMade.ts`); `./AuditEntry.ts` is `(type)` only when every import of it is `import type`, and two statements from `./CodecMade.ts` (a value and a type) count as one module.
- **No literal phase directory.** The never-staged directory exception is built from the script's own directory name rather than a literal, so the verify's literal check holds.
- **No phrase exemption.** The 88 exemptions for the upgrade guide and `publishes from now on` are dropped; only `.changeset/` and spec history are exempt (a self-test pins each phrase flagged in source and test and allowed in a changeset).
- **`suite` evidence from the Task 1 report.** The `suite --green` line was recorded against the most recent full audit report written by Task 1 (a real run of the whole project, twelve red rows) rather than a second full run.
- **Verifies ran from script files.** Each `<automated>` block was run as the same text in a scratch script (`bash <file>`), none contains `rm`.
- **Trailer.** Every commit carries `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, the value the phase fixes.

### Auth gates

None.

## Issues Encountered

None that remain. The audit suite is still red by design (twelve `BatchReadOnce.test.ts` rows) until plans 06 and 07 land.

## Next Phase Readiness

- Plans 05 to 07 can judge `HostBatch.ts` and the entry points with `admission-step --module-only` and `entry-points-first <names>` before the wiring is whole; plan 10's records are judged by `records --close`.
- Risk for plan 10: the ADR-QD-202 audit rows must each name an id that opens an audit test title (for example `W1`, `B2`, or a row id the new `HostBatch.test.ts` titles carry), as the check reads it.

## Known Stubs

None.

## Threat Flags

None. T-89-04 (the `commit` mode is a checker only and is self-tested with each wrong case), T-89-05 (`scan-forbidden` fails any change to `AGENTS.md`, `scripts/check-house-style.mjs` or `.oxlintrc.json`), T-89-06 (`admission-step` fails a step reached from the barrel or the `exports` map) and T-89-07 (every mode's failure line is from a real run) are mitigated.

## Self-Check: PASSED

- Files found: 89-check.mjs, 89-RED-EVIDENCE.md, this summary.
- Commit found as an ancestor of HEAD: c8c4a2ec, ending with exactly one `Co-Authored-By: Claude Opus 5.5` trailer; `git rev-list --count 824c4325..HEAD` is 1 before the metadata commit.
- The Task 1 and Task 2 verifies re-ran green; `node 89-check.mjs --self-test` prints `self-test: 377 passed`; oxlint is clean; `git status --porcelain -- packages spec .changeset` prints nothing; no `.vitest/` remains.
