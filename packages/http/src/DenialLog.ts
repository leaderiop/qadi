/**
 * Where a denial was logged from: the edge step, or a handler's own `guard`.
 *
 * Package-private (not in the barrel). `logDenial` (`QadiHttpError.ts`) is the
 * public line; this adds the one annotation that says which step turned the
 * denial into a response, so an operator reading a 403 log can tell a request
 * refused at the door from one refused by defense-in-depth code inside a
 * handler (ARCH-45 I3, BEH-QD-321).
 *
 * A denial is logged exactly once, by the step that turned it into a response:
 * `authorizeRequest` for the edge check (`"edge"`), the surface for a handler's
 * own `guard` (`"handler"`). The surface taps the handler's effect only, never
 * the whole request, so an edge denial is never logged twice.
 */
import * as Effect from "effect/Effect";
import type { EnforcementDenial } from "@qadi/core";
import { logDenial } from "./QadiHttpError.ts";

/** The step that turned a denial into a response. */
export type DenialSite = "edge" | "handler";

/** Logs a denial through `logDenial`, annotated with the step that raised it. */
export const logDenialAt =
  (site: DenialSite) =>
  (error: EnforcementDenial): Effect.Effect<void> =>
    logDenial(error).pipe(Effect.annotateLogs("qadi.denial_site", site));
