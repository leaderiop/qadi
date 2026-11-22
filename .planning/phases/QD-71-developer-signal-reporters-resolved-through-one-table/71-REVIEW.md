---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
reviewed: 2026-11-22T18:10:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - packages/react/src/DeveloperSignals.ts
  - packages/react/src/GateWriter.ts
  - packages/react/src/GateRegistry.ts
  - packages/react/src/QadiAtoms.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/test/DeveloperSignalReporters.test.tsx
  - packages/react/test/DeveloperSignals.test.ts
  - packages/react/test/DeveloperSignals.tst.ts
  - packages/react/test/GateRegistry.store.test.ts
  - scripts/check-house-style.mjs
  - AGENTS.md
  - .changeset/react-reporter-option-names.md
  - spec/decisions/184-developer-signal-reporters-are-resolved-through-one-table.md
  - spec/decisions/041-a-mismatch-is-announced.md
  - spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md
  - spec/invariants.md
  - spec/behaviors/09-react.md
  - spec/behaviors/19-hydration.md
  - spec/behaviors/28-devtools-screens.md
  - spec/process/house-rules-evidence.md
  - spec/traceability.md
  - spec/README.md
  - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-CONTEXT.md
findings:
  critical: 0
  warning: 7
  info: 6
  total: 13
  necessity: 1
status: issues_found
---

# Phase QD-71: Code Review Report

**Reviewed:** 2026-11-22T18:10:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

The refactor is sound. I found no behavioural defect in the source. I ran `node scripts/check-house-style.mjs` (clean) and vitest on `DeveloperSignals.test.ts`, `DeveloperSignalReporters.test.tsx` and `GateRegistry.store.test.ts` (104 passed). I did not run tstyche, oxlint or mutation. The type guarantees were checked by reading the declarations, not by gutting them.

The compile-time claims hold as stated:
- A missing row fails through the mapped `SignalTable` (TS2741).
- A row for no signal fails the excess-property check on the `satisfies` literal.
- A second once-per-process row fails through `OftenOf`.
- A foreign entry point fails through `NoInfer<Entry>`.
- Another row's reporter fails through `A extends Told`, where `Told` differs.

That last point has a limit. The four provider rows and `ReporterThrew` all have `Told = DeveloperSignal` (`says: say`), so a reporter written for one of those rows is accepted by any of the others. The entry-point strings and option names are also free strings, not tied to the real option property names. Behavioural tests cover that instead, and ADR-QD-184 admits part of it.

`GateWriter.ts` is correct:
- `update` reads the `current` entry the handle wrote. Equivalence with the old `entries.get(key)` holds: a handle is dead after `unregister`, and a disambiguated key is unique per registration.
- `snapshot` is `undefined` while stale. `changed()` clears it before the fan-out, so a listener that reads re-builds it. There is no lost update and no stale snapshot.
- Subscribe and unsubscribe are unchanged, and the code reads naturally. It does not look written for a mutation tool.

The three orchestrator suspicions:
- **(a) Partly confirmed.** An indented module-scope declaration slips past `MODULE_STATE_BUDGET`; see WR-04. `export let` and `export var` are caught: the regex has an optional `export\s+`.
- **(b) Confirmed.** See WR-03.
- **(c) Refuted.** ADR-QD-182, 183, 170, 172 and 177 all cite INV and BEH ids as plain text in `## Related` and link only ADRs. ADR-QD-184 follows that convention.

Item 4: every test title quoted in the INV-QD-387, BEH-QD-691 to 695 and INV-QD-388 Enforcement lines exists verbatim in the named file.

The phase's "written once" goal holds for containment (`contain`) and for the latch (`once`). It does not hold for the environment gate; see WR-01.

## Warnings

### WR-01: The environment gate for `InstrumentedInProduction` is written twice, and the row's `Production` condition is unobservable

**File:** `packages/react/src/QadiProvider.tsx:266` and `packages/react/src/DeveloperSignals.ts:395-397`
**Issue:** The phase goal is that the environment gate is written once, in the row. `InstrumentedInProduction` states it twice. The provider only raises the signal under `instrument && !isDevelopment()`, and the row also says `speaks: "Production"`. In development the provider never raises the signal, so `defaultOf`'s "not here" branch for a `Production` row is unreachable through any entry point.

The only thing pinning that row's `speaks` is the table-literal comparison, which compares the table with a copy of itself. No behavioural test calls the default in development and expects silence. Changing the row to `Everywhere` would survive every behavioural test. `isDevelopment` stays exported for this one caller.

D-02 locks `Production` as a row value, so the row stays. The duplication is the provider's own gate.

**Fix:** Keep one gate. One option is for `DeveloperSignals.ts` to export a predicate over the row, for example `raisesNow = () => speaksHere(SIGNALS.InstrumentedInProduction.speaks)`. The provider then reads that instead of `isDevelopment()`, and `isDevelopment` can be un-exported. Whichever way, add a test that calls `providerSignalReporter(undefined)(providerSignals.instrumentedInProduction())` in development and expects `[]`. That test fails if the row's condition is wrong.

### WR-02: INV-QD-064's Source (and its traceability row) still locate the registry closure in `GateRegistry.ts`

**File:** `spec/invariants.md:2759-2763` and `spec/traceability.md:240`
**Issue:** INV-QD-064's Source reads "`GateRegistry.ts` (`makeGateRegistry`: every piece of state is inside the closure, a colliding id is disambiguated, and `register`'s handle closes over its own key ...)". All of that now lives in `buildGateRegistry` in `GateWriter.ts`. `makeGateRegistry` is a one-line forward, and `QadiAtoms.ts` builds its registry with `buildGateRegistry` directly. INV-QD-387's Source names `buildGateRegistry`, but INV-QD-064 does not. Traceability row 240 repeats "`makeGateRegistry`'s state is closure-local".
**Fix:** Point INV-QD-064's Source at `buildGateRegistry` in `GateWriter.ts` and say that `makeGateRegistry` and `QadiAtoms` both build through it. Update the traceability row to match, and bump the revisions.

### WR-03: INV-QD-251 and its traceability row still say "every resolver ... wraps a supplied hook once", and list one reporter option too few

**File:** `spec/invariants.md:3562`, `spec/invariants.md:3566` and `spec/traceability.md:142`
**Issue:** There is now one resolver, `reporterFor`. INV-QD-251's Source reads "every resolver wraps a supplied reporter once (`contain`)". Its Enforcement reads "every resolver, a non-`Error` throw ...". Traceability row 142 reads "every resolver in `DeveloperSignals.ts` wraps a supplied hook once". BEH-QD-230 and ADR-QD-041 were amended for this; INV-QD-251 was not. The invariant's list of reporters ("`onDropped` ..., `onHydrationMismatch`, `onGateIdCollision` and `onDeveloperSignal`") also omits `onIdCollision`. This phase made that option a first-class `ReporterName`, with its own announcement and its own BEH-QD-692.
**Fix:** In all three places, say that `reporterFor` wraps a supplied reporter once, in `contain`. Add `onIdCollision` to the list. Change "every resolver" in the Enforcement to "every entry point of every row".

### WR-04: `MODULE_STATE_BUDGET` reads module scope as column 0, but AGENTS.md section 6 and the script's own prose state it unqualified

**File:** `scripts/check-house-style.mjs:703` and `scripts/check-house-style.mjs:1305`, `AGENTS.md:567-572`
**Issue:** The scan is `^(?:export\s+)?(?:let|var)\s` on a comment- and string-stripped line. The checks against the code:
- **Caught.** `let`, `var`, `export let` and `export var` at column 0.
- **Missed.** Any indented module-scope declaration, for example inside a top-level block. Fail-loud for formatted code, but `oxfmt` is explicitly not a gate (AGENTS section 17), so "every formatted library file keeps" column 0 is not enforced.
- **Miscounted.** `let a = 0, b = 0;` is one match for two bindings, so an exact-count budget can pass while state grows.
- **Not counted at all.** `static` mutable class fields, and a module-scope `const` holding a mutable container. The ADR rejects counting `const` deliberately; see the next paragraph.

ADR-QD-184's Consequences states the column-0 limit. AGENTS.md section 6 ("A `let` or `var` at module scope in `packages/*/src` ... is counted per file") and the script's block comment do not. They claim more than the gate enforces.

**Fix:** Count scope-aware, using the TypeScript compiler API the repo already depends on:
```js
const ts = await import("typescript");
const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true);
let n = 0;
for (const s of sf.statements) {
  if (ts.isVariableStatement(s) && !(s.declarationList.flags & ts.NodeFlags.Const)) {
    n += s.declarationList.declarations.length;
  }
}
```
This counts bindings and ignores indentation. If the regex stays, add the column-0 qualification to AGENTS.md section 6 and the script header.

### WR-05: INV-QD-388 states more than the gate or the code supports, and contradicts itself

**File:** `spec/invariants.md` (INV-QD-388 Implication, around line 4448)
**Issue:** The Implication says "no tenant's or render's state is shared through a module binding, so two atom sets, two providers or two requests in one process cannot see each other through the library". The next sentence says the line is printed once however many providers mount. That is exactly two providers seeing each other through the library. The title and body say "exactly one module-scope `let` or `var`" without the column-0 qualification that WR-04 describes. Module-scope shared state also exists as `const`: `Policy.ts` `depthMemo` (a `WeakMap`), and every `Metric.counter`, which the audit and core sources call "module scope, like every `qadi_*` metric". ADR-QD-184 acknowledges the first and rejects counting it.
**Fix:** Scope the claim to what is enforced: "the one module-scope `let`/`var` at the start of a line in `packages/*/src`". Drop "cannot see each other through the library", or restate it as "no tenant data is held in it". Keep the sentence that already says the latch is process-wide on purpose.

### WR-06: Test, ADR and spec claim the characterisation was "never edited" and name the phase's own history

**File:** `packages/react/test/DeveloperSignalReporters.test.tsx:4`, `spec/decisions/184-developer-signal-reporters-are-resolved-through-one-table.md` (Consequences), `spec/invariants.md` (INV-QD-387 Enforcement), `spec/traceability.md:650`
**Issue:** Shipped files say the test was "Written against the resolvers in `DeveloperSignals.ts` before they read one table, and never edited after". ADR-QD-184 says "not edited since". INV-QD-387 and traceability row 650 say "written against the code before the table existed". These are phase-relative: "before they read one table" and "before this decision" name a state of the repository that no longer exists once the phase has merged. "Never edited after" is false the first time anyone legitimately extends the file. ADR-QD-183 already hit this: its BEH-QD-688 change history reads "unchanged, not unedited". Only one commit touches the file today (`7d565d81`), so it is true now and will rot.
**Fix:** Say what the file is: "Pins every reporter through its public entry point; its expected values do not depend on how the resolvers are built." Put the history in the ADR's Context, where it belongs. In the spec, say "unchanged by ARCH-118", not "not edited since".

### WR-07: Three tests per environment share one title, and the titles do not say which signal they feed

**File:** `packages/react/test/DeveloperSignals.test.ts:446-447`
**Issue:** The generated title is `` `${entry}'s ${option}: the throw does not propagate and ReporterThrew names the hook and the error only` ``. `InstrumentedInProduction`, `AtomsReplaced` and `UnwritableGateRegistry` all have `entry: "QadiProvider"` and `option: "onDeveloperSignal"`. That gives three tests with an identical title in each environment. A failure does not say which row broke, and a runner that selects by title cannot target one. The title omits the input that distinguishes them: `row`, which is already in `EntryPoint`.
**Fix:** Build the title from the row too, for example `` `${row} through ${entry}'s ${option}: ...` ``.

## Info

### IN-01: `isDevelopment`'s doc comment describes a mechanism that no longer exists

**File:** `packages/react/src/DeveloperSignals.ts:66-78`
**Issue:** The comment says "Whether to warn by default" and that a production build "folds this to `false` and eliminates the `console.warn` below with it". `isDevelopment` is now read at runtime by `speaksHere` and by `QadiProvider`, and `SIGNALS` holds `says` closures that reference `say` and its sentence table. Nothing is eliminated by folding `isDevelopment`, and the `console.warn` is not "below" it in any dead-code sense. The comment predates the phase, but the phase made it untrue.
**Fix:** Keep the `define`-substitution reasoning for the literal `process.env.NODE_ENV` text. Drop the elimination claim, or state that the sentences stay in the bundle.

### IN-02: `defaultOf`'s first overload is a trusted promise; `speaksHere` is cryptic

**File:** `packages/react/src/DeveloperSignals.ts:326-327` and `packages/react/src/DeveloperSignals.ts:437-448`
**Issue:** This answers item 1 about the overload. It contains no cast, and it is sound. Its `Everywhere` overload returns a non-optional function only because `speaksHere("Everywhere")` is `true`, and the implementation signature returns `... | undefined`. The compiler does not check that link. The doc's claim holds for a row changed to a condition: it then fails to compile in `contain`. It does not hold for a bug introduced in `speaksHere`, which would make `contain` call `undefined`.

`(speaks === "Development") === isDevelopment()` also needs a second reading to see that `Production` falls out of the `false === isDevelopment()` case.
**Fix:** Leave the overload. Add one line to its doc saying the guarantee rests on `speaksHere`'s `Everywhere` arm, and write `speaksHere` as three explicit cases, or with `Match.value(speaks).pipe(Match.when(...), Match.exhaustive)` (§5a allows `Match.value` off a hot path).

### IN-03: The contract paragraphs for the registry moved nowhere, and `GateWriter.ts`'s header omits the builder

**File:** `packages/react/src/GateRegistry.ts:1-46` and `packages/react/src/GateWriter.ts:1-22`
**Issue:** `GateRegistry.ts`'s doc comment still carries the store's semantics: eventual consistency, "every mutation is synchronous; nothing here ever yields", disambiguation, a listener added during a notification. All of that is now realised in `buildGateRegistry`, in another file. Someone editing `buildGateRegistry` will not see the constraint that a yield point needs saying first. `GateWriter.ts`'s header still says it holds "the types a registry holds, the private writer slot, and how a set of registrations is reconciled", and does not mention that it now holds the store.
**Fix:** Move the ordering and synchrony paragraphs onto `buildGateRegistry`'s doc, leaving `GateRegistry.ts`'s header to describe `makeGateRegistry` and the public types. Add the builder to `GateWriter.ts`'s header.

### IN-04: Lines well past the codebase's hand-wrapped width

**File:** `packages/react/src/DeveloperSignals.ts:284` (110 columns) and `:178` (104, predates the phase); `packages/react/src/GateRegistry.ts:72` (102); `packages/react/test/DeveloperSignalReporters.test.tsx` (68 lines over 100 columns, up to 140, including the header at lines 2-13); `packages/react/test/GateRegistry.store.test.ts` (several `makeQadiAtoms(...)` lines near 130 columns).
**Issue:** The codebase hand-wraps near 90 columns (AGENTS.md section 17). The new test file is the worst offender; its header paragraph runs to 119 columns.
**Fix:** Wrap by hand. For example, break line 72 of `GateRegistry.ts` after `buildGateRegistry(` and shorten the `EntryFacts` summary on line 284 to one line under 90 columns.

### IN-05: The table-facts test compares the table with a verbatim copy, and `resolved` has no reader

**File:** `packages/react/test/DeveloperSignals.test.ts:180-220` and `:402-410`, `packages/react/src/DeveloperSignals.ts:287`
**Category:** necessity
**Issue:** D-02 locks `resolved` in the row, so I do not flag the field. The ADR already says "`resolved` is read by no code". Its only reader is a test that compares `SIGNALS` with a hand-copied literal of itself. That test fails when a row changes. It cannot fail because the code resolves a reporter at the wrong time. BEH-QD-695's real timing is pinned separately by the "when each reporter is resolved" tests. Evidence it is data-only: `/usr/bin/grep -rn "\.resolved"` over `packages/react/src` finds no reader.
**Fix:** Optional. Reword the test's title and the BEH/INV Enforcement lines to say it detects an unreviewed change to the table. Don't present it as evidence that timing is correct.

### IN-06: The same re-check probe and the `threw` sentence are written in more than one test file

**File:** `packages/react/test/DeveloperSignals.test.ts:498-533` and `packages/react/test/DeveloperSignalReporters.test.tsx:207-221`; `threw` helper in `DeveloperSignals.test.ts:91`, `DeveloperSignalReporters.test.tsx:74` and `GateRegistry.store.test.ts` (inside the new describe)
**Issue:** "A throwing `onHydrationMismatch` still settles the re-check and counts it" is asserted in both files, with its own payload builder in each. The `threw` message builder is copied three times. Each copy is deliberate whole-message pinning, but one shared helper in `test/support/` (where `hostile.ts` already lives) would keep the sentence in one place.
**Fix:** Drop the older probe from `DeveloperSignals.test.ts`, since the characterisation covers it in both environments. Move `threw` to `test/support/`.

---

_Reviewed: 2026-11-22T18:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
