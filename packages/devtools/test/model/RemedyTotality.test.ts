/**
 * `remedyEdits` never throws for a row or a site that cannot be read: it skips the
 * check with what was thrown, and offers no row.
 *
 * The three records an untyped caller can hand over that no typed signature admits
 * are `null`, an object with a getter that throws, and a proxy whose trap throws.
 * Each is a signature row, an event row, the form's subject or the form's resource
 * in turn, for a `hasSignature` leaf and a `hasActed` leaf, and each case pins the
 * sentence it skips with. Core's own judgements are pinned the same way in
 * `packages/core/test` (`SignatureHistory.test.ts`, `DecisionHistory.test.ts`).
 */
import { assert, describe, it } from "@effect/vitest";
import { hasActed, hasSignature } from "@qadi/core";
import type { Policy } from "@qadi/core";
import { remedyEdits } from "../../src/model/Remedies.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { asker, SITES } from "../remedyAgreement.ts";

// `JSON.parse` returns `any`, which is what an untyped JavaScript caller hands
// over (no `as`), so each record below is a value a typed form refuses.
const nullRecord = () => JSON.parse("null");

const throwingGetter = (json: string, field: string, message: string) =>
  Object.defineProperty(JSON.parse(json), field, {
    get: () => {
      throw new Error(message);
    },
  });

const throwingProxy = (message: string) =>
  new Proxy(JSON.parse("{}"), {
    get: () => {
      throw new Error(message);
    },
  });

/** The sentence a skip carries when `who` refuses the check for `cause`. */
const skipFor = (who: string, cause: string) =>
  `the ${who} refuses this check, so no added row would be answered: ${cause}`;

/** What `remedyEdits` gave: the edit labels, and each skip as `requirement: reason`. */
const swept = (policy: Policy, input: SimulationInput) => {
  const sweep = remedyEdits(policy, input);
  return {
    edits: sweep.edits.map((edit) => edit.label),
    skipped: sweep.skipped.map((one) => `${one.requirement}: ${one.reason}`),
  };
};

const signatureLeaf = hasSignature("approved", { scope: "Any" });
const eventLeaf = hasActed("approved", { scope: "Any" });
const NULL_ROW = /answered: subjectId: reading it threw: .*null/;

describe("remedyEdits over a signature row or a site it cannot read", () => {
  type Rows = NonNullable<SimulationInput["signatures"]>;
  const withRows = (signatures: Rows): SimulationInput => ({
    subject: asker,
    resource: SITES.withId,
    signatures,
  });
  const skipped = (cause: string) => ({
    edits: [],
    skipped: [`signature approved: ${skipFor("signature port", cause)}`],
  });

  it("a row that is null is skipped, naming the field and what was thrown", () => {
    const sweep = swept(signatureLeaf, withRows([nullRecord()]));
    assert.deepStrictEqual(sweep.edits, []);
    assert.match(sweep.skipped.join("\n"), /^signature approved: the signature port /);
    assert.match(sweep.skipped.join("\n"), NULL_ROW);
  });

  it("a row whose getter throws is skipped, naming the field and what was thrown", () => {
    const row = throwingGetter('{"subjectId":"alice"}', "meaning", "boom");
    assert.deepStrictEqual(
      swept(signatureLeaf, withRows([row])),
      skipped("meaning: reading it threw: boom"),
    );
  });

  it("a row that is a throwing proxy is skipped, naming the field and the throw", () => {
    assert.deepStrictEqual(
      swept(signatureLeaf, withRows([throwingProxy("boom")])),
      skipped("subjectId: reading it threw: boom"),
    );
  });

  it("a form subject that cannot be read is skipped, naming the form", () => {
    for (const subject of [
      throwingGetter('{"roles":[]}', "id", "boom"),
      throwingProxy("boom"),
    ]) {
      assert.deepStrictEqual(swept(signatureLeaf, { subject, resource: SITES.withId }), {
        edits: [],
        skipped: [`signature approved: ${skipFor("form", "boom")}`],
      });
    }
    const sweep = swept(signatureLeaf, { subject: nullRecord(), resource: SITES.withId });
    assert.match(sweep.skipped.join("\n"), /^signature approved: the form refuses /);
  });

  it("a resource id that throws skips a Resource leaf and not an Any leaf", () => {
    const resource = throwingGetter("{}", "id", "boom");
    assert.deepStrictEqual(
      swept(hasSignature("approved", { scope: "Resource" }), {
        subject: asker,
        resource,
      }),
      skipped("site: reading it threw: boom"),
    );
    assert.deepStrictEqual(swept(signatureLeaf, { subject: asker, resource }), {
      edits: ["with signature approved"],
      skipped: [],
    });
  });
});

describe("remedyEdits over an event row or a site it cannot read", () => {
  type Rows = NonNullable<SimulationInput["history"]>;
  const withRows = (history: Rows): SimulationInput => ({
    subject: asker,
    resource: SITES.withId,
    history,
  });
  const skipped = (who: string, cause: string) => ({
    edits: [],
    skipped: [`event approved: ${skipFor(who, cause)}`],
  });

  it("a row that is null is skipped, naming the field and what was thrown", () => {
    const sweep = swept(eventLeaf, withRows([nullRecord()]));
    assert.deepStrictEqual(sweep.edits, []);
    assert.match(sweep.skipped.join("\n"), /^event approved: the history port /);
    assert.match(sweep.skipped.join("\n"), NULL_ROW);
  });

  it("a row whose getter throws is skipped, naming the field and what was thrown", () => {
    const row = throwingGetter('{"subjectId":"alice"}', "event", "boom");
    assert.deepStrictEqual(
      swept(eventLeaf, withRows([row])),
      skipped("history port", "event: reading it threw: boom"),
    );
  });

  it("a row that is a throwing proxy is skipped, naming the field and the throw", () => {
    assert.deepStrictEqual(
      swept(eventLeaf, withRows([throwingProxy("boom")])),
      skipped("history port", "subjectId: reading it threw: boom"),
    );
  });

  it("a form subject that cannot be read is skipped, naming the form", () => {
    for (const subject of [
      throwingGetter('{"roles":[]}', "id", "boom"),
      throwingProxy("boom"),
    ]) {
      assert.deepStrictEqual(
        swept(eventLeaf, { subject, resource: SITES.withId }),
        skipped("form", "boom"),
      );
    }
  });

  it("a resource id that throws skips a Resource leaf, and an Any leaf's row", () => {
    const resource = throwingGetter("{}", "id", "boom");
    assert.deepStrictEqual(
      swept(hasActed("approved", { scope: "Resource" }), { subject: asker, resource }),
      skipped("history port", "site: reading it threw: boom"),
    );
    assert.deepStrictEqual(
      swept(eventLeaf, { subject: asker, resource }),
      skipped("form", "boom"),
    );
  });
});
