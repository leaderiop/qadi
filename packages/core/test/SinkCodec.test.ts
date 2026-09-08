import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "effect/testing/FastCheck";
import { Allow, Deny } from "../src/Decision.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord } from "../src/DecisionRecord.ts";
import {
  AttributeResolveError,
  CustomPredicateError,
  DecisionHistoryUnavailable,
  ERROR_CODES,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
  RelationshipResolveError,
  SignatureHistoryUnavailable,
} from "../src/Errors.ts";
import type { EvaluationError } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import {
  decodeRecord,
  encodeRecord,
  fromWire,
  isJsonSafe,
  isRecordJsonSafe,
  toWire,
} from "../src/SinkCodec.ts";

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
  new SignatureHistoryUnavailable({
    subjectId: makeSubjectId("u1"),
    resourceId: makeResourceId("doc-1"),
    cause: "signature store offline",
  }),
  new CustomPredicateError({ name: "isOwner", reason: "unregistered" }),
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
  ...(allowed ? { visibleFields: ["id", "title"] } : {}),
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

  it.effect("a wire error record missing `code` still decodes — ticket 163, code is never read on decode", () =>
    Effect.gen(function* () {
      // `code` is written on encode but never read on decode (`decodeError`
      // dispatches purely on `_tag`), and `SinkRecordWire` otherwise tolerates
      // an older sender's payload predating a field (see `subjectId`'s own
      // doc comment). Requiring `code` bought no safety and only cost
      // rejecting an otherwise-valid `failed` payload from a sender that
      // predates the code being added.
      const back = yield* decodeRecord({
        _tag: "Decision",
        evaluationId: "e",
        at: 0,
        subjectId: "u1",
        policy: P.hasPermission(read),
        failed: { _tag: "MissingResource", attribute: "owner" },
      });

      assert.strictEqual(back._tag, "Decision");
      if (back._tag === "Decision" && back.outcome._tag === "Failed") {
        const error = back.outcome.error;
        assert.strictEqual(error._tag, "MissingResource");
        if (error._tag === "MissingResource") assert.strictEqual(error.attribute, "owner");
      }
    }));

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
      { _tag: "SignatureHistoryUnavailable" as const, code: "ACL014", read: (e: EvaluationError) =>
        e._tag === "SignatureHistoryUnavailable" ? e.subjectId : "?" },
    ];

    const expected = ["", "|", "", "", "0", ""];

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

  it("a record naming neither outcome becomes a Failed that says so (ticket 96: pins the current MissingResource/ACL004 stand-in)", () => {
    // Unreachable for anything this module encoded, but the wire is untrusted.
    // A row saying "the sender sent neither outcome" beats a dropped record, and
    // can never be mistaken for a decision.
    //
    // This pins today's *known-conflated* behavior (see the doc comment on
    // `fromWire`'s `outcome` fallback): a protocol violation is reported by
    // reusing `MissingResource`, a genuine resolver-wiring failure's tag and
    // `ACL004` code. A future dedicated marker replacing this should update
    // this test alongside it, not merely satisfy it by accident.
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
      assert.strictEqual(ERROR_CODES[error._tag], "ACL004");
      if (error._tag === "MissingResource") {
        assert.include(error.attribute, "malformed record");
      }
    }
  });

  it("a record naming BOTH outcomes silently prefers `decided` (ticket 155: pins current behavior)", () => {
    // Unreachable for anything this module encodes, but the wire is
    // untrusted, and nothing today rejects a record naming both. See the
    // conflation note on `fromWire`'s `outcome` fallback: there is no
    // principled reason `decided` wins over `failed` here — it is an
    // artifact of check order, not a decision — and a dedicated "both
    // present" marker is the right fix, tracked rather than built in this
    // change (it would require a new `EvaluationError` tag touched by
    // `@qadi/http`'s exhaustive `EnforcementError` match, among other call
    // sites). This test exists so that changing the preference, or rejecting
    // the record outright, is a deliberate edit to this test rather than an
    // unnoticed behavior change.
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
      failed: { _tag: "MissingResource", code: "ACL004", attribute: "owner" },
    });

    assert.strictEqual(back._tag, "Decision");
    if (back._tag === "Decision") {
      assert.strictEqual(back.outcome._tag, "Decided");
    }
  });
});

describe("the wire's recursive positions are depth-bounded before Schema recurses", () => {
  // Nests a policy `n` `Not`s deep, terminating in a leaf — the same shape
  // `Policy.test.ts` uses to pin `Policy.ts`'s own `fromJson`/`fromJsonValue`
  // guard, reused here because `decodeRecordWire`'s guard must refuse at the
  // identical bound.
  const wireWithNestedPolicy = (depth: number): unknown => {
    let policy: unknown = { _tag: "HasRole", role: "x" };
    for (let i = 0; i < depth; i++) policy = { _tag: "Not", policy };
    return { _tag: "Decision", evaluationId: "e", at: 0, policy };
  };

  // Nests a `Trace` `depth` deep through its own recursive `children` array —
  // the position `Policy.ts`'s guard was never asked to cover, since
  // `TraceSchema` does not exist there.
  const wireWithNestedTrace = (depth: number): unknown => {
    let trace: unknown = {
      policyTag: "HasRole",
      allowed: true,
      children: [],
      obligations: [],
    };
    for (let i = 0; i < depth; i++) {
      trace = { policyTag: "Not", allowed: true, children: [trace], obligations: [] };
    }
    return {
      _tag: "Decision",
      evaluationId: "e",
      at: 0,
      policy: { _tag: "HasRole", role: "x" },
      decided: {
        _tag: "Allow",
        evaluationId: "e",
        subjectId: "u1",
        durationMillis: 0,
        trace,
        obligations: [],
      },
    };
  };

  it.effect("a policy nested past MAX_DECODE_DEPTH fails typed, naming the bound", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        decodeRecord(wireWithNestedPolicy(P.MAX_DECODE_DEPTH + 10)),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "PolicyDecodeTooDeep");
        if (result.failure._tag === "PolicyDecodeTooDeep") {
          assert.strictEqual(result.failure.maxDepth, P.MAX_DECODE_DEPTH);
        }
      }
    }));

  it.effect("a trace nested past MAX_DECODE_DEPTH fails typed, naming the bound", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        decodeRecord(wireWithNestedTrace(P.MAX_DECODE_DEPTH + 10)),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "PolicyDecodeTooDeep");
        if (result.failure._tag === "PolicyDecodeTooDeep") {
          assert.strictEqual(result.failure.maxDepth, P.MAX_DECODE_DEPTH);
        }
      }
    }));

  it.effect("a policy nested well within the bound still decodes", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(decodeRecord(wireWithNestedPolicy(4)));
      assert.strictEqual(result._tag, "Success");
    }));

  // The regression this guards: before this guard ran ahead of `Schema`, a
  // deeply-nested policy or trace on the wire raised a raw `RangeError` out
  // of `Schema.decodeUnknownEffect` — an uncaught defect, not a typed
  // `Effect` failure. Mirrors `Policy.test.ts`'s identical test for
  // `fromJson`.
  it.effect("an extreme depth (60,000) fails through the Effect channel, never as a defect", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(decodeRecord(wireWithNestedPolicy(60_000)));
      assert.strictEqual(result._tag, "Failure");
    }));
});

describe("decodeRecord rejects an excess property inside its embedded Policy, matching Policy.ts", () => {
  // `decodeSinkRecordWireUnknown` used to decode with no `ParseOptions` at all,
  // unlike every one of `Policy.ts`'s own untrusted entry points — so a wire
  // record whose embedded policy carried a typo'd field decoded successfully,
  // silently dropping the grant rather than reporting the typo. Threading
  // `UNTRUSTED_DECODE_OPTIONS` through closes it; this pins that it stays
  // closed the same way `Policy.test.ts`'s own excess-property suite does.
  it.effect("a typo'd field inside the embedded policy is a decode failure, not a silent drop", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        decodeRecord({
          _tag: "Decision",
          evaluationId: "e",
          at: 0,
          policy: { _tag: "HasRole", role: "admin", rloe: "admin" },
        }),
      );
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("the positive control: the same embedded policy with no excess key still decodes", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        decodeRecord({
          _tag: "Decision",
          evaluationId: "e",
          at: 0,
          policy: { _tag: "HasRole", role: "admin" },
        }),
      );
      assert.strictEqual(result._tag, "Success");
    }));
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

    const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec<{ node: P.Policy }>((tie) => ({
      node: FastCheck.oneof(
        { maxDepth: 3 },
        leaf,
        FastCheck.array(tie("node"), {
          minLength: 1,
          maxLength: 3,
        }).map((ps) => P.allOf(ps)),
        tie("node").map((p) => P.not(p)),
        tie("node").map((p) => P.labeled("audit", p)),
      ),
    })).node;

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
      // Explicit seed, matching every other FastCheck-based property test in
      // this scope: a CI failure must replay byte-for-byte from a recorded
      // seed, not only from whatever FastCheck happened to print on that
      // run's log.
      { numRuns: 200, seed: 1032 },
    );
  });
});

describe("isJsonSafe", () => {
  it("accepts every plain-JSON leaf, null, and Date", () => {
    assert.isTrue(isJsonSafe(null));
    assert.isTrue(isJsonSafe("x"));
    assert.isTrue(isJsonSafe(1));
    assert.isTrue(isJsonSafe(true));
    assert.isTrue(isJsonSafe(new Date()));
  });

  it("refuses undefined, functions, and other shapes JSON.stringify silently drops or lies about", () => {
    assert.isFalse(isJsonSafe(undefined));
    assert.isFalse(isJsonSafe(() => {}));
    assert.isFalse(isJsonSafe(Symbol("x")));
    assert.isFalse(isJsonSafe(1n));
  });

  it("refuses NaN and both infinities — JSON.stringify silently renders every one of them as null", () => {
    assert.isFalse(isJsonSafe(Number.NaN));
    assert.isFalse(isJsonSafe(Number.POSITIVE_INFINITY));
    assert.isFalse(isJsonSafe(Number.NEGATIVE_INFINITY));
    // Nested, not just at the top level — the same "round-trip without
    // lying" contract applies at every depth the walk reaches.
    assert.isFalse(isJsonSafe({ a: Number.NaN }));
    assert.isFalse(isJsonSafe([1, Number.POSITIVE_INFINITY]));
  });

  it("still accepts every finite number, including zero and negatives", () => {
    assert.isTrue(isJsonSafe(0));
    assert.isTrue(isJsonSafe(-0));
    assert.isTrue(isJsonSafe(-1.5));
    assert.isTrue(isJsonSafe(Number.MAX_SAFE_INTEGER));
  });

  it("walks a plain object or array recursively", () => {
    assert.isTrue(isJsonSafe({ a: 1, b: ["x", { c: null }] }));
    assert.isFalse(isJsonSafe({ a: 1, b: () => {} }));
    assert.isFalse(isJsonSafe([1, 2, undefined]));
  });

  it("refuses a circular reference rather than recursing forever", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    assert.isFalse(isJsonSafe(circular));
  });

  it("does not falsely refuse a value reachable twice via two different paths", () => {
    // The same non-cyclic child appearing under two keys is not a cycle —
    // `seen` tracks the current path, not everything visited overall.
    const shared = { x: 1 };
    assert.isTrue(isJsonSafe({ a: shared, b: shared }));
  });
});

describe("isRecordJsonSafe", () => {
  it("is true for an ObligationRecord, which carries neither unknown field", () => {
    const record: SinkRecord = new ObligationRecord({
      evaluationId: "e",
      at: 0,
      outcome: "Refused",
      obligationIds: ["audit.log"],
    });
    assert.isTrue(isRecordJsonSafe(record));
  });

  it("is true for a Decision record whose resource and policy are both safe", () => {
    const record: SinkRecord = new DecisionRecord({
      evaluationId: "e",
      at: 0,
      subjectId: makeSubjectId("u1"),
      policy: P.hasPermission(read),
      resource: { id: "doc-1" },
      outcome: new Failed({ error: new MissingResource({ attribute: "x" }) }),
    });
    assert.isTrue(isRecordJsonSafe(record));
  });

  it("is false when resource carries an unsafe value", () => {
    const record: SinkRecord = new DecisionRecord({
      evaluationId: "e",
      at: 0,
      subjectId: makeSubjectId("u1"),
      policy: P.hasPermission(read),
      resource: { fn: () => {} },
      outcome: new Failed({ error: new MissingResource({ attribute: "x" }) }),
    });
    assert.isFalse(isRecordJsonSafe(record));
  });

  it("is false when a HasCustom policy node's params carries an unsafe value — the gap a resource-only check misses", () => {
    // The regression this pins: a record whose `resource` is absent (or
    // perfectly safe) but whose `policy` carries a `HasCustom` node with an
    // unsafe `params` used to pass a `resource`-only check like the one
    // `@qadi/audit`'s `encodeAuditEntry` and `@qadi/http`'s decision-stream
    // route each had.
    const record: SinkRecord = new DecisionRecord({
      evaluationId: "e",
      at: 0,
      subjectId: makeSubjectId("u1"),
      policy: P.hasCustom("isOwner", { onFail: () => {} }),
      outcome: new Failed({ error: new MissingResource({ attribute: "x" }) }),
    });

    // The old, incomplete check would have let this through.
    assert.isTrue(record.resource === undefined || isJsonSafe(record.resource));
    assert.isFalse(isRecordJsonSafe(record));
  });

  it("is true when a HasCustom policy node's params is itself JSON-safe", () => {
    const record: SinkRecord = new DecisionRecord({
      evaluationId: "e",
      at: 0,
      subjectId: makeSubjectId("u1"),
      policy: P.hasCustom("isOwner", { minClearance: 3 }),
      outcome: new Failed({ error: new MissingResource({ attribute: "x" }) }),
    });
    assert.isTrue(isRecordJsonSafe(record));
  });
});
