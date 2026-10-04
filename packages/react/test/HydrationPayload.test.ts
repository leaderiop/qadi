/**
 * The dehydrated payload as an untrusted, versioned input — and the seed it
 * becomes as a faithful projection of what the server decided.
 *
 * Complements `Hydration.test.ts`, which pins the precedence and announcement
 * rules; this file pins the codec itself (ARCH-05).
 */
import {
  CurrentSubject,
  EvaluationServicesNone,
  allOf,
  anyOf,
  evaluate,
  hasPermission,
  hasRole,
  isAllowed,
  labeled,
  makeSubject,
  not,
  obliged,
  obligation,
  permission,
} from "@qadi/core";
import type { Decision, Policy } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as FastCheck from "fast-check";
import { describe, expect, it } from "vitest";
import { dehydrateDecisions, isSeeded, permits } from "../src/Hydration.ts";
import type { HydrateOptions } from "../src/Hydration.ts";
import type { HydrationDrop } from "../src/Hydration.ts";
import { hydrateWith, hydrationSeedFor } from "../src/HydrationEngine.ts";
import { currentDecision, makeQadiAtoms } from "../src/QadiAtoms.ts";

const read = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");
const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });
const atoms = makeQadiAtoms(EvaluationServicesNone);

/**
 * `hydrateDecisions`, but taking `unknown`: a payload arrives as JSON in a page,
 * so what it is handed is not something its parameter type can promise. The
 * public function delegates here with the atom set's own seed lookup.
 */
const hydrate = (payload: unknown, who = alice, options?: HydrateOptions) =>
  hydrateWith(hydrationSeedFor(atoms), payload, who, options);

/** A registry that has not been told who is asking, so the seed is all it can read. */
const seedWindow = (payload: unknown, who = alice) =>
  AtomRegistry.make({
    initialValues: [[atoms.subject, undefined] as const, ...hydrate(payload, who)],
  });

const decide = (policy: Policy): Promise<Decision> =>
  Effect.runPromise(
    evaluate(policy).pipe(
      Effect.provideService(CurrentSubject, alice),
      Effect.provide(EvaluationServicesNone),
    ),
  );

const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe("hydrateDecisions never throws, whatever it is handed", () => {
  const hostile: ReadonlyArray<unknown> = [
    5,
    null,
    "x",
    true,
    [],
    {},
    { subjectId: "u1" },
    { subjectId: "u1", entries: 5 },
    { subjectId: "u1", entries: null },
    { version: 2 },
    { version: 2, subjectId: "u1", entries: [null, 5, {}, "x", []] },
    { version: 3, subjectId: "u1", entries: [{}] },
    { version: "2", subjectId: "u1", entries: [] },
    { version: null, subjectId: "u1", entries: [] },
    { subjectId: "u1", entries: [null, 5, {}, "x", []] },
    { subjectId: 7, entries: [] },
    { version: 2, subjectId: "u1", entries: [], sneaky: true },
  ];

  it.each(hostile.map((payload, index) => [index, payload] as const))(
    "payload #%i",
    (_index, payload) => {
      const drops: Array<HydrationDrop<unknown>> = [];
      expect(() => hydrate(payload, alice, { onDropped: (d) => drops.push(d) })).not.toThrow();
    },
  );

  it("a payload that is not an envelope is dropped as MalformedPayload, and reported", () => {
    for (const payload of [5, null, "x", [], { subjectId: "u1", entries: 5 }]) {
      const drops: Array<HydrationDrop<unknown>> = [];
      const seeded = [...hydrate(payload, alice, { onDropped: (d) => drops.push(d) })];
      expect(seeded).toEqual([]);
      expect(drops.map((d) => d.reason)).toEqual(["MalformedPayload"]);
    }
  });

  it("returns, and accounts for every entry it could see, over arbitrary JSON", () => {
    const envelope = FastCheck.record(
      {
        version: FastCheck.constantFrom(1, 2, 3, "2", null),
        subjectId: FastCheck.constantFrom("u1", "u2", 7, null),
        entries: FastCheck.oneof(
          FastCheck.array(FastCheck.jsonValue(), { maxLength: 6 }),
          FastCheck.jsonValue(),
        ),
        extra: FastCheck.jsonValue(),
      },
      { requiredKeys: [] },
    );

    FastCheck.assert(
      FastCheck.property(FastCheck.oneof(FastCheck.jsonValue(), envelope), (payload) => {
        const drops: Array<HydrationDrop<unknown>> = [];
        const seeded = [...hydrate(payload, alice, { onDropped: (d) => drops.push(d) })];
        const visible =
          typeof payload === "object" &&
          payload !== null &&
          "entries" in payload &&
          Array.isArray(payload.entries)
            ? payload.entries.length
            : 0;
        const lost = drops.reduce((sum, d) => sum + d.entries.length, 0);

        if (visible > 0) return seeded.length + lost === visible;
        // Nothing visible to count: nothing was seeded either.
        return seeded.length === 0;
      }),
      { numRuns: 300 },
    );
  });
});

describe("the payload is versioned", () => {
  it("writes version 2", () => {
    expect(dehydrateDecisions([]).version).toBe(2);
  });

  it("drops a version it does not read, counting and reporting it by name", () => {
    const drops: Array<HydrationDrop<unknown>> = [];
    const seeded = [
      ...hydrate({ version: 3, subjectId: "u1", entries: [{}, {}] }, alice, {
        onDropped: (d) => drops.push(d),
      }),
    ];
    expect(seeded).toEqual([]);
    expect(drops.map((d) => d.reason)).toEqual(["UnsupportedPayloadVersion"]);
    expect(drops[0]?.entries).toHaveLength(2);
  });

  it("reads a payload from before `version` existed, and seeds it Withheld", () => {
    // Captured at 1caf04c: what `dehydrateDecisions` produced for a denial, with
    // its reduced trace and its stand-in "hydrated" reason.
    const v1 = {
      subjectId: "u1",
      entries: [
        {
          policy: { _tag: "HasRole", role: "admin" },
          allowed: false,
          evaluationId: "e-v1",
          durationMillis: 2,
          reason: "hydrated",
          trace: {
            policyTag: "HasRole",
            allowed: false,
            reason: "hydrated",
            children: [],
            obligations: [],
          },
        },
        {
          policy: { _tag: "HasPermission", permission: { resource: "doc", action: "read" } },
          allowed: true,
          evaluationId: "e-v1b",
          durationMillis: 1,
          visibleFields: ["id"],
          obligations: [{ id: "audit.log", attributes: {}, advisory: false }],
          trace: {
            policyTag: "HasPermission",
            allowed: true,
            children: [],
            visibleFields: ["id"],
            obligations: [],
          },
        },
      ],
    };
    const registry = seedWindow(v1);

    const denied = currentDecision(registry.get(atoms.decision(isAdmin)));
    expect(denied?._tag).toBe("SeededDeny");
    // Always Withheld: a v1 trace is indistinguishable from a real one, and the
    // safe direction is less disclosure — even though this one carried a trace.
    expect(denied !== undefined && isSeeded(denied) && denied.disclosure).toEqual({
      _tag: "Withheld",
    });

    const allowed = currentDecision(registry.get(atoms.decision(read)));
    expect(allowed?._tag).toBe("SeededAllow");
    expect(allowed?._tag === "SeededAllow" && allowed.visibleFields).toEqual(["id"]);
    expect(allowed?._tag === "SeededAllow" && allowed.obligations.map((o) => o.id)).toEqual([
      "audit.log",
    ]);
    registry.dispose();
  });

  it("drops a v1 entry that is malformed, the way it always did", () => {
    const drops: Array<HydrationDrop<unknown>> = [];
    const seeded = [
      ...hydrate(
        {
          subjectId: "u1",
          entries: [{ policy: {}, allowed: true, evaluationId: "e", durationMillis: "NaN" }],
        },
        alice,
        { onDropped: (d) => drops.push(d) },
      ),
    ];
    expect(seeded).toEqual([]);
    expect(drops.map((d) => d.reason)).toEqual(["MalformedEntry"]);
  });
});

describe("what a seed carries is what the server decided", () => {
  const policies: ReadonlyArray<readonly [string, Policy]> = [
    ["HasPermission", read],
    ["HasPermission with fields", hasPermission(permission("doc", "read"), { fields: ["id"] })],
    ["HasRole (denied)", isAdmin],
    ["AllOf", allOf([read, hasRole("viewer")])],
    ["AnyOf", anyOf([isAdmin, read])],
    ["Not", not(isAdmin)],
    ["Labeled", labeled("reader", read)],
    ["Obliged", obliged(obligation("audit.log"), read)],
  ];

  it.each(policies)("%s survives dehydrate, JSON and hydrate", async (_name, policy) => {
    const server = await decide(policy);

    for (const includeTrace of [false, true]) {
      const wire = json(dehydrateDecisions([{ policy, decision: server }], { includeTrace }));
      const registry = seedWindow(wire);
      const seeded = currentDecision(registry.get(atoms.decision(policy)));

      expect(seeded !== undefined && isSeeded(seeded)).toBe(true);
      if (seeded === undefined || !isSeeded(seeded)) return;

      // The verdict, the correlation id, and the things a UI acts on.
      expect(permits(seeded)).toBe(isAllowed(server));
      expect(seeded.evaluationId).toBe(server.evaluationId);
      if (seeded._tag === "SeededAllow" && isAllowed(server)) {
        expect(seeded.visibleFields).toEqual(server.visibleFields);
        expect(seeded.obligations).toEqual(server.obligations);
      }

      // And nothing it was not given.
      if (includeTrace) {
        expect(seeded.disclosure._tag).toBe("Disclosed");
        expect(
          seeded.disclosure._tag === "Disclosed" && json(seeded.disclosure.trace),
        ).toEqual(json(server.trace));
      } else {
        expect(seeded.disclosure).toEqual({ _tag: "Withheld" });
        expect(JSON.stringify(wire)).not.toContain('"trace"');
      }
      registry.dispose();
    }
  });

  it("a Disclosed trace naming another root than the entry's policy is dropped as malformed", async () => {
    const server = await decide(isAdmin);
    // `JSON.parse` yields `any`, which is exactly what a page hands the client.
    const wire = JSON.parse(
      JSON.stringify(
        dehydrateDecisions([{ policy: isAdmin, decision: server }], { includeTrace: true }),
      ),
    );
    // The server's trace of some *other* policy, spliced onto this entry.
    wire.entries[0].decision.disclosure.trace.policyTag = "Not";

    const drops: Array<HydrationDrop<unknown>> = [];
    const seeded = [...hydrate(wire, alice, { onDropped: (d) => drops.push(d) })];
    expect(seeded).toEqual([]);
    expect(drops.map((d) => d.reason)).toEqual(["MalformedEntry"]);
  });
});
