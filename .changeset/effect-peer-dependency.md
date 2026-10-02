---
"@qadi/core": minor
"@qadi/testing": minor
"@qadi/promise": minor
"@qadi/react": minor
"@qadi/http": minor
"@qadi/devtools": minor
"@qadi/audit": minor
"@qadi/predicate-sql": minor
"@qadi/predicate-prisma": minor
---

`effect` is now a peer dependency (`^4.0.0`, stable Effect v4) instead of an
exactly pinned runtime dependency, and `@qadi/react` declares `@effect/atom-react` as a peer too.
Install them yourself: `pnpm add @qadi/core effect`. The public API is made of Effect classes, so the peer
guarantees a single copy in your dependency tree.

The minimum Effect version is now stable `4.0.0`. Since rc.118 the modules Qadi imports live outside
`unstable/` (`effect/http`, `effect/http-api`, `effect/reactivity`, `effect/encoding`,
`effect/persistence`, `effect/devtools`), and a single build cannot import both spellings. Stable
`4.0.0` also changed `Effect.partition` to return `[passes, fails]` (it was `[fails, passes]`) and tightened
`Schema.brand`'s tag type; `decideSubjects`/`filterSubjects` and the `@qadi/core` brands are adapted.
Projects on a release candidate must upgrade to `4.0.0`.
