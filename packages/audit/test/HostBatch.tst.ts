/**
 * Type-level tests for the admission step of `HostBatch.ts`: both public refusal unions are their shared fragments plus
 * their own members, and admitted rows are nominal.
 *
 * A member, a tag or a field type that moves fails here, and neither a list nor a look-alike object can pass as admitted
 * rows. `readonly` on a case field is inert under `Data.TaggedEnum`, so the pins claim members, tags and field types
 * only. Every pin is a positive `toBe` or a `not.toBeAssignableTo`, never a callable pin, so none of them depends on how
 * tstyche reads a call that returns an `Effect`.
 */
import type * as Data from "effect/Data";
import type * as Result from "effect/Result";
import { expect, test } from "tstyche";
import { verifiedArchiveFacts } from "../src/ArchiveFacts.ts";
import type { ArchiveInputRefusal } from "../src/ArchiveFacts.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import type { RowsRefusalCases } from "../src/CodecMade.ts";
import type { AdmittedRows, NowRefusalCases, admitRows } from "../src/HostBatch.ts";
import type { RetentionInputRefusal } from "../src/Retention.ts";

/** A class with the shape of `AdmittedRows` and a brand of its own: the same fields, a different declaration. */
declare class OtherAdmittedRows {
  declare private readonly nominal: never;
  readonly entries: ReadonlyArray<AuditEntry>;
}

test("each public refusal union is its members spelled out", () => {
  expect<ArchiveInputRefusal>().type.toBe<
    Data.TaggedEnum<{
      EntriesNotAList: { readonly value: unknown };
      EntryNotMadeByCodec: { readonly index: number };
      NowNotFinite: { readonly value: unknown };
      KeyMaterialNotAList: { readonly value: unknown };
      KeyMaterialItemRefused: { readonly index: number };
    }>
  >();
  expect<RetentionInputRefusal>().type.toBe<
    Data.TaggedEnum<{
      EntriesNotAList: { readonly value: unknown };
      EntryNotMadeByCodec: { readonly index: number };
      NowNotFinite: { readonly value: unknown };
      MaxAgeInvalid: { readonly value: unknown };
    }>
  >();
});

test("each public refusal union is its two fragments plus its own members", () => {
  expect<ArchiveInputRefusal>().type.toBe<
    Data.TaggedEnum<
      RowsRefusalCases &
        NowRefusalCases & {
          KeyMaterialNotAList: { readonly value: unknown };
          KeyMaterialItemRefused: { readonly index: number };
        }
    >
  >();
  expect<RetentionInputRefusal>().type.toBe<
    Data.TaggedEnum<
      RowsRefusalCases &
        NowRefusalCases & {
          MaxAgeInvalid: { readonly value: unknown };
        }
    >
  >();
});

test("the shared members are one type in both unions", () => {
  expect<Extract<ArchiveInputRefusal, { readonly _tag: "NowNotFinite" }>>().type.toBe<
    Extract<RetentionInputRefusal, { readonly _tag: "NowNotFinite" }>
  >();
  expect<Extract<ArchiveInputRefusal, { readonly _tag: "NowNotFinite" }>>().type.toBe<
    Data.TaggedEnum<NowRefusalCases>
  >();
  expect<Extract<ArchiveInputRefusal, { readonly _tag: "EntriesNotAList" | "EntryNotMadeByCodec" }>>().type.toBe<
    Extract<RetentionInputRefusal, { readonly _tag: "EntriesNotAList" | "EntryNotMadeByCodec" }>
  >();
  expect<Extract<ArchiveInputRefusal, { readonly _tag: "EntriesNotAList" | "EntryNotMadeByCodec" }>>().type.toBe<
    Data.TaggedEnum<RowsRefusalCases>
  >();
});

test("admitted rows are nominal", () => {
  expect<ReadonlyArray<AuditEntry>>().type.not.toBeAssignableTo<AdmittedRows>();
  expect<{ readonly entries: ReadonlyArray<AuditEntry> }>().type.not.toBeAssignableTo<AdmittedRows>();
  expect<OtherAdmittedRows>().type.not.toBeAssignableTo<AdmittedRows>();
  expect<ReturnType<typeof admitRows>>().type.toBe<
    Result.Result<AdmittedRows, Data.TaggedEnum<RowsRefusalCases>>
  >();
});

test("verifiedArchiveFacts takes only admitted rows", () => {
  expect<Parameters<typeof verifiedArchiveFacts>[0]>().type.toBe<AdmittedRows>();
});
