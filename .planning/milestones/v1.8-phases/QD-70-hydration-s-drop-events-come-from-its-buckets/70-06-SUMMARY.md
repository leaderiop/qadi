---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
plan: 06
subsystem: spec
tags: [invariants, behaviours, traceability, hydration]
requires: [70-05]
provides:
  - "INV-QD-385 and INV-QD-386 in spec/invariants.md (Revision 1.170); INV-QD-045 and INV-QD-323 restated"
  - "BEH-QD-686 to BEH-QD-690 in spec/behaviors/19-hydration.md (Revision 1.24)"
  - "spec/traceability.md Revision 1.240: section 1, 2, 3 and 4 rows tracing all of them"
affects: [70-07]
tech-stack:
  added: []
  patterns: ["each document revised once, in the task that finishes it"]
key-files:
  created: []
  modified:
    - spec/invariants.md
    - spec/behaviors/19-hydration.md
    - spec/traceability.md
key-decisions:
  - "INV-QD-385 and INV-QD-386 name their enforcement by the real titles read from HydrationBuckets.tst.ts, HydrationDropEvents.test.ts and HydrationPayload.test.ts, not by count alone."
  - "The behaviours describe the code as it is: events EntriesDropped, LeftOut, PayloadRefused, Seeded, Dehydrated; the subject check first on the dehydrate side; hydrate order EntryTooDeep, MalformedEntry, UndecodablePolicy; dehydrate order ForeignSubject, UnencodablePolicy."
requirements-completed: []
duration: 30 min
completed: 2026-11-22
status: complete
commits: 2
plan_head_before: 9a26421c4f14ba42d0292953561fafa0e62b436d
plan_head_after: fe864ec3f22cbec3cd61c218c9a42c5431d19f35
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase 70 Plan 06: INV-QD-385 and INV-QD-386, BEH-QD-686 to BEH-QD-690 and their traceability Summary

The spec now states what the hydration code guarantees: every drop reason has one source and one reporting path, each
side's event order is declared once, and the five behaviours and every row that traces them sit at the revisions
CCR-QD-462 cites.

## What landed

- `spec/invariants.md` 1.170: INV-QD-385 and INV-QD-386 after INV-QD-384, in that order. INV-QD-045 keeps its CCR-QD-430 note
  and gains an `Amended in CCR-QD-462 (ARCH-117)` note, the characterisation in its Enforcement, and ADR-QD-183 and
  INV-QD-385 in Related. INV-QD-323's Enforcement names the three records (`entryBuckets`, `dehydrationBuckets`,
  `PAYLOAD_PRODUCERS`) in place of the engine's former entry record, with its own CCR-QD-462 note. Neither the
  invariants nor the traceability document names the former record.
- `spec/behaviors/19-hydration.md` 1.24: BEH-QD-686 (hydrate side from its record), 687 (dehydrate side, subject check
  first), 688 (each whole-payload reason's stated producer), 689 (the order per side), 690 (each bucketed entry counted
  once), after BEH-QD-488 and before the footer; each one `REQUIREMENT:` in a plain fence, no TypeScript fence.
- `spec/traceability.md` 1.240: section 1's hydration row (BEH-QD-686–690 and `HydrationBuckets.ts`); section 2 rows for
  INV-QD-385 and INV-QD-386 right after INV-QD-384's, INV-QD-323's and INV-QD-045's rows naming the records and the
  characterisation; section 3's ADR-QD-183 row linking the two invariants, INV-QD-045, INV-QD-323 and the five
  behaviours; section 4 rows for `HydrationDropEvents.test.ts` and `HydrationBuckets.tst.ts`, and
  `HydrationPayload.test.ts`'s row naming BEH-QD-688.
- Revisions landed: invariants 1.170, 19-hydration 1.24, traceability 1.240; README stays at 1.282; all four match the
  CCR-QD-462 row.
- verify-traceability strict (Task 2 run): `PASS: 21   FAIL: 0   SKIP: 0`, `158 invariant(s) traced`,
  `140 ADR(s) traced`, `116 ADR(s) agree`. `spec-revise --check` clean; `check-doc-examples.mjs`: 118 block(s) compile.
  Every link in the four files to the seven new anchors resolves to a heading.

## Commits

- 46fd9254: docs(70-06): INV-QD-385 and INV-QD-386, with INV-QD-045 and INV-QD-323 restated
- fe864ec3: docs(70-06): BEH-QD-686 to BEH-QD-690 and their traceability

## Deviations from Plan

### Verification-only (no weakening of any gate)

**1. Task 2 verify, footer position check** - `grep -nxF "_Previous: [18 ...]_"` matches two lines: the file's header
(line 15) and its true footer, so `[ "$prev" -lt "$f" ]` failed on a two-line integer (`the behaviours are not before the
footer`). I ran the same script with `| tail -n 1` on that grep, so it checks the last occurrence, which the following
`tail -n 1 $H` equality also requires.

**2. Task 2 verify, WX-07 added-lines scan** - the check reads `+` lines of `git diff -U0 $B HEAD -- spec`, and the
README and traceability Change History is one long line, so a one-entry revision re-emits the whole line, including old
history text such as `D-20-b` and `D-01` (pre-existing, from CCR-QD-4xx entries). Not added by the phase. I excluded
`^+> | Change History` lines from that scan and, separately, confirmed with `git diff --word-diff=plain` that none of the
236 added fragments in `spec/` holds `D-NN`, `70-0N` or `Phase 70`. Everything else in the verify ran as written
(extracted verbatim from the plan; the rewritten copies are in the scratch directory).

**Total deviations:** 0 auto-fixed, 2 verification-only. **Impact:** none on the committed result.

## Known Stubs

None.

## Threat Flags

None. T-70-13 mitigated (both invariants name the real titles of their tests, and the three records); T-70-14 mitigated
(the verify resolves every link to the seven new anchors, more than 20 links).

## Self-Check: PASSED

- `spec/invariants.md`, `spec/behaviors/19-hydration.md`, `spec/traceability.md` modified and committed; both commits are
  ancestors of HEAD.
- Task 1 verify exit 0; Task 2 verify exit 0 after the two verification-only adjustments;
  `git status --porcelain -- packages spec scripts .changeset` is empty.
