---
phase: 07-port-route-address
verified: 2026-11-09T22:30:00Z
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
covered_digest: "v4:sha256:abf2ac200e46af99c95bf8a9d028defcb6ffc66ede628d911750ef281a7abf7c"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 9/9
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 7: One port route address Verification Report

**Phase Goal:** The server and client adapters for remote ports share one address definition and one status contract.
**Verified:** 2026-11-09
**Status:** passed
**Re-verification:** Yes. Milestone-close re-run. The previous report (2026-11-08, passed 9/9) went stale because Phase 8 edited `spec/behaviors/34-remote-ports.md`, a file this phase covered. This run checks that every truth still holds on today's code and spec.

## Why the fingerprint moved, and whether it matters

`verification.status` named exactly one moved file, `spec/behaviors/34-remote-ports.md`. The diff of that file from the previous verified HEAD (36c3cf1) is Revision 1.3 to 1.5, from two Phase 8 commits (a23bb9c, 6ac8416):

- BEH-QD-331 now says a required allowlist that is missing or not a list is refused `NotServed` at run time, and states that serving facts live on `PortDescription.serving` (ADR-QD-114).
- Nothing in BEH-QD-333 or the rest of the file changed. The pointer to BEH-QD-338 is intact at `34-remote-ports.md:114`, the sentence "decoded by a client whatever its status" is intact, and the revision history still carries the 1.3 entry.

These edits concern which questions a server admits (the serving facet). They do not touch the address or the reply-body status contract that Phase 7 owns. `git diff 36c3cf1..HEAD -- packages/http` is empty: no file under `packages/http` changed after Phase 7's last verification, so the address module, both adapters and the test file are byte-identical to the verified state. `spec/behaviors/23-http.md` (BEH-QD-338) is likewise unchanged.

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | ROADMAP SC1: the string `"/__ports"` appears once in `packages/http/src`, comments excluded | VERIFIED | `grep -rn "__ports" packages/http/src` returns three lines today: the code literal `PORT_ROUTE_PREFIX = "/__ports"` (`PortRouteAddress.ts:26`) and two doc comments (`PortRoutes.ts:69`, `RemotePorts.ts:33`). |
| 2 | ROADMAP SC2: a round trip with a non-default prefix succeeds end to end | VERIFIED | `PortRoutes.test.ts` "one address on both sides" serves under the literal `/x/ports`, guarded and unguarded, and builds the real `remotePortsLayer` against the served handler. Re-run today: `npx vitest run --project http packages/http/test/PortRoutes.test.ts` gives 1 file, 61 tests passed. |
| 3 | ROADMAP SC3: `pnpm check:pr` is green, and CCR-QD-391 and a changeset are recorded | VERIFIED | GitHub Actions run 42676403473 at 127d6fa ran the full `pnpm check` green on Node 22.12.0, and no non-`.planning` file changed since. This supersedes the earlier 07-UAT clean-clone run. CCR-QD-391 is in `spec/README.md:329`, and `.changeset/port-route-address.md` exists. |
| 4 | A non-default prefix is answered for every port, guarded and unguarded (ADDR-03, D-04) | VERIFIED | The `${form}: every port answers under /x/ports` tests are among the 61 passing. `ASK` is a `Record` over `PortName`, so every registry port is exercised. |
| 5 | Under `/x/ports` nothing answers at `/__ports`; a default-prefix client gets the port's own error; the guarded form still denies a subject without the permission | VERIFIED | Passing tests "routes are at /x/ports and nowhere else", "client left on the default prefix gets the port's own error", "a subject without the permission is still denied". |
| 6 | `PortRoutes.ts` and `RemotePorts.ts` build every path through `portPath` (ADDR-01) | VERIFIED | `PortRoutes.ts:132,180` and `RemotePorts.ts:56` call `portPath(options.prefix, port)`. Both import it from `./PortRouteAddress.ts` (`PortRoutes.ts:37`, `RemotePorts.ts:24`). No other path construction exists. |
| 7 | The reply-body contract is stated beside the address and both adapters reference it (ADDR-02, D-03) | VERIFIED | `PortRouteAddress.ts` module doc, "The route contract both adapters rely on (ADR-QD-107)". `RemotePorts.ts:9,59` and `PortRoutes.ts:56` cite it. `RemotePorts.ts:60-61` checks no status and goes straight to `response.json`. The spec statement is BEH-QD-338 (`23-http.md:755`), cross-linked from BEH-QD-333. |
| 8 | A reply under a disagreeing status is still read from its body, and a non-reply body is the port's own error | VERIFIED | Passing tests "answer under a 503 is still the answer", "refusal under a 200 is still the port's own error", "proxy HTML under a 502 is the port's own error". Phase 8's allowlist refusal (`NotServed`, 404) is itself a body-carried `Refused` reply, so it fits the contract. |
| 9 | The public export set is unchanged and `PortRouteAddress.ts` is not in the barrel (ADR-QD-099) | VERIFIED | `PortRouteAddress` appears in no barrel (`packages/http/src/index.ts`), and no later phase added it. The full `pnpm check` (which includes gate 13, `check-api-surface.mjs`) is green at 127d6fa. |

**Score:** 9/9 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/http/src/PortRouteAddress.ts` | `PORT_ROUTE_PREFIX`, `portPath` (trailing-slash normalising), contract doc | VERIFIED | Substantive (42 lines of code and doc), a leaf module importing only the `PortName` type, used by both adapters. |
| `packages/http/test/PortRoutes.test.ts` | non-default-prefix round trip, address unit test, status-contract tests | VERIFIED | 61 tests pass. The tests use literal URLs, so they cannot pass by taking the answer from the module under test. |
| `.changeset/port-route-address.md` | changeset | VERIFIED | Present. |
| CCR-QD-391, BEH-QD-338, traceability rows | records | VERIFIED | CCR-QD-391 in `spec/README.md:329`. BEH-QD-338 in `23-http.md:755`. Traceability rows at `traceability.md:65` and `:340`. |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `PortRoutes.ts` | `PortRouteAddress.ts` | `portPath` in guarded and unguarded route builds | WIRED |
| `RemotePorts.ts` | `PortRouteAddress.ts` | `portPath` in the `HttpClientRequest.post` URL | WIRED |
| client | server | round-trip tests through `HttpRouter.toWebHandler` | WIRED |
| `34-remote-ports.md` BEH-QD-333 | `23-http.md` BEH-QD-338 | markdown link, anchor resolves (`#beh-qd-338-the-port-routes-and-their-client-share-one-address`) | WIRED |

### Data-Flow Trace (Level 4)

Not applicable: an address-building module with no rendered dynamic data. The round-trip test shows scripted port answers flowing through server and client.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Port routes, address, and status contract | `npx vitest run --project http packages/http/test/PortRoutes.test.ts` | 1 file, 61 tests passed | PASS |
| Whole gate (house style, api surface, spec gates, coverage) | CI run 42676403473 at 127d6fa, `pnpm check` | green; no non-`.planning` file changed since | PASS |

### Probe Execution

No phase-declared probes. SKIPPED.

### Requirements Coverage

Plan frontmatter declares ADDR-01, ADDR-02, ADDR-03, XC-04 (07-01), XC-02, XC-03, ADDR-02 (07-02), XC-01, XC-03, XC-04, XC-05 (07-03). Every one of the eight IDs in the phase requirement list is claimed by a plan.

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| ADDR-01 | 07-01 | One exported definition of the address, imported by both adapters | SATISFIED | Truths 1 and 6. |
| ADDR-02 | 07-01, 07-02 | Body-whatever-status contract stated beside the address and referenced by both | SATISFIED | Truths 7 and 8. |
| ADDR-03 | 07-01 | Round-trip test with a non-default prefix | SATISFIED | Truths 2, 4 and 5. |
| XC-01 | 07-03 | `pnpm check:pr` green | SATISFIED | CI run 42676403473, full `pnpm check` green at 127d6fa. |
| XC-02 | 07-02 | ADR or reason, CCR row, README history, traceability rows, changeset | SATISFIED | CCR-QD-391, README history, traceability rows and changeset present. No ADR is needed, as the CCR states, and the contract cites ADR-QD-107. |
| XC-03 | 07-02, 07-03 | `spec/overview.md` names added/removed exports (gate 13) | SATISFIED | No export added or removed; gate 13 is inside the green `pnpm check`. |
| XC-04 | 07-01, 07-03 | No new `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, `console` | SATISFIED | House-style gate green in CI. `PortRouteAddress.ts` contains none of these. |
| XC-05 | 07-03 | Coverage thresholds hold | SATISFIED | Coverage step is inside the green `pnpm check`. |

REQUIREMENTS.md marks ADDR-01..03 and XC-01..05 `[x]` and maps no further IDs to Phase 7, so there are no orphans. (The traceability table row for XC-01..05 reads "Pending" because XC applies to all phases; that is a milestone-level bookkeeping item, not a Phase 7 gap.)

### Anti-Patterns Found

No TBD, FIXME or XXX markers, stubs or empty implementations in the phase's source files. Open review findings IN-01 to IN-03 (07-REVIEW-DISPOSITION.md) are info-level and not goal-blocking.

### Human Verification Required

None.

### Gaps Summary

No gaps. The server and client adapters still build every route through the single `portPath` definition, and the reply-body status contract is still stated once beside it and cited by both adapters. The Phase 8 edit to `34-remote-ports.md` concerns the serving facet (BEH-QD-331) and left BEH-QD-333's pointer to BEH-QD-338 intact. No code under `packages/http` changed after Phase 7, and the full gate is green in CI at the current tree.

---

_Verified: 2026-11-09_
_Verifier: Claude (gsd-verifier)_
