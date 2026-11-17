---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
verified: 2026-11-16T19:10:00Z
status: passed
score: 5/5 roadmap success criteria verified; 11/11 requirement IDs satisfied
covered_files:
  - ".changeset/audit-refusal-is-cores.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-01-PLAN.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-01-SUMMARY.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-02-PLAN.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-02-SUMMARY.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-03-PLAN.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-03-SUMMARY.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-04-PLAN.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-04-SUMMARY.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-05-PLAN.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-05-SUMMARY.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-06-PLAN.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-06-SUMMARY.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-07-PLAN.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-07-SUMMARY.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-08-PLAN.md"
  - ".planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-08-SUMMARY.md"
  - "apps/website/src/content/docs/docs/reference/upgrading.md"
  - "packages/audit/src/AuditDecisionSinkLive.ts"
  - "packages/audit/src/AuditEntry.ts"
  - "packages/audit/src/AuditTrailPort.ts"
  - "packages/audit/src/AuditWriteOutcome.ts"
  - "packages/audit/src/AuditWriteReport.ts"
  - "packages/audit/src/UnwrittenRow.ts"
  - "packages/audit/test/AuditLostAgreement.test.ts"
  - "packages/audit/test/AuditRefusal.tst.ts"
  - "packages/audit/test/AuditWriteOutput.test.ts"
  - "packages/audit/test/UnwrittenRow.test.ts"
  - "packages/audit/test/UnwrittenRow.tst.ts"
  - "packages/audit/test/observeLeaf.ts"
  - "packages/core/src/JsonRefusal.ts"
  - "spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md"
covered_digest: "v4:sha256:a03c8f623fb50b5d6358b62c7b5ec9bedd6cfbb48e7dfe85f242007d18d051ab"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 48: Audit reports core's refusal and derives "lost" Verification Report

**Phase Goal:** Audit reports the same refusal type core, forwarding and http use, and the "lost staging" label is derived from the outcome's durability in one place, so the span attribute and the metric/log label cannot disagree about whether a staged write was lost.
**Verified:** 2026-11-16 (re-verified at HEAD 6db92426; first verified at a9b92e7e, phase_base c9fde4ba)
**Status:** passed
**Re-verification:** Yes, at 6db92426. The earlier report went stale because one covered file moved.

### Re-verification at 6db92426: what moved and why

One covered file moved since the first verification: `apps/website/src/content/docs/docs/reference/upgrading.md`, by de3fba19 `docs(49-07)`. That commit appends a new section at the end of the file (27 added lines, 0 removed): "0.13: the dock takes the gate registry, not its instances", for phase 49's `DevtoolsDock` change. It does not touch phase 48's section ("0.13: audit reports core's refusal, and AuditEntryNotEncodable is gone", starting at line 829 and ending with the ADR-QD-161 link). I re-read that section at HEAD: the Before fence is `ts`, the After fence is `typescript` and logs `encodeRefusalAnnotations(e)`, `reason` is documented as gone, the INV-QD-104 caution and the ADR-QD-161 link are intact. The same commit added three changesets for `@qadi/core`, `@qadi/react` and `@qadi/devtools`; none touches `@qadi/audit` or the audit refusal changeset.

Every other covered file is unchanged between a9b92e7e and 6db92426: `git diff a9b92e7e HEAD` over `packages/audit`, `packages/core/src/JsonRefusal.ts`, `.changeset/audit-refusal-is-cores.md` and ADR-QD-161 is empty. Commits since touch only other packages (react, devtools, core gate vocabulary) and `.planning`. Regression checks at HEAD: `vitest --project audit` 28 files / 526 tests pass; `tstyche packages/audit` 9 files / 27 tests / 48 assertions pass; no `packages/*/src` or `packages/*/test` file names `AuditEntryNotEncodable` (hits only in the four CHANGELOG.md histories); `UnwrittenRow.ts` still the one `Match.tagsExhaustive` mapping and `unwrittenDurability` / `lostStaging` have zero hits in `packages/audit/src`. The 11 requirement IDs map unchanged (plans 48-01..48-08 vs REQUIREMENTS.md). Gates not re-run here: the orchestrator reports `pnpm check:pr` exit 0 at f18a93e1, and only `.planning` files changed after it; Stryker was not re-run (the five audit files are byte-identical to the 100% run). Verdict unchanged: passed.

## Goal Achievement

### Observable Truths (ROADMAP success criteria, as amended by D-03a/D-05a/D-06a)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `AuditEntryNotEncodable` deleted; `onRefused` takes core's `SinkRecordNotEncodable`; sentence computed only in core's `describeEncodeRefusal`; audit's one refusal line is core's `reportEncodeRefusal`, byte-identical | VERIFIED | Source grep (`packages apps examples features scripts spec .changeset`, excluding node_modules/lib/coverage/CHANGELOG history) finds the class only in: spec Change History / ADR amendment text kept verbatim by D-14, the upgrade guide's "Before" fence and heading, and the changeset's removal notice. No `packages/*/src` or `packages/*/test` file names it. `AuditEntry.ts:99` `encodeAuditEntry` is `yield* Effect.fromResult(encodeSinkRecord(record))` with no mapping; imports no `Data`/`EncodeRefusal`/`describeEncodeRefusal`. `AuditDecisionSinkLive.ts:91` `onRefused?: (refusal: SinkRecordNotEncodable) => void`; `AuditWriteOutcome.ts:81` `Refused: { readonly refusal: SinkRecordNotEncodable }`; `AuditWriteReport.ts` `emitWriteOutcome` calls `reportEncodeRefusal(o.refusal, { message: "qadi/audit: a decision record could not be encoded for the audit trail; no row was written", onRefused })`. Core change is a doc comment only (`JsonRefusal.ts`, 3+/2-). Type pins `AuditRefusal.tst.ts` pass (tstyche 57 files, 289 tests, 0 failed). |
| 2 | Lost-staging label derived from durability in one place; span attribute and metric/log label cannot disagree; one exhaustive mapping remains and it also picks the unwritten line's level | VERIFIED | `UnwrittenRow.ts` is the only mapping (`unwrittenRow`, `Match.tagsExhaustive` over NotWired/Staged/StageFailed). Three readers: `durabilityOf` (`AuditWriteOutcome.ts:110`, feeds the span's `qadi.audit.durability` at `AuditDecisionSinkLive.ts:253`), `lostLabel` (metric label), `unwrittenLine` (level and wording). `unwrittenDurability`, `lostStaging`, `lostWord`, `warning`/`info` helpers: zero hits in `packages/*/src`. `AuditLostAgreement.test.ts` pins agreement of durability, lost counter, span and Warn level over all eleven leaves (the warning leg over the six unwritten, D-06a). All 28 audit test files / 526 tests pass at HEAD. |
| 3 | `writtenStaging`'s `_tag` ternary replaced by an exhaustive match | VERIFIED | `AuditDecisionSinkLive.ts:118-141`: closed `StageResult` `Data.TaggedEnum` (only `Staged` carries `commit`), module-scope `writtenStaging = Match.type<StageResult>().pipe(Match.tagsExhaustive(...))`, `unwrittenOf = UnwrittenStaging[self._tag]()`. `StageResult`/`writtenStaging`/`unwrittenOf` are unexported (not in barrel; `spec:api` green). `evaluationIdOf`, `outcomePath` and the refusal dispatch are `Match.exhaustive`. |
| 4 | Observable output unchanged for existing inputs, pinned by characterisation tests written on the base | VERIFIED | `AuditWriteOutput.test.ts` (12 rows: all 11 leaves plus hooked Refused), `observeLeaf.ts`, `AuditLostAgreement.test.ts` were committed (6c741117, 9d948867, 4ac286ba) before the first `packages/*/src` change (849050ae); the RED type pin c6a925b7 precedes the tracer. Diff of the three files from 4ac286ba to HEAD changes structure only (leaf-keyed records, a no-hook/hook double run, `LEAF_PATHS`), no expected literal changed. Messages for the four "dropped" lines are now template-built from the row but the pinned literals still pass. Independent Stryker run at HEAD: 100% on all five files. |
| 5 | ADR-QD-161 records the decision after checking ADR-QD-054/056; `@qadi/audit` changeset and `upgrading.md` mark `onRefused`'s new type Breaking | VERIFIED | `spec/decisions/161-...md` exists, indexed in `index.yaml`, traced; 48-01-SUMMARY holds the `## ADR check`. `.changeset/audit-refusal-is-cores.md` is `"@qadi/audit": minor`, body begins `**Breaking.**`, no core changeset. Upgrade guide (`apps/website/.../upgrading.md:829`) has `## 0.13: audit reports core's refusal, and AuditEntryNotEncodable is gone`; Before fence is `ts`, After fence is `typescript` and compiles (`spec:website-examples`: 66 blocks compile). The After example logs `encodeRefusalAnnotations(e)`, not the sentence (INV-QD-104). ADR-QD-056 and ADR-QD-095 carry dated amendments with old text kept. |

**Score:** 5/5 truths verified. No behavior-dependent truth is left unproven: criteria 2 and 4 are exercised by running tests (above), not by presence alone.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/audit/src/UnwrittenRow.ts` | VERIFIED | Substantive, imports only `effect/Match`, package-private (not in `index.ts`), wired from `AuditWriteOutcome.ts` and `AuditWriteReport.ts`; `pnpm circular` clean |
| `packages/audit/src/AuditEntry.ts` | VERIFIED | Class deleted, `encodeAuditEntry` returns core's error unmapped |
| `packages/audit/src/AuditWriteOutcome.ts`, `AuditWriteReport.ts`, `AuditDecisionSinkLive.ts` | VERIFIED | As above; no `switch`, `as`, `!`, `any`, `fnUntraced`, `async` in the phase's added src lines (scoped grep clean; `pnpm lint` house-style "526 file(s) clean (3 declared switch(es))", budgets unchanged: no diff to `scripts/` or `AGENTS.md`) |
| `packages/audit/test/{observeLeaf.ts,AuditWriteOutput.test.ts,AuditLostAgreement.test.ts,AuditRefusal.tst.ts,UnwrittenRow.test.ts,UnwrittenRow.tst.ts}` | VERIFIED | Present and green |
| `.changeset/audit-refusal-is-cores.md`, ADR-QD-161, upgrade entry, BEH/INV/CCR/traceability | VERIFIED | `spec:verify:strict` PASS 21/0/0; BEH-QD-576..580, INV-QD-341..342, CCR-QD-439, ADR-QD-161 each present in spec; no `*-NEXT` placeholder in packages/spec/features |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `durabilityOf` | `unwrittenRow` | WIRED | `AuditWriteOutcome.ts` WriteFailed/Skipped arms |
| `lostLabel`, `unwrittenLine` | `unwrittenRow` | WIRED | `AuditWriteReport.ts` |
| `emitWriteOutcome` Refused arm | core `reportEncodeRefusal` | WIRED | one route, `Match.tag("Refused", ...)` |
| `record` span annotation | `durabilityOf` | WIRED | `AuditDecisionSinkLive.ts:251-254` |
| `writtenStaging`/`unwrittenOf` | `WrittenStaging`/`UnwrittenStaging` | WIRED | `commit` never copied into an outcome's `staging` |

### Data-Flow Trace

Not applicable (no rendered dynamic data). The agreement table follows the real data: it drives the real `AuditDecisionSinkLive` over scripted ports and reads the span, counters and lines.

### Behavioral Spot-Checks and Gates (run by this verifier at HEAD)

| Check | Result |
|-------|--------|
| `pnpm exec vitest run packages/audit` | 28 files, 526 tests passed |
| `pnpm test:tstyche` | 57 files, 289 tests, 606 assertions passed |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` (oxlint + house-style) | exit 0 |
| `pnpm circular` | no cycle |
| `pnpm spec:verify:strict` / `spec:api` / `spec:gates` / `spec:claims` | exit 0 (api: 928 exports documented) |
| `pnpm spec:examples` / `spec:website-examples` | 116 / 66 blocks compile |
| Stryker (`stryker.audit.mjs`, five audit files, run at HEAD) | 100.00 on AuditDecisionSinkLive, AuditEntry, AuditWriteOutcome, AuditWriteReport, UnwrittenRow; 0 survived, 0 no-coverage |

Not re-run by this verifier: `pnpm coverage`, `test:bdd`, `example`, `website`, `spec:package`, `spec:publish`. The orchestrator reports `pnpm check:pr` exit 0 at HEAD source with 99.57% statements and 98.38% branches; I did not reproduce the coverage number.

### Probe Execution

No `probe-*.sh` declared or present for this phase. SKIPPED.

### Requirements Coverage

Plan frontmatter IDs (48-01..48-08) union equals the roadmap's list: AREF-01..04, WX-01..07. No orphans: REQUIREMENTS.md maps AREF-01..04 to Phase 48 and WX-01..07 to "All v1.5 phases", and every ID is claimed by at least one plan.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| AREF-01 | SATISFIED | Truth 1 (wording as amended by D-03a: sentence from `describeEncodeRefusal`, line never carried a reason) |
| AREF-02 | SATISFIED | Truth 2 |
| AREF-03 | SATISFIED | Truth 3 |
| AREF-04 | SATISFIED | Truth 5 (ADR-QD-161, 48-01 ADR check, Breaking changeset) |
| WX-01 | SATISFIED | All gates above re-run green at HEAD; `check:pr` per orchestrator |
| WX-02 | SATISFIED | Reserved ids used and traced; `spec:verify:strict` green; no placeholder id in source/spec; no evidence `next-id.mjs` was run (cannot be proven negative from the tree) |
| WX-03 | SATISFIED | `spec:api` green; overview row for the deleted class removed (only a Change History mention remains, exempt per AGENTS.md section 15); no export added |
| WX-04 | SATISFIED | Scoped grep of added src lines clean; house-style budgets and `AGENTS.md` unchanged; lint green |
| WX-05 | SATISFIED | Committed `48-mutation-base.json` (0.9659 on AuditWriteReport.ts, 1 elsewhere) vs `48-mutation-after.json` (all 1, plus UnwrittenRow.ts at 1); the base was committed alone in d1428895 before any src change; independently re-measured at HEAD: 100 on all five. Coverage thresholds rest on the orchestrator's `check:pr` report |
| WX-06 | SATISFIED | Characterisation and agreement tests committed before the first src commit; RED type pin committed before its tracer; expected literals unchanged since the base |
| WX-07 | SATISFIED | `@qadi/audit` minor changeset marked **Breaking**, upgrade guide entry present; no core changeset (doc-only edit); no release or version-packages activity in the phase commits |

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX in the phase's added lines; no stub returns; no `console`/clock/`process.env`.

### Human Verification Required

None.

### Gaps Summary

No gaps. Notes only, none affecting the verdict:
- The deleted class's name still appears in spec Change History and in preserved old ADR text (ADR-QD-056/095 keep their original passages by D-14), the upgrade guide's Before fence and the changeset's removal notice, all intended.
- Coverage figures and the full `check:pr` run were taken from the orchestrator, not reproduced here.
- An untracked `.vitest/` directory existed before this run (dated 2026-11-15); this verifier did not create it. This run wrote Stryker output under the gitignored `reports/` only.

---

_Verified: 2026-11-16_
_Verifier: Claude (gsd-verifier)_
