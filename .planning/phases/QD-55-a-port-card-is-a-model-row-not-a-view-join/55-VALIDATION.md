---
phase: "55"
slug: "a-port-card-is-a-model-row-not-a-view-join"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-18"
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `55-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`, `@testing-library/react`, happy-dom; tstyche (`*.tst.ts`); Stryker for mutation |
| **Config file** | `vitest.config.ts` (root; coverage `src/model/**` 95%, `src/react/**` 90%); `packages/devtools/vitest.config.ts` (`devtools`); `tstyche.json`; `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/PortCards.test.ts packages/devtools/test/react/ServicesPanel.characterisation.test.tsx < /dev/null` (repo root only) |
| **Full suite command** | `pnpm check:pr < /dev/null` (repo root, stdin closed) |
| **Estimated runtime** | quick ~5 s; full several minutes |

---

## Sampling Rate

- **After every task commit:** Run the quick run command plus any touched file's own test
- **After every plan wave:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm exec tstyche`, `pnpm lint`, `pnpm circular`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, then the two scoped Stryker runs and `55-mutation.mjs compare`
- **Max feedback latency:** ~30 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 55-01-T1 | 55-01 | 1 | WX-02, WX-06 | T-55-03 | base facts, reserved ids and the API surface recorded on the untouched tree | base check | `node -e` base-facts check; `bash -c` reserved-id check against `phase_base` | ✅ | ⬜ pending |
| 55-01-T2 | 55-01 | 1 | WX-05 | T-55-01, T-55-02 | mutation base measured on the clean tree and committed first | harness | `pnpm exec stryker run stryker.devtools.mjs --mutate '…/DockModel.ts,…/Wiring.ts'`; `node -e` base-JSON shape check; `node -e` first-commit check | ❌ W0 (`55-mutation.mjs`) | ⬜ pending |
| 55-02-T1 | 55-02 | 2 | CARD-01, WX-06 | T-55-04, T-55-05 | characterisation reaches the panel only through the public dock | characterisation | `pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.characterisation.test.tsx < /dev/null`; `node -e` import and golden check; `node -e` commit-order check | ❌ W0 | ⬜ pending |
| 55-02-T2 | 55-02 | 2 | CARD-01, WX-06 | T-55-04, T-55-05 | call lists and the real report pinned before any src commit | characterisation | same vitest command; `node -e` golden check; `node -e` commit-order check | ❌ W0 | ⬜ pending |
| 55-03-T1 (tracer) | 55-03 | 3 | CARD-02, WX-04, WX-06 | T-55-06, T-55-08 | join groups with a `Map` and the registry's own keys; store recomputes only on a moved input | unit + model (RED by import) | `pnpm exec vitest run --project devtools packages/devtools/test/model/PortCards.test.ts packages/devtools/test/model/DockModel.test.ts …characterisation… < /dev/null`; `node -e` module and store check; `pnpm typecheck && pnpm lint && pnpm circular`; `node -e` RED-order check | ❌ W0 (RED by import) | ⬜ pending |
| 55-03-T2 | 55-03 | 3 | CARD-03, WX-07 | T-55-07 | a word outside the registry is not port activity | unit (RED) + BDD | `pnpm exec vitest run --project devtools packages/devtools/test/model/Wiring.test.ts … < /dev/null`; `pnpm test:bdd < /dev/null`; typecheck/lint/circular + `pnpm -s spec:api` (935); `node -e` narrowing and commit check | ✅ | ⬜ pending |
| 55-04-T1 | 55-04 | 4 | CARD-02, CARD-04 | T-55-09, T-55-10, T-55-11 | call text is `describeCall` (never a value); calls grouped by registry key | unit (RED) | `pnpm exec vitest run --project devtools packages/devtools/test/model/PortCards.test.ts … < /dev/null`; `node -e` call-word check; typecheck/lint/circular; `node -e` RED-order check | ✅ | ⬜ pending |
| 55-04-T2 | 55-04 | 4 | CARD-03 | T-55-10 | a misspelt port is a compile error; no string port comparison | tstyche + grep | `pnpm exec tstyche packages/devtools/test/model/PortCards.tst.ts < /dev/null`; `pnpm test:tstyche < /dev/null`; D-08 `git diff` grep; `node -e` pin check | ❌ W0 | ⬜ pending |
| 55-05-T1 | 55-05 | 5 | WX-06 | T-55-08 | the services store keeps its reference unless an input moved | model | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts < /dev/null`; `node -e` M49..M54 check; `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 55-05-T2 | 55-05 | 5 | CARD-01, CARD-04, WX-04 | T-55-12, T-55-13, T-55-14 | panel computes nothing; defaulted tone kept; host strings rendered as text | render + characterisation | `pnpm exec vitest run --project devtools …characterisation… …ServicesPanel.test.tsx …reading… …DevtoolsDock… …DiagnosticsScreens… …DiagnosticsLifetime… …PortCards… …DockModel… < /dev/null`; `node -e` panel scan; `node -e` D-14 twin check; typecheck/lint/circular; `node -e` commit check | ✅ (rewritten short) | ⬜ pending |
| 55-06-T1 | 55-06 | 6 | WX-05 | T-55-15 | evidence measured on the final tree, config outside the repo | harness | gate and evidence Stryker runs; `node -e` JSON shape and freshness check | ❌ W0 | ⬜ pending |
| 55-06-T2 | 55-06 | 6 | WX-05 | T-55-15 | D-15 judged by the rule committed before the change | harness | `node .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation.mjs compare …/55-mutation-static.json`; `node -e` commit check | ❌ W0 | ⬜ pending |
| 55-07-T1 | 55-07 | 7 | CARD-05, WX-02 | T-55-16 | ADR numbers copied from the committed JSONs | gate | `node -e` ADR-QD-168 check; `node scripts/spec-revise.mjs --check` | ✅ | ⬜ pending |
| 55-07-T2 | 55-07 | 7 | WX-02 | T-55-16 | BEH entries under reserved ids, earlier notes untouched | gate | `node -e` BEH check; `node scripts/spec-revise.mjs --check`; `pnpm spec:examples && pnpm spec:claims` | ✅ | ⬜ pending |
| 55-08-T1 | 55-08 | 8 | WX-02 | T-55-17 | INV headings match the linked anchors | gate | `node -e` INV and traceability check; `node scripts/spec-revise.mjs --check` | ✅ | ⬜ pending |
| 55-08-T2 | 55-08 | 8 | WX-02, WX-03, WX-07 | T-55-17, T-55-18 | one Breaking entry and the 0.13 note; nothing versioned | gate + review | `node -e` CCR, changeset and upgrade check; `pnpm spec:verify:strict < /dev/null`; spec-revise `--check`, `spec:website-examples`, `spec:claims`, `spec:gates`, `spec:api` (935) | ✅ | ⬜ pending |
| 55-09-T1 | 55-09 | 9 | WX-02, WX-04, WX-05, WX-06, CARD-03, CARD-04 | T-55-20, T-55-21 | whole-phase scope, constructs, order, kept tests and ids | scan | `node -e` phase scan; D-08 grep; `node -e` panel scan; `55-mutation.mjs compare …static.json` | ✅ | ⬜ pending |
| 55-09-T2 | 55-09 | 9 | WX-01, WX-07, CARD-01..05 | T-55-19 | nothing pushed, tagged, versioned or published | full gate | `pnpm check:pr < /dev/null`; `node -e` release check | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-01 | every card's markup byte-identical before/after | characterisation (render via dock) | `pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.characterisation.test.tsx < /dev/null` | ❌ W0 |
| CARD-02 | `portCards` returns the row per `PortName` with all wording | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/PortCards.test.ts < /dev/null` | ❌ W0 (RED by import first) |
| CARD-03 | misspelt/unknown port is a compile error; one entry per registry port | tstyche + unit | `pnpm exec tstyche packages/devtools/test/model/PortCards.tst.ts`; `pnpm exec vitest run --project devtools packages/devtools/test/model/Wiring.test.ts < /dev/null` | ❌ W0 / ✅ |
| CARD-04 | panel prints a hand-built `ServicesView`; testids and tag mapping | render | `pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.test.tsx < /dev/null` | ✅ (rewritten short) |
| CARD-04 | `services` store: one moment, reference kept | model | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts < /dev/null` | ✅ (cases added) |
| CARD-05 / WX-02 | records exist with reserved numbers | gate | `pnpm spec:verify:strict`, `pnpm spec:api`, `node scripts/check-devtools-claims.mjs` | ✅ |
| WX-04 | no `as`/`switch`/`any`/`!` | gate | `pnpm lint` | ✅ |
| WX-05 | mutation not lower | harness | `node .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation.mjs compare` | ❌ W0 |
| WX-07 | Breaking recorded | review | changeset + `upgrading.md` 0.13 entry present | ❌ |

---

## Wave 0 Requirements

- [ ] `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` — CARD-01, written on the base, green, never edited
- [ ] `packages/devtools/test/model/PortCards.test.ts` — CARD-02/04 (RED by import)
- [ ] `packages/devtools/test/model/PortCards.tst.ts` — CARD-03
- [ ] `55-mutation.mjs` + `55-mutation-base.json` — WX-05
- [ ] a `servicesInput.ts` store double for the render test (cf. `questionsPanelInput.ts`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Long text wraps inside a card (UI-SPEC backstop) | CARD-01 | No truncation style exists; layout is not asserted by happy-dom | Optional: open the dock's Services tab with a long implementation name and reason; nothing changes visually versus the base |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
