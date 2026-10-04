/**
 * Frozen, verbatim copies of the Policy walkers as they stood at `1caf04c` (plus
 * ARCH-01), kept as differential-test oracles for ARCH-02's migration onto
 * `foldPolicy`. DELETED by ARCH-02 T18: once the old code is gone they would only
 * compare the new code with a copy of itself.
 *
 * `Simplify.legacy.ts`, `Explanation.legacy.ts` and `Matcher.legacy.ts` beside
 * this file are whole-module copies with their relative imports re-pointed at
 * `../../src/`.
 */
import * as Match from "effect/Match";
import { childrenOf } from "../../src/Policy.ts";
import type { Policy } from "../../src/Policy.ts";

export { simplify as legacySimplify } from "./Simplify.legacy.ts";
export {
  explain as legacyExplain,
  renderExplanation as legacyRenderExplanation,
} from "./Explanation.legacy.ts";
export {
  referencesAction as legacyReferencesAction,
  referencesResource as legacyReferencesResource,
} from "./Matcher.legacy.ts";

/** Verbatim: `Policy.ts` `policyDepth` at `1caf04c`. */
export const legacyPolicyDepth = (self: Policy): number => {
  const depths = new Map<Policy, number>();
  const stack: Array<{ readonly node: Policy; readonly expanded: boolean }> = [
    { node: self, expanded: false },
  ];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    if (frame.expanded) {
      const children = childrenOf(frame.node);
      let max = 0;
      for (const child of children) {
        const depth = depths.get(child) ?? 0;
        if (depth > max) max = depth;
      }
      depths.set(frame.node, children.length === 0 ? 0 : 1 + max);
      continue;
    }
    if (depths.has(frame.node)) continue;
    stack.push({ node: frame.node, expanded: true });
    for (const child of childrenOf(frame.node)) {
      stack.push({ node: child, expanded: false });
    }
  }
  return depths.get(self) ?? 0;
};

const TOO_DEEP = "TooDeep" as const;
type TooDeep = typeof TOO_DEEP;

/** Verbatim: `Predicate.ts` `restrictsFields` at `1caf04c`. */
export const legacyRestrictsFields = (
  policy: Policy,
  depth: number,
  maxDepth: number,
): boolean | TooDeep => {
  if (depth > maxDepth) return TOO_DEEP;

  const child = (p: Policy): boolean | TooDeep => legacyRestrictsFields(p, depth + 1, maxDepth);
  const anyChild = (children: ReadonlyArray<Policy>): boolean | TooDeep => {
    for (const c of children) {
      const result = child(c);
      if (result === TOO_DEEP || result) return result;
    }
    return false;
  };

  return Match.value(policy).pipe(
    Match.tagsExhaustive({
      HasPermission: (p) => p.fields !== undefined,
      HasAttribute: (p) => p.fields !== undefined,
      HasResourceAttribute: (p) => p.fields !== undefined,
      HasRelationship: (p) => p.fields !== undefined,
      HasAction: (p) => p.fields !== undefined,
      HasActed: (p) => p.fields !== undefined,
      HasNotActed: (p) => p.fields !== undefined,
      HasCustom: (p) => p.fields !== undefined,
      HasSignature: (p) => p.fields !== undefined,
      HasRole: (p) => p.fields !== undefined,
      AllOf: (p) => anyChild(p.policies),
      AnyOf: (p) => anyChild(p.policies),
      Rules: (p) => anyChild(p.rules.map((r) => r.condition)),
      Not: (p) => child(p.policy),
      Obliged: (p) => child(p.policy),
      Labeled: (p) => child(p.policy),
    }),
  );
};
