# ADR-QD-053 — A guard can say that it exists, and be found on the page

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-053                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-073) |

---

## Context

The devtools React panel was scoped on a conclusion this decision withdraws.
`02-screens.md` asked for "every `<Can>`/`<Cannot>`/`useCan`/`useDecisionSuspense`
instance with its render state" and a highlight lens, and the gap note answered:

> Per-instance enumeration and DOM highlighting are not unimplemented; they are
> **unobtainable** without adding an instance registry, which is a design change
> to `@qadi/react` and not a devtools feature.

BEH-QD-217 then made it normative — *"A per-instance count MUST NOT be
claimed"* — and the panel said so on screen, adding that "an instance registry
would breach AGENTS.md §13 twice over."

**The premise is true and the conclusion does not follow.** `Atom.family`
compares with `Equal.equals`, so ten `<Can policy={isAdmin}>` in different places
are one atom. What that establishes is that the **atom layer** cannot
distinguish instances. It was read as establishing that nothing can. A component
knows perfectly well that it exists; nothing was asking it.

Nor does a registry breach §13. Both rules it was said to breach survive intact,
and are checked rather than asserted — see **Consequences**.

The question that motivates all of this is one a reader arrives at the panel
holding: **why is this button missing?** A list of questions cannot answer it. A
list of the components asking, with what each rendered and where it is, can.

## Decision

**A guard records that it exists, when the host asks for it, and the devtools can
point at it.**

### The registry

`GateRegistry.ts` is a module-scope `Map` a guard writes to from an effect —
the shape `HydrationSeed.ts` already uses for the seed lookup. An entry carries
the instance's `useId`, which surface it is, its policy, its resource, what it
rendered, and the marker element.

**Registration goes through one internal `useGate`.** The five surfaces nest:
`Can` reads a decision exactly as `useDecision` does, and `useCan` did so by
calling it. Registering in the primitive and again in its callers would report
one `<Can>` as two instances, the inner one labelled a hook its author never
wrote. Every surface calls `useGate` naming itself, and `useDecision` is simply
the case whose name is `"useDecision"`.

### Opt-in, and off means absent

`QadiProvider` takes `instrument`, defaulting to `false`. With it off no guard
registers and **no wrapper element is rendered** — not a wrapper with a no-op
style, no wrapper ([INV-QD-046](../invariants.md)). A consumer's DOM must not
change because they upgraded this package.

It is carried on the context rather than read from a global, so it is per
authorization context and a test can turn it on without touching process state.

On a production page an instance list tells any script what the current user may
and may not do, so it is guarded the way the dock itself is.

### The marker is `display: contents`

That is the whole reason a marker is affordable: it generates **no box**, so
children lay out exactly as if it were not there — flex, grid, margin collapsing
and adjacency selectors all unchanged.

The direct consequence is that the marker has no rect of its own, so
`marker.getBoundingClientRect()` returns zeros and a lens built on it would draw
every overlay in the top-left corner. **The lens measures a `Range` over the
marker's contents**, which measures what is actually there, text nodes included.

A guard that rendered nothing measures as a zero-area rect, and that is the case
the lens exists for rather than one to filter away: it is a **place with no thing
in it**, which is where the missing button would have been. It gets a caret and
its own colour, because a 0×0 overlay draws nothing and would report success.

### The element is carried, never looked up

The registry entry holds the element React's ref filled in. A `data-qadi-gate`
attribute is rendered for a person reading the DOM in a browser inspector and is
explicitly **not** the lookup — including for the pick direction, which walks up
from `elementFromPoint` comparing **identity** against the registry's own
entries.

This repository has already paid for the alternative once.
[ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md) found that
a metric re-declared with a description differing by a word gives a reader its
own registry entry and reads zero, silently. A selector agreed between two
packages that do not import each other is the same shape, and a reference cannot
drift. The first draft of `gateIdAt` used the selector; a test now pins that an
element carrying the attribute but not registered is not found.

### `@qadi/react` calls no DOM API

It renders a span and holds a ref. Measuring, drawing and hit-testing are
`@qadi/devtools`'s `react/Lens.ts` — the only file in either package that touches
`document`, kept in one named module for the reason `HydrationWarning.ts` confines
`console`.

## Consequences

**The panel shows both views, and they are different questions.** `asked()` says
what has been **asked** — the atom's view, keyed by question, unchanged and still
required by BEH-QD-217. `gateInstances()` says who is **asking**, listed
underneath. `gateGroups` groups through the same `Equal.equals` the atom family
uses, so a group is exactly an atom and the panel cannot claim two questions where
the evaluator sees one.

**Both §13 rules survive, and the survival is checked.** Decisions stay out of
React state: the registry holds who is asking, never what the answer was, and
nothing re-renders because a guard registered. The React glue is still **one**
`useSyncExternalStore` call in `QadiProvider.tsx` — the registry exposes
`subscribe` and a snapshot, and it is `@qadi/devtools`, a DOM package already,
that subscribes.

**Enumerable is not the same as locatable.** A hook has no node of its own, so it
appears in the list and its highlight is disabled with the reason on it. A panel
that offered the button anyway would offer one that silently does nothing.

**Picking swallows a click only when it found a guard.** Otherwise the dock's own
controls would stop working the moment the mode was on. It has three exits — the
pick, `Escape`, unmount — because a debugging mode that can be entered and not
left makes the page unusable until it is reloaded.

**Two stale claims in ADR-QD-014 were found while amending it** and are corrected
there: policies are keyed **structurally**, not by reference, so inline does not
defeat sharing; and the citation for that claim pointed at BEH-QD-069, which is
about invalidation.

## Alternatives considered

**Leave it unobtainable.** The honest reading of the original note, and the one
this decision reverses. It answers "what has been asked" to a reader who came
asking "where is my button".

**Key the panel by instance instead of by question.** Would break BEH-QD-217's
surviving requirement and make the panel disagree with the evaluator about how
many questions exist. The two views coexist; neither replaces the other.

**A wrapper `<div>` or `<span>` with default styling.** Changes layout the moment
somebody starts debugging, so the bug moves. `display: contents` is not a
convenience here, it is the enabling condition.

**Always instrument, and let a bundler drop it.** Nothing to drop: the
registration is reachable code and the marker is rendered. It would also publish
a live authorization map on every production page.

**A `[data-qadi-gate]` selector for both directions.** Rejected on ADR-QD-052's
evidence, and the first draft of `gateIdAt` had already made the mistake.
