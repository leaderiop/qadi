---
"@qadi/http": patch
---

An unguarded port route (`portRoutesUnguarded`) now logs a subject-extraction failure through `logSubjectExtractionFailed`, as every guarded path does. Before, a credential-store outage on it answered 502 and logged nothing (ARCH-46, ADR-QD-108). A denial raised by a `publicEndpoint`'s own handler `guard` is now logged once (`qadi.denial_site: "handler"`), as it already was on an endpoint with a requirement, and its failures are answered by the same in-channel projection; before, it answered 403 and logged nothing (ARCH-61). Every request path, public endpoints included, now enforces through one internal module; no export is added or removed.
