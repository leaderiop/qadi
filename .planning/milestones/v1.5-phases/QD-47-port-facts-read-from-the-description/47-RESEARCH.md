# Phase 47: Port facts read from the description - Research

**Researched:** 2026-11-15 (branch `arch-wave-10`, HEAD `f6cdf79c`; `packages/*/src` is unchanged since Phase 46 closed)
**Domain:** `@qadi/core` port descriptions and derivations (`PortDescription.ts`, `PortDerivation.ts`, `PortDoubles.ts`, `Ports.ts`), `@qadi/devtools` wiring report, port-call rows and Services panel, TypeScript 7.0.2 correlated-union typing, Stryker 10.1.1, spec records
**Confidence:** HIGH on the marker design (a full scratch implementation ran: RED row green, whole repo suite green, `madge`, house-style, tstyche, `tsc` clean), HIGH on the typing findings (every candidate was compiled), HIGH on the sixth-port evidence (a complete scratch sixth port was added twice, at HEAD and after the change, and `tsc` output was read), MEDIUM on spec-record placement (the planner's call).

All scratch edits were reverted: after the last probe `git status --short` is identical to the status captured at the start (the pre-existing `.planning/` and `.agents/`/`.codex/`/`.vitest/` entries only).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The defaultedness fact (core)**
- **D-01:** The fact is an own, enumerable, **symbol-keyed** property on the service shape.
  - `nonePort` sets it, and every derived wrapper (`wrapPort`, `boundedPort`, `retryingPort`, `timingOutPort`, and the `recording` double in `PortDoubles.ts`) copies it from its inner shape.
  - A hand-written wrapper that spreads `...inner` carries it automatically. That is the property that makes the RED row (D-09) pass.
  - Rejected: a string field such as `defaulted?: true` on every Shape (it is visible, forgeable and could collide with a user's field), and a core `WeakSet` keyed by shape identity (a spreading wrapper would lose it).
- **D-02:** The marker holds the **`PortName`** it defaults. The reader checks `marker === d.port`, so a value moved onto another port's service never reads as that port's default.
- **D-03:** The symbol is **package-private**. Core exports one reader, `isPortDefault(description, service): boolean`, named in `spec/overview.md`. Nobody outside core can forge "defaulted"; a wrapper can only carry it forward by spreading.
- **D-04:** A hand-written wrapper that builds a **fresh object** (no spread) is reported as a real adapter, because it no longer carries the default's identity. BEH and ADR-QD-160 state this limit and tell wrapper authors to spread `inner`.
  - A public "wrap with any name" helper is deferred.

**Where each port's facts live (devtools)**
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

**Tests and evidence (test-first on the phase base)**
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

**Records and the user-facing change**
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

### Claude's Discretion
- The exact symbol name, the reader's module (`PortDescription.ts`, `PortDerivation.ts`, or `Ports.ts`), and the port-reading module's file name.
- How the generic `ROWS` builder is typed, provided it uses no `as`, `!` or `any`.

### Deferred Ideas (OUT OF SCOPE)
- A public helper that lets wrapper authors choose any name and carry the defaultedness fact without spreading (D-04). It is a new capability and belongs in a later phase if wanted.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PFCT-01 | Defaultedness through any number of derived wrappers is a structural fact core exposes; `isDefaultName` deleted | Q1 (marker, the nine shape-building sites, probe output), Code Examples 1-3 |
| PFCT-02 | A wrapper whose name breaks `"<inner> (<suffix>)"` around a default reads defaulted; RED on the base | Q6 (RED run on HEAD: 5 of 5 report `defaulted: false`), Code Example 5 |
| PFCT-03 | Consequence sentence and call-row reading stated once per port in one devtools module keyed by `PortName` | Q3 (`describeCall` compiles; candidates B and D do not), Code Example 4 |
| PFCT-04 | `ROWS` built with `forEveryPort`; `ServicesPanel.tsx` knows no port's span fields | Q3 (the generic builder does not type-check without a hidden implementation signature; options below), Open Question 3 |
| PFCT-05 | A new port needs no devtools edit beyond what the compiler asks for | Q4 (the scratch sixth port: exactly which devtools files are flagged, at HEAD and after), Open Question 2 |
| WX-01 | `pnpm check:pr < /dev/null` green | Validation Architecture; the pieces were run (see Q9) |
| WX-02 | Reserved ids only, `next-id.mjs` never run | ADR-QD-160, CCR-QD-438, BEH-QD-571..575, INV-QD-339..340, ARCH-94 (Q7) |
| WX-03 | `spec/overview.md` names `isPortDefault` | Q7; gate 13 was run on the prototype and reports `[missing] isPortDefault` |
| WX-04 | No `as`, `!`, `any`, `switch`, `fnUntraced`, ambient clock/console | Code Examples compile under the house style (`node scripts/check-house-style.mjs`: "518 file(s) clean") |
| WX-05 | Coverage holds; Stryker not below base | Q8 (base scores at HEAD, commands, run times) |
| WX-06 | Tests precede the change | Wave 0 list, and the typecheck pitfall for core pins (Pitfall 1) |
| WX-07 | Breaks recorded as Breaking | None Breaking; one consequential change in the other direction (Pitfall 6) belongs in `upgrading.md` |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- `effect/*` namespace imports, `.ts` relative imports, `import type` for type-only (§1). New files follow it.
- `Context.Service` with a separate `…Shape`; layers are top-level consts; a port's wrappers and default are derived from its description (§2, §3, ADR-QD-094). The marker therefore lives in the derivations, never in a port module.
- No `as`, `!`, `any` (§6). `Match` not `switch` (§5a); `Effect.fn` for effectful functions (§5). Nothing here is effectful.
- `no-port-span-key-literals` (`scripts/check-house-style.mjs:298-322`) forbids a `"qadi.<key>"` literal in `PortAccess.ts`, `PortDerivation.ts` and `devtools/src/model/PortCalls.ts`. No change here adds one.
- Barrels: core's `index.ts` is a pure `export *` list, alphabetical, checked by `barrel-order` (`scripts/check-house-style.mjs:1797-1830`). A named re-export line would make `index.ts` "not a pure barrel" and silently turn that check off for core, so the public reader must live in a module the barrel already `export *`s (Q1).
- `@qadi/devtools` barrels are named, never `export *` (`devtools-named-barrel`); the new `PortReading.ts` stays package-private (it needs no overview row; gate 13 reads exports only).
- `spec/` is normative; ` ```typescript ` fences compile; `spec/devtools-spec/` is under the claims-of-absence gate (`scripts/check-devtools-claims.mjs`), so new prose there must avoid its phrase list ("not built", "not obtainable", ...) unless registered.
- Memory (user feedback): `Record<string, unknown>` is a hack and a widened implementation type to dodge `as` is not allowed ("monomorphize or use a type predicate"); closed unions in full; prefer the complete design; never run `scripts/next-id.mjs`; never release.

## Summary

The marker works, exactly as D-01..D-04 describe, and the whole change is small. A package-private module holds a `unique symbol` and three helpers; `nonePort` marks, `wrapPort`/`boundedPort` (and `decoratePorts`, see below) carry; `isPortDefault(d, service)` reads. A full scratch implementation was built on HEAD and run: the RED row (five ports, a hand-written spreading wrapper renamed `audited <port>`) goes from `defaulted: false` to `true`; every existing test in the repository (218 files, 5328 tests) stays green; `pnpm circular`, house-style, tstyche and `tsc -p tsconfig.test.json` are clean. [VERIFIED: runs this session, outputs below]

Four findings change how the planner should write the work. The first three need a user decision (Open Questions):

1. **D-01's site list is one short.** `Ports.ts`'s `decoratePorts` rebuilds every port through a decorator that calls `d.make(...)`. `@qadi/devtools`' `capturing` (`Capture.ts:101-111`) uses it and names itself `"<inner> (capturing)"`. Today a captured default reads defaulted only by the name convention. After this phase it would flip to "real adapter" unless core's `decoratePorts` carries the mark, because devtools cannot touch the package-private symbol. The fix is one line in core; it is a site D-01 does not list.
2. **D-12's expectation ("only the port-reading module's mapped row") is not what the code gives.** A complete scratch sixth port flags, in devtools, `PortReading.ts` (intended), `SimulationFields.ts:568` and `SimulationSource.ts:145` (fixture-data tables that core's `PortFixtureData` forces on every port, nothing to do with this phase), and `PortCalls.ts:229` unless `PortCall` is derived from the registry (a hand-written five-member union today). Deriving `PortCall` is a one-line change and is recommended. The two `Simulation*` files remain, honestly "what the compiler asks for".
3. **The generic `ROWS` builder (D-07) cannot be typed without a widened implementation signature.** `PortCallOf<K>` for a generic `K` contains the deferred conditional `PortSpanRowOf<DescriptionOf<K>>`, so no generic expression is assignable to it. Compiled outcomes: a plain generic builder fails (four errors, below); the repo's own sanctioned technique (`tabulatePorts`' overload-with-wide-implementation, `Ports.ts:183-195`) compiles; a monomorphic helper applied at five call sites also compiles but names the five ports again. The user's memory note rejects "a widened implementation type to dodge `as`", so this is flagged as a decision, not made silently.
4. **Characterisation is thinner than D-11 assumes.** `ServicesPanel.test.tsx` feeds hand-built `WiringReport`s (so `CONSEQUENCES` is not pinned except two `assert.include` fragments in `Wiring.test.ts`) and checks call rows with `assert.include`. A byte-exact table is new work; a compiled, green-on-base specimen is in Q5. With it, Stryker scores the new `PortReading.ts` 64/64.

**Primary recommendation:** Wave 0 = Stryker base JSON, then the RED row and the byte-exact characterisation (both compile on the base, so they are real commits). Then one core plan (`PortDefault.ts` + three call-site edits + `isPortDefault` + the core pins and tstyche pin written test-first in the same plan, because a test naming a not-yet-existing export breaks `pnpm typecheck`). Then one devtools plan (`PortReading.ts`, `Wiring.ts`, `ServicesPanel.tsx`, `PortCalls.ts` with `PortCall` derived). Then records, then the sixth-port evidence and the Stryker comparison.

## Architectural Responsibility Map

Single-package-pair library work; the "tiers" are modules.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Whether a service is a port's fail-closed default (the mark, set and carried) | `@qadi/core` `PortDefault.ts` (package-private), called from `PortDerivation.ts` and `Ports.ts` | none | D-01..D-03; the derivations are where every wrapper is built (ADR-QD-094) |
| Reading that fact | `@qadi/core` `isPortDefault` (in `PortDescription.ts`, public) | `@qadi/devtools` `Wiring.ts` calls it | One public reader; nobody else sees the symbol |
| What being defaulted costs (consequence sentence) | `@qadi/devtools` `model/PortReading.ts` | `Wiring.ts` reads `PORT_READING[port].consequence` | Display prose, D-05: core carries none |
| How a call row reads | `@qadi/devtools` `model/PortReading.ts` | `ServicesPanel.tsx` dispatches | D-05/D-06: the view keeps no port's span fields |
| Decoding a span into a row | `@qadi/devtools` `model/PortCalls.ts` (`ROWS`) | core's `decodePortSpan` | ADR-QD-109: a span is projected once |
| Composed display names `"<inner> (<suffix>)"` | `@qadi/core` `PortDerivation.ts` | `Wiring.ts` shows `name` | BEH-QD-196, display only (D-13) |

## Standard Stack

No package is added or changed. [VERIFIED: runs this session]

| Library | Version | Purpose |
|---------|---------|---------|
| `effect` | 4.1.2 [VERIFIED: `node_modules/effect/package.json` read by `node -e`] | `Layer`, `Context`, `Option`, `Effect.serviceOption` |
| `typescript` | 7.0.2 [VERIFIED: same] | `tsc -p tsconfig.test.json` was the typecheck for every probe (3 s warm) |
| `vitest` | 5.1.0 [VERIFIED: run banner] | `pnpm exec vitest run --project core\|devtools <file>` from the repo root |
| `@stryker-mutator/core` | 10.1.1 [VERIFIED: same] | per-file base and comparison |
| `tstyche` | 7.2.5 [VERIFIED: same] | the reader's signature pin |
| `react` | 19.3.1 [VERIFIED: same] | the panel; `@testing-library/react` + `happy-dom` are devtools devDependencies |

**Package Legitimacy Audit:** no external package is installed, added or upgraded, so the `package-legitimacy` seam was not needed. **Packages removed [SLOP]:** none. **Flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                       core: where a service shape is built from a port description
  nonePort(d)  ------------------------------------------- markDefault(d.port, d.make(none.name, ...))   <- SETS
  wrapPort(d, layer, suffix, around)  --- retrying / timing out / recording --- carryDefault(d.port, inner, d.make(...))  <- COPIES
  boundedPort(d)(permits)(layer)      ---------------------- carryDefault(d.port, inner, d.make(...))     <- COPIES
  decoratePorts(ports, f)             ---- capturing (devtools), any decorator - carryDefault(d.port, inner, f(d, inner)) <- COPIES (not in D-01)
  scriptedPort / askRemotely / a fixture / a replay ("snapshot")  ---- d.make(...) or a literal           <- NEVER marked
  a host's wrapper:  { ...inner, name: "audited x", resolve: ... }  ---- spread copies the own symbol key <- carried by the host
  a host's wrapper:  { name: "x", resolve: ... } (fresh object)     ---- no mark                            <- real adapter (D-04)
                                   |
                                   v   Layer.succeed(d.service, shape)  ->  Effect.serviceOption(d.service)
  devtools Wiring.ts  portRow:  defaulted = isPortDefault(d, Option.getOrUndefined(shape))   (marker === d.port)
                                   |
                                   v
  PortReport { port, name, required, present, defaulted, consequence = PORT_READING[port].consequence }
                                   |
                                   v
  ServicesPanel PortCard:  data-defaulted, "defaulted — {name}", amber consequence

  span ---> collectPortCalls tracer ---> ROWS[port](span) : PortCallOf<K> ---> PortCall (derived union)
                                   |
                                   v
  ServicesPanel RecentCalls:  describe(call) = describeCall(call) [+ " · n attempts"]   describeCall -> PORT_READING[call._tag].describe(call)
```

### Recommended Project Structure
```
packages/core/src/
├── PortDefault.ts        # NEW, package-private (not in the barrel): the symbol, markDefault, carryDefault, isMarkedDefault
├── PortDescription.ts    # + export const isPortDefault (public, through the existing `export *`)
├── PortDerivation.ts     # nonePort marks; wrapPort and boundedPort carry
└── Ports.ts              # decoratePorts carries
packages/devtools/src/
├── model/PortReading.ts  # NEW, package-private: PORT_READING (consequence + describe per port) and describeCall
├── model/Wiring.ts       # CONSEQUENCES and isDefaultName deleted; portRow reads isPortDefault and PORT_READING
├── model/PortCalls.ts    # ROWS from the registry; PortCall derived from PortCallOf
└── react/ServicesPanel.tsx  # describeOne deleted; describe = describeCall + the attempts suffix
```

### Pattern 1: the marker (compile- and run-verified)

See Code Examples 1-3. The shape of the mark: `{ ...shape, [DEFAULT_OF]: port }`. TypeScript types a computed `unique symbol` key in an object literal exactly (`Shape & DefaultMark<N>`), the result is assignable to `Shape` (so `Layer.succeed(d.service, …)` accepts it, with no `as`), and `Object.keys`, `JSON.stringify` and `structuredClone` never see it (probe output in Q1).

### Pattern 2: one table keyed by `PortName`, dispatched through a generic

`PORT_READING: { readonly [K in PortName]: PortReader<K> }`; `describeCall = <K extends PortName>(call: PortCallOf<K>): string => PORT_READING[call._tag].describe(call)`. TypeScript resolves `{ [K in PortName]: X<K> }[K]` to `X<K>` for a generic `K` (the same fact `LeafOf` in `PortDescription.ts:119` relies on, TS #47109), which is what lets the body type-check without a cast.

### Anti-Patterns to Avoid
- **A string `defaulted` field or a `WeakSet`:** rejected by D-01; a spread loses a `WeakSet` entry.
- **A named re-export line in core's `index.ts`:** disables `barrel-order` for core (see constraints above).
- **Carrying the mark in `scriptedPort`, `askRemotely` or a fixture:** a scripted double with an unscripted fallthrough, a remote asker and a fixture are not "the default"; marking them would make `defaulted` mean "answers fail-closed", which is not the fact (BEH text must say what the fact is).
- **Testing `isPortDefault` with a shape typed to the description:** a "default installed under another port" row needs to pass port A's shape to port B's reader, which only an `unknown` parameter allows without a cast (Q1).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is this the default" | a name parse, a string field, a `WeakSet` | the symbol-keyed own property, read by `isPortDefault` | D-01; a spread carries it, a name never decides |
| One row builder per port in `ROWS` | five arms, or a cast | the overload-hidden `tabulatePorts` builder (or the monomorphic helper, Open Question 3) | Q3 |
| The five-member `PortCall` union | a hand-written union | `{ readonly [K in PortName]: PortCallOf<K> }[PortName]` | Q4: the hand-written union is flagged by a sixth port |
| Capturing log/state in tests | new collectors | `@testing-library/react` `render` + `within`, `liveNotice` from `packages/devtools/test/helpers.ts`, `WiringRead.Read({ report })` | already the devtools panel-test idiom (`ServicesPanel.test.tsx:9-57`) |
| A broken port in a core test | a hand-written failing layer | `scriptedPort` (`PORT_DOUBLE_BUDGET`) | this phase builds no failing port; the wrapper tests use derived wrappers |

**Key insight:** the repo already states each of these facts once somewhere (the description for the registry, `forEveryPort`/`tabulatePorts` for enumeration). The work is to make three devtools tables and one display-name parse stop restating them.

## Findings by Question

### Q1. The marker in core (D-01..D-04)

**Every site that builds a service shape, and what it must do** [VERIFIED: `grep -rnE "\.make\(|decoratePorts|\.none\.name|\.invoke\(|nonePort|recordingPort|wrapPort" packages/*/src`, each site read]

| Site | What it builds | Marker |
|------|----------------|--------|
| `PortDerivation.ts:377` `nonePort`: `return Layer.succeed(d.service, d.make(d.none.name, () => answered));` | the default | **SET** `markDefault(d.port, …)` |
| `PortDerivation.ts:238-240` `wrapPort` (`wrapService(d.service, layer, (inner) => d.make(\`${inner.name ?? "?"} (${suffix})\`, around(d.invoke(inner))))`), used by `retryingPort` (:267), `timingOutPort` (:339), and `recordingPort` (`PortDoubles.ts:150`) | a wrapper over `inner` | **COPY** `carryDefault(d.port, inner, d.make(…))` |
| `PortDerivation.ts:302-307` `boundedPort` (`d.make(\`${inner.name ?? "?"} (bounded ${permits})\`, …)`) | a wrapper over `inner` | **COPY** (same helper; `wrapPort` and `boundedPort` could share one `composeShape`, optional) |
| `Ports.ts:329-333` `decoratePorts`: `tabulatePorts((d) => Layer.succeed(d.service, f(d, Context.get(context, d.service))))`; its only caller is `devtools/src/model/Capture.ts:101-111` (`capturing`, `d.make(\`${inner.name ?? "?"} (capturing)\`, …)`) | a decorated shape | **COPY** in core, around `f(d, inner)`. Not in D-01's list; see Open Question 1 |
| `PortDoubles.ts:82` `scriptedPort` (`d.make(name, …)`) | a script-driven double; an unscripted request answers `none.answer` | **NEVER** (not "the default": it is scripted) |
| `PortRemote.ts:140` `askRemotely` (`d.make(\`${d.port} (remote)\`, …)`) | a real remote adapter | **NEVER** |
| `PortRemote.ts:258` `remotePorts`: unlisted ports get `nonePort(d)` | the default | marked, through `nonePort` |
| `Capture.ts:196-220` `replayLayer` (`scriptedPort(d, …, "snapshot")`) | a replay double | **NEVER** (reads "snapshot", real adapter, as today) |
| Each port's `make` (`AttributeResolver.ts:206`: `make: (name, call) => ({ name, resolve: call })`), fixtures (`attributeResolverFromRecord` at `AttributeResolver.ts:222-228`), `Ports.ts` `PORT_FIXTURES` | plain literals | unchanged; a port's `make` stays a pure lens, which is what keeps the marker out of five port modules |

**Where it lives (no cycle).** A new package-private `packages/core/src/PortDefault.ts` that imports only `PortName` as a type (the same leaf discipline as `PortServing.ts:24-30`). `PortDerivation.ts` and `Ports.ts` import `markDefault`/`carryDefault` from it; `PortDescription.ts` imports `isMarkedDefault` and exports the public reader. `PortDefault.ts` is deliberately **not** in the barrel, so the symbol and the two setters stay package-private; `PortDescription.ts` is already `export *`ed, so `isPortDefault` is public with `index.ts` unchanged. `pnpm circular` after the move: `✔ No circular dependency found!` (227 files). [VERIFIED: run]

**Symbol choice (D-03).** `const DEFAULT_OF: unique symbol = Symbol("qadi.PortDefault")`. The repo's two precedents are unique `Symbol(...)` constants (`packages/core/src/FieldPath.ts:164`: `const OMIT: unique symbol = Symbol("FieldPath.project.omit");`, `packages/devtools/src/model/SupersedingRun.ts:41`: `const tokenBrand: unique symbol = Symbol("qadi.devtools.RunToken");`). [VERIFIED: grep] A unique symbol makes "nobody outside core can forge it" literally true. The cost, measured: two module instances of `PortDefault.ts` (a duplicate install of `@qadi/core`) do not read each other's marks.

```
distinct module instances: true
same copy reads it: true
other copy reads it (Symbol()): false
own keys: name,Symbol(qadi.PortDefault)
```
[VERIFIED: throwaway vitest importing `../src/PortDefault.ts?copyA` and `?copyB`]

`Symbol.for("qadi.PortDefault")` would be shared across copies but anyone could mint it. D-03 says "nobody can forge", so the recommendation is the unique `Symbol`, with the duplicate-install limit stated in the BEH. Flagged as Open Question 4 because the failure direction is the misleading one.

**What spread, JSON and clone do to a symbol key.** [VERIFIED: probe run on the scratch implementation]
```
own keys (Reflect.ownKeys): name,resolve,Symbol(qadi.PortDefault)
JSON.stringify(default shape): {"name":"AttributeResolverNone"} ; Object.keys: name,resolve
structuredClone of a marked, function-free copy: own keys name,resolve     (the symbol key is dropped)
spread {...def, name: "spread"}: reader true
fresh object {name, resolve}: reader false
Object.create(def)  (prototype-delegating wrapper): reader false    (the mark is own-only, per D-01)
reader on undefined / null / "x" / () => 1: all false
an Effect-returning method after spread: callable, resolves undefined (the default's answer)
```
So a symbol key never reaches a wire, a JSON path or a clone, and a spread (the RED row's wrapper) keeps it. A wrapper made with `Object.create(inner)` would read as a real adapter; D-01 says "own", so that is the documented limit alongside the fresh-object one.

**The reader.** `Object.getOwnPropertyDescriptor(service, DEFAULT_OF)?.value === port` after a `typeof … === "object" && !== null` guard. It is total over `unknown`, reads only an own property, and compiles under the house style (`check-house-style.mjs`: "518 file(s) clean"; `oxlint` warnings are pre-existing). `Predicate.hasProperty(service, KEY)` is `in`-based and would also report an inherited mark; the descriptor read does not, which is why it was chosen. [VERIFIED: probe `proto-inherited false`]

**Signature.** `isPortDefault = (d: { readonly port: PortName }, service: unknown): boolean`. Any full `PortDescription` is assignable to `{ port: PortName }` (not a fresh literal, so no excess-property check). `unknown` for `service` is deliberate: the D-10 row "a default installed under another port" passes one port's shape to another port's reader, and a Shape-typed parameter would force a cast. tstyche pin that passed on the scratch implementation (`pnpm test:tstyche`: 55 files, 598 assertions):

```ts
test("isPortDefault takes any port's description and any service value, and answers a boolean", () => {
  expect(isPortDefault).type.toBeCallableWith(attributeResolverPort, { name: "x" });
  expect(isPortDefault).type.toBeCallableWith(attributeResolverPort, undefined);
  expect(isPortDefault(attributeResolverPort, {})).type.toBe<boolean>();
  forEveryPort((d) => expect(isPortDefault).type.toBeCallableWith(d, d.none));
});
test("a name that is not a port is refused", () => {
  expect(isPortDefault).type.not.toBeCallableWith({ port: "Nope" }, {});
});
```

**Stacks verified** (scratch run, `AttributeResolver`, `d.none.name` = `"AttributeResolverNone"`, `AttributeResolver.ts:208`):
```
AttributeResolver none=true  DecisionHistory none=true  RelationshipResolver none=true  CustomPredicate none=true  SignatureHistory none=true
stackA AttributeResolverNone (recording) (timing out) (bounded 2) (retrying) true
stackB AttributeResolverNone (retrying) (bounded 2) (timing out) (recording) true
real attributeResolverFromRecord false
wrappedReal attributeResolverFromRecord (retrying) false
scripted scripted AttributeResolver false
fresh false        spread true        underOther false
decorated dec true   (decoratePorts carrying the mark)
```
[VERIFIED: throwaway core test, file output]

### Q2. Devtools today, and which tests move

Read in full: `model/Wiring.ts` (`PortReport` :46-71, `wiringReport` :93-124, `CONSEQUENCES` :127-134, `isDefaultName` :143-144, `portRow` :146-162), `model/PortCalls.ts` (`PortCallOf` :84-86, `PortCall` :130-135, `ROWS` :253-279, `baseOf` :238-242), `react/ServicesPanel.tsx` (`PortCard` :142-192, `describeOne` :268-301, `describe` :308-311, `stateOf` :323-329), `model/Capture.ts:93-125`.

Verbatim values the new module must reproduce (UI-SPEC copy contract confirmed against the code):
```ts
// Wiring.ts:127-134
const CONSEQUENCES: { readonly [K in PortName]: string } = {
  AttributeResolver: "a missing attribute resolves to undefined, so an attribute policy denies",
  DecisionHistory: "the three-valued default denies hasActed and hasNotActed alike",
  RelationshipResolver: "an unanswered relationship denies",
  CustomPredicate: "every hasCustom node denies, since no registered predicate can be reached",
  SignatureHistory:
    "an unwired signature history answers no signatures on file, so every hasSignature node denies",
};
```
`describeOne` is `ServicesPanel.tsx:268-301` (five arms; the whole block is copied into Code Example 4). `describe` adds `${describeOne(call)} · ${String(call.attempts)} attempts` when `call.attempts !== undefined && call.attempts > 1` (:308-311). The `interpreter`/`attempts`/`durationMillis` reads in the view are base fields core's `sharedQuestionFields`/`attemptsStruct` state for every port, so they may stay in the view.

**Existing tests that touch these facts, and what changes**

| Test | Pins | After this phase |
|------|------|------------------|
| `packages/devtools/test/model/Wiring.test.ts:81-89` | `consequence.length > 0` for all rows; `DecisionHistory` includes `"denies hasActed and hasNotActed alike"` | unchanged, green. Only partial fragments: this is why byte-exact characterisation is new work |
| `Wiring.test.ts:259-275` | `SignatureHistory` wired name; consequence includes `"every hasSignature node denies"` | unchanged |
| `Wiring.test.ts:108-120` "a port at its fail-closed default says so" (under `EvaluationServicesNone`) | `defaulted === true` for all five | unchanged: `nonePort` marks them |
| `Wiring.test.ts:122-131` "a wrapped default is still defaulted" (`attributeResolverRetrying(Schedule.recurs(1))(AttributeResolverNone)`, name `"AttributeResolverNone (retrying)"`) | name composition (display) and `defaulted` | unchanged and green; the name assertion stays (D-13), the `defaulted` assertion is now structural |
| `Wiring.test.ts:133-149` real adapters, named or unnamed | `defaulted === false` | unchanged |
| `Wiring.test.ts:151-158` absent port | `defaulted === undefined` | unchanged |
| `packages/devtools/test/model/Capture.test.ts:311-335, 355-375` | names `"… (capturing)"`, `"? (capturing)"` | unchanged (names are display). **Add** a row: a captured default reads defaulted (Open Question 1) |
| `packages/devtools/test/react/ServicesPanel.test.tsx:20-48, 93-139` | hand-built `WiringReport`s with `defaulted: true/false/undefined`; asserts `data-defaulted`, `defaulted` in the state text, `if defaulted: a missing attribute`, tone | unchanged: the panel reads the report; it never calls core |
| `ServicesPanel.test.tsx:149-200, 344-600` | call rows via `assert.include` (`"approve anywhere → no match"`, `"(depth 2)"`, `"isBusinessHours → true"`, `"not recorded → no answer"`, `"approval from a 'manager' → no match"`, `"c → no answer"`) | unchanged and green; **weak** (substring), so not a characterisation |
| `DiagnosticsScreens.test.tsx:95-96`, `DevtoolsDock.test.tsx:805-806, 1008-1009` | fixture reports only | unchanged |
| `Wiring.tst.ts:17-18` | `PortReport["defaulted"]` is `boolean \| undefined` | unchanged |
| `packages/devtools/test/model/PortCalls.test.ts` | rows per port, absent fields | unchanged; run on the scratch `ROWS` (60 tests with `ServicesPanel.test.tsx`, green) |

**No existing test pins the sentence "a host that names its own adapter after a default is reported as defaulted"** [VERIFIED: grep of `packages/devtools/test` for `names its own|named after` found none]. That claim lives only in prose that this phase rewrites: `Wiring.ts:58-67` (JSDoc), `spec/behaviors/28-devtools-screens.md:229-238` (BEH-QD-215), `spec/overview.md:899`.

There is **no Playwright or other e2e** that reads the Services panel: the only Playwright dependency is `examples/nextjs-newsroom/package.json`, and `grep` for `qadi-port`/`qadi-services` finds the testids only in `packages/devtools/{src,test}`. [VERIFIED]

### Q3. The port-reading module (D-05..D-07): typing, probed

All probes compiled with `pnpm exec tsc -p tsconfig.test.json` (TypeScript 7.0.2) against the real `PortCallOf`. `PORT_READING` and its mapped type compile as written.

**Dispatch** (`call: PortCall` is the union):

| Candidate | Result |
|-----------|--------|
| **A** `export const describeCall = <K extends PortName>(call: PortCallOf<K>): string => PORT_READING[call._tag].describe(call);` called as `describeCall(call)` with `call: PortCall` | **compiles**, no `as`/`!`/`any`. A wrong tag (`{ ...hist, _tag: "Nope" }`) is `TS2322: Type '"Nope"' is not assignable to type 'keyof PortSpans'`; a wrong field (`{ ...hist, _tag: "AttributeResolver", resolved: 1 }`) is `TS2322: Type 'number' is not assignable to type 'boolean \| undefined'`. Sound enough |
| **E** `type Calls = { readonly [K in PortName]: PortCallOf<K> }; export const describeCall = <K extends PortName>(call: Calls[K]): string => …` | compiles too; the parameter at the union is exactly `PortCall`. Equivalent; **A is simpler**, recommended |
| **B** an overload `function describeCall(call: PortCall): string; function describeCall<K extends PortName>(call: PortCallOf<K>): string {…}` | `TS2394: This overload signature is not compatible with its implementation signature.` Does not compile |
| **D** the naive `(call: PortCall) => PORT_READING[call._tag].describe(call)` | `TS2345: Argument of type 'PortCall' is not assignable to parameter of type 'never'.` Does not compile (the correlated-union problem) |

[VERIFIED: tsc output, `packages/devtools/src/model/PortReading.ts(59,87)` and `(69,17)` in the scratch run]

**Carrying the reader on the row** (so a call knows how to read itself) was not probed on purpose: rows are plain data that `PortCalls.test.ts` and `ServicesPanel.test.tsx` build as object literals and compare, so a function-valued field would change every fixture.

**`ROWS` from the registry** (D-07). `ROWS` is a map from a kept span's port to a function from a span to `PortCallOf<K>`:

| Candidate | Result |
|-----------|--------|
| **R1** `const ROWS = tabulatePorts<RowReaders>(rowOf)` with `rowOf = <K extends PortName>(d: DescriptionOf<K>) => (span): PortCallOf<K> => ({ ...baseOf(span), _tag: d.port, ...decodePortSpan(d, span.attributes) })` | **does not compile**: `PortCalls.ts(257,42) TS2322: Type '{ attempts?: …; attribute?: string \| undefined; resolved?: boolean \| undefined; span: string; at: number; durationMillis: number \| undefined; _tag: K; }' is not assignable to type 'PortCallOf<K>'`; `(260,23) TS2345: Argument of type 'DescriptionOf<K>' is not assignable to parameter of type '{ readonly attributes: PortSpanAttributes<…AttributeResolver's fields…, AnswerOf<PortTypes[K]>, never>; }'` (inference takes the first union member); `(263,7) TS2322: Type 'PortLayers' is not assignable to type 'RowReaders'`; `(263,52) TS2345: Argument of type '<K extends PortName>(d: DescriptionOf<K>) => (span: Tracer.Span) => PortCallOf<K>' is not assignable to parameter of type '<K extends PortName>(d: DescriptionOf<K>) => RowReaders[K]'`. Cause: `PortCallOf<K>` contains `PortSpanRowOf<DescriptionOf<K>>`, a distributive conditional over a generic, deferred for a generic `K`; no generic expression is assignable to it (the TS #30769 problem `tabulatePorts`'s doc, `Ports.ts:175-181`, describes) |
| **R7** the repo's own technique: a public overload with a wider implementation signature, **no cast** | **compiles** (below). `function buildRows(): RowReaders; function buildRows(): { readonly [K in PortName]: (span: Tracer.Span) => unknown } { return tabulatePorts<…unknown…>((d) => (span) => ({ ...baseOf(span), _tag: d.port, ...decodePortSpan<SpanFields, SpanFields, never>(d, span.attributes) })); }` and `const ROWS: RowReaders = buildRows();`. `PortCalls.test.ts` and `ServicesPanel.test.tsx` (60 tests) pass on it. The body cannot place one port's value in another's slot (it indexes through `d` itself), but the compiler does not check the `PortCallOf<K>` claim; the overload asserts it. Same technique and same trust as `tabulatePorts` (`Ports.ts:183-195`) and `createPermissionGroup` |
| **R6** monomorphic: `rowOf = <N extends PortName, Q extends SpanFields, Ans extends SpanFields, O>(d: { readonly port: N; readonly attributes: PortSpanAttributes<Q, Ans, O> }) => (span) => ({ ...baseOf(span), _tag: d.port, ...decodePortSpan(d, span.attributes) })` and `const ROWS: RowReaders = { AttributeResolver: rowOf(PORTS.AttributeResolver), DecisionHistory: rowOf(PORTS.DecisionHistory), RelationshipResolver: rowOf(PORTS.RelationshipResolver), CustomPredicate: rowOf(PORTS.CustomPredicate), SignatureHistory: rowOf(PORTS.SignatureHistory) }` | **compiles**, fully checked, no widened type. It is the user's "monomorphize". But it names the five ports again (one line each) and does not use `forEveryPort`, so PFCT-04's "built with `forEveryPort`" is not met and a sixth port is one more compile-flagged line in `PortCalls.ts` |

The choice between R7 and R6 is Open Question 3. R7 meets D-07 and PFCT-04 as written; R6 is the type-checked alternative. Either keeps `ROWS[K]` returning `PortCallOf<K>` and `snapshot`'s `ROWS[one.port](one.span)` unchanged.

`PortCall` itself is a hand-written five-member union at `PortCalls.ts:130-135`. A sixth port is flagged there (Q4). Deriving it, `export type PortCall = { readonly [K in PortName]: PortCallOf<K> }[PortName];`, compiled, left `index.ts`'s exports (`PortCall`, `PortCallOf`, `PortCallPort`, `AttributeCall`, …, `index.ts:69-79`) intact, and the five named aliases stay (they are public).

### Q4. The throwaway sixth port (D-12), run twice

A **complete** scratch sixth port was added (not just a `PortName` row, which alone produced ~100 downstream errors, mostly cascades): `Probe6` = a copy of `AttributeResolver.ts` re-named (service id, description, span `"qadi.probe6"`), plus `PortName.ts`, `PortMetrics.ts`, `PortServing.ts` (one slot), and `Ports.ts` (`PortTypes`, `PORTS`, `tabulatePorts`, `mergePorts`, `PortFixtureData`, `PORT_FIXTURES`). Core then compiled. That is what "a description, a `PortName` member and its registry lines" costs; **core refuses a port with no fixture data** because `PortFixtureData` and `PORT_FIXTURES` are mapped over `PortName` (`Ports.ts:240-267`).

Flagged files in `packages/*/src` of `@qadi/devtools` (`pnpm exec tsc -p tsconfig.test.json`; `TS2883` errors in `@qadi/http` are an artefact of the scratch port not being exported from the barrel and are ignored):

**At HEAD** (before this phase):
```
packages/devtools/src/model/PortCalls.ts(229,5)   TS2375  (the hand-written PortCall union no longer covers the snapshot)
packages/devtools/src/model/PortCalls.ts(253,7)   TS2741  Property 'Probe6' is missing in type '{ AttributeResolver: (span: Span) => …' (ROWS)
packages/devtools/src/model/SimulationFields.ts(568,14)   TS2741  Property 'Probe6' is missing …
packages/devtools/src/model/SimulationSource.ts(145,91)   TS2741  Property 'Probe6' is missing …
packages/devtools/src/model/Wiring.ts(127,7)      TS2741  Property 'Probe6' is missing in type '{ AttributeResolver: string; … }' (CONSEQUENCES)
```
plus tests: `core/test/{PortAccess,PortConformance,PortRemote,Ports,PortServe,PortsLayer,PortSpan}.test.ts`, `devtools/test/model/Capture.test.ts`, `http/test/PortRoutes.test.ts`, `react/test/DecisionOutcome.test.ts`. (`ServicesPanel.tsx` is **not** flagged at HEAD: `describeOne` matches the hand-written `PortCall`, which does not move.)

**After this phase's change, `PortCall` left hand-written:** `PortReading.ts(9,14)` (the intended row), `PortCalls.ts(229,5)`, `SimulationFields.ts(568,14)`, `SimulationSource.ts(145,91)`.

**After the change with `PortCall` derived from the registry:**
```
packages/devtools/src/model/PortReading.ts(9,14)          TS2741  Property 'Probe6' is missing in type '{ AttributeResolver: { consequence: string; describe: … } …
packages/devtools/src/model/SimulationFields.ts(568,14)   TS2741  Property 'Probe6' is missing in type '{ AttributeResolver: (input: SimulationInput) => …
packages/devtools/src/model/SimulationSource.ts(145,91)   TS2741  Property 'Probe6' is missing in type '{ AttributeResolver: { readonly answers: Readonly<Record<string, unknown>> | undefined; …
```
plus the one devtools test, `Capture.test.ts` (port-keyed table at :890).

So the honest reading of PFCT-05 / D-12 is: the phase removes `Wiring.ts` and `PortCalls.ts` from the list (and `ROWS`), leaving `PortReading.ts`'s row (the thing D-05 wants) and two fixture-data tables that exist independently of this phase (`SimulationFields.ts`'s per-port extractor table at :568 and `SimulationSource.ts`'s per-port `answers` table at :145). Those two are "what the compiler asks for". The expectation in D-12 ("only the port-reading module's mapped row") would need a separate refactor of the simulation fixtures. Open Question 2.

The scratch edit is reverted (`git checkout -- packages`, scratch files removed); `git status --short` equals the starting status.

### Q5. Characterisation (D-11)

Panel tests render with `@testing-library/react` (`render`, `screen`, `within`) under `happy-dom` (`packages/devtools/vitest.config.ts`: `environment: "happy-dom"`, `include: ["test/**/*.test.ts", "test/**/*.test.tsx"]`, `setupFiles: test/setupTests.ts`). The idiom to follow is `ServicesPanel.test.tsx:9-57`: `WiringRead.Read({ report })`, `liveNotice` from `packages/devtools/test/helpers.ts`, calls as plain objects in a `PortCallLog`. A `wiringReport` for each port's default is `Effect.provide(EvaluationServicesNone)` (all five defaulted, `Wiring.test.ts:108-120`); a real adapter is `attributeResolverFromRecord({})` or a literal `Layer.succeed(AttributeResolver, {...})`.

**Recommended files** (both compile on the base and pass there; both stay green after):
- `packages/devtools/test/react/ServicesPanel.reading.test.tsx`: byte-exact call-row table, the card's exact defaulted text, and the five consequence lines read from the real `wiringReport`.
- (optionally split) `packages/devtools/test/model/WiringDefaulted.test.ts` for the RED row, so the characterisation file stays free of RED rows.

The compiled specimen, run on a clean HEAD: **18 tests passed**; it also passed unchanged on the scratch after-state, and `tsc` was clean. (Two inert scaffolding lines present in the compiled file are omitted here.)

```tsx
import { assert, describe, it } from "@effect/vitest";
import { render, screen, within } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import { AttributeResolverNone, attributeResolverRetrying } from "@qadi/core";
import { WiringRead } from "../../src/model/DiagnosticsStore.ts";
import type { PortCall, PortCallLog } from "../../src/model/PortCalls.ts";
import { wiringReport } from "../../src/model/Wiring.ts";
import { ServicesPanel } from "../../src/react/ServicesPanel.tsx";
import { liveNotice } from "../helpers.ts";

const base = { span: "s", at: 1, durationMillis: 1 as number | undefined, subjectId: "alice" };
const logOf = (calls: ReadonlyArray<PortCall>): PortCallLog => ({ calls, dropped: 0, capacity: 200 });

/** Every call-row reading, exactly: [call, expected sentence]. */
const READINGS: ReadonlyArray<readonly [PortCall, string]> = [
  [{ ...base, _tag: "AttributeResolver", attribute: "clearance", resolved: true }, "clearance → a value"],
  [{ ...base, _tag: "AttributeResolver", attribute: "clearance", resolved: false }, "clearance → nothing"],
  [{ ...base, _tag: "AttributeResolver" }, "not recorded → no answer"],
  [{ ...base, _tag: "DecisionHistory", event: "approved", resourceId: "doc-1", answer: "Acted" }, "approved on doc-1 → Acted"],
  [{ ...base, _tag: "DecisionHistory" }, "not recorded anywhere → no answer"],
  [{ ...base, _tag: "RelationshipResolver", relation: "member", resourceId: "team-1", depth: 2, answer: "Related" }, "member on team-1 (depth 2) → Related"],
  [{ ...base, _tag: "RelationshipResolver" }, "not recorded on no resource → no answer"],
  [{ ...base, _tag: "CustomPredicate", name: "isBusinessHours", answer: true }, "isBusinessHours → true"],
  [{ ...base, _tag: "CustomPredicate", name: "p", answer: false }, "p → false"],
  [{ ...base, _tag: "CustomPredicate" }, "not recorded → no answer"],
  [{ ...base, _tag: "SignatureHistory", meaning: "approval", signerRole: "manager", resourceId: "doc-1", matched: true }, "approval from a 'manager' on doc-1 → matched"],
  [{ ...base, _tag: "SignatureHistory", meaning: "approval", scope: "Any", matched: false }, "approval anywhere → no match"],
  [{ ...base, _tag: "SignatureHistory", meaning: "approval", scope: "Resource" }, "approval → no answer"],
  [{ ...base, _tag: "SignatureHistory" }, "not recorded → no answer"],
  [{ ...base, _tag: "AttributeResolver", attribute: "a", resolved: true, attempts: 2 }, "a → a value · 2 attempts"],
  [{ ...base, _tag: "AttributeResolver", attribute: "a", resolved: true, attempts: 1 }, "a → a value"],
];

describe("call rows read exactly as on the base", () => {
  for (const [call, expected] of READINGS) {
    it(`${call._tag}: ${expected}`, () => {
      render(
        <ServicesPanel
          diagnostics={liveNotice}
          wiring={WiringRead.Read({ report: { ports: [{ port: call._tag, name: "x", required: true, present: true, defaulted: false, consequence: "c" }], cache: { present: false, size: undefined } } })}
          activity={[]}
          portCalls={logOf([call])}
        />,
      );
      const row = within(screen.getByTestId("qadi-port")).getByTestId("qadi-port-call");
      assert.strictEqual(row.firstElementChild?.textContent, expected);
    });
  }
});

describe("the consequence line and the card state, from the real wiring report", () => {
  it.effect("five consequences, byte for byte", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      assert.deepStrictEqual(
        report.ports.slice(0, 5).map((p) => [p.port, p.consequence]),
        [
          ["AttributeResolver", "a missing attribute resolves to undefined, so an attribute policy denies"],
          ["DecisionHistory", "the three-valued default denies hasActed and hasNotActed alike"],
          ["RelationshipResolver", "an unanswered relationship denies"],
          ["CustomPredicate", "every hasCustom node denies, since no registered predicate can be reached"],
          ["SignatureHistory", "an unwired signature history answers no signatures on file, so every hasSignature node denies"],
        ],
      );
    }));

  it.effect("a retried default renders as defaulted", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      render(<ServicesPanel diagnostics={liveNotice} wiring={WiringRead.Read({ report })} activity={[]} />);
      const card = screen.getAllByTestId("qadi-port").find((c) => c.getAttribute("data-port") === "AttributeResolver");
      assert.strictEqual(card?.getAttribute("data-defaulted"), "true");
      assert.strictEqual(within(card ?? document.body).getByTestId("qadi-port-state").textContent, "defaulted — AttributeResolverNone (retrying)");
      assert.strictEqual(within(card ?? document.body).getByTestId("qadi-port-consequence").textContent, "a missing attribute resolves to undefined, so an attribute policy denies");
    }).pipe(Effect.provide(attributeResolverRetrying(Schedule.recurs(1))(AttributeResolverNone))));
});
```
The call-row cases come from UI-SPEC's template table; the "real adapter" half (`if defaulted: …`, `data-defaulted="false"`) is already pinned by `ServicesPanel.test.tsx:118-139`, so the specimen need not repeat it (one extra exact assertion is cheap). The `.firstElementChild` read isolates `describe(call)`; the sibling `translation`/`served` label and `… ms` are separate spans (`ServicesPanel.tsx:233-248`).

### Q6. The RED row (D-09), run on a clean HEAD

Compiled (`pnpm exec tsc -p tsconfig.test.json`: no errors) and run as `pnpm exec vitest run --project devtools packages/devtools/test/model/Probe47.test.ts` on HEAD with no scratch edit:
```
 × AttributeResolver 10ms
 × DecisionHistory 1ms
 × RelationshipResolver 1ms
 × CustomPredicate 2ms
 × SignatureHistory 29ms
AssertionError: expected false to be true         (assert.isTrue(row?.defaulted))
      Tests  5 failed (5)
```
and, from the first version of the file, `PROBE <port> {"name":"audited <port>","defaulted":false}` for each port. The name assertion (`audited <port>`) passes on the base: only `defaulted` is RED. After the scratch implementation: `Tests  5 passed (5)`.

```ts
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { forEveryPort, portsLayer } from "@qadi/core";
import type { DescriptionOf, PortName, PortTypes, ServiceOf } from "@qadi/core";
import { wiringReport } from "../../src/model/Wiring.ts";

/** A hand-written wrapper: spreads `inner`, renames it, forwards the call. */
const audited = <K extends PortName>(d: DescriptionOf<K>): Layer.Layer<ServiceOf<PortTypes[K]>> =>
  Layer.effect(
    d.service,
    Effect.gen(function* () {
      const inner = Context.get(yield* Layer.build(portsLayer()), d.service);
      const call = d.invoke(inner);
      return { ...inner, ...d.make(`audited ${d.port}`, (...args) => call(...args)) };
    }),
  );

describe("a spreading wrapper, renamed, around the default", () => {
  forEveryPort((d) =>
    it.effect(d.port, () =>
      Effect.gen(function* () {
        const row = (yield* wiringReport).ports.find((p) => p.port === d.port);
        assert.strictEqual(row?.name, `audited ${d.port}`);
        assert.isTrue(row?.defaulted);
      }).pipe(Effect.provide(audited(d))),
    ),
  );
});
```
Two typing notes learned the hard way: (1) a first draft that wrapped with `Layer.provide(portsLayer())` fails `TS2375`/`TS377034` (the generic `Exclude<ServiceOf<PortTypes[K]>, PortServices>` requirement); building the inner shape with `Context.get(yield* Layer.build(portsLayer()), d.service)` (the pattern `Ports.ts:329-333` uses) compiles. (2) The wrapper uses `{ ...inner, ...d.make(name, call) }`: `d.make` gives the rename and the forwarded method generically, the leading `...inner` is what carries the mark. A hand-typed per-port wrapper `{ ...inner, name: "audited x", resolve: (s, a) => inner.resolve(s, a) }` is equivalent and is what a user writes (CONTEXT "Specifics").

### Q7. Spec records, and where each goes

- **BEH-QD-196** is at `spec/behaviors/25-inspection.md:583-606` ("A port says which implementation it is"); its wrapper-naming requirement quoted: `A wrapper MUST name itself around what it wrapped. Every derived wrapper … composes "<inner> (<suffix>)", reading "?" for an unnamed inner.` Add: the name is a display string only, nothing parses it, and `isPortDefault` is the structural fact (D-13). It is cited from `spec/behaviors/06-services.md:289` and `spec/behaviors/28-devtools-screens.md:235`.
- **BEH-QD-215** (`spec/behaviors/28-devtools-screens.md:205-240`, the "port rows MUST be the registry's ports"/defaulted requirements) contains the now-false claim: "`defaulted` is a **reader's label derived from `name`**: core never branches on a name, and a host that names its own adapter after a default is reported as defaulted, which is what it asked for." Rewrite it. The same claim is in `spec/overview.md:899` (the `PortReport` row), `Wiring.ts:58-67`, and `spec/devtools-spec/02-screens.md:332-351` ("A port at its fail-closed default (or a wrapper around it) reads `defaulted — <name>`" stays true).
- **Suggested BEH placement** (planner's call): 571 (defaultedness through wrappers) and 572 (the spread rule and the fresh-object / `Object.create` limit) in `25-inspection.md` beside BEH-QD-196, or in `06-services.md` beside the wrapper requirement at :289; 573 (one reading per port), 574 (`ROWS` from the registry, `PortCall` derived) and 575 (a sixth port needs no devtools edit beyond what the compiler asks for: name `PortReading.ts` and the two `Simulation*` tables) in `28-devtools-screens.md`. BEH-QD-566..570 were used in `24-decision-sink.md` by Phase 46.
- **INV-QD-339 / 340**, suggested wording: 339, "A port's service is its description's default exactly when it carries that default's mark; a name never decides it, and the mark is set only by `nonePort` and carried only by a derived wrapper or a spread." 340, "The mark names the port it defaults, so a shape moved onto another port's service never reads as that port's default." Add after INV-QD-338 in `spec/invariants.md`.
- **ADR-QD-160**: `spec/decisions/160-<slug>.md` (Document ID `QADI-ADR-160`, which must equal the file number, gate 10), plus an `index.yaml` entry (`id`, `file`, `title`, `status`); the "reads" status form exists at `spec/decisions/index.yaml:404` (`"Accepted — reads ADR-QD-094, ADR-QD-109"`). ADR-QD-094 (`spec/decisions/094-a-port-is-described-once.md`) and ADR-QD-109 (`109-a-ports-span-is-projected-once-and-every-read-is-one-body.md`) are kept; no amendment is needed unless the planner wants ADR-QD-094's "name" discussion to point at the mark.
- **`spec/overview.md`**: add a row for `isPortDefault` (function, `PortDescription.ts`) next to `describeKeyRefusal` (:281) or `PortReply` (:286); gate 13 was run on the prototype and reports ``packages/core/src/PortDescription.ts  [missing] `isPortDefault` is exported by @qadi/core and is not named in spec/overview.md's Public API surface section``. `PortReading.ts`, `PortDefault.ts` are not exports, so need no row. Update the `PortReport` row at :899. Bump the Change History (current head 1.112).
- **Gate 12** (`scripts/check-devtools-claims.mjs`): only claims of absence in `spec/devtools-spec/` matter; the edits needed there (`02-screens.md:332-351`) are not absences, so no row is touched. Avoid the PHRASES list ("rescope required", "not built", …) in new devtools-spec prose.
- **Traceability** (`spec/traceability.md`): the `Wiring.test.ts` row (:488, "BEH-QD-215 (registry rows, `defaulted`) …") and rows for each new test file, the BEH/INV/ADR rows, and the "06" / "25" / "28" document rows' BEH lists.
- **CCR-QD-438** row in `spec/README.md` (latest is CCR-QD-437 at :374; the row lists each file with its revision, then "ARCH-94. **…**" prose; documents are bumped with `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-15`, checked by `pnpm spec:verify`). Name any unused reserved id (for example a BEH or INV left over) in the row, as Phase 46 did.
- **Changesets**: `.changeset/<name>.md` with `"@qadi/core": minor` (new `isPortDefault`; a defaulted port's shape carries a symbol property) and a second with `"@qadi/devtools": patch` (a spreading wrapper around a default now reads defaulted; the panel's wording is unchanged). Existing examples: `.changeset/sink-emitter-reports-failures.md` (core minor), `.changeset/devtools-remedy-label-without-json.md` (devtools patch). Neither is Breaking.
- **Upgrade guide**: `apps/website/src/content/docs/docs/reference/upgrading.md` already has `## 0.13: …` entries (latest `## 0.13: a decision sink that fails is reported once`, :773). Add `## 0.13: a port's defaulted state is read from the port, not its name`, noting both directions (Pitfall 6). A ` ```typescript ` fence there is checked by `pnpm spec:website-examples`.
- **Website prose** on the wiring report: only `apps/website/src/content/docs/docs/packages/devtools.md:244` ("Wiring and hydration reports") and `examples/nextjs-newsroom/README.md:164` mention `wiringReport`, neither makes the name claim. No website edit needed beyond the upgrade guide. [VERIFIED: grep of `defaulted|isDefaultName|(retrying)|wiringReport|PortReport|BEH-QD-196` over `apps/website/src`, package READMEs and `examples`]
- **AGENTS.md**: §3 describes port modules and the derivations in general terms; the new `PortDefault.ts` is package-private (the way `PortDerivation.ts` is). No AGENTS.md edit is required. One optional clause in §3 ("…and a default carries a mark the derivations carry forward") would not hurt but nothing checks it.

### Q8. Mutation evidence

Configs: core `stryker.config.mjs` (report `reports/mutation/mutation.json`), devtools `stryker.devtools.mjs` (`mutate: ["packages/devtools/src/model/**/*.ts"]`, report `reports/mutation-devtools/mutation.json`). **`react/ServicesPanel.tsx` is not instrumentable**: devtools' `mutate` glob is `src/model/**/*.ts`, and the config's own header says "`src/react/` renders what the model computed; mutating JSX mostly measures the renderer" (`stryker.devtools.mjs:11-16`). So D-15's conditional resolves to "no". The consequence and describe logic **moves into `model/`** (`PortReading.ts`), where it becomes measured for the first time.

Commands (repo root, on the untouched tree) and measured run times:
```
pnpm exec stryker run --mutate 'packages/core/src/PortDerivation.ts,packages/core/src/PortDoubles.ts,packages/core/src/Ports.ts,packages/core/src/PortDescription.ts'        # 1 min 04 s
pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/Wiring.ts,packages/devtools/src/model/PortCalls.ts'                                       # 53 s
```

**Per-file scores at HEAD `f6cdf79c`** (detected = Killed + Timeout; scored = detected + Survived + NoCoverage; the writer's definition) [VERIFIED: runs this session]:

| File | Score | (detected/scored) | Survivors |
|------|-------|-------------------|-----------|
| `packages/core/src/PortDerivation.ts` | 0.98 | 49/50 | Survived `:172:45` ObjectLiteral `new InvalidBoundedPermits({ permits })` -> `({})` (pre-existing) |
| `packages/core/src/PortDescription.ts` | 1.0 | 16/16 | none |
| `packages/core/src/PortDoubles.ts` | 1.0 | 36/36 | none (not edited in the recommended design; measure anyway, same run) |
| `packages/core/src/Ports.ts` | 1.0 | 16/16 | none |
| `packages/devtools/src/model/Wiring.ts` | 1.0 | 63/63 | none |
| `packages/devtools/src/model/PortCalls.ts` | 1.0 | 49/49 (46 killed, 3 timeout) | none |

**After the scratch implementation with the Q5/Q6 specimen** (devtools only; the core pins were not re-created): `PortReading.ts` 64/64, `Wiring.ts` 51/51, `PortCalls.ts` 40/40, no survivors. So the byte-exact characterisation kills every mutant in the moved describe arms, and nothing was lost by the move. New core mutants will appear in `PortDefault.ts` (`typeof … === "object"`, `!== null`, `=== port`, the `carryDefault` ternary, the optional chain): the D-10 rows for `null`/`undefined`/a string/a function, a wrong port, and both `carryDefault` branches kill them.

The base JSON writer and comparer are the ones in `46-01-PLAN.md` (Task 1 step 4: a node one-liner that refuses a stale report, a report holding a file other than its run's, and a `source` that is not the file on disk); retarget `RUNS` to the two configs above. **The reports currently on disk are not the HEAD base**: the last devtools run was on the scratch after-state, and every file under `packages/*/src` has been rewritten by `git checkout` since the core run, so the writer will refuse them as stale. Re-run both commands on the untouched tree as the phase's first act; the scores above are what to expect.

### Q9. Validation Architecture: see the section below.

## Common Pitfalls

### Pitfall 1: A test that names `isPortDefault` breaks `pnpm typecheck` until core has it
`tsconfig.test.json` includes every `packages/*/test/**/*.ts` and every `*.tst.ts` (`tsconfig.test.json` `include`), so a core pin or the tstyche pin committed before the export exists is `TS2305` for the whole repository. The RED row (D-09) and the characterisation (D-11) use only existing API and compile on the base, so they are real first commits. The core pins (D-10) and the tstyche pin are written test-first **in the plan that adds the export**, with the failing run recorded in that plan's SUMMARY, not as a separate RED commit.
**Warning sign:** `error TS2305: Module '"@qadi/core"' has no exported member 'isPortDefault'` from `tsc -p tsconfig.test.json`.

### Pitfall 2: `decoratePorts` is a derived wrapper D-01 does not list
Without the one-line carry in `Ports.ts`, `capturing(realPorts)` around a default would read "real adapter" after the change (it reads defaulted today only because `isDefaultName` accepts the `" ("` suffix, `Wiring.ts:143-144`). Add a devtools row to `Capture.test.ts`: a captured default is defaulted. Devtools cannot do the carry itself: the symbol is package-private.

### Pitfall 3: The reader must read an own property
`Predicate.hasProperty` is `in`-based and reports an inherited mark. Use the own-property descriptor. Probe: a wrapper made with `Object.create(def)` reads `false`.

### Pitfall 4: A scripted double or a remote asker marked as a default
`scriptedPort` with an unscripted request answers `none.answer`, so it can look like the default. It is not one. Marking it would turn `defaulted` into "behaves fail-closed". Keep the mark strictly "built by `nonePort` or carried from a marked inner".

### Pitfall 5: `ServicesPanel.tsx` is not mutation-scored, so its dispatch can regress silently
`describe`'s `attempts` suffix stays in the view. It is covered by the byte-exact `attempts: 2` and `attempts: 1` rows in the characterisation; keep them.

### Pitfall 6: The change is a consequential one in two directions
A spreading wrapper around a default, renamed, now reads **defaulted** (the fix). A hand-written **fresh-object** wrapper whose name happened to start with `"<noneName> ("` (for example `"AttributeResolverNone (audited)"`) used to read defaulted by name and now reads **real adapter**, which is D-04's documented limit, and the old documented behaviour ("a host that names its own adapter after a default is reported as defaulted, which is what it asked for") is withdrawn. Record both in the upgrade-guide entry. Same for a wrapper made with `Object.create(inner)`.

### Pitfall 7: A spreading wrapper that replaces the method still reads defaulted
`{ ...defaultShape, resolve: realImplementation }` carries the mark and does real work. `defaulted` then means "derived from the default's shape", not "answers fail-closed". D-01 accepts it; the BEH wording should say what the fact is, and the Security Domain records it.

### Pitfall 8: The `forEveryPort` callback returns `void` in the RED row
`it.effect` registered inside `forEveryPort` is fine (the array of `void` is discarded), and the test titles are the port names, which is what makes a failure name its port. Do not wrap the loop in a `describe.each`: the registry order is `forEveryPort`'s.

## Code Examples

### 1. `packages/core/src/PortDefault.ts` (package-private; compiled, run, house-style clean)
```ts
/**
 * Whether a port's service is that port's fail-closed default, as a fact the
 * service carries.
 *
 * A name cannot say it: a wrapper composes `"<inner> (<suffix>)"` for display
 * (BEH-QD-196), and a host's own wrapper may call itself anything. Package-private
 * (not in the barrel): the symbol cannot be minted outside core, so a wrapper can
 * only carry the mark forward by spreading `inner`.
 */
import type { PortName } from "./PortName.ts";

const DEFAULT_OF: unique symbol = Symbol("qadi.PortDefault");

/** The mark: the name of the port whose fail-closed default the shape is. */
export interface DefaultMark<N extends PortName> {
  readonly [DEFAULT_OF]: N;
}

export const markDefault = <N extends PortName, Shape extends object>(
  port: N,
  shape: Shape,
): Shape & DefaultMark<N> => ({ ...shape, [DEFAULT_OF]: port });

export const isMarkedDefault = (port: PortName, service: unknown): boolean =>
  typeof service === "object" &&
  service !== null &&
  Object.getOwnPropertyDescriptor(service, DEFAULT_OF)?.value === port;

/** `made` is a wrapper around `inner`: it is the port's default exactly when `inner` is. */
export const carryDefault = <N extends PortName, Shape extends object>(
  port: N,
  inner: unknown,
  made: Shape,
): Shape => (isMarkedDefault(port, inner) ? markDefault(port, made) : made);
```

### 2. The three core call-site edits (scratch diff, compiled)
```ts
// PortDerivation.ts  (import { carryDefault, markDefault } from "./PortDefault.ts")
// wrapPort
wrapService(d.service, layer, (inner) =>
  carryDefault(d.port, inner, d.make(`${inner.name ?? "?"} (${suffix})`, around(d.invoke(inner)))),
);
// boundedPort
return carryDefault(
  d.port,
  inner,
  d.make(`${inner.name ?? "?"} (bounded ${permits})`, (...args) =>
    Semaphore.withPermit(semaphore)(call(...args)),
  ),
);
// nonePort
return Layer.succeed(d.service, markDefault(d.port, d.make(d.none.name, () => answered)));

// Ports.ts decoratePorts  (import { carryDefault } from "./PortDefault.ts")
tabulatePorts((d) => {
  const inner = Context.get(context, d.service);
  return Layer.succeed(d.service, carryDefault(d.port, inner, f(d, inner)));
}),
```
`recordingPort` (`PortDoubles.ts:150`) needs no edit: it goes through `wrapPort`.

### 3. The public reader, in `PortDescription.ts` (through the existing `export *`)
```ts
/**
 * Whether `service` is the fail-closed default of the port `d` describes, or a
 * wrapper that carries it.
 *
 * Structural: the default's mark names the port it defaults, so a shape moved onto
 * another port's service is never that port's default. `nonePort` sets it, every
 * derived wrapper copies it, and a hand-written wrapper keeps it by spreading
 * `...inner`; one that builds a fresh object does not, and reads as a real adapter.
 * Total over any value.
 */
export const isPortDefault = (d: { readonly port: PortName }, service: unknown): boolean =>
  isMarkedDefault(d.port, service);
```

### 4. `packages/devtools/src/model/PortReading.ts` (compiled; the five rows and `describeCall`)
```ts
import type { PortName } from "@qadi/core";
import type { PortCallOf } from "./PortCalls.ts";

/** One port's display facts: what being defaulted costs, and how one of its calls reads. */
export interface PortReader<K extends PortName> {
  readonly consequence: string;
  readonly describe: (call: PortCallOf<K>) => string;
}

export const PORT_READING: { readonly [K in PortName]: PortReader<K> } = {
  AttributeResolver: {
    consequence: "a missing attribute resolves to undefined, so an attribute policy denies",
    describe: (call) =>
      `${call.attribute ?? "not recorded"} → ${
        call.resolved === undefined ? "no answer" : call.resolved ? "a value" : "nothing"
      }`,
  },
  DecisionHistory: {
    consequence: "the three-valued default denies hasActed and hasNotActed alike",
    describe: (call) =>
      `${call.event ?? "not recorded"} ${
        call.resourceId === undefined ? "anywhere" : `on ${call.resourceId}`
      } → ${call.answer ?? "no answer"}`,
  },
  RelationshipResolver: {
    consequence: "an unanswered relationship denies",
    describe: (call) =>
      `${call.relation ?? "not recorded"} on ${call.resourceId ?? "no resource"}${
        call.depth === undefined ? "" : ` (depth ${String(call.depth)})`
      } → ${call.answer ?? "no answer"}`,
  },
  CustomPredicate: {
    consequence: "every hasCustom node denies, since no registered predicate can be reached",
    describe: (call) =>
      `${call.name ?? "not recorded"} → ${
        call.answer === undefined ? "no answer" : call.answer ? "true" : "false"
      }`,
  },
  SignatureHistory: {
    consequence:
      "an unwired signature history answers no signatures on file, so every hasSignature node denies",
    describe: (call) =>
      `${call.meaning ?? "not recorded"}${
        call.signerRole === undefined ? "" : ` from a '${call.signerRole}'`
      }${
        call.resourceId !== undefined
          ? ` on ${call.resourceId}`
          : call.scope === "Any"
            ? " anywhere"
            : ""
      } → ${call.matched === undefined ? "no answer" : call.matched ? "matched" : "no match"}`,
  },
};

/** One call in a sentence, read through its own port's row. */
export const describeCall = <K extends PortName>(call: PortCallOf<K>): string =>
  PORT_READING[call._tag].describe(call);
```
`Wiring.ts` then does `consequence: PORT_READING[port].consequence` (and drops `CONSEQUENCES`, `isDefaultName` and the `noneName` parameter: `portRow(d.port, shape, isPortDefault(d, Option.getOrUndefined(shape)))`, with `defaulted: Option.isSome(service) ? isDefault : undefined`). `ServicesPanel.tsx`'s `describe` becomes ``call.attempts !== undefined && call.attempts > 1 ? `${describeCall(call)} · ${String(call.attempts)} attempts` : describeCall(call)`` and `describeOne` is deleted. Verified: `pnpm exec vitest run --project devtools` = 1442 passed on that state.

### 5. `PortCalls.ts` ROWS, option R7 (the repo's own technique)
```ts
type RowReaders = { readonly [K in PortName]: (span: Tracer.Span) => PortCallOf<K> };

function buildRows(): RowReaders;
function buildRows(): { readonly [K in PortName]: (span: Tracer.Span) => unknown } {
  return tabulatePorts<{ readonly [K in PortName]: (span: Tracer.Span) => unknown }>(
    (d) => (span) => ({
      ...baseOf(span),
      _tag: d.port,
      ...decodePortSpan<SpanFields, SpanFields, never>(d, span.attributes),
    }),
  );
}

const ROWS: RowReaders = buildRows();
export type PortCall = { readonly [K in PortName]: PortCallOf<K> }[PortName];
```
(`SpanFields` is exported from `@qadi/core`'s barrel; the import line gains it and loses `PORTS`.)

## State of the Art

| Old | Current | When | Impact |
|-----|---------|------|--------|
| Defaulted read from `name.startsWith("<none> (")` | A structural mark core sets and carries | this phase (ADR-QD-160) | a hand-written wrapper can no longer hide a default |
| Three devtools tables restating per-port facts | one `PORT_READING` row per port, `ROWS` from the registry | this phase | a sixth port is the compiler's list, not a grep |

**Deprecated/outdated:** `isDefaultName` (`Wiring.ts:143`), `CONSEQUENCES` (`Wiring.ts:127`), `describeOne` (`ServicesPanel.tsx:268`), the BEH-QD-215 sentence "a host that names its own adapter after a default is reported as defaulted".

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The mark's public reader belongs in `PortDescription.ts` (D discretion allows `PortDerivation.ts` or `Ports.ts` too; `PortDerivation.ts` is not in the barrel so it cannot be the public home) | Q1 | None: only the module differs |
| A2 | BEH/INV placement and wording suggested in Q7 (`25-inspection.md` vs `06-services.md` vs `28-devtools-screens.md`) | Q7 | Low: the planner places them; the reserved numbers are fixed |
| A3 | A hand-written `Object.create(inner)` wrapper reading as a real adapter is acceptable to the user (it follows from "own", D-01) | Q1, Pitfall 6 | Low; state it in BEH-QD-572 with the fresh-object limit |
| A4 | `describeCall` keeping its generic form (candidate A) rather than the equivalent candidate E | Q3 | None |

## Open Questions

> **Resolved 2026-11-16 by the user** (recorded as D-17..D-20 in 47-CONTEXT.md): 1 carry the mark in `decoratePorts`; 2 accept the fixture tables and derive `PortCall`; 3 **R6** (monomorphic, fully checked; PFCT-04 reworded), not R7; 4 unique `Symbol`.

1. **`decoratePorts` is a derived wrapper D-01 does not list.** What we know: `capturing` (`devtools/src/model/Capture.ts:101-111`) names itself `"<inner> (capturing)"` and rebuilds every port through core's `decoratePorts` (`Ports.ts:324-334`). Without a carry there, a captured default flips from "defaulted" to "real adapter" (a regression the phase would introduce), and devtools cannot carry a package-private mark. Recommendation: add the one-line carry in `decoratePorts` and a `Capture.test.ts` row ("a captured default reads defaulted"). This extends D-01's list by one site; it follows D-01's intent ("every derived wrapper"), so it is a confirmation, not a reversal.

2. **D-12's expectation cannot hold.** What we know: a complete scratch sixth port flags `PortReading.ts`, `SimulationFields.ts:568` and `SimulationSource.ts:145` in devtools after the change (and `PortCalls.ts:229` unless `PortCall` is derived), because core's `PortFixtureData`/`PORT_FIXTURES` force fixture data on every port. What's unclear: whether the user accepts that PFCT-05's "no devtools edit beyond what the compiler asks for" includes those two fixture tables, or wants them derived too (out of scope, a separate refactor). Recommendation: accept; derive `PortCall` (in scope, one line); record the exact flagged list in the SUMMARY as D-12 asks.

3. **How to type the generic `ROWS` builder (D-07).** What we know: a plain generic builder cannot compile; two compliant forms exist. R7 (an overload whose implementation signature returns `unknown` rows, the pattern `tabulatePorts` already uses, `Ports.ts:183-195`) meets "built with `forEveryPort`/`tabulatePorts`, five arms gone", but the compiler does not check the `PortCallOf<K>` claim and the user's memory note rejects "a widened implementation type to dodge `as`". R6 (a monomorphic helper applied at five call sites) is fully checked but keeps five lines and does not use `forEveryPort`. Recommendation: R7, because it is the established house technique and D-07/PFCT-04 are written for it; if the user's note is meant to cover it, fall back to R6 and relax PFCT-04's wording to "ROWS is built by one generic row builder over the registry's descriptions".

4. **`Symbol(...)` or `Symbol.for(...)`.** What we know: a unique `Symbol` (the repo's precedent, and D-03's "nobody outside core can forge") makes two copies of `@qadi/core` blind to each other's marks (probe output in Q1), the misleading direction for a diagnostic; `Symbol.for` is shared across copies but forgeable by anyone. `workspace:^` and the catalog ranges are written to prevent duplicate installs. Recommendation: unique `Symbol`, and say in BEH-QD-572 that a duplicate install of `@qadi/core` reads as a real adapter.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 [VERIFIED: `node --version`] | none needed |
| pnpm | all commands | yes | 10.17.1 [VERIFIED] | none needed |
| vitest | tests | yes | 5.1.0 [VERIFIED] | none needed |
| `@stryker-mutator/core` + vitest runner | base and comparison | yes | 10.1.1; ran this session | none needed |
| tstyche | the reader's signature pin | yes | 7.2.5 [VERIFIED] | none needed |
| `madge` | `pnpm circular` | yes | ran: "No circular dependency found!" | none needed |
| `@testing-library/react`, `happy-dom` | panel tests | yes (devtools devDependencies; the existing panel tests import them) | not resolved from the repo root, resolved by the devtools project | none needed |

**Missing dependencies:** none. `pnpm check:pr < /dev/null` was **not** run end to end this session (it is long); its constituents were run on the scratch implementation: `tsc -p tsconfig.test.json` clean, `node scripts/check-house-style.mjs` clean, `pnpm circular` clean, `pnpm test:tstyche` 55/55, `pnpm exec vitest run` over every project 218 files / 5328 tests passed, `pnpm spec:api` flagged only the expected missing overview row.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest` (`it.effect`), `@testing-library/react` for panels; `tstyche` 7.2.5 for type pins |
| Config | `packages/core/vitest.config.ts` (`name: "core"`), `packages/devtools/vitest.config.ts` (`name: "devtools"`, `happy-dom`), `stryker.config.mjs`, `stryker.devtools.mjs`; coverage thresholds core 95 / others 90 |
| Quick run | `pnpm exec vitest run --project devtools packages/devtools/test/model/Wiring.test.ts packages/devtools/test/model/PortCalls.test.ts packages/devtools/test/react/ServicesPanel.test.tsx` (plus the new files); `pnpm exec vitest run --project core packages/core/test/PortDefault.test.ts` |
| Full suite | `pnpm check:pr < /dev/null` (`node scripts/run-check.mjs --skip-mutation`); fast loop `pnpm check:fast`; whole repo tests `pnpm exec vitest run` (~17 s) |
| Type check | `pnpm exec tsc -p tsconfig.test.json` (about 3 s warm) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PFCT-02 | spreading wrapper, renamed, around each port's default reads `defaulted: true` (RED on base) | `it.effect` via `forEveryPort` | `pnpm exec vitest run --project devtools packages/devtools/test/model/WiringDefaulted.test.ts` | Wave 0 (RED) |
| PFCT-01 | `isPortDefault` true for each `nonePort`; through retrying/bounded/timingOut/recording in two orders and depths; false for a real adapter, a fresh object, a default under another port, no mark, `undefined`/`null`/a string/a function; own-only | `it.effect` | `pnpm exec vitest run --project core packages/core/test/PortDefault.test.ts` | Wave 1 (written first, in the core plan) |
| PFCT-01 | reader's signature | tstyche | `pnpm test:tstyche` | `packages/core/test/PortDefault.tst.ts`, Wave 1 |
| PFCT-01 | `decoratePorts`, and so `capturing`, carry the mark | `it.effect` | `pnpm exec vitest run --project devtools packages/devtools/test/model/Capture.test.ts` (new row) and core `Ports`/`PortsLayer` tests | Wave 1 |
| PFCT-01 | `isDefaultName` and `CONSEQUENCES` gone | grep in the plan's verify | `! grep -nE "isDefaultName\|CONSEQUENCES" packages/devtools/src/model/Wiring.ts` | at close |
| PFCT-03 | five consequence lines byte-exact; every call-row branch byte-exact; `attempts` suffix; card defaulted and real text | `it.effect` / render | `pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.reading.test.tsx` | Wave 0 (green on base) |
| PFCT-03 / PFCT-04 | `ServicesPanel.tsx` names no port's span field | grep in verify | `! grep -nE "call\.(attribute\|resolved\|event\|relation\|depth\|meaning\|signerRole\|matched\|scope\|name\|answer\|resourceId)" packages/devtools/src/react/ServicesPanel.tsx` | at close |
| PFCT-04 | `ROWS` from the registry, `PortCall` derived | typecheck + `PortCalls.test.ts` | `pnpm exec tsc -p tsconfig.test.json`; `pnpm exec vitest run --project devtools packages/devtools/test/model/PortCalls.test.ts` | exists |
| PFCT-05 | the sixth-port scratch run, recorded and reverted | manual evidence in SUMMARY | the recipe in Q4 | n/a |
| WX-01 | gate green | gate | `pnpm check:pr < /dev/null` | exists |
| WX-02 | reserved ids only; no placeholder ids | `[no-numbering-placeholder]`, `git grep` | `pnpm lint` | exists |
| WX-03 | overview names `isPortDefault` | gate 13 | `pnpm spec:api` | exists |
| WX-04 | no forbidden construct | `pnpm lint` | `pnpm lint` (house-style: 518 files clean on the scratch) | exists |
| WX-05 | coverage and Stryker not below base | coverage + comparer | `pnpm coverage`; the two Stryker commands in Q8 | base JSON Wave 0 |
| WX-06 | tests precede the change | git order | `git log --format=%H -- packages/core/src packages/devtools/src` has no commit before the RED and characterisation commits | Wave 0 |
| WX-07 | changesets, none Breaking | review | `.changeset/*.md` with `"@qadi/core": minor`, `"@qadi/devtools": patch` | at close |

### Sampling Rate
- **Per task commit:** the quick run for the files touched, plus `pnpm exec tsc -p tsconfig.test.json`.
- **After the core fact:** `pnpm exec vitest run --project core --project devtools`, `pnpm circular`.
- **Per wave merge:** `pnpm check:fast`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the Stryker comparison exit 0, before `/gsd-verify-work`.
- A task whose verify would run a RED file excludes it by exact path until the fixing task (shared-context hygiene).

### Wave 0 Gaps
- [ ] `47-mutation-base.json`: six files (Q8) from two Stryker runs, the phase's first commit, alone; re-run on the untouched tree (the reports on disk are stale).
- [ ] `packages/devtools/test/model/WiringDefaulted.test.ts` (or inside `Wiring.test.ts`): the RED row, Q6, compiles on the base.
- [ ] `packages/devtools/test/react/ServicesPanel.reading.test.tsx`: the byte-exact characterisation, Q5, green on the base.
- [ ] (same plan as the core fact, not Wave 0, per Pitfall 1) `packages/core/test/PortDefault.test.ts`, `PortDefault.tst.ts`, a `Capture.test.ts` row.
- No framework install is needed.

## Security Domain

Security enforcement is enabled (`workflow.security_enforcement: true`, ASVS level 1, block on high; `.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | none |
| V3 Session Management | no | none |
| V4 Access Control | no (nothing here decides an authorization; core never branches on the mark) | the mark is read only by devtools' diagnostic; `evaluate`/`toPredicate` are untouched |
| V5 Input Validation | yes (a total reader over `unknown`) | `typeof … === "object"`, `!== null`, an own-property read; probed with `undefined`, `null`, a string, a function: all `false` |
| V6 Cryptography | no | none |
| V7 Error Handling / Logging / data exposure | yes (a mark must not leak to a wire or a log) | a symbol key is dropped by `JSON.stringify`, `Object.keys`, `structuredClone` (probe, Q1); the wiring report carries a `boolean`, not the shape |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forging "defaulted" from outside core | Spoofing | a module-private unique `Symbol`: the mark cannot be minted elsewhere (D-03). With `Symbol.for` it could be; see Open Question 4. Note that the previous reader was forgeable by anyone who typed the right name, so this is strictly stronger |
| A spreading wrapper that replaces the method but still carries the mark (reads defaulted while doing real work) | Spoofing / misleading diagnostic | accepted by D-01; the BEH states that `defaulted` means "the default, or derived from it", not "answers fail-closed", and that the fact never gates a decision. The failure direction is "claims defaulted", which makes an operator look at a wiring that is in fact live; a fresh-object wrapper errs the other way, documented (D-04) |
| The symbol key leaking through a wire, JSON path or devtools capture | Information disclosure | not possible for a symbol key: `JSON.stringify` and `structuredClone` drop it; `Capture` stores answers, not shapes; `PortReport` has `defaulted: boolean` |
| A shape moved onto another port's service reading as that port's default | Tampering | the mark holds the `PortName` and the reader compares it with `d.port` (D-02); probe `underOther false` |
| A duplicate install of `@qadi/core` reading marked defaults as real adapters | Misleading diagnostic | documented limit with a unique `Symbol`; a deployment's single copy is guaranteed by the `workspace:^`/catalog ranges (AGENTS.md §16) |

## Sources

### Primary (HIGH confidence)
- Read this session: `packages/core/src/PortDescription.ts`, `PortDerivation.ts`, `PortDoubles.ts`, `Ports.ts`, `PortName.ts`, `PortRemote.ts:100-260`, `PortServing.ts:20-130`, `PortSpan.ts:60-175`, `PortSpanDecode.ts`, `PortMetrics.ts:40-75`, `AttributeResolver.ts:1-229`, `index.ts`; `packages/devtools/src/model/Wiring.ts`, `PortCalls.ts`, `Capture.ts:60-240`, `react/ServicesPanel.tsx`; `packages/devtools/test/model/Wiring.test.ts`, `Capture.test.ts:290-390`, `react/ServicesPanel.test.tsx` (1-80, 140-160, 340-420, 548-668); `packages/devtools/vitest.config.ts`, `stryker.config.mjs`, `stryker.devtools.mjs`; `tsconfig.json`, `tsconfig.test.json`, `tsconfig.react-base.json`, `tsconfig.base.json`; `scripts/check-house-style.mjs` (barrel rules, `no-port-span-key-literals`), `scripts/check-api-surface.mjs` header, `scripts/check-devtools-claims.mjs` header; `.oxlintrc.json`
- Spec: `spec/behaviors/25-inspection.md:583-606`, `06-services.md:275-295`, `28-devtools-screens.md:205-240`, `spec/devtools-spec/02-screens.md:325-355`, `spec/overview.md` (rows at :281-306, :899), `spec/decisions/index.yaml`, `spec/decisions/159-*` (format), `spec/README.md:373-374`, `.changeset/sink-emitter-reports-failures.md`, `.changeset/devtools-remedy-label-without-json.md`, `apps/website/.../upgrading.md` (headings)
- Planning: `47-CONTEXT.md`, `47-UI-SPEC.md`, `_WAVE10-CONTEXT.md`, `_SHARED-CONTEXT.md` (XC-05), `46-RESEARCH.md` (layout), `46-01-PLAN.md` (the base writer), `.planning/REQUIREMENTS.md`, `.planning/config.json`
- Probes this session, all on the installed `effect@4.1.2` / TypeScript 7.0.2 and all reverted: the RED row on a clean HEAD (5 of 5 fail); a full scratch implementation (core marker + three call sites + reader, devtools `Wiring`/`PortReading`/`ServicesPanel`/`PortCalls`) with the whole repository suite green; a complete scratch sixth port at HEAD and after; typing candidates A, B, D, E and R1, R6, R7; a duplicate-module-instance probe; Stryker runs (core 64 s, devtools 53 s and 52 s)

### Secondary (MEDIUM confidence)
- none beyond the above

### Tertiary (LOW confidence)
- none; no web source was needed (all claims are about this repository and the installed toolchain)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no package change
- Marker and sites: HIGH, built and run
- Typing findings: HIGH, each candidate compiled
- Sixth-port evidence: HIGH, run at HEAD and after
- Records placement: MEDIUM, the planner's choices
- Mutation base: HIGH for the scores (run this session), the stored reports are stale by design

**Research date:** 2026-11-15
**Valid until:** 2026-12-15 (re-verify line numbers against the phase base; effect and TypeScript versions if `pnpm-lock.yaml` moves)
