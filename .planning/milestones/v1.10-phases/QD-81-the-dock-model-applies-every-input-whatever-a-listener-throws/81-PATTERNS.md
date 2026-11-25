# Phase 81: The dock model applies every input whatever a listener throws - Pattern Map

**Mapped:** 2026-11-24
**Files analyzed:** ~25 (5 source, 8 test, 8 spec/records, 1 changeset, 5 phase scripts)
**Analogs found:** all have an in-repo analog; the phase scripts' analogs are archived and need a path fix.

## File Classification

| File | Role | Data Flow | Analog | Match |
|------|------|-----------|--------|-------|
| `packages/devtools/src/model/ExternalStore.ts` (add `callAll`; rewrite `notify` and the derived release loop) | utility | event-driven | itself, lines 63-83 and 204-217 (the two copies being merged) | exact |
| `packages/devtools/src/model/DockModel.ts` (`configure` as steps; rail as derived store; delete `spread`) | model | event-driven | `shownReading`/`questions`/`services` in the same file, lines 360-401 | exact |
| `TimelineFeed.ts` (`readSource` 173-185, `configure` 195-209) | model | event-driven | `try {resize} finally {readSource}` at 204-208 | exact |
| `DiagnosticsFeed.ts` (`start`, 184-204) | model | event-driven | itself | exact |
| `SimulationSession.ts` (run, 444-450) | model | event-driven | itself | exact |
| `GatesFeed.ts` | unchanged | | pins only; `G48` at `GatesFeed.test.ts:975` is the nearest | |
| Tests under `packages/devtools/test/model/` | test | | see below | |
| Spec and records | docs | | see below | |

## Pattern Assignments

### `ExternalStore.ts`: `callAll`

The rule now lives twice. Copy 1 (`:73-83`):
```ts
const notify = () => {
  const thrown: Array<unknown> = [];
  for (const listener of listeners) {
    try { listener(); } catch (error) { thrown.push(error); }
  }
  throwCollected(thrown, "More than one of the store's listeners threw.");
};
```
Copy 2 (`:204-217`, inside `Effect.addFinalizer(() => Effect.sync(() => {...}))`), same loop over `releases`, message `"More than one of the store's parent releases threw."`.
`throwCollected` (`:63-67`) is the shared tail: 0 returns, 1 rethrows the value, more throws `new AggregateError(thrown, message)`.

New shape: `export function callAll(calls: Iterable<() => void>, message: string): void` holding the loop plus `throwCollected` (keep it module-private, a plain `function`, not exported from either barrel, like `sameFields` at `:138`). Then `notify = () => callAll(listeners, "...")` (pass the live `Set`, never a copy) and the finalizer keeps `stopped = true;` then `callAll(releases, "...")`. Keep the long doc-comment style: one-line summary, then the why (ADR-QD-177, BEH-QD-656/698). Update the file header "listener contract" paragraph (`:20-28`) to say `callAll` states it. New literals inside function bodies only (D-12: a module-scope literal adds an Ignored mutant).

### `DockModel.ts`

Current code to replace: `shown`/`rail` lets and `spread` (`:333-347`), the timeline listener (`:351-356`), `configure` (`:403-431`). Header restated (`:13-20`, `:29-34`; read before editing).

Derived-store pattern to copy (`:360-367`, `:389-401`):
```ts
const services = yield* makeDerivedStore({
  parents: [shownReading],
  key: (): ServicesInput => { ... },
  compute: portCards,
});
```
Rail: `makeDerivedStore({ parents: [timeline], key: (): RailKey => ({ shown: timeline.getSnapshot(), catalogue: held.catalogue }), compute: (key) => catalogueOf(key.shown, key.catalogue) })`, built right after `timelineFeed`. Key fields must not be optional (`K extends object & Required<K>`): declare `catalogue: Catalogue | undefined` as a required field, as `MergeKey.supplied` is (`:298-301`). Chicken-and-egg: `makeSimulationSession({ sightings: rail })`, `makeExplorerSession` and `makeDockSession({ timeline: shown })` take the initial rail/timeline, so build the rail first and pass `rail.getSnapshot()` and `timeline.getSnapshot()`. Then subscribe in order: `rail.subscribe(() => explorer.setSightings(rail.getSnapshot()))`, `rail.subscribe(() => simulation.setSightings(...))`, `timeline.subscribe(() => dock.setTimeline(timeline.getSnapshot()))` (the dock keeps its own identity guard). `sightings: () => rail.getSnapshot()`. The rail is not a `DockModel` member.

`configure` skeleton (D-07/D-08; each thunk reads `held` when it runs):
```ts
const configure = (next: DockModelInputs) => {
  held = completeDockInputs(next);   // throws before anything moves (M55)
  callAll(
    [
      () => timelineFeed.configure(feedInputsOf(held).timeline),
      () => rail.refresh(),
      () => roles.setList(held.catalogue?.roles ?? NO_ROLES),
      () => simulation.setPorts(held.ports),
      () => gatesFeed.configure(feedInputsOf(held).gates),
      () => diagnosticsFeed.configure(feedInputsOf(held).diagnostics),
      () => shownReading.refresh(),
    ],
    "More than one step of the dock's configure threw.",
  );
};
```
`completeDockInputs` stays outside the collector. The `before`/`wanted.catalogue !== before.catalogue` gate goes. Keep the existing comments about gates-before-shown-reading (`:422-424`). Import `callAll` as a named import from `./ExternalStore.ts` (`.ts` extension, per AGENTS.md section 1). No `as`, `!`, `switch`.

### `TimelineFeed.ts`

Current `readSource` does `reads.begin(); status.set(READING); ...; reads.fork(token, ...)`. Wrap publish and fork: `callAll([() => status.set(READING), () => reads.fork(token, runSource(...), { onFailure })], "...")`. `marking` stays built before. `configure`'s `try { timeline.resize(...) } finally { readSource(...) }` (`:204-208`) becomes `callAll([() => timeline.resize(wanted.capacity), () => readSource(wanted.source)], "...")`. Note the nested-`callAll` consequence: a `readSource` throw already rethrown as one value; the outer collects it as one element, so both throws give an `AggregateError` in order (the TF29 flip). The read step must read `held.source` when it runs (D-08). Update the comments at `:202-203` and the doc comments saying a throw "escapes before the new read is forked".

### `DiagnosticsFeed.ts`

`start` (`:184-204`): keep the comment "Before the fork: its synchronous prefix may already reach Live or Stopped". Replace `show(diagnosticsStarting.status);` and `runs.fork(token, runDiagnostics(marking, next), {...})` with `callAll([() => show(diagnosticsStarting.status), () => runs.fork(...)], "...")`.

### `SimulationSession.ts`

`:444-450`: `commit()` of `Running`, then `runs.fork(mine, land(...))`. Wrap both in `callAll`; keep the comment at `:448-449` (fork refuses a superseded token). The `Refused` branch at `:436-441` has no fork, so it is untouched.

## Tests (title conventions; confirm the next free number with grep before writing, my sort was approximate)

| File | Prefix | Highest seen | Notes |
|------|--------|--------------|-------|
| `model/DockModel.test.ts` | `M<n>:` | M56 (`:481`); M54 at `:1695`; check for M57+ | M55/M56 at `:454-504` are the RED pattern; `describe("a capacity the timeline refuses ... (M55, M56)")` |
| `model/ConfigureRule.test.ts` | `CR<n> ` | CR24 (`:935`) | CR22 at `:895` holds the counts "2, 2, 3, 3, 0, 1, 0, 2, 1 and 0": restate after measuring |
| `model/TimelineFeed.test.ts` | `TF<n> ` | TF36 (`:806`) | TF29 at `:621`: retitle, assert `AggregateError` with `errors` `[timelineBoom, statusBoom]` and `tally.reads === 1` |
| `model/GatesFeed.test.ts` | `G<n> ` | G48 (`:975`) | add a characterisation green on base: a throwing status listener still leaves the fork done |
| `model/DiagnosticsFeed.test.ts` | `F<n>` | grep for the max | add the window test |
| `model/SimulationSession.runs.test.ts` | `SR<n>` | SR5 seen | window test for the run |
| `model/ExternalStore.test.ts` | plain prose titles with `it(` | n/a | BEH-QD-656 tests at `:71-135` pin the messages; add `callAll` tests importing it from `../../src/model/ExternalStore.ts` |

Test style to copy (M56, `DockModel.test.ts:481-502`):
```ts
it.effect("M56: ...", () =>
  Effect.gen(function* () {
    const model = yield* dockModelOf({ capacity: 5 });
    const boom = new Error("a timeline listener threw");
    model.timeline.subscribe(() => { throw boom; });
    const run = thrownBy(() => model.configure({ capacity: 3, catalogue, diagnostics: {} }));
    assert.isTrue(run.threw);
    assert.strictEqual(run.thrown, boom);
    ...
  }));
```
Helpers: `thrownBy(run)` in `test/helpers.ts:212` returns `{ threw, thrown }`; `heardOn(store)` at `:203` counts notifications; `dockModelOf`, `timelineFeedOf`, `diagnosticsFeedOf`, `gatesFeedOf` in `test/builtFeeds.ts` build bare then `configure` (a refused capacity becomes the build's defect). For the ten-store RED matrix (CONTEXT Specifics) the ten stores are those of BEH-QD-700; the M56 body above is the row template.

Budgets: the `.tst.ts` negative-pin table in AGENTS.md section 6 does not move unless a `.tst.ts` negative pin is added (none expected).

## Spec records (all numbers are reserved; never run `next-id.mjs`)

- **ADR-QD-194** new file `spec/decisions/194-<slug>.md`, analog `spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md`: H1 `# ADR-QD-192 — Title`, a `> **Document Control**` blockquote table (Document ID `QADI-ADR-192`, Revision, Effective Date, Status `Accepted — amends ADR-QD-177, ...`, Author `Qadi Engineering`, Classification `Architecture Decision Record`, Change History with `1.0 (date): Initial (ARCH-128, CCR-QD-473)`), then `---`, sections `## Context`, `## Decision` (numbered), `## Alternatives considered`, `## Consequences`, `## What enforces it`, `## Related`. Also add an entry to `spec/decisions/index.yaml` (an `id`/`status:` block; the status strings carry "amended <date> (ADR-QD-N: ...)" suffixes, see the 192/193 entries) and amend the status of 177, 185, 191, 192 there.
- **BEH-QD-741..745** in `spec/behaviors/28-devtools-screens.md`; analog BEH-QD-735 at `:3202`: `## BEH-QD-735: Title`, then `> **Decision:** [ADR-QD-192](../decisions/...) · > **Scope:** ... · > **Invariant:** [INV-QD-404](../invariants.md#inv-qd-404-slug)`, a fenced block of `REQUIREMENT: ... MUST ...` lines (continuation indented 13 spaces), then prose. Amend BEH-QD-656, 699 ("three" to "four" computed stores), 728 (pinned-by line) and 735 (counts).
- **INV-QD-407..408** in `spec/invariants.md`; analog INV-QD-401 at `:4645`: `## INV-QD-401: Title`, a rule paragraph, then `**Source**:`, `**Implication**:`, `**Enforcement**: tests. ...`, `**Related**:` links. Amend INV-QD-373 (name `callAll`) and INV-QD-390 (four derived stores).
- **CCR-QD-473** row in `spec/README.md` after `:409` (CCR-QD-472): `| CCR-QD-472 | 2026-11-24 | <files with Rev numbers, "(this row)"> ...`. Read lines 408-409 in full for the cell shape. Name any reserved id left unused as "Unused".
- **`spec/traceability.md`**: per-test-file rows (`:576-671` shape: `| packages/devtools/test/model/X.test.ts | BEH-..., INV-... — note |`); INV row at `:224` shape; ADR row at `:408-409` shape. Add 194 and BEH/INV rows.
- **Revision header**: `node scripts/spec-revise.mjs <spec-doc.md> "<what changed (CCR-QD-473)>" --date 2026-11-24` bumps the minor version in the Revision row and prepends to Change History; `--check` (run by `pnpm spec:verify`) verifies. Run once per doc per entry. Edit the content first, then revise.
- **Changeset**: `.changeset/devtools-every-listener-is-called.md` is the analog (also `devtools-feeds-take-inputs-through-configure.md`). Shape: frontmatter `---\n"@qadi/devtools": patch\n---`, then one prose paragraph describing the user-visible behavior. Name it e.g. `.changeset/devtools-configure-applies-every-input.md`. The existing `devtools-capacity-change-reads.md` text ends with the TF29 behavior ("that throw escapes ... no read is started"); it is a past-release note, leave it.

## Phase record scripts (analogs under `.planning/milestones/v1.9-phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/`)

- `80-mutation.mjs`: header comment explains the record rule; `const D = ".planning/phases/QD-80-.../"` (hard-coded, line ~19) and `GROUPS = { dock: { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json", files: [...] } }`; `invocation = pnpm exec stryker run stryker.devtools.mjs --mutate <files>`. Usage: `node <dir>/81-mutation.mjs record base <group>` before any source edit (clean tree), `record close <group> [--restart]`, `compare`, `--self-test`. For 81 use groups over `ExternalStore.ts`, `DockModel.ts`, `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `SimulationSession.ts` (all under `src/model/**`, which `stryker.devtools.mjs` covers); `UNMEASURED` lists files edited that no config reaches. Output `81-mutation-base.json`.
- `80-check.mjs`, `80-pinned-check.mjs`, `80-characterisation-check.mjs`: same hard-coded `.planning/phases/QD-80-...` constant (`D` at `80-check.mjs:19`, `DIR` at `80-pinned-check.mjs:19`), so run from the archive fail with ENOENT. Per CONTEXT D-13: copy to a scratch dir and change the one constant to `.planning/milestones/v1.9-phases/QD-80-.../` (likewise QD-79); do not edit the archive. The new `81-*` scripts should derive the directory from `import.meta.url` (`new URL(".", import.meta.url)`) instead of a literal, so a later archive move cannot break them. `80-pinned-check.mjs` holds files byte for byte against `phase_base`, with `PINNED = [{ file, edits: [] }]` and `--self-test`; M55/M56/CR22/TF29 are changed on purpose, so re-record them in 81's evidence.
- `80-RED-EVIDENCE.md`: read it for the shape of before/after test output; 81 needs the TF29 before/after in it.
- Tracked-source check: all analog paths above are tracked source under `packages/`, `spec/`, `.changeset/`, or archived planning files. I verified the `.changeset` ones by `git ls-files`; the rest by listing.

## Shared Patterns

- **Listener contract (ADR-QD-177)**: run every call, then rethrow by count, never by type (0 return, 1 the value itself, many one `AggregateError` in call order, never flattened). Pass live iterables, never copies.
- **Idempotent steps**: every `configure` step is already a no-op on unchanged inputs through the target's own guard (`sameFields` per field, `sameElements`, the derived store's key). Keep it so (`useDockModel` configures on every commit).
- **Derived stores built before host listeners** so they move first (BEH-QD-697).
- **House rules**: submodule `effect/...` imports, `.ts` relative extensions, `import type` for types, no `as`/`!`/`any`/`switch`, no `console`. No D-number, phase number or plan id in source or test titles (D-03).

## No Analog Found

None for source. There is no existing test for a nested `configure` (reentrancy) or the all-ten-stores matrix; build them from the M56 template.

## Metadata

**Search scope:** `packages/devtools/src/model`, `packages/devtools/test/model`, `spec/`, `.changeset`, archived v1.9 phase scripts.
**Not read in full:** the whole of ADR-192 and ADR-185 beyond headers, `SimulationSession.ts` outside lines 425-465, `80-check.mjs` and `80-RED-EVIDENCE.md` bodies. Highest test numbers for F, SR and M were not reliably extracted: grep before numbering.
