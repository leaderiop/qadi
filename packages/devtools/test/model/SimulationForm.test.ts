/**
 * The form's codec and its round-trip law.
 *
 * The law is the point, not the examples: for every value the form can show,
 * decoding the text it shows gives that value back, and an encoder never emits
 * text its own decoder refuses. The hand-written translation this replaced lost
 * data in four places, each of which is pinned below as an example as well.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import type { SignatureInput } from "@qadi/core";
import { sameEdge } from "../../src/model/Edits.ts";
import {
  actionOf,
  addChip,
  attributeCodec,
  attributeLabel,
  decodeResource,
  edgeCodec,
  encodeResource,
  eventCodec,
  permissionCodec,
  removeAt,
  renameSubject,
  roleCodec,
  sameSignature,
  signatureCodec,
  withAction,
  withPair,
  withResource,
  withoutPair,
} from "../../src/model/SimulationForm.ts";
import type { Decoded } from "../../src/model/SimulationForm.ts";

const RUNS = { numRuns: 500 };

const okValue = <A>(decoded: Decoded<A>): A => {
  if (decoded._tag === "Refused") throw new Error(`refused: ${decoded.reason}`);
  return decoded.value;
};

/** Strings that exercise the codec's boundaries as well as plain ones. */
const text = FastCheck.oneof(
  FastCheck.string(),
  FastCheck.string({ unit: "binary" }),
  FastCheck.constantFrom(
    "",
    " ",
    " padded ",
    "a:b",
    ":",
    "a:",
    ":a",
    '"q"',
    '"',
    "{",
    '{"a":1}',
    "7",
    "true",
    "null",
    "[1]",
    "dept:legal",
    "line\nbreak",
    "\ud800",
  ),
);

const hasProtoKey = (value: unknown): boolean =>
  typeof value === "object" && value !== null
    ? Object.keys(value).some((key) => key === "__proto__") ||
      Object.values(value).some(hasProtoKey)
    : false;

const hasNegativeZero = (value: unknown): boolean =>
  Object.is(value, -0) ||
  (typeof value === "object" && value !== null && Object.values(value).some(hasNegativeZero));

/** What JSON carries and the form can show: no `-0`, no `__proto__` key. */
const formValue = FastCheck.oneof(FastCheck.jsonValue(), text).filter(
  (value) => !hasNegativeZero(value) && !hasProtoKey(value),
);

const name = text;

describe("attribute pairs", () => {
  it("round-trips every value the form can show — the law", () => {
    FastCheck.assert(
      FastCheck.property(name, formValue, (key, value) => {
        const shown = okValue(attributeCodec.encode([key, value], ""));
        assert.deepStrictEqual(okValue(attributeCodec.decode(shown, "")), [key, value]);
      }),
      RUNS,
    );
  });

  it("shows a string that looks like a number as a string, and a number as a number", () => {
    assert.strictEqual(okValue(attributeLabel(["level", "7"])), 'level="7"');
    assert.strictEqual(okValue(attributeLabel(["level", 7])), "level=7");
    assert.strictEqual(okValue(attributeLabel(["dept", "legal"])), "dept=legal");
    assert.strictEqual(okValue(attributeCodec.encode(["level", "7"], "")), 'level:"7"');
  });

  it("types a number as a number and a word as a string — the pinned examples", () => {
    assert.deepStrictEqual(okValue(attributeCodec.decode("clearance:7", "")), ["clearance", 7]);
    assert.deepStrictEqual(okValue(attributeCodec.decode("dept:legal", "")), ["dept", "legal"]);
    assert.deepStrictEqual(okValue(attributeCodec.decode("level:\"7\"", "")), ["level", "7"]);
  });

  it("accepts a key containing a colon by quoting it", () => {
    const shown = okValue(attributeCodec.encode(["org:tier", 3], ""));
    assert.strictEqual(shown, '"org:tier":3');
    assert.deepStrictEqual(okValue(attributeCodec.decode(shown, "")), ["org:tier", 3]);
  });

  it("refuses text with no value, an unterminated quote and a non-string quoted name", () => {
    assert.strictEqual(attributeCodec.decode("name", "")._tag, "Refused");
    assert.strictEqual(attributeCodec.decode("name:", "")._tag, "Refused");
    assert.strictEqual(attributeCodec.decode(':x', "")._tag, "Refused");
    assert.strictEqual(attributeCodec.decode('"abc:1', "")._tag, "Refused");
    assert.strictEqual(attributeCodec.decode('"abc"', "")._tag, "Refused");
    assert.strictEqual(attributeCodec.decode('"abc":', "")._tag, "Refused");
    assert.strictEqual(attributeCodec.decode('"a\\q":1', "")._tag, "Refused");
  });

  it("refuses a value the form cannot show faithfully", () => {
    const refusals: ReadonlyArray<unknown> = [
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -0,
      new Map([["a", 1]]),
      new Date(0),
      () => 1,
      1n,
      { nested: Number.NaN },
      [undefined],
      { toJSON: () => 1 },
    ];
    for (const value of refusals) {
      assert.strictEqual(attributeCodec.encode(["k", value], "")._tag, "Refused");
      assert.strictEqual(attributeLabel(["k", value])._tag, "Refused");
    }
  });

  it("sets and removes a pair, and a name like __proto__ is a key, not a prototype", () => {
    const set = withPair({ a: 1 }, ["__proto__", 2]);
    assert.isTrue(Object.hasOwn(set, "__proto__"));
    assert.deepStrictEqual(Object.keys(set), ["a", "__proto__"]);
    assert.deepStrictEqual(withPair({ a: 1, b: 2 }, ["a", 3]), { b: 2, a: 3 });
    assert.deepStrictEqual(withoutPair({ a: 1, b: 2 }, "a"), { b: 2 });
  });
});

describe("edges and events", () => {
  it("round-trips every edge, whoever it names — the law", () => {
    FastCheck.assert(
      FastCheck.property(text, text, text, text, (subjectId, relation, resourceId, current) => {
        const edge = { subjectId, relation, resourceId };
        const shown = okValue(edgeCodec.encode(edge, current));
        assert.deepStrictEqual(okValue(edgeCodec.decode(shown, current)), edge);
      }),
      RUNS,
    );
  });

  it("round-trips every event, whoever it names — the law", () => {
    FastCheck.assert(
      FastCheck.property(text, text, text, text, (subjectId, event, resourceId, current) => {
        const one = { subjectId, event, resourceId };
        const shown = okValue(eventCodec.encode(one, current));
        assert.deepStrictEqual(okValue(eventCodec.decode(shown, current)), one);
      }),
      RUNS,
    );
  });

  it("uses the short form for the subject's own element", () => {
    assert.strictEqual(
      okValue(edgeCodec.encode({ subjectId: "alice", relation: "owner", resourceId: "doc-1" }, "alice")),
      "owner:doc-1",
    );
    assert.strictEqual(
      okValue(eventCodec.encode({ subjectId: "alice", event: "read", resourceId: "doc-1" }, "alice")),
      "read:doc-1",
    );
    assert.deepStrictEqual(okValue(edgeCodec.decode("owner:doc-1", "bob")), {
      subjectId: "bob",
      relation: "owner",
      resourceId: "doc-1",
    });
  });

  it("shows another subject's element in full, so it is never rewritten — T4 (a)", () => {
    const shown = okValue(
      edgeCodec.encode({ subjectId: "bob", relation: "owner", resourceId: "doc-1" }, "alice"),
    );
    assert.strictEqual(shown, '{"subjectId":"bob","relation":"owner","resourceId":"doc-1"}');
  });

  it("keeps a relation containing a colon whole — T4 (b)", () => {
    const edge = { subjectId: "someone", relation: "org:admin", resourceId: "doc-1" };
    const shown = okValue(edgeCodec.encode(edge, "someone"));
    assert.deepStrictEqual(okValue(edgeCodec.decode(shown, "someone")), edge);
    assert.deepStrictEqual(
      okValue(
        edgeCodec.decode('{"subjectId":"someone","relation":"org:admin","resourceId":"doc-1"}', "someone"),
      ),
      edge,
    );
  });

  it("refuses a chip with no colon, a bad object and a field that is not a string", () => {
    for (const bad of ["owner", ":x", "x:", "{", "[1]", "{}", '{"subjectId":1,"relation":"r","resourceId":"d"}']) {
      assert.strictEqual(edgeCodec.decode(bad, "s")._tag, "Refused", bad);
      assert.strictEqual(eventCodec.decode(bad, "s")._tag, "Refused", bad);
    }
    assert.strictEqual(edgeCodec.decode('{"subjectId":"a","resourceId":"d"}', "s")._tag, "Refused");
    assert.strictEqual(edgeCodec.decode('{"subjectId":"a","relation":"r"}', "s")._tag, "Refused");
    assert.strictEqual(eventCodec.decode('{"subjectId":"a","resourceId":"d"}', "s")._tag, "Refused");
    assert.strictEqual(eventCodec.decode('{"subjectId":"a","event":"e"}', "s")._tag, "Refused");
    assert.strictEqual(eventCodec.decode('{"event":"e","resourceId":"d"}', "s")._tag, "Refused");
  });
});

const signature: FastCheck.Arbitrary<SignatureInput> = FastCheck.record(
  {
    subjectId: text,
    resourceId: text,
    meaning: text,
    signerRole: text,
    signedAt: FastCheck.double({ noNaN: true, noDefaultInfinity: true }).filter(
      (n) => !Object.is(n, -0),
    ),
    algorithm: text,
    keyId: text,
  },
  { requiredKeys: ["subjectId", "meaning"] },
);

describe("signatures", () => {
  it("round-trips every signature — the law", () => {
    FastCheck.assert(
      FastCheck.property(signature, text, (one, current) => {
        const shown = okValue(signatureCodec.encode(one, current));
        assert.deepStrictEqual(okValue(signatureCodec.decode(shown, current)), one);
      }),
      RUNS,
    );
  });

  it("uses meaning:resourceId, or a bare meaning, for the subject's own plain signature", () => {
    const own = { subjectId: "alice", meaning: "approved", resourceId: "doc-1" };
    assert.strictEqual(okValue(signatureCodec.encode(own, "alice")), "approved:doc-1");
    assert.strictEqual(
      okValue(signatureCodec.encode({ subjectId: "alice", meaning: "approved" }, "alice")),
      "approved",
    );
    assert.deepStrictEqual(okValue(signatureCodec.decode("approved:doc-1", "alice")), own);
    assert.deepStrictEqual(okValue(signatureCodec.decode("approved", "alice")), {
      subjectId: "alice",
      meaning: "approved",
    });
  });

  it("shows a signature whose resource would not survive the trim in full", () => {
    const padded = { subjectId: "alice", meaning: "m", resourceId: " doc " };
    const shown = okValue(signatureCodec.encode(padded, "alice"));
    assert.strictEqual(shown, '{"subjectId":"alice","resourceId":" doc ","meaning":"m"}');
    assert.deepStrictEqual(okValue(signatureCodec.decode(shown, "alice")), padded);
  });

  it("shows a signature carrying anything else in full", () => {
    const shown = okValue(
      signatureCodec.encode({ subjectId: "alice", meaning: "m", signerRole: "cfo", signedAt: 5 }, "alice"),
    );
    assert.strictEqual(shown, '{"subjectId":"alice","meaning":"m","signerRole":"cfo","signedAt":5}');
  });

  it("refuses an empty chip, a bad object, a non-string field and a non-finite signedAt", () => {
    assert.strictEqual(signatureCodec.decode("", "s")._tag, "Refused");
    assert.strictEqual(signatureCodec.decode("{", "s")._tag, "Refused");
    assert.strictEqual(signatureCodec.decode('{"meaning":"m"}', "s")._tag, "Refused");
    assert.strictEqual(signatureCodec.decode('{"subjectId":"s"}', "s")._tag, "Refused");
    for (const key of ["resourceId", "signerRole", "algorithm", "keyId"]) {
      assert.strictEqual(
        signatureCodec.decode(`{"subjectId":"s","meaning":"m","${key}":1}`, "s")._tag,
        "Refused",
        key,
      );
    }
    assert.strictEqual(
      signatureCodec.decode('{"subjectId":"s","meaning":"m","signedAt":"x"}', "s")._tag,
      "Refused",
    );
    assert.strictEqual(
      signatureCodec.encode({ subjectId: "s", meaning: "m", signedAt: Number.NaN }, "s")._tag,
      "Refused",
    );
  });

  it("compares signatures field by field", () => {
    const a = { subjectId: "s", meaning: "m", keyId: "k" };
    assert.isTrue(sameSignature(a, { ...a }));
    assert.isFalse(sameSignature(a, { ...a, keyId: "other" }));
    assert.isFalse(sameSignature(a, { subjectId: "s", meaning: "m" }));
  });
});

describe("roles and permissions", () => {
  it("round-trip what they can show, and refuse what the trim would change", () => {
    FastCheck.assert(
      FastCheck.property(text, (role) => {
        const shown = roleCodec.encode(role, "");
        if (shown._tag === "Refused") {
          assert.isTrue(role === "" || role !== role.trim());
          return;
        }
        assert.strictEqual(okValue(roleCodec.decode(shown.value, "")), role);
      }),
      RUNS,
    );
    assert.strictEqual(roleCodec.decode("  ", "")._tag, "Refused");
    assert.strictEqual(okValue(roleCodec.decode(" editor ", "")), "editor");
  });

  it("round-trip a resource:action key and refuse a chip with no colon", () => {
    FastCheck.assert(
      FastCheck.property(text, text, (resource, action) => {
        const key: `${string}:${string}` = `${resource}:${action}`;
        const shown = permissionCodec.encode(key, "");
        if (shown._tag === "Refused") return;
        assert.strictEqual(okValue(permissionCodec.decode(shown.value, "")), key);
      }),
      RUNS,
    );
    assert.strictEqual(permissionCodec.decode("admin", "")._tag, "Refused");
    assert.strictEqual(okValue(permissionCodec.decode("doc:read", "")), "doc:read");
    assert.strictEqual(permissionCodec.encode(" doc:read", "")._tag, "Refused");
  });
});

describe("the check", () => {
  it("round-trips every resource object — the law", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.dictionary(text.filter((key) => key !== "__proto__"), formValue),
        (resource) => {
          const shown = okValue(encodeResource(resource));
          assert.deepStrictEqual(okValue(decodeResource(shown)), resource);
        },
      ),
      RUNS,
    );
  });

  it("treats empty text as no resource, and refuses anything but a JSON object", () => {
    assert.strictEqual(okValue(decodeResource("")), undefined);
    assert.strictEqual(okValue(decodeResource("   ")), undefined);
    assert.strictEqual(okValue(encodeResource(undefined)), "");
    const seven = decodeResource("7");
    assert.deepStrictEqual(seven, { _tag: "Refused", reason: "expected a JSON object" });
    assert.strictEqual(decodeResource("[1]")._tag, "Refused");
    assert.strictEqual(decodeResource("{oops")._tag, "Refused");
    assert.deepStrictEqual(okValue(decodeResource('{"id": "doc-1"}')), { id: "doc-1" });
  });

  it("refuses to show a resource JSON cannot carry", () => {
    assert.strictEqual(encodeResource({ n: Number.NaN })._tag, "Refused");
    assert.strictEqual(encodeResource({ m: new Map() })._tag, "Refused");
  });

  it("makes an empty action absent, which is not the same as empty", () => {
    assert.strictEqual(actionOf(""), undefined);
    assert.strictEqual(actionOf("read"), "read");
    const base = { subject: { id: "s" }, action: "read" };
    assert.isFalse(Object.hasOwn(withAction(base, undefined), "action"));
    assert.strictEqual(withAction(base, "write").action, "write");
    assert.isFalse(Object.hasOwn(withResource({ ...base, resource: { id: "x" } }, undefined), "resource"));
    assert.deepStrictEqual(withResource(base, { id: "y" }).resource, { id: "y" });
  });
});

describe("list edits", () => {
  const edges = [{ subjectId: "alice", relation: "owner", resourceId: "doc-1" }];

  it("adds one element, refuses empty text, and refuses a duplicate by structure", () => {
    const added = okValue(addChip(edges, "viewer:doc-9", edgeCodec, sameEdge, "alice"));
    assert.strictEqual(added.length, 2);
    assert.strictEqual(addChip(edges, "  ", edgeCodec, sameEdge, "alice")._tag, "Refused");
    assert.deepStrictEqual(addChip(edges, "owner:doc-1", edgeCodec, sameEdge, "alice"), {
      _tag: "Refused",
      reason: "already there",
    });
    assert.strictEqual(addChip(edges, "nocolon", edgeCodec, sameEdge, "alice")._tag, "Refused");
  });

  it("keeps two edges that differ only by subject, which display text alone would collapse", () => {
    const both = okValue(
      addChip(
        edges,
        '{"subjectId":"bob","relation":"owner","resourceId":"doc-1"}',
        edgeCodec,
        sameEdge,
        "alice",
      ),
    );
    assert.strictEqual(both.length, 2);
  });

  it("removes exactly the element at an index", () => {
    assert.deepStrictEqual(removeAt(["a", "b", "c"], 1), ["a", "c"]);
  });
});

describe("renameSubject", () => {
  it("moves exactly the elements naming the old id", () => {
    const input = {
      subject: { id: "alice", roles: ["r"] },
      relationships: [
        { subjectId: "alice", relation: "owner", resourceId: "d" },
        { subjectId: "bob", relation: "owner", resourceId: "d" },
      ],
      history: [{ subjectId: "alice", event: "read", resourceId: "d" }],
      signatures: [
        { subjectId: "alice", meaning: "m" },
        { subjectId: "bob", meaning: "m" },
      ],
    };
    const renamed = renameSubject(input, "alice", "carol");
    assert.strictEqual(renamed.subject.id, "carol");
    assert.deepStrictEqual(renamed.subject.roles, ["r"]);
    assert.deepStrictEqual(
      renamed.relationships?.map((edge) => edge.subjectId),
      ["carol", "bob"],
    );
    assert.deepStrictEqual(renamed.history?.map((one) => one.subjectId), ["carol"]);
    assert.deepStrictEqual(renamed.signatures?.map((one) => one.subjectId), ["carol", "bob"]);
  });

  it("adds no field that was not there", () => {
    const renamed = renameSubject({ subject: { id: "a" } }, "a", "b");
    assert.deepStrictEqual(renamed, { subject: { id: "b" } });
  });
});

describe("exact refusals and boundaries", () => {
  const reasonOf = <A>(decoded: Decoded<A>): string =>
    decoded._tag === "Refused" ? decoded.reason : "";

  it("says why each text is refused", () => {
    assert.strictEqual(reasonOf(attributeCodec.decode("name", "")), "expected name:value");
    assert.strictEqual(reasonOf(attributeCodec.decode("name:", "")), "expected name:value");
    assert.strictEqual(reasonOf(attributeCodec.decode('"abc:1', "")), "an unterminated quoted name");
    assert.strictEqual(reasonOf(attributeCodec.decode('"a\\q":1', "")), "a quoted name must be a JSON string");
    assert.strictEqual(reasonOf(attributeCodec.decode('"abc"x', "")), "expected name:value");
    assert.strictEqual(reasonOf(attributeCodec.decode('"abc":', "")), "expected name:value");
    assert.strictEqual(reasonOf(edgeCodec.decode("owner", "s")), "expected relation:resourceId");
    assert.strictEqual(reasonOf(eventCodec.decode("read", "s")), "expected event:resourceId");
    assert.strictEqual(reasonOf(signatureCodec.decode("  ", "s")), "expected meaning or meaning:resourceId");
    assert.strictEqual(reasonOf(roleCodec.decode(" ", "")), "a role needs a name");
    assert.strictEqual(reasonOf(roleCodec.encode(" r", "")), "not representable in the form");
    assert.strictEqual(reasonOf(permissionCodec.decode("admin", "")), "expected resource:action");
    assert.strictEqual(reasonOf(permissionCodec.encode("a:", "")), "not representable in the form");
    assert.strictEqual(reasonOf(attributeCodec.encode(["k", undefined], "")), "not representable in the form");
    assert.strictEqual(reasonOf(attributeCodec.encode(["k", -0], "")), "not representable in the form");
    assert.strictEqual(reasonOf(edgeCodec.decode('{"subjectId":1,"relation":"r","resourceId":"d"}', "s")), '"subjectId" must be a string');
    assert.strictEqual(reasonOf(edgeCodec.decode('{"subjectId":"a","relation":"r","resourceId":1}', "s")), '"resourceId" must be a string');
    assert.strictEqual(reasonOf(signatureCodec.decode('{"subjectId":"s","meaning":"m","keyId":1}', "s")), '"keyId" must be a string');
    assert.strictEqual(
      reasonOf(signatureCodec.decode('{"subjectId":"s","meaning":"m","signedAt":1e999}', "s")),
      '"signedAt" must be a finite number',
    );
    assert.include(reasonOf(decodeResource("{oops")), "SyntaxError");
    assert.include(reasonOf(edgeCodec.decode("{oops", "s")), "SyntaxError");
    assert.strictEqual(reasonOf(edgeCodec.decode("[1]", "s")), "expected relation:resourceId");
    assert.strictEqual(reasonOf(edgeCodec.decode("{}", "s")), '"subjectId" must be a string');
    assert.strictEqual(reasonOf(addChip([], "  ", roleCodec, (a, b) => a === b, "")), "nothing to add");
  });

  it("decodes text with surrounding whitespace", () => {
    assert.deepStrictEqual(okValue(attributeCodec.decode("  a:1  ", "")), ["a", 1]);
    assert.deepStrictEqual(okValue(edgeCodec.decode("  owner:d  ", "s")), {
      subjectId: "s",
      relation: "owner",
      resourceId: "d",
    });
    assert.deepStrictEqual(okValue(eventCodec.decode("  read:d  ", "s")), {
      subjectId: "s",
      event: "read",
      resourceId: "d",
    });
    assert.deepStrictEqual(okValue(signatureCodec.decode("  m:d  ", "s")), {
      subjectId: "s",
      meaning: "m",
      resourceId: "d",
    });
    assert.strictEqual(okValue(permissionCodec.decode("  doc:read  ", "")), "doc:read");
    assert.deepStrictEqual(okValue(attributeCodec.decode('  "a:b":1  ', "")), ["a:b", 1]);
  });

  it("keeps the short form when only a brace or quote ends the word", () => {
    assert.strictEqual(
      okValue(edgeCodec.encode({ subjectId: "s", relation: "a{", resourceId: "d" }, "s")),
      "a{:d",
    );
    assert.strictEqual(
      okValue(edgeCodec.encode({ subjectId: "s", relation: 'a"', resourceId: "d" }, "s")),
      'a":d',
    );
    assert.strictEqual(okValue(attributeCodec.encode(["n", "a{"], "")), "n:a{");
    assert.strictEqual(okValue(attributeCodec.encode(["n", 'a"'], "")), 'n:a"');
    assert.strictEqual(okValue(attributeCodec.encode(["a{", "v"], "")), "a{:v");
  });

  it("shows an element in full when its tail would not survive the trim", () => {
    const edge = { subjectId: "s", relation: "r", resourceId: " d" };
    assert.strictEqual(
      okValue(edgeCodec.encode(edge, "s")),
      '{"subjectId":"s","relation":"r","resourceId":" d"}',
    );
    assert.strictEqual(
      okValue(edgeCodec.encode({ subjectId: "s", relation: "r", resourceId: "" }, "s")),
      '{"subjectId":"s","relation":"r","resourceId":""}',
    );
    assert.strictEqual(
      okValue(eventCodec.encode({ subjectId: "s", event: "e", resourceId: " d" }, "s")),
      '{"subjectId":"s","event":"e","resourceId":" d"}',
    );
  });

  it("shows a signature carrying any optional field, or another subject, in full", () => {
    const base = { subjectId: "s", meaning: "m" };
    for (const extra of [{ signerRole: "r" }, { signedAt: 1 }, { algorithm: "a" }, { keyId: "k" }]) {
      assert.strictEqual(okValue(signatureCodec.encode({ ...base, ...extra }, "s")).startsWith("{"), true);
    }
    assert.strictEqual(okValue(signatureCodec.encode(base, "other")).startsWith("{"), true);
    assert.strictEqual(okValue(signatureCodec.encode(base, "s")), "m");
  });

  it("compares signatures on every field", () => {
    const a: SignatureInput = {
      subjectId: "s",
      resourceId: "r",
      meaning: "m",
      signerRole: "sr",
      signedAt: 1,
      algorithm: "al",
      keyId: "k",
    };
    assert.isTrue(sameSignature(a, { ...a }));
    const changes: ReadonlyArray<Partial<SignatureInput>> = [
      { subjectId: "x" },
      { resourceId: "x" },
      { meaning: "x" },
      { signerRole: "x" },
      { signedAt: 2 },
      { algorithm: "x" },
      { keyId: "x" },
    ];
    for (const change of changes) assert.isFalse(sameSignature(a, { ...a, ...change }));
  });

  it("refuses a value whose JSON differs in length or kind from itself", () => {
    assert.strictEqual(attributeCodec.encode(["k", Object.assign([1, 2], { toJSON: () => [1] })], "")._tag, "Refused");
    assert.strictEqual(attributeCodec.encode(["k", Object.assign([1], { toJSON: () => ({ a: 1 }) })], "")._tag, "Refused");
    assert.strictEqual(attributeCodec.encode(["k", { a: 1, toJSON: () => ({ a: 1, b: 2 }) }], "")._tag, "Refused");
    assert.strictEqual(attributeCodec.encode(["k", [1, [2, { a: [3] }]]], "")._tag, "Ok");
  });

  it("encodes a permission", () => {
    assert.strictEqual(okValue(permissionCodec.encode("doc:read", "")), "doc:read");
  });

  it("puts a replaced pair last and keeps the others in order", () => {
    assert.deepStrictEqual(Object.keys(withPair({ a: 1, b: 2 }, ["a", 3])), ["b", "a"]);
  });
});
