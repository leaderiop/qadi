# Phase 73: One pure reconcile for gate registration - Pattern Map

**Mapped:** 2026-11-22
**Files analyzed:** 17 (all tracked via git ls-files, except new files)
**Analogs found:** 17 / 17

## File Classification

| File | Role | Data Flow | Closest Analog | Match |
|------|------|-----------|----------------|-------|
| `packages/react/src/GateWriter.ts` (modify) | model (React-free write side) | request-response (pure step + writer calls) | itself (`reconcile` :304-334, handle `update` :216-221) | self |
| `packages/react/src/useGate.ts` (modify) | hook | event-driven (effects) | itself (`useGateRegistrations` :76-152, `useGates` :244-302) | self |
| `packages/react/test/GateRegistration.characterisation.test.tsx` (new) | test | rendered, whole-value | `packages/devtools/test/model/DockModel.characterisation.test.ts` (header :1-23); render helpers `GateRegistry.test.tsx`, `GateWriter.useGates.test.tsx` | role-match |
| `packages/react/test/GateWriter.reconcile.test.ts` (extend) | test | unit, fake writer | itself (`fakeWriter` :19-34, `identity` :41-49, `nothing` :51) | self |
| `packages/react/test/GateWriter.test.tsx` (retarget) | test | renderHook | itself (`run` :51-55, `setup` :35-44, equal-state/notification pattern :63-) | self |
| `packages/react/test/GateRegistry.test.tsx` (trim) | test | rendered | itself (cases at :281, :664, :691) | self |
| keyed-signature `.tst.ts` (new, e.g. `packages/react/test/GateWriter.reconcile.tst.ts`) | type test | tstyche | `packages/devtools/test/model/ExternalStore.tst.ts` (header :1-19, `@ts-expect-error` on held const, positive twin test at :39) | exact |
| `.planning/phases/QD-73-.../73-mutation.mjs` (new) | script | batch | `.planning/phases/QD-72-.../72-mutation.mjs` (`GROUPS` :22, `invocation` :26, restart rule :181; set `phase: "73"`, groups `writer`, `hook`, config `stryker.react.mjs`) | exact |
| `spec/decisions/186-*.md` (new) | spec | doc | `spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md` (Document Control table, Context/Decision) | exact |
| `spec/decisions/140-*.md`, `111-*.md` (amend) | spec | doc | 053's dated note at `053-a-gate-can-be-found.md:80-82` ("Amended 2026-11-12 ...") | exact |
| `spec/decisions/053-*.md:81`, `103-*.md:52-55` | spec | doc | same dated-note form; 103:55 already has an italic dated parenthetical | role-match |
| `spec/decisions/index.yaml` | spec | doc | the 185 entry | exact |
| `spec/behaviors/09-react.md` (BEH-QD-701..705) | spec | doc | BEH-QD-691 block at :809-832 (Invariant/See lines, REQUIREMENT fence, "Pinned by ... (titles)") | exact |
| `spec/invariants.md` (INV-QD-391/392) | spec | doc | INV-QD-387 at :4437-4447 (Source/Implication/Enforcement/Related) | exact |
| `spec/traceability.md`, `spec/README.md` | spec | doc | CCR-QD-464 row at `spec/README.md:401` | exact |

All edits to registers go through `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-22` (never `next-id.mjs`).

## Pattern Assignments

### `GateWriter.ts` (the keyed reconcile)

Keep as is: `GateHandle.update` owns the single equality check, `GateWriter.ts:216-221`:
```ts
update: (state: GateRenderState) => {
  if (!live || current.state === state) return;
  current = { ...current, state };
  entries.set(key, current);
  changed();
},
```
Types to change (`:253-288`): drop `readonly id: string;` from `GateIdentity` (:255); `sameIdentity` (:270-275) drops `a.id === b.id &&`; delete `GateCurrent` (:283-288); add `GateWanted { identity; state }`.

Existing step to rewrite (`:304-334`) keeps these shapes, which stay: unregister-before-register, `next = new Map`, element rule:
```ts
for (const [id, entry] of live) {
  const identity = wanted.find((one) => one.id === id);   // becomes wanted.get(id)
  if (identity !== undefined && sameIdentity(identity, entry.identity)) next.set(id, entry);
  else entry.handle.unregister();                          // kept entry gains handle.update(state)
}
...
element: identity.wraps ? (identity.marker.current ?? undefined) : undefined,  // keep verbatim, with its `?? undefined` comment
```
Registration builds `{ id (the map key), kind, policy: identity.policy, resource: identity.resource, state: wanted.state, element }`. The `?? "Pending"` and `now?.` fallbacks go away.

Header docs of `GateWriter.ts` say "how a set of registrations is reconciled" and `reconcile`'s doc says "calls only register and unregister": update both (it now also calls `handle.update`).

### `useGate.ts`

Keep (:108-117) the writer-keyed teardown verbatim (declared first, reads `registered.current` at cleanup time). Replace :81-106 and :119-151 with `const registered = useRef<ReadonlyMap<string, Registered>>(new Map());` plus one `useEffect(() => { if (writer === undefined) return; registered.current = reconcile(writer, registered.current, wanted); });` with no dependency list. Remove imports `sameIdentity`, `GateRenderState` (if unused), and the `Record.values` pairing (:295-299).

`useGates` (:270-299): the `entries` pass (:270-282) already iterates the questions record once; build `wanted` in that same pass, using `grouped ? `${base}/${name}` : base` for the id. `GateRead.id` stays. `Record` import remains for `Record.map`; for the Map, use `new Map(Object.entries(...))` only if no `as`/`any` is needed (K extends string, so `Object.entries` gives `[string, V][]`, which is fine).

### `GateWriter.reconcile.test.ts`

`fakeWriter` (:19-34) already has `update` in `Call` (:15-17) and in the returned handle; only the `Call` log ordering assertions are new. Change `identity(id, overrides)` (:41-49) to return `[id, GateIdentity]` or a `wanted(...)` builder, since `GateIdentity` loses `id`. Old call shape to replace everywhere: `reconcile(writer, nothing, [a, b], [{ policy, resource, state }, ...])` (:60-223, 13 call sites). Header comment :1-9 describes the array signature and must be rewritten. `changes` table at :204 (`Partial<GateIdentity>`) stays minus any `id` row.

### `GateWriter.test.tsx`

Retarget `run` (:51-55) to build `new Map([["g1", { identity: p.identity, state: p.state }]])`; `identityFor` (:23-32) drops `id: "g1"`. Add an "equal state, zero notifications" row beside "a state change updates in place" (:63-), using `setup().notifications()`.

### Characterisation (new test)

Header shape: see `DockModel.characterisation.test.ts:1-23` (lists what rows pin and which rows live elsewhere). Rendered helpers to reuse from `GateRegistry.test.tsx`: imports :9-41; `atoms()`, `mount`, `gateInstances`, `listed`, `Group` helpers (grep in that file); notification counting via `shared.gates.subscribe(() => { notified += 1; })` (:281-290). StrictMode via `import { StrictMode } from "react"` (:25).

### Moved cases in `GateRegistry.test.tsx` (D-10)

- :281 "does NOT re-register on a render with a fresh, structurally equal policy and resource (ticket 141)" -> reconcile test (same identity keeps entry, zero register/unregister) + characterisation row.
- :664 "unregisters exactly the instance whose key was removed" -> reconcile test (id gone unregisters, others kept) + characterisation row.
- :691 "does not re-register when an equal record is rebuilt each render" -> reconcile test + characterisation row.
- Stay: `Rechecking`, markers, scoping, `useGateInstances`, :710 "registers a resource-scoped entry from useQuestions", :680 "unregisters every instance on unmount" (wiring; also a characterisation row).

### Type test

Copy `ExternalStore.tst.ts` form: tstyche `expect, test`; each refusal a `@ts-expect-error` on a held `const`; positive twin accepted call first. Pins: `reconcile(writer, live, [])` (array) refused; `GateIdentity` has no `id` (`expect<keyof GateIdentity>().type.not.toBeAssignableTo<"id">()` style or `@ts-expect-error` on a literal with `id`); `GateCurrent` not exported (`@ts-expect-error` on the import). Avoid bare negative callable pins on a plain-return `reconcile` unless adding to `NOT_CALLABLE_PIN_BUDGET` and AGENTS.md §6 table together; `reconcile` returns a plain Map, so a `not.toBeCallableWith` pin is allowed but counted.

## Shared Patterns

- **No React in `GateWriter.ts`** (ADR-QD-140): only `import type { GateState, Policy, Resource } from "@qadi/core"`.
- **Imports**: relative `.ts`, `import type` for types, no `as`/`!`/`any`/`switch`.
- **Spec records**: ADR 185 header Document Control table with Change History row; dated note style: `> **Amended 2026-11-12 (CCR-QD-427, [ADR-QD-140](./140-...md)).**` (`053:80`).
- **BEH**: `## BEH-QD-NNN: title`, `> **Invariant:**` and `> **See:**` lines, `REQUIREMENT:` fence, "Pinned by `path` ("verbatim title", ...)" (`09-react.md:809-832`). Titles must exist verbatim.
- **INV**: `Source / Implication / Enforcement / Related` (`invariants.md:4437-4447`).
- **Mutation**: 72-mutation.mjs discipline; only groups `writer`, `hook`.

## Call sites the signature change reaches (packages/, src and test, HEAD)

`GateIdentity` type (id field, :255 and every construction):
- `src/GateWriter.ts:254-255` (definition, `id`), `:270-271` (`sameIdentity` reads `a.id`/`b.id`), `:279`, `:313`, `:317` (`identity.id`), `:322` (`id: identity.id`)
- `src/useGate.ts:36` (import), `:78`, `:234` (doc), `:285-287` (`GateIdentity` literal with `id: entries[name].id`)
- `test/GateWriter.test.tsx:15` import, `:23-32` (`id: "g1"` in `identityFor`), `:47`
- `test/GateWriter.reconcile.test.ts:14` import, `:41-42` (`id` param/field), `:204` (`Partial<GateIdentity>`)

`GateCurrent`: only `src/GateWriter.ts:284` and `:308` (no other file or test imports it).

`sameIdentity`: `src/GateWriter.ts:270` (def), `:313`; `src/useGate.ts:35` (import), `:96`, `:260` (comment). No test imports it.

`reconcile(`: `src/GateWriter.ts:304` (def); `src/useGate.ts:35` (import), `:126`; `test/GateWriter.reconcile.test.ts:60, 75, 78, 100, 101, 119, 128, 134, 141, 153, 155, 172, 174, 185, 187, 194, 196, 220, 223` (plus comment :4).

`useGateRegistrations(`: `src/useGate.ts:76` (def), `:295`; `test/GateWriter.test.tsx:12`-area import (`../src/useGate.ts`) and `:52` (the `run` helper, the only call). `useGates` callers go through `useGate`/hooks, unchanged.

Docs mentioning them: `spec/decisions/053-a-gate-can-be-found.md:81`, `103-a-question-is-opened-once.md:52-55` (both name `useGateRegistrations`; neither mentions index alignment or three effects, so likely only a dated pointer if any), `spec/invariants.md` INV citing `GateWriter.useGates.test.tsx` (~:2078).

## No Analog Found

None; every file has a tracked analog (new files copy 72's equivalents).

## Metadata

**Analog search scope:** `packages/react/{src,test}`, `packages/devtools/test/model`, `.planning/phases/QD-72-*`, `spec/{decisions,behaviors,invariants.md,README.md}`
**Not read in full:** `GateRegistry.test.tsx` helper definitions (`atoms`, `mount`, `Group`), `GateWriter.useGates.test.tsx`, `72-mutation.mjs` beyond its header/GROUPS, `traceability.md`, `index.yaml` entry format. The planner must read these before editing.
**Pattern extraction date:** 2026-11-22
