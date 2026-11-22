---
phase: "72"
slug: "a-derived-store-behind-the-dock-model-s-stores"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-22"
---

# Phase 72 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`; tstyche for type tests |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/devtools/test/model/ExternalStore.test.ts packages/devtools/test/model/DockModel.test.ts packages/devtools/test/model/DockModel.characterisation.test.ts --project devtools < /dev/null` (3 files, 113 passed); `pnpm test:tstyche ExternalStore` (4 tests, 4 assertions) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 s per quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run commands
- **After every plan wave:** the quick runs plus `node scripts/check-house-style.mjs`, `node scripts/check-api-surface.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| DERV-01 | The three computed stores' recompute, no-recompute, ordering, throwing-listener and after-close behaviour pinned through `makeDockModel` alone, written green on the base (15 rows); inputs and expected values unchanged since 66ba2bdf, titles and helpers edited in code review | unit | `pnpm exec vitest run packages/devtools/test/model/DockModel.characterisation.test.ts --project devtools < /dev/null` | ✅ | ✅ green |
| DERV-02 | `makeDerivedStore` in `ExternalStore.ts`: key equality over every own enumerable string-keyed field (`Object.entries`; inherited, non-enumerable and symbol-keyed fields not compared), stops after close, notifies once, every listener runs and what they threw is rethrown, parents released even when one throws; key shape refused at compile time | unit + type | `ExternalStore.test.ts` (`describe(makeDerivedStore)`, finalizer and build-failure tests); `pnpm test:tstyche ExternalStore` | ✅ | ✅ green |
| DERV-03 | `DockModel.ts` builds its three computed stores with it; no `let last…`, key compare or `closed` flag remains | unit + gate | `DockModel.test.ts` (store-list test compares names as a set; closed-model regression test); `node scripts/check-house-style.mjs < /dev/null` | ✅ | ✅ green |
| DERV-04 | The rules are tested against `ExternalStore` alone; `DockModel.test.ts` keeps one table-driven test per store showing its key (each key field moves it once, a field outside the key does not) and its order relative to host listeners (in-row assertions: diagnostics and questions listeners read the new snapshot; the services row reads the new wiring state). The diagnostics test lacked an order assertion and gained one (commit 0404251c) | unit | `pnpm exec vitest run packages/devtools/test/model/DockModel.test.ts --project devtools < /dev/null` (61 passed) | ✅ | ✅ green |
| DERV-05 | Stryker scores of `DockModel.ts` (70/70) and `ExternalStore.ts` (77/78, one survivor as on the base) hold; ADR-QD-185 extends ADR-QD-168; count stated once in BEH-QD-700 | mutation, recorded + spec gate | `node .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-mutation.mjs compare` (exit 0, against `72-mutation-close.json`); `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict` | ✅ | ✅ green |
| WX-01 | Merge gate (contribution) | full | `pnpm check:pr < /dev/null`, 17/18 steps green on be831db3, mutation skipped by design | n/a | ✅ green (milestone-wide row) |
| WX-02/03 | Reserved ids only (ADR-QD-185, CCR-QD-464, BEH-QD-696 to 700, INV-QD-389/390); no export added or removed | spec gates | `node scripts/check-api-surface.mjs`; `bash spec/scripts/verify-traceability.sh --strict` | n/a | ✅ green (contribution) |
| WX-04 | No forbidden construct added | lint | `node scripts/check-house-style.mjs < /dev/null` (571 files clean) | n/a | ✅ green (contribution) |
| WX-05 | Stryker score of touched files holds | mutation, recorded | `72-mutation-base.json`, `72-mutation-close.json` (re-closed at fd0c15fb). Not re-run | n/a | ✅ green (contribution) |
| WX-06 | Characterisation and RED pins written on the base; each new check shown failing once | recorded | `72-RED-EVIDENCE.md` | n/a | ✅ green (contribution) |
| WX-07 | No decision, plan or phase id in source or titles; nothing released | gate | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green (contribution) |

*Status: ✅ green · ❌ red · ⚠️ flaky*

WX-01 to WX-07 span the whole milestone; this table records Phase 72's contribution, not their completion.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The characterisation and the RED evidence on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `72-RED-EVIDENCE.md`; 72-01 and 72-03 summaries |
| Nothing released or published | WX-07 | Absence of an action | Cited evidence: `72-08-SUMMARY.md` |

A compute that reads outside its key is refused by the type pin (`ExternalStore.tst.ts`); the store-list test and INV-QD-390 do not claim more than the three `makeDerivedStore` calls.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-22

## Validation Audit 2026-11-22

| Metric | Count |
|---|---|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |
