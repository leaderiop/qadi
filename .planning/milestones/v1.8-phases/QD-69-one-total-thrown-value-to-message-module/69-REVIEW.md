---
phase: QD-69-one-total-thrown-value-to-message-module
reviewed: 2026-11-22T14:00:00Z
depth: standard
iteration: 2
files_reviewed: 45
files_reviewed_list:
  - packages/core/src/ThrownMessage.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/index.ts
  - packages/core/src/JsonHazard.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/PortKey.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/SinkCodec.ts
  - packages/devtools/src/model/Capture.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DiagnosticsStore.ts
  - packages/devtools/src/model/ExplorerSession.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/http/src/RemotePorts.ts
  - packages/react/src/DeveloperSignals.ts
  - packages/core/test/helpers.ts
  - packages/core/test/ThrownMessage.test.ts
  - packages/core/test/Evaluate.test.ts
  - packages/core/test/PortConformance.test.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortKey.test.ts
  - packages/core/test/PortWire.test.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/devtools/test/helpers.ts
  - packages/devtools/test/model/Capture.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DiagnosticsStore.test.ts
  - packages/devtools/test/model/ExplorerSession.test.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/http/test/PortRoutes.test.ts
  - packages/react/test/DeveloperSignals.test.ts
  - packages/react/test/support/hostile.ts
  - scripts/check-package-install.mjs
  - .changeset/core-thrown-message.md
  - .changeset/devtools-capture-thrown-message.md
  - .changeset/http-transport-failure-total.md
  - .changeset/react-reporter-line-total.md
  - spec/decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md
  - spec/behaviors/06-services.md
  - spec/behaviors/29-devtools-simulator.md
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
  necessity: 1
status: issues_found
---

# Phase QD-69: Code Review Report (iteration 2)

**Reviewed:** 2026-11-22
**Depth:** standard
**Files Reviewed:** 45
**Status:** issues_found

## Summary

Re-reviewed the phase after the nine iteration-1 fixes (`43766ff0..2d3894af`), with `69-CONTEXT.md` D-01..D-17 as the
locked decisions. WR-03's choice (a `null` cause renders as `"null"`, a field is absent only when `undefined`) was not
reopened and is not broken: `Capture.ts:185-190` implements it, `Capture.test.ts:560` pins it, and ADR-QD-182
decision 9, BEH-QD-685 and the changeset all state it.

The nine fixes check out against source.
- WR-01/WR-02: the issue-#100 comment at `Evaluate.test.ts:3963` is again directly above `describe("port defects become typed
  errors"` (line 3975). The shared `hostile`/`hostileError` pair lives once in `core/test/helpers.ts`,
  `devtools/test/helpers.ts` and `react/test/support/hostile.ts`; the react copy is justified in its own comment
  (a test folder is not a package boundary).
- WR-03, IN-01, IN-02, IN-03, IN-04, IN-06: each does what `69-REVIEW-FIX.iter2.md` says. `/usr/bin/grep` over
  `packages/*/src` finds exactly one `Cause.pretty(` call (`ThrownMessage.ts:55`), so ADR-QD-182 decision 4 and INV-QD-384
  hold. The remaining `instanceof Error` / `.message` / `String(...)` reads are the declared exemptions
  (`UntrustedDecode.decodeText`, `SimulationForm.parseJson`, `Source.thrownName`, the `String(cause)` sites) plus
  `DeveloperSignals.namedLine`, which guards itself. `GatesFeed.stated` calling `Cause.die(thrown)` outside a `try` is safe
  (`Cause.die` does not read the value).
- IN-05: the new exact-text assertions (`"Missing key\n  at [\"what\"]"`, `"Error: boom"` for a stackless error) are
  deterministic.
- The seven changed test files I ran (`ThrownMessage`, `PortDescription`, `PortConformance`, `Capture`, `GatesFeed`,
  `DeveloperSignals`, `PortRoutes`) pass: 360 tests. `node scripts/check-house-style.mjs` is clean (563 files).

What remains is one fix-introduced quality defect and three small items. No BLOCKER.

## Warnings

### WR-01: Capture.test.ts shadows the imported `hostile` with a different, redundant fixture

**File:** `packages/devtools/test/model/Capture.test.ts:609` (import at `:63`, shared use at `:627`)
**Issue:** The WR-02 fix added `import { hostile, hostileError } from "../helpers.ts"` to this file, but left the test "a
cause that cannot be stringified does not take the capture down" declaring its own `const hostile = { toString: () => { throw
... } }` inside the callback. Within that test the name `hostile` now means a one-armed object, and three tests lower it
means the shared two-armed one. A reader (or a later edit that reaches for the shared fixture in the first test) gets the wrong
value silently. The test is also subsumed: the next test ("a cause whose toString and message cannot be read is recorded as
broken with the placeholder", `:625`) feeds a value whose `toString` throws through the same `Broke`/placeholder
assertion, and `ThrownMessage.test.ts:77` already pins the toString-only row (`"an object whose toString throws is the
placeholder"`). Nothing is lost by deleting it.
**Fix:** Delete the test at `Capture.test.ts:607-623`. If a toString-only capture row is wanted, give the local value a
distinct name (`toStringOnly`) so it does not shadow the import.

## Info

### IN-01: PortConformance.test.ts: a test subsumed by the one added directly below it

**File:** `packages/core/test/PortConformance.test.ts:741-755`
**Issue:** "is a placeholder for a value that cannot be rendered" (a plain object whose `toString` throws) and the new "is the
placeholder for a cause whose toString and message cannot be read, never a throw" (`hostile`, whose `toString` also throws, plus
`hostileError`) assert the same placeholder through the same `reasonFor`. The first can no longer fail unless the second does.
**Fix:** Drop the first test, or fold it into the loop by adding its object to `[hostile, hostileError]`.

### IN-02: Capture's third read, "the error's own string message", has no instantiation and no pin

**File:** `packages/devtools/src/model/Capture.ts:185-190` (doc `:161-171`)
**Category:** necessity
**Issue:** The last arm, `thrownMessage(reason !== undefined ? reason : error)`, reads the error's own `message` when it has no
`cause` and no `reason`. Every error a port can raise (`AttributeResolveError`, `RelationshipResolveError`,
`DecisionHistoryUnavailable`, `SignatureHistoryUnavailable`, `CustomPredicateError`) is a `Schema.TaggedError` in
`packages/core/src/Errors.ts` that declares no `message`, so that read is `""` for all of them. `Capture.test.ts:541` confirms
`""` for the `cause: undefined` case, and no test can supply a non-empty own message because `PortReply.fail` builds the port's
own class. D-15 and BEH-QD-685 state the arm, so this is not a defect and is not for removal here; it is recorded because the
arm is unreachable with non-empty text today and unpinned. The same doc comment also says a failure with none of the three
"records the empty string", which is true for port errors and not for a non-`Error` value passed to `renderError` (it would
record `"[object Object]"`).
**Fix:** Either say in the `renderError` doc that the third read exists for a custom error class that sets its own `message`
(and note that no shipped port error does), or reduce the final arm to `reason !== undefined ? thrownMessage(reason) : ""`
when D-15 is next revisited. No code change is needed now.

### IN-03: spec/behaviors/05-evaluator.md still says a custom predicate defect renders with `Cause.pretty`

**File:** `spec/behaviors/05-evaluator.md:262-264`
**Issue:** "its `reason` renders the defect (`Cause.pretty`) the same way it already renders an unregistered name" is the same
claim iteration 1's IN-01 corrected in `PortDerivation.ts`, `PortDescription.ts` and `PortAccess.ts`, and `06-services.md`,
`28-devtools-screens.md` and `32-custom-predicates.md` were updated for. This one was missed. It is now half true: the rendering
is `causeMessage`, which is `Cause.pretty` only when that renders.
**Fix:** Replace "(`Cause.pretty`)" with "(`causeMessage`: its `Cause.pretty` text, else the died value's own text)" and add the
revision line the file's Document Control requires.

---

_Reviewed: 2026-11-22T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
