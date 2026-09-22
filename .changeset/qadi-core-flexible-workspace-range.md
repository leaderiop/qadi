---
"@qadi/audit": patch
"@qadi/devtools": patch
"@qadi/http": patch
"@qadi/predicate-prisma": patch
"@qadi/predicate-sql": patch
"@qadi/promise": patch
"@qadi/react": patch
"@qadi/testing": patch
---

Declare the internal `@qadi/core` (and, for `@qadi/devtools`, `@qadi/testing`) dependency as `workspace:^` instead of `workspace:*`. `pnpm publish` converts `workspace:*` into an exact version pin in the published tarball, so a consumer that already has an older `@qadi/core` on a compatible version gets a second, separately-resolved copy installed alongside it the moment any of these packages bump — two nominally-different instances of the same package, which TypeScript cannot always reconcile when a value's inferred type spans both (surfaced downstream as `TS2883: The inferred type ... cannot be named without a reference to ...`). `workspace:^` still gets fully resolved by `pnpm publish` (verified via `scripts/check-package-install.mjs`, no `workspace:`/`catalog:` protocol reaches the packed manifest) — it just publishes a caret range instead of an exact pin, so a consumer's own compatible `@qadi/core` continues to satisfy it in place.
