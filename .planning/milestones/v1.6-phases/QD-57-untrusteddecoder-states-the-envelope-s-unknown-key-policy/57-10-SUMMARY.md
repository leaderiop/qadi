---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 10
subsystem: release-notes
tags: [changeset, upgrading, ccr, unknown-key-policy, breaking-change]
requires: [57-09]
provides:
  - .changeset/core-untrusted-decoder-states-unknown-keys.md, the @qadi/core minor Breaking entry (required unknownKeys, D-01, D-17, D-18, D-20)
  - .changeset/audit-deep-unknown-record-key-ignored.md, the @qadi/audit patch entry (D-20)
  - the devtools changeset and upgrading.md corrected for D-17
  - the upgrading.md 0.13 section for the unknown-key policy
  - the CCR-QD-448 register row (ARCH-104), spec/README.md Rev 1.251
affects: [57-11]
actuals:
  tokens: 6500
  tasks: 2
  commits: 1
plan_head_before: 1654f956f3263555133d0aff8344282d58478200
plan_head_after: e8df4c8dc12564759b7910741ef3fec1a3a7b390
tech-stack:
  added: []
  patterns: ["a Breaking changeset pointing at the 0.13 upgrade section"]
key-files:
  created:
    - .changeset/core-untrusted-decoder-states-unknown-keys.md
    - .changeset/audit-deep-unknown-record-key-ignored.md
  modified:
    - .changeset/devtools-malformed-frame-is-a-decode-refusal.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - spec/README.md
key-decisions:
  - "The core entry carries the break and both widenings; the audit entry states only the widening its readers observe and points to core's"
requirements-completed: [WX-02, WX-03, WX-07]
duration: 9min
completed: 2026-11-19
status: complete
---

# Phase QD-57 Plan 10: the unknown-key policy's changesets, upgrade notes and CCR-QD-448 Summary

The required `unknownKeys` option is recorded as **Breaking** for `@qadi/core` (minor), the D-20 widening has its `@qadi/audit` patch entry, the stale devtools sentence is corrected, `upgrading.md` ends with the 0.13 unknown-key section, and CCR-QD-448 (ARCH-104) closes the register.

## Accomplishments

- `core-untrusted-decoder-states-unknown-keys.md`: the break and its migration (`{ unknownKeys: "refuse" }`), the D-01/D-20 widening (an unknown top-level key nested past the bound decodes; version 3 is `UnsupportedVersion`), the D-17 messages for `decodeStoredRecord` and `decodeStoredRecordString` with every tag kept, and D-18's `environment` now `TooDeep`.
- `audit-deep-unknown-record-key-ignored.md`: `decodeAuditEntry` and `readAuditArchive` widen the same way; the row's and archive's own unknown keys are still refused. No `@qadi/react` changeset (D-09, D-15).
- The devtools changeset and `upgrading.md`'s matching sentence now say both are `Malformed`, a bare record's `message` is the decoder's own (a missing `environment`), and a record the wire does not describe carries the record decoder's.
- `upgrading.md` ends with `## 0.13: untrustedDecoder states the envelope's unknown-key policy`: the break, a compiled `typescript` example, the widening, the was/is message table, the `environment` tag and the ADR-QD-170 link (`spec:website-examples`: 68 blocks compile).
- `spec/README.md` Rev 1.250 to 1.251: the CCR-QD-448 row after CCR-QD-447, `Unused: none`.

## Task Commits

Both tasks land in one commit by design (the plan's single-commit rule): `e8df4c8d` `docs(57-10): the unknown-key policy's changesets, upgrade notes and CCR-QD-448` (five files, trailer last).

## Strict traceability tally

`verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0 (57-09's one FAIL, CCR register coverage, is closed by the new row). `spec-revise --check` passes; `spec:api` prints `api-surface: 936 export(s) documented across 9 package(s)`. The commit-shape script confirms one `docs(57-10)` commit with exactly the five files, no changeset deleted or renamed, no `package.json` or `CHANGELOG.md` change since `phase_base`.

## Deviations from Plan

None - plan executed exactly as written. The overview needed no edit: `UnknownKeyPolicy` was added in 57-05 and no export was removed.

## Known Stubs

None.

## Threat Flags

None. T-57-20 is mitigated (the widening and the changed messages are stated in plain words in the core and audit entries and in the 0.13 section); T-57-21 is mitigated (nothing versioned, no `pnpm changeset version`).

## Next Phase Readiness

Ready for 57-11 (the close scan, `check:pr`, the release check, KEYP-01..05 marked complete).

## Self-Check: PASSED

- `.changeset/core-untrusted-decoder-states-unknown-keys.md` and `.changeset/audit-deep-unknown-record-key-ignored.md` exist; commit `e8df4c8d` is an ancestor of HEAD.
