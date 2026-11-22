/**
 * Pins that each side's bucket record and the payload producer record are total
 * over their reasons, and that a producer named by two rows or by none is refused.
 *
 * A reason core's drop-reason table gains is then a compile error in
 * `@qadi/react` until it has a bucket or a producer, instead of compiling and
 * being reported nowhere. A bucket record is keyed by every reason of its union
 * and the events are derived from it, so a bucket cannot exist without its
 * event; the payload producer record names, for each payload refusal reason, the
 * failure that produces it, and its inverse types a producer that no row or two
 * rows name as `never`. Type-level, because a runtime test cannot observe that a
 * record stopped being total (INV-QD-045, ADR-QD-152, ADR-QD-183).
 */
import { expect, test } from "tstyche";
import type { DehydrationDropReason } from "@qadi/core";
import type { DropBuckets } from "../src/HydrationBuckets.ts";
import { dehydrationBuckets, dropEvents, entryBuckets } from "../src/HydrationBuckets.ts";
import { PAYLOAD_PRODUCERS, PAYLOAD_REASONS } from "../src/HydrationEngine.ts";
import type { OnlyMember, PayloadProducer, ReasonRaisedBy } from "../src/HydrationEngine.ts";
import type {
  DecisionEntry,
  EntryDropReason,
  PayloadRefusalReason,
} from "../src/HydrationEvent.ts";

// The reasons written out, so a reason core's table gains fails these pins rather than
// following the union silently. `DropBuckets` is a mapped type, so each array is its key's.
test("the entry buckets hold one array per entry reason, written out", () => {
  expect(entryBuckets()).type.toBe<{
    readonly EntryTooDeep: Array<unknown>;
    readonly MalformedEntry: Array<unknown>;
    readonly UndecodablePolicy: Array<unknown>;
  }>();
  expect<EntryDropReason>().type.toBe<"EntryTooDeep" | "MalformedEntry" | "UndecodablePolicy">();
});

test("the dehydration buckets hold one array per dehydration reason, written out", () => {
  expect(dehydrationBuckets()).type.toBe<{
    readonly ForeignSubject: Array<DecisionEntry>;
    readonly UnencodablePolicy: Array<DecisionEntry>;
  }>();
  expect<DehydrationDropReason>().type.toBe<"ForeignSubject" | "UnencodablePolicy">();
});

test("an entry bucket record missing a reason or naming an unknown one is refused", () => {
  // @ts-expect-error is missing in type
  const missing: DropBuckets<EntryDropReason, unknown> = {
    EntryTooDeep: [],
    MalformedEntry: [],
  };
  expect(missing).type.toBe<DropBuckets<EntryDropReason, unknown>>();
  const excess: DropBuckets<EntryDropReason, unknown> = {
    EntryTooDeep: [],
    MalformedEntry: [],
    UndecodablePolicy: [],
    // @ts-expect-error does not exist in type
    Unknown: [],
  };
  expect(excess).type.toBe<DropBuckets<EntryDropReason, unknown>>();
  const whole: DropBuckets<EntryDropReason, unknown> = {
    EntryTooDeep: [],
    MalformedEntry: [],
    UndecodablePolicy: [],
  };
  expect(whole).type.toBe<DropBuckets<EntryDropReason, unknown>>();
});

test("a dehydration bucket record missing a reason or naming an unknown one is refused", () => {
  // @ts-expect-error is missing in type
  const missing: DropBuckets<DehydrationDropReason, DecisionEntry> = { ForeignSubject: [] };
  expect(missing).type.toBe<DropBuckets<DehydrationDropReason, DecisionEntry>>();
  const excess: DropBuckets<DehydrationDropReason, DecisionEntry> = {
    ForeignSubject: [],
    UnencodablePolicy: [],
    // @ts-expect-error does not exist in type
    Unknown: [],
  };
  expect(excess).type.toBe<DropBuckets<DehydrationDropReason, DecisionEntry>>();
  const whole: DropBuckets<DehydrationDropReason, DecisionEntry> = {
    ForeignSubject: [],
    UnencodablePolicy: [],
  };
  expect(whole).type.toBe<DropBuckets<DehydrationDropReason, DecisionEntry>>();
});

// What it pins is the callback's types and the result's element type; that it calls the
// event once per non-empty bucket is a runtime fact, pinned in `HydrationBuckets.test.ts`.
test("the event function is handed its record's reason union and bucket type", () => {
  expect(dropEvents(entryBuckets(), (reason, bucket) => ({ reason, bucket }))).type.toBe<
    ReadonlyArray<{ reason: EntryDropReason; bucket: ReadonlyArray<unknown> }>
  >();
  expect(dropEvents(dehydrationBuckets(), (reason, bucket) => ({ reason, bucket }))).type.toBe<
    ReadonlyArray<{ reason: DehydrationDropReason; bucket: ReadonlyArray<DecisionEntry> }>
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

// A record naming `TooDeep` twice and `SubjectCheck` not at all.
type NamedTwice = {
  readonly PayloadSubjectMismatch: "TooDeep";
  readonly UnsupportedPayloadVersion: "UnsupportedPayloadVersion";
  readonly MalformedPayload: "Malformed";
  readonly PayloadTooDeep: "TooDeep";
};

test("OnlyMember is the union when it has exactly one member and never otherwise", () => {
  expect<OnlyMember<"A">>().type.toBe<"A">();
  expect<OnlyMember<"A" | "B">>().type.toBe<never>();
  expect<OnlyMember<never>>().type.toBe<never>();
});

test("ReasonRaisedBy is the reason whose row names the producer", () => {
  expect<ReasonRaisedBy<"TooDeep">>().type.toBe<"PayloadTooDeep">();
  expect<ReasonRaisedBy<"Malformed">>().type.toBe<"MalformedPayload">();
  expect<ReasonRaisedBy<"UnsupportedPayloadVersion">>().type.toBe<"UnsupportedPayloadVersion">();
  expect<ReasonRaisedBy<"SubjectCheck">>().type.toBe<"PayloadSubjectMismatch">();
});

test("ReasonRaisedBy is never for a producer two rows name or no row names", () => {
  expect<ReasonRaisedBy<"TooDeep", NamedTwice>>().type.toBe<never>();
  expect<ReasonRaisedBy<"SubjectCheck", NamedTwice>>().type.toBe<never>();
  // The producers the record names once keep their reason.
  expect<ReasonRaisedBy<"Malformed", NamedTwice>>().type.toBe<"MalformedPayload">();
  expect<ReasonRaisedBy<"UnsupportedPayloadVersion", NamedTwice>>().type.toBe<
    "UnsupportedPayloadVersion"
  >();
});

test("the producer inverse types each producer's slot as its reason", () => {
  expect<keyof typeof PAYLOAD_REASONS>().type.toBe<PayloadProducer>();
  expect(PAYLOAD_REASONS).type.toBe<{
    readonly TooDeep: "PayloadTooDeep";
    readonly Malformed: "MalformedPayload";
    readonly UnsupportedPayloadVersion: "UnsupportedPayloadVersion";
    readonly SubjectCheck: "PayloadSubjectMismatch";
  }>();
});

test("an inverse over a record that names a producer twice or not at all is refused", () => {
  const refused: { readonly [P in PayloadProducer]: ReasonRaisedBy<P, NamedTwice> } = {
    // @ts-expect-error is not assignable to type 'never'
    TooDeep: "PayloadTooDeep",
    Malformed: "MalformedPayload",
    UnsupportedPayloadVersion: "UnsupportedPayloadVersion",
    // @ts-expect-error is not assignable to type 'never'
    SubjectCheck: "PayloadSubjectMismatch",
  };
  expect(refused).type.toBe<{ readonly [P in PayloadProducer]: ReasonRaisedBy<P, NamedTwice> }>();
  // The same shape over the real record is accepted.
  const accepted: { readonly [P in PayloadProducer]: ReasonRaisedBy<P> } = {
    TooDeep: "PayloadTooDeep",
    Malformed: "MalformedPayload",
    UnsupportedPayloadVersion: "UnsupportedPayloadVersion",
    SubjectCheck: "PayloadSubjectMismatch",
  };
  expect(accepted).type.toBe<{ readonly [P in PayloadProducer]: ReasonRaisedBy<P> }>();
});
