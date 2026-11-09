---
phase: 04-gate-instrumentation-hook
fixed_at: 2026-11-08T00:00:00Z
review_path: /home/yopu/Project/Perso/qadi/.planning/phases/04-gate-instrumentation-hook/04-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-11-08
**Source review:** /home/yopu/Project/Perso/qadi/.planning/phases/04-gate-instrumentation-hook/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: The "opens its decision atom once" test never exercises the suspending path

**Files modified:** `packages/react/test/GateWriter.useGates.test.tsx`
**Commit:** see `git log` (`fix(04): WR-01 ...`)
**Status:** fixed: requires human verification (test-logic change; the asserted invariant differs from the review's suggestion, see below)
**Applied fix:** Added a cold-suspend case. The probe is the sole asker, instrumentation is on, and the `AttributeResolver` port is held on a `Deferred`, so the atom is pending at first render. The probe suspends, then the Deferred is released and it settles. The test asserts the fallback shows and nothing is registered while held. After release it asserts `Allow` renders and exactly one instance registers.

The measured behaviour does not support "exactly once in total". A cold suspend re-runs the lookup on every discarded render attempt: 3 opens over 4 attempts in the observed run. An attempt that follows a commit keeps its memo and opens nothing. The invariant the test pins is therefore `1 <= opened <= attempts` (at most one open per render attempt, at least 2 attempts), counted with a render counter inside the probe. Pre-ARCH-49 code opened twice per fresh attempt, so `opened` would exceed `attempts` and the test would fail. The review's own alternative fix anticipated this ("a suspend retry may legitimately re-run the lookup").

The held port is a plain `Layer.succeed(AttributeResolver, ...)` that awaits a Deferred. `scriptedPort` answers synchronously and cannot hold, and no port error is constructed, so `PORT_DOUBLE_BUDGET` is unaffected.

IN-04 was also fixed, because the same header was edited. It now separates the characterisation cases from the D-04 new-behaviour cases.

## Verification

Run in the main checkout (`workflow.use_worktrees` is `false`, so no worktree was created).

- `pnpm vitest run --project react`: 23 files, 362 tests passed. The new file was run 3 times in a row and stayed green.
- `pnpm typecheck`: clean.
- `node scripts/check-house-style.mjs`: 403 files clean.

---

_Fixed: 2026-11-08_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
