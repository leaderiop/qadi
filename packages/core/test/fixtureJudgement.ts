/**
 * The fixtures the fixture-judgement tests share.
 *
 * `signatureAnswerFromSignatures` and `actedAnswerFromEvents` are each checked against
 * the read they must agree with, over one product of sites, rows and untyped values;
 * `SignatureHistory.test.ts` and `DecisionHistory.test.ts` read that product from here.
 * It is a module of its own, not part of `helpers.ts`, because `alice` is built as
 * this module loads, and the span contract imports `helpers.ts`, which runs nothing as
 * it loads.
 */
import { assert } from "@effect/vitest";
import { makeSubject } from "../src/AuthSubject.ts";
import type { ReadSite } from "../src/PortDescription.ts";

/**
 * The subject the fixture judgements are asked as.
 *
 * The fixture judgement tests (`signatureAnswerFromSignatures`,
 * `actedAnswerFromEvents`) read their sites, their decoy and their untyped values from
 * here, so the two files walk one product and build one kind of untyped value.
 */
export const alice = makeSubject({
  id: "alice",
  roles: [],
  permissions: [],
  attributes: {},
});

/**
 * The four sites a check can be asked at, a record so that each is named by what it is.
 *
 * A resource with an id, one without, one whose id is not a string, and no resource.
 */
export const SITES: {
  readonly withId: ReadSite;
  readonly withoutId: ReadSite;
  readonly withNonStringId: ReadSite;
  readonly withoutResource: ReadSite;
} = {
  withId: { subject: alice, resource: { id: "doc-1" } },
  withoutId: { subject: alice, resource: {} },
  withNonStringId: { subject: alice, resource: { id: 7 } },
  withoutResource: { subject: alice, resource: undefined },
};

/**
 * The line a case prints when a judgement and the read it must agree with differ, or
 * `undefined` when they agree.
 *
 * Compared as `JSON.stringify` shows them, so a field one has and the other lacks, or
 * holds as `undefined`, is a difference.
 */
export const disagreement = (where: string, judged: unknown, read: unknown) =>
  JSON.stringify(judged) === JSON.stringify(read)
    ? undefined
    : `${where} | judged ${JSON.stringify(judged)} | read ${JSON.stringify(read)}`;

/**
 * `json` parsed, with `field` set to `value`.
 *
 * `JSON.parse` returns `any`, which is what an untyped JavaScript caller hands
 * over (no `as`, AGENTS.md §6). A symbol is the one value it cannot carry, so it is
 * set on the parsed object afterwards.
 */
export const untypedWith = (json: string, field: string, value: unknown) => {
  const untyped = JSON.parse(json);
  untyped[field] = value;
  return untyped;
};

/** A fixture row whose subject id is a symbol, which no request key admits. */
export const unkeyableRow = (json: string) =>
  untypedWith(json, "subjectId", Symbol("alice"));

/** A site subject whose id is a symbol, which no request key admits. */
export const unkeyableSubject = () =>
  untypedWith(JSON.stringify(alice), "id", Symbol("alice"));

/**
 * The three ways a record can fail to be read: it is `null`, one property's getter
 * throws, a proxy's every trap throws.
 *
 * Each is built from `JSON.parse`, so it is an untyped value (no `as`), what a typed
 * signature refuses and an untyped caller hands over. Each is given the record's
 * JSON, the field that throws and what it throws; `nullRecord` ignores all three, and
 * `throwingProxy` reads nothing.
 */
export const HOSTILE_RECORDS = {
  nullRecord: (_json: string, _field: string, _message: string) => JSON.parse("null"),
  throwingGetter: (json: string, field: string, message: string) =>
    Object.defineProperty(JSON.parse(json), field, {
      get: () => {
        throw new Error(message);
      },
    }),
  throwingProxy: (_json: string, _field: string, message: string) =>
    new Proxy(JSON.parse("{}"), {
      get: () => {
        throw new Error(message);
      },
    }),
};

/**
 * The ways a list of rows can fail to be read: a proxy revoked after it was built, a
 * `length` that throws, an element whose getter throws, a value that is not iterable.
 *
 * Each is built from `JSON.parse`, so it is an untyped value (no `as`), what a typed
 * signature refuses and an untyped caller hands over. Each is given what it throws;
 * the revoked proxy and the plain object throw what the engine throws.
 */
export const HOSTILE_LISTS = {
  revokedProxy: (_message: string) => {
    const { proxy, revoke } = Proxy.revocable(JSON.parse("[]"), {});
    revoke();
    return proxy;
  },
  throwingLength: (message: string) =>
    new Proxy(JSON.parse("[]"), {
      get: (target, key) => {
        if (key === "length") throw new Error(message);
        return Reflect.get(target, key);
      },
    }),
  throwingElement: (message: string) =>
    Object.defineProperty(JSON.parse("[0]"), "0", {
      get: () => {
        throw new Error(message);
      },
    }),
  notIterable: (_message: string) => JSON.parse("{}"),
};

/**
 * An instance of a class whose `name` is `name`, which is not a string.
 *
 * No request key admits a class instance, and a refusal's sentence names its class:
 * a symbol or an object with a throwing `toString` is a `name` that cannot be
 * interpolated. Built from `Object.defineProperty`, as TypeScript refuses a static
 * `name` of another type.
 */
export const unnamedInstance = (name: unknown) =>
  new (Object.defineProperty(class {}, "name", { value: name }))();

/** A port failure's cause as its sentence, or a failed assertion when it is not text. */
export const causeText = (failure: { readonly cause: unknown }): string =>
  typeof failure.cause === "string"
    ? failure.cause
    : assert.fail(`the cause is not a sentence: ${String(failure.cause)}`);
