---
"@qadi/testing": minor
---

**Breaking.** `TestLayerOptions` has one way to set up each port. The top-level `attributes`, `relationships`, `history` and `signatures` options are removed; `ports.<Port>` is now either `{ answers }` (that port's fixture data) or `{ layer }` (a layer of its service), and giving both for one port is a type error, so the old rule that a `ports` entry wins over the matching data option is gone. Migration is mechanical: `attributes: x` becomes `ports: { AttributeResolver: { answers: x } }`, `relationships: x` becomes `ports: { RelationshipResolver: { answers: x } }`, `history: x` becomes `ports: { DecisionHistory: { answers: x } }`, `signatures: x` becomes `ports: { SignatureHistory: { answers: x } }`, and a layer previously given as `ports: { P: layer }` becomes `ports: { P: { layer } }`. `CustomPredicate` gains a data form: `ports: { CustomPredicate: { answers: { isOwner: true } } }`. New exports `PortSetup` and `PortSetups`.

New observation helpers, each written once: `isolatedMetrics(effect)` runs an effect against its own empty `MetricRegistry` (on-fiber updates and reads only; an off-fiber write lands in the default registry), `collectingLogger()` returns `{ lines, layer }` recording every log line's message, level and annotations, and `CapturedLog` types a line. `collectingTracer` is unchanged.
