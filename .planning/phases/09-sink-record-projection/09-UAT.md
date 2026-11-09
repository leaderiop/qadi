---
status: complete
phase: 09-sink-record-projection
source: [09-VERIFICATION.md]
started: 2026-11-09T18:58:00Z
updated: 2026-11-09T19:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Decide WR-01 (09-REVIEW.md, disposition still 'open')
expected: Either apply the curried obligationRecordFor fix (project resourceId and obligationIds once, before the handler) with a mutate-resource.id test, or accept the narrow drift and soften the 'no record byte changed' claim in .changeset/sink-record-projection.md and the CCR-QD-393 row
result: pass
note: The user chose to fix it. The curried obligationRecordFor fix landed in dafe9e1 with the mutate-resource.id, failing-handler and throwing-getter tests, and the disposition is now 'fixed'.

### 2. Confirm a full pnpm check in GitHub Actions finished green (run 42674934850 @ 192bfe1 was superseded; re-run as 42676403473 @ 127d6fa)
expected: Both matrix jobs (Node 22.12.0 and 26) succeed, including the example/Playwright step the local run could not execute
result: pass
note: In run 42676403473 the Node 22.12.0 leg passed the full pnpm check, mutation (94.79 and 95.00, threshold 80) and the example/Playwright step included. The Node 26 leg hit the job's 60-minute timeout-minutes during mutation and failed no step. That timeout predates phase 09: baseline run 42662291585 at c807b64 timed out on both legs.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
