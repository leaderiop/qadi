/**
 * The field table is closed: a missing row, a missing column, a `Drop...` kind
 * no row names or a port core adds without a cell does not compile (ARCH-61,
 * porting lost ARCH-48 `950977f`).
 */
import { expect, test } from "tstyche";
import type { PortName } from "@qadi/core";
import type { EditKind } from "../../src/model/SimulationEdit.ts";
import {
  FIELD_ORDER,
  FIXTURE_DATA,
  GRANT_KINDS,
  SIMULATION_FIELDS,
} from "../../src/model/SimulationFields.ts";
import type {
  FieldDescription,
  FieldElements,
  GrantedField,
  GrantKind,
  RowDropKinds,
  SimulationField,
} from "../../src/model/SimulationFields.ts";

test("every field is ordered", () => {
  expect<(typeof FIELD_ORDER)[number]>().type.toBe<SimulationField>();
});

test("every Drop kind belongs to exactly the rows that name it", () => {
  expect<RowDropKinds>().type.toBe<Extract<EditKind, `Drop${string}`>>();
});

test("every granted field has a grant kind, and the kinds are the strengthenings of a held field", () => {
  expect<keyof typeof GRANT_KINDS>().type.toBe<GrantedField>();
  expect<(typeof GRANT_KINDS)[GrantedField]>().type.toBe<GrantKind>();
  expect<GrantKind>().type.toBe<
    "GrantRole" | "GrantPermission" | "SetSubjectAttribute" | "AddRelationship" | "AddEvent" | "AddSignature"
  >();
});

test("the table has a row for every field", () => {
  expect(SIMULATION_FIELDS).type.toBeAssignableTo<{
    readonly [K in SimulationField]: FieldDescription<FieldElements[K]>;
  }>();
  expect<{ readonly roles: FieldDescription<string> }>().type.not.toBeAssignableTo<
    typeof SIMULATION_FIELDS
  >();
});

test("a row without a column is not a description", () => {
  expect<Omit<FieldDescription<string>, "same">>().type.not.toBeAssignableTo<FieldDescription<string>>();
  expect<Omit<FieldDescription<string>, "drop">>().type.not.toBeAssignableTo<FieldDescription<string>>();
});

test("the fixture table is keyed by the registry's ports", () => {
  expect<keyof typeof FIXTURE_DATA>().type.toBe<PortName>();
  expect<{ readonly AttributeResolver: unknown }>().type.not.toBeAssignableTo<typeof FIXTURE_DATA>();
});
