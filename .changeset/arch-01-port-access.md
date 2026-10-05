---
"@qadi/core": minor
"@qadi/devtools": minor
---

`toPredicate` now reads its ports the way `evaluate` does, and stops asking where `evaluate` stops (ADR-QD-077, INV-QD-058). This is a behaviour change; every change is in the fail-safe direction (an error, never a widening — INV-QD-018 is unchanged).

- A port that **dies** during `toPredicate` (throws, `Effect.die`) now fails with that port's own typed error — `AttributeResolveError` or `DecisionHistoryUnavailable` — instead of surfacing as an untyped defect, so `Effect.retry` and `Effect.catchTag` around `toPredicate` see it, exactly as they do around `evaluate`.
- Translation now **stops asking ports** where `evaluate` does: an `allOf` at its first constant denial, an `anyOf` (under `fieldStrategy: "First"`) at its first constant allow, a rule table at the rule nothing later can override. A policy that previously failed because a port behind an already-decisive constant failed may now succeed. It never admits differently.
- A **refusal now wins over a port failure** in the same tree: `PolicyNotTranslatable` and `PolicyTooDeep` are decided from the tree alone, before any port is asked, so `allOf([hasAttribute(…), hasCustom(…)])` refuses with `HasCustom` rather than surfacing the attribute store's error first, and a policy refuses for every subject or for none. `MissingAction` is still raised when translation reaches the node that needs an action.
- New metric `predicatePortCallsTotal` (`qadi_predicate_port_calls_total`, keyed by the new closed `PredicatePortName`) counts `toPredicate`'s port calls. `portCallsTotal` keeps counting the evaluator's only, with its description unchanged.
- Port spans (`qadi.attribute`, `qadi.acted`, …) gain a `qadi.interpreter` annotation, `"evaluate"` or `"toPredicate"`, and `toPredicate`'s reads now emit them. A test asserting an exact span attribute set must include the new key.
- `@qadi/devtools`: `PortCall` gains `interpreter` and `PortActivity` gains `translationCalls`, so the Services screen tells a translation's reads from an evaluation's. `PortActivity.translationCalls` is a required field — a hand-built `PortActivity` needs it.
