---
phase: QD-40-core-owns-describing-a-decode-refusal
verified: 2026-11-14T20:25:00Z
status: passed
score: 4/4 roadmap success criteria verified (plus all 14 requirement IDs)
covered_files:
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-01-PLAN.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-01-SUMMARY.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-02-PLAN.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-02-SUMMARY.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-03-PLAN.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-03-SUMMARY.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-04-PLAN.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-04-SUMMARY.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-05-PLAN.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-05-SUMMARY.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-06-PLAN.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-06-SUMMARY.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-07-PLAN.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-07-SUMMARY.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-08-PLAN.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-08-SUMMARY.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-09-PLAN.md
  - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-09-SUMMARY.md
  - AGENTS.md
  - examples/nextjs-newsroom/src/client/Dock.tsx
  - packages/audit/src/AuditEntry.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/SinkWire.ts
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/Source.ts
  - packages/http/src/DecisionStreamRoute.ts
  - scripts/check-house-style.mjs
covered_digest: "v4:sha256:c944134292730bef62986eec4655d48ba0ab6af62c75eab294bdc146ecd4b5b1"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 40: Core owns describing a decode refusal - Verification Report

**Phase Goal:** Core owns describing a decode refusal (the mirror of ADR-QD-116's encode side), so devtools passes `DecodeRefusal` through instead of renaming it and audit decodes a row's record once.
**Verified:** 2026-11-14 on HEAD 76504b3a (phase base eb5a9406); refreshed 2026-11-14 at a26eece4
**Status:** passed
**Re-verification:** Yes, refresh at the milestone's final head (no gaps were open; the earlier report passed)

## Re-verification at final head

Refreshed at `a26eece4` (arch-wave-9, v1.4 milestone audit). The earlier report passed; the GSD tooling marked it stale because later v1.4 phases edited covered files. All four truths and all 14 requirement IDs were re-checked against the current tree, not the earlier report.

**Later commits that touched covered files:** exactly one, `3eeddb68` (`chore(42-03)`), which edits `scripts/check-house-style.mjs` (2 lines) and `AGENTS.md` (1 line) to move the `DECISION_READ_BUDGET` key from `HydrationEngine.ts` to `SeededQuestion.ts`. It is the react decision-read budget and section 13; it does not touch the untrusted-decode budget, `_NAMES` or the section 7a table that truth 3 depends on. No later commit touched `SinkWire.ts`, `SinkCodec.ts`, `AuditEntry.ts`, `Source.ts`, `index.ts`, `DecisionStreamRoute.ts`, `Dock.tsx` or `Retention.ts`. Phases 41 and 42 changed other files in core (`ValueText.ts`, `Explanation.ts`) and devtools (`Filters.ts`, `Remedies.ts`, `SimulationForm.ts`) and react's seeded question; none is a Phase 40 artifact.

**Evidence re-run on the current tree:**
- `pnpm check:pr < /dev/null` at the final head: exit 0, 16 of 16 steps ran (mutation skipped by design), per the orchestrator's log; I read the log, steps 1 to 16 all present and no failure lines.
- `node scripts/check-house-style.mjs`: 505 files clean (3 declared switches), which includes `[untrusted-decode-table]`, `[untrusted-decode-names]` and the decision-read budget after `3eeddb68`.
- vitest: core `DecodeRefusal` and `SinkCodec` files 3 files / 219 tests pass; audit `AuditEntry*` 2 files / 46 tests pass (the differential and the 60,000-deep `TooDeep` pin); devtools `Source.test.ts` 44 tests pass.
- Source greps: `describeDecodeRefusal`, `decodeRefusalAnnotations`, `decodeRefusalOf` present in `SinkWire.ts`; `AuditEntry.ts` calls `decodeSinkRecordWithJson` once; `MalformedReason`, `reasonOf`, `recordJsonOf` have no match in `packages/*/src` or the example; `onMalformed` takes `refusal: DecodeRefusal`; `Retention.ts` has no diff since the original verified head.
- Mutation (recorded JSON only, Stryker not run): `42-milestone-mutation.json` lists `SinkCodec.ts` 0.97546 (base 0.97546), `SinkWire.ts` 1, `Source.ts` 1, `AuditEntry.ts` 1; none fell.
- Requirements: the union of `requirements:` across 40-01..40-09 PLANs is DREF-01..07 and WX-01..07; REQUIREMENTS.md lists all 14 as checked and Complete. No orphans.

**Outcome:** no regression, no gap; status stays `passed`.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Core exports a total `describeDecodeRefusal` (module-scope `Match.tagsExhaustive`, safe for `unknown` version/message), a tag-only annotations helper, and owns the one `UntrustedValueRefusal` to `DecodeRefusal` mapping; sentinel test shows no annotation carries `Malformed.message` or `UnsupportedVersion.version` | VERIFIED | `packages/core/src/SinkWire.ts`: `decodeRefusalOf`, `describeDecodeRefusal`, `decodeRefusalAnnotations` are all module-scope `Match.type<...>().pipe(Match.tagsExhaustive(...))` or a plain one-key function. `shownVersion` dispatches on `typeof` only (no property read, no `toString`); version is cut at 40 code units and message at 200. Exported through the `export * from "./SinkWire.ts"` barrel. The old `asDecodeRefusal` in SinkCodec.ts and the one in AuditEntry.ts are both gone and both read `decodeRefusalOf`. `packages/core/test/DecodeRefusal.test.ts` has the property-based sentinel test ("no annotation carries a value from the message or the version"), hostile-version tests and the bound tests. I ran it: 5 files, 298 tests pass. |
| 2 | Devtools passes `DecodeRefusal` through: `reasonOf` and `MalformedReason` gone, `onMalformed` receives the refusal | VERIFIED | `packages/devtools/src/model/Source.ts`: `onMalformed?: (frame, refusal: DecodeRefusal) => void`; `reasonOf` and `MalformedReason` deleted; `index.ts` no longer exports `MalformedReason`. `surface.tst.ts` pins its absence with `@ts-expect-error`. A repo-wide grep finds `MalformedReason`/`reasonOf` only in tests, change history and the upgrade guide (historical or absence pins). The default log is annotated by `decodeRefusalAnnotations(refusal)` plus `qadi.frame`, so the `qadi.refusal` key holds only the tag. A throwing callback is contained (`thrownName` is total; logs name/type only). Behaviour is covered by `Source.test.ts` (passes). |
| 3 | Audit decodes a row's record once, taking its JSON form from core's strict decode with no re-encode; output identical on a differential; 60,000-deep is still `TooDeep`; `Retention` untouched; `recordJsonOf` and audit's mapping deleted; `UNTRUSTED_DECODE_BUDGET`, `_NAMES` and AGENTS.md §7a agree in the same task | VERIFIED | `AuditEntry.ts` calls `decodeSinkRecordWithJson(input.record)` once and uses `decoded.success.json` as the entry's record. `recordJsonOf`, its `Schema.decodeUnknownResult`, `asDecodeRefusal` and the `Match`/`UntrustedValueRefusal` imports are deleted; the row-level refusal uses core's `decodeRefusalOf`. Core's `SinkRecordWithJson` is a `Schema.decodeTo` run only through `untrustedDecoder`; `encodeTo` is not used (matches the amended D-03). `AuditEntryDifferential.test.ts` was written on the base and covers an unknown key dropped, key-order permutation, explicit `undefined`, a float, a 60,000-deep record and one nested under an unknown key, UnsupportedVersion rows, three Malformed messages and Retention's count; `AuditEntry.test.ts` pins the 60,000-deep `TooDeep`. `git diff` shows no change to `packages/audit/src/Retention.ts`. Budget: `check-house-style.mjs` has the AuditEntry row removed and SinkCodec 1 to 2, `_NAMES` adds `SinkRecordWithJson`, and AGENTS.md §7a has the same two edits. `node scripts/check-house-style.mjs` passes (498 files clean), which includes `[untrusted-decode-table]` and `[untrusted-decode-names]`. |
| 4 | The break is recorded everywhere a consumer reads it | VERIFIED | `.changeset/devtools-malformed-frame-is-a-decode-refusal.md` (`@qadi/devtools` minor, **Breaking**, five-word map; `MalformedReason` removal; `qadi.reason` to `qadi.refusal`). Also present: `upgrading.md` "0.13: onMalformed receives core's DecodeRefusal", `packages/devtools/README.md`, the website devtools page, `examples/nextjs-newsroom/src/client/Dock.tsx` (uses `describeDecodeRefusal`), `DecisionStreamRoute.ts` comment, BEH-QD-204 (`27-devtools-timeline.md` Rev 1.13, with the five-word note) and the `spec/overview.md` rows. The two companion changesets (core minor, audit patch) are present. The example `api.ts` also dropped its own `refusedBecause` copy for the core describer. |

**Score:** 4/4 truths verified; 0 behavior-unverified (every behavior-dependent truth has a named passing test).

### Requirements Coverage

Plan frontmatter IDs (union of 40-01..40-09) are exactly DREF-01..07 and WX-01..07, the same 14 IDs the ROADMAP lists for Phase 40. No orphans.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| DREF-01 | SATISFIED | ADR-QD-153 committed (251ccd1a) before any code; first code commit is the characterisation tests (038ea477). |
| DREF-02 | SATISFIED | Truth 1. |
| DREF-03 | SATISFIED | Truth 1. |
| DREF-04 | SATISFIED | Truth 2. |
| DREF-05 | SATISFIED | Truth 3. |
| DREF-06 | SATISFIED | Truth 3. |
| DREF-07 | SATISFIED | Truth 4. |
| WX-01 | SATISFIED | Post-review `pnpm check:pr` on HEAD: exit 0, 16 of 17 steps (mutation skipped by design). Log reviewed: tstyche 52 files and 271 tests pass; coverage run 204 files and 5029 tests pass. I re-ran house-style and the five touched test files myself. |
| WX-02 | SATISFIED | ADR-QD-153, CCR-QD-431, BEH-QD-536/537, INV-QD-325 and INV-QD-104 amended. BEH-QD-538..540 and INV-QD-326 are reserved-but-unused and the CCR row says so. |
| WX-03 | SATISFIED | `spec/overview.md` names `describeDecodeRefusal`, `decodeRefusalAnnotations`, `DecodeRefusalAnnotations`, `decodeRefusalOf`, `decodeSinkRecordWithJson`, `DecodedSinkRecord`, and drops `MalformedReason`; gate 13 is inside `check:pr`. |
| WX-04 | SATISFIED | The diff adds no `as`, `!`, `any`, `switch`, `fnUntraced` or ambient APIs. The only budget changes are the SinkCodec 1 to 2 row and the AuditEntry row removal, each with its AGENTS.md table. The `no-refusal-annotation-outside-core` exemption for `SinkWire.ts` is a rule-scope edit made with its comment. |
| WX-05 | SATISFIED | Mutation re-run after the review fixes (40-REVIEW-DISPOSITION.md): SinkCodec.ts 0.97546 vs base 0.97516, SinkWire.ts 1, Source.ts 1, AuditEntry.ts 1. None fell. Coverage thresholds pass in `check:pr`. |
| WX-06 | SATISFIED | Plan 40-02 wrote the five drop words, the Malformed messages and the audit differential on the base before the code plans. |
| WX-07 | SATISFIED | The Breaking changeset and the `upgrading.md` section exist; no version bump or publish in the diff. |

### Anti-Patterns Found

None blocking. No `TBD`/`FIXME`/`XXX` markers were added in the phase's source files. The single-decode transformation costs about 2.19x on `decodeSinkRecord` alone (0.0084 to 0.0184 ms); it is recorded and accepted in ADR-QD-153 (AR-40-01), so it is informational.

### Informational notes

- Commits from 40-05 onward carry the `Co-Authored-By: Claude Sonnet 5.5` line instead of the Opus line the plan check names. The SUMMARYs record this as a plan-verify defect. It has no effect on goal achievement.
- `qadi.reason` was replaced by `qadi.refusal` in devtools' default warning. This is recorded as Breaking in the changeset and the upgrade guide, so it is within the compatibility decision.

### Human Verification Required

None.

### Gaps Summary

No gaps. Every roadmap success criterion and every requirement ID is backed by code, tests and records that I read or ran, not by SUMMARY claims.

---

_Verified: 2026-11-14_
_Verifier: Claude (gsd-verifier)_
