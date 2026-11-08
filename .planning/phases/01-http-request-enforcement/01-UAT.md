---
status: testing
phase: 01-http-request-enforcement
source: [01-VERIFICATION.md]
started: 2026-11-08T02:22:34Z
updated: 2026-11-08T02:22:34Z
---

## Current Test

number: 1
name: pnpm check:pr green in one run (XC-01, ROADMAP criterion 5)
expected: |
  All 16 steps exit 0 in a single `pnpm check:pr` run, including step 13 `pnpm example`, on a host where `playwright install --with-deps chromium` can run (CI, or a machine with sudo). Alternatively, the `check` workflow is green on the phase PR.
awaiting: user response

## Tests

### 1. pnpm check:pr green in one run (XC-01, ROADMAP criterion 5)
expected: All 16 steps exit 0 in one run, including step 13 `pnpm example`. On this host step 13 fails only because `playwright install --with-deps` needs sudo; steps 1-12 and every step after 13 passed when run by hand.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
