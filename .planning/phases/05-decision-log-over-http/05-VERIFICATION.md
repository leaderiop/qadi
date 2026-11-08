---
phase: 05-decision-log-over-http
verified: 2026-11-08T07:00:00Z
status: human_needed
score: 9/9 must-haves verified
covered_files:
  - ".planning/phases/05-decision-log-over-http/05-01-PLAN.md"
  - ".planning/phases/05-decision-log-over-http/05-01-SUMMARY.md"
  - ".planning/phases/05-decision-log-over-http/05-02-PLAN.md"
  - ".planning/phases/05-decision-log-over-http/05-02-SUMMARY.md"
  - "packages/http/src/DecisionBacklogRoute.ts"
  - "packages/http/src/DecisionLogHttp.ts"
  - "packages/http/src/DecisionStreamRoute.ts"
  - "packages/http/test/DecisionLogHttp.test.ts"
  - "packages/http/test/DecisionLogHttp.tst.ts"
covered_digest: "v4:sha256:3b7c98c8e2e05738c729007e2507f689b9bab8b3f9390a672bce5c2ed49a77d9"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Run `pnpm check:pr` end to end on a host where `playwright install --with-deps chromium` works (CI, or locally with sudo)"
    expected: "Exit 0 across all 15 steps, including step 13 (`pnpm example`)"
    why_human: "On this host step 13 needs sudo. Every other step was re-run by the verifier directly (see Behavioral Spot-Checks) and passed, but the single composite command has not been seen green here. User chose to record it as manual-only in 05-VALIDATION.md."
---

# Phase 5: Decision log over HTTP Verification Report

**Phase Goal:** The HTTP side of the decision log encodes and reports refusals in one module, for both SSE and JSON.
**Verified:** 2026-11-08
**Status:** human_needed (all code and spec truths verified; XC-01's composite gate needs a host that can install Playwright deps)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ROADMAP 1: exactly one `reportRefused` exists in `packages/http/src` | VERIFIED | `grep -rn reportRefused packages/http/src` finds the one factory, `DecisionLogHttp.ts:49`. `reportRefusedJson` and `reportRefusedSse` (lines 57, 62) are two instances of that factory, not two reporters. Both refusal messages and both span names appear only in this file. No `encodeStoredRecord`, `encodeStoredRecordString` or `reportEncodeRefusal` call exists in the other http source files, only doc-comment mentions. |
| 2 | ROADMAP 2: DecisionBacklogRoute imports nothing from DecisionStreamRoute | VERIFIED | `DecisionBacklogRoute.ts` imports only effect, `@qadi/core`, `./DecisionLogHttp.ts`, `./NoResource.ts`, `./PermissionRegistry.ts`. A grep for any `DecisionStreamRoute` import across `packages/http/src` is empty. |
| 3 | ROADMAP 3: one table-driven test covers refusal in both framings | VERIFIED | `DecisionLogHttp.test.ts` runs `FRAMINGS` (json, sse backlog, sse live) x `SCENARIOS` (all encodable, one refused in the middle, onRefused throws, no onRefused). That is 12 cells. Expectations live on the scenario, so the framings must agree. Test run: 56/56 pass across this file, `decisionBacklog.test.ts` and `decisionStream.test.ts`. |
| 4 | ROADMAP 4: `pnpm check:pr` green; CCR-QD-389 and a changeset recorded | VERIFIED for CCR and changeset; gate itself is a human item | CCR-QD-389 row at `spec/README.md:327`. `.changeset/decision-log-http.md` is a `"@qadi/http": patch`. Gate: see Human Verification. |
| 5 | A refused record drops only its own element in every framing, others served in order (LOGH-01) | VERIFIED | `keepEncoded` over `encodeOrReport` is shared by `jsonElements` and `frameEntries`. `frameEntry` is the live filter. The table asserts `kept` equals the expected ids in order for all three framings. |
| 6 | A refusal is reported exactly once: `onRefused`, else one warning in the route's own words, annotated, under the route's own span; an encodable record opens no span | VERIFIED | The reporter delegates to core's `reportEncodeRefusal` with per-route `message` and `span`. The table asserts the log line count, message, `qadi.refusal`/`qadi.path`/`evaluationId` annotations and span count (0 for the all-encodable cells, 1 for refusals). |
| 7 | A throwing `onRefused` is contained in every framing | VERIFIED | Table cell "onRefused throws" in all three framings: one "hook threw" line, other records kept. Containment is in core's `reportEncodeRefusal`. |
| 8 | Spec is recorded (XC-02, XC-03) | VERIFIED | BEH-QD-337 at `spec/behaviors/26-decision-stream.md:462`. INV-QD-097 Source and Enforcement name `DecisionLogHttp.ts` and `DecisionLogHttp.test.ts`. Traceability §1, §2 and §4 rows are present (`traceability.md:358-359`). The `overview.md:610` frame row is reworded. `pnpm spec:verify:strict` gives PASS 21 / FAIL 0. `pnpm spec:api` documents 862 exports. `spec-revise --check` is clean. No ADR was written, and the CCR row justifies that by pointing at ADR-QD-095 D-09-e. |
| 9 | House rules hold and coverage thresholds hold (XC-04, XC-05) | VERIFIED | The scan of the phase's http source diff (`686695b~1..6873086`) for `as`, `any`, `!`, `switch`, `fnUntraced`, `async`/`await`, `console`, `Date` is clean. It matched only the new import lines. `check-house-style.mjs`: 405 files clean, 3 declared switches (unchanged). `pnpm coverage` exits 0 with the per-package thresholds enforced (157 files, 3958 tests). |

**Score:** 9/9 truths verified (0 behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/http/src/DecisionLogHttp.ts` | One reporter, encode-or-report, `frame`, `jsonElements`, `frameEntry(ies)` | VERIFIED | Substantive (about 175 lines). Wired from both routes. Not in `index.ts`, so it stays package-private (ADR-QD-099). |
| `packages/http/src/DecisionBacklogRoute.ts` | Calls `jsonElements`, no stream-route import | VERIFIED | Line 26 import, used at the handler body. |
| `packages/http/src/DecisionStreamRoute.ts` | Re-exports `frame`, uses `frameEntries`/`frameEntry` | VERIFIED | `export { frame }` re-export. `decisionFrames` uses both framers. |
| `packages/http/test/DecisionLogHttp.test.ts` | Framing x scenario table | VERIFIED | 216 lines, runs green. |
| `packages/http/test/DecisionLogHttp.tst.ts` | Type-level compat pins | VERIFIED | tstyche: 9 tests pass across it and `DecisionStreamRoute.tst.ts`. |
| `spec/README.md` CCR-QD-389, `.changeset/decision-log-http.md`, BEH-QD-337 | Records | VERIFIED | All present, see truth 8. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DecisionBacklogRoute | DecisionLogHttp | `jsonElements(yield* log.snapshot, options)` | WIRED | |
| DecisionStreamRoute | DecisionLogHttp | `frameEntries("backlog", ...)` and `Stream.filterMapEffect(read.live, frameEntry("message", options))` | WIRED | |
| decisionStreamRoute | decisionFrames | `decisionFrames(read, options)` | WIRED | Not pinned by a route-level test, see Advisory (WR-01). |
| DecisionLogHttp | core | `reportEncodeRefusal`, `encodeStoredRecord(String)` | WIRED | |
| spec/overview.md | DecisionStreamRoute.ts | frame row "public through `DecisionStreamRoute.ts`" | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `/__decisions/backlog` body | `jsonElements(snapshot)` | `log.snapshot`, then core `encodeStoredRecord` | Yes | FLOWING |
| `/__decisions` frames | `read.backlog` and `read.live` | `log.readEntries`, then `encodeStoredRecordString` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Refusal table + route tests | `pnpm vitest run --project http DecisionLogHttp decisionBacklog decisionStream` | 56 passed | PASS |
| Type pins | `pnpm exec tstyche DecisionLogHttp.tst.ts DecisionStreamRoute.tst.ts` | 9 passed | PASS |
| Full suite with coverage thresholds | `pnpm coverage` | exit 0, 3958 tests | PASS |
| typecheck, lint, circular | `pnpm typecheck`, `pnpm lint`, `pnpm circular` | clean (2 pre-existing lint warnings in unrelated files) | PASS |
| house style | `node scripts/check-house-style.mjs` | 405 files clean | PASS |
| spec gates | `pnpm spec:verify:strict`, `pnpm spec:api`, `spec-revise --check` | PASS 21/0, 862 exports, consistent | PASS |

I did not run `pnpm example`, `test:e2e`, `spec:website-examples`, `website` or `spec:publish`. The summary says the executor ran them directly, and I am not counting that as verification.

### Probe Execution

SKIPPED. The phase declares no probe scripts.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| LOGH-01 | 05-01 | SATISFIED | Truths 5-7. |
| LOGH-02 | 05-01 | SATISFIED | Truth 1. Both routes use the module. |
| LOGH-03 | 05-01 | SATISFIED | Truth 2. |
| LOGH-04 | 05-01 | SATISFIED | Truth 3. |
| XC-01 | 05-02 | NEEDS HUMAN | Every sub-step except `pnpm example` verified green by me. The composite is manual-only. |
| XC-02 | 05-02 | SATISFIED | CCR-QD-389, BEH-QD-337, changeset, and a stated no-ADR decision. |
| XC-03 | 05-02 | SATISFIED | `spec:api` green and the overview rows are updated. |
| XC-04 | 05-01, 05-02 | SATISFIED | Truth 9. |
| XC-05 | 05-01, 05-02 | SATISFIED | `pnpm coverage` exit 0. |

All IDs from the PLAN frontmatter (LOGH-01..04, XC-01..05) are accounted for. There are no orphaned requirements.

**Bookkeeping discrepancy (not a code gap):** `.planning/REQUIREMENTS.md` has XC-01..05 checkbox-ticked at lines 128-134, but the traceability table (lines 157, 162) still says "Pending" for LOGH-01..04 and XC-01..05. The orchestrator reported `table_unmatched` for the range-style rows (`LOGH-01..04`). Update those two rows by hand. XC-01 is ticked although the composite gate is only manually verified. That is the user's call, but it is worth knowing.

### Anti-Patterns Found

None blocking. There are no TBD/FIXME/XXX/TODO markers and no stub returns in the three http source files or the new tests (the debt-marker gate is clean).

### Advisory (from 05-REVIEW.md, still open in the disposition file)

| # | Finding | Severity | Note |
|---|---------|----------|------|
| WR-01 | No route-level test proves `decisionStreamRoute` passes `options` to `decisionFrames` | Warning (advisory) | I confirmed by reading that the wiring is correct today (`DecisionStreamRoute.ts:245`). It is unpinned, so a regression there would be silent. Recommend a follow-up test mounting the route with an `onRefused` and a refused record. It does not fail any success criterion. |
| 2 info items | See 05-REVIEW.md | Info | |

### Human Verification Required

#### 1. Full merge gate on a host that can install Playwright deps

**Test:** Run `pnpm check:pr` (in the background, since it takes more than 10 minutes) on CI or a host with sudo for `playwright install --with-deps chromium`.
**Expected:** Exit 0.
**Why human:** Step 13 (`pnpm example`) cannot run on this Fedora host. This is the one thing between "all verifiable evidence green" and a literal reading of ROADMAP criterion 4 and XC-01.

### Gaps Summary

No code or spec gaps. One module owns encode-or-report and the single reporter for both SSE and JSON. The backlog route is decoupled from the stream route. One table exercises 12 framing x scenario cells. The spec, CCR, changeset and invariants are consistent and the spec gates are green. The only open item is the composite `pnpm check:pr` run, which the user already chose to record as manual-only, so status is `human_needed`. Hand-fix the REQUIREMENTS.md traceability table rows.

---

_Verified: 2026-11-08_
_Verifier: Claude (gsd-verifier)_
