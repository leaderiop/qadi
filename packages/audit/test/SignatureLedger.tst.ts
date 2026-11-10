/**
 * Type-level tests for the keyed signature ledger: an adapter is handed an
 * opaque key, never a query, so the optional-filter and null-wildcard read
 * idioms cannot be written against it (SEC-02).
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import type { SignatureHistory, SignatureQuery } from "@qadi/core";
import { ledgerKeyOf, signatureHistoryFromLedger } from "../src/SignatureLedger.ts";
import type {
  SignatureLedgerEntry,
  SignatureLedgerError,
  SignatureLedgerKey,
  SignatureLedgerReadError,
  SignatureLedgerShape,
} from "../src/SignatureLedger.ts";

declare const query: SignatureQuery;
declare const entry: SignatureLedgerEntry;
declare const ledger: SignatureLedgerShape;

test("the shape is exactly a name, an append and a keyed read", () => {
  expect<keyof SignatureLedgerShape>().type.toBe<"name" | "append" | "entriesAt">();
});

test("entriesAt takes the opaque key, not a query and not a plain string", () => {
  expect<Parameters<SignatureLedgerShape["entriesAt"]>[0]>().type.toBe<SignatureLedgerKey>();
  expect<string>().type.not.toBeAssignableTo<SignatureLedgerKey>();
  expect<SignatureQuery>().type.not.toBeAssignableTo<SignatureLedgerKey>();
});

test("ledgerKeyOf accepts a read query and a write entry alike", () => {
  expect(ledgerKeyOf).type.toBeCallableWith(query);
  expect(ledgerKeyOf).type.toBeCallableWith(entry);
  expect(ledgerKeyOf).type.toBe<(pair: {
    readonly subjectId: SignatureQuery["subjectId"];
    readonly resourceId: SignatureQuery["resourceId"];
  }) => SignatureLedgerKey>();
});

test("append and entriesAt return typed failures", () => {
  expect<ReturnType<SignatureLedgerShape["append"]>>().type.toBe<
    Effect.Effect<void, SignatureLedgerError>
  >();
  expect<ReturnType<SignatureLedgerShape["entriesAt"]>>().type.toBe<
    Effect.Effect<ReadonlyArray<SignatureLedgerEntry>, SignatureLedgerReadError>
  >();
});

test("signatureHistoryFromLedger is a plain SignatureHistory layer", () => {
  expect(signatureHistoryFromLedger(ledger)).type.toBe<
    Layer.Layer<SignatureHistory>
  >();
});
