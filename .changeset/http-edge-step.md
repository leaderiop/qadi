---
"@qadi/http": minor
---

**Breaking.** Every `@qadi/http` surface authorizes through one `authorizeRequest` (BEH-QD-321): it extracts the subject, loads the resource, guards it and logs a denial or an extraction failure once. `RequirePermission`, `guardRoute` and the decision stream's recheck each keep only their own answer. The recheck had drifted from the connect path; that drift is fixed.

- A broken credential store on a stream recheck is now an `outage`, the class the connect path answers 502 for, not the `"extraction-failed"` label no table contained. A recheck that ends a stream logs one line naming the failure's tag and class.
- `reauthCheck`, `handleEnforcementErrors` and `subjectExtractionFailedResponse` are removed. Replacement: `authorizeRequest` plus `toResponse`.
- A handler-raised denial under `RequirePermission` is still projected to its redacted wire value but is no longer logged by the edge: it is the handler's own `guard`'s failure.
- The edge no longer builds a handler function before the policy allows (`guard` builds its handler eagerly; the step does not).
- Added `authorizeRequest`, `AuthorizedRequest` and `classifyHttpEnforcementFailure`. `toResponse` accepts all twelve tags (`SubjectExtractionFailed` answers its tag-only JSON 502); it logs nothing.

Migration: where a bare route called `handleEnforcementErrors(effect)`, run `authorizeRequest(permission, policy, loadResource)(request)`, then your handler, then `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (error) => Effect.succeed(toResponse(error)))`.
