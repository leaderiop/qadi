---
"@qadi/core": minor
---

Concurrent `AllOf`/`AnyOf`/`Rules` evaluation is now deterministic under failure: children run through `Effect.exit` and fold in declaration order, so a sibling failure can no longer pre-empt an earlier sibling's already-decisive `Deny`/`Allow` the way `Effect.forEach`'s fail-fast default let it (ADR-QD-026, INV-QD-020).

Two runtime fail-opens fixed: `resolveRef`'s `Neq` path and `mergeFields` both used `const exhaustive: never = ref` as their exhaustiveness guard, which only checks at compile time — an unrecognized tag at runtime returned the bogus scrutinee itself instead of the documented safe fallback, reopening the exact gap CCR-QD-112 had closed for `resolveRef` and risking a lattice-top widen for `mergeFields`.

`HasRelationship.depth` now decodes with a `[0, 64]` bound (previously unbounded/non-finite); `HasRole` gained `fields`; `policyDepth`/`simplify`/`explain` are now stack-safe over programmatically-built trees of arbitrary depth. New exports: `AccessDeniedPublic`, `toAccessDeniedPublic`, `attributeResolverTimingOut`, `relationshipResolverTimingOut`, `defaultFieldStrategy`, `allOfRoles`, `childrenOf`.
