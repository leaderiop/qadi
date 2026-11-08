---
phase: 07-port-route-address
plan: 02
subsystem: spec
tags: [spec, ccr, traceability, changeset, http, port-routes]
status: complete

requires:
  - phase: 07-01
    provides: "PortRouteAddress.ts (PORT_ROUTE_PREFIX, portPath), the three PortRoutes.test.ts describe blocks, the reply-body contract prose"
provides:
  - "BEH-QD-338 in spec/behaviors/23-http.md: the address and the reply-body contract as two REQUIREMENTs"
  - "BEH-QD-333's pointer to BEH-QD-338"
  - "Traceability rows (section 1 and section 4) for BEH-QD-338 and PortRouteAddress"
  - "CCR-QD-391 register row and its README change-history line"
  - "@qadi/http patch changeset"
affects: [07-03 reconcile]

actuals:
  tokens: 3700
  tasks: 2
  commits: 2
plan_head_before: 18f7e81afc67bec3f02de3fbe0a51a0d9ecaf367
plan_head_after: c0854f64f7a84f3748d546afee7799fe53dc4aa2

tech-stack:
  added: []
  patterns:
    - "A cross-document contract is defined once in one BEH and pointed to from the other document"

key-files:
  created:
    - .changeset/port-route-address.md
  modified:
    - spec/behaviors/23-http.md
    - spec/behaviors/34-remote-ports.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "No ADR for ARCH-52: no export is added or removed and ADR-QD-107's route design is unchanged. ADR-QD-114 stays reserved for ARCH-53. spec/overview.md is untouched."
  - "BEH-QD-338 carries no typescript fence: PortRouteAddress.ts is package-private, so a compiled example could not import it."

requirements-completed: [XC-02, XC-03, ADDR-02]

coverage:
  - id: D1
    description: "BEH-QD-338 states the shared address and the reply-body contract, and BEH-QD-333 links to it"
    requirement: "ADDR-02"
    verification:
      - kind: command
        ref: "Task 1 grep gates plus node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "CCR-QD-391, traceability rows and the changeset are recorded, with no ADR and the reason stated"
    requirement: "XC-02"
    verification:
      - kind: command
        ref: "pnpm spec:verify:strict (21 PASS), pnpm spec:gates (25 steps, 139 references), node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D3
    description: "No export changed, so spec/overview.md is untouched"
    requirement: "XC-03"
    verification:
      - kind: command
        ref: "git diff of this plan's commits names no spec/overview.md; 07-01 recorded pnpm spec:api unchanged at 862 exports"
        status: pass
    human_judgment: false
---

# Phase 7 Plan 02: Record ARCH-52 in the spec Summary

**BEH-QD-338 now states, once, that the port routes and `remotePortsLayer` build a port's path from one definition and that the client reads the reply from the body whatever the status; BEH-QD-333 points to it, and CCR-QD-391, the traceability rows and an `@qadi/http` patch changeset record the change with no ADR.**

## Recorded names

- **BEH id:** `BEH-QD-338`, allocated once with `node scripts/next-id.mjs BEH` (it skipped 337, which is Phase 4's decision-stream BEH).
- **Anchor:** `spec/behaviors/23-http.md#beh-qd-338-the-port-routes-and-their-client-share-one-address`.
- **Invariant line:** INV-QD-241 and INV-QD-006.
- **Revisions:**

| Document | Revision |
| -------- | -------- |
| `spec/behaviors/23-http.md` | 1.11 -> 1.12 |
| `spec/behaviors/34-remote-ports.md` | 1.2 -> 1.3 |
| `spec/traceability.md` | 1.126 -> 1.127 |
| `spec/README.md` | 1.123 -> 1.124 |

## Exact CCR-QD-391 file list

`packages/http/src/PortRouteAddress.ts` (new), `packages/http/src/PortRoutes.ts`, `packages/http/src/RemotePorts.ts`, `packages/http/test/PortRoutes.test.ts`, `spec/behaviors/23-http.md` Rev 1.12 (BEH-QD-338 new), `spec/behaviors/34-remote-ports.md` Rev 1.3 (BEH-QD-333), `spec/traceability.md` Rev 1.127, `spec/README.md` Rev 1.124, `.changeset/port-route-address.md` (new)

The row sits directly after CCR-QD-390 (Phase 6 had landed). Plan 03 can check the list mechanically: every path is written in full.

## Accomplishments

- `23-http.md` gains BEH-QD-338 with two plain-fenced REQUIREMENT blocks: one address, `<prefix>/<PortName>`, default `/__ports` on both sides; and the client reads the reply from the body whatever the status, a non-reply body being the port's own error and never an answer. The prose cites `PortRouteAddress.ts`, ADR-QD-099, ADR-QD-107 and the `PortRoutes.test.ts` coverage.
- `34-remote-ports.md`: BEH-QD-333's last sentence is followed by a link to BEH-QD-338; no REQUIREMENT changed meaning.
- `traceability.md`: the 23-http section 1 row gains BEH-QD-338 plus `PortRouteAddress` and `RemotePorts`; the 34-remote-ports section 1 row gains `PortRouteAddress`; the `PortRoutes.test.ts` section 4 row gains BEH-QD-338 and the covers text for the round trip, the address unit and the status-contract cases. No section 2 or 3 row, since no invariant or ADR was added.
- `README.md`: CCR-QD-391 row, its change-history line, and the stated reason for no ADR.
- `.changeset/port-route-address.md`: `"@qadi/http": patch`.

## Verification

`node scripts/spec-revise.mjs --check` green; `pnpm spec:verify:strict` 21 PASS, 0 FAIL, 0 SKIP; `pnpm spec:gates` (`scripts/check-dod-table.mjs`) 25 steps match `pnpm check`, 139 references resolve. No typescript fence names `PortRouteAddress.ts`. `CCR-QD-391` was unused under `spec/` and `AGENTS.md` before this plan.

## Commits

| Task | Commit | Type |
| ---- | ------ | ---- |
| 1 (BEH-QD-338, BEH-QD-333 pointer) | efa250b | docs(07-02) |
| 2 (traceability, CCR-QD-391, changeset) | c0854f6 | docs(07-02) |

## Deviations from Plan

**1. [Rule 3 - Blocking] `spec-revise.mjs` drops its document argument when `--date` is not given**
- **Found during:** Task 1
- **Issue:** `scripts/spec-revise.mjs` filters positional arguments with `index !== dateFlag + 1`; with no `--date`, `dateFlag` is -1 and index 0 (the document) is excluded, so it prints its usage and exits 2.
- **Fix:** passed `--date 2026-11-08` explicitly on each of the four calls. The script itself is out of scope and was not changed.
- **Verification:** each call reported the expected bump; `--check` green.

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** none on the output.

The script bug is a candidate for a separate fix (the positional filter should skip index `dateFlag + 1` only when `dateFlag !== -1`).

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-07-05 is mitigated: REQUIREMENT (2) states that a non-reply body is the port's own error, never an answer, and the section 4 row cites the tests that pin it (names as 07-01 built them; Plan 03 reconciles).

## Self-Check: PASSED

- FOUND: `.changeset/port-route-address.md`
- FOUND commits: efa250b, c0854f6 (ancestors of HEAD)
