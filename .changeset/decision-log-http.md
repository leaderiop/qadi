---
"@qadi/http": patch
---

Internal: `/__decisions` and `/__decisions/backlog` now encode records and report refusals through one module (ARCH-50). Each route held its own refusal reporter and encode-or-report loop, which differed only in their words.

Nothing a caller sees changes. The frames, the JSON body, both default warnings, both span names and `onRefused`'s contract (called once per refused record, a throwing hook contained) are as before.

- The `options` of `decisionBacklogRoute` are typed by the shape `DecisionStreamOptions` now extends, and a `Pick<DecisionStreamOptions, "onRefused">` still type-checks.
- This change adds or removes no export. `frame`, `syncedFrame` and `decisionFrames` are removed in this release by a separate change, `decision-stream-order`.
