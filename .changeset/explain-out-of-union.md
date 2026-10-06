---
"@qadi/core": patch
"@qadi/devtools": patch
---

`renderExplanation` no longer throws on a policy built in code whose `fieldStrategy` or `combining` is outside its closed union (an unknown string, a key `Object.prototype` supplies such as `"toString"`, or `""`). It names the value verbatim and says what the evaluator does with it — an `allOf`/`anyOf` exposes no fields and is evaluated fail-closed, a rule table is walked under `DenyOverrides` — including for an empty or one-part composite, which used to render its part's fields though none are granted. `@qadi/devtools`' `inspect` marks such a value "(outside the union, evaluated fail-closed)" instead of showing it bare (ADR-QD-092, amended 2026-10-06).
