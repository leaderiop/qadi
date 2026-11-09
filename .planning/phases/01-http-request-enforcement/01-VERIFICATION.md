---
phase: 01-http-request-enforcement
verified: 2026-11-09T22:35:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - .planning/phases/01-http-request-enforcement/01-01-PLAN.md
  - .planning/phases/01-http-request-enforcement/01-01-SUMMARY.md
  - .planning/phases/01-http-request-enforcement/01-02-PLAN.md
  - .planning/phases/01-http-request-enforcement/01-02-SUMMARY.md
  - .planning/phases/01-http-request-enforcement/01-03-PLAN.md
  - .planning/phases/01-http-request-enforcement/01-03-SUMMARY.md
  - .planning/phases/01-http-request-enforcement/01-04-PLAN.md
  - .planning/phases/01-http-request-enforcement/01-04-SUMMARY.md
  - .planning/phases/01-http-request-enforcement/01-05-PLAN.md
  - .planning/phases/01-http-request-enforcement/01-05-SUMMARY.md
  - packages/http/src/AuthorizeRequest.ts
  - packages/http/src/DecisionStreamRoute.ts
  - packages/http/src/DenialLog.ts
  - packages/http/src/GuardApi.ts
  - packages/http/src/GuardRoute.ts
  - packages/http/src/PortRoutes.ts
  - packages/http/src/RequirePermissionMiddleware.ts
  - packages/http/src/index.ts
  - packages/http/test/PortRoutes.test.ts
  - packages/http/test/RequestEnforcement.test.ts
  - packages/http/test/RequestEnforcement.tst.ts
  - packages/http/test/endpointAccess.test.ts
  - packages/http/test/http.test.ts
covered_digest: "v4:sha256:855f761b409f9bfc6eb9f826f03fa97052e299d327022a82815431e5936de3a9"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 1: HTTP request enforcement Verification Report

**Phase Goal:** Every `@qadi/http` request path enforces and logs through one internal module, and an unguarded port route logs a subject-extraction failure.
**Verified:** 2026-11-09
**Status:** passed
**Re-verification:** Yes, milestone-close re-run against today's code. Phases 5, 7 and later edited `DecisionStreamRoute.ts`, `PortRoutes.ts` and `PortRoutes.test.ts` after the first report; every truth was re-checked against the current files.

## Goal Achievement

The goal still holds on today's code. Later phases reshaped the three files (the stream framing moved to `DecisionLogHttp.ts`, the port address to `PortRouteAddress.ts`), but the enforcement chain still lives in one module and the ENF-03 regression test still exists, passes, and goes red when the extraction log is removed.

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | An unguarded port route whose extractor fails emits the same `SubjectExtractionFailed` log line as a guarded route; the regression test fails without the fix. | VERIFIED | `PortRoutes.ts:183` routes `portRoutesUnguarded` through `enforceSubject(answerWithResponse, ...)`. `enforceSubject` calls `extractSubject` (`AuthorizeRequest.ts:100-103`), which applies `tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed)`. The test "logs a subject extraction failure once, as a guarded route does (ENF-03)" is at `PortRoutes.test.ts:633`. It passes on today's tree. Mutation check: I temporarily removed that `tapErrorTag` from `extractSubject`, and the test failed with `expected [] to deeply equal [ Array(1) ]`. The file was restored (`git status` shows only the pre-existing `.planning` changes). The pre-phase code (`8960dae`) answered 502 with no log line (hand-rolled `Effect.result(SubjectExtractor.extract(...))`), and the earlier verifier already showed the red run there. |
| 2 | GuardRoute, RequirePermissionMiddleware, DecisionStreamRoute's recheck and both port-route variants contain no `tapErrorTag(ENFORCEMENT_DENIAL_TAGS` or `catchTag(HTTP_ENFORCEMENT_TAGS` calls of their own. | VERIFIED | `grep` over `packages/http/src` finds these calls only in `AuthorizeRequest.ts` (lines 170, 209, 212). `QadiHttpError.ts` only defines `HTTP_ENFORCEMENT_TAGS`. Callers: `GuardRoute.ts:79` `enforceRequest`, `RequirePermissionMiddleware.ts:70` `enforceRequest`, `DecisionStreamRoute.ts:181` `enforceRequest(..., endStream, ...)` (the recheck, with its own projection), `PortRoutes.ts:183` `enforceSubject`. The guarded `portRoutes` goes through `addGuardedRoute`, which uses `guardRoute`. Phase 5's reshaping of `DecisionStreamRoute.ts` did not reintroduce a per-caller tap or catch. |
| 3 | One table-driven test asserts the log line per failure tag for every caller. | VERIFIED (class-level) | `RequestEnforcement.test.ts` is a `TABLE` of 5 callers x 6 columns. It passes in the run below. The columns cover one representative of each log class, not each of the 12 tags (carried-forward warning, unchanged from the first report). |
| 4 | The endpoint member key is built in exactly one function. | VERIFIED | `grep 'identifier}/' packages/http/src` returns one hit, `AuthorizeRequest.ts:56` (`endpointMemberKey`). `GuardApi.ts:150` and `RequirePermissionMiddleware.ts:90` call it. |
| 5 | `pnpm check:pr` is green, and ADR-QD-108, CCR-QD-385 and a changeset are recorded. | VERIFIED | Records present: `spec/decisions/108-a-request-is-enforced-once-through-one-module.md`; `CCR-QD-385` in `spec/README.md` (change-history row 1.118); `.changeset/request-enforced-once.md` (`"@qadi/http": patch`); BEH-QD-335/336 in `spec/behaviors/23-http.md`; INV-QD-243 in `spec/invariants.md`. Gate: GitHub Actions run 42676403473 at `127d6fa`, job `check (22.12.0)`, concluded `success` with no non-success step (confirmed with `gh run view`). The `check (26)` job was cancelled at the "Merge gate" step by the workflow's 60-minute timeout during mutation; Phase 9's records document that this timeout predates this work (baseline run 42662291585 timed out on both legs). `git diff 127d6fa HEAD` outside `.planning` is empty, so that run covers today's code. This also closes the earlier report's only human item (the literal `check:pr` run), which the earlier UAT had closed by hand-run steps. |

**Score:** 5/5 truths verified.

### Plan-level must-haves (re-checked)

| Truth | Status | Evidence |
| --- | --- | --- |
| Handler step taps a handler-raised denial once (`"handler"`) and projects every `HTTP_ENFORCEMENT_TAGS` failure via the caller's projection | VERIFIED | `enforced` (`AuthorizeRequest.ts:200-213`): tap on the handler effect only, array-form catch. |
| Subject-only mode applies no policy and never runs the handler on extraction failure | VERIFIED | `enforceSubject` (`:231-237`) runs the handler inside `enforced`'s `flatMap`, after the edge succeeds. The ENF-03 test asserts `double.calls.length === 0`. |
| Public export set unchanged; module package-private apart from `authorizeRequest`/`AuthorizedRequest` | VERIFIED | `index.ts` no longer re-exports `AuthorizeRequest.ts` (the diff vs `8960dae` shows its one removed line). CI ran `spec:api` and `spec:package` green. |
| Recheck keeps its own projection | VERIFIED | `endStream` (`DecisionStreamRoute.ts:157-161`) is the recheck's projection; it logs a closure line and fails with the classified class. |
| ADR/BEH/INV/traceability/CCR records | VERIFIED | Files and rows present (see criterion 5); `spec:verify:strict` ran green inside the CI `pnpm check`. |

### Required Artifacts

| Artifact | Status | Details |
| --- | --- | --- |
| `packages/http/src/AuthorizeRequest.ts` | VERIFIED | Substantive (`extractSubject`, `enforced`, `enforceSubject`, `enforceRequest`, `endpointMemberKey`), wired into all five callers. |
| `packages/http/test/RequestEnforcement.test.ts` | VERIFIED | Present, passes. |
| `packages/http/test/RequestEnforcement.tst.ts` | VERIFIED | Present; `pnpm test:tstyche` is part of the green CI `check`. |
| `packages/http/test/PortRoutes.test.ts` | VERIFIED | ENF-03 test present at line 633, passes, fails under mutation. |
| `.changeset/request-enforced-once.md` | VERIFIED | `@qadi/http` patch. |

### Key Link Verification

| From | To | Via | Status |
| --- | --- | --- | --- |
| `PortRoutes.ts` | `AuthorizeRequest.ts` | `enforceSubject(answerWithResponse, ...)` (:183) | WIRED |
| `GuardRoute.ts` | `AuthorizeRequest.ts` | `enforceRequest(...)` (:79) | WIRED |
| `GuardApi.ts` / `RequirePermissionMiddleware.ts` | `AuthorizeRequest.ts` | `endpointMemberKey` (:150 / :90) | WIRED |
| `RequirePermissionMiddleware.ts` | `AuthorizeRequest.ts` | `enforceRequest(..., answerInChannel, ...)` (:70) | WIRED |
| `DecisionStreamRoute.ts` | `AuthorizeRequest.ts` | `enforceRequest(..., endStream, ...)` (:181) | WIRED |
| `GuardApi.ts` | `AuthorizeRequest.ts` | named `authorizeRequest` re-export keeps the public name | WIRED |

### Data-Flow Trace (Level 4)

Not applicable: no rendered dynamic data. Log lines are asserted end to end by the table and the ENF-03 test through a real `HttpRouter.toWebHandler` and a collecting logger.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| http enforcement tests | `pnpm vitest run --project http` on `PortRoutes`, `RequestEnforcement`, `http`, `endpointAccess` | 4 files, 136 tests passed | PASS |
| ENF-03 regression depends on the module's extraction log | Removed `tapErrorTag("SubjectExtractionFailed", ...)` from `extractSubject`, ran `-t "logs a subject extraction failure once"` | 1 failed (`expected [] to deeply equal [ Array(1) ]`); file restored | PASS (expected failure) |
| House style and budgets | `node scripts/check-house-style.mjs` | 408 files clean, 3 declared switches | PASS |
| Whole-suite gate | GitHub Actions run 42676403473 at `127d6fa`, job `check (22.12.0)` | success, every step; no non-`.planning` change since | PASS |

### Probe Execution

Step 7c: SKIPPED. The plans declare no probe scripts.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| --- | --- | --- | --- |
| ENF-01 | 01, 02, 03 | SATISFIED | All five callers use `enforceRequest` or `enforceSubject`; no per-caller tap or catch remains. |
| ENF-02 | 01 | SATISFIED | `enforceSubject` is the subject-only mode, used by `portRoutesUnguarded`. |
| ENF-03 | 01, 03 | SATISFIED | Regression test present, green, and red under mutation. |
| ENF-04 | 01, 02 | SATISFIED | The handler tap and the catch exist only in `enforced`; callers supply only projections (`answerWithResponse`, `answerInChannel`, `endStream`). |
| ENF-05 | 02 | SATISFIED | `endpointMemberKey` is the single construction site. |
| ENF-06 | 03 | SATISFIED | 5 x 6 table passes. |
| XC-01 | 05 | SATISFIED | CI `check (22.12.0)` green at `127d6fa`, full `pnpm check` with the example step. |
| XC-02 | 04, 05 | SATISFIED | ADR-QD-108, CCR-QD-385, BEH-QD-335/336, INV-QD-243, changeset all present. |
| XC-03 | 05 | SATISFIED | No export added or removed; `spec:api` green in CI. |
| XC-04 | 01, 02, 05 | SATISFIED | House-style gate clean (408 files, switch budget unchanged). |
| XC-05 | 03, 05 | SATISFIED | Coverage runs inside the green CI `pnpm check`. |

All 11 IDs are claimed by the PLAN frontmatter; REQUIREMENTS.md maps no other ID to Phase 1, so there are no orphans.

Bookkeeping note for the orchestrator: `.planning/REQUIREMENTS.md` still shows `ENF-03` as `[ ]` (line 16) and the Traceability rows for `ENF-01..06` and `XC-01..05` as "Pending" (lines 153, 162). The requirement is satisfied; the checkbox and table are stale and should be flipped at milestone close.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
| --- | --- | --- | --- |
| RequestEnforcement.test.ts | Prefix allow-list filter weakens "exactly one line" (REVIEW WR-02) | Warning | A reworded duplicate line could pass. Carried forward, does not defeat the goal. |
| RequestEnforcement.test.ts | `streamRecheck x success` asserts absence after yields (REVIEW WR-03) | Warning | The cell can pass vacuously. Carried forward. |
| AuthorizeRequest.ts | `endpointMemberKey` not injective (REVIEW IN-03) | Info | Practically unreachable. |

No `TBD`, `FIXME` or `XXX` markers in the covered source files.

### Human Verification Required

None. The first report's only item (a literal green `pnpm check:pr`) is closed by CI run 42676403473's Node 22.12.0 leg at `127d6fa`, which ran the full `pnpm check` green on the current code.

### Gaps Summary

No gaps. One internal module still owns the enforcement chain for all five request paths, the unguarded port route logs a subject-extraction failure and the regression test proves it, the member key has one construction site, and the spec records exist. Later phases' edits to `DecisionStreamRoute.ts`, `PortRoutes.ts` and `PortRoutes.test.ts` were intentional reshapes that preserved every Phase 1 truth.

---

_Verified: 2026-11-09_
_Verifier: Claude (gsd-verifier)_
