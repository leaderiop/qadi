/**
 * Routing. Not authorization, and not a security boundary.
 *
 * **Next renamed this convention** in 16.3 — `middleware.ts` is deprecated and
 * this file is `proxy.ts` — and the new name is the argument. Its own
 * documentation now says it "should not be used as a full session management or
 * authorization solution", and calls the permission checks it *is* suited to
 * "optimistic". A proxy is what it always was; it was only ever the name that
 * suggested otherwise.
 *
 * **CVE-2025-29927** made the point the expensive way: a request could skip
 * middleware entirely by sending an `x-middleware-subrequest` header — CVSS 9.1
 * on every Next.js app that had put its auth check here. The patch closed that
 * instance. The lesson is structural and did not need a CVE: this runs at the
 * edge, before the request reaches the thing that owns the data, and a check
 * that ran somewhere else, earlier, is not this check.
 *
 * That is the same sentence as ADR-QD-017 one layer up: a hydrated allow is not
 * an authorization either, and for exactly the same reason.
 *
 * So this file decides nothing. It adds a header naming itself, which
 * `/edge/middleware` reads to prove it ran and to prove the page did not care.
 * Every enforcement point in this app — the page, the server action, the route
 * handler — re-reads the session cookie and asks the policy for itself.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const proxy = (request: NextRequest): NextResponse => {
  const response = NextResponse.next();
  response.headers.set("x-newsroom-proxy", "ran");
  // What it would be tempting to trust. Echoed so the page can show that it is
  // caller-controlled, and that nothing downstream reads it.
  response.headers.set(
    "x-newsroom-claimed-user",
    request.headers.get("x-claimed-user") ?? "(none claimed)",
  );
  return response;
};

export const config = {
  matcher: ["/edge/:path*", "/newsroom"],
};
