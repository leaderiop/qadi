---
"@qadi/http": minor
---

The HTTP boundary now fails in the right direction, and the package finally has
a behaviour specification.

**An endpoint that declares no authorization is refused.** `RequirePermission`
served any endpoint carrying no `RequiredPermission` annotation — so adding an
endpoint to a guarded group and forgetting one line published it, with no signal
at build time, layer-build time or request time.

ADR-QD-036 had rejected exactly this, by name, in its Alternatives section:
*"annotate-and-forget … Rejected: it inverts this library's fail-closed posture
… by making the **absence** of a permission requirement mean 'unguarded'."* The
rejected alternative shipped anyway, and a test asserted it was correct.

**Breaking.** An endpoint meant to be reachable without authorization now says
so:

```ts
HttpApiEndpoint.get("health", "/health").pipe((e) =>
  e.annotate(PublicEndpoint, publicEndpoint("liveness probe, no subject exists yet")),
)
```

The `reason` is required and never read by the middleware — it is there so a
reviewer can see that someone chose this. An endpoint declaring neither gets
**500**, not 403: a missing declaration is a wiring mistake in the service, and
reporting it as a permissions decision sends an operator to audit the wrong
system. The endpoint's identifier is logged at error level.

**`SubjectExtractorShape.extract` can now fail.** Its error channel was `never`,
so an implementor whose token store broke had two options and both violated
INV-QD-006: `Effect.die`, which escapes the adapters' `catchTag` entirely and
turns an authorization path into a defect, or falling back to `anonymous`, which
renders an outage as a denial. It now fails with `SubjectExtractionFailed` and
both adapters map that to **502**.

**Breaking**: `subjectExtractorBearer`'s `lookup` may return a failing Effect.
A request carrying *no* credential is still a success resolving to `anonymous` —
that is a different answer from a broken store, and keeping the two apart is the
point.

**The Bearer scheme is matched case-insensitively**, per RFC 7235 §2.1. It
compared `startsWith("Bearer ")`, so a legal `bearer …` had its credential
silently discarded and was served as anonymous — which denied, so a parsing bug
presented as a permissions problem.

**`PolicyTooDeep` maps to 500, not 400.** No path in this package lets a request
supply a policy, so the "malformed or hostile input" a 400 asserts cannot reach
it — and a 400 is classified non-retryable client error, so the operator whose
policy tree is too deep would never have been paged.

Finally, **`spec/behaviors/23-http.md`** — the package shipped with no behaviour
document, entering the traceability chain at the Decision link, which is how it
came to contradict its own ADR unnoticed.

See BEH-QD-174–180, INV-QD-034, ADR-QD-036 rev 1.3.
