/**
 * ARCH-02 T3: pins the devtools tree walkers before `requirementsOf`, `witness`,
 * `build` and `flattenTree` move onto folds. The differential tests compare against
 * frozen whole-module copies under `legacy/`; the pinned examples outlive them
 * (T18 moves them into `Remedies.test.ts` and `Inspect.test.ts`).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  allOf,
  currentSubjectLayer,
  denyWhen,
  evaluate,
  EvaluationServicesNone,
  fromRoles,
  hasRole,
  not,
  permitWhen,
  role,
  rules,
} from "@qadi/core";
import type { Policy, Trace } from "@qadi/core";
import { flattenTree, inspect, isTruncated } from "../../src/model/Inspect.ts";
import { remedyEdits, satisfyingValue } from "../../src/model/Remedies.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { randomMatcher, randomPolicy } from "../helpers.ts";
import {
  flattenTree as legacyFlattenTree,
  inspect as legacyInspect,
  isTruncated as legacyIsTruncated,
} from "./legacy/Inspect.legacy.ts";
import {
  remedyEdits as legacyRemedyEdits,
  satisfyingValue as legacySatisfyingValue,
} from "./legacy/Remedies.legacy.ts";

const seeds = Array.from({ length: 300 }, (_, i) => 2026100500 + i);

const inputs: ReadonlyArray<SimulationInput> = [
  { subject: { id: "alice" } },
  {
    subject: {
      id: "alice",
      roles: ["editor"],
      permissions: ["doc:read"],
      attributes: { dept: "legal", seniority: 4, tags: ["a"] },
    },
    action: "read",
    resource: { id: "doc-1", owner: "alice" },
    relationships: [{ subjectId: "alice", relation: "owner", resourceId: "doc-1" }],
    history: [{ subjectId: "alice", event: "raised", resourceId: "doc-1" }],
  },
];

const describeEdits = (policy: Policy, input: SimulationInput, legacy: boolean) => {
  const sweep = (legacy ? legacyRemedyEdits : remedyEdits)(policy, input);
  return {
    edits: sweep.edits.map((e) => [e.kind, e.direction, e.label, e.apply(input)]),
    skipped: sweep.skipped,
  };
};

describe("differential: remedies against the frozen predecessor", () => {
  it("remedyEdits over seeded random policies", () => {
    for (const seed of seeds) {
      const policy = randomPolicy(seed);
      for (const input of inputs) {
        assert.deepStrictEqual(
          describeEdits(policy, input, false),
          describeEdits(policy, input, true),
          `seed ${seed}`,
        );
      }
    }
  });

  it("satisfyingValue over seeded random matchers", () => {
    for (const seed of seeds) {
      const matcher = randomMatcher(seed);
      for (const input of inputs) {
        assert.deepStrictEqual(
          satisfyingValue(matcher, input),
          legacySatisfyingValue(matcher, input),
          `seed ${seed}`,
        );
      }
    }
  });
});

const alice = fromRoles({ id: "alice", roles: [role({ name: "editor", permissions: [] })] });

const traceOf = (policy: Policy): Trace | undefined => {
  const result = Effect.runSync(
    Effect.result(
      evaluate(policy).pipe(
        Effect.provide(Layer.mergeAll(currentSubjectLayer(alice), EvaluationServicesNone)),
      ),
    ),
  );
  return result._tag === "Success" ? result.success.trace : undefined;
};

describe("differential: the inspector against the frozen predecessor", () => {
  it("inspect, flattenTree and isTruncated, with and without a trace", () => {
    for (const seed of seeds) {
      const policy = randomPolicy(seed);
      for (const trace of [undefined, traceOf(policy)]) {
        const now = inspect(policy, trace);
        const then = legacyInspect(policy, trace);
        assert.deepStrictEqual(now, then, `seed ${seed}`);
        assert.deepStrictEqual(
          flattenTree(now).map((n) => n.path),
          legacyFlattenTree(then).map((n) => n.path),
        );
        assert.strictEqual(isTruncated(now), legacyIsTruncated(then));
      }
    }
  });
});

describe("pinned examples", () => {
  const input: SimulationInput = { subject: { id: "alice" } };
  const labels = (policy: Policy) => remedyEdits(policy, input).edits.map((e) => e.label);

  it("Not is not descended into", () => {
    assert.deepStrictEqual(labels(not(hasRole("editor"))), []);
  });

  it("Deny rows are skipped", () => {
    assert.deepStrictEqual(
      labels(rules([denyWhen(hasRole("a")), permitWhen(hasRole("b"))])),
      ["with role b"],
    );
  });

  it("duplicates are deduplicated by label", () => {
    assert.deepStrictEqual(labels(allOf([hasRole("a"), hasRole("a")])), ["with role a"]);
  });

  it("requirements come out pre-order, left to right", () => {
    assert.deepStrictEqual(
      labels(allOf([hasRole("a"), allOf([hasRole("b"), hasRole("c")]), hasRole("d")])),
      ["with role a", "with role b", "with role c", "with role d"],
    );
  });
});
