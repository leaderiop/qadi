/**
 * The paste box's refusal sentences and the empty-rail commands, pinned exactly.
 *
 * Kept apart from `ExplorerSession.test.ts`, which also holds Phase 30's
 * paste-box characterisation pin: these assertions kill the mutants the decoder's
 * move left behind in `ExplorerSession.ts` and take nothing from that table.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { fromJson, hasPermission, permission, PolicyDecodeTooDeep, toJson } from "@qadi/core";
import type { Policy } from "@qadi/core";
import { policyLabel } from "../../src/model/Catalogue.ts";
import { makeExplorerSession, refusalOf } from "../../src/model/ExplorerSession.ts";

const read = permission("doc", "read");

const sightingOf = (policy: Policy) => ({
  policy,
  label: policyLabel(policy),
  count: 1,
  allows: 1,
  denies: 0,
  errors: 0,
  lastAt: 100,
});

const sentenceFor = (text: string): string | undefined => refusalOf(Effect.runSyncExit(fromJson(text)));

describe("refusalOf's sentences", () => {
  it("a failure at the root has no path prefix", () => {
    const sentence = sentenceFor("5") ?? "";
    assert.isTrue(sentence.startsWith("Expected "));
    assert.notInclude(sentence, "at ");
  });

  it("a nested failure is prefixed with its dotted path", () => {
    assert.strictEqual(
      sentenceFor('{"_tag":"Not","policy":{"_tag":"HasPermission","permission":5}}'),
      "at policy.permission: Expected object",
    );
    assert.strictEqual(
      sentenceFor('{"_tag":"HasPermission","permission":{"resource":"a","action":"b"},"x":1}'),
      "at x: Expected no excess property",
    );
  });

  it("the depth failure is the whole decode-limit sentence", () => {
    assert.strictEqual(
      refusalOf(Exit.fail(new PolicyDecodeTooDeep({ maxDepth: 256 }))),
      "Policy nesting exceeds the decode limit (max depth 256). Simplify the policy, or split it into smaller pieces.",
    );
  });
});

describe("an empty rail", () => {
  it("loads a pasted policy as a Pasted draft", () => {
    const session = makeExplorerSession();
    session.editJson(Effect.runSync(toJson(hasPermission(read))));
    session.load();
    const snapshot = session.getSnapshot();
    assert.strictEqual(snapshot._tag, "Showing");
    if (snapshot._tag === "Showing") {
      assert.strictEqual(snapshot.shown._tag, "Draft");
      if (snapshot.shown._tag === "Draft") assert.strictEqual(snapshot.shown.origin, "Pasted");
    }
  });

  it("ignores previewing, so a policy arriving later is not already previewed", () => {
    const session = makeExplorerSession();
    session.setPreviewing(true);
    session.setSightings([sightingOf(hasPermission(read))]);
    const snapshot = session.getSnapshot();
    assert.strictEqual(snapshot._tag, "Showing");
    if (snapshot._tag === "Showing") assert.isFalse(snapshot.simplification.previewing);
  });
});
