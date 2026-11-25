---
phase: "QD-82"
slug: "qadiprovider-s-registry-has-one-owner-for-its-lifetime"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-25"
---

# Phase QD-82 — Validation Strategy

> Every requirement (LEASE-01..05, WX-01..07) was cross-referenced to a test or a gate, and the tests were run green on 2026-11-25 at head 4ec88995 (after the code review fixes):
> - `pnpm exec vitest run --project react < /dev/null`: 42 files, 678 tests passed (includes `QadiProvider.lifetime.test.tsx` LT1..LT18, `RegistryLease.test.ts` RL1..RL10, `edges.test.tsx`);
> - `82-check.mjs` (38 plan commits' trailers, `scan-ids`, `scan-forbidden`, `single-owner`): all hold;
> - `pnpm check:pr < /dev/null` exit 0 (17 of 18 steps, mutation skipped by design; 6613 unit tests, BDD 568, examples 43; strict traceability PASS 21 FAIL 0; api-surface 942 exports, unchanged), `pnpm spec:package` exit 0 (9 packages, 527 runtime exports);
> - `82-mutation.mjs compare` exit 0 on the re-taken close (DecisionOutcome 8/8, QuestionBook 86/88 against a base of 85/88, the 2 survivors at line 170 being the base's, HydrationEvent 33/33, SweepScheduler 21/21, RegistryLease 28/28); `QadiProvider.tsx` is outside the mutate list and recorded as unmeasured with its reason. Stryker was not re-run here.
>
> The review fixes added LT16, LT17, LT18 and reworked LT6 (two frames), LT12 (real pressure) and LT14 (host atom), plus a `finally` in the recycle; each was seen failing in `82-REVIEW-FIX.md`. No validation gap needed a new test.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `react`), `@effect/vitest`, happy-dom, `@testing-library/react`; Stryker for mutation |
| **Config file** | `packages/react/vitest.config.ts`, `stryker.react.mjs` |
| **Quick run command** | `pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts packages/react/test/QadiProvider.lifetime.test.tsx < /dev/null` (from the repo root only) |
| **Full suite command** | `pnpm exec vitest run --project react < /dev/null`; the phase gate is `pnpm check:pr < /dev/null` plus `pnpm spec:package` and `82-mutation.mjs compare` |
| **Estimated runtime** | ~4 seconds for the React suite; `pnpm check:pr` about 15 to 20 min |

---

## Sampling Rate

- **After every task commit:** Run the quick run command.
- **After every plan wave:** Run `pnpm exec vitest run --project react < /dev/null` and `pnpm lint`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` and `pnpm spec:package` green; `82-mutation.mjs compare` exit 0.
- **Max feedback latency:** 60 seconds.

---

## Sampling Rate

- **After every task commit:** run the quick run command.
- **After every plan wave:** `pnpm exec vitest run --project react < /dev/null` and `pnpm lint`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null`, `pnpm spec:package` green and `82-mutation.mjs compare` exit 0.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Requirement | Automated Command | Status |
|---------|-------------|-------------------|--------|
| 82-01 T1 | WX-05, WX-06 | `node <D>82-mutation.mjs --self-test`; the react Stryker base run; `record base react` | green |
| 82-01 T2 | WX-05, WX-06 | gate lines compared with fresh runs; `81-archived-checks.mjs` compared | green |
| 82-01 T3 | LEASE-02, WX-04, WX-07 | `node <D>82-check.mjs --self-test`; `single-owner` fails with its seven reasons | green |
| 82-02 T1 | LEASE-01 | `pnpm exec vitest run --project react packages/react/test/QadiProvider.lifetime.test.tsx` red; `seen-failing` | green |
| 82-02 T2 | LEASE-03, WX-06 | the same run, LT2 to LT8 red, LT5 green and failing under scratch | green |
| 82-02 T3 | LEASE-01 | the ORDER lines in `82-RED-EVIDENCE.md`; harness absent | green |
| 82-03 T1 | LEASE-04 | `-t "LT9 "` red; `seen-failing` | green |
| 82-03 T2 | LEASE-04 | `-t "LT1[0-3] "` red | green |
| 82-03 T3 | LEASE-03 | LT14, LT15 and `edges.test.tsx` "releases its registry after it unmounts" red | green |
| 82-04 T1 | LEASE-02 | `pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts` (9 passed after, red before) | green |
| 82-04 T2 | LEASE-02, WX-05 | `stryker.react.mjs` mutate list; `single-owner` leaves five reasons | green |
| 82-05 T1 | LEASE-01, LEASE-03, LEASE-04 | `pnpm exec vitest run --project react`; `single-owner` passes; typecheck | green |
| 82-05 T2 | WX-06 | the three variants' failing titles recorded | green |
| 82-05 T3 | LEASE-02 | lease-only Stryker run; `82-mutation.mjs probe lease` exits 0 | green |
| 82-06 T1-T2 | LEASE-05, WX-02 | `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict` (`FAIL: 0`) | green |
| 82-07 T1-T2 | LEASE-05, WX-02 | the same, plus `node scripts/check-doc-examples.mjs` | green |
| 82-08 T1-T2 | LEASE-05, WX-02, WX-03 | `node scripts/check-api-surface.mjs` equal to the base; the CCR row names every changed doc | green |
| 82-09 T1 | WX-05 | two Stryker close runs alone; `node <D>82-mutation.mjs compare` | green |
| 82-09 T2 | WX-04, WX-06, WX-07 | the four `82-check.mjs` scans; archived checks equal; ancestry | green |
| 82-10 T1 | WX-01, WX-03 | `pnpm check:pr < /dev/null` exit 0, then `pnpm spec:package` exit 0 | green |
| 82-10 T2 | LEASE-01..05, WX-07 | the REQUIREMENTS checkboxes and rows; no tag, CHANGELOG or version change; `trailers` | green |
| 82-RF-* | LEASE-01, LEASE-03, LEASE-04 | review fixes: LT6, LT12, LT14, LT16, LT17, LT18 in `QadiProvider.lifetime.test.tsx`; `pnpm exec vitest run --project react < /dev/null` | green |

*Status: green on every row. The red-first output for each new check and test is in `82-RED-EVIDENCE.md` or `82-REVIEW-FIX.md` (WX-06).*

## Requirement coverage

| Req | Status | Evidence |
|-----|--------|----------|
| LEASE-01 | COVERED | LT1 (hide past a macrotask and reveal throws nothing, renders the decision), LT2, LT3, LT4; red on the base (`82-RED-EVIDENCE.md`) |
| LEASE-02 | COVERED | `RegistryLease.test.ts` RL1..RL10 (fake defer that really cancels, one test on the default defer); `82-check.mjs single-owner`; RegistryLease mutation 28/28 |
| LEASE-03 | COVERED | LT4, LT5, LT7, LT8, LT14, LT15, `edges.test.tsx` "releases its registry after it unmounts" (host-atom observable, seen failing with the release skipped), LT18 (recycle `finally`) |
| LEASE-04 | COVERED | LT6, LT13, LT16, LT17 (subject read in the first frame), LT9..LT11 (no superseded seed), LT12 (sweep bound under real pressure, ADR-QD-148); SweepScheduler 21/21, HydrationEvent 33/33 |
| LEASE-05 | COVERED (docs) | ADR-QD-195, BEH-QD-746, INV records; strict traceability PASS 21 FAIL 0; patch changeset, no Breaking one; `pnpm spec:package` |
| WX-01 | COVERED (process) | `pnpm check:pr < /dev/null` exit 0 at 4ec88995 |
| WX-02 | COVERED (process) | reserved numbers only; `next-id.mjs` never run; strict traceability |
| WX-03 | COVERED (process) | `check-api-surface.mjs` 942 exports, unchanged; `pnpm spec:package` green |
| WX-04 | COVERED (process) | house-style gate in `check:pr`; `82-check.mjs scan-forbidden` |
| WX-05 | COVERED | `82-mutation-close.json`, `compare` exit 0 (QuestionBook 86/88 over base 85/88); react coverage gate inside `check:pr` |
| WX-06 | COVERED | `82-RED-EVIDENCE.md` (every regression red on the base, every check seen failing once); `82-REVIEW-FIX.md` for the review tests |
| WX-07 | COVERED (process) | `82-check.mjs scan-ids`, `trailers`; nothing pushed, merged, tagged or released |

## Wave 0 Requirements

- [x] `QadiProvider.lifetime.test.tsx`: LEASE-01, 03, 04, red on the base first, recorded in `82-RED-EVIDENCE.md`.
- [x] `RegistryLease.test.ts`: LEASE-02, headless matrix.
- [x] `stryker.react.mjs`: the lease added to the mutate list; base recorded before any source edit.
- [x] `edges.test.tsx`: the host-atom observable, shown failing with the release skipped.
- [x] `82-check.mjs` and `82-mutation.mjs`, each shown failing once.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | n/a | Every behaviour is reached by a rendered or headless test | n/a |

*Everything has automated verification.*

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s per file
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-25
