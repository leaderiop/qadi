---
phase: "59"
slug: "admission-produces-the-one-walk-environment"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-19"
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `59-RESEARCH.md` § Validation Architecture and CONTEXT D-01..D-18.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`; tstyche (`*.tst.ts`); Stryker for mutation; the phase's `bench/ab.sh` + `analyze.mjs` for the benchmark |
| **Config file** | root `vitest.config.ts`; `tstyche.json`; `stryker.config.mjs` (with `--mutate`, never edited) |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/Admission.test.ts packages/core/test/LeafMatrix.test.ts packages/core/test/RolesAndDepth.test.ts packages/core/test/Predicate.test.ts packages/core/test/DecisionCache.test.ts < /dev/null` (repo root) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | quick ~5 s; core project ~10 s; one 3 + 3 bench run ~4 min |

---

## Sampling Rate

- **After every task commit:** run the quick command and `node scripts/check-house-style.mjs`.
- **After every plan wave:** run these in order:
  1. `pnpm exec tsc -b tsconfig.json && pnpm exec tsc -p tsconfig.test.json`
  2. `pnpm exec vitest run --project core < /dev/null`
  3. `pnpm test:tstyche`
  4. `pnpm lint`
  5. `pnpm circular`
- **Before `/gsd-verify-work`:**
  1. Run `pnpm check:pr < /dev/null`.
  2. Run the after-bench, a 3 + 3 run against the phase base, with `# gate: pass` required.
  3. Run the scoped Stryker run.
  4. Run the mutation compare.

  Never run Stryker or vitest beside the benchmark.
- **Max feedback latency:** ~30 seconds for the quick run.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 59-01-T1 | 59-01 | 1 | WENV-01 | T-59-01 | the gate of record is the one research measured | harness | `node <D>bench/analyze.mjs <D>bench/gate base proto` byte-equal to the committed analysis | ✅ | ⬜ pending |
| 59-01-T2 | 59-01 | 1 | WX-02, WX-03 | T-59-02 | only the reserved ids; 933 exports at base | gate | `pnpm -s spec:api` prints 933; the reservation file reads `{"CCR":452,"ADR":174,"BEH":645,"INV":368}` | ✅ | ⬜ pending |
| 59-02-T1 | 59-02 | 2 | WX-05 | T-59-03 | the mutation script is the verbatim block | harness | sha-256 pinned to the verbatim block, `node --check`, no-mode run exits non-zero | ❌ W0 | ⬜ pending |
| 59-02-T2 | 59-02 | 2 | WX-05, WX-06 | T-59-03, T-59-04 | the baseline is the untouched base, committed first | mutation | scoped core Stryker on `Admission.ts,Predicate.ts,Walk.ts`, then `59-mutation.mjs base`; `chore(59-02)` carries 2 files | ❌ W0 | ⬜ pending |
| 59-03-T1 | 59-03 | 3 | WX-06 | T-59-07 | the characterisation is green on the base | unit | `pnpm exec vitest run --project core LeafMatrix Predicate RolesAndDepth DecisionCache Admission < /dev/null` | ✅ | ⬜ pending |
| 59-03-T2 | 59-03 | 3 | WENV-02 | T-59-05 | E1..E6 fail on the base by assertion, never by a type error alone | unit (RED) | vitest JSON reporter: 6 failing rows, 7 passing; type errors only TS2554/2339/2459 | rows to add | ⬜ pending |
| 59-03-T3 | 59-03 | 3 | WENV-03 | T-59-06 | the swap pin fails on the base by the missing export | tstyche (RED) | `pnpm exec tstyche packages/core/test/WalkEnvironment.tst.ts` fails by TS2459 | ❌ W0 | ⬜ pending |
| 59-04-T1 (tracer) | 59-04 | 4 | WENV-02, WENV-03, WENV-04 | T-59-08, T-59-09 | an absent resource is never supplied; one env per evaluation; never on a hit | unit + tstyche | the 5 test files green, tstyche green, `pnpm typecheck`; one `refactor(59-04)` commit of 4 files | ✅ | ⬜ pending |
| 59-04-T2 | 59-04 | 4 | WENV-04, WX-03, WX-04, WX-07 | T-59-10 | budgets and the public surface unchanged | gate | core suite, `pnpm lint` (3 switches), `pnpm circular`, `pnpm -s spec:api` 933, budget counts | ✅ | ⬜ pending |
| 59-05-T1 | 59-05 | 5 | WENV-04 | T-59-11 | the after-bench measures HEAD's src against the base and restores it | harness | `bash <D>bench/ab.sh <D>bench/after/to-base.patch <D>bench/after 3 final base`, then `analyze.mjs` | ✅ harness | ⬜ pending |
| 59-05-T2 | 59-05 | 5 | WENV-01, WENV-04 | T-59-12 | a fail is committed and reported, never re-run | harness | `analysis.tsv` ends `# gate: pass`; `chore(59-05)` carries `bench/after/` and `59-BENCH.md` | ✅ harness | ⬜ pending |
| 59-06-T1 | 59-06 | 6 | WX-05 | T-59-13 | the after-run is the committed tree | mutation | scoped core Stryker, then `59-mutation.mjs after` | ❌ W0 | ⬜ pending |
| 59-06-T2 | 59-06 | 6 | WX-05 | T-59-13 | static credit only for mutants the evidence run kills | mutation | `59-mutation.mjs compare <D>59-mutation-static.json` prints `WX-05 holds (D-15)` | ❌ W0 | ⬜ pending |
| 59-06-T3 | 59-06 | 6 | WX-05 | T-59-14 | a gap test never edits a characterisation file; evidence committed last | unit + harness | `chore(59-06)` is the last commit touching `59-mutation-after.json` | ❌ W0 | ⬜ pending |
| 59-07-T1 | 59-07 | 7 | WENV-01, WX-02 | T-59-15 | ADR-QD-172's tables are 59-BENCH.md's rows verbatim | doc | the 35 `ok\|SLOWER` rows equal 59-BENCH.md's; `spec-revise --check` | ✅ | ⬜ pending |
| 59-07-T2 | 59-07 | 7 | WX-02 | T-59-16 | amendments append, never rewrite | doc | ADR-QD-100 Rev 1.4, ADR-QD-163 Rev 1.9, ADR-QD-024 amended; no line removed | ✅ | ⬜ pending |
| 59-08-T1 | 59-08 | 8 | WENV-02, WENV-03 | T-59-17 | INV-QD-364 states the fail-closed `MissingResource` implication | doc | `invariants.md` Rev 1.158; INV-QD-363/364 shape; INV-QD-037 amended, no line removed | ✅ | ⬜ pending |
| 59-08-T2 | 59-08 | 8 | WENV-02, WENV-03 | T-59-17 | the empty, adjacency and ordering edges are stated | doc | BEH-QD-631..635 in 05 (Rev 1.17) and 16 (Rev 1.9), each clause the verify names | ✅ | ⬜ pending |
| 59-08-T3 | 59-08 | 8 | WX-02 | T-59-18 | every anchor resolves | doc | `bash spec/scripts/verify-traceability.sh --strict` fails only on CCR 450 | ✅ | ⬜ pending |
| 59-09-T1 | 59-09 | 9 | WX-02 | T-59-20 | the CCR row names every id used, `Unused: none.` | doc | the CCR-QD-450 row check; README Rev 1.253 | ✅ | ⬜ pending |
| 59-09-T2 | 59-09 | 9 | WX-02, WX-03, WX-07 | T-59-19 | no changeset, nothing versioned | gate | strict traceability green; `spec:api` 933; no `.changeset`/manifest/CHANGELOG/barrel change since `phase_base` | ✅ | ⬜ pending |
| 59-10-T1 | 59-10 | 10 | WX-02, WX-04, WX-05, WX-06 | T-59-SC | the whole history satisfies the fixed checks | scan | `node <D>59-scan.mjs` prints `phase scan clean`; `compare` prints `WX-05 holds (D-15)` | ❌ W0 | ⬜ pending |
| 59-10-T2 | 59-10 | 10 | WENV-01..04, WX-01, WX-07 | T-59-21, T-59-22 | complete only after the gate; nothing released | gate | `pnpm check:pr < /dev/null`; the release check | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WENV-01 | the gate numbers (done in research: `# gate: pass` twice) | harness | `node <phase dir>/bench/analyze.mjs <dir> base proto` | ✅ `bench/gate`, `bench/gate-r2` |
| WENV-02 | `admit(q, "asked")` gives the env; `"row"` always supplies the resource (RED on base) | unit | `pnpm exec vitest run --project core packages/core/test/Admission.test.ts < /dev/null` | rows to add |
| WENV-02 | each interpreter's `supplied` outcome unchanged | unit (green on base) | `… LeafMatrix.test.ts packages/core/test/Predicate.test.ts` | ✅ |
| WENV-03 | depth/maxDepth swap cannot compile (RED on base) | tstyche | `pnpm exec tstyche packages/core/test/WalkEnvironment.tst.ts` | ❌ W0 |
| WENV-04 | depth agreement | unit | `… RolesAndDepth.test.ts` | ✅ |
| WENV-04 | budgets unchanged | gate | `node scripts/check-house-style.mjs` | ✅ |
| WENV-04 | the after-bench shows no workload slower | harness | the phase's `bench/ab.sh`, then `analyze.mjs`; the last line is `# gate: pass` | ✅ harness |
| WX-06 | cache-hit laziness (`admit` never runs on a hit) | unit | `… DecisionCache.test.ts` | ✅ |
| WX-05 | mutation not lower | harness | `node <phase dir>/59-mutation.mjs compare [static json]` | ❌ W0 |

---

## Wave 0 Requirements

- [ ] `59-mutation.mjs` and `59-mutation-base.json`, committed alone as the first commit after the bench plan, and never re-baselined.
- [ ] `packages/core/test/WalkEnvironment.tst.ts`, RED on the base.
- [ ] The RED rows in `Admission.test.ts`.

---

## Manual-Only Verifications

None.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
