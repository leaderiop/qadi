---
id: ARCH-43
title: The QadiProvider.gates override, reconsidered. Keep it (ADR-QD-080 stands), make a host-built registry report collisions like an atom set's does, and let the registry object own its writer instead of a module side table. Deleting the override is the recorded alternative
strength: Speculative       # from the 2026-10-07 architecture review (wave 4), "Speculative" section: "Delete the QadiProvider.gates override"
status: done
evidence_verified_at: e635e68
depends_on: [ARCH-37]       # the keep path's T2 routes the collision default through ARCH-37's DeveloperSignals.ts; if ARCH-37 has not landed, T2 targets HydrationWarning.ts instead (see T2)
blocks: []
adrs_touched:
  - ADR-QD-080 (keep path: amend with a dated block, a host-built registry reports collisions by default, and the writer is owned by the registry object; delete path: reopen, a superseding amendment removing the override, needs user sign-off)
  - ADR-QD-078 (constraint, decisive for D-43-b: an atom set's capabilities must survive a spread copy `{ ...atoms }`; a lookup keyed on the atom set's identity was the `UnregisteredAtoms` defect ADR-078 removed)
  - ADR-QD-039 (constraint by analogy: `hydrate` is closure-owned because it is a public capability that verifies what it does; a gate writer has nothing to verify)
  - ADR-QD-053 (constraint: a guard records that it exists; the write side stays unreachable from outside `@qadi/react`)
  - ADR-QD-041 (constraint: any console default goes through the one confinement module; see ARCH-37)
  - ADR-QD-014 / AGENTS.md §13 (constraint: the registry stays plain closure state, never an `Atom`; no decision in React state)
  - ADR-QD-037 (constraint: madge counts type-only edges; `GateWriter.ts` imports nothing local but the type-only `DecisionOutcome.ts`)
  - ADR-QD-099 (constraint: `GateWriter.ts` stays out of the barrel)
  - ADR-QD-038 (constraint: changeset, fixed version group; no release step)
packages: ["@qadi/react", "@qadi/devtools (comments only, delete path)"]
estimate: S   # keep path (T0–T3, T6–T8) ≈ ½–1 day. Delete path (T0, T1, T4–T8) ≈ 1 day (M with spec churn)
---

# ARCH-43 — The `QadiProvider.gates` override, reconsidered

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68`. The review lists this candidate in its Speculative section: *"Delete the
QadiProvider.gates override. It needs a WeakMap side table, the gateWriterFor check, a dev warning and a
caveat, and it has zero callers. ADR-QD-080 keeps it for micro-frontends, so reopen only if no such host
ever appears."* The brief adds a further claim: removing the override "lets the writer be closure-owned by
`makeQadiAtoms` like `hydrate`".

**Probe.** One throwaway vitest file, run outside the repo: `scratchpad/wave4/ARCH-43/gates.test.tsx`,
with `scratchpad/wave4/ARCH-43/vitest.config.ts` (happy-dom, `@qadi/core` aliased to core's `src`) and
`node_modules` symlinked to `packages/react/node_modules`. Command (re-runnable by T0):

```
S=/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-43
cd packages/react && ../../node_modules/.bin/vitest run --config $S/vitest.config.ts --root $S --disableConsoleIntercept 2>&1 | grep PROBE
```

Output:

```
PROBE spread-copy: copy.gates === atoms.gates: true registered: 1
PROBE atoms-keyed lookup for the copy: undefined
PROBE collision warnings: atoms.gates = 1 ; host makeGateRegistry() = 0 ; host ids: ["r0","r0~1"]
PROBE override: shared instances 2 a.asked 1 b.asked 1 a.gates 0
```

| # | Claim | Verdict | At `e635e68` |
| - | ----- | ------- | ------------ |
| C1 | The override has zero callers outside tests (examples/, features/, apps/website) | **CONFIRMED** | `rg -n "makeGateRegistry\|gates=\{\|GateRegistryOptions\|gateWriterFor\|bindGateWriter" -g '!node_modules' -g '!**/lib/**'` outside `.planning/`: `packages/react/src` (definitions and the default path), `packages/react/test/{GateRegistry.store.test.ts, GateRegistry.test.tsx, GateWriter.test.tsx}`, spec, AGENTS.md and CHANGELOGs. `examples/nextjs-newsroom/src/client/Dock.tsx:180` `gates={gates}` is **`DevtoolsDock`'s** prop (an array from `useGateInstances()`), not `QadiProvider`'s. `features/features/gate-instances/*` reads `atoms.gates` only. `apps/website/src` has no mention. Three tests use the override: `GateRegistry.test.tsx:442-453` (routes to the named registry), `:455-465` (hand-built registers nothing), `:527-536` (`useGateInstances` lists the override's guards). |
| C2 | The override needs public `makeGateRegistry`, the `GateWriter.ts` WeakMap side table, the `gateWriterFor` check, its dev warning for hand-built registries, `QadiContextValue.gates`, and a "host owns the join with asked()" caveat | **PARTLY REFUTED** | Only some of these belong to the override. **Override-only:** `QadiProviderProps.gates` (`QadiProvider.tsx:192-203`), `QadiContextValue.gates` (`:57-61`, set at `:245`), the dev warning (`:306-313`), the caveat (`:196-197`, ADR-QD-080 `:54-58`, BEH-QD-233 `28-devtools-screens.md:364`), BEH-QD-233's last REQUIREMENT (`:446-451`), public `makeGateRegistry` + `GateRegistryOptions` (`GateRegistry.ts:62-80`, `spec/overview.md:519-520`). **Not override-only:** the WeakMap (`GateWriter.ts:105`) and `gateWriterFor` (`:119-120`) are what **every** guard uses on the default path: `useGate.ts:70-73` and `hooks.ts:106-109` call `gateWriterFor(gates)` with `gates = atoms.gates`. Deleting the override deletes neither. |
| C3 | Removing the override lets the writer be closure-owned by `makeQadiAtoms`, like `hydrate` | **REFUTED** | `hydrate` is closure-owned **and public**: `QadiAtoms.hydrate` (`QadiAtoms.ts:183-187`, `:403-409`) is a capability any holder may call, and it is safe because it **verifies** what it seeds (subject, version, shape, depth; ADR-QD-039/078). The gate writer's job is to let `useGate` register a `<Can>` that exists. A public `register` on `QadiAtoms` is ADR-QD-080's rejected `registerGate` ("a consumer able to register an instance could list a `<Can>` that does not exist", `GateWriter.ts:5-8`). The only other way from the public `atoms` value to a private writer is a lookup keyed on the atom set's identity. That is what ADR-QD-078 removed for hydration, because a spread copy is a different object: the probe shows an atoms-keyed lookup returns `undefined` for `{ ...atoms }`, while today's registry-keyed lookup works for the copy (`copy.gates === atoms.gates: true registered: 1`). `examples/nextjs-newsroom/src/client/WrappedAtoms.tsx:35` spreads an atom set in production code, and `Hydration.test.ts:606, :621` do it in tests. **What deletion actually changes:** `gateWriterFor` can still miss, but only for a hand-built `QadiAtoms` double whose `gates` is hand-built. The side table stays. |
| C4 | ADR-QD-080 keeps the override deliberately, for micro-frontends | **CONFIRMED** | ADR-QD-080 Decision (`080-…md:54-58`) and Alternatives (`:96-97`: "Explicit registry only … Kept as the opt-in override above"). ARCH-06's D-06-a (`ARCH-06-gate-registry-scope.md:350-386`) recommended "2 as the default, with 3 as an opt-in override (layered)" as "the complete option", decided 2026-10-04, under the user's *prefer complete* preference. The probe's last line shows the override working end to end: two atom sets, one shared registry listing both guards, each atom set's own `gates` empty, and each `asked()` holding its own question. That is the "host owns the join" case, and it functions. |
| C5 | *(found during verification)* A host-built registry reports id collisions nowhere by default, while `atoms.gates` warns in development | **CONFIRMED (probe): a gap in the override path** | `GateRegistry.ts:62-71` (`GateRegistryOptions.onIdCollision` doc: "a registry built here reports nowhere unless this is supplied"). `QadiAtoms.ts:272-275` gives `atoms.gates` `gateIdCollisionReporter(options?.onGateIdCollision)`, a development warning by default. The probe registers `r0` twice in each: `atoms.gates` warns once, and `makeGateRegistry()` says nothing while silently renaming the second to `r0~1`. ADR-QD-080 introduced disambiguation for the "two hydrated roots" case, and the override's stated audience (a micro-frontend shell, one registry over several roots) is the host most likely to hit it. In that audience's path, the signal is off by default. **Test-first task: T2** (keep path). |
| C6 | *(found during verification)* `bindGateWriter` is package-callable with any object and any writer | **CONFIRMED (read)** | `GateWriter.ts:107-110`: `bindGateWriter(registry: object, writer: GateWriter): void => writers.set(registry, writer)`. A second call silently replaces a registry's writer. Today only `GateRegistry.ts:153` calls it, so it is not a defect. It is the reason D-43-b weighs moving the binding into the registry's constructor, where it cannot be forgotten or replaced. |

**Other facts the plan relies on.**

- `useGateInstances()` (`hooks.ts:205-220`) reads `QadiContextValue.gates`, "the effective registry … so a
  host using the override gets the right one without knowing which it is".
- `GateRegistry.store.test.ts` drives `makeGateRegistry()` directly ~20 times. It is the unit suite for
  the registry and survives either path: under the delete path `makeGateRegistry` moves out of the barrel
  but stays importable by tests from `../src/GateRegistry.ts`.
- `spec/traceability.md:158` (INV-QD-064) cites `makeGateRegistry`'s closure-local state.
- The override is three days old (ARCH-06, CCR-QD-160, 2026-10-04) and the library is 0.x, so "no caller
  yet" is weak evidence of "no use".
- Wave-4 overlap: **ARCH-37** edits `QadiProvider.tsx:302-313` (the dev warning becomes the
  `UnwritableGateRegistry` signal) and owns the module where a collision default lives. **ARCH-34** builds
  a dock feed "from the provider runtime" and will read the provider's effective registry.

## 2. Goal and success criteria

**Goal.** Settle the override honestly rather than by count of callers. The review's case for deleting
it rests on two things. One is the depth it costs (C2): only part of that is real, because the side table
and the `gateWriterFor` check serve the default path too. The other is a cleaner closure-owned writer it
would unlock (C3), and that is refuted. So the **module** in question, the gate registry, is not made
meaningfully deeper by deleting its override: one prop, one context field, one warning and one exported
factory go, the **seam** (a registry object that only `@qadi/react` can write) stays exactly as it is, and
a working **adapter** for a documented host (the micro-frontend shell) is lost. The recommended path
(D-43-a = keep) instead fixes what the override does worse than the default (C5: collisions are silent)
and moves the writer's ownership from a module-level side table into the registry object itself (D-43-b),
which gives **locality** (binding happens in one constructor and cannot be replaced) on both paths. The
delete path is planned in full as the alternative, so the choice is the user's and not the plan's.

**Success criteria (keep path, recommended).**

1. A spread copy of an atom set registers its guards in the original's `gates`, under a provider
   rendering the copy: `pnpm vitest run packages/react/test/GateRegistry.test.tsx` (T1, both paths).
2. `makeGateRegistry()` with no options warns once per colliding id in development, exactly as
   `atoms.gates` does. A supplied `onIdCollision` replaces the warning and runs in production. With
   `NODE_ENV=production` and no option, nothing is written:
   `pnpm vitest run packages/react/test/GateRegistry.store.test.ts` (T2).
3. `rg -n "new WeakMap|bindGateWriter" packages/react/src/GateWriter.ts packages/react/src/GateRegistry.ts`
   prints nothing. A registry's writer is reachable only through `gateWriterFor`, and only for a registry
   `makeGateRegistry` built (T3).
4. `GateRegistry.store.test.ts`, `GateRegistry.test.tsx`, `GateWriter.test.tsx` and the
   `gate-instances` feature pass unmodified apart from T1/T2's additions (T3).
5. `pnpm check` is green (T7).

**Success criteria (delete path, if D-43-a = A).**

1. `rg -n "gatesProp|readonly gates\?: GateRegistry|QadiContextValue[^\n]*gates" packages/react/src` prints
   nothing, and `makeGateRegistry`/`GateRegistryOptions` are gone from `spec/overview.md` and the barrel's
   surface (`node scripts/check-api-surface.mjs`).
2. Every guard writes to `atoms.gates`, `useGateInstances()` reads `atoms.gates`, and criterion 1 above
   (spread copy) still holds.
3. `pnpm check` is green.

## 3. Non-goals

- **Making the writer a public capability on `QadiAtoms`** (the literal reading of "closure-owned like
  `hydrate`"). ADR-QD-080 rejected a public write side, and nothing about this plan changes the reason
  (C3).
- **Keying the writer on the atom set.** This is refuted by probe (C3) and would recreate `UnregisteredAtoms`
  for guards.
- **A host-side helper joining several atom sets' `asked()` with one registry.** The override's caveat
  says the host owns that join. A helper (`joinAsked(atomSets)`) would make the override more useful, but
  it is new surface for a use case with no caller yet. Recorded in §9 as the trigger for revisiting.
- **The console confinement itself.** That is ARCH-37. This plan's T2 *uses* ARCH-37's module.
- **ARCH-34's dock feed.** If ARCH-34 reads the provider's effective registry, it reads
  `QadiContextValue.gates` on the keep path and `atoms.gates` on the delete path. Either way the feed
  needs no change from this plan beyond the field it reads.

## 4. Constraints

- **AGENTS.md §6.** No `as`, `!` or `any`. A registry-owned writer is read with an ES `#private` brand
  check (`#writer in registry`), which TypeScript narrows without a cast (TS ≥ 4.5; repo target `ESNext`,
  `tsconfig.base.json`). No `Record<string, unknown>`.
- **AGENTS.md §9 / ADR-QD-099.** `GateWriter.ts` stays out of the barrel. On the delete path,
  `makeGateRegistry`/`GateRegistryOptions` leave `GateRegistry.ts`'s exports reachable from the barrel.
  `GateRegistry.ts` keeps exporting the `GateRegistry` type and the three `GateInstance` types, and the
  factory moves to `GateWriter.ts` (out of the barrel) or loses its `export` from a module the barrel
  re-exports.
- **AGENTS.md §13 / ADR-QD-014.** The registry remains plain closure state (or a plain object with a
  private field), never an `Atom`. Nothing re-renders because a guard registered.
- **ADR-QD-078 / ADR-QD-039.** Any capability an atom set has must survive `{ ...atoms }`: the writer is
  found through `atoms.gates` (the same object in a copy), never through the atom set's identity.
- **ADR-QD-041 / ARCH-37.** A host-built registry's default collision warning is a console write, so it
  goes through the confinement module (`DeveloperSignals.ts` after ARCH-37 T5; `HydrationWarning.ts`'s
  existing `gateIdCollisionReporter` before it). `GateRegistry.ts` itself never calls `console`
  (`:95-97`).
- **ADR-QD-037 / `pnpm circular`.** `GateRegistry.ts` → `GateWriter.ts` (exists) and `GateRegistry.ts` →
  `HydrationWarning.ts`/`DeveloperSignals.ts` (new for T2; that module imports only `SeededDecision.ts`
  and core, so no cycle). `GateWriter.ts` still imports nothing local but the type-only
  `DecisionOutcome.ts`.
- **Budgets.** No `switch`, `fnUntraced`, `Schema.TaggedError`, `any` or `hasCustom` is added. Gate 4 is
  otherwise unaffected. ARCH-37's proposed `no-ambient-console` rule (if signed off) is satisfied because T2
  calls the confinement module.
- **Gate 13.** The keep path changes no export name. The delete path removes two rows (`spec/overview.md:519-520`)
  and changes the `QadiContextValue`/`QadiProviderProps` descriptions.
- **Breaking changes need user sign-off.** The delete path removes public API. The keep path's T2 changes a
  default (a development-only console line where there was none), which is not breaking.

## 5. Decisions needed before work starts

### D-43-a — Reopen ADR-QD-080 and delete the override?

- **(A) Delete** `QadiProviderProps.gates`, `QadiContextValue.gates`, the dev warning, the public
  `makeGateRegistry`/`GateRegistryOptions`, BEH-QD-233's "a registry not built by `makeGateRegistry`"
  requirement, and the caveat. **Breaking** for `@qadi/react` (0.x minor), and it reopens a three-day-old
  ADR. Gain: about 25 lines of source, one requirement, three tests, and one fewer concept for a reader of
  `QadiProvider`. It does **not** remove the side table or `gateWriterFor` (C2, C3). A micro-frontend
  shell would then have to subscribe to N atom sets' `gates` and merge them itself. That is possible
  (each `atoms.gates` is public) but every such host would write it.
- **(B) Keep the override, and make it as good as the default path** (recommended): T2 (a host-built
  registry warns on collision by default, C5) and T3 (D-43-b, the writer owned by the registry object). Not
  breaking. ADR-QD-080 is amended rather than reopened.
- **(C) Keep it unchanged.** C5's silent-collision gap stays in exactly the multi-root case the override
  exists for.

**Decided (2026-10-08, recommended default): B.** The review's own condition ("reopen only if no such host ever appears") cannot be
met three days after the feature shipped. The strongest argument for deletion (a closure-owned writer) is
refuted. The user's standing preference (complete over simple, layered modes) is what ARCH-06 applied when
it kept the override. **Revisit trigger,** written into ADR-QD-080's amendment: at the first 1.0 API review,
if no host passes `gates`, or earlier if ARCH-34's provider-runtime dock feed finds the "effective
registry" indirection is the only thing complicating it. `status: decided (2026-10-08, recommended default) = B keep`

### D-43-b — Who owns a registry's writer? (both paths)

- **(A) Status quo:** a module-level `WeakMap<object, GateWriter>` in `GateWriter.ts`, bound by
  `bindGateWriter` from `makeGateRegistry`. It works, it survives spreads of the atom set, and it is
  unreachable from outside. But binding is a separate call that can be forgotten or repeated (C6).
- **(B) The registry object owns it.** A non-exported `class OwnedGateRegistry implements GateRegistry`
  in `GateWriter.ts` holds `readonly #writer: GateWriter` set in its constructor. `instances`/`subscribe`
  are arrow-function fields, so they keep stable identity for `useSyncExternalStore`.
  `gateWriterFor(registry: object): GateWriter | undefined` becomes
  `OwnedGateRegistry.writerOf(registry)` (`#writer in registry ? registry.#writer : undefined`), which is
  a language-level brand check with no cast. `makeGateRegistry` constructs one. `bindGateWriter` and the
  `writers` table are deleted. Semantics are identical to (A) (an ES private field is a per-object
  private slot), reflection cannot reach it, and a spread copy of a *registry* still has no writer.
- **(C) Key the writer on the atom set.** Refuted by probe (C3): it breaks `{ ...atoms }`.
- **(D) A public writer capability on `QadiAtoms`** (the literal "like `hydrate`"). Rejected by
  ADR-QD-080's rationale (C3).

**Decided (2026-10-08, recommended default): B.** It is a modest gain in locality, honestly stated: the binding cannot be forgotten
or replaced, and the module has no mutable module-scope state. It is the strongest form of "closure-owned"
that the constraints allow, and it applies whether or not the override survives. It introduces the
package's first non-error class. If that is unwelcome, (A) is acceptable, and T3 is then dropped with no
other consequence. `status: decided (2026-10-08, recommended default) = B`

### D-43-c — (delete path only) Where does `makeGateRegistry` go?

- **(A) Move it into `GateWriter.ts`** (out of the barrel), beside the writer type. `QadiAtoms.ts` and
  tests import it from there. `GateRegistry.ts` keeps only the public read-side types.
- **(B) Keep it in `GateRegistry.ts` without `export`**, and have `makeQadiAtoms` call a package-internal
  `makeOwnedGateRegistry` exported from `GateWriter.ts`.

**Recommendation: (A).** Every write-side thing is then in one out-of-barrel module. `status: moot (D-43-a = B)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done (2026-10-08)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/43-gates-override main`. Record `git rev-parse --short HEAD` in §10.
  2. `git diff --stat e635e68 HEAD -- packages/react/src/{GateRegistry.ts,GateWriter.ts,QadiProvider.tsx,QadiAtoms.ts,useGate.ts,hooks.ts}`.
     If ARCH-37 landed, `HydrationWarning.ts` is `DeveloperSignals.ts` and `QadiProvider.tsx:306-313` raises
     `UnwritableGateRegistry`. Re-target T2 and T4 accordingly. If ARCH-34 landed, read how the dock feed
     reads the registry before T4.
  3. Re-run §1's probe (command in §1; re-create the symlink if the scratchpad was cleaned). Expect the four
     `PROBE` lines.
  4. Re-run C1's `rg`. If a caller of `QadiProvider gates=` has appeared, record it in §10. That settles
     D-43-a toward keep.
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §1 is re-confirmed or corrected in §10.

### T1 — Pin: a spread copy of an atom set registers its guards (both paths)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0. No decision.
- **Files:** `packages/react/test/GateRegistry.test.tsx`.
- **Steps:**
  1. In the `describe` that holds `"the \`gates\` prop routes registration…"` (`:442`), add
     `it("a spread copy of an atom set writes to the original's registry")`. Build `const set = atoms()`
     and `const copy = { ...set }`, render `<QadiProvider atoms={copy} subject={alice} instrument><Can policy={canRead}>allowed</Can></QadiProvider>`,
     and assert `set.gates.instances()` has length 1 and `copy.gates` is `set.gates`.
  2. This is green today. It is a pin, not a red test: it is the property that any writer redesign must
     keep (C3), and no test states it today (`rg -n "\.\.\.set\|\.\.\.atoms" packages/react/test/Gate*` is empty).
- **Tests:** one new test.
- **Verify:** `pnpm vitest run packages/react/test/GateRegistry.test.tsx`.
- **Done when:** green.

### T2 — Test-first: a host-built registry reports a collision by default (C5; keep path)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0, D-43-a (= B). Prefer after ARCH-37 T5. If ARCH-37 has not landed, use
  `HydrationWarning.ts`'s existing `gateIdCollisionReporter`, which has the same signature.
- **Files:** `packages/react/test/GateRegistry.store.test.ts`, `packages/react/src/GateRegistry.ts`,
  `packages/react/src/QadiAtoms.ts`.
- **Steps:**
  1. In `GateRegistry.store.test.ts`'s `describe("scope and collisions")` (`:164`), add
     `it("a registry built with no options warns once per colliding id in development")`: spy on
     `console.warn`, `makeGateRegistry()`, register `x` three times through `writerOf`, and assert one warning
     containing `"identifierPrefix"`. **Red** today (0 calls).
  2. Add `it("…says nothing in production unless onIdCollision is supplied")`: set `NODE_ENV=production`,
     restore it in `finally`, and assert 0 warnings. Then `makeGateRegistry({ onIdCollision })` is still
     called. This is green after the fix, the same rule as every other signal.
  3. Fix: in `makeGateRegistry`, resolve `const report = gateIdCollisionReporter(options?.onIdCollision)`
     once, and call `report?.(instance.id)` where `:113` calls `options?.onIdCollision?.(…)`. `QadiAtoms.ts:272-275`
     then passes `options?.onGateIdCollision` straight through:
     `makeGateRegistry(options?.onGateIdCollision === undefined ? {} : { onIdCollision: options.onGateIdCollision })`
     (no double resolution).
  4. Update `GateRegistryOptions.onIdCollision`'s doc (`:63-69`): "Defaults to a development-mode warning,
     like an atom set's own registry; a supplied callback replaces it and runs in production."
  5. Confirm `GateRegistry.store.test.ts:173-184` (`onIdCollision` supplied: reports `["x"]`) passes
     unmodified, and that the existing store tests that collide ids without options do not now spam the
     test log. Wrap any such test's body in a `console.warn` spy if needed, and note it in §10.
- **Tests:** two new tests, the first red-first.
- **Verify:** `pnpm vitest run packages/react/test/GateRegistry.store.test.ts packages/react/test/GateRegistry.test.tsx`; `pnpm circular`.
- **Done when:** green. This can ship alone as an `@qadi/react` patch: "a registry from `makeGateRegistry()`
  now warns on an id collision in development, as an atom set's does".

### T3 — The registry object owns its writer (D-43-b = B; both paths)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1, D-43-b (= B)
- **Files:** `packages/react/src/GateWriter.ts`, `packages/react/src/GateRegistry.ts`,
  `packages/react/test/GateRegistry.store.test.ts` (no change expected), `packages/react/test/GateWriter.test.tsx`.
- **Steps:**
  1. In `GateWriter.ts`, replace `writers`/`bindGateWriter`/`gateWriterFor` (`:100-120`) with a non-exported
     `class OwnedGateRegistry` whose constructor takes `{ instances, subscribe, register }`, stores
     `#writer = { register }`, and assigns `readonly instances` and `readonly subscribe` as the given
     functions (stable identity). Add an exported `makeOwnedGateRegistry(parts): GateRegistry`. Keep
     `export const gateWriterFor = (registry: object): GateWriter | undefined => OwnedGateRegistry.writerOf(registry)`,
     where `static writerOf(r: object) { return #writer in r ? r.#writer : undefined }` narrows `r`.
     Exporting `gateWriterFor` by name keeps `useGate.ts`, `hooks.ts` and `QadiProvider.tsx` untouched.
     `GateRegistry` (the interface) must be importable here without a cycle, so declare
     `interface GateRegistry` in `GateWriter.ts` and re-export it from `GateRegistry.ts`
     (`export type { GateRegistry } from "./GateWriter.ts"`), the same pattern `GateInstance` already uses
     (`GateRegistry.ts:46`).
  2. `makeGateRegistry` (`GateRegistry.ts:80-155`) keeps its closure state and returns
     `makeOwnedGateRegistry({ instances, subscribe, register })`. Delete `bindGateWriter` and its import.
  3. Module docs: `GateWriter.ts`'s header (`:10-17`) now says the writer is a private slot of the registry
     object, set once at construction, so it cannot be bound twice or forgotten. Keep the ADR-QD-078 analogy
     and say why the slot is keyed on the registry and not the atom set (a spread copy shares the registry).
  4. A `typeof`/`Object.keys` check in a test: `Object.getOwnPropertyNames(registry)` and
     `Object.getOwnPropertySymbols(registry)` expose neither `register` nor a writer (add to
     `GateRegistry.store.test.ts`'s `"a hand-built registry has no writer"` neighbour).
- **Tests:** one new reflection test. All existing gate tests unmodified.
- **Verify:** `pnpm vitest run packages/react/test`; `pnpm typecheck`; `pnpm circular`; `pnpm test:tstyche`; `node scripts/check-house-style.mjs`; criterion 3's `rg`.
- **Done when:** green and the `rg` is empty.

### T4 — Delete the override (D-43-a = A only; breaking)
- **Status:** [-] dropped (D-43-a = B, keep; delete path not taken)
- **Depends on:** T1, D-43-a (= A, with user sign-off), D-43-c
- **Files:** `packages/react/src/QadiProvider.tsx`, `packages/react/src/GateRegistry.ts`,
  `packages/react/src/GateWriter.ts`, `packages/react/src/QadiAtoms.ts`, `packages/react/src/useGate.ts`,
  `packages/react/src/hooks.ts`, `packages/react/test/GateRegistry.test.tsx`,
  `packages/react/test/GateRegistry.store.test.ts`, `packages/react/test/GateWriter.test.tsx`,
  `packages/devtools/src/**` (comments only: `rg -n "gates prop\|override" packages/devtools/src`).
- **Steps:**
  1. `QadiProvider.tsx`: delete `QadiProviderProps.gates` (`:192-203`), the `gates: gatesProp` destructure
     and `const gates = …` (`:241`, `:245`), the dev-warning effect (`:306-313`; after ARCH-37 it is the
     `UnwritableGateRegistry` raise, so delete that union member in ARCH-37's module in the same commit),
     `QadiContextValue.gates` (`:57-61`), and `gates` from the memoised value (`:354-357`).
  2. `useGate.ts:57`, `hooks.ts:96`, `hooks.ts:217-219`: read `atoms.gates` from the context's `atoms`.
     Update `useGateInstances`'s doc (`:205-214`), deleting the "override" sentence.
  3. D-43-c(A): move `makeGateRegistry` and `GateRegistryOptions` into `GateWriter.ts`. Drop
     `GateRegistryOptions` entirely if `onIdCollision` becomes a plain parameter, since only
     `QadiAtoms.ts` calls it. `GateRegistry.ts` keeps the public `GateRegistry` interface and the three type
     re-exports. Update `QadiAtoms.ts:42` and the three test files' imports.
  4. Tests: delete `GateRegistry.test.tsx:442-453` and `:527-536` (override routing and listing). Rewrite
     `:455-465` as "a `QadiAtoms` double with a hand-built `gates` registers nothing and renders no marker"
     (`{ ...atoms(), gates: { instances: () => [], subscribe: () => () => {} } }`), because that is the
     remaining way `gateWriterFor` can miss.
  5. Decide, and record in §10, whether that remaining miss still deserves a development warning. The
     recommendation is no: it only happens with a hand-written test double, whose author built the
     `gates` field on purpose.
- **Tests:** two deleted, one rewritten, T1 kept.
- **Verify:** `pnpm vitest run packages/react/test packages/devtools/test`; `pnpm --filter @qadi/example-nextjs typecheck`; `pnpm typecheck`; `pnpm circular`; `node scripts/check-api-surface.mjs`.
- **Done when:** green and the delete-path criteria in §2 hold.

### T5 — Spec, ADR, overview, traceability, CCR, docs, changeset
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2–T3 (keep) or T3–T4 (delete)
- **Files:** `spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md`, `spec/behaviors/28-devtools-screens.md`
  (BEH-QD-233), `spec/invariants.md` (INV-QD-064 `:2490`, INV-QD-046), `spec/traceability.md` (`:158`),
  `spec/overview.md` (`:502-503`, `:519-520`), `spec/README.md` (CCR register), `AGENTS.md` §13 (delete path
  only, `:683`, `:695`; needs maintainer approval), `packages/react/README.md`, `.changeset/*` (*new*).
- **Steps:** every edit is in §8. Then run `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs`
  (BEH-QD-233's `ts` fence changes), `node scripts/check-devtools-claims.mjs` (gate 12: `spec/devtools-spec/02-screens.md`
  mentions the registry), and `pnpm spec:verify:strict`.
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates`.
- **Done when:** all pass.

### T6 — Full gate
- **Status:** [-] dropped (full pnpm check and mutation not run by the implementer; ran typecheck, lint, house-style, circular, api-surface, tstyche, packages/react vitest, spec:api/examples/verify:strict/gates)
- **Depends on:** T5
- **Files:** none.
- **Steps:** `pnpm check`. No Stryker config mutates `GateRegistry.ts`/`GateWriter.ts`
  (`stryker.react.mjs` mutates `DecisionOutcome.ts` and `QuestionBook.ts` only), so coverage (react ≥ 90%)
  and the unit tests are the guard. The `#writer in r` false branch is covered by `"a hand-built registry
  has no writer"` (`GateRegistry.store.test.ts:197-201`).
- **Verify:** `pnpm check`.
- **Done when:** green.

### T7 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T6
- **Files:** `.planning/architecture/ARCH-43-gates-override.md`.
- **Steps:** set `status: implemented` (or `dropped` if D-43-a = C and D-43-b = A, which leaves only T1),
  tick tasks, record SHAs and assigned CCR numbers in §10, and hand the README row to the orchestrator.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-43-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Both paths:** T1 pins the spread-copy property (the reason C3 is refuted). `GateRegistry.store.test.ts`
  remains the registry's unit suite (it imports `makeGateRegistry` from `../src`, so it works whether or not
  the barrel exports it). The ~20 model-based and example tests there are the regression net for T3's
  ownership change and must pass unmodified.
- **Keep path:** T2 adds the default-warning pair (red-first and the production case). T3 adds one
  reflection test. Nothing is deleted.
- **Delete path:** two override tests are deleted (their behavior is gone, not moved). The hand-built case
  is rewritten onto a `QadiAtoms` double, the remaining way a writer can be missing. `gate-instances.feature`
  is unaffected (it never used the override).
- **Mutation:** none of the touched files is in a Stryker config. If the user wants `GateWriter.ts` under
  mutation, that is an amendment of `stryker.react.mjs` and ADR-QD-093's scoping argument, out of scope here.

## 8. Spec and documentation updates

**Keep path (recommended).**

- **ADR-QD-080:** a dated amendment block (CCR-QD-NEXT). (1) A registry from `makeGateRegistry()` reports
  collisions by default, as an atom set's does: a development warning through the confinement module,
  replaced by `onIdCollision`. (2) The writer is a private slot of the registry object, set at construction,
  in place of the `GateWriter.ts` side table. (3) The override is kept, reconsidered under ARCH-43 with the
  reasoning of §1 C2/C3. Revisit at the 1.0 API review if no host passes `gates`. Add a revision row (1.1).
- **BEH-QD-233:** the `ts` fence's `makeGateRegistry` comment says the default reporter warns in
  development. Add a REQUIREMENT: "A registry built by `makeGateRegistry` MUST report a colliding id once,
  through `onIdCollision` when supplied, otherwise by a development-mode warning." The existing
  "not built by `makeGateRegistry`" requirement stays.
- **INV-QD-064:** Source names the registry-owned writer (`GateWriter.ts`'s `OwnedGateRegistry`). The
  Enforcement gains T1's and T3's tests. `spec/traceability.md:158` likewise.
- **`spec/overview.md`:** no export changes. `GateRegistryOptions`'s row may gain "defaults to a
  development warning". Add a revision row.
- **`packages/react/README.md`:** where the override is documented, the collision default.
- **Changeset:** `@qadi/react` patch (default collision warning on host-built registries; internal
  ownership change).

**Delete path.**

- **ADR-QD-080:** a superseding amendment block. The override is removed, and the original paragraph is
  kept in a `> **Superseded in CCR-QD-NEXT.**` blockquote. Rationale: no caller, and the micro-frontend
  shell subscribes to each atom set's `gates`. Revision 2.0, **Breaking**.
- **BEH-QD-233:** remove the `QadiProviderProps.gates?` line from the fence and the
  "not built by `makeGateRegistry`" requirement (into a superseded blockquote). Restate: "A guard MUST be
  listed by its atom set's registry, `atoms.gates`, and no other."
- **INV-QD-064:** "the registry its provider writes to" becomes "its atom set's registry". The title is
  kept for anchor stability, with a note. INV-QD-046's "foreign `gates` registry" clause is removed.
- **`spec/overview.md`:** remove the `makeGateRegistry` and `GateRegistry, GateRegistryOptions` rows
  (`GateRegistry` stays as a type row). The `QadiContextValue` description loses `gates`.
- **AGENTS.md §13** (`:683`, `:695`): `makeGateRegistry` is no longer public, so the sentence is reworded
  to "each atom set's `gates` registry". This needs maintainer approval.
- **CHANGELOG via changeset:** `@qadi/react` minor, **Breaking**: "`QadiProviderProps.gates`,
  `QadiContextValue.gates`, `makeGateRegistry` and `GateRegistryOptions` are removed. A host wanting one
  view over several atom sets subscribes to each `atoms.gates`." Include the exact migration.
- **CCR register:** CCR-QD-NEXT.

## 9. Risks and rollback

- **The keep path adds a console line** where a host-built registry was silent. It is development-only and
  replaceable. A test suite that collides ids on purpose without `onIdCollision` sees a warning, so T2
  step 5 checks the repo's own.
- **The first non-error class in `@qadi/react`** (D-43-b = B). It is a style surprise, not a correctness
  risk. Rollback is reverting T3 alone, which leaves the WeakMap path, unchanged and correct.
- **Delete path: a host that adopted `gates=` since `e635e68`** breaks at compile time. T0 step 4
  re-checks callers. A compile error is the right failure for a removed prop (ADR-QD-080's own
  "breaking, with no shim" precedent).
- **The decision is premature either way.** Three days of availability says nothing about micro-frontend
  adoption. The keep path keeps the option open at almost no cost, and the delete path is reversible only by
  re-adding API. That asymmetry is part of why keep is recommended.
- **Overlap.** ARCH-37 T6 rewrites `QadiProvider.tsx:302-313`, the warning this plan's T4 deletes. Order:
  **if D-43-a = A, land ARCH-43 T4 before ARCH-37 T6**, so ARCH-37 never adds `UnwritableGateRegistry`.
  Otherwise land ARCH-37 first and this plan's T2 uses `DeveloperSignals.ts`. ARCH-34 (provider-runtime
  dock feed) reads the effective registry. On the keep path it reads `QadiContextValue.gates`; on the
  delete path, `atoms.gates`. Whichever lands second rebases. ARCH-06 (done) is the plan this one amends.
- **Rollback.** T1 is a test. T2 reverts alone (default back to silent). T3 reverts alone. T4 reverts as one
  commit with its T5 spec changes.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence verified at `e635e68` with `scratchpad/wave4/ARCH-43/gates.test.tsx`; the review's "closure-owned like `hydrate`" claim refuted (C3) | planner |
| 2026-10-08 | T0 | worktree base 5ceaf86 (ARCH-37 present, `DeveloperSignals.ts` exists). Re-confirmed no `gates=` callers; probe not re-run, replaced by T1's pin | implementer |
| 2026-10-08 | T1 | `a spread copy of an atom set writes to the original's registry` added (green, a pin) | implementer |
| 2026-10-08 | T2 | red: `a registry built with no options warns once per colliding id in development` (0 warn calls). Fixed via `gateIdCollisionReporter` in `makeGateRegistry`; `QadiAtoms` passes the raw option through. Production test added. No existing test spammed | implementer |
| 2026-10-08 | T3 | `OwnedGateRegistry` (ES `#writer`) in `GateWriter.ts`; WeakMap and `bindGateWriter` removed; `GateRegistry` interface now declared in `GateWriter.ts` and re-exported. Reflection test added | implementer |
| 2026-10-08 | T4 | dropped (D-43-a = B) | implementer |
| 2026-10-08 | T5 | ADR-QD-080 amendment (Rev 1.2), BEH-QD-233 (Rev 1.7), INV-QD-064 (1.71), traceability 1.111, README CCR-QD-250, changeset `gate-registry-collision-default.md` (patch). INV number unused (no new invariant) | implementer |
| 2026-10-08 | T6/T7 | partial gate run, see T6; commit 63e1a15 on branch `worktree-agent-a6c8c868ee396d827` | implementer |
