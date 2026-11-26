---
phase: "90"
slug: "the-remaining-per-port-facts-live-on-the-port-description"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-26"
---

# Phase 90 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from `90-RESEARCH.md` §Validation
> Architecture. The planner fills in the task ids. Where the two disagree, `90-CONTEXT.md`'s "Addendum after research"
> wins.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 + @effect/vitest for runtime tests; tstyche 7.2.5 on TypeScript 6.0.3 for type pins, in two passes; the gates `scripts/check-house-style.mjs` and `scripts/check-api-surface.mjs`; madge (`pnpm circular`) |
| **Config file** | `vitest.config.ts` (projects `packages/*`, thresholds); `packages/core/vitest.config.ts`; `tstyche.json`; `tsconfig.tstyche.json`; `tsconfig.test.json` |
| **Quick run command** | `node_modules/.bin/vitest run --project core < /dev/null` (about 6 s; 85 files and 2797 tests at the base) |
| **Type quick run** | `node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts < /dev/null` (both passes) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Bench gate** | `scripts/bench/ab.sh <patch> <outdir> 4 <head> <patched> packages/core/bench/Evaluate.bench.ts "<pattern>"`, then `node scripts/bench/analyze.mjs <outdir> <head> <patched> <workloads-file>`. The verdict is the last line, `# gate: pass`. The band is 5% per workload plus a geometric mean of at most 2% (D-16a). |
| **Mutation** | `pnpm exec stryker run stryker.config.mjs --mutate <the 13 core files of D-24> < /dev/null`, scored by `90-mutation.mjs` |
| **Estimated runtime** | quick ~6 s; types ~10 s; full suite several minutes; mutation and bench tens of minutes |

---

## Sampling Rate

- **After every task commit:** the quick vitest line. Add `node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts` when a type moved, and `pnpm circular` when an import moved.
- **After every plan wave:** `pnpm typecheck`, `node scripts/check-house-style.mjs`, `node scripts/run-tstyche.mjs`, `node scripts/check-api-surface.mjs`, and `90-check.mjs suite` over core, http, testing and devtools.
- **Before `/gsd-verify-work`:**
  - `pnpm check:pr < /dev/null` is green;
  - `90-check.mjs records --close` is clean;
  - `90-pinned-check.mjs` and `90-earlier-checks.mjs` exit 0;
  - `90-BENCH.md` reads `# gate: pass`, or PFACT-03 is reported not met (D-16);
  - the core mutation close run does not fall below the base.
- **Max feedback latency:** 30 seconds per task, not counting the phase gate, the bench and mutation.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 90-01-* | 01 | 1 | PFACT-01 | — | each candidate's madge and `tsc` verdict, recorded; (e) is a recorded cycle | spike evidence | `90-SPIKE.md`; madge and `tsc -b` on scratch copies | ❌ W0 | ⬜ pending |
| 90-01-* | 01 | 1 | PFACT-04 | — | facts golden, order, metric words, wire and served bytes, and the route table, all green on the base | characterisation | `node_modules/.bin/vitest run --project core packages/core/test/PortFacts.characterisation.test.ts` | ❌ W0 | ⬜ pending |
| 90-01-* | 01 | 1 | PFACT-04 | — | base type pins: `PortFixtureData`, `PortSpanName`, `PortSpanOf`, `PortName` | type | `node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts` | ❌ W0 | ⬜ pending |
| 90-01-* | 01 | 1 | PFACT-03 | — | the bench gate before routing changes | bench | `ab.sh` 4+4 and `analyze.mjs`, last line `# gate: pass` | ❌ W0 | ⬜ pending |
| TBD | — | — | PFACT-02 | — | one tuple; `PortMetrics` reads it; `PredicatePortName` checked against it | runtime + type | characterisation order/metric rows; `PortFacts.tst.ts`; `90-check.mjs port-facts` | ❌ W0 | ⬜ pending |
| TBD | — | — | PFACT-02 | — | span and fixture on the description; `DistinctSpanNames` refuses a duplicate or widened span | type + check | `PortFacts.tst.ts`; `90-check.mjs port-facts` | ❌ W0 | ⬜ pending |
| TBD | — | — | PFACT-03 | — | a scoped read requires an id exactly where its row says; annotate-before-fail held | runtime | `vitest run --project core packages/core/test/LeafNeeds.test.ts packages/core/test/PortFacts.characterisation.test.ts`; `90-check.mjs scoped-route` | ✅ / ❌ W0 | ⬜ pending |
| TBD | — | — | PFACT-04 | — | held tests byte for byte; `PortServing.tst.ts` unedited; a sixth port without its facts does not compile | pinned check + scratch tsc | `90-pinned-check.mjs`; `90-check.mjs sixth-port` | ❌ W0 | ⬜ pending |
| TBD | — | — | PFACT-05 | — | ADR-QD-203; amendments to 094, 163 and 134; BEH-QD-786..790; INV-QD-425/426; AGENTS.md §3; overview at 943 | spec gates | `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs`, `bash spec/scripts/verify-traceability.sh --strict`, `90-check.mjs records --close` | ❌ W0 | ⬜ pending |
| TBD | — | — | WX-05 | — | no touched file's score falls; static tables proven by the goldens; matcher literals `EXAMINED` | mutation + coverage | `90-mutation.mjs`; `vitest run packages/core/test --coverage.enabled …` | ❌ W0 | ⬜ pending |
| TBD | — | — | WX-06 | — | every new check seen failing (D-21) | scratch variants | `90-RED-EVIDENCE.md` via `90-check.mjs seen-failing` | ❌ W0 | ⬜ pending |
| all | — | — | WX-03 / WX-04 / WX-07 | — | Breaking minor changeset with an upgrade note; no forbidden forms; no plan ids in added lines | check script | `90-check.mjs scan-forbidden`, `scan-ids`, `trailers` | ❌ W0 | ⬜ pending |
| close | — | — | WX-01 / WX-02 | — | merge gate green; records registered | full suite | `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/test/PortFacts.characterisation.test.ts`: born green on the base; declared regions (D-18)
- [ ] `packages/core/test/PortFacts.tst.ts`: base pins first, then the change pins (D-19)
- [ ] two scoped-heavy workloads in `packages/core/bench/Evaluate.bench.ts`, and the workloads file (D-16, D-16a)
- [ ] `90-check.mjs`, `90-pinned-check.mjs`, `90-earlier-checks.mjs` and `90-mutation.mjs`, each with a `--self-test`
- [ ] `90-SPIKE.md`, `90-RED-EVIDENCE.md`, `90-BENCH.md`, `90-mutation-base.json`

No framework install: vitest, tstyche, madge, oxlint and Stryker are present.

---

## Manual-Only Verifications

All phase behaviors have automated verification. The hoisted matcher's `Match.when` literal mutants are run by hand with
`ignoreStatic: false` and recorded as `EXAMINED`. The run is scripted and its result is recorded; it is not a judgement.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
