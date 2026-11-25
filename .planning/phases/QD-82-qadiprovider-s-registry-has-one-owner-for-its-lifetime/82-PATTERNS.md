# Phase 82: QadiProvider registry lifetime - Pattern Map

**Mapped:** 2026-11-25
**Files analyzed:** 11 new/modified (plus spec docs)
**Analogs found:** 11 / 11 (all paths git-tracked)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/react/src/RegistryLease.ts` (new) | utility (headless state machine, injected timer) | event-driven | `packages/react/src/SweepScheduler.ts` | exact |
| `packages/react/test/RegistryLease.test.ts` (new) | test | event-driven | `packages/react/test/SweepScheduler.test.ts` | exact |
| `packages/react/src/QadiProvider.tsx` (mod, :217-223, :257-261, :285-299) | component/provider | request-response | itself (current code) | n/a |
| `packages/react/test/QadiProvider.lifetime.test.tsx` (new) | test (rendered) | event-driven | `packages/react/test/QadiProvider.sweep.test.tsx` (P4, :136-163) + `QadiProvider.seed.test.tsx` SD3 (:118) | role-match |
| `packages/react/test/edges.test.tsx` (mod :257) | test | request-response | same file `describe("provider lifetime")` | n/a |
| `stryker.react.mjs` (mod) | config | batch | itself | n/a |
| `.planning/phases/QD-82-.../82-check.mjs` | script | batch | `.planning/phases/QD-81-.../81-check.mjs` | exact |
| `.planning/phases/QD-82-.../82-mutation.mjs` | script | batch | `.planning/phases/QD-81-.../81-mutation.mjs` | exact |
| `.changeset/<react-...>.md` (new, patch) | config | n/a | `.changeset/react-feed-hands-questions.md` | format-match |
| `spec/decisions/195-...md` (new ADR) + amendments to 014/103/148/149 | doc | n/a | `spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md` | exact |
| `spec/behaviors/09-react.md`, `spec/appendices/react-integration.md`, traceability, `spec/README.md` | doc | n/a | revise via `scripts/spec-revise.mjs` | n/a |

## Pattern Assignments

### `packages/react/src/RegistryLease.ts` (utility, event-driven)

**Analog:** `packages/react/src/SweepScheduler.ts`

**Header doc shape** (lines 1-17): one-line summary, then why (ADR cite), then "Out of the barrel (AGENTS.md §9): `X` is its one caller". Copy this: state that the provider is the one caller, that no React is imported, ADR-QD-195.

**Imports** (lines 18-19): `import * as Effect from "effect/Effect"; import type * as Fiber from "effect/Fiber";`. The lease needs only `import * as Match from "effect/Match"` (D-23); no React, no `QadiProvider`.

**Injected-effect-seam pattern** (lines 21-22, 42-45): a named exported function type plus a defaulted last parameter.
```ts
export type SweepFork = (effect: Effect.Effect<void>) => Fiber.Fiber<void>;
export const makeSweepScheduler = (
  sweep: () => void,
  fork: SweepFork = (effect) => Effect.runFork(effect),
): SweepScheduler => {
```
Mirror: `export type Defer = (run: () => void) => () => void` (returns cancel), `makeRegistryLease(recycle: () => void, defer: Defer = (run) => { const t = setTimeout(run, 0); return () => clearTimeout(t); })` returning `{ hold, release }`. Optionally a state probe like `pending` (line 66) for tests.

**Closed lifecycle, clear before work, throw cannot wedge** (lines 46-67): state is cleared before `sweep()` runs; a throwing fork resets state then rethrows. Apply: set state to `Unheld` before calling `recycle()`; if `defer` throws in `release`, restore the prior state and rethrow.

**Dispatch:** AGENTS.md §5a, hoisted `Match.type<State>().pipe(Match.tagsExhaustive({...}))` at module scope for `Unheld | Held | Releasing{cancel}`. The state is a `let` inside the builder closure (as `pending` is, line 46), never module scope (MODULE_STATE_BUDGET). Hoisted-Match arms that need `cancel` take the state as the argument.

No `as`, `!`, `any`, `switch`.

### `packages/react/test/RegistryLease.test.ts` (test)

**Analog:** `packages/react/test/SweepScheduler.test.ts`

**Header** (lines 1-8): doc comment saying "plain functions and a recording fake: no atoms, no React", naming the rule it is the normative home of.
**Imports** (lines 9-18): `import { describe, expect, it } from "vitest"`; src imports with `.ts`; `import { settle } from "./support/settle.ts"`. For real-macrotask test (D-23) use `await new Promise(r => setTimeout(r, 5))` is forbidden-style in src but tests may; prefer reusing `settle()` only if a macrotask-based turn is enough, otherwise a real `setTimeout` wait.
**Recorder pattern** (lines 26-34): a `recorder()` helper returning the log and the injected seam; here a manual defer that stores `run` callbacks and a `cancelled` list so each test fires the timer by hand.
**Test naming:** `it("C1 ...")`, `describe("makeSweepScheduler")`. Each titled case is a claim; cover: hold/release/hold in one tick recycles nothing, release then fire recycles once, double release one timer, release during Releasing no-op, hold when Unheld, recycle that throws does not wedge, `cancel` is called on hold-while-releasing (kills the removed-`cancel()` mutant), one default-defer run.

### `packages/react/src/QadiProvider.tsx` (modify)

Current code to replace:
- `:217-223` registry in `registryRef`, built with `initialValues: [[atoms.subject, subject] as const, ...(initialValues ?? [])]`. Keep the construction, drop `| undefined` nulling; keep `??=`.
- `:257-261` subject effect `registry.get(atoms.subject) !== subject` then `registry.set(atoms.subject, subject)`. The re-seed copies this exact public call (D-23).
- `:285-299` the `disposeTimer` effect: the pattern to replace. The replacement keeps its shape (one `useEffect`, setup cancels, cleanup defers), expressed as `lease.hold()` in setup and `return () => lease.release()`.
- `atomsIdentityRef` (:242-247) and `signalRef` (:210-211) are the in-file precedent for "latest value in a ref, written in an effect, never read as a dependency". Use that for D-11's `latest = { atoms, subject }` ref, written in an effect (not render).
- Lease built once per registry: `useRef` lazy init beside `registryRef`.

### `packages/react/test/QadiProvider.lifetime.test.tsx` (new, rendered)

**Analog:** `packages/react/test/QadiProvider.sweep.test.tsx`

**Imports** (lines 11-21):
```tsx
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { Activity, StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Can, QadiProvider, makeQadiAtoms } from "../src/index.ts";
import { withSweepFork } from "../src/SweepScheduler.ts";
import { settle } from "./support/settle.ts";
import { makeSweepCounter } from "./support/sweepCounter.ts";
```
**Fixtures** (lines 22-45): `canRead`, `reader`, and `countedAtoms(max)` returning `{atoms, counter, askedAtFork, reset}` (reuse via copy or lift into `support/`).
**Activity hide/show** (lines 136-150, P4): `ui(mode)` helper with `<Activity mode={mode}>` over the provider, `rerender(ui("hidden"))`, `rerender(ui("visible"))`. Weakness to fix, per CONTEXT: P4 shows in the same tick. The new test must `await` a real macrotask past the release timer between hide and show (use `await new Promise((r) => setTimeout(r, 10))` inside `act`), and wrap in an error boundary plus a captured `console.error` spy (D-24). SD3 (`QadiProvider.seed.test.tsx:118-127`) is the stateful-parent variant (`mode` state) to copy for the parent-with-`mode` shape; read it before writing (not excerpted here).
**Sweep bound assertions** (lines 152-163): `counter.counts.forks`, `.sweeps`, `.sweepsAtFork`, `askedAtFork`, `atoms.asked().map((q) => q.policy)`.
**StrictMode** (QadiProvider seen in `edges.test.tsx` "survives a StrictMode double mount", ~:243-254): `<StrictMode><QadiProvider atoms={working} subject={reader}><Probe/></QadiProvider></StrictMode>` with `useSubject()` probe.
Spec-gate rules: no exact `"qadi_*"` metric ids or span-key literals in the file; no plan-local ids (`D-NN`) in titles.

### `packages/react/test/edges.test.tsx:257` (rewrite)

Current test (lines 257-267) renders, unmounts and asserts `document.body.textContent` is `""`: vacuous. Replace with D-20: seed a `keepAlive` host atom through `initialValues`, capture the registry from `RegistryContext` via a probe component, unmount, wait past the timer, then read the atom from the captured registry and expect the default (skipped release reads the seed; `dispose()` throws). Keep the `Probe` and `waitFor(... "u1")` setup lines from the existing test.

### `stryker.react.mjs` (modify)

- Add `"packages/react/src/RegistryLease.ts"` to the `mutate` array (:57-62 list).
- Extend the header prose (lines 1-24) with one sentence in the style of the existing ones: "`RegistryLease.ts` is the one place a registry's lifetime is decided, so a surviving mutant there is a registry released twice, never released, or released while held (ADR-QD-195)." Add `RegistryLease.test.ts` to the covering-tests sentence (lines 26-31).

### `82-check.mjs` (phase-local)

**Analog:** `.planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-check.mjs` (624 lines).
Copy: header comment of modes (lines 1-15); `D` dir const and `EVIDENCE`/`SUMMARY` paths (:22-26, change `81-` to `82-`); `fail`, `git`, `sorted`, `scratch` (`qd81` becomes `qd82`) (:30-36); `phaseBaseOf` and `readBase` (:38-47); `judgeTrailer` / `judgeCommit` (:49-67); plus its `base`, `commit`, `unchanged`, `seen-failing`, `scan-ids`, `scan-forbidden`, `trailers`, `--self-test` modes. Replace `PLAN_SUBJECT` with `[(]82-[0-9]{2}[)]`. Drop `single-source` (81-specific `callAll`) or re-aim it at "the lifetime rule is written once, in `RegistryLease.ts`" (no `setTimeout`/`dispose(` left in `QadiProvider.tsx`). Phase 82 base is `d8b8bfa3`-lineage; record the head at phase start. Every judge must be shown failing once through `--self-test` (D-03).

### `82-mutation.mjs` (phase-local)

**Analog:** `81-mutation.mjs` (361 lines). Copy the header contract (lines 1-18), imports (:19-22), `D`, `dirtyReasons`, `gitStatus`, `hunks`, `mapLine`, the removed-mutant compare and `--self-test`. Change only config blocks:
```js
const REACT = { config: "stryker.react.mjs", report: "reports/mutation-react/mutation.json" };
const FILES = ["DecisionOutcome","QuestionBook","HydrationEvent","SweepScheduler","RegistryLease"].map((n) => `packages/react/src/${n}.ts`);
const GROUPS = { react: { ...REACT, files: FILES } };
const UNMEASURED = ["packages/react/src/QadiProvider.tsx"]; // renders; pinned by rendered tests
```
Base is recorded over the four existing files before any source edit (`RegistryLease.ts` not yet existing: the base group must list only the four; the close adds the fifth). Close bar for `RegistryLease.ts` is absolute: no Survived, NoCoverage or Ignored (not relative to a base). Outputs `82-mutation-base.json`, `82-mutation-close.json`. Invocation: `pnpm exec stryker run stryker.react.mjs --mutate <files>` with stdin closed.

### `.changeset/<name>.md`

**Analog:** `.changeset/react-feed-hands-questions.md` (frontmatter `"@qadi/react": minor` plus bolded lead and short paragraphs). Use `"@qadi/react": patch`, no **Breaking**, and drop the upgrade-guide line. Body states: hidden-long-then-shown no longer throws `registry is disposed`; one registry per provider; after a long hide seed grants are not re-applied (gates show Pending then the client's answer); a host's own direct `registry.subscribe` is detached by the recycle. Check the file name style (`react-<kebab-sentence>.md`).

### `spec/decisions/195-<kebab-title>.md`

**Analog:** `spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md`
Copy the Document Control block (lines 3-14): `Document ID | QADI-ADR-195`, `Revision | 1.0`, `Effective Date`, `Status | Accepted — amends ADR-QD-014, ADR-QD-103, ADR-QD-148 and ADR-QD-149`, Author, Classification, and `Change History | 1.0 (2026-11-25): Initial (ARCH-129, CCR-QD-474)`. Then `## Context` listing numbered defects with the RED test titles and their failure text, quoting the commit order from `82-RED-EVIDENCE.md`. Add an entry in `spec/decisions/index.yaml`. Amendments to 014/103/148/149 are dated entries keeping past text (see 149's `Change History` line 13: "Amendment: ... (ADR-QD-155, CCR-QD-433)"). Spec edits only through `node scripts/spec-revise.mjs <doc> "<change (CCR-QD-474)>" --date 2026-11-25`, verified with `node scripts/spec-revise.mjs --check`. Never `next-id.mjs`.

## Shared Patterns

### Headless seam style
**Source:** `packages/react/src/SweepScheduler.ts:42-67`. Closure-held state inside the builder, injected effectful seam with real default, state reset before the work runs, tests drive it with a recorder. Apply to the lease and its test.

### Forbidden forms (AGENTS.md §5a, §6)
No `switch` (use hoisted `Match.tagsExhaustive`), no `as`/`!`/`any`/`Record<string, unknown>`, no module-scope `let`, no `Date.now`/`console.*` in src, `import * as X from "effect/X"` with `.ts` relative extensions, `import type` for types.

### Out of the barrel
`packages/react/src/index.ts` must not gain `RegistryLease`; `check-api-surface.mjs` stays at the base count. Tests import `../src/RegistryLease.ts` directly as `SweepScheduler.test.ts` does.

### Test commands
`pnpm exec vitest run --project react <file> < /dev/null`; Stryker alone, stdin closed.

## No Analog Found

| File | Reason |
|---|---|
| Real-macrotask hide/show across an `<Activity>` with a boundary | P4 and SD3 never wait past the timer (the point of the phase); build from P4's `ui(mode)` shape plus an error boundary. |

## Metadata

**Analog search scope:** `packages/react/{src,test}`, `stryker.react.mjs`, `.planning/phases/QD-81-*`, `.changeset`, `spec/decisions`.
**Not read in full (planner should read before editing):** `QadiProvider.seed.test.tsx` SD3, `QadiProvider.subject.test.tsx`, `support/sweepCounter.ts`, 81-check.mjs lines 70-624 and 81-mutation.mjs lines 60-361, `spec-revise.mjs` body, `82-RESEARCH.md` (not read by this mapper; D-19..D-24 from CONTEXT used).
**Pattern extraction date:** 2026-11-25
