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
import type { CustomPredicateError } from "../src/Errors.ts";
import type { EvaluationServices, StandingEvaluationServices } from "../src/Evaluate.ts";
import type { EvaluationId } from "../src/EvaluationId.ts";
import type { PortName } from "../src/PortMetrics.ts";
import { portsLayer } from "../src/Ports.ts";
import type { AnswerOf, ArgsOf, ErrorOf, PortServices, PortTypes, ShapeOf } from "../src/Ports.ts";
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

test("an override must provide the service of the slot it names", () => {
  expect(portsLayer).type.toBeCallableWith({ AttributeResolver: attributeResolverFromRecord({}) });
  expect(portsLayer).type.toBeCallableWith({ AttributeResolver: undefined });
  expect(portsLayer).type.not.toBeCallableWith({ AttributeResolver: RelationshipResolverNever });
});
