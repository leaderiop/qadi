---
"@qadi/http": patch
---

An unguarded port route (`portRoutesUnguarded`) now logs a subject-extraction failure through `logSubjectExtractionFailed`, as every guarded path does. Before, a credential-store outage on it answered 502 and logged nothing (ARCH-46, ADR-QD-108). Every request path now enforces through one internal module; no export is added or removed.
