---
"@qadi/core": patch
"@qadi/devtools": patch
---

A port's request key now covers every argument the port receives (ADR-QD-094). `relationshipResolverPort.key` includes the clamped `depth`, and `customPredicatePort.key` includes the resource and the whole subject (roles, permissions, attributes, canonically ordered). Devtools' capture and replay no longer answer a depth-1 relationship ask with a depth-3 capture, a custom predicate on one resource with another resource's answer, or a what-if that dropped a role with the answer given to the original subject (a stale allow). The two key strings change; no type changes.
