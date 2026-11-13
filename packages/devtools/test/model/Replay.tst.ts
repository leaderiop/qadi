/**
 * A checked baseline carries its own reading, at the type level.
 *
 * The sentence and whether it matches are decided once, when the baseline is
 * checked, so a snapshot cannot hold a checked baseline without them or a reading
 * beside one that is not checked.
 */
import { expect, test } from "tstyche";
import type { Baseline, BaselineReading } from "../../src/model/Replay.ts";
import type { SimulationSnapshot } from "../../src/model/SimulationSession.ts";

test("the Checked arm carries its reading", () => {
  expect<Extract<Baseline, { _tag: "Checked" }>["reading"]>().type.toBe<BaselineReading>();
});

test("the snapshot has no reading of its own beside the baseline", () => {
  expect<SimulationSnapshot>().type.not.toHaveProperty("baselineReading");
});
