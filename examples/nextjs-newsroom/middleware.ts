/**
 * Routing. Not authorization, and not a security boundary.
 *
 * **CVE-2025-29927** let a request skip middleware entirely by sending an
 * `x-middleware-subrequest` header — a CVSS 9.1 on every Next.js app that had
 * put its auth check here. The patch closed that instance; the lesson is
 * structural and did not need a CVE to be true. Middleware runs at the edge,
 * before the request reaches the thing that owns the data, and a check that runs
 * somewhere else, earlier, is not this check.
 *
 * That is the same sentence as ADR-QD-017 one layer up: a hydrated allow is not
 * an authorization either, for exactly the same reason.
 *
 * So this file decides nothing. It adds a header naming itself, which
 * `/edge/middleware` reads to prove it ran and to prove the page did not care.
 * Every enforcement point in this app — the page, the server action, the route
 * handler — re-reads the session cookie and asks the policy for itself.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const middleware = (request: NextRequest): NextResponse => {
  const response = NextResponse.next();
  response.headers.set("x-newsroom-middleware", "ran");
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
