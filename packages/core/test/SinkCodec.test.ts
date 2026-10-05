import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { Allow, Deny } from "../src/Decision.ts";
import type { Trace } from "../src/Decision.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord } from "../src/DecisionRecord.ts";
import { exceedsJsonDepth } from "../src/DecodeDepthGuard.ts";
import {
  AttributeResolveError,
  CustomPredicateError,
  DecisionHistoryUnavailable,
  DecodeRefusal,
  EncodeRefusal,
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
  decodeSinkRecord,
  decodeSinkRecordString,
  encodeRecord,
  encodeRecordSync,
  encodeSinkRecord,
  encodeSinkRecordString,
  fromWireUnsafe,
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
      // Through the real schema, not just `toWire`/`fromWireUnsafe`: the wire form is
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
      // A distinctive sentinel (PH-03), not `""`: `SubjectId` is a total,
      // non-validating brand, so `""` is itself a legal id a real subject
      // could hold — the fallback must not be confusable with one.
      if (back._tag === "Decision") {
        assert.strictEqual(back.subjectId, "<unknown subject: wire version skew>");
      }
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

  it.effect("a Deny arriving with no reason is refused, not given an invented one", () =>
    Effect.gen(function* () {
      // `DecisionWire` is a tagged union, so a `Deny` without its sentence is not
      // a shape this module ever encodes. It used to decode to a made-up
      // "denied"; a sender that predates the field is a malformed record, not a
      // reason to put words in a denial's mouth.
      const result = yield* Effect.result(
        decodeRecord({
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
        }),
      );
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("an Allow carrying a reason is refused", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        decodeRecord({
          _tag: "Decision",
          evaluationId: "e",
          at: 0,
          subjectId: "u1",
          policy: P.hasPermission(read),
          decided: {
            _tag: "Allow",
            evaluationId: "e",
            subjectId: "u1",
            durationMillis: 1,
            trace: trace(true),
            obligations: [],
            reason: "a verdict that permits has nothing to refuse",
          },
        }),
      );
      assert.strictEqual(result._tag, "Failure");
    }));

  it("a record naming neither outcome becomes a Failed that says so (ticket 96: pins the current MissingResource/ACL004 stand-in)", () => {
    // Unreachable for anything this module encoded, but the wire is untrusted.
    // A row saying "the sender sent neither outcome" beats a dropped record, and
    // can never be mistaken for a decision.
    //
    // This pins today's *known-conflated* behavior (see the doc comment on
    // `fromWireUnsafe`'s `outcome` fallback): a protocol violation is reported by
    // reusing `MissingResource`, a genuine resolver-wiring failure's tag and
    // `ACL004` code. A future dedicated marker replacing this should update
    // this test alongside it, not merely satisfy it by accident.
    const back = fromWireUnsafe({
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
    // conflation note on `fromWireUnsafe`'s `outcome` fallback: there is no
    // principled reason `decided` wins over `failed` here — it is an
    // artifact of check order, not a decision — and a dedicated "both
    // present" marker is the right fix, tracked rather than built in this
    // change (it would require a new `EvaluationError` tag touched by
    // `@qadi/http`'s exhaustive `EnforcementError` match, among other call
    // sites). This test exists so that changing the preference, or rejecting
    // the record outright, is a deliberate edit to this test rather than an
    // unnoticed behavior change.
    const back = fromWireUnsafe({
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
        reason: "no",
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

          return JSON.stringify(fromWireUnsafe(toWire(record))) === JSON.stringify(record);
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

  it("refuses a Map, a Set, a RegExp and a typed array — JSON.stringify renders each as {} or an index object", () => {
    // ARCH-09 C8: each of these walked as a container of `Object.values` —
    // none — and was accepted, then serialised as `{}` (or `{"0":1,"1":2}`),
    // so an ABAC resource such as `{ tags: new Set(["finance"]) }` reached the
    // audit trail and the decision stream as `{ tags: {} }` with no refusal.
    assert.isFalse(isJsonSafe(new Map([["a", 1]])));
    assert.isFalse(isJsonSafe(new Set([1])));
    assert.isFalse(isJsonSafe(/x/));
    assert.isFalse(isJsonSafe(new Uint8Array([1, 2])));
    assert.isFalse(isJsonSafe({ tags: new Set(["finance"]) }));
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

  const failedWithCause = (cause: unknown): SinkRecord =>
    new DecisionRecord({
      evaluationId: "e",
      at: 0,
      subjectId: makeSubjectId("u1"),
      policy: P.hasPermission(read),
      outcome: new Failed({ error: new AttributeResolveError({ attribute: "clearance", cause }) }),
    });

  it("is false when a Failed record's cause has a reference cycle (ARCH-09 T2)", () => {
    // The axios-style shape: an `Error` whose own enumerable `config`/`request`
    // properties point back into each other.
    const config: { url: string; request?: unknown } = { url: "https://attributes.internal/x" };
    const request = { config };
    config.request = request;
    const cause = Object.assign(new Error("Request failed with status code 503"), { config, request });
    assert.isFalse(isRecordJsonSafe(failedWithCause(cause)));
  });

  it("is true for a plain Error cause", () => {
    assert.isTrue(isRecordJsonSafe(failedWithCause(new Error("db down"))));
  });

  it("is false for a BigInt cause", () => {
    assert.isFalse(isRecordJsonSafe(failedWithCause(10n)));
  });

  it("is true for a Decided record whose obligations' attributes are safe", () => {
    assert.isTrue(isRecordJsonSafe(allowRecord));
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

/** The text `encodeSinkRecordString` produces, failing the test on a refusal. */
const stringOf = (record: SinkRecord): string =>
  Result.match(encodeSinkRecordString(record), {
    onSuccess: (text) => text,
    onFailure: (error) => assert.fail(`refused: ${JSON.stringify(error.refusal)}`),
  });

/** The refusal `encodeSinkRecord` gives, or `undefined` when it accepts. */
const refusalOf = (record: SinkRecord): EncodeRefusal | undefined =>
  Result.match(encodeSinkRecord(record), {
    onSuccess: () => undefined,
    onFailure: (error) => error.refusal,
  });

/** A `Failed` record whose resolver error carries `cause`, and `resource` if given. */
const failedRecordWith = (cause: unknown, resource?: Record<string, unknown>): SinkRecord =>
  new DecisionRecord({
    evaluationId: "f",
    at: 1,
    subjectId: makeSubjectId("u1"),
    policy: P.hasPermission(read),
    ...(resource === undefined ? {} : { resource }),
    outcome: new Failed({ error: new AttributeResolveError({ attribute: "clearance", cause }) }),
  });

/** A record with a harmless outcome, carrying `resource` and `policy`. */
const recordWith = (options: { readonly resource?: Record<string, unknown>; readonly policy?: P.Policy }) =>
  new DecisionRecord({
    evaluationId: "r",
    at: 1,
    subjectId: makeSubjectId("u1"),
    policy: options.policy ?? P.hasPermission(read),
    ...(options.resource === undefined ? {} : { resource: options.resource }),
    outcome: new Failed({ error: new MissingResource({ attribute: "owner" }) }),
  });

/** The `cause` an encoded `Failed` record carries, read back from its JSON text. */
const causeOnTheWire = (record: SinkRecord): unknown => {
  const parsed: unknown = JSON.parse(stringOf(record));
  return Predicate.hasProperty(parsed, "failed") && Predicate.hasProperty(parsed.failed, "cause")
    ? parsed.failed.cause
    : "<absent>";
};

/** An axios-style HTTP client error: `config`/`request` reference each other. */
const httpClientError = (): Error => {
  const config: { url: string; request?: unknown } = { url: "https://attributes.internal/x" };
  const request = { config };
  config.request = request;
  return Object.assign(new Error("Request failed with status code 503"), { config, request });
};

const nestedAllOf = (levels: number): P.Policy => {
  let policy: P.Policy = P.hasPermission(read);
  for (let i = 0; i < levels; i++) policy = P.allOf([policy]);
  return policy;
};

const decidedWith = (policy: P.Policy, decisionTrace: Trace): SinkRecord =>
  new DecisionRecord({
    evaluationId: "d",
    at: 1,
    subjectId: makeSubjectId("u1"),
    policy,
    outcome: new Decided({
      decision: new Allow({
        evaluationId: "d",
        subjectId: makeSubjectId("u1"),
        durationMillis: 1,
        trace: decisionTrace,
        visibleFields: undefined,
        obligations: [],
      }),
    }),
  });

const nestedTrace = (levels: number): Trace => {
  let node: Trace = { policyTag: "HasPermission", allowed: true, children: [], obligations: [] };
  for (let i = 0; i < levels; i++) node = { policyTag: "AllOf", allowed: true, children: [node], obligations: [] };
  return node;
};

describe("encodeSinkRecord — the outbound operation (ARCH-09)", () => {
  describe("a resolver cause crosses through Schema.Defect(), never refused", () => {
    it("an Error cause becomes {name, message}", () => {
      assert.deepStrictEqual(causeOnTheWire(failedRecordWith(new Error("db down"))), {
        name: "Error",
        message: "db down",
      });
    });

    it("a cyclic cause is accepted with the cycle dropped", () => {
      const cyclic: Record<string, unknown> = { a: 1 };
      cyclic.self = cyclic;
      assert.deepStrictEqual(causeOnTheWire(failedRecordWith(cyclic)), { a: 1 });
    });

    it("a BigInt cause becomes \"10n\"", () => {
      assert.strictEqual(causeOnTheWire(failedRecordWith(10n)), "10n");
    });

    it("NaN in a cause becomes null", () => {
      assert.deepStrictEqual(causeOnTheWire(failedRecordWith({ n: Number.NaN })), { n: null });
    });

    it("the HTTP-client error becomes {name, message}", () => {
      assert.deepStrictEqual(causeOnTheWire(failedRecordWith(httpClientError())), {
        name: "Error",
        message: "Request failed with status code 503",
      });
    });
  });

  describe("a value that would not round-trip is refused, with its path", () => {
    it("a cyclic resource is Circular where the repeat is met", () => {
      // The walk runs over the encoded output, and the schema encode copies a
      // resource's top level into a fresh object: the copy's `self` is the
      // caller's object, whose own `self` is where the walk meets it again.
      const cyclic: Record<string, unknown> = { name: "doc-1" };
      cyclic.self = cyclic;
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: cyclic })),
        EncodeRefusal.Circular({ path: ["resource", "self", "self"] }),
      );
      const inner: Record<string, unknown> = { name: "inner" };
      inner.self = inner;
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { inner } })),
        EncodeRefusal.Circular({ path: ["resource", "inner", "self"] }),
      );
    });

    it("a Set in the resource is Opaque Set", () => {
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { tags: new Set(["finance"]) } })),
        EncodeRefusal.Opaque({ path: ["resource", "tags"], kind: "Set", brand: "Set" }),
      );
    });

    it("a Map, a RegExp, binary data, a Promise and a boxed primitive are each Opaque, by kind", () => {
      const kindOf = (value: unknown) => {
        const refusal = refusalOf(recordWith({ resource: { value } }));
        return refusal?._tag === "Opaque" ? refusal.kind : refusal?._tag;
      };
      assert.strictEqual(kindOf(new Map([["a", 1]])), "Map");
      assert.strictEqual(kindOf(new WeakMap()), "WeakMap");
      assert.strictEqual(kindOf(new WeakSet()), "WeakSet");
      assert.strictEqual(kindOf(/x/), "RegExp");
      assert.strictEqual(kindOf(new Uint8Array([1, 2])), "BinaryData");
      assert.strictEqual(kindOf(new ArrayBuffer(2)), "BinaryData");
      assert.strictEqual(kindOf(new DataView(new ArrayBuffer(2))), "BinaryData");
      assert.strictEqual(kindOf(Promise.resolve(1)), "Promise");
      assert.strictEqual(kindOf(Object(1)), "BoxedPrimitive");
      assert.strictEqual(kindOf(Object("s")), "BoxedPrimitive");
      assert.strictEqual(kindOf(Object(true)), "BoxedPrimitive");
    });

    it("a HasCustom.params holding a BigInt is Unrepresentable bigint under [policy, params]", () => {
      const refusal = refusalOf(recordWith({ policy: P.hasCustom("legalHold", { limit: 10n }) }));
      assert.deepStrictEqual(refusal, EncodeRefusal.Unrepresentable({ path: ["policy", "params", "limit"], kind: "bigint" }));
    });

    it("a function and a symbol are Unrepresentable, by kind", () => {
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { handler: () => "nope" } })),
        EncodeRefusal.Unrepresentable({ path: ["resource", "handler"], kind: "function" }),
      );
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { tag: Symbol("x") } })),
        EncodeRefusal.Unrepresentable({ path: ["resource", "tag"], kind: "symbol" }),
      );
    });

    it("an object with an enumerable symbol key is Unrepresentable symbol — JSON drops the key", () => {
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { meta: { [Symbol("k")]: 1 } } })),
        EncodeRefusal.Unrepresentable({ path: ["resource", "meta"], kind: "symbol" }),
      );
    });

    it("NaN and the infinities in the resource are NonFinite", () => {
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { score: Number.NaN } })),
        EncodeRefusal.NonFinite({ path: ["resource", "score"] }),
      );
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { score: [1, Number.NEGATIVE_INFINITY] } })),
        EncodeRefusal.NonFinite({ path: ["resource", "score", 1] }),
      );
    });

    it("an invalid Date is NonFinite", () => {
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { at: new Date(Number.NaN) } })),
        EncodeRefusal.NonFinite({ path: ["resource", "at"] }),
      );
    });

    it("an undefined array element is Unrepresentable undefined-element", () => {
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { list: [1, undefined] } })),
        EncodeRefusal.Unrepresentable({ path: ["resource", "list", 1], kind: "undefined-element" }),
      );
    });

    it("a URL is Opaque CustomToJSON", () => {
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { link: new URL("https://example.com/a") } })),
        EncodeRefusal.Opaque({ path: ["resource", "link"], kind: "CustomToJSON", brand: "URL" }),
      );
    });

    it("an Error inside the resource is Opaque Error", () => {
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { last: new Error("x") } })),
        EncodeRefusal.Opaque({ path: ["resource", "last"], kind: "Error", brand: "Error" }),
      );
    });

    it("any other built-in is Opaque OtherBuiltIn", () => {
      const refusal = refusalOf(recordWith({ resource: { gen: (function* () {})() } }));
      assert.strictEqual(refusal?._tag === "Opaque" ? refusal.kind : undefined, "OtherBuiltIn");
    });

    it("a throwing getter is EncodeFailed, never a throw", () => {
      const hostile = {
        get boom(): unknown {
          throw new Error("getter exploded");
        },
      };
      const refusal = refusalOf(recordWith({ resource: { nested: hostile } }));
      assert.deepStrictEqual(refusal, EncodeRefusal.EncodeFailed({ message: "getter exploded" }));
    });

    it("the refusal names the record it refused", () => {
      const result = encodeSinkRecord(recordWith({ resource: { tags: new Set() } }));
      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "SinkRecordNotEncodable");
        assert.strictEqual(result.failure.recordTag, "Decision");
        assert.strictEqual(result.failure.evaluationId, "r");
        assert.strictEqual(errorCode(result.failure), "ACL090");
      }
    });
  });

  describe("what is accepted", () => {
    it("an undefined property arrives with the key absent", () => {
      const parsed: unknown = JSON.parse(stringOf(recordWith({ resource: { a: undefined, b: 1 } })));
      assert.deepStrictEqual(Predicate.hasProperty(parsed, "resource") ? parsed.resource : undefined, { b: 1 });
    });

    it("a valid Date arrives as its ISO string", () => {
      const parsed: unknown = JSON.parse(
        stringOf(recordWith({ resource: { at: new Date("2026-01-01T00:00:00.000Z") } })),
      );
      assert.deepStrictEqual(Predicate.hasProperty(parsed, "resource") ? parsed.resource : undefined, {
        at: "2026-01-01T00:00:00.000Z",
      });
    });

    it("a shared, non-cyclic child reached twice is accepted", () => {
      const shared = { street: "Main St" };
      assert.isUndefined(refusalOf(recordWith({ resource: { billing: shared, shipping: shared } })));
    });

    it("an ObligationRecord is accepted as it is", () => {
      const record: SinkRecord = new ObligationRecord({
        evaluationId: "o",
        at: 1,
        outcome: "Discharged",
        obligationIds: ["audit.log"],
      });
      assert.strictEqual(
        stringOf(record),
        '{"_tag":"Obligations","evaluationId":"o","at":1,"outcome":"Discharged","obligationIds":["audit.log"]}',
      );
    });
  });

  describe("depth is bounded by what a receiver accepts, and the encode cannot overflow", () => {
    it("a 5,000-deep policy is TooDeep at [policy], with no throw", () => {
      let deep: P.Policy = P.hasPermission(read);
      for (let i = 0; i < 5_000; i++) deep = P.not(deep);
      assert.deepStrictEqual(
        refusalOf(recordWith({ policy: deep })),
        EncodeRefusal.TooDeep({ path: ["policy"], maxDepth: P.MAX_DECODE_DEPTH }),
      );
    });

    it("a cyclic policy is Circular at [policy]", () => {
      const children: Array<P.Policy> = [];
      const cyclic = P.allOf(children);
      children.push(cyclic);
      assert.deepStrictEqual(refusalOf(recordWith({ policy: cyclic })), EncodeRefusal.Circular({ path: ["policy"] }));
    });

    it("a hand-built 300-deep trace is TooDeep at [decided, trace]", () => {
      assert.deepStrictEqual(
        refusalOf(decidedWith(P.hasPermission(read), nestedTrace(300))),
        EncodeRefusal.TooDeep({ path: ["decided", "trace"], maxDepth: P.MAX_DECODE_DEPTH }),
      );
    });

    it("an allOf×130 record — one a receiver refuses — is TooDeep", () => {
      const refusal = refusalOf(decidedWith(nestedAllOf(130), nestedTrace(1)));
      assert.strictEqual(refusal?._tag, "TooDeep");
    });

    it("an allOf×90 record succeeds", () => {
      assert.isUndefined(refusalOf(decidedWith(nestedAllOf(90), nestedTrace(90))));
    });

    it("a deep resource is TooDeep at the first value past the bound", () => {
      let resource: Record<string, unknown> = { leaf: 1 };
      for (let i = 0; i < 300; i++) resource = { next: resource };
      const refusal = refusalOf(recordWith({ resource }));
      assert.strictEqual(refusal?._tag, "TooDeep");
      if (refusal?._tag === "TooDeep") assert.strictEqual(refusal.path.length, P.MAX_DECODE_DEPTH + 1);
    });
  });

  describe("properties", () => {
    /** Anything a caller could put in a `resource`, a `params` or a `cause`. */
    const hostile: FastCheck.Arbitrary<unknown> = FastCheck.letrec<{ value: unknown }>((tie) => ({
      value: FastCheck.oneof(
        { maxDepth: 4 },
        FastCheck.jsonValue({ maxDepth: 2 }),
        FastCheck.constantFrom<unknown>(
          undefined,
          Number.NaN,
          Number.POSITIVE_INFINITY,
          10n,
          Symbol("s"),
          () => 1,
          new Date(Number.NaN),
          new Date(0),
          /x/,
          new Uint8Array([1]),
          new Error("e"),
          httpClientError(),
        ),
        FastCheck.array(tie("value"), { maxLength: 3 }).map((items) => new Set(items)),
        FastCheck.array(FastCheck.tuple(FastCheck.string(), tie("value")), { maxLength: 3 }).map(
          (entries) => new Map(entries),
        ),
        FastCheck.array(tie("value"), { maxLength: 3 }),
        FastCheck.dictionary(FastCheck.string(), tie("value"), { maxKeys: 3 }),
        tie("value").map((inner) => {
          const cyclic: Record<string, unknown> = { inner };
          cyclic.self = cyclic;
          return cyclic;
        }),
        FastCheck.constant({
          get boom(): unknown {
            throw new Error("getter");
          },
        }),
        FastCheck.constant({
          toString: () => {
            throw new Error("toString");
          },
        }),
      ),
    })).value;

    it("totality: encodeSinkRecord never throws, over hostile resources, params and causes (INV-QD-903)", () => {
      FastCheck.assert(
        FastCheck.property(hostile, hostile, hostile, (resource, params, cause) => {
          const record = new DecisionRecord({
            evaluationId: "h",
            at: 1,
            subjectId: makeSubjectId("u1"),
            policy: P.allOf([P.hasPermission(read), P.hasCustom("custom", params)]),
            resource: { value: resource },
            outcome: new Failed({ error: new AttributeResolveError({ attribute: "a", cause }) }),
          });
          encodeSinkRecord(record);
          encodeSinkRecordString(record);
        }),
        { numRuns: 300, seed: 9091 },
      );
    });

    it("agreement: a resource is TooDeep exactly when the receiver's depth guard would refuse the wire", () => {
      // Wraps a small JSON value in 240–270 container levels, so the record
      // lands either side of `MAX_DECODE_DEPTH`; the expected verdict is the
      // receiver's own guard over the same wire, hand-built.
      const nested = FastCheck.tuple(
        FastCheck.jsonValue({ maxDepth: 2 }),
        FastCheck.array(FastCheck.boolean(), { minLength: 240, maxLength: 270 }),
      ).map(([leaf, wrappers]) =>
        wrappers.reduce<unknown>((inner, asArray) => (asArray ? [inner] : { inner }), leaf),
      );
      FastCheck.assert(
        FastCheck.property(nested, (value) => {
          const record = recordWith({ resource: { value } });
          const wire = {
            _tag: "Decision",
            evaluationId: "r",
            at: 1,
            subjectId: "u1",
            policy: { _tag: "HasPermission", permission: { resource: "doc", action: "read" } },
            resource: { value },
            failed: { _tag: "MissingResource", attribute: "owner" },
          };
          return (refusalOf(record)?._tag === "TooDeep") === exceedsJsonDepth(wire, P.MAX_DECODE_DEPTH);
        }),
        { numRuns: 200, seed: 7319 },
      );
    });
  });
});

/** The refusal `decodeSinkRecordString` gives, or `undefined` when it accepts. */
const decodeRefusalOf = (text: string): DecodeRefusal | undefined =>
  Result.match(decodeSinkRecordString(text), {
    onSuccess: () => undefined,
    onFailure: (error) => error.refusal,
  });

/** The record `decodeSinkRecordString` rebuilds, failing the test on a refusal. */
const recordOf = (text: string): SinkRecord =>
  Result.match(decodeSinkRecordString(text), {
    onSuccess: (record) => record,
    onFailure: (error) => assert.fail(`refused: ${JSON.stringify(error.refusal)}`),
  });

const deepPolicyJson = (levels: number): string =>
  `{"_tag":"Decision","evaluationId":"e","at":0,"policy":${'{"_tag":"Not","policy":'.repeat(levels)}{"_tag":"HasRole","role":"x"}${"}".repeat(levels)}}`;

describe("decodeSinkRecord — the inbound operation (ARCH-09)", () => {
  describe("each reason", () => {
    it("text that does not parse is NotJson", () => {
      assert.deepStrictEqual(decodeRefusalOf("{"), DecodeRefusal.NotJson());
    });

    it("a 60,000-deep input is TooDeep, naming the bound, and nothing throws", () => {
      assert.deepStrictEqual(decodeRefusalOf(deepPolicyJson(60_000)), DecodeRefusal.TooDeep({ maxDepth: P.MAX_DECODE_DEPTH }));
    });

    it("an unknown tag is Malformed", () => {
      assert.strictEqual(decodeRefusalOf('{"_tag":"Nope"}')?._tag, "Malformed");
    });

    it("a typo'd field inside the embedded policy is Malformed, not a silent drop (CCR-QD-139)", () => {
      const refusal = decodeRefusalOf(
        '{"_tag":"Decision","evaluationId":"e","at":0,"policy":{"_tag":"HasRole","role":"admin","rloe":"admin"}}',
      );
      assert.strictEqual(refusal?._tag, "Malformed");
    });

    it("a refusal is a SinkRecordNotDecodable with its own stable code", () => {
      const result = decodeSinkRecord({ _tag: "Nope" });
      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "SinkRecordNotDecodable");
        assert.strictEqual(errorCode(result.failure), "ACL091");
      }
    });

    it("the value form agrees with the text form", () => {
      assert.deepStrictEqual(
        Result.isFailure(decodeSinkRecord(JSON.parse('{"_tag":"Nope"}'))),
        decodeRefusalOf('{"_tag":"Nope"}') !== undefined,
      );
    });
  });

  describe("what the receiver keeps doing", () => {
    it("a Decision record with no subjectId still decodes to the UNKNOWN_SUBJECT sentinel", () => {
      const back = recordOf('{"_tag":"Decision","evaluationId":"e","at":0,"policy":{"_tag":"HasRole","role":"x"}}');
      assert.strictEqual(back._tag === "Decision" ? back.subjectId : undefined, "<unknown subject: wire version skew>");
    });

    it("a Deny with no reason is refused", () => {
      const text = JSON.stringify({
        _tag: "Decision",
        evaluationId: "e",
        at: 0,
        subjectId: "u1",
        policy: { _tag: "HasRole", role: "x" },
        decided: { _tag: "Deny", evaluationId: "e", subjectId: "u1", durationMillis: 1, trace: trace(false), obligations: [] },
      });
      assert.strictEqual(decodeRefusalOf(text)?._tag, "Malformed");
    });

    it("an Allow carrying a reason is refused", () => {
      const text = JSON.stringify({
        _tag: "Decision",
        evaluationId: "e",
        at: 0,
        subjectId: "u1",
        policy: { _tag: "HasRole", role: "x" },
        decided: {
          _tag: "Allow",
          evaluationId: "e",
          subjectId: "u1",
          durationMillis: 1,
          trace: trace(true),
          obligations: [],
          reason: "a verdict that permits has nothing to refuse",
        },
      });
      assert.strictEqual(decodeRefusalOf(text)?._tag, "Malformed");
    });

    it("a record naming neither outcome becomes a Failed MissingResource marker (ticket 96, pinned here for ARCH-15)", () => {
      const back = recordOf('{"_tag":"Decision","evaluationId":"e","at":0,"subjectId":"u1","policy":{"_tag":"HasRole","role":"x"}}');
      const error = back._tag === "Decision" && back.outcome._tag === "Failed" ? back.outcome.error : undefined;
      assert.strictEqual(error?._tag, "MissingResource");
      if (error?._tag === "MissingResource") assert.include(error.attribute, "malformed record");
    });

    it("a record naming both outcomes prefers decided (ticket 155, pinned here for ARCH-15)", () => {
      const text = JSON.stringify({
        _tag: "Decision",
        evaluationId: "e",
        at: 0,
        subjectId: "u1",
        policy: { _tag: "HasRole", role: "x" },
        decided: {
          _tag: "Deny",
          evaluationId: "e",
          subjectId: "u1",
          durationMillis: 1,
          trace: trace(false),
          obligations: [],
          reason: "no",
        },
        failed: { _tag: "MissingResource", attribute: "owner" },
      });
      const back = recordOf(text);
      assert.strictEqual(back._tag === "Decision" ? back.outcome._tag : undefined, "Decided");
    });

    it("an Error cause comes back as an Error carrying its message", () => {
      const back = recordOf(stringOf(failedRecordWith(new Error("db down"))));
      const error = back._tag === "Decision" && back.outcome._tag === "Failed" ? back.outcome.error : undefined;
      const cause = error?._tag === "AttributeResolveError" ? error.cause : undefined;
      assert.instanceOf(cause, Error);
      assert.strictEqual(cause instanceof Error ? cause.message : undefined, "db down");
    });
  });

  describe("properties", () => {
    const leaf: FastCheck.Arbitrary<P.Policy> = FastCheck.oneof(
      FastCheck.constant(P.hasPermission(read)),
      FastCheck.constantFrom("editor", "admin").map((r) => P.hasRole(r)),
      FastCheck.integer({ min: 0, max: 5 }).map((n) => P.hasAttribute("clearance", M.gte(n))),
      FastCheck.constant(P.hasAction("read")),
    );

    /** What a caller might put in `resource`, `params` or `cause`: JSON, and what JSON cannot carry. */
    const loose: FastCheck.Arbitrary<unknown> = FastCheck.oneof(
      FastCheck.jsonValue({ maxDepth: 3 }),
      FastCheck.constantFrom<unknown>(
        undefined,
        Number.NaN,
        10n,
        () => 1,
        new Date(0),
        new Date(Number.NaN),
        new Set([1]),
        new Error("e"),
        httpClientError(),
        { a: undefined, b: 1 },
        [1, undefined],
      ),
    );

    const tree = (params: FastCheck.Arbitrary<unknown>): FastCheck.Arbitrary<P.Policy> =>
      FastCheck.letrec<{ node: P.Policy }>((tie) => ({
        node: FastCheck.oneof(
          { maxDepth: 3 },
          leaf,
          params.map((p) => P.hasCustom("custom", p)),
          FastCheck.array(tie("node"), { minLength: 1, maxLength: 3 }).map((ps) => P.allOf(ps)),
          tie("node").map((p) => P.not(p)),
          tie("node").map((p) => P.obliged(obligation("audit.log"), p)),
        ),
      })).node;

    const outcome: FastCheck.Arbitrary<Decided | Failed> = FastCheck.oneof(
      FastCheck.tuple(FastCheck.boolean(), FastCheck.string()).map(
        ([allowed, reason]) =>
          new Decided({
            decision: allowed
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
                }),
          }),
      ),
      loose.map((cause) => new Failed({ error: new AttributeResolveError({ attribute: "a", cause }) })),
    );

    it("round trip: whatever encodeSinkRecordString emits, decodeSinkRecordString rebuilds, up to the named normalisations (INV-QD-902)", () => {
      FastCheck.assert(
        FastCheck.property(tree(loose), FastCheck.option(loose, { nil: undefined }), outcome, (policy, value, result) => {
          const record = new DecisionRecord({
            evaluationId: "e",
            at: 0,
            subjectId: makeSubjectId("u1"),
            policy,
            ...(value === undefined ? {} : { resource: { value } }),
            outcome: result,
          });
          const encoded = encodeSinkRecordString(record);
          if (Result.isFailure(encoded)) return true;
          const decoded = decodeSinkRecordString(encoded.success);
          if (Result.isFailure(decoded) || decoded.success._tag !== "Decision") return false;
          const back = decoded.success;
          // `resource` and `policy` normalise exactly as JSON does: a `Date`
          // becomes its ISO string and an `undefined` property is absent.
          const asJson = (input: unknown): unknown => (input === undefined ? undefined : JSON.parse(JSON.stringify(input)));
          assert.deepStrictEqual(back.resource, asJson(record.resource));
          assert.deepStrictEqual(asJson(back.policy), asJson(record.policy));
          assert.strictEqual(back.outcome._tag, record.outcome._tag);
          // The cause normalises through `Schema.Defect()`; re-encoding the
          // rebuilt record reproduces the same text, so nothing else moved.
          return Result.match(encodeSinkRecordString(back), {
            onSuccess: (again) => again === encoded.success,
            onFailure: () => false,
          });
        }),
        { numRuns: 300, seed: 6203 },
      );
    });

    it("totality: decodeSinkRecordString never throws, over any string (INV-QD-903)", () => {
      FastCheck.assert(
        FastCheck.property(FastCheck.string(), (text) => {
          decodeSinkRecordString(text);
        }),
        { numRuns: 500, seed: 3117 },
      );
    });

    it("totality: decodeSinkRecord never throws, over any JSON value (INV-QD-903)", () => {
      FastCheck.assert(
        FastCheck.property(FastCheck.jsonValue(), (value) => {
          decodeSinkRecord(value);
          decodeSinkRecordString(JSON.stringify(value));
        }),
        { numRuns: 500, seed: 3118 },
      );
    });
  });
});

/**
 * The bytes a `Decided` record puts on the wire, pinned at commit 1caf04c —
 * before the decision codec moved into `DecisionWire.ts` (ARCH-05 T1). The move
 * must not change a byte of what `SinkRecordWire` carries between processes
 * (ADR-QD-060, BEH-QD-199), so these are literals, not re-derived.
 */
describe("a decided record encodes byte-identically to 1caf04c", () => {
  const goldenRecord = (decision: Allow | Deny): SinkRecord =>
    new DecisionRecord({
      evaluationId: "g",
      at: 1,
      subjectId: makeSubjectId("u1"),
      policy: P.hasPermission(read),
      outcome: new Decided({ decision }),
    });
  const goldenTrace = (allowed: boolean) => ({
    policyTag: "HasPermission" as const,
    allowed,
    children: [],
    obligations: [],
  });
  const encoded = (record: SinkRecord): string => {
    const viaOperation = stringOf(record);
    assert.strictEqual(viaOperation, JSON.stringify(encodeRecordSync(toWire(record))));
    return viaOperation;
  };

  it("an Allow with visibleFields and an obligation", () => {
    const record = goldenRecord(
      new Allow({
        evaluationId: "g",
        subjectId: makeSubjectId("u1"),
        durationMillis: 2,
        trace: { ...goldenTrace(true), visibleFields: ["id"] },
        visibleFields: ["id"],
        obligations: [obligation("audit.log")],
      }),
    );
    assert.strictEqual(
      encoded(record),
      '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"decided":{"_tag":"Allow","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":true,"children":[],"visibleFields":["id"],"obligations":[]},"visibleFields":["id"],"obligations":[{"id":"audit.log","attributes":{},"advisory":false}]}}',
    );
  });

  it("an Allow with no visibleFields (everything visible)", () => {
    const record = goldenRecord(
      new Allow({
        evaluationId: "g",
        subjectId: makeSubjectId("u1"),
        durationMillis: 2,
        trace: goldenTrace(true),
        visibleFields: undefined,
        obligations: [],
      }),
    );
    assert.strictEqual(
      encoded(record),
      '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"decided":{"_tag":"Allow","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":true,"children":[],"obligations":[]},"obligations":[]}}',
    );
  });

  it("a Deny", () => {
    const record = goldenRecord(
      new Deny({
        evaluationId: "g",
        subjectId: makeSubjectId("u1"),
        durationMillis: 2,
        trace: { ...goldenTrace(false), reason: "no" },
        reason: "no",
      }),
    );
    assert.strictEqual(
      encoded(record),
      '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"decided":{"_tag":"Deny","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":false,"reason":"no","children":[],"obligations":[]},"obligations":[],"reason":"no"}}',
    );
  });
});
