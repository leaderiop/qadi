/**
 * Refusal-precedence table for the hydration seam (ADR-QD-143, BEH-QD-488): each row
 * hydrates one payload and pins the seeded count and the drop reasons, in the order
 * they arrive. The depth guard runs before the version check, so a payload nested
 * past the bound is `PayloadTooDeep` whatever its version.
 */
import { EvaluationServicesNone, MAX_DECODE_DEPTH, makeSubject } from "@qadi/core";
import { describe, expect, it } from "vitest";
import { hydrateDecisions } from "../src/Hydration.ts";
import type { HydrationDrop } from "../src/Hydration.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";

const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });
const atoms = makeQadiAtoms(EvaluationServicesNone);
const OVER = MAX_DECODE_DEPTH + 10;

const policy = { _tag: "HasRole", role: "admin" };
const decision = {
  _tag: "Allow",
  evaluationId: "e",
  durationMillis: 0,
  obligations: [],
  disclosure: { _tag: "Withheld" },
};
const entry = { policy, decision };
const payloadOf = (entries: ReadonlyArray<unknown>, extra: Record<string, unknown> = {}) => ({
  version: 2,
  subjectId: "u1",
  entries,
  ...extra,
});

/** An object `levels` deep, built iteratively so 60,000 levels cannot overflow the test itself. */
const nested = (levels: number): unknown => {
  let value: unknown = { leaf: true };
  for (let i = 0; i < levels; i++) value = { inner: value };
  return value;
};

/** A `Not` chain `levels` deep around a leaf policy. */
const deepPolicy = (levels: number): unknown => {
  let value: unknown = { _tag: "HasRole", role: "x" };
  for (let i = 0; i < levels; i++) value = { _tag: "Not", policy: value };
  return value;
};

interface Outcome {
  readonly seeded: number;
  readonly reasons: ReadonlyArray<string>;
}

/**
 * What hydrating `payload` seeds and drops, through the JSON round trip a page's
 * payload takes (`JSON.parse` yields `any`, so the parameter promises nothing).
 */
const hydrate = (payload: unknown): Outcome => {
  const drops: Array<HydrationDrop<unknown>> = [];
  const seeded = [
    ...hydrateDecisions(atoms, JSON.parse(JSON.stringify(payload)), alice, { onDropped: (d) => drops.push(d) }),
  ];
  return { seeded: seeded.length, reasons: drops.map((d) => d.reason) };
};

describe("hydrateDecisions", () => {
  it("a valid payload with one entry -> seeded 1, no drop", () => {
    expect(hydrate(payloadOf([entry]))).toEqual({ seeded: 1, reasons: [] });
  });

  it("5 -> MalformedPayload", () => {
    expect(hydrate(5)).toEqual({ seeded: 0, reasons: ["MalformedPayload"] });
  });

  it("null -> MalformedPayload", () => {
    expect(hydrate(null)).toEqual({ seeded: 0, reasons: ["MalformedPayload"] });
  });

  it("{} -> UnsupportedPayloadVersion", () => {
    expect(hydrate({})).toEqual({ seeded: 0, reasons: ["UnsupportedPayloadVersion"] });
  });

  // An array is not an object payload, so it is refused before the version check reads it.
  it("[] -> MalformedPayload (an array is not an object, so it never reaches the version check)", () => {
    expect(hydrate([])).toEqual({ seeded: 0, reasons: ["MalformedPayload"] });
  });

  it("version 3 -> UnsupportedPayloadVersion", () => {
    expect(hydrate({ ...payloadOf([entry]), version: 3 })).toEqual({
      seeded: 0,
      reasons: ["UnsupportedPayloadVersion"],
    });
  });

  it("a shallow excess envelope key -> MalformedPayload", () => {
    expect(hydrate(payloadOf([], { sneaky: true }))).toEqual({ seeded: 0, reasons: ["MalformedPayload"] });
  });

  it("an excess envelope key holding a value nested past the bound -> PayloadTooDeep", () => {
    expect(hydrate(payloadOf([], { sneaky: nested(OVER) }))).toEqual({
      seeded: 0,
      reasons: ["PayloadTooDeep"],
    });
  });

  // An array is not an object to the version check, but the module's guard runs ahead of it
  // (guard, prepare, decode), so an array nested past the bound is refused as too deep.
  it("an array payload nested past the bound -> PayloadTooDeep (the guard runs first)", () => {
    expect(hydrate([nested(OVER)])).toEqual({ seeded: 0, reasons: ["PayloadTooDeep"] });
  });

  it("nested past the bound and version 3 -> PayloadTooDeep, the guard first", () => {
    expect(hydrate({ ...payloadOf([], { sneaky: nested(OVER) }), version: 3 })).toEqual({
      seeded: 0,
      reasons: ["PayloadTooDeep"],
    });
  });

  it("a subjectId value nested past the bound -> PayloadTooDeep", () => {
    expect(hydrate({ ...payloadOf([]), subjectId: nested(OVER) })).toEqual({
      seeded: 0,
      reasons: ["PayloadTooDeep"],
    });
  });

  it("a valid envelope with entries: [] -> nothing seeded, nothing dropped", () => {
    expect(hydrate(payloadOf([]))).toEqual({ seeded: 0, reasons: [] });
  });

  it("a payload with no entries key -> MalformedPayload", () => {
    expect(hydrate({ version: 2, subjectId: "u1" })).toEqual({ seeded: 0, reasons: ["MalformedPayload"] });
  });

  it("the subjectId of another subject -> PayloadSubjectMismatch", () => {
    expect(hydrate({ ...payloadOf([entry]), subjectId: "u2" })).toEqual({
      seeded: 0,
      reasons: ["PayloadSubjectMismatch"],
    });
  });

  it("three entries, the middle one nested past the bound -> seeded 2, EntryTooDeep (each entry on its own)", () => {
    const tooDeep = { policy: deepPolicy(OVER), decision };
    expect(hydrate(payloadOf([entry, tooDeep, entry]))).toEqual({ seeded: 2, reasons: ["EntryTooDeep"] });
  });

  it("an entry 60,000 deep -> EntryTooDeep, no throw (the entries slot is not walked by the envelope decode)", () => {
    const drops: Array<HydrationDrop<unknown>> = [];
    let seeded = -1;
    // No JSON round trip: `JSON.stringify` would itself fail at this depth. A page's payload
    // is what `JSON.parse` returns, so it is typed as that, not as a well-formed one.
    const payload: ReturnType<typeof JSON.parse> = payloadOf([{ policy: deepPolicy(60_000), decision }]);
    expect(() => {
      seeded = [
        ...hydrateDecisions(atoms, payload, alice, {
          onDropped: (d) => drops.push(d),
        }),
      ].length;
    }).not.toThrow();
    expect(seeded).toBe(0);
    expect(drops.map((d) => d.reason)).toEqual(["EntryTooDeep"]);
  });

  it("an entry the guard admits by exactly one frame -> seeded; one frame deeper -> EntryTooDeep", () => {
    const entryOf = (levels: number) => ({ policy: deepPolicy(levels), decision });
    // The entry is the root (depth 0), its policy sits at 1, each `Not` adds one and the leaf's
    // string fields sit at `levels + 2`: the guard refuses once that exceeds the bound.
    const admitted = MAX_DECODE_DEPTH - 2;
    expect(hydrate(payloadOf([entryOf(admitted)]))).toEqual({ seeded: 1, reasons: [] });
    expect(hydrate(payloadOf([entryOf(admitted + 1)]))).toEqual({ seeded: 0, reasons: ["EntryTooDeep"] });
  });

  it("an entry with an excess key -> MalformedEntry", () => {
    expect(hydrate(payloadOf([{ ...entry, sneaky: true }]))).toEqual({
      seeded: 0,
      reasons: ["MalformedEntry"],
    });
  });

  it("an entry whose policy has an unknown _tag -> UndecodablePolicy", () => {
    expect(hydrate(payloadOf([{ policy: { _tag: "NotAPolicy" }, decision }]))).toEqual({
      seeded: 0,
      reasons: ["UndecodablePolicy"],
    });
  });

  it("one entry of each of the three entry reasons -> the three reasons in the order they arrive", () => {
    const entries = [
      { policy: { _tag: "NotAPolicy" }, decision },
      { ...entry, sneaky: true },
      { policy: deepPolicy(OVER), decision },
    ];
    expect(hydrate(payloadOf(entries))).toEqual({
      seeded: 0,
      reasons: ["EntryTooDeep", "MalformedEntry", "UndecodablePolicy"],
    });
  });
});
