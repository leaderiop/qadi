---
phase: QD-47-port-facts-read-from-the-description
reviewed: 2026-11-16T06:00:00Z
depth: standard
iteration: 3
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
  info: 1
  total: 2
status: issues_found
---

# Phase QD-47: Code Review Report (iteration 3)

**Reviewed:** 2026-11-16T06:00:00Z
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Re-review after fix iteration 2 (commits `47de9c93`, `1b14f0b1`). `pnpm exec vitest run --project core packages/core/test/PortDefault.test.ts`
passes (43 tests).

Iteration-2 findings:

- WR-01 (`markDefault` breaks a decorator result with private or internal-slot state): verified fixed. An extensible shape is
  marked in place with `Object.assign` and returned as the same object, so `#private` fields, internal slots and prototype
  methods keep working (M9 pins identity and a working `#private` method). A non-extensible shape is copied with its prototype
  and descriptors (M10). BEH-QD-571, ADR-QD-160 Consequences, the 0.13 upgrade entry, the changeset and the source comment all
  state the same two branches and the same limit (a copy loses state outside own properties), and the shared-result case. One
  sentence in BEH-QD-571 is inexact, see IN-01. The in-place branch introduced a new failure, see WR-01 below.
- MUT-01 (PortDefault.ts mutation score): verified fixed. `ownMark` narrows the `try` to the one throwing call
  (`Object.getOwnPropertyDescriptor`), the `?.value === port` comparison sits outside it, and `isMarkedDefault` is total over
  `null`, `undefined`, primitives and a hostile or revoked proxy. The remaining `catch {}` survivor is equivalent, as the fix
  report says.

Task 2 (in-place marking, per call site). `nonePort`, `wrapPort` and `boundedPort` mark the result of `d.make(...)`, which is a
fresh object literal in every description (`make: (name, call) => ({ name, resolve: call })` and the sibling ports), so no
shared object is mutated. `Capture.ts`'s `capturing`, the only `decoratePorts` caller in `packages/*/src`, also returns
`d.make(...)`. `carryDefault` marks only when `inner` is the default, so a real adapter in `inner` is never marked and
behaves as before. An identity decorator (returns `inner`) re-assigns the same value on an already marked object, a no-op. No
evaluation path reads the mark. What remains is the throw in WR-01 and the shared-result leak in IN-01.

Locked decisions D-04, D-08, D-17, D-18, D-19 and D-20 are not re-litigated.

## Warnings

### WR-01: `markDefault`'s in-place `Object.assign` throws for an extensible result whose prototype has a read-only mark or whose proxy refuses a set

**File:** `packages/core/src/PortDefault.ts:38-39`
**Issue:** `Object.isExtensible(shape) ? Object.assign(shape, { [DEFAULT_OF]: port }) : <copy>` assumes that an extensible
object can take the property. `Object.assign` uses `[[Set]]`, which is stricter than extensibility, and throws a `TypeError`
(strict mode) in two extensible cases, both verified in node with the same expression:

- The result delegates to a frozen or otherwise read-only marked default: `Object.create(Object.freeze(markedDefault))`.
  `[[Set]]` finds the non-writable inherited mark and refuses, so assignment throws `Cannot assign to read only property
  'Symbol(k)'`. A defineProperty-based mark would succeed here. The iteration-1 copy built with `Object.create(proto, descriptors)`
  handled this case.
- The result is a Proxy whose `set` or `defineProperty` trap returns falsish (a read-only or membrane proxy around the
  adapter, or a trap that forgets `return true`): `'set' on proxy: trap returned falsish for property 'Symbol(k)'`.

In `decoratePorts` the throw happens inside the `Effect.map` callback of `Layer.build`, so it surfaces as a defect while the
layer is built, in a path that must fail closed, and only when the slot held a default, so every test with a real adapter
passes. Both cases are narrow, and the previous copy-based version did not have them, so this is a regression from fixing
the earlier WR-01.
**Fix:** Define the property instead of assigning it, and treat a refusal as "not extensible enough", falling back to the
copy. This also replaces the `isExtensible` pre-check:

```ts
const mark = Object.getOwnPropertyDescriptors({ [DEFAULT_OF]: port });
// Reflect.defineProperty returns false on a non-extensible object or a refusing proxy trap, and ignores an inherited read-only mark.
return Reflect.defineProperty(shape, DEFAULT_OF, mark[DEFAULT_OF]!) ? shape : Object.create(Object.getPrototypeOf(shape), { ...Object.getOwnPropertyDescriptors(shape), ...mark });
```

(avoid the non-null assertion the house rules forbid, for example by destructuring the descriptor from a literal). Add rows
to `PortDefault.test.ts`: `markDefault` on `Object.create(Object.freeze(markedShape))` marks the child and does not throw, and
on `new Proxy({}, { defineProperty: () => false })` returns a marked copy.

## Info

### IN-01: BEH-QD-571 calls marking a shared result "the same limit" as BEH-QD-572, but it leaks the mark to the host's other uses of that object

**File:** `spec/behaviors/25-inspection.md:645-650`
**Issue:** The paragraph says that an in-place mark on an object the host shares "is the same 'built from the default's shape'
limit BEH-QD-572 states for a hand-written wrapper". It is not the same limit. BEH-QD-572 is about which wrapper reads as a
default. Marking the host's own object in place makes that object read as defaulted everywhere it appears afterwards, including
a slot or another layer (a test suite reusing one adapter constant across tests, in test order) where it is wired as a real
adapter and `wiringReport` then shows `defaulted`. The earlier copy never touched the host's object. The disclosure that a shared
object "is marked too" is correct and present in BEH-QD-571, ADR-QD-160, the upgrade entry and the changeset; only the
"same limit" comparison understates it. The label affects no decision, so this is a documentation accuracy item, not a
behaviour defect, and the in-place choice itself is a decided trade-off.
**Fix:** Replace the last sentence of that paragraph with a statement of the actual effect, for example: "The mark stays on
that object, so wherever the host also uses it, it reads as defaulted; return a fresh object (`d.make(...)`, a spread of
`inner`) to keep the host's own object unmarked." Bump the file's revision per house rules.

---

_Reviewed: 2026-11-16T06:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
