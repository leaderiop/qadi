# Phase 7: One port route address - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning
**Ticket:** ARCH-52 · reserved CCR-QD-391 (no ADR expected; ADR-QD-114 is reserved for Phase 8)

<domain>
## Phase Boundary

The server adapter (`PortRoutes.ts`) and the client adapter (`RemotePorts.ts`) for remote port
answering share one definition of the route address: the default prefix and the path for a
port. They also share one stated contract that the client decodes the reply body whatever the
HTTP status (`PORT_REPLY_STATUS`).
</domain>

<decisions>
## Implementation Decisions

- **D-01:** Export one internal definition, e.g. `PORT_ROUTE_PREFIX = "/__ports"` and
  `portPath(prefix: string | undefined, port: PortName): string`, from a module both files can
  import without a madge cycle. PortRoutes.ts is a candidate if RemotePorts.ts may import it.
  Otherwise use a small leaf `PortRouteAddress.ts`. It stays out of the barrel unless a
  consumer needs it (ADR-QD-099).
- **D-02:** Delete both `const DEFAULT_PREFIX = "/__ports"` (PortRoutes.ts:72, RemotePorts.ts:33)
  and both inline `${prefix}/${port}` templates (PortRoutes.ts:75, RemotePorts.ts:52).
- **D-03:** Move `PORT_REPLY_STATUS`'s doc, or a pointer to it, beside the address. RemotePorts
  references it explicitly instead of relying on it implicitly.
- **D-04 (test first):** Add a round-trip test that serves `portRoutes` (and
  `portRoutesUnguarded`) under a non-default prefix such as `"/x/ports"`, and calls them
  through `remotePortsLayer` with the same prefix. Every port answers. Use `@effect/platform`'s
  test server or the in-process HttpRouter/HttpClient pairing already used in
  `packages/http/test/`.
- **D-05:** Records: add CCR-QD-391, the `spec/README.md` line, a `spec/behaviors/23-http.md`
  row if the address contract is not yet a BEH, traceability, and `.changeset/port-route-address.md`
  (patch). Write no ADR unless an export changes.

### Claude's Discretion
- Leaf module vs placing it in PortRoutes.ts.
</decisions>

<canonical_refs>
## Canonical References

- `spec/decisions/107-a-port-is-answered-remotely-through-its-description.md`
- `packages/http/src/PortRoutes.ts`, `RemotePorts.ts`, `index.ts`
- `packages/core/src/PortRemote.ts` (`PortName`, `PORT_NAMES`)
</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- Phase 1 changes `portRoutesUnguarded`'s body, so rebase on it.
</code_context>

<deferred>
## Deferred Ideas

None.
</deferred>

---

*Phase: 07-port-route-address*
*Context gathered: 2026-11-08*
