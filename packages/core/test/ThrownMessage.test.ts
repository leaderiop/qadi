/**
 * The one table of `thrownMessage`'s rules, and the one of `causeMessage`'s.
 *
 * The sites (core's encode, key and custom predicate refusals, and the packages
 * above core) pin only that they read through these two functions, so a rule
 * change fails one table and a mapping change fails the site that owns it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import { causeMessage, thrownMessage } from "../src/ThrownMessage.ts";
import { hostile, hostileError } from "./helpers.ts";

const PLACEHOLDER = "a value that could not be described";

/** An `Error` whose `message` getter throws, but that still has a string form. */
const describedError = Object.defineProperty(new Error("unread"), "message", {
  get(): string {
    throw new Error("message threw");
  },
});
describedError.toString = (): string => "described";

/** A plain object whose `message` getter throws, but that still has a string form. */
const describedObject = {
  toString: (): string => "described",
  get message(): string {
    throw new Error("message threw");
  },
};

class ComputedError extends Error {
  override get message(): string {
    return "computed";
  }
}

const throwingProxy = new Proxy(
  {},
  {
    get: (): never => {
      throw new Error("get trap threw");
    },
    getPrototypeOf: (): never => {
      throw new Error("getPrototypeOf trap threw");
    },
  },
);

const revoked = Proxy.revocable({}, {});
revoked.revoke();

// No stack, so `Cause.pretty` renders the name and message alone, whatever the file path.
const stackless = Object.assign(new Error("boom"), { stack: undefined });

const rows: ReadonlyArray<readonly [title: string, value: unknown, text: string]> = [
  ["an Error is its message, without its name", new Error("boom"), "boom"],
  ["a TypeError is its message, without its name", new TypeError("bad"), "bad"],
  ["an Error with an empty message is the empty string", new Error(), ""],
  ["an Error whose message getter returns a string is that string", new ComputedError(), "computed"],
  [
    "an Error whose message is not a string is its string form",
    Object.defineProperty(new Error("x"), "message", { value: 42 }),
    "Error: 42",
  ],
  ["an Error whose message getter throws is the placeholder", hostileError, PLACEHOLDER],
  ["an Error whose message getter throws but whose toString works is that toString", describedError, "described"],
  ["a string comes back unchanged", "plain string", "plain string"],
  ["an empty string comes back unchanged", "", ""],
  ["a number is its string form", 42, "42"],
  ["undefined is the word undefined", undefined, "undefined"],
  ["null is the word null", null, "null"],
  ["a symbol is its String form", Symbol("s"), "Symbol(s)"],
  ["a bigint is its digits", 10n, "10"],
  ["a plain object with a message field is not an Error, so it is its string form", { message: "x" }, "[object Object]"],
  ["an object with its own toString is what that returns", { toString: () => "described" }, "described"],
  [
    "an object whose toString throws is the placeholder",
    {
      toString(): never {
        throw new Error("toString threw");
      },
    },
    PLACEHOLDER,
  ],
  ["a value whose toString and message getter both throw is the placeholder", hostile, PLACEHOLDER],
  ["an object with no prototype is the placeholder", Object.create(null), PLACEHOLDER],
  [
    "an object whose toString and valueOf return objects is the placeholder",
    { toString: () => ({}), valueOf: () => ({}) },
    PLACEHOLDER,
  ],
  ["a proxy whose traps throw is the placeholder", throwingProxy, PLACEHOLDER],
  ["a revoked proxy is the placeholder", revoked.proxy, PLACEHOLDER],
];

describe("thrownMessage", () => {
  for (const [title, value, text] of rows) {
    it(title, () => {
      assert.strictEqual(thrownMessage(value), text);
    });
  }
});

const causeRows: ReadonlyArray<readonly [title: string, cause: Cause.Cause<unknown>, text: string]> = [
  ["a defect that renders is its Cause.pretty text", Cause.die(stackless), "Error: boom"],
  ["a failure that renders is its Cause.pretty text", Cause.fail("plain"), "Error: plain"],
  ["a defect with a value whose toString and message getter both throw is the placeholder", Cause.die(hostile), PLACEHOLDER],
  ["a defect with an Error whose message getter throws is the placeholder", Cause.die(hostileError), PLACEHOLDER],
  [
    "a failure with a value whose toString and message getter both throw is the placeholder",
    Cause.fail(hostile),
    PLACEHOLDER,
  ],
  [
    "a defect whose value has a throwing message getter but a working toString is that toString",
    Cause.die(describedObject),
    "described",
  ],
  ["a defect whose value is a proxy whose traps throw is the placeholder", Cause.die(throwingProxy), PLACEHOLDER],
];

describe("causeMessage", () => {
  for (const [title, cause, text] of causeRows) {
    it(title, () => {
      assert.strictEqual(causeMessage(cause), text);
    });
  }
});
