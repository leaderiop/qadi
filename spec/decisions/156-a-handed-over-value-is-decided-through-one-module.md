# ADR-QD-156 — A handed-over value is decided through one module

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-156                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-15                                     |
> | Status         | Accepted — extends ADR-QD-104                  |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-15): INV-QD-108 link uses the restated heading's anchor (ARCH-90, CCR-QD-434)<br>1.0 (2026-11-15): Initial (ARCH-90, CCR-QD-434) |

---

## Context

Architecture review #6 found that `Qadi.ts` decided a handed-over value in two independent paths and wrote the rule
"the resource decided on is the value handed over" four ways.

- **Two paths to one verdict.** `permitted` served the effect shapes and `decideOne` served the collections. Each
  evaluated, discharged what an allow obliges, and said whether the value may pass. Two implementations of who passes
  eventually disagree, and the one that disagrees by allowing does not announce itself
  ([ADR-QD-022](./022-subject-set-evaluation.md) made the same argument for subject sets).
- **`project(decision, value)` written four times**, once per projecting entry point, so a change to how an admitted
  value is released had four places to be made.
- **The resource set three ways.** `withLoadedResource` for the loaded entry points, a spread over the caller's options
  in `guard`, and a per-item spread in `decideOne`.
- **A resource accepted and ignored.** `guard` and the four `filter*` entry points took an `options.resource` and then
  discarded it, which is the shape of the [INV-QD-032](../invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)
  defect. [ADR-QD-104](./104-a-projected-read-decides-against-the-value-it-projects.md) refused a second resource only on
  `enforceProjected` and the two loaded entry points.

## Decision

**A handed-over value is decided through one module.** (ARCH-90, CCR-QD-434.)

1. **The module.** `packages/core/src/Handover.ts`, package-private ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)),
   owns:
   - the options types: `EnforceOptions`, `HandoverOptions`, `ObligationDischarge` and `ObligationHandler`;
   - `discharge`, the obligations an allow owes, run before the value is handed over;
   - the one allow-or-deny branch, `verdictOf`, which evaluates, discharges and answers a `Verdict` (`Admitted` or
     `Refused`) without deciding what a refusal means;
   - the only two places a resource is set or dropped: `resourceFree` and `decidedOn`;
   - the one `project(`, in `RELEASE`, a closed table over `Release` (`Whole` or `Projected`): a member missing from
     it is a compile error, as in `FieldLattice.ts` ([ADR-QD-092](./092-field-strategy-meaning-lives-beside-the-lattice.md));
   - the per-item step, `handOver`, which the array and the stream form of a collection share.
2. **The entry points are adapters by shape.** `Qadi.ts` keeps all ten. The effect shapes (`assert`, `enforce`,
   `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`) go through `admittedOrDenied`, which turns a
   refusal into `AccessDenied` at the one construction site, `accessDenied`. The array forms (`filter`,
   `filterProjected`) are `Effect.forEach` over `handOver` followed by `keptInOrder`. The stream forms (`filterStream`,
   `filterStreamProjected`) are `Stream.mapEffect` over `handOver` followed by `Stream.filterMap`.
3. **`LoadedEnforceOptions` is renamed `HandoverOptions`, with no alias** (**Breaking**). It is the options type of all
   eight entry points that hand over a value: `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard` and
   the four `filter*`. `enforce` and `assert` keep `EnforceOptions`, because the work they wrap is not a resource and
   there is no second channel to reconcile. `resource?: never`, so a second resource is a compile error at every entry
   point that would otherwise ignore it. At runtime an untyped caller's `resource` is dropped, so `enforceProjected`
   decides with none and every other entry point decides on the value it was handed.
4. **`guard` adapts the module directly, not over `enforce`.** `enforce` takes a resource in its options, so
   `guard` over `enforce` would need the very spread this decision removes. `guard` calls
   `admittedOrDenied(policy, decidedOn(options, resource))`, so the positional resource is set in exactly one place.
5. **What does not change.** No span is added or removed: `discharge` keeps its span and no adapter gains one. Obligation
   discharge, `AccessDenied` and the sink record stay one implementation ([ADR-QD-019](./019-obligations.md)).
   `@qadi/promise`'s `filter` and `filterProjected` refuse `resource` (`Omit<FacadeOptions, "resource">` with `resource?: never`), so the facade refuses the
   resource too, with no branch of its own ([ADR-QD-032](./032-promise-facade.md)).

## Alternatives considered

- **Keep the collections' second path.** Rejected for ADR-QD-022's reason: two implementations of who passes eventually
  disagree, and the one that disagrees by allowing does not announce itself.
- **`guard` over `enforce`.** Rejected: `enforce` takes a resource in its options, so the adapter would need the spread
  over the options that this decision removes, and `guard` would set the resource in a second place.
- **`Match.value` over the release.** Rejected: it loses the per-key return type (`Whole` returns the caller's own
  reference, `Projected` a `Partial`); the closed mapped table follows ADR-QD-092.
- **Keep `LoadedEnforceOptions` as an alias.** Rejected: the old name says "loaded", which `guard` and the `filter*` entry
  points are not, and an alias would keep two names for one type.
- **Export `Handover.ts`.** Rejected by ADR-QD-099: an entry point is a closed list, and the module is the internals of
  ten adapters, not an interface a consumer needs.

## Consequences

- [INV-QD-108](../invariants.md#inv-qd-108-a-handed-over-value-is-the-evaluated-resource) covers eight entry points rather
  than three.
- [INV-QD-013](../invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation)'s paragraph on the two
  paths goes, and a new invariant states that the array and stream forms of a collection agree.
- Two **Breaking** changesets (`@qadi/core`, `@qadi/promise`) and two `0.13` upgrade sections carry the rename and the
  newly refused resource.
- Mutation is measured on `Qadi.ts` and `Handover.ts`. No house-style budget changes.

## Related

- [ADR-QD-104](./104-a-projected-read-decides-against-the-value-it-projects.md), which this extends
- [ADR-QD-105](./105-an-obligation-is-discharged-against-the-question-it-answered.md)
- [ADR-QD-019](./019-obligations.md)
- [ADR-QD-022](./022-subject-set-evaluation.md)
- [ADR-QD-035](./035-witness-guard-primitive.md)
- [ADR-QD-092](./092-field-strategy-meaning-lives-beside-the-lattice.md)
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md)
- INV-QD-009, INV-QD-013, INV-QD-032, INV-QD-108, BEH-QD-055, BEH-QD-324
