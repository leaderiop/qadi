/**
 * The drop buckets' runtime shape: each side's constructor, and the one derivation
 * of events from a record (INV-QD-385, INV-QD-386, ADR-QD-183).
 *
 * `HydrationBuckets.tst.ts` pins the types; what only a run can show is here: the
 * key order that is each side's emission order, that a call's buckets are its own,
 * that every reason core's table states is in exactly one of the three records,
 * and that the derivation calls its event once per non-empty bucket in key order.
 */
import { hydrationDropReasons } from "@qadi/core";
import { describe, expect, it } from "vitest";
import { dehydrationBuckets, dropEvents, entryBuckets } from "../src/HydrationBuckets.ts";
import { PAYLOAD_PRODUCERS } from "../src/HydrationEngine.ts";

describe("each side's bucket constructor", () => {
  it("states the hydrate side's emission order as its key order, every bucket empty", () => {
    expect(entryBuckets()).toEqual({ EntryTooDeep: [], MalformedEntry: [], UndecodablePolicy: [] });
    expect(Object.keys(entryBuckets())).toEqual([
      "EntryTooDeep",
      "MalformedEntry",
      "UndecodablePolicy",
    ]);
  });

  it("states the dehydrate side's emission order as its key order, every bucket empty", () => {
    expect(dehydrationBuckets()).toEqual({ ForeignSubject: [], UnencodablePolicy: [] });
    expect(Object.keys(dehydrationBuckets())).toEqual(["ForeignSubject", "UnencodablePolicy"]);
  });

  it("builds a record no other call shares", () => {
    const first = entryBuckets();
    const second = entryBuckets();
    first.EntryTooDeep.push("kept");
    expect(second.EntryTooDeep).toEqual([]);
    expect(first.EntryTooDeep).not.toBe(second.EntryTooDeep);
    expect(dehydrationBuckets().ForeignSubject).not.toBe(dehydrationBuckets().ForeignSubject);
  });

  it("with the producer record, holds every reason core states exactly once", () => {
    const stated = [
      ...Object.keys(entryBuckets()),
      ...Object.keys(dehydrationBuckets()),
      ...Object.keys(PAYLOAD_PRODUCERS),
    ];
    expect(stated.sort()).toEqual([...hydrationDropReasons].sort());
  });
});

describe("dropEvents", () => {
  it("calls its event once per bucket of a full record, in key order, with that bucket", () => {
    const buckets = entryBuckets();
    buckets.EntryTooDeep.push("a");
    buckets.MalformedEntry.push("b", "c");
    buckets.UndecodablePolicy.push("d");
    const events = dropEvents(buckets, (reason, bucket) => ({ reason, bucket }));
    expect(events).toEqual([
      { reason: "EntryTooDeep", bucket: ["a"] },
      { reason: "MalformedEntry", bucket: ["b", "c"] },
      { reason: "UndecodablePolicy", bucket: ["d"] },
    ]);
    expect(events[1]?.bucket).toBe(buckets.MalformedEntry);
  });

  it("skips an empty bucket and keeps the key order of the rest", () => {
    const buckets = entryBuckets();
    buckets.UndecodablePolicy.push("u");
    buckets.EntryTooDeep.push("t");
    expect(dropEvents(buckets, (reason) => reason)).toEqual(["EntryTooDeep", "UndecodablePolicy"]);
  });

  it("gives no event for a record with every bucket empty", () => {
    expect(dropEvents(entryBuckets(), (reason) => reason)).toEqual([]);
    expect(dropEvents(dehydrationBuckets(), (reason) => reason)).toEqual([]);
  });
});
