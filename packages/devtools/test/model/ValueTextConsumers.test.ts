/**
 * What each devtools consumer makes of a value with no JSON text.
 *
 * The rules live in core's one table; these rows read each consumer through
 * itself, so the word a consumer shows for no text is pinned where it is chosen.
 */
import { assert, describe, it } from "@effect/vitest";
import { eq, hasAttribute, literal } from "@qadi/core";
import { searchTextOf } from "../../src/model/Filters.ts";
import { remedyEdits } from "../../src/model/Remedies.ts";
import { attributeCodec } from "../../src/model/SimulationForm.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import { decisionRecord } from "../helpers.ts";

interface Loop {
  self?: Loop;
}

const loop: Loop = {};
loop.self = loop;

const fn = (): number => 1;

const alice: SimulationInput = {
  subject: { id: "alice", attributes: { dept: "legal", tier: 3 } },
  action: "read",
  resource: { id: "doc-1", owner: "alice" },
};

const labels = (value: unknown) =>
  remedyEdits(hasAttribute("x", eq(literal(value))), alice).edits.map((e) => e.label);

const fail = (): never => {
  throw new Error("expected a timeline entry");
};

describe("the mapping each devtools consumer keeps", () => {
  it("Remedies: a function witness, which has no JSON text, is labelled with the word undefined", () => {
    assert.deepStrictEqual(labels(fn), ["with subject attribute x = undefined"]);
  });

  it("Filters: a bigint and a cycle, which have no JSON text, add their keys and nothing else", () => {
    const timeline = ingestAll(emptyTimeline(), [
      decisionRecord({ evaluationId: "x", at: 100, resource: { big: 4242n, loop } }),
    ]);

    assert.strictEqual(searchTextOf(timeline.entries[0] ?? fail()), "x server alice big loop");
  });

  it("SimulationForm: a cycle, which has no JSON text, is refused as not representable in the form", () => {
    const encoded = attributeCodec.encode(["k", loop], "");

    assert.strictEqual(
      encoded._tag === "Refused" ? encoded.reason : "accepted",
      "not representable in the form",
    );
  });

  it("Remedies: a bigint is labelled as its digits and n, and a cycle under the fixed words", () => {
    assert.deepStrictEqual(labels(1n), ["with subject attribute x = 1n"]);
    assert.deepStrictEqual(labels(loop), ["with subject attribute x = a value with no JSON form"]);
  });
});
