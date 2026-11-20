# Phase 63: The packed-install gate probes every new public name - Context

**Gathered:** 2026-11-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Gate 14 (`scripts/check-package-install.mjs`) builds a consumer fixture against the installed tarballs. After this phase,
that fixture compiles and runs every public name Phases 60 and 61 made public that it never touched:
- `makeGatesFeed`
- `makeDiagnosticsFeed`
- `DecisionCacheShape`

A broken `exports` map entry or a broken `.d.ts` for any of them fails the merge gate. A derived guard keeps a future
`make*Feed` export from being left unprobed.

ARCH-110, the v1.6 audit item I-a. The work is in one script: `scripts/check-package-install.mjs`. Its records:
- an ADR-QD-033 amendment
- CCR-QD-454
- traceability

There is no `packages/*/src` change, no changeset and no new public export. The DoD table is unchanged, because the
command stays the same.

Requirements: PROBE-01..05, plus the cross-cutting WX-01..07.

</domain>

<decisions>
## Implementation Decisions

### The `make*Feed` guard (PROBE-01)
- **The required name set comes from the packed artifact.** Inside the sandbox, take
  `Object.keys(await import("@qadi/devtools"))` and keep the names matching `/^make\w*Feed$/`. The set is what ships,
  so a new feed export is caught without anyone editing the script.
- **"Called, not mentioned" is decided by the TypeScript compiler.** Parse the `FIXTURE` source with the `typescript`
  package (already a dependency). Each required name must be the callee identifier of at least one `CallExpression`.
  Comments, string text, `typeof X` and an import specifier alone do not count.
- **Scope: only the `make*Feed` runtime exports of the `@qadi/devtools` root**, as the success criteria state. The
  type-only `DecisionCacheShape` is held by its own probe and its `@ts-expect-error` (PROBE-04), not by the guard.
- **Location: inside check 4 of `scripts/check-package-install.mjs`**, beside the fixture it reads. On failure it names
  every unprobed name. The DoD row is unchanged.

### The three probes (PROBE-02..04)
- **`makeGatesFeed`.** The feed is built over a structural registry literal typed by the packed `GateRegistryLike`. The
  registry holds exactly one `GateInstanceLike`. The probe asserts both of these:
  - the snapshot's `registry` is `RegistryRead.Read` with 1 instance;
  - the snapshot differs from the feed's initial snapshot.
  `@qadi/react`'s real gate registry needs a DOM and is out of reach from the fixture. Note that the wave notes said "an
  empty registry"; the success criterion (one instance) supersedes them.
- **`makeDiagnosticsFeed`.** The probe waits for `status._tag === "Live"`, which only an accepted first sample sets.
  - The wait is a bounded `Effect.yieldNow` loop with a fixed maximum number of turns, and no wall clock.
  - It runs inside `Effect.scoped`, so the scope is closed.
  - The probe fails if `Live` is not reached within the bound.
  - It follows the existing `makeTimelineFeed` probe pattern (`for (let i = 0; i < 20; i++) yield* Effect.yieldNow`).
- **The `DecisionCacheShape` host cache.**
  - A typed host cache built from the packed `DecisionCacheShape` wraps `decisionCacheLayer()` and counts its own
    `getOrCompute` calls.
  - A counting attribute resolver (or an equivalent port-read counter) shows that the second of two identical decisions
    did not walk again. That counter is the hit, and it is observable without touching internals.
  - The probe asserts that the wrapper was called twice and that the walk ran once.
- **Where the `@ts-expect-error` goes.** It sits on a host-cache literal whose `getOrCompute(question, compute)` has the
  pre-0.13 shape, assigned to the packed `DecisionCacheShape`. The old shape is therefore refused through the published
  `.d.ts`.
- **All probes are deterministic.** No wall clock and no `Date`/`performance`. Every scope is closed.

### Proof and records (PROBE-05, WX)
- **The guard comes first and is RED on the base.** It lands in its own commit, before any probe. Gate 14 at that commit
  fails and names `makeGatesFeed` and `makeDiagnosticsFeed`, the two unprobed names. That output is recorded in the
  SUMMARY.
- **The removed-probe proof is recorded, not committed.** In a scratch copy outside the repo, each of the three probes is
  deleted in turn, and gate 14 must fail every time. A committed self-test would need its own sandbox install.
- **ADR: amend ADR-QD-033** ("the packed artifact is the product", the ADR that defines gate 14). The amendment records
  the derived feed probes and the host-cache probe. ADR-QD-176 is left unused, and the CCR row says so.
- **Records: CCR-QD-454 and the traceability rows.** No BEH or INV, because gate behaviour is not library behaviour.
  BEH-QD-651–655 and INV-QD-371–372 are unused and named in the CCR row. No changeset. The DoD table is unchanged.
- **Reserved ids only.** Never run `scripts/next-id.mjs`, because the whole v1.7 block is already reserved
  (`_WAVE12-CONTEXT.md`).

### Owner decisions after research (asked once, 2026-11-20; locked)
- **D-A1: the guard parses with `typescript/unstable/sync` + `typescript/unstable/ast/is`.** The repo's `typescript` is
  7.0.2 (the native port): its root exports only `version`/`versionMajorMinor`, so "the TypeScript compiler" means the
  `unstable` entry. Any throw from that API is caught and reported through `fail()`, so a TS upgrade that breaks it turns
  gate 14 red, never silently green.
- **D-SC4: the guard also requires the type-only probe names.** Besides the derived `make*Feed` set, the guard requires
  the fixture to reference a fixed list of type-only probe names (`DecisionCacheShape`) as a type reference in the AST,
  so deleting the whole host-cache probe fails gate 14 as well. The type-only list is explicit, because a type has no
  runtime key to derive it from.

### Claude's Discretion
- The exact number of `yieldNow` turns that bounds each probe, and the shape of the counting port.
- Whether the guard's AST walk is a helper in the script or inline in check 4.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/check-package-install.mjs:396-…`: `FIXTURE` is the consumer source and is compiled by tsc in the sandbox. Line
  ~425 imports `emptyTimeline, ingest, makeTimelineFeed, sourceFromRecords, verdictOf` from `@qadi/devtools`. Line ~504
  is the existing `makeTimelineFeed` probe: `Effect.scoped`, 20 `Effect.yieldNow` turns, and `expect(...)` assertions.
- `expect(label, actual, wanted)` is the fixture's assertion helper. It throws `consumer: …`.
- `packages/devtools/src/model/Gates.ts:63-71,247-250`: `GateInstanceLike` is `{ id, kind, policy, resource?, state,
  element? }`, and `GateRegistryLike` is `{ instances(), subscribe(listener) }`. Both are exported as types from the
  devtools root.
- `packages/devtools/src/model/GatesFeed.ts`:
  - `makeGatesFeed(inputs: GatesFeedInputs)` takes `{ gates?, questions?, intervalMillis? }`.
  - `RegistryRead` is `Unwatched | Read{instances} | Failed{reason}`.
  - The snapshot is `{ registry, asked }`.
- `packages/devtools/src/model/DiagnosticsFeed.ts:130`: `makeDiagnosticsFeed(init?: DiagnosticsOptions)`.
  `DiagnosticsStatus` is `Off | Starting | Live | Stopped`, and only an accepted sample sets `Live`.
- `packages/core/src/DecisionCache.ts:38,215`: `DecisionCacheShape` and `decisionCacheLayer(options?)`.

### Established Patterns
- Gate 14 checks are numbered sections in one script that push to `failures` via `fail(message)`.
- The consumer fixture is a template string compiled and run in `.package-check/`.
- Feed probes let the fiber run for fixed turns, with no clock (ADR-QD-099's closed map reaches them from the root).
- Phase 62 house rules apply: prove each new check can fail with a scratch RED outside the repo, and never commit
  scratch.

### Integration Points
- Check 4 of `scripts/check-package-install.mjs` (the consumer compiles and runs) is where the guard and probes go.
- Spec: ADR-QD-033 (amendment), `spec/README.md` CCR register (CCR-QD-454), `spec/traceability.md`.
- `pnpm check:pr` runs gate 14 (`node scripts/check-package-install.mjs`).

</code_context>

<specifics>
## Specific Ideas

- The guard must be shown RED on the phase base with exactly the two names `makeGatesFeed` and `makeDiagnosticsFeed`.
  This matches `_WAVE12-CONTEXT.md`'s evidence that the fixture imports only `makeTimelineFeed` of the feeds.
- Per `_WAVE12-CONTEXT.md`, this phase and Phase 62 together protect what v1.6 ships. The owner may cut the v1.6 PR
  after this phase. Nothing is released or published (WX-07).

</specifics>

<deferred>
## Deferred Ideas

- Guarding every runtime export of every public root, not only `make*Feed`, was considered and not chosen.

</deferred>
