---
"@qadi/core": minor
"@qadi/testing": patch
"@qadi/devtools": patch
---

A port states what it serves, and the pass-through port enumerations are gone (ARCH-53, ADR-QD-114).

**Breaking (`@qadi/core`):** `mapPorts` is removed. `tabulatePorts(f)` takes the same visitor and returns the same `PortLayers`, because it now has a layer form beside its uniform one; replace `mapPorts(f)` with `tabulatePorts(f)`. `PortLayerVisitor` stays. `mapPorts` was published in 0.10.0.

`fixturePortsLayer` takes one argument, and `PortFixtures` is now per port `{ answers?, layer? }`: a `layer` wins over `answers`, and neither means the port's fail-closed default. Both were added after 0.11.0 (ARCH-42) and are unreleased, so no published consumer is affected. `@qadi/testing` has no API change: `TestLayerOptions.ports` crosses to core as it is. `@qadi/devtools` has no behaviour change.

`PortDescription` gains a required `serving` (`PortServingFacet`: the allowlist word, the asked name, and the admit and declare functions), and `PortWire.asked` moves to `serving.asked`. `PortServing` and `PortServingOf` keep their shape and are now declared in `PortServing.ts`, with the same `@qadi/core` import; `PortServingFacet` is new. A hand-built description (rare, because the registry is closed) states `serving`. These were added after 0.11.0 by ARCH-31 and are unreleased, so they are not marked breaking: no published release carries the shapes they change.

A port also states the request each policy leaf asks it (ARCH-70, ADR-QD-134): `PortDescription.asks`, a `LeafRequests<P>` with one `(leaf, site) => request` per policy tag the port reads, where `site` is a `ReadSite` (the subject asking and the resource asked about). Every read builds its request through it and `servingFor` reads the name a leaf asks from the same request, so the facet keeps no leaf map of its own. `ServedLeaves` (unreleased, from this changeset's `PortServingFacet`) is replaced by `LeafRequests`; `ReadSite`, `LeafOf` and `AskedOf` are new.

**Breaking (`@qadi/core`):** `PortDescription` takes the request as far as a site supplies it as a type parameter (`P`, defaulting to `Args`) and an exact `Asks`, and requires `asks`. A hand-built description (rare, because the registry is closed) must state `asks`. `PortDescription` shipped in 0.10.0, so this one is marked breaking.
