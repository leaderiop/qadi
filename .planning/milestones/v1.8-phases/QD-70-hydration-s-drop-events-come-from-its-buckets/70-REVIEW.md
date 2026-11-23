---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
reviewed: 2026-11-22T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - packages/react/src/HydrationBuckets.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/HydrationEvent.ts
  - packages/react/test/HydrationBuckets.tst.ts
  - packages/react/test/HydrationBuckets.test.ts
  - packages/react/test/HydrationDropEvents.test.ts
  - packages/react/test/HydrationPayload.test.ts
  - .changeset/react-hydration-drop-buckets.md
  - spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md
  - spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md
  - spec/behaviors/19-hydration.md
  - spec/invariants.md
  - spec/README.md
findings:
  critical: 0
  warning: 0
  info: 5
  total: 5
  necessity: 0
status: issues_found
---

# Phase QD-70: Code Review Report (iteration 3)

**Reviewed:** 2026-11-22
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Iteration 2's five findings are fixed and the fixes hold. I read the engine, the bucket module, all four tests, and
the phase's spec diffs, and re-ran the three react test files (3 files, 83 tests, all pass).

Verified against source:

- **WR-01 (INV-QD-385 / INV-QD-045 / ADR-QD-183 / BEH-QD-686 / changeset).** Each now says a reason needs a bucket
  or a named producer, every bucket is emitted, and no type checks that code drops under a reason. This matches
  `HydrationBuckets.ts` and `PAYLOAD_PRODUCERS`/`PAYLOAD_REASONS`. INV-QD-385's Enforcement lists "the eleven pins" of
  `HydrationBuckets.tst.ts`, and the file has exactly eleven `test(...)` blocks with those titles.
- **IN-01 (ADR-QD-152).** The superseded Consequences bullet is kept and marked amended. `bucketOf` appears nowhere in
  source. The only remaining mentions are ADR-QD-152's own history and the CCR-QD-430 row.
- **IN-02 (tst pins).** Every `expect` in the bucket-record pins now compares to the written-out `EntryBucketRecord`
  or `DehydrationBucketRecord`, or to an inverse written out. Each `@ts-expect-error` keeps a positive twin. No
  negative `toBeCallableWith` or `toBeConstructableWith` pin was added, so the AGENTS.md §6 budget table is untouched.
- **IN-03 (characterisation header).** The header now says rows were retitled. A diff against the first commit of the
  file shows the same 32 rows plus 3 added order rows, and the same expected values.
- **IN-04.** The doc comments cite `AGENTS.md §9` and `§5a`, and the spread copy is gone.
- **CCR-QD-462 revisions.** 183 = 1.2, 152 = 1.3, behaviors/19 = 1.26, invariants = 1.172, traceability = 1.241,
  README = 1.284, and overview stays at 1.132. Each equals its document header.
- **Behaviour parity.** The refactor preserves emission order, entry order within a bucket, the foreign-before-
  unencodable rule, and the `Seeded`/`Dehydrated` tail. I found no bug in the engine or bucket module.
- **House rules.** No `as`, `any`, `!`, `switch`, `async` or ambient `console`. Imports are namespace submodule
  imports with `.ts` extensions. WX-07 holds: no D-number, plan id, requirement id or phase number appears in the
  phase's source or test titles.

What remains is five Info items: two spec-text defects the iteration 2 edits left (a wrap defect and a duplicated
link), one stale phrase, and two doc comments that say a little more or less than the code does.

## Info

### IN-01: ADR-QD-183's last Consequences bullet is one 216-column line

**File:** `spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md:99-100`
**Issue:** Iteration 2 reworded this bullet. The second line (`before its drops were collected in records, no existing
row of which has had its expected values changed. No export is added ...`) is 216 columns. Every other line in the
file wraps at about 120. The same edit left `spec/invariants.md` (INV-QD-045's Source/Enforcement paragraph, the lines
starting `its reporter call and its count, written against the engine ...` and `makes a reason with no bucket ...`) at
120-122 columns, beside neighbours of about 85. `spec/behaviors/19-hydration.md` BEH-QD-686 and BEH-QD-690 have the
same ragged breaks: a 100-column line followed by a 46-column one, as in `changed. It pins each reason alone, every
pair` / `and all three, ...`. The owner bar is "very clean", and these lines were written by the phase.
**Fix:** Reflow the ADR bullet at about 120 columns, and re-wrap the INV-QD-045 and BEH-QD-686/690 paragraphs the same
way. This is spec text, so make the edit through `scripts/spec-revise.mjs`.

### IN-02: The ADR-QD-183 row of the traceability table links INV-QD-045 twice

**File:** `spec/traceability.md:380`
**Issue:** The row's linked-ids cell reads `[INV-QD-045](...), [INV-QD-045](...), [INV-QD-323](...)`. The same link is
listed back to back.
**Fix:** Delete the duplicate. This needs a `spec-revise` bump of `spec/traceability.md` to Rev 1.242, and the CCR-QD-462
row in `spec/README.md` must then cite 1.242 (and README bumps to Rev 1.285).

### IN-03: The `HydrationDropEvents.test.ts` traceability row still says "written on the phase base"

**File:** `spec/traceability.md:462`
**Issue:** Iteration 2 (IN-03) replaced "the phase base" and "the base" in INV-QD-045, ADR-QD-183 and the test header,
because the phrase names a git ref that no reader of `spec/` can resolve. This row still says `written on the phase
base, no existing row of which has had its expected values changed`.
**Fix:** Say `written against the engine before its drops were collected in records`, as INV-QD-045 does. Bundle it
with IN-02 so traceability is revised once.

### IN-04: The `HydrationBuckets.ts` header claims more than the module does

**File:** `packages/react/src/HydrationBuckets.ts:7-9`
**Issue:** The header says "The record is now the only place a drop is collected and the only source of its event".
That is false for a whole-payload refusal. `planHydration` raises one `PayloadRefused` event with the entries it was
handed and no bucket, and INV-QD-385, BEH-QD-688 and ADR-QD-183 decision 4 all say so. The comment is true only of
entry and dehydration drops.
**Fix:** Say `the only place an entry drop is collected and the only source of its event; a payload refused whole has
no bucket (ADR-QD-183)`.

### IN-05: The `PAYLOAD_PRODUCERS` doc comment reads as contradicting itself

**File:** `packages/react/src/HydrationEngine.ts:218-220`
**Issue:** It says "A reason with a new producer and no use of its slot compiles, and the conformance test is what
drives each row (ADR-QD-183, amending ADR-QD-152's consequence that such a row compiled everywhere)". "Such a row"
follows a sentence about a row that still compiles. A reader takes the citation to mean ADR-QD-183 changed that, when
it amended a different case: a payload row with no producer named, which now fails.
**Fix:** Drop the citation from that sentence. Put it where the sentence about the compile error is, for example `so a
`payload` row the table gains does not compile here until its producer is stated (ADR-QD-183, amending ADR-QD-152's
consequence that such a row compiled everywhere)`.

---

_Reviewed: 2026-11-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
