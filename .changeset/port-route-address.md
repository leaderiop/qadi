---
"@qadi/http": patch
---

`portRoutes`, `portRoutesUnguarded` and `remotePortsLayer` now build a port's route from one internal definition, so a host that gives the routes and the client the same `prefix` (or neither) reaches every port. The rule that a client reads the reply from the body whatever the HTTP status is stated once, beside that definition. No export is added or removed (ARCH-52).
