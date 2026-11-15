/**
 * Pins that a seed carries every field the payload discloses, and the payload's bytes.
 *
 * `rebuild` copied each field by hand, so a field added to `@qadi/core`'s wire `common` reached the
 * payload and was dropped on the client while everything compiled (ARCH-91). The property loops over
 * the real `encodeDecision` output, so a new wire key is checked without the test naming it. The
 * golden pins the bytes because the payload's key order comes from `encodeDecision`'s literal, not
 * from a schema.
 *
 * The withheld names below are test-local on purpose: the property must be writable on the phase
 * base, where the engine's own lists are not importable, and it proves something about the code
 * only if it does not read them.
 */
import type { Decision, Trace } from "@qadi/core";
import {
  encodeDecision,
  hasRole,
  makeDecision,
  makeSubject,
  makeSubjectId,
  obligation,
} from "@qadi/core";
import * as Atom from "effect/reactivity/Atom";
import * as FastCheck from "fast-check";
import { describe, expect, it } from "vitest";
import type { HydrationSeedLookup } from "../src/HydrationEngine.ts";
import { dehydrateWith, hydrateWith } from "../src/HydrationEngine.ts";
import type { SeededDecision } from "../src/SeededDecision.ts";

const WITHHELD = {
  Allow: ["_tag", "subjectId", "trace"],
  Deny: ["_tag", "subjectId", "trace", "obligations", "reason"],
} as const;

const alice = makeSubject({ id: "u1" });
// `policyTag: "HasRole"` below, so `entryAgrees` accepts a Disclosed seed.
const policy = hasRole("admin");

const traceArbitrary: FastCheck.Arbitrary<Trace> = FastCheck.record({
  policyTag: FastCheck.constant("HasRole"),
  allowed: FastCheck.boolean(),
  reason: FastCheck.option(FastCheck.constantFrom("r1", "r2"), { nil: undefined }),
  children: FastCheck.constant([]),
  visibleFields: FastCheck.constantFrom(undefined, [], ["a"], ["b", "a"]),
  obligations: FastCheck.constantFrom(
    [],
    [obligation("x")],
    [obligation("x", { level: "warn" }), obligation("y")],
  ),
});

const decisionArbitrary: FastCheck.Arbitrary<Decision> = FastCheck.tuple(
  traceArbitrary,
  FastCheck.string({ minLength: 1 }),
  FastCheck.nat(),
).map(([trace, evaluationId, durationMillis]) =>
  makeDecision({ evaluationId, subjectId: makeSubjectId("u1"), durationMillis }, trace),
);

// Captures what `hold` is handed (typed `SeededDecision`, so no cast), not what the pair says.
const seedsOf = (decision: Decision, includeTrace: boolean): ReadonlyArray<SeededDecision> => {
  const held: Array<SeededDecision> = [];
  const lookup: HydrationSeedLookup = () => ({
    hold: (seed) => {
      held.push(seed);
      return [Atom.make<SeededDecision | undefined>(undefined), seed];
    },
  });
  const payload: unknown = JSON.parse(
    JSON.stringify(dehydrateWith([{ policy, decision }], { includeTrace })),
  );
  const pairs = [...hydrateWith(lookup, payload, alice)];
  expect(pairs).toHaveLength(held.length);
  return held;
};

describe("a seed keeps every disclosed wire field (HYDF-03)", () => {
  it("PROPERTY: every wire field the payload discloses reaches the seed", () => {
    FastCheck.assert(
      FastCheck.property(decisionArbitrary, FastCheck.boolean(), (decision, includeTrace) => {
        const wire = encodeDecision(decision);
        const seeds = seedsOf(decision, includeTrace);
        expect(seeds).toHaveLength(1);
        const seed = new Map(Object.entries(seeds[0] ?? {}));
        const withheld: ReadonlyArray<string> = WITHHELD[wire._tag];

        expect(seed.get("_tag")).toBe(`Seeded${wire._tag}`);
        expect(seed.get("subjectId")).toBe(alice.id);
        for (const [key, value] of Object.entries(wire)) {
          if (!withheld.includes(key)) expect(seed.get(key)).toEqual(value);
        }

        // Disclosure: Withheld without a trace, the wire's own trace (and a denial's reason) with one.
        expect(seed.get("disclosure")).toEqual(
          !includeTrace
            ? { _tag: "Withheld" }
            : wire._tag === "Deny"
              ? { _tag: "Disclosed", trace: wire.trace, reason: wire.reason }
              : { _tag: "Disclosed", trace: wire.trace },
        );

        if (decision._tag === "Allow") {
          expect(seed.get("visibleFields")).toEqual(decision.visibleFields);
        } else {
          for (const key of ["visibleFields", "obligations", "reason", "trace"]) {
            expect(seed.has(key)).toBe(false);
          }
        }

        // No key beyond the ones the wire disclosed and the seed's own.
        const allowed = new Set([
          "_tag",
          "subjectId",
          "disclosure",
          ...Object.keys(wire).filter((key) => !withheld.includes(key)),
        ]);
        for (const key of seed.keys()) expect(allowed.has(key)).toBe(true);
      }),
      { numRuns: 300, seed: 2026111501 },
    );
  });
});

describe("a seed's fields are the wire's (ARCH-91)", () => {
  it("an allow sent without visibleFields seeds without the key, and [] seeds as []", () => {
    const none = makeDecision(
      { evaluationId: "e1", subjectId: makeSubjectId("u1"), durationMillis: 3 },
      { policyTag: "HasRole", allowed: true, children: [], obligations: [] },
    );
    const empty = makeDecision(
      { evaluationId: "e2", subjectId: makeSubjectId("u1"), durationMillis: 3 },
      { policyTag: "HasRole", allowed: true, children: [], obligations: [], visibleFields: [] },
    );
    for (const includeTrace of [false, true]) {
      const absent = seedsOf(none, includeTrace);
      expect(absent).toHaveLength(1);
      expect(Object.keys(absent[0] ?? {})).not.toContain("visibleFields");

      const present = seedsOf(empty, includeTrace);
      expect(present).toHaveLength(1);
      expect(Object.entries(present[0] ?? {})).toContainEqual(["visibleFields", []]);
    }
  });
});

const stamp = (evaluationId: string) => ({
  evaluationId,
  subjectId: makeSubjectId("u1"),
  durationMillis: 3,
});

const allowAll = makeDecision(stamp("e1"), {
  policyTag: "HasRole",
  allowed: true,
  children: [],
  obligations: [],
});
const allowFields = makeDecision(stamp("e2"), {
  policyTag: "HasRole",
  allowed: true,
  children: [],
  obligations: [],
  visibleFields: ["id", "title"],
});
const allowObliged = makeDecision(stamp("e3"), {
  policyTag: "HasRole",
  allowed: true,
  children: [],
  obligations: [obligation("audit.log", { level: "info" })],
});
const deny = makeDecision(stamp("e4"), {
  policyTag: "HasRole",
  allowed: false,
  reason: "lacks role admin",
  children: [],
  obligations: [],
});

const bytes = (decision: Decision, includeTrace: boolean): string =>
  JSON.stringify(dehydrateWith([{ policy, decision }], { includeTrace }));

describe("the payload's bytes are pinned on the phase base (HYDF-04)", () => {
  it("an allow with every field visible", () => {
    expect(bytes(allowAll, false)).toBe(
      `{"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e1","durationMillis":3,"obligations":[],"disclosure":{"_tag":"Withheld"}}}]}`,
    );
    expect(bytes(allowAll, true)).toBe(
      `{"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e1","durationMillis":3,"obligations":[],"disclosure":{"_tag":"Disclosed","trace":{"policyTag":"HasRole","allowed":true,"children":[],"obligations":[]}}}}]}`,
    );
  });

  it("an allow with visibleFields", () => {
    expect(bytes(allowFields, false)).toBe(
      `{"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e2","durationMillis":3,"obligations":[],"visibleFields":["id","title"],"disclosure":{"_tag":"Withheld"}}}]}`,
    );
    expect(bytes(allowFields, true)).toBe(
      `{"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e2","durationMillis":3,"obligations":[],"visibleFields":["id","title"],"disclosure":{"_tag":"Disclosed","trace":{"policyTag":"HasRole","allowed":true,"children":[],"obligations":[],"visibleFields":["id","title"]}}}}]}`,
    );
  });

  it("an allow with obligations", () => {
    expect(bytes(allowObliged, false)).toBe(
      `{"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e3","durationMillis":3,"obligations":[{"id":"audit.log","attributes":{"level":"info"},"advisory":false}],"disclosure":{"_tag":"Withheld"}}}]}`,
    );
    expect(bytes(allowObliged, true)).toBe(
      `{"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e3","durationMillis":3,"obligations":[{"id":"audit.log","attributes":{"level":"info"},"advisory":false}],"disclosure":{"_tag":"Disclosed","trace":{"policyTag":"HasRole","allowed":true,"children":[],"obligations":[{"id":"audit.log","attributes":{"level":"info"},"advisory":false}]}}}}]}`,
    );
  });

  it("a deny", () => {
    expect(bytes(deny, false)).toBe(
      `{"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Deny","evaluationId":"e4","durationMillis":3,"disclosure":{"_tag":"Withheld"}}}]}`,
    );
    expect(bytes(deny, true)).toBe(
      `{"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Deny","evaluationId":"e4","durationMillis":3,"disclosure":{"_tag":"Disclosed","trace":{"policyTag":"HasRole","allowed":false,"reason":"lacks role admin","children":[],"obligations":[]},"reason":"lacks role admin"}}}]}`,
    );
  });
});
