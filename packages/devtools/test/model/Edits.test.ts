/**
 * JOB 4 ledger — the weakening half: E4.6, E4.7, E4.9.
 *
 * Derivation is pure, so these run without an Effect: what matters is that the
 * rows are the ones the input justifies, in an order that does not move between
 * runs, and that applying one changes exactly the thing it names.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  applyEdits,
  composeEdits,
  DEFAULT_MAX_PAIRS,
  editParts,
  pairEdits,
  sameEdge,
  sameEvent,
  singleEdits,
} from "../../src/index.ts";
import type { SimulationEdit, SimulationInput } from "../../src/index.ts";

/**
 * Two of everything, deliberately.
 *
 * A single grant per kind cannot tell "drop the one named" from "drop them
 * all": both leave an empty list. Every filter in `Edits.ts` is a predicate
 * over a list, so one element per list is exactly the fixture under which a
 * broken predicate passes.
 */
const full: SimulationInput = {
  subject: {
    id: "alice",
    roles: ["editor", "auditor"],
    permissions: ["doc:read", "doc:write"],
    attributes: { clearance: 7, tier: 2 },
  },
  resource: { id: "doc-1" },
  attributes: { department: "legal", region: "eu" },
  relationships: [
    { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
    { subjectId: "alice", relation: "viewer", resourceId: "doc-2" },
  ],
  history: [
    { subjectId: "alice", event: "raised", resourceId: "doc-1" },
    { subjectId: "alice", event: "closed", resourceId: "doc-2" },
  ],
};

const labels = (edits: ReadonlyArray<SimulationEdit>) => edits.map((e) => e.label);

/** `noUncheckedIndexedAccess` without `!`, which AGENTS.md §6 forbids outright. */
const at = <A>(items: ReadonlyArray<A>, index: number): A => {
  const found = items[index];
  if (found === undefined) throw new Error(`no element at ${String(index)}`);
  return found;
};

describe("singleEdits", () => {
  // E4.9 — the same input must sweep to the same rows in the same places, or
  // two sweeps cannot be read side by side.
  it("derives one row per grant, in the input's own order", () => {
    assert.deepStrictEqual(labels(singleEdits(full)), [
      "without role editor",
      "without role auditor",
      "without permission doc:read",
      "without permission doc:write",
      "without subject attribute clearance",
      "without subject attribute tier",
      "without resolver attribute department",
      "without resolver attribute region",
      "without relationship owner on doc-1",
      "without relationship viewer on doc-2",
      "without event raised on doc-1",
      "without event closed on doc-2",
    ]);
  });

  /**
   * The kind is public API — the panel groups rows by it, and a sweep that
   * labelled every row correctly while tagging them all `DropRole` would group
   * wrongly with nothing to show for it.
   */
  it("tags each row with the kind of thing it drops", () => {
    assert.deepStrictEqual(
      singleEdits(full).map((e) => e.kind),
      [
        "DropRole",
        "DropRole",
        "DropPermission",
        "DropPermission",
        "DropSubjectAttribute",
        "DropSubjectAttribute",
        "DropFixtureAttribute",
        "DropFixtureAttribute",
        "DropRelationship",
        "DropRelationship",
        "DropEvent",
        "DropEvent",
      ],
    );
    assert.isTrue(singleEdits(full).every((e) => e.direction === "Weaken"));
    assert.isTrue(singleEdits(full).every((e) => e.parts === undefined));
  });

  it("is stable across calls", () => {
    assert.deepStrictEqual(labels(singleEdits(full)), labels(singleEdits(full)));
  });

  /**
   * An attribute on the subject and in the fixtures is resolved from the
   * subject, so the two rows behave differently and must read differently. One
   * label for both would make the more interesting row — the fixture drop that
   * changes nothing, proving the subject shadowed it — invisible.
   */
  it("labels a subject attribute apart from a resolver attribute of the same name", () => {
    const shadowed: SimulationInput = {
      subject: { id: "alice", attributes: { clearance: 7 } },
      attributes: { clearance: 1 },
    };

    assert.deepStrictEqual(labels(singleEdits(shadowed)), [
      "without subject attribute clearance",
      "without resolver attribute clearance",
    ]);
  });

  it("names the subject on an edge that belongs to somebody else", () => {
    const shared: SimulationInput = {
      subject: { id: "alice" },
      relationships: [{ subjectId: "bob", relation: "owner", resourceId: "doc-1" }],
      history: [{ subjectId: "bob", event: "raised", resourceId: "doc-1" }],
    };

    assert.deepStrictEqual(labels(singleEdits(shared)), [
      "without relationship owner on doc-1 for bob",
      "without event raised on doc-1 by bob",
    ]);
  });

  it("collapses a duplicate grant to one row", () => {
    const twice: SimulationInput = {
      subject: { id: "alice", roles: ["editor", "editor"] },
      relationships: [
        { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
        { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
      ],
    };

    assert.deepStrictEqual(labels(singleEdits(twice)), [
      "without role editor",
      "without relationship owner on doc-1",
    ]);
  });

  // E4.6 — the panel says so in words; the model's part is to return nothing
  // rather than to invent a row.
  it("derives nothing from a subject with nothing to drop", () => {
    assert.deepStrictEqual(singleEdits({ subject: { id: "alice" } }), []);
  });

  it("derives nothing from grants that are present but empty", () => {
    assert.deepStrictEqual(
      singleEdits({
        subject: { id: "alice", roles: [], permissions: [], attributes: {} },
        attributes: {},
        relationships: [],
        history: [],
      }),
      [],
    );
  });
});

describe("applying an edit", () => {
  const by = (label: string): SimulationEdit => {
    const found = singleEdits(full).find((e) => e.label === label);
    if (found === undefined) throw new Error(`no edit ${label}`);
    return found;
  };

  it("drops one role and leaves the rest of the subject alone", () => {
    const edited = by("without role editor").apply(full);

    assert.deepStrictEqual(edited.subject.roles, ["auditor"]);
    assert.deepStrictEqual(edited.subject.permissions, ["doc:read", "doc:write"]);
    assert.deepStrictEqual(edited.subject.attributes, { clearance: 7, tier: 2 });
  });

  it("drops one permission", () => {
    assert.deepStrictEqual(by("without permission doc:read").apply(full).subject.permissions, [
      "doc:write",
    ]);
  });

  it("drops a subject attribute without touching the resolver's", () => {
    const edited = by("without subject attribute clearance").apply(full);

    assert.deepStrictEqual(edited.subject.attributes, { tier: 2 });
    assert.deepStrictEqual(edited.attributes, { department: "legal", region: "eu" });
  });

  it("drops a resolver attribute without touching the subject's", () => {
    const edited = by("without resolver attribute department").apply(full);

    assert.deepStrictEqual(edited.attributes, { region: "eu" });
    assert.deepStrictEqual(edited.subject.attributes, { clearance: 7, tier: 2 });
  });

  it("drops one edge and one event, leaving the others", () => {
    assert.deepStrictEqual(by("without relationship owner on doc-1").apply(full).relationships, [
      { subjectId: "alice", relation: "viewer", resourceId: "doc-2" },
    ]);
    assert.deepStrictEqual(by("without event raised on doc-1").apply(full).history, [
      { subjectId: "alice", event: "closed", resourceId: "doc-2" },
    ]);
  });

  it("leaves the input it was given untouched", () => {
    by("without role editor").apply(full);

    assert.deepStrictEqual(full.subject.roles, ["editor", "auditor"]);
  });

  /**
   * An edit derived from one input may be applied to another — `apply` is
   * public and pairs compose — and one that finds nothing to drop must return
   * its argument unchanged. Rebuilding the field as an empty one would turn "no
   * roles listed" into "an empty role list", and the row would claim to have
   * changed something it did not.
   */
  it("returns a bare input untouched rather than filling the field in", () => {
    const bare: SimulationInput = { subject: { id: "bob" } };

    for (const edit of singleEdits(full)) {
      assert.strictEqual(edit.apply(bare), bare, edit.label);
    }
  });

  /**
   * `apply` filters by field rather than by reference, so it still finds its
   * target in an array a previous edit rebuilt. That is what makes pairs
   * composable at all — the second half of `a + b` runs over `a`'s output.
   */
  it("finds its target in an array a previous edit rebuilt", () => {
    const twoEdges: SimulationInput = {
      subject: { id: "alice" },
      relationships: [
        { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
        { subjectId: "alice", relation: "viewer", resourceId: "doc-2" },
      ],
    };
    const derived = singleEdits(twoEdges);

    assert.deepStrictEqual(
      applyEdits(twoEdges, [at(derived, 0), at(derived, 1)]).relationships,
      [],
    );
  });
});

describe("sameEdge and sameEvent", () => {
  const edge = { subjectId: "alice", relation: "owner", resourceId: "doc-1" };
  const event = { subjectId: "alice", event: "raised", resourceId: "doc-1" };

  it("compare every field", () => {
    assert.isTrue(sameEdge(edge, { ...edge }));
    assert.isFalse(sameEdge(edge, { ...edge, subjectId: "bob" }));
    assert.isFalse(sameEdge(edge, { ...edge, relation: "viewer" }));
    assert.isFalse(sameEdge(edge, { ...edge, resourceId: "doc-2" }));

    assert.isTrue(sameEvent(event, { ...event }));
    assert.isFalse(sameEvent(event, { ...event, subjectId: "bob" }));
    assert.isFalse(sameEvent(event, { ...event, event: "closed" }));
    assert.isFalse(sameEvent(event, { ...event, resourceId: "doc-2" }));
  });
});

/**
 * Derived inside each test, never at `describe` scope.
 *
 * A `singleEdits(full)` evaluated while the suite is being collected throws
 * *before* any test exists, and a runner that sees zero tests sees zero
 * failures — which is how three mutants in the derivation survived a suite that
 * would plainly have caught them.
 */
describe("composeEdits", () => {
  const first = () => at(singleEdits(full), 0);
  const second = () => at(singleEdits(full), 1);

  it("applies both, first one first", () => {
    const pair = composeEdits(first(), second());

    assert.deepStrictEqual(pair.apply(full).subject.roles, []);
    assert.strictEqual(pair.label, "without role editor + without role auditor");
    assert.strictEqual(pair.kind, "Pair");
  });

  it("keeps the two halves, so a panel can offer either alone", () => {
    const a = first();
    const b = second();
    const pair = composeEdits(a, b);

    assert.deepStrictEqual(pair.parts, [a, b]);
    assert.deepStrictEqual(editParts(pair), [a, b]);
  });

  it("keeps one direction when both agree and reports Mixed when they do not", () => {
    const strengthen: SimulationEdit = {
      kind: "GrantRole",
      direction: "Strengthen",
      label: "with role admin",
      apply: (self) => self,
    };

    assert.strictEqual(composeEdits(first(), second()).direction, "Weaken");
    assert.strictEqual(composeEdits(first(), strengthen).direction, "Mixed");
    assert.strictEqual(composeEdits(strengthen, strengthen).direction, "Strengthen");
  });

  it("flattens a pair of pairs rather than assuming a depth of two", () => {
    const a = first();
    const b = second();
    const c = at(singleEdits(full), 2);
    const nested = composeEdits(composeEdits(a, b), c);

    assert.deepStrictEqual(editParts(nested), [a, b, c]);
  });

  it("is the identity on a leaf", () => {
    const a = first();
    assert.deepStrictEqual(editParts(a), [a]);
  });
});

describe("pairEdits", () => {
  // Inside each test, for the reason `composeEdits` above states.
  const derived = () => singleEdits(full);

  it("produces every unordered pair, once", () => {
    // An explicit cap above the total, so this is about the enumeration rather
    // than about the default bound — which the fixture now exceeds.
    const edits = derived();
    const { pairs, omitted } = pairEdits(edits, 1000);

    assert.strictEqual(pairs.length, (edits.length * (edits.length - 1)) / 2);
    assert.strictEqual(omitted, 0);
    assert.strictEqual(new Set(pairs.map((p) => p.label)).size, pairs.length);
  });

  it("orders pairs deterministically, outer index first", () => {
    assert.deepStrictEqual(labels(pairEdits(derived(), 3).pairs), [
      "without role editor + without role auditor",
      "without role editor + without permission doc:read",
      "without role editor + without permission doc:write",
    ]);
  });

  // E4.7 — a cap that truncates silently reads as "these are all the pairs",
  // which is the one thing a bounded sweep must not say.
  it("states what the cap excluded", () => {
    const edits = derived();
    const total = (edits.length * (edits.length - 1)) / 2;
    const { pairs, omitted } = pairEdits(edits, 4);

    assert.strictEqual(pairs.length, 4);
    assert.strictEqual(omitted, total - 4);
  });

  it("counts every pair as omitted when the cap is zero", () => {
    const edits = derived();
    const { pairs, omitted } = pairEdits(edits, 0);

    assert.strictEqual(pairs.length, 0);
    assert.strictEqual(omitted, (edits.length * (edits.length - 1)) / 2);
  });

  it("has no pairs to make from fewer than two edits", () => {
    assert.deepStrictEqual(pairEdits([]), { pairs: [], omitted: 0 });
    assert.deepStrictEqual(pairEdits([at(derived(), 0)]), { pairs: [], omitted: 0 });
  });

  it("defaults to the documented cap", () => {
    assert.strictEqual(DEFAULT_MAX_PAIRS, 50);

    const many = Array.from({ length: 20 }, (_, i): SimulationEdit => ({
      kind: "DropRole",
      direction: "Weaken",
      label: `edit ${i}`,
      apply: (self) => self,
    }));

    assert.strictEqual(pairEdits(many).pairs.length, DEFAULT_MAX_PAIRS);
    assert.strictEqual(pairEdits(many).omitted, 190 - DEFAULT_MAX_PAIRS);
  });
});
