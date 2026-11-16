---
phase: QD-47-port-facts-read-from-the-description
fixed_at: 2026-11-16T05:00:00Z
review_path: .planning/phases/QD-47-port-facts-read-from-the-description/47-REVIEW.md
iteration: 2
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 47: Code Review Fix Report

**Fixed at:** 2026-11-16T05:00:00Z
**Source review:** `.planning/phases/QD-47-port-facts-read-from-the-description/47-REVIEW.md`
**Iteration:** 2

**Summary:**
- Findings in scope: 2 (WR-01 from the review, and MUT-01, a mutation regression the orchestrator measured after iteration 1)
- Fixed: 2
- Skipped: 0

Each finding is one commit. Verification ran in the main checkout (`workflow.use_worktrees` is `false`), on branch `arch-wave-10`.
The CCR-QD-438 row in `spec/README.md` was updated inside the WR-01 commit (BEH-QD-571's file Rev 1.35, ADR-QD-160 Rev 1.5,
README Rev 1.205).

## Fixed Issues

### WR-01: `markDefault` still breaks a decorator result that has private or internal-slot state, and the docs say it keeps class instances

**Files modified:** `packages/core/src/PortDefault.ts`, `packages/core/test/PortDefault.test.ts`,
`spec/behaviors/25-inspection.md`, `spec/decisions/160-port-facts-are-read-from-the-description.md`, `spec/README.md`,
`.changeset/port-default-is-a-mark.md`, `apps/website/src/content/docs/docs/reference/upgrading.md`
**Commit:** `47de9c93`
**Applied fix:** `markDefault` marks an extensible shape in place with `Object.assign(shape, { [DEFAULT_OF]: port })` and returns
the same object, so `#private` fields, internal slots and prototype methods keep working. Only a non-extensible shape is
copied, with its prototype and own descriptors, and the mark's descriptor now comes from
`Object.getOwnPropertyDescriptors({ [DEFAULT_OF]: port })` (no boolean literals). The remaining limit is stated in the source
comment, BEH-QD-571 (Rev 1.35), ADR-QD-160 (Rev 1.5), the 0.13 upgrade entry and the changeset: a non-extensible result with
private or internal-slot state is copied and loses that state, so the decorator returns an extensible object. The IN-02 text
also says `decoratePorts` marks an extensible result in place, so an object the host shares is marked too. The "a class instance
keeps its methods" claim is corrected.
Tests: M9 (an extensible instance with a `#private` field is returned as the same object, its method works, it reads
defaulted) was red before the fix (`marked !== holder`) and is green after. M10 (a frozen shape is copied, keeps its prototype
and methods, reads defaulted, the original stays unmarked) pins behaviour that was already true, so it could not be red.
A `decoratePorts` row (b) was tried and dropped: `f` is generic over the port, so returning a class instance from it does not
type-check without a cast, and the house rules forbid one. M9 covers the in-place marking directly, and `carryDefault` calls
`markDefault` unchanged.
**Status note:** a logic change; the design was chosen by the orchestrator, so it is worth a human read of the in-place
mutation (the only new behaviour is that a result `f` shares with the host is now marked itself).

### MUT-01: PortDefault.ts mutation score fell after iteration 1

**Files modified:** `packages/core/src/PortDefault.ts`, `packages/core/test/PortDefault.test.ts`
**Commit:** `1b14f0b1`
**Applied fix:** The `typeof service !== "object" || service === null` guard in `isMarkedDefault` is deleted (the `try` already
answers false for null, undefined and a hostile proxy, and a primitive has no own mark). The `try` is narrowed to the one
throwing call, in a package-private `ownMark(service)` helper that returns the descriptor or `undefined`; the `?.value === port`
comparison now sits outside it, so dropping `?.` throws uncaught on an unmarked object and M1/M2 kill it. The three
`enumerable/writable/configurable: true` mutants went with the WR-01 rewrite. A new per-port row (`forEveryPort`) pins that a
hand-written `{ ...default }` reads defaulted (D-04), which also pins the mark's enumerability.

Stryker (`--mutate` PortDefault.ts, PortDerivation.ts, Ports.ts, PortDescription.ts), run after both commits' content was in place:

| File | Score | Killed / total |
| ---- | ----- | -------------- |
| `PortDefault.ts` | 90.00 | 9 / 10 |
| `PortDerivation.ts` | 98.00 | 49 / 50 (the pre-existing `{ permits }` survivor) |
| `PortDescription.ts` | 100.00 | 16 / 16 |
| `Ports.ts` | 100.00 | 16 / 16 |

## New-file survivors

- `packages/core/src/PortDefault.ts:49:11`, BlockStatement (`} catch { return undefined; }` becomes `} catch {}`). Equivalent:
  an empty `catch` falls off the end of the helper and returns `undefined`, the same value the body returns, so no test can
  observe the difference. Dropping the `return` instead would leave a code path with no return (`noImplicitReturns`).

## Checks

All passed, run in the main checkout: `pnpm exec vitest run --project core --project devtools` (135 files, 3879 tests),
`pnpm exec tsc -p tsconfig.test.json`, `pnpm typecheck`, `pnpm lint`, `pnpm circular`, `pnpm test:tstyche`,
`pnpm spec:verify:strict`, `node scripts/spec-revise.mjs --check`, `pnpm spec:examples`, `pnpm spec:website-examples`,
`pnpm spec:api`.

---

_Fixed: 2026-11-16T05:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
