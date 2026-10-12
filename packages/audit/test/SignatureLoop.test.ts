import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  currentSubjectLayer,
  decide,
  EvaluationIdLive,
  guard,
  hasPermission,
  hasSignature,
  makeSubject,
  obligation,
  obliged,
  permission,
  portsLayer,
  SignatureHistory,
} from "@qadi/core";
import type { Policy, ResourceId, Signature, SubjectId } from "@qadi/core";
import { signatureObligationHandler } from "../src/SignatureCapturePort.ts";
import { signatureHistoryFromLedger } from "../src/SignatureLedger.ts";
import { SignatureLedgerTest } from "../src/SignatureLedgerTest.ts";
import type { SignatureCapturePortShape } from "../src/SignatureCapturePort.ts";

const alice = makeSubject({ id: "alice", permissions: ["doc:approve"] });
const approve = permission("doc", "approve");
const approval = obliged(obligation("sig.approve"), hasPermission(approve));

interface Row {
  readonly subjectId: SubjectId;
  readonly resourceId: ResourceId | undefined;
  readonly signature: Signature;
}

/**
 * A capture port that persists every signature into a store using the most its
 * request lets it know, and a `SignatureHistory` that reads the same store.
 */
const storeAndHistory = () => {
  const rows: Array<Row> = [];
  const port: SignatureCapturePortShape = {
    capture: (request) =>
      Effect.sync(() => {
        const signature: Signature = {
          signerId: request.signerId,
          signedAt: 0,
          meaning: request.meaning,
        };
        rows.push({
          subjectId: request.signerId,
          resourceId: request.resourceId,
          signature,
        });
        return signature;
      }),
    validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
  };
  const history = Layer.succeed(SignatureHistory, {
    name: "test-store",
    signaturesFor: (query) =>
      Effect.sync(() =>
        rows
          .filter(
            (r) =>
              r.subjectId === query.subjectId && r.resourceId === query.resourceId,
          )
          .map((r) => r.signature),
      ),
  });
  return { port, history, rows };
};

const envOf = (history: Layer.Layer<SignatureHistory>) =>
  Layer.mergeAll(
    portsLayer({ SignatureHistory: history }),
    EvaluationIdLive,
    currentSubjectLayer(alice),
  );

describe("obligation -> capture -> SignatureHistory -> hasSignature (capture persists)", () => {
  const approveDoc1 = (port: SignatureCapturePortShape) =>
    guard(approve, approval, {
      onObligations: signatureObligationHandler(port, "approved"),
    })({ id: "doc-1" }, () => Effect.succeed("approved"));

  it.effect("a signature captured while approving doc-1 satisfies hasSignature('approved') on doc-1", () =>
    Effect.gen(function* () {
      const { port, history } = storeAndHistory();
      const env = envOf(history);
      yield* approveDoc1(port).pipe(Effect.provide(env));
      const decision = yield* decide(hasSignature("approved"), {
        resource: { id: "doc-1" },
      }).pipe(Effect.provide(env));
      assert.strictEqual(decision._tag, "Allow");
    }));

  it.effect("...does not satisfy doc-2", () =>
    Effect.gen(function* () {
      const { port, history } = storeAndHistory();
      const env = envOf(history);
      yield* approveDoc1(port).pipe(Effect.provide(env));
      const decision = yield* decide(hasSignature("approved"), {
        resource: { id: "doc-2" },
      }).pipe(Effect.provide(env));
      assert.strictEqual(decision._tag, "Deny");
    }));

  it.effect("...is not a subject-global signature", () =>
    Effect.gen(function* () {
      const { port, history } = storeAndHistory();
      const env = envOf(history);
      yield* approveDoc1(port).pipe(Effect.provide(env));
      const decision = yield* decide(hasSignature("approved", { scope: "Any" }), {
        resource: { id: "doc-1" },
      }).pipe(Effect.provide(env));
      assert.strictEqual(decision._tag, "Deny");
    }));
});

describe("obligation -> capture -> SignatureLedger -> hasSignature (ledger)", () => {
  /** A capture that persists nothing itself: the ledger is the store. */
  const returningPort: SignatureCapturePortShape = {
    capture: (request) =>
      Effect.succeed({ signerId: request.signerId, signedAt: 0, meaning: request.meaning }),
    validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
  };

  const approveDoc1 = (ledger: ReturnType<typeof SignatureLedgerTest>["ledger"]) =>
    guard(approve, approval, {
      onObligations: signatureObligationHandler(returningPort, "approved", { ledger }),
    })({ id: "doc-1" }, () => Effect.succeed("approved"));

  const decideAfterApproving = (
    policy: Policy,
    resourceId: string,
  ) =>
    Effect.gen(function* () {
      const { ledger } = SignatureLedgerTest();
      const env = envOf(signatureHistoryFromLedger(ledger));
      yield* approveDoc1(ledger).pipe(Effect.provide(env));
      return yield* decide(policy, { resource: { id: resourceId } }).pipe(Effect.provide(env));
    });

  it.effect("a signature captured while approving doc-1 satisfies hasSignature('approved') on doc-1", () =>
    Effect.gen(function* () {
      const decision = yield* decideAfterApproving(hasSignature("approved"), "doc-1");
      assert.strictEqual(decision._tag, "Allow");
    }));

  it.effect("...does not satisfy doc-2", () =>
    Effect.gen(function* () {
      const decision = yield* decideAfterApproving(hasSignature("approved"), "doc-2");
      assert.strictEqual(decision._tag, "Deny");
    }));

  it.effect("...is not a subject-global signature", () =>
    Effect.gen(function* () {
      const decision = yield* decideAfterApproving(
        hasSignature("approved", { scope: "Any" }),
        "doc-1",
      );
      assert.strictEqual(decision._tag, "Deny");
    }));
});
