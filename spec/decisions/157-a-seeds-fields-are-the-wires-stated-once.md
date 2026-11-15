# ADR-QD-157 — A seed's fields are the wire's, stated once

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-157                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-15                                     |
> | Status         | Accepted — amends ADR-QD-078                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-15): Related: BEH-QD-556 and INV-QD-333 (ARCH-91, CCR-QD-435)<br>1.0 (2026-11-15): Initial (ARCH-91, CCR-QD-435) |

---

## Context

A hydration seed's fields were written three times in `@qadi/react`, and nothing tied them to the wire form in
`@qadi/core`.

- **The classes.** `SeededAllow` and `SeededDeny` wrote their field lists out in `SeededDecision.ts`.
- **`rebuild`.** In `HydrationEngine.ts` it copied `evaluationId`, `durationMillis`, `visibleFields`, `obligations` and
  `disclosure` by name to construct the seed.
- **The payload entry.** Already derived from `DecisionWire`
  ([ADR-QD-078](./078-a-seed-is-its-own-type-and-the-payload-is-versioned.md)), so the one statement that could not
  drift was the one that was not at risk.

So a field added to the wire's `common` reached the payload, and the client dropped it in `rebuild`, with the whole
workspace compiling. The Allow/Deny branch was also written three times: `dehydrateDecision`, `rebuild` and
`entryAgrees`.

**What it cost, measured on the phase base before any source change** (plan 44-01). One scratch field, `scratch:
Schema.String` in `DecisionWire`'s `common` with `scratch: "x"` in `encodeDecision`, never committed and reverted in a
`finally`. `tsc -b` exited 0, so the workspace compiled with the field in the payload and nowhere in the seed. The
round-trip property over the real `encodeDecision` output then failed:

```
Error: Property failed after 1 tests
Caused by: AssertionError: expected undefined to deeply equal 'x'
- Expected: "x"
+ Received: undefined
```

The defect was never a live data loss: the field is one nobody had added. What nothing had was coverage by
construction. [ADR-QD-135](./135-sink-record-fields-stated-once.md) found the same shape in the sink record and
fixed it by stating the fields once; a seed is rebuilt in the browser from a payload a server page embedded, so it is
the same trust boundary.

## Decision

**A seed's fields are the wire's, stated once.** (ARCH-91, CCR-QD-435.) The pattern of ADR-QD-135, applied to the seed.

1. **One struct of fields per verdict.** `SeededDecision.ts` holds `ALLOW_WITHHELD` and `DENY_WITHHELD`, the wire fields
   a payload entry does not carry, and one `Schema.Struct` of fields per verdict: `AllowSeedFields` and
   `DenySeedFields`, `DecisionWireAllow`'s and `DecisionWireDeny`'s fields minus the withheld ones, plus `disclosure`.
   A field core's wire gains is in them with no edit here.
2. **The classes stay `Data.TaggedClass`es with their own `_tag`.** `SeededAllow` and `SeededDeny` are typed by those
   structs' `Type` plus `subjectId`, the one substitution (the wire carries the subject on its envelope).
   [ADR-QD-078](./078-a-seed-is-its-own-type-and-the-payload-is-versioned.md) is kept: a seed is its own type.
3. **The payload entry is the same fields under the wire's tag**, and `rebuild` is a spread of the decoded entry.
4. **One closed `VERDICTS` table.** `HydrationEngine.ts` keys it by `DecisionWire["_tag"]` and holds each verdict's entry,
   seed and claim. `dehydrateDecision`, `rebuild` and `entryAgrees` read a row through `rowOf`, so the Allow/Deny
   branch is written once and a verdict without a row is a compile error, as in `FieldLattice.ts`
   ([ADR-QD-092](./092-field-strategy-meaning-lives-beside-the-lattice.md)) and the hydration drop table
   ([ADR-QD-152](./152-each-hydration-drop-reason-is-stated-once-with-its-kind.md)). `entryAgrees`' rule is unchanged
   ([INV-QD-170](../invariants.md#inv-qd-170-a-decision-agrees-with-its-trace)).
5. **An allow's `visibleFields` follows the wire's optional key.** It is absent, not `undefined`, when the server sent
   none; `undefined` still reads as every field. A denial's shape does not change.
6. **What does not change.** `@qadi/core`'s `DecisionWire.ts` is not edited, nothing is added to a barrel, and the
   payload's version and bytes are unchanged. [ADR-QD-155](./155-a-seeded-question-owns-its-computing-atom.md) (the
   seeded question owns its computing atom) is untouched.

## Alternatives considered

- **`Schema.TaggedClass` for the seed.** Rejected: ADR-QD-135 measured it and rejected it for the sink record, and a
  seed's classes are ADR-QD-078's own `Data.TaggedClass`es with their own `_tag`, which the class would have to
  contradict.
- **Build the payload entry from the struct's keys.** Rejected: it moves the payload's bytes. The key order is
  `encodeDecision`'s literal, and the payload is versioned.
- **A `Match` per function.** Rejected: dispatching on the verdict inside `dehydrateDecision`, `rebuild` and
  `entryAgrees` would write the Allow/Deny branch three times again. The table is indexed once, by the verdict, so the
  dispatch is the index and neither a `Match` nor a `switch` is added.
- **An allow-list of shipped fields.** Rejected: it would drop a new wire field by default, which is the defect.
- **Keep `visibleFields` a required key written as `undefined`.** Rejected: it restates a field the wire already states
  as optional.
- **Edit core's wire.** Not needed: the wire already carries every field, and `@qadi/core` is unchanged.

## Consequences

- **The payload and the seed are a deny-list of the wire.** A field core's wire gains ships to the page and the seed by
  default. `trace`, and a denial's `reason` and `obligations`, stay withheld by name. The byte golden in
  `HydrationSeedFields.test.ts` fails on any new key, so a wire field cannot ship to a page unseen (plan 44-03's GREEN
  run: the scratch field reaches the seed with no edit in `rebuild`, and only the golden moves).
- **Breaking for `@qadi/react` (minor).** `SeededAllow`'s `visibleFields` is an optional key, absent when the server sent
  none. Reading it and constructing a seed are unchanged. A type that requires the key, and a check of its presence
  (`in`, `Object.keys`, `Equal.equals` against a seed built with an explicit `undefined`), break.
- **The payload's version and bytes do not change.**
- Mutation is measured on `HydrationEngine.ts` and `SeededDecision.ts`. No house-style budget changes.

## Related

- [ADR-QD-135](./135-sink-record-fields-stated-once.md), the pattern
- [ADR-QD-078](./078-a-seed-is-its-own-type-and-the-payload-is-versioned.md), which this amends
- [ADR-QD-155](./155-a-seeded-question-owns-its-computing-atom.md)
- [ADR-QD-092](./092-field-strategy-meaning-lives-beside-the-lattice.md) and [ADR-QD-152](./152-each-hydration-drop-reason-is-stated-once-with-its-kind.md), the closed-table pattern
- [ADR-QD-039](./039-a-seed-is-not-an-authority.md)
- [ADR-QD-028](./028-decision-hydration.md)
- INV-QD-022, INV-QD-059, INV-QD-170, BEH-QD-148
- [BEH-QD-556](../behaviors/19-hydration.md#beh-qd-556-a-seed-carries-every-field-the-payload-discloses), [INV-QD-333](../invariants.md#inv-qd-333-a-seeds-fields-are-the-wires)
