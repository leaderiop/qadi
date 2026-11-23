---
phase: QD-73-one-pure-reconcile-for-gate-registration
reviewed: 2026-11-23T03:00:00Z
depth: standard
iteration: 3
files_reviewed: 32
files_reviewed_list:
  - packages/react/src/GateWriter.ts
  - packages/react/src/useGate.ts
  - packages/react/test/GateWriter.reconcile.test.ts
  - packages/react/test/GateWriter.reconcile.tst.ts
  - packages/react/test/GateWriter.test.tsx
  - packages/react/test/GateRegistry.test.tsx
  - packages/react/test/GateRegistry.store.test.ts
  - packages/react/test/hooks.rerender.test.tsx
  - packages/react/test/GateRegistration.characterisation.test.tsx
  - packages/react/test/support/gates.ts
  - packages/react/test/support/trees.tsx
  - spec/decisions/186-gate-registration-is-one-keyed-reconcile.md
  - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md
  - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
  - spec/decisions/103-a-question-is-opened-once.md
  - spec/decisions/index.yaml
  - spec/behaviors/09-react.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
  necessity: 1
status: issues_found
---

# Phase QD-73: Code Review Report (iteration 3)

**Reviewed:** 2026-11-23
**Depth:** standard
**Files Reviewed:** 20 distinct files (the 11 `packages/react` files and the 9 spec files of the phase's diff)
**Status:** issues_found

## Summary

Read in full: `GateWriter.ts`, `useGate.ts`, every phase test file and both support modules, ADR-QD-186 and the
amendments to 140, 111 and 103, BEH-QD-701..705, INV-QD-391/392, the traceability rows and the CCR-QD-465 row. Checked
against source rather than against the fix report. The iteration-2 fixes are correct and complete, and no source defect
or house-rule breach remains.

Verified:

- **The writer contract.** It is stated once on `GateWriter` (`GateWriter.ts:104-112`). `reconcile`'s doc comment relies
  on it in one sentence (`:327-329`). ADR-QD-186 decision 6, ADR-QD-140's amendment item 2, BEH-QD-702, INV-QD-391 and
  the CCR row say the same thing in the same terms.
- **The reasons in `buildGateRegistry`'s doc comment (`:176-180`) are true.** `register`, `update` and `unregister` are
  synchronous `Map`/`Set` writes. `changed` wraps every listener in `try` (`:201-207`). The default reporter resolves to
  `say`, one `console.warn` (`DeveloperSignals.ts:220`, `defaultOf`), and a supplied one goes through `contain`
  (`:234-243`, `reporterFor` `:503-508`). `ReporterThrew` speaks everywhere with the same `say`. The `makeQadiAtoms` and
  `makeGateRegistry` call sites (`QadiAtoms.ts:251`, `GateRegistry.ts:58`) both resolve through `reporterFor`.
- **ADR-QD-177's claim holds.** Its Consequences say "`@qadi/react`'s own gate registry, which swallows a listener's
  throw, is not changed" (`177-*.md:72`).
- **Every part of the contract is pinned by a test that exists verbatim.** `GateRegistry.store.test.ts` has the
  throwing-subscriber test (`:90-105`) and four throwing-reporter tests (`:292-322`) through `makeGateRegistry` and
  `makeQadiAtoms`. Each registers the colliding id after the reporter threw and lists both ids, so a `register` that threw
  would fail the test.
- **Idempotence, rollback, `AggregateError`, "made" and a dead `live` entry are gone** from code, tests and spec. The
  only mentions left are ADR-QD-186's rejected alternatives (see IN-04) and the pin on the absent name `GateCurrent`.
  `fakeWriter` has no throwing mode. There is no `onCaught` and no unused import (oxlint reports none in the phase's
  files; `check-house-style` is clean).
- **The single-ref statement is identical** in the `useGate.ts` doc comment, INV-QD-392 and the CCR row: one ref,
  `registered`, holding its registrations and nothing beyond them. The statement that review alone keeps the second half
  is the same in all three. The tests it names exist.
- **Helper moves.** `listenTo`, `notificationsOf`, `newCanRead` and `newCanWrite` are defined once. No inline
  subscribe-and-count copy is left in `packages/react/test`. There is no module-scope state. The moved-onto files keep
  their expected values (`GateRegistry.store.test.ts`, `hooks.rerender.test.tsx`, `GateWriter.test.tsx`, apart from the
  intended additions).
- **`edges.test.tsx` is byte-identical to `1dbaf1a9`.**
- **The removed reconcile tests.** `reconciling the same input twice keeps every entry and calls only update` pins the
  removed unchanged-state test's rule for two entries, with the kept objects asserted. `keeps the entry when only the
  policy or the resource changed` pins each field alone, which is at least the removed test's precision.
- **The replaced type pin.** `not.toHaveProperty("id")` holds under both tstyche passes (I ran
  `scripts/run-tstyche.mjs` on the file: 5 tests, 7 assertions, 3 suppressed, passing in both). It fails if `id` becomes
  a property of `GateIdentity`, required or optional.
- **Spec test titles.** Every title quoted in a Pinned-by or Enforcement line of BEH-QD-701..705 and INV-QD-391/392
  exists verbatim in the file it is quoted against (scripted check, no misses).
- **The CCR-QD-465 row.** Every cited revision equals the header of its document (ADR-QD-186 1.4, ADR-QD-140 1.4,
  ADR-QD-111 1.2, ADR-QD-103 1.5, BEH 3.16, INV 1.186, traceability 1.259, README 1.312, overview 1.132). Its file list
  equals the 20 files of `git diff --name-only 1dbaf1a9 HEAD` outside `.planning/`.
- **Spec gates.** `verify-traceability.sh --strict` passes (21 PASS), `spec-revise.mjs --check` passes, and no added
  line in `packages/` exceeds 90 characters.

What remains is one necessity finding and four small wording and consistency items.

## Warnings

### WR-01: Necessity: `guardTrees`, `listed` and `snapshotOf` sit in shared support with one consumer each, under a header that says every file shares them

**Category:** necessity
**File:** `packages/react/test/support/trees.tsx:1-7`, `:67-97`, `:112-129`
**Issue:** The header says "the registry tests and the registration characterisation ask the same questions ... so
those fixtures and trees are written once here and every file that renders a guard shares them." That holds for the
fixtures, `atoms`, `providerTree` and `Group`, which both `GateRegistry.test.tsx` and
`GateRegistration.characterisation.test.tsx` import. It does not hold for three exports:

- `guardTrees` (with `GuardTrees`), imported only by `GateRegistry.test.tsx` (`trees = guardTrees()`, `mount =
  trees.mount`, `gateInstances = trees.instances`).
- `listed`, imported only by `GateRegistry.test.tsx`.
- `snapshotOf`, imported only by the characterisation.

This is the shape iteration 2 WR-01 removed for `Boundary`: a helper moved into shared support for a second user that
does not exist. `guardTrees` also replaces the three local lines it came from (`let current`, `mount`, a gate-instance
read) with a factory, an interface and three aliases for one file. `73-CONTEXT.md` leaves "the characterisation's helper
layout" to discretion, so nothing locks this. The header is also misleading as written.

**Fix:** Keep in `trees.tsx` only what two files import (fixtures, `atoms`, `TreeOptions`, `providerTree`, `Group`).
Move `snapshotOf` into the characterisation, and `guardTrees`/`listed` back into `GateRegistry.test.tsx` as its own
`current`/`mount`/`listed`, restoring that file's phase-base shape where possible. Each edit to the characterisation is
its own commit, per its header. If the owner prefers the helpers shared, reword the header to name what is actually
shared.

## Info

### IN-01: A comment in the type pins says "any more" and "the one it had"

**File:** `packages/react/test/GateWriter.reconcile.tst.ts:30`
**Issue:** `// The registry takes no index-aligned type any more, so naming the one it had is refused.` describes the
code by what it replaced, which is phase-relative wording that a reader meeting the file later cannot place. The pin
itself is a pin on the absent name `GateCurrent`, and the header and INV-QD-391 already say so.
**Fix:** `// No index-aligned type is exported: naming GateCurrent is refused. A pin on that name alone.` The next line
can go, because it repeats the sentence.

### IN-02: `useGateRegistrations` doc comment says "tells what it keeps its state"

**File:** `packages/react/src/useGate.ts:89-90`
**Issue:** "`reconcile` registers what is new, unregisters what is gone or changed, and tells what it keeps its state"
parses as a dropped object and is easy to misread. What it means is that each kept handle is told its state. The
sentence also runs a second claim into the same sentence ("an unchanged identity and an unchanged state make no
notifying call").
**Fix:** "... and tells each kept handle its state: an unchanged identity and an unchanged state make no notifying
call, because the handle decides equality."

### IN-03: The characterisation header prescribes a commit process, and `GateWriter.reconcile.test.ts`'s header has a grammar slip

**File:** `packages/react/test/GateRegistration.characterisation.test.tsx:11-13`, `packages/react/test/GateWriter.reconcile.test.ts:4-5`
**Issue:** The first header ends "an edit to this file may touch titles, layout or helpers only, and each such edit is
its own commit." That is a rule for the phase's commits and not a fact about the file. It would also forbid a row change
when BEH-QD-703..705 change, which the spec process (§11) requires. The second header reads "`live: ... ` and `wanted:
...` is keyed by gate id", which makes a plural subject singular and, taken literally, says `live` is keyed too (it is,
but only `wanted` is the point).
**Fix:** End the first header after "stated without rendering in `GateWriter.reconcile.test.ts`", and move "fixed
inputs" to the one fact: the rows are the behaviour the spec pins, so a change to one is a change to a BEH. In the
second, say "`wanted` is keyed by gate id".

### IN-04: Two spec details name a thing the reader cannot find

**File:** `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md:125-128`, `spec/traceability.md` (the INV-QD-391 row)
**Issue:** (a) The last Alternatives bullet rejects "A rollback, and a count rule for the throws, inside `reconcile`".
Nothing else in the ADR says what the count rule was, so it is a reference to a design the document never states. The
rollback half is explained by decision 6. (b) The traceability row for INV-QD-391 lists
`GateRegistration.characterisation.test.tsx` among its tests, but INV-QD-391's Enforcement cites no test in that file;
only the ADR's "What enforces it" cites it, for behaviour preserved.
**Fix:** (a) Say what it was ("a rule counting how many of the step's writes threw and reporting them together") or drop
the phrase and keep "a rollback". (b) Remove the characterisation from the INV-QD-391 row, or cite its relevant titles
in INV-QD-391's Enforcement, so the row and the invariant agree.

---

_Reviewed: 2026-11-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
