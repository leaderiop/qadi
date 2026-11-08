---
phase: 07-port-route-address
verified: 2026-11-08T07:00:00Z
status: human_needed
score: 8/9 must-haves verified
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
  - "spec/README.md"
  - "spec/behaviors/23-http.md"
  - "spec/behaviors/34-remote-ports.md"
  - "spec/traceability.md"
covered_digest: "v4:sha256:34508cb373a688b00b6d59be1ed679c94cf5397a0f2823faf858dbfc81df137d"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Run `pnpm check:pr` to completion on a host that can run `playwright install --with-deps chromium` (CI, `.github/workflows/check.yml`, or a machine with sudo/TTY) against this branch."
    expected: "Exit 0 across all 16 steps, in one run."
    why_human: "On the verification host the single run stops at step 13 (`pnpm example`, sudo needed for Playwright system deps), regardless of tree state. Steps 1-12 were green inside that run and 13-16 were run individually, but a clean single-run exit 0 (XC-01, ROADMAP criterion 3) has not been observed. The user accepted the split evidence at the 07-03 checkpoint per 07-03-SUMMARY.md, but that acceptance is a claim in a SUMMARY, not an `overrides:` entry, so it is surfaced rather than absorbed."
---

# Phase 7: One port route address Verification Report

**Phase Goal:** The server and client adapters for remote ports share one address definition and one status contract.
**Verified:** 2026-11-08
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

The goal is achieved in the code. `PortRouteAddress.ts` is the one address definition; `portRoutes`, `portRoutesUnguarded` and `remotePortsLayer` all build their paths through it; the reply-body contract is stated beside it and cited by both adapters; a round trip under `/x/ports` proves it. The only open item is the literal "`pnpm check:pr` exits 0" for XC-01, which this host cannot produce.

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | ROADMAP SC1 / ADDR-01: `"/__ports"` appears once in `packages/http/src` outside comments | VERIFIED | `grep -rn "__ports" packages/http/src` returns three lines: `PortRouteAddress.ts:26` (`export const PORT_ROUTE_PREFIX = "/__ports"`), and two doc-comment lines (`PortRoutes.ts:69`, `RemotePorts.ts:33`). No `DEFAULT_PREFIX` or inline path template remains. |
| 2 | ADDR-01 wiring: both adapters build every path through `portPath` | VERIFIED | `PortRoutes.ts:132` and `:180` (both forms) call `portPath(options?.prefix, port)`; `RemotePorts.ts:56` calls `portPath(options.prefix, port)`. The leaf imports only `type { PortName }`, so the client does not pull in server code. |
| 3 | ROADMAP SC2 / ADDR-03: a round trip with a non-default prefix succeeds end to end | VERIFIED | `describe("one address on both sides (ARCH-52)")` at `PortRoutes.test.ts:256` with `PREFIX = "/x/ports"`: both forms, every port, "nowhere else", default-prefix client gets the port's own error, guarded form still denies. I ran `pnpm vitest run --project http packages/http/test/PortRoutes.test.ts`: 60 passed. |
| 4 | ADDR-02: the status contract is stated beside the address and both adapters reference it | VERIFIED | Contract prose in the `PortRouteAddress.ts` module doc (reply is the JSON body under every status; client never reads an answer from a status; non-reply body is the port's own error). `RemotePorts.ts:9` and `:59` cite it, and the decode at `:60` is `response.json` with no status check. Three canned-response tests (503 body read as the answer, 200 refusal is an error, proxy 502 HTML is an error) at `PortRoutes.test.ts:362-413`, passing. |
| 5 | Public export set unchanged; leaf not in the barrel (ADR-QD-099) | VERIFIED | `grep PortRouteAddress\|portPath packages/http/src/index.ts` returns nothing. `spec/overview.md` is absent from the phase's diff (`git diff --name-only 1cb87a3 HEAD -- packages spec .changeset` lists 9 paths, none of them overview). `pnpm spec:api` 862 exports reported unchanged in 07-01 and 07-03; not re-run by me (see Behavioral Spot-Checks). |
| 6 | ROADMAP SC3 (recording half) / XC-02: CCR-QD-391 and a changeset are recorded; ADR decision stated | VERIFIED | `spec/README.md:329` carries the `CCR-QD-391` row with a 9-path file list that equals the `git diff` file list; `.changeset/port-route-address.md` is `"@qadi/http": patch`; BEH-QD-338 exists at `23-http.md:755`, BEH-QD-333 links to it (`34-remote-ports.md:106`), traceability §1 (`:65`) and §4 (`:337`) name it. No ADR is written, with the reason stated in 07-02-SUMMARY and CCR row. |
| 7 | XC-03: `spec/overview.md` names every added export and drops every removed one | VERIFIED | No export was added or removed (barrel check above), so no overview edit is owed. `pnpm spec:gates` and `spec:api` green per 07-03-SUMMARY. |
| 8 | XC-04 and XC-05: no forbidden constructs added; coverage thresholds hold | VERIFIED | `node scripts/check-house-style.mjs`: 406 files clean (3 declared switches, unchanged). The added lines in `packages/http/src` contain no `as`/`!`/`any`/`switch`/`fnUntraced`/`async`/`await`/`console` code (the only grep hits are the words "as" in doc prose). `pnpm typecheck` exits 0. `pnpm coverage` ran green with `http/src` at 100% statements / 97.87% branches, total 99.1% statements and 96.82% branches, no threshold failure reported. |
| 9 | ROADMAP SC3 (gate half) / XC-01: `pnpm check:pr` is green | UNCERTAIN | Not observed as one exit 0. 07-03-SUMMARY records steps 1-12 green in the run, exit 1 at step 13 on `playwright install --with-deps chromium` (sudo, no TTY), and steps 13-16 green individually. The orchestrator's post-merge gate (`pnpm run build` exit 0, `pnpm test` 157 files / 3973 tests) corroborates the code, and I independently re-ran typecheck, house-style, the PortRoutes test file and coverage, all green. The failure is environmental and not a test or build failure, but "green" for XC-01 is defined as `check:pr` passing, and that exact command was not seen to pass. Routed to human verification, not FAILED. |

**Score:** 8/9 truths verified (0 present, behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/http/src/PortRouteAddress.ts` | `PORT_ROUTE_PREFIX`, `portPath`, contract prose | VERIFIED | 36 lines, substantive, imported by both adapters, not in the barrel |
| `packages/http/test/PortRoutes.test.ts` | round trip under `/x/ports`, address unit, status contract | VERIFIED | Three ARCH-52 `describe` blocks present, 60 tests pass |
| `spec/behaviors/23-http.md` | BEH-QD-338 | VERIFIED | `:755` |
| `spec/README.md` | `| CCR-QD-391 |` | VERIFIED | `:329` |
| `.changeset/port-route-address.md` | `"@qadi/http": patch` | VERIFIED | content read |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `PortRoutes.ts` | `PortRouteAddress.ts` | `portPath(options?.prefix, port)` | WIRED | lines 37, 132, 180 |
| `RemotePorts.ts` | `PortRouteAddress.ts` | `portPath(options.prefix, port)` | WIRED | lines 24, 56 |
| `34-remote-ports.md` | `23-http.md` | BEH-QD-333 -> BEH-QD-338 anchor | WIRED | line 106 |
| `traceability.md` | `PortRoutes.test.ts` | §4 row names BEH-QD-338 | WIRED | line 337 |
| `spec/README.md` | `.changeset/port-route-address.md` | CCR row lists it | WIRED | line 329 |

### Data-Flow Trace (Level 4)

Not applicable: the phase changes how a path string is built and adds no rendered dynamic data. The path flows from the host's `prefix` option through `portPath` to both the router mount and the client request URL, and the round trip test exercises that end to end.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Round trip, address unit and status contract | `pnpm vitest run --project http packages/http/test/PortRoutes.test.ts` | 60 passed | PASS |
| House-style budgets | `node scripts/check-house-style.mjs` | 406 files clean | PASS |
| Typecheck, src and tests | `pnpm typecheck` | exit 0 | PASS |
| Coverage thresholds | `pnpm coverage` | 99.1% stmts, 96.82% branches, no threshold error | PASS |
| `pnpm spec:api`, `spec:gates`, `spec:verify:strict`, example, website, `spec:publish` | not re-run | taken from 07-03-SUMMARY | SKIPPED (relied on SUMMARY and orchestrator evidence) |

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh` scripts.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| ADDR-01 | 07-01 | One exported definition of the route address | SATISFIED | Truths 1, 2 |
| ADDR-02 | 07-01, 07-02 | Decode-whatever-the-status contract stated beside it | SATISFIED | Truth 4 |
| ADDR-03 | 07-01 | Round-trip test with a non-default prefix | SATISFIED | Truth 3 |
| XC-01 | 07-03 | `pnpm check:pr` green | NEEDS HUMAN | Truth 9 |
| XC-02 | 07-02 | ADR-or-reason, CCR row, traceability, changeset | SATISFIED | Truth 6 |
| XC-03 | 07-02, 07-03 | `spec/overview.md` / gate 13 | SATISFIED | Truth 7 |
| XC-04 | 07-01, 07-03 | No new forbidden constructs | SATISFIED | Truth 8 |
| XC-05 | 07-03 | Coverage thresholds hold | SATISFIED | Truth 8 |

All eight IDs (ADDR-01..03, XC-01..05) are claimed by at least one plan's `requirements`. REQUIREMENTS.md maps ADDR-01..03 to Phase 7 and XC-01..05 to all phases; no orphaned requirement. REQUIREMENTS.md already shows them `[x]` while its traceability table still says "Pending" (lines 159, 162); that is bookkeeping, not a code gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `packages/http/src/PortRouteAddress.ts` | 35-36 | `portPath` accepts prefixes its own option docs forbid: `"/"` or `"/x/"` yield `//Port` paths (WR-01 in 07-REVIEW.md, still `open`) | Warning | Both adapters stay consistent with each other, and a mismatch still fails closed as the port's own error. A proxy that collapses `//` would 404 every remote read. Not a must-have failure: no truth or requirement states the prefix is validated. Recommend triage (fix by trimming in `portPath`, or defer) before the milestone closes. |
| `packages/http/test/PortRoutes.test.ts` | 1-10 | Header describes pre-ARCH-52 scope (IN-01) | Info | Cosmetic |
| `packages/http/test/PortRoutes.test.ts` | n/a | Default-prefix-client test asserts only the error tag (IN-02) | Info | Weaker assertion, but the "nowhere else" test covers the not-answered half |
| `spec/behaviors/23-http.md` / `34-remote-ports.md` | n/a | BEH-QD-333 addition runs into previous paragraph; stale Effective Date (IN-03) | Info | Cosmetic |

No TBD/FIXME/XXX debt markers were found in the phase's source files.

### Human Verification Required

#### 1. Full `pnpm check:pr` run (XC-01)

**Test:** Run `pnpm check:pr` on this branch where Playwright's system dependencies can be installed (CI via `.github/workflows/check.yml`, or a host with sudo and a TTY).
**Expected:** Exit 0 through all 16 steps in a single run.
**Why human:** On the verification host the run cannot pass step 13 whatever the tree's state. XC-01 is recorded complete in REQUIREMENTS.md on a user acceptance that exists only as a statement in 07-03-SUMMARY.md. If the maintainer wants that acceptance to stand in place of a CI run, record it as an `overrides:` entry (`must_have: "pnpm check:pr is green"`, `accepted_by`, `accepted_at`) and the phase becomes `passed`. The same host limit applied to Phase 06's UAT, so the project may want a standing note rather than a per-phase decision.

### Gaps Summary

No gaps. Every code-observable truth holds. One item (XC-01's literal single-run exit 0) is not observable on this host and needs a CI run or an explicit maintainer override. WR-01 is an open warning, not blocking.

---

_Verified: 2026-11-08_
_Verifier: Claude (gsd-verifier)_
