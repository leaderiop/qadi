/**
 * `remedyEdits` never throws for a row, a list of rows, a site or a form field that
 * cannot be read: it skips the requirement with what was thrown, and offers no row.
 *
 * The three records an untyped caller can hand over that no typed signature admits
 * are `null`, an object with a getter that throws, and a proxy whose trap throws.
 * Each is a signature row, an event row, the form's subject or the form's resource
 * in turn, for a `hasSignature` leaf and a `hasActed` leaf. A list of rows that is a
 * revoked proxy, has a `length` that throws or is a getter that throws is pinned the
 * same way, and so is a row holding an object whose class name is not text. Every
 * other field a requirement reads (the subject's id, roles, permissions and
 * attributes, the resource's id and attributes, the action and the relationship
 * list) is pinned for the requirement that reads it, and one whose form is fine
 * keeps its row beside a skipped one. Each case pins the sentence it skips with.
 * Core's own judgements are pinned the same way in `packages/core/test`
 * (`SignatureHistory.test.ts`, `DecisionHistory.test.ts`).
 */
import { assert, describe, it } from "@effect/vitest";
import {
  allOf,
  eq,
  hasAction,
  hasActed,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  hasSignature,
  literal,
  permission,
  resource,
} from "@qadi/core";
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

const withList = (field: "signatures" | "history", list: unknown): SimulationInput =>
  Object.defineProperty({ subject: asker, resource: SITES.withId }, field, {
    value: list,
  });

const revokedList = () => {
  const { proxy, revoke } = Proxy.revocable(JSON.parse("[]"), {});
  revoke();
  return proxy;
};

const throwingLength = (message: string) =>
  new Proxy(JSON.parse("[]"), {
    get: (target, key) => {
      if (key === "length") throw new Error(message);
      return Reflect.get(target, key);
    },
  });

const throwingField = (field: "signatures" | "history", message: string) =>
  Object.defineProperty({ subject: asker, resource: SITES.withId }, field, {
    get: () => {
      throw new Error(message);
    },
  });

const unnamedInstance = (name: unknown) =>
  new (Object.defineProperty(class {}, "name", { value: name }))();

const UNKEYABLE = "subjectId: an unkeyable instance (Object) has no request key";

/**
 * `remedyEdits` never throws for a list of rows it cannot read, nor for an object whose
 * class name is not text.
 *
 * The list is the form's own `signatures` or `history`: a getter that throws is the form
 * refusing, a revoked proxy or a `length` that throws is the port refusing, each skipped
 * with what was thrown. An object a row holds whose constructor `name` is a symbol, or an
 * object whose `toString` throws, is named generically in the sentence.
 */
describe("remedyEdits over a list of rows it cannot read", () => {
  const signature = (cause: string, who = "signature port") => ({
    edits: [],
    skipped: [`signature approved: ${skipFor(who, cause)}`],
  });
  const event = (cause: string, who = "history port") => ({
    edits: [],
    skipped: [`event approved: ${skipFor(who, cause)}`],
  });

  it("a list that is a revoked proxy is skipped, naming the list and the throw", () => {
    const sweep = swept(signatureLeaf, withList("signatures", revokedList()));
    assert.deepStrictEqual(sweep.edits, []);
    assert.match(sweep.skipped.join("\n"), /^signature approved: the signature port /);
    const revoked = /answered: signatures: reading it threw: .*revoked/;
    assert.match(sweep.skipped.join("\n"), revoked);
    assert.match(
      swept(eventLeaf, withList("history", revokedList())).skipped.join("\n"),
      /answered: events: reading it threw: .*revoked/,
    );
  });

  it("a list whose length throws is skipped, naming the list and the throw", () => {
    assert.deepStrictEqual(
      swept(signatureLeaf, withList("signatures", throwingLength("boom"))),
      signature("signatures: reading it threw: boom"),
    );
    assert.deepStrictEqual(
      swept(eventLeaf, withList("history", throwingLength("boom"))),
      event("events: reading it threw: boom"),
    );
  });

  it("a getter for the list that throws is skipped, naming the form", () => {
    assert.deepStrictEqual(
      swept(signatureLeaf, throwingField("signatures", "boom")),
      signature("boom", "form"),
    );
    assert.deepStrictEqual(
      swept(eventLeaf, throwingField("history", "boom")),
      event("boom", "form"),
    );
  });

  it("a row holding an object whose class name is not text names it generically", () => {
    const throwingToString = {
      toString: () => {
        throw new Error("ts");
      },
    };
    for (const name of [Symbol("odd"), throwingToString]) {
      const row = JSON.parse('{"meaning":"approved","event":"approved"}');
      row.resourceId = "d";
      row.subjectId = unnamedInstance(name);
      assert.deepStrictEqual(
        swept(signatureLeaf, withList("signatures", [row])),
        signature(UNKEYABLE),
      );
      assert.deepStrictEqual(
        swept(eventLeaf, withList("history", [row])),
        event(UNKEYABLE),
      );
    }
  });
});

describe("remedyEdits over a form field a requirement reads and cannot", () => {
  type Where = "subject" | "resource" | "form";
  const form = (where: Where, field: string): SimulationInput => {
    const held = JSON.parse('{"subject":{"id":"alice"},"resource":{"id":"doc-1"}}');
    Object.defineProperty(where === "form" ? held : held[where], field, {
      get: () => {
        throw new Error("boom");
      },
    });
    return held;
  };
  const refused = (requirement: string) => ({
    edits: [],
    skipped: [`${requirement}: ${skipFor("form", "boom")}`],
  });

  it("a subject field is skipped for the requirement that reads it", () => {
    assert.deepStrictEqual(
      swept(hasRole("editor"), form("subject", "roles")),
      refused("role editor"),
    );
    assert.deepStrictEqual(
      swept(hasPermission(permission("doc", "read")), form("subject", "permissions")),
      refused("permission doc:read"),
    );
    assert.deepStrictEqual(
      swept(hasAttribute("k", eq(literal(1))), form("subject", "attributes")),
      refused("subject attribute k"),
    );
    assert.deepStrictEqual(
      swept(hasRelationship("owner"), form("subject", "id")),
      refused("relationship owner"),
    );
  });

  it("a resource field is skipped for the requirement that reads it", () => {
    assert.deepStrictEqual(
      swept(hasRelationship("owner"), form("resource", "id")),
      refused("relationship owner"),
    );
    assert.deepStrictEqual(
      swept(hasResourceAttribute("k", eq(resource("owner"))), form("resource", "owner")),
      refused("resource attribute k"),
    );
  });

  it("an action or a relationship list that throws is skipped, naming the form", () => {
    assert.deepStrictEqual(
      swept(hasAction("write"), form("form", "action")),
      refused("action write"),
    );
    assert.deepStrictEqual(
      swept(hasRelationship("owner"), form("form", "relationships")),
      refused("relationship owner"),
    );
  });

  it("a requirement whose form can be read keeps its row beside a skipped one", () => {
    assert.deepStrictEqual(
      swept(allOf([hasRole("editor"), hasRelationship("owner")]), form("resource", "id")),
      {
        edits: ["with role editor"],
        skipped: [`relationship owner: ${skipFor("form", "boom")}`],
      },
    );
  });
});
