/**
 * Admits a question to be walked: the depth gate and the matcher context,
 * once, for both interpreters.
 *
 * `walk` (the evaluator) and `toPredicate` (the translator) each used to carry
 * their own copy of the gate, of the matcher context and of the `maxDepth`
 * default. The copies agreed — the differential in `RolesAndDepth.test.ts`
 * says so — but nothing made them, and a new answer-changing option would have
 * reached `evaluate` and been silently ignored by `toPredicate` (INV-QD-018).
 * Only admission is shared, never the walk: the two interpreters stay two
 * (ADR-QD-024). Package-private, out of the barrel (ADR-QD-099).
 *
 * Depth is judged on the policy alone, before any node is visited: whether a
 * policy is "too deep" must not depend on which branches this subject's
 * attributes happen to short-circuit past, or on who is asking (ARCH-02 D-02-e,
 * INV-QD-037). `policyDepth` is memoised per policy object, so after the first
 * evaluation this is a lookup. `evaluateNode` keeps its own per-node guard as
 * defense in depth.
 *
 * The matcher context depends only on the question, which is invariant across
 * the whole recursive walk, so it is built here once rather than at every node.
 * Callers must call {@link admit} lazily (inside `Effect.suspend`), so a cache
 * hit never builds a context it would not use.
 */
import * as Result from "effect/Result";
import { PolicyTooDeep } from "./Errors.ts";
import type { MatcherContext } from "./Matcher.ts";
import { policyDepth } from "./Policy.ts";
import type { Question } from "./Question.ts";

/**
 * A question shown to be no deeper than its `maxDepth`, with what its matchers
 * see. Only {@link admit} builds one, so holding one is the proof.
 */
export class Admitted {
  constructor(
    readonly question: Question,
    readonly matcherContext: MatcherContext,
  ) {}
}

/** Admits a question, or refuses it as too deep. Depth is judged on the policy alone (INV-QD-037). */
export const admit = (question: Question): Result.Result<Admitted, PolicyTooDeep> =>
  policyDepth(question.policy) > question.maxDepth
    ? Result.fail(new PolicyTooDeep({ maxDepth: question.maxDepth }))
    : Result.succeed(
        new Admitted(question, {
          subject: question.subject.attributes,
          subjectId: question.subject.id,
          resource: question.resource,
          action: question.action,
        }),
      );
