/**
 * What a whole evaluation costs, so a dispatch measurement can be put in
 * proportion.
 *
 * `Dispatch.bench.ts` compares `switch` against `Match` for one dispatcher. On
 * its own that ratio decides nothing: if dispatch is a small fraction of an
 * evaluation, then even a large relative regression there is invisible to a
 * caller, and AGENTS.md §5a's exception is not worth the words it takes to
 * describe. This file supplies the denominator.
 *
 * Five workloads, chosen because each stresses a different part of the evaluator
 * rather than because they are realistic policies:
 *
 *   one node       the floor — how much of an evaluation is fixed overhead
 *   wide           `allOf` of 8, the shared-fold path
 *   deep           nesting 10 levels, the recursion path
 *   matcher-heavy  four refs, the only workload that reaches `resolveRef`
 *   per element    `filter` over 500 items, where §5a's "once per element on top
 *                  of that" actually happens
 *
 * The layers are the deterministic ones, so nothing here measures I/O: no
 * attribute store, no relationship graph. That is deliberate — a benchmark whose
 * variance is dominated by a resolver would answer a different question, and the
 * resolvers are ports whose cost belongs to whoever implements them.
 */
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { bench, describe } from "vitest";
import { AttributeResolverNone } from "../src/AttributeResolver.ts";
import { fromRoles } from "../src/AuthSubject.ts";
import { currentSubjectLayer } from "../src/CurrentSubject.ts";
import { DecisionHistoryUnknown } from "../src/DecisionHistory.ts";
import { EvaluationIdLive } from "../src/EvaluationId.ts";
import { evaluate } from "../src/Evaluate.ts";
import { eq, fieldMatch, gte, literal, neq, subject, subjectId } from "../src/Matcher.ts";
import { permission } from "../src/Permission.ts";
import { allOf, anyOf, hasAttribute, hasPermission, not } from "../src/Policy.ts";
import type { Policy } from "../src/Policy.ts";
import { filter } from "../src/Qadi.ts";
// `RelationshipResolver.ts` used to contain literal NUL bytes as a key
// separator, which made `grep` treat it as binary and find nothing in it — the
// finding that made gate 9 read files with `readFileSync` rather than shelling
// out (CCR-QD-034). The NUL bytes are gone (see check-api-surface.mjs's
// `exportsOf`), but the `readFileSync` choice there stands regardless.
import { RelationshipResolverNever } from "../src/RelationshipResolver.ts";
import { role } from "../src/Role.ts";

const read = permission("document", "read");
const write = permission("document", "write");

const editor = role({ name: "editor", permissions: [read] });
const alice = fromRoles({
  id: "alice",
  roles: [editor],
  // Present, so the matchers resolve rather than short-circuiting on an absent
  // attribute — a denial that skips the work is not the path being measured.
  attributes: { department: "cardiology", clearance: { level: 3 } },
});

const services = Layer.mergeAll(
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  currentSubjectLayer(alice),
);

/**
 * Built once, outside the benchmarked function. `Effect.provide` constructs the
 * layer per execution, so provisioning inside the measured body would time layer
 * construction and call it evaluation — the same mistake the decision cache
 * tests had to assert against.
 */
const runtime = ManagedRuntime.make(services);

const run = (policy: Policy): void => {
  runtime.runSync(evaluate(policy));
};

// --- workloads -------------------------------------------------------------

const one = hasPermission(read);

const wide = allOf([
  hasPermission(read),
  hasPermission(read),
  hasPermission(read),
  hasPermission(read),
  hasPermission(read),
  hasPermission(read),
  hasPermission(read),
  hasPermission(read),
]);

/** Ten levels, alternating the combinators so no single arm is measured twice. */
const deep: Policy = Array.from({ length: 10 }).reduce<Policy>(
  (inner, _, index) =>
    index % 2 === 0 ? allOf([inner, hasPermission(read)]) : anyOf([inner, not(hasPermission(write))]),
  hasPermission(read),
);

/**
 * The workload that actually reaches `resolveRef`, which is the dispatcher
 * `Dispatch.bench.ts` measures. Everything above is built from `hasPermission`,
 * which carries no matcher and so dispatches through `evaluateNode` only — a
 * denominator taken from those alone would be answering about the wrong path.
 *
 * `eq(subject(...))` and `dominates(...)` each resolve a ref per evaluation, and
 * `fieldMatch` nests a second dispatch inside the first.
 */
const matchers = allOf([
  hasAttribute("department", eq(subject("department"))),
  hasAttribute("department", neq(literal("oncology"))),
  hasAttribute("clearance", fieldMatch("level", gte(2))),
  hasAttribute("department", eq(subjectId())),
]);

const items = Array.from({ length: 500 }, (_, index) => ({
  id: `doc-${index}`,
  ownerId: index % 2 === 0 ? "alice" : "bob",
}));

const options = { time: 1000, warmupTime: 300 };

describe("evaluate", () => {
  bench("one node", () => run(one), options);
  bench("wide — allOf of 8", () => run(wide), options);
  bench("deep — 10 levels", () => run(deep), options);
  bench("matcher-heavy — 4 refs", () => run(matchers), options);
});

describe("filter — 500 items", () => {
  bench("hasPermission", () => {
    runtime.runSync(filter(one, items));
  }, options);
});
