---
phase: 05-decision-log-over-http
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - .changeset/decision-log-http.md
  - packages/http/src/DecisionBacklogRoute.ts
  - packages/http/src/DecisionLogHttp.ts
  - packages/http/src/DecisionStreamRoute.ts
  - packages/http/test/DecisionLogHttp.test.ts
  - packages/http/test/DecisionLogHttp.tst.ts
  - spec/README.md
  - spec/behaviors/26-decision-stream.md
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
  necessity: 0
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

The phase moves the two decision-log routes' encode-or-report loop and refusal reporters into one package-private module, `DecisionLogHttp.ts`. I read the full source and test files, and the phase-05 hunks of the spec documents (`git diff ea07f3e..HEAD`).

I traced the refactor against the pre-phase code and found no behaviour change.
- **Ordering and evaluation:** `Effect.forEach` runs sequentially, as the old `for` loop and `Effect.forEach` did.
- **Reporting:** the reporter runs only on the refusal branch, and the span names and messages are carried over verbatim.
- **Frames:** the SSE `id:` and `event:` handling is unchanged.
- **Filter semantics:** `Result.fail(refusal)` still drops the element in `Stream.filterMapEffect`.

I ran the checks:
- `vitest` on the new table, `decisionBacklog.test.ts` and `decisionStream.test.ts`: 56 tests pass.
- `tsc -p tsconfig.test.json`: clean.
- `oxlint packages/http`, `scripts/check-house-style.mjs` and `scripts/check-api-surface.mjs`: clean.
- `lib/DecisionLogHttp.d.ts` is emitted and `lib/DecisionBacklogRoute.d.ts` resolves it.

The spec edits are internally consistent: BEH-QD-337, INV-QD-097 and INV-QD-104 all exist, and the traceability rows and CCR-QD-389 agree. No security issue was found. The disclosure surface, the guarded registration and `cache-control: no-store` are untouched.

The remaining concerns are test coverage and documentation precision. A necessity pass found nothing: no guard against an impossible state was added.

## Warnings

### WR-01: The stream route's `onRefused` forwarding is not pinned by any test

**File:** `packages/http/src/DecisionStreamRoute.ts:245` (test side: `packages/http/test/DecisionLogHttp.test.ts`, `packages/http/test/decisionStream.test.ts:230-312`)
**Issue:** `decisionStreamRoute` hands its `options` to `decisionFrames(read, options)` at line 245. If that argument were dropped, `onRefused` would silently stop being honoured on `/__decisions` and the default warning would fire instead.

- **What is pinned:** the new table calls `jsonElements`, `frameEntries` and `frameEntry` directly, and `decisionStream.test.ts` calls `decisionFrames` directly (lines 668-760).
- **What is not:** every `decisionStreamRoute(...)` call in `decisionStream.test.ts` and `RequestEnforcement.test.ts` passes only `reauth` or nothing, and no test exercises a refused record through the mounted route.
- **Contrast with the backlog:** `decisionBacklog.test.ts` does exercise `onRefused` through the mounted route (lines 115-190), so only the stream half is unpinned.

This gap predates the phase. But the phase's own claim (BEH-QD-337 and the table's header comment) is that both routes refuse alike "in every framing", and the route-level argument pass-through is the one link the table cannot see. The spec's `tst.ts` also only checks that the types accept the options, not that they are used.
**Fix:** Add one route-level cell to `decisionStream.test.ts`. Mount `decisionStreamRoute(readPermission, readPolicy, log, { onRefused })` over a log holding a cyclic or opaque record, read the body through the route's web handler, and assert the hook fired once and the following records were still framed.

## Info

### IN-01: `DecisionLogServeOptions` is documented as package-private but appears in public signatures

**File:** `packages/http/src/DecisionLogHttp.ts:36`, `packages/http/src/DecisionBacklogRoute.ts:48`, `packages/http/src/DecisionStreamRoute.ts:135,144`, `spec/behaviors/26-decision-stream.md` (BEH-QD-337 block)
**Issue:** The interface is not exported from the barrel, yet it is the declared type of a public parameter of `decisionBacklogRoute` and `decisionFrames`, and a base of the public `DecisionStreamOptions`.

- **Impact on consumers:** a consumer cannot name the type. The only way is `Pick<DecisionStreamOptions, "onRefused">`, which the changeset documents and the `tst.ts` pins. The IDE hover and `.d.ts` still resolve it, as the emitted `lib` shows.
- **Spec wording:** the `onRefused` documentation now lives only on this unexported interface. BEH-QD-337 and the overview call it "package-private" while two public signatures expose it, which reads as a contradiction.
- **Not a gate failure:** gate 13 passes because the interface is not an export.

**Fix:** Either state in the spec's BEH-QD-337 note that it is reachable only through `DecisionStreamOptions`, or export it from the barrel, add it to `spec/overview.md`'s tables and drop the "package-private" wording.

### IN-02: The refusal table never asserts the frame's `event:` or `id:` lines

**File:** `packages/http/test/DecisionLogHttp.test.ts:114-120,153-160`
**Issue:** Each SSE cell reads the `data:` line back through the codec and compares evaluation ids. A regression in which `frameEntries("backlog", …)` emitted the `message` event name, or dropped the cursor `id:` while still encoding the record, would pass the table. Other suites in `decisionStream.test.ts` cover event names and ids, so this is not a hole in the suite as a whole. But the table's header claims it pins "keep, drop and report" for every framing, and the framing is the module's one non-trivial per-framing difference.
**Fix:** In `decodeFrame`, or beside it, also assert the `event: backlog` line (and the absence of an `event:` line for `message`). Assert that `id:` equals `formatLogCursor(cursor)` for the kept entries.

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
