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
import { attributeResolverPort } from "./AttributeResolver.ts";
import { customPredicatePort } from "./CustomPredicate.ts";
import { decisionHistoryPort } from "./DecisionHistory.ts";
import { nonePort } from "./PortDerivation.ts";
import type { PortDescription, PortShape } from "./PortDescription.ts";
import type { PortName } from "./PortMetrics.ts";
import { relationshipResolverPort } from "./RelationshipResolver.ts";
import { signatureHistoryPort } from "./SignatureHistory.ts";

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
export type ShapeOf<D> = D extends {
  readonly service: Context.Key<infer _S, infer Shape extends PortShape>;
}
  ? Shape
  : never;

/** A description's request, as the tuple of its method's parameters. */
export type ArgsOf<D> = D extends {
  readonly key: (args: infer Args extends ReadonlyArray<unknown>) => string;
}
  ? Args
  : never;

/** A description's answer. */
export type AnswerOf<D> = D extends { readonly none: { readonly answer: infer A } } ? A : never;

/** A description's typed error. */
export type ErrorOf<D> = D extends { readonly failure: (args: never, cause: unknown) => infer E }
  ? E
  : never;

/**
 * The description of the port named `K`, spelled through the registry.
 *
 * For a concrete `K` this is exactly that port's description type. For a
 * generic `K` it is what lets a function over "any port" keep the port's name
 * and its answer, service and request **correlated**: `answers[d.port]` and
 * `d.none.answer` then have types the compiler knows agree, which a function
 * generic in the description's six parameters separately cannot express.
 */
export type DescriptionOf<K extends PortName> = PortDescription<
  K,
  ServiceOf<PortTypes[K]>,
  ShapeOf<PortTypes[K]>,
  ArgsOf<PortTypes[K]>,
  AnswerOf<PortTypes[K]>,
  ErrorOf<PortTypes[K]>
>;

/**
 * The five port services — the set an evaluation's walk reads.
 * `EvaluationServices` is `CurrentSubject | EvaluationId | PortServices`, so a
 * port added to the registry reaches every alias without a second edit.
 */
export type PortServices = { readonly [K in PortName]: ServiceOf<PortTypes[K]> }[PortName];

/**
 * One layer per port, each providing exactly its own service.
 *
 * Spelled `ServiceOf<PortTypes[K]>` — the same spelling as
 * {@link DescriptionOf}'s service — so that reading `layers[d.port]` inside a
 * function generic in the port yields the very type that port's description
 * names, and the two are known to agree. (`Layer` is invariant in what it
 * provides, so two spellings of one service would not be.)
 */
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

/** A function over any port's description. */
export interface PortVisitor<R> {
  <K extends PortName>(d: DescriptionOf<K>): R;
}

/** A function from any port's description to a layer of that port's service. */
export interface PortLayerVisitor {
  <K extends PortName>(d: DescriptionOf<K>): Layer.Layer<ServiceOf<PortTypes[K]>>;
}

/** A function from any port's description and its built Shape to a replacement Shape. */
export interface PortDecorator {
  <K extends PortName>(d: DescriptionOf<K>, inner: ShapeOf<PortTypes[K]>): ShapeOf<PortTypes[K]>;
}

/**
 * One value per port, each computed by `f` from that port's description, as a
 * record keyed by port name — the shape `@qadi/devtools`' capture uses for its
 * per-port answer maps.
 *
 * `F` names the record (`tabulatePorts<CapturedAnswers>(() => new Map())`).
 * For a port named generically, TypeScript checks `f`'s result against what
 * *every* port's slot accepts, so this suits values that are uniform across
 * ports (an empty map, a count, a label); a value that depends on the port's
 * own types belongs in {@link mapPorts} or {@link decoratePorts}, whose
 * visitors are typed per port. Entries are in `PortName`'s declaration order.
 */
export const tabulatePorts = <F extends { readonly [K in PortName]: unknown }>(
  f: <K extends PortName>(d: DescriptionOf<K>) => F[K],
): { readonly [K in PortName]: F[K] } => ({
  AttributeResolver: f(PORTS.AttributeResolver),
  DecisionHistory: f(PORTS.DecisionHistory),
  RelationshipResolver: f(PORTS.RelationshipResolver),
  CustomPredicate: f(PORTS.CustomPredicate),
  SignatureHistory: f(PORTS.SignatureHistory),
});

/**
 * Runs `f` over every port's description, in `PortName`'s declaration order
 * (`AttributeResolver`, `DecisionHistory`, `RelationshipResolver`,
 * `CustomPredicate`, `SignatureHistory`), and returns the results in that
 * order.
 */
export const forEveryPort = <R>(f: PortVisitor<R>): ReadonlyArray<R> =>
  Record.values(tabulatePorts<{ readonly [K in PortName]: R }>(f));

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

/** Every port's fail-closed default, derived once. */
const NONE: PortLayers = mapPorts(nonePort);

/**
 * Every port, each at its fail-closed default unless `overrides` names it.
 *
 * Each override has its own slot, so **order cannot matter**: overriding one
 * port by merging a layer after `EvaluationServicesNone` worked only when the
 * override came last, and the other order silently kept the default and
 * denied (ARCH-10 E9). A host names only the ports it wires.
 */
export const portsLayer = (overrides: PortOverrides = {}): Layer.Layer<PortServices> =>
  mergePorts(mapPorts((d) => overrides[d.port] ?? NONE[d.port]));

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
      mergePorts(
        mapPorts((d) => Layer.succeed(d.service, f(d, Context.get(context, d.service)))),
      ),
    ),
  );
