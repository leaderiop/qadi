/**
 * Every port read either interpreter makes, and the one body they all run:
 * its question, span, call metric and defect mapping.
 *
 * `evaluate` and `toPredicate` are two interpreters over one policy tree
 * (ADR-QD-024). Before this module they agreed about *how to ask a port* only by
 * convention: the evaluator read each port through a traced, counted,
 * defect-mapped wrapper and the translator re-implemented two of those reads
 * bare, so a port that threw reached `toPredicate`'s caller as a defect while the
 * same port reached `evaluate`'s caller as a typed error (issue #100, and
 * ARCH-01's E4/E6). Each read lives here once, and each interpreter keeps only
 * what is genuinely its own: what to do with the answer.
 *
 * Every read is a named `Effect.fn` that owns its span. It takes the policy leaf
 * it answers and builds its request through the port's description (`asks`, the
 * one statement of what a leaf asks, ARCH-70), then runs `readPort`
 * (ADR-QD-109), a plain function that opens no span of its own, or `readScoped`
 * where the question is about one resource. A host answering another process
 * (`servePortRead`) runs the same body under the port's span, so a served span
 * is a local one of the same request apart from `qadi.interpreter`.
 *
 * Deliberately out of the barrel (AGENTS.md §9): scaffolding shared by the two
 * interpreters, like `PortDerivation.ts`, and not importable from outside
 * `@qadi/core` (ADR-QD-099).
 *
 * The per-port facts a read needs — the span it opens, the question and answer
 * it annotates and the typed error a defect becomes — come from each port's
 * description (`PortDescription.ts`, ADR-QD-094), so no port's error class,
 * span name or span key is spelled here. The defect *rule* — which causes are
 * converted at all — stays here, in `catchPortDefect` (ADR-QD-077).
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import type { AttributeResolver } from "./AttributeResolver.ts";
import { attributeResolverPort } from "./AttributeResolver.ts";
import type { AuthSubject } from "./AuthSubject.ts";
import { customPredicatePort } from "./CustomPredicate.ts";
import type { ActedResult, DecisionHistory } from "./DecisionHistory.ts";
import { decisionHistoryPort } from "./DecisionHistory.ts";
import type { AttributeResolveError, DecisionHistoryUnavailable } from "./Errors.ts";
import { MissingResourceId } from "./Errors.ts";
import type { ResourceId } from "./Identity.ts";
import type { LeafOf } from "./PortDescription.ts";
import { portCallsTotal, predicatePortCallsTotal, servedPortCallsTotal } from "./PortMetrics.ts";
import type { PortName } from "./PortMetrics.ts";
import { relationshipResolverPort } from "./RelationshipResolver.ts";
import type { Resource } from "./Resource.ts";
import type {
  AnswerOf,
  ArgsOf,
  AskedOf,
  DescriptionOf,
  ErrorOf,
  PortTypes,
  ServiceOf,
} from "./Ports.ts";
import type { PortInterpreter, SpanFields, SpanStruct, SpanType } from "./PortSpan.ts";
import { encodeSpan } from "./PortSpanEncode.ts";
import type { SignatureAnswer } from "./SignatureHistory.ts";
import { signatureHistoryPort } from "./SignatureHistory.ts";
import { signatureMatches } from "./SignatureMatch.ts";

/**
 * Which interpreter of a policy is asking: the evaluator or the translator.
 *
 * Closed on purpose: it is annotated on every port span (`qadi.interpreter`) and
 * decides which call metric a read counts in, so a new interpreter is a compile
 * error everywhere it is matched rather than a word that silently falls into
 * the wrong series. `"remote"`, the third member of {@link PortInterpreter}, is
 * not an interpreter of a policy at all but a host answering another process
 * (`servePortRead`), and is excluded here so no `ask*` read can claim it: it is
 * the one word `servePortRead` passes to {@link readPort} itself.
 */
type Interpreter = Exclude<PortInterpreter, "remote">;

/**
 * Annotates the current span with a port's **question**, as its description
 * states it (`PortDescription.attributes`, BEH-QD-227).
 *
 * A plain function, not an `Effect.fn`: it annotates the span the read already
 * opened and must not open one of its own (ADR-QD-073). Called before the port
 * is asked, so a call that fails still leaves a span saying what it was asked.
 * `readScoped` calls it itself for the one thing `readPort` cannot do for it,
 * annotating a question whose resource id is missing, where there is no port
 * call to annotate for (ADR-QD-077, ADR-QD-134).
 */
const annotateQuestion = <Q extends SpanFields>(
  d: { readonly attributes: { readonly question: SpanStruct<Q> } },
  question: SpanType<SpanStruct<Q>>,
): Effect.Effect<void> => Effect.annotateCurrentSpan(encodeSpan(d.attributes.question, question));

/**
 * Annotates the current span with a port's **answer**, as its description's
 * `disclose` projected it — the one path from what a port returned to what a
 * span may say ([INV-QD-044](../../../spec/invariants.md)).
 *
 * Takes the projected fields, not the outcome: the projection is the
 * description's (`disclose(answer, request)`, which reads the request too, so
 * the signature port's span can say what the asker required, ADR-QD-109), and a
 * caller that already holds the description calls it where it holds the types.
 */
const annotateAnswer = <Ans extends SpanFields>(
  d: { readonly attributes: { readonly answer: SpanStruct<Ans> } },
  disclosed: SpanType<SpanStruct<Ans>>,
): Effect.Effect<void> => Effect.annotateCurrentSpan(encodeSpan(d.attributes.answer, disclosed));

/**
 * Converts a port call's defect into its own typed error, leaving an
 * already-typed failure — or an interruption — to pass through unchanged.
 *
 * A port's declared error channel (`AttributeResolveError`, and its four
 * siblings) is a promise about what a *failure* looks like; nothing in that
 * promise said what happens when an adapter throws instead of failing, so a
 * defecting port sailed straight past `Effect.retry` (which only ever sees typed
 * errors) and reached `@qadi/http` as a bare 500 instead of the taxonomy's 502
 * (issue #100). Wrapping every port read in this module with this closes that gap
 * without changing what a well-behaved port already promised.
 *
 * Only a genuine defect is rewritten:
 * - `Cause.hasFails` — the port already failed with its declared error —
 *   passes through via `Effect.failCause`, unchanged, rather than being
 *   wrapped a second time. `retry`, `catchTag`, and everything downstream
 *   must keep seeing exactly the value the port raised.
 * - a cause with no `Fail` reason at all (a pure interruption, or an empty
 *   cause) also passes through unchanged: converting an interruption into an
 *   ordinary typed failure would let a caller's `Effect.retry` retry work
 *   that was deliberately cancelled — worse than the defect this function
 *   exists to catch, and not what "an authorization decision must never
 *   become a defect" (AGENTS.md §4) asks for.
 * - only a cause carrying a `Die` and no `Fail` becomes `onDefect(cause)`.
 *
 * Mirrors `DecisionSinkForwarding.ts`'s `Effect.catchCause` in spirit — a
 * port adapter can die as easily as `send` can — but where that swallows
 * every cause into `void`, a port call must still fail with something a
 * caller's `Effect.retry` can see, so a defect becomes the port's own typed
 * error instead of being silently absorbed.
 */
export const catchPortDefect =
  <E>(onDefect: (cause: Cause.Cause<E>) => E) =>
  <A, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    effect.pipe(
      Effect.catchCause((cause) =>
        Cause.hasFails(cause) || !Cause.hasDies(cause)
          ? Effect.failCause(cause)
          : Effect.fail(onDefect(cause)),
      ),
    );

/**
 * The call metric a read counts in, by who is asking.
 *
 * Hoisted `Match.type` (§5a): each arm returns a closure over nothing but the
 * port name, and this runs on every port read of either interpreter and of a
 * host answering a remote asker. Total over {@link PortInterpreter}, so a fourth
 * asker is a compile error here rather than a read that counts nowhere.
 */
const countFor: (interpreter: PortInterpreter) => (port: PortName) => Effect.Effect<void> =
  Match.type<PortInterpreter>().pipe(
    Match.when("evaluate", () => (port: PortName) => Metric.update(portCallsTotal, port)),
    Match.when("toPredicate", () => (port: PortName) => Metric.update(predicatePortCallsTotal, port)),
    Match.when("remote", () => (port: PortName) => Metric.update(servedPortCallsTotal, port)),
    Match.exhaustive,
  );

/**
 * The one body of every port read, local or served (ADR-QD-109).
 *
 * In order: annotate the question the description's `pose` states for this
 * request, count the call, ask the port, annotate the answer the description's
 * `disclose` states, and return the answer; a defect in the call or in
 * `disclose` becomes the port's own typed error. A plain function and not an `Effect.fn`, so it opens **no**
 * span of its own: each caller owns the one span its read is named for, the
 * `ask*` reads through their `Effect.fn(<port>.span)` and `servePortRead`
 * through `Effect.withSpan(d.span)` (ADR-QD-051, AGENTS.md §5, `UNTRACED_BUDGET`
 * untouched).
 *
 * Before it, six reads each carried their own copy of these steps, and a served
 * read a seventh built from the wire's separate projection, so a served
 * signature span lacked the meaning and the match a local one carried, and a
 * store that **threw** instead of failing escaped the defect mapping, because
 * the service method was called outside any effect `catchPortDefect` wrapped.
 *
 * The invocation is `Effect.flatMap(d.service, …)` for that second reason: the
 * method is called *inside* the effect, so a synchronous throw is a defect
 * `catchPortDefect` sees, as it did for the `Service.use` accessors the local
 * reads called. `disclose` runs in an `Effect.tap` under the same mapping, for
 * the same reason: it reads the store's answer, and a malformed one must not
 * escape as a defect. `pose` reads only the request the read itself built, so it
 * stays outside.
 */
const readPort = <K extends PortName>(
  d: DescriptionOf<K>,
  interpreter: PortInterpreter,
  args: ArgsOf<PortTypes[K]>,
): Effect.Effect<AnswerOf<PortTypes[K]>, ErrorOf<PortTypes[K]>, ServiceOf<PortTypes[K]>> =>
  Effect.gen(function* () {
    // Widened to the structural bound: for a port named only by `K`, inference
    // would otherwise settle on one port's fields.
    yield* annotateQuestion<SpanFields>(d, { ...d.attributes.pose(args), interpreter });
    yield* countFor(interpreter)(d.port);
    return yield* Effect.flatMap(d.service, (shape) => d.invoke(shape)(...args)).pipe(
      // Inside the defect mapping: `disclose` reads what the store returned (the
      // signature port's matches its list against the requirement), so a store
      // that answers something `disclose` cannot read throws here, and that is
      // the port's own typed error, not a defect past `answerRemotely`'s "never
      // fails" (WR-01, ADR-QD-109).
      Effect.tap((answer) => annotateAnswer<SpanFields>(d, d.attributes.disclose(answer, args))),
      catchPortDefect((cause) => d.defect(args, cause)),
    );
  });

/**
 * The ports whose question is about one resource, written out so a fourth is a
 * decision and not a side effect.
 */
type ScopedPort = "DecisionHistory" | "RelationshipResolver" | "SignatureHistory";

/**
 * A scoped port's request, as far as the site supplied it: what its `asks`
 * build, which every scoped port's states a `resourceId` in, possibly absent.
 */
type ScopedRequest<K extends ScopedPort> = AskedOf<PortTypes[K]> &
  readonly [{ readonly resourceId: ResourceId | undefined }];

/**
 * How a scoped port's request, once it is known to have a resource id, becomes
 * the call: for two ports it already is the call, and for the relationship port,
 * whose call cannot hold a missing id, it is the same request with the id the
 * read just checked.
 */
const completeRequest: {
  readonly [K in ScopedPort]: (
    request: AskedOf<PortTypes[K]>,
    resourceId: ResourceId,
  ) => ArgsOf<PortTypes[K]>;
} = {
  DecisionHistory: (request) => request,
  RelationshipResolver: ([request], resourceId) => [{ ...request, resourceId }],
  SignatureHistory: (request) => request,
};

/**
 * The one read of a port whose question is about one resource: a request with
 * no resource id fails with `MissingResourceId` on the port's own span.
 *
 * Before it the check was written three times and the failure's trace depended
 * on the copy: two reads opened a nested helper span and the third inlined the
 * check to avoid it (ARCH-70, ADR-QD-134). Now a missing id leaves the port's
 * span, its question and the failure, and nothing else: no other span opens,
 * the port is not called and no call is counted. Annotate-before-validate is still ADR-QD-077's rule, so a span that records a
 * wiring error names what it was asked: the question is the description's `pose`
 * of the request as far as it is known, with `scope` the read's own fact (an
 * absent id still makes this a `Resource` question, and `pose` would say `Any`;
 * a span with no `scope` drops it). A present id is `readPort` alone, which
 * annotates the question once; ADR-QD-109's second, agreeing annotation is
 * retired with the early one.
 *
 * `relation` is what `MissingResourceId` names: the event, the relation or the
 * meaning the leaf asks. A plain function, like `readPort`: it runs under the
 * calling read's span and opens none, so it is not an `Effect.fn` and not in
 * `UNTRACED_BUDGET`. The one id test is over the request `asks` built, whose
 * `resourceId` is `resourceIdOf` (`Resource.ts`), the writer's rule and the
 * reader's.
 */
const readScoped = <K extends ScopedPort>(
  d: DescriptionOf<K>,
  interpreter: Interpreter,
  request: ScopedRequest<K>,
  relation: string,
): Effect.Effect<
  AnswerOf<PortTypes[K]>,
  ErrorOf<PortTypes[K]> | MissingResourceId,
  ServiceOf<PortTypes[K]>
> =>
  Effect.gen(function* () {
    const [{ resourceId }] = request;
    if (resourceId === undefined) {
      yield* annotateQuestion<SpanFields>(d, {
        ...d.attributes.pose(request),
        scope: "Resource",
        interpreter,
      });
      return yield* Effect.fail(new MissingResourceId({ relation }));
    }
    return yield* readPort(d, interpreter, completeRequest[d.port](request, resourceId));
  });

// ---------------------------------------------------------------------------
// The reads. Each is a named `Effect.fn`, because each owns a span (ADR-QD-051:
// a span says what was asked, and a tracer is what reads it back). That is why
// none is in `UNTRACED_BUDGET` — none runs once per policy *node* the way
// `evaluateAllOf`/`evaluateAnyOf`/`evaluateRules` do, and the port call under
// them is the expensive part. Each takes the leaf it answers, builds its request
// through the port's description, `<port>Port.asks.<Tag>(leaf, { subject,
// resource })`, and hands the rest to `readPort`, the one body (ADR-QD-109), or
// to `readScoped` for a question about one resource; the signature match is the
// one thing a read does after. That call is all a read does with a description's
// statement of what is served: serving work never runs on the evaluation path.
// ---------------------------------------------------------------------------

/**
 * The port call, when the subject did not already have the attribute.
 *
 * A span here and not in {@link readAttribute} above it, so that a **subject hit
 * emits nothing at all**. The distinction is the one the reader wants: a span
 * named `qadi.attribute` means the resolver was asked, which is the same event
 * the call metric counts, so the trace and the metric agree about what happened
 * rather than counting two different things. It also keeps the commonest branch
 * — the attribute the subject already carries — free of any tracing cost at all.
 *
 * **The value is never recorded**, and the only path from it to a span is the
 * description's `disclose` (`attributeResolverPort.attributes`,
 * [INV-QD-044](../../../spec/invariants.md)) — the same line
 * `dehydrateDecisions` draws with `includeTrace`. `readPort` annotates the
 * question before the call, so a resolver that fails still leaves a span saying
 * what it was asked.
 */
const resolveAttribute = Effect.fn(attributeResolverPort.span)(function* (
  interpreter: Interpreter,
  request: ArgsOf<PortTypes["AttributeResolver"]>,
) {
  return yield* readPort(attributeResolverPort, interpreter, request);
});

/**
 * Reads an attribute, consulting the subject first.
 *
 * The miss-only call to the resolver is what preserves short-circuiting: a
 * branch that is never evaluated never triggers a lookup. The subject-first
 * lookup is stated here once — both interpreters used to carry their own copy —
 * and it reads the attribute from the request `asks` built, so the subject
 * lookup and the port request cannot name different attributes.
 */
export const readAttribute = (
  interpreter: Interpreter,
  subject: AuthSubject,
  leaf: LeafOf["HasAttribute"],
): Effect.Effect<unknown, AttributeResolveError, AttributeResolver> => {
  const request = attributeResolverPort.asks.HasAttribute(leaf, { subject, resource: undefined });
  const [, attribute] = request;
  return Object.hasOwn(subject.attributes, attribute)
    ? Effect.succeed(subject.attributes[attribute])
    : resolveAttribute(interpreter, request);
};

/** A `HasActed` or `HasNotActed` leaf, of either scope. */
type ActedLeaf = LeafOf["HasActed"] | LeafOf["HasNotActed"];

/**
 * An acted leaf that asks about the subject alone (`scope: "Any"`): the only
 * kind `toPredicate` plans, because a resource-scoped history question is keyed
 * by the row.
 *
 * Its own type so the read can say what it cannot do: an `Any`-scoped question
 * has no resource id to miss, so it never fails with `MissingResourceId`, and
 * `toPredicate`'s errors stay what they were.
 */
export type AnyActedLeaf = ActedLeaf & { readonly scope: "Any" };

/** Whether an acted leaf asks about the subject alone, as the type {@link AnyActedLeaf}. */
export const isAnyActedLeaf = (leaf: ActedLeaf): leaf is AnyActedLeaf => leaf.scope === "Any";

const readActed = Effect.fn(decisionHistoryPort.span)(function* (
  interpreter: Interpreter,
  subject: AuthSubject,
  leaf: ActedLeaf,
  resource: Resource | undefined,
) {
  const request = decisionHistoryPort.asks[leaf._tag](leaf, { subject, resource });
  return leaf.scope === "Resource"
    ? yield* readScoped(decisionHistoryPort, interpreter, request, leaf.event)
    : yield* readPort(decisionHistoryPort, interpreter, request);
});

/**
 * Asks whether the subject has ever performed `leaf`'s event: about no resource
 * in particular for an `Any`-scoped leaf, and about the one `resource` for a
 * `Resource`-scoped one.
 *
 * The answer is three-valued (`"Unknown"` matches neither polarity, so both deny
 * under an unwired port, ADR-QD-020); what to do with it is the caller's. An
 * `Any`-scoped question asks about no resource even where the site has one, and
 * the span says what was asked rather than what was available. A
 * `Resource`-scoped one with no usable resource id fails with
 * `MissingResourceId` (`readScoped`), which an {@link AnyActedLeaf} cannot, and
 * the first signature says so. The two scopes were two reads before, told apart
 * by what the caller passed; the leaf's own `scope` decides now, as
 * `askSignature`'s always did, under the one span.
 *
 * `toPredicate` refuses a resource-scoped history question because it is keyed
 * by the row, but the parameter is `Interpreter` all the same, because nothing
 * about the read itself is evaluator-specific.
 */
export function askActed(
  interpreter: Interpreter,
  subject: AuthSubject,
  leaf: AnyActedLeaf,
  resource: Resource | undefined,
): Effect.Effect<ActedResult, DecisionHistoryUnavailable, DecisionHistory>;
export function askActed(
  interpreter: Interpreter,
  subject: AuthSubject,
  leaf: ActedLeaf,
  resource: Resource | undefined,
): ReturnType<typeof readActed>;
export function askActed(...args: Parameters<typeof readActed>): ReturnType<typeof readActed> {
  return readActed(...args);
}

/**
 * Asks the relationship resolver whether the subject holds `leaf`'s relation to
 * the resource.
 *
 * Evaluator-only: `toPredicate` refuses `HasRelationship` before it would ask
 * (a relationship is keyed by the row's id and cannot fold), so the span's
 * `qadi.interpreter` is the constant `"evaluate"` and no parameter admits
 * `"toPredicate"`. Fails with `MissingResourceId` when the resource has no usable
 * id (`readScoped`). The request's `depth` is the clamped one `asks` built.
 */
export const askRelationship = Effect.fn(relationshipResolverPort.span)(function* (
  subject: AuthSubject,
  leaf: LeafOf["HasRelationship"],
  resource: Resource | undefined,
) {
  const request = relationshipResolverPort.asks.HasRelationship(leaf, { subject, resource });
  return yield* readScoped(relationshipResolverPort, "evaluate", request, leaf.relation);
});

/**
 * Asks a registered custom predicate. Evaluator-only (translation refuses
 * `HasCustom`, ADR-QD-055).
 *
 * `CustomPredicateError` has no `cause` field, so the description renders a
 * defect into `reason` with `Cause.pretty` (`customPredicatePort.defect`).
 */
export const askCustom = Effect.fn(customPredicatePort.span)(function* (
  subject: AuthSubject,
  leaf: LeafOf["HasCustom"],
  resource: Resource | undefined,
) {
  return yield* readPort(
    customPredicatePort,
    "evaluate",
    customPredicatePort.asks.HasCustom(leaf, { subject, resource }),
  );
});

/**
 * Asks the signature history and matches `leaf`'s requirement against what it
 * returns. Evaluator-only (translation refuses `HasSignature`, INV-QD-056).
 *
 * The match is made here too, from the same `signatureMatches` the span's
 * `disclose` reads, so `qadi.matched` is on the span even when the verdict is
 * built elsewhere. `qadi.matched` rather than a three-valued `qadi.answer`: a
 * signature either matches or it doesn't, with no analogous middle state.
 *
 * A `Resource`-scoped leaf with no usable resource id fails with
 * `MissingResourceId` on the port's own span (`readScoped`, BEH-QD-227,
 * ADR-QD-077); an `Any`-scoped one asks about the subject alone.
 */
export const askSignature = Effect.fn(signatureHistoryPort.span)(function* (
  subject: AuthSubject,
  leaf: LeafOf["HasSignature"],
  resource: Resource | undefined,
) {
  const request = signatureHistoryPort.asks.HasSignature(leaf, { subject, resource });
  const signatures =
    leaf.scope === "Resource"
      ? yield* readScoped(signatureHistoryPort, "evaluate", request, leaf.meaning)
      : yield* readPort(signatureHistoryPort, "evaluate", request);
  const answer: SignatureAnswer = {
    matched: signatureMatches(signatures, leaf.meaning, leaf.signerRole),
    onFile: signatures.length,
  };
  return answer;
});

/**
 * The served read of any port: ask it on behalf of a remote asker, with the
 * port's own span, call metric and defect mapping (ARCH-31, ADR-QD-077).
 *
 * `answerRemotely` reads a port only through this, so a served question is as
 * visible as an evaluated one: it opens the port's span with
 * `qadi.interpreter = "remote"`, counts in `servedPortCallsTotal`, and a store
 * that **dies or throws** becomes the port's typed error rather than a defect.
 * Before it, a host's routes called the service directly and the server's own
 * Port calls panel never showed the calls a browser caused.
 *
 * It is {@link readPort}, the body every local read runs, so the question goes
 * through the description's `pose` and the answer through `disclose(answer,
 * request)`: a served span equals a local one of the same request apart from
 * `qadi.interpreter` (ADR-QD-109).
 *
 * The span's name is the description's, which an `Effect.fn` name cannot be
 * (it is static), so the read runs under `Effect.withSpan(d.span)`.
 */
export const servePortRead = <K extends PortName>(
  d: DescriptionOf<K>,
  ...args: ArgsOf<PortTypes[K]>
): Effect.Effect<AnswerOf<PortTypes[K]>, ErrorOf<PortTypes[K]>, ServiceOf<PortTypes[K]>> =>
  readPort(d, "remote", args).pipe(Effect.withSpan(d.span));
