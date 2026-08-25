import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "effect/testing/FastCheck";
import { Allow, Deny } from "../src/Decision.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord } from "../src/DecisionRecord.ts";
import {
  AttributeResolveError,
  DecisionHistoryUnavailable,
  ERROR_CODES,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
  RelationshipResolveError,
} from "../src/Errors.ts";
import type { EvaluationError } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { decodeRecord, encodeRecord, fromWire, toWire } from "../src/SinkCodec.ts";

const read = permission("doc", "read");

/** Every `EvaluationError` variant, so none can be forgotten by the mapping. */
const everyError: ReadonlyArray<EvaluationError> = [
  new MissingResource({ attribute: "owner" }),
  new MissingAction({ expected: "read" }),
  new MissingAction({ expected: undefined }),
  new AttributeResolveError({ attribute: "clearance", cause: "store offline" }),
  new RelationshipResolveError({
    relation: "owner",
    resourceId: makeResourceId("doc-1"),
    cause: "graph offline",
  }),
  new MissingResourceId({ relation: "owner" }),
  new DecisionHistoryUnavailable({ event: "approved", cause: "history offline" }),
  new PolicyTooDeep({ maxDepth: 64 }),
];

/**
 * Optional fields are OMITTED rather than set to `undefined`.
 *
 * `Schema.optional` drops an absent key on decode, so a field written as
 * explicitly `undefined` comes back absent. The two read identically — both give
 * `undefined` — but `deepStrictEqual` distinguishes them, and the normalization
 * is asserted on its own below rather than smuggled into every fixture.
 */
const trace = (allowed: boolean) => ({
  policyTag: "HasPermission" as const,
  allowed,
  children: [],
  ...(allowed ? { visibleFields: ["id", "title"] as ReadonlyArray<string> } : {}),
  obligations: [],
});

const allowRecord: SinkRecord = new DecisionRecord({
  evaluationId: "eval-1",
  at: 1000,
  subjectId: makeSubjectId("u1"),
  policy: P.hasPermission(read),
  resource: { id: "doc-1", owner: "u1" },
  action: "read",
  cache: "miss",
  outcome: new Decided({
    decision: new Allow({
      evaluationId: "eval-1",
      subjectId: makeSubjectId("u1"),
      durationMillis: 3,
      trace: trace(true),
      visibleFields: ["id", "title"],
      obligations: [obligation("audit.log")],
    }),
  }),
});

describe("a record survives the wire", () => {
  it.effect("an allow round-trips through validation", () =>
    Effect.gen(function* () {
      // Through the real schema, not just `toWire`/`fromWire`: the wire form is
      // decoded as untrusted, so the test must exercise the validating path a
      // transport would use.
      const encoded = yield* encodeRecord(toWire(allowRecord));
      const json: unknown = JSON.parse(JSON.stringify(encoded));
      const back = yield* decodeRecord(json);

      assert.deepStrictEqual(back, allowRecord);
    }));

  it.effect("a path-shaped, wildcarded field spec round-trips opaquely", () =>
    Effect.gen(function* () {
      // The wire codec never validates or interprets field-string content —
      // a dot-path or wildcard is just a string, exactly like a flat name.
      const record: SinkRecord = new DecisionRecord({
        evaluationId: "eval-fp",
        at: 5000,
        subjectId: makeSubjectId("u1"),
        policy: P.hasPermission(read, { fields: ["id", "contact.*"] }),
        outcome: new Decided({
          decision: new Allow({
            evaluationId: "eval-fp",
            subjectId: makeSubjectId("u1"),
            durationMillis: 0,
            trace: {
              policyTag: "HasPermission",
              allowed: true,
              children: [],
              visibleFields: ["id", "contact.*"],
              obligations: [],
            },
            visibleFields: ["id", "contact.*"],
            obligations: [],
          }),
        }),
      });

      const back = yield* decodeRecord(
        JSON.parse(JSON.stringify(yield* encodeRecord(toWire(record)))),
      );
      assert.deepStrictEqual(back, record);
    }));

  it.effect("a denial keeps its reason", () =>
    Effect.gen(function* () {
      const denial: SinkRecord = new DecisionRecord({
        evaluationId: "eval-2",
        at: 2000,
        subjectId: makeSubjectId("u2"),
        policy: P.hasRole("editor"),
        outcome: new Decided({
          decision: new Deny({
            evaluationId: "eval-2",
            subjectId: makeSubjectId("u2"),
            durationMillis: 1,
            trace: { ...trace(false), reason: "subject lacks role 'editor'" },
            reason: "subject lacks role 'editor'",
          }),
        }),
      });

      const back = yield* decodeRecord(
        JSON.parse(JSON.stringify(yield* encodeRecord(toWire(denial)))),
      );
      assert.deepStrictEqual(back, denial);
    }));

  it.effect("an obligation record round-trips", () =>
    Effect.gen(function* () {
      const record: SinkRecord = new ObligationRecord({
        evaluationId: "eval-3",
        at: 3000,
        outcome: "Refused",
        obligationIds: ["audit.log", "notify.owner"],
      });

      const back = yield* decodeRecord(
        JSON.parse(JSON.stringify(yield* encodeRecord(toWire(record)))),
      );
      assert.deepStrictEqual(back, record);
    }));

  it.effect("a nested policy and trace survive", () =>
    Effect.gen(function* () {
      const record: SinkRecord = new DecisionRecord({
        evaluationId: "eval-4",
        at: 4000,
        subjectId: makeSubjectId("u1"),
        policy: P.allOf([
          P.hasPermission(read),
          P.not(P.hasAttribute("clearance", M.gte(3))),
        ]),
        outcome: new Decided({
          decision: new Allow({
            evaluationId: "eval-4",
            subjectId: makeSubjectId("u1"),
            durationMillis: 7,
            trace: {
              policyTag: "AllOf",
              allowed: true,
              children: [trace(true), { ...trace(true), policyTag: "Not" }],
              obligations: [],
            },
            // Required on `Allow`, unlike the optional key on a `Trace`, so the
            // rebuilt object always carries it.
            visibleFields: undefined,
            obligations: [],
          }),
        }),
      });

      const back = yield* decodeRecord(
        JSON.parse(JSON.stringify(yield* encodeRecord(toWire(record)))),
      );
      assert.deepStrictEqual(back, record);
    }));
});

describe("optional fields normalise", () => {
  it.effect("an explicitly-undefined optional arrives absent, and reads the same", () =>
    Effect.gen(function* () {
      const record: SinkRecord = new DecisionRecord({
        evaluationId: "e",
        at: 0,
        subjectId: makeSubjectId("u1"),
        policy: P.hasPermission(read),
        // Written explicitly, which is what a caller spreading an options object
        // ends up doing under `exactOptionalPropertyTypes`.
        resource: undefined,
        action: undefined,
        outcome: new Decided({
          decision: new Allow({
            evaluationId: "e",
            subjectId: makeSubjectId("u1"),
            durationMillis: 1,
            trace: trace(true),
            visibleFields: undefined,
            obligations: [],
          }),
        }),
      });

      const back = yield* decodeRecord(
        JSON.parse(JSON.stringify(yield* encodeRecord(toWire(record)))),
      );

      assert.strictEqual(back._tag, "Decision");
      if (back._tag === "Decision") {
        // Absent, not present-and-undefined — and every read of it is the same.
        assert.isFalse(Object.hasOwn(back, "resource"));
        assert.isUndefined(back.resource);
        assert.isUndefined(back.action);
      }
    }));
});

describe("every error variant crosses, and carries its code", () => {
  it.effect("each one round-trips to the same tag and fields", () =>
    Effect.gen(function* () {
      for (const error of everyError) {
        const record: SinkRecord = new DecisionRecord({
          evaluationId: "e",
          at: 0,
          subjectId: makeSubjectId("u1"),
          policy: P.hasPermission(read),
          outcome: new Failed({ error }),
        });

        const back = yield* decodeRecord(
          JSON.parse(JSON.stringify(yield* encodeRecord(toWire(record)))),
        );

        // Narrow to a decision record first — `SinkRecord` is a union, and an
        // obligation record has no `outcome._tag`.
        assert.strictEqual(back._tag, "Decision");
        if (back._tag !== "Decision") continue;
        assert.strictEqual(back.outcome._tag, "Failed", error._tag);
        if (back.outcome._tag !== "Failed") continue;

        const rebuilt = back.outcome.error;
        assert.strictEqual(rebuilt._tag, error._tag);

        // Every field, not just the tag. Asserting the tag alone would pass
        // even if the mapping scrambled every value it carries — which is
        // exactly what mutation testing found it doing.
        //
        // `cause` is excluded because it is rendered to a string on purpose;
        // it has its own tests.
        const fieldsOf = (e: EvaluationError): Record<string, unknown> => {
          const { _tag, cause, ...rest } = { cause: undefined, ...e };
          void _tag;
          void cause;
          return rest;
        };
        assert.deepStrictEqual(fieldsOf(rebuilt), fieldsOf(error), error._tag);
      }
    }));

  it("the wire carries the stable code for every variant", () => {
    for (const error of everyError) {
      const wire = toWire(
        new DecisionRecord({
          evaluationId: "e",
          at: 0,
          subjectId: makeSubjectId("u1"),
          policy: P.hasPermission(read),
          outcome: new Failed({ error }),
        }),
      );

      assert.strictEqual(wire._tag, "Decision");
      if (wire._tag === "Decision") {
        // `ERROR_CODES` exists, per its own comment, "for logging and
        // cross-process correlation". This is that use.
        assert.strictEqual(wire.failed?.code, ERROR_CODES[error._tag]);
      }
    }
  });

  it("a non-string cause is rendered, and the loss is deliberate", () => {
    const wire = toWire(
      new DecisionRecord({
        evaluationId: "e",
        at: 0,
        subjectId: makeSubjectId("u1"),
        policy: P.hasPermission(read),
        outcome: new Failed({
          error: new AttributeResolveError({
            attribute: "clearance",
            cause: new Error("connection reset"),
          }),
        }),
      }),
    );

    assert.strictEqual(wire._tag, "Decision");
    if (wire._tag === "Decision") {
      // An `Error` keeps its message, which is the part a reader wants.
      assert.strictEqual(wire.failed?.cause, "connection reset");
    }
  });

  it("a cause that cannot be stringified does not take the record down", () => {
    // A sink must never break the thing it observes, and that includes the
    // encoder a transport calls.
    const hostile = {
      toString() {
        throw new Error("no");
      },
    };

    const wire = toWire(
      new DecisionRecord({
        evaluationId: "e",
        at: 0,
        subjectId: makeSubjectId("u1"),
        policy: P.hasPermission(read),
        outcome: new Failed({
          error: new AttributeResolveError({ attribute: "x", cause: hostile }),
        }),
      }),
    );

    assert.strictEqual(wire._tag, "Decision");
    if (wire._tag === "Decision") {
      assert.strictEqual(wire.failed?.cause, "<unrenderable cause>");
    }
  });
});

describe("every literal the wire admits is exercised", () => {
  it.effect("each cache outcome round-trips", () =>
    Effect.gen(function* () {
      // A literal a test never sends is a literal a mutated schema could drop
      // without anything noticing.
      for (const cache of ["hit", "coalesced", "miss"] as const) {
        const record: SinkRecord = new DecisionRecord({ ...allowRecord, cache });
        const back = yield* decodeRecord(
          JSON.parse(JSON.stringify(yield* encodeRecord(toWire(record)))),
        );
        assert.strictEqual(back._tag, "Decision");
        if (back._tag === "Decision") assert.strictEqual(back.cache, cache);
      }
    }));

  it.effect("each obligation outcome round-trips", () =>
    Effect.gen(function* () {
      for (const outcome of [
        "Discharged",
        "HandlerFailed",
        "Refused",
        "NotRequired",
      ] as const) {
        const record: SinkRecord = new ObligationRecord({
          evaluationId: "e",
          at: 0,
          outcome,
          obligationIds: ["audit.log"],
        });
        const back = yield* decodeRecord(
          JSON.parse(JSON.stringify(yield* encodeRecord(toWire(record)))),
        );
        assert.strictEqual(back._tag, "Obligations");
        if (back._tag === "Obligations") assert.strictEqual(back.outcome, outcome);
      }
    }));

  it("toWire omits an absent optional rather than writing undefined", () => {
    const wire = toWire(
      new DecisionRecord({
        evaluationId: "e",
        at: 0,
        subjectId: makeSubjectId("u1"),
        policy: P.hasPermission(read),
        outcome: new Failed({ error: new PolicyTooDeep({ maxDepth: 8 }) }),
      }),
    );

    assert.strictEqual(wire._tag, "Decision");
    if (wire._tag === "Decision") {
      // Asserted on the wire object itself, before the schema gets a chance to
      // normalise it away.
      assert.isFalse(Object.hasOwn(wire, "resource"));
      assert.isFalse(Object.hasOwn(wire, "action"));
      assert.isFalse(Object.hasOwn(wire, "cache"));
      assert.isFalse(Object.hasOwn(wire, "decided"));
    }
  });

  it("an absent MissingAction expectation stays absent", () => {
    const wire = toWire(
      new DecisionRecord({
        evaluationId: "e",
        at: 0,
        subjectId: makeSubjectId("u1"),
        policy: P.hasPermission(read),
        outcome: new Failed({ error: new MissingAction({ expected: undefined }) }),
      }),
    );

    assert.strictEqual(wire._tag, "Decision");
    if (wire._tag === "Decision") {
      assert.isFalse(Object.hasOwn(wire.failed ?? {}, "expected"));
    }
  });

  it("a present MissingAction expectation is carried", () => {
    const wire = toWire(
      new DecisionRecord({
        evaluationId: "e",
        at: 0,
        subjectId: makeSubjectId("u1"),
        policy: P.hasPermission(read),
        outcome: new Failed({ error: new MissingAction({ expected: "read" }) }),
      }),
    );

    assert.strictEqual(wire._tag, "Decision");
    if (wire._tag === "Decision") assert.strictEqual(wire.failed?.expected, "read");
  });
});

describe("the wire is untrusted", () => {
  it.effect("a malformed payload fails rather than half-building a record", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(decodeRecord({ _tag: "Decision" }));
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("an unknown tag is refused", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(decodeRecord({ _tag: "Whatever" }));
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("a Decision record with no subjectId — an older sender, mid rolling-deploy — still decodes", () =>
    Effect.gen(function* () {
      const back = yield* decodeRecord({
        _tag: "Decision",
        evaluationId: "e",
        at: 0,
        policy: P.hasPermission(read),
      });
      assert.strictEqual(back._tag, "Decision");
      if (back._tag === "Decision") assert.strictEqual(back.subjectId, "");
    }));

  it.effect("a policy that is not a policy is refused", () =>
    Effect.gen(function* () {
      // The policy travels as a real codec round-trip, so a hostile payload
      // cannot smuggle a shape the evaluator would then walk.
      const result = yield* Effect.result(
        decodeRecord({
          _tag: "Decision",
          evaluationId: "e",
          at: 0,
          policy: { _tag: "NotARealPolicy" },
        }),
      );
      assert.strictEqual(result._tag, "Failure");
    }));

  it("every error tag missing its fields decodes to empty ones, not undefined", () => {
    // One case per fallback. `undefined` reaching `makeResourceId` would produce
    // a branded value of `undefined`, which is worse than an empty one because
    // it type-checks everywhere downstream.
    const cases = [
      { _tag: "MissingResource" as const, code: "ACL004", read: (e: EvaluationError) =>
        e._tag === "MissingResource" ? e.attribute : "?" },
      { _tag: "RelationshipResolveError" as const, code: "ACL003", read: (e: EvaluationError) =>
        e._tag === "RelationshipResolveError" ? `${e.relation}|${e.resourceId}` : "?" },
      { _tag: "MissingResourceId" as const, code: "ACL005", read: (e: EvaluationError) =>
        e._tag === "MissingResourceId" ? e.relation : "?" },
      { _tag: "DecisionHistoryUnavailable" as const, code: "ACL011", read: (e: EvaluationError) =>
        e._tag === "DecisionHistoryUnavailable" ? e.event : "?" },
      { _tag: "PolicyTooDeep" as const, code: "ACL006", read: (e: EvaluationError) =>
        e._tag === "PolicyTooDeep" ? String(e.maxDepth) : "?" },
    ];

    const expected = ["", "|", "", "", "0"];

    cases.forEach((c, i) => {
      const back = fromWire({
        _tag: "Decision",
        evaluationId: "e",
        at: 0,
        subjectId: "u1",
        policy: P.hasPermission(read),
        failed: { _tag: c._tag, code: c.code },
      });

      assert.strictEqual(back._tag, "Decision");
      if (back._tag === "Decision" && back.outcome._tag === "Failed") {
        assert.strictEqual(back.outcome.error._tag, c._tag);
        assert.strictEqual(c.read(back.outcome.error), expected[i], c._tag);
      }
    });
  });

  it("a Deny arriving with no reason gets the same default the evaluator uses", () => {
    const back = fromWire({
      _tag: "Decision",
      evaluationId: "e",
      at: 0,
      subjectId: "u1",
      policy: P.hasPermission(read),
      decided: {
        _tag: "Deny",
        evaluationId: "e",
        subjectId: "u1",
        durationMillis: 1,
        trace: trace(false),
        obligations: [],
      },
    });

    assert.strictEqual(back._tag, "Decision");
    if (back._tag === "Decision" && back.outcome._tag === "Decided") {
      const decision = back.outcome.decision;
      assert.strictEqual(decision._tag, "Deny");
      if (decision._tag === "Deny") assert.strictEqual(decision.reason, "denied");
    }
  });

  it("an error payload missing a field its tag requires decodes to an empty one", () => {
    // The `?? ""` fallbacks. Unreachable for anything this module encodes — the
    // schema types every field optional because one struct serves seven shapes —
    // so a sender omitting a field yields an empty string rather than letting
    // `undefined` reach a branded constructor.
    const back = fromWire({
      _tag: "Decision",
      evaluationId: "e",
      at: 0,
      subjectId: "u1",
      policy: P.hasPermission(read),
      failed: { _tag: "AttributeResolveError", code: "ACL002" },
    });

    assert.strictEqual(back._tag, "Decision");
    if (back._tag === "Decision" && back.outcome._tag === "Failed") {
      const error = back.outcome.error;
      assert.strictEqual(error._tag, "AttributeResolveError");
      if (error._tag === "AttributeResolveError") assert.strictEqual(error.attribute, "");
    }
  });

  it("a record naming neither outcome becomes a Failed that says so", () => {
    // Unreachable for anything this module encoded, but the wire is untrusted.
    // A row saying "the sender sent neither outcome" beats a dropped record, and
    // can never be mistaken for a decision.
    const back = fromWire({
      _tag: "Decision",
      evaluationId: "e",
      at: 0,
      subjectId: "u1",
      policy: P.hasPermission(read),
    });

    assert.strictEqual(back._tag, "Decision");
    if (back._tag === "Decision" && back.outcome._tag === "Failed") {
      // The marker text is the whole value of this branch — a reader has to be
      // able to tell a malformed payload from a real failure.
      const error = back.outcome.error;
      assert.strictEqual(error._tag, "MissingResource");
      if (error._tag === "MissingResource") {
        assert.include(error.attribute, "malformed record");
      }
    }
  });
});

describe("round-trip property", () => {
  it("holds over generated policies", () => {
    // The drift-catcher. The mapping between `SinkRecord` and its wire form is
    // hand-written — AGENTS.md §4 requires `Data.TaggedError`, so the errors
    // cannot be Schema-derived at their definition — and a hand-written codec
    // drifting from its type is the defect this library was rewritten to
    // remove. This is what stands in for the gate the policy codec gets.
    const leaf: FastCheck.Arbitrary<P.Policy> = FastCheck.oneof(
      FastCheck.constant(P.hasPermission(read)),
      FastCheck.constantFrom("editor", "admin").map((r) => P.hasRole(r)),
      FastCheck.integer({ min: 0, max: 5 }).map((n) =>
        P.hasAttribute("clearance", M.gte(n)),
      ),
      FastCheck.constant(P.hasAction("read")),
    );

    const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec((tie) => ({
      node: FastCheck.oneof(
        { maxDepth: 3 },
        leaf,
        FastCheck.array(tie("node") as FastCheck.Arbitrary<P.Policy>, {
          minLength: 1,
          maxLength: 3,
        }).map((ps) => P.allOf(ps)),
        (tie("node") as FastCheck.Arbitrary<P.Policy>).map((p) => P.not(p)),
        (tie("node") as FastCheck.Arbitrary<P.Policy>).map((p) => P.labeled("audit", p)),
      ),
    })).node as FastCheck.Arbitrary<P.Policy>;

    FastCheck.assert(
      FastCheck.property(
        tree,
        FastCheck.boolean(),
        FastCheck.string(),
        (policy, allowed, reason) => {
          const decision: Allow | Deny = allowed
            ? new Allow({
                evaluationId: "e",
                subjectId: makeSubjectId("u1"),
                durationMillis: 1,
                trace: trace(true),
                visibleFields: undefined,
                obligations: [],
              })
            : new Deny({
                evaluationId: "e",
                subjectId: makeSubjectId("u1"),
                durationMillis: 1,
                trace: { ...trace(false), reason },
                reason,
              });

          const record: SinkRecord = new DecisionRecord({
            evaluationId: "e",
            at: 0,
            subjectId: makeSubjectId("u1"),
            policy,
            outcome: new Decided({ decision }),
          });

          return JSON.stringify(fromWire(toWire(record))) === JSON.stringify(record);
        },
      ),
      { numRuns: 200 },
    );
  });
});
