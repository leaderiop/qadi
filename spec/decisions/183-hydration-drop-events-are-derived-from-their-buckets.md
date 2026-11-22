# ADR-QD-183 — Hydration drop events are derived from their buckets

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-183                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-11-22                                     |
> | Status         | Accepted — amends ADR-QD-152                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-11-22): the Consequences bullet says every bucket is emitted and the compiler does not check that code drops anything under a reason; 'the base' replaced by the engine before this decision (ARCH-117, CCR-QD-462)<br>1.1 (2026-11-22): the compiler's guarantee stated per kind: an entry or dehydration row needs a bucket, a payload row a named producer, and no type checks a call site raises one; the characterisation's rows are unchanged, not unedited (ARCH-117, CCR-QD-462)<br>1.0 (2026-11-22): Initial release (ARCH-117, CCR-QD-462) |

---

## Context

`@qadi/react`'s hydration engine kept, on the hydrate side, three named arrays and a record pointing at them. It pushed
the entry whose fields disagree with its policy to one of those arrays directly, and wrote one emission line per
reason. The dehydrate side repeated the pattern with two filters and two lines. Nothing tied a bucket to its event, so a
fourth entry reason given a bucket and no line compiled, and its entries were never reported or counted, against
[INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for). A throwaway row added to the code
before this decision showed it: the tree compiled clean, and every runtime test stayed green.

The whole-payload path had the same gap one step earlier. A `payload` row of `@qadi/core`'s drop-reason table, or a
`dehydration` row, compiled with nothing producing it, which [ADR-QD-152](./152-each-hydration-drop-reason-is-stated-once-with-its-kind.md)
recorded as a consequence. That decision had also turned down a reason-keyed record in react's payload path, because
the record would reshape `HydrationEngine.ts`, "which a later phase shares".

## Decision

1. **Each side's drops are collected in one record**, keyed by every drop reason of that side, built per call by a total
   constructor in the package-private `packages/react/src/HydrationBuckets.ts`: `entryBuckets` for the hydrate side and
   `dehydrationBuckets` for the dehydrate side, both typed by `DropBuckets`. No named per-reason array remains. The
   entry whose fields disagree with its policy goes through the `MalformedEntry` key like any other malformed entry.
2. **One generic function, `dropEvents`, derives each side's events from its record**: one event per non-empty bucket,
   in the record's key order. The planner appends `Seeded` or `Dehydrated`. The function visits every key, so no bucket
   can be skipped, and a key added to a record is reported by the same call.
3. **The constructors' key order is the emission order, stated once per side.** It is the order the engine
   emitted before this decision: `EntryTooDeep`, `MalformedEntry`, `UndecodablePolicy` on the hydrate side, then
   `ForeignSubject`, `UnencodablePolicy` on the dehydrate side. It is not read off core's table, whose entry order
   differs (`MalformedEntry`, `UndecodablePolicy`, `EntryTooDeep`), because the events a reporter sees must stay
   byte-identical.
4. **The payload path is folded in without buckets.** `PAYLOAD_PRODUCERS` in `HydrationEngine.ts` names, for every
   whole-payload reason, what raises it: one of the payload decoder's refusals, by tag, or the subject check. The
   refusal-to-reason direction, `PAYLOAD_REASONS`, is typed against it, so a producer named by two rows or by none
   does not compile, and a new decoder refusal is a missing property (TS2741). A refused payload is still one
   `PayloadRefused` event. The path has no buckets, because its refusal is exclusive: one reason, never a partition.
   The compiler checks that each reason names a producer and that each producer has its slot in the inverse. It
   cannot check that a call site raises a producer: a reason with a new producer and no use of its slot compiles, and
   the conformance test, which drives one refusal per row, is what shows a row's producer refuses under its reason.
   `PAYLOAD_PRODUCERS` is a runtime value for that reason. The engine reads it only as a type, but that test drives
   it and the inverse is checked against it.
5. **The dehydrate side still runs the subject check first**, so an entry that is both foreign and unencodable is
   `ForeignSubject` and is never encoded.
6. **ADR-QD-152's reason for turning down the payload record no longer applies.** The phases in flight when it was
   written (2026-11-14) have all landed, and this series of changes runs its phases strictly one at a time. The one
   later change in it that touches `HydrationEngine.ts`, ARCH-118, pairs each reporter call site's default with its
   hook slot in `dehydrateWith` and `hydrateWith`. It edits those two call sites and none of the planners, the bucket
   records or the payload producer record this decision adds, so it neither collides with them nor needs them to
   stay as they were.

The file stays out of the barrel and the record is built per call, so two calls share nothing and no record states a
guarantee across parallel calls: both planners are pure and synchronous.

This decision and its shape were decided autonomously on 2026-11-22 under the owner's instruction to take the most
complete, clean option: the payload path folded in rather than left alone (decision 4), and the order stated by the
record rather than read off core's table (decision 3).

## Alternatives considered

- **Leaving the payload path as it was.** Rejected: one of the three kinds could still gain a reason nothing produces,
  the gap ADR-QD-152 named and left.
- **The payload path in buckets, with one non-empty bucket.** Rejected: it misstates an exclusive refusal as a
  partition, and the one event would be derived from a record that can only ever hold one entry.
- **The order read off core's table.** Rejected: it changes what a reporter sees first, on a side whose events are
  pinned byte for byte.
- **A checked tuple for the order.** Rejected: the record's key order states it already, a missing key being TS2741 and
  a duplicate TS1117, so a tuple would be a second statement of it.
- **One derivation per side.** Rejected: two copies of one rule.
- **`PAYLOAD_PRODUCERS` in `HydrationBuckets.ts`.** Rejected: it maps the payload decoder's refusals, which sit beside
  it in the engine, and a reader of the payload path meets it there.
- **Exporting the module.** Rejected ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)): out of the barrel is
  private and free to change, and nothing outside `@qadi/react` needs a bucket.

## Consequences

- What the compiler enforces differs by kind. An `entry` row is a compile error in `@qadi/react` until it has a bucket
  in `entryBuckets`, and a `dehydration` row until it has one in `dehydrationBuckets`; a bucket has its event, because
  `dropEvents` derives every event from its record, so every bucket is emitted and an entry dropped under any reason
  of these two kinds is reported and counted. The compiler does not check that code drops anything under a reason. A
  `payload` row is a compile error until its producer is named in `PAYLOAD_PRODUCERS`, and a new producer is a compile
  error until it has its slot in `PAYLOAD_REASONS`. The compiler cannot check that a call site raises that producer, so
  a payload reason with a new producer and no use of its slot compiles and is raised nowhere; the conformance test is
  what shows each row's producer refuses under it. Each compile error was shown by the same throwaway-row experiment
  after the change. This amends ADR-QD-152's consequence that a `payload` or `dehydration` row compiles everywhere.
- INV-QD-045's enforcement is restated as INV-QD-385, and the emission order is INV-QD-386.
- The events, their order and their counts are unchanged, pinned by a characterisation written against the engine
  before its drops were collected in records, no existing row of which has had its expected values changed. No export is added or removed, so `@qadi/react` takes a patch changeset and `spec/overview.md` is untouched.

## Related

[ADR-QD-152](./152-each-hydration-drop-reason-is-stated-once-with-its-kind.md),
[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md),
[ADR-QD-078](./078-a-seed-is-its-own-type-and-the-payload-is-versioned.md),
[INV-QD-045](../invariants.md#inv-qd-045-no-entry-leaves-hydration-unaccounted-for),
[INV-QD-323](../invariants.md#inv-qd-323-each-hydration-drop-reason-has-exactly-one-kind-and-the-kinds-partition-the-reasons),
INV-QD-385, INV-QD-386, BEH-QD-686 to BEH-QD-690.
