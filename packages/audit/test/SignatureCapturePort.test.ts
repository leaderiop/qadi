import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import {
  Allow,
  assert as qadiAssert,
  currentSubjectLayer,
  DecisionSink,
  EvaluationServicesNone,
  hasPermission,
  makeResourceId,
  makeSubject,
  makeSubjectId,
  obligation,
  obliged,
  permission,
  questionOf,
  Signature,
} from "@qadi/core";
import type {
  AuthSubject,
  Obligation,
  ObligationDischarge,
  ObligationRecord,
  Resource,
  AllowingTrace,
} from "@qadi/core";
import {
  SIGNATURE_MEANINGS,
  SignatureCaptureError,
  SignatureCapturePort,
  signatureObligationHandler,
} from "../src/SignatureCapturePort.ts";
import type {
  SignatureCaptureRequest,
  SignatureCapturePortShape,
  SignatureValidationResult,
} from "../src/SignatureCapturePort.ts";

const alice: AuthSubject = makeSubject({ id: "alice", permissions: ["doc:read"] });

/**
 * The full evaluation environment `Qadi.assert` needs — self-contained from
 * `@qadi/core`'s own trivial default layers: this describe block needs a
 * subject and the fail-closed ports and nothing `@qadi/testing`'s fixtures add.
 */
const testEnv = (subject: AuthSubject) =>
  Layer.mergeAll(currentSubjectLayer(subject), EvaluationServicesNone);

const signature: Signature = {
  signerId: makeSubjectId("alice"),
  signedAt: 0,
  meaning: SIGNATURE_MEANINGS.APPROVED,
};

/**
 * A discharge as the lifecycle would build one: the question an allow answered
 * and the allow itself, with no `CurrentSubject` anywhere.
 */
const dischargeFor = (
  subject: AuthSubject,
  obligations: ReadonlyArray<Obligation>,
  options?: { readonly resource?: Resource; readonly action?: string },
): ObligationDischarge => {
  const policy = obliged(obligation("unused"), hasPermission(permission("doc", "read")));
  const trace: AllowingTrace = { policyTag: "Obliged", allowed: true, children: [], obligations };
  return {
    question: questionOf(subject, policy, options),
    decision: new Allow({
      evaluationId: "ev-1",
      subjectId: subject.id,
      durationMillis: 0,
      trace,
    }),
  };
};

describe("signatureObligationHandler — unit", () => {
  it.effect("calls capture exactly once, with a request derived from the discharged question", () =>
    Effect.gen(function* () {
      let calls = 0;
      let seenRequest: SignatureCaptureRequest | undefined;
      const port: SignatureCapturePortShape = {
        capture: (request) =>
          Effect.sync(() => {
            calls++;
            seenRequest = request;
            return signature;
          }),
        validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
      };

      const handler = signatureObligationHandler(port, SIGNATURE_MEANINGS.APPROVED);
      // No CurrentSubject is provided at all: the handler needs none.
      yield* handler(
        dischargeFor(alice, [obligation("sig.capture")], {
          resource: { id: "doc-1" },
          action: "approve",
        }),
      );

      assert.strictEqual(calls, 1);
      assert.deepStrictEqual(seenRequest, {
        meaning: SIGNATURE_MEANINGS.APPROVED,
        signerId: alice.id,
        obligationIds: ["sig.capture"],
        evaluationId: "ev-1",
        resourceId: makeResourceId("doc-1"),
        action: "approve",
        resource: { id: "doc-1" },
      });
    }));

  it.effect("a question with no resource or action gives a request carrying undefined for each", () =>
    Effect.gen(function* () {
      let seenRequest: SignatureCaptureRequest | undefined;
      const port: SignatureCapturePortShape = {
        capture: (request) =>
          Effect.sync(() => {
            seenRequest = request;
            return signature;
          }),
        validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
      };

      yield* signatureObligationHandler(port, "approved")(dischargeFor(alice, [obligation("s")]));

      assert.isDefined(seenRequest);
      for (const key of ["resourceId", "action", "resource"] as const) {
        assert.isTrue(Object.hasOwn(seenRequest ?? {}, key), key);
        assert.isUndefined(seenRequest?.[key]);
      }
    }));

  it.effect("a resource whose id is not a string gives no resourceId, but still carries the resource", () =>
    Effect.gen(function* () {
      let seenRequest: SignatureCaptureRequest | undefined;
      const port: SignatureCapturePortShape = {
        capture: (request) =>
          Effect.sync(() => {
            seenRequest = request;
            return signature;
          }),
        validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
      };

      yield* signatureObligationHandler(port, "approved")(
        dischargeFor(alice, [obligation("s")], { resource: { id: 7 } }),
      );

      assert.isUndefined(seenRequest?.resourceId);
      assert.deepStrictEqual(seenRequest?.resource, { id: 7 });
    }));

  it.effect("the signer is the question's subject, even when a different CurrentSubject is provided", () =>
    Effect.gen(function* () {
      const bob: AuthSubject = makeSubject({ id: "bob", permissions: ["doc:read"] });
      let seenRequest: SignatureCaptureRequest | undefined;
      const port: SignatureCapturePortShape = {
        capture: (request) =>
          Effect.sync(() => {
            seenRequest = request;
            return { ...signature, signerId: request.signerId };
          }),
        validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
      };

      yield* signatureObligationHandler(port, "approved")(dischargeFor(bob, [obligation("s")])).pipe(
        Effect.provide(currentSubjectLayer(alice)),
      );

      assert.strictEqual(seenRequest?.signerId, "bob");
    }));

  it.effect("options.signerRole reaches capture()'s request; omitting it leaves the field absent", () =>
    Effect.gen(function* () {
      const seen: Array<SignatureCaptureRequest> = [];
      const port: SignatureCapturePortShape = {
        capture: (request) =>
          Effect.sync(() => {
            seen.push(request);
            return signature;
          }),
        validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
      };

      yield* signatureObligationHandler(port, "approved", { signerRole: "manager" })(
        dischargeFor(alice, [obligation("sig.capture")]),
      );
      yield* signatureObligationHandler(port, "approved")(
        dischargeFor(alice, [obligation("sig.capture")]),
      );

      assert.strictEqual(seen.length, 2);
      assert.strictEqual(seen[0]?.signerRole, "manager");
      assert.isFalse(Object.hasOwn(seen[1] ?? {}, "signerRole"));
    }));

  it.effect("a capture failure fails the handler with SignatureCaptureError", () =>
    Effect.gen(function* () {
      const failure = new SignatureCaptureError({ reason: "reauthentication required" });
      const port: SignatureCapturePortShape = {
        capture: () => Effect.fail(failure),
        validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
      };

      const handler = signatureObligationHandler(port, SIGNATURE_MEANINGS.APPROVED);
      const result = yield* Effect.result(handler(dischargeFor(alice, [obligation("sig.capture")])));

      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure, failure);
        // A hard-coded literal, not compared against another instance of the
        // same class — that comparison alone couldn't distinguish the real
        // tag from a mutated one, since both sides would mutate together.
        assert.strictEqual(result.failure._tag, "SignatureCaptureError");
      }
    }));

  it.effect("SignatureCapturePort's static accessors delegate to the provided Layer", () =>
    Effect.gen(function* () {
      const port: SignatureCapturePortShape = {
        capture: () => Effect.succeed(signature),
        validate: () => Effect.succeed({ valid: true, validatedAt: 7 }),
      };
      const layer = Layer.succeed(SignatureCapturePort, port);

      const captured = yield* SignatureCapturePort.capture({
        meaning: SIGNATURE_MEANINGS.APPROVED,
        signerId: alice.id,
        obligationIds: [],
        evaluationId: "ev-1",
        resourceId: undefined,
        action: undefined,
        resource: undefined,
      }).pipe(Effect.provide(layer));
      assert.strictEqual(captured, signature);

      const validated = yield* SignatureCapturePort.validate(signature).pipe(Effect.provide(layer));
      assert.strictEqual(validated.validatedAt, 7);
    }));

  it.effect("validate is independent of capture — callable without ever calling capture", () =>
    Effect.gen(function* () {
      let captureCalls = 0;
      let validateCalls = 0;
      const result: SignatureValidationResult = { valid: true, validatedAt: 42 };
      const port: SignatureCapturePortShape = {
        capture: () => {
          captureCalls++;
          return Effect.succeed(signature);
        },
        validate: () => {
          validateCalls++;
          return Effect.succeed(result);
        },
      };

      const outcome = yield* port.validate(signature);
      assert.strictEqual(outcome, result);
      assert.strictEqual(captureCalls, 0);
      assert.strictEqual(validateCalls, 1);
    }));
});

describe("signatureObligationHandler — wired through Qadi.enforce's discharge", () => {
  const read = permission("doc", "read");
  const policy = obliged(obligation("sig.approve"), hasPermission(read));

  it.effect("a successful capture discharges the obligation, and the ObligationRecord says so", () =>
    Effect.gen(function* () {
      const records: Array<ObligationRecord> = [];
      const sink = Layer.succeed(DecisionSink, {
        record: (record) =>
          Effect.sync(() => {
            if (record._tag === "Obligations") records.push(record);
          }),
      });

      const port: SignatureCapturePortShape = {
        capture: () => Effect.succeed(signature),
        validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
      };

      yield* qadiAssert(policy, {
        onObligations: signatureObligationHandler(port, SIGNATURE_MEANINGS.APPROVED),
      }).pipe(Effect.provide(Layer.mergeAll(testEnv(alice), sink)));

      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]?.outcome, "Discharged");
    }));

  it.effect("a failed capture refuses enforcement, and the ObligationRecord says HandlerFailed", () =>
    Effect.gen(function* () {
      const records: Array<ObligationRecord> = [];
      const sink = Layer.succeed(DecisionSink, {
        record: (record) =>
          Effect.sync(() => {
            if (record._tag === "Obligations") records.push(record);
          }),
      });

      const port: SignatureCapturePortShape = {
        capture: () => Effect.fail(new SignatureCaptureError({ reason: "declined" })),
        validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
      };

      const result = yield* Effect.result(
        qadiAssert(policy, {
          onObligations: signatureObligationHandler(port, SIGNATURE_MEANINGS.APPROVED),
        }).pipe(Effect.provide(Layer.mergeAll(testEnv(alice), sink))),
      );

      assert.strictEqual(result._tag, "Failure");
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]?.outcome, "HandlerFailed");
    }));

  it.effect("with no handler wired, enforcement fails closed — no Noop shipped", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(qadiAssert(policy).pipe(Effect.provide(testEnv(alice))));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure._tag, "UndischargedObligation");
    }));
});

describe("Signature (re-exported from @qadi/core) — the schema is real, not decorative", () => {
  it.effect("a real signature round-trips through Schema encode/decode, every field intact", () =>
    Effect.gen(function* () {
      const full: Signature = {
        signerId: alice.id,
        signedAt: 1_700_000_000_000,
        meaning: SIGNATURE_MEANINGS.WITNESSED,
        algorithm: "Ed25519",
        keyId: "key-1",
      };

      const encoded = yield* Schema.encodeEffect(Signature)(full);
      const decoded = yield* Schema.decodeUnknownEffect(Signature)(
        JSON.parse(JSON.stringify(encoded)),
      );
      assert.deepStrictEqual(decoded, full);
    }));

  it.effect("algorithm and keyId stay genuinely optional — absent, not present-and-undefined", () =>
    Effect.gen(function* () {
      const minimal: Signature = {
        signerId: alice.id,
        signedAt: 0,
        meaning: SIGNATURE_MEANINGS.APPROVED,
      };

      const encoded = yield* Schema.encodeEffect(Signature)(minimal);
      assert.isFalse(Object.hasOwn(encoded, "algorithm"));
      assert.isFalse(Object.hasOwn(encoded, "keyId"));
    }));
});
