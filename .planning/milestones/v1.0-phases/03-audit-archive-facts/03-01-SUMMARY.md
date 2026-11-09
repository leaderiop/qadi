---
phase: 03-audit-archive-facts
plan: 01
subsystem: audit
tags: [fast-check, property-testing, audit-archive, effect-v4]

requires:
  - phase: 02
    provides: "archiveAuditTrail / readAuditArchive and the ArchiveRefusal vocabulary (ARCH-38, ADR-QD-056)"
provides:
  - "Writer-to-reader round-trip property pinned on today's code (D-06)"
  - "Per-refusal tampering property for all seven ArchiveRefusal kinds, with payloads (D-05, D-06)"
  - "Reordering property: refusal at the first descent, acceptance when the reorder leaves archive order (D-03)"
  - "Break-agreement property: archiveAuditTrail and readAuditArchive agree on SequenceBroken and its numbers"
affects: [03-02]

plan_head_before: 801a892e8f7c135b49411e2c41d70e452c8e0b4e
plan_head_after: 33947ec478f08fe638efa42f7c2ed311b7587787

actuals:
  tokens: 2800
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Test-side oracles (claim rule k >= 2, first-descent index) stated independently of the source under refactor"
    - "refusalAs(input, tag) narrows an ArchiveRefusal through ArchiveRefusal.$is, so payload assertions need no cast"

key-files:
  created:
    - packages/audit/test/ArchiveRoundTrip.test.ts
  modified: []

key-decisions:
  - "The file imports only ../src/AuditArchive.ts, ../src/AuditEntry.ts and ./helpers.ts, so it stays unchanged through plan 03-02 and proves the refactor preserved behavior"

requirements-completed: [ARC-04, XC-04]

coverage:
  - id: D1
    description: "readAuditArchive accepts every bundle archiveAuditTrail writes (sequenced, unsequenced, mixed, any order, with or without keyMaterial) after a JSON round trip"
    requirement: ARC-04
    verification:
      - kind: unit
        ref: "packages/audit/test/ArchiveRoundTrip.test.ts#PROPERTY: readAuditArchive accepts every bundle archiveAuditTrail writes"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each ArchiveRefusal kind fires on its own tampering of a written bundle, with its payload"
    requirement: ARC-04
    verification:
      - kind: unit
        ref: "packages/audit/test/ArchiveRoundTrip.test.ts#PROPERTY: each ArchiveRefusal fires on its own tampering of a written bundle"
        status: pass
    human_judgment: false
  - id: D3
    description: "Any reordering is refused as NotInSequenceOrder at the first descent; writer and reader agree on the sequence break"
    requirement: XC-04
    verification:
      - kind: unit
        ref: "packages/audit/test/ArchiveRoundTrip.test.ts#PROPERTY: any reordering of a written bundle is refused at the first entry that sorts before its predecessor"
        status: pass
      - kind: unit
        ref: "packages/audit/test/ArchiveRoundTrip.test.ts#PROPERTY: the writer refuses exactly the inputs the reader reports as SequenceBroken, with the same numbers"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-08
status: complete
---

# Phase 3 Plan 01: Archive round-trip properties Summary

**Four fast-check properties pin the audit archive's writer/reader agreement (round trip, seven per-kind tamperings, first-descent reordering, shared sequence break) on today's code, before the ARCH-48 refactor moves anything.**

## Performance

- **Duration:** about 5 min
- **Completed:** 2026-11-08T03:49Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments
- Round-trip property: 200 runs over `intactInput` (0 to 6 sequenced, 0 to 6 unsequenced entries, shuffled input order, optional `keyMaterial`) through `archiveAuditTrail`, JSON text, `readAuditArchive`. It checks the entry count, `createdAt`, the claim rule (`sequenceIntegrityVerified === k >= 2`, as the test's own oracle), `keyMaterial`, `holds(entry) === 1` for every input row, and the exact archive order.
- Tampering property: nine tamperings covering all seven refusal kinds (gap and duplicate for `SequenceBroken`; swapped sequenced rows and an unsequenced row ahead of a sequenced one for `NotInSequenceOrder`), each applied when its precondition holds, each asserting tag and payload (`version`, `index`, `declared`/`actual`, `expectedSequence`/`actualSequence`, `sequencedCount`).
- Reordering property: a test-side first-descent oracle (key = `sequenceNumber` or `+Infinity`) decides between "succeeds" and `NotInSequenceOrder` at that index, over arbitrary permutations of a written bundle.
- Break-agreement property: for inputs with gaps and duplicates, the writer fails exactly when the reader reports `SequenceBroken`, and both carry the same `expectedSequence` and `actualSequence`.
- `packages/audit/src` is untouched (`git diff --quiet HEAD -- packages/audit/src` exits 0), per D-06.

## Task Commits

1. **Task 1: End-to-end writer, store, reader round trip (tracer)** - `90b0880` (test)
2. **Task 2: Per-refusal tampering, reordering, break agreement** - `33947ec` (test)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `packages/audit/test/ArchiveRoundTrip.test.ts` - the four properties, with `pool`, `stored`, `intactInput`, `refusalOf`, `refusalAs`, `swapped` and `firstDescent` helpers

## Decisions Made
- Narrowed refusals with `ArchiveRefusal.$is(tag)` inside a generic `refusalAs` helper instead of the `if (refusal._tag === ...)` pattern the existing example tests use, so each tampering asserts its payload unconditionally and a wrong tag fails the property rather than skipping the payload check.

## Deviations from Plan

None - plan executed exactly as written.

The tracer feedback gate ran as specified: Task 1's `<verify>` command (vitest, `packages/audit/src` clean, import-set gate, `pnpm lint:style`) was re-run end to end and passed before Task 2 started.

## Issues Encountered
None.

## Known Stubs
None.

## Threat Flags
None. No new network, auth, file or schema surface. T-03-01 (weakened refusal checks letting a tampered bundle become purge evidence) is mitigated as planned by the tampering and reordering properties; they take effect against plan 03-02's refactor.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 03-02 can move `firstSequenceBreak`, `verifySequenceIntegrity` and the ordering and claim rules into the facts module with this file as its safety net; the file must stay unchanged and green through that refactor.

## Self-Check: PASSED

- `packages/audit/test/ArchiveRoundTrip.test.ts` exists; commits `90b0880` and `33947ec` are ancestors of HEAD.
- `pnpm vitest run packages/audit`: 16 files, 283 tests pass. `pnpm lint:style` and `pnpm exec tsc -p tsconfig.test.json` exit 0.
- `FastCheck.property` count is 4; all seven refusal tags appear quoted in the file; the file's `../src/` imports are exactly `AuditArchive.ts` and `AuditEntry.ts`.

---
*Phase: 03-audit-archive-facts*
*Completed: 2026-11-08*
