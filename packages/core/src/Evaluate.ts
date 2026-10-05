/**
 * Policy evaluation.
 *
 * One function. The predecessor had a synchronous `evaluate` and an
 * `evaluateAsync` that pre-resolved every attribute in the tree before
 * delegating back to the synchronous one — which meant short-circuiting was
 * destroyed and the async relationship API was unreachable. Returning an
 * `Effect` collapses both paths: resolution happens lazily, at the node that
 * needs it, and `anyOf` stops at its first allowing child.
 */
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Record from "effect/Record";
import type { Concurrency } from "effect/Types";
import type { AuthSubject } from "./AuthSubject.ts";
import type { ActedResult } from "./DecisionHistory.ts";
import { CurrentSubject } from "./CurrentSubject.ts";
import type { CacheOutcome } from "./DecisionCache.ts";
import { DecisionCache } from "./DecisionCache.ts";
import type { Decision, Trace } from "./Decision.ts";
import { Allow, Deny } from "./Decision.ts";
import { Decided, DecisionRecord, Failed } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";
import type { EvaluationError } from "./Errors.ts";
import { MissingAction, MissingResource, PolicyTooDeep } from "./Errors.ts";
import { EvaluationId } from "./EvaluationId.ts";
import type { VisibleFields } from "./FieldLattice.ts";
import { mergeFields } from "./FieldLattice.ts";
import { holds } from "./Compare.ts";
import type { Matcher, MatcherContext, Verdict } from "./Matcher.ts";
import { judgeMatcher, referencesAction, referencesResource } from "./Matcher.ts";
import type { Obligation } from "./Obligation.ts";
import { unionObligations } from "./Obligation.ts";
import { permissionKey } from "./Permission.ts";
import type { PortServices } from "./Ports.ts";
import {
  askActedAny,
  askActedForResource,
  askCustom,
  askRelationship,
  askSignature,
  readAttribute,
} from "./PortAccess.ts";
import { DEFAULT_MAX_DEPTH, POLICY_TAGS, policyDepth } from "./Policy.ts";
import type { Policy, Rule, RuleEffect } from "./Policy.ts";
import type { Resource } from "./Resource.ts";
import { anyOfStopsAtAllow, rulesDecisiveEffect } from "./ShortCircuit.ts";

/**
 * Every decision `evaluate` reaches, tagged by outcome.
 *
 * The one metric every deployment of this library can use unconditionally:
 * no wiring beyond providing a `Metric.MetricRegistry` (or an exporter built
 * on one) is needed to see the allow/deny rate ADR-QD-009 asks observability
 * to answer.
 *
 * Two fixed, module-scope taggings — `Metric.withAttributes(decisionsTotal,
 * {...})` built fresh per call, the shape Effect's own docs show — rather
 * than one, deliberately: `Metric`'s untagged fast path caches a metric's
 * resolved hooks on the metric object itself, for the process's lifetime,
 * the first time it is touched (`Object.keys(extraAttributes).length === 0`
 * in `effect/Metric`'s `hook`) — cheap for a singleton reused across every
 * call, defeated by rebuilding the tagged wrapper on every `evaluate`
 * instead.
 */
const decisionsTotal = Metric.counter("qadi_decisions_total", {
  description: "Authorization decisions reached by `evaluate`, tagged by outcome.",
});
const decisionsAllowedTotal = Metric.withAttributes(decisionsTotal, { outcome: "allow" });
const decisionsDeniedTotal = Metric.withAttributes(decisionsTotal, { outcome: "deny" });

/**
 * Denials, by the top-level policy tag `evaluate` was asked to decide.
 *
 * Keyed on `policy._tag` — a closed, small union — rather than `decision.reason`,
 * which was tried first and reverted: `evaluateActed` and `evaluateHasRelationship`
 * both build their denial reason from caller-supplied identifiers (`subject.id`, a
 * resource id), so a frequency keyed on the raw sentence would grow one permanent
 * entry per distinct (subject, resource) pair ever denied — unbounded, in a
 * structure this cache-free service holds in memory for the life of the registry.
 * `policy._tag` answers a coarser but still useful question ("which *kind* of
 * policy is denying") with a cardinality bounded by the ADT itself. The full,
 * caller-specific reason is still available — on the `Effect.logDebug` line below,
 * which a log pipeline retains and rotates rather than accumulating in-process.
 */
const denialsByPolicyTagTotal = Metric.frequency("qadi_denials_by_policy_tag_total", {
  description: "Denials, keyed by the top-level policy tag evaluate was asked to decide.",
  preregisteredWords: POLICY_TAGS,
});

/**
 * The distribution of `evaluate`'s own duration, in milliseconds.
 *
 * `durationMillis` was already computed for every `Decision` — this exports it
 * as an aggregate a deployment can alert or graph on without instrumenting its
 * own call site. Exponential boundaries because evaluation latency is the
 * usual case for one: sub-millisecond for an uncached, resolver-free policy,
 * seconds for one waiting on a slow attribute or relationship store, with
 * nothing meaningful in between to resolve at linear width.
 */
const evaluationDurationMillis = Metric.histogram("qadi_evaluation_duration_millis", {
  description: "Distribution of evaluate's wall-clock duration, in milliseconds.",
  boundaries: Metric.exponentialBoundaries({ start: 1, factor: 2, count: 15 }),
});

/**
 * Every `EvaluationError` tag — {@link evaluationErrorsTotal}'s closed domain,
 * by the `Record<Tag, true>` exhaustiveness idiom: a tenth error added to the
 * union without a matching entry here is a compile error rather than a
 * silently-missing word. (The policy tag list used the same idiom until
 * `Policy.ts` derived it from the schema union.)
 */
const EVALUATION_ERROR_TAGS_BY_TAG: Record<EvaluationError["_tag"], true> = {
  AttributeResolveError: true,
  RelationshipResolveError: true,
  DecisionHistoryUnavailable: true,
  CustomPredicateError: true,
  SignatureHistoryUnavailable: true,
  MissingAction: true,
  MissingResource: true,
  MissingResourceId: true,
  PolicyTooDeep: true,
};

/** `EVALUATION_ERROR_TAGS_BY_TAG`'s keys, in the array form `preregisteredWords` takes. */
const EVALUATION_ERROR_TAGS: ReadonlyArray<EvaluationError["_tag"]> = Record.keys(
  EVALUATION_ERROR_TAGS_BY_TAG,
);

/**
 * Evaluations that raised instead of deciding, by error tag.
 *
 * An `EvaluationError` reached **no** observer before this: it left through the
 * error channel with no span attribute, no metric and no log. So a deployment
 * watching `qadi_decisions_total` saw an attribute-store outage as a *drop in
 * traffic* rather than as a fault — the one reading that sends an operator
 * somewhere other than the broken dependency.
 *
 * Keyed on `_tag` for the cardinality reason `denialsByPolicyTagTotal` gives:
 * the tag union is closed and small, while the errors themselves carry
 * caller-supplied identifiers.
 */
const evaluationErrorsTotal = Metric.frequency("qadi_evaluation_errors_total", {
  description: "Evaluations that failed instead of deciding, keyed by error tag.",
  preregisteredWords: EVALUATION_ERROR_TAGS,
});

/** A trace plus how it was obtained — `undefined` when no cache was consulted. */
interface EvaluationLookup {
  readonly trace: Trace;
  readonly outcome: CacheOutcome | undefined;
}

export interface EvaluateOptions {
  /** The resource under consideration, if any. */
  readonly resource?: Resource;
  /**
   * What the caller is doing — `"read"`, `"write"`, an OrBAC activity name.
   *
   * A property of the request, never a grant the subject holds (ADR-QD-018).
   */
  readonly action?: string;
  /**
   * Maximum policy tree depth. Bounds recursion on hostile decoded input.
   * Defaults to 64.
   */
  readonly maxDepth?: number;
  /**
   * Evaluate the children of `allOf`, `anyOf` and `rules` concurrently.
   *
   * Absent — the default — evaluation is sequential and short-circuits, so a
   * branch that is never reached performs no lookup
   * ([INV-QD-005](../../../spec/invariants.md#inv-qd-005-short-circuit-preservation)).
   * Supplying this **forfeits that** in exchange for latency: every child of a
   * composite is evaluated, so a caller pays for speculative attribute,
   * relationship, decision-history and custom-predicate lookups against their
   * own stores — this option changes what a caller's resolvers get asked, not
   * only how long the call takes.
   *
   * What it does *not* change is the answer. The decision and its trace are
   * identical either way, because both paths drive the same fold over children in
   * declaration order — including discarding the trace of a child evaluated after
   * the decisive one ([ADR-QD-026](../../../spec/decisions/026-concurrent-evaluation.md)).
   */
  readonly concurrency?: Concurrency;
  /**
   * Correlate this evaluation with one already made elsewhere.
   *
   * Absent — the default, and unchanged — every call mints a fresh id, hit or
   * miss, for the reason stated where the cache is read below: two log lines
   * claiming to be the same event would break the one thing the identifier
   * exists for.
   *
   * That default is right for a *repeat* of a question and wrong for a
   * *continuation* of one. A decision made on the server, dehydrated, and
   * re-checked on the client is one story told in two places; with a fresh id
   * at each end there is nothing to join them by, and the re-check appears as
   * an unrelated evaluation. Supplying the server's id makes the pair
   * expressible without any new correlation protocol.
   *
   * Opt-in, so it can only ever be a caller stating a relationship it knows
   * about. Qadi cannot infer one — see
   * [ADR-QD-012](../../../spec/decisions/012-deterministic-time-and-ids.md).
   */
  readonly evaluationId?: string;
}

/**
 * Everything a recursive call passes through unchanged: the inputs a policy may
 * read, plus the settings that govern how the walk is performed.
 *
 * Bundled rather than threaded as separate parameters, and `concurrency` is the
 * clearest case for it. `Concurrency` is `number | "unbounded" | "inherit"`, so
 * left as its own positional parameter next to `depth` and `maxDepth` — both
 * numbers — a slip between the three would **typecheck**. Folding `concurrency`
 * into this bundle removes it from that adjacency at every call site.
 *
 * This does not extend to `depth`/`maxDepth` themselves: `evaluateNode` and its
 * `AllOf`/`AnyOf`/`Rules` helpers still take both as two adjacent positional
 * numbers (`evaluateNode`'s own signature, and every recursive `depth + 1,
 * maxDepth` call), so a slip between *those* two would still typecheck. This
 * bundle closes the `concurrency` case, not the whole positional-parameter
 * class of bug.
 *
 * `concurrency` is deliberately here and not in `MatcherContext`: it is a
 * property of the evaluation, never a value a matcher can compare against.
 */
interface Evaluation {
  readonly resource: Resource | undefined;
  readonly action: string | undefined;
  readonly concurrency: Concurrency | undefined;
}

/**
 * Services an evaluation needs: who is asking, an id for the evaluation, and
 * the five ports (`PortServices`, `Ports.ts`). The ports come from the
 * registry rather than a list here, so a port added to the registry reaches
 * every alias of this type without an edit here (ADR-QD-094).
 */
export type EvaluationServices = CurrentSubject | EvaluationId | PortServices;

/**
 * Everything an evaluation needs except who is asking.
 *
 * The services a runtime holds for its lifetime while the subject travels per
 * call. Written as `Exclude` rather than as a hand-listed union so it tracks
 * {@link EvaluationServices}: a port added to that union reaches every
 * adapter that names this alias without a second edit. Its domain-named
 * aliases keep their own meaning and public names: `SubjectSetServices`
 * (`SubjectSet.ts`), `QadiRuntimeServices` (`@qadi/react`), and the
 * `@qadi/promise` and `@qadi/http` runtime requirement sets.
 *
 * Before this alias the same `Exclude` was spelled out six times across four
 * packages, and `@qadi/http`'s `RequirePermission.ts` re-listed the six
 * services by hand instead (ARCH-04).
 */
export type StandingEvaluationServices = Exclude<EvaluationServices, CurrentSubject>;

const NO_OBLIGATIONS: ReadonlyArray<Obligation> = [];
/** Shared empty children array for leaf verdicts — mirrors `NO_OBLIGATIONS`. */
const NO_CHILDREN: ReadonlyArray<Trace> = [];

const allow = (
  policyTag: Policy["_tag"],
  fields: VisibleFields,
  children: ReadonlyArray<Trace> = NO_CHILDREN,
  label?: string,
  obligations: ReadonlyArray<Obligation> = NO_OBLIGATIONS,
): Trace => ({
  policyTag,
  label,
  allowed: true,
  reason: undefined,
  children,
  visibleFields: fields,
  obligations,
});

const deny = (
  policyTag: Policy["_tag"],
  reason: string,
  children: ReadonlyArray<Trace> = NO_CHILDREN,
  label?: string,
): Trace => ({
  policyTag,
  label,
  allowed: false,
  reason,
  children,
  visibleFields: undefined,
  // A denial permits nothing, so it conditions nothing.
  obligations: NO_OBLIGATIONS,
});

/**
 * Why an attribute policy refused, read from the matcher's `Verdict`.
 *
 * One sentence per way a comparison can deny, so an absent attribute, an absent
 * reference, an incomparable value and a genuine mismatch — four problems with
 * four different fixes — are never reported as one another. "did not match" is
 * reserved for a comparison that ran and came out false: saying it of one that
 * never ran is the claim INV-QD-029 and BEH-QD-045 forbid. The value itself is
 * never printed; the attribute *name* is in the sentence, its contents are the
 * subject's data and stay out of a reason that reaches logs and, through
 * `AccessDenied`, error handlers.
 *
 * **`Neq` inverts the mismatch sentence.** A bare `Neq` denies with `NotHeld`
 * exactly when the value *equals* the excluded reference, so "did not match"
 * would claim the opposite of what happened; it reads "matched an excluded
 * value" instead (`Qadi.guard`'s INV-QD-032 test exercises that shape).
 *
 * **A composite speaks for itself.** `matcher` is what `HasAttribute`/
 * `HasResourceAttribute` was given, and `judgeMatcher` reports a composite's own
 * absence and shape, never its inner matcher's (D-08-b): `someMatch(neq(…))` or
 * `fieldMatch("f", eq(subject("missing")))` that denies reads "did not match",
 * which is true of the composite over its elements. That imprecision is known
 * and pinned in `Evaluate.test.ts`.
 *
 * History: before CCR-QD-112 `Neq`'s absent-operand case matched rather than
 * failed; after it, the reason re-derived which operand was absent from the
 * boolean `evaluateMatcher` returned, through a second `ValueRef` dispatcher
 * kept in step with `resolveRef` by comment (ED-03's former entry 2), and only for
 * `Neq` — so `eq(subject("missing"))` and `dominates(…)` against an absent
 * reference still read "did not match", and `gte(3)` against `Infinity` or `"5"`
 * hid that the value was not comparable at all. The verdict says which, once
 * (ARCH-08, CCR-QD-173).
 */
const DENIAL_TEXT: Record<Exclude<Verdict, "Held">, (matcher: Matcher) => string> = {
  NotHeld: (matcher) => (matcher._tag === "Neq" ? "matched an excluded value" : "did not match"),
  ValueAbsent: () => "has no value",
  ReferenceAbsent: () => "has no reference value to compare against",
  Incomparable: () => "is not a value this matcher can compare",
};

const attributeReason = (
  side: "subject" | "resource",
  attribute: string,
  verdict: Exclude<Verdict, "Held">,
  matcher: Matcher,
): string => `${side} attribute '${attribute}' ${DENIAL_TEXT[verdict](matcher)}`;

// ---------------------------------------------------------------------------
// The port-reading arms. The reads themselves — question, span, metric and
// defect mapping — live in `PortAccess.ts`, shared with `toPredicate`; what is
// left here is the verdict sentence each answer earns. Plain functions, not
// `Effect.fn`: the span now belongs to the read, and a second named wrapper
// would double it.
// ---------------------------------------------------------------------------

/**
 * `HasActed`/`HasNotActed`'s arm.
 *
 * The two share every line but the wanted `ActedResult` — the `_tag` itself
 * supplies that, so there is nothing left for the two case labels in
 * `evaluateNode` to differ on. Extracted for the same reason `evaluateAllOf`
 * and friends are: `switch (policy._tag)` keeps dispatching in one glance, and
 * what a given tag actually *does* moves to a name instead of living inline in
 * the arm.
 */
const evaluateActed = (
  policy: Extract<Policy, { _tag: "HasActed" | "HasNotActed" }>,
  subject: AuthSubject,
  resource: Resource | undefined,
) => {
  const asked =
    policy.scope === "Resource"
      ? askActedForResource("evaluate", subject, policy.event, resource?.["id"])
      : askActedAny("evaluate", subject, policy.event);
  const wanted: ActedResult = policy._tag === "HasActed" ? "Acted" : "NotActed";
  // `"Unknown"` matches neither, so both polarities deny under an unwired
  // port. That is the whole reason the port is three-valued rather than
  // boolean (ADR-QD-020).
  return Effect.map(asked, (answer) =>
    answer === wanted
      ? allow(policy._tag, policy.fields)
      : deny(
          policy._tag,
          answer === "Unknown"
            ? `no history is available for '${policy.event}'`
            : `subject '${subject.id}' ${answer === "Acted" ? "has already" : "has not"} performed '${policy.event}'`,
        ),
  );
};

/** `HasRelationship`'s arm, extracted for the same reason `evaluateActed` is. */
const evaluateHasRelationship = (
  policy: Extract<Policy, { _tag: "HasRelationship" }>,
  subject: AuthSubject,
  resource: Resource | undefined,
) => {
  const rawId = resource?.["id"];
  return Effect.map(askRelationship(subject, policy.relation, rawId, policy.depth), (related) =>
    // `Match.value` rather than a hoisted `Match.type` (§5a's preferred form):
    // the arms close over `policy`, `subject` and `rawId`, so there is nothing to
    // hoist. The rebuild is also noise against the service call, which may be a
    // graph traversal or a network round trip.
    Match.value(related).pipe(
      Match.when("Related", () => allow("HasRelationship", policy.fields)),
      Match.when("Unrelated", () =>
        deny(
          "HasRelationship",
          `subject '${subject.id}' has no '${policy.relation}' relation to '${rawId}'`,
        ),
      ),
      // Not "has no relation": nothing confirmed one. `"Unknown"` does not mean
      // "unwired" specifically — `RelationshipResolverNever` is the common source,
      // but a wired resolver may answer it too (a graph store with no namespace
      // for this relation, say; `RelationshipResolver.ts`'s `RelatedResult` doc
      // says so). The port cannot tell the two apart, so the sentence does not
      // claim wiring is the cause — that would be exactly the kind of unverified
      // claim about a store INV-QD-029 forbids, the same defect this arm was
      // added to fix in the first place (BEH-QD-045).
      Match.when("Unknown", () =>
        deny(
          "HasRelationship",
          `no relationship resolver could confirm the '${policy.relation}' relation to '${rawId}'`,
        ),
      ),
      Match.exhaustive,
    ),
  );
};

/**
 * `HasCustom`'s arm, extracted for the same reason `evaluateActed` and
 * `evaluateHasRelationship` are.
 */
const evaluateHasCustom = (
  policy: Extract<Policy, { _tag: "HasCustom" }>,
  subject: AuthSubject,
  resource: Resource | undefined,
) =>
  Effect.map(askCustom(subject, resource, policy.name, policy.params), (allowed) =>
    allowed
      ? allow("HasCustom", policy.fields)
      : deny("HasCustom", `custom predicate '${policy.name}' returned false`),
  );

/**
 * `HasSignature`'s arm, extracted for the same reason `evaluateActed`,
 * `evaluateHasRelationship` and `evaluateHasCustom` are.
 *
 * The deny reason distinguishes "no signatures on file at all" from
 * "signatures exist but none match" at no extra cost, since the port returns the
 * full list before `askSignature` filters it.
 */
const evaluateHasSignature = (
  policy: Extract<Policy, { _tag: "HasSignature" }>,
  subject: AuthSubject,
  resource: Resource | undefined,
) =>
  Effect.map(
    askSignature(subject, policy.meaning, policy.signerRole, policy.scope, resource?.["id"]),
    ({ matched, onFile }) =>
      matched
        ? allow("HasSignature", policy.fields)
        : deny(
            "HasSignature",
            onFile === 0
              ? `no signatures are on file for subject '${subject.id}'`
              : `subject '${subject.id}' has no signature matching meaning '${policy.meaning}'` +
                (policy.signerRole === undefined
                  ? ""
                  : ` and signer role '${policy.signerRole}'`),
          ),
  );

/**
 * Dispatches a single policy node to its verdict, recursing into composites.
 *
 * `depth > maxDepth` is the per-node guard (BEH-QD-038), kept as defense in depth:
 * the root `evaluate` has already rejected any policy whose `policyDepth`
 * exceeds `maxDepth` before the first node, so `policyDepth(p) <= n` exactly
 * when `evaluate(p, { maxDepth: n })` does not raise `PolicyTooDeep`
 * (`RolesAndDepth.test.ts` asserts the agreement in both directions).
 *
 * Not `Effect.suspend`-wrapped as a whole: a leaf tag's real comparison
 * (`subject.roles.has(...)`, `judgeMatcher`) runs immediately, as part of
 * building the `Effect.succeed(...)` this returns, rather than lazily when
 * that `Effect` is later run. A wrapper's *child*, though, is suspended
 * (`Not`/`Obliged`/`Labeled`): building the child's effect eagerly recursed
 * natively once per wrapper level, so a deep chain under a large `maxDepth`
 * overflowed the stack and became a defect (ARCH-02 C3e). The root
 * `evaluate`'s cache path defends itself against the leaf case with its own
 * `Effect.suspend` around the call; a future caller
 * that memoizes or races calls to this function directly needs the same
 * defense.
 */
const evaluateNode = (
  policy: Policy,
  subject: AuthSubject,
  request: Evaluation,
  matcherContext: MatcherContext,
  depth: number,
  maxDepth: number,
): Effect.Effect<Trace, EvaluationError, PortServices> => {
  if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));

  const { action, resource } = request;

  switch (policy._tag) {
    case "HasPermission": {
      const key = permissionKey(policy.permission);
      return Effect.succeed(
        subject.permissions.has(key)
          ? allow("HasPermission", policy.fields)
          : deny("HasPermission", `subject lacks permission '${key}'`),
      );
    }

    case "HasRole":
      return Effect.succeed(
        subject.roles.has(policy.role)
          ? allow("HasRole", policy.fields)
          : deny("HasRole", `subject lacks role '${policy.role}'`),
      );

    case "HasAttribute":
      if (action === undefined && referencesAction(policy.matcher)) {
        // No key, not `expected: undefined`: `expected` is `Schema.optional`
        // precisely so a JSON round-trip drops it, and this arm has no
        // expected action to report — omitting the key spells that directly
        // instead of writing a value that only round-trips to the same thing.
        return Effect.fail(new MissingAction({}));
      }
      // The `HasResourceAttribute` mirror of the action check above
      // (INV-QD-011): a matcher comparing against `resource(...)` with no
      // resource in context would otherwise resolve that reference to
      // `undefined`, compare false, and read as an ordinary denial rather than
      // the caller error it is.
      if (resource === undefined && referencesResource(policy.matcher)) {
        return Effect.fail(new MissingResource({ attribute: policy.attribute }));
      }
      return Effect.map(readAttribute("evaluate", subject, policy.attribute), (value) => {
        // One judgement gives both the decision and, on a denial, its reason.
        const verdict = judgeMatcher(policy.matcher, value, matcherContext);
        return holds(verdict)
          ? allow("HasAttribute", policy.fields)
          : deny("HasAttribute", attributeReason("subject", policy.attribute, verdict, policy.matcher));
      });

    case "HasResourceAttribute": {
      if (resource === undefined) {
        return Effect.fail(new MissingResource({ attribute: policy.attribute }));
      }
      if (action === undefined && referencesAction(policy.matcher)) {
        // See the `HasAttribute` arm above: no expected action here either.
        return Effect.fail(new MissingAction({}));
      }
      // `Object.hasOwn`, mirroring `readAttribute` above and `FieldPath.ts`'s
      // `projectAt`: a decoded policy's `attribute` is untrusted input, and
      // without this guard a name like `"toString"` or `"constructor"`
      // resolves an inherited `Object.prototype` member instead of reporting
      // the absence `attributeReason` already has a sentence for.
      const value = Object.hasOwn(resource, policy.attribute)
        ? resource[policy.attribute]
        : undefined;
      const verdict = judgeMatcher(policy.matcher, value, matcherContext);
      return Effect.succeed(
        holds(verdict)
          ? allow("HasResourceAttribute", policy.fields)
          : deny(
              "HasResourceAttribute",
              attributeReason("resource", policy.attribute, verdict, policy.matcher),
            ),
      );
    }

    case "HasRelationship":
      return evaluateHasRelationship(policy, subject, resource);

    case "HasAction": {
      // Absent input is a caller error, not a decision — the `MissingResource`
      // precedent, and the reason `referencesAction` is checked above.
      if (action === undefined) {
        return Effect.fail(new MissingAction({ expected: policy.action }));
      }
      return Effect.succeed(
        action === policy.action
          ? allow("HasAction", policy.fields)
          : deny("HasAction", `action is '${action}', not '${policy.action}'`),
      );
    }

    case "HasActed":
    case "HasNotActed":
      return evaluateActed(policy, subject, resource);

    case "HasCustom":
      return evaluateHasCustom(policy, subject, resource);

    case "HasSignature":
      return evaluateHasSignature(policy, subject, resource);

    case "AllOf":
      return evaluateAllOf(policy, subject, request, matcherContext, depth, maxDepth);

    case "AnyOf":
      return evaluateAnyOf(policy, subject, request, matcherContext, depth, maxDepth);

    case "Rules":
      return evaluateRules(policy, subject, request, matcherContext, depth, maxDepth);

    case "Not":
      return Effect.map(
        Effect.suspend(() =>
          evaluateNode(policy.policy, subject, request, matcherContext, depth + 1, maxDepth),
        ),
        (child) =>
          child.allowed
            ? deny("Not", "negated policy allowed", [child])
            : // Negation carries no field visibility of its own: knowing a
              // policy did *not* hold says nothing about which fields are safe.
              // It carries no obligations either, and needs no rule to say so:
              // the child denied, so it contributed none (ADR-QD-019).
              allow("Not", undefined, [child]),
      );

    case "Obliged":
      return Effect.map(
        Effect.suspend(() =>
          evaluateNode(policy.policy, subject, request, matcherContext, depth + 1, maxDepth),
        ),
        (child) =>
          child.allowed
            ? // The duty attaches only to a permission that was granted.
              allow(
                "Obliged",
                child.visibleFields,
                [child],
                undefined,
                unionObligations([policy.obligation], child.obligations),
              )
            : deny("Obliged", child.reason ?? "the obliged policy denied", [child]),
      );

    case "Labeled":
      return Effect.map(
        Effect.suspend(() =>
          evaluateNode(policy.policy, subject, request, matcherContext, depth + 1, maxDepth),
        ),
        (child) => ({
          policyTag: "Labeled" as const,
          label: policy.label,
          allowed: child.allowed,
          reason: child.reason,
          children: [child],
          visibleFields: child.visibleFields,
          obligations: child.obligations,
        }),
      );
  }
};

/**
 * The accumulator both `AllOf` paths drive, and the reason concurrency cannot
 * change an answer.
 *
 * The decision rules live in `stepAllOf`/`finishAllOf` and nowhere else. The
 * sequential path steps one child at a time and stops evaluating the moment a
 * step returns a verdict; the concurrent path evaluates every child and then
 * steps over the results **in declaration order**, stopping at the same index.
 * Same fold, same input order, same output — including the shape of
 * `Trace.children`, which is public and is what a reviewer reads.
 */
interface AllOfFold {
  readonly children: Array<Trace>;
  readonly fieldSets: Array<VisibleFields>;
  obligations: ReadonlyArray<Obligation>;
}

const beginAllOf = (): AllOfFold => ({
  children: [],
  fieldSets: [],
  obligations: NO_OBLIGATIONS,
});

/**
 * Returns a verdict once one child settles the question, `undefined` while
 * open. Short-circuits on the first *denying* child — `AllOf` needs every
 * child to allow, so one denial already decides it and nothing later runs.
 */
const stepAllOf = (fold: AllOfFold, trace: Trace): Trace | undefined => {
  fold.children.push(trace);
  if (!trace.allowed) {
    return deny("AllOf", trace.reason ?? "a required policy denied", fold.children);
  }
  fold.fieldSets.push(trace.visibleFields);
  // Every child allowed, so every child's duties apply. Union, never
  // intersection — dropping one a branch required would be a quiet grant.
  fold.obligations = unionObligations(fold.obligations, trace.obligations);
  return undefined;
};

const finishAllOf = (
  policy: Extract<Policy, { _tag: "AllOf" }>,
  fold: AllOfFold,
): Trace =>
  allow(
    "AllOf",
    mergeFields(policy.fieldStrategy, fold.fieldSets),
    fold.children,
    undefined,
    fold.obligations,
  );

/**
 * `Effect.fnUntraced`, not `Effect.fn("qadi.allOf")` — the one composite
 * dispatcher of the three this ticket (#102) converts that has its own fold
 * logic in `stepAllOf`/`finishAllOf` above.
 *
 * Ticket #101's `EffectFn.bench.ts` measured what the named `Effect.fn` form
 * costs on exactly this call shape — one wrapped call per composite node,
 * recursing through `evaluateNode` — and found ≈2.7–2.9 µs/call go to a
 * second `Error()` capture, a span allocation and a `CurrentStackFrame`
 * record, none of which `Effect.fnUntraced` performs. Put in proportion
 * against `Evaluate.bench.ts`'s real numbers, that is an estimated ≈30–43% of
 * a matcher-heavy or wide evaluation and ≈54–66% of a ten-level-deep one —
 * `evaluateAllOf`/`evaluateAnyOf`/`evaluateRules` are exactly the functions
 * that pay this cost once per policy node, on every evaluation this library
 * performs, which is why the boundary is drawn at these three and not
 * elsewhere in this file. AGENTS.md §5 records the exception and the exact
 * function list; `scripts/check-house-style.mjs`'s `UNTRACED_BUDGET` enforces
 * it.
 *
 * `resolveAttribute`, `evaluateActed`, `evaluateHasRelationship`,
 * `evaluateHasCustom`, `evaluateHasSignature` (the port-call wrappers) and the
 * root `evaluate` all stay traced — ADR-QD-051 ("a span says what was asked,
 * and a tracer is what reads it back") is product observability a caller
 * wires a real tracer to consume, not incidental cost, and none of those six
 * run once per policy *node* the way these three do. `requireScopedResourceId`
 * is a small helper called from inside `evaluateActed`, not a per-node
 * dispatch point, and stays traced too — converting it was considered and
 * rejected as out of scope (issue #102).
 *
 * The behavior this does **not** change: `Trace.children`/`policyTag`/
 * `reason`/`visibleFields`/`obligations` are built by `allow`/`deny`/
 * `stepAllOf`/`finishAllOf` themselves, independent of whatever wraps this
 * generator, so the evaluator's structure remains fully reconstructable from
 * `decision.trace` with no `qadi.allOf` span to read it from — proven in
 * `Evaluate.test.ts`'s "observability" suite, not just asserted here or in
 * ADR-QD-073.
 */
const evaluateAllOf = Effect.fnUntraced(function* (
  policy: Extract<Policy, { _tag: "AllOf" }>,
  subject: AuthSubject,
  request: Evaluation,
  matcherContext: MatcherContext,
  depth: number,
  maxDepth: number,
) {
  const fold = beginAllOf();

  if (request.concurrency === undefined) {
    for (const child of policy.policies) {
      const verdict = stepAllOf(
        fold,
        yield* evaluateNode(child, subject, request, matcherContext, depth + 1, maxDepth),
      );
      if (verdict !== undefined) return verdict;
    }
  } else {
    // `Effect.exit` per child, not a bare `evaluateNode` — `Effect.forEach`'s
    // default (fail-fast) error mode would abort the whole dispatch the
    // instant any child failed, so a later-indexed sibling's failure could
    // pre-empt an earlier-indexed sibling's `Deny` that a sequential walk
    // would have already returned. Exiting every child instead means every
    // child still runs (losing nothing the concurrent path evaluated before),
    // and the exits arrive in input order regardless of completion order, so
    // walking them below reproduces the sequential fold exactly: the first
    // index that is either a `Deny` or a failure wins, matching what
    // sequential evaluation would have reached that index with (ADR-QD-026).
    // Children after the decisive index are dropped either way: the work was
    // speculative, and keeping it would make the trace (or which error
    // surfaces) depend on a performance switch.
    const exits = yield* Effect.forEach(
      policy.policies,
      (child) => Effect.exit(evaluateNode(child, subject, request, matcherContext, depth + 1, maxDepth)),
      { concurrency: request.concurrency },
    );
    for (const exit of exits) {
      if (Exit.isFailure(exit)) {
        return yield* Effect.failCause(exit.cause);
      }
      const verdict = stepAllOf(fold, exit.value);
      if (verdict !== undefined) return verdict;
    }
  }

  return finishAllOf(policy, fold);
});

/**
 * `AnyOf`'s counterpart to `AllOfFold` — same contract, mirrored: the decision
 * rules live in `stepAnyOf`/`finishAnyOf` and nowhere else, the sequential path
 * stops at the first step that returns a verdict, and the concurrent path
 * evaluates every child before folding the results **in declaration order**,
 * stopping at the same index. What differs from `AllOf` is *which* child
 * settles it — an allowing one, not a denying one — and that `exhaustive`
 * exists at all: `First` can return the instant it has a winner, but `Union`
 * and `Intersection` must see every allowing child to merge their field sets,
 * so the fold cannot short-circuit under those two the way `AllOf`'s always can.
 */
interface AnyOfFold {
  readonly children: Array<Trace>;
  readonly allowingFieldSets: Array<VisibleFields>;
  /** `First` may stop at the first allowing child; the others must see them all. */
  readonly exhaustive: boolean;
  obligations: ReadonlyArray<Obligation>;
  lastReason: string | undefined;
}

const beginAnyOf = (policy: Extract<Policy, { _tag: "AnyOf" }>): AnyOfFold => ({
  children: [],
  allowingFieldSets: [],
  exhaustive: !anyOfStopsAtAllow(policy.fieldStrategy),
  obligations: NO_OBLIGATIONS,
  lastReason: undefined,
});

/**
 * Returns a verdict once one child settles the question, `undefined` while
 * open. Short-circuits on the first *allowing* child under `First`
 * (`!fold.exhaustive`) — `AnyOf` needs only one child to allow, so a winner
 * already decides it there; `Union`/`Intersection` never return early here and
 * settle only in `finishAnyOf`, once every child has been folded in.
 */
const stepAnyOf = (fold: AnyOfFold, trace: Trace): Trace | undefined => {
  fold.children.push(trace);

  if (trace.allowed) {
    fold.allowingFieldSets.push(trace.visibleFields);
    fold.obligations = unionObligations(fold.obligations, trace.obligations);
    if (!fold.exhaustive) {
      // Under `First` the obligations are the winning branch's, so the set
      // depends on the order the author wrote the branches in. Accepted, and
      // stated: collecting from every branch would force exhaustive
      // evaluation and repeal INV-QD-005 for any tree carrying a duty.
      //
      // Returning `trace.visibleFields` *is* the merge: `!exhaustive` means
      // `FieldLattice.ts`'s `decidedByFirst` law holds, so `merge(sets)` is
      // `sets[0]`. Not a `mergeFields` call — that would allocate a one-element
      // array on the hot path for the same answer.
      return allow("AnyOf", trace.visibleFields, fold.children, undefined, fold.obligations);
    }
  } else {
    fold.lastReason = trace.reason;
  }
  return undefined;
};

const finishAnyOf = (
  policy: Extract<Policy, { _tag: "AnyOf" }>,
  fold: AnyOfFold,
): Trace => {
  if (fold.allowingFieldSets.length > 0) {
    return allow(
      "AnyOf",
      mergeFields(policy.fieldStrategy, fold.allowingFieldSets),
      fold.children,
      undefined,
      fold.obligations,
    );
  }
  return deny("AnyOf", fold.lastReason ?? "no alternative policy allowed", fold.children);
};

/**
 * Short-circuits on the first allowing child — except under `Union`, which must
 * see every child to merge their field sets.
 *
 * `Intersection` on an `anyOf` is honoured rather than silently downgraded to
 * `First`, which is what the predecessor did.
 *
 * `Effect.fnUntraced` — see `evaluateAllOf`'s doc comment above for why this
 * and `evaluateRules` join it: the same measured per-call cost (issue #101),
 * the same boundary (composite dispatchers only, ADR-QD-051's port calls and
 * root `evaluate` excluded), the same AGENTS.md §5 / `UNTRACED_BUDGET`
 * bookkeeping, and the same proof that `Trace` fidelity does not depend on it.
 */
const evaluateAnyOf = Effect.fnUntraced(function* (
  policy: Extract<Policy, { _tag: "AnyOf" }>,
  subject: AuthSubject,
  request: Evaluation,
  matcherContext: MatcherContext,
  depth: number,
  maxDepth: number,
) {
  const fold = beginAnyOf(policy);

  if (request.concurrency === undefined) {
    for (const child of policy.policies) {
      const verdict = stepAnyOf(
        fold,
        yield* evaluateNode(child, subject, request, matcherContext, depth + 1, maxDepth),
      );
      if (verdict !== undefined) return verdict;
    }
  } else {
    // `Effect.exit` per child — see `evaluateAllOf`'s matching branch above for
    // why: `Effect.forEach`'s default fail-fast mode would let a later-indexed
    // sibling's failure pre-empt an earlier-indexed sibling's decisive `Allow`
    // (under `First`) that a sequential walk would already have returned. The
    // exits arrive in input order regardless of completion order, and walking
    // them below reproduces the sequential fold exactly: the first index that
    // is either decisive or a failure wins (ADR-QD-026).
    const exits = yield* Effect.forEach(
      policy.policies,
      (child) => Effect.exit(evaluateNode(child, subject, request, matcherContext, depth + 1, maxDepth)),
      { concurrency: request.concurrency },
    );
    for (const exit of exits) {
      if (Exit.isFailure(exit)) {
        return yield* Effect.failCause(exit.cause);
      }
      const verdict = stepAnyOf(fold, exit.value);
      if (verdict !== undefined) return verdict;
    }
  }

  return finishAnyOf(policy, fold);
});

/**
 * Walks an ordered rule table.
 *
 * Exactly one rule decides, and the walk stops at the first rule that cannot be
 * overridden (INV-QD-017). `FirstApplicable` stops at the first rule that
 * applies at all; the overrides stop at the first rule carrying the effect
 * nothing later can beat, and must otherwise ask every rule — which inverts the
 * cost profile of the rest of the library, where allowing is the cheap outcome.
 *
 * `Effect.fnUntraced` — see `evaluateAllOf`'s doc comment above for why this
 * and `evaluateAnyOf` join it: the same measured per-call cost (issue #101),
 * the same boundary (composite dispatchers only, ADR-QD-051's port calls and
 * root `evaluate` excluded), the same AGENTS.md §5 / `UNTRACED_BUDGET`
 * bookkeeping, and the same proof that `Trace` fidelity does not depend on it.
 */
const evaluateRules = Effect.fnUntraced(function* (
  policy: Extract<Policy, { _tag: "Rules" }>,
  subject: AuthSubject,
  request: Evaluation,
  matcherContext: MatcherContext,
  depth: number,
  maxDepth: number,
) {
  const children: Array<Trace> = [];

  /** The effect that ends the walk. `undefined` under `FirstApplicable`,
   *  where the first rule to apply at all is already final. */
  const decisiveEffect: RuleEffect | undefined = rulesDecisiveEffect(policy.combining);

  interface Applied {
    readonly index: number;
    readonly rule: Rule;
    readonly trace: Trace;
  }
  let firstApplying: Applied | undefined;
  let firstDecisive: Applied | undefined;

  /**
   * Folds one condition result at index `index`. Returns `true` when the walk is
   * settled and no later rule can change the outcome.
   *
   * Shared by both paths so the **deciding rule** is selected identically. Under
   * the overrides it is the first applying row of the winning effect *by index* —
   * selecting by arrival would make two runs of the same table owe different
   * duties, which is the constraint E3 contributed (ADR-QD-023).
   */
  // Takes `rule` alongside `index` rather than looking it up by indexing
  // `policy.rules[index]` — under `noUncheckedIndexedAccess` that access types
  // as possibly-`undefined` no matter how provably in-bounds the loop is, and
  // AGENTS.md §6 bans asserting past that with `!`. Both call sites below
  // already have `rule` in hand from iterating the array directly, so passing
  // it through costs nothing.
  const step = (index: number, rule: Rule, trace: Trace): boolean => {
    children.push(trace);
    if (!trace.allowed) return false;

    const applied: Applied = { index, rule, trace };
    firstApplying ??= applied;
    if (decisiveEffect === undefined) return true;
    if (rule.effect === decisiveEffect) {
      firstDecisive = applied;
      return true;
    }
    return false;
  };

  if (request.concurrency === undefined) {
    for (const [index, rule] of policy.rules.entries()) {
      // The condition answers *does this rule apply*, never *is this permitted*.
      const trace = yield* evaluateNode(
        rule.condition,
        subject,
        request,
        matcherContext,
        depth + 1,
        maxDepth,
      );
      if (step(index, rule, trace)) break;
    }
  } else {
    // `Effect.exit` per child, not a bare `Effect.map` — see `evaluateAllOf`'s
    // matching branch above for why: `Effect.forEach`'s default fail-fast
    // error mode would abort the whole dispatch the instant any rule's
    // condition failed, so a later-indexed rule's failure could pre-empt an
    // earlier-indexed rule's already-decisive verdict that a sequential walk
    // would have already returned. Exiting every child instead means every
    // condition still runs (losing nothing the concurrent path evaluated
    // before), and the exits arrive in input order regardless of completion
    // order, so walking them below reproduces the sequential fold exactly:
    // the first index that is either decisive or a failure wins (ADR-QD-026).
    // `rule` and `index` still travel with the trace from the same `forEach`
    // that produced it, rather than being re-associated afterward by indexing
    // a second array — the same reasoning as `compile`'s rule table in
    // Predicate.ts.
    const exits = yield* Effect.forEach(
      policy.rules,
      (rule, index) =>
        Effect.exit(
          Effect.map(
            evaluateNode(rule.condition, subject, request, matcherContext, depth + 1, maxDepth),
            (trace) => ({ index, rule, trace }),
          ),
        ),
      { concurrency: request.concurrency },
    );
    for (const exit of exits) {
      if (Exit.isFailure(exit)) {
        return yield* Effect.failCause(exit.cause);
      }
      const { index, rule, trace } = exit.value;
      if (step(index, rule, trace)) break;
    }
  }

  // Under the overrides, an applying rule of the other effect decides only
  // because nothing decisive was found — which is knowable solely by asking all.
  const decidingRule = firstDecisive ?? firstApplying;

  if (decidingRule === undefined) {
    return deny("Rules", "no rule applied", children);
  }

  if (decidingRule.rule.effect === "Deny") {
    // `Not`'s rule: a refusal permits nothing, so it carries neither fields nor
    // obligations — whatever its own condition's trace holds (ADR-QD-023).
    return deny("Rules", `rules[${decidingRule.index}] denied`, children);
  }

  return {
    policyTag: "Rules" as const,
    allowed: true,
    // The only allowing node in the library that carries a reason. A rule
    // table's first question is *which row hit*, and it is asked in both
    // directions.
    reason: `rules[${decidingRule.index}] permitted`,
    children,
    visibleFields: decidingRule.trace.visibleFields,
    obligations: decidingRule.trace.obligations,
  };
});

/**
 * Evaluates a policy against the current subject.
 *
 * Emits a `qadi.evaluate` span carrying the decision, so authorization shows up
 * in tracing without a bespoke audit port.
 */
export const evaluate = Effect.fn("qadi.evaluate")(function* (
  policy: Policy,
  options?: EvaluateOptions,
) {
  const subject = yield* CurrentSubject;
  // A caller-supplied id names a continuation of an evaluation made elsewhere;
  // its absence — the default — mints a fresh one. `EvaluationId.next` is still
  // read either way rather than skipped, so which branch runs cannot change how
  // many ids a sequential generator has issued, and a test's expectations do not
  // depend on whether some *other* call happened to correlate.
  const mintedId = yield* EvaluationId.next;
  const evaluationId = options?.evaluationId ?? mintedId;
  const startedAt = yield* Clock.currentTimeMillis;

  // Optional by construction: `serviceOption` adds nothing to the requirements, so
  // `EvaluationServices` is unchanged and an application that never provides a cache
  // behaves exactly as it did (ADR-QD-031).
  const cache = yield* Effect.serviceOption(DecisionCache);
  // The same construction, for the same reason, and deliberately not a new kind
  // of dependency: ADR-QD-009 deleted four always-on observability ports, and an
  // optional one that is absent unless wired is not a return to them.
  const sink = yield* Effect.serviceOption(DecisionSink);

  /**
   * Hands one record to the sink, if there is one, and swallows everything.
   *
   * `catchCause` rather than `catchAll` because the shape's `never` error
   * channel is not on its own enough — BEH-QD-175 recorded exactly how that gets
   * subverted, by `Effect.die`, and a dying sink would otherwise take the
   * decision with it.
   *
   * This is the inverse of the `Effect.orDie` AGENTS.md §4 forbids on this path,
   * not an instance of it: that turns a failure into a defect, this stops a
   * *bystander's* defect from becoming an authorization outcome. An observer
   * must never be able to deny.
   */
  const emit = (record: DecisionRecord): Effect.Effect<void> =>
    Option.isSome(sink)
      ? Effect.catchCause(sink.value.record(record), () => Effect.void)
      : Effect.void;
  // `Effect.suspend`, not a direct call: `evaluateNode` is a plain switch, not
  // an `Effect.gen`, so for a leaf tag (HasRole, HasPermission, …) calling it
  // does the real comparison — `subject.roles.has(...)`, `judgeMatcher` —
  // immediately, as part of building the `Effect.succeed(...)` it returns,
  // not lazily when that Effect later runs. Calling it here, unconditionally,
  // before the cache-hit check below, would pay that cost on every ask
  // whether or not the cache already had the answer — exactly the "resolving
  // forty fields forty times" cost `DecisionCache`'s own doc comment exists
  // to avoid. `Effect.suspend` defers the call itself to when `compute` is
  // actually run, so a cache hit never invokes `evaluateNode` at all — and,
  // by the same reasoning, never builds `matcherContext` below either.
  const compute = Effect.suspend(() => {
    const request: Evaluation = {
      resource: options?.resource,
      action: options?.action,
      concurrency: options?.concurrency,
    };
    // Built once per `compute` run — i.e. once per evaluation this cache
    // cannot already answer — rather than once per `evaluateNode` call.
    // `matcherContext` depends only on `(subject, request)`, both invariant
    // across the whole recursive walk, so a composite tag (`AllOf`, `Not`, …)
    // and a leaf that never reads it (`HasPermission`, `HasRole`, …) used to
    // still pay this allocation at every node. Threaded through `evaluateNode`
    // and its `AllOf`/`AnyOf`/`Rules` helpers as a parameter instead.
    const matcherContext: MatcherContext = {
      subject: subject.attributes,
      subjectId: subject.id,
      resource: request.resource,
      action: request.action,
    };
    const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
    // Nesting depth is a property of the policy, so it is judged before any
    // node is visited: whether a policy is "too deep" must not depend on which
    // branches this subject's attributes happen to short-circuit past, or on
    // who is asking (ARCH-02 D-02-e, INV-QD-037). `policyDepth` is memoised per
    // policy object, so after the first evaluation this is a lookup.
    // `evaluateNode` keeps its own per-node guard as defense in depth.
    if (policyDepth(policy) > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));
    return evaluateNode(policy, subject, request, matcherContext, 0, maxDepth);
  });

  // The TRACE is cached, never the `Decision`. A cached decision would carry a
  // duplicate `evaluationId`, so two log lines would claim to be the same event and
  // correlation — the one thing the identifier exists for — would stop working. The
  // id and the duration below are stamped per call, hit or miss, so a hit is
  // indistinguishable from a fresh evaluation except that it was faster.
  //
  // `getOrCompute` also coalesces concurrent identical asks into one `compute`
  // run — including sharing a genuine failure with every waiter — rather than
  // each racing its own (ADR-QD-031's follow-up: absence is still free, since
  // this is still read through `serviceOption`).
  //
  // `tapError`, so a failure is recorded and then propagates **unchanged**. This
  // is the only place an `EvaluationError` was ever observable from, and it was
  // not observable at all: no span attribute, no metric, no log. A consumer that
  // cannot see failures reports a broken attribute store as an absence of
  // traffic, or — worse, if it infers one — as a denial, which is the exact
  // confusion INV-QD-006 exists to prevent.
  //
  // `cacheOutcome` is `undefined` when no cache is wired at all, which is a
  // different statement from `"miss"` and is kept distinct on the record: a
  // reader seeing "miss" learns the cache was consulted and did not have it,
  // where absence means there was nothing to consult.
  //
  // Annotated rather than inferred: the two branches are `Effect<CacheLookup>`
  // and `Effect<{trace, outcome: undefined}>`, and TypeScript unions the two
  // `Effect`s rather than widening `outcome`, which then has no common `.pipe`.
  const lookupEffect: Effect.Effect<EvaluationLookup, EvaluationError, PortServices> = Option.isSome(
    cache,
  )
    ? cache.value.getOrCompute(
        {
          // The whole subject, not `subject.id`: two tokens for one user carry
          // the same id and different grants, and the id-only key served the
          // first verdict to both (INV-QD-033).
          subject,
          policy,
          resource: options?.resource,
          action: options?.action,
          // A shallower `maxDepth` can turn this same question into
          // `PolicyTooDeep` instead of an `Allow`/`Deny`, so it belongs in the
          // key alongside `resource` and `action` — see `DecisionCacheKey`'s
          // own doc comment.
          maxDepth: options?.maxDepth ?? DEFAULT_MAX_DEPTH,
        },
        compute,
      )
    : Effect.map(compute, (trace) => ({ trace, outcome: undefined }));

  const lookup = yield* lookupEffect.pipe(
    Effect.tapError((error) =>
      Effect.gen(function* () {
        yield* Metric.update(evaluationErrorsTotal, error._tag);
        yield* Effect.annotateCurrentSpan({
          "qadi.outcome": "Failed",
          "qadi.error_tag": error._tag,
        });
        yield* emit(
          new DecisionRecord({
            evaluationId,
            at: startedAt,
            subjectId: subject.id,
            policy,
            resource: options?.resource,
            action: options?.action,
            outcome: new Failed({ error }),
          }),
        );
      }),
    ),
  );

  const trace = lookup.trace;
  const durationMillis = (yield* Clock.currentTimeMillis) - startedAt;

  const decision: Decision = trace.allowed
    ? new Allow({
        evaluationId,
        subjectId: subject.id,
        durationMillis,
        trace,
        visibleFields: trace.visibleFields,
        obligations: trace.obligations,
      })
    : new Deny({
        evaluationId,
        subjectId: subject.id,
        durationMillis,
        trace,
        reason: trace.reason ?? "denied",
      });

  yield* Effect.annotateCurrentSpan({
    "qadi.decision": decision._tag,
    "qadi.subject_id": subject.id,
    "qadi.evaluation_id": evaluationId,
    "qadi.policy_tag": policy._tag,
    // Only when supplied: an absent action must not become the string
    // "undefined" in a trace viewer, and adding a key unconditionally would
    // change every existing span.
    ...(options?.action === undefined ? {} : { "qadi.action": options.action }),
    // Obligations are reported, never run. Present only when there are some, so
    // an evaluation that carries none looks exactly as it did before E2.
    ...(decision._tag === "Allow" && decision.obligations.length > 0
      ? { "qadi.obligations": decision.obligations.map((o) => o.id).join(",") }
      : {}),
  });

  yield* Metric.update(decision._tag === "Allow" ? decisionsAllowedTotal : decisionsDeniedTotal, 1);
  yield* Metric.update(evaluationDurationMillis, durationMillis);

  if (decision._tag === "Deny") {
    yield* Metric.update(denialsByPolicyTagTotal, policy._tag);
    yield* Effect.logDebug("qadi: policy denied").pipe(
      Effect.annotateLogs({
        "qadi.policy_tag": policy._tag,
        "qadi.subject_id": subject.id,
        "qadi.reason": decision.reason,
      }),
    );
  }

  // Last, after every other emission, so a sink cannot observe a decision the
  // metrics and span have not yet recorded — and so that nothing below it could
  // be skipped were the sink to misbehave.
  yield* emit(
    new DecisionRecord({
      evaluationId,
      at: startedAt,
      subjectId: subject.id,
      policy,
      resource: options?.resource,
      action: options?.action,
      cache: lookup.outcome,
      outcome: new Decided({ decision }),
    }),
  );

  return decision;
});
