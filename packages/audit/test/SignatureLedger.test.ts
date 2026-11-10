import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import {
  assert as qadiAssert,
  currentSubjectLayer,
  decide,
  DecisionSink,
  describeKeyRefusal,
  enforce,
  EvaluationIdLive,
  hasSignature,
  portsLayer,
  signatureHistoryFromSignatures,
  signatureHistoryPort,
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
import type { KeyRefusal, ObligationRecord, Signature, SignatureQuery } from "@qadi/core";
import { SignatureCaptureError, signatureObligationHandler } from "../src/SignatureCapturePort.ts";
import type { SignatureCapturePortShape } from "../src/SignatureCapturePort.ts";
import {
  ledgerEntryOf,
  ledgerKeyOf,
  SignatureLedger,
  SignatureLedgerError,
  SignatureLedgerReadError,
  signatureHistoryFromLedger,
} from "../src/SignatureLedger.ts";
import type { SignatureLedgerEntry, SignatureLedgerShape } from "../src/SignatureLedger.ts";
import { SignatureLedgerTest } from "../src/SignatureLedgerTest.ts";

/** A request key's text; a refusal fails the test, since a subject/resource pair always keys. */
const keyText = (key: Result.Result<string, KeyRefusal>): string => {
  if (Result.isFailure(key)) return assert.fail(`refused: ${describeKeyRefusal(key.failure)}`);
  return key.success;
};

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

const query = (resourceId: string | undefined, subjectId = "alice") => ({
  subjectId: makeSubjectId(subjectId),
  resourceId: resourceId === undefined ? undefined : makeResourceId(resourceId),
});

const historyOf = (ledger: SignatureLedgerShape) =>
  SignatureHistory.pipe(Effect.provide(signatureHistoryFromLedger(ledger)));

const append = (ledger: SignatureLedgerShape, e: SignatureLedgerEntry) =>
  ledger.append(ledgerKeyOf(e), e);

describe("SignatureLedgerTest", () => {
  it.effect("a resource-scoped read sees only entries stored with that resource", () =>
    Effect.gen(function* () {
      const { ledger, entries } = SignatureLedgerTest();
      yield* append(ledger, entry("doc-1"));
      yield* append(ledger, entry(undefined, signed({ meaning: "witnessed" })));
      const history = yield* historyOf(ledger);

      const doc1 = yield* history.signaturesFor(query("doc-1"));
      const doc2 = yield* history.signaturesFor(query("doc-2"));
      const global = yield* history.signaturesFor(query(undefined));

      assert.deepStrictEqual(doc1.map((s) => s.meaning), ["approved"]);
      assert.deepStrictEqual(doc2, []);
      assert.deepStrictEqual(global.map((s) => s.meaning), ["witnessed"]);
      assert.strictEqual(entries().length, 2);
    }));

  it.effect("entries() lists every append in call order, across keys", () =>
    Effect.gen(function* () {
      const { ledger, entries } = SignatureLedgerTest();
      const first = entry("doc-1");
      const second = entry(undefined, signed({ meaning: "witnessed" }));
      const third = entry("doc-1", signed({ meaning: "reviewed" }));
      yield* append(ledger, first);
      yield* append(ledger, second);
      yield* append(ledger, third);
      assert.deepStrictEqual(entries(), [first, second, third]);
      assert.deepStrictEqual(yield* ledger.entriesAt(ledgerKeyOf(first)), [first, third]);
    }));

  it.effect("a read hands out a copy, not the array the ledger holds", () =>
    Effect.gen(function* () {
      const { ledger } = SignatureLedgerTest();
      yield* append(ledger, entry("doc-1"));
      const key = ledgerKeyOf(entry("doc-1"));

      const rawFirst = yield* ledger.entriesAt(key);
      const rawSecond = yield* ledger.entriesAt(key);
      assert.notStrictEqual(rawFirst, rawSecond);
      assert.deepStrictEqual(rawFirst, rawSecond);

      const history = yield* historyOf(ledger);
      const first = yield* history.signaturesFor(query("doc-1"));
      const second = yield* history.signaturesFor(query("doc-1"));
      assert.notStrictEqual(first, second);
      assert.deepStrictEqual(first, second);
    }));

  it.effect("signatureHistoryFromLedger reads the ledger as SignatureHistory", () =>
    Effect.gen(function* () {
      const { ledger } = SignatureLedgerTest();
      yield* append(ledger, entry("doc-1"));

      const history = yield* historyOf(ledger);
      const rows = yield* history.signaturesFor(query("doc-1"));

      assert.strictEqual(history.name, "SignatureLedgerTest");
      assert.strictEqual(rows.length, 1);
    }));

  it.effect("a query carrying the asker's requirement reads the same pair as one without it", () =>
    Effect.gen(function* () {
      const { ledger } = SignatureLedgerTest();
      yield* append(ledger, entry("doc-1"));
      yield* append(ledger, entry("doc-1", signed({ meaning: "witnessed", signerRole: "manager" })));
      const history = yield* historyOf(ledger);

      const bare = yield* history.signaturesFor(query("doc-1"));
      const asked = yield* history.signaturesFor({
        ...query("doc-1"),
        meaning: "approved",
        signerRole: "manager",
      });
      assert.deepStrictEqual(asked, bare);
      assert.strictEqual(asked.length, 2);
    }));

  it.effect("an unnamed ledger gets the layer's own name", () =>
    Effect.gen(function* () {
      const base = SignatureLedgerTest().ledger;
      const unnamed: SignatureLedgerShape = { append: base.append, entriesAt: base.entriesAt };
      const history = yield* historyOf(unnamed);
      assert.strictEqual(history.name, "signatureHistoryFromLedger");
    }));

  it.effect("SignatureLedger.append delegates under ledgerKeyOf(entry)", () =>
    Effect.gen(function* () {
      const { ledger, entries } = SignatureLedgerTest();
      const e = entry("doc-1");
      yield* SignatureLedger.append(e).pipe(Effect.provide(Layer.succeed(SignatureLedger, ledger)));
      assert.strictEqual(entries().length, 1);
      assert.deepStrictEqual(yield* ledger.entriesAt(ledgerKeyOf(e)), [e]);
      assert.deepStrictEqual(yield* ledger.entriesAt(ledgerKeyOf(entry("doc-2"))), []);
    }));
});

describe("signatureHistoryFromLedger — derives the read rule and refuses foreign rows", () => {
  const decideAny = (ledger: SignatureLedgerShape) =>
    Effect.result(
      decide(hasSignature("approved", { scope: "Any" }), { resource: { id: "doc-2" } }).pipe(
        Effect.provide(
          Layer.mergeAll(
            portsLayer({ SignatureHistory: signatureHistoryFromLedger(ledger) }),
            EvaluationIdLive,
            currentSubjectLayer(alice),
          ),
        ),
      ),
    );

  it.effect("a ledger that answers an entry stored under another key fails the read; hasSignature does not allow", () =>
    Effect.gen(function* () {
      // A key-ignoring adapter returns the doc-1 row for the subject-global
      // question. Passed through, `scope: "Any"` on doc-2 would allow.
      const base = SignatureLedgerTest().ledger;
      const misfiled: SignatureLedgerShape = {
        append: base.append,
        entriesAt: () => Effect.succeed([entry("doc-1")]),
      };
      const result = yield* decideAny(misfiled);
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        const failure = result.failure;
        assert.strictEqual(failure._tag, "SignatureHistoryUnavailable");
        if (failure._tag === "SignatureHistoryUnavailable") {
          assert.strictEqual(failure.subjectId, "alice");
          assert.isUndefined(failure.resourceId);
          assert.instanceOf(failure.cause, SignatureLedgerReadError);
          if (failure.cause instanceof SignatureLedgerReadError) {
            assert.strictEqual(failure.cause.key, '[1,"alice",null]');
            assert.strictEqual(
              failure.cause.cause,
              "the ledger answered an entry stored under another key",
            );
          }
        }
      }
    }));

  it.effect("a row whose signer is not its subject fails the read", () =>
    Effect.gen(function* () {
      const base = SignatureLedgerTest().ledger;
      const forged: SignatureLedgerShape = {
        append: base.append,
        entriesAt: () =>
          Effect.succeed([
            { ...entry(undefined), signature: signed({ signerId: makeSubjectId("mallory") }) },
          ]),
      };
      const result = yield* decideAny(forged);
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        const failure = result.failure;
        assert.strictEqual(failure._tag, "SignatureHistoryUnavailable");
        if (failure._tag === "SignatureHistoryUnavailable") {
          assert.instanceOf(failure.cause, SignatureLedgerReadError);
          if (failure.cause instanceof SignatureLedgerReadError) {
            assert.strictEqual(
              failure.cause.cause,
              "the ledger answered an entry whose signer is not its subject",
            );
          }
        }
      }
    }));

  it.effect("one foreign row among matching ones still fails the read", () =>
    Effect.gen(function* () {
      const base = SignatureLedgerTest().ledger;
      const mixed: SignatureLedgerShape = {
        append: base.append,
        entriesAt: () => Effect.succeed([entry(undefined), entry("doc-1")]),
      };
      const result = yield* decideAny(mixed);
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("a store read failure is the port's typed error, with the query's pair", () =>
    Effect.gen(function* () {
      const base = SignatureLedgerTest().ledger;
      const down: SignatureLedgerShape = {
        append: base.append,
        entriesAt: (key) => Effect.fail(new SignatureLedgerReadError({ key, cause: "down" })),
      };
      const history = yield* historyOf(down);
      const result = yield* Effect.result(history.signaturesFor(query("doc-1")));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "SignatureHistoryUnavailable");
        assert.strictEqual(result.failure.subjectId, "alice");
        assert.strictEqual(result.failure.resourceId, "doc-1");
        assert.instanceOf(result.failure.cause, SignatureLedgerReadError);
      }
    }));

  it.effect("a matching row passes, and the decision allows", () =>
    Effect.gen(function* () {
      const { ledger } = SignatureLedgerTest();
      yield* append(ledger, entry(undefined));
      const result = yield* decideAny(ledger);
      assert.strictEqual(result._tag, "Success");
      if (result._tag === "Success") {
        assert.strictEqual(result.success._tag, "Allow");
      }
    }));
});

describe("properties", () => {
  const subjects = FastCheck.constantFrom("alice", "Alice", "alice ", "a:b", "a", "null");
  const resources = FastCheck.option(
    FastCheck.constantFrom("doc-1", "Doc-1", "doc-1 ", "null", "", "b:c", "\u00e9", "e\u0301"),
    { nil: undefined },
  );
  const meanings = FastCheck.constantFrom("approved", "witnessed");
  const pair = FastCheck.record({ subject: subjects, resource: resources });
  const row = FastCheck.record({ subject: subjects, resource: resources, meaning: meanings });

  const pairOf = (p: { subject: string; resource: string | undefined }) => ({
    subjectId: makeSubjectId(p.subject),
    resourceId: p.resource === undefined ? undefined : makeResourceId(p.resource),
  });

  it.effect("differential: the ledger path answers what signatureHistoryFromSignatures answers (INV-QD-120)", () =>
    Effect.promise(() =>
      FastCheck.assert(
        FastCheck.asyncProperty(
          FastCheck.array(row, { maxLength: 8 }),
          FastCheck.array(FastCheck.record({ at: pair, meaning: FastCheck.option(meanings, { nil: undefined }) }), {
            minLength: 1,
            maxLength: 6,
          }),
          (rows, queries) =>
            Effect.runPromise(
              Effect.gen(function* () {
                const { ledger } = SignatureLedgerTest();
                for (const r of rows) {
                  yield* append(ledger, {
                    ...pairOf(r),
                    evaluationId: "ev",
                    signature: signed({ signerId: makeSubjectId(r.subject), meaning: r.meaning }),
                  });
                }
                const viaLedger = yield* historyOf(ledger);
                const viaFixture = yield* SignatureHistory.pipe(
                  Effect.provide(
                    signatureHistoryFromSignatures(
                      rows.map((r) => ({
                        subjectId: r.subject,
                        ...(r.resource === undefined ? {} : { resourceId: r.resource }),
                        meaning: r.meaning,
                      })),
                    ),
                  ),
                );
                const norm = (xs: ReadonlyArray<Signature>) =>
                  xs.map((s) => `${s.signerId}/${s.meaning}`).sort();
                for (const q of queries) {
                  const bare = pairOf(q.at);
                  // The asker's requirement is context, not part of the pair.
                  const asked = { ...bare, meaning: q.meaning, signerRole: "manager" };
                  const a = yield* viaLedger.signaturesFor(bare);
                  assert.deepStrictEqual(norm(a), norm(yield* viaFixture.signaturesFor(bare)));
                  assert.deepStrictEqual(norm(yield* viaLedger.signaturesFor(asked)), norm(a));
                  assert.deepStrictEqual(norm(yield* viaFixture.signaturesFor(asked)), norm(a));
                }
              }),
            ),
        ),
        { numRuns: 200 },
      ),
    ));

  it("key law: ledgerKeyOf partitions pairs as the requirement-free projection of signatureHistoryPort.key does", () => {
    FastCheck.assert(
      FastCheck.property(pair, pair, (p, q) => {
        const lp = pairOf(p);
        const lq = pairOf(q);
        assert.strictEqual(
          ledgerKeyOf(lp) === ledgerKeyOf(lq),
          keyText(signatureHistoryPort.key([lp])) === keyText(signatureHistoryPort.key([lq])),
        );
      }),
      { numRuns: 500 },
    );
  });

  it("key law: a query and the entry its discharge writes share one ledger key", () => {
    FastCheck.assert(
      FastCheck.property(pair, (p) => {
        const asked = pairOf(p);
        const written = ledgerEntryOf(
          { evaluationId: "ev", resourceId: asked.resourceId },
          signed({ signerId: asked.subjectId }),
        );
        const withRequirement: SignatureQuery = { ...asked, meaning: "approved" };
        assert.strictEqual(ledgerKeyOf(withRequirement), ledgerKeyOf(written));
      }),
    );
  });

  it("persisted format: changing these bytes orphans every stored signature", () => {
    assert.strictEqual(
      ledgerKeyOf({ subjectId: makeSubjectId("alice"), resourceId: makeResourceId("doc-1") }),
      '[1,"alice","doc-1"]',
    );
    assert.strictEqual(
      ledgerKeyOf({ subjectId: makeSubjectId("alice"), resourceId: undefined }),
      '[1,"alice",null]',
    );
  });
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

  it.effect("a resource with no string id is refused: the discharge fails and the ledger stays empty", () =>
    Effect.gen(function* () {
      const records: Array<ObligationRecord> = [];
      const { ledger, entries } = SignatureLedgerTest();
      const calls = { n: 0 };

      const result = yield* Effect.result(
        qadiAssert(policy, {
          resource: { id: 7 },
          onObligations: signatureObligationHandler(portReturning(signed(), calls), "approved", {
            ledger,
          }),
        }).pipe(Effect.provide(testEnv(records))),
      );

      assert.strictEqual(result._tag, "Failure");
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]?.outcome, "HandlerFailed");
      assert.strictEqual(calls.n, 0);
      assert.strictEqual(entries().length, 0);
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
        append: (_key, e) =>
          Effect.fail(new SignatureLedgerError({ evaluationId: e.evaluationId, cause: "disk full" })),
        entriesAt: base.entriesAt,
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
