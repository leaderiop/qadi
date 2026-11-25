/**
 * Pins that an audit row is made only by its codec (ADR-QD-190, INV-QD-400).
 *
 * `AuditEntry` is a module-local class exported as a type, with a private `nominal`
 * member, so a literal, a spread of a real row and a call to its constructor are not
 * rows. Every negative is a `@ts-expect-error` on a line holding exactly one erroring
 * expression, and it is checked twice. Under `pnpm typecheck` the directive consumes any
 * error on its line and an unused one is itself an error (TS2578). Under
 * `pnpm test:tstyche` (`checkSuppressedErrors`, on by default) the text after the
 * directive is a fragment the one suppressed error's message must contain, and a second
 * error on the line fails. Every negative has a positive twin that makes the same
 * subject valid, so each is seen to fail for the reason it names.
 */
import type * as Effect from "effect/Effect";
import type * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { SinkRecordJson } from "@qadi/core";
import { expect, test } from "tstyche";
import type { archiveAuditTrail, VerifiedArchive } from "../src/AuditArchive.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import * as Row from "../src/AuditEntry.ts";
import { planPurge, planRetention } from "../src/Retention.ts";
import type { RetentionPolicy } from "../src/Retention.ts";

type Encoded = Effect.Success<ReturnType<typeof Row.encodeAuditEntry>>;
type Decoded = Result.Result.Success<ReturnType<typeof Row.decodeAuditEntry>>["entry"];
type Entries = Parameters<typeof archiveAuditTrail>[0];

declare const record: SinkRecordJson;
declare const encoded: Encoded;
declare const decoded: Decoded;
declare const policy: RetentionPolicy;
declare const archive: VerifiedArchive;

declare function takesRow(row: AuditEntry): void;
declare function takesEntries(entries: Entries): void;

test("a literal is not a row", () => {
  // @ts-expect-error nominal
  takesRow({ record, sequenceNumber: 1 });
  expect(takesRow).type.toBeCallableWith(encoded);
});

test("a spread of an encode-made row with a changed field is not a row", () => {
  // @ts-expect-error nominal
  takesRow({ ...encoded, sequenceNumber: 2 });
  expect(takesRow).type.toBeCallableWith(encoded);
});

test("a spread of a decode-made row with a changed field is not a row", () => {
  // @ts-expect-error nominal
  takesRow({ ...decoded, sequenceNumber: 2 });
  expect(takesRow).type.toBeCallableWith(decoded);
});

test("the writer refuses a plain row", () => {
  // @ts-expect-error nominal
  takesEntries([{ record, sequenceNumber: 1 }]);
  expect<ReadonlyArray<Encoded>>().type.toBeAssignableTo<Entries>();
  expect<ReadonlyArray<Decoded>>().type.toBeAssignableTo<Entries>();
});

test("the row is not a constructor", () => {
  // @ts-expect-error does not exist on type
  takesRow(new Row.AuditEntry({ record, sequenceNumber: undefined }));
  expect<Encoded>().type.toBe<AuditEntry>();
  expect<Decoded>().type.toBe<AuditEntry>();
});

test("the row is not a schema", () => {
  // @ts-expect-error does not exist on type
  Schema.decodeUnknownEffect(Row.AuditEntry);
  expect(Row.decodeAuditEntry).type.toBeCallableWith(null);
});

test("retention and purge accept the rows the codec makes", () => {
  expect(planRetention).type.toBeCallableWith([encoded, decoded], policy, 0);
  expect(planPurge).type.toBeCallableWith([encoded, decoded], policy, 0, archive);
});
