---
phase: 07-port-route-address
verified: 2026-11-08T08:20:00Z
status: passed
score: 9/9 must-haves verified
covered_files:
  - ".changeset/port-route-address.md"
  - ".planning/phases/07-port-route-address/07-01-PLAN.md"
  - ".planning/phases/07-port-route-address/07-01-SUMMARY.md"
  - ".planning/phases/07-port-route-address/07-02-PLAN.md"
  - ".planning/phases/07-port-route-address/07-02-SUMMARY.md"
  - ".planning/phases/07-port-route-address/07-03-PLAN.md"
  - ".planning/phases/07-port-route-address/07-03-SUMMARY.md"
  - "packages/http/src/PortRouteAddress.ts"
  - "packages/http/src/PortRoutes.ts"
  - "packages/http/src/RemotePorts.ts"
  - "packages/http/test/PortRoutes.test.ts"
  - "spec/behaviors/23-http.md"
  - "spec/behaviors/34-remote-ports.md"
covered_digest: "v4:sha256:836dc8a65654f2b55be7b2753470377c87da2eda4ad1d80da8e86cf6ac3d4d26"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 8/9
  gaps_closed:
    - "Full `pnpm check:pr` in one run (satisfied by 07-UAT.md test 1, clean clone of 88187a5 in the Playwright container, exit 0)"
  gaps_remaining: []
  regressions: []
---

# Phase 7: One port route address Verification Report

**Phase Goal:** The server and client adapters for remote ports share one address definition and one status contract.
**Verified:** 2026-11-08
**Status:** passed
**Re-verification:** Yes. The previous report was written before code-review fix fc2c324 (WR-01, trailing-slash normalisation in `portPath`). This run covers current HEAD (36c3cf1), including that fix.

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | ROADMAP SC1: the string `"/__ports"` appears once in `packages/http/src`, comments excluded | VERIFIED | `grep -rn "__ports" packages/http/src` returns three lines. One is the code literal `PORT_ROUTE_PREFIX = "/__ports"` (`PortRouteAddress.ts:26`). The other two are doc comments (`PortRoutes.ts:69`, `RemotePorts.ts:33`). |
| 2 | ROADMAP SC2: a round trip with a non-default prefix succeeds end to end | VERIFIED | `PortRoutes.test.ts` "one address on both sides" (L262-366). It serves under the literal `/x/ports`, in both guarded and unguarded forms. It builds the real `remotePortsLayer` client against the served handler and asks all five ports. The vitest run passed 61/61. |
| 3 | ROADMAP SC3: `pnpm check:pr` is green, and CCR-QD-391 and a changeset are recorded | VERIFIED | 07-UAT.md test 1 (complete, 1 passed): clean clone of 88187a5, `pnpm install --frozen-lockfile && pnpm check:pr` exited 0 (16 of 17 steps, mutation skipped by design), vitest 3974+559+42 and e2e 30/30 passed. The commits after 88187a5 touch only `.planning/` files. CCR-QD-391 is in `spec/README.md:329`, and `.changeset/port-route-address.md` exists (`@qadi/http` patch). |
| 4 | A non-default prefix is answered for every port, guarded and unguarded (ADDR-03, D-04) | VERIFIED | Tests `${form}: every port answers under /x/ports...`. `ASK` is a `Record` over `PortName`, so every registry port is exercised. |
| 5 | Under `/x/ports` nothing answers at `/__ports`. A default-prefix client gets the port's own error, never an answer. The guarded form still denies a subject without the permission | VERIFIED | Tests "routes are at /x/ports and nowhere else" (200 there, 404 at default), "client left on the default prefix gets the port's own error", and "a subject without the permission is still denied" (403). All pass. |
| 6 | `PortRoutes.ts` and `RemotePorts.ts` build every path through `portPath` (ADDR-01) | VERIFIED | `PortRoutes.ts:132,180` and `RemotePorts.ts:56` call `portPath(options.prefix, port)`. Both import it from `./PortRouteAddress.ts`. No other path construction exists. |
| 7 | The reply-body contract is stated beside the address and both adapters reference it (ADDR-02, D-03) | VERIFIED | The module doc in `PortRouteAddress.ts` has "The route contract both adapters rely on (ADR-QD-107)". `RemotePorts.ts:9,59` and `PortRoutes.ts:56` cite it by file name. `RemotePorts.ts` checks no status, and goes straight to `response.json`. |
| 8 | A reply under a disagreeing status is still read from its body, and a non-reply body is the port's own error | VERIFIED | Tests "answer under a 503 is still the answer", "refusal under a 200 is still the port's own error", "proxy HTML under a 502 is the port's own error". All pass. |
| 9 | The public export set is unchanged and `PortRouteAddress.ts` is not in the barrel (ADR-QD-099) | VERIFIED | `packages/http/src/index.ts` has no `PortRouteAddress` line. `spec/overview.md` does not mention it. UAT's `pnpm check:pr` included the api-surface gate, which passed. |

**Score:** 9/9 truths verified (0 present, behavior-unverified)

### WR-01 fix (fc2c324), re-checked at HEAD

`portPath` strips trailing slashes from the prefix and builds the path from the remainder. `"/x/ports/"` and `"/x/ports//"` give `/x/ports/<Port>`, and `"/"` gives `/<Port>`.

- The code branches on an empty remainder, so the return type stays `/${string}` with no cast.
- The test "a trailing slash on the prefix never yields a // in the path" (L255-257) pins the first two cases. The `"/"` case is not asserted in the test, but the logic is trivially correct (`slice(1)` gives `""`, so `/${port}`).
- `spec/behaviors/23-http.md` was updated for the BEH-QD-338 paragraph (AGENTS.md §11).
- The fix does not disturb the non-prefix paths. The 61 tests pass, and `check-house-style.mjs` reports 406 files clean.
- The `/\/+$/` regex is linear, with no backtracking risk.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/http/src/PortRouteAddress.ts` | `PORT_ROUTE_PREFIX`, `portPath`, contract doc | VERIFIED | Substantive, imported by both adapters, a leaf module (imports only the `PortName` type). |
| `packages/http/test/PortRoutes.test.ts` | non-default-prefix round trip, address unit test, status-contract tests | VERIFIED | Contains `/x/ports`. The tests use literal URLs, so they cannot pass by taking the answer from the module under test. |
| `.changeset/port-route-address.md` | changeset | VERIFIED | `@qadi/http` patch. |
| CCR-QD-391, BEH-QD-338, traceability rows | records | VERIFIED | Present in `spec/README.md`, `spec/behaviors/23-http.md` and `spec/traceability.md`. |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `PortRoutes.ts` | `PortRouteAddress.ts` | `portPath` in guarded and unguarded `PORT_NAMES.map` | WIRED |
| `RemotePorts.ts` | `PortRouteAddress.ts` | `portPath` in the `HttpClientRequest.post` URL | WIRED |
| client | server | round-trip tests via `HttpRouter.toWebHandler` handler | WIRED |

### Data-Flow Trace (Level 4)

Not applicable. This is an address-building module, with no rendered dynamic data. The round-trip test shows scripted port answers flowing through server and client.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Port routes, address, and status contract | `npx vitest run --project http packages/http/test/PortRoutes.test.ts` (repo root) | 1 file, 61 tests passed | PASS |
| House style budgets (`as`, `!`, `any`, `switch`, `fnUntraced`) | `node scripts/check-house-style.mjs` | 406 files clean (3 declared switches) | PASS |
| New banned constructs in `packages/http/src` diff | grep over the phase diff | none (one false match in a comment) | PASS |

### Probe Execution

No phase-declared probes. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| ADDR-01 | 07-01 | One exported definition of the address, imported by both adapters | SATISFIED | Truths 1 and 6. |
| ADDR-02 | 07-01 | Body-whatever-status contract stated beside the address and referenced by both | SATISFIED | Truths 7 and 8. |
| ADDR-03 | 07-01 | Round-trip test with a non-default prefix | SATISFIED | Truths 2, 4 and 5. |
| XC-01 | 07-03 | `pnpm check:pr` green | SATISFIED | 07-UAT.md test 1 (exit 0 on a clean clone of 88187a5). Later commits are `.planning/`-only. |
| XC-02 | 07-02 | ADR or reason, CCR row, README history, traceability rows, changeset | SATISFIED | CCR-QD-391 and the README history line exist. Traceability rows are at v1.127, and the changeset exists. The report states no ADR is needed, and the contract cites ADR-QD-107. |
| XC-03 | 07-01 | `spec/overview.md` names added/removed exports (gate 13) | SATISFIED | No export added or removed. Gate 13 passed inside `check:pr`. |
| XC-04 | 07-01 | No new `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, `console` | SATISFIED | House-style gate clean. |
| XC-05 | 07-03 | Coverage thresholds hold | SATISFIED | The coverage step ran inside the UAT `check:pr` (exit 0). |

All eight IDs in the phase requirement list are accounted for, and REQUIREMENTS.md maps no further IDs to Phase 7, so there are no orphans.

### Anti-Patterns Found

No TBD, FIXME or XXX markers, stubs or empty implementations in the phase's source files. Open code-review findings IN-01 to IN-03 are info-level (stale test header, a test asserting only a tag, a spec paragraph run-on), recorded in 07-REVIEW-DISPOSITION.md as `open`. They are not goal-blocking.

### Human Verification Required

None. The earlier human item (full `pnpm check:pr` in one run) is satisfied by 07-UAT.md.

### Notes (non-blocking)

- ROADMAP.md's phase-list checkbox for Phase 7 (line 23) and the REQUIREMENTS.md traceability table (lines 159, 162) still read "Pending". The per-requirement checkboxes are `[x]`. The orchestrator should flip these at phase completion.
- The `"/"` prefix case from WR-01 is not asserted in a test. This is cosmetic.

### Gaps Summary

No gaps. The server and client adapters build every route through the single `portPath` definition. The reply-body status contract is stated once beside it and cited by both adapters. A real round trip under a non-default prefix is tested, including fail-closed behavior for a mismatched client. The WR-01 trailing-slash fix is present and tested at HEAD.

---

_Verified: 2026-11-08_
_Verifier: Claude (gsd-verifier)_
