---
phase: QD-47-port-facts-read-from-the-description
reviewed: 2026-11-16T04:00:00Z
depth: standard
iteration: 2
files_reviewed: 27
files_reviewed_list:
  - .changeset/devtools-defaulted-from-core.md
  - .changeset/port-default-is-a-mark.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/core/src/PortDefault.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/Ports.ts
  - packages/core/test/PortDefault.test.ts
  - packages/core/test/PortDefault.tst.ts
  - packages/devtools/src/model/PortCalls.ts
  - packages/devtools/src/model/PortReading.ts
  - packages/devtools/src/model/Wiring.ts
  - packages/devtools/src/react/ServicesPanel.tsx
  - packages/devtools/test/model/Capture.test.ts
  - packages/devtools/test/model/WiringDefaulted.test.ts
  - packages/devtools/test/react/ServicesPanel.reading.test.tsx
  - packages/devtools/test/react/ServicesPanel.test.tsx
  - spec/README.md
  - spec/behaviors/25-inspection.md
  - spec/behaviors/28-devtools-screens.md
  - spec/behaviors/30-port-calls.md
  - spec/decisions/160-port-facts-are-read-from-the-description.md
  - spec/decisions/index.yaml
  - spec/devtools-spec/02-screens.md
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase QD-47: Code Review Report (iteration 2)

**Reviewed:** 2026-11-16T04:00:00Z
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Re-review after fix iteration 1 (commits b1ce4e15 to a2e6ffa1). `check-house-style.mjs` and `check-api-surface.mjs` pass,
`tsc -b packages/core packages/devtools` and `oxlint` on the touched files are clean, and 162 tests pass across
`PortDefault`, `PortsLayer`, `ServicesPanel`, `ServicesPanel.reading`, `WiringDefaulted` and `Capture`.

Iteration-1 findings:

- WR-01 (`stateOf` hides "defaulted" for an unnamed default): verified fixed. `stateOf` checks `defaulted === true` first and
  reads `defaulted — ${name ?? "unnamed"}`. Every other branch is unchanged: a non-present port, a non-defaulted named port and
  a non-defaulted unnamed port (`wired, unnamed`) produce the same strings as before, and a defaulted named port still reads
  `defaulted — <name>`. The new row renders the combination and compares the whole string. BEH-QD-215, devtools Screen 6 and
  the revisions say the same.
- WR-02 (totality of `isPortDefault`): verified fixed. The `try`/`catch` covers a throwing trap and a revoked proxy (M7b), and
  BEH-QD-571, INV-QD-339, ADR-QD-160 and the overview now agree.
- WR-03 (`markDefault` loses prototype methods): partly fixed. The prototype and own descriptors now survive, a getter stays a
  getter, a frozen shape copies without error, and `{ ...marked }` still carries the enumerable symbol mark (D-04), so W10 and
  M3 hold. One case the fix and its documentation claim is still broken, reported as WR-01 below.
- WR-04 (never-marked list pinned for one port): verified fixed. Per-port rows cover a scripted double, a replay and a remote
  asker, and M2b covers the two record fixtures that exist (`attributeResolverFromRecord`, `customPredicateFromRecord`;
  nothing else in `packages/core/src` or `packages/testing/src` is a fixture builder).
- IN-01 (forgery wording): verified fixed in the source comment, the test header, BEH-QD-572 and ADR-QD-160 Decision 2.
- IN-02 (`decoratePorts` marks by the slot): verified fixed in BEH-QD-571, ADR-QD-160, the 0.13 upgrade entry and the
  changeset, and pinned by W11.

Locked decisions D-04, D-08, D-17, D-18, D-19 and D-20 are not re-litigated. The mark descriptor is now `writable: true,
configurable: true` where the iteration-1 suggestion had `false`; that matches what a spread produces and nothing depends on
immutability, so it is not a finding.

## Warnings

### WR-01: `markDefault` still breaks a decorator result that has private or internal-slot state, and the docs say it keeps class instances

**File:** `packages/core/src/PortDefault.ts:24-33`; `spec/behaviors/25-inspection.md` (BEH-QD-571, "Marking copies the shape
with its prototype and its own descriptors, so a decorator that returns a class instance or a delegating object keeps the
methods it inherits")
**Issue:** The fix copies the shape with `Object.create(getPrototypeOf(shape), getOwnPropertyDescriptors(shape) + mark)`. That
is a new object, not the original, so any state that lives outside own properties is not carried: ES `#private` fields and
built-in internal slots (`Map`, `Set`, `Date`, a `Promise`-like) belong to the original instance. A decorator that returns an
instance of a class using `#private` state, the idiomatic way to write a class-based adapter, therefore fails once the slot
held the default. Verified in node: a class with `#x` and a method `resolve() { return this.#x }`, copied this way, throws
`TypeError: Cannot read private member #x from an object whose class did not declare it` when `resolve()` is called on the
copy. This happens only when `inner` is the default, so it passes every test with real adapters and surfaces in the library's
fail-closed wiring as a `TypeError` defect at evaluation, not a deny. That is the same failure mode WR-03 reported, only
narrowed from "any class instance" to "a class with private or internal-slot state". W10 uses `Object.create(inner)`, which
has no such state, and the source comment and BEH-QD-571 state the guarantee for "a class instance" without the limit.
**Fix:** Either make the claim true or state the limit. The smallest change is the limit: in the `markDefault` doc comment, in
BEH-QD-571 and in the 0.13 upgrade entry, say that the mark is set on a copy built from the result's prototype and own
properties, so a decorator must return an object whose methods do not depend on `#private` fields or internal slots (return a
plain record or a prototype-delegating object, as `d.make` does). To make it true, set the mark on a delegating wrapper that
keeps the original as `this`, which is more machinery; or have `decoratePorts` mark `f`'s result in place when it is
extensible and not shared with `inner`, falling back to the copy. Add a `decoratePorts` row whose decorator returns an
instance with a `#private` field around a default, red before and green after, or a documented-limit row asserting the
`TypeError`, so the limit is pinned either way.

---

_Reviewed: 2026-11-16T04:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
