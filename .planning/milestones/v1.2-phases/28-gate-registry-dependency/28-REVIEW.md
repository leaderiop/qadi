---
phase: 28-gate-registry-dependency
reviewed: 2026-11-11T23:40:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .changeset/gate-write-side.md
  - packages/react/src/GateWriter.ts
  - packages/react/src/hooks.ts
  - packages/react/src/MissingQadiProviderError.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/useGate.ts
  - packages/react/test/GateRegistry.store.test.ts
  - packages/react/test/GateWriter.reconcile.test.ts
  - packages/react/test/GateWriter.test.tsx
  - spec/behaviors/28-devtools-screens.md
  - spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md
  - spec/decisions/103-a-question-is-opened-once.md
  - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
  - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 6
  total: 6
  necessity: 0
status: issues_found
---

# Phase 28: Code Review Report

**Reviewed:** 2026-11-11T23:40:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

The phase split `GateWriter.ts` into a React-free write side with a pure `reconcile`, and moved the hooks to `useGate.ts`. I found no behavioural defect and no AGENTS.md violation. The six findings are all stale or inaccurate statements, plus one test gap.

Checks run:
- `pnpm circular`: no cycle.
- `pnpm spec:api`: 906 exports documented, no drift.
- `pnpm lint` (oxlint plus house-style): clean.
- `pnpm typecheck`: clean.
- Vitest over `test/GateWriter*` and `test/GateRegistry*`: 95 passed.

Correctness traced against the old implementation:
- **Lifecycle.** The mount, rerender and unmount order is: the `[writer]` effect runs first and installs a cleanup, then the reconcile effect registers. On unmount, or when the writer changes or goes `undefined`, the cleanup reads `registered.current` at cleanup time. It unregisters every handle and installs a new Map. Capturing the ref at effect time would see only the initial empty Map, and the existing "unmount unregisters" test would fail if it did.
- **StrictMode.** Simulated unmount then remount gives register, unregister-all, register: exactly one entry. I confirmed this with a throwaway probe test (instrumented `renderHook` under `StrictMode`, identity-changing rerender, then unmount). It ended with 1 instance, then 1, then 0. I deleted the probe afterwards.
- **`reconcile` versus the old inline loop.** The rules are equivalent. It unregisters stale entries first, then registers new ones. It falls back to `identity.policy` and `identity.resource` when `current[i]` is `undefined`. `resource` is correctly compared with `=== undefined` on `now`, not `??`, so an absent resource is not mistaken for a missing entry.
- **Exception safety.** Returning a new Map instead of mutating means a throw mid-reconcile would discard handles registered earlier in the pass. I checked whether `register` can throw: the collision reporter is wrapped by `contain(...)` in `DeveloperSignals.ts`, and listeners are try/caught in `changed`. It cannot, so this is not reportable.
- **Stale handle.** The handle closes over its own `live` flag and key. The new store test (a stale `update` after same-id re-registration) pins this correctly.
- **Import cycles.**
  - `QadiAtoms.ts` imports `HydrationEngine`, `DeveloperSignals`, `GateRegistry`, `DecisionOutcome` and `QuestionBook`.
  - None of those reaches `useGate.ts` or `QadiProvider.tsx`.
  - `useGate.ts` imports `QadiAtoms` type-only.
  - The `MissingQadiProviderError.ts` comment (`useGate.ts` to `QadiProvider.tsx` to `useGate.ts`) is true: `QadiProvider.tsx` imports `GateScopeContext` from `useGate.ts`.
- **Barrel.** Nothing from `GateWriter.ts` or `useGate.ts` reaches the barrel. `GateRegistry.ts` re-exports four types by name, all of them public.
- **Dropped `"use client"`.** `GateWriter.ts` lost it. It now holds no hooks and is imported by `GateRegistry.ts`, so the server-importable graph is cleaner.
- **No violations found** of `as`, `!`, `any`, `switch`, DOM calls or decisions held in React state. The `HTMLSpanElement` reference in `GateIdentity.marker` is a type only.

I did not load `necessity-review.md`; no necessity findings were assessed (`necessity: 0`).

## Info

### IN-01: `GateWriter.ts` header says `GateRegistry.ts` re-exports "three public types"; it re-exports four

**File:** `packages/react/src/GateWriter.ts:7-8`
**Issue:** `GateRegistry.ts:47` re-exports `GateInstance`, `GateKind`, `GateRegistry` and `GateRenderState`, which is four. The sentence was carried over into the rewritten header, so it now misstates the one fact the header exists to state about the barrel boundary.
**Fix:** "`GateRegistry.ts` re-exports the four public types (`GateInstance`, `GateKind`, `GateRegistry`, `GateRenderState`) by name".

### IN-02: `GateIdentity.atom` doc links to `useGates`, which is not in this module

**File:** `packages/react/src/GateWriter.ts:178`
**Issue:** `{@link useGates}` is an unresolvable link in a file that no longer contains or imports `useGates`. This is the stale-location pattern the phase was meant to remove.
**Fix:** Write "looked up by `useGates` in `useGate.ts`" as plain text.

### IN-03: INV-QD-064's Source attributes the handle's key-closure to `GateWriter.ts`

**File:** `spec/invariants.md:2654`
**Issue:** The handle (closed over `key` and `live`, so a stale cleanup can only end its own registration) is built in `GateRegistry.ts`'s `register`. `GateWriter.ts` holds only the `GateHandle` interface and the `OwnedGateRegistry` slot. The line was untouched by this phase. It is now the one live spec line that sends a reader to the write-side leaf for behaviour that lives in `GateRegistry.ts`. The phase's new store test pins exactly that behaviour in `GateRegistry`.
**Fix:** Move the parenthetical to the `GateRegistry.ts` clause and keep only `OwnedGateRegistry` and the private slot under `GateWriter.ts`. That is a Rev bump on `invariants.md`.

### IN-04: ADR-QD-140 Consequences overstate how little the tests changed

**File:** `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md` (Consequences, "One moved block and two import lines per caller")
**Issue:** It says "the only test edit is one import in `GateWriter.test.tsx`". The diff also changed that file's `run` helper (it now calls `useGateRegistrations(writer, [identity], [state])`), its `describe` title and its header comment. It also added `GateWriter.reconcile.test.ts` and a new case in `GateRegistry.store.test.ts`. The Decision section is accurate about the retarget; this sentence is not.
**Fix:** "the existing test edit is its import, the one-element call in `run`, and the title; new tests are `GateWriter.reconcile.test.ts` and one `GateRegistry.store` case".

### IN-05: ADR-QD-053's amendment blockquote still places `useGates` in `GateWriter.ts`

**File:** `spec/decisions/053-a-gate-can-be-found.md:73-77`
**Issue:** ADR-QD-111, ADR-QD-080 and ADR-QD-103 each got a dated note for the move. The "Amended by ADR-QD-111" blockquote in ADR-QD-053 says "one internal `useGates` (`GateWriter.ts`)" in the present tense, with no pointer to ADR-QD-140, and its Change History was not touched. It reads as a live location claim. It is arguably history under §15, but the sibling ADRs were treated differently.
**Fix:** Append "(moved to `useGate.ts`, ADR-QD-140)" to the blockquote and add a Change History row, or record in ADR-QD-140 that ADR-QD-053's blockquote is deliberately left as history.

### IN-06: No test drives the instrumented registration lifecycle under StrictMode

**File:** `packages/react/test/GateWriter.test.tsx`
**Issue:** The teardown now replaces the Map in the ref (`registered.current = new Map()`) instead of clearing it in place, so StrictMode's simulated unmount-then-remount is exactly the path that changed. The only StrictMode test (`edges.test.tsx:243`) renders uninstrumented, so nothing pins "exactly one live entry after a double effect". A change to the cleanup ordering or to which ref it reads could regress silently. My probe showed the current code is correct, but it is not covered.
**Fix:** Add a case to `GateWriter.test.tsx`: `renderHook(..., { wrapper: StrictMode })` with `useGateRegistrations`, then assert `registry.instances()` has length 1 after mount and after an identity-changing rerender, and length 0 after unmount.

---

_Reviewed: 2026-11-11T23:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
