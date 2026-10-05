/**
 * The outcome of evaluating a policy.
 *
 * Every evaluation produces a full trace tree, so a denial can always answer
 * "why". Durations come from the `Clock` service rather than `performance.now`,
 * which makes traces reproducible under `TestClock` — the predecessor's traces
 * could not be asserted on at all.
 */
import * as Data from "effect/Data";
import * as Schema from "effect/Schema";
import type { VisibleFields } from "./FieldLattice.ts";
import { project as projectPaths } from "./FieldPath.ts";
import type { SubjectId } from "./Identity.ts";
import { Obligation } from "./Obligation.ts";
import { POLICY_TAGS } from "./Policy.ts";
import type { Policy } from "./Policy.ts";
import type { Resource } from "./Resource.ts";

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
// re-exported here so `@qadi/core` and `@qadi/core/Decision` keep resolving.
// ---------------------------------------------------------------------------

export { intersectFields, mergeFields, unionFields } from "./FieldLattice.ts";
export type { VisibleFields } from "./FieldLattice.ts";

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
  const term = options?.term ?? ((t: string) => `\`${t}\``);
  const indent = options?.indent ?? "  ";

  const fieldsText = (fields: VisibleFields): string => {
    // `undefined` is the top of the lattice — every field — so it renders as
    // nothing rather than as an empty list, which would invert the meaning
    // (INV-QD-004).
    if (fields === undefined) return "";
    // An empty array is the bottom of the lattice, not a missing list — say
    // so outright rather than joining zero terms into a dangling
    // ", exposing only ".
    if (fields.length === 0) return ", exposing no fields";
    return `, exposing only ${fields.map(term).join(", ")}`;
  };

  const obligationsText = (owed: ReadonlyArray<Obligation>): string =>
    owed.length === 0
      ? ""
      : `, owing ${owed
          .map((o) => `${term(o.id)}${o.advisory ? " (advisory)" : ""}`)
          .join(", ")}`;

  const go = (node: Trace, depth: number): ReadonlyArray<string> => {
    const mark = node.allowed ? "✓" : "✗";
    const named =
      node.label === undefined
        ? node.policyTag
        : `${node.policyTag} (${term(node.label)})`;
    const because = node.reason === undefined ? "" : ` — ${node.reason}`;
    const head = `${indent.repeat(depth)}${mark} ${named}${because}${fieldsText(
      node.visibleFields,
    )}${obligationsText(node.obligations)}`;

    return [head, ...node.children.flatMap((child) => go(child, depth + 1))];
  };

  return go(trace, 0).join("\n");
};
