---
phase: "13"
slug: "lost-wave-gaps"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-10"
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest`; tstyche 7 (type level); BDD via `@qadi/features`; house-style rules in `scripts/check-house-style.mjs` (run by `pnpm lint`) |
| **Config file** | `vitest.config.ts` (projects `core`, `http`, `devtools`, `audit`, `predicate-sql`, `predicate-prisma`, `react`, `testing`; coverage core 95%, others 90%), `tstyche.config.json`, `stryker*.mjs` (JSON reports under `reports/mutation*/mutation.json`) |
| **Quick run command** | `pnpm vitest run --project <name> <file> [-t '<test>']`; `pnpm exec tstyche <file.tst.ts>`; `node scripts/check-house-style.mjs` |
| **Full suite command** | `pnpm check:pr` (13-12 Task 1); mutation compared by script in 13-12 Task 2 |
| **Estimated runtime** | Quick: under 60 s per task command. Full: over 10 minutes, run in the background |

Phase base: recorded once in `13-base.txt` by the first plan to run (after 12-03). Plans run one at a time, in wave order (`use_worktrees` false).
Every verify uses `/usr/bin/grep` and quoted globs; negative id gates read only lines added since the base.

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command.
- **After each wave:** the touched projects' full vitest runs plus `pnpm typecheck && pnpm lint && pnpm circular`. `pnpm spec:api` is expected red from 13-05 until 13-11 Task 2 adds the overview rows.
- **Before `/gsd-verify-work`:** `pnpm check:pr` green and the mutation comparison exits 0 (13-12).
- **Max feedback latency:** under 60 s per task command, except `pnpm test:bdd`, 13-12 Tasks 1–2.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | GAP-01, XC-06 | T-13-01 | A public endpoint's handler denial is logged once | integration RED | `! pnpm vitest run --project http …http.test.ts -t "public endpoint's handler-raised denial"` + matrix row | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | GAP-01 | T-13-01, T-13-02 | Public arm enforces through `AuthorizeRequest.ts` | integration + type + greps | `pnpm vitest run --project http && pnpm exec tstyche …` + provision-count greps | ✅ | ⬜ pending |
| 13-01-03 | 01 | 1 | XC-02 | T-13-03 | — | doc gates | `node scripts/spec-revise.mjs --check && pnpm spec:examples` | ✅ | ⬜ pending |
| 13-02-01 | 02 | 1 | GAP-03, XC-06 | T-13-04 | — | unit + BDD RED | four `! pnpm vitest run --passWithNoTests … -t '<name>'` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 1 | GAP-03 | T-13-04 | The sweep offers `DropSignature` | unit + BDD | `pnpm vitest run --project devtools <3 files>` + features run | ✅ | ⬜ pending |
| 13-02-03 | 02 | 1 | GAP-04, XC-06 | T-13-05 | — | unit RED | three `! pnpm vitest run --passWithNoTests … -t '<name>'` | ❌ W0 | ⬜ pending |
| 13-02-04 | 02 | 1 | GAP-04, GAP-10 | T-13-05 | hasSignature/hasCustom get a remedy or a named skip | unit | `pnpm vitest run --project devtools` + greps | ✅ | ⬜ pending |
| 13-03-01 | 03 | 2 | GAP-02 | T-13-06 | One closed field table | unit + type RED→GREEN | `pnpm vitest run --project devtools …SimulationFields.test.ts … && pnpm exec tstyche …` | ❌ W0 | ⬜ pending |
| 13-03-02 | 03 | 2 | GAP-02 | T-13-06 | Sweep and remedies fold over the table | unit | `pnpm vitest run --project devtools` + greps | ✅ | ⬜ pending |
| 13-03-03 | 03 | 2 | GAP-02, XC-06 | T-13-07 | — | unit RED | `! pnpm vitest run --passWithNoTests …Replay.test.ts -t '…'` | ✅ | ⬜ pending |
| 13-03-04 | 03 | 2 | GAP-02, XC-05 | T-13-07 | Unseeded list and fixture ports derive from the table | unit | `pnpm vitest run --project devtools` + greps | ✅ | ⬜ pending |
| 13-04-01 | 04 | 3 | GAP-02 | T-13-08 | — (checkpoint:decision, blocking-human: chip buffer) | decision | n/a | n/a | ⬜ pending |
| 13-04-02 | 04 | 3 | GAP-02, GAP-03 | T-13-08 | Chips and fields render from the session | unit + type | `pnpm vitest run --project devtools && pnpm exec tstyche …` + greps | ✅ | ⬜ pending |
| 13-04-03 | 04 | 3 | XC-02 | T-13-09 | No lost id (INV-QD-245) appears as new | doc gates | `spec-revise --check && pnpm spec:examples && pnpm spec:claims` + added-line id gate | ✅ | ⬜ pending |
| 13-05-01 | 05 | 1 | GAP-05, XC-06 | T-13-10 | Exporter key pinned before change | unit golden GREEN + RED | golden `-t` run, `! … GuardHealthCheck -t "a probe counts no decisions"` | ❌ W0 | ⬜ pending |
| 13-05-02 | 05 | 1 | GAP-05 | T-13-10, T-13-11 | Six metrics declared once | unit + lint + madge | `pnpm vitest run --project core && pnpm typecheck && pnpm lint && pnpm circular` + ctor count 0 | ✅ | ⬜ pending |
| 13-05-03 | 05 | 1 | GAP-05 | T-13-10 | A renamed metric fails every reader | unit + greps | `pnpm vitest run --project core` + literal count 36 → 0 | ✅ | ⬜ pending |
| 13-06-01 | 06 | 2 | GAP-05, XC-06 | T-13-12 | — | unit RED | `! pnpm vitest run --project predicate-sql …` (and prisma) | ✅ | ⬜ pending |
| 13-06-02 | 06 | 2 | GAP-05 | T-13-16 | Compile counter package-private | unit | `pnpm vitest run --project predicate-sql --project predicate-prisma` + greps | ❌ W0 (`CompileMetrics.ts`) | ⬜ pending |
| 13-06-03 | 06 | 2 | GAP-05, XC-06 | T-13-12 | — | unit RED | `! pnpm vitest run --project audit …` | ✅ | ⬜ pending |
| 13-06-04 | 06 | 2 | GAP-05 | T-13-12, T-13-16 | Audit counters readable, not public | unit + greps | `pnpm vitest run --project audit && pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 13-07-01 | 07 | 3 | GAP-06 | T-13-17 | Each metric rule refuses an injected violation | gate RED | house-style output checks | ✅ | ⬜ pending |
| 13-07-02 | 07 | 3 | GAP-06, XC-02 | T-13-18 | Table ↔ declarations agree | gate + doc | `node scripts/check-house-style.mjs && spec-revise --check && pnpm spec:examples` + added-line id gate | ✅ | ⬜ pending |
| 13-07-03 | 07 | 3 | GAP-06 | T-13-17 | — | doc + lint | `pnpm spec:website-examples && pnpm lint` | ✅ | ⬜ pending |
| 13-08-01 | 08 | 2 | GAP-08 | T-13-13 | Both unguarded cadences pinned (mutation-discriminated) | integration | `pnpm vitest run --project http …http.test.ts …PortRoutes.test.ts` | ✅ | ⬜ pending |
| 13-08-02 | 08 | 2 | GAP-10 | T-13-14 | One unguarded-route constructor | integration + greps | `pnpm vitest run --project http && pnpm typecheck && pnpm lint && pnpm circular` | ❌ W0 (`UnguardedRoute.ts`) | ⬜ pending |
| 13-08-03 | 08 | 2 | GAP-10, XC-06 | T-13-15 | — | type RED | `! pnpm exec tstyche packages/http/test/PermissionRegistry.tst.ts` | ❌ W0 | ⬜ pending |
| 13-08-04 | 08 | 2 | GAP-10 | T-13-15 | No-resource routes need no loader; resource routes still do | type + integration | `pnpm exec tstyche … && pnpm vitest run --project http …` + loader file list | ✅ | ⬜ pending |
| 13-09-01 | 09 | 2 | GAP-07 | T-13-21 | Missing resource wins over missing action | unit (inversion-discriminated) | `pnpm vitest run --project core …Evaluate.test.ts -t "a missing resource wins…"` | ✅ | ⬜ pending |
| 13-09-02 | 09 | 2 | GAP-09 | T-13-19, T-13-20 | Batch under cache and sink: own decision, own id, ordered records | unit (id-key mutation-discriminated) | `pnpm vitest run --project core …SubjectSet.test.ts -t "under a decision cache and a sink"` | ✅ | ⬜ pending |
| 13-09-03 | 09 | 2 | GAP-10 | — | `LifecycleOptions` cannot drift | type | `pnpm exec tstyche packages/core/test/Lifecycle.tst.ts && pnpm typecheck` | ❌ W0 | ⬜ pending |
| 13-10-01 | 10 | 4 | GAP-12 | T-13-22 | Placeholder rule RED on 14 sites | gate RED | house-style `[no-numbering-placeholder]` count = 14 | ✅ | ⬜ pending |
| 13-10-02 | 10 | 4 | GAP-11, GAP-12 | T-13-22 | Placeholders resolved; insertion refused | gate + unit | `node scripts/check-house-style.mjs` + tree grep empty + core port suites | ✅ | ⬜ pending |
| 13-13-01 | 13 | 2 | GAP-11, GAP-10 | T-13-23 | Docs and citations true | doc greps | `spec-revise --check && pnpm typecheck && pnpm lint` + `grep -F` checks | ✅ | ⬜ pending |
| 13-13-02 | 13 | 2 | GAP-10 | T-13-23 | Capacity/permits asymmetry stated; comment-only diff | doc greps | added-line comment-only check + DecisionCache tests | ✅ | ⬜ pending |
| 13-11-01 | 11 | 5 | GAP-09, XC-02 | T-13-24 | INV-QD-016 true under a cache | doc | INV greps + `spec-revise --check` | ✅ | ⬜ pending |
| 13-11-02 | 11 | 5 | XC-03 | T-13-25 | Overview names every export | doc gates | `pnpm spec:api` + greps | ✅ | ⬜ pending |
| 13-11-03 | 11 | 5 | XC-02, GAP-10 | T-13-25 | No lost-wave id defined anew | doc gates | `pnpm spec:verify:strict && pnpm spec:api && pnpm spec:examples && pnpm spec:claims && pnpm spec:gates` + added-line definition gate | ✅ | ⬜ pending |
| 13-12-01 | 12 | 6 | XC-01 | — | Merge gate green | full gate | `pnpm check:pr` | ✅ | ⬜ pending |
| 13-12-02 | 12 | 6 | XC-05 | T-13-27 | No touched file's mutation score falls | mutation compare | node comparator over `13-mutation-{base,after}.json` | ❌ W0 (score files) | ⬜ pending |
| 13-12-03 | 12 | 6 | — | T-13-26 | — (checkpoint:decision, blocking-human: rescue branches) | decision | n/a | n/a | ⬜ pending |
| 13-12-04 | 12 | 6 | — | T-13-26 | Only the chosen branches deleted, locally | git | `git branch --list 'rescue/*'` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/http/test/http.test.ts` public-endpoint cases and the `RequestEnforcement.test.ts` public row, written red in 13-01-01.
- [ ] Devtools signature tests (`Edits`, `WhatIf`, `SimulationSession`, `Remedies`, `Replay`) and the BDD scenario, written red in 13-02-01, 13-02-03, 13-03-03.
- [ ] `packages/devtools/test/model/SimulationFields.test.ts` / `.tst.ts`, created red in 13-03-01.
- [ ] `packages/core/test/EvaluationMetrics.test.ts` (golden green first, pins red), created in 13-05-01.
- [ ] Compiler and audit metric tests, ported red in 13-06-01 and 13-06-03.
- [ ] `packages/http/test/PermissionRegistry.tst.ts`, created red in 13-08-03; `packages/core/test/Lifecycle.tst.ts` created in 13-09-03.
- [ ] `13-base.txt` recorded by the first plan to run; `13-mutation-base.json` produced in 13-12-02 from a worktree at the base.

Existing infrastructure covers everything else. Nothing needs installing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full merge gate green | XC-01 | `pnpm check:pr`'s `pnpm example` step runs `playwright install --with-deps chromium`, which needed sudo on the development host in earlier phases | Run `pnpm check:pr` where Playwright's dependency install works; otherwise run its remaining steps individually and record which one was skipped |
| Chip typing buffer | GAP-02 | checkpoint:decision 13-04-01 | User picks A (view, recommended) or B (session) |
| Rescue branches | ROADMAP criterion 5 | checkpoint:decision 13-12-03 | User picks keep-wave5 (recommended), delete-all or keep-all |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60 s per task (the full gate and the mutation comparison run once, at the end)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
