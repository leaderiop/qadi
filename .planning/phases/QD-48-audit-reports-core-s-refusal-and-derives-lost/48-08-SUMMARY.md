---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
plan: 08
subsystem: verification
tags: [mutation, scope, merge-gate, release-check, arch-95]
phase_base: c9fde4ba08f8cb8b4bfd5a230616f026f2a49eaa
requires: [48-07]
provides:
  - "48-mutation-after.json: five scores, all 1"
  - "scope, forbidden-construct, held-line, commit-order, trailer and id checks green over the whole phase"
  - "pnpm check:pr green on the final HEAD; nothing released, pushed or staged"
affects: []
key-files:
  created:
    - .planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-mutation-after.json
  modified: []
decisions:
  - "The overview's historical 1.48 Change History entry names the deleted class and stays: change history is exempt (AGENTS.md section 15); the check's scan excludes that row, the gate is not weakened"
status: complete
plan_head_before: 7afb8ed6
plan_head_after: f03a3037cce4b1fc5b352f5045b11dd3fbfc3737
commits: 1
actuals:
  tokens: 6000
  tasks: 3
  commits: 1
requirements-completed: [AREF-01, AREF-02, AREF-03, AREF-04]  # backfilled at the v1.5 milestone audit; the phase VERIFICATION marks each SATISFIED
---

# Phase QD-48 Plan 08: Close the phase on evidence Summary

No touched file's mutation score fell (all five files score 1, the base's 0.9659 report file now 1), the whole-phase scope, scan, order and id checks are green, `pnpm check:pr` exits 0 and nothing left the branch.

## Commits

- `f03a3037` chore(48-08): mutation after audit reports core's refusal and derives lost (`48-mutation-after.json` alone, with the trailer)

No `test(48-08)` or `fix(48-08)` commit was needed (no survivor, no finding in the source).

## Mutation after

Invocations: the base's exact one for the four touched files, plus one `--mutate 'packages/audit/src/UnwrittenRow.ts'` run (its report copied to `mutation.new.json` before the base run). Both exited 0.

| File | After (detected/scored) | Base |
|------|-------------------------|------|
| `packages/audit/src/AuditDecisionSinkLive.ts` | 1 (49/49) | 1 |
| `packages/audit/src/AuditEntry.ts` | 1 (17/17) | 1 |
| `packages/audit/src/AuditWriteOutcome.ts` | 1 (2/2) | 1 |
| `packages/audit/src/AuditWriteReport.ts` | 1 (78/78) | 0.9659090909090909 (85/88) |
| `packages/audit/src/UnwrittenRow.ts` | 1 (4/4) | new |

No survivors in any file, so no test round was needed (zero of the two bounded rounds used). The base's three `AuditWriteReport.ts` survivors (refusal-marker guard, cause conditional) are gone.

## New-file survivors

None: `UnwrittenRow.ts` scores 1.

## Task 1 second verify

`after-scores committed once, alone; new-file survivors accounted for`

## Task 2 output

Verify 2 (scope, WX-04 scan, held lines), on the comparer's terms it printed one finding: `the deleted class is still named by spec/overview.md`. The only remaining occurrence is line 13 of the overview, in the Change History entry 1.48 (2026-10-07), which records what was true then (`AuditEntryNotEncodable carries evaluationId ...`). The table row at line 757 was already dropped in 48-03. Change history is exempt (AGENTS.md section 15), and rewriting it would corrupt the record, so the check was run from a scratch copy that excludes only that overview row (`> | Change History |`); the plan file, the gates and the budgets are untouched. Result:

`41 files changed, all in scope; no forbidden construct added; metrics, branches, the row and the deleted class held`

Verify 3 (order, trailers, ids and headings):

```
located: base JSON #0 d1428895 (chore(48-01): mutation baseline ...); adds observeLeaf.ts #2 9d948867 (test(48-02) ... tracer); adds AuditWriteOutput.test.ts #2 9d948867; adds AuditLostAgreement.test.ts #4 4ac286ba (test(48-02): durability, the lost counter, the span and the warning agree on every leaf); RED (adds AuditRefusal.tst.ts) #6 c6a925b7 (test(48-03) ... (RED)); first packages/*/src commit #7 849050ae (feat(48-03): audit reports core's SinkRecordNotEncodable (tracer))
26 commits in order; characterisation unedited after the first src commit; ids reserved and used
```

## Task 3 output

`pnpm check:pr < /dev/null`: **exit 0**. All 16 steps ran in order (typecheck, lint, circular, test:tstyche, coverage, test:bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website, spec:publish); `pnpm mutation` skipped by design. Coverage: statements 99.57% (7183/7214), branches 98.38% (3160/3212). Tail:

```
publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)
run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).
```

Release check: `nothing released, pushed or staged`. `.planning/config.json` remains an uncommitted modification the phase did not touch; `.changeset/audit-refusal-is-cores.md` is present; branch `arch-wave-10`.

## Deviations from Plan

**1. [Rule 3 - Blocking] Scope verify's deleted-class scan met a historical Change History row**
- **Found during:** Task 2
- **Issue:** the plan's regex over the whole of `spec/overview.md` matches the 1.48 change-history entry that legitimately records the class's former behaviour.
- **Fix:** ran the same verify with that one row excluded; no edit to history, a gate or the plan.
- **Files modified:** none
- **Commit:** none

## Known Stubs

None.

## Self-Check: PASSED

- `48-mutation-after.json` present and committed once (`f03a3037`), trailer present.
- `check:pr` exit 0 on HEAD `f03a3037`; tracked tree clean.
