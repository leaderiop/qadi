import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Tracer from "effect/Tracer";
import * as FastCheck from "fast-check";
import { AttributeResolver, AttributeResolverNone } from "../src/AttributeResolver.ts";
import type { AuthSubject } from "../src/AuthSubject.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { CurrentSubject, currentSubjectLayer } from "../src/CurrentSubject.ts";
import { CustomPredicate, CustomPredicateNone } from "../src/CustomPredicate.ts";
import { DecisionHistory, DecisionHistoryUnknown } from "../src/DecisionHistory.ts";
import { EvaluationId, evaluationIdSequential } from "../src/EvaluationId.ts";
import {
  RelationshipResolver,
  RelationshipResolverNever,
} from "../src/RelationshipResolver.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { SignatureHistory, SignatureHistoryNone } from "../src/SignatureHistory.ts";

export type QadiServices =
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
  | DecisionHistory
  | EvaluationId
  | CustomPredicate
  | SignatureHistory;

/**
 * A fully-wired evaluation environment with deterministic identifiers.
 *
 * Defaults fail closed: no attribute resolution, no relationships.
 *
 * Structurally the same Layer.mergeAll body as `@qadi/testing`'s
 * `qadiTestLayer`/`qadiReviewLayer` (`QadiTestLayer.ts`, `QadiReviewLayer.ts`),
 * hand-copied here rather than imported: `@qadi/core` cannot depend on
 * `@qadi/testing`, which depends on it. If `EvaluationServices` gains a
 * service or a default changes, both copies need the edit — there is no
 * gate that catches one going stale without the other.
 */
export const testLayer = (
  subject: AuthSubject,
  overrides?: {
    readonly attributes?: Layer.Layer<AttributeResolver>;
    readonly relationships?: Layer.Layer<RelationshipResolver>;
    readonly history?: Layer.Layer<DecisionHistory>;
    readonly customPredicate?: Layer.Layer<CustomPredicate>;
    readonly signatureHistory?: Layer.Layer<SignatureHistory>;
  },
): Layer.Layer<QadiServices> =>
  Layer.mergeAll(
    currentSubjectLayer(subject),
    overrides?.attributes ?? AttributeResolverNone,
    overrides?.relationships ?? RelationshipResolverNever,
    overrides?.history ?? DecisionHistoryUnknown,
    evaluationIdSequential(),
    overrides?.customPredicate ?? CustomPredicateNone,
    overrides?.signatureHistory ?? SignatureHistoryNone,
  );

/**
 * The same environment with **no** current subject.
 *
 * Subject-set evaluation supplies its own per element, so requiring one here
 * would let a test pass while the public signature asked for a value that could
 * not affect any answer (ADR-QD-022).
 */
export const subjectSetLayer = (overrides?: {
  readonly attributes?: Layer.Layer<AttributeResolver>;
  readonly relationships?: Layer.Layer<RelationshipResolver>;
  readonly history?: Layer.Layer<DecisionHistory>;
  readonly customPredicate?: Layer.Layer<CustomPredicate>;
  readonly signatureHistory?: Layer.Layer<SignatureHistory>;
}): Layer.Layer<Exclude<QadiServices, CurrentSubject>> =>
  Layer.mergeAll(
    overrides?.attributes ?? AttributeResolverNone,
    overrides?.relationships ?? RelationshipResolverNever,
    overrides?.history ?? DecisionHistoryUnknown,
    evaluationIdSequential(),
    overrides?.customPredicate ?? CustomPredicateNone,
    overrides?.signatureHistory ?? SignatureHistoryNone,
  );

/**
 * Same shape as `@qadi/testing`'s `Fixtures.ts` `subjectWith`, and for the
 * same circular-import reason `testLayer` above cross-references — but the
 * default `id` deliberately differs (`"u1"` here, `"test-subject"` there).
 * Neither default is wrong on its own; a test relying on the specific string
 * rather than passing `id` explicitly is the thing to fix if the two ever
 * need to agree.
 */
export const subjectWith = (config: {
  readonly id?: string;
  readonly roles?: ReadonlyArray<string>;
  readonly permissions?: ReadonlyArray<`${string}:${string}`>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}): AuthSubject =>
  makeSubject({
    id: config.id ?? "u1",
    roles: config.roles ?? [],
    permissions: config.permissions ?? [],
    attributes: config.attributes ?? {},
  });

/**
 * A `Tracer` that replaces whatever is ambient and records every span it
 * sees. Provide it anywhere the evaluations to be watched will run, then read
 * `spans` afterward.
 *
 * The identical implementation `@qadi/testing`'s `CollectingTracer.ts`
 * exports, hand-copied here rather than imported for the same
 * circular-import reason `testLayer`/`subjectWith` above cross-reference:
 * `@qadi/core` cannot depend on `@qadi/testing`, which depends on it. Both
 * copies are two lines of body; a divergence between them would show up as a
 * span this file's own tests stopped seeing, not as a silent drift.
 */
export const collectingTracer = (spans: Array<Tracer.Span>): Layer.Layer<never> =>
  Layer.succeed(
    Tracer.Tracer,
    Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options);
        spans.push(span);
        return span;
      },
    }),
  );

/**
 * Gives an effect its own `MetricRegistry` for the duration of a test.
 *
 * The `CurrentMetricAttributes` override alongside it is not optional:
 * `effect/Metric`'s `hook` caches an untagged metric's resolved hooks on the
 * metric object itself, for the process's lifetime, the first time it is
 * touched with no ambient `CurrentMetricAttributes` set — the fast path a
 * real deployment (one registry, one process) wants. Every metric this test
 * suite touches is "untagged" by that check even where it carries its own
 * fixed attributes (`Metric.withAttributes`), since the check looks at the
 * ambient context, not at the metric's own attributes. Left unset, the first
 * test to touch a given metric would pin it to that test's registry for
 * every test after.
 */
export const isolatedMetrics = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provideService(Metric.MetricRegistry, new Map()),
    Effect.provideService(Metric.CurrentMetricAttributes, { test: "isolated" }),
  );

/**
 * How many scheduler turns {@link forkAndSettle}/{@link forkAllAndSettle} yield
 * before assuming every forked fiber has reached whatever it is blocked on.
 *
 * A magic number in name only: it is the one place this test suite's
 * blocking-resolver tests (`AttributeResolver.test.ts`, `CustomPredicate.test.ts`,
 * `Qadi.test.ts`, and this file's own callers) tune it, rather than each
 * inlining its own copy of the loop and its own guess at how many turns are
 * enough.
 */
const SETTLE_TURNS = 20;

/**
 * Forks `effect`, yields enough scheduler turns for it to run up to whatever
 * it is blocked on, then returns the fiber — still running, not yet joined.
 * The caller opens whatever gate they are blocked on and joins it afterward.
 */
export const forkAndSettle = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(effect);
    for (let i = 0; i < SETTLE_TURNS; i++) yield* Effect.yieldNow;
    return fiber;
  });

/**
 * Forks every effect in `effects`, yields enough scheduler turns for all of
 * them to run up to whatever they are blocked on, then returns the fibers —
 * still running, not yet joined. The caller opens whatever gate they are
 * blocked on and joins them afterward.
 */
export const forkAllAndSettle = <A, E, R>(effects: ReadonlyArray<Effect.Effect<A, E, R>>) =>
  Effect.gen(function* () {
    const fibers = yield* Effect.forEach(effects, (e) => Effect.forkChild(e));
    for (let i = 0; i < SETTLE_TURNS; i++) yield* Effect.yieldNow;
    return fibers;
  });

// ---------------------------------------------------------------------------
// ARCH-02 — tree arbitraries and chain builders
// ---------------------------------------------------------------------------

const fieldsOption: FastCheck.Arbitrary<{ readonly fields?: ReadonlyArray<string> }> =
  FastCheck.oneof(
    FastCheck.constant({}),
    FastCheck.constant({ fields: [] }),
    FastCheck.constant({ fields: ["title", "body"] }),
  );

/**
 * One generator per `Policy` tag, keyed by tag so a new tag is a compile error
 * here too. Composites take the recursive position as an argument.
 */
const policyBuilders = (
  node: FastCheck.Arbitrary<P.Policy>,
): Record<P.Policy["_tag"], FastCheck.Arbitrary<P.Policy>> => ({
  HasRole: fieldsOption.map((o) => P.hasRole("editor", o)),
  HasPermission: fieldsOption.map((o) => P.hasPermission(permission("doc", "read"), o)),
  HasAttribute: fieldsOption.map((o) => P.hasAttribute("seniority", M.gte(3), o)),
  HasResourceAttribute: fieldsOption.map((o) =>
    P.hasResourceAttribute("ownerId", M.eq(M.subjectId()), o),
  ),
  HasRelationship: fieldsOption.map((o) => P.hasRelationship("owner", o)),
  HasAction: fieldsOption.map((o) => P.hasAction("read", o)),
  HasActed: fieldsOption.map((o) => P.hasActed("raised", o)),
  HasNotActed: fieldsOption.map((o) => P.hasNotActed("approved", { scope: "Any", ...o })),
  HasCustom: FastCheck.oneof(
    fieldsOption.map((o) => P.hasCustom("isOwner", undefined, o)),
    FastCheck.constant(P.hasCustom("quota", { limit: 3 })),
  ),
  HasSignature: fieldsOption.map((o) => P.hasSignature("approved", o)),
  AllOf: FastCheck.array(node, { maxLength: 3 }).map((ps) => P.allOf(ps)),
  AnyOf: FastCheck.array(node, { maxLength: 3 }).map((ps) => P.anyOf(ps)),
  Rules: FastCheck.tuple(
    FastCheck.array(
      FastCheck.tuple(node, FastCheck.boolean()).map(([c, permits]) =>
        permits ? P.permitWhen(c) : P.denyWhen(c),
      ),
      { maxLength: 3 },
    ),
    FastCheck.constantFrom<P.Combining>("FirstApplicable", "PermitOverrides", "DenyOverrides"),
  ).map(([rs, combining]) => P.rules(rs, { combining })),
  Not: node.map(P.not),
  Obliged: node.map((p) => P.obliged(obligation("audit.log"), p)),
  Labeled: node.map((p) => P.labeled("l", p)),
});

/** Every one of the 16 `Policy` tags is reachable. */
export const policyArbitrary = (options?: {
  readonly maxDepth?: number;
}): FastCheck.Arbitrary<P.Policy> =>
  FastCheck.letrec<{ node: P.Policy }>((tie) => ({
    node: FastCheck.oneof(
      { maxDepth: options?.maxDepth ?? 4, withCrossShrink: true },
      ...Object.values(policyBuilders(tie("node"))),
    ),
  })).node;

/**
 * A node composed into a parent that references the *same object* two or three
 * times, which pins identity-memo behaviour.
 */
export const sharedPolicyArbitrary: FastCheck.Arbitrary<P.Policy> = policyArbitrary({
  maxDepth: 3,
}).chain((x) =>
  FastCheck.constantFrom(
    P.allOf([x, P.not(x), x]),
    P.anyOf([x, x]),
    P.rules([P.permitWhen(x), P.denyWhen(x)]),
    P.labeled("shared", P.allOf([x, x, x])),
  ),
);

const valueRefArbitrary: FastCheck.Arbitrary<M.ValueRef> = FastCheck.oneof(
  FastCheck.constant(M.subject("team")),
  FastCheck.constant(M.subjectId()),
  FastCheck.constant(M.resource("ownerId")),
  FastCheck.constant(M.action()),
  FastCheck.constant(M.literal(1)),
);

/** Every one of the 12 `Matcher` tags (and all five `ValueRef` tags) is reachable. */
export const matcherArbitrary = (maxDepth: number): FastCheck.Arbitrary<M.Matcher> => {
  const builders = (
    node: FastCheck.Arbitrary<M.Matcher>,
  ): Record<M.Matcher["_tag"], FastCheck.Arbitrary<M.Matcher>> => ({
    Eq: valueRefArbitrary.map(M.eq),
    Neq: valueRefArbitrary.map(M.neq),
    Dominates: valueRefArbitrary.map(M.dominates),
    In: FastCheck.constant(M.inArray([1, 2, "a"])),
    Exists: FastCheck.constant(M.exists()),
    Gte: FastCheck.constant(M.gte(3)),
    Lt: FastCheck.constant(M.lt(3)),
    Contains: FastCheck.constant(M.contains("x")),
    FieldMatch: node.map((m) => M.fieldMatch("a", m)),
    SomeMatch: node.map(M.someMatch),
    EveryMatch: node.map(M.everyMatch),
    Size: node.map(M.size),
  });
  return FastCheck.letrec<{ node: M.Matcher }>((tie) => ({
    node: FastCheck.oneof(
      { maxDepth, withCrossShrink: true },
      ...Object.values(builders(tie("node"))),
    ),
  })).node;
};

/** An n-deep single-child chain, built iteratively so building cannot overflow. */
export const chain = <T>(wrap: (inner: T) => T, n: number, leaf: T): T => {
  let current = leaf;
  for (let i = 0; i < n; i++) current = wrap(current);
  return current;
};

/** `allOf([leaf, next])` nested `n` times. */
export const comb = (n: number): P.Policy =>
  chain((next) => P.allOf([P.hasRole("a"), next]), n, P.hasRole("z"));
