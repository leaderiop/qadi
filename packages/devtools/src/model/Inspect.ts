/**
 * The policy, zipped against what actually happened to it.
 *
 * `explain(policy)` says what a policy *requires* and knows nothing about any
 * particular evaluation; a `Trace` says what happened and carries only
 * `policyTag`, a string. Neither alone can render the inspector's central
 * panel, which is the requirement tree with a verdict on every node.
 *
 * **The alignment is by index, and it is sound by construction.** `evaluateNode`
 * emits exactly one trace node per policy node, in declaration order: every
 * wrapper (`Not`, `Obliged`, `Labeled`) produces a single child, and `AllOf`,
 * `AnyOf` and `Rules` push one child per element they evaluated. So the i-th
 * trace child belongs to the i-th part of the explanation — and where the trace
 * has **fewer** children than the explanation has parts, those parts were
 * short-circuited.
 *
 * **A short-circuited node is not a denied one**, and this is the single place
 * in the tool where getting a distinction wrong becomes a security misreading.
 * `INV-QD-005` says a branch that is never reached performs no lookup; a
 * reviewer who reads such a node as "denied" concludes their policy rejected
 * something it never examined. `NeverResolved` is a third status for exactly
 * that reason, in the same spirit as `Error` being a third verdict.
 *
 * Zipping the `Explanation` rather than the `Policy` is deliberate: the two have
 * the same shape node for node, and the explanation already carries the phrasing
 * for permission keys, matchers and value references. Walking the policy would
 * mean writing that phrasing a second time, and a second implementation of
 * anything is what this library exists to remove.
 */
import * as Match from "effect/Match";
import { explain } from "@qadi/core";
import type {
  Combining,
  Explanation,
  FieldStrategy,
  Obligation,
  Policy,
  RuleEffect,
  Trace,
} from "@qadi/core";
import type { TimelineEntry } from "./Timeline.ts";

/**
 * `NeverResolved` is not "unknown" — it is a fact, and a useful one: this
 * branch was not needed to reach the verdict.
 */
export type NodeStatus = "Allowed" | "Denied" | "NeverResolved";

/** Mirrors the `Explanation` union, one for one. */
export type InspectKind =
  | "Requirement"
  | "All"
  | "Any"
  | "Negated"
  | "Named"
  | "Owing"
  | "Table";

export interface InspectNode {
  /**
   * Address of this node from the root, as `$.0.2`.
   *
   * Stable across renders and unique within a tree, so it serves as a React key
   * and as the thing a "jump to this node" link carries.
   */
  readonly path: string;
  readonly kind: InspectKind;
  /** What this node requires, in the explanation's own words. */
  readonly label: string;
  /** The qualifier: the requirement's kind, a combining algorithm, a duty's id. */
  readonly detail: string | undefined;
  readonly status: NodeStatus;
  /** Why, when the trace gave a reason. A denial always carries one. */
  readonly reason: string | undefined;
  /**
   * Fields visible when this node allowed.
   *
   * `undefined` is the **top** of the lattice and means *all fields*, not none
   * ([INV-QD-004](../../../../spec/invariants.md)). A renderer that shows an
   * empty list here understates a grant into a denial of everything, which is
   * the one direction of error a reviewer would act on.
   */
  readonly visibleFields: ReadonlyArray<string> | undefined;
  /** Fields this leaf itself narrows to, if it narrows. */
  readonly restrictsFields: ReadonlyArray<string> | undefined;
  /**
   * Duties this node contributed.
   *
   * Present even on a node an enclosing `Not` discarded, because the trace
   * records them there too — which is what makes dropping them defensible
   * rather than silent (ADR-QD-019).
   */
  readonly obligations: ReadonlyArray<Obligation>;
  /** `Permit` or `Deny` when this node is a row of a rule table. */
  readonly effect: RuleEffect | undefined;
  readonly children: ReadonlyArray<InspectNode>;
}

/**
 * The tree for one policy and the trace of one evaluation of it.
 *
 * `trace` may be absent — a failed evaluation produced none — and the whole
 * tree is then `NeverResolved`, which is truthful: nothing was decided.
 */
export const inspect = (policy: Policy, trace: Trace | undefined): InspectNode =>
  build(explain(policy), trace, "$", undefined);

/**
 * The tree for a timeline row, or nothing.
 *
 * **Nothing** for an orphan and for a failed evaluation, and the caller must
 * render that as an error panel rather than as an empty tree. An empty
 * requirement tree reads as "no requirements", which reads as "allowed" — the
 * exact inversion INV-QD-006 exists to prevent.
 */
export const inspectEntry = (entry: TimelineEntry): InspectNode | undefined => {
  if (entry._tag !== "TimelineDecision") return undefined;
  const outcome = entry.decision.outcome;
  if (outcome._tag !== "Decided") return undefined;
  return inspect(entry.decision.policy, outcome.decision.trace);
};

/** True when nothing in this subtree was evaluated. */
export const isNeverResolved = (node: InspectNode): boolean => node.status === "NeverResolved";

/**
 * A trace that stops at the root.
 *
 * Distinguishable from short-circuiting, and the distinction is the whole point
 * of saying it: a composite that short-circuits always evaluates at least its
 * first child, so a root that *was* resolved while **every** child was not can
 * only mean the trace was truncated before it reached the reader.
 * `dehydrateDecisions` ships a reduced trace unless `includeTrace` is set, so
 * this is a disclosure boundary rather than a defect — and wording it as "never
 * resolved" would blame the evaluator for somebody's disclosure decision.
 *
 * It takes an `InspectNode` rather than a `Trace` because a `Trace` alone
 * cannot answer it: a node with no children might be a truncated composite or
 * an ordinary leaf, and only the policy beside it distinguishes the two.
 *
 * Lives here rather than in the inspector because a replay needs the same
 * judgement — a baseline whose trace was truncated cannot be compared against,
 * and must say so rather than reporting a difference the reader would read as
 * behavioural.
 */
export const isTruncated = (node: InspectNode): boolean =>
  node.status !== "NeverResolved" &&
  node.children.length > 0 &&
  node.children.every(isNeverResolved);

/** Every node of the tree, parents before children. */
export const flattenTree = (node: InspectNode): ReadonlyArray<InspectNode> => [
  node,
  ...node.children.flatMap(flattenTree),
];

interface Part {
  readonly explanation: Explanation;
  readonly effect: RuleEffect | undefined;
}

interface Shape {
  readonly kind: InspectKind;
  readonly label: string;
  readonly detail: string | undefined;
  readonly restrictsFields: ReadonlyArray<string> | undefined;
  readonly parts: ReadonlyArray<Part>;
}

const part = (explanation: Explanation): Part => ({ explanation, effect: undefined });

const strategy = (self: FieldStrategy): string => String(self);
const algorithm = (self: Combining): string => String(self);

/**
 * The node's own presentation, and its child explanations.
 *
 * Built once at module scope per AGENTS.md §5a, and it returns data rather than
 * closures — the trace-zipping happens outside, in ordinary code, so this stays
 * a pure description of the shape.
 */
const shapeOf: (self: Explanation) => Shape = Match.type<Explanation>().pipe(
  Match.tagsExhaustive({
    Requirement: (e) => ({
      kind: "Requirement" as const,
      label: e.detail,
      detail: e.kind,
      restrictsFields: e.fields,
      parts: [],
    }),
    All: (e) => ({
      kind: "All" as const,
      label: "all of",
      detail: strategy(e.fieldStrategy),
      restrictsFields: undefined,
      parts: e.parts.map(part),
    }),
    Any: (e) => ({
      kind: "Any" as const,
      label: "any of",
      detail: strategy(e.fieldStrategy),
      restrictsFields: undefined,
      parts: e.parts.map(part),
    }),
    Negated: (e) => ({
      kind: "Negated" as const,
      label: "not",
      detail: undefined,
      restrictsFields: undefined,
      parts: [part(e.part)],
    }),
    Named: (e) => ({
      kind: "Named" as const,
      label: e.label,
      detail: "named",
      restrictsFields: undefined,
      parts: [part(e.part)],
    }),
    Owing: (e) => ({
      kind: "Owing" as const,
      label: "obliged",
      detail: e.obligation.id,
      restrictsFields: undefined,
      parts: [part(e.part)],
    }),
    Table: (e) => ({
      kind: "Table" as const,
      label: "rules",
      detail: algorithm(e.combining),
      restrictsFields: undefined,
      parts: e.rows.map((row) => ({ explanation: row.condition, effect: row.effect })),
    }),
  }),
);

const build = (
  explanation: Explanation,
  trace: Trace | undefined,
  path: string,
  effect: RuleEffect | undefined,
): InspectNode => {
  const shape = shapeOf(explanation);
  return {
    path,
    kind: shape.kind,
    label: shape.label,
    detail: shape.detail,
    status: statusOf(trace),
    reason: trace?.reason,
    visibleFields: trace?.visibleFields,
    restrictsFields: shape.restrictsFields,
    obligations: trace?.obligations ?? [],
    effect,
    // A part with no trace child at its index was short-circuited, and so is
    // everything beneath it — passing `undefined` down is what makes the whole
    // subtree read as unexamined rather than as denied.
    children: shape.parts.map((child, index) =>
      build(child.explanation, trace?.children[index], `${path}.${index}`, child.effect),
    ),
  };
};

const statusOf = (trace: Trace | undefined): NodeStatus =>
  trace === undefined ? "NeverResolved" : trace.allowed ? "Allowed" : "Denied";
