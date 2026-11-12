# ADR-QD-111 — A gate's writer is resolved once, by its provider, and one hook serves every gate kind

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-111                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-08                                     |
> | Status         | Accepted — amends ADR-QD-053, ADR-QD-080; amended by ADR-QD-140 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-11): Amendment (ARCH-76, CCR-QD-418): the hooks moved to useGate.ts; amended by ADR-QD-140<br>1.0 (2026-11-08): Initial (ARCH-49, CCR-QD-388) |

---

## Context

The gate writer was looked up in three places by the same text: `useGate`,
`useQuestionsAs`, and `QadiProvider` (which resolved it a second time only to warn that a
hand-built registry had none). `GateIdentity` was built twice, once in each hook. The rule
that only `Can` and `Cannot` wrap a marker sat in `useGate.ts`, apart from the marker it
controls in `components.tsx`. `useDecisionSuspense` opened its decision atom twice, once
through the gate it called and once for its own suspense read. And `usePolicies` builds a
fresh `questions` record every render, which raised the question of what that cost, and
nothing pinned the answer.

ADR-QD-080's 2026-10-08 amendment says the writer lookup (`gateWriterFor`) "serves every
guard on the default path". That names where the writer is resolved, so the place is a
documented contract and this decision records it.

## Decision

**`QadiProvider` resolves the writer once, and one internal hook, `useGates`, serves every
gate kind.**

- **The provider resolves the writer once.** `QadiProvider` computes
  `instrument ? gateWriterFor(gates) : undefined` once and hands it to gates through
  `GateScopeContext`, which `GateWriter.ts` declares and keeps out of the barrel. The scope
  is `{ atoms, writer }`. `QadiContextValue`, which is public, is unchanged, so
  `useQadiContext` exposes no writer (D-01, ADR-QD-099).
- **`useGates(kind, questions)` in `GateWriter.ts`** (D-02). Every kind reads through the atom
  set's grouped read with one subscription; a one-question gate reads a group of one and gets
  the decision atom's own result object. Each entry's identity is its own decision atom,
  looked up once per structural change of the question set. A per-kind table, `KIND_FACTS`,
  states which kinds wrap a marker and which carry the entry name in their id. Registration
  goes through `useGateRegistrations`.
- **`useGate`, `useQuestionsAs` and `useDecisionSuspense` are thin callers.** The last
  suspends on the atom its gate opened (D-03, D-04).
- **The import rule shaped the scope.** `GateWriter.ts` sits below `QadiAtoms.ts` (through
  `GateRegistry.ts`) and below `QadiProvider.tsx`. It may therefore import neither, nor
  `GateRegistry.ts`, without a cycle (ADR-QD-037). So the scope is typed structurally
  (`GateAtoms`), and `MissingQadiProviderError` moved to a leaf module,
  `MissingQadiProviderError.ts`, which `QadiProvider.tsx` re-exports by name. The class a
  consumer imports is the very class `useGates` throws.
- **ADR-QD-080 holds.** Its override and its private writer slot are unchanged (D-05). Off
  still means absent: with `instrument` off nothing registers and no marker renders (D-06).
  `DECISION_READ_BUDGET` is unchanged, because the hook reads decisions only through
  `outcomeOf` (D-08).

### Decisions taken (ARCH-49)

| Id | Choice |
| -- | ------ |
| D-49-a | The provider resolves `instrument ? gateWriterFor(gates) : undefined` once, and gates read it from `GateScopeContext`, an internal context declared in `GateWriter.ts`; `QadiContextValue` gains nothing (D-01) |
| D-49-b | One hook, `useGates(kind, questions)`, owns the grouped read, the per-entry lookup, `GateIdentity`, the marker rule and registration; `KIND_FACTS` states wraps and grouped once per kind (D-02) |
| D-49-c | `useQuestionsAs` looks up no atom; the one per-entry `decision` lookup lives in `useGates`, memoised on the group (D-03) |
| D-49-d | `useDecisionSuspense` suspends on the atom `useGate` returns and opens none of its own, taking the decision opener count from 2 to 1 (D-04) |
| D-49-e | ADR-QD-080's override and private slot stay; consumers stop re-resolving the writer (D-05) |
| D-49-f | Off means absent, and no decision enters React state; the pre-existing React tests pass unedited as the check (D-06) |
| D-49-g | `usePolicies` is pinned across equal re-renders by a test written before the move, and no `Equal`-keyed structural memo was added (D-07) |
| D-49-h | `DECISION_READ_BUDGET` is unchanged; `useGates` reads through `outcomeOf` alone (D-08) |

## Consequences

- **No export is added or removed**, so the changeset is a patch, and `MissingQadiProviderError`
  is still exported from the package root. `spec/overview.md` records only where it is declared.
- **D-07 finding: no re-creation.** `usePolicies` builds a fresh record every render, and the
  atom set's structural keying plus `useGates`' group-keyed memo mean nothing is re-created.
  `hooks.rerender.test.tsx` renders it with two policies built inline each render across three
  equal re-renders. The `decisions` opener returns one distinct group atom; the `decision`
  opener is called 2 times at first mount (one per entry) and 0 more after; the registry is
  notified 2 times at settle and 0 more after; instance ids are unchanged. The one cost is a
  structural lookup per render (4 hook-level `decisions` calls across ticks 0 to 3), which is
  not asserted. The pin passed against the pre-move code too, so the `Equal`-keyed memo the
  CONTEXT allowed for was not needed.
- **D-03 as implemented.** No `QadiAtoms` member returns the entry atoms the grouped read
  uses, and adding one would break hand-written doubles. Using the group atom itself as each
  entry's identity would re-register every sibling whenever one entry changes, against
  BEH-QD-068's "MUST unregister exactly an instance whose name is dropped". So the one
  per-entry lookup lives in `useGates`, memoised on the group, and `useQuestionsAs` looks up
  nothing. A changed entry re-registers with its current policy and resource and its siblings
  are left alone; `GateWriter.kinds.test.tsx` asserts it (the sibling's registry instance is
  the same object).
- **One more derived atom per distinct one-question gate**: the weakly held group of one,
  which costs a re-derivation if it is collected.
- **An entry absent from the group reads `Pending`**, which fails closed.
- **The React tests that predate the phase (344 at c3ce9d2) passed unedited.** Plan 04-01 did not
  need its architectural checkpoint: every one-question gate reading through a group of one
  satisfied them.

## Alternatives considered

- **The hook in `useGate.ts`, reading `useQadiContext`.** No cycle, but D-02 puts the hook
  beside the registration lifecycle in `GateWriter.ts`, and it needs the writer on the
  public context value (next item).
- **A writer field on `QadiContextValue`.** It publishes the writer, which is the write side
  ADR-QD-080 keeps out of reach (ADR-QD-099).
- **The group atom as each entry's identity.** It re-registers siblings when one entry
  changes, which breaks BEH-QD-068.
- **An `Equal`-keyed identity token in the hook.** A second notion of question identity beside
  the question book's. D-07's measurement showed it buys nothing.
- **A per-kind read.** The one-question kinds would read their decision atom directly, but
  that needs a hook call chosen per kind, and a value union that only a cast could narrow.

Related: [ADR-QD-053](053-a-gate-can-be-found.md),
[ADR-QD-080](080-a-gate-registry-belongs-to-its-atom-set.md),
[ADR-QD-093](093-a-decision-is-read-once.md),
[ADR-QD-103](103-a-question-is-opened-once.md),
[INV-QD-046](../invariants.md#inv-qd-046-instrumentation-never-changes-what-a-guard-renders),
[INV-QD-064](../invariants.md#inv-qd-064-a-guard-is-listed-only-by-the-registry-its-provider-writes-to).

## Amendment (2026-11-11, CCR-QD-418, ARCH-76)

[ADR-QD-140](140-a-gates-write-side-is-a-leaf-below-the-atom-set.md) moved the hooks out
of `GateWriter.ts` into `useGate.ts`, so that `GateWriter.ts` is the React-free write
side and a leaf below `GateRegistry.ts`. The text above is history and stays as written;
each place it puts a hook in `GateWriter.ts` reads as follows now.

- **The provider-resolves-once bullet and row D-49-a:** `GateScopeContext` is declared in
  `useGate.ts`, not `GateWriter.ts`, and is still kept out of the barrel.
  `QadiProvider.tsx` imports it from there and `gateWriterFor` from `GateWriter.ts`.
- **The `useGates` bullet and row D-49-b:** `useGates`, `KIND_FACTS` and
  `useGateRegistrations` live in `useGate.ts`. The identity-lifecycle rules inside
  `useGateRegistrations` are a plain function, `reconcile`, in `GateWriter.ts`, tested
  without rendering.
- **Row D-49-c:** the one per-entry `decision` lookup, memoised on the group, moved with
  `useGates` into `useGate.ts`; `useQuestionsAs` still looks up no atom.
- **The import-rule bullet:** the structural `GateAtoms` is replaced by
  `Pick<QadiAtoms, "decision" | "decisions">`. That is legal because the hooks now sit
  above `QadiAtoms.ts`, and nothing in `QadiAtoms.ts`'s import closure reaches `useGate.ts`.
  `GateWriter.ts` is still below `GateRegistry.ts` and imports neither it nor
  `QadiAtoms.ts`; `MissingQadiProviderError.ts` stays a leaf module.
- **The first alternative** (the hook in `useGate.ts`, reading `useQadiContext`) stays
  rejected: the hook in `useGate.ts` reads `GateScopeContext`, never `useQadiContext`, so
  the writer is still not on the public context value.

`useGateRegistration`, the one-element wrapper, is removed; a single-question guard
passes one identity to `useGateRegistrations`.
