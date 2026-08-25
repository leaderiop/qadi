import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  assert as qadiAssert,
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  DecisionSink,
  EvaluationIdLive,
  hasPermission,
  makeSubject,
  makeSubjectId,
  obligation,
  obliged,
  permission,
  RelationshipResolverNever,
} from "@qadi/core";
import type { AuthSubject, ObligationRecord } from "@qadi/core";
import {
  SIGNATURE_MEANINGS,
  SignatureCaptureError,
  SignatureCapturePort,
  signatureObligationHandler,
} from "../src/SignatureCapturePort.ts";
import type {
  ElectronicSignature,
  SignatureCaptureRequest,
  SignatureCapturePortShape,
  SignatureValidationResult,
} from "../src/SignatureCapturePort.ts";

const alice: AuthSubject = makeSubject({ id: "alice", permissions: ["doc:read"] });

/**
 * The full evaluation environment `Qadi.assert` needs — self-contained from
 * `@qadi/core`'s own trivial default layers, the same pattern
 * `@qadi/http`'s tests use, rather than adding `@qadi/testing` as a
 * dependency for one describe block.
 */
const testEnv = (subject: AuthSubject) =>
  Layer.mergeAll(
    currentSubjectLayer(subject),
    AttributeResolverNone,
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
  );

const signature: ElectronicSignature = {
  signerId: makeSubjectId("alice"),
  signedAt: 0,
  meaning: SIGNATURE_MEANINGS.APPROVED,
};

describe("signatureObligationHandler — unit", () => {
  it.effect("calls capture exactly once, with a request derived from CurrentSubject and the obligations", () =>
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
      yield* handler([obligation("sig.capture")]).pipe(
        Effect.provide(currentSubjectLayer(alice)),
      );

      assert.strictEqual(calls, 1);
      assert.deepStrictEqual(seenRequest, {
        meaning: SIGNATURE_MEANINGS.APPROVED,
        signerId: alice.id,
        obligationIds: ["sig.capture"],
      });
    }));

  it.effect("a capture failure fails the handler with SignatureCaptureError", () =>
    Effect.gen(function* () {
      const failure = new SignatureCaptureError({ reason: "reauthentication required" });
      const port: SignatureCapturePortShape = {
        capture: () => Effect.fail(failure),
        validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
      };

      const handler = signatureObligationHandler(port, SIGNATURE_MEANINGS.APPROVED);
      const result = yield* Effect.result(
        handler([obligation("sig.capture")]).pipe(Effect.provide(currentSubjectLayer(alice))),
      );

      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure, failure);
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
      }).pipe(Effect.provide(testEnv(alice)), Effect.provide(sink));

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
        }).pipe(Effect.provide(testEnv(alice)), Effect.provide(sink)),
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
