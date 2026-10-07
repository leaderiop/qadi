/**
 * The outcome of evaluating a policy.
 *
 * Every evaluation produces a full trace tree, so a denial can always answer
 * "why". Durations come from the `Clock` service rather than `performance.now`,
 * which makes traces reproducible under `TestClock` — the predecessor's traces
 * could not be asserted on at all.
 */
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
import type { VisibleFields } from "./FieldLattice.ts";
import { project as projectPaths } from "./FieldPath.ts";
import type { SubjectId } from "./Identity.ts";
import { Obligation } from "./Obligation.ts";
import { DEFAULT_MAX_DEPTH, POLICY_TAGS } from "./Policy.ts";
import type { Policy } from "./Policy.ts";
import type { Resource } from "./Resource.ts";
import { foldTreeBy } from "./TreeFold.ts";
import { defaultTerm, fieldsClause } from "./Wording.ts";

/** One node of the evaluation tree. */
export interface Trace {
  readonly policyTag: Policy["_tag"];
  /** Present only for `Labeled` nodes. */
  readonly label?: string | undefined;
  readonly allowed: boolean;
  /**
   * The sentence explaining this node's outcome.
   *
   * A denial always carries one. An allow carries one only for `Rules`, which
   * names the row that permitted: a rule table's first diagnostic question is
   * *which row hit*, and it is asked in both directions (ADR-QD-023).
   */
  readonly reason?: string | undefined;
  readonly children: ReadonlyArray<Trace>;
  /**
   * Fields visible when this node allows. See {@link VisibleFields} for what
   * `undefined` means here.
   */
  readonly visibleFields?: VisibleFields;
  /**
   * Duties this node contributed. Empty unless it allowed.
   *
   * Required rather than optional, like `children`: every node has a set, and
   * an optional one would mean a `?? []` at each read that no execution could
   * ever take.
   *
   * Recorded here as well as on the decision so that an obligation discarded by
   * an enclosing `Not` is still visible to a reviewer. That is what makes
   * dropping it defensible rather than silent (ADR-QD-019).
   */
  readonly obligations: ReadonlyArray<Obligation>;
}

/**
 * A `Trace` on the wire. Recursive through `children`, like the policy codec.
 *
 * `policyTag` takes its literals from `POLICY_TAGS`, which `Policy.ts` derives
 * from the schema union itself, so a new `Policy` tag is accepted here with no
 * edit — the exhaustiveness a hand-written exhaustive tag record used
 * to buy by compile error is now structural (ARCH-02 C5).
 *
 * Lives beside `Trace` itself rather than beside whichever boundary first
 * needed it: `SinkCodec.ts`'s wire form of a `Decision`, `@qadi/react`'s
 * `Hydration.ts` (a `Trace` crosses a trust boundary there too), and now
 * `Errors.ts`'s `AccessDenied` (ADR-QD-072) all import this one definition
 * rather than each describing `Trace`'s shape again — duplicating
 * the tag list or this recursion in a second file is exactly the drift
 * ADR-QD-002's reasoning warns about. Originally defined in `SinkCodec.ts`;
 * moved here so `Errors.ts` can reach it too without a
 * `Errors.ts` → `SinkCodec.ts` → `Errors.ts` cycle (`SinkCodec.ts` already
 * imports several of `Errors.ts`'s classes).
 */
export const TraceSchema: Schema.Codec<Trace> = Schema.suspend(
  (): Schema.Codec<Trace> =>
    Schema.Struct({
      policyTag: Schema.Literals(POLICY_TAGS),
      label: Schema.optional(Schema.String),
      allowed: Schema.Boolean,
      reason: Schema.optional(Schema.String),
      children: Schema.Array(TraceSchema),
      visibleFields: Schema.optional(Schema.Array(Schema.String)),
      obligations: Schema.Array(Obligation),
    }),
);

export class Allow extends Data.TaggedClass("Allow")<{
  readonly evaluationId: string;
  readonly subjectId: SubjectId;
  readonly durationMillis: number;
  readonly trace: Trace;
  /** See {@link VisibleFields} for what `undefined` means here. */
  readonly visibleFields: VisibleFields;
  /**
   * What the caller must do as a condition of this permission.
   *
   * Always an array; empty is the common case. `Deny` has no counterpart — an
   * obligation conditions permission, and a denial permits nothing.
   */
  readonly obligations: ReadonlyArray<Obligation>;
}> {}

export class Deny extends Data.TaggedClass("Deny")<{
  readonly evaluationId: string;
  readonly subjectId: SubjectId;
  readonly durationMillis: number;
  readonly trace: Trace;
  readonly reason: string;
}> {}

export type Decision = Allow | Deny;

/** True when the decision permits the action. */
export const isAllowed = (self: Decision): self is Allow => self._tag === "Allow";

/**
 * A runtime field name is a member of `A`'s keys exactly when `data` actually
 * has it — that fact lives at runtime, not in `A`'s type, so a user-defined
 * type predicate is what turns it into a compile-time one. This is the single
 * place the boundary between "`visibleFields` is a `ReadonlyArray<string>`"
 * and "`A`'s keys" gets crossed; everywhere downstream of it is fully typed.
 */
const isFieldOf = <A extends Resource>(
  data: A,
  field: string,
): field is keyof A & string => Object.hasOwn(data, field);

/**
 * Projects a record down to the fields the decision makes visible.
 *
 * A denial exposes nothing. An allow with no field restriction exposes
 * everything, since `undefined` is the top of the visibility lattice. A field
 * spec may now be a dot-path or carry a `*`/`**` wildcard (`FieldPath.ts`);
 * this function's own job stays what it always was — crossing from that
 * untyped projection back into a typed `Partial<A>` for the caller — while
 * `FieldPath.project` does the recursive, path-aware work of deciding what
 * each key's value collapses to.
 *
 * **`Partial<A>` understates the shape for a `"*"`-projected nested object.**
 * A single-level `"*"` (as opposed to the unbounded `"**"` or a bare literal)
 * caps an object-valued child to `{}` rather than showing its own fields
 * (`FieldPath.ts`'s `projectAt`) — so a spec like `"address.*"` returns
 * `address: {}` at runtime, not the `A["address"]` this return type promises
 * once narrowed. The accurate type would be a deep-partial over `A`, but
 * `project`/`enforceProjected` (`Qadi.ts`) are public, and `Partial<A>` is
 * exactly the shape every caller across the workspace — `@qadi/react`'s
 * `useProjected` included — already narrows against; swapping in a deep
 * partial would change what every one of those call sites infers, for a
 * caveat that only matters to a caller reading into a `"*"`-capped subtree.
 * Read a nested object off a projected value only after checking which spec
 * reached it.
 */
export const project = <A extends Resource>(
  decision: Decision,
  data: A,
): Partial<A> => (isAllowed(decision) ? projectVisible(decision.visibleFields, data) : {});

/**
 * Projects a record down to a visible-field set, with no decision in hand.
 *
 * The body of {@link project} after its verdict check, factored out so a
 * consumer holding a field set but not a core `Allow` — `@qadi/react`'s seeded
 * allow, which is a projection of the server's decision and not one — projects
 * through the same code rather than a copy of it ([BEH-QD-051](../../../spec/behaviors/07-enforcement.md)).
 * See {@link project} for what the result's type does and does not promise.
 */
export const projectVisible = <A extends Resource>(
  visibleFields: VisibleFields,
  data: A,
): Partial<A> => {
  // A shallow copy, not `return data` — the restricted branch below always
  // builds a fresh `out` object, and returning the caller's own reference
  // here would let a caller who mutates the unrestricted result silently
  // mutate `data` too, an aliasing behavior the two branches must not
  // disagree on. `BEH-QD-051`'s requirement ("MUST project to the whole
  // record") is unaffected either way — it says nothing about aliasing — so
  // this is an implementation fix, not a documented-behavior change.
  if (visibleFields === undefined) return { ...data };

  const projected = projectPaths(data, visibleFields);

  // Not a write through `out[field] = …` — TS permits reading a
  // generic-indexed type but not writing through one (TS2862) — but also not
  // `Object.assign(out, { [field]: … })`: `field` is untrusted (`data`,
  // hence `projected`, may be `JSON.parse`d and carry its own "__proto__"
  // key), and `Object.assign`'s ordinary `[[Set]]` on a plain `out` would
  // invoke `Object.prototype`'s inherited `__proto__` *setter* rather than
  // create an own property, mutating `out`'s real prototype instead of
  // storing the value. `Object.defineProperty` always defines an own data
  // property directly, whatever `field` is.
  const out: Partial<A> = {};
  for (const field of Object.keys(projected)) {
    if (isFieldOf(data, field)) {
      Object.defineProperty(out, field, {
        value: projected[field],
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Field visibility lattice — lives in `FieldLattice.ts` (ARCH-12, ADR-QD-092),
// re-exported here so `@qadi/core` keeps resolving.
// ---------------------------------------------------------------------------

export { intersectFields, mergeFields, unionFields } from "./FieldLattice.ts";
export type { VisibleFields } from "./FieldLattice.ts";

// ---------------------------------------------------------------------------
// Folding a trace
// ---------------------------------------------------------------------------

/**
 * One arm per `Policy` tag, each receiving the results of the trace node's
 * children in the shape the tag gives them.
 *
 * The `Trace` twin of `PolicyCases`, in the case form from the start (ARCH-17,
 * ARCH-22 D-22-a). A leaf receives only its node; `AllOf`, `AnyOf` and `Rules`
 * receive one result per child **that was evaluated**, which can be fewer than the
 * policy has (short-circuiting, INV-QD-020); a wrapper (`Not`, `Obliged`,
 * `Labeled`) receives its child's result, or `undefined` for a hand-built or
 * foreign trace that has none. An evaluation always gives a wrapper exactly one.
 */
export interface TraceCases<R> {
  readonly HasPermission: (node: Trace) => R;
  readonly HasRole: (node: Trace) => R;
  readonly HasAttribute: (node: Trace) => R;
  readonly HasResourceAttribute: (node: Trace) => R;
  readonly HasRelationship: (node: Trace) => R;
  readonly HasAction: (node: Trace) => R;
  readonly HasActed: (node: Trace) => R;
  readonly HasNotActed: (node: Trace) => R;
  readonly HasCustom: (node: Trace) => R;
  readonly HasSignature: (node: Trace) => R;
  readonly AllOf: (node: Trace, children: ReadonlyArray<R>) => R;
  readonly AnyOf: (node: Trace, children: ReadonlyArray<R>) => R;
  readonly Rules: (node: Trace, children: ReadonlyArray<R>) => R;
  readonly Not: (node: Trace, child: R | undefined) => R;
  readonly Obliged: (node: Trace, child: R | undefined) => R;
  readonly Labeled: (node: Trace, child: R | undefined) => R;
}

type TraceStep = <R>(cases: TraceCases<R>, children: ReadonlyArray<R>) => R;

/**
 * The children a trace node is folded through, by its tag's shape: none for a
 * leaf, its first child for a wrapper, every child otherwise.
 *
 * Read by `traceStep` below, which hands exactly these results to the arm; a
 * leaf's `children` are not walked, so a foreign leaf that carries some cannot
 * reach a fold that was told it has none.
 */
const leafTags = [
  "HasPermission",
  "HasRole",
  "HasAttribute",
  "HasResourceAttribute",
  "HasRelationship",
  "HasAction",
  "HasActed",
  "HasNotActed",
  "HasCustom",
  "HasSignature",
] as const;

/** How a tag's trace node is folded: nothing beneath it, one child, or all of them. */
type TraceShape = "Leaf" | "Wrapper" | "Many";

const traceShapeOf: (tag: Trace["policyTag"]) => TraceShape = Match.type<
  Trace["policyTag"]
>().pipe(
  Match.whenOr(...leafTags, (): TraceShape => "Leaf"),
  Match.whenOr("Not", "Obliged", "Labeled", (): TraceShape => "Wrapper"),
  Match.whenOr("AllOf", "AnyOf", "Rules", (): TraceShape => "Many"),
  Match.exhaustive,
);

const traceChildrenOf = (self: Trace): ReadonlyArray<Trace> => {
  const shape = traceShapeOf(self.policyTag);
  return shape === "Leaf" ? [] : shape === "Wrapper" ? self.children.slice(0, 1) : self.children;
};

const traceStep: (node: Trace) => TraceStep = (node) =>
  Match.value(node.policyTag).pipe(
    Match.when("HasPermission", (): TraceStep => (cases) => cases.HasPermission(node)),
    Match.when("HasRole", (): TraceStep => (cases) => cases.HasRole(node)),
    Match.when("HasAttribute", (): TraceStep => (cases) => cases.HasAttribute(node)),
    Match.when("HasResourceAttribute", (): TraceStep => (cases) => cases.HasResourceAttribute(node)),
    Match.when("HasRelationship", (): TraceStep => (cases) => cases.HasRelationship(node)),
    Match.when("HasAction", (): TraceStep => (cases) => cases.HasAction(node)),
    Match.when("HasActed", (): TraceStep => (cases) => cases.HasActed(node)),
    Match.when("HasNotActed", (): TraceStep => (cases) => cases.HasNotActed(node)),
    Match.when("HasCustom", (): TraceStep => (cases) => cases.HasCustom(node)),
    Match.when("HasSignature", (): TraceStep => (cases) => cases.HasSignature(node)),
    Match.when("AllOf", (): TraceStep => (cases, children) => cases.AllOf(node, children)),
    Match.when("AnyOf", (): TraceStep => (cases, children) => cases.AnyOf(node, children)),
    Match.when("Rules", (): TraceStep => (cases, children) => cases.Rules(node, children)),
    Match.when("Not", (): TraceStep => (cases, children) => cases.Not(node, children[0])),
    Match.when("Obliged", (): TraceStep => (cases, children) => cases.Obliged(node, children[0])),
    Match.when("Labeled", (): TraceStep => (cases, children) => cases.Labeled(node, children[0])),
    Match.exhaustive,
  );

/**
 * Folds a trace bottom-up with one arm per tag, without native recursion.
 *
 * The stack-safe walk for a caller-held trace: `Trace.children` is public and
 * `AccessDenied.trace` reaches every host, so a host that walks one needs a
 * primitive that holds at any nesting depth (INV-QD-090). Nothing in this
 * repository uses it, because `renderTrace` needs pre-order with indentation and
 * `diffTraces` walks two trees in lockstep; it is for callers.
 *
 * The `Trace` twin of `foldPolicyCases`: a subtree **shared by identity** is
 * combined once and its result reused (a trace the evaluator built never shares
 * one, a hand-built trace can), and a cyclic trace throws. The loop is the
 * internal `TreeFold.ts`'s, so those two facts are the same ones `foldPolicy` and
 * `foldExplanation` give.
 */
export const foldTrace = <R>(self: Trace, cases: TraceCases<R>): R =>
  foldTreeBy<Trace, R>(self, traceChildrenOf, (node, resultOf) =>
    traceStep(node)(cases, traceChildrenOf(node).map(resultOf)),
  );

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export interface RenderTraceOptions {
  /**
   * Wraps a caller-supplied name — a label, a field, an obligation id — for
   * emphasis. Defaults to backticks, as `renderExplanation` does.
   *
   * Policy tags are deliberately left bare: they are structural, not names the
   * caller chose.
   */
  readonly term?: (text: string) => string;
  /** What one level of depth prepends. Defaults to two spaces. */
  readonly indent?: string;
  /**
   * Levels of indentation before a line writes its depth as a number instead.
   *
   * Defaults to `DEFAULT_MAX_DEPTH`, so every trace evaluated under the default
   * bound renders unchanged. Past the limit a line keeps that many levels of
   * indent and is prefixed `(depth N) `. `Infinity` restores full indentation,
   * whose output grows with the square of the depth; a value below 0 or `NaN` means
   * none (ARCH-22 D-22-b).
   */
  readonly indentLimit?: number;
}

/**
 * One plain-text rendering of an evaluation tree.
 *
 * The counterpart to `renderExplanation`, and the distinction between them is
 * the one [ADR-QD-027](../../../spec/decisions/027-policy-explanation.md) draws:
 * an explanation says what a *rule* requires and takes no subject; a trace says
 * what *happened* to one subject and is meaningless without them. This renders
 * the second.
 *
 * It exists because a denial reaches most callers as one sentence — the root
 * node's `reason`, on `AccessDenied` — while the subtree that explains it is
 * already built and, until now, discarded. A string reaches every environment
 * this library runs in: a log line, a thrown error, a test failure, an HTTP
 * body. That is why the trace is rendered here rather than shown in a tool.
 *
 * **A rendered trace shows what was evaluated, not what was asked.** Children
 * after the decisive one are absent from `children` rather than marked, because
 * the evaluator discards them
 * ([INV-QD-020](../../../spec/invariants.md)) so a trace cannot depend on a
 * performance switch. Recovering "which branches were never reached" needs the
 * `Policy` alongside the trace, which this function deliberately does not take.
 */
export const renderTrace = (
  trace: Trace,
  options?: RenderTraceOptions,
): string => {
  const term = options?.term ?? defaultTerm;
  const indent = options?.indent ?? "  ";
  // `NaN` and a negative limit mean no indentation, never an unbounded one:
  // `Math.min(depth, NaN)` would be `NaN` and `repeat(NaN)` is `""` by accident.
  const requested = options?.indentLimit ?? DEFAULT_MAX_DEPTH;
  const limit = Number.isNaN(requested) ? 0 : Math.max(0, requested);

  const obligationsText = (owed: ReadonlyArray<Obligation>): string =>
    owed.length === 0
      ? ""
      : `, owing ${owed
          .map((o) => `${term(o.id)}${o.advisory ? " (advisory)" : ""}`)
          .join(", ")}`;

  // Pre-order over an explicit stack, not native recursion (ARCH-22 C2,
  // INV-QD-090). A fold would re-indent every descendant's text at every level;
  // a line is final the moment its node is met, so nothing is built twice.
  const lines: Array<string> = [];
  const pending: Array<{ readonly node: Trace; readonly depth: number }> = [
    { node: trace, depth: 0 },
  ];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const { node, depth } = next;
    const mark = node.allowed ? "✓" : "✗";
    const named =
      node.label === undefined
        ? node.policyTag
        : `${node.policyTag} (${term(node.label)})`;
    const because = node.reason === undefined ? "" : ` — ${node.reason}`;
    // Past the limit a line keeps `limit` levels of indent and says its depth,
    // so output grows with the node count, not its square (ARCH-22 N3).
    const prefix = depth > limit ? `(depth ${depth}) ` : "";
    lines.push(
      `${indent.repeat(Math.min(depth, limit))}${prefix}${mark} ${named}${because}${fieldsClause(
        node.visibleFields,
        term,
      )}${obligationsText(node.obligations)}`,
    );
    // Last-to-first, so children pop first-to-last.
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child !== undefined) pending.push({ node: child, depth: depth + 1 });
    }
  }

  return lines.join("\n");
};
