/**
 * Admits a question to be walked: the depth gate and the walk environment,
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
 * The walk environment (the row source, the policy it admitted, the subject,
 * what the request supplied, what its matchers see and the depth bound) depends
 * only on the question and on where the interpreter's resource comes from, both
 * invariant across the whole recursive walk, so it is built here once rather
 * than at every node; each interpreter states only its row source
 * (ADR-QD-172). Callers must call
 * {@link admit} lazily (inside `Effect.suspend`), so a cache hit never builds an
 * environment it would not use.
 */
import * as Result from "effect/Result";
import type { AuthSubject } from "./AuthSubject.ts";
import { PolicyTooDeep } from "./Errors.ts";
import type { Supplied } from "./LeafNeeds.ts";
import type { MatcherContext } from "./Matcher.ts";
import type { Policy } from "./Policy.ts";
import { policyDepth } from "./Policy.ts";
import type { Question } from "./Question.ts";

/**
 * Where an interpreter's resource comes from: `"asked"` for `evaluate`, whose
 * resource is supplied when the question has one, and `"row"` for `toPredicate`,
 * whose resource is the row and so is always supplied.
 */
export type RowSource = "asked" | "row";

/**
 * What a request supplied, per row source: the asked resource may be absent, and
 * a row is always there. A row source without an entry here does not compile.
 */
interface SuppliedBy {
  readonly asked: Supplied;
  readonly row: Supplied<true>;
}

/**
 * What a request supplied, one row per row source. Each row is checked against
 * its {@link SuppliedBy} type, so a row that claims a resource it does not have
 * does not compile, and a row source without a row here does not compile either.
 */
const SUPPLIED: { readonly [Source in RowSource]: (question: Question) => SuppliedBy[Source] } = {
  asked: (question) => ({
    action: question.action !== undefined,
    resource: question.resource !== undefined,
  }),
  row: (question) => ({ action: question.action !== undefined, resource: true }),
};

/**
 * A question shown to be no deeper than its `maxDepth`, and everything both
 * interpreters read while walking it: the policy it admitted, the subject, what
 * the request supplied, what its matchers see (which also holds the resource and
 * the action) and the depth bound. Only {@link admit} builds one, so holding one
 * is the proof, and the policy rides with it so the proof cannot be paired with
 * a deeper tree.
 *
 * The row source is part of the type: `Admitted<"row">` stores a resource as
 * supplied while its matcher context holds none, so only `toPredicate` may read
 * it, and the walk's parameter, `Admitted<"asked">`, refuses it.
 */
export class Admitted<Source extends RowSource = RowSource> {
  constructor(
    readonly source: Source,
    readonly policy: Policy,
    readonly subject: AuthSubject,
    readonly supplied: SuppliedBy[Source],
    readonly matcherContext: MatcherContext,
    readonly maxDepth: number,
  ) {}
}

/**
 * Admits a question for an interpreter's row source, or refuses it as too deep.
 * Depth is judged on the policy alone (INV-QD-037); what the request supplied
 * is a function of the row source and the question (INV-QD-364).
 */
export const admit = <Source extends RowSource>(
  question: Question,
  rowSource: Source,
): Result.Result<Admitted<Source>, PolicyTooDeep> =>
  policyDepth(question.policy) > question.maxDepth
    ? Result.fail(new PolicyTooDeep({ maxDepth: question.maxDepth }))
    : Result.succeed(
        new Admitted(
          rowSource,
          question.policy,
          question.subject,
          SUPPLIED[rowSource](question),
          {
            subject: question.subject.attributes,
            subjectId: question.subject.id,
            resource: question.resource,
            action: question.action,
          },
          question.maxDepth,
        ),
      );
