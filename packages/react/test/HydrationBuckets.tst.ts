/**
 * Pins that each side's bucket record and the payload producer record are total over their reasons.
 *
 * A reason core's drop-reason table gains is then a compile error in `@qadi/react` until it has a bucket or a
 * producer, instead of compiling and being reported nowhere. A bucket record is keyed by every reason of its union and
 * the events are derived from it, so a bucket cannot exist without its event; the payload producer record names, for
 * each payload refusal reason, the failure that produces it. Type-level, because a runtime test cannot observe that a
 * record stopped being total (INV-QD-045, ADR-QD-152).
 */
import { expect, test } from "tstyche";
import type { DehydrationDropReason } from "@qadi/core";
import type { DropBuckets } from "../src/HydrationBuckets.ts";
import { dehydrationBuckets, dropEvents, entryBuckets } from "../src/HydrationBuckets.ts";
import { PAYLOAD_PRODUCERS } from "../src/HydrationEngine.ts";
import type { DecisionEntry, EntryDropReason, PayloadRefusalReason } from "../src/HydrationEvent.ts";

test("the entry buckets are one record keyed by every entry reason", () => {
  expect(entryBuckets()).type.toBe<DropBuckets<EntryDropReason, unknown>>();
  expect<keyof DropBuckets<EntryDropReason, unknown>>().type.toBe<EntryDropReason>();
});

test("an entry bucket record missing a reason is refused", () => {
  // @ts-expect-error is missing in type
  const missing: DropBuckets<EntryDropReason, unknown> = { EntryTooDeep: [], MalformedEntry: [] };
  expect(missing).type.toBe<DropBuckets<EntryDropReason, unknown>>();
  const whole: DropBuckets<EntryDropReason, unknown> = { EntryTooDeep: [], MalformedEntry: [], UndecodablePolicy: [] };
  expect(whole).type.toBe<DropBuckets<EntryDropReason, unknown>>();
});

test("the dehydration buckets are one record keyed by every dehydration reason", () => {
  expect(dehydrationBuckets()).type.toBe<DropBuckets<DehydrationDropReason, DecisionEntry>>();
  expect<keyof DropBuckets<DehydrationDropReason, DecisionEntry>>().type.toBe<DehydrationDropReason>();
});

test("a dehydration bucket record missing a reason is refused", () => {
  // @ts-expect-error is missing in type
  const missing: DropBuckets<DehydrationDropReason, DecisionEntry> = { ForeignSubject: [] };
  expect(missing).type.toBe<DropBuckets<DehydrationDropReason, DecisionEntry>>();
  const whole: DropBuckets<DehydrationDropReason, DecisionEntry> = { ForeignSubject: [], UnencodablePolicy: [] };
  expect(whole).type.toBe<DropBuckets<DehydrationDropReason, DecisionEntry>>();
});

test("the derivation hands every reason of a record to its event", () => {
  expect(dropEvents(entryBuckets(), (reason, entries) => ({ reason, entries }))).type.toBe<
    ReadonlyArray<{ reason: EntryDropReason; entries: ReadonlyArray<unknown> }>
  >();
  expect(dropEvents(dehydrationBuckets(), (reason, entries) => ({ reason, entries }))).type.toBe<
    ReadonlyArray<{ reason: DehydrationDropReason; entries: ReadonlyArray<DecisionEntry> }>
  >();
});

test("every payload refusal reason has one producer row", () => {
  expect<keyof typeof PAYLOAD_PRODUCERS>().type.toBe<PayloadRefusalReason>();
  expect(PAYLOAD_PRODUCERS).type.toBe<{
    PayloadSubjectMismatch: "SubjectCheck";
    UnsupportedPayloadVersion: "UnsupportedPayloadVersion";
    MalformedPayload: "Malformed";
    PayloadTooDeep: "TooDeep";
  }>();
});
