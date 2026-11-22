# ADR-QD-152 — Each hydration drop reason is stated once, with its kind

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-152                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-14                                     |
> | Status         | Accepted — amends ADR-QD-123 and ADR-QD-037    |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-22): amendment — every drop reason is a compile error until it is produced and reported (ARCH-117, ADR-QD-183, CCR-QD-462)<br>1.0 (2026-11-14): Initial (ARCH-86, CCR-QD-430) |

---

## Context

The nine hydration drop reasons were written out in `@qadi/core` three times over: as the members
of `DehydrationDropReason` and `ClientHydrationDropReason`, as the hand list
`hydrationDropReasons`, and as the rows of `MEANINGS`. Seven of them were written out again in
`@qadi/react`, as the members of `PayloadRefusalReason` and `EntryDropReason`.

Adding a throwaway entry reason on the phase base needed five edits in three files, and the
compiler asked for one of them unprompted: the missing `MEANINGS` row, once the union had the new
member. With that row added the tree compiled clean, with `hydrationDropReasons` and react's
`EntryDropReason` still missing the reason. The reason then never reached the metric's
preregistered words or the devtools panel (a read of its row failed with no row at all), and every
runtime test stayed green: 25 of 25 in the core metrics file and 15 of 15 in the devtools
hydration file, whose length pin still said nine. Only the two type-level partitions noticed, one
test in each of core's and react's tstyche files. Mutation could not see it either:
`ignoreStatic` skips module-scope constants
([ADR-QD-076](./076-mutation-runs-skip-static-mutants.md)).

## Decision

**`HydrationMetrics.ts` holds one module-private table of the reasons, and everything else reads
it.** (ARCH-86, CCR-QD-430.)

1. **One table, one row per reason.** `as const satisfies { readonly [reason: string]:
   HydrationDropRow }`, each row holding `kind` (`dehydration`, `payload` or `entry`), `summary`
   and `remedy`, with the reason's doc on its row. Its keys are declared in the order the metric
   preregisters them and the devtools panel shows them.
2. **The unions are read off it.** `HydrationDropReason` is the table's keys. The new
   `HydrationDropReasonOf<K>` is the keys whose kind is `K`, with `K` constrained to the three
   kinds. `DehydrationDropReason` and `ClientHydrationDropReason` keep their names, as
   `HydrationDropReasonOf` of their kinds.
3. **The guard, the list and the meaning are read off it.** `isHydrationDropReason` tests an own
   key with `Object.hasOwn`, so an inherited name such as `toString` is not a reason.
   `hydrationDropReasons` is `Object.keys` of the table narrowed by that guard, so it needs no cast
   and keeps declaration order. `hydrationDropMeaning` returns the row, typed
   `HydrationDropMeaning`. `MEANINGS` is gone.
4. **`HydrationDropRow` is exported** because a row without a kind is a negative a type-level test
   must be able to name.
5. **React derives its groups.** `PayloadRefusalReason` and `EntryDropReason` are
   `HydrationDropReasonOf<"payload">` and `HydrationDropReasonOf<"entry">`. Its dispatchers are
   unchanged.
6. **The metric is untouched.** `qadi_hydration_dropped_total` keeps its declaration, id,
   description and `preregisteredWords` source, because the registry key includes the description
   ([ADR-QD-123](./123-a-metric-is-declared-once.md)).
7. **The guards.** The nine words are written out, in order, and read off the metric at zero in
   `HydrationMetrics.test.ts`. The existing written-out lists there and the devtools length pin stay
   as independent oracles. `HydrationMetrics.tst.ts` pins the partition, each kind written out, and
   the kind-less and unknown-kind rows refused through tstyche's checked `@ts-expect-error`
   directives, which replace its deprecated `toRaiseError`
   ([ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md)). React's
   `Hydration.tst.ts` pins its two groups written out.

## Alternatives considered

- **Keep the unions and lists and rely on review.** The base experiment compiled half-added.
- **An array of rows.** The order is explicit, but a lookup by reason needs a search or a second
  map, and two rows can share a reason.
- **`Struct.keys`.** Unverified in this Effect version.
- **A cast of `Object.keys`.** Forbidden, AGENTS.md §6.
- **An `in` test for the guard.** An inherited name passes it.
- **`Extract` in react.** It still writes the words out.
- **Exporting the table.** A third public surface beside the list and the meaning.
- **Exporting only the kind union.** The kind-less negative needs the row constraint.
- **A reason-keyed record in react's payload path, so a new payload row fails to compile.** It
  would reshape `HydrationEngine.ts`, which a later phase shares, and the reporters already read a
  new reason's meaning from its row.

## Amendment (2026-11-22, CCR-QD-462): every drop reason is a compile error until it is produced and reported

The alternative this decision turned down, a reason-keyed record in react's payload path, is taken by
[ADR-QD-183](./183-hydration-drop-events-are-derived-from-their-buckets.md), because the reason given, a later phase
sharing `HydrationEngine.ts`, no longer holds. The consequence below that a `payload` or `dehydration` row compiles
everywhere is amended: an `entry` row is a compile error at the hydrate side's bucket constructor in
`HydrationBuckets.ts`, a `dehydration` row at the dehydrate side's, and a `payload` row at `HydrationEngine.ts`'s
`PAYLOAD_PRODUCERS`, each until the reason is collected or produced and reported. Every other decision here is
unchanged.

## Consequences

- `@qadi/core` gains two public types, `HydrationDropReasonOf` and `HydrationDropRow`, so the
  change is a minor changeset. Every existing name keeps its type.
- The object `hydrationDropMeaning` returns now carries `kind` at run time, while its type stays
  `HydrationDropMeaning`. `@qadi/react` takes a patch.
- A new reason is one row. An `entry` row reaches the metric's words and the panel at zero, and is
  a compile error at `HydrationEngine.ts`'s `bucketOf` (TS2741) until it has a bucket. A `payload`
  row compiles everywhere, because react's payload map is keyed by the decoder's refusal and not by
  reason: it reaches the metric, the panel and the reporters with its meaning, but nothing emits it
  until a refusal that produces it is written. A `dehydration` row likewise.
- The written-out oracles go red on any new row, by design.
- Devtools and the example are unchanged.
  [ADR-QD-041](./041-a-mismatch-is-announced.md)'s sentence placing each meaning next to the union
  that defines the reasons now reads as the row of the table that defines them.
- [INV-QD-323](../invariants.md#inv-qd-323-each-hydration-drop-reason-has-exactly-one-kind-and-the-kinds-partition-the-reasons)
  states the partition; [INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for),
  [BEH-QD-230](../behaviors/19-hydration.md#beh-qd-230-a-payload-that-seeds-nothing-says-why) and
  [BEH-QD-231](../behaviors/19-hydration.md#beh-qd-231-what-crossed-the-network-is-counted-at-both-ends)
  are amended in place.

## Related

[ADR-QD-123](./123-a-metric-is-declared-once.md),
[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md),
[ADR-QD-041](./041-a-mismatch-is-announced.md),
[ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md),
[ADR-QD-076](./076-mutation-runs-skip-static-mutants.md),
[INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for),
[INV-QD-323](../invariants.md#inv-qd-323-each-hydration-drop-reason-has-exactly-one-kind-and-the-kinds-partition-the-reasons),
[BEH-QD-230](../behaviors/19-hydration.md#beh-qd-230-a-payload-that-seeds-nothing-says-why),
[BEH-QD-231](../behaviors/19-hydration.md#beh-qd-231-what-crossed-the-network-is-counted-at-both-ends).
