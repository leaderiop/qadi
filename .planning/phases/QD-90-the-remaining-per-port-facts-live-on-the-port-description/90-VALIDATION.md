---
phase: "90"
slug: "the-remaining-per-port-facts-live-on-the-port-description"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
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
| 90-01-* | 01 | 1 | PFACT-01 | — | each candidate's madge and `tsc` verdict, recorded; (e) is a recorded cycle | spike evidence | `90-SPIKE.md`; madge and `tsc -b` on scratch copies | ✅ | ✅ green |
| 90-01-* | 01 | 1 | PFACT-04 | — | facts golden, order, metric words, wire and served bytes, and the route table, all green on the base | characterisation | `node_modules/.bin/vitest run --project core packages/core/test/PortFacts.characterisation.test.ts` | ✅ | ✅ green |
| 90-01-* | 01 | 1 | PFACT-04 | — | base type pins: `PortFixtureData`, `PortSpanName`, `PortSpanOf`, `PortName` | type | `node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts` | ✅ | ✅ green |
| 90-01-* | 01 | 1 | PFACT-03 | — | the bench gate before routing changes | bench | `ab.sh` 4+4 and `analyze.mjs`, last line `# gate: pass` | ✅ | ✅ green |
| TBD | — | — | PFACT-02 | — | one tuple; `PortMetrics` reads it; `PredicatePortName` checked against it | runtime + type | characterisation order/metric rows; `PortFacts.tst.ts`; `90-check.mjs port-facts` | ✅ | ✅ green |
| TBD | — | — | PFACT-02 | — | span and fixture on the description; `DistinctSpanNames` refuses a duplicate or widened span | type + check | `PortFacts.tst.ts`; `90-check.mjs port-facts` | ✅ | ✅ green |
| TBD | — | — | PFACT-03 | — | a scoped read requires an id exactly where its row says; annotate-before-fail held | runtime | `vitest run --project core packages/core/test/LeafNeeds.test.ts packages/core/test/PortFacts.characterisation.test.ts`; `90-check.mjs scoped-route` | ✅ | ✅ green |
| TBD | — | — | PFACT-04 | — | held tests byte for byte; `PortServing.tst.ts` unedited; a sixth port without its facts does not compile | pinned check + scratch tsc | `90-pinned-check.mjs`; `90-check.mjs sixth-port` | ✅ | ✅ green |
| TBD | — | — | PFACT-05 | — | ADR-QD-203; amendments to 094, 163 and 134; BEH-QD-786..790; INV-QD-425/426; AGENTS.md §3; overview at 943 | spec gates | `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs`, `bash spec/scripts/verify-traceability.sh --strict`, `90-check.mjs records --close` | ✅ | ✅ green |
| TBD | — | — | WX-05 | — | no touched file's score falls; static tables proven by the goldens; matcher literals `EXAMINED` | mutation + coverage | `90-mutation.mjs`; `vitest run packages/core/test --coverage.enabled …` | ✅ | ✅ green |
| TBD | — | — | WX-06 | — | every new check seen failing (D-21) | scratch variants | `90-RED-EVIDENCE.md` via `90-check.mjs seen-failing` | ✅ | ✅ green |
| all | — | — | WX-03 / WX-04 / WX-07 | — | Breaking minor changeset with an upgrade note; no forbidden forms; no plan ids in added lines | check script | `90-check.mjs scan-forbidden`, `scan-ids`, `trailers` | ✅ | ✅ green |
| close | — | — | WX-01 / WX-02 | — | merge gate green; records registered | full suite | `pnpm check:pr < /dev/null` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `packages/core/test/PortFacts.characterisation.test.ts`: born green on the base; declared regions (D-18)
- [x] `packages/core/test/PortFacts.tst.ts`: base pins first, then the change pins (D-19)
- [x] two scoped-heavy workloads in `packages/core/bench/Evaluate.bench.ts`, and the workloads file (D-16, D-16a)
- [x] `90-check.mjs`, `90-pinned-check.mjs`, `90-earlier-checks.mjs` and `90-mutation.mjs`, each with a `--self-test`
- [x] `90-SPIKE.md`, `90-RED-EVIDENCE.md`, `90-BENCH.md`, `90-mutation-base.json`

No framework install: vitest, tstyche, madge, oxlint and Stryker are present.

---

## Manual-Only Verifications

All phase behaviors have automated verification except PFACT-01's per-candidate spike verdicts, which are recorded evidence in `90-SPIKE.md`. The hoisted matcher's `Match.when` literal mutants are run by hand with
`ignoreStatic: false` and recorded as `EXAMINED`. The run is scripted and its result is recorded; it is not a judgement.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** not compliant — see the audit below (WX-05 partial, PFACT-01 evidence-only).

---

## Validation Audit 2026-11-26

Run at HEAD 060f2eae, phase_base 46174873. No test file was generated: every file under `packages/*/test` is held by
`90-pinned-check.mjs`, so a new test is a fixer-round decision.

**Commands run, all exit 0:** vitest core on `PortFacts.characterisation.test.ts`, `LeafNeeds.test.ts`,
`PortDescription.test.ts` (127 tests); `run-tstyche.mjs` on `PortFacts.tst.ts`, `PortName.tst.ts`, `PortServing.tst.ts`
(both passes, 15 tests); `90-check.mjs close` (18 checks); `90-pinned-check.mjs` (408 held, 3 born, 5 declared edits);
`90-earlier-checks.mjs`; `check-house-style.mjs`; `check-api-surface.mjs` (943); `check-doc-examples.mjs` (122);
`verify-traceability.sh --strict` (21/0). Taken from the record, not re-run: `pnpm check:pr` (green at e987c9fd), the
bench (`# gate: pass`), Stryker base/close.

| Requirement | Proven by | Status |
|---|---|---|
| PFACT-01 | `90-SPIKE.md`; `90-check.mjs circular`, `sixth-port close` | PARTIAL — spike verdict is recorded evidence; only its outcome (no cycle) is re-checked automatically |
| PFACT-02 | characterisation order/metric rows; `PortFacts.tst.ts`; `90-check.mjs port-facts` | COVERED |
| PFACT-03 | characterisation "a scoped read at every site" matrix (refusal + span question + span set per route); `scoped-route derived/route`; `routing-landed`; `bench`; house-style (no switch) | COVERED |
| PFACT-04 | characterisation goldens; `PortServing.tst.ts` unedited (`90-pinned-check.mjs`); `sixth-port close` | COVERED |
| PFACT-05 | `records --close`, api-surface, doc-examples, traceability --strict | COVERED |
| WX-01 | `pnpm check:pr` record at e987c9fd | COVERED (record; later commits are docs-only) |
| WX-02 | `records --close` | COVERED |
| WX-03 | api-surface 943; `pnpm spec:package` in close | COVERED |
| WX-04 | `scan-forbidden`, house-style budgets | COVERED |
| WX-05 | `90-mutation.mjs compare`, `landed close/coverage-close`; coverage 99.86/99.70/98.33/99.58 | PARTIAL — see gap 1 |
| WX-06 | `90-RED-EVIDENCE.md`, `seen-failing` | COVERED |
| WX-07 | `scan-ids`, `trailers`, close no-release facts | COVERED |

### Gaps

1. **WX-05, `packages/core/src/PortAccess.ts` `readScoped` (~294-305).** Close score 54/57 vs base 43/43: the score fell.
   The three survivors are argued EQUIVALENT (the `Always` arm and the `bare !== undefined` redundancy); `compare` passes
   because only killed mutants were lost, but WX-05 says a drop is closed with a test, never re-baselined. Close it by
   removing the redundancy in the source (so the mutants vanish), or by a test in `PortFacts.characterisation.test.ts`'s
   scoped matrix that tells the `Always` arm from `ByScope` at an `Any`-scoped leaf with an absent id, if one exists.
2. **WX-05, base survivors not attacked** (`PortDerivation.ts` ~202, `SignatureHistory.ts` ~423, `LeafNeeds.ts` ~204).
   Not a regression; a kill test for each would raise the floor. Advisory.
3. **PFACT-01.** No automated re-run of the spike's per-candidate madge/tsc verdicts; acceptable as evidence-only
   (spike evidence is by nature a record). Manual-only.
