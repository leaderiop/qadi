/**
 * Pins the compile-time half of `ENFORCEMENT_ERROR_WIRE` (ARCH-04).
 *
 * The real table is declared `satisfies EnforcementErrorWireTable`, so a tag
 * added to `EnforcementError` (or to `HttpEnforcementFailure`) without an entry
 * fails to compile at that one site (TS1360). The `HypotheticalNewError`
 * assertions pin the *mechanism*: a table total over today's union is not
 * assignable to one total over a union that gained a member. This file holds
 * no deliberate compile error, because `tsconfig.test.json` also compiles every
 * `*.tst.ts` under `tsc`.
 */
import { expect, test } from "tstyche";
import type { EnforcementError } from "@qadi/core";
import {
  ENFORCEMENT_ERROR_WIRE,
  HTTP_ENFORCEMENT_ERROR_SCHEMAS,
  HTTP_ENFORCEMENT_TAGS,
  UndischargedObligationRefused,
  projectHttpEnforcementFailure,
} from "../src/QadiHttpError.ts";
import type {
  EnforcementErrorWire,
  EnforcementErrorWireTable,
  HttpEnforcementFailure,
  HttpEnforcementTag,
} from "../src/QadiHttpError.ts";

declare class HypotheticalNewError {
  readonly _tag: "HypotheticalNewError";
}

test("the wire table is keyed by exactly the twelve tags this package answers", () => {
  expect<keyof typeof ENFORCEMENT_ERROR_WIRE>().type.toBe<HttpEnforcementTag>();
  expect<HttpEnforcementTag>().type.toBe<EnforcementError["_tag"] | "SubjectExtractionFailed">();
});

test("a table total over today's failures is not total over a widened union", () => {
  expect<typeof ENFORCEMENT_ERROR_WIRE>().type.toBeAssignableTo<EnforcementErrorWireTable>();
  expect<typeof ENFORCEMENT_ERROR_WIRE>().type.not.toBeAssignableTo<
    EnforcementErrorWireTable<HttpEnforcementFailure | HypotheticalNewError>
  >();
});

test("a schema filed under the wrong tag is rejected", () => {
  expect<{
    readonly AccessDenied: EnforcementErrorWire<"AccessDenied", typeof UndischargedObligationRefused>;
  }>().type.not.toBeAssignableTo<Pick<EnforcementErrorWireTable, "AccessDenied">>();
});

test("the tag tuple holds exactly the twelve tags", () => {
  expect<(typeof HTTP_ENFORCEMENT_TAGS)[number]>().type.toBe<HttpEnforcementTag>();
});

test("the projection returns exactly what the declared schemas describe", () => {
  expect<ReturnType<typeof projectHttpEnforcementFailure>>().type.toBe<
    (typeof HTTP_ENFORCEMENT_ERROR_SCHEMAS)[number]["Type"]
  >();
});
