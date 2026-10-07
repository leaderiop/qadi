/**
 * Frozen oracles for the `Trace` walkers (ARCH-22 T1).
 *
 * `oracleRenderTrace` and `oracleDiffTraces` are `renderTrace` and `diffTraces`
 * exactly as they stood at `e328e75`, when both recursed natively. They are an
 * oracle, not a second implementation: the stack-safe loops that replaced them
 * must agree with them byte for byte (render) and deep-equal (diff) on every
 * trace shallow enough for a recursion to survive. Do not "improve" them; if a
 * walker's contract changes on purpose, change the oracle in the same commit and
 * say why.
 */
import * as Equal from "effect/Equal";
import * as FastCheck from "fast-check";
import type { Trace } from "../src/Decision.ts";
import { obligation } from "../src/Obligation.ts";
import type { Obligation } from "../src/Obligation.ts";
import type { TraceDifference, TracePath } from "../src/TraceDiff.ts";

export const oracleRenderTrace = (
  trace: Trace,
  options?: { readonly term?: (text: string) => string; readonly indent?: string },
): string => {
  const term = options?.term ?? ((t: string) => `\`${t}\``);
  const indent = options?.indent ?? "  ";
  const fieldsText = (fields: ReadonlyArray<string> | undefined): string => {
    if (fields === undefined) return "";
    if (fields.length === 0) return ", exposing no fields";
    return `, exposing only ${fields.map(term).join(", ")}`;
  };
  const obligationsText = (owed: ReadonlyArray<Obligation>): string =>
    owed.length === 0
      ? ""
      : `, owing ${owed.map((o) => `${term(o.id)}${o.advisory ? " (advisory)" : ""}`).join(", ")}`;
  const go = (node: Trace, depth: number): ReadonlyArray<string> => {
    const mark = node.allowed ? "✓" : "✗";
    const named =
      node.label === undefined ? node.policyTag : `${node.policyTag} (${term(node.label)})`;
    const because = node.reason === undefined ? "" : ` — ${node.reason}`;
    const head = `${indent.repeat(depth)}${mark} ${named}${because}${fieldsText(
      node.visibleFields,
    )}${obligationsText(node.obligations)}`;
    return [head, ...node.children.flatMap((child) => go(child, depth + 1))];
  };
  return go(trace, 0).join("\n");
};

const sameStringSet = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((f, i) => f === sortedB[i]);
};

const sameFields = (
  a: ReadonlyArray<string> | undefined,
  b: ReadonlyArray<string> | undefined,
): boolean => {
  if (a === undefined || b === undefined) return a === b;
  return sameStringSet(a, b);
};

const sameObligationSet = (a: ReadonlyArray<Obligation>, b: ReadonlyArray<Obligation>): boolean => {
  if (a.length !== b.length) return false;
  const remaining = [...b];
  for (const candidate of a) {
    const index = remaining.findIndex((seen) => Equal.equals(seen, candidate));
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return true;
};

export const oracleDiffTraces = (before: Trace, after: Trace): ReadonlyArray<TraceDifference> => {
  const out: Array<TraceDifference> = [];
  const walk = (a: Trace, b: Trace, path: TracePath): void => {
    if (a.policyTag !== b.policyTag) {
      out.push({
        _tag: "PolicyTagChanged",
        path,
        policyTag: b.policyTag,
        before: a.policyTag,
        after: b.policyTag,
      });
    }
    if (a.label !== b.label) {
      out.push({
        _tag: "LabelChanged",
        path,
        policyTag: b.policyTag,
        before: a.label,
        after: b.label,
      });
    }
    if (a.allowed !== b.allowed) {
      out.push({
        _tag: "VerdictChanged",
        path,
        policyTag: b.policyTag,
        label: b.label,
        before: a.allowed,
        after: b.allowed,
        beforeReason: a.reason,
        afterReason: b.reason,
      });
    } else if (a.reason !== b.reason) {
      out.push({
        _tag: "ReasonChanged",
        path,
        policyTag: b.policyTag,
        before: a.reason,
        after: b.reason,
      });
    }
    if (!sameFields(a.visibleFields, b.visibleFields)) {
      out.push({
        _tag: "FieldsChanged",
        path,
        policyTag: b.policyTag,
        before: a.visibleFields,
        after: b.visibleFields,
      });
    }
    if (!sameObligationSet(a.obligations, b.obligations)) {
      out.push({
        _tag: "ObligationsChanged",
        path,
        policyTag: b.policyTag,
        before: a.obligations,
        after: b.obligations,
      });
    }
    if (a.children.length !== b.children.length) {
      out.push({
        _tag: "ChildCountChanged",
        path,
        policyTag: b.policyTag,
        before: a.children.length,
        after: b.children.length,
      });
      return;
    }
    a.children.forEach((child, i) => {
      const other = b.children[i];
      if (other !== undefined) walk(child, other, [...path, i]);
    });
  };
  walk(before, after, []);
  return out;
};

const fieldsChoice: FastCheck.Arbitrary<ReadonlyArray<string> | undefined> = FastCheck.constantFrom(
  undefined,
  [],
  ["a"],
  ["b", "a"],
);

const obligationsChoice: FastCheck.Arbitrary<ReadonlyArray<Obligation>> = FastCheck.constantFrom(
  [],
  [obligation("x")],
  [obligation("x", { level: "info" }), obligation("y")],
  [obligation("x", { level: "warn" })],
);

/** A `Trace` of nesting depth at most `maxDepth`, hand-built so every field varies. */
export const traceArbitrary = (maxDepth: number): FastCheck.Arbitrary<Trace> => {
  const node = (children: FastCheck.Arbitrary<ReadonlyArray<Trace>>): FastCheck.Arbitrary<Trace> =>
    FastCheck.record({
      policyTag: FastCheck.constantFrom("AllOf", "AnyOf", "Not", "Labeled", "HasRole", "Rules"),
      label: FastCheck.option(FastCheck.constantFrom("l1", "l2"), { nil: undefined }),
      allowed: FastCheck.boolean(),
      reason: FastCheck.option(FastCheck.constantFrom("r1", "r2"), { nil: undefined }),
      children,
      visibleFields: fieldsChoice,
      obligations: obligationsChoice,
    });
  return FastCheck.letrec<{ trace: Trace }>((tie) => ({
    trace: FastCheck.oneof(
      { maxDepth, depthSize: "small" },
      node(FastCheck.constant([])),
      node(FastCheck.array(tie("trace"), { maxLength: 3 })),
    ),
  })).trace;
};

/**
 * A pair of traces: identical, independent, or the second a perturbed copy of the
 * first (so a difference is reported deep in the tree, not only at the root).
 */
export const tracePairArbitrary = (
  maxDepth: number,
): FastCheck.Arbitrary<readonly [Trace, Trace]> =>
  FastCheck.tuple(
    traceArbitrary(maxDepth),
    traceArbitrary(maxDepth),
    FastCheck.constantFrom("same", "other", "perturbed"),
    FastCheck.array(FastCheck.nat(9), { minLength: 400, maxLength: 400 }),
  ).map(([a, other, mode, entropy]) => {
    if (mode === "same") return [a, a] as const;
    if (mode === "other") return [a, other] as const;
    let cursor = 0;
    const next = (): number => entropy[cursor++ % entropy.length] ?? 0;
    const perturb = (t: Trace): Trace => {
      const roll = next();
      const children = t.children.map(perturb);
      if (roll === 0) return { ...t, children, allowed: !t.allowed };
      if (roll === 1) return { ...t, children, reason: t.reason === undefined ? "r3" : undefined };
      if (roll === 2) return { ...t, children: children.slice(0, -1) };
      if (roll === 3) return { ...t, children, label: t.label === undefined ? "l3" : undefined };
      return { ...t, children };
    };
    return [a, perturb(a)] as const;
  });
