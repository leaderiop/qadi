/**
 * The outcome of evaluating a policy.
 *
 * Every evaluation produces a full trace tree, so a denial can always answer
 * "why". Durations come from the `Clock` service rather than `performance.now`,
 * which makes traces reproducible under `TestClock` — the predecessor's traces
 * could not be asserted on at all.
 */
import * as Data from "effect/Data";
import { compareShapes, project as projectPaths, shapeOf } from "./FieldPath.ts";
import type { SubjectId } from "./Identity.ts";
import type { Obligation } from "./Obligation.ts";
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
   * Fields visible when this node allows. `undefined` is the top of the
   * lattice and means "all fields", not "none".
   */
  readonly visibleFields?: ReadonlyArray<string> | undefined;
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

export class Allow extends Data.TaggedClass("Allow")<{
  readonly evaluationId: string;
  readonly subjectId: SubjectId;
  readonly durationMillis: number;
  readonly trace: Trace;
  readonly visibleFields: ReadonlyArray<string> | undefined;
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
): Partial<A> => {
  if (!isAllowed(decision)) return {};
  if (decision.visibleFields === undefined) return data;

  const projected = projectPaths(data, decision.visibleFields);

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
// Field visibility lattice
// ---------------------------------------------------------------------------

/**
 * Intersects two visible-field sets.
 *
 * `undefined` means "all fields" — the top of the lattice — so intersecting it
 * with any set yields that set.
 *
 * Pairwise via `compareFieldPaths` rather than an exact-string-set filter: a
 * field spec may be a dot-path with a `*`/`**` wildcard, and `"address.**"`
 * must intersect with `"address.street"` to `"address.street"`, not to `[]`
 * — an exact-string filter would silently deny something a caller's own
 * narrower spec already grants. Every pair with no subsumption relationship
 * contributes nothing (`Incomparable`), which is the conservative, fails-
 * closed direction.
 *
 * `shapeOf` runs once per spec, not once per pair. The comparison itself is
 * O(|a|·|b|), and `compareFieldPaths` computes both operands' `shapeOf` —
 * `split(".")` plus two array allocations — on every call; over the same
 * array pairwise-compared |b| (or |a|) times, that recomputed an identical
 * shape from scratch every time. `compareShapes` takes the already-computed
 * shape instead, so each spec's `shapeOf` is paid for exactly once here,
 * however many pairs it is compared across.
 */
export const intersectFields = (
  a: ReadonlyArray<string> | undefined,
  b: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  // Paired with its own shape rather than parallel arrays walked by index:
  // `noUncheckedIndexedAccess` would otherwise type every lookup as possibly
  // `undefined`, for an invariant (same length, same order) a pairing already
  // guarantees outright.
  // Paired with its own shape rather than parallel arrays walked by index:
  // `noUncheckedIndexedAccess` would otherwise type every lookup as possibly
  // `undefined`, for an invariant (same length, same order) a pairing already
  // guarantees outright.
  const shapedA = a.map((spec) => ({ spec, shape: shapeOf(spec) }));
  const shapedB = b.map((spec) => ({ spec, shape: shapeOf(spec) }));
  const kept: Array<string> = [];
  for (const specA of shapedA) {
    for (const specB of shapedB) {
      const cmp = compareShapes(specA.shape, specB.shape);
      if (cmp === "Equal" || cmp === "BLessA") kept.push(specB.spec);
      else if (cmp === "ALessB") kept.push(specA.spec);
    }
  }
  return [...new Set(kept)];
};

/**
 * Unions two visible-field sets, preserving "all fields" as absorbing.
 *
 * No path-aware algorithm change needed here, unlike `intersectFields`:
 * applying every spec in both sides and unioning the results is correct
 * regardless of overlap — a redundant, subsumed entry (e.g. `"address.street"`
 * alongside `"address.**"`) projects identically to omitting it, so exact-set
 * union stays correct even though the strings themselves may now be paths.
 */
export const unionFields = (
  a: ReadonlyArray<string> | undefined,
  b: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined => {
  if (a === undefined || b === undefined) return undefined;
  return [...new Set([...a, ...b])];
};

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

  const fieldsText = (fields: ReadonlyArray<string> | undefined): string => {
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
