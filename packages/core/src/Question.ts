/**
 * The question: the one value a decision is asked, cached and recorded under.
 *
 * Public because a hand-written `DecisionCacheShape` receives it; everything
 * that builds one goes through {@link questionOf}, so the defaults live in
 * one place. Sits below `Evaluate.ts` and `Walk.ts` in the import graph
 * (ADR-QD-037): it imports no evaluation code.
 */
import type { AuthSubject } from "./AuthSubject.ts";
import { DEFAULT_MAX_DEPTH } from "./Policy.ts";
import type { Policy } from "./Policy.ts";
import type { Resource } from "./Resource.ts";

/**
 * The options that are part of the {@link Question}.
 *
 * Every field here can change the answer, and so is part of the `Question`; a
 * field that cannot belongs on `EvaluateOptions` instead (`concurrency`,
 * `evaluationId`). `Question.test.ts` holds that classification as a type and
 * a differential test.
 */
export interface QuestionOptions {
  /** The resource under consideration, if any. */
  readonly resource?: Resource;
  /**
   * What the caller is doing — `"read"`, `"write"`, an OrBAC activity name.
   *
   * A property of the request, never a grant the subject holds (ADR-QD-018).
   */
  readonly action?: string;
  /**
   * Maximum policy tree depth. Bounds recursion on hostile decoded input.
   * Defaults to 64.
   */
  readonly maxDepth?: number;
}

/**
 * The question a decision answers: subject, policy, resource, action and the
 * depth limit — everything that can change the answer, built once by
 * {@link questionOf}.
 *
 * It is the decision cache's key and the request half of a `DecisionRecord`.
 * Before it existed those facts were restated from `EvaluateOptions` in six
 * places inside `evaluate`, each reading `options?.…` independently, and
 * nothing made them agree (ARCH-16, ADR-QD-100). ADR-QD-043's principle — a
 * decision is computed from the inputs it claims to be about — is now a type.
 *
 * **The whole subject is in it, and that is a security boundary.** A cache keyed
 * on the policy alone would serve one subject's allow to another — the same
 * class of defect as an unbound hydration payload, and worth stating twice: a
 * decision is *about* a subject, so any structure holding decisions holds the
 * subject too.
 *
 * The **subject**, not the subject's id, and the difference is a privilege
 * escalation. An id was enough only if it determined the subject's grants, and
 * it does not: `@qadi/http`'s `SubjectExtractor` rebuilds an `AuthSubject` per
 * request from a token, so a scoped token and a full token for one user share
 * an id and hold different permissions. Under an application-scoped cache —
 * which this module documents as a supported choice — the first verdict for a
 * given id won, permanently, in whichever direction it happened to be asked
 * first ([INV-QD-033](../../../spec/invariants.md#inv-qd-033-a-cached-decision-belongs-to-the-grants-that-earned-it)).
 * `AuthSubject` compares structurally, grants included, so the key now covers
 * everything a decision can depend on.
 *
 * That structural comparison is exported by name as `subjectEquivalence`
 * (`AuthSubject.ts`), so `@qadi/react`'s `subject` atom decides "same subject"
 * by the same rule rather than by a second, shallower one.
 *
 * As the cache key it is used in a `HashMap` **directly**, with no serialization step
 * ([INV-QD-030](../../../spec/invariants.md#inv-qd-030-cache-key-uniqueness)).
 * Effect's `Equal`/`Hash` compare plain objects structurally, nested included —
 * the same property `Atom.family` relies on in `@qadi/react` — so two equal
 * questions hit however their properties were ordered, and two different ones
 * cannot collide. `AuthSubject.roles`/`.permissions` are `ReadonlySet<RoleName>`
 * / `ReadonlySet<PermissionKey>` — the built-in JS `Set`, not `effect/HashSet`
 * — but that is not a gap: the installed `effect@4.0.0`'s
 * `Equal.equals`/`Hash.hash` special-case `self instanceof Set` (and `Map`)
 * and fold over their elements order-independently, the same way they fold
 * over an array's, so two subjects whose grants are equal in content but held
 * in two different `Set` objects — the common case, since `makeSubject`/
 * `fromRoles` each build a fresh `Set` — are equal keys and this cache hits.
 * Verified empirically against the installed `effect` build (checked
 * 2026-09-19; re-check on the next `effect` bump), not assumed from the
 * `Equal`/`Hash` docs, since a prior version of this comment called the field
 * `HashSet` and asserted the same property for the wrong reason;
 * `DecisionCache.test.ts`'s "equal grants, different Set identity, still a
 * hit" pins the actual mechanism.
 *
 * The predecessor of this was `JSON.stringify`, whose own doc comment claimed
 * property-order misses were the price of having "no chance of colliding". It
 * had that backwards. `stringify` maps a `Date` onto its ISO string, drops
 * `undefined`-valued and function-valued properties, and renders `NaN` as
 * `null` — so `{d: new Date(0)}` and `{d: "1970-01-01T00:00:00.000Z"}` produced
 * one key for two questions, and the second caller received the first's verdict.
 *
 * **`maxDepth` is in the key for the same reason `action` is.** It is an
 * `evaluate` option, not part of the `Policy` or the subject, but it can still
 * change the answer: the same subject asking the same policy with a shallower
 * `maxDepth` can turn an `Allow`/`Deny` into `PolicyTooDeep`. Omitting it would
 * let a shallow-limited caller's ask hit an entry a deeper-limited caller left
 * behind and be served that caller's verdict instead of its own
 * `PolicyTooDeep` — the same class of cross-question collision `resource` and
 * `action` are already here to prevent.
 */
export interface Question {
  readonly subject: AuthSubject;
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  readonly action: string | undefined;
  readonly maxDepth: number;
}

/**
 * Builds the {@link Question} for a subject, a policy and the options that
 * can change the answer.
 *
 * All five keys are always present (`undefined`, not absent), so two questions
 * built by different callers hash alike. The only place `maxDepth` defaults.
 */
export const questionOf = (
  subject: AuthSubject,
  policy: Policy,
  options?: QuestionOptions,
): Question => ({
  subject,
  policy,
  resource: options?.resource,
  action: options?.action,
  maxDepth: options?.maxDepth ?? DEFAULT_MAX_DEPTH,
});
