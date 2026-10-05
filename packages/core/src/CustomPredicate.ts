/**
 * Resolves a policy's `HasCustom` node — a named, externally-registered
 * predicate for logic the built-in matchers cannot express.
 *
 * A `HasCustom` node stores a name, never a function (ADR-QD-055): the policy
 * tree stays serializable, and the actual logic lives here, behind a service,
 * the same shape `AttributeResolver` already uses. `CustomPredicateNone`
 * denying when nothing is wired is the same fail-closed default every other
 * required service pays for; a registry that *is* wired but has no entry for a
 * given name fails instead of denying, because that is a wiring mistake, not a
 * legitimate answer — the same distinction `AttributeResolver.resolve`'s own
 * doc comment draws between an absent value and a broken lookup.
 */
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schedule from "effect/Schedule";
import type { AuthSubject } from "./AuthSubject.ts";
import { CustomPredicateError } from "./Errors.ts";
import type { InvalidBoundedPermits } from "./Errors.ts";
import { boundedPort, nonePort, retryingPort } from "./PortDerivation.ts";
import type { PortDescription } from "./PortDescription.ts";
import type { Resource } from "./Resource.ts";

export interface CustomPredicateShape {
  /**
   * Which implementation this is — same purpose and the same "nothing may
   * branch on it" rule as {@link AttributeResolverShape.name}.
   */
  readonly name?: string | undefined;
  /**
   * Evaluates the named predicate.
   *
   * `params` is whatever `hasCustom`'s caller passed, handed over exactly as
   * decoded from the policy — this service, not the policy tree, is where a
   * caller validates its shape.
   *
   * An implementation is not required to fail cleanly. `PortAccess.ts`'s
   * `askCustom` catches a defect from this call and converts it into
   * this same `CustomPredicateError` — its `reason` then renders the defect
   * (`Cause.pretty`), the same way it already renders an unregistered name as
   * a sentence — matching `AttributeResolverShape.resolve`'s own contract;
   * see its doc comment for why (issue #100).
   */
  readonly evaluate: (
    name: string,
    subject: AuthSubject,
    resource: Resource | undefined,
    params: unknown,
  ) => Effect.Effect<boolean, CustomPredicateError>;
}

export class CustomPredicate extends Context.Service<
  CustomPredicate,
  CustomPredicateShape
>()("qadi/CustomPredicate") {
  /** One-step accessor. `use` requires its callback to return an Effect. */
  static readonly evaluate = (
    name: string,
    subject: AuthSubject,
    resource: Resource | undefined,
    params: unknown,
  ) => CustomPredicate.use((r) => r.evaluate(name, subject, resource, params));
}

/**
 * A failure's cause as `CustomPredicateError.reason`, which is a sentence:
 * a string stays as it is (a replayed outage, a scripted `"down"`), an `Error`
 * gives its message (a deadline), anything else its `String` rendering.
 * Total: a value whose `toString` throws renders as a placeholder rather than
 * turning a typed failure into a defect.
 */
const renderReason = (cause: unknown): string => {
  if (typeof cause === "string") return cause;
  if (cause instanceof Error) return cause.message;
  try {
    return String(cause);
  } catch {
    return "<unrenderable cause>";
  }
};

/**
 * The custom-predicate port, described once (`PortDescription.ts`).
 *
 * A request is keyed by `(subjectId, name, params)` — not by the resource,
 * which is arbitrary caller data rather than one id. `CustomPredicateError`
 * has no `cause` field, so `failure` renders the cause into `reason`, and
 * `defect` renders a defect with `Cause.pretty` — what `PortAccess.ts` always
 * did (D-10-e).
 */
export const customPredicatePort: PortDescription<
  "CustomPredicate",
  CustomPredicate,
  CustomPredicateShape,
  [name: string, subject: AuthSubject, resource: Resource | undefined, params: unknown],
  boolean,
  CustomPredicateError
> = {
  port: "CustomPredicate",
  method: "evaluate",
  span: "qadi.hasCustom",
  service: CustomPredicate,
  invoke: (shape) => (name, subject, resource, params) =>
    shape.evaluate(name, subject, resource, params),
  make: (name, call) => ({ name, evaluate: call }),
  failure: ([name], cause) => new CustomPredicateError({ name, reason: renderReason(cause) }),
  defect: ([name], cause) => new CustomPredicateError({ name, reason: Cause.pretty(cause) }),
  key: ([name, subject, , params]) => JSON.stringify([subject.id, name, params]),
  none: { name: "CustomPredicateNone", answer: false },
};

/**
 * Registers nothing.
 *
 * The default. Every name denies — the same fail-closed shape as
 * `AttributeResolverNone`. This is a `succeed`, not a `fail`, for the same
 * reason: an application that never reaches for `hasCustom` should be able to
 * wire this in and never observe it again. Derived from
 * {@link customPredicatePort}'s `none` (ADR-QD-040).
 */
export const CustomPredicateNone: Layer.Layer<CustomPredicate> = nonePort(customPredicatePort);

/**
 * Resolves from a static table of named predicate functions.
 *
 * A name absent from `table` **fails** rather than denies: unlike
 * `CustomPredicateNone`'s blanket absence, a populated table missing one
 * entry is a wiring mistake — most likely a typo in `hasCustom`'s `name` —
 * and "failure is not denial" applies to a misconfigured registry exactly as
 * it does to a broken attribute lookup.
 */
export const customPredicateFromRecord = (
  table: Readonly<
    Record<
      string,
      (
        subject: AuthSubject,
        resource: Resource | undefined,
        params: unknown,
      ) => Effect.Effect<boolean, CustomPredicateError>
    >
  >,
): Layer.Layer<CustomPredicate> =>
  Layer.succeed(CustomPredicate, {
    name: "customPredicateFromRecord",
    evaluate: (name, subject, resource, params) => {
      const registered = table[name];
      return registered === undefined
        ? Effect.fail(
            new CustomPredicateError({
              name,
              reason: "no predicate is registered under this name",
            }),
          )
        : registered(subject, resource, params);
    },
  });

/**
 * Wraps a registry layer so every `evaluate` call retries on
 * `CustomPredicateError` under the given schedule before surfacing it.
 *
 * The same wrapper as `attributeResolverRetrying` — see its own doc comment
 * for why this is additive rather than a change to `CustomPredicateShape`.
 * Both annotate `qadi.attempts` on the caller's span and count failed
 * attempts in `portRetriesTotal`, derived from the port's description by
 * `PortDerivation.ts`'s `retryingPort`. Until ARCH-10 this one did neither,
 * while this comment claimed it mirrored the attribute wrapper exactly.
 */
export const customPredicateRetrying: (
  schedule: Schedule.Schedule<unknown, CustomPredicateError>,
) => (layer: Layer.Layer<CustomPredicate>) => Layer.Layer<CustomPredicate> =
  retryingPort(customPredicatePort);

/**
 * Wraps a registry layer so no more than `permits` calls to `evaluate` run at
 * once, queuing the rest — `attributeResolverBounded` for this port.
 *
 * `permits` that is not a positive integer fails construction with
 * {@link InvalidBoundedPermits} rather than building a layer that deadlocks
 * every call. Derived by `PortDerivation.ts`'s `boundedPort`.
 */
export const customPredicateBounded: (
  permits: number,
) => (
  layer: Layer.Layer<CustomPredicate>,
) => Layer.Layer<CustomPredicate, InvalidBoundedPermits> = boundedPort(customPredicatePort);
