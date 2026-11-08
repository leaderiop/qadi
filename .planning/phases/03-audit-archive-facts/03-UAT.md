---
status: testing
phase: 03-audit-archive-facts
source: [03-VERIFICATION.md]
started: 2026-11-08T00:00:00Z
updated: 2026-11-08T05:40:00Z
---

## Current Test

number: 2
name: Confirm ROADMAP success criterion 4 — `pnpm check:pr` green as one command
expected: |
  `pnpm check:pr` exits 0 on a machine where `playwright install --with-deps chromium` can run (sudo/TTY), e.g. CI.
awaiting: user response

## Tests

### 1. Decide WR-01 — writer accepts sequence numbers the reader refuses (1.5/2.5, 2**53/2**53)
expected: Either the writer refuses them (domain stated once in ArchiveFacts.ts) or BEH-QD-254's "MUST accept every bundle archiveAuditTrail writes" is scoped to safe-integer sequence numbers. Disposition recorded in 03-REVIEW-DISPOSITION.md.
result: pass
resolution: "User delegated the decision (\"do it your self\"). Writer refuses: ArchiveFacts.ts states the domain with the codec's Schema.Int and verifySequenceIntegrity/archiveAuditTrail fail the new public SequenceNumberInvalid before the gap check (ba6e377); spec, ADR-QD-110 (D-48-g), overview and changeset (now minor) updated (ccafcb8). Whole-number-domain property added and shown to fail without the fix. WR-01, IN-01, IN-02 dispositions: fixed."

### 2. Confirm ROADMAP success criterion 4 — `pnpm check:pr` green as one command
expected: `pnpm check:pr` exits 0 on a machine where `playwright install --with-deps chromium` can run (sudo/TTY), e.g. CI.
result: [pending]

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
