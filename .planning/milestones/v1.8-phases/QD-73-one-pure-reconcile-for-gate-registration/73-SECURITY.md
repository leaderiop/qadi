---
phase: "73"
slug: "one-pure-reconcile-for-gate-registration"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-23"
---

# Phase 73 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase makes gate registration one pure `reconcile` in `@qadi/react`'s package-private `GateWriter.ts`, keyed by gate id. It takes the live registrations and the wanted identities and states, and makes every register, update and unregister call in one pass: the live pass first (keep and update, or unregister), then the wanted pass (register what is new). `reconcile` never mutates `live` and returns a new `Map`. It handles no throw. It relies on the writer contract stated on the `GateWriter` interface: `register`, and `update` and `unregister` on its handle, do not throw. `buildGateRegistry` keeps that contract, and tests on the real registry pin it. `useGate.ts`'s `useGateRegistrations` keeps one ref and two effects: the teardown keyed on `writer`, and one registration effect with no dependency list. No network, auth, file, dependency or public-export surface changes: `index.ts`, `GateRegistry.ts`, `QadiAtoms.ts` and every manifest are unchanged since `phase_base`, and `check-api-surface` still reads 941 exports.

The threats are:
- a gate id colliding with itself across an identity change;
- a registration left behind by a throwing step or an unmount;
- instrumentation reaching an uninstrumented provider;
- records, pins and mutation evidence that claim more than ran.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| host callback → gate registry | a subscriber or collision reporter the host supplies | an arbitrary function that may throw |
| host render → hook | the policy, resource and render state a guard renders with | host-supplied values `reconcile` keys on |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-73-01 | Tampering | mutation base measured on an already-edited tree | medium | mitigate | `73-mutation-base.json`: both groups at `head` = `1dbaf1a9`. It is written by `387a5a5b`, the first commit after `phase_base` and the only one touching it. The scorer refuses a dirty tree and a base restart, and its self-test pins both. | closed |
| T-73-02 | Repudiation | RED evidence | low | mitigate | `73-RED-EVIDENCE.md` records the command, the base and the head. It records the characterisation's 19 passes, three runs out of three, and the update half's RED (0 passed, 2 failed) with its first failure line verbatim. | closed |
| T-73-03 | Denial of service | characterisation rows leaking state between rows | low | mitigate | every row builds its own atom set (`atoms()`, one fresh `makeQadiAtoms`); the RTL cleanup is registered in `setupTests.ts` | closed |
| T-73-04 | Repudiation | earlier ADR history rewritten | low | mitigate | the diffs to ADR-QD-103, 111 and 140 since `phase_base` replace only Document Control cells; the body changes are added dated amendment sections | closed |
| T-73-05 | Tampering | ids outside the reservation | medium | mitigate | new ids are ADR-QD-186, CCR-QD-465, BEH-QD-701..705 and INV-QD-391/392 only; the CCR row's "Ids used" names exactly that set | closed |
| T-73-06 | Denial of service | a throwing writer step leaving registrations half applied | medium | mitigate | the plan-time rollback was removed in code review as unreachable. See "Writer contract" below for the evidence. | closed |
| T-73-07 | Spoofing | a changed identity colliding with its own id | medium | mitigate | `wanted` is a `ReadonlyMap` keyed by id, and `GateIdentity` has no id (type pin `not.toHaveProperty("id")`). The live pass runs before the wanted pass. Pinned on a real registry by "on a real registry a changed identity keeps its id and reports no collision"; reversing the order failed that test with `a~1` (RED evidence). | closed |
| T-73-08 | Elevation of privilege | instrumentation reaching an uninstrumented provider | low | mitigate | Both effects return at once when `writer === undefined`. `gateWriterFor` hands out only a `buildGateRegistry` writer. Neither `GateWriter`, `reconcile` nor the hooks is in the barrel. Pinned by "an uninstrumented provider registers nothing and notifies nothing" and "an undefined writer registers nothing". | closed |
| T-73-09 | Tampering | a gut left in `GateWriter.ts` | medium | mitigate | each gut is reverted with `git checkout` and a clean `git status`, recorded in the RED evidence; at HEAD no gut residue greps, and every later change to the file is a code-review fix with a recorded disposition | closed |
| T-73-10 | Denial of service | the hook holding handles after a throwing reconcile | medium | mitigate | closed by the same writer contract as T-73-06. Teardown still ends every registration: pinned by `GateWriter.test.tsx`'s writer-undefined and unmount rows and by the characterisation's unmount rows. | closed |
| T-73-11 | Repudiation | rendered cases deleted without a replacement | low | mitigate | `GateRegistry.test.tsx` lost exactly three titles, each replaced in the characterisation and pinned without rendering in `GateWriter.reconcile.test.ts`. The two reconcile tests later removed in review name their survivors (`73-REVIEW-FIX.iter1.md`, IN-06). | closed |
| T-73-12 | Repudiation | Pinned-by titles that do not exist | medium | mitigate | every title quoted in BEH-QD-701..705 (36) and INV-QD-391/392 (15) resolves verbatim in the file it names | closed |
| T-73-13 | Repudiation | CCR row omitting a file or citing a wrong revision | medium | mitigate | CCR-QD-465's file list equals the 20 files changed outside `.planning/` since `phase_base`. Its cited revisions equal the headers: ADR-186 1.5, ADR-140 1.4, ADR-111 1.2, ADR-103 1.5, behaviors/09 3.17, invariants 1.186, traceability 1.260, README 1.314. | closed |
| T-73-14 | Tampering | close measured on a tree that later changed | medium | mitigate | both close groups are on one head, `37e85311`, the final tree after validation added one test (re-recorded from `9d328b26`), and `packages/` has not changed since. `compare` exits 0: GateWriter.ts 83/83, useGate.ts 44/45, no new open or Ignored mutant. | closed |
| T-73-15 | Repudiation | static mutant waved through as Ignored | medium | mitigate | `EXAMINED` is `{}`; `compare` reports 0 new Ignored | closed |
| T-73-16 | Elevation of privilege | requirement status flipped early or too widely | low | mitigate | `ee8b6200`, the only commit touching `REQUIREMENTS.md`, flips RECN-01..05 only; WX-01..07 stay Pending | closed |
| T-73-17 | Tampering | expected values changed while moving tests onto shared helpers | medium | mitigate | Titles, `expect` counts and matcher lines are identical across the move. Later edits removed only the three moved cases' 8 assertions and rewired helpers. The characterisation's inputs, titles and expected values are unchanged since `2680ab4d`. | closed |
| T-73-SC | Tampering | dependency installs (every plan) | low | accept | see AR-73-01 | closed |

---

## Writer contract (T-73-06, T-73-10)

**What was removed:** the plan-time mitigation was `reconcile`'s rollback with an `AggregateError`, its failure tests and the hook-level no-leak row. Code review removed all of them in `0c81a557` as unreachable, decided autonomously.

**Why the throw cannot happen:** the throw state needs a writer call that throws, and no writer this package builds can.
- `GateWriter`'s doc comment states the contract.
- `buildGateRegistry` makes only synchronous `Map`/`Set` writes.
- `changed()` wraps each listener in try/catch.
- The collision reporter never throws. The default (`say`) prints one `console.warn`, and a supplied reporter is wrapped by `reporterFor`'s `contain` in `DeveloperSignals.ts`, at both call sites (`GateRegistry.ts`, `QadiAtoms.ts`).
- `gateWriterFor` hands out no other writer.

**Tests that pin it on the real registry** (`GateRegistry.store.test.ts`):
- "a listener that throws makes none of register, update or unregister throw";
- the four throwing-reporter cases, through `makeGateRegistry` and `makeQadiAtoms`.

**Residual, non-blocking:** the contract is held by documentation and tests, not by types. A future writer that broke it would leave a `reconcile` part applied. The `reconcile` doc comment says so.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-73-01 | T-73-SC | No package is installed, added or upgraded; no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` changed since `phase_base` | plan-time disposition (73-01..73-07) | 2026-11-23 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **Plan-time wording superseded by code review:** the Threat Flags of 73-03 and 73-04 still cite the rollback and its failure-path tests. Review removed both; `73-RED-EVIDENCE.md` "Review amendments" records it. Judged against the code as it is now.
- **Non-durable evidence:** the Stryker and `check:pr` logs live in session scratch directories. The durable record is:
  - `73-RED-EVIDENCE.md`;
  - the `73-REVIEW-FIX.md` reports;
  - `73-mutation-close.json`;
  - this file;
  - the passing tests.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-23 | 18 | 18 | 0 | gsd-security-auditor at 86ce0b65 (ASVS 1, block on high; register authored at plan time, judged against the post-review code). Checks: `compare`, revisions and file list, every Pinned-by title, the characterisation diff since its first commit. `check:pr` exit 0 on 86ce0b65 and again on 37e85311 after validation, 17/18 steps, mutation skipped by design. |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-23
