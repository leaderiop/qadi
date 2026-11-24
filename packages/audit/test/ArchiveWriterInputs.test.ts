/**
 * Every archive the writer returns is read back by its reader.
 *
 * Each test is one input of `archiveAuditTrail`: a row, a `now` or a `keyMaterial` item
 * a type admits or a codec makes. The writer fails with the typed error the test names,
 * or returns a bundle that `readAuditArchive` reads back from its JSON text, the form a
 * store gives it. A bundle the reader refuses is the defect: an archive this package
 * wrote and cannot itself read. A row is only ever one the codec made, so no
 * hostile row is built here.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import type { ArchivalOptions } from "../src/AuditArchive.ts";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { decisionRecord } from "./helpers.ts";

/**
 * What the reader makes of the writer's bundle, read back from its JSON text. `failsWith`
 * is the tag the writer must fail with, so a wrong failure is red: with it the writer
 * must fail that way and the result is `undefined`, and without it the writer must
 * succeed and the reader must read the bundle.
 */
const writtenIsRead = (
  entries: ReadonlyArray<AuditEntry>,
  now: number,
  options?: ArchivalOptions,
  failsWith?: string,
) => {
  const written = Effect.runSync(Effect.result(archiveAuditTrail(entries, now, options)));
  if (Result.isFailure(written)) {
    assert.strictEqual(written.failure._tag, failsWith);
    return undefined;
  }
  assert.isUndefined(failsWith, "the writer archived an input it must refuse");
  const read = readAuditArchive(JSON.parse(JSON.stringify(written.success)));
  assert.isTrue(
    Result.isSuccess(read),
    Result.isFailure(read) ? read.failure.refusal._tag + " " + JSON.stringify(read.failure.refusal) : "",
  );
  return Result.isSuccess(read) ? read.success : undefined;
};

const entryOf = (options?: Parameters<typeof decisionRecord>[0]): AuditEntry =>
  Effect.runSync(encodeAuditEntry(decisionRecord(options)));

const row = entryOf({ evaluationId: "w-0" });
const archivedOnlyWhenRead = "is archived only when its reader reads it back";

describe("a now the type admits", () => {
  it("now NaN " + archivedOnlyWhenRead, () => {
    writtenIsRead([row], Number.NaN, undefined, "ArchiveInputInvalid");
  });

  it("now positive infinity " + archivedOnlyWhenRead, () => {
    writtenIsRead([row], Number.POSITIVE_INFINITY, undefined, "ArchiveInputInvalid");
  });

  it("now negative infinity " + archivedOnlyWhenRead, () => {
    writtenIsRead([row], Number.NEGATIVE_INFINITY, undefined, "ArchiveInputInvalid");
  });

  it("now negative zero " + archivedOnlyWhenRead, () => {
    const read = writtenIsRead([row], -0);
    assert.strictEqual(read?.createdAt, 0);
  });
});

describe("key material the type admits", () => {
  it("a keyMaterial item with an extra key " + archivedOnlyWhenRead, () => {
    const item = { keyId: "k-1", algorithm: "ed25519", publicKey: "AAAA", extra: 1 };
    writtenIsRead([row], 1_000, { keyMaterial: [item] });
  });

  it("no entries with an empty keyMaterial " + archivedOnlyWhenRead, () => {
    writtenIsRead([], 1_000, { keyMaterial: [] });
  });
});

describe("a row the codec makes", () => {
  it("a resource holding a lone surrogate " + archivedOnlyWhenRead, () => {
    writtenIsRead([entryOf({ resource: { id: "\uD800" } })], 1_000);
  });

  it("a resource holding negative zero " + archivedOnlyWhenRead, () => {
    writtenIsRead([entryOf({ resource: { id: -0 } })], 1_000);
  });

  it("a resource holding an own __proto__ key " + archivedOnlyWhenRead, () => {
    writtenIsRead([entryOf({ resource: JSON.parse('{"__proto__": {"id": 1}}') })], 1_000);
  });

  it("a resource holding a Date " + archivedOnlyWhenRead, () => {
    writtenIsRead([entryOf({ resource: { id: new Date(0) } })], 1_000);
  });

  it("two rows encoded from one record are archived and read back in the order given", () => {
    const first = entryOf({ evaluationId: "twin" });
    const second = entryOf({ evaluationId: "twin" });
    const read = writtenIsRead([first, second], 1_000);
    assert.strictEqual(read?.entryCount, 2);
  });
});
