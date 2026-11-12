/**
 * The services an evaluation requires, declared in a type-only leaf.
 *
 * `Evaluate.ts` and `Lifecycle.ts` both name these. Declaring them in
 * `Evaluate.ts` would make `Lifecycle.ts` import back, a cycle madge counts even
 * when every edge is type-only (ADR-QD-037). Declaring them in `Lifecycle.ts`
 * would put public types in a package-private module outside the barrel, which
 * would then have to re-export them (ADR-QD-099). They are not beside
 * `EvaluateOptions` in `Question.ts` because they read the port registry
 * (`Ports.ts`), and `Question.ts` imports no evaluation code. This module holds
 * only `import type` statements and type aliases.
 */
import type { CurrentSubject } from "./CurrentSubject.ts";
import type { EvaluationId } from "./EvaluationId.ts";
import type { PortServices } from "./Ports.ts";

/**
 * Services an evaluation needs: who is asking, an id for the evaluation, and
 * the five ports (`PortServices`, `Ports.ts`). The ports come from the
 * registry rather than a list here, so a port added to the registry reaches
 * every alias of this type without an edit here (ADR-QD-094).
 */
export type EvaluationServices = CurrentSubject | EvaluationId | PortServices;

/**
 * Everything an evaluation needs except who is asking.
 *
 * The services a runtime holds for its lifetime while the subject travels per
 * call. Written as `Exclude` rather than as a hand-listed union so it tracks
 * {@link EvaluationServices}: a port added to that union reaches every
 * adapter that names this alias without a second edit. Its domain-named
 * aliases keep their own meaning and public names: `SubjectSetServices`
 * (`SubjectSet.ts`), `QadiRuntimeServices` (`@qadi/react`), and the
 * `@qadi/promise` and `@qadi/http` runtime requirement sets.
 *
 * Before this alias the same `Exclude` was spelled out six times across four
 * packages, and `@qadi/http`'s `RequirePermission.ts` re-listed the six
 * services by hand instead (ARCH-04).
 */
export type StandingEvaluationServices = Exclude<EvaluationServices, CurrentSubject>;
