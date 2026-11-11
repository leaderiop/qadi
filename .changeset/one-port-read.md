---
"@qadi/core": minor
---

A port's span is projected once, and every read is one body (ARCH-47, ADR-QD-109). A served `qadi.hasSignature` span carried none of the signature attributes the local span carried, because the span projection was stated twice (once for the local read, once on `PortWire`) and the two had drifted. A description now states its span once, and the local and served reads share one body, so they cannot disagree again.

`@qadi/core`: a served `qadi.hasSignature` span now carries `qadi.meaning`, `qadi.signer_role` and `qadi.matched`, equal to the local span apart from `qadi.interpreter`. A served read whose store *throws* is now the port's typed error (`Unavailable` on the wire, and the asker's own typed error with a `RemotePortError` cause) instead of a defect. `SignatureQuery` gains optional `meaning` and `signerRole`, the asker's requirement: context for the span and the request key, never a filter, so a store still returns every signature on file whatever they say. The signature request key now covers `subjectId`, `resourceId`, `meaning` and `signerRole` (an absent field is distinct from every present value; the key's text is described with `PortDescription.key`'s `Result` in this release's request-key note), and the wire question gains the two optional strings; an old question still decodes.

Version skew: a client on this release asking a server on the previous schema is refused `Malformed`, which fails closed as the port's typed error, so upgrade servers with or before clients.

Not marked **Breaking**: `PortSpanAttributes` gains a fourth type parameter, `pose`, and a `disclose` that takes the request, and `PortWire` loses `spanQuestion` and `spanAnswer` while the `PortWireSpan` type is removed, but every one of these was added after 0.11.0 (ARCH-21 and ARCH-31) and has not been published, so no published consumer is affected. `SignatureQuery` was published and only gains optional fields.

**Observable change (not Breaking):** a resource-scoped read whose resource has no string id now leaves only the port's own span, carrying the question and the `MissingResourceId` failure, on every scoped port (ARCH-70, ADR-QD-134). The acted and signature reads no longer open a nested `qadi.requireScopedResourceId` span; the relationship read never did. A deployment that queried for that span name will not find it.
