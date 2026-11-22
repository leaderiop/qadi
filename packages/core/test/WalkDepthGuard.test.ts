/**
 * The walk's own depth guard (ARCH-106, WENV-02). Admission proves a question no deeper than its
 * bound before a walk starts, so the walk's `depth > maxDepth` check is defence in depth that
 * evaluation never reaches; this drives `evaluateNode` directly past the bound to pin it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { admit } from "../src/Admission.ts";
import * as P from "../src/Policy.ts";
import { portsLayer } from "../src/Ports.ts";
import { questionOf } from "../src/Question.ts";
import { evaluateNode } from "../src/Walk.ts";
import { subjectWith } from "./helpers.ts";

const subject = subjectWith({ id: "u7" });

const environment = (policy: P.Policy, maxDepth: number) => {
  const admitted = Result.getOrThrow(admit(questionOf(subject, policy, { maxDepth }), "asked"));
  return { admitted, concurrency: undefined };
};

describe("evaluateNode's depth guard", () => {
  const policy = P.not(P.hasRole("editor"));

  it.effect("fails with PolicyTooDeep when entered one level past the bound", () =>
    Effect.gen(function* () {
      const failure = yield* evaluateNode(policy, environment(policy, 1), 2).pipe(
        Effect.flip,
        Effect.provide(portsLayer()),
      );
      assert.strictEqual(failure._tag, "PolicyTooDeep");
      assert.strictEqual(failure._tag === "PolicyTooDeep" ? failure.maxDepth : undefined, 1);
    }),
  );

  it.effect("walks a leaf entered at exactly the bound", () =>
    Effect.gen(function* () {
      const leaf = P.hasRole("editor");
      const trace = yield* evaluateNode(leaf, environment(leaf, 1), 1).pipe(
        Effect.provide(portsLayer()),
      );
      assert.strictEqual(trace.policyTag, "HasRole");
    }),
  );
});
