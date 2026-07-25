# ADR-QD-014: React integrates through Effect atoms

> **Status:** Accepted
> **Date:** 2026-07-26
> **Supersedes:** the `ManagedRuntime` integration described in revision 1.0

## Context

Evaluation returns an `Effect` (ADR-QD-004), so React cannot call it during
render. Something has to supply the Qadi services, run the effect, hold the
result, and re-run it when the answer could have changed.

The first version of this package did all of that by hand: a `ManagedRuntime`
on a context, `runPromiseExit` in a `useEffect`, and `{ decision, allowed,
loading, error }` in component state. It worked, and it had three problems that
were not going to get better.

**Every component evaluated independently.** A list of fifty rows each asking
`useCan(canEdit)` ran fifty evaluations of one identical rule, each with its own
resolver calls. Nothing connected them, because component state cannot be
shared between components.

**Nothing could invalidate a decision.** Authority changes without the subject
object changing — a role granted, a grant revoked, a document reassigned. The
only way to re-check was to construct a new subject object and hope every hook
noticed.

**There was no vocabulary for staleness.** A boolean `loading` cannot express
"we have last minute's answer and are checking again", which is precisely the
state a cache is in most of the time.

`effect/unstable/reactivity` is a reactive graph for exactly this: `Atom` for a
node of derived state, `AtomRegistry` for the store that computes and disposes
it, `AsyncResult` for the three-state value, and `Reactivity` for keyed
invalidation. Building a private version of it inside a React context was the
alternative, and a worse one.

## Decision

`@qadi/react` is a binding over `effect/unstable/reactivity`. No additional
dependency: the React glue is one `useSyncExternalStore` call in
`QadiProvider.tsx`, so the package depends on `effect` and `react` and nothing
else.

`makeQadiAtoms(layer)` builds one authorization context: a writable `subject`
atom, an `Atom.family` of decisions keyed by policy, a second family keyed by
policy and resource, and an `invalidate` function atom. `QadiProvider` owns an
`AtomRegistry` and seeds the subject into it at construction. Every hook is a
read of an atom.

Three consequences of that choice are load-bearing enough to state as rules:

**One evaluation per question.** `Atom.family` memoises on the policy, so
components asking the same question share one atom, one evaluation, one set of
resolver calls — however many of them there are.

**No subject means `Initial`, not `Deny`.** The decision atom returns an effect
that never settles while the subject is unknown. A pending decision and a
refused one are different answers, and rendering the second while waiting for
the first tells the user they are forbidden from something they may well be
allowed to do.

**Isolation is structural.** Two calls to `makeQadiAtoms` produce two disjoint
sets of atoms, and each `QadiProvider` owns its own registry. A multi-tenant
application cannot leak a decision between tenants by forgetting to configure
something, which is what replaced the predecessor's cloned hook factory.

## Consequences

**Positive**:

- One evaluation per distinct question, independent of how many components ask.
- Invalidation is a first-class operation, keyed through `Reactivity`.
- `AsyncResult` distinguishes not-yet-known, decided, and could-not-determine,
  so an attribute-backend outage never reads as a denial (INV-QD-006).
- Caching, sharing, and disposal are testable without rendering anything: the
  registry-level suite in `QadiAtoms.test.ts` renders no components at all.
- The clone is gone. Isolated contexts are the same code path as the default.

**Negative**:

- `effect/unstable/reactivity` is unstable by name. Its API may move before 4.0
  is released, and this package moves with it.
- Policies are keyed by reference, so one built inline in render produces a new
  atom on every render (BEH-QD-069).
- The registry is a second lifetime to reason about alongside React's, which is
  why `QadiProvider` defers disposal past a development-mode double mount.

**Trade-off accepted**: depending on an unstable module is worth it. The
alternative was not "no dependency" — it was a private, less-tested
reimplementation of the same graph, which is what the first version already was.

**Rejected**: `@effect/atom-react`, the official React binding. It supplies the
same `useSyncExternalStore` glue written here, plus Suspense helpers, hydration
and scoped atoms this package does not use. Fifty lines of binding is not worth
a dependency and a `scheduler` peer.
