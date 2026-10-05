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
  WIRE_VERSIONS,
} from "../src/Errors.ts";
import type { EvaluationError, WireVersion } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import {
  DEFAULT_WIRE_VERSION,
  decodeSinkRecord,
  decodeSinkRecordString,
  encodeSinkRecord,
  encodeSinkRecordString,
} from "../src/SinkCodec.ts";
import type { SinkRecordJson } from "../src/SinkCodec.ts";
import * as V1 from "./fixtures/sinkWireV1.ts";
import * as V2 from "./fixtures/sinkWireV2.ts";

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
      // Through the real operations, text and all: the wire form is decoded as
      // untrusted, so the test exercises the validating path a transport uses.
      const back = recordOf(stringOf(allowRecord));

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

      const back = recordOf(stringOf(record));
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

      const back = recordOf(stringOf(denial));
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

      const back = recordOf(stringOf(record));
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

      const back = recordOf(stringOf(record));
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

      const back = recordOf(stringOf(record));

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

        const back = recordOf(stringOf(record));

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

      const back = recordOf(stringOf(record));

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

      // Reached JSON at all — a hostile `cause` did not throw the encoder, and
      // was not a reason to refuse the record — and the text decodes back.
      const text = stringOf(record);
      assert.strictEqual(recordOf(text)._tag, "Decision");
    }));
});

describe("every literal the wire admits is exercised", () => {
  it.effect("each cache outcome round-trips", () =>
    Effect.gen(function* () {
      // A literal a test never sends is a literal a mutated schema could drop
      // without anything noticing.
      for (const cache of ["hit", "coalesced", "miss"] as const) {
        const record: SinkRecord = new DecisionRecord({ ...allowRecord, cache });
        const back = recordOf(stringOf(record));
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
        const back = recordOf(stringOf(record));
        assert.strictEqual(back._tag, "Obligations");
        if (back._tag === "Obligations") assert.strictEqual(back.outcome, outcome);
      }
    }));

  it("an absent optional is absent from the JSON text, not written as undefined or null", () => {
    const parsed: unknown = JSON.parse(
      stringOf(
        new DecisionRecord({
          evaluationId: "e",
          at: 0,
          subjectId: makeSubjectId("u1"),
          policy: P.hasPermission(read),
          outcome: new Failed({ error: new PolicyTooDeep({ maxDepth: 8 }) }),
        }),
      ),
    );

    assert.isTrue(Predicate.isObject(parsed));
    if (Predicate.isObject(parsed)) {
      assert.isFalse(Object.hasOwn(parsed, "resource"));
      assert.isFalse(Object.hasOwn(parsed, "action"));
      assert.isFalse(Object.hasOwn(parsed, "cache"));
      assert.isFalse(Object.hasOwn(parsed, "decided"));
    }
  });

  it.effect("an absent MissingAction expectation is absent on the JSON wire", () =>
    Effect.gen(function* () {
      // `expected: undefined` is present-with-`undefined` on the `Schema.TaggedError`
      // instance itself (`Schema.UndefinedOr`, not an absent key) — the omission
      // this pins happens where it always has for every other optional field in
      // this file: `JSON.stringify` drops an `undefined`-valued key.
      const encoded = jsonOf(
        new DecisionRecord({
          evaluationId: "e",
          at: 0,
          subjectId: makeSubjectId("u1"),
          policy: P.hasPermission(read),
          outcome: new Failed({ error: new MissingAction({ expected: undefined }) }),
        }),
      );
      const json: unknown = JSON.parse(JSON.stringify(encoded));

      assert.strictEqual(encoded._tag, "Decision");
      const error: unknown =
        Predicate.hasProperty(json, "outcome") && Predicate.hasProperty(json.outcome, "error")
          ? json.outcome.error
          : undefined;
      assert.isTrue(Predicate.isObject(error));
      if (Predicate.isObject(error)) assert.isFalse(Object.hasOwn(error, "expected"));
    }));

  it.effect("a present MissingAction expectation is carried onto the JSON wire", () =>
    Effect.gen(function* () {
      const encoded = jsonOf(
        new DecisionRecord({
          evaluationId: "e",
          at: 0,
          subjectId: makeSubjectId("u1"),
          policy: P.hasPermission(read),
          outcome: new Failed({ error: new MissingAction({ expected: "read" }) }),
        }),
      );

      const error = wireErrorOf(encoded);
      assert.strictEqual(error?._tag, "MissingAction");
      if (error?._tag === "MissingAction") assert.strictEqual(error.expected, "read");
    }));
});

describe("the wire is untrusted", () => {
  it.effect("a malformed payload fails rather than half-building a record", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(decodeEffect({ _tag: "Decision" }));
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("an unknown tag is refused", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(decodeEffect({ _tag: "Whatever" }));
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("a Decision record with no subjectId — an older sender, mid rolling-deploy — still decodes", () =>
    Effect.gen(function* () {
      const back = yield* decodeEffect({
        _tag: "Decision",
        evaluationId: "e",
        at: 0,
        policy: P.hasPermission(read),
        failed: { _tag: "MissingResource", attribute: "owner" },
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
        decodeEffect({
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
      // decode failure instead — closer to what `decodeSinkRecord`'s own doc
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
          decodeEffect({
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
        decodeEffect({
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
        decodeEffect({
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
});

describe("the wire's recursive positions are depth-bounded before Schema recurses", () => {
  // Nests a policy `n` `Not`s deep, terminating in a leaf — the same shape
  // `Policy.test.ts` uses to pin `Policy.ts`'s own `fromJson`/`fromJsonValue`
  // guard, reused here because `decodeSinkRecord`'s guard must refuse at the
  // identical bound.
  const wireWithNestedPolicy = (depth: number): unknown => {
    let policy: unknown = { _tag: "HasRole", role: "x" };
    for (let i = 0; i < depth; i++) policy = { _tag: "Not", policy };
    return { _tag: "Decision", evaluationId: "e", at: 0, policy, failed: { _tag: "MissingResource", attribute: "owner" } };
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
        decodeEffect(wireWithNestedPolicy(P.MAX_DECODE_DEPTH + 10)),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "SinkRecordNotDecodable");
        assert.deepStrictEqual(result.failure.refusal, DecodeRefusal.TooDeep({ maxDepth: P.MAX_DECODE_DEPTH }));
      }
    }));

  it.effect("a trace nested past MAX_DECODE_DEPTH fails typed, naming the bound", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        decodeEffect(wireWithNestedTrace(P.MAX_DECODE_DEPTH + 10)),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "SinkRecordNotDecodable");
        assert.deepStrictEqual(result.failure.refusal, DecodeRefusal.TooDeep({ maxDepth: P.MAX_DECODE_DEPTH }));
      }
    }));

  it.effect("a policy nested well within the bound still decodes", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(decodeEffect(wireWithNestedPolicy(4)));
      assert.strictEqual(result._tag, "Success");
    }));

  // The regression this guards: before this guard ran ahead of `Schema`, a
  // deeply-nested policy or trace on the wire raised a raw `RangeError` out
  // of `Schema.decodeUnknownEffect` — an uncaught defect, not a typed
  // `Effect` failure. Mirrors `Policy.test.ts`'s identical test for
  // `fromJson`.
  it.effect("an extreme depth (60,000) fails through the Effect channel, never as a defect", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(decodeEffect(wireWithNestedPolicy(60_000)));
      assert.strictEqual(result._tag, "Failure");
    }));
});

describe("decodeSinkRecord rejects an excess property inside its embedded Policy, matching Policy.ts", () => {
  // The inbound decode used to run with no `ParseOptions` at all,
  // unlike every one of `Policy.ts`'s own untrusted entry points — so a wire
  // record whose embedded policy carried a typo'd field decoded successfully,
  // silently dropping the grant rather than reporting the typo. Threading
  // `UNTRUSTED_DECODE_OPTIONS` through closes it; this pins that it stays
  // closed the same way `Policy.test.ts`'s own excess-property suite does.
  it.effect("a typo'd field inside the embedded policy is a decode failure, not a silent drop", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        decodeEffect({
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
        decodeEffect({
          _tag: "Decision",
          evaluationId: "e",
          at: 0,
          policy: { _tag: "HasRole", role: "admin" },
          failed: { _tag: "MissingResource", attribute: "owner" },
        }),
      );
      assert.strictEqual(result._tag, "Success");
    }));
});

/**
 * GH-01: a newer sender, mid rolling-deploy, may add envelope metadata an
 * older reader does not know. The envelope is lenient and the content strict
 * (ADR-QD-903): only a top-level key is ignored.
 */
describe("decodeSinkRecord ignores an unknown envelope key and refuses one anywhere nested", () => {
  const withEnvelopeKey = (text: string): string => JSON.stringify({ ...JSON.parse(text), traceparent: "00-abc" });

  it("a record with an unknown top-level key decodes, to the record without it (a newer sender)", () => {
    assert.deepStrictEqual(recordOf(withEnvelopeKey(V1.V1_DECIDED_ALLOW)), recordOf(V1.V1_DECIDED_ALLOW));
  });

  it("an obligation record with an unknown top-level key decodes", () => {
    assert.deepStrictEqual(recordOf(withEnvelopeKey(V1.V1_OBLIGATIONS)), recordOf(V1.V1_OBLIGATIONS));
  });

  it("an unknown key inside decided is still refused", () => {
    const text = V1.V1_DECIDED_ALLOW.replace('"durationMillis":2', '"durationMillis":2,"ttl":60');
    assert.strictEqual(decodeRefusalOf(text)?._tag, "Malformed");
  });

  it("an unknown key inside failed is still refused", () => {
    const text = V1.V1_FAILED_MISSING_RESOURCE.replace('"attribute":"owner"', '"attribute":"owner","retry":true');
    assert.strictEqual(decodeRefusalOf(text)?._tag, "Malformed");
  });

  it("an unknown key inside the embedded policy is still refused, beside an ignored envelope key", () => {
    const text = withEnvelopeKey(V1.V1_DECIDED_ALLOW.replace('"action":"read"}}', '"action":"read"},"permision":"x"}'));
    assert.include(decodeRefusalOf(text)?._tag === "Malformed" ? JSON.stringify(decodeRefusalOf(text)) : "", "permision");
  });

  it("an array is not an envelope: refused, never projected into an empty record", () => {
    assert.strictEqual(decodeRefusalOf("[1,2]")?._tag, "Malformed");
  });
});

/** The text `encodeSinkRecordString` produces, failing the test on a refusal. */
const stringOf = (record: SinkRecord): string =>
  Result.match(encodeSinkRecordString(record), {
    onSuccess: (text) => text,
    onFailure: (error) => assert.fail(`refused: ${JSON.stringify(error.refusal)}`),
  });

/** The value `encodeSinkRecord` produces, failing the test on a refusal. */
const jsonOf = (record: SinkRecord): SinkRecordJson =>
  Result.match(encodeSinkRecord(record), {
    onSuccess: (json) => json,
    onFailure: (error) => assert.fail(`refused: ${JSON.stringify(error.refusal)}`),
  });

/** The error a `Failed` record's JSON carries, in either wire version. */
const wireErrorOf = (json: SinkRecordJson) =>
  json._tag !== "Decision"
    ? undefined
    : "version" in json
      ? json.outcome._tag === "Failed"
        ? json.outcome.error
        : undefined
      : json.failed;

/** `decodeSinkRecord` lifted into `Effect`, for the generator-style tests above. */
const decodeEffect = (input: unknown) => Effect.fromResult(decodeSinkRecord(input));

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
  const error: unknown =
    Predicate.hasProperty(parsed, "outcome") && Predicate.hasProperty(parsed.outcome, "error")
      ? parsed.outcome.error
      : Predicate.hasProperty(parsed, "failed")
        ? parsed.failed
        : undefined;
  return Predicate.hasProperty(error, "cause") ? error.cause : "<absent>";
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

    it("a thrown value that cannot even be described is still EncodeFailed, never a throw", () => {
      const unprintable = {
        toString: () => {
          throw new Error("toString exploded");
        },
      };
      const hostile = {
        get boom(): unknown {
          throw unprintable;
        },
      };
      assert.deepStrictEqual(
        refusalOf(recordWith({ resource: { nested: hostile } })),
        EncodeRefusal.EncodeFailed({ message: "a value that could not be described" }),
      );
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

    it("every finite number is accepted, zero and negatives included", () => {
      assert.isUndefined(
        refusalOf(recordWith({ resource: { a: 0, b: -0, c: -1.5, d: Number.MAX_SAFE_INTEGER, e: null } })),
      );
    });

    it("a HasCustom.params that is itself JSON-safe is accepted", () => {
      assert.isUndefined(refusalOf(recordWith({ policy: P.hasCustom("isOwner", { minClearance: 3 }) })));
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
        '{"_tag":"Obligations","version":2,"evaluationId":"o","at":1,"outcome":"Discharged","obligationIds":["audit.log"]}',
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

    it("a hand-built 300-deep trace is TooDeep at where each version carries the trace", () => {
      const record = decidedWith(P.hasPermission(read), nestedTrace(300));
      const refusal = (wireVersion: WireVersion) =>
        Result.match(encodeSinkRecord(record, { wireVersion }), { onSuccess: () => undefined, onFailure: (error) => error.refusal });
      assert.deepStrictEqual(refusal(1), EncodeRefusal.TooDeep({ path: ["decided", "trace"], maxDepth: P.MAX_DECODE_DEPTH }));
      assert.deepStrictEqual(
        refusal(2),
        EncodeRefusal.TooDeep({ path: ["outcome", "decision", "trace"], maxDepth: P.MAX_DECODE_DEPTH }),
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
      const back = recordOf(
        '{"_tag":"Decision","evaluationId":"e","at":0,"policy":{"_tag":"HasRole","role":"x"},"failed":{"_tag":"MissingResource","attribute":"owner"}}',
      );
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

    it("a record naming neither outcome is refused, not given an invented error (ticket 96)", () => {
      const refusal = decodeRefusalOf(
        '{"_tag":"Decision","evaluationId":"e","at":0,"subjectId":"u1","policy":{"_tag":"HasRole","role":"x"}}',
      );
      assert.strictEqual(refusal?._tag, "Malformed");
      assert.include(refusal?._tag === "Malformed" ? refusal.message : "", "names no outcome");
    });

    it("a record naming both outcomes is refused, not silently given one (ticket 155)", () => {
      const text = JSON.stringify({
        ...JSON.parse(V1.V1_DECIDED_DENY),
        failed: { _tag: "MissingResource", attribute: "owner" },
      });
      const refusal = decodeRefusalOf(text);
      assert.strictEqual(refusal?._tag, "Malformed");
      assert.include(refusal?._tag === "Malformed" ? refusal.message : "", "names both outcomes");
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
          tie("node").map((p) => P.labeled("audit", p)),
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

    it("two versions, one meaning: whenever both encode, v1 and v2 bytes decode to the same record (INV-QD-905)", () => {
      let both = 0;
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
          const v1 = encodeSinkRecordString(record, { wireVersion: 1 });
          const v2 = encodeSinkRecordString(record, { wireVersion: 2 });
          // The same record is refused or accepted alike: every hazard is in
          // the record, not in how its outcome is spelled.
          assert.strictEqual(Result.isSuccess(v1), Result.isSuccess(v2));
          if (Result.isFailure(v1) || Result.isFailure(v2)) return true;
          both += 1;
          assert.notStrictEqual(v1.success, v2.success);
          assert.deepStrictEqual(recordOf(v1.success), recordOf(v2.success));
          return true;
        }),
        { numRuns: 300, seed: 6204 },
      );
      assert.isAbove(both, 100);
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
 * The bytes a record puts on the wire as version 1, pinned as literals in
 * `fixtures/sinkWireV1.ts`. The three `Decided` goldens were pinned at commit
 * 1caf04c — before the decision codec moved into `DecisionWire.ts` (ARCH-05
 * T1) — and the move must not change a byte of what the record wire carries
 * between processes (ADR-QD-060, BEH-QD-199), so these are literals, not
 * re-derived.
 */
/** The `Failed` record the v1 `Failed` goldens were captured from. */
const goldenFailed = (error: EvaluationError): SinkRecord =>
  new DecisionRecord({
    evaluationId: "g",
    at: 1,
    subjectId: makeSubjectId("u1"),
    policy: P.hasPermission(read),
    outcome: new Failed({ error }),
  });

/** The `Failed` record whose resolver error carries an `Error` cause, as the goldens hold it. */
const goldenFailedCause: SinkRecord = goldenFailed(
  new AttributeResolveError({ attribute: "clearance", cause: new Error("db down") }),
);

/** The obligation record `V1_OBLIGATIONS` was captured from. */
const goldenObligations: SinkRecord = new ObligationRecord({
  evaluationId: "g",
  at: 1,
  outcome: "Discharged",
  obligationIds: ["audit.log"],
});

/** The decision `V1_DECISION_FULL_ENVELOPE` was captured from: every optional envelope field set. */
const goldenFullEnvelope: SinkRecord = new DecisionRecord({
  evaluationId: "g",
  at: 1,
  subjectId: makeSubjectId("u1"),
  policy: P.hasPermission(read),
  resource: { id: "doc-1", owner: "u1" },
  action: "read",
  cache: "hit",
  outcome: new Decided({
    decision: new Allow({
      evaluationId: "g",
      subjectId: makeSubjectId("u1"),
      durationMillis: 2,
      trace: { policyTag: "HasPermission", allowed: true, children: [], obligations: [] },
      visibleFields: undefined,
      obligations: [],
    }),
  }),
});

describe("v1 bytes: wireVersion 1 encodes byte-identically to 1caf04c", () => {
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
  const encoded = (record: SinkRecord): string =>
    Result.match(encodeSinkRecordString(record, { wireVersion: 1 }), {
      onSuccess: (text) => text,
      onFailure: (error) => assert.fail(`refused: ${JSON.stringify(error.refusal)}`),
    });

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
    assert.strictEqual(encoded(record), V1.V1_DECIDED_ALLOW);
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
    assert.strictEqual(encoded(record), V1.V1_DECIDED_ALLOW_ALL_FIELDS);
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
    assert.strictEqual(encoded(record), V1.V1_DECIDED_DENY);
  });

  it("a Failed record", () => {
    assert.strictEqual(encoded(goldenFailed(new MissingResource({ attribute: "owner" }))), V1.V1_FAILED_MISSING_RESOURCE);
  });

  it("a Failed record whose resolver cause is an Error", () => {
    assert.strictEqual(
      encoded(goldenFailedCause),
      V1.V1_FAILED_ATTRIBUTE_ERROR_CAUSE,
    );
  });

  it("an obligation record", () => {
    assert.strictEqual(encoded(goldenObligations), V1.V1_OBLIGATIONS);
  });

  it("a decision carrying resource, action and cache", () => {
    assert.strictEqual(encoded(goldenFullEnvelope), V1.V1_DECISION_FULL_ENVELOPE);
  });
});

/**
 * The bytes a record puts on the wire as version 2: the same records as the
 * v1 goldens above, against the hand-written `fixtures/sinkWireV2.ts`.
 */
describe("v2 bytes: wireVersion 2 writes the version-2 goldens", () => {
  const v2Of = (record: SinkRecord): string =>
    Result.match(encodeSinkRecordString(record, { wireVersion: 2 }), {
      onSuccess: (text) => text,
      onFailure: (error) => assert.fail(`refused: ${JSON.stringify(error.refusal)}`),
    });
  const goldenTrace = { policyTag: "HasPermission" as const, allowed: true, children: [], obligations: [] };

  it("a decided record", () => {
    const record = new DecisionRecord({
      evaluationId: "g",
      at: 1,
      subjectId: makeSubjectId("u1"),
      policy: P.hasPermission(read),
      outcome: new Decided({
        decision: new Allow({
          evaluationId: "g",
          subjectId: makeSubjectId("u1"),
          durationMillis: 2,
          trace: { ...goldenTrace, visibleFields: ["id"] },
          visibleFields: ["id"],
          obligations: [obligation("audit.log")],
        }),
      }),
    });
    assert.strictEqual(v2Of(record), V2.V2_DECIDED_ALLOW);
  });

  it("a Failed record", () => {
    assert.strictEqual(v2Of(goldenFailed(new MissingResource({ attribute: "owner" }))), V2.V2_FAILED_MISSING_RESOURCE);
  });

  it("a Failed record whose resolver cause is an Error", () => {
    assert.strictEqual(v2Of(goldenFailedCause), V2.V2_FAILED_ATTRIBUTE_ERROR_CAUSE);
  });

  it("an obligation record", () => {
    assert.strictEqual(v2Of(goldenObligations), V2.V2_OBLIGATIONS);
  });

  it("a decision carrying resource, action and cache", () => {
    assert.strictEqual(v2Of(goldenFullEnvelope), V2.V2_DECISION_FULL_ENVELOPE);
  });

  it("wireVersion 1 writes the version-1 goldens, whatever the default", () => {
    const v1Of = (record: SinkRecord) => Result.getOrUndefined(encodeSinkRecordString(record, { wireVersion: 1 }));
    assert.strictEqual(v1Of(goldenObligations), V1.V1_OBLIGATIONS);
    assert.strictEqual(v1Of(goldenFailedCause), V1.V1_FAILED_ATTRIBUTE_ERROR_CAUSE);
  });

  it("with no option, the writer writes DEFAULT_WIRE_VERSION", () => {
    const expected = DEFAULT_WIRE_VERSION === 1 ? V1.V1_OBLIGATIONS : V2.V2_OBLIGATIONS;
    assert.strictEqual(stringOf(goldenObligations), expected);
  });
});

/**
 * Both wire versions are read, for good (ADR-QD-903). Version 1 has no
 * `version` key and carries the outcome as `decided`/`failed`; version 2
 * carries `version: 2` and one tagged `outcome`. Each pair of fixtures is the
 * same record, so each pair decodes to the same `SinkRecord`.
 */
describe("decodeSinkRecord reads wire versions 1 and 2", () => {
  const goldenTrace = (allowed: boolean) => ({
    policyTag: "HasPermission" as const,
    allowed,
    children: [],
    obligations: [],
  });
  const decided = (decision: Allow | Deny): SinkRecord =>
    new DecisionRecord({
      evaluationId: "g",
      at: 1,
      subjectId: makeSubjectId("u1"),
      policy: P.hasPermission(read),
      outcome: new Decided({ decision }),
    });
  const pairs: ReadonlyArray<readonly [string, string, string, SinkRecord]> = [
    [
      "an Allow with visibleFields and an obligation",
      V1.V1_DECIDED_ALLOW,
      V2.V2_DECIDED_ALLOW,
      decided(
        new Allow({
          evaluationId: "g",
          subjectId: makeSubjectId("u1"),
          durationMillis: 2,
          trace: { ...goldenTrace(true), visibleFields: ["id"] },
          visibleFields: ["id"],
          obligations: [obligation("audit.log")],
        }),
      ),
    ],
    [
      "an Allow with everything visible",
      V1.V1_DECIDED_ALLOW_ALL_FIELDS,
      V2.V2_DECIDED_ALLOW_ALL_FIELDS,
      decided(
        new Allow({
          evaluationId: "g",
          subjectId: makeSubjectId("u1"),
          durationMillis: 2,
          trace: goldenTrace(true),
          visibleFields: undefined,
          obligations: [],
        }),
      ),
    ],
    [
      "a Deny",
      V1.V1_DECIDED_DENY,
      V2.V2_DECIDED_DENY,
      decided(
        new Deny({
          evaluationId: "g",
          subjectId: makeSubjectId("u1"),
          durationMillis: 2,
          trace: { ...goldenTrace(false), reason: "no" },
          reason: "no",
        }),
      ),
    ],
    [
      "a Failed record",
      V1.V1_FAILED_MISSING_RESOURCE,
      V2.V2_FAILED_MISSING_RESOURCE,
      goldenFailed(new MissingResource({ attribute: "owner" })),
    ],
    [
      "a Failed record with an Error cause",
      V1.V1_FAILED_ATTRIBUTE_ERROR_CAUSE,
      V2.V2_FAILED_ATTRIBUTE_ERROR_CAUSE,
      goldenFailedCause,
    ],
    ["an obligation record", V1.V1_OBLIGATIONS, V2.V2_OBLIGATIONS, goldenObligations],
    ["a full envelope", V1.V1_DECISION_FULL_ENVELOPE, V2.V2_DECISION_FULL_ENVELOPE, goldenFullEnvelope],
  ];

  for (const [name, v1, v2, original] of pairs) {
    it(`${name}: v1 and v2 bytes decode to the same record, the one encoded`, () => {
      assert.deepStrictEqual(recordOf(v1), recordOf(v2));
      // Equal up to the named normalisations (INV-QD-902): what the writer's
      // own output decodes to.
      assert.deepStrictEqual(recordOf(v2), recordOf(stringOf(original)));
    });
  }

  it("a v2 record with an unknown top-level key decodes; a legacy `decided` beside `outcome` is one", () => {
    const text = JSON.stringify({ ...JSON.parse(V2.V2_FAILED_MISSING_RESOURCE), traceparent: "00-abc", decided: {} });
    assert.deepStrictEqual(recordOf(text), recordOf(V2.V2_FAILED_MISSING_RESOURCE));
  });

  describe("a malformed v2 outcome is Malformed", () => {
    const v2 = (outcome: unknown): string => JSON.stringify({ ...JSON.parse(V2.V2_FAILED_MISSING_RESOURCE), outcome });
    const decision = JSON.parse(V2.V2_DECIDED_DENY).outcome.decision;
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["no outcome", JSON.stringify({ ...JSON.parse(V2.V2_FAILED_MISSING_RESOURCE), outcome: undefined })],
      ["Decided with no decision", v2({ _tag: "Decided" })],
      ["Failed with no error", v2({ _tag: "Failed" })],
      ["Failed carrying a stray decision", v2({ _tag: "Failed", error: { _tag: "MissingResource", attribute: "owner" }, decision })],
      ["an unknown outcome tag", v2({ _tag: "Skipped" })],
      ["an error carrying a code, which version 2 never had", v2({ _tag: "Failed", error: { _tag: "MissingResource", attribute: "owner", code: "ACL004" } })],
      ["an unknown key inside the decision", v2({ _tag: "Decided", decision: { ...decision, ttl: 60 } })],
    ];
    for (const [name, text] of cases) {
      it(name, () => {
        assert.strictEqual(decodeRefusalOf(text)?._tag, "Malformed");
      });
    }

    it("no subjectId: required in version 2, unlike version 1", () => {
      const text = JSON.stringify({ ...JSON.parse(V2.V2_FAILED_MISSING_RESOURCE), subjectId: undefined });
      assert.strictEqual(decodeRefusalOf(text)?._tag, "Malformed");
    });
  });

  describe("any other version is UnsupportedVersion, naming what was sent and what is read", () => {
    const versions: ReadonlyArray<unknown> = [3, "2", null, 1, 2.5, { major: 2 }];
    for (const version of versions) {
      it(`version: ${JSON.stringify(version)}`, () => {
        const text = JSON.stringify({ ...JSON.parse(V2.V2_FAILED_MISSING_RESOURCE), version });
        assert.deepStrictEqual(decodeRefusalOf(text), DecodeRefusal.UnsupportedVersion({ version, supported: WIRE_VERSIONS }));
      });
    }

    it("the supported versions are 1 and 2", () => {
      assert.deepStrictEqual(WIRE_VERSIONS, [1, 2]);
    });
  });

  describe("pre-0.5 rows (ADR-QD-060 dropped the error's code unversioned)", () => {
    it("a v1 failed.code is tolerated, and nothing else about the error changes", () => {
      assert.deepStrictEqual(recordOf(V1.V1_PRE05_FAILED_WITH_CODE), recordOf(V1.V1_FAILED_MISSING_RESOURCE));
    });

    it("a cause rendered to a string by the deleted renderCause decodes, as that string", () => {
      const back = recordOf(V1.V1_PRE05_FAILED_RENDERED_CAUSE);
      const error = back._tag === "Decision" && back.outcome._tag === "Failed" ? back.outcome.error : undefined;
      assert.strictEqual(error?._tag === "AttributeResolveError" ? error.cause : undefined, "Error: db down");
    });

    it("only `code` is tolerated: any other excess key under failed is still refused", () => {
      const text = V1.V1_PRE05_FAILED_WITH_CODE.replace('"code":"ACL004"', '"code2":"ACL004"');
      assert.strictEqual(decodeRefusalOf(text)?._tag, "Malformed");
    });

    it("only at failed: a `code` inside the embedded policy is still refused", () => {
      const text = V1.V1_FAILED_MISSING_RESOURCE.replace('"action":"read"}}', '"action":"read"},"code":"x"}');
      assert.strictEqual(decodeRefusalOf(text)?._tag, "Malformed");
    });
  });

  it("property: a v1 record naming no outcome, both, or an unknown nested key never decodes, and never throws (INV-QD-904)", () => {
    const base = JSON.parse(V1.V1_DECIDED_DENY);
    const failedWire = { _tag: "MissingResource", attribute: "owner" };
    const malformed: FastCheck.Arbitrary<unknown> = FastCheck.oneof(
      FastCheck.constant({ ...base, decided: undefined }),
      FastCheck.constant({ ...base, failed: failedWire }),
      FastCheck.string({ minLength: 1 })
        .filter(
          (key) =>
            !["evaluationId", "subjectId", "durationMillis", "trace", "obligations", "reason", "_tag", "visibleFields", "__proto__"].includes(key),
        )
        .map((key) => ({ ...base, decided: { ...base.decided, [key]: 1 } })),
      FastCheck.string({ minLength: 1 })
        .filter((key) => !["_tag", "attribute", "code", "__proto__"].includes(key))
        .map((key) => ({ ...base, decided: undefined, failed: { ...failedWire, [key]: 1 } })),
    );
    FastCheck.assert(
      FastCheck.property(malformed, (input) => Result.isFailure(decodeSinkRecord(JSON.parse(JSON.stringify(input))))),
      { numRuns: 300, seed: 1515 },
    );
  });
});
