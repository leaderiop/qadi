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

`effect` is now a peer dependency (`^4.0.0-rc.118`, which also accepts stable `4.0.0`) instead of an
exactly pinned runtime dependency, and `@qadi/react` declares `@effect/atom-react` as a peer too.
Install them yourself: `pnpm add @qadi/core effect`. The public API is made of Effect classes, so the peer
guarantees a single copy in your dependency tree.

The minimum Effect version is now `4.0.0-rc.118`: that release moved the modules Qadi imports out of
`unstable/` (`effect/http`, `effect/http-api`, `effect/reactivity`, `effect/encoding`,
`effect/persistence`, `effect/devtools`), and a single build cannot import both spellings. Projects on
rc.116 or rc.117 must upgrade.
