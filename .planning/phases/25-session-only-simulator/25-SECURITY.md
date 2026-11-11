---
phase: "25"
slug: "session-only-simulator"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 25 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| host ports to the simulator | a Live run is the panel's only I/O against the application's resolvers; a run that outlives its owner or its supersession keeps querying them | resolver answers (application data) |
| session to view | the view renders what the session reads; a reading that changes meaning on the move can show a failure as a denial (INV-QD-006) | decision outcomes, baseline and cost sentences |
| package barrel | what `@qadi/devtools` exports is its public surface; a private mechanic leaking through it becomes an interface | type and value exports |
| human decision to records | D-01 is the human's answer; a record that misstates it, or the decision it overrides, misleads every later reader | decision text |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-25-01 | Elevation of privilege | an executor inventing or changing the D-01 answer | high | mitigate | `25-01-SUMMARY.md` carries `d01_outcome: D` with `d01_source` naming `_DECISIONS-v1.2.md`, whose row reads `D: FiberHandle` | closed |
| T-25-02 | Tampering | `d01_outcome` diverging from the human's answer | medium | mitigate | one machine-checked key, one value; ADR-QD-137 quotes `d01_reason` | closed |
| T-25-03 | Denial of service | a superseded Live run left querying resolvers | medium | mitigate | `SimulationSession.test.ts` "a second run interrupts the first…" (:306), "a run it superseded is never started" (:414) and the ARCH-73 per-command cases (choosePolicy, replay, setPorts, seed) green | closed |
| T-25-04 | Denial of service | a run outliving its owner once no host forks `reap` | medium | mitigate | "interrupts the run in flight, which never lands, and leaves the session inert" (:369) on scope close; no `reap`/`hasRetired`/`dispose` member (grep 3→0) | closed |
| T-25-05 | Tampering | a baseline sentence changing meaning while moving into the model | medium | mitigate | the `baselineReading` describe (:737) asserts every case's text verbatim; `Replay.ts` mutation 1.0 | closed |
| T-25-06 | Repudiation | a red test failing for the wrong reason | low | mitigate | 25-02 recorded only ARCH-73 failing (31), at construction; `tdd-red-evidence` RED_EVIDENCE_OK | closed |
| T-25-07 | Denial of service | a superseded or unmounted run left querying resolvers | medium | mitigate | `supersede()` and the scope's release interrupt through the `FiberHandle` (5 refs in `SimulationSession.ts`); T-25-03/04 tests green | closed |
| T-25-08 | Tampering | a failure read as a denial after the reading moves (INV-QD-006) | high | mitigate | the session reads through `readOutcome` (unchanged); 4 `"Failed"` assertions in the session suite; the failure panel copy unchanged | closed |
| T-25-09 | Information disclosure | `readOutcome`, constructors or `useScoped` leaking through a barrel | low | mitigate | `useScoped` in no barrel (0); `surface.tst.ts` pins `readOutcome` private; new exports are type-only (6 types, gate 13 green) | closed |
| T-25-16 | Tampering | a run landing after its scope closed or after a subscriber superseded it | medium | mitigate | the finalizer bumps the generation and marks the session closed; `run`/`land` check it; 25-03's re-entrant-subscriber tests (9d289301) green | closed |
| T-25-17 | Denial of service | StrictMode's double mount leaving a live scope or a closed session on screen | low | mitigate | `useSimulationSession.test.tsx` StrictMode survival and unmount-interrupt tests green | closed |
| T-25-10 | Tampering | a deleted DOM test with no model counterpart | medium | mitigate | `Simulator.test.tsx` keeps 26 of 26 tests (none deleted); mutation per file not lower (25-mutation-after.json) | closed |
| T-25-11 | Tampering | the dropdown choosing the wrong policy after the parse moves | medium | mitigate | `choosePolicyAt` maps menu positions in the model; 9 references in the session suite incl. seeded/evicted offset and out-of-range cases; DOM policy tests unchanged | closed |
| T-25-12 | Repudiation | a failure shown without "This is not a denial" (INV-QD-006) | high | mitigate | the sentence is present once in `Simulator.tsx` (:445) and once in `Inspector.tsx` (:179), as at the phase base | closed |
| T-25-18 | Denial of service | a DOM test leaving a run alive past its test | low | mitigate | every `Simulator.test.tsx` session lives in a scope closed in `afterEach` | closed |
| T-25-13 | Repudiation | ADR-QD-137 misstating D-01 or the decision it overrides | medium | mitigate | ADR-QD-137 quotes `_DECISIONS-v1.2.md` and names ARCH-20 D-20-b (3 references) as superseded; ADR-QD-047 Rev 1.11 notes it | closed |
| T-25-14 | Repudiation | an interface change shipped without a note | medium | mitigate | `.changeset/simulator-session-only.md` (`@qadi/devtools` minor) names the removed and added members; `spec:api` (gate 13) green | closed |
| T-25-15 | Elevation of privilege | a fail-closed or Deny/Error regression slipping past per-plan checks | high | mitigate | `pnpm check:pr` exit 0 at 25-05 (devtools, BDD, coverage); no diff to `scripts/`, AGENTS.md, vitest/stryker configs or `.oxlintrc.json` since `17fa6738` | closed |
| T-25-SC | Tampering | npm/pip/cargo installs | high | accept | no package manifest, lockfile or workspace file changed since the phase base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-25-01 | T-25-SC | No dependency is added or upgraded by this phase; no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` changed since the base | plan-time threat model (25-01..25-05), confirmed by audit | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 19 | 19 | 0 | autonomous orchestrator (secure-phase, ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
