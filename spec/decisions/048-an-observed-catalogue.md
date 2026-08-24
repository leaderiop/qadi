# ADR-QD-048 — The catalogue is observed, not registered

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-048                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-068) |

---

## Context

Screens 3 and 4 — the policy explorer and the role viewer — were both recorded
as blocked on the same thing: *nothing enumerates named policies*. The design
document offered two ways out, "either the devtools is handed a policy map by
the app, or a registry is designed", and left it there.

Auditing the other three screens first changed the question. Three of the five
gaps `02-screens.md` records had already closed — `permissionProvenance` landed
with paths, four port shapes gained `name?`, `PortMetrics` was written,
`DecisionCache` gained `size` and `clear`, and `QadiAtoms.asked()` was built
precisely so screen 7 could be keyed by question. What was left was one gap
shared by two screens, not five gaps across five.

That matters, because a registry designed to unblock five screens is worth more
than one designed to unblock a left rail.

## Decision

**The catalogue is derived from the timeline, and declaration is additive.**

Every `DecisionRecord` carries the `Policy` it evaluated
([BEH-QD-183](../behaviors/24-decision-sink.md)), so the set of policies an
application actually uses is already in the log. `policiesSeen` groups them,
counts their verdicts and orders them by the timeline's own ordering, reversed.
An optional `catalogue` prop adds names and the policies that have not run.

Three consequences, each checked rather than remembered:

**No new core concept.** There is no `PolicyRegistry`, no registration call
site, and no service that exists only for a debug view. A registry would buy
exactly one thing the observation does not — policies nobody has evaluated —
and the prop supplies those at a fraction of the cost.

**Identity is `Equal.equals`.** Structural for plain objects in Effect v4, and
already pinned by `packages/react/test/v4-reactivity-smoke.test.ts` because
`Atom.family` depends on it to share one atom between two equal policies. The
devtools now depends on that pin too, and `Catalogue.test.ts` asserts the
property directly rather than inheriting it silently. Writing a structural key
here instead would be a second interpreter over the policy tree, which is the
shape [INV-QD-018](../invariants.md) treats as a defect.

**Roles are not observable at all.** A role is a value the application holds and
never crosses a record, so screen 4's list comes only from the prop, and its
empty state says so rather than implying the log should have had them.

## Alternatives considered

**A `PolicyRegistry` service**, on the `PermissionRegistry` precedent in
`@qadi/http`. It gives a complete catalogue including never-evaluated policies,
at the cost of a core concept, a call site per policy, and a service whose only
consumer is a panel. It also has a failure mode observation does not: a policy
someone forgot to register is invisible *and* looks deliberate, while a policy
that has never run is visibly marked as such.

**The prop alone**, with no derivation. Simplest to reason about and useless by
default: a deployment that passes nothing gets an empty screen, which is exactly
the deployment most likely to be debugging.

## Consequences

- (+) The screen works with no application change at all.
- (+) The rail's counts are the log's counts, so it cannot disagree with screen 1.
- (+) Ordering is borrowed from the timeline rather than re-derived, so `NaN` is
  solved once (INV-QD-039) rather than twice.
- (−) A policy that has never been evaluated appears only if the application
  names it. Stated on the screen rather than left to be discovered.
- (−) Two different policies can derive the same display label. They remain two
  entries, because the label is never the identity — but a reader sees two rows
  reading the same, and `labeled` is the fix.
