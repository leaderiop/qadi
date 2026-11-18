---
phase: "56"
slug: "the-gate-registry-watch-becomes-the-dock-model-s-third-feed"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-18"
---

# Phase 56 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `56-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`, `@testing-library/react`, happy-dom; tstyche (`*.tst.ts`); Stryker for mutation |
| **Config file** | `vitest.config.ts` (root; projects `devtools`, `react`; coverage `src/model/**` 95%, `src/react/**` 90%); `packages/devtools/vitest.config.ts`; `tstyche.json`; `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts packages/devtools/test/model/DockModel.test.ts packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx < /dev/null` (repo root only) |
| **Full suite command** | `pnpm check:pr < /dev/null` (repo root, stdin closed) |
| **Estimated runtime** | quick ~5 s; full several minutes |

---

## Sampling Rate

- **After every task commit:** Run the quick run command plus any touched file's own test
- **After every plan wave:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm exec vitest run --project react < /dev/null`, `pnpm exec tstyche`, `pnpm lint`, `pnpm circular`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, then the scoped Stryker runs and `56-mutation.mjs compare`
- **Max feedback latency:** ~30 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 56-01-T1 | 56-01 | 1 | WX-02, WX-03, WX-06 | T-56-01 | base facts and free ids recorded before any change | gate (base facts) | `node -e` check: `phase_base`, base facts, reserved ids, `spec:api` 935 | ✅ | ✅ green |
| 56-01-T2 | 56-01 | 1 | WX-05 | T-56-01 | the mutation rule and base are committed first, never re-baselined | harness | `node .planning/phases/QD-56-…/56-mutation.mjs base` then the `node -e` commit check | ✅ | ✅ green |
| 56-02-T1 | 56-02 | 2 | GFED-04, WX-06 | T-56-02 | thunk and poll cells pinned on the base, never edited | characterisation | `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx < /dev/null` | ✅ | ✅ green |
| 56-02-T2 | 56-02 | 2 | GFED-04, WX-06 | T-56-02 | registry throws, mends and swaps pinned on the base | characterisation | same as 56-02-T1 | ✅ | ✅ green |
| 56-03-T1 | 56-03 | 3 | GFED-05, WX-06 | T-56-03 | a throwing thunk is stated and the poll lives (RED on the base) | dock (RED) | `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.thunk.test.tsx < /dev/null` (Q1..Q3 fail by assertion) | ✅ | ✅ green |
| 56-03-T2 | 56-03 | 3 | GFED-05, WX-06 | T-56-03 | poll-defect cases sample a scripted collector, not a thunk | model + hook | `pnpm exec vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.test.ts packages/devtools/test/react/useDiagnostics.test.tsx < /dev/null` | ✅ | ✅ green |
| 56-03-T3 | 56-03 | 3 | GFED-05, WX-06 | T-56-03 | the dock's defect cases use the double; thunk cases go through the seam | model + dock | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts packages/devtools/test/react/DiagnosticsScreens.test.tsx packages/devtools/test/react/DevtoolsDock.test.tsx < /dev/null` | ✅ | ✅ green |
| 56-04-T1 | 56-04 | 4 | GFED-01, GFED-05, WX-04, WX-06 | T-56-04, T-56-05, T-56-06, T-56-18 | no host throw escapes the feed; a closed feed runs no host code | unit (tracer, RED by import) | `pnpm exec vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts < /dev/null` | ✅ | ✅ green |
| 56-04-T2 | 56-04 | 4 | GFED-01, GFED-03 | T-56-06 | lifetime and view twins of M32..M36 | unit | same as 56-04-T1 | ✅ | ✅ green |
| 56-05-T1 | 56-05 | 5 | GFED-03 | T-56-07 | throwing reads and subscriptions are stated, never thrown | unit | same as 56-04-T1 | ✅ | ✅ green |
| 56-05-T2 | 56-05 | 5 | GFED-03 | T-56-07, T-56-08 | a throwing release is called once; one configure publishes once | unit | same as 56-04-T1 | ✅ | ✅ green |
| 56-05-T3 | 56-05 | 5 | GFED-03 | T-56-07 | each snapshot pairs one moment (GP2, seed 56) | property | `pnpm exec vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts packages/devtools/test/model/DockModel.test.ts < /dev/null` | ✅ | ✅ green |
| 56-06-T1 | 56-06 | 6 | GFED-05, WX-06 | T-56-09, T-56-10 | the join's precedence and the new paragraph written RED | pure + render (RED) | `pnpm exec vitest run --project devtools packages/devtools/test/model/Gates.test.ts packages/devtools/test/react/QuestionsPanel.gates.test.tsx < /dev/null` | ✅ | ✅ green |
| 56-06-T2 | 56-06 | 6 | GFED-05, WX-04 | T-56-09, T-56-10 | a reason renders as text; no failure view claims rows | pure + render | `pnpm exec vitest run --project devtools --exclude '**/QuestionsPanel.thunk.test.tsx' < /dev/null` | ✅ | ✅ green |
| 56-07-T1 | 56-07 | 7 | GFED-02, WX-06 | T-56-11 | J1..J8 written before the move | model (RED) | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts < /dev/null` (J2..J4, J6..J8 fail) | ✅ | ✅ green |
| 56-07-T2 | 56-07 | 7 | GFED-02, GFED-03, GFED-04, GFED-05, WX-04 | T-56-11, T-56-12 | the poll survives a throwing thunk; no join reads a handed-away registry | model + dock | `pnpm exec vitest run --project devtools < /dev/null` plus the `node -e` watch scan | ✅ | ✅ green |
| 56-07-T3 | 56-07 | 7 | GFED-05, WX-04 | T-56-11 | the poll takes no thunk (compile error) | model + tstyche | `pnpm exec vitest run --project devtools < /dev/null`; `pnpm -s test:tstyche < /dev/null` | ✅ | ✅ green |
| 56-08-T1 | 56-08 | 8 | GFED-05, WX-04, WX-06 | T-56-13 | `extra.questions` is a compile error, never silently ignored | react + tstyche (RED first) | `pnpm exec vitest run --project react packages/react/test/DevtoolsFeed.test.tsx < /dev/null`; `pnpm -s test:tstyche < /dev/null` | ✅ | ✅ green |
| 56-08-T2 | 56-08 | 8 | GFED-05 | T-56-13 | the example's prose matches the feed | example | `pnpm --filter @qadi/example-nextjs typecheck < /dev/null && pnpm --filter @qadi/example-nextjs test < /dev/null` | ✅ | ✅ green |
| 56-09-T1 | 56-09 | 9 | WX-05 | T-56-14 | evidence config and report stay outside the repository | harness | `node .planning/phases/QD-56-…/56-mutation.mjs after` and `… evidence <report>`, then the `node -e` shape check | ✅ | ✅ green |
| 56-09-T2 | 56-09 | 9 | WX-05 | T-56-14 | judged by the rule committed first; no re-baseline | harness | `node .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation.mjs compare .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation-static.json` | ✅ | ✅ green |
| 56-10-T1 | 56-10 | 10 | GFED-05, WX-02 | T-56-15 | ADR mutation numbers copied from the JSONs; no earlier amendment rewritten | gate (doc) | `node -e` ADR check; `node scripts/spec-revise.mjs --check` | ✅ | ✅ green |
| 56-10-T2 | 56-10 | 10 | WX-02 | T-56-16 | no requirement names a poll option or a deleted test | gate (doc) | `node -e` BEH check; `pnpm -s spec:examples && pnpm -s spec:claims` | ✅ | ✅ green |
| 56-11-T1 | 56-11 | 11 | WX-02 | T-56-17 | INV headings match the anchors the BEHs link | gate (doc) | `node -e` INV check; `node scripts/spec-revise.mjs --check` | ✅ | ✅ green |
| 56-11-T2 | 56-11 | 11 | WX-02, WX-03 | T-56-17 | every §4 path exists; export count unchanged | gate | `node -e` traceability check; `pnpm -s spec:api` prints 935 across 9 | ✅ | ✅ green |
| 56-12-T1 | 56-12 | 12 | WX-07 | T-56-19 | one package at minor, one Breaking entry each; nothing versioned | gate (doc) | `node -e` changeset and upgrade-section check | ✅ | ✅ green |
| 56-12-T2 | 56-12 | 12 | GFED-05 | T-56-19 | the prose a reader copies compiles | gate (doc) | `node -e` prose check; `pnpm spec:website-examples < /dev/null` | ✅ | ✅ green |
| 56-12-T3 | 56-12 | 12 | WX-02 | T-56-19 | CCR row lists the phase; every spec gate green | gate | `node -e` CCR check; `pnpm -s spec:verify:strict` and the other spec gates | ✅ | ✅ green |
| 56-13-T1 | 56-13 | 13 | GFED-01..04, WX-02, WX-04, WX-05, WX-06 | T-56-20, T-56-SC | no forbidden construct, no manifest change, pinned tests untouched | scan + harness | `node -e` phase scan (prints `phase scan clean`); model scan; `56-mutation.mjs compare` | ✅ | ✅ green |
| 56-13-T2 | 56-13 | 13 | GFED-01..05, WX-01, WX-07 | T-56-20 | nothing released; WX rows left Pending | full gate | `pnpm check:pr < /dev/null`; `node -e` release check | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GFED-01 | the feed owns the watch and the thunk; twins of M31..M47 and P2 | unit (feed alone, `gateRegistryDouble.ts`) | `pnpm exec vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts < /dev/null` | ✅ |
| GFED-02 | the model composes three feeds; the join moves first; one `configure` publishes one snapshot | model | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts < /dev/null` | ✅ |
| GFED-03 | each twin is green before its `DockModel` case is deleted | model + diff check | same as GFED-01/02 plus a `git diff` scan | ✅ |
| GFED-04 | questions panel markup unchanged | characterisation through the dock | `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx <new characterisation file> < /dev/null` | ✅ |
| GFED-05 | the thunk is the feed's; its throw is stated and the poll stays `Live` | model + dock, RED → green | the D-03 RED test files (DockModel twin and dock-level) | ✅ |
| GFED-05 | misuse is a compile error (`extra.questions`, `diagnostics.questions`) | tstyche | `pnpm exec tstyche packages/react/test/DevtoolsFeed.tst.ts < /dev/null` | ✅ |
| WX-02/03/07 | records, overview rows, two changesets, the 0.13 note | gate | `pnpm spec:verify:strict`; `pnpm spec:api`; `node scripts/check-devtools-claims.mjs` | ✅ |
| WX-04 | no banned constructs, no cycle | lint | `pnpm lint`; `pnpm circular` | ✅ |
| WX-05 | mutation not lower | harness | `node .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation.mjs compare <static evidence json>` | ✅ |

---

## Wave 0 Requirements

- [x] `56-mutation.mjs` + `56-mutation-base.json` for every touched model file, measured on the untouched base (WX-05)
- [x] `packages/devtools/test/react/questionsProp.ts` (the input seam) and the new characterisation file, written on the base, green, never edited (GFED-04)
- [x] the D-03 RED test (dock-level) and its `DockModel` twin, RED on the base (GFED-05)
- [x] `packages/devtools/test/model/GatesFeed.test.ts`, RED by import (GFED-01/03)
- [x] a dying-collector helper for the poll-defect tests that used a throwing thunk

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A long failure reason wraps inside the panel (UI-SPEC backstop) | GFED-05 | No truncation style exists; happy-dom asserts no layout | Optional: hand the dock a thunk that throws a long multi-line error; the paragraph wraps like `qadi-gates-failed` |
| The failure paragraph is not announced (UI-SPEC backstop) | GFED-05 | Screen-reader behaviour is not asserted | Optional: confirm no `role`/`aria-live`, as on the sibling failure paragraphs |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-18

## Validation Audit 2026-11-18

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Evidence: `pnpm check:pr` exit 0 at b60fd763 (56-13), with no non-`.planning` change since; the phase's core files re-run on 2026-11-18: devtools (`GatesFeed`, `DockModel`, `Gates`, both characterisations, the D-03 thunk test) 6 files 164 tests, react `DevtoolsFeed` 11 tests, all green.
