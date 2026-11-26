# Phase 87: One scoped run that states its stop - Pattern Map

**Mapped:** 2026-11-25
**Files analyzed:** 27 (new or modified)
**Analogs found:** 27 / 27 (all tracked; verified with `git ls-files`)

Decisions of record: 87-CONTEXT.md D-01..D-23 (addendum wins), 87-RESEARCH.md prototype code (2002/2002 devtools tests pass in scratch). The research prototype for each store IS the target shape; this map points at the live analog and the exact lines the planner edits or copies from.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/StatedRun.ts` (new) | service-factory (scoped run owner) | event-driven (publish-then-fork) | `packages/devtools/src/model/SupersedingRun.ts` | exact (same factory shape, sits above it) |
| `packages/devtools/src/model/ConfigurePrologue.ts` (new) | utility | request-response (command guard) | `TimelineFeed.ts:199-205` / `DiagnosticsFeed.ts:202-212` / `GatesFeed.ts:280-286` (three copies) | exact |
| `packages/devtools/src/model/SupersedingRun.ts` (mod: drop `ForkHooks`) | service-factory | event-driven | itself | exact |
| `packages/devtools/src/model/TimelineFeed.ts` (mod) | model store | event-driven | itself (`:162-216`) | exact |
| `packages/devtools/src/model/DiagnosticsFeed.ts` (mod) | model store | event-driven | itself (`:180-236`) | exact |
| `packages/devtools/src/model/GatesFeed.ts` (mod: configure only) | model store | event-driven | itself (`:277-299`) | exact |
| `packages/devtools/src/model/SimulationSession.ts` (mod) | model store | request-response | itself (`:391-453`) | exact |
| `packages/devtools/src/react/Simulator.tsx` (mod `:106-110`) | component | render | `packages/devtools/src/react/StoppedBox.tsx:154-156` | exact |
| `packages/devtools/src/react/StoppedBox.tsx` (mod: import `reasonStyle`) | component | render | `react/theme.ts` named exports | exact |
| `packages/devtools/src/react/theme.ts` (mod: export `reasonStyle`) | config (style) | n/a | `StoppedBox.tsx:95-107` (the source of the move) | exact |
| `packages/core/src/ThrownMessage.ts` (doc only, `:21-22`, `:49-51`) | utility | transform | itself | exact |
| `packages/devtools/test/model/StatedRun.test.ts` (new) | test | event-driven | `test/model/SupersedingRun.test.ts` (R-rows, law rows) | exact |
| `packages/devtools/test/model/ConfigurePrologue.test.ts` (new) | test | request-response | `test/model/ConfigureRule.test.ts` | role-match |
| `packages/devtools/test/model/SimulationSession.stop.test.ts` (new; RED `Broke.message`) | test | request-response | `test/model/SimulationSession.test.ts:1349-1358` (die in ports layer) | exact |
| `packages/devtools/test/model/TimelineFeed.stop.test.ts`, `DiagnosticsFeed.stop.test.ts` (new; self-interrupt RED, D-17 green) | test | event-driven | `TimelineFeed.test.ts` TF21-23, TF28; `DiagnosticsFeed.test.ts` F28-31, F33 | exact |
| `packages/devtools/test/react/Simulator.broke.test.tsx` (new) | test | render | `test/react/TimelineNotice.test.tsx:111` (`getByRole("group", { name })`) + `Simulator.test.tsx:583` | role-match |
| `packages/devtools/test/model/SupersedingRun.test.ts` (edit audited rows R3, R5, R6, R7, R9, law 5 + `listener`/`hooksFor`/`ForkHooks` import) | test | event-driven | itself | exact |
| `packages/devtools/test/builtFeeds.ts` (collapse to one helper) | test helper | n/a | itself (`:16-28`) | exact |
| `.changeset/devtools-*.md` and `.changeset/core-*.md` (two new) | config | n/a | `.changeset/devtools-capture-thrown-message.md` | exact |
| `.planning/phases/QD-87-*/87-check.mjs` | phase script | batch | `86-check.mjs` (and `85-check.mjs`) | exact |
| `87-pinned-check.mjs` | phase script | batch | `86-pinned-check.mjs` (declared-region form: `85-pinned-check.mjs`) | exact |
| `87-mutation.mjs` | phase script | batch | `86-mutation.mjs` (groups `touched` + `stated`; RENAMED map empty, from `83-mutation.mjs`) | exact |
| `87-earlier-checks.mjs` | phase script | batch | `86-earlier-checks.mjs` (now copies 85 and 86 sets) | exact |
| `87-RED-EVIDENCE.md`, `87-mutation-base.json` | evidence | n/a | `86-RED-EVIDENCE.md`, `86-mutation-base.json` | exact |
| `spec/decisions/200-*.md` (new) + `spec/decisions/index.yaml` | spec record | n/a | `spec/decisions/199-a-providers-registry-lifetime-has-a-react-free-owner.md` | exact |
| `spec/README.md` (CCR-QD-479 row), `spec/behaviors/28-devtools-screens.md`, `29-devtools-simulator.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, decisions 047/150/182/192/194 | spec records | n/a | Phase 86's CCR-QD-478 edits (`spec/README.md:415`) | exact |

## Pattern Assignments

### `packages/devtools/src/model/StatedRun.ts` (service-factory, event-driven)

**Analog:** `packages/devtools/src/model/SupersedingRun.ts`

Follow its header doc (what / why / ADR cite / "Package-private (ADR-QD-099)", lines 1-37) and its imports and unnamed `Effect.fn` factory (no child span, no `fnUntraced`). Imports at `SupersedingRun.ts:38-42` are namespace-style with `import type * as Scope`:
```ts
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberHandle from "effect/FiberHandle";
import type * as Scope from "effect/Scope";
```
Cross-package named import: `import { causeMessage } from "@qadi/core";` (AGENTS.md section 1). Relative: `./SupersedingRun.ts`.

**Core to copy:** the research prototype (87-RESEARCH.md, "Module API", `makeStatedRun(stopped)` returning `{ start(plan), stop, closed }`, `RunPlan { starting, engine(live) }`, `RunLive { current, guard }`). Existing ordering it replaces, `TimelineFeed.ts:176-188`:
```ts
const token = reads.begin();
...
try {
  status.set(READING);
} finally {
  reads.fork(token, runSource(marking, source ?? NO_SOURCE), { onFailure: ... });
}
```
Order is load-bearing (Pitfall 87-E): `begin`, then `starting()`, then `engine(live)` evaluated inside `finally`. The ADR-QD-194 rethrow paragraph (`TimelineFeed.ts:62-73`) and the "An interruption is not a stop" doc (`DiagnosticsFeed.ts:10-13`) move here (one copy, say "from outside").

**Stop rule:** `Effect.exit(plan.engine(live))` inside the forked body, then `if (runs.isCurrent(token) && Exit.isFailure(exit)) stopped(causeMessage(exit.cause))`. No `Cause.hasInterruptsOnly`.

---

### `packages/devtools/src/model/ConfigurePrologue.ts` (utility)

**Analog:** the three copies. `TimelineFeed.ts:198-205`:
```ts
configure: (next) => {
  if (reads.closed()) return;
  const wanted = completeTimelineInputs(next);
  if (sameFields(held, wanted)) return;
  held = wanted;
  callAll([() => timeline.resize(held.capacity), () => readSource(held.source)], "More than one step ...");
```
`DiagnosticsFeed.ts:202-212` (gate `sameFieldsOrAbsent`, `wanted === undefined ? off() : start(wanted)`), `GatesFeed.ts:280-286` (`sameFields(held, wanted) && watchFailure === undefined`, then `const before = held;`). Use the research's `makeConfigure(rule, steps)` verbatim (order: closed, complete, same, hold, steps). Helpers: `sameFields`, `sameFieldsOrAbsent`, `callAll` in `ExternalStore.ts` (`:82`, `:153`, `:169`).

---

### `SupersedingRun.ts` edit (drop `onFailure`)

Delete `ForkHooks` (`:48-53`), the `hooks` parameter and the `Effect.onExit` wrapper (`:113-123`), the `Cause`/`Exit` imports (`:38,40`). `fork` becomes `(token, run) => boolean`; `drain` receives `run` directly. Keep the doc's "and says whether it did". `stop` stays `fork(begin(), Effect.void)`.

---

### `TimelineFeed.ts`, `DiagnosticsFeed.ts` (model stores)

Target shapes are the research prototype blocks. Keep module constants `READING`, `diagnosticsStarting`, `diagnosticsOff` (repeat publish of the same identity notifies nothing, INV-QD-408 premise). Timeline: `restart = () => reads.start(plan())` so a bare feed forks an empty `NO_SOURCE` read (D-14). Diagnostics: `show` stays; `Stopped({ reason, sampled })` is built in the `stopped` callback passed to `makeStatedRun`; `restart = () => { if (held !== undefined) runs.start(plan(held)); }`; `configure` via `makeConfigure` with `sameFieldsOrAbsent`, steps as `if (wanted === undefined) { runs.stop(); sampled = false; view.set(diagnosticsOff); } else runs.start(plan(wanted))`. Remove `makeSupersedingRun` and `causeMessage` imports (now in StatedRun).

### `GatesFeed.ts` (configure only)

Keep `makeSupersedingRun` and its fork-before-publish cadence (INV-QD-408, G49). Replace `:280-299` with `makeConfigure({ closed: runs.closed, complete: completeGatesInputs, held: () => held, same: (a, b) => sameFields(a, b) && watchFailure === undefined, hold }, (wanted, before) => { ...existing body through publish(...) })`. The comment "A failed watch is retried by any configure: the rule's one stated exception" moves to the `same` argument.

### `SimulationSession.ts`

Existing `land` (`:394-421`) keeps `Effect.fn("qadi.devtools.simulationSession.run", { root: true })` and its `Effect.exit(program(...))`. Edits:
- first parameter `mine: RunToken` becomes `live: RunLive`; `if (!runs.isCurrent(mine)) return;` becomes `if (!live.current()) return;`
- `:418` `message: String(exit.cause)` becomes `message: causeMessage(exit.cause)`
- `start` (`:444-453`) becomes `runs.start({ starting: () => { run = { _tag: "Running", question }; commit(); }, engine: (live) => land(live, question, kind, prepared, runClock, pairs) })`, with `const runClock = clock;` captured outside the plan (read before the commit; `pairs` read after).
- `runs = yield* makeStatedRun((reason) => { if (run._tag !== "Running") return; run = { _tag: "Broke", question: run.question, message: reason }; commit(); })` created after `commit` is defined (D-11a). `supersede()` (used on the `Refused` path) keeps calling `runs.stop`.
Do not touch `Capture.ts`'s separate `Broke` (Pitfall 87-F).

---

### `Simulator.tsx` / `StoppedBox.tsx` / `theme.ts`

**Analog:** `StoppedBox.tsx:154-156`:
```tsx
<pre data-testid={`${hooks}-reason`} role="group" aria-label={reasonLabel} tabIndex={0} style={reasonStyle}>
  {reason}
</pre>
```
Simulator `Broke` arm (`Simulator.tsx:106-110`) replaces `<span>{broke.message}</span>` with `<pre role="group" aria-label="Why the simulation failed" tabIndex={0} style={reasonStyle}>{broke.message}</pre>`; keep heading text and `data-testid="qadi-simulator-broke"`. Render the message on the tag line, or assert `textContent` exactly (Pitfall 87-H). Move `reasonStyle` (`StoppedBox.tsx:95-107`, uses only `colors`, `font`) to `theme.ts` as `export const reasonStyle: CSSProperties`; `StoppedBox.tsx` imports it from `./theme.ts` (render byte-identical; it then drops 14 lines).

---

### `test/builtFeeds.ts`

**Analog:** itself, `:16-28`. Collapse the four `Effect.tap(makeX(), (built) => Effect.sync(() => built.configure(inputs)))` bodies to one structural helper (research "builtFeeds"): `configuredBy(make, inputs)`; keep the four exported names and signatures (`timelineFeedOf`, `diagnosticsFeedOf`, `gatesFeedOf`, `dockModelOf`). Eight test files import it; none edited.

---

### Tests

- `StatedRun.test.ts`: copy structure and helpers from `SupersedingRun.test.ts` (R-rows, `collectingTracer` positive control, law-based PROPERTY for the command alphabet). Required rows (research Pitfall 87-B/C and audit table): current die states once; current self-interrupt states once; supersede, `stop`, scope close with a dying release, `stop` with no run (no span), completed-run `stop`, and the begin-window natural end (non-current, for both die and self-interrupt) state nothing; closed `start` is a no-op; D-17 row (listener throws and issues superseding command: rethrown once by identity, newest run live). Every re-homed row has a positive control.
- RED rows on base (D-15): session ports layer dies (`Layer.effect(AttributeResolver, Effect.die(...))` per `SimulationSession.test.ts:1349`) so `Broke.message` first line is `Error: the layer exploded`, hostile value (`test/helpers.ts:235`) gives exactly `a value that could not be described`, never starts `Cause(`; feed self-interrupt rows (`Effect.interrupt` source read, `Stream.fromEffect(Effect.interrupt)`, collector `snapshot = Effect.interrupt`) read `Stopped` (diagnostics `sampled: false`). Green on base: D-17 rows (three), session listener throw on `Ran` stays `Ran`. Titles say "uniform with the feeds". Do not reuse the "SR1"/"TF2x"/"F2x" prefixes (id collision, name file and line).
- Never pin a fiber id in `Cause.pretty` text of an interrupt.
- Failing ports in tests go through `scriptedPort` (AGENTS.md section 6) where a port is the subject.
- Every new test file needs a traceability row (check 6 of `spec/scripts/verify-traceability.sh`).

---

### Changesets

**Analog:** `.changeset/devtools-capture-thrown-message.md`:
```
---
"@qadi/devtools": patch
---

<sentence naming what a host sees; ends "No export changes.">
```
Two files: `@qadi/devtools` patch (Simulator text is `causeMessage`'s in a preformatted block; a feed run whose own work interrupts itself reads stopped; say "uniform with the feeds", not "fixes a defect"), `@qadi/core` patch (`ThrownMessage.ts` doc only).

---

### Phase scripts (D-20)

All four are ports of the Phase 86 files in `.planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/`; keep each header (modes list, Shortcuts note), pure `judge*` functions plus thin readers, and `--self-test` driving planted text.

**`87-check.mjs`** from `86-check.mjs`. Keep verbatim: `D` dir calc (`:38`), `TRAILER` constant `"Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (`:42`, matches D-05), `PLAN_SUBJECT = /^[a-z]+[(]87-[0-9]{2}[)]!?: /` (`:43`), `GUARDED` (`:44`), `fail`/`git`/`sorted`/`scratch` helpers (`:48-54`, change `qd86` to `qd87`), `phaseBaseOf`, `judgeBase`, `judgeTrailer`, `judgeCommit`, `judgeUnchanged`, `titlesOf`/`pinTitlesOf`, `judgeSeenFailing`, `blank`, `judgeIds`, `judgeForbidden`, `judgeGuards`, `importsOf`, `topLevel`, `judgeRecords`, `parseDiff`, `MODES` table (`:752`). Set `PHASE_BASE` to HEAD recorded at plan 1 (spike plan records it). Replace 86's `owner-shape` / `provider-forwards-only` modes and constants (`:374-566`, `:580-585` PINNED / NEW_BEHAVIORS / UNUSED_BEHAVIORS / NEW_INVARIANTS) with 87's: `stated-run-shape` (StatedRun.ts is React-free, composes `makeSupersedingRun`, has no `Cause.hasInterruptsOnly`, no `fnUntraced`, out of the barrel, unnamed `Effect.fn`), `feeds-supply-only-engine` (TimelineFeed/DiagnosticsFeed import `makeStatedRun` and `makeConfigure`, no `makeSupersedingRun`, no `causeMessage`, no `onFailure`; GatesFeed keeps `makeSupersedingRun` and imports `makeConfigure`), `session-stop` (no `String(exit.cause)`; `Running` guard present), `onfailure-gone` (no `onFailure` in `packages/devtools/src`). Records: `NEW_BEHAVIORS = [771..775]`, `NEW_INVARIANTS = [419, 420]`, pinned BEH/INV lists per section 'Records' below.
Mode ordering and `--close` semantics copy `judgeClosed` (`:627`).

**`87-pinned-check.mjs`** from `86-pinned-check.mjs` (held set computed from `git ls-tree -r --name-only <BASE> -- packages/devtools/test`, plus `packages/devtools/src/react/useConfigured.ts`; never hand-list). Structure to copy: `firstDifference`, `heldFrom`, `judgeHeld`, `judgeAdders`, `judgeBorn`, the "moved/deleted/changed is a failure" `git diff -M --name-status` rule, `--all-applied`, `--self-test`. Differences: two declared edits. `test/builtFeeds.ts` whole file; `test/model/SupersedingRun.test.ts` held outside the audited rows (use `85-pinned-check.mjs`'s declared-region form, region names from the ADR-QD-200 audit table: R3, R5, R6, R7, R9, law 5, `listener`, `hooksFor`, `heard`/`modelHeard`/`heardFailures`, the `ForkHooks` import). TF21-23, TF28, F28-31, F33, SR1 (`SimulationSession.runs.test.ts:55`), SR5-6 held unedited.

**`87-mutation.mjs`** from `86-mutation.mjs` (`GROUPS` with `config`/`report`/`files`/`closeOnly`/`killers`/`disableBail`, `NEW_FILES`, `record base|close|probe <group>`, `compare`, `--restart`, clean-tree rule, `git diff -U0` line carry, multiset counting, absolute rule `judgeNew` for born files). Config: `stryker.devtools.mjs`, report `reports/mutation-devtools/mutation.json`. Groups: `touched` = `SupersedingRun.ts`, `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `SimulationSession.ts`, `GatesFeed.ts` (base + close, removed-mutant rule); `stated` = `StatedRun.ts`, `ConfigurePrologue.ts` (born, `closeOnly`, absolute rule, `killers` = the new test files). Add a sum check (base killed/total over five files does not exceed close sum over all seven). `RENAMED` is empty here (pattern from `83-mutation.mjs`). Base surviving mutants to record are in 87-RESEARCH.md "Mutation" (`SupersedingRun.ts` L94 x2 plus L121 which disappears; `SimulationSession.ts` L310, L313 x2, L317, L319, L402). L402-equivalent gate in `StatedRun` must be killed by the begin-window rows.

**`87-earlier-checks.mjs`** from `86-earlier-checks.mjs`: copy named files to `<scratch>/p85/` and `<scratch>/p86/` (`P85_COPIED`-style lists: `85-check.mjs`, `85-pinned-check.mjs`, `85-mutation.mjs`, `85-earlier-checks.mjs`, `85-01-SUMMARY.md`, `85-RED-EVIDENCE.md`; and the 86 equivalents, adding `86-pinned-check.mjs`, `86-earlier-checks.mjs`), find phase dirs by prefix under `.planning/phases/` or `.planning/milestones/*-phases/`, compare each run's `exit` and line with a ledger measured on the 87 base (never "all exit 0"), only `--self-test` for an earlier-checks script (root computed from its own location). Row choice by file state, as 86's `single-owner` row, if an 86 judge reads a file this phase edits (check `RegistryOwner`/`QadiProvider`: untouched here, so likely no moved row).

**`87-RED-EVIDENCE.md`**: copy format of `86-RED-EVIDENCE.md:1-9` (line kinds `- failed:`, `- failed (<tag>):`, `- red on the base:`, `- check failed: <mode>: <first stderr line>`; sections per plan).

---

### Spec records (Area 4)

**Analog:** Phase 86 (CCR-QD-478, ADR-QD-199, BEH-QD-766/767, INV-QD-417/418).

- New ADR: copy `spec/decisions/199-a-providers-registry-lifetime-has-a-react-free-owner.md` section skeleton (Document Control table lines 3-13, then Context `:17`, Decision `:38`, Alternatives considered `:100`, Consequences `:141`, What enforces it `:196`, Related `:218`). File: `spec/decisions/200-<slug>.md`; Change History `1.0 (2026-11-25): Initial (ARCH-134, CCR-QD-479)`. Add an entry to `spec/decisions/index.yaml` after the ADR-QD-199 block (`:625-628`: `id`, `file`, `title`, `status: "Accepted — extends ADR-QD-182 …"`), and amend the status of ADR-QD-150, 182, 192, 194 entries as 86 did for ADR-QD-195 (`:612`). Decision body includes the D-08 outcome (holds), the D-09 audit table (rows R3, R5, R6, R7, R9, law 5 to `StatedRun.test.ts`), the D-22 follow-up (`packages/audit/src/AuditWriteReport.ts:273`), and a line that ADR-QD-150 point 2 is applied not reopened.
- Revision bumps: always `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-25` (one call per edit entry; `--check` is run by `pnpm spec:verify`). Next revisions per research: README 1.413, invariants 1.232, traceability 1.332, overview 1.146, 28-devtools-screens 1.82, 29-devtools-simulator 1.32, ADR 047 1.24, 150 1.1, 182 1.2, 192 1.7, 194 1.4.
- CCR row: `spec/README.md:415` is the form (`| CCR-QD-478 | 2026-11-25 | <files with Revs> … |`), plus the README Change History entry ("the CCR-QD-479 row (CCR-QD-479)", see `:13`). Name unused reservations ("Unused: …") in the row (D-02).
- BEH/INV: new BEH-QD-771..775 in `spec/behaviors/28-devtools-screens.md` (module, stop rule, prologue, session message) and `29-devtools-simulator.md` (Simulator `<pre>`), INV-QD-419..420 in `spec/invariants.md`; shape from BEH-QD-767 in `spec/behaviors/09-react.md` and INV-QD-418 (headings are anchored; Pitfall 87-G: if INV-QD-313's title changes, move every link in BEH-QD-507, BEH-QD-519 and `traceability.md:204`). Restate BEH-QD-519, 507, 637, 461 (texts are quoted in 87-RESEARCH.md "Spec sentences to amend").
- Traceability rows: shape from `spec/traceability.md:93` (BEH row: id link, title, source file with exports, tests) and `:475` (ADR row), both of which cite new test files (check 6 requires every cited test file to exist). Edit `traceability.md:204` and `:656` (SupersedingRun rows citing `onFailure` / R9).
- `spec/overview.md:929-930` (`DiagnosticsStatus` / `TimelineStatus` rows) carry the public statement of the interrupt rule: amend.
- `ThrownMessage.ts:21-22` and `:49-51` doc text is amended in the same commit as ADR-QD-182 decision 11 (`v4-api-smoke` canary stays).

## Shared Patterns

### Import style (AGENTS.md section 1)
`import * as X from "effect/X"`; relative imports end `.ts`; `import type` for types; cross-package named: `import { causeMessage } from "@qadi/core"`.

### Store construction
Unnamed or named `Effect.fn` factories returning `Effect.fn.Return<T, never, Scope.Scope>`; build stays synchronous (stores built with `Effect.runSync` through `useScoped`). `StatedRun` and `ConfigurePrologue` are out of the barrel (ADR-QD-099, `exports` map closed); add nothing to `packages/devtools/src/index.ts`. Public status types stay (`test/surface.test.ts`).

### Forbidden (AGENTS.md section 6) and house style
No `as`, `any`, `!`, `switch`, `console.*`, `Date.now()`, `Effect.fnUntraced` (UNTRACED_BUDGET), no module-scope `let` (MODULE_STATE_BUDGET: `StatedRun.ts` uses closure state only). A `// shortcut:` style comment is not house style; use doc-comment shape "one-line summary, then the why".

### Commit trailer (D-05)
Every commit ends with exactly one line: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit subjects match `^[a-z]+\(87-NN\)!?: ` (`PLAN_SUBJECT` in the phase script). Never stage `.planning/config.json`, `README.md`, `.agents/`, `.codex/`, `*.iter*.md`, `.planning/state.json`, `assets/`; never `git add -A` under `.planning/milestones`.

### RED-first (D-03)
Test lands first (RED on base for a behaviour change, green for preserved behaviour); each check seen failing once with scratch variant and failing text appended to `87-RED-EVIDENCE.md`.

## No Analog Found

None. Nearest to novel: the `StatedRun.test.ts` begin-window rows (natural end after a newer `begin`); the only analog is R15 of `SupersedingRun.test.ts` (the begin-without-fork window), which gives the harness but not the assertions.

## Metadata

**Analog search scope:** `packages/devtools/src/model`, `packages/devtools/src/react`, `packages/devtools/test`, `.planning/phases/QD-85-*`, `QD-86-*`, `spec/decisions`, `spec/README.md`, `.changeset`, `scripts/spec-revise.mjs`
**Files scanned:** about 25 read in part (large phase scripts read by header and mode list only)
**Pattern extraction date:** 2026-11-25
