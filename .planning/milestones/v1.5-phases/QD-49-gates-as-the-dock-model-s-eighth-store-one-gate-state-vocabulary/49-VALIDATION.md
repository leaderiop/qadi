---
phase: "49"
slug: "gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-16"
---

# Phase 49: Validation Strategy

> The validation contract for feedback sampling during this phase's execution. Seeded from `49-RESEARCH.md` § Validation Architecture, together with the user's decisions D-01..D-19 (49-CONTEXT.md).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Unit tests: vitest with `@effect/vitest` (`it.effect`), projects `core`, `react` and `devtools`. Panels: `@testing-library/react` on happy-dom. Properties: fast-check. Type pins: tstyche 7.2.5. Per-file mutation comparison: Stryker 10.1.1 (`stryker.config.mjs` for core, `stryker.react.mjs`, and `stryker.devtools.mjs`, each run with `--mutate`). |
| **Config file** | `vitest.config.ts` (`projects: ["packages/*"]`), the tstyche default config, `stryker.config.mjs`, `stryker.react.mjs`, `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/Gates.test.ts packages/devtools/test/model/DockModel.test.ts`, plus the phase's new files. For core, `pnpm exec vitest run --project core packages/core/test/GateState.test.ts`. Always run from the repo root. |
| **Full suite command** | `pnpm check:pr < /dev/null`, which is all of `pnpm check` except `pnpm mutation` |
| **Type check** | `pnpm exec tsc -p tsconfig.test.json` (about 30 s) |
| **Estimated runtime** | Quick runs take about 5 s, `check:pr` about 5 minutes. |

---

## Sampling Rate

- **After every task commit:** the quick run for the touched package, plus `pnpm exec tsc -p tsconfig.test.json` whenever types move.
- **After every plan wave:** `pnpm check:pr < /dev/null`, plus the Stryker runs after the store lands.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` is green, and the mutation comparison of `49-mutation-after.json` against `49-mutation-base.json` shows no touched file's score falling.
- **Max feedback latency:** 60 seconds.
- **RED files:** until the task that fixes it, a task's verify leaves the not-yet-fixed RED file out, naming it by its exact path.

---

## Per-Task Verification Map

Each plan fills in its own tasks. The requirement map below is the contract.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| GATE-01 | The five words, their order, the guard, own keys only | unit | `pnpm exec vitest run --project core packages/core/test/GateState.test.ts` | Wave 0 | ✅ green |
| GATE-01 | The union is written out, and `isGateState` narrows a string | type | `pnpm exec tstyche packages/core/test/GateState.tst.ts` | Wave 0 | ✅ green |
| GATE-01 | React's `GateRenderState`, `DecisionOutcome["_tag"]` and core's `GateState` are one set, both directions | type | `pnpm exec tstyche packages/react/test/DecisionOutcome.tst.ts` | exists, edited | ✅ green |
| GATE-01 | A sixth core word is a devtools compile error | typecheck | `pnpm exec tsc -p tsconfig.test.json` (negative control recorded as a RED demo in the SUMMARY, not committed) | n/a | ✅ green |
| GATE-02 | An unknown state (`Suspended`, `toString`, `""`) is `Unrecognised`; `GATE_STATES` keeps its order | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/Gates.test.ts` | exists (`:220-238`) | ✅ green |
| GATE-02 | The panel shows an unknown state as itself, with `data-treatment="Unrecognised"` | characterisation | `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx` | Wave 0 | ✅ green |
| GATE-03 | `joinQuestions` covers Absent, Empty and Listed gates; Unsampled, Absent, Empty and Rows questions; and instance identity | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/Gates.test.ts` | exists, extended | ✅ green |
| GATE-03 | The store recomputes on a poll and on a registry notify, keeps its reference on a quiet tick, releases with its scope, and swaps on `configure` | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | exists, extended | ✅ green |
| GATE-03 | The panel renders the snapshot with the D-12a text; lens, pick and highlight are unchanged | component | `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.gates.test.tsx packages/devtools/test/react/QuestionsPanel.test.tsx packages/devtools/test/react/VerdictTreatment.test.tsx` | exist, harness changed | ✅ green |
| GATE-03 | `GateRegistryLike` accepts react's `GateRegistry` (`atoms.gates`), and `DevtoolsFeed.gates` is the registry (D-18) | type + unit | `pnpm exec tsc -p tsconfig.test.json`; `pnpm exec vitest run --project react packages/react/test/DevtoolsFeed.test.tsx` | Wave 0 / exists, edited | ✅ green |
| GATE-04 | The rows of every snapshot equal the join of one moment, with interleaved registry changes and poll ticks under `TestClock` | property | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | Wave 0 (in an existing file) | ✅ green |
| GATE-05 | Uninstrumented, nothing is registered and the panel shows the absent message; the react suite passes, except the named D-03 and D-18 edits | integration | `pnpm exec vitest run --project react` | exists | ✅ green |
| GATE-05 | Activity hide/show and StrictMode leave one registry subscription | component | `pnpm exec vitest run --project devtools packages/devtools/test/react/DevtoolsDock.test.tsx` | extended | ✅ green |
| WX-01 | The merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ✅ green |
| WX-02 | Only reserved ids are used (ARCH-96, ADR-QD-162, CCR-QD-440, BEH-QD-581..585, INV-QD-343..344) | lint | `pnpm lint` (`[no-numbering-placeholder]`) | ✅ | ✅ green |
| WX-03 | The overview names every export (`GateState`, `gateStates`, `isGateState`, `GateRegistryLike`) | gate 13 | `pnpm spec:api` | ✅ | ✅ green |
| WX-04 | Nothing forbidden is added, and the budgets are unchanged | lint + scan | `pnpm lint`; `git diff <base> -- scripts/check-house-style.mjs` is empty | ✅ | ✅ green |
| WX-05 | Coverage holds, and no touched file's Stryker score drops | coverage + mutation | `pnpm coverage`; the `--mutate` runs, then the comparison against `49-mutation-base.json` | Wave 0 (`49-mutation-base.json`) | ✅ green |
| WX-06 | Tests come before the change | git order | The base JSON and the characterisation precede the first `packages/*/src` edit | n/a | ✅ green |
| WX-07 | The changes are recorded: core minor; react minor, Breaking; devtools minor, Breaking; the upgrade fence compiles | file + gate | `.changeset/*.md`; `pnpm spec:website-examples` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `49-mutation-base.json`, committed alone as the phase's first commit. It holds the base scores for:
  - devtools `model/DockModel.ts` and `model/Gates.ts`;
  - react `GateWriter.ts` (and `DevtoolsFeed.ts` if instrumentable);
  - core `GateState.ts`, recorded as `new`.

  `QuestionsPanel.tsx` and `DevtoolsDock.tsx` are recorded as not instrumentable.
- [x] `packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx`. Twelve cells go through the public dock, with golden literals captured on the base and a one-function `gatesProp` helper. It is committed before any `packages/*/src` edit.
- [x] `packages/core/test/GateState.test.ts` and `GateState.tst.ts`, modelled on `HydrationMetrics.test.ts`/`.tst.ts`. They stay RED until `GateState.ts` exists.
- [x] The two-way pin in `packages/react/test/DecisionOutcome.tst.ts`.
- [x] The `DockModel.test.ts` store cases and the one-moment property.
- [x] An Activity/StrictMode registry-subscription case in `DevtoolsDock.test.tsx`.
- [x] A permanent type test that `GateRegistry`/`atoms.gates` is assignable to `GateRegistryLike`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A sixth core word fails to compile in devtools and in the react pin | GATE-01 | It is a negative control, so committing it would break the build | Add a sixth key to the core table and run `pnpm exec tsc -p tsconfig.test.json` and `pnpm test:tstyche`. Record the errors in the SUMMARY, then `git checkout -- packages/core/src/GateState.ts` and confirm `git status` is clean. |
| Long policy labels wrap without truncation | UI-SPEC long-text (backstop) | A visual check; no wording or style changes | Optional: render the dock with a long policy label and confirm it wraps. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-16 (all twelve requirements covered by automated tests, green on the final head; the dock lifetime cases were shown to fail when the registry finalizer skips its unsubscribe — 3 of 68 red — then restored)

## Validation Audit 2026-11-16

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
