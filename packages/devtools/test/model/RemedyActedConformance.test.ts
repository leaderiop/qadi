/**
 * The remedy table agrees with the fixture history port on every case of a
 * closed product.
 *
 * Each case runs `remedyEdits` over a form and compares it with `@qadi/core`'s
 * `evaluate` over `fixturePortsLayer` for the same leaf, site and rows (`outcomeOf`
 * in `../remedyAgreement.ts`). Where core allows, the table offers nothing and skips
 * nothing; where core denies at a site with a usable resource id, the table offers
 * exactly one event row, and evaluating core again with that row added allows;
 * where core denies at a site with none, or fails for want of one, the table offers
 * nothing and says so. The product is every subject, event and resource id a row can
 * carry, as a lone row and after an unrelated one, over two leaves and four sites;
 * its size is asserted. A check the port refuses (a fixture row or a site subject id
 * its key cannot read) is its own case, skipped with the port's refusal while core
 * fails the read.
 */
import { assert, describe, it } from "@effect/vitest";
import { hasActed, resourceIdOf, thrownMessage } from "@qadi/core";
import type {
  ActedEventInput,
  Decision,
  EvaluationError,
  Policy,
  Resource,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { remedyEdits } from "../../src/model/Remedies.ts";
import type { RemedySweep } from "../../src/model/Remedies.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { asker, outcomeOf, SITES } from "../remedyAgreement.ts";

const SUBJECTS = ["alice", "bob"];
const EVENTS = ["approved", "reviewed"];
const RESOURCE_IDS = ["doc-1", "doc-2"];

const SINGLES = SUBJECTS.flatMap((subjectId) =>
  EVENTS.flatMap((event) =>
    RESOURCE_IDS.map((resourceId) => ({
      name: `${subjectId} ${event} ${resourceId}`,
      row: { subjectId, event, resourceId } satisfies ActedEventInput,
    })),
  ),
);

const DECOY: ActedEventInput = {
  subjectId: "alice",
  event: "reviewed",
  resourceId: "doc-1",
};

const LISTS: ReadonlyArray<{
  readonly name: string;
  readonly rows: ReadonlyArray<ActedEventInput> | undefined;
}> = [
  { name: "no history field", rows: undefined },
  { name: "an empty list", rows: [] },
  ...SINGLES.map(({ name, row }) => ({ name, rows: [row] })),
  ...SINGLES.map(({ name, row }) => ({
    name: `the decoy, then ${name}`,
    rows: [DECOY, row],
  })),
];

const LEAVES: ReadonlyArray<{ readonly name: string; readonly policy: Policy }> = [
  {
    name: "hasActed approved at scope Resource",
    policy: hasActed("approved", { scope: "Resource" }),
  },
  {
    name: "hasActed approved at scope Any",
    policy: hasActed("approved", { scope: "Any" }),
  },
];

const NO_RESOURCE_ID = [
  { requirement: "event approved", reason: "the check names no resource id" },
];

const gave = (sweep: RemedySweep): string =>
  `edits [${sweep.edits.map((e) => e.label).join(", ")}], ` +
  `skipped [${sweep.skipped.map((s) => `${s.requirement}: ${s.reason}`).join(", ")}]`;

/** The one line a case that disagrees prints, or `undefined` when it agrees. */
const mismatchOf = (
  leaf: (typeof LEAVES)[number],
  list: (typeof LISTS)[number],
  resource: Resource | undefined,
) =>
  Effect.gen(function* () {
    const input: SimulationInput = {
      subject: asker,
      ...(resource === undefined ? {} : { resource }),
      ...(list.rows === undefined ? {} : { history: list.rows }),
    };
    const sweep = remedyEdits(leaf.policy, input);
    const line = (outcome: string) =>
      `${leaf.name} | ${list.name} | core ${outcome} | remedies ${gave(sweep)}`;
    const skipsOnly = () =>
      sweep.edits.length === 0 &&
      JSON.stringify(sweep.skipped) === JSON.stringify(NO_RESOURCE_ID);
    const core = yield* outcomeOf(leaf.policy, asker, resource, {
      DecisionHistory: { answers: list.rows },
    });
    if (Result.isFailure(core)) {
      return core.failure._tag === "MissingResourceId" && skipsOnly()
        ? undefined
        : line(`Failed ${core.failure._tag}`);
    }
    if (core.success._tag === "Allow") {
      return sweep.edits.length === 0 && sweep.skipped.length === 0
        ? undefined
        : line("Allow");
    }
    if (resourceIdOf(resource) === undefined) {
      return skipsOnly() ? undefined : line("Deny");
    }
    const [edit] = sweep.edits;
    if (
      sweep.edits.length !== 1 ||
      edit === undefined ||
      edit.kind !== "AddEvent" ||
      edit.direction !== "Strengthen" ||
      sweep.skipped.length !== 0
    ) {
      return line("Deny");
    }
    const again = yield* outcomeOf(leaf.policy, asker, resource, {
      DecisionHistory: { answers: edit.apply(input).history },
    });
    return Result.isSuccess(again) && again.success._tag === "Allow"
      ? undefined
      : line("Deny, and the remedy left Deny");
  });

const agreeAt = (resource: Resource | undefined) =>
  Effect.gen(function* () {
    const mismatches: Array<string> = [];
    let compared = 0;
    for (const leaf of LEAVES) {
      for (const list of LISTS) {
        compared += 1;
        const found = yield* mismatchOf(leaf, list, resource);
        if (found !== undefined) mismatches.push(found);
      }
    }
    assert.strictEqual(compared, LEAVES.length * LISTS.length);
    assert.deepStrictEqual(mismatches, [], mismatches.join("\n"));
  });

describe("the remedy table and the fixture history port agree on every case", () => {
  it("the product holds 144 cases over four sites, two leaves and 18 lists", () => {
    assert.strictEqual(Object.keys(SITES).length, 4);
    assert.strictEqual(LEAVES.length, 2);
    assert.strictEqual(new Set(SINGLES.map((s) => s.name)).size, 8);
    assert.strictEqual(LISTS.length, 18);
    assert.strictEqual(Object.keys(SITES).length * LEAVES.length * LISTS.length, 144);
  });

  it.effect("at a site whose resource id is doc-1", () => agreeAt(SITES.withId));
  it.effect("at a site whose resource has no id", () => agreeAt(SITES.withoutId));
  it.effect("at a site whose resource id is not a string", () =>
    agreeAt(SITES.withNonStringId),
  );
  it.effect("at a site with no resource", () => agreeAt(SITES.withoutResource));
});

// `JSON.parse` returns `any`, which is what an untyped JavaScript caller hands
// over (no `as`); a symbol is the one value it cannot carry, so it is set on the
// parsed object afterwards.
const unkeyableRow = (json: string) => {
  const untyped = JSON.parse(json);
  untyped.subjectId = Symbol("alice");
  return untyped;
};

const unkeyableSubject = () => {
  const untyped = JSON.parse("{}");
  untyped.id = Symbol("alice");
  return untyped;
};

const refusalOf = (core: Result.Result<Decision, EvaluationError>) => {
  if (Result.isSuccess(core)) return assert.fail("core decided, not failed");
  if (core.failure._tag !== "DecisionHistoryUnavailable") {
    return assert.fail(core.failure._tag);
  }
  return core.failure;
};

describe("a check the history port refuses", () => {
  const leaf = hasActed("approved", { scope: "Any" });

  it.effect(
    "a fixture row it cannot key is skipped with its refusal and offered no row, \
while core fails the read",
    () =>
      Effect.gen(function* () {
        const rows = [unkeyableRow('{"event":"approved","resourceId":"doc-1"}')];
        const core = yield* outcomeOf(leaf, asker, SITES.withId, {
          DecisionHistory: { answers: rows },
        });
        const failure = refusalOf(core);
        const sweep = remedyEdits(leaf, {
          subject: asker,
          resource: SITES.withId,
          history: rows,
        });
        assert.deepStrictEqual(
          sweep.edits.map((e) => e.label),
          [],
        );
        assert.deepStrictEqual(sweep.skipped, [
          {
            requirement: "event approved",
            reason: `the history port refuses this check, so no added row would be \
answered: ${thrownMessage(failure.cause)}`,
          },
        ]);
      }),
  );

  it.effect(
    "a site whose subject id it cannot key is skipped with its refusal and offered no \
row, while core fails the read",
    () =>
      Effect.gen(function* () {
        const subject = unkeyableSubject();
        // An empty fixture, not the default port, which never reads the request.
        const core = yield* outcomeOf(leaf, subject, SITES.withId, {
          DecisionHistory: { answers: [] },
        });
        const failure = refusalOf(core);
        const sweep = remedyEdits(leaf, { subject, resource: SITES.withId });
        assert.deepStrictEqual(
          sweep.edits.map((e) => e.label),
          [],
        );
        assert.deepStrictEqual(sweep.skipped, [
          {
            requirement: "event approved",
            reason: `the history port refuses this check, so no added row would be \
answered: ${thrownMessage(failure.cause)}`,
          },
        ]);
      }),
  );
});
