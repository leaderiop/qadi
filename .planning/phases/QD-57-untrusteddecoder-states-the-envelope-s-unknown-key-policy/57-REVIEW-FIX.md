---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
fixed_at: 2026-11-19T01:30:00Z
review_path: .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 57: Code Review Fix Report

**Fixed at:** 2026-11-19T01:30:00Z
**Source review:** .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03; IN-01 out of scope, left alone)
- Fixed: 3
- Skipped: 0

Edits and commits were made in the main checkout (`workflow.use_worktrees` is `false`). Verification ran in the main checkout, so it is reproducible from this tree.

## Fixed Issues

### WR-01: `ignore` silently drops every key of an index-signature schema

**Files modified:** `packages/core/src/EnvelopeKeys.ts`, `packages/core/test/UntrustedDecode.test.ts`
**Commits:** `4daeb9d2` (RED test), `f3469818` (fix)
**Applied fix:** `Member` gained `open` (an index signature or rest is present). `envelopeKeysOf` throws at build when any member is open, with the `unknownKeys "ignore" needs ...` message family U16 pins. U20 covers `Schema.Record`, `Schema.StructWithRest`, and a rest member inside a union. It also covers `refuse` building all of them, and a closed struct still building and projecting under `ignore`. All 142 core, audit and react test files (3682 tests) pass, so every existing seam still builds.

### WR-02: policy table read through the prototype chain

**Files modified:** `packages/core/src/UntrustedDecode.ts`, `packages/core/test/UntrustedDecode.test.ts`
**Commits:** `cfa1f79e` (RED test), `dd24732a` (fix)
**Applied fix:** `untrustedDecoder` checks `Object.hasOwn(PROJECTION, options.unknownKeys)` and throws at build with `untrustedDecoder: unknownKeys must be "refuse" or "ignore", got <value>`. The closed set is derived from `Object.keys(PROJECTION)`. U21 covers `"constructor"`, `"toString"` and `"nope"`, matched against the exact message. The values reach the option without `as` or `any`: `JSON.parse` returns `any`, which is assignable to the option parameter. A house-style-clean path exists, and `oxlint` and `tsc -p tsconfig.test.json` report nothing for the test.

### WR-03: `decodeSinkRecord` doc stated the pre-phase order

**Files modified:** `packages/core/src/SinkCodec.ts`
**Commit:** `0b628571`
**Applied fix:** The paragraph now says project, then guard, then version, then strict decode. The summary line stays first. I wrote "never reaches the guard or the decode" rather than "is never read", so the text does not overclaim given IN-01.

## Mutation (WX-05, D-12)

Re-run after the fixes, core only. The audit and react files are unchanged since 57-07, so their entries stay. Each run was alone in the background, from the repo root, with `< /dev/null`. Stryker exited 0 each time.

- `after core`: `EnvelopeKeys.ts` 1 (58/58), no survivor. `UntrustedDecode.ts` 0.9535 (41/43), survivors unchanged (lines 224, `unwalked.size > 0`). `SinkCodec.ts` 0.9683 (122/126), survivor set unchanged.
- `ignoreStatic: false` evidence for `EnvelopeKeys.ts`: `{"Killed":67}`.
- `compare` prints `WX-05 holds (D-12)`.
- No new survivor appeared, so no gap test was needed.
- Commit `chore(57): mutation evidence after the review fixes` carries only `57-mutation-after.json` and `57-mutation-static.json`. The script, base JSON and Stryker configs are untouched.

## Final check

`pnpm check:pr < /dev/null` exited 0: 16 of 17 steps ran, with `pnpm mutation` skipped by design.

---

_Fixed: 2026-11-19T01:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
