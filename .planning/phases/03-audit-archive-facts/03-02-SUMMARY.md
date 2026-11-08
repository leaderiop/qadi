---
phase: 03-audit-archive-facts
plan: 02
subsystem: audit
tags: [audit-archive, refactor, effect-v4, fast-check, mutation-testing]

requires:
  - phase: 03-audit-archive-facts
    provides: "ArchiveRoundTrip.test.ts properties (03-01): the safety net this refactor ran under"
provides:
  - "packages/audit/src/ArchiveFacts.ts: archiveFacts (pure), ArchiveFacts, SequenceBreak, SequenceIntegrityError, verifiedArchiveFacts, verifySequenceIntegrity; archive order, claim rule and break computation stated once"
  - "archiveAuditTrail builds from the facts; readAuditArchive recomputes them and compares, refusal vocabulary, payloads and check order unchanged"
  - "SequenceIntegrity.ts reduced to the public re-export of verifySequenceIntegrity and SequenceIntegrityError; SequenceBreak.ts deleted"
affects: [03-03]

plan_head_before: 10bd8c42a7b1cf0c986285045132094bb1bc686e
plan_head_after: bfda25d67fd5fd5440269fda132188fbd1d347e6

actuals:
  tokens: 7300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Writer builds from facts, reader recomputes and compares: one pure function owns the rules both sides share"
    - "Out-of-order index derived from the writer's own comparator (first entry with archiveOrder(previous, entry) > 0), not a second loop"
    - "Unnamed Effect.fn wrapper over a named one, so a public check and an internal one open exactly one span between them"

key-files:
  created:
    - packages/audit/src/ArchiveFacts.ts
    - packages/audit/test/ArchiveFacts.test.ts
  modified:
    - packages/audit/src/AuditArchive.ts
    - packages/audit/src/SequenceIntegrity.ts
    - packages/audit/test/SequenceIntegrity.test.ts
  deleted:
    - packages/audit/src/SequenceBreak.ts

key-decisions:
  - "archiveFacts takes the sequence numbers once (flatMap, then one numeric sort); sequencedCount is that array's length and the break is the first pair that is not previous + 1"
  - "The reader constructs VerifiedArchiveImpl with the decoded entries, never facts.ordered: the reader reads the order and never repairs it (BEH-QD-254)"
  - "verifySequenceIntegrity is an unnamed Effect.fn over verifiedArchiveFacts, so the span qadi.audit.verifySequenceIntegrity appears once per call and UNTRACED_BUDGET is untouched"

requirements-completed: [ARC-01, ARC-02, ARC-03, XC-03, XC-04, XC-05]

coverage:
  - id: D1
    description: "One module computes the archive's order, claim, sequence break and out-of-order index; the claim rule, the comparator and the sort each appear once in packages/audit/src"
    requirement: ARC-01
    verification:
      - kind: unit
        ref: "packages/audit/test/ArchiveFacts.test.ts#archiveFacts"
        status: pass
      - kind: command
        ref: "grep gates: one code line with 'sequencedCount >= 2' (ArchiveFacts.ts); POSITIVE_INFINITY and toSorted only in ArchiveFacts.ts; SequenceBreak.ts absent"
        status: pass
    human_judgment: false
  - id: D2
    description: "archiveAuditTrail builds from the facts and readAuditArchive recomputes and compares them, with unchanged refusals and check order"
    requirement: ARC-02
    verification:
      - kind: unit
        ref: "packages/audit/test/ArchiveRoundTrip.test.ts (unmodified since 03-01)"
        status: pass
      - kind: unit
        ref: "packages/audit/test/AuditArchive.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "SequenceBreak.ts folded and deleted; SequenceIntegrity.ts is one re-export line; the public surface and the span name are unchanged"
    requirement: ARC-03
    verification:
      - kind: command
        ref: "pnpm spec:api (gate 13) exit 0 with spec/overview.md unedited; pnpm circular; pnpm lint:style; pnpm exec tsc -p tsconfig.test.json"
        status: pass
      - kind: unit
        ref: "packages/audit/test/SequenceIntegrity.test.ts#verifySequenceIntegrity"
        status: pass
    human_judgment: false
  - id: D4
    description: "Mutation score for the touched files is no worse than before the refactor"
    requirement: XC-05
    verification:
      - kind: command
        ref: "pnpm exec stryker run stryker.audit.mjs --mutate ArchiveFacts.ts,AuditArchive.ts,SequenceIntegrity.ts: 97 killed, 1 survived, 0 no coverage"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-11-08
status: complete
---

# Phase 3 Plan 02: Archive facts module Summary

**The audit archive's order, claim rule and sequence-break check now live in one pure `archiveFacts` function. The writer builds its bundle from it and the reader recomputes and compares, with refusals, payloads, span name and public surface all unchanged.**

## Performance

- **Duration:** about 2 min of execution after context load (measured from the start record)
- **Completed:** 2026-11-08T03:53Z
- **Tasks:** 3 (Task 3 made no file change)
- **Files:** 2 created, 3 modified, 1 deleted

## Accomplishments

- `ArchiveFacts.ts` holds `archiveFacts(entries)`, which returns the ordered entries, `sequencedCount`, `sequenceIntegrityVerified`, the first `SequenceBreak` and `outOfOrderAt`. The comparator (`archiveOrder`) and the claim (`sequencedCount >= 2`) are each written once, and the comparator is module-private.
- `outOfOrderAt` is the first entry for which `archiveOrder(previous, entry) > 0`, so the reader's order check derives from the writer's comparator and keeps its old meaning ([1,3,2] gives 2, [s1,s2,u,s3] gives 3, [4,4] gives undefined).
- `archiveAuditTrail` runs `yield* verifiedArchiveFacts(entries)` and builds `entries`, `entryCount` and `sequenceIntegrityVerified` from the result. A break still fails `SequenceIntegrityError` with the same `_tag` and fields.
- `readAuditArchive` recomputes `archiveFacts` on the decoded entries and refuses `SequenceBroken`, then `NotInSequenceOrder`, then `UnbackedClaim`, in the same order and with the same payloads. It still builds `VerifiedArchiveImpl` from the decoded entries and never sorts.
- `SequenceIntegrity.ts` is its header disclaimers plus `export { SequenceIntegrityError, verifySequenceIntegrity } from "./ArchiveFacts.ts";`. `index.ts` is untouched and `spec/overview.md` is unedited.

## Task Commits

1. **RED: failing tests for archiveFacts** - `2db0a99` (test)
2. **Task 1: one facts module, read by writer and reader (GREEN)** - `78192b3` (feat)
3. **Task 2: fold SequenceBreak in, public check becomes a re-export** - `bfda25d` (refactor)
4. **Task 3: mutation parity** - no commit, count already within the baseline

**Plan metadata:** committed separately (docs: complete plan)

## TDD

- **RED:** `ArchiveFacts.test.ts` (unit cases for order, claim, break and out-of-order index, plus a 200-run permutation property) was committed before the module existed. The run failed at import (`Cannot find module '../src/ArchiveFacts.ts'`), which the plan specifies as the RED state for a new module. Semantic assessment: this is a load failure, not an assertion failure, so it is weaker RED evidence than a failing assertion. It was not submitted to `check tdd-red-evidence` (plan type is `execute`, not `tdd`), and the unit cases are only meaningful because GREEN then passed them unchanged.
- **GREEN:** `ArchiveFacts.ts` plus the rewire of `AuditArchive.ts`. The facts tests, `ArchiveRoundTrip.test.ts`, `AuditArchive.test.ts`, `SequenceIntegrity.test.ts` and `Retention.test.ts` all pass (91 tests).
- **REFACTOR:** Task 2 folded `SequenceBreak.ts`, moved the error class and the span-bearing wrapper, and reduced `SequenceIntegrity.ts`. `pnpm vitest run packages/audit` stayed green (299 tests across 17 files).

## Mutation parity (Task 3)

Scoped Stryker run on `ArchiveFacts.ts`, `AuditArchive.ts` and `SequenceIntegrity.ts`: **97 killed, 0 timeout, 1 survived, 0 no coverage** (score 98.98). `ArchiveFacts.ts` is 46 killed, 0 survived. `SequenceIntegrity.ts` has no mutants any more, being a single re-export line.

The single survivor is the baseline's third survivor: an `ObjectLiteral` mutation of `ArchiveRefusal.Malformed({ message: ... })` to `Malformed({})` at `AuditArchive.ts:278`. Baseline was 3 (2 in the reader's order loop, now deleted and replaced by the facts' scan which is fully killed, plus this one). Count is 1, which is at or under the baseline of 3. No test was added, because it is not part of this refactor and the plan forbids chasing it beyond parity. `stryker.audit.mjs` is unchanged.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. No new network, auth, file or schema surface. T-03-02 (reader drifting from writer) is mitigated: both read the same `archiveFacts`, and 03-01's tampering and reordering properties passed unchanged after each task. T-03-03 is mitigated: the span `qadi.audit.verifySequenceIntegrity` is defined once, in `ArchiveFacts.ts`, and the writer and the public check both go through it. T-03-04 is mitigated: `ArchiveFacts.ts` is not in the barrel and `pnpm spec:api` passes with `spec/overview.md` unedited.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-03 (records: ADR-QD-110, CCR-QD-387, spec and traceability rows, changeset) can cite `ArchiveFacts.ts` as where the order, claim and break rules now live. The spec and ADR text that names `verifySequenceIntegrity` as the place the rule lives needs the update that plan owns; `SequenceIntegrity.ts` still carries the disclaimers those documents cite.

## Self-Check: PASSED

- Files exist: `packages/audit/src/ArchiveFacts.ts`, `packages/audit/test/ArchiveFacts.test.ts`; `packages/audit/src/SequenceBreak.ts` is absent.
- Commits `2db0a99`, `78192b3` and `bfda25d` are ancestors of HEAD; `git rev-list --count` from the ledger base gives 3.
- `ArchiveRoundTrip.test.ts` is unchanged since its 03-01 commit.
- `pnpm vitest run packages/audit` (299 tests), `pnpm lint:style`, `pnpm circular`, `pnpm spec:api` and `pnpm exec tsc -p tsconfig.test.json` all exit 0.

---
*Phase: 03-audit-archive-facts*
*Completed: 2026-11-08*
