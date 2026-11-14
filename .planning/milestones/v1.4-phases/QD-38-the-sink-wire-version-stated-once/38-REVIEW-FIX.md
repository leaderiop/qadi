---
phase: QD-38-the-sink-wire-version-stated-once
fixed_at: 2026-11-14T00:00:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-38-the-sink-wire-version-stated-once/38-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 38: Code Review Fix Report

**Fixed at:** 2026-11-14T00:00:00Z
**Source review:** /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-38-the-sink-wire-version-stated-once/38-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

Edited in the main checkout (`workflow.use_worktrees` is `false`), so no worktree, temp branch or sentinel was created.

## Fixed Issues

### IN-01: `isReadVersion` can accept a version that has no decode schema

**Files modified:** `packages/core/test/SinkCodec.test.ts`
**Commit:** df5811e1
**Applied fix:** Test route, codec unchanged. In the `the read set, written out` describe, a loop over `WIRE_VERSIONS` asserts each member decodes the V2 fixture stamped with that version (today one row, version 2). A version added to `WIRE_VERSIONS` without a schema now fails there instead of surfacing as `Malformed` in production. It stamps the version onto a fixture rather than round-tripping through the encoder, because the encoder only writes `WIRE_VERSION`.

### IN-02: The two new `MAX_DECODE_DEPTH` boundary tests assert only a lower bound on the path

**Files modified:** `packages/core/test/SinkCodec.test.ts`
**Commit:** 4fd82be6
**Applied fix:** Ran both records to find the exact refusal: both are `TooDeep` with a path of length `MAX_DECODE_DEPTH + 1` (257) and `maxDepth` 256. The policy path is `["policy", ("policies", 0) x 128]`. The trace path is `["outcome", "decision", "trace", ("children", 0) x 127]`. Both tests now `deepStrictEqual` against `EncodeRefusal.TooDeep({ path, maxDepth })`, and the titles say what is asserted ("TooDeep at the path one past the bound"). They fail if the depth walk's boundary moves by one level.

### IN-03: The `SinkWire.ts` header comment is badly wrapped

**Files modified:** `packages/core/src/SinkWire.ts`
**Commit:** 24dabf2a
**Applied fix:** Re-wrapped the first header paragraph to about 90 columns; wording unchanged.

## Verification

Run in the main checkout, not a worktree, so the numbers reproduce from the tree you are looking at.

- `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts`: 156 passed (155 before, plus the new IN-01 row).
- `pnpm exec tstyche SinkWire.tst`: 5/5 passed.
- `pnpm typecheck`: clean.
- `pnpm lint`: exit 0; house-style 496 files clean. Warnings appear only in the untracked `.codex/` hooks.
- Not run: Stryker, so the SinkCodec.ts mutation score (0.9634) is unchecked.

---

_Fixed: 2026-11-14T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
