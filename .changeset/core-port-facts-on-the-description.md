---
"@qadi/core": minor
---

**Breaking.** Each port's description states its span name and its fixture. `PortDescription` gains a span-name type parameter and a required `fixture` member.

`PORT_NAMES`, the five port names in registry order, is exported.

`PortSpanName`, `PortSpanOf`, `PortFixtureData` and `PORT_FIXTURES` keep their names and shapes. Metric ids, descriptions, span names and served and wire bytes are unchanged.

Two ports sharing a span name is now a compile error.

Upgrading: a description built by hand adds `fixture` and passes its span literal as the new type argument; code that names `PortDescription<K, …>` to read `span` uses `DescriptionOf<K>` or `PortSpanOf<K>`. See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
