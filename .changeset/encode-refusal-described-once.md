---
"@qadi/core": minor
"@qadi/http": patch
"@qadi/audit": minor
---

An encode refusal is described once, in core, and every adapter reports one the same way.

`@qadi/core` adds `encodeRefusalPath`, `encodeRefusalAnnotations` (and its `EncodeRefusalAnnotations` type), `describeEncodeRefusal` and `reportEncodeRefusal`. The three pure readings sit beside `EncodeRefusal`; the reporter calls an adapter's hook once or logs its message with the same three annotations, and contains a hook that throws.

`@qadi/audit` no longer drops a refused record silently: `AuditDecisionSinkLive` logs a warning naming the refusal, its path and the `evaluationId`, or calls the new `AuditDecisionSinkOptions.onRefused`. **Breaking:** `AuditEntryNotEncodable` carries a required `evaluationId`, so code that constructs the class must supply it. Nothing in this repository does.

`@qadi/http`: an `onRefused` that throws no longer ends the decision stream or empties `/__decisions/backlog`; the failure is logged and the next record is still served.
