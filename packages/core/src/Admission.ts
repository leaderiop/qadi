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
 * What a request supplied, one row per row source, read from the matcher
 * context {@link Admitted.admit} builds. Each row is checked against its
 * {@link SuppliedBy} type: a `"row"` row that stops supplying the resource does
 * not compile, and neither does a row source without a row here. The `"asked"`
 * row's flags are `boolean`, so the type does not check them: they agree with
 * the matcher context because each row reads that context, which `admit` built
 * from one read of the question, and the tests pin it.
 */
const SUPPLIED: {
  readonly [Source in RowSource]: (context: MatcherContext) => SuppliedBy[Source];
} = {
  asked: (context) => ({
    action: context.action !== undefined,
    resource: context.resource !== undefined,
  }),
  row: (context) => ({ action: context.action !== undefined, resource: true }),
};

/**
 * A question shown to be no deeper than its `maxDepth`, and everything both
 * interpreters read while walking it: the policy it admitted, the subject, what
 * the request supplied, what its matchers see (which also holds the resource and
 * the action) and the depth bound. Only {@link Admitted.admit}, exported as
 * {@link admit}, builds one: the constructor is private, and the private
 * `nominal` member keeps an object literal of the same shape from passing for
 * one. Holding one shows that `admit` built it. The policy rides with it as
 * `admit` read it from the question; the depth check reads the question's
 * policy separately.
 *
 * The row source is part of the type: `Admitted<"row">` stores a resource as
 * supplied while its matcher context holds none, so only `toPredicate` may read
 * it, and the walk's parameter, `Admitted<"asked">`, refuses it.
 */
export class Admitted<Source extends RowSource = RowSource> {
  /**
   * Makes the type nominal, so an object literal of the same shape is not an
   * `Admitted`. Declared only: it has no slot at run time.
   */
  declare private readonly nominal: never;

  private constructor(
    readonly source: Source,
    readonly policy: Policy,
    readonly subject: AuthSubject,
    readonly supplied: SuppliedBy[Source],
    readonly matcherContext: MatcherContext,
    readonly maxDepth: number,
  ) {}

  /**
   * Admits a question for an interpreter's row source, or refuses it as too deep.
   * Depth is judged on the policy alone (INV-QD-037); what the request supplied
   * is read from the matcher context built here, so the question's resource and
   * action are each read once (INV-QD-364). It names `Admitted` and never `this`,
   * so the module exports it detached as {@link admit}.
   */
  static admit<Source extends RowSource>(
    question: Question,
    rowSource: Source,
  ): Result.Result<Admitted<Source>, PolicyTooDeep> {
    if (policyDepth(question.policy) > question.maxDepth) {
      return Result.fail(new PolicyTooDeep({ maxDepth: question.maxDepth }));
    }
    const context: MatcherContext = {
      subject: question.subject.attributes,
      subjectId: question.subject.id,
      resource: question.resource,
      action: question.action,
    };
    return Result.succeed(
      new Admitted(
        rowSource,
        question.policy,
        question.subject,
        SUPPLIED[rowSource](context),
        context,
        question.maxDepth,
      ),
    );
  }
}

/** {@link Admitted.admit}, the one way to build an {@link Admitted}. */
export const admit = Admitted.admit;
