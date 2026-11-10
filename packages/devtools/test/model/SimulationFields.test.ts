/**
 * The simulator's field table, and what is derived from it (ARCH-61, porting
 * lost ARCH-48 `950977f`).
 *
 * Two kinds of test, because the table has two kinds of content. Its prose -
 * labels, placeholders, reasons, order - is a module-scope literal, which the
 * mutation gate ignores (`ignoreStatic`), so each value is pinned by an exact
 * assertion here. Everything *derived* from it runs per call, and is proved per
 * field and by a property over generated inputs.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import type { PortName } from "@qadi/core";
import { singleEdits } from "../../src/model/Edits.ts";
import {
  FIELD_ORDER,
  FIXTURE_DATA,
  GRANT_KINDS,
  SIMULATION_FIELDS,
  fieldOps,
  fixtureData,
  formOf,
  grant,
  renameSubject,
  unseededReason,
} from "../../src/model/SimulationFields.ts";
import type {
  FieldElements,
  GrantedField,
  SimulationField,
} from "../../src/model/SimulationFields.ts";
import { sameEdge, sameEvent, sameSignature } from "../../src/model/SimulationForm.ts";
import type { SimulationEdit } from "../../src/model/SimulationEdit.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";

const base: SimulationInput = { subject: { id: "alice" } };

/** `noUncheckedIndexedAccess` without `!`, which AGENTS.md §6 forbids outright. */
const at = <A>(items: ReadonlyArray<A>, index: number): A => {
  const found = items[index];
  if (found === undefined) throw new Error(`no element at ${String(index)}`);
  return found;
};

describe("the table's prose", () => {
  it("lists the fields in the order the form, the sweep and the replay share", () => {
    assert.deepStrictEqual(
      [...FIELD_ORDER],
      [
        "roles",
        "permissions",
        "subjectAttributes",
        "attributes",
        "relationships",
        "history",
        "signatures",
      ],
    );
    assert.deepStrictEqual([...FIELD_ORDER].sort(), Object.keys(SIMULATION_FIELDS).sort());
  });

  it("captions, hints and answers each field exactly", () => {
    assert.deepStrictEqual(
      FIELD_ORDER.map((key) => {
        const row = SIMULATION_FIELDS[key];
        return [key, row.label, row.placeholder, row.answeredBy, row.duplicate, row.drop.kind];
      }),
      [
        ["roles", "roles", "roles", { _tag: "Subject" }, "Refuse", "DropRole"],
        ["permissions", "permissions", "resource:action", { _tag: "Subject" }, "Refuse", "DropPermission"],
        ["subjectAttributes", "subject attributes", "name:value", { _tag: "Subject" }, "Replace", "DropSubjectAttribute"],
        ["attributes", "resolver attributes", "name:value", { _tag: "Port", port: "AttributeResolver" }, "Replace", "DropFixtureAttribute"],
        ["relationships", "relationships", "relation:resourceId", { _tag: "Port", port: "RelationshipResolver" }, "Refuse", "DropRelationship"],
        ["history", "history", "event:resourceId", { _tag: "Port", port: "DecisionHistory" }, "Refuse", "DropEvent"],
        ["signatures", "signatures", "meaning:resourceId", { _tag: "Port", port: "SignatureHistory" }, "Refuse", "DropSignature"],
      ],
    );
  });

  it("names the strengthening each granted field takes", () => {
    assert.deepStrictEqual(GRANT_KINDS, {
      roles: "GrantRole",
      permissions: "GrantPermission",
      subjectAttributes: "SetSubjectAttribute",
      relationships: "AddRelationship",
      history: "AddEvent",
      signatures: "AddSignature",
    });
  });

  it("gives a replayed row's reason by who answers the field", () => {
    assert.strictEqual(
      unseededReason({ _tag: "Subject" }),
      "a record names the subject by id and carries nothing else about them",
    );
    assert.strictEqual(
      unseededReason({ _tag: "Port", port: "SignatureHistory" }),
      "a record carries what the ports answered inside its trace, never as fixtures a rerun could use",
    );
  });
});

describe("what the ports are fed from", () => {
  it("has a cell for every port, and a vocabulary for every port a field names", () => {
    const named = new Set<PortName>();
    for (const key of FIELD_ORDER) {
      const by = SIMULATION_FIELDS[key].answeredBy;
      if (by._tag === "Port") named.add(by.port);
    }

    const fed = Object.entries(FIXTURE_DATA)
      .filter(([, cell]) => typeof cell === "function")
      .map(([name]) => name);
    assert.deepStrictEqual([...named].sort(), fed.sort());
    assert.deepStrictEqual([...named, "CustomPredicate"].sort(), Object.keys(FIXTURE_DATA).sort());
  });

  it("reads each fed port's data from the field that names it", () => {
    const input: SimulationInput = {
      subject: { id: "alice" },
      attributes: { a: 1 },
      relationships: [{ subjectId: "alice", relation: "r", resourceId: "d" }],
      history: [{ subjectId: "alice", event: "e", resourceId: "d" }],
      signatures: [{ subjectId: "alice", meaning: "m" }],
    };

    assert.strictEqual(fixtureData(FIXTURE_DATA.AttributeResolver, input), input.attributes);
    assert.strictEqual(fixtureData(FIXTURE_DATA.RelationshipResolver, input), input.relationships);
    assert.strictEqual(fixtureData(FIXTURE_DATA.DecisionHistory, input), input.history);
    assert.strictEqual(fixtureData(FIXTURE_DATA.SignatureHistory, input), input.signatures);
    assert.strictEqual(fixtureData(FIXTURE_DATA.AttributeResolver, base), undefined);
    assert.strictEqual(fixtureData(FIXTURE_DATA.CustomPredicate, input), undefined);
  });

  it("says why a custom predicate has no cell", () => {
    assert.deepStrictEqual(FIXTURE_DATA.CustomPredicate, {
      _tag: "NoFormVocabulary",
      reason:
        "a custom predicate's answer has no small typed value to type in; it answers from Snapshot or Live",
    });
  });
});

interface Sample<K extends SimulationField> {
  readonly key: K;
  readonly first: FieldElements[K];
  readonly second: FieldElements[K];
  /** The text that decodes to `first` for the subject `alice`. */
  readonly firstText: string;
  readonly secondText: string;
  /** Text the field's codec refuses, when there is any: a role is any non-empty word. */
  readonly badText: string | undefined;
  /** How each is shown as a chip. */
  readonly firstShown: string;
  readonly secondShown: string;
  readonly removeFirst: string;
  readonly removeSecond: string;
  readonly dropFirst: string;
  readonly dropSecond: string;
}

const sample = <K extends SimulationField>(s: Sample<K>): Sample<K> => s;

const edge1 = { subjectId: "alice", relation: "owner", resourceId: "doc-1" };
const edge2 = { subjectId: "alice", relation: "viewer", resourceId: "doc-2" };
const event1 = { subjectId: "alice", event: "raised", resourceId: "doc-1" };
const event2 = { subjectId: "alice", event: "closed", resourceId: "doc-2" };
const sig1 = { subjectId: "alice", meaning: "approved", resourceId: "doc-1" };
const sig2 = { subjectId: "alice", meaning: "reviewed" };

/**
 * Two of everything, deliberately: one element per list cannot tell "remove the
 * one named" from "remove them all".
 */
const check = <K extends SimulationField>(s: Sample<K>): void => {
  describe(`the ${s.key} field`, () => {
    const row = SIMULATION_FIELDS[s.key];
    const ops = fieldOps(s.key);
    const one = row.write(base, [s.first]);
    const two = row.write(base, [s.first, s.second]);

    it("reads what it wrote and nothing else", () => {
      assert.deepStrictEqual(ops.elements(two), [s.first, s.second]);
      assert.deepStrictEqual(ops.elements(base), []);
      assert.isTrue(ops.holds(two, s.second));
      assert.isFalse(ops.holds(one, s.second));
      assert.isFalse(ops.holds(base, s.first));
    });

    it("adds a chip by its codec and refuses empty text", () => {
      const added = ops.addChip(one, s.secondText);
      if (added._tag !== "Ok") throw new Error(`refused: ${added.reason}`);
      assert.deepStrictEqual(ops.elements(added.value), [s.first, s.second]);
      assert.deepStrictEqual(ops.addChip(base, "  "), { _tag: "Refused", reason: "nothing to add" });
      assert.deepStrictEqual(ops.addChip(base, ""), { _tag: "Refused", reason: "nothing to add" });
    });

    it("refuses text its codec refuses, and moves nothing", () => {
      if (s.badText === undefined) return;
      assert.strictEqual(ops.addChip(one, s.badText)._tag, "Refused");
    });

    it("treats a second commit of the same element as the field's rule says", () => {
      const again = ops.addChip(two, s.firstText);
      if (row.duplicate === "Refuse") {
        assert.deepStrictEqual(again, { _tag: "Refused", reason: "already there" });
      } else {
        if (again._tag !== "Ok") throw new Error("a record replaces");
        // Replaced, and last.
        assert.deepStrictEqual(ops.elements(again.value), [s.second, s.first]);
      }
    });

    it("removes exactly the chip at an index", () => {
      assert.deepStrictEqual(ops.elements(ops.removeChip(two, 0)), [s.second]);
      assert.deepStrictEqual(ops.elements(ops.removeChip(two, 1)), [s.first]);
    });

    it("leaves an absent field absent, and an index past the end alone", () => {
      assert.strictEqual(ops.removeChip(base, 0), base);
      assert.strictEqual(ops.removeChip(two, 2), two);
      assert.strictEqual(ops.removeChip(two, -1), two);
    });

    it("shows each chip as its codec writes it", () => {
      assert.deepStrictEqual(ops.chips(two), [
        { text: s.firstShown, refused: false, removeLabel: s.removeFirst },
        { text: s.secondShown, refused: false, removeLabel: s.removeSecond },
      ]);
      assert.deepStrictEqual(ops.chips(base), []);
    });

    it("derives one weakening per element, each dropping only its own", () => {
      const drops = ops.drops(two);
      assert.deepStrictEqual(
        drops.map((d) => [d.kind, d.direction, d.label]),
        [
          [row.drop.kind, "Weaken", s.dropFirst],
          [row.drop.kind, "Weaken", s.dropSecond],
        ],
      );
      assert.deepStrictEqual(ops.elements(at(drops, 0).apply(two)), [s.second]);
      assert.deepStrictEqual(ops.elements(at(drops, 1).apply(two)), [s.first]);
      // The input it was given is untouched, and a bare input comes back as it was.
      assert.deepStrictEqual(ops.elements(two), [s.first, s.second]);
      assert.strictEqual(at(drops, 0).apply(base), base);
    });
  });
};

check(
  sample({
    key: "roles",
    first: "editor",
    second: "auditor",
    firstText: "editor",
    secondText: "auditor",
    badText: undefined,
    firstShown: "editor",
    secondShown: "auditor",
    removeFirst: "editor",
    removeSecond: "auditor",
    dropFirst: "without role editor",
    dropSecond: "without role auditor",
  }),
);
check(
  sample({
    key: "permissions",
    first: "doc:read",
    second: "doc:write",
    firstText: "doc:read",
    secondText: "doc:write",
    badText: "nocolon",
    firstShown: "doc:read",
    secondShown: "doc:write",
    removeFirst: "doc:read",
    removeSecond: "doc:write",
    dropFirst: "without permission doc:read",
    dropSecond: "without permission doc:write",
  }),
);
check(
  sample({
    key: "subjectAttributes",
    first: ["clearance", 7],
    second: ["tier", 2],
    firstText: "clearance:7",
    secondText: "tier:2",
    badText: "nocolon",
    firstShown: "clearance=7",
    secondShown: "tier=2",
    removeFirst: "clearance",
    removeSecond: "tier",
    dropFirst: "without subject attribute clearance",
    dropSecond: "without subject attribute tier",
  }),
);
check(
  sample({
    key: "attributes",
    first: ["department", "legal"],
    second: ["region", "eu"],
    firstText: "department:legal",
    secondText: "region:eu",
    badText: "nocolon",
    firstShown: "department=legal",
    secondShown: "region=eu",
    removeFirst: "department",
    removeSecond: "region",
    dropFirst: "without resolver attribute department",
    dropSecond: "without resolver attribute region",
  }),
);
check(
  sample({
    key: "relationships",
    first: edge1,
    second: edge2,
    firstText: "owner:doc-1",
    secondText: "viewer:doc-2",
    badText: "nocolon",
    firstShown: "owner:doc-1",
    secondShown: "viewer:doc-2",
    removeFirst: "owner:doc-1",
    removeSecond: "viewer:doc-2",
    dropFirst: "without relationship owner on doc-1",
    dropSecond: "without relationship viewer on doc-2",
  }),
);
check(
  sample({
    key: "history",
    first: event1,
    second: event2,
    firstText: "raised:doc-1",
    secondText: "closed:doc-2",
    badText: "nocolon",
    firstShown: "raised:doc-1",
    secondShown: "closed:doc-2",
    removeFirst: "raised:doc-1",
    removeSecond: "closed:doc-2",
    dropFirst: "without event raised on doc-1",
    dropSecond: "without event closed on doc-2",
  }),
);
check(
  sample({
    key: "signatures",
    first: sig1,
    second: sig2,
    firstText: "approved:doc-1",
    secondText: "reviewed",
    badText: "{",
    firstShown: "approved:doc-1",
    secondShown: "reviewed",
    removeFirst: "approved:doc-1",
    removeSecond: "reviewed",
    dropFirst: "without signature approved on doc-1",
    dropSecond: "without signature reviewed",
  }),
);

describe("a record field", () => {
  const ops = fieldOps("attributes");

  it("sets a name like __proto__ as a key, not a prototype", () => {
    const added = ops.addChip({ ...base, attributes: { a: 1 } }, '"__proto__":2');
    if (added._tag !== "Ok") throw new Error(`refused: ${added.reason}`);
    const record = added.value.attributes ?? {};
    assert.isTrue(Object.hasOwn(record, "__proto__"));
    assert.deepStrictEqual(Object.keys(record), ["a", "__proto__"]);
  });

  it("puts a replaced pair last and keeps the others in order", () => {
    const added = ops.addChip({ ...base, attributes: { a: 1, b: 2 } }, "a:3");
    if (added._tag !== "Ok") throw new Error(`refused: ${added.reason}`);
    assert.deepStrictEqual(Object.keys(added.value.attributes ?? {}), ["b", "a"]);
    assert.deepStrictEqual(added.value.attributes, { b: 2, a: 3 });
  });

  it("shows a value the form cannot spell as its refusal, still removable by name", () => {
    const chips = ops.chips({ ...base, attributes: { odd: Number.NaN } });
    assert.deepStrictEqual(chips, [
      { text: "odd (not representable in the form)", refused: true, removeLabel: "odd" },
    ]);
  });
});

describe("a list field shows a value the form cannot spell as its refusal", () => {
  it("in parentheses, never a lossy rendering", () => {
    const chips = fieldOps("roles").chips({ subject: { id: "alice", roles: [" padded "] } });
    assert.deepStrictEqual(chips, [
      { text: "(not representable in the form)", refused: true, removeLabel: "(not representable in the form)" },
    ]);
  });
});

describe("attribution", () => {
  it("decodes a short-form element against the current subject", () => {
    const bob: SimulationInput = { subject: { id: "bob" } };
    for (const [key, text] of [
      ["relationships", "owner:doc-1"],
      ["history", "raised:doc-1"],
      ["signatures", "approved:doc-1"],
    ] as const) {
      const added = fieldOps(key).addChip(bob, text);
      if (added._tag !== "Ok") throw new Error(`refused: ${added.reason}`);
      assert.deepStrictEqual(
        fieldOps(key)
          .elements(added.value)
          .map((one) => one.subjectId),
        ["bob"],
      );
    }
  });

  it("keeps two edges that differ only by subject, which display text alone would collapse", () => {
    const ops = fieldOps("relationships");
    const added = ops.addChip(
      { ...base, relationships: [edge1] },
      '{"subjectId":"bob","relation":"owner","resourceId":"doc-1"}',
    );
    if (added._tag !== "Ok") throw new Error(`refused: ${added.reason}`);
    assert.strictEqual(ops.elements(added.value).length, 2);
  });
});

describe("renameSubject", () => {
  it("moves exactly the elements naming the old id", () => {
    const input: SimulationInput = {
      subject: { id: "alice", roles: ["r"] },
      relationships: [
        { subjectId: "alice", relation: "owner", resourceId: "d" },
        { subjectId: "bob", relation: "owner", resourceId: "d" },
      ],
      history: [{ subjectId: "alice", event: "read", resourceId: "d" }],
      signatures: [
        { subjectId: "alice", meaning: "m" },
        { subjectId: "bob", meaning: "m" },
      ],
    };
    const renamed = renameSubject(input, "alice", "carol");

    assert.strictEqual(renamed.subject.id, "carol");
    assert.deepStrictEqual(renamed.subject.roles, ["r"]);
    assert.deepStrictEqual(renamed.relationships?.map((edge) => edge.subjectId), ["carol", "bob"]);
    assert.deepStrictEqual(renamed.history?.map((one) => one.subjectId), ["carol"]);
    assert.deepStrictEqual(renamed.signatures?.map((one) => one.subjectId), ["carol", "bob"]);
  });

  it("adds no field that was not there", () => {
    assert.deepStrictEqual(renameSubject({ subject: { id: "a" } }, "a", "b"), { subject: { id: "b" } });
  });
});

describe("the form's reading", () => {
  it("lists every field in order, with who answers it and its chips", () => {
    const fields = formOf({
      subject: { id: "alice", roles: ["editor"] },
      signatures: [sig1],
    });

    assert.deepStrictEqual(
      fields.map((f) => [f.key, f.label, f.placeholder, f.holder, f.chips.length]),
      [
        ["roles", "roles", "roles", "Subject", 1],
        ["permissions", "permissions", "resource:action", "Subject", 0],
        ["subjectAttributes", "subject attributes", "name:value", "Subject", 0],
        ["attributes", "resolver attributes", "name:value", "Port", 0],
        ["relationships", "relationships", "relation:resourceId", "Port", 0],
        ["history", "history", "event:resourceId", "Port", 0],
        ["signatures", "signatures", "meaning:resourceId", "Port", 1],
      ],
    );
    assert.deepStrictEqual(at(fields, 6).chips, [
      { text: "approved:doc-1", refused: false, removeLabel: "approved:doc-1" },
    ]);
  });
});

describe("grant", () => {
  it("appends to the list the input has, or starts one", () => {
    const edit = grant("roles", "admin", "with role admin");

    assert.deepStrictEqual([edit.kind, edit.direction, edit.label], ["GrantRole", "Strengthen", "with role admin"]);
    assert.deepStrictEqual(edit.apply(base).subject.roles, ["admin"]);
    assert.deepStrictEqual(edit.apply({ subject: { id: "a", roles: ["x"] } }).subject.roles, ["x", "admin"]);
  });

  it("leaves the caller to decide a list already holds the element", () => {
    const edit = grant("roles", "x", "with role x");

    assert.deepStrictEqual(edit.apply({ subject: { id: "a", roles: ["x"] } }).subject.roles, ["x", "x"]);
  });

  it("names the strengthening of each granted field", () => {
    const granted: ReadonlyArray<GrantedField> = FIELD_ORDER.filter((key): key is GrantedField => key !== "attributes");
    assert.deepStrictEqual(
      granted.map((key) => GRANT_KINDS[key]),
      ["GrantRole", "GrantPermission", "SetSubjectAttribute", "AddRelationship", "AddEvent", "AddSignature"],
    );
  });

  it("sets an attribute, replacing a held one and putting it last", () => {
    const edit = grant("subjectAttributes", ["a", 9], "with subject attribute a = 9");
    const applied = edit.apply({ subject: { id: "x", attributes: { a: 1, b: 2 } } });

    assert.deepStrictEqual(Object.entries(applied.subject.attributes ?? {}), [["b", 2], ["a", 9]]);
  });
});

describe("the equalities the fields use", () => {
  const edge = { subjectId: "alice", relation: "owner", resourceId: "doc-1" };
  const event = { subjectId: "alice", event: "raised", resourceId: "doc-1" };

  it("compare every field of an edge and an event", () => {
    assert.isTrue(sameEdge(edge, { ...edge }));
    assert.isFalse(sameEdge(edge, { ...edge, subjectId: "bob" }));
    assert.isFalse(sameEdge(edge, { ...edge, relation: "viewer" }));
    assert.isFalse(sameEdge(edge, { ...edge, resourceId: "doc-2" }));

    assert.isTrue(sameEvent(event, { ...event }));
    assert.isFalse(sameEvent(event, { ...event, subjectId: "bob" }));
    assert.isFalse(sameEvent(event, { ...event, event: "closed" }));
    assert.isFalse(sameEvent(event, { ...event, resourceId: "doc-2" }));
  });

  it("compare a signature on its identifying fields", () => {
    assert.isTrue(sameSignature(sig1, { ...sig1 }));
  });
});

describe("the signature label", () => {
  const labelOf = (signature: FieldElements["signatures"], subjectId = "alice"): string =>
    SIMULATION_FIELDS.signatures.drop.label(signature, subjectId);

  it("names the signer role and another subject in prose", () => {
    assert.strictEqual(labelOf({ ...sig1, signerRole: "approver" }), "without signature approved on doc-1 as approver");
    assert.strictEqual(labelOf({ ...sig1, subjectId: "bob" }), "without signature approved on doc-1 by bob");
    assert.strictEqual(
      labelOf({ subjectId: "bob", meaning: "reviewed", signerRole: "lead" }),
      "without signature reviewed as lead by bob",
    );
  });

  it("uses the chip's exact text when a field prose does not carry is present", () => {
    for (const extra of [{ signedAt: 5 }, { algorithm: "ed25519" }, { keyId: "k1" }]) {
      const signature = { ...sig2, ...extra };
      const exact = SIMULATION_FIELDS.signatures.codec.encode(signature, "alice");
      if (exact._tag !== "Ok") throw new Error("expected the chip text");
      assert.strictEqual(labelOf(signature), `without signature ${exact.value}`);
    }
  });

  it("falls back to prose for a signature the form cannot spell", () => {
    assert.strictEqual(labelOf({ ...sig2, signedAt: Number.NaN }), "without signature reviewed");
    assert.strictEqual(
      labelOf({ ...sig2, algorithm: "x", signedAt: Number.POSITIVE_INFINITY }),
      "without signature reviewed",
    );
  });
});

// ---------------------------------------------------------------------------
// The property: a sweep offers one drop for every distinct element, in every field
// ---------------------------------------------------------------------------

const pick = <A>(...values: ReadonlyArray<A>) => FastCheck.constantFrom(...values);

/** Small alphabets, so duplicates occur and the fields' own equalities are exercised. */
const inputs: FastCheck.Arbitrary<SimulationInput> = FastCheck.record(
  {
    subject: FastCheck.record(
      {
        id: pick("alice", "bob"),
        roles: FastCheck.array(pick("a", "b", "c")),
        permissions: FastCheck.array(pick("x:1", "x:2", "y:1")),
        attributes: FastCheck.dictionary(pick("k", "l", "m"), FastCheck.integer({ min: 0, max: 2 })),
      },
      { requiredKeys: ["id"] },
    ),
    attributes: FastCheck.dictionary(pick("k", "l", "m"), FastCheck.integer({ min: 0, max: 2 })),
    relationships: FastCheck.array(
      FastCheck.record({
        subjectId: pick("alice", "bob"),
        relation: pick("owner", "viewer"),
        resourceId: pick("d1", "d2"),
      }),
    ),
    history: FastCheck.array(
      FastCheck.record({
        subjectId: pick("alice", "bob"),
        event: pick("raised", "closed"),
        resourceId: pick("d1", "d2"),
      }),
    ),
    signatures: FastCheck.array(
      FastCheck.record(
        {
          subjectId: pick("alice", "bob"),
          meaning: pick("approved", "reviewed"),
          resourceId: pick("d1", "d2"),
          signerRole: pick("lead", "peer"),
          keyId: pick("k1", "k2"),
        },
        { requiredKeys: ["subjectId", "meaning"] },
      ),
    ),
  },
  { requiredKeys: ["subject"] },
);

/**
 * One field's share of the sweep: a row per distinct element, in order, each
 * dropping that element and nothing else. Returns how many rows it accounted for.
 */
const accountsFor = <K extends SimulationField>(
  key: K,
  input: SimulationInput,
  edits: ReadonlyArray<SimulationEdit>,
  from: number,
): number => {
  const description = SIMULATION_FIELDS[key];
  const held = description.read(input) ?? [];
  const distinct = held.filter(
    (element, index) => held.findIndex((other) => description.same(other, element)) === index,
  );

  distinct.forEach((element, offset) => {
    const edit = at(edits, from + offset);
    assert.strictEqual(edit.kind, description.drop.kind);
    const after = edit.apply(input);
    const remaining = description.read(after) ?? [];
    assert.isFalse(remaining.some((other) => description.same(other, element)));
    assert.strictEqual(remaining.length, held.filter((other) => !description.same(other, element)).length);
    // Every other field is exactly as it was.
    for (const other of FIELD_ORDER) {
      if (other === key) continue;
      assert.deepStrictEqual(SIMULATION_FIELDS[other].read(after), SIMULATION_FIELDS[other].read(input));
    }
  });
  return distinct.length;
};

describe("a weakening sweep offers one drop for every distinct element", () => {
  it("has one row per distinct element of every field, each removing that element only", () => {
    FastCheck.assert(
      FastCheck.property(inputs, (input) => {
        const edits = singleEdits(input);
        let rows = 0;
        for (const key of FIELD_ORDER) rows += accountsFor(key, input, edits, rows);

        assert.strictEqual(edits.length, rows);
      }),
      { numRuns: 300 },
    );
  });

  it("restores the draft by adding back the chip it removed", () => {
    FastCheck.assert(
      FastCheck.property(inputs, (input) => {
        for (const key of FIELD_ORDER) restores(key, input);
      }),
      { numRuns: 200 },
    );
  });
});

/** Removing a list's last chip and typing its text back gives the element back. */
const restores = <K extends SimulationField>(key: K, input: SimulationInput): void => {
  const ops = fieldOps(key);
  const last = ops.elements(input).at(-1);
  const shown = ops.chips(input).at(-1);
  // A record shows `name=value`, which is not the text it is typed as.
  if (last === undefined || shown === undefined || shown.refused) return;
  if (SIMULATION_FIELDS[key].duplicate === "Replace") return;

  const removed = ops.removeChip(input, ops.elements(input).length - 1);
  // A structural duplicate earlier in the list would be refused on the way back.
  if (ops.holds(removed, last)) return;
  const back = ops.addChip(removed, shown.text);
  if (back._tag !== "Ok") throw new Error(`refused: ${back.reason}`);
  assert.deepStrictEqual(ops.elements(back.value).at(-1), last);
};
