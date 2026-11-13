---
phase: 35-the-atom-set-owns-its-eviction-sweep
reviewed: 2026-11-12T22:45:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - packages/react/src/QadiAtoms.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/QuestionBook.ts
  - packages/react/src/SweepScheduler.ts
  - packages/react/test/QadiAtoms.sweep.test.ts
  - packages/react/test/QadiAtoms.test.ts
  - packages/react/test/QadiProvider.sweep.test.tsx
  - packages/react/test/QadiProvider.test.tsx
  - packages/react/test/QuestionBook.test.ts
  - packages/react/test/SweepScheduler.test.ts
  - packages/react/test/support/settle.ts
  - packages/react/test/support/sweepCounter.ts
  - packages/react/test/v4-reactivity-smoke.test.ts
  - .changeset/atom-set-sweep.md
  - .changeset/question-book.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - stryker.react.mjs
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase 35: Code Review Report

**Reviewed:** 2026-11-12T22:45:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** clean

## Summary

Re-review (iteration 2) after fixes 230cf975, 8f9bed4e, f9d1941d and 5ae3b761. Each prior finding is fixed and complete, and I found no regression.

- **WR-01 (fork that throws):** `request` in `SweepScheduler.ts` now wraps `fork(episode)` in `try`/`catch`, clears `pending` and rethrows. A throw from the fork cannot wedge the flag. The state is consistent on the caller's side: an `admit` that signalled has already recorded its entry, so the rethrow loses no book state. The header comment now names the one unrecoverable case, a runtime that discards the default fork's timer. Test C11 covers the throw, the cleared flag, a second request that forks, one sweep, and a final `pending() === false`.
- **IN-01 (comment placement):** `const scheduler` now sits above the "What this closure owns" block with its own one-line comment. The block leads directly into `const book` again. `scheduler` is declared before `book` and is only called later through `signal`, so there is no temporal-dead-zone hazard.
- **IN-02 (drain-order coupling):** A canary in `v4-reactivity-smoke.test.ts` now pins the bucket order S9 relies on, and S9 cites it. The canary asserts `events` is `[]` after the unmount, `["forked"]` after one yield, and `["forked", "swept"]` after `settle()`. It uses only `effect` primitives, so an `effect` bump that changes the batching fails in the smoke file with a clear message.
- **IN-03 (wording):** "within a few macrotasks" now appears in the `maxTrackedQuestions` doc comment, the changeset and `upgrading.md`. No "one macrotask" remains under `packages`, `.changeset` or `apps/website/src`. The orchestrator's follow-up in 5ae3b761 also corrected the spec files.

Verification I ran:

- `pnpm vitest run --project react` passes with 475 of 475 tests.
- `sweepIntervalMillis` and `sweepEvictions` remain only in `upgrading.md` (the intended migration note) and in `packages/react/CHANGELOG.md`, which is historical release notes and exempt.

The earlier hazards still hold:

- The sweep runs a macrotask after the call that signalled, so it cannot run in the render path or in the registry's dispose-then-reread window.
- The flag clears immediately before the sweep, inside one synchronous `Effect.sync`.
- `sweep` raises no signal, so none is lost to a running sweep.
- Only entries with `liveCount === 0` are evicted.
- No module-scope state, and no leaked fibers.

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-11-12T22:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
