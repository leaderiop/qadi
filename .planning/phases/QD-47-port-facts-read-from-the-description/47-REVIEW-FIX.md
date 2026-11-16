---
phase: QD-47-port-facts-read-from-the-description
fixed_at: 2026-11-16T07:00:00Z
review_path: .planning/phases/QD-47-port-facts-read-from-the-description/47-REVIEW.md
iteration: 3
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase QD-47: Code Review Fix Report

**Fixed at:** 2026-11-16T07:00:00Z
**Source review:** .planning/phases/QD-47-port-facts-read-from-the-description/47-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`).

## Fixed Issues

### WR-01: `markDefault`'s in-place `Object.assign` throws for an extensible result whose prototype has a read-only mark or whose proxy refuses a set

**Files modified:** `packages/core/src/PortDefault.ts`, `packages/core/test/PortDefault.test.ts`, `spec/behaviors/25-inspection.md` (Rev 1.36), `spec/decisions/160-port-facts-are-read-from-the-description.md` (Rev 1.6), `spec/README.md` (Rev 1.206, CCR-QD-438 row), `apps/website/src/content/docs/docs/reference/upgrading.md`, `.changeset/port-default-is-a-mark.md`
**Commit:** a7d385c2 (shared with IN-01: both edit the same BEH-QD-571 paragraph and one revision bump, so they are one commit)
**Applied fix:** The `Object.isExtensible` pre-check plus `Object.assign` is replaced by a private `defineMark` predicate that calls `Reflect.defineProperty(shape, DEFAULT_OF, mark)` inside a `try`. A `false` answer (non-extensible object, refusing proxy trap) or a throwing trap falls back to the existing prototype-preserving copy. The mark descriptor comes from `Object.getOwnPropertyDescriptors({ [DEFAULT_OF]: port })` (no boolean literals, no cast; the predicate narrows the type). An extensible object that inherits a read-only mark now takes its own mark in place. New tests M11 (object inheriting a frozen marked default), M12 (proxy whose `defineProperty` trap returns false) and M13 (proxy whose trap throws) were red first (3 failed) and pass now; M9 and M10 are unchanged and green. BEH-QD-571, ADR-QD-160, the source comment, the 0.13 upgrade entry and the changeset now say "marked in place when the object accepts the property; otherwise copied". Status: fixed (the logic change is covered by M9-M13).

### IN-01: BEH-QD-571 calls marking a shared result "the same limit" as BEH-QD-572, but it leaks the mark to the host's other uses of that object

**Files modified:** `spec/behaviors/25-inspection.md`, `spec/README.md` (revision bump), `apps/website/src/content/docs/docs/reference/upgrading.md`
**Commit:** a7d385c2
**Applied fix:** The "same limit" sentence is replaced: the mark stays on the host's own object, so wherever the host also uses it, it reads as defaulted; return a fresh object (`d.make(...)`, a spread of `inner`) to keep it unmarked. ADR-QD-160 and the changeset never made the "same limit" claim; the upgrade entry gained one sentence saying the mark stays on an object also used elsewhere.

## Checks

- `pnpm exec vitest run --project core --project devtools`: 135 files, 3882 tests pass.
- `pnpm exec tsc -p tsconfig.test.json`, `pnpm typecheck`, `pnpm circular`, `pnpm test:tstyche` (598 assertions), `pnpm spec:verify:strict` (21 PASS, 0 FAIL), `node scripts/spec-revise.mjs --check`, `pnpm spec:examples`, `pnpm spec:website-examples`, `pnpm spec:api`: all pass.
- `pnpm lint`: house-style clean (521 files); only pre-existing warnings in untracked `.codex/` files.

## Mutation

`pnpm exec stryker run --mutate 'packages/core/src/PortDefault.ts,...PortDerivation.ts,...Ports.ts,...PortDescription.ts'`:

| File | Score | Survivors |
| ---- | ----- | --------- |
| `PortDefault.ts` | 85.71 | 2 (both equivalent, below) |
| `PortDerivation.ts` | 98.00 (49/50) | 1 (`173:45`, pre-existing `InvalidBoundedPermits({})`) |
| `PortDescription.ts` | 100 | 0 |
| `Ports.ts` | 100 | 0 |

## New-file survivors

- `packages/core/src/PortDefault.ts:38:11`, BlockStatement (`catch { return false; }` becomes `catch {}`). Equivalent: the empty catch makes `defineMark` return `undefined`, which is falsy, so `markDefault` takes the same copy branch. The `return false` literal itself is not separately mutated into a surviving mutant (`false` to `true` is killed by M13).
- `packages/core/src/PortDefault.ts:70:11`, BlockStatement (`ownMark`'s `catch { return undefined; }` becomes `catch {}`). Equivalent: an empty catch returns `undefined` as well. Carried over from iteration 2.

---

_Fixed: 2026-11-16T07:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
