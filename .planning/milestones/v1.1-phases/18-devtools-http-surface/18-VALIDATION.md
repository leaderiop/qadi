---
phase: "18"
slug: "devtools-http-surface"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-10"
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest` (runtime); tstyche 7 (type level); BDD acceptance via `@qadi/features` |
| **Config file** | `vitest.config.ts` (projects, coverage thresholds), `packages/http/vitest.config.ts` (project `http`), `tstyche.config.json`; `examples/nextjs-newsroom` (own vitest + tsc); `examples/http-advanced/tsconfig.json` (not in the root typecheck graph) |
| **Quick run command** | `pnpm vitest run --project http <file>`; `pnpm exec tstyche <file.tst.ts>`; `pnpm exec tsc -p examples/http-advanced/tsconfig.json --noEmit` |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | Quick: under 60 s per task; `pnpm test:bdd` and the Next example's tests are longer. Full: over 10 minutes; run in the background |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command.
- **After each wave:** `pnpm vitest run --project http && pnpm test:bdd && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (18-03 Task 3).
- **Max feedback latency:** under 60 s per task command except BDD, the example suite and 18-03 Task 3.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | SURF-03 | T-18-02 | — (checkpoint:decision, blocking-human: one mounting call or address only) | decision | n/a | n/a | ⬜ pending |
| 18-01-02 | 01 | 1 | SURF-01, SURF-02, XC-03, XC-06 | T-18-01, T-18-03, T-18-04, T-18-05 | Prefixed routes stay guarded (403 for a denied subject), default paths 404 on a prefixed router, no // path, the leaf imports nothing | integration (round trip) + type | `pnpm vitest run --project http packages/http/test/DevtoolsRouteAddress.test.ts packages/http/test/decisionStream.test.ts packages/http/test/decisionBacklog.test.ts packages/http/test/http.test.ts && pnpm exec tstyche packages/http/test/DevtoolsRouteAddress.tst.ts && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api` + greps | ❌ W0 (round trip created red) | ⬜ pending |
| 18-01-03 | 01 | 1 | SURF-03 | T-18-02 | The mounting call has no unguarded form; reauth ≤ 0 still throws | integration + type | `pnpm vitest run --project http packages/http/test && pnpm exec tstyche packages/http/test/DevtoolsRouteAddress.tst.ts && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api` | ❌ W0 (DevtoolsRoutes.test.ts, option-b) | ⬜ pending |
| 18-02-01 | 02 | 2 | SURF-02, XC-06 | T-18-07 | The real reader follows the host's prefix; the default path is 404 on a prefixed router | acceptance | `pnpm test:bdd && pnpm typecheck && pnpm lint` + grep | ✅ (scenario added red) | ⬜ pending |
| 18-02-02 | 02 | 2 | SURF-04 | T-18-06, T-18-08 | Examples keep their guard pairs; external addresses unchanged | example typecheck + tests | `pnpm --filter @qadi/example-nextjs typecheck && pnpm --filter @qadi/example-nextjs test && pnpm exec tsc -p examples/http-advanced/tsconfig.json --noEmit && pnpm lint` + grep | ✅ | ⬜ pending |
| 18-03-01 | 03 | 3 | SURF-01..SURF-03, XC-01, XC-02 | T-18-09, T-18-10 | — | doc gates | `pnpm spec:verify:strict && node scripts/spec-revise.mjs --check` + greps | ✅ | ⬜ pending |
| 18-03-02 | 03 | 3 | XC-03 | T-18-10 | — | doc gates | `pnpm spec:api && pnpm spec:examples && pnpm spec:website-examples && pnpm spec:gates && pnpm spec:verify:strict && node scripts/spec-revise.mjs --check` + greps | ✅ | ⬜ pending |
| 18-03-03 | 03 | 3 | XC-04, XC-05 | T-18-11 | Merge gate unmodified and green | full gate | `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/http/test/DevtoolsRouteAddress.test.ts` and `.tst.ts`: the round trip under `/x/devtools` for stream, backlog and registry, written red at the start of 18-01-02.
- [ ] `packages/http/test/DevtoolsRoutes.test.ts` (option-b only), created in 18-01-03.
- [ ] `features/features/decision-log/decision-log.feature` scenario "A reader follows the host's prefix", written red at the start of 18-02-01.

Existing infrastructure (the PortRoutes.test.ts web-handler harness, the decision-stream `appLayer`, the features `pipedEventSource`/`serve` harness) covers everything else. Nothing needs installing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full merge gate green, incl. the Next example's e2e probes of `/api/__decisions…` | XC-04, SURF-04 | `pnpm example` runs `playwright install --with-deps chromium`, which needed sudo on the development host in earlier phases | Run `pnpm check:pr` where Playwright's dependency install works (CI, or locally with sudo); confirm exit 0 and that `e2e/decision-log.spec.ts` and `e2e/ssr.spec.ts` pass unedited |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
