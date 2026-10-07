/**
 * What a whole-tree fold costs, off the evaluate path.
 *
 * `Evaluate.bench.ts` measures an evaluation. The folds measured here are not on
 * the request path except `policyDepth` on a memo miss (`buildDeep` builds a
 * fresh policy per iteration, which is why `Evaluate.bench.ts`'s depth sweep
 * already re-runs it) and `referencesAction`, which ARCH-17 deliberately leaves
 * on the array form. So this file exists for the other consumers that moved to
 * the case form (`foldPolicyCases` and its twins): `policyDepth`, `simplify`,
 * `explain` and `renderExplanation`, on the shapes that stress them — a deep
 * mixed tree, a tree made only of single-child wrappers, and a small rule table.
 *
 * Kept apart from `Evaluate.bench.ts` because a regression here is read
 * differently: these are admin-screen and tooling costs, recorded in ADR-QD-090's
 * ARCH-17 amendment rather than gated on.
 */
import { test } from "vitest";
import { explain, renderExplanation } from "../src/Explanation.ts";
import { eq, fieldMatch, gte, referencesAction, subject } from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import {
  allOf,
  anyOf,
  denyWhen,
  hasPermission,
  labeled,
  not,
  obliged,
  permitWhen,
  policyDepth,
  rules,
} from "../src/Policy.ts";
import type { Policy } from "../src/Policy.ts";
import { simplify } from "../src/Simplify.ts";

const read = permission("document", "read");
const write = permission("document", "write");

const buildDeep = (levels: number): Policy =>
  Array.from({ length: levels }).reduce<Policy>(
    (inner, _, index) =>
      index % 2 === 0 ? allOf([inner, hasPermission(read)]) : anyOf([inner, not(hasPermission(write))]),
    hasPermission(read),
  );

const wrapperHeavy: Policy = Array.from({ length: 10 }).reduce<Policy>(
  (inner, _, index) =>
    index % 3 === 0
      ? labeled(`level-${index}`, inner)
      : index % 3 === 1
        ? not(inner)
        : obliged(obligation(`duty-${index}`), inner),
  hasPermission(read),
);

const table: Policy = rules([
  permitWhen(hasPermission(read)),
  denyWhen(hasPermission(write)),
  permitWhen(allOf([hasPermission(read), hasPermission(write)])),
]);

const deep10 = buildDeep(10);
const deep40 = buildDeep(40);
const deep40Explained = explain(deep40);
const wrapperExplained = explain(wrapperHeavy);
const tableExplained = explain(table);

const options = { time: 1000, warmupTime: 300 };

test("policyDepth — a fresh policy per iteration, so the memo always misses", async ({ bench }) => {
  await bench.compare(
    bench("depth 10", () => policyDepth(buildDeep(10))),
    bench("depth 40", () => policyDepth(buildDeep(40))),
    options,
  );
});

test("simplify", async ({ bench }) => {
  await bench.compare(
    bench("deep 10", () => simplify(deep10)),
    bench("deep 40", () => simplify(deep40)),
    bench("wrapper-heavy — 10 nested", () => simplify(wrapperHeavy)),
    bench("rules — 3 rows", () => simplify(table)),
    options,
  );
});

test("explain", async ({ bench }) => {
  await bench.compare(
    bench("deep 10", () => explain(deep10)),
    bench("deep 40", () => explain(deep40)),
    bench("wrapper-heavy — 10 nested", () => explain(wrapperHeavy)),
    bench("rules — 3 rows", () => explain(table)),
    options,
  );
});

test("renderExplanation", async ({ bench }) => {
  await bench.compare(
    bench("deep 40", () => renderExplanation(deep40Explained)),
    bench("wrapper-heavy — 10 nested", () => renderExplanation(wrapperExplained)),
    bench("rules — 3 rows", () => renderExplanation(tableExplained)),
    options,
  );
});

/**
 * The array-form control: `referencesAction` stays on `foldMatcher`
 * (ARCH-17 D-17-d), and is the one fold here that evaluate reaches per node.
 */
test("referencesAction — the array form, left in place", async ({ bench }) => {
  await bench.compare(
    bench("leaf: eq", () => referencesAction(eq(subject("x")))),
    bench("one wrapper: fieldMatch", () => referencesAction(fieldMatch("level", gte(2)))),
    options,
  );
});
