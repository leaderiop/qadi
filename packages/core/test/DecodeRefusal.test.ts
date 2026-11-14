/**
 * The decode side's readers of `DecodeRefusal`, pinned by hand.
 *
 * The sentence is what a person reads, so it must say why the record was refused
 * and what to fix. The version is sender data of any type, so its description must
 * be total and bounded. The annotations are span data and say which refusal, never
 * what was sent (INV-QD-104, ADR-QD-153). Every expected string is a literal, never
 * read from the function under test, because a pin that imports its own expectation
 * cannot disagree with it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as FastCheck from "fast-check";
import {
  DecodeRefusal,
  decodeRefusalAnnotations,
  decodeRefusalOf,
  describeDecodeRefusal,
  WIRE_VERSIONS,
} from "../src/SinkWire.ts";
import { MAX_DECODE_DEPTH, untrustedDecoder } from "../src/UntrustedDecode.ts";

const unsupported = (version: unknown) => DecodeRefusal.UnsupportedVersion({ version, supported: WIRE_VERSIONS });

const versionSentence = (shown: string): string =>
  `a record of wire version ${shown}, which this reader does not read (it reads 2): upgrade the reader if the version is newer, or the sender if it has none`;

const MALFORMED = "not a record this reader can read, so the sender and this reader disagree about the wire form: ";

const malformed = (message: string): string => describeDecodeRefusal(DecodeRefusal.Malformed({ message }));

describe("describeDecodeRefusal gives one sentence per refusal", () => {
  it("NotJson says the text did not parse", () => {
    assert.strictEqual(
      describeDecodeRefusal(DecodeRefusal.NotJson()),
      "not JSON: the text did not parse, so it was truncated or replaced before this reader parsed it",
    );
  });

  it("TooDeep names the depth", () => {
    assert.strictEqual(
      describeDecodeRefusal(DecodeRefusal.TooDeep({ maxDepth: 64 })),
      "nested deeper than 64 levels: a current writer refuses to emit that, so the record came from an older or foreign writer or was altered",
    );
  });

  it("Malformed carries the message", () => {
    assert.strictEqual(
      describeDecodeRefusal(DecodeRefusal.Malformed({ message: "Missing key" })),
      "not a record this reader can read, so the sender and this reader disagree about the wire form: Missing key",
    );
  });

  it("Inconsistent names the disagreement", () => {
    assert.strictEqual(
      describeDecodeRefusal(DecodeRefusal.Inconsistent({ disagreement: "Verdict" })),
      "a record that contradicts itself (Verdict): built by hand or tampered with, not version skew",
    );
  });

  it("UnsupportedVersion names the version and what the reader reads", () => {
    assert.strictEqual(
      describeDecodeRefusal(unsupported(3)),
      "a record of wire version 3, which this reader does not read (it reads 2): upgrade the reader if the version is newer, or the sender if it has none",
    );
  });

  it("UnsupportedVersion joins a longer read set with a comma and a space", () => {
    assert.strictEqual(
      describeDecodeRefusal(DecodeRefusal.UnsupportedVersion({ version: 3, supported: [2, 2] })),
      "a record of wire version 3, which this reader does not read (it reads 2, 2): upgrade the reader if the version is newer, or the sender if it has none",
    );
  });
});

describe("describeDecodeRefusal shows any version without calling it", () => {
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();

  const rows: ReadonlyArray<readonly [string, unknown, string]> = [
    ["a number", 3, "3"],
    ["a numeric string, quoted", "3", '"3"'],
    ["undefined", undefined, "none"],
    ["null", null, "null"],
    ["true", true, "true"],
    ["false", false, "false"],
    ["NaN", Number.NaN, "NaN"],
    ["Infinity", Number.POSITIVE_INFINITY, "Infinity"],
    ["a bigint", 10n, "a bigint"],
    ["a symbol", Symbol("x"), "a symbol"],
    ["a function", () => 0, "a function"],
    ["an array", [3], "an object"],
    ["an empty object", {}, "an object"],
    ["an object with no prototype", Object.create(null), "an object"],
    [
      "an object whose toString throws",
      {
        toString: () => {
          throw new Error("toString called");
        },
      },
      "an object",
    ],
    [
      "an object whose Symbol.toPrimitive throws",
      {
        [Symbol.toPrimitive]: () => {
          throw new Error("toPrimitive called");
        },
      },
      "an object",
    ],
    ["a cyclic object", cyclic, "an object"],
    ["a revoked Proxy", revoked.proxy, "an object"],
    ["a million-character string", "v".repeat(1_000_000), `"${"v".repeat(40)}"…`],
  ];

  for (const [title, version, shown] of rows) {
    it(`${title} reads ${shown.length > 60 ? "as its first forty characters" : shown}`, () => {
      assert.strictEqual(describeDecodeRefusal(unsupported(version)), versionSentence(shown));
    });
  }

  it("any value at all gives a sentence under 400 characters", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.anything(), (version) => {
        const sentence = describeDecodeRefusal(unsupported(version));
        assert.isString(sentence);
        assert.isBelow(sentence.length, 400);
      }),
    );
  });
});

describe("describeDecodeRefusal bounds what it shows", () => {
  const forty = "0123456789".repeat(4);

  it("a version string of exactly 40 characters shows whole and quoted", () => {
    assert.strictEqual(describeDecodeRefusal(unsupported(forty)), versionSentence(`"${forty}"`));
  });

  it("a version string of 41 characters shows its first 40, quoted, then an ellipsis", () => {
    assert.strictEqual(describeDecodeRefusal(unsupported(`${forty}X`)), versionSentence(`"${forty}"…`));
  });

  it("an empty version string shows as two quotes", () => {
    assert.strictEqual(describeDecodeRefusal(unsupported("")), versionSentence('""'));
  });

  it("a version cut between the halves of a surrogate pair shows the lone half JSON-escaped", () => {
    assert.strictEqual(
      describeDecodeRefusal(unsupported(`${"a".repeat(39)}\u{1F600}`)),
      versionSentence(`"${"a".repeat(39)}\\ud83d"…`),
    );
  });

  const twoHundred = "0123456789".repeat(20);

  it("a message of exactly 200 characters shows whole", () => {
    assert.strictEqual(malformed(twoHundred), `${MALFORMED}${twoHundred}`);
  });

  it("a message of 201 characters shows its first 200 then an ellipsis", () => {
    assert.strictEqual(malformed(`${twoHundred}X`), `${MALFORMED}${twoHundred}…`);
  });

  it("an empty message ends the sentence at its colon and space", () => {
    assert.strictEqual(malformed(""), MALFORMED);
  });

  it("a message cut between the halves of a surrogate pair keeps the lone half", () => {
    assert.strictEqual(malformed(`${"a".repeat(199)}\u{1F600}`), `${MALFORMED}${"a".repeat(199)}\ud83d…`);
  });
});

describe("decodeRefusalAnnotations says which refusal, never what was sent", () => {
  const refusals: ReadonlyArray<DecodeRefusal> = [
    DecodeRefusal.NotJson(),
    DecodeRefusal.TooDeep({ maxDepth: 64 }),
    DecodeRefusal.Malformed({ message: "Missing key" }),
    DecodeRefusal.Inconsistent({ disagreement: "Verdict" }),
    unsupported(3),
  ];

  it("each refusal gives its tag under the one key", () => {
    for (const refusal of refusals) {
      const annotations = decodeRefusalAnnotations(refusal);
      assert.deepStrictEqual(annotations, { "qadi.refusal": refusal._tag });
      assert.deepStrictEqual(Object.keys(annotations), ["qadi.refusal"]);
      assert.isTrue(annotations["qadi.refusal"] === refusal._tag);
    }
  });

  it("no annotation carries a value from the message or the version", () => {
    const sentinel = FastCheck.stringMatching(/^[a-z0-9]{12,24}$/).map((s) => `sentinel-${s}`);
    FastCheck.assert(
      FastCheck.property(sentinel, (secret) => {
        const carrying = [
          DecodeRefusal.Malformed({ message: secret }),
          unsupported(secret),
          unsupported({ secret }),
        ];
        for (const refusal of carrying) {
          assert.notInclude(JSON.stringify(decodeRefusalAnnotations(refusal)), secret);
        }
        assert.include(describeDecodeRefusal(DecodeRefusal.Malformed({ message: secret })), secret);
        assert.include(describeDecodeRefusal(unsupported(secret)), secret);
      }),
    );
  });
});

describe("decodeRefusalOf is the one mapping", () => {
  const decoder = untrustedDecoder(Schema.String, {});

  const refusalFrom = <A, E>(result: Result.Result<A, E>): E => {
    if (Result.isSuccess(result)) return assert.fail("expected a refusal");
    return result.failure;
  };

  it("an unparseable text maps to NotJson, dropping the parser's message", () => {
    assert.deepStrictEqual(decodeRefusalOf(refusalFrom(decoder.decodeText("}{"))), DecodeRefusal.NotJson());
  });

  it("a value nested past the bound maps to TooDeep with the bound", () => {
    let nested: unknown = [];
    for (let i = 0; i < MAX_DECODE_DEPTH + 1; i++) nested = [nested];
    assert.deepStrictEqual(
      decodeRefusalOf(refusalFrom(decoder.decode(nested))),
      DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it("a value the schema refuses maps to Malformed with the refusal's message", () => {
    const refusal = refusalFrom(decoder.decode(1));
    if (refusal._tag !== "Malformed") return assert.fail("expected Malformed");
    assert.deepStrictEqual(decodeRefusalOf(refusal), DecodeRefusal.Malformed({ message: refusal.message }));
  });

  it("a version refusal passes through as the same object", () => {
    const refusal = unsupported(3);
    assert.strictEqual(decodeRefusalOf(refusal), refusal);
  });
});
