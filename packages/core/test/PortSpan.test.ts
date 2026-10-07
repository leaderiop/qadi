/**
 * The span codec (`PortSpanEncode.ts`, `PortSpan.ts`) and what every port's
 * description says through it (ARCH-21, BEH-QD-227/228, INV-QD-044).
 *
 * In core, not only in devtools, because core's mutation run executes only
 * core's tests: the decoder's leniency is killed here. The literal-key
 * assertions in `Evaluate.test.ts` and `Predicate.test.ts` are what pin the key
 * strings themselves — a round trip cannot see a key changed in both directions.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import * as Schema from "effect/Schema";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { customPredicatePort } from "../src/CustomPredicate.ts";
import { decisionHistoryPort } from "../src/DecisionHistory.ts";
import type { PortSpanAttributes, SpanFields, SpanStruct, SpanType } from "../src/PortSpan.ts";
import { decodePortSpan } from "../src/PortSpanDecode.ts";
import {
  attemptsStruct,
  decodeSpan,
  encodeSpan,
  sharedQuestionFields,
  sharedQuestionKeys,
  spanStruct,
} from "../src/PortSpanEncode.ts";
import type { PortName } from "../src/PortMetrics.ts";
import { PORTS } from "../src/Ports.ts";
import { relationshipResolverPort } from "../src/RelationshipResolver.ts";
import { signatureHistoryPort } from "../src/SignatureHistory.ts";

const probe = spanStruct(
  {
    name: Schema.optionalKey(Schema.String),
    count: Schema.optionalKey(Schema.Number),
    flag: Schema.optionalKey(Schema.Boolean),
    scope: Schema.optionalKey(Schema.Literals(["Any", "Resource"])),
  },
  { name: "qadi.name", count: "qadi.count", flag: "qadi.flag", scope: "qadi.scope" },
);

const attributesOf = (record: Readonly<Record<string, unknown>>): ReadonlyMap<string, unknown> =>
  new Map(Object.entries(record));

const withoutUndefined = (value: Readonly<Record<string, unknown>>) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));

describe("encodeSpan / decodeSpan", () => {
  it("round-trips any value of the struct, with undefined fields omitted", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.record(
          {
            name: FastCheck.option(FastCheck.string(), { nil: undefined }),
            count: FastCheck.option(FastCheck.double({ noNaN: true }), { nil: undefined }),
            flag: FastCheck.option(FastCheck.boolean(), { nil: undefined }),
            scope: FastCheck.option(FastCheck.constantFrom("Any", "Resource"), { nil: undefined }),
          },
          { requiredKeys: [] },
        ),
        (value) => {
          const encoded = encodeSpan(probe, value);
          assert.deepStrictEqual(decodeSpan(probe, attributesOf(encoded)), withoutUndefined(value));
        },
      ),
    );
  });

  it("writes only the struct's keys and only span values", () => {
    const encoded = encodeSpan(probe, { name: "n", count: 2, flag: false, scope: "Any" });
    assert.deepStrictEqual(encoded, {
      "qadi.name": "n",
      "qadi.count": 2,
      "qadi.flag": false,
      "qadi.scope": "Any",
    });
    assert.deepStrictEqual(encodeSpan(probe, { name: undefined, count: 0 }), { "qadi.count": 0 });
    assert.deepStrictEqual(encodeSpan(probe, {}), {});
  });

  it("never writes a property the struct has no key for", () => {
    const wider = { name: "n", unknownProp: "x" };
    assert.deepStrictEqual(encodeSpan(probe, wider), { "qadi.name": "n" });
  });

  it("reads a wrong-typed field as absent and keeps the others (BEH-QD-228)", () => {
    const decoded = decodeSpan(
      probe,
      attributesOf({ "qadi.name": 42, "qadi.count": "three", "qadi.flag": true, "qadi.scope": "Any" }),
    );
    assert.deepStrictEqual(decoded, { flag: true, scope: "Any" });
  });

  it("reads a value outside a literal union as absent, and keeps the others", () => {
    const decoded = decodeSpan(probe, attributesOf({ "qadi.scope": "Elsewhere", "qadi.name": "n" }));
    assert.deepStrictEqual(decoded, { name: "n" });
  });

  it("reads each field on its own: one bad field never costs the row", () => {
    const decoded = decodeSpan(
      probe,
      attributesOf({ "qadi.name": "n", "qadi.count": 1, "qadi.flag": "no", "qadi.scope": "Resource" }),
    );
    assert.deepStrictEqual(decoded, { name: "n", count: 1, scope: "Resource" });
  });

  it("ignores a qadi key the struct does not name", () => {
    const decoded = decodeSpan(probe, attributesOf({ "qadi.unknown": "x", "qadi.name": "n" }));
    assert.deepStrictEqual(decoded, { name: "n" });
    assert.notProperty(decoded, "unknown");
  });

  it("reads an empty span as an empty row", () => {
    assert.deepStrictEqual(decodeSpan(probe, attributesOf({})), {});
  });
});

/**
 * One case per port: a representative question and outcome. Typed per port
 * through the description, so the two cannot be written against the wrong
 * struct.
 */
const conformSpan = <Q extends SpanFields, Ans extends SpanFields, O>(
  d: { readonly port: PortName; readonly attributes: PortSpanAttributes<Q, Ans, O> },
  question: SpanType<SpanStruct<Q>>,
  outcome: O,
  expected: Readonly<Record<string, unknown>>,
) => {
  const { question: q, answer: a } = d.attributes;
  const written = {
    ...encodeSpan(q, question),
    ...encodeSpan(a, d.attributes.disclose(outcome)),
  };

  // The question and the answer are disjoint, and neither collides with `attempts`.
  const questionKeys: ReadonlyArray<string> = Object.values(q.keys);
  const answerKeys: ReadonlyArray<string> = Object.values(a.keys);
  const attemptKeys: ReadonlyArray<string> = Object.values(attemptsStruct.keys);
  assert.isTrue(questionKeys.every((k) => k.startsWith("qadi.")), d.port);
  assert.isTrue(answerKeys.every((k) => k.startsWith("qadi.")), d.port);
  assert.deepStrictEqual(
    questionKeys.filter((k) => answerKeys.includes(k) || attemptKeys.includes(k)),
    [],
    d.port,
  );
  // INV-QD-044's floor, at runtime too: only strings, numbers and booleans are written.
  assert.isTrue(
    Object.values(written).every((v) => ["string", "number", "boolean"].includes(typeof v)),
    d.port,
  );
  // Round trip: the question as asked and the answer as disclosed.
  assert.deepStrictEqual(decodePortSpan(d, attributesOf(written)), expected, d.port);
};

describe("every port's description round-trips its span (ARCH-21)", () => {
  const CASES: { readonly [K in PortName]: () => void } = {
    AttributeResolver: () =>
      conformSpan(
        attributeResolverPort,
        { attribute: "tier", subjectId: "alice", interpreter: "evaluate" },
        5,
        { attribute: "tier", subjectId: "alice", interpreter: "evaluate", resolved: true },
      ),
    DecisionHistory: () =>
      conformSpan(
        decisionHistoryPort,
        {
          subjectId: "alice",
          event: "raised",
          scope: "Resource",
          resourceId: "doc-1",
          interpreter: "toPredicate",
        },
        "Acted",
        {
          subjectId: "alice",
          event: "raised",
          scope: "Resource",
          resourceId: "doc-1",
          interpreter: "toPredicate",
          answer: "Acted",
        },
      ),
    RelationshipResolver: () =>
      conformSpan(
        relationshipResolverPort,
        { subjectId: "alice", relation: "owner", interpreter: "evaluate", resourceId: "doc-1", depth: 3 },
        "Unrelated",
        {
          subjectId: "alice",
          relation: "owner",
          interpreter: "evaluate",
          resourceId: "doc-1",
          depth: 3,
          answer: "Unrelated",
        },
      ),
    CustomPredicate: () =>
      conformSpan(
        customPredicatePort,
        { name: "isOwner", subjectId: "alice", interpreter: "evaluate" },
        false,
        { name: "isOwner", subjectId: "alice", interpreter: "evaluate", answer: false },
      ),
    SignatureHistory: () =>
      conformSpan(
        signatureHistoryPort,
        {
          subjectId: "alice",
          meaning: "approve",
          scope: "Resource",
          interpreter: "evaluate",
          signerRole: "lead",
          resourceId: "doc-1",
        },
        { matched: true, onFile: 4 },
        {
          subjectId: "alice",
          meaning: "approve",
          scope: "Resource",
          interpreter: "evaluate",
          signerRole: "lead",
          resourceId: "doc-1",
          matched: true,
        },
      ),
  };

  for (const [port, run] of Object.entries(CASES)) {
    it(port, run);
  }

  it("the cases are exactly the registry's ports", () => {
    assert.deepStrictEqual(Object.keys(CASES), Object.keys(PORTS));
  });

  it("a retried call's attempts are decoded for every port", () => {
    for (const d of Object.values(PORTS)) {
      const row = decodePortSpan(d, attributesOf({ "qadi.attempts": 3 }));
      assert.strictEqual(row.attempts, 3, d.port);
    }
  });

  it("an out-of-union answer reads as absent through a description (D-21-i)", () => {
    const row = decodePortSpan(
      decisionHistoryPort,
      attributesOf({ "qadi.scope": "Elsewhere", "qadi.answer": "Maybe", "qadi.event": "raised" }),
    );
    assert.deepStrictEqual(row, { event: "raised" });
  });
});

describe("INV-QD-044 through the attribute port's disclose", () => {
  it("whatever a store returned, the answer encodes to a lone boolean", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.anything(), (value) => {
        const { answer, disclose } = attributeResolverPort.attributes;
        assert.deepStrictEqual(encodeSpan(answer, disclose(value)), {
          "qadi.resolved": value !== undefined,
        });
      }),
    );
  });

  it("an absent value is undefined and a returned null is a value", () => {
    const { answer, disclose } = attributeResolverPort.attributes;
    assert.deepStrictEqual(encodeSpan(answer, disclose(undefined)), { "qadi.resolved": false });
    assert.deepStrictEqual(encodeSpan(answer, disclose(null)), { "qadi.resolved": true });
  });
});

describe("the shared question fields", () => {
  it("spell the subject and the interpreter once", () => {
    assert.deepStrictEqual(sharedQuestionKeys, {
      subjectId: "qadi.subject_id",
      interpreter: "qadi.interpreter",
    });
    assert.deepStrictEqual(Object.keys(sharedQuestionFields), Object.keys(sharedQuestionKeys));
  });
});
