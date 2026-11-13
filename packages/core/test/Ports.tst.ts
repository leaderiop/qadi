/**
 * Pins the port registry's type-level derivations (ARCH-10).
 *
 * `PortTypes` is indexed by `PortName`, so a port name without a registry
 * entry fails to compile everywhere a derived type indexes it; these pin that
 * the derived sets are exactly what they claim. No deliberate compile error
 * lives here, because `tsconfig.test.json` also compiles every `*.tst.ts`.
 */
import { expect, test } from "tstyche";
import type { AttributeResolver } from "../src/AttributeResolver.ts";
import { attributeResolverFromRecord } from "../src/AttributeResolver.ts";
import type { CurrentSubject } from "../src/CurrentSubject.ts";
import type { CustomPredicate, CustomPredicateShape } from "../src/CustomPredicate.ts";
import type { ActedQuery, DecisionHistory } from "../src/DecisionHistory.ts";
import type { CustomPredicateError, EnforcementErrorTagOf } from "../src/Errors.ts";
import type { EvaluationServices, StandingEvaluationServices } from "../src/EvaluationServices.ts";
import type { EvaluationId } from "../src/EvaluationId.ts";
import type { PortName } from "../src/PortName.ts";
import { forEveryPort, portsLayer, tabulatePorts } from "../src/Ports.ts";
import { nonePort } from "../src/PortDerivation.ts";
import type {
  AnswerOf,
  ArgsOf,
  ErrorOf,
  PortLayers,
  PortServices,
  PortTypes,
  ShapeOf,
} from "../src/Ports.ts";
import type { RelatedResult, RelationshipResolver } from "../src/RelationshipResolver.ts";
import { RelationshipResolverNever } from "../src/RelationshipResolver.ts";
import type { SignatureHistory } from "../src/SignatureHistory.ts";

test("the registry is keyed by exactly the port names", () => {
  expect<keyof PortTypes>().type.toBe<PortName>();
});

test("PortServices is exactly the five port services", () => {
  expect<PortServices>().type.toBe<
    AttributeResolver | RelationshipResolver | DecisionHistory | CustomPredicate | SignatureHistory
  >();
});

test("EvaluationServices is who asks, an id, and the ports", () => {
  expect<EvaluationServices>().type.toBe<CurrentSubject | EvaluationId | PortServices>();
  expect<StandingEvaluationServices>().type.toBe<EvaluationId | PortServices>();
});

test("a description's parts are recoverable from its type", () => {
  expect<ShapeOf<PortTypes["CustomPredicate"]>>().type.toBe<CustomPredicateShape>();
  expect<AnswerOf<PortTypes["RelationshipResolver"]>>().type.toBe<RelatedResult>();
  expect<ErrorOf<PortTypes["CustomPredicate"]>>().type.toBe<CustomPredicateError>();
  expect<ArgsOf<PortTypes["DecisionHistory"]>>().type.toBe<[query: ActedQuery]>();
});

// `scripts/check-house-style.mjs` reads the port-error class names from
// `ENFORCEMENT_ERROR_CLASSES`'s "outage" rows to build `PORT_DOUBLE_BUDGET`'s
// pattern (ARCH-27). That is honest only while "outage" and "a port's error"
// name the same set, so this pins it in both directions.
type PortErrorTag = { readonly [K in PortName]: ErrorOf<PortTypes[K]>["_tag"] }[PortName];

test("a port's error tag is exactly an outage tag, so the gate can read the list from the classes (ARCH-27)", () => {
  expect<PortErrorTag>().type.toBe<EnforcementErrorTagOf<"outage">>();
});

test("an override must provide the service of the slot it names", () => {
  expect(portsLayer).type.toBeCallableWith({ AttributeResolver: attributeResolverFromRecord({}) });
  expect(portsLayer).type.toBeCallableWith({ AttributeResolver: undefined });
  expect(portsLayer).type.not.toBeCallableWith({ AttributeResolver: RelationshipResolverNever });
});

test("the layer form of tabulatePorts returns one layer per port, each of its own service", () => {
  expect(tabulatePorts(nonePort)).type.toBe<PortLayers>();
});

test("the uniform form of tabulatePorts returns the record it is given", () => {
  expect(tabulatePorts<{ readonly [K in PortName]: string }>((d) => d.method)).type.toBe<{
    readonly [K in PortName]: string;
  }>();
});

test("forEveryPort returns the results as an array", () => {
  expect(forEveryPort((d): number => d.method.length)).type.toBe<ReadonlyArray<number>>();
});
