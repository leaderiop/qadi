import "server-only";
/**
 * Who is asking.
 *
 * A cookie naming one of five demo users, because authentication is explicitly
 * out of Qadi's scope and putting a real identity provider here would bury the
 * thing this example is about under an OAuth dance.
 *
 * The cookie is read on **every** surface that decides — the page, the server
 * action, the route handler — and never trusted from a header a proxy could
 * set. `proxy.ts` in this app touches none of this, deliberately: see
 * `/edge/middleware`.
 */
import { cookies } from "next/headers";
import { DEFAULT_USER, userById } from "../domain/subjects.ts";
import type { DemoUser } from "../domain/subjects.ts";

export const SESSION_COOKIE = "qadi-newsroom-user";

/**
 * The session for this request.
 *
 * `await cookies()` because it is request-scoped state in Next 15+, which is
 * also what makes every page reading it dynamic — correct here, since a page
 * whose authorization answers were cached across users would be the defect this
 * whole example is about.
 */
export const currentUser = async (): Promise<DemoUser> => {
  const jar = await cookies();
  return userById(jar.get(SESSION_COOKIE)?.value ?? DEFAULT_USER);
};

/**
 * The same question for a route handler, which has a `Request` and no `cookies()`.
 *
 * Parsed from the header rather than reached through `next/headers` so the same
 * function works inside the Effect `HttpRouter`, where there is no Next request
 * context at all.
 */
export const userFromCookieHeader = (header: string | null): DemoUser => {
  const found = (header ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return userById(found === undefined ? undefined : decodeURIComponent(found.slice(SESSION_COOKIE.length + 1)));
};
