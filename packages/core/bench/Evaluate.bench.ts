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
 * Eight workloads, chosen because each stresses a different part of the
 * evaluator rather than because they are realistic policies:
 *
 *   one node          the floor — how much of an evaluation is fixed overhead
 *   wide              `allOf` of 8, the shared-fold path
 *   deep              nesting 10 levels, the recursion path
 *   matcher-heavy     three refs, the only workload that reaches `resolveRef`
 *   field-heavy       `allOf` of 8 under `Intersection`, the only workload
 *                     that reaches `mergeFields`/`intersectFields` —
 *                     O(|a|·|b|) pairwise `compareFieldPaths`, on the same
 *                     per-node path §5a protects with a switch budget
 *   obligation-heavy  `allOf` of 8 distinct `Obliged` children, the only
 *                     workload that folds `unionObligations`'s linear
 *                     `.some(Equal.equals(...))` scan over several obligations
 *                     per node instead of the usual zero or one (CCR-QD-119)
 *   per element       `filter`/`decideSubjects` over 500 items, where §5a's
 *                     "once per element on top of that" actually happens —
 *                     both sites AGENTS.md names have a row here
 *   resolver miss     the port path, and the only workload that emits a
 *                     `qadi.attribute` span
 *
 * The layers are the deterministic ones, so nothing here measures I/O: no
 * attribute store, no relationship graph. That is deliberate — a benchmark whose
 * variance is dominated by a resolver would answer a different question, and the
 * resolvers are ports whose cost belongs to whoever implements them.
 *
 * **The resolver-miss workload is the exception, and it is deliberately
 * unrealistic.** Its resolver answers from a record synchronously, so the port
 * costs nothing at all — which makes the span and annotations that path emits
 * (CCR-QD-071) as large a fraction of the total as they can ever be. Against a
 * store that does any real work the fraction only shrinks, so this is an upper
 * bound rather than an estimate. Every other attribute workload here reads from
 * the *subject*, which asks no port and emits no span; without this one, nothing
 * would measure the port path at all.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { test } from "vitest";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { fromRoles } from "../src/AuthSubject.ts";
import { currentSubjectLayer } from "../src/CurrentSubject.ts";
import { CustomPredicateNone } from "../src/CustomPredicate.ts";
import { SignatureHistoryNone } from "../src/SignatureHistory.ts";
import { DecisionHistoryUnknown } from "../src/DecisionHistory.ts";
import { EvaluationIdLive } from "../src/EvaluationId.ts";
import { evaluate } from "../src/Evaluate.ts";
import { EvaluationServicesNone } from "../src/EvaluationServicesNone.ts";
import { eq, fieldMatch, gte, literal, neq, subject, subjectId } from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import { allOf, anyOf, hasAttribute, hasPermission, not, obliged } from "../src/Policy.ts";
import type { Policy } from "../src/Policy.ts";
import { filter } from "../src/Qadi.ts";
import { decideSubjects } from "../src/SubjectSet.ts";
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

const services = Layer.mergeAll(EvaluationServicesNone, currentSubjectLayer(alice));

/**
 * The same environment with an attribute resolver that actually answers.
 *
 * `alice` carries no `tier`, so `readAttribute` misses the subject and asks the
 * port — the path a subject hit never reaches.
 */
const resolving = Layer.mergeAll(
  Layer.succeed(AttributeResolver, {
    name: "record",
    resolve: (_subjectId, attribute: string) =>
      Effect.succeed(attribute === "tier" ? 5 : undefined),
  }),
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  currentSubjectLayer(alice),
  CustomPredicateNone,
  SignatureHistoryNone,
);

/**
 * Built once, outside the benchmarked function. `Effect.provide` constructs the
 * layer per execution, so provisioning inside the measured body would time layer
 * construction and call it evaluation — the same mistake the decision cache
 * tests had to assert against.
 */
const runtime = ManagedRuntime.make(services);
const resolvingRuntime = ManagedRuntime.make(resolving);

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

/**
 * Alternates the combinators so no single arm is measured twice, parametrized
 * by depth so the scaling sweep below and the fixed `deep` workload above it
 * share one construction (CO-03).
 */
const buildDeep = (levels: number): Policy =>
  Array.from({ length: levels }).reduce<Policy>(
    (inner, _, index) =>
      index % 2 === 0 ? allOf([inner, hasPermission(read)]) : anyOf([inner, not(hasPermission(write))]),
    hasPermission(read),
  );

/** Ten levels — one fixed point on `buildDeep`'s curve. */
const deep: Policy = buildDeep(10);

/** An `allOf` of `arms` `hasPermission` children, parametrized for the same reason. */
const buildWide = (arms: number): Policy =>
  allOf(Array.from({ length: arms }, () => hasPermission(read)));

/**
 * The workload that actually reaches `resolveRef`, which is the dispatcher
 * `Dispatch.bench.ts` measures. Everything above is built from `hasPermission`,
 * which carries no matcher and so dispatches through `evaluateNode` only — a
 * denominator taken from those alone would be answering about the wrong path.
 *
 * `eq(subject(...))`, `neq(literal(...))` and `eq(subjectId())` each resolve a
 * ref per evaluation — three in total. `fieldMatch("level", gte(2))` nests a
 * second dispatch inside the first, but `gte` compares its literal `number`
 * directly and never calls `resolveRef`, so it does not add a fourth.
 */
const matchers = allOf([
  hasAttribute("department", eq(subject("department"))),
  hasAttribute("department", neq(literal("oncology"))),
  hasAttribute("clearance", fieldMatch("level", gte(2))),
  hasAttribute("department", eq(subjectId())),
]);

/** Absent from the subject, so the port is asked. */
const missed = hasAttribute("tier", gte(3));

/**
 * Eight `hasPermission` arms, each restricted to a distinct, overlapping field
 * set, folded under `Intersection` — the only combination that reaches
 * `mergeFields`'s `Intersection` arm and, through it, `intersectFields`'s
 * O(|a|·|b|) pairwise `compareFieldPaths` over eight arrays instead of the
 * single-array case `wide` above exercises with no field restriction at all.
 */
const fieldHeavy = allOf(
  Array.from({ length: 8 }, (_, index) =>
    hasPermission(read, { fields: [`id`, `field${index}`, `shared.a`, `shared.b`] }),
  ),
  { fieldStrategy: "Intersection" },
);

/**
 * Eight `Obliged` arms, each carrying a distinct obligation, folded under
 * `AllOf` — the only workload that gives `stepAllOf`'s
 * `unionObligations(fold.obligations, trace.obligations)` fold more than
 * zero or one obligation to scan against. `unionObligations` dedupes with a
 * linear `.some(Equal.equals(...))` scan per incoming obligation, so this is
 * O(n²) in the obligation count per node — the same cost profile `fieldHeavy`
 * above measures for `mergeFields`/`intersectFields`, previously unmeasured
 * here (CCR-QD-119).
 */
const obligationHeavy = allOf(
  Array.from({ length: 8 }, (_, index) =>
    obliged(obligation(`log-${index}`, { field: `value${index}` }), hasPermission(read)),
  ),
);

const items = Array.from({ length: 500 }, (_, index) => ({
  id: `doc-${index}`,
  ownerId: index % 2 === 0 ? "alice" : "bob",
}));

const subjects = Array.from({ length: 500 }, (_, index) =>
  fromRoles({ id: `subject-${index}`, roles: index % 2 === 0 ? [editor] : [] }),
);

const options = { time: 1000, warmupTime: 300 };

test("evaluate", async ({ bench }) => {
  await bench.compare(
    bench("one node", () => run(one)),
    bench("wide — allOf of 8", () => run(wide)),
    bench("deep — 10 levels", () => run(deep)),
    bench("matcher-heavy — 3 refs", () => run(matchers)),
    bench("field-heavy — allOf of 8 under Intersection", () => run(fieldHeavy)),
    bench("obligation-heavy — allOf of 8 distinct obligations", () => run(obligationHeavy)),
    bench("resolver miss — one port call", () => {
      resolvingRuntime.runSync(evaluate(missed));
    }),
    options,
  );
});

test("filter — 500 items", async ({ bench }) => {
  await bench.compare(
    bench("hasPermission", () => {
      runtime.runSync(filter(one, items));
    }),
    options,
  );
});

test("decideSubjects — 500 subjects", async ({ bench }) => {
  await bench.compare(
    bench("hasPermission", () => {
      runtime.runSync(decideSubjects(one, subjects));
    }),
    options,
  );
});

/**
 * **CO-03: a scaling curve, not one fixed point.** Every workload above is
 * exactly one shape — `deep` is exactly 10 levels, `wide` is exactly 8 arms —
 * so none of them says how cost grows with policy depth or width past that
 * single measured point. The expected shape is O(nodes visited) per
 * evaluation; these two sweeps make that a checked claim instead of an
 * assumption; a future change that made either scale worse than linear moves
 * a number here instead of going unnoticed.
 */
test("evaluate — depth scaling", async ({ bench }) => {
  await bench.compare(
    bench("depth 5", () => run(buildDeep(5))),
    bench("depth 10", () => run(buildDeep(10))),
    bench("depth 20", () => run(buildDeep(20))),
    bench("depth 40", () => run(buildDeep(40))),
    options,
  );
});

test("evaluate — width scaling", async ({ bench }) => {
  await bench.compare(
    bench("width 4", () => run(buildWide(4))),
    bench("width 8", () => run(buildWide(8))),
    bench("width 16", () => run(buildWide(16))),
    bench("width 32", () => run(buildWide(32))),
    options,
  );
});

/**
 * **SM-02: the concurrent path this library ships, actually measured.**
 * Every workload above runs at `EvaluateOptions`'s sequential default; ADR-QD-026
 * advertises a round-trip win under concurrency and nothing here checked it.
 * `wide`'s `allOf` fans its 8 children out, and `filter`'s 500 items fan out
 * across the array — the two "an item's fate does not depend on which
 * finished first" sites AGENTS.md §5a and this file's own top comment both
 * name. `decideSubjects` is deliberately excluded: its cross-subject fan-out
 * is sequential unconditionally (`SubjectSet.ts`'s own doc comment), so
 * `options.concurrency` cannot change what is measured there.
 */
test("evaluate — wide, concurrency", async ({ bench }) => {
  await bench.compare(
    bench("sequential (default)", () => run(wide)),
    bench("concurrency: unbounded", () => {
      runtime.runSync(evaluate(wide, { concurrency: "unbounded" }));
    }),
    options,
  );
});

test("filter — 500 items, concurrency", async ({ bench }) => {
  await bench.compare(
    bench("sequential (default)", () => {
      runtime.runSync(filter(one, items));
    }),
    bench("concurrency: unbounded", () => {
      runtime.runSync(filter(one, items, { concurrency: "unbounded" }));
    }),
    options,
  );
});
