---
"@qadi/audit": patch
"@qadi/devtools": patch
---

`@qadi/audit`: `AuditDecisionSinkLive`'s staging-commit-failure path now logs a warning like its two sibling loss paths already did, instead of being silent except for a metric.

`@qadi/devtools`: `PolicyExplorer`'s paste-box decode-failure message is now a readable, path-prefixed sentence instead of a raw `SchemaError` dump of the whole `Policy` union.
