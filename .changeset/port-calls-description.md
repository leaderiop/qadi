---
"@qadi/core": patch
---

`qadi_port_calls_total`'s description now names the evaluator rather than `Evaluate.ts`, and points at `qadi_predicate_port_calls_total` for `toPredicate`'s calls: the old text named a module that calls no port and an interpreter function that no longer exists. A metric's registry key includes its description (ADR-QD-052), so this is a new registry entry. A reader that reads through the `portCallsTotal` export, the only supported way (ADR-QD-123), is unaffected; a dashboard that matched the old description text must match the new one.
