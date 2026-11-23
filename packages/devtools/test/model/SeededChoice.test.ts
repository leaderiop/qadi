/**
 * The seeded choice's rules as plain values.
 *
 * Each rule is a function of a value, so a row builds a choice, applies a transition
 * and reads the answer, with no Effect, scope or store around it. The session reads
 * the same rules through `SimulationSession.characterisation.test.ts` and
 * `SimulationSession.test.ts`.
 *
 * The helpers it uses are `sighting` and `entryOf` from `../simulationFixtures.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Equal from "effect/Equal";
import { hasPermission, hasRole } from "@qadi/core";
import type { Policy } from "@qadi/core";
import { policyLabel } from "../../src/model/Catalogue.ts";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import {
  choose,
  menuOf,
  policyChoice,
  policyOf,
  seedFrom,
  seededChoice,
  seededFrom,
  seedOf,
  sightingAt,
  withSightings,
} from "../../src/model/SeededChoice.ts";
import type {
  PolicyChoice,
  PolicyMenu,
  SeededChoice,
} from "../../src/model/SeededChoice.ts";
import type { SimulationField } from "../../src/model/SimulationFields.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import { decisionRecord, obligationRecord, read } from "../helpers.ts";
import { entryOf, sighting } from "../simulationFixtures.ts";

const roleA = hasRole("a");
const roleB = hasRole("b");
const roleC = hasRole("c");
const roleS = hasRole("s");
const roleZ = hasRole("z");

const sA = sighting(roleA);
const sB = sighting(roleB);
const sC = sighting(roleC);
const named: PolicySighting = { ...sighting(roleA), label: "canArchive" };

/** The seven fields a replayed row leaves for the reviewer, in the form's order. */
const KEYS: ReadonlyArray<SimulationField> = [
  "roles",
  "permissions",
  "subjectAttributes",
  "attributes",
  "relationships",
  "history",
  "signatures",
];

const rowRead = entryOf(
  decisionRecord({
    evaluationId: "ev-read",
    policy: hasPermission(read),
    subjectId: "carol",
    action: "read",
    resource: { id: "doc-1" },
  }),
);
const rowS = entryOf(decisionRecord({ evaluationId: "ev-s", policy: roleS }));
const orphan = entryOf(obligationRecord({ evaluationId: "ev-orphan" }));

/** The form a replay of `rowRead` fills in. */
const carolInput: SimulationInput = {
  subject: { id: "carol" },
  action: "read",
  resource: { id: "doc-1" },
};

type PolicyView =
  | Exclude<PolicyChoice, { readonly _tag: "Seeded" }>
  | {
      readonly _tag: "Seeded";
      readonly entry: TimelineEntry;
      readonly policy: Policy;
      readonly unseeded: ReadonlyArray<SimulationField>;
    };

const listed = (value: PolicySighting, index: number): PolicyView => ({
  _tag: "Listed",
  value,
  index,
});
const evictedOf = (value: PolicySighting): PolicyView => ({ _tag: "Evicted", value });
const seededOf = (entry: TimelineEntry, policy: Policy): PolicyView => ({
  _tag: "Seeded",
  entry,
  policy,
  unseeded: KEYS,
});
const empty: PolicyView = { _tag: "Empty" };

const zero = (policy: Policy): PolicySighting => ({
  policy,
  label: policyLabel(policy),
  count: 0,
  allows: 0,
  denies: 0,
  errors: 0,
  lastAt: undefined,
});

const start = (sightings: ReadonlyArray<PolicySighting>, seed?: TimelineEntry) =>
  seededChoice(sightings, seed).choice;

/** The choice as a host reads it, with a replayed row's fields named by their keys. */
const pc = (choice: SeededChoice): PolicyView => {
  const picked = policyChoice(choice);
  return picked._tag === "Seeded"
    ? {
        _tag: "Seeded",
        entry: picked.entry,
        policy: picked.policy,
        unseeded: picked.unseeded.map((field) => field.key),
      }
    : picked;
};

const menu = (
  options: ReadonlyArray<readonly [string, string]>,
  selected: string,
): PolicyMenu => ({
  options: options.map(([value, label]) => ({ value, label })),
  selected,
});
const seededEntry: readonly [string, string] = ["seeded", "from the replayed row"];
const evictedEntry = (sighting: PolicySighting): readonly [string, string] => [
  "evicted",
  `${sighting.label} — no longer in the log`,
];

/** The choice of row 15: sB was chosen, then the rail dropped it. */
const evictedBeyondRail = () =>
  withSightings(choose(start([named, sB]), roleB), [named]);

describe("pinning the head", () => {
  it("with no seed, the constructor pins the head of the rail", () => {
    const c = start([sA, sB]);
    assert.deepStrictEqual(pc(c), listed(sA, 0));
    assert.deepStrictEqual(pc(withSightings(c, [sC, sA, sB])), listed(sA, 1));
    assert.strictEqual(seededChoice([sA, sB]).input, undefined);
  });

  it(
    "an empty choice pins the first head it is given, and a new head does not move it",
    () => {
      const c = start([]);
      assert.deepStrictEqual(pc(c), empty);
      const first = withSightings(c, [sA]);
      assert.deepStrictEqual(pc(first), listed(sA, 0));
      assert.deepStrictEqual(pc(withSightings(first, [sB, sA])), listed(sA, 1));
    },
  );

  it("a replayed seed pins nothing and answers the row decoded", () => {
    const s = seededChoice([sA], rowRead);
    const expected = seededOf(rowRead, hasPermission(read));
    const grown = withSightings(s.choice, [sB, sA]);
    assert.deepStrictEqual(pc(s.choice), expected);
    assert.deepStrictEqual(pc(grown), expected);
    assert.strictEqual(s.choice.held, undefined);
    assert.strictEqual(grown.held, undefined);
    assert.deepStrictEqual(s.input, carolInput);
  });

  it("an orphan seed pins the head and answers no input", () => {
    const s = seededChoice([sA], orphan);
    assert.deepStrictEqual(pc(s.choice), listed(sA, 0));
    assert.deepStrictEqual(pc(withSightings(s.choice, [sB, sA])), listed(sA, 1));
    assert.strictEqual(s.input, undefined);
  });

  it("a held replayed policy pins nothing, and leaving it pins the head", () => {
    const c = start([], rowRead);
    const grown = withSightings(c, [sA]);
    assert.strictEqual(pc(grown)._tag, "Seeded");
    assert.strictEqual(grown.held, undefined);
    const left = seedFrom(withSightings(grown, [sB, sA]), undefined).choice;
    assert.deepStrictEqual(pc(left), listed(sB, 0));
  });

  it("leaving a replayed policy pins the head of that moment, not an earlier one", () => {
    const a1 = sighting(roleA);
    const a2 = sighting(roleA);
    const a3 = sighting(roleA);
    const c = withSightings(withSightings(start([a1], rowS), [a2]), [sC, a3]);
    assert.deepStrictEqual(pc(seedFrom(c, undefined).choice), listed(sC, 0));
  });

  it("seedFrom(undefined) drops the replayed policy, holding the head or nothing", () => {
    const withRail = seedFrom(start([sA], rowS), undefined).choice;
    const withNone = seedFrom(start([], rowS), undefined).choice;
    assert.deepStrictEqual(pc(withRail), listed(sA, 0));
    assert.deepStrictEqual(pc(withNone), empty);
  });

  it("choosing before the rail has any holds the choice, not the head", () => {
    const c = choose(start([]), roleA);
    assert.deepStrictEqual(pc(c), evictedOf(zero(roleA)));
    assert.deepStrictEqual(pc(withSightings(c, [sB, sA])), listed(sA, 1));
  });
});

describe("the seed a result is compared against", () => {
  it("seedOf is the replayed row while its policy is held", () => {
    const c = start([sA], rowRead);
    assert.strictEqual(seedOf(c), rowRead);
    assert.strictEqual(seededFrom(c), rowRead);
  });

  it("seedOf keeps an orphan row after another policy is chosen", () => {
    const c = choose(start([sA, sB], orphan), roleB);
    assert.strictEqual(seedOf(c), orphan);
    assert.strictEqual(seededFrom(c), orphan);
  });

  it("seedOf is nothing for a decision row walked away from", () => {
    const c = choose(start([sA], rowRead), roleA);
    assert.strictEqual(seedOf(c), undefined);
    assert.strictEqual(seededFrom(c), rowRead);
  });

  it("with no seed, seedOf and seededFrom are nothing", () => {
    for (const c of [start([sA]), seedFrom(start([sA], rowRead), undefined).choice]) {
      assert.strictEqual(seedOf(c), undefined);
      assert.strictEqual(seededFrom(c), undefined);
    }
  });
});

describe("the policy menu", () => {
  it("the menu of an empty choice is empty and selects nothing", () => {
    assert.deepStrictEqual(menuOf(start([])), { options: [], selected: "" });
  });

  it(
    "the menu lists each sighting by label under String(index) and selects the held one",
    () => {
      const c = start([named, sB]);
      const options: ReadonlyArray<readonly [string, string]> = [
        ["0", "canArchive"],
        ["1", sB.label],
      ];
      assert.deepStrictEqual(menuOf(c), menu(options, "0"));
      assert.deepStrictEqual(menuOf(choose(c, roleB)), menu(options, "1"));
    },
  );

  it("the menu leads with an evicted choice, labelled as no longer in the log", () => {
    assert.deepStrictEqual(
      menuOf(evictedBeyondRail()),
      menu([evictedEntry(sB), ["0", "canArchive"]], "evicted"),
    );
  });

  it("the menu leads with the replayed row while a replayed policy is held", () => {
    assert.deepStrictEqual(
      menuOf(start([named], rowS)),
      menu([seededEntry, ["0", "canArchive"]], "seeded"),
    );
  });

  it(
    "sightingAt 0 of a seeded or evicted menu is nothing, and 1 is the head of the rail",
    () => {
      const first = start([sA], rowS);
      const second = withSightings(choose(start([sA, sB]), roleB), [sA]);
      for (const c of [first, second]) {
        assert.strictEqual(sightingAt(c, 0), undefined);
        assert.strictEqual(sightingAt(c, 1), sA);
        assert.deepStrictEqual(pc(choose(c, sA.policy)), listed(sA, 0));
      }
    },
  );

  it(
    "sightingAt a position past the list, negative, fractional or NaN is nothing",
    () => {
      const c = start([sA, sB]);
      for (const position of [2, 5, -1, 0.5, Number.NaN]) {
        assert.strictEqual(sightingAt(c, position), undefined);
      }
    },
  );

  it("sightingAt names each rail entry after the lead, in the order of the menu", () => {
    const seeded = start([sA, sB], rowS);
    assert.strictEqual(sightingAt(seeded, 1), sA);
    assert.strictEqual(sightingAt(seeded, 2), sB);
    assert.strictEqual(sightingAt(seeded, 3), undefined);
    const rail = start([sA, sB]);
    assert.strictEqual(sightingAt(rail, 0), sA);
    assert.strictEqual(sightingAt(rail, 1), sB);
    assert.strictEqual(sightingAt(rail, 2), undefined);
  });

  it(
    "each option of the menu names the sighting sightingAt reads at its position",
    () => {
      const cases: ReadonlyArray<readonly [SeededChoice, number]> = [
        [start([sA, sB]), 2],
        [start([sA, sB], rowS), 3],
        [evictedBeyondRail(), 2],
        [start([]), 0],
      ];
      for (const [c, count] of cases) {
        const options = menuOf(c).options;
        assert.strictEqual(options.length, count);
        options.forEach(({ value }, index) => {
          const leads = value === "seeded" || value === "evicted";
          const sighting = leads ? undefined : c.sightings[Number(value)];
          assert.strictEqual(sightingAt(c, index), sighting);
        });
      }
    },
  );
});

describe("choosing a policy", () => {
  it("choosing an equal copy of the held policy returns the same choice", () => {
    const c = start([sA]);
    assert.strictEqual(choose(c, hasRole("a")), c);
  });

  it("choosing from the rail drops the replayed policy", () => {
    assert.deepStrictEqual(pc(choose(start([sA], rowRead), roleA)), listed(sA, 0));
  });

  it("choosing the held policy while a replayed policy is held drops it", () => {
    const c = seedFrom(start([sA]), rowRead).choice;
    const n = choose(c, roleA);
    assert.strictEqual(pc(c)._tag, "Seeded");
    assert.deepStrictEqual(pc(n), listed(sA, 0));
    assert.notStrictEqual(n, c);
  });

  it("a chosen policy keeps the label of the rail once the rail drops it", () => {
    const c = withSightings(choose(start([sB, named]), roleA), []);
    assert.deepStrictEqual(pc(c), evictedOf(named));
  });

  it("choosing a policy the rail does not list holds it as evicted", () => {
    assert.deepStrictEqual(pc(choose(start([sA]), roleZ)), evictedOf(zero(roleZ)));
  });

  it("the held policy follows a reordered rail", () => {
    const b = sighting(roleB);
    const a = sighting(roleA);
    const c = withSightings(choose(start([sA, sB]), roleB), [b, a]);
    assert.deepStrictEqual(pc(c), listed(b, 0));
  });

  it("the held policy follows the rail past a new head", () => {
    const head = sighting(roleC);
    const a = sighting(roleA);
    const b = sighting(roleB);
    const c = withSightings(choose(start([sA, sB]), roleB), [head, a, b]);
    assert.deepStrictEqual(pc(c), listed(b, 2));
  });

  it("choosing the evicted policy again keeps the evicted sighting", () => {
    const e = withSightings(choose(start([sA, sB]), roleB), [sA]);
    const again = pc(choose(seedFrom(e, rowRead).choice, roleB));
    assert.deepStrictEqual(again, evictedOf(sB));
    assert.strictEqual(again._tag === "Evicted" ? again.value : undefined, sB);
  });

  it(
    "withSightings with the same elements in a new array returns the same choice",
    () => {
      const c = start([sA, sB]);
      assert.strictEqual(withSightings(c, [sA, sB]), c);
    },
  );

  it("withSightings with one element changed keeps the held policy", () => {
    const c = start([sA, sB]);
    const n = withSightings(c, [sA, sC]);
    assert.notStrictEqual(n, c);
    assert.deepStrictEqual(pc(n), listed(sA, 0));
  });

  it("seedFrom the row a choice holds answers the same choice and the row decoded", () => {
    const replaying = start([sA], rowRead);
    const again = seedFrom(replaying, rowRead);
    assert.strictEqual(again.choice, replaying);
    assert.deepStrictEqual(again.input, carolInput);
    const orphaned = start([sA], orphan);
    assert.strictEqual(seedFrom(orphaned, orphan).choice, orphaned);
  });

  it("seedFrom(undefined) on a choice with no seed answers the same choice", () => {
    for (const c of [start([sA]), start([])]) {
      const left = seedFrom(c, undefined);
      assert.strictEqual(left.choice, c);
      assert.strictEqual(left.input, undefined);
    }
  });

  it("seedFrom another row, or the held row after a choice, answers a new seed", () => {
    const c = start([sA], rowRead);
    const other = seedFrom(c, rowS).choice;
    assert.deepStrictEqual(pc(other), seededOf(rowS, roleS));
    const walked = choose(c, roleA);
    const back = seedFrom(walked, rowRead);
    assert.notStrictEqual(back.choice, walked);
    assert.deepStrictEqual(pc(back.choice), seededOf(rowRead, hasPermission(read)));
    assert.deepStrictEqual(back.input, carolInput);
  });
});

describe("readings", () => {
  it("policyOf reads the replayed policy, the held policy, or nothing", () => {
    const replayed = policyOf(start([sA], rowRead));
    assert.isTrue(replayed !== undefined && Equal.equals(replayed, hasPermission(read)));
    assert.strictEqual(policyOf(start([sA])), sA.policy);
    assert.strictEqual(policyOf(start([])), undefined);
  });

  it("an orphan seeds no policy and answers no input", () => {
    const s = seededChoice([], orphan);
    assert.deepStrictEqual(pc(s.choice), empty);
    assert.strictEqual(s.input, undefined);
  });
});
