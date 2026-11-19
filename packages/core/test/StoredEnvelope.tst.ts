/**
 * Pins the envelope's shape as a type: a stored record is `{ environment, record }`
 * and has no `_tag` of its own.
 *
 * Written on the phase base, RED there by tstyche assertion and compiling under
 * `tsc`, so the root typecheck stays green at every commit (D-14). Each claim is a
 * conditional type asserted with `.type.toBe<…>()`, never a property access, because
 * a property the base lacks would be a compile error rather than a failing
 * assertion. Green once the envelope is the stored record (ADR-QD-171, STOR-01).
 */
import { expect, test } from "tstyche";
import type { SinkRecord, StoredRecord } from "../src/index.ts";

test("a stored record is the envelope (STOR-01, D-01)", () => {
  expect<
    StoredRecord extends { readonly environment: string; readonly record: SinkRecord } ? true : false
  >().type.toBe<true>();
  expect<"_tag" extends keyof StoredRecord ? true : false>().type.toBe<false>();
});
