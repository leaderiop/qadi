---
status: testing
phase: 06-dehydration-in-engine
source: [06-VERIFICATION.md]
started: 2026-11-08T00:00:00Z
updated: 2026-11-08T00:00:00Z
---

## Current Test

number: 1
name: Literal `pnpm check:pr` exits 0 on a host that can install Playwright's system deps
expected: |
  Exit 0 across all 16 steps, including step 13 (`pnpm example`).
awaiting: user response

## Tests

### 1. Literal `pnpm check:pr` exits 0 on a host that can install Playwright's system deps
expected: Exit 0 across all 16 steps, including step 13 (`pnpm example`). Run on a host with passwordless sudo or with `playwright install --with-deps chromium` system deps preinstalled.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
