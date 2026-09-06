import { type DataTable, decodeHashes } from "@effect-cucumber/gherkin";
import { defineSteps } from "@effect-cucumber/vitest";
import * as Schema from "effect/Schema";
import type { Combining, Policy, Rule } from "@qadi/core";
import { allOf, denyWhen, eq, hasResourceAttribute, hasRole, permitWhen, rules, subjectId } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

/** "the resource's owner is me" — the archetypal relational rule.
 *
 * Duplicated from `OwnershipWhenSteps.ts` rather than imported: the rule
 * mini-language below is this file's own small concern, and coupling it to
 * the ownership Feature's module would be the wrong dependency direction.
 */
const ownership = (): Policy => hasResourceAttribute("owner", eq(subjectId()));

/**
 * The condition mini-language the feature file writes in.
 *
 * Deliberately small. A rule table is *data* an operator maintains, so the
 * scenarios read as rows rather than as a tree, and the condition column has to
 * stay short enough to be read at a glance.
 */
const condition = (text: string): Policy => {
  const [head, ...rest] = text.trim().split(/\s+/);
  switch (head) {
    case "role":
      return hasRole(rest.join(" "));
    case "owner":
      return ownership();
    // `allOf([])` allows vacuously, which is the catch-all row. There is no
    // `always()` variant, and the awkwardness falls on the widening side.
    case "always":
      return allOf([]);
    default:
      throw new Error(`unknown rule condition: ${text}`);
  }
};

const RuleRow = Schema.Struct({ effect: Schema.String, condition: Schema.String });

const toRules = (rows: ReadonlyArray<typeof RuleRow.Type>): ReadonlyArray<Rule> =>
  rows.map((row) =>
    row.effect === "deny" ? denyWhen(condition(row.condition)) : permitWhen(condition(row.condition)),
  );

const COMBINING: Readonly<Record<string, Combining>> = {
  FirstApplicable: "FirstApplicable",
  DenyOverrides: "DenyOverrides",
  PermitOverrides: "PermitOverrides",
};

const combiningNamed = (name: string): Combining => {
  const found = COMBINING[name];
  if (found === undefined) throw new Error(`unknown combining algorithm: ${name}`);
  return found;
};

export const ruleTableWhenSteps = defineSteps<World>(({ When }) => {
  When("the rule table is evaluated", function* (table: DataTable) {
    const rows = yield* decodeHashes(RuleRow)(table);
    yield* run(rules(toRules(rows)));
  });

  When("the rule table is evaluated with {string}", function* (combining: string, table: DataTable) {
    const rows = yield* decodeHashes(RuleRow)(table);
    yield* run(rules(toRules(rows), { combining: combiningNamed(combining) }));
  });

  When("the empty rule table is evaluated", function* () {
    // `allOf([])` allows vacuously; a table emptied by an administrator must not.
    yield* run(rules([]));
  });
});
