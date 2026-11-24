---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
reviewed: 2026-11-24T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - packages/audit/src/ArchiveFacts.ts
  - packages/audit/src/AuditArchive.ts
  - packages/audit/src/AuditEntry.ts
  - packages/audit/src/Retention.ts
  - packages/audit/src/SequenceIntegrity.ts
  - packages/audit/test/ArchiveFacts.test.ts
  - packages/audit/test/ArchiveRoundTrip.test.ts
  - packages/audit/test/ArchiveWriterInputs.test.ts
  - packages/audit/test/AuditArchive.test.ts
  - packages/audit/test/AuditEntry.characterisation.test.ts
  - packages/audit/test/AuditEntry.test.ts
  - packages/audit/test/AuditEntry.tst.ts
  - packages/audit/test/Retention.test.ts
  - packages/audit/test/SequenceIntegrity.test.ts
  - packages/audit/test/UntrustedSeams.test.ts
  - packages/audit/test/helpers.ts
  - scripts/check-api-surface.mjs
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase QD-77: Code Review Report

**Reviewed:** 2026-11-24
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

The implementation follows 77-CONTEXT.md closely. The brand class, the envelope-first decode, the `now` and `keyMaterial` writer guards and the dead-check removals are all present and match D-01 to D-10. The nine audit test files I ran under the root vitest config pass (204 tests), and `node scripts/check-api-surface.mjs` is green. `oxlint` reports nothing on the scoped files.

The one substantive defect is a gap in the premise behind D-04. The phase makes INV-QD-399 ("every archive the writer returns is read back") and INV-QD-400 ("a row is made only by its codec") hold by type alone, and it removes the runtime guard on that basis. The type does not stop an `any`-typed row, and `JSON.parse` returns `any`. I did not assess necessity findings: I did not read `necessity-review.md`, and I found no candidate worth classifying, so `necessity:` is omitted.

## Warnings

### WR-01: The writer's invariants rest on the compile-time brand alone, and `any` bypasses it with no cast

**File:** `packages/audit/src/AuditArchive.ts:130-154`, `packages/audit/src/ArchiveFacts.ts:20-23`, `packages/audit/src/ArchiveFacts.ts:87-107`
**Issue:** D-04 removed `isSequenceNumber` and `SequenceNumberInvalid`. Its stated ground is "Only a cast can put a non-safe-integer on an `AuditEntry`, the house forbids `as`". That is not true. `JSON.parse(text)` and most store clients (raw SQL rows, `any`-typed ORM results, `structuredClone`) return `any`, which is assignable to `AuditEntry` with no `as`. A JS caller, or a `@qadi/promise` user who does not run the type checker, also gets no protection. `archiveAuditTrail` and `archiveFacts` have no runtime check that an entry came from the codec. So the phase's own failure modes can still occur on that path:
- `archiveAuditTrail([{ record: { ...r, at: null }, extra: 1 }], now)` archives a row that `readAuditArchive` then refuses as `EntryNotDecodable`. This is the exact defect the phase set out to close.
- A `sequenceNumber` of `1.5`, `2.5` now passes `firstBreakIn`, because `2.5 === 1.5 + 1` and no check follows. Before this phase the writer refused it as `SequenceNumberInvalid`. So for `any`-typed input the change loses protection that the old code gave.
- `ArchiveFacts.ts:20-23` documents "a row's `sequenceNumber` is a safe integer here without being checked". That holds only for typed callers.

This is not a regression against the sequence-number rule for typed callers. It is a hole in the stated guarantee for the untyped route, which is how hosts read rows back (the doc comment on `AuditEntry` itself says "a row ... re-parsed later"). `planPurge` stays safe, because a plain object never `Equal`s a class instance, so `holds` returns 0.
**Fix:** Either enforce the brand at run time in the one place that builds a bundle, or narrow the claim in INV-QD-399 and ADR-QD-190 to "typed callers" and say so in the `archiveAuditTrail` doc. A run-time check needs a brand test that only `AuditEntry.ts` can answer, without a new public export. One option is a module-local `WeakSet<object>` filled by `encodeAuditEntry` and `decodeAuditEntry`, with an `assertCodecMade(entries)` helper imported by `AuditArchive.ts` from a non-barrel module. A second option is to move the class into its own non-barrel module and use `instanceof`. In both cases `archiveAuditTrail` fails with a typed error (for example `ArchiveInputInvalid { field: "entries" }`) when any entry is not codec-made, and a test passes `JSON.parse(...)` rows to pin it. If the cost is judged not worth it, record the decision and correct the false "only a cast" sentence in D-04, ADR-QD-190 and the `ArchiveFacts.ts` header.

## Info

### IN-01: The `AuditEntry.ts` header describes a schema-derived row that no longer exists

**File:** `packages/audit/src/AuditEntry.ts:5-12`
**Issue:** The header still says the row is "`Schema`-derived" and that it diverges from the hand-written style of `@qadi/predicate-sql` and `@qadi/predicate-prisma`. D-02 removed the exported schema value, and the row is now a module-local `Data.Class` whose only schema is the private envelope in `decodeRow`. The paragraph's argument ("same condition ADR-QD-002 used to make `Policy` the hand-written-interface exception") now describes a design this file does not have, and it contradicts the class docs below it.
**Fix:** Rewrite the first paragraph. The row is a nominal class made only by its codec, `record` is `@qadi/core`'s wire schema, and the envelope schema is private.

### IN-02: `ArchiveFacts.ts` says `firstBreakIn` "subtracts"

**File:** `packages/audit/src/ArchiveFacts.ts:22-23`
**Issue:** The header says `firstBreakIn` "never subtracts past `2 ** 53`". The function adds: it compares `actual !== previous + 1`. The `n + 1 === n` hazard in `AuditEntry.ts:49-53` is the correct statement.
**Fix:** Say "never adds one past `2 ** 53`" or "never compares past `2 ** 53`".

### IN-03: The decode matrix pins `effect`'s own formatter wording

**File:** `packages/audit/test/AuditEntry.characterisation.test.ts:57-59`, `:76-79`, `:94`, `:104`, `:132`
**Issue:** Rows assert exact strings such as `'Expected an integer\n  at ["sequenceNumber"]'` and `'Expected number | undefined\n  at ["sequenceNumber"]'`. These are produced by `effect` 4.x's issue formatter, not by this package. A catalog bump that rewords them fails the file, with no audit-side defect. ADR-QD-170 chose the decoder's own messages, so the pin is deliberate, but it couples the suite to a third-party string.
**Fix:** Keep the exact `_tag` and `maxDepth` rows as they are. For `Malformed` rows, assert the tag plus a stable fragment (`["sequenceNumber"]`, `["record"]`, `["extra"]`) via `assert.include`. Keep one exact-string row if the ADR requires it, and say which row that is.

### IN-04: The `now` writer tests pass on any failure, and one property is duplicated

**File:** `packages/audit/test/ArchiveWriterInputs.test.ts:24-36`, `:45-55`; `packages/audit/test/ArchiveRoundTrip.test.ts:230-263` and `:312-346`
**Issue:** `writtenIsRead` returns `undefined` for any writer failure (`assert.isString(written.failure._tag)`). The three non-finite `now` tests in `ArchiveWriterInputs` therefore stay green if the writer fails with the wrong error. The exact `ArchiveInputInvalid` tag is pinned elsewhere (`AuditArchive.test.ts:199-208`, `ArchiveRoundTrip.test.ts:400-411`), so there is no coverage hole, but the file's own tests are weaker than their titles. Separately, "the writer refuses exactly the inputs the reader reports as SequenceBroken" (`:230-263`) and "fails as the reader reads" (`:312-346`) now assert the same writer-reader agreement over the same domain, since the unsafe-number axis was removed from the second. `Agreement.test.ts` covers it a third time.
**Fix:** Pass the expected tag into `writtenIsRead` (for example `writtenIsRead(entries, now, options, "ArchiveInputInvalid")`) so a wrong failure is red. Fold one of the two sequence properties into the other.

---

_Reviewed: 2026-11-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Orchestrator disposition (decided autonomously, 2026-11-24, under the owner's standing instruction of 2026-11-22: "always pick the most complete and clean solutions")

**WR-01: fix with a run-time brand check. Do not narrow the claim.** Rejected: narrowing INV-QD-399/INV-QD-400 and ADR-QD-190 to "typed callers". That leaves the phase's own defect reachable from `JSON.parse`, `any`-typed store rows and JS callers. Rejected: `instanceof` alone. It can be imitated with `Object.create(Object.getPrototypeOf(realRow))`. Rejected: restoring per-field `isSequenceNumber` checks. That would put back the duplicated rule that D-04 removed, when one membership test covers every field.
- **Membership set.** A new package-private module `packages/audit/src/CodecMade.ts`. Keep it out of `index.ts` and so unexported, since the barrel is `export *`. It holds a module-scope `const` `WeakSet<object>`, which is not a `let` and so not a `MODULE_STATE_BUDGET` row. It has two functions: one records a row, and one says whether a value is a codec-made row. Both are typed with no `as`, `!` or `any`. `encodeAuditEntry` and `decodeAuditEntry` record every row they make, and only those two functions do.
- **Writer guard.** `archiveAuditTrail` refuses the first entry that is not codec-made with a typed `ArchiveInputInvalid`. That check comes after the `now` check and before the facts. Give `ArchiveInputInvalid` a closed shape that names the entry by its index next to the existing `now` field. The memory rule applies: a closed union states the whole set, never a widened `old | "New"`. Update its exhaustive consumers.
- **Every other public function that takes host-supplied `AuditEntry` values and computes facts gets the same guard.** That is `verifySequenceIntegrity` and `planRetention`. If one of them must not take it, record why. `planPurge` stays safe through `holds()`; say so in its doc.
- **Tests.** Write the test first: a `JSON.parse`d row with `at: null` plus an extra key, and a plain-object pair with `sequenceNumber` 1.5 and 2.5. Show each RED on the current HEAD, then GREEN after the fix. Pin the exact error tag and fields, and show the new check failing once. No `as` in tests: `JSON.parse` already returns `any`, and the house rule bans writing `any`, so route it through a typed `unknown` and a function parameter as needed.
- **Records, same change.**
  - A dated amendment to ADR-QD-190 that corrects the "only a cast" premise and records the run-time brand.
  - Correct the same sentence in the `ArchiveFacts.ts` header and in 77-CONTEXT D-04's ADR-quoted text where it appears in shipped records.
  - Extend the CCR-QD-469 row.
  - Restate INV-QD-399 and INV-QD-400 so they hold at run time.
  - Update the changeset and the upgrade-guide 0.13 section for the new refusal.
  - Add `spec/overview.md` rows only if a public export changes.
  - Reserved ids only. Never run `next-id.mjs`.
- **Mutation.** Re-run the close for every touched group with `77-mutation.mjs`, using the same invocations, and re-commit `77-mutation-close.json`. Kill any survivor with a test. Never re-baseline.
- **Gate.** `pnpm check:pr < /dev/null` must end green.

**IN-01, IN-02: fix as suggested.**
**IN-03: no change. Exact messages are kept on purpose.** ADR-QD-170 chose the strict decoder's own messages, and AROW-04 requires every message change to be shown and tabulated. A dependency bump that rewords them should turn this characterisation red, because that is what it is for. Record this reason in the test file's header comment.
**IN-04: fix both parts.** Pass the expected tag to `writtenIsRead`, and fold the duplicated sequence-agreement property into one.
