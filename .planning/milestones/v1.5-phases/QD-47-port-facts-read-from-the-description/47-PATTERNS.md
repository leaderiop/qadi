# Phase 47: Port facts read from the description - Pattern Map

**Mapped:** 2026-11-16
**Files analyzed:** 27 (new and modified)
**Analogs found:** 25 / 27 (all analog paths are git-tracked source; none is a gitignored mirror)

RESEARCH.md already holds compiled code specimens for the core marker, the reader, `PORT_READING`, `ROWS` and the RED row. This map points each file at the real analog and the line ranges to copy, and does not repeat those specimens. Where it says "see RESEARCH Code Example N", use that specimen verbatim.

D-18 overrides RESEARCH Code Example 5. `ROWS` uses R6 (monomorphic helper, five one-line entries). Do NOT use the R7 `buildRows` overload.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/PortDefault.ts` (new, package-private) | utility (leaf) | transform | `packages/core/src/PortServing.ts` header (leaf discipline), `FieldPath.ts:164` (unique symbol) | role-match |
| `packages/core/src/PortDescription.ts` (+`isPortDefault`) | model/config | transform | its own exports (`export *` through the barrel) | exact |
| `packages/core/src/PortDerivation.ts` (nonePort, wrapPort, boundedPort) | service derivation | request-response | itself, lines 224-240 and 372-378 | exact |
| `packages/core/src/Ports.ts` (`decoratePorts`) | service derivation | transform | itself, lines 324-334 | exact |
| `packages/core/test/PortDefault.test.ts` (new) | test | request-response | `packages/core/test/PortDescription.test.ts`, `PortConformance.test.ts` | role-match |
| `packages/core/test/PortDefault.tst.ts` (new) | test (type pin) | n/a | `packages/core/test/Ports.tst.ts` | exact |
| `packages/devtools/src/model/PortReading.ts` (new) | utility (display table) | transform | `Wiring.ts:127-134` `CONSEQUENCES`, `ServicesPanel.tsx:268-301` `describeOne` | exact (moved code) |
| `packages/devtools/src/model/Wiring.ts` | service | request-response | itself | exact |
| `packages/devtools/src/model/PortCalls.ts` (`ROWS`, `PortCall`) | model | transform | itself, lines 130-135, 238-279 | exact |
| `packages/devtools/src/react/ServicesPanel.tsx` | component | request-response | itself, lines 268-311 | exact |
| `packages/devtools/test/model/WiringDefaulted.test.ts` (new, RED) | test | request-response | `packages/devtools/test/model/Wiring.test.ts:108-131` | role-match |
| `packages/devtools/test/react/ServicesPanel.reading.test.tsx` (new, characterisation) | test | request-response | `packages/devtools/test/react/ServicesPanel.test.tsx:9-57` | exact |
| `packages/devtools/test/model/Capture.test.ts` (+1 row) | test | request-response | its rows at :311-335 | exact |
| `.planning/phases/QD-47-.../47-mutation-base.json` (new) | evidence | batch | `46-mutation-base.json` and the writer in `46-01-PLAN.md` (Task 1 step 4) | exact |
| `spec/decisions/160-*.md` + `spec/decisions/index.yaml` | spec record | n/a | `spec/decisions/159-the-sink-emitter-reports-what-it-contains.md`; index.yaml `ADR-QD-159` entry (:485-488) | exact |
| `spec/README.md` CCR-QD-438 row | spec record | n/a | the CCR-QD-437 row (:13 history, :374 row) | exact |
| `spec/behaviors/25-inspection.md` (BEH-QD-196 amend, BEH-QD-571/572) | spec record | n/a | BEH-QD-196 at :583-606 | exact |
| `spec/behaviors/28-devtools-screens.md` (BEH-QD-215 rewrite :229-238, BEH-QD-573..575) | spec record | n/a | BEH-QD-215 at :205-240 | exact |
| `spec/behaviors/06-services.md` (:289 cites BEH-QD-196) | spec record | n/a | itself | exact |
| `spec/invariants.md` (INV-QD-339/340) | spec record | n/a | INV-QD-337 at :3887, INV-QD-338 | exact |
| `spec/overview.md` (row `isPortDefault`, `PortReport` row :899) | spec record | n/a | rows at :281-306 | exact |
| `spec/devtools-spec/02-screens.md:332-351` | spec record | n/a | itself | exact |
| `spec/traceability.md` (rows :488 and new) | spec record | n/a | existing `Wiring.test.ts` row | exact |
| `.changeset/<core-name>.md` (core minor) | config | n/a | `.changeset/sink-emitter-reports-failures.md` | exact |
| `.changeset/<devtools-name>.md` (devtools patch) | config | n/a | `.changeset/devtools-remedy-label-without-json.md`, `audit-sink-names-itself.md` | exact |
| `apps/website/src/content/docs/docs/reference/upgrading.md` | docs | n/a | `## 0.13: a decision sink that fails is reported once` (:773) | exact |
| Sixth-port scratch run (D-12, uncommitted) | evidence | n/a | Phase 44's scratch wire field in its SUMMARY | role-match |

## Pattern Assignments

### `packages/core/src/PortDefault.ts` (utility, transform)

**Analogs:** `PortServing.ts:24-30` (a leaf that imports only types such as `PortName`), `FieldPath.ts:164` and `devtools/src/model/SupersedingRun.ts:41` (unique-symbol precedent).

**Symbol precedent** (`FieldPath.ts:164`):
```ts
const OMIT: unique symbol = Symbol("FieldPath.project.omit");
```
Use `const DEFAULT_OF: unique symbol = Symbol("qadi.PortDefault")`. D-20 settles `Symbol(...)`, not `Symbol.for`. The full file is RESEARCH Code Example 1.

Rules: do NOT add it to `packages/core/src/index.ts` (AGENTS §9; a pure `export *` list that `barrel-order` checks). No `as`, `!`, `any`. Use the own-property descriptor read, not `Predicate.hasProperty` (`in`-based). Doc comment follows the AGENTS shape (one-line summary, then the why).

### `packages/core/src/PortDescription.ts` (+ `isPortDefault`)

The public reader goes in this already-barrelled module (RESEARCH Code Example 3). Signature: `(d: { readonly port: PortName }, service: unknown): boolean`, delegating to `isMarkedDefault(d.port, service)`. `unknown` is deliberate so a "default under another port" test needs no cast. A named re-export line in `index.ts` would disable `barrel-order` for core.

### `packages/core/src/PortDerivation.ts` (service derivation)

**`wrapPort` today** (lines 238-240); edit to wrap the `d.make(...)` result in `carryDefault(d.port, inner, ...)`:
```ts
  wrapService(d.service, layer, (inner) =>
    d.make(`${inner.name ?? "?"} (${suffix})`, around(d.invoke(inner))),
  );
```
**`nonePort` today** (lines 376-377); edit to `markDefault(d.port, d.make(d.none.name, () => answered))`:
```ts
  const answered: Effect.Effect<A, E> = Effect.succeed(d.none.answer);
  return Layer.succeed(d.service, d.make(d.none.name, () => answered));
```
`boundedPort` (~:302-307, built `d.make(\`${inner.name ?? "?"} (bounded ${permits})\`, ...)`) gets the same `carryDefault`. `retryingPort`, `timingOutPort` and `PortDoubles.ts`' `recordingPort` go through `wrapPort`, so they need no edit. `scriptedPort` and `askRemotely` are NEVER marked. Final edit shapes: RESEARCH Code Example 2. Import line: `import { carryDefault, markDefault } from "./PortDefault.ts";`.

### `packages/core/src/Ports.ts` (`decoratePorts`, D-17)

**Today** (lines 324-334):
```ts
  Layer.unwrap(
    Effect.map(Layer.build(ports), (context) =>
      mergePorts(
        tabulatePorts((d) => Layer.succeed(d.service, f(d, Context.get(context, d.service)))),
      ),
    ),
  );
```
Edit to take `const inner = Context.get(context, d.service)` and `Layer.succeed(d.service, carryDefault(d.port, inner, f(d, inner)))`. A block body is needed, so keep `Layer.succeed` as the return.

### `packages/core/test/PortDefault.test.ts` (test, new)

**Analog:** `packages/core/test/PortDescription.test.ts` (header comment: pins the derivations against a test-local port; imports `assert, describe, it` from `@effect/vitest`, `effect/*` namespace imports, `../src/*.ts` relative imports) and `PortConformance.test.ts` (runs the derivations over every registry member; use `forEveryPort`).

Cover (D-10): `nonePort` per port; stacks (retrying/bounded/timingOut/recording, two orders, two depths); false for a real adapter (`attributeResolverFromRecord`), a fresh object, a default under another port, an unmarked shape, `undefined`/`null`/string/function, and an `Object.create(def)` wrapper; and `decoratePorts` carrying the mark. For a broken port use `scriptedPort` (PORT_DOUBLE_BUDGET), never a hand-written failing layer. Write it in the SAME plan that adds the export (RESEARCH Pitfall 1: a test naming `isPortDefault` breaks `pnpm typecheck` earlier).

### `packages/core/test/PortDefault.tst.ts` (type pin, new)

**Analog:** `packages/core/test/Ports.tst.ts` (header: `import { expect, test } from "tstyche";`, relative `../src/*.ts` imports, "No deliberate compile error lives here, because `tsconfig.test.json` also compiles every `*.tst.ts`"). Body: RESEARCH Q1 "Signature" tstyche block. The "not a port" case must use `.type.not.toBeCallableWith`, not a deliberate error.

### `packages/devtools/src/model/PortReading.ts` (new, package-private)

Lift the moved text byte-for-byte. Sources: `Wiring.ts:127-134` (`CONSEQUENCES`) and `ServicesPanel.tsx:268-301` (`describeOne`). Target: RESEARCH Code Example 4 (compiled), with `describeCall = <K extends PortName>(call: PortCallOf<K>): string => PORT_READING[call._tag].describe(call)`. Candidates B and D do not compile. Keep it out of the devtools named barrel (`devtools-named-barrel`); it needs no `spec/overview.md` row. Match the mapped-table style of `SimulationFields.ts` (~:568) and `SimulationSource.ts` (~:145).

### `packages/devtools/src/model/Wiring.ts`

Delete `CONSEQUENCES` (:127-134) and `isDefaultName` (:143-144); change `portRow` (:146-162) to take `isPortDefault(d, Option.getOrUndefined(shape))` and `PORT_READING[port].consequence`. Replace the JSDoc at :58-67 that says the label is derived from `name`. The loop already uses `forEveryPort` over `Effect.serviceOption(d.service)` (:97); keep it.

### `packages/devtools/src/model/PortCalls.ts` (ROWS R6, PortCall derived)

**Today:** hand-written `PortCall` union at :130-135, `baseOf` at :238-242, five-arm `ROWS` at :253-279.

Edits (D-18, D-19):
- `export type PortCall = { readonly [K in PortName]: PortCallOf<K> }[PortName];`. The five named aliases stay (public).
- R6 helper, from RESEARCH Q3 row R6: `rowOf = <N extends PortName, Q extends SpanFields, Ans extends SpanFields, O>(d: { readonly port: N; readonly attributes: PortSpanAttributes<Q, Ans, O> }) => (span) => ({ ...baseOf(span), _tag: d.port, ...decodePortSpan(d, span.attributes) })`, applied as `AttributeResolver: rowOf(PORTS.AttributeResolver), ...` for the five ports, with `const ROWS: RowReaders = { ... }`.
- NOT R7 (no overload with an `unknown` implementation; the user's feedback memory forbids widened implementation types).
- `no-port-span-key-literals` forbids a `"qadi.<key>"` literal in this file.
- The R6 code was compiled in a probe, but verify with `pnpm exec tsc -p tsconfig.test.json`.

### `packages/devtools/src/react/ServicesPanel.tsx`

Delete `describeOne` (:268-301). `describe` (:308-311) becomes `call.attempts !== undefined && call.attempts > 1 ? \`${describeCall(call)} · ${String(call.attempts)} attempts\` : describeCall(call)`. Verify with the grep in RESEARCH's validation table: no `call.attribute|resolved|event|...` remain. This file is NOT Stryker-instrumentable (`stryker.devtools.mjs` globs `src/model/**/*.ts`), so the byte-exact characterisation is its only guard.

### `packages/devtools/test/model/WiringDefaulted.test.ts` (RED, new)

**Analog:** `Wiring.test.ts:108-131` ("a port at its fail-closed default says so", "a wrapped default is still defaulted"). Body is RESEARCH Q6: `forEveryPort((d) => it.effect(d.port, ...))` with the `audited` wrapper built via `Context.get(yield* Layer.build(portsLayer()), d.service)` and `{ ...inner, ...d.make("audited <port>", (...args) => call(...args)) }`. Test titles are port names. Compiles on the base and fails 5/5 there; commit it before any `packages/*/src` edit (WX-06).

### `packages/devtools/test/react/ServicesPanel.reading.test.tsx` (characterisation, new)

**Analog:** `ServicesPanel.test.tsx:9-57` (`WiringRead.Read({ report })`, `liveNotice` from `../helpers.ts`, calls as plain objects in a `PortCallLog`, `@testing-library/react` `render/screen/within`). Body is RESEARCH Q5's specimen (18 tests, green on the base). The `.firstElementChild?.textContent` read isolates `describe(call)` from the sibling spans.

### `packages/devtools/test/model/Capture.test.ts` (+1 row)

Add next to the `"… (capturing)"` rows at :311-335 and :355-375: a captured default reads defaulted (`wiringReport` over `capturing(...)` around `EvaluationServicesNone`).

### `47-mutation-base.json` (first commit, alone)

**Analog:** `46-mutation-base.json`, shape `{ "measured": {path: score}, "unmeasured": {}, "new": [], "deleted": {}, "moved": {} }`. Writer and comparer: `46-01-PLAN.md` Task 1 step 4 (refuses a stale report, a report holding a file other than its run's, a `source` that is not the file on disk). Retarget to the two runs in RESEARCH Q8:
```
pnpm exec stryker run --mutate 'packages/core/src/PortDerivation.ts,packages/core/src/PortDoubles.ts,packages/core/src/Ports.ts,packages/core/src/PortDescription.ts'
pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/Wiring.ts,packages/devtools/src/model/PortCalls.ts'
```
The reports on disk are stale; re-run on the untouched tree. Expected: PortDerivation 0.98, PortDescription 1, PortDoubles 1, Ports 1, Wiring 1, PortCalls 1. `PortDefault.ts` and `PortReading.ts` go under `"new"`.

### Spec records

Follow Phase 46's shapes:
- **ADR-QD-160:** copy the Document Control block of `spec/decisions/159-the-sink-emitter-reports-what-it-contains.md` (Document ID `QADI-ADR-160` must equal the file number, gate 10; `Status: Accepted — reads ADR-QD-094, ADR-QD-109`). Add an `index.yaml` entry like :485-488 (`id`, `file`, `title`, `status`).
- **CCR-QD-438:** a row in `spec/README.md` after CCR-QD-437 (:374); bump the Change History with `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-16` (never `scripts/next-id.mjs`; ids are reserved). Name any unused reserved id in the row.
- **BEH-QD-571..575:** 571/572 beside BEH-QD-196 in `25-inspection.md:583-606`; 573..575 in `28-devtools-screens.md`. State the fresh-object, `Object.create` and duplicate-install limits (D-04, D-20). Amend BEH-QD-196 to say the composed name is display only. Rewrite BEH-QD-215 at :229-238, which has the now-false "reader's label derived from `name`" sentence.
- **INV-QD-339/340** after INV-QD-338 in `spec/invariants.md` (heading form `## INV-QD-337: <title>` at :3887); wording in RESEARCH Q7.
- **`spec/overview.md`:** a row for `isPortDefault` near :281-306 (gate 13 `pnpm spec:api`); update the `PortReport` row at :899.
- **Changesets:** `"@qadi/core": minor` and `"@qadi/devtools": patch`, bold lead sentence then a pointer to the upgrade-guide 0.13 section. Mention both directions (RESEARCH Pitfall 6).
- **Upgrade guide:** new `## 0.13: a port's defaulted state is read from the port, not its name` after :773. A ` ```typescript ` fence there is compiled by `pnpm spec:website-examples`.
- Avoid the gate-12 phrase list ("not built", ...) in `spec/devtools-spec/` prose.

## Shared Patterns

### Derived wrappers copy, never decide
**Source:** `PortDerivation.ts:224-240`, `Ports.ts:324-334`.
**Apply to:** every site that calls `d.make` over an inner shape (wrapPort, boundedPort, decoratePorts). Marks only in `nonePort`; never in `scriptedPort`, `askRemotely`, fixtures or replay.

### Per-port tables are mapped types over `PortName`
**Source:** `Ports.ts` `PORT_FIXTURES`/`PortFixtureData`, devtools `Wiring.ts:127` `CONSEQUENCES`, `SimulationFields.ts:568`.
**Apply to:** `PORT_READING`, `ROWS`' `RowReaders`. A sixth port must be a compile error.

### House style
`import * as X from "effect/X"`; relative imports with `.ts`; `import type` for types; no `as`/`!`/`any`/`switch`; doc comment leads with a one-line summary, the why afterward. Gate: `node scripts/check-house-style.mjs`, `pnpm circular` (the new `PortDefault.ts` imports only a type, so no cycle).

### Test-first ordering
Commit order: base JSON, then RED row and characterisation (both compile on the base), then core plan (pins written first inside it), then devtools plan, then records, then the sixth-port evidence and the Stryker comparison.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| Sixth-port scratch evidence | evidence | A throwaway edit, with no committed analog beyond Phase 44's SUMMARY note. Use the recipe in RESEARCH Q4 (the scratch needs `PortName.ts`, `PortMetrics.ts`, `PortServing.ts` and `Ports.ts` registry lines plus fixture data). The expected flagged list, per D-19, is `PortReading.ts`, `PortCalls.ts` (the `ROWS` entry), `SimulationFields.ts:568`, `SimulationSource.ts:145`, and the `Capture.test.ts` table. |
| Symbol-keyed own-property mark on a service shape | utility | No existing service carries a symbol-keyed fact; only the `FieldPath.ts` and `SupersedingRun.ts` unique-symbol declarations are precedents. Use RESEARCH Code Example 1, which was compiled and run. |

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `packages/devtools/src/model`, `packages/devtools/src/react`, `packages/devtools/test`, `spec/`, `.changeset/`, `.planning/phases/QD-46-*`.
**Basis:** RESEARCH.md's verified reads plus targeted greps this session (core test and tstyche file listings, spec locations, `Ports.ts`/`PortDerivation.ts` excerpts). I did not re-read the devtools source files directly; line numbers for them come from RESEARCH, so confirm them before editing.
**Pattern extraction date:** 2026-11-16
