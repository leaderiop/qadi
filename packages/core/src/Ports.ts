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
 * from it (ADR-QD-094).
 *
 * `CurrentSubject`, `EvaluationId`, `DecisionCache` and `DecisionSink` are not
 * ports in this sense — no request, no typed failure, or optional — and stay
 * outside the registry.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Record from "effect/Record";
import { attributeResolverFromRecord, attributeResolverPort } from "./AttributeResolver.ts";
import { customPredicateFromRecord, customPredicatePort } from "./CustomPredicate.ts";
import { decisionHistoryFromEvents, decisionHistoryPort } from "./DecisionHistory.ts";
import type { ActedEventInput } from "./DecisionHistory.ts";
import { nonePort } from "./PortDerivation.ts";
import type { LeafRequests, PortDescription, PortShape } from "./PortDescription.ts";
import type { PortName } from "./PortName.ts";
import type { PortSpanAttributesLike } from "./PortSpan.ts";
import { relationshipResolverFromEdges, relationshipResolverPort } from "./RelationshipResolver.ts";
import type { RelationshipEdgeInput } from "./RelationshipResolver.ts";
import { signatureHistoryFromSignatures, signatureHistoryPort } from "./SignatureHistory.ts";
import type { SignatureInput } from "./SignatureHistory.ts";

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
  readonly key: (args: infer Args extends ReadonlyArray<unknown>) => unknown;
}
  ? Args
  : never;

/** A description's answer. */
export type AnswerOf<D> = D extends { readonly none: { readonly answer: infer A } } ? A : never;

/**
 * A description's request as far as a read site supplies it: what its `asks`
 * build. The method's own `Args` for four ports; for the relationship port the
 * request whose resource id may still be absent.
 */
export type AskedOf<D> = D extends { readonly asks: LeafRequests<infer P> } ? P : never;

/** A description's span attributes (`PortSpan.ts`). */
export type SpanOf<D> = D extends { readonly attributes: infer Span extends PortSpanAttributesLike }
  ? Span
  : never;

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
 * generic in the description's parameters separately cannot express.
 */
export type DescriptionOf<K extends PortName> = PortDescription<
  K,
  ServiceOf<PortTypes[K]>,
  ShapeOf<PortTypes[K]>,
  ArgsOf<PortTypes[K]>,
  AnswerOf<PortTypes[K]>,
  ErrorOf<PortTypes[K]>,
  AskedOf<PortTypes[K]>,
  SpanOf<PortTypes[K]>
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

/**
 * A function from any port's description to a layer of that port's service —
 * what {@link tabulatePorts}' layer form takes.
 */
export interface PortLayerVisitor {
  <K extends PortName>(d: DescriptionOf<K>): Layer.Layer<ServiceOf<PortTypes[K]>>;
}

/** A function from any port's description and its built Shape to a replacement Shape. */
export interface PortDecorator {
  <K extends PortName>(d: DescriptionOf<K>, inner: ShapeOf<PortTypes[K]>): ShapeOf<PortTypes[K]>;
}

/**
 * One value per port, each computed by `f` from that port's description, as a
 * record keyed by port name. Entries are in `PortName`'s declaration order.
 *
 * Given a {@link PortLayerVisitor}, each slot is a layer typed by that port's
 * own service (`tabulatePorts(nonePort)` is {@link PortLayers}). Given `F`, each
 * slot is `F[K]`, for values uniform across ports (an empty map, a count, a
 * label): `tabulatePorts<CapturedAnswers>(() => new Map())`, with `F` always
 * passed explicitly.
 *
 * Two signatures over one body because TypeScript reads `F[K]` as a return
 * target to be the intersection of every slot (TS #30769), so a value that
 * depends on the port's own types cannot be checked through `F`. The layer
 * overload states that correlation directly. The wider implementation signature
 * is invisible to callers, as with `createPermissionGroup` (`Permission.ts`), and
 * the body is the five rows and nothing else, so it cannot place one port's value
 * in another's slot.
 */
export function tabulatePorts(f: PortLayerVisitor): PortLayers;
export function tabulatePorts<F extends { readonly [K in PortName]: unknown }>(
  f: <K extends PortName>(d: DescriptionOf<K>) => F[K],
): { readonly [K in PortName]: F[K] };
export function tabulatePorts(f: PortVisitor<unknown>): { readonly [K in PortName]: unknown } {
  return {
    AttributeResolver: f(PORTS.AttributeResolver),
    DecisionHistory: f(PORTS.DecisionHistory),
    RelationshipResolver: f(PORTS.RelationshipResolver),
    CustomPredicate: f(PORTS.CustomPredicate),
    SignatureHistory: f(PORTS.SignatureHistory),
  };
}

/**
 * Runs `f` over every port's description, in `PortName`'s declaration order
 * (`AttributeResolver`, `DecisionHistory`, `RelationshipResolver`,
 * `CustomPredicate`, `SignatureHistory`), and returns the results in that
 * order.
 */
export const forEveryPort = <R>(f: PortVisitor<R>): ReadonlyArray<R> =>
  Record.values(tabulatePorts<{ readonly [K in PortName]: R }>(f));

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
const NONE: PortLayers = tabulatePorts(nonePort);

/**
 * Every port, each at its fail-closed default unless `overrides` names it.
 *
 * Each override has its own slot, so **order cannot matter**: overriding one
 * port by merging a layer after `EvaluationServicesNone` worked only when the
 * override came last, and the other order silently kept the default and
 * denied (ARCH-10 E9). A host names only the ports it wires.
 */
export const portsLayer = (overrides: PortOverrides = {}): Layer.Layer<PortServices> =>
  mergePorts(tabulatePorts((d) => overrides[d.port] ?? NONE[d.port]));

/**
 * The plain data a test or a simulation can state for each port — the shape
 * {@link PORT_FIXTURES} turns into that port's layer.
 *
 * Data only, never a layer: devtools' Fixtures mode is sealed (ADR-QD-050) and
 * takes data, and a value that is not serializable could not cross into it.
 * `CustomPredicate` is answers (`name` to a fixed verdict), not functions; a
 * predicate that reads the subject or resource is a layer, supplied as an
 * override.
 */
export interface PortFixtureData {
  readonly AttributeResolver: Readonly<Record<string, unknown>>;
  readonly RelationshipResolver: ReadonlyArray<RelationshipEdgeInput>;
  readonly DecisionHistory: ReadonlyArray<ActedEventInput>;
  readonly SignatureHistory: ReadonlyArray<SignatureInput>;
  readonly CustomPredicate: Readonly<Record<string, boolean>>;
}

/**
 * Each port's fixture builder, closed over `PortName`: a port added to the
 * registry without a row here is TS2741 (ADR-QD-094).
 *
 * This is the one place the data-to-layer mapping is written. `@qadi/testing`'s
 * review layer and `@qadi/devtools`' Fixtures simulation both go through
 * {@link fixturePortsLayer}; before it each kept its own copy, and devtools
 * cannot depend on `@qadi/testing` (no test fixtures in a production bundle),
 * so only core could hold it.
 */
export const PORT_FIXTURES: {
  readonly [K in PortName]: (data: PortFixtureData[K]) => Layer.Layer<ServiceOf<PortTypes[K]>>;
} = {
  AttributeResolver: attributeResolverFromRecord,
  DecisionHistory: decisionHistoryFromEvents,
  RelationshipResolver: relationshipResolverFromEdges,
  CustomPredicate: (answers) =>
    customPredicateFromRecord(Record.map(answers, (answer) => () => Effect.succeed(answer))),
  SignatureHistory: signatureHistoryFromSignatures,
};

/**
 * Any subset of the ports, each set up by `answers` (that port's
 * {@link PortFixtureData}), by `layer` (a layer of its own service), by both, or
 * by neither.
 *
 * A layer wins over the same port's answers, and a port with neither stays at
 * its fail-closed default. `@qadi/testing`'s `PortSetup`, which allows exactly
 * one of the two, is assignable to this as it stands. Each field and each slot
 * is `| undefined` for the `exactOptionalPropertyTypes` reason
 * {@link PortOverrides} gives: a conditional entry compiles, and `undefined` is
 * the fail-closed default, the same as an absent one.
 */
export type PortFixtures = {
  readonly [K in PortName]?:
    | {
        readonly answers?: PortFixtureData[K] | undefined;
        readonly layer?: Layer.Layer<ServiceOf<PortTypes[K]>> | undefined;
      }
    | undefined;
};

/** A fixture's layer, or `undefined` (the port's default) when it has no data. */
const fixtureLayer = <D, S>(
  build: (data: D) => Layer.Layer<S>,
  data: D | undefined,
): Layer.Layer<S> | undefined => (data === undefined ? undefined : build(data));

/**
 * Every port, each set up by its entry in `setups`: its layer, else its
 * fixture answers, else its fail-closed default.
 *
 * Names no port. Each slot is derived from the registry, so a port added there
 * is here at its default without an edit here (ADR-QD-094). A layer wins over
 * the same port's answers; a caller whose own surface offers one or the other,
 * never both (`@qadi/testing`'s `ports` option), passes it through unchanged.
 */
export const fixturePortsLayer = (setups: PortFixtures = {}): Layer.Layer<PortServices> =>
  mergePorts(
    tabulatePorts((d) => {
      const setup = setups[d.port];
      return setup?.layer ?? fixtureLayer(PORT_FIXTURES[d.port], setup?.answers) ?? NONE[d.port];
    }),
  );

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
        tabulatePorts((d) => Layer.succeed(d.service, f(d, Context.get(context, d.service)))),
      ),
    ),
  );
