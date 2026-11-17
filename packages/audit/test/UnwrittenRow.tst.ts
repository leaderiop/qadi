/**
 * Pins that the unwritten row's reader takes exactly the three staging variants and names the lost label's word.
 *
 * A fourth variant must be refused at every call until the row has it
 * (ARCH-95, ADR-QD-161). This file has no deliberate compile error: each
 * `expect` states the refusal as a type relation.
 */
import { expect, test } from "tstyche";
import type { UnwrittenStaging } from "../src/AuditWriteOutcome.ts";
import type { LostLabel } from "../src/AuditWriteReport.ts";
import type { LostWord, UnwrittenRow, unwrittenRow } from "../src/UnwrittenRow.ts";

type Reader = Parameters<typeof unwrittenRow>[0];

test("every unwritten staging variant is accepted", () => {
  expect<UnwrittenStaging>().type.toBeAssignableTo<Reader>();
});

test("a fourth variant is refused", () => {
  expect<UnwrittenStaging | { readonly _tag: "Extra" }>().type.not.toBeAssignableTo<Reader>();
});

test("the row's word is the lost label's staging word", () => {
  expect<LostWord>().type.toBe<LostLabel["staging"]>();
});

test("a Lost row without a word is not a row", () => {
  expect<{ readonly durability: "Lost" }>().type.not.toBeAssignableTo<UnwrittenRow>();
});
