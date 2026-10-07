---
"@qadi/http": minor
---

`registerApi` no longer lists an endpoint that `RequirePermission` is not attached to. An annotated endpoint behind `.middleware(RequirePermission)` called before `.add(group)`, behind no middleware, or in a group the middleware does not cover was served to anyone while `/__permissions` listed it as guarded. `registerApi` now fails with the new `RequirePermissionNotAttached`, naming the group and endpoint, and its error union widens.
