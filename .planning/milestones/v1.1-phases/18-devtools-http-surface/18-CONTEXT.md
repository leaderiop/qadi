# Phase 18: The devtools HTTP surface has one address - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-66 · review candidate #6 (Worth exploring)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`

<domain>
## Phase Boundary

`@qadi/http`'s three devtools-facing routes (the decision stream `/__decisions`, its backlog
`/__decisions/backlog`, and the permission registry `/__permissions`) get one address rule with an optional
prefix. This mirrors what merged ARCH-52 did for port routes (`PortRouteAddress.ts`). The client side (the devtools
`EventSource` URL) reads the same rule rather than a hard-coded string. If D-02 picks it, one call mounts the
three guarded routes with one guard pair.
</domain>

<evidence>
## Evidence (verified by reading at 1721a42)
- Fixed paths: `packages/http/src/DecisionStreamRoute.ts:227` (`"/__decisions"`), `DecisionBacklogRoute.ts:52`
  (`"/__decisions/backlog"`), `PermissionRegistry.ts:166,186` (`"/__permissions"`).
- By contrast: `packages/http/src/PortRouteAddress.ts:26-43` owns the prefix and the server/client path rule for port routes.
- Caller friction: `examples/nextjs-newsroom/app/api/[[...route]]/route.ts` rewrites every request (`unprefixed`)
  because the stream "mounts `/__decisions` at a fixed path" (`src/server/api.ts:17-20`). The client hard-codes
  `url: "/api/__decisions"` (`src/client/Dock.tsx:67`). The same host gives port routes `prefix: "/ports"`
  (`api.ts:84`), so it uses two conventions. The guard pair `(readDevtools, canReadDevtools)` is passed three times
  (`api.ts:184-186`). `examples/http-advanced` should be checked for the same pattern.
- Merged wave 5's ARCH-50 put encoding and refusal for stream and backlog in one module (`DecisionLogHttp.ts`).
  This phase is about the **address**, not the encoding.
</evidence>

<decisions>
## Implementation Decisions
- **D-01 (test first):** a RED round-trip test serving the stream, the backlog and the registry under a
  non-default prefix (e.g. `/x/devtools`), with the devtools client connecting through the same prefix. RED
  because no prefix option exists today; it should fail at the type level or at runtime. Follow the round-trip
  test shape of merged Phase 7 (`.planning/milestones/v1.0-phases/07-port-route-address/`).
- **D-02 (`checkpoint:decision`):** (A) an address module only: each route constructor gains `prefix?`, and the
  client gets the path function; (B) A **plus** one mounting call that takes the guard pair, the log and `prefix?`
  and mounts all three. Recommend **B**: the user prefers complete over simple; two examples hand-assemble the
  same three calls; and BEH-QD-202 (always guarded, no unguarded variant) is easier to keep with one guarded entry.
- **D-03:** the client half must not import server route code (browser bundle). Follow merged ARCH-52: a
  leaf module, package-private unless devtools needs it. Devtools may import only `@qadi/http`'s root
  (ADR-QD-099), so either the leaf's path function is exported (a gate 13 row) or the devtools source takes a
  base URL. The planner checks how `@qadi/devtools` builds its stream URL today
  (`grep -rn "__decisions" packages/devtools/src`).
- **D-04:** both examples migrate. The Next.js example drops its `unprefixed` rewrite **if** the prefix makes it
  unnecessary (the planner verifies against Next's catch-all routing), and the client URL comes from the shared rule.
- **D-05:** Records: BEH for the address rule; CCR; `spec/overview.md` for any export; changeset (`@qadi/http`
  minor if an option or export is added). Add an ADR only if D-02 picks B and it adds a public concept.

### Claude's Discretion
- Name of the address module and mounting call.
</decisions>

<canonical_refs>
## Canonical References
- `packages/http/src/DecisionStreamRoute.ts`, `DecisionBacklogRoute.ts`, `DecisionLogHttp.ts`, `PermissionRegistry.ts`, `PortRouteAddress.ts`, `index.ts`
- `packages/devtools/src/model/Source.ts` (EventSource / backlog fetch)
- `examples/nextjs-newsroom/src/server/api.ts`, `app/api/[[...route]]/route.ts`, `src/client/Dock.tsx`; `examples/http-advanced/`
- ADR-QD-107, ADR-QD-099; BEH-QD-202; `.planning/milestones/v1.0-phases/07-port-route-address/07-CONTEXT.md`
</canonical_refs>

<deferred>
## Deferred Ideas
- A shared HTTP stack helper (registry → subjects → services): ARCH-36 D-36-f kept it out of the library.
</deferred>

---
*Phase: 18-devtools-http-surface · Context gathered: 2026-11-10*
