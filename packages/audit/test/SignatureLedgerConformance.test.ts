import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Result from "effect/Result";
import { makeResourceId, makeSubjectId, SignatureHistory, signatureHistoryFromSignatures } from "@qadi/core";
import type { Signature } from "@qadi/core";
import { signatureHistoryFromLedger, ledgerKeyOf, SignatureLedgerReadError } from "../src/SignatureLedger.ts";
import type {
  LedgerPair,
  SignatureLedgerEntry,
  SignatureLedgerKey,
  SignatureLedgerShape,
} from "../src/SignatureLedger.ts";
import {
  checkSignatureHistoryScoping,
  checkSignatureLedger,
} from "../src/SignatureLedgerConformance.ts";
import type { LedgerConformanceViolation } from "../src/SignatureLedgerConformance.ts";
import { SignatureLedgerTest } from "../src/SignatureLedgerTest.ts";

const NS = "qadi-conformance/";

const pairText = (pair: LedgerPair): string =>
  `${pair.subjectId.replace(NS, "")}:${JSON.stringify(pair.resourceId ?? null)}`;

const showOne: (violation: LedgerConformanceViolation) => string = Match.type<LedgerConformanceViolation>().pipe(
  Match.tagsExhaustive({
    Foreign: (v) => `Foreign ${pairText(v.asked)} <= ${pairText(v.answered)} (${v.meaning})`,
    Missing: (v) => `Missing ${pairText(v.asked)} (${v.meaning})`,
  }),
);

/** One compact line per violation, so a test pins the exact list. */
const show = (violations: ReadonlyArray<LedgerConformanceViolation>): ReadonlyArray<string> =>
  violations.map(showOne);

/** A ledger over a plain map whose key normalisation (`fold`) and write policy are the fault. */
const mapLedger = (
  fold: (key: string) => string,
  mode: "append" | "keepLast" = "append",
): SignatureLedgerShape => {
  const store = new Map<string, Array<SignatureLedgerEntry>>();
  return {
    name: "map",
    append: (key, entry) =>
      Effect.sync(() => {
        const k = fold(key);
        const existing = store.get(k) ?? [];
        store.set(k, mode === "keepLast" ? [entry] : [...existing, entry]);
      }),
    entriesAt: (key) => Effect.sync(() => [...(store.get(fold(key)) ?? [])]),
  };
};

describe("checkSignatureLedger", () => {
  it.effect("reports nothing for the shipped double", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* checkSignatureLedger(SignatureLedgerTest().ledger), []);
    }));

  it.effect("reports nothing for a faithful byte-for-byte map", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* checkSignatureLedger(mapLedger((k) => k)), []);
    }));

  it.effect("a case-folding store reports Foreign for the doc-1 / Doc-1 pair", () =>
    Effect.gen(function* () {
      const violations = yield* checkSignatureLedger(mapLedger((k) => k.toLowerCase()));
      assert.deepStrictEqual(show(violations), [
        'Foreign alice:"doc-1" <= alice:"Doc-1" (conformance-1)',
        'Foreign alice:"Doc-1" <= alice:"doc-1" (conformance-0)',
        'Foreign alice:"Doc-1" <= alice:"doc-1" (conformance-0-again)',
      ]);
    }));

  it.effect("a space-trimming store reports Foreign for the doc-1 / 'doc-1 ' pair", () =>
    Effect.gen(function* () {
      const violations = yield* checkSignatureLedger(mapLedger((k) => k.replace(/ (?=")/, "")));
      assert.deepStrictEqual(show(violations), [
        'Foreign alice:"doc-1" <= alice:"doc-1 " (conformance-2)',
        'Foreign alice:"doc-1 " <= alice:"doc-1" (conformance-0)',
        'Foreign alice:"doc-1 " <= alice:"doc-1" (conformance-0-again)',
      ]);
    }));

  it.effect("an NFC-normalising store reports Foreign for the two e-acute pairs", () =>
    Effect.gen(function* () {
      const violations = yield* checkSignatureLedger(mapLedger((k) => k.normalize("NFC")));
      assert.deepStrictEqual(show(violations), [
        'Foreign alice:"\u00e9" <= alice:"e\u0301" (conformance-4)',
        'Foreign alice:"e\u0301" <= alice:"\u00e9" (conformance-3)',
      ]);
    }));

  it.effect("a lossy store (last entry per key) reports Missing", () =>
    Effect.gen(function* () {
      // The fixture writes two rows under one key, so a store keeping one loses an answer.
      const violations = yield* checkSignatureLedger(mapLedger((k) => k, "keepLast"));
      assert.deepStrictEqual(show(violations), ['Missing alice:"doc-1" (conformance-0)']);
    }));

  it.effect("a store failure is an error, not a violation", () =>
    Effect.gen(function* () {
      const down: SignatureLedgerShape = {
        append: () => Effect.void,
        entriesAt: (key: SignatureLedgerKey) =>
          Effect.fail(new SignatureLedgerReadError({ key, cause: "down" })),
      };
      const result = yield* Effect.result(checkSignatureLedger(down));
      if (!Result.isFailure(result)) return assert.fail("expected the store's error");
      assert.instanceOf(result.failure, SignatureLedgerReadError);
      assert.strictEqual(result.failure.cause, "down");
    }));

  it.effect("a row already in a shared table, under a fixture key, is not the check's to judge", () =>
    Effect.gen(function* () {
      const shared = SignatureLedgerTest().ledger;
      const entry: SignatureLedgerEntry = {
        subjectId: makeSubjectId("qadi-conformance/alice"),
        resourceId: makeResourceId("doc-1"),
        evaluationId: "ev-prod",
        signature: { signerId: makeSubjectId("qadi-conformance/alice"), signedAt: 0, meaning: "approved" },
      };
      yield* shared.append(ledgerKeyOf(entry), entry);
      assert.deepStrictEqual(yield* checkSignatureLedger(shared), []);
    }));

  it.effect("namespace isolates two runs against one store", () =>
    Effect.gen(function* () {
      const shared = SignatureLedgerTest().ledger;
      assert.deepStrictEqual(yield* checkSignatureLedger(shared, { namespace: "run-a" }), []);
      assert.deepStrictEqual(yield* checkSignatureLedger(shared, { namespace: "run-b" }), []);
    }));
});

describe("checkSignatureHistoryScoping", () => {
  const entryOf = (row: { pair: LedgerPair; signature: Signature }): SignatureLedgerEntry => ({
    ...row.pair,
    evaluationId: "ev",
    signature: row.signature,
  });

  /** A history over `rows` whose read applies `matches`. */
  const historyWith = (
    matches: (query: LedgerPair, row: LedgerPair) => boolean,
  ) => (rows: ReadonlyArray<{ pair: LedgerPair; signature: Signature }>) =>
    Effect.succeed(
      Layer.succeed(SignatureHistory, {
        name: "naive",
        signaturesFor: (query) =>
          Effect.succeed(rows.filter((r) => matches(query, r.pair)).map((r) => r.signature)),
      }),
    );

  it.effect("reports nothing for signatureHistoryFromSignatures", () =>
    Effect.gen(function* () {
      const violations = yield* checkSignatureHistoryScoping((rows) =>
        Effect.succeed(
          signatureHistoryFromSignatures(
            rows.map((r) => ({
              subjectId: r.pair.subjectId,
              ...(r.pair.resourceId === undefined ? {} : { resourceId: r.pair.resourceId }),
              meaning: r.signature.meaning,
            })),
          ),
        ),
      );
      assert.deepStrictEqual(violations, []);
    }));

  it.effect("reports nothing for signatureHistoryFromLedger over the double", () =>
    Effect.gen(function* () {
      const violations = yield* checkSignatureHistoryScoping((rows) =>
        Effect.gen(function* () {
          const { ledger } = SignatureLedgerTest();
          for (const row of rows) {
            const entry = entryOf(row);
            yield* ledger.append(ledgerKeyOf(entry), entry);
          }
          return signatureHistoryFromLedger(ledger);
        }),
      );
      assert.deepStrictEqual(violations, []);
    }));

  it.effect("reports Foreign for the optional-filter history (P1)", () =>
    Effect.gen(function* () {
      const violations = yield* checkSignatureHistoryScoping(
        historyWith(
          (q, r) =>
            q.subjectId === r.subjectId && (q.resourceId === undefined || r.resourceId === q.resourceId),
        ),
      );
      assert.deepStrictEqual(show(violations), [
        'Foreign alice:null <= alice:"doc-1" (conformance-0)',
        'Foreign alice:null <= alice:"Doc-1" (conformance-1)',
        'Foreign alice:null <= alice:"doc-1 " (conformance-2)',
        'Foreign alice:null <= alice:"\u00e9" (conformance-3)',
        'Foreign alice:null <= alice:"e\u0301" (conformance-4)',
        'Foreign alice:null <= alice:"null" (conformance-5)',
        'Foreign alice:null <= alice:"" (conformance-6)',
        'Foreign alice:null <= alice:"a\\",\\"b" (conformance-7)',
        'Foreign alice:null <= alice:"doc-1" (conformance-0-again)',
        'Foreign bob:null <= bob:"doc-1" (conformance-9)',
      ]);
    }));

  it.effect("reports Foreign for the null-wildcard history (P2)", () =>
    Effect.gen(function* () {
      const violations = yield* checkSignatureHistoryScoping(
        historyWith(
          (q, r) =>
            q.subjectId === r.subjectId && (r.resourceId === q.resourceId || r.resourceId === undefined),
        ),
      );
      assert.deepStrictEqual(show(violations), [
        'Foreign alice:"doc-1" <= alice:null (conformance-8)',
        'Foreign alice:"Doc-1" <= alice:null (conformance-8)',
        'Foreign alice:"doc-1 " <= alice:null (conformance-8)',
        'Foreign alice:"\u00e9" <= alice:null (conformance-8)',
        'Foreign alice:"e\u0301" <= alice:null (conformance-8)',
        'Foreign alice:"null" <= alice:null (conformance-8)',
        'Foreign alice:"" <= alice:null (conformance-8)',
        'Foreign alice:"a\\",\\"b" <= alice:null (conformance-8)',
        'Foreign bob:"doc-1" <= bob:null (conformance-10)',
        'Foreign alice:"never-written" <= alice:null (conformance-8)',
      ]);
    }));
});
