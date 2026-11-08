---
status: testing
phase: 08-port-serving-from-registry
source: [08-VERIFICATION.md]
started: 2026-11-08T15:00:38Z
updated: 2026-11-08T15:00:38Z
---

## Current Test

number: 1
name: XC-01 — a single `pnpm check:pr` run exits 0
expected: |
  On a host where `playwright install --with-deps chromium` can run (passwordless sudo, or CI for branch arch-wave-5), `pnpm check:pr` completes every step and exits 0. Locally it stopped only at step 13 (`pnpm example`) on a sudo password prompt; every other step, including the e2e suite run by hand, passed.
awaiting: user response

## Tests

### 1. XC-01 — a single `pnpm check:pr` run exits 0
expected: `pnpm check:pr` exits 0 in one run (CI or a host with passwordless sudo).
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
