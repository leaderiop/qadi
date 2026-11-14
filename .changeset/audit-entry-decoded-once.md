---
"@qadi/audit": patch
---

`decodeAuditEntry` reads a row's record once, through `@qadi/core`'s strict decode, and the entry holds that decode's JSON form. Entries are identical to before over every existing case, including an unknown envelope key dropped and a record nested past the decode bound refused.
