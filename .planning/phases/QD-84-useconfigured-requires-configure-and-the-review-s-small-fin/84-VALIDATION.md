---
phase: "84"
slug: "useconfigured-requires-configure-and-the-review-s-small-fin"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-25"
---

# Phase 84 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from `84-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `devtools`) with `@effect/vitest` and `@testing-library/react`; tstyche for `.tst.ts`; Stryker for `src/model/LensSession.ts` |
| **Config file** | `vitest.config.ts` (root); `tstyche.json` with `tsconfig.tstyche.json`; `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools <file> < /dev/null` (from the repository root) |
| **Full suite command** | `pnpm check:pr < /dev/null`, then `pnpm spec:package < /dev/null` |
| **Estimated runtime** | quick ~10 seconds per file; full gate ~20 minutes; Stryker on `LensSession.ts` alone ~several minutes |

---

## Sampling Rate

- **After every task commit:** the one or two vitest files the task touches, plus the matching `84-check.mjs` mode.
- **After every plan wave:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm test:tstyche < /dev/null`, `84-pinned-check.mjs`, `84-earlier-checks.mjs`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null`, `pnpm spec:package < /dev/null`, `bash spec/scripts/verify-traceability.sh --strict`, and the mutation compare, all green.
- **Max feedback latency:** 60 seconds for a task-level check.

---

## Per-Task Verification Map

Task ids are filled in by the plans; this map is by requirement.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| ADPT-01 | A value with `configure` configures on first render and on rebuild | unit | `pnpm exec vitest run --project devtools packages/devtools/test/react/useConfigured.test.tsx < /dev/null` | ✅ (edited, D-08) | ⬜ pending |
| ADPT-01 | `Configurable<I>` accepts the three values; a value with no `configure` is refused | type | `pnpm test:tstyche < /dev/null` (`test/react/useConfigured.tst.ts`) | ❌ W0 | ⬜ pending |
| ADPT-01 | Hidden `Activity` and StrictMode rebuilds configure with current inputs | unit (held) | `pnpm exec vitest run --project devtools packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx < /dev/null` | ✅ held | ⬜ pending |
| ADPT-01 | No adapter, two parameters, `Configurable` declared once | script | `node .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-check.mjs no-adapter` | ❌ W0 | ⬜ pending |
| ADPT-02 | `choose` arms before it publishes; answers true exactly when it changed the snapshot | unit + property (held) | `pnpm exec vitest run --project devtools packages/devtools/test/model/LensSession.test.ts < /dev/null` | ✅ held | ⬜ pending |
| ADPT-02 | `LensSession.ts` declares no `move`, calls no `publish`, arms before `store.set(` | script | `84-check.mjs no-restated-set` | ❌ W0 | ⬜ pending |
| ADPT-03 | One subscription to each store; draw follows the store; handlers read the current list; a dropped guard leaves no overlay | component | `Lens.adapter.test.tsx` (two declared edits) and `test/react/Lens.questions.characterisation.test.tsx` | adapter ✅ / characterisation ❌ W0 | ⬜ pending |
| ADPT-03 | `useLens` has two parameters, one `useStoreSnapshot` per store, no `useRef` | script | `84-check.mjs one-path` | ❌ W0 | ⬜ pending |
| ADPT-04 | Each stop announced once and independently; a second stop remounts only its own box; Restart reaches the rebuilt model | component | `test/react/DockFrame.stops.characterisation.test.tsx`; `TimelineNotice.test.tsx`, `DiagnosticsNotice.test.tsx` held | ❌ W0 | ⬜ pending |
| ADPT-04 | Exactly one `useRef<StopLedger` in `src/react` | script | `84-check.mjs one-ledger` | ❌ W0 | ⬜ pending |
| ADPT-05 | A fresh record with equal fields publishes nothing; a moved capacity publishes | component | `test/react/useTimeline.inputs.characterisation.test.tsx` | ❌ W0 | ⬜ pending |
| ADPT-05 | G43 unaffected | unit (held) | `GatesFeed.test.ts`, `DockRegistryReads.test.tsx` | ✅ held | ⬜ pending |
| WX-02/03/06 | Records: traceability rows, pinned-by lists, held files | script | `84-check.mjs records`; `84-pinned-check.mjs`; `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/spec-revise.mjs --check` | ❌ W0 | ⬜ pending |
| WX-04 | No forbidden construct, no plan-local id | script | `84-check.mjs scan-forbidden`, `84-check.mjs scan-ids` | ❌ W0 | ⬜ pending |
| WX-05 | `LensSession.ts` mutation: no open mutant, no new Survived/NoCoverage/Ignored | mutation | `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/LensSession.ts < /dev/null`, then `84-mutation.mjs` compare | ❌ W0 | ⬜ pending |
| WX-01/07 | Phase gate green; nothing pushed, tagged or released | gate | `pnpm check:pr < /dev/null`; `pnpm spec:package < /dev/null` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `84-check.mjs`, `84-pinned-check.mjs`, `84-mutation.mjs`, `84-earlier-checks.mjs` with their self-tests.
- [ ] `84-mutation-base.json`, taken at `phase_base` on a clean tree.
- [ ] `packages/devtools/test/react/Lens.questions.characterisation.test.tsx`, `DockFrame.stops.characterisation.test.tsx`, `useTimeline.inputs.characterisation.test.tsx`, green on the base.
- [ ] `packages/devtools/test/react/useConfigured.tst.ts` (lands with the signature change).
- Framework install: none.

---

## Manual-Only Verifications

All phase behaviors have automated verification. The `src/react` files are outside every Stryker config and are recorded as unmeasured (D-24).

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
