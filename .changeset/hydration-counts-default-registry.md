---
"@qadi/devtools": patch
---

`@qadi/devtools`' hydration panel reads the five hydration counts from the default metric registry, where `@qadi/react` writes them. At effect 4.0.0 a metric looks its registry up on every update, so under a host-wired `MetricRegistry` the panel read zero while the counts were rising (ADR-QD-052's "cannot diverge whatever a host wires" was written for a release candidate). A host that exports metrics from its own registry must export these five from the default one.
