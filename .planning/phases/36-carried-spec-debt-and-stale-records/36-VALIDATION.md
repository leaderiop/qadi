---
phase: "36"
slug: "carried-spec-debt-and-stale-records"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-12"
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Drafted from the three research files' `## Validation Architecture` sections before planning: `36-RESEARCH.md` (records and wording), `36-RESEARCH-CODE.md` (code behaviour) and `36-RESEARCH-SEEDS.md` (the seed mechanism). Their per-item tables are the detailed map; this file is the contract.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 with `@effect/vitest` (`it.effect`, `TestClock`), React Testing Library on happy-dom, tstyche for `*.tst.ts` type pins, Stryker for mutation, Playwright for the example e2e (inside `pnpm check:pr`), and node/shell spec gates (`scripts/spec-revise.mjs`, `spec/scripts/verify-traceability.sh`, `scripts/check-doc-examples.mjs`, `scripts/check-api-surface.mjs`, `scripts/check-house-style.mjs`) |
| **Config file** | `packages/{devtools,react,core,http}/vitest.config.ts`, `stryker.{devtools,react}.mjs`, `examples/nextjs-newsroom` Playwright config |
| **Quick run command** | `pnpm vitest run --project <pkg> <file> < /dev/null`; for spec edits, `node scripts/spec-revise.mjs --check && bash spec/scripts/verify-traceability.sh --strict` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | about 1 to 4 s for a quick run, about 4 s for the react project, about 15 s for the devtools project, and about 130 s for the full gate (mutation skipped). Stryker for the measured files takes 10 to 20 min. |

---

## Sampling Rate

- **After every task commit:** run the touched test file(s). Add `pnpm typecheck` for any commit that changes an interface: the `TimelineStatus` skeleton, the `SeedSlot` skeleton, the `ReadySource` split, the `Baseline.Checked` fold, `DockModel.timelineStatus`. Add `node scripts/spec-revise.mjs --check` for a spec edit, and the comment-only proof (`36-RESEARCH.md` § Code Examples, the comment-stripped transpile comparison) for a src or test comment edit.
- **After every plan wave:** for a src wave, `pnpm build && pnpm vitest run` (all projects), `pnpm test:tstyche`, `node scripts/check-house-style.mjs` and `pnpm lint`. For a records wave, `pnpm spec:verify:strict && pnpm spec:api && pnpm spec:gates && pnpm spec:examples && pnpm spec:website-examples`.
- **Before verification:** `pnpm check:pr < /dev/null` green, including the example e2e at 30 passed, and the Stryker after-run over the measured files.
- **Max feedback latency:** about 130 s.

A defect test is committed RED on the phase base, before its fix. A type skeleton commit (`TimelineStatus`, `SeedSlot`) comes first, so that the RED is on behaviour, not on a missing export. A preserved behaviour is pinned green before the code around it moves.

---

## Per-Requirement Verification Map

| Req / item | Behavior | Test Type | Automated Command | File Exists | Status |
|------------|----------|-----------|-------------------|-------------|--------|
| DEBT-01 | one BEH-QD-219..221 block (a pure deletion of lines 175-345), fail-closed text once, tail prose once, header Revision 1.16, fence parity, no `-1` anchor consumer | spec gate + grep | the DEBT-01 rows of `36-RESEARCH.md` § Validation Architecture; `pnpm spec:examples`; `node scripts/spec-revise.mjs --check` | ✅ | ⬜ pending |
| DEBT-02 | the stale `Sources` token deleted from traceability row 71; every listed module exists (the premise departure is recorded in CCR-QD-427) | grep + node | the DEBT-02 rows of `36-RESEARCH.md` | ✅ | ⬜ pending |
| DEBT-03 | `MILESTONES.md`'s live claim struck through and annotated; no other live "undecided" claim | grep | the DEBT-03 rows of `36-RESEARCH.md` | ✅ | ⬜ pending |
| DEBT-04 (wording) | 24 IN-02/IN-05/IN-06, 25 IN-02, 26 IN-01/IN-03, 27 IN-01/IN-02 (refuted), 28 IN-01..IN-05, 29 IN-02/IN-03: each fixed, resolved, refuted or exempt, per the ledger | grep + comment-only proof | the per-item rows of `36-RESEARCH.md` | ✅ | ⬜ pending |
| DEBT-04 (code) 24 IN-01 | `describeSource` builds no recorder; `prepareSource` alone builds one (identity pin) | unit | `pnpm vitest run --project devtools packages/devtools/test/model/SimulationSource.prepare.test.ts packages/devtools/test/model/SimulationSession.test.ts` | ❌ W0 | ⬜ pending |
| DEBT-04 (code) 24 IN-03 | one `ReadySource`/`RefusedSource` spelling | type | `pnpm typecheck` | ✅ | ⬜ pending |
| DEBT-04 (code) 24 IN-04 | recorded resolved (`SimulationSession.test.ts:978-1005`) | unit (existing) | `pnpm vitest run --project devtools packages/devtools/test/model/SimulationSession.test.ts` | ✅ | ⬜ pending |
| DEBT-04 (code) 25 IN-01 | `reading` folded into `Baseline.Checked`; `baselineReading` removed (**Breaking**) | unit + type + RTL | `pnpm vitest run --project devtools packages/devtools/test/model/Replay.test.ts packages/devtools/test/model/SimulationSession.test.ts packages/devtools/test/react/Simulator.test.tsx` and `pnpm test:tstyche` | ✅ | ⬜ pending |
| DEBT-04 (code) 26 IN-02 | one empty-source default (the dock's `nothing` is not duplicated) | RTL + unit | `pnpm vitest run --project devtools packages/devtools/test/react/DevtoolsDock.test.tsx packages/devtools/test/model/DockModel.test.ts` | ✅ | ⬜ pending |
| DEBT-04 (code) 29 IN-01 | `DENY_WITHHELD` spreads `ALLOW_WITHHELD` | unit | `pnpm vitest run --project react packages/react/test/HydrationPayload.test.ts` | ✅ | ⬜ pending |
| DEBT-05 | stale citations corrected (`v4-http-smoke.test.ts` `registerApi`; the `stryker.http.mjs` comment, with its config body byte-identical) | grep + diff | the DEBT-05 rows of `36-RESEARCH.md` | ✅ | ⬜ pending |
| DEBT-05 (28 IN-06) | identity-changing rerender under StrictMode leaves exactly one current registration | RTL (characterisation, green) | `pnpm vitest run --project react packages/react/test/GateRegistry.test.tsx packages/react/test/GateWriter.test.tsx` | ✅ | ⬜ pending |
| D-02.1 TimelineFeed late accept | a re-entrant `configure` mid-backlog cannot write a superseded run's entries (TF9) | unit (RED at base) | `pnpm vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts` | ✅ | ⬜ pending |
| D-02.2 / D-13 timeline stop | `TimelineStatus` `Reading`/`Stopped{reason}`; interruption never reads as Stopped; restart; `DockModel.timelineStatus`; `useTimeline().status`; dock notice on the four timeline tabs, alert once, focus return to `qadi-dock-body`; `TimelineStatus` exported | unit + RTL + surface | `pnpm vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/model/DockModel.test.ts packages/devtools/test/react/useTimeline.test.tsx packages/devtools/test/react/DevtoolsDock.test.tsx packages/devtools/test/surface.test.ts` and `pnpm test:tstyche` | partly ❌ W0 | ⬜ pending |
| D-02.3 subject keepAlive | the seeded subject survives a late mount, a hidden-then-shown Activity with the provider outside, and a later subject change (SUBJ1-3, RED at base) | RTL | `pnpm vitest run --project react packages/react/test/QadiProvider.subject.test.tsx` | ❌ W0 | ⬜ pending |
| D-14 / D-19 seed lifetime | late mount, server-render shape, Activity, remount and bare registry read the seed (SD1-SD4, HL1-HL2, RED at base); the client supersedes a late seed only with the subject fix (SD5); no cross-registry read (HL3); no spent-seed re-read (HL4); no node for an unhydrated question (HL5); eviction forgets a cold seed (HL6); two registries keep two seeds (HL7) | RTL + unit | `pnpm vitest run --project react packages/react/test/QadiProvider.seed.test.tsx packages/react/test/Hydration.lifetime.test.ts packages/react/test/HydrationEngine.test.ts` | ❌ W0 | ⬜ pending |
| D-02.4 / D-16 focus ring and button | 2px `colors.accent` ring on programmatic focus targets when `:focus-visible`, cleared on blur (N12); token ratios pinned (accent 6.78/6.18/5.56, button text 12.10, border 6.57) | RTL + unit | `pnpm vitest run --project devtools packages/devtools/test/react/DiagnosticsNotice.test.tsx packages/devtools/test/react/theme.contrast.test.ts` | ❌ W0 | ⬜ pending |
| D-02.5 wording and directive | `DecisionCache.test.ts:864`, ADR-QD-081 amendment, the 16 wrong `Evaluate.ts` src comments, the inert `useScoped.ts:45` directive removed | grep + comment-only proof + lint | the Q4 rows of `36-RESEARCH.md`; `pnpm lint` | ✅ | ⬜ pending |
| Preserved | sweep S1-S9, provider P1-P5, eviction suite, hydration suites, DiagnosticsNotice and DockModel suites, the reactivity smoke canaries | unit + RTL | `pnpm vitest run --project react` and `pnpm vitest run --project devtools` | ✅ | ⬜ pending |
| WX-01 | gate green | full | `pnpm check:pr < /dev/null` (example e2e 30 passed) | ✅ | ⬜ pending |
| WX-02, WX-03, WX-07 | CCR-QD-427, ADR-QD-149, BEH-QD-516..518 (+519..520 or Unused), INV-QD-317..318, traceability, overview (gate 13: `TimelineStatus` added, `baselineReading` removed), changesets (`@qadi/devtools` minor with **Breaking**, `@qadi/react` patch), `upgrading.md` | spec gates | `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:api && pnpm spec:gates && pnpm spec:examples && pnpm spec:website-examples` | ✅ | ⬜ pending |
| WX-04 | no forbidden token or suppression in added lines | scan | the closing plan's scan (as in 35-07) | ✅ | ⬜ pending |
| WX-05 | coverage holds; no measured file falls under mutation (`36-mutation-base.json` first and alone; the CLI `--mutate` override for files outside the configs' globs) | coverage + mutation | `pnpm coverage`; `pnpm exec stryker run stryker.devtools.mjs`; `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/<file>` | ✅ | ⬜ pending |
| WX-06 | each defect RED before its fix; each preserved behaviour pinned first; the subject fix before the seed fix | history | the closing plan's commit-order check | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `36-mutation-base.json`: the phase's first commit, alone
- [ ] `packages/react/test/QadiProvider.subject.test.tsx` (SUBJ1-3), RED on the base
- [ ] `packages/react/test/QadiProvider.seed.test.tsx` (SD1-SD5) and `packages/react/test/Hydration.lifetime.test.ts` (HL1-HL7)
- [ ] a `SeedSlot` type skeleton commit, then the migration of the five `HydrationEngine.test.ts` seam tests, before the seed fix
- [ ] a `TimelineStatus` type skeleton commit before the timeline status tests TF10/TF11
- [ ] `packages/devtools/test/react/contrast.ts` and `theme.contrast.test.ts` (no contrast helper exists)
- [ ] `packages/devtools/test/model/SimulationSource.prepare.test.ts` (24 IN-01 identity pin)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-browser appearance of the 2px accent ring, the amber notice tint and the hardened Restart button | D-02.4, D-16 (UI-SPEC visual backstop) | `:focus-visible` heuristics and tint rendering cannot be read in happy-dom | In Chromium and one more browser, open the example dock, keyboard-focus the Services root and the dock body, trigger a stopped notice, and attach screenshots at verification |
| Whether React selective hydration produces a late mount in a real Next app | D-14 (seed research assumption A1) | It needs a real streaming render | Covered indirectly by the e2e's SSR path; recorded as an assumption |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 150s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
