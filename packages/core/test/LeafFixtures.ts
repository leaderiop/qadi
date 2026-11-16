/**
 * Every leaf policy, and what each one is allowed to need from the request: the
 * fixtures `LeafMatrix.test.ts` runs, and the oracle it checks them against.
 *
 * A plain module and not a `.test.ts`, because an import of a test file
 * re-registers its `describe` blocks. The oracle is written by hand from
 * ADR-QD-163's D-05 rule (a leaf's own input first, then what its matcher
 * references, action before resource, then a resource-scoped port read's
 * resource id) and is deliberately NOT read from any table the change under
 * test introduces, nor from the decision module's own list of leaf tags: a
 * characterisation that derived its expectations from the code it guards would
 * pass whatever the code did (INV-QD-011).
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type * as Layer from "effect/Layer";
import { isAllowed } from "../src/Decision.ts";
import type { Decision } from "../src/Decision.ts";
import {
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyNotTranslatable,
} from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import type { LeafPolicy, Policy } from "../src/Policy.ts";
import { toPredicate } from "../src/Predicate.ts";
import type { EvaluateOptions } from "../src/Question.ts";
import { subjectWith, testLayer } from "./helpers.ts";
import type { QadiServices } from "./helpers.ts";

export type LeafTag = LeafPolicy["_tag"];

/** True for the ten leaf tags, read from the policy's own leaf dispatch table. */
export const isLeafPolicy = (policy: Policy): policy is LeafPolicy =>
  Object.hasOwn(P.leafCases(() => 0), policy._tag);

/** What a leaf's own evaluation reads before anything else. */
export type Own = "Nothing" | "Action" | "Resource";
/** What the leaf's matcher references. */
export type Refs = "none" | "action" | "resource";

export interface Fixture {
  /** The row's name in a failure message. */
  readonly label: string;
  readonly policy: LeafPolicy;
  /** The input the leaf needs for itself. */
  readonly own: Own;
  /** The input its matcher references. */
  readonly refs: Refs;
  /** What a failure names: the attribute, or the relation, event or meaning of a scoped port read. */
  readonly name: string;
  /** `MissingAction`'s `expected`, for a leaf that requires one verb. */
  readonly expected?: string;
  /** Whether the leaf reads a port keyed by the resource's id. */
  readonly scoped: boolean;
  /** The decision with every input present (`Allow` or `Deny: <reason>`), copied from a run on the base. */
  readonly settled: string;
  /** `toPredicate`'s label with the action supplied, copied from a run on the base. */
  readonly compiled: string;
}

const fixture = (policy: Policy, rest: Omit<Fixture, "policy">): Fixture => {
  if (!isLeafPolicy(policy)) throw new Error(`not a leaf: ${policy._tag}`);
  return { policy, ...rest };
};

/** Typed over every leaf tag: a tag with no fixtures is a compile error (TS2741). */
export const FIXTURES: { readonly [K in LeafTag]: ReadonlyArray<Fixture> } = {
  HasPermission: [
    fixture(P.hasPermission(permission("doc", "read")), {
      label: "HasPermission(held)",
      own: "Nothing",
      refs: "none",
      name: "",
      scoped: false,
      settled: "Allow",
      compiled: 'PRED {"_tag":"True"}',
    }),
    fixture(P.hasPermission(permission("doc", "write")), {
      label: "HasPermission(not held)",
      own: "Nothing",
      refs: "none",
      name: "",
      scoped: false,
      settled: "Deny: subject lacks permission 'doc:write'",
      compiled: 'PRED {"_tag":"False"}',
    }),
  ],
  HasRole: [
    fixture(P.hasRole("editor"), {
      label: "HasRole(held)",
      own: "Nothing",
      refs: "none",
      name: "",
      scoped: false,
      settled: "Allow",
      compiled: 'PRED {"_tag":"True"}',
    }),
    fixture(P.hasRole("admin"), {
      label: "HasRole(not held)",
      own: "Nothing",
      refs: "none",
      name: "",
      scoped: false,
      settled: "Deny: subject lacks role 'admin'",
      compiled: 'PRED {"_tag":"False"}',
    }),
  ],
  HasAction: [
    fixture(P.hasAction("read"), {
      label: "HasAction(read)",
      own: "Action",
      refs: "none",
      name: "",
      expected: "read",
      scoped: false,
      settled: "Allow",
      compiled: 'PRED {"_tag":"True"}',
    }),
  ],
  HasAttribute: [
    fixture(P.hasAttribute("department", M.neq(M.literal("x"))), {
      label: "HasAttribute[no ref]",
      own: "Nothing",
      refs: "none",
      name: "department",
      scoped: false,
      settled: "Allow",
      compiled: 'PRED {"_tag":"True"}',
    }),
    fixture(P.hasAttribute("department", M.eq(M.action())), {
      label: "HasAttribute[ref action]",
      own: "Nothing",
      refs: "action",
      name: "department",
      scoped: false,
      settled: "Deny: subject attribute 'department' did not match",
      compiled: 'PRED {"_tag":"False"}',
    }),
    fixture(P.hasAttribute("department", M.fieldMatch("x", M.eq(M.action()))), {
      label: "HasAttribute[nested ref action]",
      own: "Nothing",
      refs: "action",
      name: "department",
      scoped: false,
      settled: "Deny: subject attribute 'department' is not a value this matcher can compare",
      compiled: 'PRED {"_tag":"False"}',
    }),
    fixture(P.hasAttribute("department", M.eq(M.resource("owner"))), {
      label: "HasAttribute[ref resource]",
      own: "Nothing",
      refs: "resource",
      name: "department",
      scoped: false,
      settled: "Deny: subject attribute 'department' did not match",
      compiled: "Refused:HasAttribute: the matcher compares against the resource, which is a column",
    }),
    fixture(P.hasAttribute("department", M.someMatch(M.eq(M.resource("owner")))), {
      label: "HasAttribute[nested ref resource]",
      own: "Nothing",
      refs: "resource",
      name: "department",
      scoped: false,
      settled: "Deny: subject attribute 'department' is not a value this matcher can compare",
      compiled: "Refused:HasAttribute: the matcher compares against the resource, which is a column",
    }),
  ],
  HasResourceAttribute: [
    fixture(P.hasResourceAttribute("owner", M.eq(M.literal("u-1"))), {
      label: "HasResourceAttribute[no ref]",
      own: "Resource",
      refs: "none",
      name: "owner",
      scoped: false,
      settled: "Allow",
      compiled: 'PRED {"_tag":"Compare","column":"owner","op":"Eq","value":"u-1"}',
    }),
    fixture(P.hasResourceAttribute("owner", M.eq(M.action())), {
      label: "HasResourceAttribute[ref action]",
      own: "Resource",
      refs: "action",
      name: "owner",
      scoped: false,
      settled: "Deny: resource attribute 'owner' did not match",
      compiled: 'PRED {"_tag":"Compare","column":"owner","op":"Eq","value":"read"}',
    }),
    fixture(P.hasResourceAttribute("owner", M.eq(M.resource("other"))), {
      label: "HasResourceAttribute[ref resource]",
      own: "Resource",
      refs: "resource",
      name: "owner",
      scoped: false,
      settled: "Deny: resource attribute 'owner' did not match",
      compiled: "Refused:HasResourceAttribute: matcher 'Eq' on column 'owner' has no predicate form",
    }),
  ],
  HasRelationship: [
    fixture(P.hasRelationship("owner"), {
      label: "HasRelationship",
      own: "Nothing",
      refs: "none",
      name: "owner",
      scoped: true,
      settled: "Deny: no relationship resolver could confirm the 'owner' relation to 'r1'",
      compiled: "Refused:HasRelationship: a relationship is keyed by the row's id and cannot fold",
    }),
  ],
  HasActed: [
    fixture(P.hasActed("e", { scope: "Resource" }), {
      label: "HasActed[Resource]",
      own: "Nothing",
      refs: "none",
      name: "e",
      scoped: true,
      settled: "Deny: no history is available for 'e'",
      compiled: "Refused:HasActed: a resource-scoped history question is keyed by the row",
    }),
    fixture(P.hasActed("e", { scope: "Any" }), {
      label: "HasActed[Any]",
      own: "Nothing",
      refs: "none",
      name: "e",
      scoped: false,
      settled: "Deny: no history is available for 'e'",
      compiled: 'PRED {"_tag":"False"}',
    }),
  ],
  HasNotActed: [
    fixture(P.hasNotActed("e", { scope: "Resource" }), {
      label: "HasNotActed[Resource]",
      own: "Nothing",
      refs: "none",
      name: "e",
      scoped: true,
      settled: "Deny: no history is available for 'e'",
      compiled: "Refused:HasNotActed: a resource-scoped history question is keyed by the row",
    }),
    fixture(P.hasNotActed("e", { scope: "Any" }), {
      label: "HasNotActed[Any]",
      own: "Nothing",
      refs: "none",
      name: "e",
      scoped: false,
      settled: "Deny: no history is available for 'e'",
      compiled: 'PRED {"_tag":"False"}',
    }),
  ],
  HasCustom: [
    fixture(P.hasCustom("c"), {
      label: "HasCustom",
      own: "Nothing",
      refs: "none",
      name: "",
      scoped: false,
      settled: "Deny: custom predicate 'c' returned false",
      compiled: "Refused:HasCustom: 'c' is opaque, externally-registered logic and cannot be reduced to a resource-independent expression",
    }),
  ],
  HasSignature: [
    fixture(P.hasSignature("m", { scope: "Resource" }), {
      label: "HasSignature[Resource]",
      own: "Nothing",
      refs: "none",
      name: "m",
      scoped: true,
      settled: "Deny: no signatures are on file for subject 'u-1'",
      compiled: "Refused:HasSignature: a signature is looked up through an external port and cannot fold into a resource-independent expression",
    }),
    fixture(P.hasSignature("m", { scope: "Any" }), {
      label: "HasSignature[Any]",
      own: "Nothing",
      refs: "none",
      name: "m",
      scoped: false,
      settled: "Deny: no signatures are on file for subject 'u-1'",
      compiled: "Refused:HasSignature: a signature is looked up through an external port and cannot fold into a resource-independent expression",
    }),
  ],
};

export type ResourceShape = "none" | "no-id" | "id";

/** The three resource shapes a request can carry: none, one without an `id`, one with. */
export const SHAPES: ReadonlyArray<{
  readonly shape: ResourceShape;
  readonly resource: { readonly [key: string]: string } | undefined;
}> = [
  { shape: "none", resource: undefined },
  { shape: "no-id", resource: { owner: "u-1", other: "x" } },
  { shape: "id", resource: { id: "r1", owner: "u-1", other: "x" } },
];

/** `evaluate`'s options for a cell; `exactOptionalPropertyTypes` forbids an explicit `undefined`. */
export const requestOf = (action: boolean, shape: ResourceShape): EvaluateOptions => {
  const resource = SHAPES.find((s) => s.shape === shape)?.resource;
  return {
    ...(action ? { action: "read" } : {}),
    ...(resource === undefined ? {} : { resource }),
  };
};

/**
 * What a cell must give, by the D-05 rule: the leaf's own input first, then what
 * its matcher references (action before resource), then a resource-scoped read's
 * resource id, else the fixture's settled decision.
 */
export const oracle = (f: Fixture, action: boolean, shape: ResourceShape): string => {
  const resource = shape !== "none";
  if (f.own === "Action" && !action) return `Action:${f.expected ?? "-"}`;
  if (f.own === "Resource" && !resource) return `Resource:${f.name}`;
  if (f.refs === "action" && !action) return "Action:-";
  if (f.refs === "resource" && !resource) return `Resource:${f.name}`;
  if (f.scoped && shape !== "id") return `ResourceId:${f.name}`;
  return f.settled;
};

/**
 * A failure's label: the error's tag and payload. A `MissingAction` with no
 * `expected` and one whose `expected` is an own `undefined` read the same, so the
 * characterisation does not depend on which of the two a code path builds.
 */
export const labelOf = (error: unknown): string => {
  if (error instanceof MissingAction) return `Action:${error.expected ?? "-"}`;
  if (error instanceof MissingResource) return `Resource:${error.attribute}`;
  if (error instanceof MissingResourceId) return `ResourceId:${error.relation}`;
  if (error instanceof PolicyNotTranslatable) {
    return `Refused:${error.policyTag}: ${error.reason}`;
  }
  return `other:${String(error)}`;
};

/** A decision's label: `Allow`, or `Deny: <reason>`. */
export const decisionLabel = (decision: Decision): string =>
  isAllowed(decision) ? "Allow" : `Deny: ${decision.reason}`;

export const leafSubject = subjectWith({
  id: "u-1",
  roles: ["editor"],
  permissions: ["doc:read"],
  attributes: { department: "cardiology" },
});

export const leafLayer: Layer.Layer<QadiServices> = testLayer(leafSubject);

/** One `evaluate` cell as its label. */
export const evaluateLabel = (
  policy: Policy,
  action: boolean,
  shape: ResourceShape,
): Effect.Effect<string> =>
  Effect.exit(evaluate(policy, requestOf(action, shape))).pipe(
    Effect.map((exit) =>
      Exit.isSuccess(exit) ? decisionLabel(exit.value) : labelOf(Cause.squash(exit.cause)),
    ),
    Effect.provide(leafLayer),
  );

/** One `toPredicate` cell as its label: `PRED <json>` or the failure's label. */
export const predicateLabel = (policy: Policy, action: boolean): Effect.Effect<string> =>
  Effect.exit(toPredicate(policy, action ? { action: "read" } : undefined)).pipe(
    Effect.map((exit) =>
      Exit.isSuccess(exit)
        ? `PRED ${JSON.stringify(exit.value)}`
        : labelOf(Cause.squash(exit.cause)),
    ),
    Effect.provide(leafLayer),
  );
