---
"@qadi/core": minor
---

**New:** `roleWalk(role)` and `RoleStep` return the role walk: every role reachable from a role, once, in the order that decides which inheritance path wins. Each step is a `Visit` or a `Revisit`. Roles are told apart by object identity, not by name. Parents are visited in `inherits` order, and the first path to reach a role wins. An edge into a role already visited is a `Revisit` whose `first` is the index of that role's `Visit`, and its subtree is not walked again. The walk is iterative, so a 20,000-deep chain does not overflow the stack. Like the walkers it replaces, it skips holes in a sparse `inherits` array.

`flattenPermissions`, `flattenAll`, `roleNames`, `permissionProvenance` and `fromRoles` now read this one walk instead of separate copies of it. Their results are unchanged. `fromRoles` walks all its roles in one pass: about two to three times faster when the roles share ancestors.

The sets that `flattenPermissions`, `flattenAll`, `roleNames` and `fromRoles` return now fill in walk order, the order `permissionProvenance` reports. Before, they filled in the order of an internal stack. No spec defines that order, so do not rely on it. Compare sets by membership.
