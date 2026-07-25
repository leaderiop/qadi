/**
 * The subject being authorized, scoped to the current request.
 *
 * Passing the subject as a parameter through every call is what forced the
 * predecessor's enforcement function to take eight arguments. As a service it
 * travels in the environment, so `Qadi.enforce(policy)` needs no plumbing.
 */
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import type { AuthSubject } from "./AuthSubject.ts";
import { anonymous } from "./AuthSubject.ts";

export class CurrentSubject extends Context.Service<CurrentSubject, AuthSubject>()(
  "qadi/CurrentSubject",
) {}

/**
 * Provides a specific subject. Build this per request.
 *
 * Named `currentSubjectLayer` rather than exposed as a static `of`, because
 * `Context.Service` already defines `of` as the service constructor.
 */
export const currentSubjectLayer = (subject: AuthSubject): Layer.Layer<CurrentSubject> =>
  Layer.succeed(CurrentSubject, subject);

/**
 * An unauthenticated subject.
 *
 * Present so that a graph missing its real subject layer still type-checks and
 * fails *closed* — an anonymous subject holds nothing, so every policy denies.
 */
export const CurrentSubjectAnonymous: Layer.Layer<CurrentSubject> = Layer.succeed(
  CurrentSubject,
  anonymous,
);
