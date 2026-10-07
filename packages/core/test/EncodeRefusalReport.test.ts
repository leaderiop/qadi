import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { Decided, DecisionRecord } from "../src/DecisionRecord.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { Allow } from "../src/Decision.ts";
import { reportEncodeRefusal } from "../src/EncodeRefusalReport.ts";
import {
  describeEncodeRefusal,
  EncodeRefusal,
  encodeRefusalAnnotations,
  encodeRefusalPath,
  SinkRecordNotEncodable,
} from "../src/Errors.ts";
import { makeSubjectId } from "../src/Identity.ts";
import * as P from "../src/Policy.ts";
import { permission } from "../src/Permission.ts";
import { encodeSinkRecord } from "../src/SinkCodec.ts";

const read = permission("doc", "read");

const recordWith = (resource: unknown): SinkRecord =>
  new DecisionRecord({
    evaluationId: "e-1",
    at: 1,
    subjectId: makeSubjectId("u1"),
    policy: P.hasPermission(read),
    resource: { value: resource },
    outcome: new Decided({
      decision: new Allow({
        evaluationId: "e-1",
        subjectId: makeSubjectId("u1"),
        durationMillis: 0,
        trace: { policyTag: "HasPermission", allowed: true, children: [], obligations: [] },
        visibleFields: undefined,
        obligations: [],
      }),
    }),
  });

const refusalOf = (resource: unknown): SinkRecordNotEncodable => {
  const encoded = encodeSinkRecord(recordWith(resource));
  if (Result.isSuccess(encoded)) throw new Error("expected a refusal");
  return encoded.failure;
};

const PATH = ["resource", "tags"];

const variants: ReadonlyArray<readonly [EncodeRefusal, string | undefined, string]> = [
  [EncodeRefusal.Circular({ path: PATH }), "resource.tags", "resource.tags: a circular reference has no JSON form"],
  [
    EncodeRefusal.TooDeep({ path: PATH, maxDepth: 64 }),
    "resource.tags",
    "resource.tags: nested deeper than 64 levels, past what a reader will decode",
  ],
  [
    EncodeRefusal.NonFinite({ path: PATH }),
    "resource.tags",
    "resource.tags: a non-finite number or invalid Date has no JSON form",
  ],
  [
    EncodeRefusal.Unrepresentable({ path: PATH, kind: "function" }),
    "resource.tags",
    "resource.tags: a function has no JSON form",
  ],
  [
    EncodeRefusal.Opaque({ path: PATH, kind: "Set", brand: "Set" }),
    "resource.tags",
    "resource.tags: a Set has no JSON form",
  ],
  [EncodeRefusal.EncodeFailed({ message: "boom" }), undefined, "the record could not be encoded: boom"],
];

describe("the readings of an EncodeRefusal", () => {
  for (const [refusal, path, sentence] of variants) {
    it(`${refusal._tag}: path, annotations and sentence`, () => {
      assert.deepStrictEqual(encodeRefusalPath(refusal)?.join("."), path);
      assert.deepStrictEqual(encodeRefusalAnnotations({ refusal, evaluationId: "e" }), {
        "qadi.refusal": refusal._tag,
        "qadi.path": path ?? "",
        evaluationId: "e",
      });
      assert.strictEqual(describeEncodeRefusal(refusal), sentence);
    });
  }

  it("a refusal at the root is described as the record", () => {
    assert.strictEqual(
      describeEncodeRefusal(EncodeRefusal.Circular({ path: [] })),
      "the record: a circular reference has no JSON form",
    );
  });

  it("a real SinkRecordNotEncodable reads through its own fields", () => {
    const refused = refusalOf(new Set(["finance"]));
    assert.deepStrictEqual(encodeRefusalAnnotations(refused), {
      "qadi.refusal": "Opaque",
      "qadi.path": "resource.value",
      evaluationId: "e-1",
    });
  });
});

describe("a refusal report says where, never what (INV-QD-104)", () => {
  const sentinel = FastCheck.stringMatching(/^[a-z0-9]{12,24}$/).map((s) => `sentinel-${s}`);

  it("no annotation of any refusal carries a value from the record", () => {
    FastCheck.assert(
      FastCheck.property(sentinel, (secret) => {
        const hostile = {
          get boom(): unknown {
            throw new Error(secret);
          },
        };
        const cyclic: Record<string, unknown> = { tag: secret };
        cyclic["self"] = cyclic;
        const resources: ReadonlyArray<unknown> = [
          new Set([secret]),
          new Map([["k", secret]]),
          hostile,
          Symbol(secret),
          { [secret.length]: () => secret },
          Object.defineProperty(() => 0, "name", { value: secret }),
          cyclic,
          Number.NaN,
        ];
        for (const resource of resources) {
          const refused = refusalOf(resource);
          const annotations = encodeRefusalAnnotations(refused);
          assert.deepStrictEqual(Object.keys(annotations).sort(), ["evaluationId", "qadi.path", "qadi.refusal"]);
          for (const value of Object.values(annotations)) assert.notInclude(value, secret);
        }
      }),
    );
  });

  it("the sentence of EncodeFailed may carry caller text, which is why it is never an annotation", () => {
    const refused = refusalOf({
      get boom(): unknown {
        throw new Error("caller text");
      },
    });
    assert.include(describeEncodeRefusal(refused.refusal), "caller text");
    assert.notInclude(JSON.stringify(encodeRefusalAnnotations(refused)), "caller text");
  });
});

describe("reportEncodeRefusal", () => {
  const capture = () => {
    const logs: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];
    const layer = Logger.layer([
      Logger.make((o) => {
        logs.push({ message: o.message, annotations: o.fiber.getRef(References.CurrentLogAnnotations) });
      }),
    ]);
    return { logs, layer };
  };
  const refused = new SinkRecordNotEncodable({
    recordTag: "Decision",
    evaluationId: "ev",
    refusal: EncodeRefusal.Opaque({ path: PATH, kind: "Set", brand: "Set" }),
  });

  it.effect("with a hook, calls it once and logs nothing", () =>
    Effect.gen(function* () {
      const { logs, layer } = capture();
      const seen: Array<SinkRecordNotEncodable> = [];
      yield* reportEncodeRefusal(refused, { message: "m", onRefused: (r) => void seen.push(r) }).pipe(
        Effect.provide(layer),
      );
      assert.deepStrictEqual(seen, [refused]);
      assert.strictEqual(logs.length, 0);
    }));

  it.effect("with no hook, logs its message once with the three annotations", () =>
    Effect.gen(function* () {
      const { logs, layer } = capture();
      yield* reportEncodeRefusal(refused, { message: "my words", onRefused: undefined }).pipe(Effect.provide(layer));
      assert.strictEqual(logs.length, 1);
      assert.include(String(logs[0]?.message), "my words");
      assert.deepStrictEqual(logs[0]?.annotations, encodeRefusalAnnotations(refused));
    }));

  it.effect("a hook that throws is logged, never a defect", () =>
    Effect.gen(function* () {
      const { logs, layer } = capture();
      const exit = yield* Effect.exit(
        reportEncodeRefusal(refused, {
          message: "m",
          onRefused: () => {
            throw new Error("hook bug");
          },
        }).pipe(Effect.provide(layer)),
      );
      assert.isTrue(Exit.isSuccess(exit));
      assert.strictEqual(logs.length, 1);
      assert.include(String(logs[0]?.message), "hook threw");
      assert.strictEqual(logs[0]?.annotations["qadi.refusal"], "Opaque");
      assert.strictEqual(logs[0]?.annotations["qadi.path"], "resource.tags");
      assert.strictEqual(logs[0]?.annotations["evaluationId"], "ev");
      assert.include(String(logs[0]?.annotations["qadi.cause"]), "hook bug");
    }));
});
