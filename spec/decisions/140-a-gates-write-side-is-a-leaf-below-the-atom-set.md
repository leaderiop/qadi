# ADR-QD-140 — A gate's write side is a leaf below the atom set, and its hook sits above it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-140                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-11                                     |
> | Status         | Accepted — amends ADR-QD-111, ADR-QD-080       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-11): Initial (ARCH-76, CCR-QD-418) |

---

## Context

`GateWriter.ts` held two things that want opposite import directions. The **write side**
(the `GateInstance`, `GateHandle`, `GateWriter` and `GateRegistry` types, the registry
class with its private writer slot, `makeOwnedGateRegistry`, `gateWriterFor`) has to sit
below `GateRegistry.ts`, because `GateRegistry.ts` builds the registry through it and
`QadiAtoms.ts` imports `GateRegistry.ts`. The **hooks** (`useGates`, `useGateRegistrations`,
`GateScopeContext`, the per-kind table) want to see `QadiAtoms.ts`, because they read the
atom set's `decision` and `decisions`.

ADR-QD-111 resolved the conflict by keeping both in one file and writing the atom set's
shape twice: `GateAtoms`, a structural restatement of the two members the hooks use, with
a paragraph in the file's header explaining why it could not import `QadiAtoms`. The
restatement is a second statement of a signature the atom set already owns, and nothing
but a type test notices when they drift. The identity-lifecycle rules also lived inside one
effect of `useGateRegistrations`, reachable only by rendering a component.

ARCH-76's review proposed moving the registry types up into `GateRegistry.ts`. That does
not work as worded, and the correction is the reason this record exists:

- `GateRegistry.ts` is an `export *` barrel module, so whatever it exports is public. The
  writer must not be (ADR-QD-080, ADR-QD-111 D-49-a: a consumer able to reach the writer
  could register a `<Can>` that does not exist). The private slot works only inside its
  class body, so `gateWriterFor` must live in the module that declares the class. Putting
  the class in `GateRegistry.ts` publishes `gateWriterFor`.
- Keeping the class in a private module while its types move up to `GateRegistry.ts` makes
  that module import `GateRegistry.ts` for the types while `GateRegistry.ts` imports it for
  `makeOwnedGateRegistry`: a two-module cycle, and madge counts the type edge
  (ADR-QD-037).

What the restatement really answers to is narrower: one file holds both sides. Split along
that line and the hooks can import `QadiAtoms` as a type.

## Decision

The user decided this one (`.planning/phases/_DECISIONS-v1.2.md`, row 28-01 T1, D-01):

> `A` (useGateRegistration deleted). Split the React-free write side plus pure `reconcile`
> (private leaf below the registry) from the hooks (`useGate.ts`, above `QadiAtoms`);
> `GateAtoms` = `Pick<QadiAtoms, …>`; ADR-QD-140 amends ADR-QD-111's import rule.

The standing instruction that came with it: "the recommendation should be the cleanest
solution, not the simplest one; we can override any ADR if it causes us problems."

**`GateWriter.ts` is the React-free write side, a leaf below `GateRegistry.ts`; `useGate.ts`
holds the gate hook, its scope context and the registration lifecycle, above
`QadiAtoms.ts`.**

1. **`GateWriter.ts` imports nothing from React.** It holds the types, the registry class
   and its private slot, `makeOwnedGateRegistry`, `gateWriterFor`, `GateIdentity` (whose
   `marker` is typed `{ readonly current: HTMLSpanElement | null }`, so no React type is
   needed), `sameIdentity`, and `reconcile`. It stays out of the barrel, so the writer is
   still unreachable from a consumer.
2. **`reconcile` is a plain function.** It takes the writer, the live registrations, the
   wanted identities and each one's current policy, resource and state, calls only
   `writer.register` and `handle.unregister`, and returns the next live map. Its rules
   (first reconcile registers in wanted order; an unchanged identity makes no call; a
   changed `atom`, `kind`, `wraps` or `marker` unregisters then re-registers; a dropped id
   only unregisters; a new id only registers; a missing current entry falls back to the
   identity's own policy and `Pending`; a wrapping identity registers its marker's element
   and a non-wrapping one `undefined`) are tested against a recording fake writer, with no
   rendering (`GateWriter.reconcile.test.ts`).
3. **`useGate.ts` holds the hooks.** `KIND_FACTS`, `GateScope`, `GateScopeContext`,
   `GateRead`, `Gates`, `useGates` and `useGateRegistrations` moved there from
   `GateWriter.ts`; `useGate` was already there. The file stays out of the barrel.
   `useGateRegistrations` calls `reconcile` from one effect and keeps the refs React needs.
4. **`GateAtoms = Pick<QadiAtoms, "decision" | "decisions">`.** The restatement and the
   header paragraph explaining it are gone. The `QadiAtoms` import is type-only and sits
   in the module nothing in `QadiAtoms.ts`'s import closure reaches, so no cycle forms
   (`pnpm circular` is green).
5. **`useGateRegistration` is removed.** It was a one-line wrapper over
   `useGateRegistrations` with no production caller. Its seven lifecycle cases were
   retargeted to `useGateRegistrations(writer, [identity], [state])` first, with unchanged
   assertions, so no lifecycle rule lost its only test.
6. **ADR-QD-080 and ADR-QD-111 hold in everything else.** The private slot, the override,
   the writer resolved once by the provider, off meaning absent, and
   `MissingQadiProviderError.ts` as a leaf module are unchanged.

## Consequences

- **No export is added or removed** (`pnpm spec:api`: 906 exports, no drift), and no
  rendered output changes, so the changeset is a `@qadi/react` patch. BEH-QD-068,
  BEH-QD-233, INV-QD-046 and INV-QD-064 hold as written; none was added or reworded.
- **The edge list after the split.** `GateRegistry.ts` imports `GateWriter.ts` and
  `DeveloperSignals.ts`. `QadiAtoms.ts` imports `GateRegistry.ts`, `HydrationEngine.ts`,
  `DeveloperSignals.ts`, `DecisionOutcome.ts` and `QuestionBook.ts`. `useGate.ts` imports
  `GateWriter.ts`, `QadiAtoms.ts` (type), `DecisionOutcome.ts`, `MissingQadiProviderError.ts`
  and `QuestionBook.ts`. `QadiProvider.tsx` imports `GateScopeContext` from `useGate.ts` and
  `gateWriterFor` from `GateWriter.ts`. `hooks.ts` and `components.tsx` import `useGate.ts`.
- **One moved block and two import lines per caller.** About 300 lines moved between two
  files; the only test edit is one import in `GateWriter.test.tsx`.
- **A future reviewer's proposal to publish the registry types from `GateRegistry.ts`
  has an answer on record**: the barrel publishes `gateWriterFor`, or the private slot
  moves elsewhere and closes a type cycle.
- **Per-file mutation scores redistribute**, because the hooks now count under
  `useGate.ts` and the write side with `reconcile` under `GateWriter.ts`. The comparison
  in `28-mutation-base.json` is per file and over the six files together.

## Alternatives considered

- **Extract `reconcile` only (option B).** The files and the import direction stay and
  `GateAtoms` stays structural. It removes the effect-only rules, and leaves the
  restated signature and the cycle paragraph. Rejected by the user's decision above.
- **Keep everything and record why (option C).** The barrel and the private slot are real
  constraints, but they forbid the review's form, not a split along the write-side and hook
  line. Rejected for the same reason.
- **The review's form: the registry types in `GateRegistry.ts`.** Publishes
  `gateWriterFor`, or closes a cycle; see Context.
- **Keep `useGateRegistration`.** A wrapper with no production caller, kept alive by the
  tests that drove it. Its tests now drive the hook it wrapped.

Related: [ADR-QD-037](037-circular-imports-and-type-level-tests-are-gates.md),
[ADR-QD-080](080-a-gate-registry-belongs-to-its-atom-set.md),
[ADR-QD-099](099-entry-points-are-a-closed-list.md),
[ADR-QD-111](111-a-gate-writer-is-resolved-once-by-its-provider.md),
[INV-QD-046](../invariants.md#inv-qd-046-instrumentation-never-changes-what-a-guard-renders),
[INV-QD-064](../invariants.md#inv-qd-064-a-guard-is-listed-only-by-the-registry-its-provider-writes-to).
