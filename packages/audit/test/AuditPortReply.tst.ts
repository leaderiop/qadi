/**
 * Type-level tests for `AuditPortReply`: the union is closed at six modes, and
 * a script's request types come from the port it answers (ARCH-62, D-05).
 */
import { expect, test } from "tstyche";
import type { AuditEntry } from "../src/AuditEntry.ts";
import type { AuditCommitScript, AuditStageScript, AuditTrailScript } from "../src/AuditPortReply.ts";
import { AuditPortReply } from "../src/AuditPortReply.ts";
import type { AuditStagingHandle } from "../src/AuditStagingPort.ts";

test("the reply union is exactly the six modes", () => {
  expect<AuditPortReply["_tag"]>().type.toBe<"Ok" | "Fail" | "Die" | "Interrupt" | "Never" | "Latch">();
});

test("a script's parameters come from the port", () => {
  expect<Parameters<AuditTrailScript>>().type.toBe<[entry: AuditEntry, call: number]>();
  expect<Parameters<AuditStageScript>>().type.toBe<[entry: AuditEntry, call: number]>();
  expect<Parameters<AuditCommitScript>>().type.toBe<
    [handle: AuditStagingHandle, entry: AuditEntry, call: number]
  >();
});

test("a script answers a reply or undefined, nothing else", () => {
  expect<() => AuditPortReply | undefined>().type.toBeAssignableTo<AuditTrailScript>();
  expect<() => string>().type.not.toBeAssignableTo<AuditTrailScript>();
  expect<() => { readonly _tag: "Retry" }>().type.not.toBeAssignableTo<AuditCommitScript>();
});

test("Fail needs a cause and Latch needs a latch", () => {
  expect(AuditPortReply.Fail).type.not.toBeCallableWith({});
  expect(AuditPortReply.Latch).type.not.toBeCallableWith({});
  expect(AuditPortReply.Fail).type.toBeCallableWith({ cause: "down" });
});
