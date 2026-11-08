# Phase 8: Port serving from the registry - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning (contains a blocking human checkpoint)
**Ticket:** ARCH-53 · reserved ADR-QD-114 · reserved CCR-QD-392

<domain>
## Phase Boundary

The serving side of remote port answering (`PortRemote.ts`) derives its allowlist and its
mapping from policy leaf to port from the port descriptions, instead of restating it six times.
Pass-through enumerations of the five ports in `Ports.ts` and `@qadi/testing` are removed.
The serving facet requires amending ADR-QD-094, so it sits behind a human checkpoint. The
enumeration cleanup does not, and it ships either way.
</domain>

<decisions>
## Implementation Decisions

### Checkpoint
- **D-01:** The FIRST task of the phase is a `checkpoint:decision` asking the human to approve
  or reject amending ADR-QD-094 so that a port description may carry a `serving` facet: the
  allowlist kind (required / open / opt-in) and the policy leaf tags it answers. Present the
  trade-off. In favour: "which leaf asks which port" is stated in six places (`PortServing`
  :52, `ADMITTED` :67, each port's `wire.asked`, `Collector` :226, `collectNames` :241, and
  `servingFor`'s five sets :206-224), so adding a leaf or port touches all six. Against:
  ADR-094 kept fixture data out of descriptions to keep them behavioral. Serving is a fact
  about the port, not test data.

### If approved (SERV-02, SERV-03)
- **D-02:** Add a `serving` member to the port description type (PortDescription.ts) and state
  it in each of the five port modules. Remove `wire.asked`, which the facet subsumes.
- **D-03:** Derive `ADMITTED`, `Collector`, `collectNames` and the per-port sets in
  `servingFor` from the registry (`PORTS` in Ports.ts), the way `PORT_FIXTURES` is derived.
- **D-04:** The public `PortServing` interface shape is unchanged. A `tstyche` type test pins
  it (`pnpm test:tstyche`).
- **D-05:** Write ADR-QD-114 ("A port states what it serves"), amending ADR-QD-094 and 107.

### If rejected (SERV-05)
- **D-06:** Append a dated "Considered and rejected" note to ADR-QD-094 with the human's reason,
  so future architecture reviews do not suggest it again. Skip D-02..D-05.

### Always (SERV-04)
- **D-07:** In `Ports.ts`, `tabulatePorts` (:166) and `mapPorts` (:186) have identical bodies.
  Keep one, and update every caller.
- **D-08:** Derive `fixturePortsLayer` (Ports.ts:281-313) from the registry, e.g. by mapping
  each description to `overrides[d.port] ?? fixtureLayer(PORT_FIXTURES[d.port], data[d.port])`.
  The correlated index may not typecheck without `as`, which is forbidden (AGENTS.md §6). If it
  does not, use the `PortName`-keyed mapped-type helper that `portsLayer` already uses
  generically, and keep the explicit rows only if no `as`-free form exists. Record that
  outcome in the SUMMARY.
- **D-09:** In `@qadi/testing`'s `QadiReviewLayer.ts:156-177`, remove the `answersOf`/`layersOf`
  split that core zips back together. Core accepts the `{answers} | {layer}`-per-port shape
  directly, or testing passes it through unchanged. The public `TestLayerOptions.ports` shape
  (CCR-QD-270, ARCH-42) is unchanged.
- **D-10:** Records: add CCR-QD-392, the `spec/README.md` line, traceability, and
  `.changeset/port-serving.md`. If approved, also update behaviour docs for remote serving.

### Claude's Discretion
- The exact serving-facet type and the derived helpers' names.
</decisions>

<canonical_refs>
## Canonical References

- `AGENTS.md` §3 (ports described once; a new port is a description plus registry lines), §6 (no `as`)
- `spec/decisions/094-a-port-is-described-once.md` (the amendment target; read its rejected-alternatives section on `fixture`)
- `spec/decisions/107-a-port-is-answered-remotely-through-its-description.md`
- `spec/README.md` CCR-QD-270 (ARCH-42 PORT_FIXTURES / fixturePortsLayer)
- `packages/core/src/PortRemote.ts`, `Ports.ts`, `PortDescription.ts`, the five port modules
- `packages/testing/src/QadiReviewLayer.ts`, `QadiTestLayer.ts`
</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- Phase 2 edits the same five port modules' `wire` blocks, so rebase on Phase 2.
- `@qadi/http` `PortRoutes.ts` consumes `PortServing`/`servingFor`.
</code_context>

<deferred>
## Deferred Ideas

None.
</deferred>

---

*Phase: 08-port-serving-from-registry*
*Context gathered: 2026-11-08*
