/**
 * The remedy table agrees with the fixture signature port on every case of a
 * closed product.
 *
 * Each case runs `remedyEdits` over a form and compares it with `@qadi/core`'s
 * `evaluate` over `fixturePortsLayer` for the same leaf, site and rows (`outcomeOf`
 * in `../remedyAgreement.ts`). Where core allows, the table offers nothing and skips
 * nothing; where core denies, the table offers exactly one signature row, and
 * evaluating core again with that row added allows; where core fails for want of a
 * resource id, the table offers nothing and says so. The product is every subject,
 * resource id, meaning and signer role a row can carry, as a lone row and after an
 * unrelated one, over four leaves and four sites; its size is asserted. A check the
 * port refuses (a fixture row or a site subject id its key cannot read) is its own
 * case, skipped with the port's refusal while core fails the read.
 */
import { assert, describe, it } from "@effect/vitest";
import { hasSignature, thrownMessage } from "@qadi/core";
import type {
  Decision,
  EvaluationError,
  Policy,
  Resource,
  SignatureInput,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { remedyEdits } from "../../src/model/Remedies.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import {
  asker,
  gave,
  outcomeOf,
  SITES,
  unkeyableRow,
  unkeyableSubject,
} from "../remedyAgreement.ts";

const SUBJECTS = ["alice", "bob"];
const RESOURCE_IDS = [undefined, "doc-1", "doc-2"];
const MEANINGS = ["approved", "reviewed"];
const ROLES = [undefined, "approver", "other"];

const SINGLES = SUBJECTS.flatMap((subjectId) =>
  RESOURCE_IDS.flatMap((resourceId) =>
    MEANINGS.flatMap((meaning) =>
      ROLES.map((signerRole) => ({
        name: [
          subjectId,
          meaning,
          resourceId ?? "subject-wide",
          signerRole ?? "no role",
        ].join(" "),
        row: {
          subjectId,
          meaning,
          ...(resourceId === undefined ? {} : { resourceId }),
          ...(signerRole === undefined ? {} : { signerRole }),
        } satisfies SignatureInput,
      })),
    ),
  ),
);

const DECOY: SignatureInput = {
  subjectId: "alice",
  meaning: "reviewed",
  resourceId: "doc-1",
};

const LISTS: ReadonlyArray<{
  readonly name: string;
  readonly rows: ReadonlyArray<SignatureInput> | undefined;
}> = [
  { name: "no signatures field", rows: undefined },
  { name: "an empty list", rows: [] },
  ...SINGLES.map(({ name, row }) => ({ name, rows: [row] })),
  ...SINGLES.map(({ name, row }) => ({
    name: `the decoy, then ${name}`,
    rows: [DECOY, row],
  })),
];

const LEAVES: ReadonlyArray<{ readonly name: string; readonly policy: Policy }> = (
  ["Resource", "Any"] as const
).flatMap((scope) => [
  {
    name: `hasSignature approved at scope ${scope}`,
    policy: hasSignature("approved", { scope }),
  },
  {
    name: `hasSignature approved at scope ${scope} as approver`,
    policy: hasSignature("approved", { scope, signerRole: "approver" }),
  },
]);

const NO_RESOURCE_ID = [
  { requirement: "signature approved", reason: "the check names no resource id" },
];

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
      ...(list.rows === undefined ? {} : { signatures: list.rows }),
    };
    const sweep = remedyEdits(leaf.policy, input);
    const line = (outcome: string) =>
      `${leaf.name} | ${list.name} | core ${outcome} | remedies ${gave(sweep)}`;
    const core = yield* outcomeOf(leaf.policy, asker, resource, {
      SignatureHistory: { answers: list.rows },
    });
    if (Result.isFailure(core)) {
      return core.failure._tag === "MissingResourceId" &&
        sweep.edits.length === 0 &&
        JSON.stringify(sweep.skipped) === JSON.stringify(NO_RESOURCE_ID)
        ? undefined
        : line(`Failed ${core.failure._tag}`);
    }
    if (core.success._tag === "Allow") {
      return sweep.edits.length === 0 && sweep.skipped.length === 0
        ? undefined
        : line("Allow");
    }
    const [edit] = sweep.edits;
    if (
      sweep.edits.length !== 1 ||
      edit === undefined ||
      edit.kind !== "AddSignature" ||
      edit.direction !== "Strengthen" ||
      sweep.skipped.length !== 0
    ) {
      return line("Deny");
    }
    const again = yield* outcomeOf(leaf.policy, asker, resource, {
      SignatureHistory: { answers: edit.apply(input).signatures },
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

describe("the remedy table and the fixture signature port agree on every case", () => {
  it("the product holds 1184 cases over four sites, four leaves and 74 lists", () => {
    assert.strictEqual(Object.keys(SITES).length, 4);
    assert.strictEqual(LEAVES.length, 4);
    assert.strictEqual(new Set(SINGLES.map((s) => s.name)).size, 36);
    assert.strictEqual(LISTS.length, 74);
    assert.strictEqual(Object.keys(SITES).length * LEAVES.length * LISTS.length, 1184);
  });

  it.effect("at a site whose resource id is doc-1", () => agreeAt(SITES.withId));
  it.effect("at a site whose resource has no id", () => agreeAt(SITES.withoutId));
  it.effect("at a site whose resource id is not a string", () =>
    agreeAt(SITES.withNonStringId),
  );
  it.effect("at a site with no resource", () => agreeAt(SITES.withoutResource));
});

const refusalOf = (core: Result.Result<Decision, EvaluationError>) => {
  if (Result.isSuccess(core)) return assert.fail("core decided, not failed");
  if (core.failure._tag !== "SignatureHistoryUnavailable") {
    return assert.fail(core.failure._tag);
  }
  return core.failure;
};

describe("a check the signature port refuses", () => {
  const leaf = hasSignature("approved", { scope: "Any" });

  it.effect(
    "a fixture row it cannot key is skipped with its refusal and offered no row, \
while core fails the read",
    () =>
      Effect.gen(function* () {
        const rows = [unkeyableRow('{"meaning":"approved"}')];
        const core = yield* outcomeOf(leaf, asker, SITES.withId, {
          SignatureHistory: { answers: rows },
        });
        const failure = refusalOf(core);
        const sweep = remedyEdits(leaf, {
          subject: asker,
          resource: SITES.withId,
          signatures: rows,
        });
        assert.deepStrictEqual(
          sweep.edits.map((e) => e.label),
          [],
        );
        assert.deepStrictEqual(sweep.skipped, [
          {
            requirement: "signature approved",
            reason: `the signature port refuses this check, so no added row would be \
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
          SignatureHistory: { answers: [] },
        });
        const failure = refusalOf(core);
        const sweep = remedyEdits(leaf, { subject, resource: SITES.withId });
        assert.deepStrictEqual(
          sweep.edits.map((e) => e.label),
          [],
        );
        assert.deepStrictEqual(sweep.skipped, [
          {
            requirement: "signature approved",
            reason: `the signature port refuses this check, so no added row would be \
answered: ${thrownMessage(failure.cause)}`,
          },
        ]);
      }),
  );
});
