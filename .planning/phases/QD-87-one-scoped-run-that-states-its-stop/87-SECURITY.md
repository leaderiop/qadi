---
phase: "QD-87"
slug: "one-scoped-run-that-states-its-stop"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 27
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-25"
---

# Phase QD-87 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| host source, collector or ports layer → stated run | the engine a store runs may die, interrupt itself or throw a hostile value; the run states it through `causeMessage` |
| snapshot → developer's screen | `Broke.message` and `Stopped.reason` reach the screen only as React text children |
| host listener → store publish | a listener may throw or supersede the run from inside the publish |
| host inputs → configure | a refused input throws before anything moves; a configure after close does nothing |
| phase scripts → the commit history | the scorer, its records, the pinned check and the judges are trusted by every later compare |
| earlier phase scripts → this phase | Phase 85/86 checks run from scratch copies; their directories are read-only |
| spec → code | the spec is normative; a stale sentence about interruptions or the removed hook misleads every later change |
| record numbers → the shared reservation | only the ids reserved for Phase 87 are used |
| measured floor → the close | the mutation base is recorded once and never re-baselined |
| release notes → hosts | two patch changesets state the visible change; nothing is versioned here |
| local branch → remote and registry | nothing crosses: no push, tag or publish |

---

## Threat Register

Built from the `<threat_model>` blocks of `87-01-PLAN.md` … `87-11-PLAN.md` (authored at plan time). T-87-SC repeats in every plan; it is listed once.

| Threat ID | Category | Severity | Disposition | Evidence | Status |
|-----------|----------|----------|-------------|----------|--------|
| T-87-01 | Information disclosure (stack frames in the Simulator) | low | mitigate | `Broke.message`/`Stopped.reason` come only from `causeMessage` (`StatedRun.ts:92`, `SimulationSession.ts:435`); sinks are React text children (`Simulator.tsx:109-111`, `StoppedBox.tsx:140-142`); no HTML, network, storage or console sink in devtools src; SX1-SX3, SB3 pass; ADR-QD-200 states it crosses no trust boundary | CLOSED |
| T-87-02 | Denial of service (feed looks live while nothing runs) | medium | mitigate | TX1, TX2, DX1, DX2 red on the base (`87-RED-EVIDENCE.md:57-70`), green at HEAD; TX3-7/DX3-7 pin outside interruptions; `StatedRun.ts:92` | CLOSED |
| T-87-03 | Repudiation (mutation base, red evidence) | low | mitigate | `87-mutation-base.json` names phase_base, one commit `f00dbdae`, never changed; scorer self-test 103 | CLOSED |
| T-87-04 | Repudiation (pinned check) | low | mitigate | held set from `git ls-tree` at phase_base; `--all-applied` 122 held, 5 born, 2 declared edits; self-test 35 | CLOSED |
| T-87-05 | Tampering (landed session result overwritten by a later defect) | medium | mitigate | stop hook guarded by `run._tag !== "Running"` (`SimulationSession.ts:366`); SC10 passes | CLOSED |
| T-87-06 | Denial of service (start-up publish whose listener throws and reconfigures) | medium | mitigate | `StatedRun.ts:84-97` try/finally; SC7-SC9 pin rethrow once by identity with the newer run live | CLOSED |
| T-87-07 | Tampering (`87-check.mjs` judges) | medium | mitigate | self-test 301; every mode seen failing (`87-RED-EVIDENCE.md:144-186`); live modes pass at HEAD | CLOSED |
| T-87-08 | Elevation of privilege (forbidden forms, house-rule budgets) | medium | mitigate | `scan-forbidden` passes; `AGENTS.md`, `check-house-style.mjs`, `.oxlintrc.json` unchanged | CLOSED |
| T-87-09 | Repudiation (trailers) | low | mitigate | `trailers`: 37 commits, each with the one trailer | CLOSED |
| T-87-10 | Tampering (Phase 85/86 directories, milestones) | medium | mitigate | no diff under `.planning/milestones`, `QD-85*`, `QD-86*`; earlier checks run from `$TMPDIR/qd87` | CLOSED |
| T-87-11 | Repudiation (the ledger) | low | mitigate | every ledger row matches on re-run, incl. the measured 85/86 `scan-ids` exit 1 | CLOSED |
| T-87-12 | Tampering (stale run writing over the current one) | high | mitigate | `guard` checks `runs.isCurrent(token)` (`StatedRun.ts:79-82`); the stop is gated on it (`:92`); ST7, ST13-15, ST17 seen failing without it; feeds write through `guard`; session `land` re-checks `live.current()` (`SimulationSession.ts:419`, held by argument — recorded EQUIVALENT mutant) | CLOSED |
| T-87-13 | Denial of service (failure lost, status looks live) | medium | mitigate | `StatedRun.ts:92` states every current non-success exit, self-interrupt included; `causeMessage` is total (`ThrownMessage.ts:57-64`); ST3-ST5, ST17 pass (ST5 hostile value gives the placeholder) | CLOSED |
| T-87-14 | Repudiation (listener throw swallowed on the starting publish) | medium | mitigate | try/finally; ST2, ST16, SC7-SC9; `ExternalStore.ts:65-92` rethrows one value as itself, several as one `AggregateError` | CLOSED |
| T-87-15 | Denial of service (timeline/diagnostics shows Reading/Starting with nothing running) | medium | mitigate | both feeds go through `makeStatedRun` (`TimelineFeed.ts:172`, `DiagnosticsFeed.ts:171`); `feeds-supply-only-engine` passes; DX7 | CLOSED |
| T-87-16 | Tampering (configure after close or with refused input) | medium | mitigate | `ConfigurePrologue.ts:42-47` order closed → complete → held → same → hold → steps; CP1-CP8 seen failing; SC12; all three feeds use `makeConfigure` | CLOSED |
| T-87-17 | Tampering (landed `Ran` overwritten by a later defect) | medium | mitigate | as T-87-05 | CLOSED |
| T-87-18 | Information disclosure (stack frames in the Simulator's `pre`) | low | mitigate | `{broke.message}` as a text child of `<pre>`; SB3 pins `textContent`; `simulator-pre` passes | CLOSED |
| T-87-19 | Denial of service (hostile die throwing while rendered) | low | mitigate | `causeMessage` total; SX2, ST5 pin the placeholder; no raw `Cause.pretty`/`String(cause)` in devtools src | CLOSED |
| T-87-20 | Repudiation (property silently lost with the hook's rows) | medium | mitigate | audit in `87-08-SUMMARY.md` and ADR-QD-200 maps R3, R5-R7, R9, laws 5 and 7 to ST rows; edited rows seen failing; `onfailure-gone` passes | CLOSED |
| T-87-21 | Repudiation (stale spec sentence) | medium | mitigate | `records --close` passes; spec amendments committed; `spec:verify:strict` green in 87-09/87-11 | CLOSED |
| T-87-22 | Tampering (record number outside the reservation) | medium | mitigate | only ADR-QD-200, CCR-QD-479, BEH-QD-771..775, INV-QD-419/420, ARCH-134; no placeholder; `next-id` never run | CLOSED |
| T-87-23 | Repudiation (mutation score falls with moved code) | medium | mitigate | `87-mutation-close.json` on the same base; `compare` exit 0 (87-10); no `// Stryker disable` | CLOSED |
| T-87-24 | Repudiation (visible change shipped without a note) | low | mitigate | `.changeset/devtools-one-stated-run.md`, `.changeset/core-cause-text-doc.md` | CLOSED |
| T-87-25 | Elevation of privilege (unrequested release) | high | mitigate | no tag contains phase_base; no package.json/CHANGELOG/lockfile/changeset config change; no remote branch holds a phase commit | CLOSED |
| T-87-26 | Repudiation (commit without trailer or outside scope) | low | mitigate | `trailers` passes; forbidden-path grep over `git log --name-only` empty | CLOSED |
| T-87-SC | Tampering (package installs) | high | accept | no package installed or added; no manifest or lockfile change | ACCEPTED |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-87-01 | T-87-SC | No package was installed or added in any plan of this phase; no `package.json`, lockfile or workspace change since phase_base | plan-time register (autonomous run) | 2026-11-25 |

---

## Observations

Informational, not counted in `threats_open`; dispositioned in `87-REVIEW-DISPOSITION.md`.

1. `SimulationSession.ts:419` (`if (!live.current()) return;`) is held by argument, not by a killing row: its mutant is recorded EQUIVALENT because a newer fork interrupts the older fiber at its suspension first.
2. `StatedRun.ts:87-90` builds `plan.engine(live)` eagerly inside the `finally`; an engine that threw synchronously would replace the listener's throw and leave the starting state published with nothing running. Latent: every store's engine is a lazy `Effect.fn`.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-25 | 27 | 27 | 0 | gsd-security-auditor, ASVS L1 grep-depth with the phase judges, pinned check and devtools suite (2061 tests) re-run on HEAD 5a2b5c01 (autonomous run) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-25
