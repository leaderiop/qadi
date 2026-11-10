---
"@qadi/core": patch
---

`explain()` no longer renders a `hasSignature` check with `scope: "Any"` as "for anything". A signature's `"Any"` reads only the signatures on file with no resource, never one recorded for a document, unlike `hasActed`'s "any resource": the detail now reads "on file subject-wide, not for a resource". `signatureHistoryFromSignatures` groups its rows by the requirement-free `(subjectId, resourceId)` pair, so a query that carries a `meaning` or `signerRole` reads the same rows as one that does not.
