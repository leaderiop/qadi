---
phase: QD-47-port-facts-read-from-the-description
fixed_at: 2026-11-16T03:00:00Z
review_path: .planning/phases/QD-47-port-facts-read-from-the-description/47-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 47: Code Review Fix Report

**Fixed at:** 2026-11-16T03:00:00Z
**Source review:** `.planning/phases/QD-47-port-facts-read-from-the-description/47-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (fix scope `all`: WR-01 to WR-04, IN-01, IN-02)
- Fixed: 6
- Skipped: 0

Each finding is one commit. WR-01 to WR-03 wrote a failing row first and ran it red before the fix. WR-04 and IN-02 add rows
that pin behaviour already true, so they could not be red. Verification ran in the main checkout (`workflow.use_worktrees` is
`false`), on branch `arch-wave-10`. A closing docs commit (`a2e6ffa1`) updates the CCR-QD-438 row in `spec/README.md` to the
new revisions. No new spec file was bumped beyond those the row already names.

## Fixed Issues

### WR-01: `stateOf` shows "wired, unnamed" for a defaulted port with no name, hiding "defaulted"

**Files modified:** `packages/devtools/src/react/ServicesPanel.tsx`, `packages/devtools/test/react/ServicesPanel.test.tsx`,
`spec/behaviors/28-devtools-screens.md`, `spec/devtools-spec/02-screens.md`
**Commit:** `b1ce4e15`
**Applied fix:** `stateOf` checks `defaulted` before the name, so a present, defaulted, unnamed port reads
`defaulted — unnamed`. Every other output is unchanged (the existing `ServicesPanel.reading.test.tsx` rows were not touched).
The new row in `ServicesPanel.test.tsx` was red (`wired, unnamed`) before the fix and compares the whole string. BEH-QD-215
(Rev 1.23) and the devtools Screen 6 sentence (Rev 0.20 draft) state the new reading.

### WR-02: "total over any value" is claimed as a MUST, but `isMarkedDefault` throws on a Proxy whose descriptor trap throws

**Files modified:** `packages/core/src/PortDefault.ts`, `packages/core/test/PortDefault.test.ts`,
`spec/behaviors/25-inspection.md`, `spec/decisions/160-port-facts-are-read-from-the-description.md`, `spec/invariants.md`
**Commit:** `80d56c5f`
**Applied fix:** `isMarkedDefault` wraps the own-descriptor read in `try`/`catch` and answers `false` on a throw. Row M7b
(a Proxy whose `getOwnPropertyDescriptor` trap throws, and a revoked proxy) was red with `Error: trap` before the fix. BEH-QD-571,
INV-QD-339 and the overview keep "total"; BEH-QD-571 names the throwing and revoked proxy, INV-QD-339's enforcement lists M7b,
and ADR-QD-160's accepted Proxy-throw consequence is replaced by "a throwing trap reads not defaulted".

### WR-03: `markDefault` rebuilds the shape with a spread, which loses a class-based shape's prototype methods

**Files modified:** `packages/core/src/PortDefault.ts`, `packages/core/test/PortDefault.test.ts`,
`spec/behaviors/25-inspection.md`
**Commit:** `829be12e`
**Applied fix:** `markDefault` now builds the copy with `Object.create(Object.getPrototypeOf(shape), { ...Object.getOwnPropertyDescriptors(shape), [DEFAULT_OF]: … })`,
so the prototype and getters survive. It needs no `as`: `Object.create` returns `any`, which is assignable to the declared
return type. The mark stays an own, enumerable, symbol-keyed property (M3's spread copy and M8's enumerability assertion
need `enumerable: true`; M8 passes unchanged and `Object.keys` and JSON are not affected, since symbols are never keys).
Row W10 (`decoratePorts` with a decorator returning `Object.create(inner)`, so the methods live on the prototype) was red
before the fix and now keeps `resolve` callable and the shape defaulted. `f` is generic over the port, so a literal class
instance cannot be written without a cast. The delegating-object form is the same prototype case. BEH-QD-571 states it.

### WR-04: BEH-QD-571's "MUST NOT carry the mark" list is pinned for one port and one kind of double

**Files modified:** `packages/core/test/PortDefault.test.ts`, `spec/behaviors/25-inspection.md`, `spec/traceability.md`
**Commit:** `78ca795b`
**Applied fix:** A `forEveryPort` row per port asserts that `scriptedPort(d, () => undefined)`, a replay
(`scriptedPort(d, replyTable(d, []))`) and `askRemotely(d, …)` read not defaulted. Row M2b covers the two record fixtures that
exist (`attributeResolverFromRecord`, `customPredicateFromRecord`). Every constructor BEH-QD-571 names exists, so the BEH
was not narrowed. BEH-QD-571's "Pinned by" and the traceability rows (INV-QD-339 and the `PortDefault.test.ts` file row) name the
new rows. These rows pass on the current code by design.

### IN-01: The "nobody outside core can forge the mark" claim overstates; the symbol is readable off any default

**Files modified:** `packages/core/src/PortDefault.ts`, `packages/core/test/PortDefault.test.ts`,
`spec/behaviors/25-inspection.md`, `spec/decisions/160-port-facts-are-read-from-the-description.md`
**Commit:** `eed4af9b`
**Applied fix:** The source comment, the test header, BEH-QD-571/572's limits list and ADR-QD-160 Decision 2 now say the key is
not exported and cannot be minted with `Symbol.for`, that it can be read off an existing default with
`Object.getOwnPropertySymbols`, so copying it is possible but deliberate, and that it labels a diagnostic and guards
nothing. The upgrade guide never made the claim.

### IN-02: `decoratePorts` stamps the mark on whatever `f` returns, so a decorator that replaces the shape still reads defaulted

**Files modified:** `packages/core/test/PortDefault.test.ts`, `spec/behaviors/25-inspection.md`,
`spec/decisions/160-port-facts-are-read-from-the-description.md`, `spec/traceability.md`,
`apps/website/src/content/docs/docs/reference/upgrading.md`, `.changeset/port-default-is-a-mark.md`
**Commit:** `48e1c2db`
**Applied fix:** Documentation only, behaviour unchanged (D-17). BEH-QD-571, ADR-QD-160's consequences, the 0.13 upgrade entry and
the `@qadi/core` changeset state that `decoratePorts` marks by the slot, not by what the decorator returns. Row W11 pins it:
a decorator that replaces a default with a differently named shape still reads defaulted.

## Skipped Issues

None.

## Verification

Run in the main checkout, not a worktree. See the summary returned with this report for the result of each command.

---

_Fixed: 2026-11-16T03:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
