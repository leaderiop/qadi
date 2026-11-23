/**
 * Pins the shape of the keyed reconcile: a `ReadonlyMap` of wanted registrations, an
 * identity with no `id`, no index-aligned type, and a `Registered` holding only its
 * identity and handle.
 *
 * The gate id is the key a wanted registration is stored under, so the compiler is what
 * keeps two of them from sharing one and a key from disagreeing with an id. Each negative
 * is a `@ts-expect-error` checked twice, as in `ExternalStore.tst.ts`: under
 * `pnpm typecheck` an unused directive is TS2578, and under `pnpm test:tstyche` the text
 * after it is a fragment of the one suppressed error's message. Each refused value is
 * held in a `const` that `expect` reads, and each refusal differs from its accepted twin
 * in one thing: the third argument's type, or the one field the identity literal carries.
 */
import { expect, test } from "tstyche";
import type { Policy } from "@qadi/core";
import { reconcile } from "../src/GateWriter.ts";
import type {
  GateIdentity,
  GateWanted,
  GateWriter,
  Registered,
} from "../src/GateWriter.ts";

export type { GateWanted } from "../src/GateWriter.ts";

// The registry takes no index-aligned type any more, so naming the one it had is refused.
// @ts-expect-error has no exported member 'GateCurrent'
export type { GateCurrent } from "../src/GateWriter.ts";

declare const writer: GateWriter;
declare const live: ReadonlyMap<string, Registered>;
declare const wanted: ReadonlyMap<string, GateWanted>;
declare const wantedArray: ReadonlyArray<GateWanted>;
declare const policy: Policy;
declare const marker: { readonly current: HTMLSpanElement | null };

const atom = {};

test("reconcile takes the wanted registrations keyed by gate id", () => {
  const next = reconcile(writer, live, wanted);
  expect(next).type.toBe<Map<string, Registered>>();
});

test("an array of wanted registrations is refused", () => {
  const next = reconcile(
    writer,
    live,
    // @ts-expect-error parameter of type 'ReadonlyMap<string, GateWanted>'
    wantedArray,
  );
  expect(next).type.toBe<Map<string, Registered>>();
});

test("a GateIdentity literal without an id is accepted", () => {
  const identity: GateIdentity = {
    kind: "Can",
    atom,
    wraps: true,
    policy,
    resource: undefined,
    marker,
  };
  expect(identity).type.toBe<GateIdentity>();
});

test("a GateIdentity literal with an id is refused", () => {
  const identity: GateIdentity = {
    kind: "Can",
    atom,
    wraps: true,
    policy,
    resource: undefined,
    marker,
    // @ts-expect-error 'id' does not exist in type 'GateIdentity'
    id: "g",
  };
  expect(identity).type.toBe<GateIdentity>();
});

test("GateIdentity, GateWanted and Registered hold exactly their fields", () => {
  expect<keyof GateIdentity>().type.toBe<
    "kind" | "atom" | "wraps" | "policy" | "resource" | "marker"
  >();
  expect<keyof GateWanted>().type.toBe<"identity" | "state">();
  expect<keyof Registered>().type.toBe<"identity" | "handle">();
});
