---
"@qadi/core": minor
"@qadi/testing": patch
"@qadi/devtools": patch
---

A port states what it serves, and the pass-through port enumerations are gone (ARCH-53, ADR-QD-114).

**Breaking (`@qadi/core`):** `mapPorts` is removed. `tabulatePorts(f)` takes the same visitor and returns the same `PortLayers`, because it now has a layer form beside its uniform one; replace `mapPorts(f)` with `tabulatePorts(f)`. `PortLayerVisitor` stays. `mapPorts` was published in 0.10.0.

`fixturePortsLayer` takes one argument, and `PortFixtures` is now per port `{ answers?, layer? }`: a `layer` wins over `answers`, and neither means the port's fail-closed default. Both were added after 0.11.0 (ARCH-42) and are unreleased, so no published consumer is affected. `@qadi/testing` has no API change: `TestLayerOptions.ports` crosses to core as it is. `@qadi/devtools` has no behaviour change.

`PortDescription` gains a required `serving` (`PortServingFacet`: the allowlist word, the leaf tags the port answers, the asked name, and the admit and declare functions), and `PortWire.asked` moves to `serving.asked`. `PortServing` and `PortServingOf` keep their shape and are now declared in `PortServing.ts`, with the same `@qadi/core` import; `PortServingFacet` and `ServedLeaves` are new. A hand-built description (rare, because the registry is closed) states `serving`. These were added after 0.11.0 by ARCH-31 and are unreleased, so they are not marked breaking: no published release carries the shapes they change.
