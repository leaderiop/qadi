/**
 * `prepareSource`, the one place a source choice becomes something a run can use (ARCH-72).
 *
 * This table is the whole availability rule: which of the three sources can be had,
 * and the sentence the dock shows for each. The session's tests no longer restate it;
 * they check only that a refusal becomes the run state and that a capture lives and
 * dies with its ports.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import {
  attributeResolverFromRecord,
  gte,
  hasAttribute,
  portsLayer,
} from "@qadi/core";
import { answerCount, emptyAnswers } from "../../src/model/Capture.ts";
import type { CapturedAnswers } from "../../src/model/Capture.ts";
import { simulate } from "../../src/model/Simulation.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { prepareSource } from "../../src/model/SimulationSource.ts";
import type { SourceChoice } from "../../src/model/SimulationSource.ts";

const realPorts = portsLayer({
  AttributeResolver: attributeResolverFromRecord({ clearance: 7 }),
});

const choices: ReadonlyArray<SourceChoice> = ["Fixtures", "Snapshot", "Live"];
const portsStates = [realPorts, undefined] as const;
const captureStates: ReadonlyArray<CapturedAnswers | undefined> = [emptyAnswers, undefined];

const WITHOUT_PORTS = "the host did not pass a `ports` layer, so this panel cannot reach any resolver";
const WITHOUT_CAPTURE = "run once against Live first; this replays what that run learned";

const alice: SimulationInput = { subject: { id: "alice" } };

describe("prepareSource", () => {
  it("prepares every (choice × ports × capture) combination (ARCH-72)", () => {
    let rows = 0;
    for (const choice of choices) {
      for (const ports of portsStates) {
        for (const capture of captureStates) {
          rows += 1;
          const { options, prepared } = prepareSource(choice, { ports, capture });

          assert.deepStrictEqual(
            options.map((o) => [o.id, o.enabled]),
            [
              ["Fixtures", true],
              ["Snapshot", capture !== undefined],
              ["Live", ports !== undefined],
            ],
          );

          const available =
            choice === "Fixtures" || (choice === "Snapshot" ? capture !== undefined : ports !== undefined);
          assert.strictEqual(prepared._tag, available ? "Ready" : "Refused");

          if (prepared._tag === "Refused") {
            const tag = choice === "Live" ? "LiveWithoutPorts" : "SnapshotWithoutCapture";
            assert.strictEqual(prepared.refusal._tag, tag);
            assert.strictEqual(prepared.refusal.reason, choice === "Live" ? WITHOUT_PORTS : WITHOUT_CAPTURE);
            assert.strictEqual(
              prepared.refusal.reason,
              options.find((o) => o.id === choice)?.why,
            );
          } else {
            assert.strictEqual(prepared.source._tag, choice);
            if (prepared.source._tag === "Snapshot") assert.strictEqual(prepared.source.answers, capture);
            assert.strictEqual(prepared.captured !== undefined, choice === "Live");
          }
        }
      }
    }
    assert.strictEqual(rows, 12);
  });

  it("says why each option is or is not usable (ARCH-72)", () => {
    const without = prepareSource("Fixtures", { ports: undefined, capture: undefined }).options;
    const withBoth = prepareSource("Fixtures", { ports: realPorts, capture: emptyAnswers }).options;
    assert.strictEqual(without[0]?.why, "answers you typed below");
    assert.strictEqual(withBoth[0]?.why, "answers you typed below");
    assert.strictEqual(without[1]?.why, WITHOUT_CAPTURE);
    assert.strictEqual(
      withBoth[1]?.why,
      "real answers, captured once and replayed — one round of I/O for a whole sweep",
    );
    assert.strictEqual(without[2]?.why, WITHOUT_PORTS);
    assert.strictEqual(withBoth[2]?.why, "the application's own resolvers — every row is real I/O");
  });

  it.effect("a Ready Live source records what its run asked, and each preparation records alone (ARCH-72)", () =>
    Effect.gen(function* () {
      const have = { ports: realPorts, capture: undefined };
      const p1 = prepareSource("Live", have).prepared;
      const p2 = prepareSource("Live", have).prepared;
      if (p1._tag !== "Ready" || p1.captured === undefined) throw new Error("expected a Ready Live preparation");
      if (p2._tag !== "Ready" || p2.captured === undefined) throw new Error("expected a Ready Live preparation");

      yield* simulate(hasAttribute("clearance", gte(5)), alice, { source: p1.source });

      assert.strictEqual(answerCount(yield* p1.captured), 1);
      assert.strictEqual(answerCount(yield* p2.captured), 0);
    }));
});
