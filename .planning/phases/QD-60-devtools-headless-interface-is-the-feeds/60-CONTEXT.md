# Phase 60: Devtools' headless interface is the feeds - Context

**Gathered:** 2026-11-19
**Status:** Ready for planning

<domain>
## Phase Boundary

**The change.**
- `packages/devtools/src/index.ts` exports the raw pairs `makeTimelineStore` + `runSource` and `makeDiagnosticsStore` + `runDiagnostics`. A headless shell must pair, fork, supersede and watch them itself.
- The modules that already do that are package-private:
  - `model/TimelineFeed.ts`: `makeTimelineFeed`, returning `{ timeline, status, configure }`.
  - `model/DiagnosticsFeed.ts`: `makeDiagnosticsFeed`, returning `{ subscribe, getSnapshot, restart, configure }`.
  - `model/GatesFeed.ts`: `makeGatesFeed`, returning `{ subscribe, getSnapshot, configure }`.
- The README says `runDiagnostics` and `makeDiagnosticsStore` are "the same loop without React". That is false: they lack the stop detection whose absence was the ADR-QD-047 amendment 1.13 defect.
- Two option shapes configure one poll:
  - `DiagnosticsOptions<ROut, E>`, in `DiagnosticsStore.ts`: `layer`, `collector`, `schedule`.
  - `DiagnosticsDockOptions`, in `DiagnosticsFeed.ts`: `layer: Layer<never, unknown>`, `collector`, `intervalMillis`.
  - `runOptions` in `DiagnosticsFeed.ts` translates the second into the first.
- The root interface was fixed by ADR-QD-047 amendment 1.6 (2026-10-08), before the feeds existed (1.13 and 1.15, 2026-11-12).

**In scope:**
- `@qadi/devtools`'s two barrels (`src/index.ts`, `src/react/index.ts`), the three feed modules, `DiagnosticsStore.ts` and `TimelineStore.ts`, and their tests.
- The README's headless section, the website's `devtools.md` and `upgrading.md`, and the newsroom example's `Counters.tsx`, which imports `DiagnosticsDockOptions`.
- Records:
  - ARCH-107;
  - ADR-QD-173, which amends ADR-QD-047 amendment 1.6 and ADR-QD-099's closed entry list;
  - CCR-QD-451;
  - BEH-QD-636..640 and INV-QD-365..366;
  - `spec/overview.md` (`check-api-surface.mjs`);
  - a **Breaking** `@qadi/devtools` changeset and `upgrading.md` entry.

**Out of scope:**
- The React dock's behaviour, which must not change.
- `@qadi/react`'s `useDevtoolsFeed`, beyond a type rename if one reaches it.
- Any new entry point: the feeds go in the existing root `.`, and the closed `exports` map is unchanged.
- Releasing or versioning. The changeset is written, never consumed.
</domain>

<decisions>
## Implementation Decisions

### Owner choices (2026-11-19, the HDLS-01 checkpoint)

- **D-01: pursue.** The feeds are devtools' headless interface. HDLS-02..04 go ahead; there is no rejection ADR.
- **D-02: all three feeds are public.** `makeTimelineFeed`, `makeDiagnosticsFeed` and `makeGatesFeed` are exported from the package root, with the handle and input types a caller needs to name. A headless shell can then reach everything the React dock shows.
- **D-03: one option shape, the feed's, named `DiagnosticsOptions`.**
  - The shape is `{ layer?: Layer<never, unknown>, collector?, intervalMillis? }`.
  - `DiagnosticsDockOptions` and the `Schedule`-based `DiagnosticsOptions<ROut, E>` are both removed, and `runOptions`' translation goes with them.
  - `schedule` is dropped because the feed restarts its poll when the interval changes, and that needs a value it can compare.
  - **Breaking:** `<ROut, E>`, `schedule` and the `DiagnosticsDockOptions` name all go away, and each is a compile error rather than a silent change. `@qadi/devtools/react` re-exports the new name.

### Settled from the roadmap and the house rules

- **D-04:** `makeTimelineStore`, `runSource`, `makeDiagnosticsStore` and `runDiagnostics` leave the barrel. Their modules stay, package-private, because the feeds are built on them.
  - A type the feeds' handles still name stays exported. For example, `TimelineFeed.timeline` is a `TimelineStore`.
  - A type or value only the pairs needed (for example `noDiagnostics`, or the `DiagnosticsStore` type) is retired. Research lists each one with its reason.
- **D-05:** The feed tests run against the public entry: they import from the package root, not from `model/`. `surface.test.ts` and `surface.tst.ts` pin the new root surface and the retired names.
- **D-06:** The README's headless example uses the feeds, stop detection included. Its false "same loop without React" claim is removed.
- **D-07:** The `@qadi/devtools` barrel stays a named barrel (ARCH-40, the `devtools-named-barrel` rule).
- **D-08, RED first:**
  1. the mutation base for the touched devtools files;
  2. the public-entry tests;
  3. the export change and the option shape;
  4. the README, docs and records.
- **D-09:** Check the packed `exports` map with `check-package-install.mjs`.
- **D-10:** A touched file's mutation score must not fall, under the D-15/D-16 rule with the static-ignored credit (ADR-QD-167 Rev 1.1).
- **D-11:** Every "gate N" in spec text names its script (`check-dod-table.mjs`).

### Claude's Discretion
- Whether the feed modules keep their file names.
- Each feed's doc comment, written for a public reader.
- How the tests move: renamed in place or re-pointed.
</decisions>

<code_context>
## Existing code
- `DockModel.ts` builds all three feeds (`makeTimelineFeed` at :174, `makeDiagnosticsFeed` at :202, `makeGatesFeed` at :220). The headless interface is the dock model's own inputs.
- `react/index.ts` already exports `DiagnosticsStatus`, `TimelineStatus` and the type `DiagnosticsDockOptions` from the feed modules.
- About 40 files reference the pairs or the option shapes; research inventories them. Among them:
  - devtools tests: `DiagnosticsStore.test.ts` (20 hits) and `TimelineStore.test.ts` (27 hits);
  - spec: `28-devtools-screens.md`, ADR-QD-047, `spec/overview.md`;
  - website docs.
</code_context>

<deferred>
## Deferred Ideas
None.
</deferred>
