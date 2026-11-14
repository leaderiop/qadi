---
phase: QD-40-core-owns-describing-a-decode-refusal
fixed_at: 2026-11-14T14:10:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase QD-40: Code Review Fix Report

**Fixed at:** 2026-11-14T14:10:00Z
**Source review:** `.planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

`workflow.use_worktrees` is `false`, so fixes were edited and committed in the main checkout on `arch-wave-9`
(no worktree, no sentinel). All verification ran in the main checkout. Commit trailer used:
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (the model line from the session's
attribution reminder, not the Opus line in the prompt).

## Fixed Issues

### WR-01: A throwing `onMalformed` callback ends the stream

**Files modified:** `packages/devtools/src/model/Source.ts`, `packages/devtools/test/model/Source.test.ts`, `spec/behaviors/27-devtools-timeline.md`
**Commit:** 9eb6175f
**Status:** fixed: requires human verification (error-handling logic)
**Applied fix:** The callback runs under `Effect.try({ try, catch: thrownName })` and `Effect.catch` logs a fixed
warning, `qadi/devtools: onMalformed threw`, annotated only with `qadi.thrown` (the thrown value's `name`, or
`typeof` for a non-Error). The thrown message is never logged. The default warning (fixed message,
`decodeRefusalAnnotations` plus `qadi.frame`) is unchanged. Two new tests cover the `Error` branch and the
non-`Error` branch, each asserting the stream delivers the next good record and the sender-like text is absent
from the log. BEH-QD-204 gained a requirement for it and `27-devtools-timeline.md` moved to Rev 1.13 through
`scripts/spec-revise.mjs`.

**`onDisconnect` left alone, deliberately.** It does not have the identical gap. It is invoked from the
`EventSource` error listener, which the browser runs outside the Effect fiber, so a throw there is reported by
the host and cannot become a defect in the stream. (Only the test fake calls it synchronously inside acquire.)
Wrapping it would add a branch with no real failure mode behind it.

### IN-01: A test helper reuses the name of the new public export `decodeRefusalOf`

**Files modified:** `packages/core/test/SinkCodec.test.ts`
**Commit:** dd0c3da3
**Applied fix:** Renamed the local helper to `refusalOfText` at its declaration and every use.

### IN-03: Two sentences name "the sender" in cases where there is no sender

**Files modified:** `packages/core/src/SinkWire.ts`, `packages/core/test/DecodeRefusal.test.ts`
**Commit:** 946a35ce
**Applied fix:** `NotJson` now reads "not JSON: the text did not parse, so it was truncated or replaced before
this reader parsed it". `TooDeep` now reads "...a current writer refuses to emit that, so the record came from an
older or foreign writer or was altered". The written-out literals in `DecodeRefusal.test.ts` follow. A grep of
`spec/`, `apps/website/src`, package READMEs and `examples/` found no other quote of the old sentences; only
historical CHANGELOG entries mention the old wording and were left. The 40-02 pins were not touched.

### IN-02: Module header comments no longer describe the module

**Files modified:** `packages/core/src/SinkWire.ts`, `packages/core/src/SinkCodec.ts`
**Commit:** a7553b90
**Applied fix:** The `SinkWire.ts` header names `decodeRefusalOf`, `describeDecodeRefusal` and
`decodeRefusalAnnotations`. The `SinkCodec.ts` header lists `decodeSinkRecordWithJson` as the inbound
operation `decodeSinkRecord` and `decodeSinkRecordString` read through. Both cite ADR-QD-153.

## Verification (main checkout)

All passed after the last commit:

- `pnpm exec vitest run --project core packages/core/test/DecodeRefusal.test.ts packages/core/test/SinkCodec.test.ts`: 208 passed
- `pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts`: 41 passed (39 before, plus 2 new)
- `pnpm exec tstyche SinkWire.tst Source.tst surface.tst`: 3 files, 15 tests passed
- `pnpm typecheck`, `pnpm run build`: exit 0
- `pnpm lint`: exit 0 (existing warnings only, none in changed files)
- `node scripts/spec-revise.mjs --check`: every revision matches
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0

Not run: Stryker for devtools `Source.ts`. Both branches of `thrownName` and the new `Effect.try`/`Effect.catch`
path have a test, but the mutation score of 1 is unconfirmed.

---

_Fixed: 2026-11-14T14:10:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
