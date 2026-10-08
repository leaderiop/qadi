import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  assert as qadiAssert,
  currentSubjectLayer,
  DecisionSink,
  enforce,
  EvaluationServicesNone,
  hasPermission,
  makeResourceId,
  makeSubject,
  makeSubjectId,
  obligation,
  obliged,
  permission,
  SignatureHistory,
} from "@qadi/core";
import type { ObligationRecord, Signature } from "@qadi/core";
import { SignatureCaptureError, signatureObligationHandler } from "../src/SignatureCapturePort.ts";
import type { SignatureCapturePortShape } from "../src/SignatureCapturePort.ts";
import {
  ledgerEntryOf,
  SignatureLedger,
  SignatureLedgerError,
  signatureHistoryFromLedger,
} from "../src/SignatureLedger.ts";
import type { SignatureLedgerShape } from "../src/SignatureLedger.ts";
import { SignatureLedgerTest } from "../src/SignatureLedgerTest.ts";

const alice = makeSubject({ id: "alice", permissions: ["doc:approve"] });
const approve = permission("doc", "approve");
const policy = obliged(obligation("sig.approve"), hasPermission(approve));
const signed = (overrides?: Partial<Signature>): Signature => ({
  signerId: makeSubjectId("alice"),
  signedAt: 0,
  meaning: "approved",
  ...overrides,
});

const entry = (resourceId: string | undefined, signature: Signature = signed()) => ({
  subjectId: signature.signerId,
  resourceId: resourceId === undefined ? undefined : makeResourceId(resourceId),
  evaluationId: "ev-1",
  signature,
});

describe("SignatureLedgerTest", () => {
  it.effect("a resource-scoped read sees only entries stored with that resource", () =>
    Effect.gen(function* () {
      const { ledger, entries } = SignatureLedgerTest();
      yield* ledger.append(entry("doc-1"));
      yield* ledger.append(entry(undefined, signed({ meaning: "witnessed" })));

      const doc1 = yield* ledger.signaturesFor({
        subjectId: makeSubjectId("alice"),
        resourceId: makeResourceId("doc-1"),
      });
      const doc2 = yield* ledger.signaturesFor({
        subjectId: makeSubjectId("alice"),
        resourceId: makeResourceId("doc-2"),
      });
      const global = yield* ledger.signaturesFor({
        subjectId: makeSubjectId("alice"),
        resourceId: undefined,
      });

      assert.deepStrictEqual(doc1.map((s) => s.meaning), ["approved"]);
      assert.deepStrictEqual(doc2, []);
      assert.deepStrictEqual(global.map((s) => s.meaning), ["witnessed"]);
      assert.strictEqual(entries().length, 2);
    }));

  it.effect("a read hands out a copy, not the array the ledger holds", () =>
    Effect.gen(function* () {
      const { ledger } = SignatureLedgerTest();
      yield* ledger.append(entry("doc-1"));
      const query = { subjectId: makeSubjectId("alice"), resourceId: makeResourceId("doc-1") };

      const first = yield* ledger.signaturesFor(query);
      const second = yield* ledger.signaturesFor(query);

      assert.notStrictEqual(first, second);
      assert.deepStrictEqual(first, second);
    }));

  it.effect("signatureHistoryFromLedger reads the ledger as SignatureHistory", () =>
    Effect.gen(function* () {
      const { ledger } = SignatureLedgerTest();
      yield* ledger.append(entry("doc-1"));

      const history = yield* SignatureHistory.pipe(
        Effect.provide(signatureHistoryFromLedger(ledger)),
      );
      const rows = yield* history.signaturesFor({
        subjectId: makeSubjectId("alice"),
        resourceId: makeResourceId("doc-1"),
      });

      assert.strictEqual(history.name, "SignatureLedgerTest");
      assert.strictEqual(rows.length, 1);
    }));

  it.effect("an unnamed ledger gets the layer's own name", () =>
    Effect.gen(function* () {
      const base = SignatureLedgerTest().ledger;
      const unnamed: SignatureLedgerShape = {
        append: base.append,
        signaturesFor: base.signaturesFor,
      };
      const history = yield* SignatureHistory.pipe(
        Effect.provide(signatureHistoryFromLedger(unnamed)),
      );
      assert.strictEqual(history.name, "signatureHistoryFromLedger");
    }));

  it.effect("SignatureLedger.append delegates to the provided ledger", () =>
    Effect.gen(function* () {
      const { ledger, entries } = SignatureLedgerTest();
      yield* SignatureLedger.append(entry("doc-1")).pipe(
        Effect.provide(Layer.succeed(SignatureLedger, ledger)),
      );
      assert.strictEqual(entries().length, 1);
    }));
});

describe("ledgerEntryOf — the write key", () => {
  it("is the signature's signer and the request's resource id", () => {
    const signature = signed();
    const result = ledgerEntryOf(
      { evaluationId: "ev-9", resourceId: makeResourceId("doc-1") },
      signature,
    );
    assert.deepStrictEqual(result, {
      subjectId: makeSubjectId("alice"),
      resourceId: makeResourceId("doc-1"),
      evaluationId: "ev-9",
      signature,
    });
  });

  it("keeps an absent resource id absent-valued (subject-global)", () => {
    const result = ledgerEntryOf({ evaluationId: "ev-9", resourceId: undefined }, signed());
    assert.isUndefined(result.resourceId);
  });
});

describe("signatureObligationHandler with a ledger — wired through Qadi.assert", () => {
  const testEnv = (records: Array<ObligationRecord>) =>
    Layer.mergeAll(
      currentSubjectLayer(alice),
      EvaluationServicesNone,
      Layer.succeed(DecisionSink, {
        record: (record) =>
          Effect.sync(() => {
            if (record._tag === "Obligations") records.push(record);
          }),
      }),
    );

  const portReturning = (signature: Signature, calls: { n: number }): SignatureCapturePortShape => ({
    capture: () =>
      Effect.sync(() => {
        calls.n++;
        return signature;
      }),
    validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
  });

  it.effect("records the returned signature under the question's key and discharges", () =>
    Effect.gen(function* () {
      const records: Array<ObligationRecord> = [];
      const { ledger, entries } = SignatureLedgerTest();
      const calls = { n: 0 };

      yield* qadiAssert(policy, {
        resource: { id: "doc-1" },
        onObligations: signatureObligationHandler(portReturning(signed(), calls), "approved", {
          ledger,
        }),
      }).pipe(Effect.provide(testEnv(records)));

      assert.strictEqual(calls.n, 1);
      assert.strictEqual(records[0]?.outcome, "Discharged");
      assert.strictEqual(entries().length, 1);
      assert.strictEqual(entries()[0]?.subjectId, "alice");
      assert.strictEqual(entries()[0]?.resourceId, "doc-1");
      assert.strictEqual(entries()[0]?.evaluationId, records[0]?.evaluationId);
    }));

  it.effect("a resource with no string id is recorded subject-wide (resourceId undefined)", () =>
    Effect.gen(function* () {
      const records: Array<ObligationRecord> = [];
      const { ledger, entries } = SignatureLedgerTest();

      yield* qadiAssert(policy, {
        resource: { id: 7 },
        onObligations: signatureObligationHandler(portReturning(signed(), { n: 0 }), "approved", {
          ledger,
        }),
      }).pipe(Effect.provide(testEnv(records)));

      assert.strictEqual(entries().length, 1);
      assert.isUndefined(entries()[0]?.resourceId);
    }));

  it.effect("a signature for a different signer fails the discharge and appends nothing", () =>
    Effect.gen(function* () {
      const records: Array<ObligationRecord> = [];
      const { ledger, entries } = SignatureLedgerTest();
      let ran = false;

      const result = yield* Effect.result(
        Effect.sync(() => {
          ran = true;
        }).pipe(
          enforce(policy, {
            resource: { id: "doc-1" },
            onObligations: signatureObligationHandler(
              portReturning(signed({ signerId: makeSubjectId("mallory") }), { n: 0 }),
              "approved",
              { ledger },
            ),
          }),
          Effect.provide(testEnv(records)),
        ),
      );

      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "SignatureCaptureError");
      }
      assert.isFalse(ran);
      assert.strictEqual(entries().length, 0);
      assert.strictEqual(records[0]?.outcome, "HandlerFailed");
    }));

  it.effect("a signature for a different meaning fails the discharge and appends nothing", () =>
    Effect.gen(function* () {
      const records: Array<ObligationRecord> = [];
      const { ledger, entries } = SignatureLedgerTest();

      const result = yield* Effect.result(
        qadiAssert(policy, {
          resource: { id: "doc-1" },
          onObligations: signatureObligationHandler(
            portReturning(signed({ meaning: "witnessed" }), { n: 0 }),
            "approved",
            { ledger },
          ),
        }).pipe(Effect.provide(testEnv(records))),
      );

      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.instanceOf(result.failure, SignatureCaptureError);
      }
      assert.strictEqual(entries().length, 0);
      assert.strictEqual(records[0]?.outcome, "HandlerFailed");
    }));

  it.effect("a mismatch also fails the discharge when no ledger is wired", () =>
    Effect.gen(function* () {
      const records: Array<ObligationRecord> = [];

      const result = yield* Effect.result(
        qadiAssert(policy, {
          resource: { id: "doc-1" },
          onObligations: signatureObligationHandler(
            portReturning(signed({ signerId: makeSubjectId("mallory") }), { n: 0 }),
            "approved",
          ),
        }).pipe(Effect.provide(testEnv(records))),
      );

      assert.strictEqual(result._tag, "Failure");
      assert.strictEqual(records[0]?.outcome, "HandlerFailed");
    }));

  it.effect("a failing ledger refuses enforcement: HandlerFailed, the guarded work never runs", () =>
    Effect.gen(function* () {
      const records: Array<ObligationRecord> = [];
      const calls = { n: 0 };
      let ran = false;
      const base = SignatureLedgerTest().ledger;
      const failing: SignatureLedgerShape = {
        append: (e) =>
          Effect.fail(new SignatureLedgerError({ evaluationId: e.evaluationId, cause: "disk full" })),
        signaturesFor: base.signaturesFor,
      };

      const result = yield* Effect.result(
        Effect.sync(() => {
          ran = true;
        }).pipe(
          enforce(policy, {
            resource: { id: "doc-1" },
            onObligations: signatureObligationHandler(portReturning(signed(), calls), "approved", {
              ledger: failing,
            }),
          }),
          Effect.provide(testEnv(records)),
        ),
      );

      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "SignatureLedgerError");
      }
      assert.isFalse(ran);
      assert.strictEqual(calls.n, 1);
      assert.strictEqual(records[0]?.outcome, "HandlerFailed");
    }));
});
