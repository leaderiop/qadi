---
phase: 04-gate-instrumentation-hook
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - packages/react/src/GateWriter.ts
  - packages/react/src/hooks.ts
  - packages/react/src/MissingQadiProviderError.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/useGate.ts
  - packages/react/test/GateWriter.kinds.test.tsx
  - packages/react/test/GateWriter.useGates.test.tsx
  - packages/react/test/hooks.rerender.test.tsx
  - .changeset/gate-hook.md
  - spec/behaviors/28-devtools-screens.md
  - spec/decisions/053-a-gate-can-be-found.md
  - spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md
  - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
  necessity: 0
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

I reviewed the ARCH-49 refactor, which moves gate registration into one `useGates` hook over a writer that `QadiProvider` resolves once. I also reviewed the three new test files and the spec and ADR changes.

I found no correctness or security defects in the new hook path. I traced these checks.

- **Group-of-one result identity.** A group of one returns the decision atom's own result object, because `decisions` does `get(decision(...))` and stores the value unchanged (`QadiAtoms.ts:348-356`). That backs the ADR's "very result" claim.
- **Entry and identity ordering.** `entries` and `identities` are both built with `Record.map` over the same `questions`, so the index alignment `useGateRegistrations` assumes holds.
- **Writer visibility.** The writer reaches gates only through the internal `GateScopeContext`. It is not on `QadiContextValue`, and `GateScopeContext` is not exported from the barrel. I checked that `export * from "./QadiProvider.tsx"` does not re-export it.
- **Off means absent.** `scope.writer === undefined` makes every effect return early and `ref` come back `undefined`. No marker renders.
- **`MissingQadiProviderError`.** It is the same class after the move to a leaf module. `QadiProvider.tsx` re-exports it, so `instanceof` still works.
- **Import-cycle claim.** I checked the claim that `GateWriter.ts` has no cycle. The new imports (`QuestionBook.ts`, `DecisionOutcome.ts`, `MissingQadiProviderError.ts`) are consistent with it.
- **Stale ids.** `useGate` memoises the one-question record on `[policy, resource]`, and `usePolicies` rebuilds its record every render. Both are safe because identity is keyed on the structurally shared atoms.

What remains is one test-reliability warning and a few maintainability items.

## Warnings

### WR-01: The "opens its decision atom once" test never exercises the suspending path

**File:** `packages/react/test/GateWriter.useGates.test.tsx:112-136`
**Issue:** D-04 (the count of decision openers for `useDecisionSuspense` going from 2 to 1) is the behavioural change this test pins. It does so only on a path where the probe never suspends. A sibling `<Can policy={policy}>` asks the same question and settles first (`await screen.findByText("can")`). When the probe mounts, `useAtomSuspense` finds a settled atom and returns synchronously.

The real `useDecisionSuspense` case is a cold atom: the component suspends, React discards its render-local `useMemo` state, and the retry re-runs `atomOf` and calls `decision` again. A regression that makes the retry re-open the atom would pass this test. Cold-atom suspension is also the first path an instrumented `useDecisionSuspense` takes in production, and `GateWriter.kinds.test.tsx` only checks that it registers once.
**Fix:** Add a case where the probe is the first and only asker of a question whose evaluation takes at least one tick, for example a port with a latch or a `TestClock`-gated delay. Assert both the final opener count and that exactly one instance registers after the suspension resolves. Alternatively, drop `<Can>` from the tree so the probe is the only asker, and assert `opened <= 2` with a comment saying a suspend retry may legitimately re-run the lookup.

## Info

### IN-01: `useGateRegistration` is now production dead code kept alive by one test

**File:** `packages/react/src/GateWriter.ts:327-338`
**Issue:** After this phase, `useGateRegistration` (the one-element wrapper) has no caller in `packages/*/src`. `useGates` calls `useGateRegistrations` directly. The only consumer is `packages/react/test/GateWriter.test.tsx:13,51`. The doc comment still says "the one-element case of `useGateRegistrations`" as if it were the single-question path. Because the module is out of the barrel, this is shipped, unreachable code.
**Fix:** Either delete it and have `GateWriter.test.tsx` call `useGateRegistrations(p.writer, [p.identity], [p.state])` itself, or mark it test-only in its comment so the next reader does not take it for a live path.

### IN-02: Stale doc comment on the `useAtomValue` re-export

**File:** `packages/react/src/QadiProvider.tsx:84-89`
**Issue:** The comment says every other call site "reads the registry through `useQadiContext` only for other fields (`atoms`, `instrument`)". After this phase the gate hook no longer calls `useQadiContext` at all. It reads `GateScopeContext`, and it imports the library's `useAtomValue` directly from `@effect/atom-react/Hooks` (`GateWriter.ts:30`) rather than this re-export. Nothing in `packages/react/src` outside `QadiProvider.tsx` reads `QadiContextValue.instrument` any more, so the comment's example field no longer applies.
**Fix:** Reword to name the real remaining consumers (`useSubject`, `useInvalidate`, `useGateInstances`) and note that gates go through `GateScopeContext`.

### IN-03: Hook dependency arrays omit values that are read inside the callback

**File:** `packages/react/src/GateWriter.ts:456-462`, `packages/react/src/QadiProvider.tsx:307-311`
**Issue:** `atomOf`'s `useMemo` reads `questions` but is keyed on `[scope.atoms, group]`. The in-code comment explains why, and it is sound because `group` stands for the structural question set. The `unwritableGateRegistry` effect now reads `writer` and keeps `[instrument, gates]`. That is equivalent, since `writer` is a pure function of those two. Neither has a lint-suppression comment, so `react-hooks/exhaustive-deps` will flag them if it is enabled. A later edit that changes how `group` or `writer` is derived would silently break the equivalence.
**Fix:** Add a one-line `// deps intentionally omit questions: see above` marker, or an explicit lint-disable with the reason, so the omission reads as a decision. In `QadiProvider`, use `[writer]` plus `instrument` as the dependencies, since `writer` already folds in `gates`.

### IN-04: Test header overstates "written against the code before the move"

**File:** `packages/react/test/GateWriter.useGates.test.tsx:1-9`
**Issue:** The header says the tests were "written against the code as it stood before the move and kept green across it". The `useDecisionSuspense opens its decision atom once (D-04)` test asserts the new count of 1 and would fail on the pre-move code, which opened it twice. The `Probe`-based "very result its decision atom holds" test is also coupled to the group-of-one implementation detail the ADR documents. The header will mislead someone using it to decide which tests are characterisation tests and which are new behaviour.
**Fix:** Say which cases are characterisation (instrumented `<Can>`, uninstrumented, missing provider) and which assert new behaviour (D-04).

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
