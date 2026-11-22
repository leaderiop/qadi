---
phase: "64"
slug: "one-throwing-listener-cannot-silence-the-rest"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-22"
---

# Phase 64 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`, project `devtools` |
| **Config file** | root vitest workspace (`--project devtools`) |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/ExternalStore.test.ts packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/model/DiagnosticsFeed.test.ts packages/devtools/test/model/GatesFeed.test.ts packages/devtools/test/react/useStoreSnapshot.test.tsx packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx packages/devtools/test/react/ServicesPanel.characterisation.test.tsx < /dev/null` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~2 s for the quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run command
- **After every plan wave:** the quick run plus `node scripts/check-api-surface.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| LSTN-01 | Store: a later listener is still called after a throw; two throws give one `AggregateError` in call order with the fixed message; one thrown value (incl. `undefined`, `null`) rethrown as itself; no throw unchanged; subscribe/unsubscribe during notify keep live iteration | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/ExternalStore.test.ts < /dev/null` (14 tests; RED on the phase base: R1..R5 failed, see `64-RED-EVIDENCE.md`) | ✅ | ✅ green |
| LSTN-02 | Each of the three feeds, built through the package root, calls every listener when one throws (TF25, F30, G48); the seam's `notify` rethrows as LSTN-01 states | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/model/DiagnosticsFeed.test.ts packages/devtools/test/model/GatesFeed.test.ts packages/devtools/test/react/useStoreSnapshot.test.tsx < /dev/null` | ✅ | ✅ green |
| LSTN-03 | Every text saying a listener must not throw states the new contract (overview row, BEH-QD-638/656, ADR-QD-173/177, doc comments) | spec gates | `node scripts/check-api-surface.mjs` (939 exports), `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict` (PASS 21, FAIL 0). The wording itself is a manual read, cited under Manual-Only | ✅ | ✅ green |
| LSTN-04 | Dock `*.characterisation.test.tsx` pass with an empty diff; a patch changeset records the change | unit + git | the quick run (three characterisation files pass); `git diff 8f3cb792 HEAD -- '*.characterisation.test.tsx'` is 0 files; `.changeset/devtools-every-listener-is-called.md` is the one `@qadi/devtools` patch | ✅ | ✅ green |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null`, recorded green: orchestrator run on `1a800ebb` (`64-VERIFICATION.md`), 68.1-04 at `cc58b8e6`, final run on `cd7cd3a1` (not re-run here) | n/a | ✅ green |
| WX-02/03 | Reserved ids only (ADR-QD-177, CCR-QD-455, BEH-QD-656, INV-QD-373); traced; overview names every export | spec gates | `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-api-surface.mjs`; `node scripts/spec-revise.mjs --check`; `node scripts/check-dod-table.mjs` (26 steps, 153 references) | n/a | ✅ green |
| WX-04 | No forbidden construct in the diff | lint | `node scripts/check-house-style.mjs < /dev/null` (560 files clean, 3 declared switches) | n/a | ✅ green |
| WX-05 | Stryker score of the four touched files holds | mutation, recorded | `64-mutation-base.json` and `64-mutation-close.json`, same invocation: `ExternalStore.ts` 96.67 to 97.62, the three feeds not lower. Not re-run (Stryker never runs beside another command) | n/a | ✅ green |
| WX-07 | No plan, phase or requirement id in source or test titles | gate | `node scripts/check-house-style.mjs < /dev/null` (placeholder-id rule); grep scan recorded in `64-VERIFICATION.md` | n/a | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The RED cases on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Prose in doc comments, README and spec states the new contract and the D7 window caveat | LSTN-03 | No command parses sentence meaning | Cited evidence: `64-VERIFICATION.md` Truth 3 and its repo-wide sweep; gap at `spec/overview.md:915` closed by `1a800ebb` |
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `64-RED-EVIDENCE.md` (base run: 5 store cases and TF25/F30/G48 red, nine seam mutants each caught); the test commits precede the seam commit |

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
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
