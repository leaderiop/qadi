---
status: complete
phase: 03-audit-archive-facts
source: [03-VERIFICATION.md]
started: 2026-11-08T00:00:00Z
updated: 2026-11-08T04:38:17.917Z
---

## Current Test

[testing complete]

## Tests

### 1. Decide WR-01 — writer accepts sequence numbers the reader refuses (1.5/2.5, 2**53/2**53)
expected: Either the writer refuses them (domain stated once in ArchiveFacts.ts) or BEH-QD-254's "MUST accept every bundle archiveAuditTrail writes" is scoped to safe-integer sequence numbers. Disposition recorded in 03-REVIEW-DISPOSITION.md.
result: pass
resolution: "User delegated the decision (\"do it your self\"). Writer refuses: ArchiveFacts.ts states the domain with the codec's Schema.Int and verifySequenceIntegrity/archiveAuditTrail fail the new public SequenceNumberInvalid before the gap check (ba6e377); spec, ADR-QD-110 (D-48-g), overview and changeset (now minor) updated (ccafcb8). Whole-number-domain property added and shown to fail without the fix. WR-01, IN-01, IN-02 dispositions: fixed."

### 2. Confirm ROADMAP success criterion 4 — `pnpm check:pr` green as one command
expected: `pnpm check:pr` exits 0 on a machine where `playwright install --with-deps chromium` can run (sudo/TTY), e.g. CI.
result: pass
resolution: "User delegated (\"do the second one yourself too\"). Ran the check:pr sequence (package.json `check` minus `pnpm mutation`, as scripts/run-check.mjs --skip-mutation does) at HEAD 86eb55d, all steps exit 0: typecheck, lint, circular, test:tstyche, coverage (153 files / 3928 tests), test:bdd (148 scenarios), spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example (typecheck, 42 tests, build, e2e 30/30), spec:website-examples, website, spec:publish. One substitution, stated: the example's `playwright install --with-deps chromium` was run as `playwright install chromium` — the apt system-deps install needs sudo (no TTY here); chromium-1254 was already installed and its system libraries present, as the 30/30 e2e run shows. CI still exercises the --with-deps form."

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
