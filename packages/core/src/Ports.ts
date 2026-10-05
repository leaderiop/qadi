/**
 * The five evaluation ports, as one closed registry, and the environments
 * built from it.
 *
 * Before this module the five-port set had four hand-written names in core
 * (`EvaluationServices`' member list, a private `WalkServices`, a private
 * `EvaluationRequirements`, `PortName`) and a fifth in `@qadi/devtools`
 * (`EvaluationPorts`), and every place that assembled an environment — core's
 * test helpers, `@qadi/testing`'s review layer, devtools' fixtures, capture
 * and replay, `EvaluationServicesNone` itself — listed the five ports by hand
 * (ARCH-10 E5/E6). A sixth port then edited every one of those lists, and
 * none failed to compile if it was forgotten. Here the set is stated once:
 * `PortTypes` is indexed by `PortName`, so a port name without a registry
 * entry is a compile error, and every type and environment below is derived
 * from it (ADR-QD-901).
 *
 * `CurrentSubject`, `EvaluationId`, `DecisionCache` and `DecisionSink` are not
 * ports in this sense — no request, no typed failure, or optional — and stay
 * outside the registry.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Record from "effect/Record";
import { AttributeResolverNone, attributeResolverPort } from "./AttributeResolver.ts";
import { CustomPredicateNone, customPredicatePort } from "./CustomPredicate.ts";
import { DecisionHistoryUnknown, decisionHistoryPort } from "./DecisionHistory.ts";
import type { PortDescription, PortShape } from "./PortDescription.ts";
import type { PortName } from "./PortMetrics.ts";
import { RelationshipResolverNever, relationshipResolverPort } from "./RelationshipResolver.ts";
import { SignatureHistoryNone, signatureHistoryPort } from "./SignatureHistory.ts";

/**
 * The registry's type: each port's name to its description's exact type.
 * Every derived type below indexes it by `PortName`, which is what makes a
 * missing entry a compile error.
 */
export interface PortTypes {
  readonly AttributeResolver: typeof attributeResolverPort;
  readonly DecisionHistory: typeof decisionHistoryPort;
  readonly RelationshipResolver: typeof relationshipResolverPort;
  readonly CustomPredicate: typeof customPredicatePort;
  readonly SignatureHistory: typeof signatureHistoryPort;
}

/** The registry: every port's description, by name. */
export const PORTS: PortTypes = {
  AttributeResolver: attributeResolverPort,
  DecisionHistory: decisionHistoryPort,
  RelationshipResolver: relationshipResolverPort,
  CustomPredicate: customPredicatePort,
  SignatureHistory: signatureHistoryPort,
};

/** A description's service (the `Context.Service` class). */
export type ServiceOf<D> = D extends { readonly service: Context.Key<infer S, infer _Shape> }
  ? S
  : never;

/** A description's Shape. */
export type ShapeOf<D> = D extends { readonly service: Context.Key<infer _S, infer Shape> }
  ? Shape
  : never;

/** A description's request, as the tuple of its method's parameters. */
export type ArgsOf<D> = D extends { readonly key: (args: infer Args) => string } ? Args : never;

/** A description's answer. */
export type AnswerOf<D> = D extends { readonly none: { readonly answer: infer A } } ? A : never;

/** A description's typed error. */
export type ErrorOf<D> = D extends { readonly failure: (args: never, cause: unknown) => infer E }
  ? E
  : never;

/**
 * The five port services — the set an evaluation's walk reads.
 * `EvaluationServices` is `CurrentSubject | EvaluationId | PortServices`, so a
 * port added to the registry reaches every alias without a second edit.
 */
export type PortServices = { readonly [K in PortName]: ServiceOf<PortTypes[K]> }[PortName];

/** One layer per port, each providing exactly its own service. */
export type PortLayers = { readonly [K in PortName]: Layer.Layer<ServiceOf<PortTypes[K]>> };

/**
 * Any subset of the ports, each replaced by a layer of its own service.
 * `| undefined` so a conditional override (`input.x === undefined ? undefined
 * : …`) compiles under `exactOptionalPropertyTypes`; an `undefined` slot is
 * the fail-closed default, the same as an absent one.
 */
export type PortOverrides = {
  readonly [K in PortName]?: Layer.Layer<ServiceOf<PortTypes[K]>> | undefined;
};

/** A function over any port's description, generic in everything the description fixes. */
export interface PortVisitor<R> {
  <N extends PortName, Self, Shape extends PortShape, Args extends ReadonlyArray<unknown>, A, E>(
    d: PortDescription<N, Self, Shape, Args, A, E>,
  ): R;
}

/** A function from any port's description to a layer of that port's service. */
export interface PortLayerVisitor {
  <N extends PortName, Self, Shape extends PortShape, Args extends ReadonlyArray<unknown>, A, E>(
    d: PortDescription<N, Self, Shape, Args, A, E>,
  ): Layer.Layer<Self>;
}

/** A function from any port's description and its built Shape to a replacement Shape. */
export interface PortDecorator {
  <N extends PortName, Self, Shape extends PortShape, Args extends ReadonlyArray<unknown>, A, E>(
    d: PortDescription<N, Self, Shape, Args, A, E>,
    inner: Shape,
  ): Shape;
}

/**
 * One visit per port. A mapped type over `PortName`, so a port missing from
 * the table is a compile error (TS2741); its entry order is `PortName`'s
 * declaration order, which is the order {@link forEveryPort} visits in.
 */
const VISIT: { readonly [K in PortName]: <R>(f: PortVisitor<R>) => R } = {
  AttributeResolver: (f) => f(PORTS.AttributeResolver),
  DecisionHistory: (f) => f(PORTS.DecisionHistory),
  RelationshipResolver: (f) => f(PORTS.RelationshipResolver),
  CustomPredicate: (f) => f(PORTS.CustomPredicate),
  SignatureHistory: (f) => f(PORTS.SignatureHistory),
};

/**
 * Runs `f` over every port's description, in `PortName`'s declaration order
 * (`AttributeResolver`, `DecisionHistory`, `RelationshipResolver`,
 * `CustomPredicate`, `SignatureHistory`), and returns the results in that
 * order.
 */
export const forEveryPort = <R>(f: PortVisitor<R>): ReadonlyArray<R> =>
  Record.values(VISIT).map((visit) => visit(f));

/** A layer per port, built by `f` from that port's description. */
export const mapPorts = (f: PortLayerVisitor): PortLayers => ({
  AttributeResolver: f(PORTS.AttributeResolver),
  DecisionHistory: f(PORTS.DecisionHistory),
  RelationshipResolver: f(PORTS.RelationshipResolver),
  CustomPredicate: f(PORTS.CustomPredicate),
  SignatureHistory: f(PORTS.SignatureHistory),
});

/** All five port layers as one. */
export const mergePorts = (layers: PortLayers): Layer.Layer<PortServices> =>
  Layer.mergeAll(
    layers.AttributeResolver,
    layers.DecisionHistory,
    layers.RelationshipResolver,
    layers.CustomPredicate,
    layers.SignatureHistory,
  );

/**
 * Every port, each at its fail-closed default unless `overrides` names it.
 *
 * Each override has its own slot, so **order cannot matter**: overriding one
 * port by merging a layer after `EvaluationServicesNone` worked only when the
 * override came last, and the other order silently kept the default and
 * denied (ARCH-10 E9). A host names only the ports it wires.
 */
export const portsLayer = (overrides: PortOverrides = {}): Layer.Layer<PortServices> =>
  mergePorts({
    AttributeResolver: overrides.AttributeResolver ?? AttributeResolverNone,
    DecisionHistory: overrides.DecisionHistory ?? DecisionHistoryUnknown,
    RelationshipResolver: overrides.RelationshipResolver ?? RelationshipResolverNever,
    CustomPredicate: overrides.CustomPredicate ?? CustomPredicateNone,
    SignatureHistory: overrides.SignatureHistory ?? SignatureHistoryNone,
  });

/**
 * Rebuilds every port of `ports` through `f` — the shape a capture, a recording
 * or any other cross-cutting decoration takes.
 *
 * `ports` is built **once**, via `Layer.unwrap`, and all five decorated
 * services are derived from that one context. Five independent
 * `Layer.effect` blocks each building `ports` would not share a `MemoMap`, so
 * a `ports` layer with a side effect at construction (opening a connection)
 * would run it five times (the reason `@qadi/devtools`' `capturing` gave for
 * the same shape before it moved here).
 */
export const decoratePorts = (
  ports: Layer.Layer<PortServices>,
  f: PortDecorator,
): Layer.Layer<PortServices> =>
  Layer.unwrap(
    Effect.map(Layer.build(ports), (context) =>
      mergePorts({
        AttributeResolver: Layer.succeed(
          PORTS.AttributeResolver.service,
          f(PORTS.AttributeResolver, Context.get(context, PORTS.AttributeResolver.service)),
        ),
        DecisionHistory: Layer.succeed(
          PORTS.DecisionHistory.service,
          f(PORTS.DecisionHistory, Context.get(context, PORTS.DecisionHistory.service)),
        ),
        RelationshipResolver: Layer.succeed(
          PORTS.RelationshipResolver.service,
          f(PORTS.RelationshipResolver, Context.get(context, PORTS.RelationshipResolver.service)),
        ),
        CustomPredicate: Layer.succeed(
          PORTS.CustomPredicate.service,
          f(PORTS.CustomPredicate, Context.get(context, PORTS.CustomPredicate.service)),
        ),
        SignatureHistory: Layer.succeed(
          PORTS.SignatureHistory.service,
          f(PORTS.SignatureHistory, Context.get(context, PORTS.SignatureHistory.service)),
        ),
      }),
    ),
  );
