---
status: complete
phase: 01-release-readiness-runtime-verification
source: [01-VERIFICATION.md]
started: 2026-08-30T04:35:00Z
updated: 2026-08-30T03:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Real CI run of the two-leg Node matrix
expected: Push this branch (or open a PR) and confirm on the `check` workflow run that both `check (20.19.0)` and `check (26)` legs conclude `success`, and that the floor leg resolved exactly v20.19.0.
result: issue
reported: "check (26) succeeded, but check (20.19.0) failed on both the initial run (33288841795) and a re-run of just that job — same test, same line, both times: `packages/react/test/edges.test.tsx:154:11`, `useDecisionSuspense > shows the Suspense fallback before the decision settles`, TestingLibraryElementError: Unable to find an element with the text: decided:Deny. Reproducible, not flaky — confirmed Node 20.19.0 was the actual runtime used (setup-node log line: 'node-version: 20.19.0' / 'Acquiring 20.19.0 - x64'). 1844/1845 tests pass on that leg; the same suite passes 1845/1845 locally and on check (26)."
severity: blocker

### 2. Final release-readiness read
expected: Confirm nothing was published (tag check already automated and clean) and read `packages/audit/CHANGELOG.md` as a first-time consumer to confirm the `ElectronicSignature` removal reads clearly.
result: pass

## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-01-1
  truth: "CI runs the full `pnpm check` gate suite on Node.js 20.19.0 ... and it passes"
  status: failed
  reason: "User reported: check (20.19.0) fails reproducibly (2/2 runs) on packages/react/test/edges.test.tsx:154 (useDecisionSuspense Suspense-fallback test) with TestingLibraryElementError: Unable to find an element with the text: decided:Deny. check (26) passes the identical suite. Not observed locally (1845/1845 pass) or on check (26) — appears specific to the Node 20.19.0 runtime's async/microtask scheduling interacting with the test's 1ms Effect.delay + default waitFor timeout."
  severity: blocker
  test: 1
  artifacts: []
  missing: []
