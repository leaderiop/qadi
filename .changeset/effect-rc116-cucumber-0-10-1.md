---
"@qadi/core": patch
"@qadi/testing": patch
"@qadi/promise": patch
"@qadi/react": patch
"@qadi/http": patch
"@qadi/devtools": patch
"@qadi/audit": patch
"@qadi/predicate-sql": patch
"@qadi/predicate-prisma": patch
---

Bump `effect` to `4.0.0-rc.116` (and its lockstep catalog siblings `@effect/atom-react`, `@effect/platform-node`, `@effect/vitest`). No public API or runtime behavior changes for any `@qadi/*` package — confirmed by diffing the published `4.0.0-rc.115`/`4.0.0-rc.116` tarballs directly and grepping every changed symbol against this codebase's own source.
