# Phase 47: Port facts read from the description - Context

**Gathered:** 2026-11-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes three facts about each port stated once:
- whether a port's service is its description's fail-closed default;
- what being defaulted costs;
- how one of its call rows reads.

Devtools then no longer parses a display-name convention, and a hand-written wrapper can no longer make a fail-closed default look like a real adapter (ARCH-94, `@qadi/core` + `@qadi/devtools`; PFCT-01..05, WX-01..07).

In scope:
- In core, a structural defaultedness fact: `nonePort` sets it, and every derived wrapper (`PortDerivation.ts`, `PortDoubles.ts`'s recording wrapper) carries it. One public reader exposes it.
- In devtools:
  - `isDefaultName` is deleted;
  - the consequence sentences (`CONSEQUENCES`, `Wiring.ts`) and the call-row readings (`describeOne`, `ServicesPanel.tsx`) move into one port-reading module keyed by `PortName`;
  - `ROWS` (`model/PortCalls.ts`) is built from the registry.

Out of scope:
- changing what a port answers, or its wrappers' behaviour;
- changing the composed display names (BEH-QD-196 stays as display);
- a public helper for naming wrappers freely (deferred);
- devtools' gate/dock work (Phase 49).

Shared wave rules: `.planning/phases/_WAVE10-CONTEXT.md`. Reserved ids: ARCH-94, ADR-QD-160, CCR-QD-438, BEH-QD-571..575, INV-QD-339..340.

</domain>

<decisions>
## Implementation Decisions

### The defaultedness fact (core)
- **D-01:** The fact is an own, enumerable, **symbol-keyed** property on the service shape.
  - `nonePort` sets it, and every derived wrapper (`wrapPort`, `boundedPort`, `retryingPort`, `timingOutPort`, and the `recording` double in `PortDoubles.ts`) copies it from its inner shape.
  - A hand-written wrapper that spreads `...inner` carries it automatically. That is the property that makes the RED row (D-09) pass.
  - Rejected: a string field such as `defaulted?: true` on every Shape (it is visible, forgeable and could collide with a user's field), and a core `WeakSet` keyed by shape identity (a spreading wrapper would lose it).
- **D-02:** The marker holds the **`PortName`** it defaults. The reader checks `marker === d.port`, so a value moved onto another port's service never reads as that port's default.
- **D-03:** The symbol is **package-private**. Core exports one reader, `isPortDefault(description, service): boolean`, named in `spec/overview.md`. Nobody outside core can forge "defaulted"; a wrapper can only carry it forward by spreading.
- **D-04:** A hand-written wrapper that builds a **fresh object** (no spread) is reported as a real adapter, because it no longer carries the default's identity. BEH and ADR-QD-160 state this limit and tell wrapper authors to spread `inner`.
  - A public "wrap with any name" helper is deferred.

### Where each port's facts live (devtools)
- **D-05:** One devtools module, `packages/devtools/src/model/PortReading.ts` (final name at the planner's discretion), has a mapped type `{ readonly [K in PortName]: { consequence: string; describe: (call: PortCallOf<K>) => string } }`. Each port's row holds its consequence sentence and its call-row reading.
  - Core gets no display prose.
  - Adding a port is exactly the compile error the roadmap allows (PFCT-05).
- **D-06:** `ServicesPanel.tsx` keeps only a generic `describe(call)` that dispatches through the module, plus the existing `attempts` suffix. No port's span field names remain in the view. `CONSEQUENCES` and `describeOne`'s per-port arms are deleted.
- **D-07:** `ROWS` (`model/PortCalls.ts`) is built once at module scope from the registry (`forEveryPort`/`tabulatePorts`) by one generic row builder, so the five tag-only-different arms are gone.
  - `ROWS[K]` still returns `PortCallOf<K>`.
  - No `as`, `!` or `any`. If the typing fights back, the planner records the approach in research.
- **D-08:** Rendered wording is **byte-identical** for all five ports:
  - the consequence lines;
  - every `describeOne` branch, including "not recorded", "no answer", "anywhere", depth, signer role and scope;
  - the `attempts` suffix;
  - the card's defaulted and real text.

### Tests and evidence (test-first on the phase base)
- **D-09:** **RED row, one per port, built via `forEveryPort`.** A hand-written `Layer.effect` wrapper spreads `...inner` around the port's fail-closed default, renames it (for example `"audited <port>"`, which does not follow `"<inner> (<suffix>)"`) and forwards the method. `wiringReport` must say `defaulted: true`. On the base it says `false`, so it shows as a real adapter.
- **D-10:** **Core pins.**
  - `isPortDefault` holds for each port's `nonePort`, and through stacks of derived wrappers (retrying, bounded, timingOut and recording, in more than one order and depth).
  - It is false for a real adapter, a fresh-object wrapper, a default installed under another port, and a shape without the marker.
  - A tstyche pin covers the reader's signature.
- **D-11:** **Characterisation**, green on the base and committed alone before any `packages/*/src` edit:
  - the five consequence lines;
  - a representative call-row sentence per port covering each branch of today's `describeOne` (present and absent fields, `attempts > 1`);
  - the card's defaulted and real text as `ServicesPanel` renders it.
- **D-12:** **The throwaway sixth port.**
  - It is an uncommitted scratch edit that adds a sixth `PortName` and description to core's registry.
  - Record exactly which devtools files the compiler flags (expected: only the port-reading module's mapped row), then revert with `git checkout --`.
  - The output goes in the SUMMARY, as Phase 44's scratch wire field did.
  - This mirrors the roadmap's "recorded and reverted".

### Records and the user-facing change
- **D-13:** BEH-QD-196's `"<inner> (<suffix>)"` naming is kept **as a display name only**. Nothing parses it. BEH-QD-196 says so and points to the structural fact.
- **D-14:** The changesets are `@qadi/core` **minor** and `@qadi/devtools` **patch**.
  - Core gets a new `isPortDefault` export. A defaulted port's shape gains a symbol property; this is not Breaking.
  - Devtools reads the fact; rendered output is unchanged except that a spreading wrapper around a default now reads defaulted, which is the fix.
- **D-15:** The per-file Stryker base is committed alone as the phase's first commit. It covers `packages/core/src/PortDerivation.ts` (and `PortDoubles.ts` if it is edited) with `stryker.config.mjs`, and the touched devtools files Stryker can instrument with `stryker.devtools.mjs` (`model/Wiring.ts`, `model/PortCalls.ts`, and `react/ServicesPanel.tsx` if instrumentable). New files are measured after. No touched file may drop (WX-05).
- **D-16:** The records are:
  - ADR-QD-160, which keeps ADR-QD-094 and ADR-QD-109;
  - BEH-QD-571..575: defaultedness through wrappers; the spread rule and its fresh-object limit; one reading per port; `ROWS` from the registry; no devtools edit beyond what the compiler asks for;
  - INV-QD-339/340;
  - the `spec/overview.md` row for `isPortDefault`;
  - CCR-QD-438, which names any reserved id left unused.

### Settled after research (2026-11-16, user answers to 47-RESEARCH.md's Open Questions)
- **D-17:** `decoratePorts` (`Ports.ts`) is a derived wrapper too: it copies the mark from each inner shape, so devtools' `capturing` keeps a captured default reading as defaulted. A `Capture.test.ts` row pins "a captured default reads defaulted". This extends D-01's site list by one.
- **D-18:** `ROWS` uses **R6**: one monomorphic, fully type-checked row helper applied once per port (five one-line entries), with no overload whose implementation widens to `unknown` (the user's rule against widened implementation types). PFCT-04 and roadmap criterion 4 are reworded to "built by one generic, fully type-checked row builder over the registry's descriptions"; a sixth port is one more compiler-flagged line in `PortCalls.ts`. This replaces D-07's "built from `forEveryPort`/`tabulatePorts`".
- **D-19:** PFCT-05 accepts the compiler's full list for a sixth port: the port-reading row, `ROWS`' entry, and the two simulation fixture tables (`SimulationFields.ts`, `SimulationSource.ts`) that core's `PortFixtureData` requires. `PortCall` is derived from the registry (`{ readonly [K in PortName]: PortCallOf<K> }[PortName]`); the five named aliases stay. The SUMMARY records the exact flagged list (D-12). Deriving the fixture tables is out of scope.
- **D-20:** The mark is a unique `Symbol(...)`, not `Symbol.for`. Nobody outside core can forge it; a duplicate install of `@qadi/core` reads the other copy's defaults as real adapters, a limit BEH-QD-572 states.

### Claude's Discretion
- The exact symbol name, the reader's module (`PortDescription.ts`, `PortDerivation.ts`, or `Ports.ts`), and the port-reading module's file name.
- How the generic `ROWS` builder is typed, provided it uses no `as`, `!` or `any`.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/PortDerivation.ts`:
  - `wrapPort` (`:224`) composes ``d.make(`${inner.name ?? "?"} (${suffix})`, around(d.invoke(inner)))``;
  - `boundedPort` (`:287`) builds its own name `"(bounded N)"`;
  - `nonePort` (`:365`) is `Layer.succeed(d.service, d.make(d.none.name, () => answered))`.
  - The marker would be set in `nonePort` and copied in `wrapPort` and `boundedPort` (the two places that call `d.make` on an inner).
- `PortDescription.ts`: `make: (name, call) => Shape` (`:258`) and `none: { name, answer }` (`:308`).
- `Ports.ts`:
  - `forEveryPort` (`:203`), `tabulatePorts`;
  - `NONE = tabulatePorts(nonePort)` (`:217`);
  - `portsLayer`.
- `PortDoubles.ts:150`: the `recording` wrapper uses `wrapPort`, so it carries the marker for free.
- Devtools already reads the registry: `Wiring.ts:97` (`forEveryPort` over `Effect.serviceOption(d.service)`), `PortCalls.ts:44`, and `Capture.ts:119`.

### Established Patterns
- Port facts are derived from the description (ADR-QD-094); per-port tables are mapped types over `PortName`, so a new port is a compile error.
- Devtools depends only on `@qadi/core`, never on `@qadi/react` (ADR-QD-053/080).
- The `Match.type` dispatchers are hoisted to module scope (AGENTS.md §5a); there is no `switch`.
- In `spec/overview.md`, every core export is named (gate 13).

### Integration Points
- `packages/devtools/src/model/Wiring.ts`:
  - `CONSEQUENCES` (`:127`) and `isDefaultName` (`:143`);
  - `portRow` (`:145`) sets `defaulted` and `consequence`;
  - the `PortReport` type (`:60-70`).
- `packages/devtools/src/model/PortCalls.ts`: `ROWS` (`:253`) and `baseOf`.
- `packages/devtools/src/react/ServicesPanel.tsx`:
  - `describeOne` (`:268`) and `describe` (`:304`);
  - `stateOf` (`:323`);
  - the card's consequence text (`:188`).

</code_context>

<specifics>
## Specific Ideas

- The RED row's wrapper is the shape a real user writes: `Layer.effect(d.service, Effect.gen(function* () { const inner = yield* d.service; return { ...inner, name: "audited …", <method>: (...) => inner.<method>(...) } }))` provided over the default. Spreading is what carries the fact.
- The roadmap's "a throwaway sixth port in the registry (recorded and reverted)" is evidence, not a committed fixture.

</specifics>

<deferred>
## Deferred Ideas

- A public helper that lets wrapper authors choose any name and carry the defaultedness fact without spreading (D-04). It is a new capability and belongs in a later phase if wanted.

</deferred>
