/**
 * The characterisation of every leaf's absences (ARCH-97, ADR-QD-163; D-14).
 *
 * Every leaf fixture is evaluated with the action absent and present and with a
 * resource none, without an `id`, and with an `id`, and each cell must give exactly
 * what `oracle` names. The oracle is the hand-written D-05 rule: a leaf's own input
 * first, then what its matcher references (action before resource), then a
 * resource-scoped port read's resource id, else the fixture's settled decision.
 * It reads no table of what a leaf needs, so it stays green through the change that
 * introduces one, and fails if that change moves an absence (INV-QD-011).
 *
 * A failure and a decision are told apart by their labels, so an absence that
 * turned into a denial fails a cell instead of passing as "not allowed".
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import {
  FIXTURES,
  SHAPES,
  evaluateLabel,
  oracle,
  predicateLabel,
} from "./LeafFixtures.ts";

const ROWS = Object.entries(FIXTURES).flatMap(([tag, fixtures]) =>
  fixtures.map((f) => ({ tag, f })),
);
const ALL = ROWS.map((row) => row.f);

describe("every leaf's absences, INV-QD-011 and D-05", () => {
  it("has fixtures for exactly the leaf tags, and for every one of them", () => {
    const tags = Object.keys(P.leafCases(() => 0)).sort();
    assert.deepStrictEqual(Object.keys(FIXTURES).sort(), tags);
    assert.isAbove(tags.length, 0);
    for (const [tag, fixtures] of Object.entries(FIXTURES)) {
      assert.isAbove(fixtures.length, 0, `${tag} has no fixture`);
    }
  });

  it.effect("evaluate gives the oracle's outcome in every cell", () =>
    Effect.gen(function* () {
      let cells = 0;
      for (const { tag, f } of ROWS) {
        assert.strictEqual(f.policy._tag, tag);
        for (const action of [false, true]) {
          for (const { shape } of SHAPES) {
            const got = yield* evaluateLabel(f.policy, action, shape);
            assert.strictEqual(
              got,
              oracle(f, action, shape),
              `${f.label} action=${action ? "read" : "-"} resource=${shape}`,
            );
            cells++;
          }
        }
      }
      assert.strictEqual(cells, 6 * ALL.length);
      assert.isAtLeast(cells, 126);
    }),
  );

  it.effect("a request with neither input reports the leaf's own input first", () =>
    Effect.gen(function* () {
      const none = (policy: P.Policy) => evaluateLabel(policy, false, "none");
      // its own resource input, before the matcher's reference to the action
      assert.strictEqual(
        yield* none(P.hasResourceAttribute("owner", M.eq(M.action()))),
        "Resource:owner",
      );
      // no `expected`: nothing was required, only compared
      assert.strictEqual(
        yield* none(P.hasAttribute("department", M.eq(M.action()))),
        "Action:-",
      );
      // the one verb the leaf requires
      assert.strictEqual(yield* none(P.hasAction("read")), "Action:read");
      // a leaf that needs nothing gives its settled decision
      assert.strictEqual(yield* none(P.hasRole("editor")), "Allow");
    }),
  );

  it.effect("toPredicate reports the action's absence where the leaf needs the action", () =>
    Effect.gen(function* () {
      let cells = 0;
      for (const f of ALL) {
        for (const action of [false, true]) {
          const needsAction = f.own === "Action" || f.refs === "action";
          const absence = f.own === "Action" ? `Action:${f.expected ?? "-"}` : "Action:-";
          const got = yield* predicateLabel(f.policy, action);
          assert.strictEqual(
            got,
            !action && needsAction ? absence : f.compiled,
            `${f.label} action=${action ? "read" : "-"}`,
          );
          cells++;
        }
      }
      assert.strictEqual(cells, 2 * ALL.length);
    }),
  );

  it.effect("evaluate and toPredicate report an absent action with the same label", () =>
    Effect.gen(function* () {
      for (const f of ALL) {
        for (const action of [false, true]) {
          const walked = yield* evaluateLabel(f.policy, action, "id");
          const compiled = yield* predicateLabel(f.policy, action);
          if (walked.startsWith("Action:") || compiled.startsWith("Action:")) {
            assert.strictEqual(compiled, walked, `${f.label} action=${action ? "read" : "-"}`);
          }
        }
      }
    }),
  );
});
