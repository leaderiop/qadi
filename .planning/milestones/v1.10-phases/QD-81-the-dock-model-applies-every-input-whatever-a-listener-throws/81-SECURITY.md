---
phase: "QD-81"
slug: "the-dock-model-applies-every-input-whatever-a-listener-throws"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 22
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-25"
---

# Phase QD-81 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Host listener → dock model | A host subscribes to any of the model's stores; its listener runs inside `configure` and on every record | Whatever a listener throws; the model's inputs |
| Host status listener → feed run | A status announcing work (`Reading`, `Starting`, `Running`) is published before the run is forked | The status value; the run's start |
| Host timeline listener → timeline feed `configure` | A listener may call `configure` again from inside a step (reentrancy) | The held inputs |
| Decision record, specification, README and changeset → readers | ADR-QD-194, the amended ADRs, BEH/INV records and the release note state what the code does | Claims about behaviour |
| Working tree → mutation record; close record → the phase's claim | The base and close Stryker records stand for the source they were measured on | Scores, survivors, head commits |
| Archived checks → this phase's evidence | Phase 79/80 checks re-run from scratch copies | Pass/fail lines |
| The phase's commits → the branch | Commits on `arch-wave-15` (never pushed) | Files staged, trailers |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation / evidence | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-81-01 | Tampering | `81-mutation-base.json` | medium | mitigate | The record's `head` is `phase_base` e757ef37, equal to 902d2128 outside `.planning/`; `81-mutation.mjs` `dirtyReasons` refuses a record from a modified tree (self-test 28); 34d1e005 is the only commit touching the record | closed |
| T-81-02 | Repudiation | base facts, archived-check lines | low | mitigate | The recorded reservation sha256 and api-surface line (942) equal fresh runs; house-style 604 → 607 is the three new test files; archive unchanged | closed |
| T-81-03 | Tampering | `81-check.mjs` (`single-source`) | medium | mitigate | `81-RED-EVIDENCE.md` § 81-01 shows each mode failing once; `single-source` failed on the base with its named reasons; self-test 125 | closed |
| T-81-04 | Denial of service | `DockModel.configure`, record path | high | mitigate | `DockModel.ts` runs `configure` through `callAll`; DL1..DL20 in `DockModel.listeners.test.ts`, 13 red on the base, the green-on-base rows shown failing by a scratch edit | closed |
| T-81-05 | Repudiation | thrown values | medium | mitigate | DL12 (both errors and the exact message), DL13 (`undefined`), DL14 (`null`), DL18/DL19 (nested `AggregateError`); `ExternalStore.callAll.test.ts` (8 tests) | closed |
| T-81-06 | Denial of service | begin-to-fork windows | high | mitigate | `try { publish } finally { fork }` in `TimelineFeed.readSource`, `DiagnosticsFeed.start`, `SimulationSession.start`; TF28, TF29, F31, SR6; G49 pins the gates feed's fork-then-publish | closed |
| T-81-07 | Tampering | `TimelineFeed.configure` reentrancy | medium | mitigate | Both steps run through `callAll` and read `held` when they run; TF37 | closed |
| T-81-08 | Repudiation | `callAll` | medium | mitigate | `throwCollected` decides by count, never flattens; `callAll` is the only collect loop (`single-source`) and is absent from both barrels | closed |
| T-81-09 | Information disclosure | `callAll`'s `AggregateError` | low | accept | Accepted (AR-81-01). Every call site passes a static literal message | closed |
| T-81-10 | Denial of service | `readSource`, `DiagnosticsFeed.start`, `SimulationSession.start` | high | mitigate | Publish first inside `try`, fork in `finally`, so a synchronous `Live`/`Stopped` is not overwritten by `Starting`; TF28, F31, SR6 | closed |
| T-81-11 | Tampering | `TimelineFeed.configure` reentrancy | medium | mitigate | As T-81-07; TF37 pins one read per call | closed |
| T-81-12 | Denial of service | `DockModel.configure` | high | mitigate | Seven thunks through `callAll`; each DL row asserts an identical second configure changes nothing | closed |
| T-81-13 | Denial of service | record path (`timeline.accept`) | high | mitigate | The rail is a derived store over the timeline; the explorer's and simulation's `setSightings` are rail listeners; DL15, DL20, LF1, LF2 | closed |
| T-81-14 | Tampering | `configure` reentrancy | medium | mitigate | `held = completeDockInputs(next)` first; every step reads `held` inside its thunk; DL17 compares with a fresh model | closed |
| T-81-15 | Repudiation | ADR-QD-194 and amended ADRs | medium | mitigate | ADR-QD-194 1.3 has a before/after table with a test per row; ADR-QD-177/185/191/192 carry dated amendments with past text kept; `spec-revise --check`, `spec:verify:strict` 21/21 | closed |
| T-81-16 | Repudiation | BEH-QD-656/699/728/735, INV-QD-373/390 | medium | mitigate | Superseded strings absent; BEH-QD-735's counts equal CR22's assertions; BEH-QD-741..745, INV-QD-407/408 exist | closed |
| T-81-17 | Repudiation | README, changeset | low | mitigate | Superseded README phrases absent; changeset is `"@qadi/devtools": patch`; the earlier capacity changeset unchanged | closed |
| T-81-18 | Tampering | `81-mutation-close.json` | medium | mitigate | `compare` refuses unequal invocations; the one new survivor closed by F33; no `packages/devtools/src` change since the close head b340b9d5; `compare` exit 0 | closed |
| T-81-19 | Repudiation | archived checks | low | mitigate | Run from scratch copies; TF29 the only failure, re-recorded in `81-RED-EVIDENCE.md`; archive unchanged | closed |
| T-81-20 | Repudiation | plan commits | low | mitigate | `trailers`: 37 plan commits, one trailer each; all 53 commits in `e757ef37..HEAD` carry exactly one. The 12 review-fix commits fall outside the scan's subject pattern but each is listed in `81-REVIEW-FIX.md` | closed |
| T-81-21 | Information disclosure | local config files | medium | mitigate | No commit in the range lists `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/`, `*.iter*.md`, `.review-diagnostics/` or `.gitkeep` | closed |
| T-81-SC | Tampering | package installs | high | mitigate | `git diff e757ef37..HEAD` (and from 902d2128) over `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `packages/*/package.json` is empty | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-81-01 | T-81-09 | `callAll`'s `AggregateError` carries only values host listeners threw, back to the host that published; it adds no model state and crosses no process boundary. Every call site's message is a static literal, and `callAll` is package-private | Plan 81-04 threat register (accept) | 2026-11-25 |

The one accepted risk is low severity and below the `high` block threshold.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-25 | 22 | 22 | 0 | gsd-security-auditor (ASVS L1, block_on high), at 7baeb59e |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-25
