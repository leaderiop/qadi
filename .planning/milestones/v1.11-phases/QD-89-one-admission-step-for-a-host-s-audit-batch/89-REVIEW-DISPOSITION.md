---
phase: 89
review: 89-REVIEW.md
findings:
  - id: CR-01
    severity: critical
    disposition: fixed
    title: "maxAgeOf admitted a non-number limit: null purged everything, a valueOf object was re-coerced per row, a Symbol threw"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "SF1 to SF4 titles stated the trace the rows assert is gone"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "taken.filter(Predicate.isNotUndefined) was a runtime no-op standing in for a refinement"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "NowNotFinite stated once and the HostBatch.ts mutation floor were claimed as enforced by gates that cannot fail on them"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "CCR-QD-481 said ADR-QD-110 gets a dated note; it holds two"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "The mid-phase pinned-check change (22f41722) was honest but looser than needed"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "INV-QD-424's no-defect claim failed for a Proxy list"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "F3 and F4 claimed never reach verifiedArchiveFacts but only asserted admitRows"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "export const IMPOSSIBLE was read by nothing"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "The nominal pins in HostBatch.tst.ts had no positive anchor"
  - id: IN-07
    severity: info
    disposition: fixed
    title: "Stale prose around the moved age rule, one over-long line, package-private types listed as exports"
  - id: SEC-OBS-1
    severity: info
    disposition: fixed
    title: "An exotic list could still be a defect: a full copy before the check (RangeError at length 2^32, a huge sparse list copied in full)"
  - id: SEC-OBS-2..5
    severity: info
    disposition: accepted
    title: "Security observations 2-5: informational; 5 is moot after WR-02"
open: 0
---

# Phase 89 — Review disposition

Findings from `89-REVIEW.md`, plus the observations in `89-SECURITY.md`. All decided autonomously 2026-11-26 under the owner's rule (the most complete and clean fix, not the simplest).

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| CR-01 | critical | fixed | `c9e5fa15`: `maxAgeOf` admits only `typeof value === "number"` and `>= 0` (NaN and negatives refused; `+Infinity`, `0`, `-0` valid); anything else is `MaxAgeInvalid { value }`, never coerced, never thrown. New `MaxAgeAdmission.test.ts` M1–M4, red on the old code. BEH-QD-253, BEH-QD-785, INV-QD-101, INV-QD-424, ADR-QD-202 decision 5 restated in place; the changeset names the fix. The loose coercion was on the base too. |
| WR-02 | warning | fixed | `71a11745`, with IN-03 and SEC-OBS-1 as one design change: `CodecMade.ts`'s `rowsRefusal` became the leaf predicate `isCodecMade`; `HostBatch.ts` holds the `entry is AuditEntry` guard (in `CodecMade.ts` a type-only `AuditEntry` import made `pnpm circular` fail) and `admitRows(entries: unknown)` checks each index as it reads it. The filter, its EQUIVALENT mutant and the list-typed parameter are gone. Overrides D-06 (`CodecMade.ts` byte-identical) under the owner rule; declared in `89-pinned-check.mjs` and the `admission-step` judge. |
| WR-03 | warning | fixed | `f3bc0a7e`: BEH-QD-784 and ADR-QD-202 say "NowNotFinite stated once" is held by construction and by the phase-local `89-check.mjs admission-step` judge, which `pnpm check` does not run; ADR-QD-202 and INV-QD-423 state the measured close and that `pnpm mutation` gates on the audit package's 80% break threshold, not a per-file floor. |
| WR-01 | warning | fixed | `d543046e`: SF1–SF4 retitled to the trace each asserts; the `spanFlips` region is held as its exact lines. |
| IN-01 | info | fixed | `41acbff1`: the CCR-QD-481 row names both ADR-QD-110 dated notes. |
| IN-02 | info | fixed | `84b6692d`: the `direct` region and a new `header` region are exact; every region of the characterisation is exact and a self-test row checks it; an appended F6 row fails the check. The file header and ADR-QD-202's audit name all six regions. |
| IN-03 | info | fixed | `71a11745` (with WR-02): `length` read once, a non-number `length` refused as `EntriesNotAList`, the walk stops at the first refused index; `RowListAdmission.test.ts` X1–X5 (Proxy `length` 2^32 and Infinity refused at index 0 through `admitRows` and all four entry points, no `RangeError`), red on the old code. |
| IN-04 | info | fixed | `bee5f616`: F3 and F4 assert that no `qadi.audit.verifySequenceIntegrity` span opens on refused rows. |
| IN-05 | info | fixed | `867c26a3`: the impossible fault pairs are a comment, declared as the `impossible` region. |
| IN-06 | info | fixed | `5553770b`: two positive anchors (`AdmittedRows["entries"]` is `ReadonlyArray<AuditEntry>`; assignable to `{ entries }`); no callable pin added, `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md table unchanged. |
| IN-07 | info | fixed | `01f7ec14`: retention docs point at the module-private age rule; `AuditArchive.ts` long line re-wrapped; spec listings show package-private types without `export`. |
| SEC-OBS-1 | info | fixed | `71a11745` (with WR-02/IN-03): a 100k sparse list and one with a foreign entry at index 1 stop at index 1 having read two indexes; nothing is copied before it is checked. |
| SEC-OBS-2..5 | info | accepted | 2: a host's throwing accessor is its own throw, carved out by INV-QD-424 on purpose. 3: a sibling re-export of `HostBatch.ts` is caught by `pnpm spec:api` (942 exports unchanged) and the closed `exports` map. 4: the brand is type-only, and `verifiedArchiveFacts` is unreachable from the package entry. 5: moot, the filter is removed. |

Spec edits in the fix round were made in place within this phase's unreleased revisions (CCR-QD-481); no further `spec-revise.mjs` bumps, so `89-check.mjs records --close` and `89-earlier-checks.mjs` hold.

Mutation re-closed at `01f7ec14` (`2d7abb07`): `AuditArchive.ts` 78/78, `ArchiveFacts.ts` 54/54, `Retention.ts` 61/61, `CodecMade.ts` 5/5, `HostBatch.ts` 38/38, nothing survived; `EQUIVALENT` is empty, `EXAMINED` lists the two static guard arrows (killed in a hand run with `ignoreStatic: false`); `compare` green; `phase91_base` `ArchiveFacts.ts` 54/54.

Audit suite 733 tests in 36 files. `pnpm check:pr` exited 0 after the fixes (17 of 18 steps; mutation skipped by definition), on head `41acbff1`.
