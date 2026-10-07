# ADR-QD-103 — A question is opened once, in a book its atom set owns

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-103                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Accepted — amends ADR-QD-053, ADR-QD-080, ADR-QD-025 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-07): Initial (ARCH-23, CCR-QD-201) |

---

## Context

An atom set identified a question twice, by two `Atom.family` instances (one keyed by policy, one
by policy then resource), and three callers re-derived which to use. Its liveness was spread over a
doc-comment-sized struct, a callback, two constructors and a sweep, testable only by mounting atoms
in a registry. `usePolicies` read through a third, module-scope family, bypassed the gate registry
and could not be seen by the devtools "asking" view.

And one defect: `effect`'s `Atom.family` holds its **values** in `WeakRef`s. Nothing held a
question's atom strongly (`decision` returned the wrapper's `read` and dropped the wrapper;
`hydrate` returned its `seed` and dropped it). After a garbage collection the same question got a
**new** atom — a second evaluation and a second `DecisionSink` record, a second `asked()` row, and a
hydrated seed lost if the collection landed between `hydrateDecisions` and the first read (the gate
showed `Pending` and the client decided, so it failed closed, but hydration silently did nothing).
Nothing in the suite could see it, because nothing forced a collection.

## Decision

- **`QuestionBook.ts`** (internal, out of the barrel) owns a question's identity, liveness,
  eviction and enumeration. Keys are `{ policy, resource }`, structural (`MutableHashMap`,
  `Equal.equals`), handles held **strongly** while tracked. It is generic over its handle, imports no
  `effect/reactivity` module and no local module, and is tested with plain objects. The atom set is
  its one adapter: the handle is a `SeededQuestion`, and the reader's `get.addFinalizer` is the
  release `live()` returns. `AskedQuestion` is declared there and re-exported from `QadiAtoms.ts`.
- **One opener.** `QadiAtoms.decision(policy, resource?)`; `decisionFor` is **removed** (breaking).
  Hooks lose their `resource === undefined ?` branch. `QadiAtoms.decisions(questions)` is the grouped
  read, built in the atom set's closure, which removes `hooks.ts`'s module-scope `combinedFamily`.
- **Eviction forgets the handle.** A swept question's next `open` builds a fresh handle; a registry
  still holding the old handle re-admits it when its reader runs, unless a newer entry owns the key
  (then it stays out of `asked()`, so a question is never listed twice). The sweep is one pass.
- **`{ read, seed }` stays internal** (ADR-QD-039): a public seed is the bypass that ADR exists to
  prevent. The public side is the read alone.
- **`usePolicies` is a gate registration.** `GateKind` is the closed union
  `Can | Cannot | useCan | useDecision | useDecisionSuspense | usePolicies | useProjected |
  useQuestions`; a hook asking several questions registers one `GateInstance` per entry
  (`<useId>/<name>`), through `useGateRegistrations`, of which `useGateRegistration` is the
  one-element case. `useQuestions` is new: a policy and optionally a resource per entry.
  `usePolicies` is its policy-only case.
- **Mutation scope.** `stryker.react.mjs` also mutates `QuestionBook.ts`, break threshold unchanged.

### Decisions taken (ARCH-23)

| Id | Choice |
| -- | ------ |
| D-23-a | Widen `decision` to `(policy, resource?)`; no public handle object |
| D-23-b | Remove `decisionFor` |
| D-23-c | The book owns keying, strong map (not a flattened `Atom.family`) |
| D-23-d | `usePolicies` registers one instance per entry, kind `usePolicies` |
| D-23-e | Add `useQuestions` |
| D-23-f | `decisions` on the atom set; no module-scope family |
| D-23-g | Mutate `QuestionBook.ts` |
| D-23-h | Key on React's own `AskedQuestion`; core's `Question` carries a subject and options, so it never becomes a React key (a projection would be added, not an alias) |

## Consequences

- BEH-QD-065's "same atom" is precise: for as long as the question is tracked, whatever the
  collector does (INV-QD-105).
- A cold question's seed, written and never read, can be forgotten with its row once more than
  `maxTrackedQuestions` (default 500) questions are cold. The provider's first sweep runs after its
  children have rendered and retained their questions.
- A hand-written `QadiAtoms` double must add `decisions`; `decisionFor` call sites become
  `decision(policy, resource)`.
- A host's exhaustive `Match` over `GateKind` gains two members. `@qadi/devtools` is unaffected:
  `GateInstanceLike.kind` is a `string` and the panel shows an unknown kind as itself.
- ADR-QD-014 holds: still exactly one `Atom.readable` per question, no `scheduleTask`/`defaultIdleTTL`.

## Alternatives considered

**A public `{ read, seed }` handle** (the review's literal target). Wrong, not costly: ADR-QD-039.

**Keep `Atom.family`, flatten to one family keyed by `{ policy, resource }`, hold the handle in a
strong array.** Fixes the defect but keeps two caches to keep consistent (the family and the
tracking), and a swept question's atom lingers until collection, which is why re-admission was a
special case. The book removes the second cache.

**Leave `usePolicies` unregistered and document it.** Cheaper, and leaves the panel showing a question
row with nothing under it.
