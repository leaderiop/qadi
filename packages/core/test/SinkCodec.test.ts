import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as FastCheck from "fast-check";
import { Allow, Deny } from "../src/Decision.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord } from "../src/DecisionRecord.ts";
import {
  AttributeResolveError,
  CustomPredicateError,
  DecisionHistoryUnavailable,
  ERROR_CODES,
  errorCode,
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
  encodeRecordSync,
  fromWire,
  isJsonSafe,
  isRecordJsonSafe,
  toWire,
} from "../src/SinkCodec.ts";

const read = permission("doc", "read");

/**
 * One factory per `EvaluationError` tag (ADR-QD-060) — `Record`, not an array,
 * so a tenth tag added to the union without a matching entry here is a
 * compile error (TS2741) rather than a fixture someone forgot to extend.
 */
const everyErrorFactory: Record<EvaluationError["_tag"], () => EvaluationError> = {
  MissingResource: () => new MissingResource({ attribute: "owner" }),
  MissingAction: () => new MissingAction({ expected: "read" }),
  AttributeResolveError: () =>
    new AttributeResolveError({ attribute: "clearance", cause: "store offline" }),
  RelationshipResolveError: () =>
    new RelationshipResolveError({
      relation: "owner",
      resourceId: makeResourceId("doc-1"),
      cause: "graph offline",
    }),
  MissingResourceId: () => new MissingResourceId({ relation: "owner" }),
  DecisionHistoryUnavailable: () =>
    new DecisionHistoryUnavailable({ event: "approved", cause: "history offline" }),
  PolicyTooDeep: () => new PolicyTooDeep({ maxDepth: 64 }),
  SignatureHistoryUnavailable: () =>
    new SignatureHistoryUnavailable({
      subjectId: makeSubjectId("u1"),
      resourceId: makeResourceId("doc-1"),
      cause: "signature store offline",
    }),
  CustomPredicateError: () => new CustomPredicateError({ name: "isOwner", reason: "unregistered" }),
};

/** Every `EvaluationError` variant, for tests that just need to iterate them. */
const everyError: ReadonlyArray<EvaluationError> = [
  ...Object.values(everyErrorFactory).map((make) => make()),
  // A second `MissingAction` with `expected: undefined` — the factory record
  // above is one-per-tag, but this tag has an internal absent/present split
  // worth covering twice.
  new MissingAction({ expected: undefined }),
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

describe("every error variant crosses, and its stable code is derivable from _tag", () => {
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

        // Every field, not just the tag — asserting the tag alone would pass
        // even if the mapping scrambled every value it carries. `cause` is
        // included: `Schema.Defect()` round-trips a plain string (every
        // fixture's cause) unchanged, unlike the old hand-rendered version
        // this replaced (ADR-QD-060), which is why it no longer needs
        // excluding here.
        assert.deepStrictEqual(rebuilt, error, error._tag);

        // `ERROR_CODES`/`errorCode` exist, per their own comment, "for
        // logging and cross-process correlation" — derived from the decoded
        // `_tag`, not carried on the wire (ADR-QD-060).
        assert.strictEqual(errorCode(rebuilt), ERROR_CODES[error._tag]);
      }
    }));

  it.effect("an Error cause survives round-trip recognizably, via Schema.Defect", () =>
    Effect.gen(function* () {
      const record: SinkRecord = new DecisionRecord({
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
      });

      const back = yield* decodeRecord(
        JSON.parse(JSON.stringify(yield* encodeRecord(toWire(record)))),
      );

      assert.strictEqual(back._tag, "Decision");
      if (back._tag === "Decision" && back.outcome._tag === "Failed") {
        const error = back.outcome.error;
        assert.strictEqual(error._tag, "AttributeResolveError");
        if (error._tag === "AttributeResolveError") {
          // `Schema.Defect()` reconstructs a real `Error`, not a plain string —
          // strictly more capable than the hand-rendered version it replaced.
          assert.instanceOf(error.cause, Error);
          if (error.cause instanceof Error) {
            assert.strictEqual(error.cause.message, "connection reset");
          }
        }
      }
    }));

  it.effect("a cause that cannot be JSON-represented does not take the record down", () =>
    Effect.gen(function* () {
      // A sink must never break the thing it observes, and that includes the
      // encoder a transport calls — `Schema.Defect()`'s own fallback (not a
      // hand-rolled one) is what is exercised here now (ADR-QD-060).
      const hostile = {
        toString() {
          throw new Error("no");
        },
      };

      const record: SinkRecord = new DecisionRecord({
        evaluationId: "e",
        at: 0,
        subjectId: makeSubjectId("u1"),
        policy: P.hasPermission(read),
        outcome: new Failed({
          error: new AttributeResolveError({ attribute: "x", cause: hostile }),
        }),
      });

      const encoded = yield* encodeRecord(toWire(record));
      assert.strictEqual(encoded._tag, "Decision");
      if (encoded._tag === "Decision") {
        // Reached JSON at all — a hostile `cause` did not throw the encoder —
        // and round-trips through JSON.stringify without throwing either.
        assert.doesNotThrow(() => JSON.stringify(encoded));
      }
    }));
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

  it.effect("an absent MissingAction expectation is absent on the JSON wire", () =>
    Effect.gen(function* () {
      // `expected: undefined` is present-with-`undefined` on the `Schema.TaggedError`
      // instance itself (`Schema.UndefinedOr`, not an absent key) — the omission
      // this pins happens where it always has for every other optional field in
      // this file: `JSON.stringify` drops an `undefined`-valued key.
      const encoded = yield* encodeRecord(
        toWire(
          new DecisionRecord({
            evaluationId: "e",
            at: 0,
            subjectId: makeSubjectId("u1"),
            policy: P.hasPermission(read),
            outcome: new Failed({ error: new MissingAction({ expected: undefined }) }),
          }),
        ),
      );
      const json: unknown = JSON.parse(JSON.stringify(encoded));

      assert.strictEqual(encoded._tag, "Decision");
      if (
        Predicate.isObject(json) &&
        Predicate.hasProperty(json, "failed") &&
        Predicate.isObject(json.failed)
      ) {
        assert.isFalse(Object.hasOwn(json.failed, "expected"));
      }
    }));

  it.effect("a present MissingAction expectation is carried onto the JSON wire", () =>
    Effect.gen(function* () {
      const encoded = yield* encodeRecord(
        toWire(
          new DecisionRecord({
            evaluationId: "e",
            at: 0,
            subjectId: makeSubjectId("u1"),
            policy: P.hasPermission(read),
            outcome: new Failed({ error: new MissingAction({ expected: "read" }) }),
          }),
        ),
      );

      assert.strictEqual(encoded._tag, "Decision");
      if (encoded._tag === "Decision" && encoded.failed?._tag === "MissingAction") {
        assert.strictEqual(encoded.failed.expected, "read");
      }
    }));
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

  it.effect("a decode refuses an error payload missing a field its tag requires", () =>
    Effect.gen(function* () {
      // Pre-ADR-QD-060, one all-optional struct served all nine tags, so a
      // sender omitting a field a tag actually requires decoded to an empty
      // string via `?? ""` rather than failing. Each tag is now its own
      // precisely-typed `Schema.TaggedError`, so the same omission is a
      // decode failure instead — closer to what `decodeRecord`'s own doc
      // comment already promises ("validates; does not cast").
      const payloads: ReadonlyArray<unknown> = [
        { _tag: "MissingResource" }, // missing `attribute`
        { _tag: "RelationshipResolveError", relation: "owner" }, // missing `resourceId`/`cause`
        { _tag: "MissingResourceId" }, // missing `relation`
        { _tag: "DecisionHistoryUnavailable", event: "approved" }, // missing `cause`
        { _tag: "PolicyTooDeep" }, // missing `maxDepth`
        { _tag: "SignatureHistoryUnavailable" }, // missing `subjectId`/`cause`
        { _tag: "AttributeResolveError", attribute: "x" }, // missing `cause`
      ];

      for (const failed of payloads) {
        const result = yield* Effect.result(
          decodeRecord({
            _tag: "Decision",
            evaluationId: "e",
            at: 0,
            subjectId: "u1",
            policy: P.hasPermission(read),
            failed,
          }),
        );
        assert.strictEqual(result._tag, "Failure", JSON.stringify(failed));
      }
    }));

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
      failed: new MissingResource({ attribute: "owner" }),
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
    // The drift-catcher for what is still hand-written: `Decision`/`Allow`/`Deny`
    // are ordinary domain classes, not `Schema.TaggedError`, so `encodeDecision`/
    // `decodeDecision` still hand-map them the way the nine `EvaluationError`
    // tags no longer need (ADR-QD-060). A hand-written codec drifting from its
    // type is the defect this library was rewritten to remove — this is what
    // stands in for the gate the policy codec gets, for the part still hand-written.
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

  it("encodeRecordSync never throws, and agrees with encodeRecord, over generated records", () => {
    // Issue #107: `DecisionSinkForwarding.ts` switched from `encodeRecord`
    // (`Schema.encodeEffect`) to `encodeRecordSync` (`Schema.encodeSync`) on
    // the claim that this encode is provably total for anything `toWire`
    // produces. This is that claim, checked rather than only argued: 200
    // generated policies, both decision outcomes, run through both encoders,
    // asserting the sync one never throws and both agree byte-for-byte.
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
        tie("node").map((p) => P.obliged(obligation("audit.log"), p)),
      ),
    })).node;

    FastCheck.assert(
      FastCheck.property(tree, FastCheck.boolean(), FastCheck.string(), (policy, allowed, reason) => {
        const decision: Allow | Deny = allowed
          ? new Allow({
              evaluationId: "e",
              subjectId: makeSubjectId("u1"),
              durationMillis: 1,
              trace: trace(true),
              visibleFields: undefined,
              obligations: [obligation("audit.log")],
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

        const wire = toWire(record);
        const sync = encodeRecordSync(wire);
        const viaEffect = Effect.runSync(encodeRecord(wire));
        return JSON.stringify(sync) === JSON.stringify(viaEffect);
      }),
      { numRuns: 200, seed: 4271 },
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
