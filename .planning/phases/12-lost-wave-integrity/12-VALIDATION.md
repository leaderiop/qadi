---
phase: "12"
slug: "lost-wave-integrity"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-10"
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest` (runtime, incl. fast-check properties); tstyche 7 (type level); BDD acceptance via `@qadi/features` |
| **Config file** | `vitest.config.ts` (projects `packages/*`, coverage thresholds: core 95%, others 90%), per-package `vitest.config.ts` (projects `core`, `http`, `devtools`, `react`), `tstyche.config.json`, `stryker.config.mjs` (core), `stryker.react.mjs` |
| **Quick run command** | `pnpm vitest run --project <core|http|devtools|react> <file>`; `pnpm exec tstyche <file.tst.ts>` |
| **Full suite command** | `pnpm check:pr` (skips mutation); per-file mutation compared by `node .planning/phases/12-lost-wave-integrity/12-mutation-score.mjs compare` against `12-mutation-base.json` (12-05 Task 3) |
| **Estimated runtime** | Quick: one package's affected test files plus typecheck/lint/circular, under 60 s. Full and the four Stryker runs: well over 10 minutes each; run in the background |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command. No task's verify runs a suite holding another task's intentional RED test (each RED test is written in the task that fixes it).
- **Order:** phases run strictly in numeric order; Phase 12 starts after Phase 11 closes. Plans of a wave run one at a time in the shared tree (no worktrees): 12-01, 12-03 (wave 1); 12-02, 12-04 (wave 2); 12-05 (wave 3). 12-01 Task 2 Step 0 records the phase base and mutation base before any Phase 12 edit; 12-03 checks for them.
- **After each wave:** `pnpm vitest run --project core && pnpm vitest run --project http && pnpm vitest run --project devtools && pnpm vitest run --project react && pnpm test:bdd && pnpm typecheck && pnpm lint && pnpm circular`. `pnpm spec:api` is expected red until 12-05 Task 2.
- **Before `/gsd-verify-work`:** mutation compare and `pnpm check:pr` green (12-05 Task 3).
- **Max feedback latency:** under 60 s per task command except BDD, the example suite and 12-05 Task 3.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | INT-01 | T-12-01 | — (checkpoint:decision, blocking-human: wire order and http's three exports) | decision | n/a | n/a | ⬜ pending |
| 12-01-02 | 01 | 1 | INT-01, INT-02, XC-05, XC-06 | T-12-01, T-12-02, T-12-04, T-12-05, T-12-06 | A reconnect cut after any backlog frame loses nothing; after the backlog repeats nothing; refusal words, spans, guard, reauth unchanged | integration (RED P1/P2, inverted order test) + table + type | `pnpm vitest run --project http packages/http/test/decisionStream.test.ts packages/http/test/decisionBacklog.test.ts packages/http/test/DecisionLogHttp.test.ts && pnpm exec tstyche packages/http/test/DecisionLogHttp.tst.ts packages/http/test/DecisionStreamRoute.tst.ts && pnpm typecheck && pnpm lint && pnpm circular` + /usr/bin/grep gates | ❌ W0 (probes written red in this task) | ⬜ pending |
| 12-01-03 | 01 | 1 | INT-02 | T-12-04, T-12-06 | Removed (or rebuilt) http exports; same bytes asserted through the route | integration + table + type | `pnpm vitest run --project http packages/http/test && pnpm exec tstyche packages/http/test/DecisionLogHttp.tst.ts packages/http/test/DecisionStreamRoute.tst.ts && pnpm typecheck && pnpm lint && pnpm circular` + grep | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | INT-01, XC-05, XC-06 | T-12-01, T-12-03 | decode(encode(log)) is the log's read; resume over every cut exact; no prelude in time leaves backlog absent | property (≥100 runs) + unit (TestClock) + type | `pnpm vitest run --project core packages/core/test/DecisionStream.test.ts && pnpm exec tstyche packages/core/test/DecisionStream.tst.ts && pnpm typecheck && pnpm lint && pnpm circular` + grep | ❌ W0 (created red) | ⬜ pending |
| 12-02-02 | 02 | 2 | INT-02 | T-12-01, T-12-15 | The real reader reconnects without loss; malformed frames still reported | acceptance + unit | `pnpm vitest run --project devtools packages/devtools/test/model/Source.test.ts && pnpm exec tstyche packages/devtools/test/model/Source.tst.ts && pnpm test:bdd && pnpm typecheck && pnpm lint && pnpm circular` + greps | ✅ (scenario added) | ⬜ pending |
| 12-02-03 | 02 | 2 | INT-01 | — | — (vocabulary move with its tests) | unit + type | `pnpm vitest run --project core packages/core/test/DecisionLog.test.ts packages/core/test/DecisionStream.test.ts && pnpm exec tstyche packages/core/test/DecisionLog.tst.ts packages/core/test/DecisionStream.tst.ts && pnpm typecheck && pnpm lint && pnpm circular` + greps | ✅ | ⬜ pending |
| 12-03-01 | 03 | 1 | INT-04, INT-06 | T-12-08 | — (checkpoint:decision, blocking-human: D-53-b hook shape + D-53-g mutation scope) | decision | n/a | n/a | ⬜ pending |
| 12-03-02 | 03 | 1 | INT-05, INT-06, XC-06 | T-12-09, T-12-11 | A zero-entry refused payload counts once; off-fiber writes confined to HydrationEvent.ts | unit (RED probe, per-tag event tests) | `pnpm vitest run --project react packages/react/test/HydrationEvent.test.ts packages/react/test/HydrationEngine.test.ts packages/react/test/HydrationCounts.test.ts packages/react/test/HydrationPayload.test.ts packages/react/test/Hydration.test.ts && pnpm typecheck && pnpm lint && pnpm circular` + greps | ❌ W0 (created red) | ⬜ pending |
| 12-03-03 | 03 | 1 | INT-04, XC-04, XC-06 | T-12-08, T-12-10 | A throwing host hook cannot change the outcome; ReporterThrew names the hook only, in every environment | unit + house-style gate | `pnpm vitest run --project react packages/react/test && pnpm typecheck && pnpm lint && pnpm circular` + greps | ❌ W0 (three probes created red) | ⬜ pending |
| 12-04-01 | 04 | 2 | INT-06 | T-12-16 | The dehydrate hook gets the reason (per the checkpoint) | type + unit | `pnpm exec tstyche packages/react/test/Hydration.tst.ts && pnpm vitest run --project react packages/react/test && pnpm vitest run --project core && pnpm typecheck && pnpm lint && pnpm circular` | ❌ W0 (pins created red) | ⬜ pending |
| 12-04-02 | 04 | 2 | INT-03, XC-06 | T-12-07 | dehydrateDecisions never throws on -Infinity, NaN or depth 1.5; entry left out as UnencodablePolicy and counted | unit | `pnpm vitest run --project core packages/core/test/HydrationMetrics.test.ts && pnpm vitest run --project react packages/react/test && pnpm vitest run --project devtools packages/devtools/test/model/Hydration.test.ts && pnpm typecheck && pnpm lint && pnpm circular` + greps | ❌ W0 (probes created red) | ⬜ pending |
| 12-04-03 | 04 | 2 | INT-03, INT-05, XC-05 | T-12-07 | Examples and acceptance on the chosen hook; HydrationEvent.ts mutated per the checkpoint | example + acceptance | `pnpm --filter @qadi/example-nextjs typecheck && pnpm --filter @qadi/example-nextjs test && pnpm test:bdd && pnpm vitest run --project react packages/react/test/HydrationEvent.test.ts && pnpm lint` | ✅ | ⬜ pending |
| 12-05-01 | 05 | 3 | INT-01..INT-06, XC-02 | T-12-12 | — | doc gates | `pnpm spec:verify:strict && pnpm spec:claims && node scripts/spec-revise.mjs --check` + lost-id gate on lines added since the phase base | ✅ | ⬜ pending |
| 12-05-02 | 05 | 3 | XC-02, XC-03 | T-12-13 | Every Breaking change has an upgrading entry and a minor bump | doc gates | `pnpm spec:api && pnpm spec:examples && pnpm spec:website-examples && pnpm spec:gates && pnpm spec:verify:strict && node scripts/spec-revise.mjs --check` + CCR neighbour check | ✅ | ⬜ pending |
| 12-05-03 | 05 | 3 | XC-01, XC-04, XC-05 | T-12-14 | Merge gate unmodified and green; no touched file's mutation score falls | mutation compare + full gate | `node .planning/phases/12-lost-wave-integrity/12-mutation-score.mjs compare && pnpm check:pr` | ✅ (script from 12-01) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/http/test/decisionStream.test.ts` "a reconnect loses nothing" (P1, P2): red at the start of 12-01-02; the defective order test inverted there.
- [ ] `.planning/phases/12-lost-wave-integrity/12-base.txt`, `12-mutation-score.mjs`, `12-mutation-base.json`: 12-01-02 Step 0, before any edit.
- [ ] `packages/core/test/DecisionStream.test.ts` and `.tst.ts`: properties and decoder rules, red at the start of 12-02-01.
- [ ] `packages/react/test/HydrationEngine.test.ts`: zero-entry probe (12-03-02), throwing-reporter probes (12-03-03), unencodable probes (12-04-02), each red in the task that fixes it; `DeveloperSignals.test.ts` throwing onHydrationMismatch (12-03-03).
- [ ] `packages/react/test/HydrationEvent.test.ts`: per-tag tests, created in 12-03-02.

Existing infrastructure (vitest projects, fast-check, tstyche, TestClock, `collectingLogger`/`collectingTracer` from `@qadi/testing`, the route `prelude` helpers and the features `pipedEventSource` harness) covers everything else. Nothing needs installing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full merge gate green | XC-04 | `pnpm check:pr`'s `pnpm example` step runs `playwright install --with-deps chromium`, which needed sudo on the development host in Phases 5–7 | Run `pnpm check:pr` where Playwright's dependency install works (CI, or locally with sudo); confirm exit 0. Otherwise run the remaining steps individually as 12-03 Task 4 lists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
