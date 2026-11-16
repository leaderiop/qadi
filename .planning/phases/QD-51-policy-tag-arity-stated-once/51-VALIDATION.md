---
phase: "51"
slug: "policy-tag-arity-stated-once"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-16"
---

# Phase 51 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 with `@effect/vitest`; tstyche 7.2.5 for `*.tst.ts` |
| **Config file** | `vitest.config.ts` (root), `packages/core/vitest.config.ts`, `tstyche.json`, `tsconfig.test.json`, `stryker.config.mjs` |
| **Quick run command** | `node_modules/.bin/vitest run --project core packages/core/test/TraceShape.test.ts packages/core/test/PolicyArity.test.ts packages/core/test/Decision.test.ts packages/core/test/Policy.test.ts` and `node_modules/.bin/tstyche packages/core/test/PolicyArity.tst.ts packages/core/test/Policy.tst.ts packages/core/test/LeafNeeds.tst.ts` |
| **Full suite command** | `node_modules/.bin/vitest run --project core`, `pnpm test:tstyche`, then `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~2 seconds quick; ~4 s core; ~7 s tstyche; ~6 minutes `check:pr` |

---

## Sampling Rate

- **After every task commit:** Run the quick run commands
- **After every plan wave:** `node_modules/.bin/vitest run --project core`, `pnpm test:tstyche`, `node_modules/.bin/tsc -p tsconfig.test.json`, `pnpm circular`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, and Stryker re-run with the base's invocation
- **Max feedback latency:** 10 seconds (quick run)

---

## Per-Task Verification Map

Filled by the planner from the PLAN files' `<verify>` blocks. Requirement → test map (from 51-RESEARCH.md "Validation Architecture"):

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| ARTY-01 | The record has every tag exactly once; `traceShapeOf` reads it; `leafTags` gone | unit + compile | quick run; `node_modules/.bin/tsc -p tsconfig.test.json` | ❌ W0 `PolicyArity.test.ts` | ⬜ pending |
| ARTY-01 | All 16 trace shapes unchanged (incl. foreign children on a leaf, extra children on a wrapper) | characterisation (green on base) | `node_modules/.bin/vitest run --project core packages/core/test/TraceShape.test.ts` | ❌ W0 `TraceShape.test.ts` | ⬜ pending |
| ARTY-02 | Derived `LeafPolicy` identical; `childrenOf` arms typed by arity; `PolicyCases`/`TraceCases` tied; moves refused (checked `@ts-expect-error` negatives) | type | `node_modules/.bin/tstyche packages/core/test/PolicyArity.tst.ts`; `pnpm typecheck` | ❌ W0 `PolicyArity.tst.ts` | ⬜ pending |
| ARTY-02 | Base experiment recorded (move compiles on the base) | record | `51-BASE-EXPERIMENT.md` (edit, command, exit 0) | ❌ W0 | ⬜ pending |
| ARTY-03 | `foldTrace` public and unchanged; `renderTrace`/`diffTraces` walks untouched | existing | `Decision.test.ts`, `RenderTrace.test.ts`, `TraceDiff.test.ts`, `TraceAlignment.test.ts`; `git diff` of their bodies empty | ✅ | ⬜ pending |
| WX-05 | No score drop for `Policy.ts`/`Decision.ts` | mutation | `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Policy.ts,packages/core/src/Decision.ts' < /dev/null` (≈55 s, alone) | base: research Q8 | ⬜ pending |
| WX-06 | Characterisation before change | commit order | git log order | — | ⬜ pending |
| WX-01..04, 07 | gates, ids, overview, banned constructs, breaks | gate | `pnpm check:pr < /dev/null`; `pnpm circular` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Per-task map (from the PLAN files' `<verify>` blocks)

| Task | Requirements | Automated verify | Status |
|------|--------------|------------------|--------|
| 51-01 T1 base facts, reserved ids | WX-02 | base-facts recount at `phase_base`; `git grep -lwF` per reserved id | ⬜ pending |
| 51-01 T2 mutation base | WX-05, WX-06 | `tools/mutation.mjs base` then the JSON shape check; first-commit check (`chore(51-01)` alone, parent `phase_base`) | ⬜ pending |
| 51-02 T1 TraceShape table (tracer) | ARTY-01, WX-06 | `vitest run --project core packages/core/test/TraceShape.test.ts` (19 of 19), tsc, lint; import and commit check | ⬜ pending |
| 51-02 T2 base experiment | ARTY-02, WX-06 | `tools/moves.mjs` → `moves.tsv` check (32 compile, 32 caught), `git apply --check`; commit check; `pnpm check:pr` | ⬜ pending |
| 51-03 T1 RED, record, `traceShapeOf` (tracer) | ARTY-01, ARTY-02 | vitest (TraceShape, PolicyArity, Decision, Policy, Explanation), tstyche (PolicyArity, Policy, LeafNeeds), tsc, `pnpm circular`, lint, api surface; RED-then-GREEN order and content check | ⬜ pending |
| 51-03 T2 `Policy.ts` tie, after proofs | ARTY-02, WX-04 | `tools/proofs.mjs` (every proof as expected), core vitest, `pnpm test:tstyche`; emitted JS equal to the base; commit check; `pnpm check:pr` | ⬜ pending |
| 51-04 T1 ADR-QD-164 | ARTY-03, WX-02 | ADR and `index.yaml` content check; `spec-revise --check`; commit check | ⬜ pending |
| 51-04 T2 BEH, INV, traceability, fence | ARTY-03, WX-02 | headings once each, INV-QD-090 unchanged, traceability ids; `spec-revise --check`, `pnpm spec:verify:strict`, `pnpm spec:examples`; commit check | ⬜ pending |
| 51-04 T3 CCR row, changeset | WX-02, WX-03, WX-07 | CCR row and patch changeset check; overview/AGENTS.md/upgrading.md unchanged; commit check; `pnpm check:pr` | ⬜ pending |
| 51-05 T1 mutation after | WX-05 | `tools/mutation.mjs compare` (`WX-05 holds`); base once, after last | ⬜ pending |
| 51-05 T2 phase scan | ARTY-01..03, WX-04, WX-06 | `tools/scan.mjs` (`phase scan clean`), `pnpm circular`, house style (3 switches); no tools/scripts/config change | ⬜ pending |
| 51-05 T3 close | WX-01, WX-07, ARTY-01..03 | `pnpm check:pr`; release check; ARTY-01..03 complete | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `51-mutation-base.json` — before any `src` edit
- [ ] `packages/core/test/TraceShape.test.ts` — all-tags table, green on the base, before any `src` edit
- [ ] `51-BASE-EXPERIMENT.md` — the recorded move-compiles experiment on the base
- [ ] `packages/core/test/PolicyArity.test.ts` and `PolicyArity.tst.ts` — RED by import until `PolicyArity.ts` exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The base experiment compiles | ARTY-02 / SC2 | It is an edit to source that must be reverted; committing it as code would ship a wrong arity | On the base, apply the recorded edit, run `node_modules/.bin/tsc -p tsconfig.test.json`, record exit 0, `git checkout --` the file; after the change, the same edit fails (the checked negatives automate this direction) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
