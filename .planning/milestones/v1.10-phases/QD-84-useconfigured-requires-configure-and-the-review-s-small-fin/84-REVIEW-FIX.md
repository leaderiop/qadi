---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
fixed_at: 2026-11-25T12:00:00Z
review_path: .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-REVIEW.md
iteration: 2
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase QD-84: Code Review Fix Report

**Fixed at:** 2026-11-25T12:00:00Z
**Source review:** `.planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-REVIEW.md`
**Iteration:** 2

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit and commit landed in the main checkout. Verification ran in the main checkout.

## Fixed Issues

### IN-01: The type test's header still describes one refusal

**Files modified:** `packages/devtools/test/react/useConfigured.tst.ts`
**Commit:** 98d8a1d8 (shared with IN-02: the header lists the fourth refusal IN-02 adds, so the two edits do not stand apart in one file)
**Applied fix:** The header now says each refusal is a `@ts-expect-error` checked twice and has an accepted twin differing only in the argument under test, then lists the four pairs (no `configure` against one that has it; another value's inputs against its own; a source that is not a source against a source; a `configure` over narrower inputs than it is handed against inputs it takes), and says only the function-property form refuses the fourth.

### IN-02: Nothing pins the "property, not method" choice

**Files modified:** `packages/devtools/test/react/useConfigured.tst.ts`, `spec/behaviors/28-devtools-screens.md`, `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md`, `spec/traceability.md`, `.planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md`
**Commit:** 98d8a1d8
**Applied fix:** Made the claim true by pinning it. A pin that tells the two forms apart exists: a value whose `configure` takes a `number`, handed a `number | string`. `I` is inferred as `number | string` from the inputs, `(inputs: number) => void` is not assignable to `(inputs: number | string) => void` under the property's contravariant check, and it is assignable under a method's bivariant check. The new test "a value whose configure takes narrower inputs than it is handed is refused, and its twin with its own inputs is accepted" holds a `@ts-expect-error Types of parameters 'inputs' and 'inputs' are incompatible` over `useConfigured(() => Effect.succeed(configurable), wideInputs)` and its twin `useConfigured(() => Effect.succeed(configurable), narrowInputs)` (`typeof configurable | undefined`). It adds no `not.toBeCallableWith`, so `NOT_CALLABLE_PIN_BUDGET` did not move.

Seen failing with `Configurable`'s member changed from `readonly configure: (inputs: I) => void;` to the method `configure(inputs: I): void;` in a copy-backed scratch edit (restored with `cp`; `git diff --quiet HEAD -- packages` clean afterwards). The failing line, as seen and as appended to `84-RED-EVIDENCE.md` under `## Review fixes`:

- failed (method-signature): a value whose configure takes narrower inputs than it is handed is refused, and its twin with its own inputs is accepted
  - Error: Unused '@ts-expect-error' directive. ts(2578)

The message fragment matches under the property form: both tstyche passes report "Suppressed: 101 matched, 101 total".

The sentence "not by the weak-type check alone" is replaced. BEH-QD-756 and ADR-QD-197 decision 1 now say: a property is checked contravariantly and a method bivariantly, so only the property refuses a narrower-inputs value; four calls are refused, each pinned beside a twin; the first three are refused in either declaration form (a missing property, an ordinary type mismatch, and, for the diagnostics build handed a timeline's inputs, TypeScript's weak-type check, whose message is "has no properties in common"); only the fourth is refused by the property form alone and holds the choice. Both "Pinned by" and "What enforces it" list the new title, the ADR's negative-pin alternative says four refusals, and the `useConfigured.tst.ts` row of `spec/traceability.md` names the four refused calls. Revisions: BEH-28 1.80, ADR-197 1.4, traceability 1.329 (`spec-revise`).

## Verification

All run in the main checkout, after the last commit unless noted.

- `node 84-pinned-check.mjs --all-applied`: passes before and after (16 files hold, 2 of 2 edits, 8 of 8 refusals, 3 of 3 born files).
- `pnpm test:tstyche`: both passes green (run after the test edit, before the commit; the commit changed no source of the test). Pass 1 (`tsconfig.tstyche.json`): 78 files, 426 tests passed, 1 skipped. Pass 2 (`tsconfig.test.json`): 78 files, 425 passed, 2 skipped. Each pass: Suppressed 101 matched, 101 total.
- `pnpm exec tsc -p tsconfig.test.json --noEmit`: no output, exit 0.
- `node scripts/check-house-style.mjs`: 617 files clean (budget unchanged).
- `pnpm exec oxlint packages/devtools/test/react/useConfigured.tst.ts`: exit 0.
- `node scripts/spec-revise.mjs --check`: every Revision matches.
- `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0.
- `node scripts/check-doc-examples.mjs`: 119 blocks compile.

## Notes

- A first scratch run left the method-signature edit in place for a moment: the backup path used for the restore was a different directory from the one the backup went to. The file was restored from the backup and `git diff --quiet HEAD -- packages/devtools/src` was clean before any further step.
- `.planning/config.json` was already modified before this run and was never staged.

## Iteration 1

Summarised from the iteration-1 report (`84-REVIEW-FIX.iter2.md`); the commits are cbed94b7, 349fc35e, f5cfd3f2, a14679ef and c76c3f6d. Six findings, six fixed, none skipped. The text below is that report's findings and verification, with its headings demoted one level.


**Fixed at:** 2026-11-25T11:00:00Z
**Source review:** `.planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit and commit landed in the main checkout. Verification ran in the main checkout.

### Fixed Issues

#### WR-01: BEH-QD-756 says three refusals are pinned, and only one is

**Files modified:** `packages/devtools/test/react/useConfigured.tst.ts`, `spec/behaviors/28-devtools-screens.md`, `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md`, `.planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md`
**Commit:** cbed94b7
**Applied fix:** Made the claim true. Two tests were added, each a `@ts-expect-error` with a message fragment beside an accepted twin that differs only in the argument under test:
- "a build handed another value's inputs is refused, and its twin with its own inputs is accepted": `useConfigured(makeDiagnosticsFeed, { source: timelineSource, capacity: 1 })`, fragment `has no properties in common with type 'DiagnosticsOptions'`; twin `useConfigured(makeDiagnosticsFeed, undefined)`.
- "a build handed a source that is not a source is refused, and its twin with a source is accepted": `useConfigured(makeTimelineFeed, { source: 1 })`, fragment `Type 'number' is not assignable to type 'Source'`; twin `useConfigured(makeTimelineFeed, { source: timelineSource })`.

BEH-QD-756 now says each of the three refusals is pinned as a `@ts-expect-error` beside an accepted twin, and lists both new titles in "Pinned by". ADR-QD-197 decision 1, its "negative pin" alternative and "What enforces it" say the same (the alternative says three refusals, not one). Both documents went through `spec-revise` (BEH-28 1.78, ADR-197 1.2).

Each new refusal was seen failing, with `Configurable<I>` in the `useConfigured` signature loosened to `{ readonly configure: (inputs: any) => void }` in a copy-backed scratch edit, restored with `cp`; `git diff --quiet HEAD -- packages/devtools/src` was clean afterwards. The failing lines, as seen and as appended to `84-RED-EVIDENCE.md` under `## Review fixes`:

- failed (loosened-constraint): a build handed another value's inputs is refused, and its twin with its own inputs is accepted
  - Error: Unused '@ts-expect-error' directive. ts(2578)
- failed (loosened-constraint): a build handed a source that is not a source is refused, and its twin with a source is accepted
  - Error: Unused '@ts-expect-error' directive. ts(2578)

The message fragment is also checked: replacing the first fragment with `bogus fragment` fails tstyche with "The diagnostic message did not match." (restored). `NOT_CALLABLE_PIN_BUDGET` did not move: `check-house-style` passes unchanged.

#### WR-02: "The lens group of `stryker.devtools.mjs`" does not exist in that file

**Files modified:** `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md`
**Commit:** 349fc35e (shared with WR-03: both rewrite the same sentences in the same three documents)
**Applied fix:** BEH-QD-757 "Pinned by", INV-QD-413 **Enforcement**, and ADR-QD-197's "What enforces it" decision 2 and its "Keep `move`" alternative now cite "the devtools mutation run (`stryker.devtools.mjs`, which mutates `packages/devtools/src/model/**`, `LensSession.ts` included)". The word "group" is gone. The "Keep `move`" entry says the two survivors were found in a run limited to `LensSession.ts`. A grep of `spec/` finds no other record with the wording (`spec/traceability.md` row INV-QD-413 cites `stryker.devtools.mjs` alone, which is accurate). Revisions: BEH-28 1.79, invariants 1.229, ADR-197 1.3.

#### WR-03: ADR-QD-197 says `LensSession.ts` is the only file under the mutation glob

**Files modified:** `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md`
**Commit:** 349fc35e
**Applied fix:** The "mutation record" bullet now reads "Of the files this decision edits, only `LensSession.ts` is under the devtools mutation run's `mutate` glob (`packages/devtools/src/model/**/*.ts`)".

#### IN-01: First line of the `useConfigured.ts` header is about 115 columns

**Files modified:** `packages/devtools/src/react/useConfigured.ts`
**Commit:** f5cfd3f2
**Applied fix:** Wrapped as the review suggested ("Builds a value that has `configure` in a scope, and configures it with the latest inputs before anything reads it.").

#### IN-02: The `Configurable` doc says it is exported for the type test alone

**Files modified:** `packages/devtools/src/react/useConfigured.ts`
**Commit:** a14679ef
**Applied fix:** The doc now says it is the constraint `useConfigured` asks of its value, pinned by `useConfigured.tst.ts`, exported because the hook's signature names it, and kept out of both barrels.

#### IN-03: Stray trailing comma in the generic of a `.ts` file

**Files modified:** `packages/devtools/src/react/useStopNotice.ts`
**Commit:** c76c3f6d
**Applied fix:** `<S,>` became `<S>`.

### Verification

All run in the main checkout, after the last commit unless noted.

- `node 84-pinned-check.mjs --all-applied`: passes before and after (16 files hold, 2 of 2 edits, 8 of 8 refusals, 3 of 3 born files). None of its files was edited.
- `pnpm exec vitest run --project devtools` over `useConfigured.test.tsx`, `DiagnosticsNotice.test.tsx`, `TimelineNotice.test.tsx` and `DockFrame.stops.characterisation.test.tsx`: 4 files, 37 tests pass.
- `pnpm test:tstyche`: both passes green. Pass 1 (`tsconfig.tstyche.json`): 78 files, 425 tests passed, 1 skipped. Pass 2 (`tsconfig.test.json`): 78 files, 424 passed, 2 skipped.
- `pnpm exec tsc -p tsconfig.test.json --noEmit`: no output, exit 0.
- `node scripts/check-house-style.mjs`: 617 files clean.
- `pnpm exec oxlint` over the three touched `.ts` files: exit 0, no output.
- `node scripts/spec-revise.mjs --check`: every Revision matches.
- `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0.
- `node scripts/check-doc-examples.mjs`: 119 blocks compile.

### Notes

- WR-02 and WR-03 share one commit: they rewrite sentences in the same three documents, and the second fix is one hunk of the ADR the first also edits.
- `.planning/config.json` was already modified before this run and was never staged.

---

_Fixed: 2026-11-25T12:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
