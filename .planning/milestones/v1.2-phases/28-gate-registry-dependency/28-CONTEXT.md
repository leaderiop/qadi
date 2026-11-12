# Phase 28: The gate registry and GateWriter dependency - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning (opens with a `checkpoint:decision`)
**Ticket:** ARCH-76 · 2026-11-11 review candidate #8 (Speculative)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE7-CONTEXT.md` (base `965ff14c`, numbering row 28)
**Runs after:** Phase 27. No phase 21–27 is planned to touch `packages/react/src/{GateWriter,GateRegistry,QadiAtoms,useGate,QadiProvider}.tsx?`;
each plan re-reads them at its base.

<domain>
## Phase Boundary

`@qadi/react`'s gate instrumentation: the registry (`GateRegistry.ts`, public), its write side and the one hook every gate kind
goes through (`GateWriter.ts`, package-private), and the atom set that owns a registry (`QadiAtoms.ts`). The review says the
import direction `GateRegistry.ts → GateWriter.ts` forces `GateAtoms` to restate two `QadiAtoms` members and a header paragraph
to explain the cycle, and that the registration reconcile is testable only through `renderHook`. This partly reopens
ADR-QD-111, so a human chooses the scope (plan 28-01). Whatever is chosen, no export is added or removed, nothing renders
differently, and AGENTS.md §13 holds (no React state for decisions; decisions read through `outcomeOf`).
</domain>

<evidence>
## Evidence (re-verified by reading at `965ff14c`, 2026-11-11)

- `packages/react/src/GateWriter.ts` (496 lines, `"use client"`, out of the barrel). Lines 1-195: `GateKind` (:42-50),
  `KIND_FACTS` (:62-73), `GateRenderState` (:92), `GateInstance` (:94-123), `GateHandle` (:133-138), `GateWriter` (:141-143),
  `GateRegistry` (:152-157), `OwnedGateRegistry` with the ES-private `#writer` slot and `writerOf` brand check (:167-181),
  `makeOwnedGateRegistry` (:184), `gateWriterFor` (:194). Lines 197-496: `GateIdentity`, `sameIdentity`,
  `useGateRegistrations` (:234-325), `useGateRegistration` (:332-338), `GateAtoms` (:346-353), `GateScope`, `GateScopeContext`,
  `GateRead`, `Gates`, `NOT_YET`, `useGateScope`, `useGates` (:438-496). Imports: `@effect/atom-react/Hooks`, `effect/Record`,
  `AsyncResult`, `Atom` (type), React, and the leaves `DecisionOutcome.ts`, `MissingQadiProviderError.ts`, `QuestionBook.ts`.
- `GateRegistry.ts` (142 lines, **in the barrel**, `src/index.ts:3` `export *`): imports `makeOwnedGateRegistry` and the types
  back from `GateWriter.ts` (:44-45) and re-exports `GateInstance, GateKind, GateRegistry, GateRenderState` by name (:47);
  `makeGateRegistry` ends in `makeOwnedGateRegistry({...})` (:126).
- `QadiAtoms.ts` (in the barrel) imports `makeGateRegistry` and `GateRegistry` from `GateRegistry.ts` (:41-42) and declares
  `decision` (:101) and `decisions` (:110-112), which `GateAtoms` restates by hand. The header of `GateWriter.ts` (:19-27) spends
  nine lines on the cycle; ADR-QD-111's "The import rule shaped the scope" bullet records the same.
- Reconcile: `useGateRegistrations` holds four refs (`stableRef`, `latest`, `statesRef`, `registered`, :248-264) and three
  `useEffect`s (writer teardown :267-274, identity lifecycle :281-310, state push :318-324). The identity-lifecycle effect is the
  reconcile (unregister changed or dropped ids, register new ones). Its only direct test is `test/GateWriter.test.tsx`
  (`renderHook`, 7 cases).
- `useGateRegistration` (:332) has no production caller (`grep` over `packages/*/src`, `examples`, `apps`, `features`: only its
  own declaration and a doc link at :226). Its only user is `test/GateWriter.test.tsx`; `spec/traceability.md:431` describes that
  file as "`useGateRegistration` driven by `renderHook`", and ADR-QD-103:52 mentions it as the one-element case.
- `pnpm circular` is `madge --circular --extensions ts,tsx packages/*/src` and counts `import type` edges (v1.0 04-01-PLAN).
- `stryker.react.mjs` mutates only `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`; the touched gate files are
  measured with a `--mutate` override (`reports/mutation-react/mutation.json`), as Phase 17 did.

## Correction to the review's option A (verified by reading the imports; no build was run)

"Move the registry types into `GateRegistry.ts`" cannot be done as worded:
- `GateRegistry.ts` is an `export *` barrel module. Whatever it exports is public. The writer must not be (ADR-QD-080,
  ADR-QD-111 D-49-a: "a consumer able to reach the writer could register a `<Can>` that does not exist"). The private slot
  only works inside its class body, so `gateWriterFor` must live in the module that declares `OwnedGateRegistry`. Putting the
  class in `GateRegistry.ts` therefore publishes `gateWriterFor`.
- Keeping the class in a private module while its types (`GateInstance`, `GateWriter`, `GateRegistry`) move up to
  `GateRegistry.ts` makes the private module import `GateRegistry.ts` for the types while `GateRegistry.ts` imports it for
  `makeOwnedGateRegistry`: a two-module cycle, and madge counts the type edge.

What actually forces the restated `GateAtoms` is narrower: `GateWriter.ts` holds **both** the write side (which must sit below
`GateRegistry.ts`) **and** the hooks (which want to see `QadiAtoms.ts`). Split along that line and the hooks can import
`QadiAtoms` as a type. Checked by reading every local import in `packages/react/src`:

```
after option A:  GateRegistry.ts → GateWriter.ts (write side, leaf), DeveloperSignals.ts
                 QadiAtoms.ts    → GateRegistry.ts, HydrationEngine.ts, DeveloperSignals.ts, DecisionOutcome.ts, QuestionBook.ts
                 useGate.ts      → GateWriter.ts, QadiAtoms.ts (type), DecisionOutcome.ts, MissingQadiProviderError.ts, QuestionBook.ts
                 QadiProvider.tsx→ useGate.ts (GateScopeContext), GateWriter.ts (gateWriterFor), QadiAtoms.ts (type), GateRegistry.ts (type)
                 hooks.ts        → useGate.ts, QadiProvider.tsx, GateRegistry.ts (type), …
                 components.tsx  → useGate.ts, DecisionOutcome.ts, SeededDecision.ts
```

Nothing in `QadiAtoms.ts`'s import closure (`HydrationEngine.ts` → `DeveloperSignals.ts`, `HydrationEvent.ts`,
`SeededDecision.ts`; `GateRegistry.ts` → `GateWriter.ts`, `DeveloperSignals.ts`; `DecisionOutcome.ts` → `SeededDecision.ts`;
`QuestionBook.ts`) imports `useGate.ts`, `QadiProvider.tsx`, `hooks.ts` or `components.tsx`, so the split adds no cycle.
`GateAtoms` becomes `Pick<QadiAtoms, "decision" | "decisions">`. The executor confirms with `pnpm circular` (28-04).
</evidence>

<decisions>
## Implementation Decisions

- **D-01 (`checkpoint:decision`, plan 28-01; GATE-01):** three options, as corrected above.
  - **A — split the write side from the hooks, and extract a pure `reconcile` (recommended).** `GateWriter.ts` keeps lines
    1-195's write side and gains `GateIdentity`, `sameIdentity` and `reconcile`, and stops importing React (`marker` is typed
    structurally as `{ readonly current: HTMLSpanElement | null }`). `KIND_FACTS`, `GateScope`, `GateScopeContext`, `GateRead`,
    `Gates`, `NOT_YET`, `useGateScope`, `useGates` and `useGateRegistrations` move into `useGate.ts` (already "the one-question
    door into `useGates`", out of the barrel). `GateAtoms` becomes `Pick<QadiAtoms, "decision" | "decisions">`; the cycle
    paragraph in `GateWriter.ts`'s header goes. Amends ADR-QD-111's import-rule bullet; ADR-QD-080's slot is unchanged.
  - **B — extract the pure `reconcile` only.** `reconcile` goes into `GateWriter.ts` beside the hook that calls it; the files
    and the import direction stay; `GateAtoms` stays structural.
  - **C — keep everything, and write ADR-QD-140** recording why the inversion is not done (the barrel and the private slot, as
    above), so reviews stop re-suggesting it.
  Recommendation **A**: the user prefers complete over simple; the corrected A is acyclic by reading and removes the
  hand-restated `GateAtoms` and the cycle paragraph for one moved block; it includes B. Its cost is honest: about 300 lines move
  between two files, test imports change, and ADR-QD-111 is amended.
- **D-02 (GATE-04, decided at planning, confirmed in the same reply):** `useGateRegistration` is **deleted**. It has no
  production caller and is a one-line wrapper over `useGateRegistrations`. Before deletion, `GateWriter.test.tsx`'s seven
  `renderHook` cases are retargeted to `useGateRegistrations(writer, [identity], [state])` (plan 28-02, every option), so the hook
  lifecycle (teardown on unmount and on a writer that goes `undefined`) keeps a direct test. Under A and B the reconcile cases
  also get React-free tests (28-03); the two lifecycle-only cases stay on `renderHook` because they test effects, not reconcile.
- **D-03 (GATE-02, options A and B):** `reconcile` is React-free: no refs, no effects; it takes the writer, the live
  registrations and the wanted identities (with the current policy, resource and state per index) and returns the next live map,
  calling only `writer.register` and `handle.unregister`. The state push becomes a second plain function (`pushStates`) or stays
  inline in its effect, executor's choice, as long as it is covered. Tests: `test/GateWriter.reconcile.test.ts` against a fake
  writer that records calls, written first and seen failing (no export yet), with every rule the identity-lifecycle effect
  implements: first reconcile registers in wanted order; an unchanged identity makes no call; a changed `atom`/`kind`/`wraps`/
  `marker` unregisters then re-registers; a dropped id only unregisters; a new id only registers; a missing `current` entry falls
  back to the identity's own policy/resource and `"Pending"`; a wrapping identity registers its marker's element, a non-wrapping
  one `undefined`.
- **D-04 (records):** behaviour is unchanged (BEH-QD-068, BEH-QD-233, INV-QD-046, INV-QD-064 hold as written); no BEH or INV is
  added, so BEH-QD-475..479 and INV-QD-300..301 are unused. ADR: **A** → ADR-QD-140 "A gate's write side is a leaf below the atom
  set, and its hook sits above it" (amends ADR-QD-111); **B** → no new ADR, a dated ADR-QD-111 amendment records that the split was
  weighed and why B was chosen (ADR-QD-140 unused); **C** → ADR-QD-140 "The gate writer stays below the atom set" (records the
  correction above as the reason). CCR-QD-418. `spec/overview.md`: no export changes; the `GateInstance, GateKind,
  GateRenderState` row says "re-exported from `./GateWriter.ts`", true under all three. Traceability: the `GateWriter.test.tsx`
  row stops naming `useGateRegistration`; A/B add a `GateWriter.reconcile.test.ts` row. Changeset: `@qadi/react` patch.

### Claude's Discretion
- File names of the moved tests (`GateWriter.useGates.test.tsx` and `GateWriter.kinds.test.tsx` test `useGates` through
  components and need no import change; renaming them is optional).
- Whether `pushStates` is extracted.
- Whether `GateWriter.ts` keeps `"use client"` once it is React-free (`QadiAtoms.ts` keeps it while React-free, so keeping it is
  the consistent default).
</decisions>

<canonical_refs>
## Canonical References
- `packages/react/src/GateWriter.ts`, `GateRegistry.ts`, `QadiAtoms.ts`, `useGate.ts`, `QadiProvider.tsx`, `hooks.ts`,
  `components.tsx`, `MissingQadiProviderError.ts`, `index.ts`
- `packages/react/test/GateWriter.test.tsx`, `GateWriter.useGates.test.tsx`, `GateWriter.kinds.test.tsx`,
  `GateRegistry.store.test.ts`, `GateRegistry.test.tsx`, `hooks.rerender.test.tsx`
- ADR-QD-037, ADR-QD-053, ADR-QD-080, ADR-QD-099, ADR-QD-103, ADR-QD-111; BEH-QD-068, BEH-QD-233; INV-QD-046, INV-QD-064
- `.planning/milestones/v1.0-phases/04-gate-instrumentation-hook/04-01-PLAN.md` (the import rule and why `GateAtoms` is structural)
- `stryker.react.mjs` (`--mutate` override; report `reports/mutation-react/mutation.json`)
</canonical_refs>

<deferred>
## Deferred Ideas
- Moving `MissingQadiProviderError` back into `QadiProvider.tsx` under A (`useGate.ts` would then import `QadiProvider.tsx`,
  which imports `useGate.ts`: still a cycle, so the leaf stays).
- Adding the gate files to `stryker.react.mjs`'s permanent `mutate` list (a scope decision for that config's rationale, not this phase).
</deferred>

---
*Phase: 28-gate-registry-dependency · Context gathered: 2026-11-11*
