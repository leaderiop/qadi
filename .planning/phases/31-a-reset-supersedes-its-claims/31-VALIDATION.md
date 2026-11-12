---
phase: "31"
slug: "a-reset-supersedes-its-claims"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-12"
---

# Phase 31 — Validation Strategy

> Reconstructed from the executed plans and summaries (State B). Every requirement maps to an automated command that ran green.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (`@effect/vitest`), fast-check, cucumber BDD, Stryker |
| **Config file** | `vitest.config.ts` (workspace projects), `stryker.config.mjs` |
| **Quick run command** | `pnpm vitest run --project core packages/core/test/SharedComputation.test.ts packages/core/test/DecisionCache.test.ts` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~118 seconds (full gate, mutation skipped) |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command (targeted vitest + typecheck/lint/circular, or the spec gates)
- **After every plan wave:** `pnpm build` + `pnpm vitest run` (wave 1: 5 intended RED by AssertionError, rest green; waves 2–3: 4710 / 4711 tests green; wave 4 spec-only, spec gates green)
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green on `acd47892` (182 files / 4711 tests, BDD 568, examples 42)
- **Max feedback latency:** ~118 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | WX-05 | T-31-01 | Mutation base recorded on the untouched tree, in the phase's first commit | mutation | node check over `31-mutation-base.json` + first-commit check | ✅ | ✅ green |
| 31-01-02 | 01 | 1 | SUPR-03, WX-06 | T-31-02 | Four clear-mid-compute races + amended reset test RED on the base by AssertionError only | unit (RED) | node runner over `SharedComputation.test.ts` + `pnpm typecheck && pnpm lint` | ✅ | ✅ green |
| 31-02-01 | 02 | 2 | SUPR-01, SUPR-03 | T-31-03, T-31-04 | `standing` closed union; a superseded exit never settles; waiters answered; last-leaver interrupt kept | unit | `pnpm vitest run --project core …SharedComputation.test.ts …DecisionCache.test.ts && pnpm typecheck && pnpm lint && pnpm circular` | ✅ | ✅ green |
| 31-02-02 | 02 | 2 | SUPR-02 | T-31-05 | `generation` deleted; `DecisionCache.test.ts` byte-identical to phase base and green | unit + static | node byte-identity check + no-`generation` scan | ✅ | ✅ green |
| 31-03-01 | 03 | 3 | SUPR-01 | T-31-06 | `settle(key, exit)` replaces `claim`; settle stays inside the Live guard | unit | `pnpm vitest run --project core …SharedComputation.test.ts …DecisionCache.test.ts && pnpm typecheck && pnpm lint && pnpm circular` + structural node check | ✅ | ✅ green |
| 31-03-02 | 03 | 3 | SUPR-04 | T-31-07 | Model-based property (seed 3101, 300 runs), three laws after every step, floors ≥ 30 (81/46/35), sabotage makes it fail | property | node runner over `PROPERTY: a reset supersedes its claims` + sabotage script + `pnpm typecheck && pnpm lint` | ✅ | ✅ green |
| 31-04-01 | 04 | 4 | SUPR-05, WX-02 | T-31-08 | ADR-QD-132 amended; BEH-QD-491, BEH-QD-439, INV-QD-307, INV-QD-025 restated | spec | `node scripts/spec-revise.mjs --check && pnpm spec:examples` + content check | ✅ | ✅ green |
| 31-04-02 | 04 | 4 | WX-03, WX-07 | T-31-08 | Traceability, CCR-QD-422 (unused ids named), patch changeset without Breaking | spec gates | `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && node scripts/spec-revise.mjs --check` + reserved-id check | ✅ | ✅ green |
| 31-05-01 | 05 | 5 | WX-04, WX-06 | T-31-09 | No judging file changed; no forbidden token added; D-09 commit order held | static | three node scans over `phase_base..HEAD` | ✅ | ✅ green |
| 31-05-02 | 05 | 5 | WX-05 | T-31-10 | No touched file below base (SharedComputation 0.9857→0.9859, DecisionCache 0.9583→0.9762) | mutation | node compare over `31-mutation-base.json` / `31-mutation-after.json` | ✅ | ✅ green |
| 31-05-03 | 05 | 5 | WX-01 | T-31-SC | Merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-12
