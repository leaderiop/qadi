/**
 * Conformance checks a deployment runs against its own signature store.
 *
 * {@link checkSignatureLedger} proves a {@link SignatureLedgerShape} adapter
 * keeps its one obligation: `entriesAt(key)` answers the entries appended under
 * exactly `key`, compared byte for byte. The keyed interface makes the
 * optional-filter and null-wildcard read idioms unwritable, but a type cannot
 * rule out a store whose collation folds case, trims trailing spaces
 * (`PAD SPACE`) or normalises Unicode, so the check appends a fixed table of
 * adversarial pairs and reads every one back.
 * {@link checkSignatureHistoryScoping} proves the same exact-pair rule for any
 * raw `SignatureHistory`, which covers a deployment whose e-signature system is
 * its history and so has no ledger.
 *
 * What neither proves: durability, concurrency, or the signer's identity or
 * intent (BEH-QD-255, ADR-QD-016). Both are test aids. There is no default
 * instance, and nothing runs them automatically; they return violations as
 * data, independent of any test framework (ADR-QD-117).
 */
import * as Arr from "effect/Array";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import { makeResourceId, makeSubjectId, SignatureHistory } from "@qadi/core";
import type { Signature } from "@qadi/core";
import { ledgerKeyOf } from "./SignatureLedger.ts";
import type { LedgerPair, SignatureLedgerEntry, SignatureLedgerShape } from "./SignatureLedger.ts";

/**
 * One way a store broke the exact-pair rule.
 *
 * - `Foreign`: asking for `asked` answered a row written under `answered`.
 * - `Missing`: a row written under `asked` was not answered.
 *
 * `meaning` names the fixture row, which is distinct per row, so a misfiled
 * answer names its origin.
 */
export type LedgerConformanceViolation = Data.TaggedEnum<{
  Foreign: { readonly asked: LedgerPair; readonly answered: LedgerPair; readonly meaning: string };
  Missing: { readonly asked: LedgerPair; readonly meaning: string };
}>;

/** Constructors and guards for {@link LedgerConformanceViolation}. */
export const LedgerConformanceViolation = Data.taggedEnum<LedgerConformanceViolation>();

export interface LedgerConformanceOptions {
  /**
   * Prefixes the fixture subjects, so the check can run against a shared,
   * non-empty table. Defaults to `"qadi-conformance"`.
   */
  readonly namespace?: string;
}

interface FixtureRow {
  readonly pair: LedgerPair;
  readonly meaning: string;
}

/** The pairs a store must keep apart: case, spaces, Unicode forms, `null`, `""`, quotes, subjects. */
const fixture = (namespace: string): ReadonlyArray<FixtureRow> => {
  const alice = makeSubjectId(`${namespace}/alice`);
  const bob = makeSubjectId(`${namespace}/bob`);
  const doc1: LedgerPair = { subjectId: alice, resourceId: makeResourceId("doc-1") };
  const pairs: ReadonlyArray<LedgerPair> = [
    doc1,
    { subjectId: alice, resourceId: makeResourceId("Doc-1") },
    { subjectId: alice, resourceId: makeResourceId("doc-1 ") },
    { subjectId: alice, resourceId: makeResourceId("\u00e9") },
    { subjectId: alice, resourceId: makeResourceId("e\u0301") },
    { subjectId: alice, resourceId: makeResourceId("null") },
    { subjectId: alice, resourceId: makeResourceId("") },
    { subjectId: alice, resourceId: makeResourceId('a","b') },
    { subjectId: alice, resourceId: undefined },
    { subjectId: bob, resourceId: makeResourceId("doc-1") },
    { subjectId: bob, resourceId: undefined },
  ];
  const rows = pairs.map((pair, n) => ({ pair, meaning: `conformance-${n}` }));
  // Two rows under one key: a store that keeps only one per key loses an answer.
  return [...rows, { pair: doc1, meaning: "conformance-0-again" }];
};

const unseenOf = (namespace: string): LedgerPair => ({
  subjectId: makeSubjectId(`${namespace}/alice`),
  resourceId: makeResourceId("never-written"),
});

/** Every distinct fixture pair once, in fixture order, then a pair nothing wrote. */
const askedPairs = (table: ReadonlyArray<FixtureRow>, namespace: string): ReadonlyArray<LedgerPair> =>
  Arr.dedupeWith(
    [...table.map((row) => row.pair), unseenOf(namespace)],
    (a, b) => ledgerKeyOf(a) === ledgerKeyOf(b),
  );

const samePair = (a: LedgerPair, b: LedgerPair): boolean => ledgerKeyOf(a) === ledgerKeyOf(b);

/**
 * Compares what a store answered for `asked` against what the fixture wrote
 * under it. `answered` rows are `(origin pair, meaning)`; a meaning the fixture
 * does not know (a row from a shared table) is not ours to judge and is ignored.
 */
const violationsFor = (
  table: ReadonlyArray<FixtureRow>,
  asked: LedgerPair,
  answered: ReadonlyArray<string>,
): ReadonlyArray<LedgerConformanceViolation> => {
  const foreign = answered.flatMap((meaning) => {
    const origin = table.find((row) => row.meaning === meaning);
    return origin === undefined || samePair(origin.pair, asked)
      ? []
      : [LedgerConformanceViolation.Foreign({ asked, answered: origin.pair, meaning })];
  });
  const missing = table
    .filter((row) => samePair(row.pair, asked) && !answered.includes(row.meaning))
    .map((row) => LedgerConformanceViolation.Missing({ asked, meaning: row.meaning }));
  return [...foreign, ...missing];
};

const signatureOf = (row: FixtureRow): Signature => ({
  signerId: row.pair.subjectId,
  signedAt: 0,
  meaning: row.meaning,
});

/**
 * Appends the fixture to `ledger` and reads every pair back, returning each way
 * the store failed to keep a key apart (none means conformant), in fixture order.
 *
 * A store failure is an error of this effect, not a violation.
 */
export const checkSignatureLedger = Effect.fn("qadi.audit.checkSignatureLedger")(function* (
  ledger: SignatureLedgerShape,
  options?: LedgerConformanceOptions,
) {
  const namespace = options?.namespace ?? "qadi-conformance";
  const table = fixture(namespace);
  for (const row of table) {
    const entry: SignatureLedgerEntry = {
      ...row.pair,
      evaluationId: row.meaning,
      signature: signatureOf(row),
    };
    yield* ledger.append(ledgerKeyOf(entry), entry);
  }
  const violations: Array<LedgerConformanceViolation> = [];
  for (const asked of askedPairs(table, namespace)) {
    const entries = yield* ledger.entriesAt(ledgerKeyOf(asked));
    violations.push(
      ...violationsFor(
        table,
        asked,
        entries.map((entry) => entry.signature.meaning),
      ),
    );
  }
  return violations;
});

/**
 * Seeds a `SignatureHistory` through `seed` and queries every fixture pair,
 * returning each way it failed the exact-pair rule (INV-QD-120), in fixture
 * order.
 *
 * `seed` writes the rows however the deployment's store writes them and returns
 * the history layer to read, so this covers `signatureHistoryFromSignatures`,
 * `signatureHistoryFromLedger` and a capture-persists history alike.
 */
export const checkSignatureHistoryScoping = Effect.fn("qadi.audit.checkSignatureHistoryScoping")(
  function* <E, R>(
    seed: (
      rows: ReadonlyArray<{ readonly pair: LedgerPair; readonly signature: Signature }>,
    ) => Effect.Effect<Layer.Layer<SignatureHistory>, E, R>,
    options?: LedgerConformanceOptions,
  ) {
    const namespace = options?.namespace ?? "qadi-conformance";
    const table = fixture(namespace);
    const layer = yield* seed(table.map((row) => ({ pair: row.pair, signature: signatureOf(row) })));
    const history = yield* SignatureHistory.pipe(Effect.provide(layer));
    const violations: Array<LedgerConformanceViolation> = [];
    for (const asked of askedPairs(table, namespace)) {
      const signatures = yield* history.signaturesFor(asked);
      violations.push(
        ...violationsFor(
          table,
          asked,
          signatures.map((signature) => signature.meaning),
        ),
      );
    }
    return violations;
  },
);
