# ADR-QD-080 — A gate registry belongs to its atom set

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-080                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-04                                     |
> | Status         | Accepted — amends ADR-QD-053                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-04): Initial release (CCR-QD-160) |

---

## Context

[ADR-QD-053](053-a-gate-can-be-found.md) chose a module-scope `Map` for the guards
recording that they exist. It was the right shape for one provider and it is
wrong for the second one, and reading it closely against the atom set turned up
four defects with one root.

**"What is asked" and "what is asking" had different scopes.** `QadiAtoms.asked()`
belongs to an atom set; the guard registry belonged to the process. Two atom sets
(two tenants, a component playground, two React roots) both appeared in one
`gateInstances()`, which carried no field naming whose guard was whose. If two atom
sets asked an `Equal.equals`-equal question, tenant B's guards were listed under
tenant A's row, because the devtools grouping cannot tell them apart.

**A mounted guard could vanish.** React's `useId` is unique within a root. A
*client* root draws ids from one global counter and does not collide, but a
*hydrated* root derives them from tree position, so two hydrated roots mint the
same id. The second registration silently replaced the first, the panel lost a
guard that was still mounted, and nothing repaired it.

**The write side was public and contradicted its own rationale.** `useGate` is kept
out of the barrel because "the kind is not a caller's to choose; a consumer able to
pass one could register a `<Can>` that does not exist." `registerGate` let exactly
that consumer do exactly that.

**Tests shared process state.** `clearGatesUnsafe` existed only because every test
wrote to one scope, and was coupled into the acceptance suite's `Before` hook.

## Decision

**Each atom set owns one gate registry, `atoms.gates`, and the write side is a
handle only `@qadi/react` can reach.**

- `makeGateRegistry()` builds a value with a read side, `instances()` and
  `subscribe()`, both plain functions with stable identity, safe for
  `useSyncExternalStore`. `makeQadiAtoms` builds one per atom set, so "asked" and
  "asking" share one scope and one lifetime.
- `QadiProvider` writes to `atoms.gates` unless handed `gates={registry}`, for the
  host that wants one registry over several atom sets (a micro-frontend shell). The
  host then owns the join with `asked()`. The registry must come from
  `makeGateRegistry()`; a hand-built object has no writer, so its guards register
  nothing and render no marker, and a development warning says so.
- Registration returns a **handle**, `{ update, unregister }`, closed over its own
  key. The `owners` token map the old module used to stop a stale cleanup evicting a
  newer registration is gone: the handle *is* the token, so the property is
  structural instead of checked. The handle is reachable only through a side table
  keyed on the registry object (`GateWriter.ts`, out of the barrel), the precedent
  hydration's seed lookup set before it became a closure the atom set owns
  (ADR-QD-078).
- **Ids are unique per snapshot.** If an id is already held by a different live
  registration, the new entry gets `${id}~${n}` and the registry reports the
  collision once per id. The default reporter (in `HydrationWarning.ts`, the one
  console confinement point, ADR-QD-041) warns in development and names the real
  fix: a distinct `identifierPrefix` per root. `data-qadi-gate` keeps React's raw
  `useId`, because it must stay hydration-stable.
- Hosts read through `instances`/`subscribe`, which work outside React, or
  `useGateInstances()` inside the provider, which reads the effective registry.

## Consequences

**Breaking, with no shim.** `gateInstances`, `subscribeGates`, `registerGate`,
`updateGateState` and `clearGatesUnsafe` are removed, and `QadiAtoms` gains a
required `gates` member, so a hand-written `QadiAtoms` double stops compiling. A
compile error at every old call site is the correct failure mode for a closed
shape; a shim would be a global under another name. An aggregating shim needs a
module-level registry of registries (the global this removes) and `WeakRef` timing
that cannot be tested; a default-registry shim has two sources of truth and keeps
the hydrated-root collision alive. The changeset carries the exact migration.

**Both AGENTS.md §13 rules still hold, and are checked.** Decisions are not in React
state: a registry holds who is asking and what each guard rendered, never a verdict
(ADR-QD-017), and `useGateInstances()` puts guard *instances* into a host's render,
the host-subscription shape ADR-QD-053 already sanctioned. Off still means absent:
the React tests that predate this change pass byte-identical, and an empty registry
is an allocation, not a behaviour. The registry is plain closure state, never an
`Atom` in an `AtomRegistry`, so ADR-QD-014's scheduler knobs stay untouched.

**`@qadi/devtools` is still independent.** It reads `GateInstanceLike`
structurally; only comments and one empty-state string changed there.

## Alternatives considered

- **Provider-owned registry.** Isolates per provider, but mismatches `asked()` (per
  atom set, shared by every provider over it) and is unreachable from a dock in a
  second root or a test after unmount.
- **Explicit registry only.** Maximum control and a new required wire for every
  host. Kept as the opt-in override above.
- **An `Atom` per provider.** Provider-scoped again, dropped when nothing
  subscribes, and routes every registration through `AtomRegistry` dispatch, the
  area ADR-QD-014 fences off.
- **A registry-minted id prefix** (`g1:_R_0_`). Rejected: not hydration-stable. The
  server's atom set is module-scoped across requests, so server and client counters
  disagree, React does not patch a mismatched attribute, and the marker would carry
  the server's value forever.
- **Last write wins** (status quo). Loses a mounted guard.

Related: [ADR-QD-053](053-a-gate-can-be-found.md),
[ADR-QD-078](078-a-seed-is-its-own-type-and-the-payload-is-versioned.md),
[INV-QD-064](../invariants.md#inv-qd-064-a-guard-is-listed-only-by-the-registry-its-provider-writes-to).
