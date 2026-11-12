---
phase: "30"
slug: "one-strict-decode-module"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-12"
---

# Phase 30 — Validation Strategy

> Reconstructed from the executed plans and summaries (State B). Every requirement maps to an automated command that ran green.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (`@effect/vitest`), tstyche, cucumber BDD, Stryker |
| **Config file** | `vitest.config.ts` (workspace projects), `stryker.config.*` per package |
| **Quick run command** | `pnpm vitest run --project <pkg> <file>` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~91 seconds (full gate, mutation skipped) |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command (targeted vitest + typecheck/lint/circular)
- **After every plan wave:** `pnpm build` + `pnpm vitest run` (waves 1–6: 180–181 files, all green)
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green on `0b5f2ab3` (182 files / 4705 tests, BDD 568, examples 42)
- **Max feedback latency:** ~91 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | WX-05 | T-30-02 | Mutation base recorded before any change | mutation | node check over `30-mutation-base.json` | ✅ | ✅ green |
| 30-01-02 | 01 | 1 | DEC-02, WX-06 | T-30-01 | Refusal precedence pinned on the phase base (core 41 rows, devtools paste-box pin) | unit | `pnpm vitest run --project core packages/core/test/UntrustedSeams.test.ts && pnpm vitest run --project devtools packages/devtools/test/model/ExplorerSession.test.ts` | ✅ | ✅ green |
| 30-01-03 | 01 | 1 | DEC-02, WX-06 | T-30-01 | React (17) and audit (18) tables pinned | unit | `pnpm vitest run --project react packages/react/test/UntrustedSeams.test.ts && pnpm vitest run --project audit packages/audit/test/UntrustedSeams.test.ts` | ✅ | ✅ green |
| 30-02-01 | 02 | 2 | DEC-01, DEC-03, DEC-05, DEC-07 | T-30-03, T-30-04 | Leaf owns guard→prepare→strict; `PolicyFromJson` removed; `fromJson` refuses too-deep / not-JSON | unit + type | `pnpm vitest run --project core …UntrustedSeams/Policy/SinkCodec/DecisionWire` + structure node check | ✅ | ✅ green |
| 30-02-02 | 02 | 2 | WX-04, WX-06 | T-30-05 | No forbidden tokens; flip commit carries `Flips:` | static | git-log `Flips:` check | ✅ | ✅ green |
| 30-03-01 | 03 | 3 | DEC-01, DEC-07 | — | Property test: guard always precedes decode; refusal kind is a function of input (seed 3011, 300 runs) | property + tstyche | `pnpm vitest run --project core packages/core/test/UntrustedDecode.test.ts` + `UntrustedDecode.tst.ts` | ✅ | ✅ green |
| 30-03-02 | 03 | 3 | DEC-02, DEC-04 | T-30-07, T-30-08 | SinkCodec on the decoder, version-then-envelope prepare | unit | `pnpm vitest run --project core packages/core/test/SinkCodec.test.ts …` | ✅ | ✅ green |
| 30-03-03 | 03 | 3 | DEC-02, DEC-07 | T-30-06 | Port wire decoders (Q/A/reply) guarded; deeper-than-bound rows | unit | `pnpm vitest run --project core` | ✅ | ✅ green |
| 30-04-01 | 04 | 4 | DEC-04, DEC-06 | T-30-09 | Archive envelope `unwalked: ["entries"]`; `ArchiveRefusal.TooDeep` | unit | `pnpm vitest run --project audit` | ✅ | ✅ green |
| 30-04-02 | 04 | 4 | DEC-04, DEC-06 | T-30-10 | Audit row `unwalked: ["record"]`; too-deep → `DecodeRefusal.TooDeep` | unit | `pnpm vitest run --project audit` | ✅ | ✅ green |
| 30-05-01 | 05 | 4 | DEC-04, DEC-06, DEC-07 | T-30-11, T-30-12 | Hydration envelope on decoder; `PayloadTooDeep`; 4 rows flipped | unit | `pnpm vitest run --project react && … HydrationMetrics.test.ts … Hydration.test.ts` | ✅ | ✅ green |
| 30-05-02 | 05 | 4 | DEC-06 | T-30-13 | Per-entry attribution preserved (`EntryTooDeep`, boundary row ±1 frame) | unit + BDD | `pnpm vitest run --project react && pnpm test:bdd` | ✅ | ✅ green |
| 30-06-01 | 06 | 5 | DEC-05 | T-30-15 | `UNTRUSTED_DECODE_OPTIONS` private, `exceedsJsonDepth` out of barrel | unit + gates | `pnpm typecheck && pnpm lint && pnpm circular && pnpm vitest run --project core --project react --project audit --project devtools && pnpm test:bdd && pnpm spec:examples` | ✅ | ✅ green |
| 30-06-02 | 06 | 5 | DEC-08, WX-04 | T-30-14 | `[untrusted-decode]` refuses unbudgeted strict decode; budget checked both ways | probe | `pnpm lint` + two probe scripts (unbudgeted file fails; inflated budget fails) | ✅ | ✅ green |
| 30-07-01 | 07 | 6 | DEC-05, WX-02 | T-30-16 | ADR-QD-143 with measured double-guard cost; no guard dropped | bench + spec | `pnpm bench packages/core/bench/UntrustedDecode.bench.ts && node scripts/spec-revise.mjs --check` | ✅ | ✅ green |
| 30-07-02 | 07 | 6 | WX-02, WX-03 | T-30-16 | Spec/overview name every added export, drop every removed one | spec gates | `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims` | ✅ | ✅ green |
| 30-08-01 | 08 | 6 | WX-07 | T-30-19 | Every break marked **Breaking** in changesets; nothing versioned | static | node changeset check | ✅ | ✅ green |
| 30-08-02 | 08 | 6 | WX-07 | T-30-19 | `upgrading.md` entries; website fences compile | doc gates | `pnpm spec:website-examples && pnpm spec:publish` | ✅ | ✅ green |
| 30-09-01 | 09 | 7 | WX-04, WX-06 | T-30-17 | Gate integrity, forbidden tokens, flip markers (2 WX-06 hits confirmed false positives: added rows, no changed expectation) | static | node scans over `phase_base..HEAD` | ✅ | ✅ green |
| 30-09-02 | 09 | 7 | WX-05 | T-30-18 | No touched file below base; leaf ≥ 0.9 (0.9512; 2 equivalent survivors) | mutation | node compare over `30-mutation-base.json` / `30-mutation-after.json` | ✅ | ✅ green |
| 30-09-03 | 09 | 7 | WX-01 | T-30-SC | Merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ✅ green |

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
