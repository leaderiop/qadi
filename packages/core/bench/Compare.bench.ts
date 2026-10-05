/**
 * What one comparison costs, in the two interpreters that run one per node and
 * per row: `evaluateMatcher` against a resolved value, and `evaluatePredicate`
 * against a row.
 *
 * `Evaluate.bench.ts` measures a whole evaluation, where a matcher is one node
 * among many and its cost is diluted by everything around it. This file isolates
 * the leaf, so a change to how a comparison is decided — `Compare.ts`'s verdicts,
 * and `judgeMatcher` hosting the budgeted switch (ARCH-08, D-08-c) — is measured
 * where it lands rather than inferred from the end-to-end figure.
 *
 * Each iteration runs the matcher over a fixed list of values covering every
 * outcome (held, not held, absent, wrong type, non-finite), so no single branch
 * is the only one timed.
 */
import { test } from "vitest";
import { fromRoles } from "../src/AuthSubject.ts";
import { eq, evaluateMatcher, gte, literal, neq, someMatch, subject } from "../src/Matcher.ts";
import type { Matcher, MatcherContext } from "../src/Matcher.ts";
import { evaluatePredicate } from "../src/Predicate.ts";
import type { Predicate } from "../src/Predicate.ts";

const alice = fromRoles({ id: "alice", roles: [], attributes: { tenantId: "t-1" } });

const context: MatcherContext = {
  subject: alice.attributes,
  subjectId: alice.id,
  resource: undefined,
  action: undefined,
};

/** One value of each outcome class a leaf can be handed. */
const VALUES: ReadonlyArray<unknown> = [
  3,
  5,
  0,
  "t-1",
  "x",
  undefined,
  null,
  Number.POSITIVE_INFINITY,
  ["red", "blue"],
  ["green"],
];

const runOver = (matcher: Matcher): void => {
  for (const value of VALUES) evaluateMatcher(matcher, value, context);
};

const atLeast = gte(3);
const sameTenant = eq(subject("tenantId"));
const notX = neq(literal("x"));
const someRed = someMatch(eq(literal("red")));

/** A three-leaf conjunction, the shape `toPredicate` emits for a tenancy-plus-range policy. */
const conjunction: Predicate = {
  _tag: "And",
  predicates: [
    { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
    { _tag: "Compare", column: "level", op: "Gte", value: 3 },
    { _tag: "MemberOf", column: "tag", values: ["red", "blue"] },
  ],
};

/** Twelve rows: every leaf both admits and denies some, with absent and non-finite cells among them. */
const ROWS: ReadonlyArray<Readonly<Record<string, unknown>>> = Array.from({ length: 12 }, (_, index) => ({
  tenantId: index % 3 === 0 ? "t-2" : "t-1",
  level: index % 4 === 0 ? Number.POSITIVE_INFINITY : index % 5 === 0 ? undefined : index,
  tag: index % 2 === 0 ? "red" : "green",
}));

const options = { time: 1000, warmupTime: 300 };

test("evaluateMatcher — per leaf, over 10 values", async ({ bench }) => {
  await bench.compare(
    bench("gte(3)", () => runOver(atLeast)),
    bench('eq(subject("tenantId"))', () => runOver(sameTenant)),
    bench('neq(literal("x"))', () => runOver(notX)),
    bench('someMatch(eq(literal("red")))', () => runOver(someRed)),
    options,
  );
});

test("evaluatePredicate — 3-leaf And, over 12 rows", async ({ bench }) => {
  await bench("3-leaf And × 12 rows", () => {
    for (const row of ROWS) evaluatePredicate(conjunction, row);
  }).run(options);
});
