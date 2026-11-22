---
"@qadi/audit": patch
---

`decodeAuditEntry` and `readAuditArchive` now decode a row or an archive entry whose record carries an unknown top-level key nested past the decode bound. It was `TooDeep`. With `version: 3` it is `UnsupportedVersion`. The row's and the archive's own unknown keys are still refused. This follows from `@qadi/core`'s record wire; see its entry.
