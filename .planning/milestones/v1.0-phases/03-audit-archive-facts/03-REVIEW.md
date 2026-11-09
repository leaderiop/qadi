---
phase: 03-audit-archive-facts
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - packages/audit/src/ArchiveFacts.ts
  - packages/audit/src/SequenceIntegrity.ts
  - packages/audit/test/ArchiveFacts.test.ts
  - packages/audit/test/ArchiveRoundTrip.test.ts
  - packages/audit/test/AuditArchive.test.ts
  - packages/audit/test/SequenceIntegrity.test.ts
  - .changeset/archive-facts.md
  - apps/website/src/content/docs/docs/packages/audit/capabilities.md
  - spec/README.md
  - spec/behaviors/33-audit-pipeline.md
  - spec/decisions/056-audit-companion-package.md
  - spec/decisions/110-an-archives-facts-are-computed-once.md
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
  necessity: 0
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This is an incremental re-review of `git diff 2c7e5c0..HEAD`. I also read `AuditArchive.ts` and `AuditEntry.ts` for context, because the fix widens the failure channel that `archiveAuditTrail` inherits. I ran the audit tests for `ArchiveFacts`, `ArchiveRoundTrip`, `SequenceIntegrity`, `AuditArchive` and `Retention`: 96 passed. `tsc -p packages/audit --noEmit` is clean.

### Previously reported findings

- **WR-01 (resolved).** The writer now refuses a `sequenceNumber` that fails `Schema.is(Schema.Int)`, the same schema the `AuditEntry` codec uses. `verifiedArchiveFacts` fails `SequenceNumberInvalid { index, sequenceNumber }` before the gap check. I checked each part of the fix against the code.
  - **Reader unaffected:** The reader path is unchanged. `decodeAuditEntry` runs before `archiveFacts`, so `invalidSequenceNumber` is always `undefined` there.
  - **Out-of-order scan:** The restructured scan no longer breaks early, and it still reports the first descent. `outOfOrderAt` is only assigned while it is `undefined`, so later descents cannot overwrite it. `invalidSequenceNumber` uses the same first-wins guard. `ArchiveFacts.test.ts` pins the combination: `[-Infinity, 3, 1]` gives `invalidSequenceNumber.index === 0` and `outOfOrderAt === 2`.
  - **Non-finite inputs:** `Infinity`, `NaN` and `-Infinity` cannot crash `toSorted`, because a `NaN` comparator result reads as `+0`. The invalid check short-circuits before `sequenceBreak` is consulted.
  - **Test oracle:** The new round-trip property over `fc.double()` plus the unsafe constants uses `Number.isSafeInteger` as an oracle independent of the source's `Schema.Int`. Any divergence between the two would fail the property.
  - **House style:** `Data.TaggedError`, `Effect.fn`, no `as`, `import type`, `.ts` extensions, and namespace imports for `effect` submodules all hold.
  - **Barrel:** `SequenceNumberInvalid` is public through `SequenceIntegrity.ts`'s `export *`, and `spec/overview.md` lists it.
- **IN-01 (resolved).** The `ArchiveRoundTrip.test.ts` header is now in the past tense and no longer claims the module does not exist. The `SequenceIntegrity.test.ts` comment now describes `flatMap` instead of the removed `.filter`.
- **IN-02 (resolved).** ADR-QD-110 now cites the exact `stryker run stryker.audit.mjs --mutate ...` command. `stryker.audit.mjs` exists. The count is re-measured as 117 killed and 1 survived. I did not re-run Stryker.

The remaining issues are documentation left behind by the contract change, not defects in the logic.

## Warnings

### WR-02: Two doc comments still describe the pre-fix failure contract

**File:** `packages/audit/src/AuditArchive.ts:85-88` and `packages/audit/src/AuditEntry.ts:74-79`
**Issue:** Neither comment was updated when the writer's failure channel widened to `SequenceNumberInvalid | SequenceIntegrityError`. Neither file is in this phase's changed-file list.
- `AuditArchive.ts:85-88` is the TSDoc of the public `archiveAuditTrail`. It says "Fails with `SequenceIntegrityError` rather than archiving a set of rows already known to have a gap or a duplicate". That is now only half the contract. The function also fails `SequenceNumberInvalid`, which is the reason the changeset bumps the package to `minor`.
- `AuditEntry.ts:74-79` explains the `SequenceNumber` codec. It says `1.5` and `NaN` are `Malformed` even when a row is the only sequenced one, because `verifySequenceIntegrity` "can only refuse them from two samples up". That is false. `verifySequenceIntegrity` now fails `SequenceNumberInvalid` for a single invalid entry, with no minimum sample count. The comment contradicts the invariant the fix just established, and it is the first place a maintainer will look when asking why the writer and reader agree on this domain.

**Fix:**

```ts
// AuditArchive.ts
 * Builds the bundle from the entries' facts (`archiveFacts`, ADR-QD-110). Fails
 * with `SequenceNumberInvalid` for a `sequenceNumber` that is not a safe integer,
 * and with `SequenceIntegrityError` for a gap or duplicate, rather than archiving
 * a set of rows already known to be broken ...

// AuditEntry.ts
 * The optional gap-detection field, declared once for the row schema and the
 * row decode: a safe integer, so `1.5` and `NaN` are `Malformed` on read, and
 * the writer refuses the same numbers up front (`SequenceNumberInvalid`,
 * `ArchiveFacts.ts`), so the two cannot disagree.
```

## Info

### IN-03: The changeset's first paragraph says the same bundles are written, and the second says some are no longer written

**File:** `.changeset/archive-facts.md:5-7`
**Issue:** Paragraph 1 says "The same bundles are written and read, and every `ArchiveRefusal` and its payload is unchanged". Paragraph 2 says the writer now fails for `1.5` and `2 ** 53` numbers it previously archived. Both statements cannot hold, because the set of bundles the writer produces has shrunk (to the ones the reader can read). A reader skimming only the first paragraph will conclude the release is behavior-neutral, which the `minor` bump contradicts. The claim about `ArchiveRefusal` is still accurate.
**Fix:** Qualify paragraph 1, for example: "Every bundle that was written and read back is still written and read back, and every `ArchiveRefusal` and its payload is unchanged." Optionally prefix paragraph 2 with the `**Breaking.**` marker `purge-needs-a-verified-archive.md` uses, since the failure union widens for any caller that matches it exhaustively.

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
