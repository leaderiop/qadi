---
"@qadi/core": minor
"@qadi/http": minor
"@qadi/devtools": minor
---

**Breaking.** A port is answered remotely through its description (ARCH-31, ADR-QD-107). A browser that re-checks a seeded decision needs its ports answered by a server, and every host wrote both halves by hand: the newsroom example answered a relationship or history outage with `200 "Unknown"` (a denial, and under `not(...)` a grant), answered a malformed question, answered the cookie's subject under the asked subject's name, read an unrecognised 2xx body as `"Unknown"`, and left a served read invisible.

`@qadi/core`: `PortDescription` gains a required `wire: PortWire<Args, A>`, so a hand-built description without one no longer compiles. `PortInterpreter` (and `@qadi/devtools`' `PortCallInterpreter`) gains `"remote"`, so an exhaustive match over it needs an arm. New: `answerRemotely`, `askRemotely`, `remotePorts`, `servingFor`, `PortServing`, `PortServingOf`, `PortWire`, `PortWireReply`, `PortWireRefusal`, `RemotePortFailure`, `RemotePortError`, `describeRemotePortFailure`, `DecodedQuestion`, `PortWireSpan`, `servedPortCallsTotal` (`qadi_port_served_calls_total`) and `RelationshipDepth`. `RelatedResult` and `ActedResult` are now schema-derived consts with the same types. A served read goes through `servePortRead`, which opens the port's span with `qadi.interpreter = "remote"`. The question carries its subject and `answerRemotely` refuses any subject but the session's; a store outage reaches the asker as the port's own typed error with a `RemotePortError` cause and no server cause text.

`@qadi/http`: new `portRoutes`, `portRoutesUnguarded`, `PortRoutesOptions`, `PORT_REPLY_STATUS` (a `POST <prefix>/<PortName>` route per served port, `no-store`, status from a closed table) and `remotePortsLayer`, `RemotePortsOptions` (the client half over `HttpClient`).

`@qadi/devtools`: the Services panel labels a served call `served`.
