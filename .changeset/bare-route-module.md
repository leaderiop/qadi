---
"@qadi/http": patch
---

Internal restructure (ARCH-75): `addGuardedRoute` is now declared in one module, `GuardRoute.ts`, with its typing contract documented on it, where it was a thin function over a private `guardRoute` in another module. Nothing a caller imports, mounts or reads changed: no export, type, path, status or log line.
