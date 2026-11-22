# Phase 71: Developer-signal reporters resolved through one table - Pattern Map

**Mapped:** 2026-11-22
**Files analyzed:** 14 (new or modified)
**Analogs found:** 14 / 14

All analog paths below are git-tracked source (`packages/*/src`, `scripts/`, `.planning/phases/QD-70-*`, `spec/`).
Line numbers are from the tree at the phase base (`9cc112c9`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/react/src/DeveloperSignals.ts` (table + one resolver; derive `ReporterName`) | config table + utility | transform / event-driven | `packages/react/src/HydrationEngine.ts:228-276` (`PAYLOAD_PRODUCERS` + `PAYLOAD_REASONS`) and `packages/core/src/HydrationMetrics.ts:82,214` (`HYDRATION_DROP_TABLE`, `keyof typeof`) | exact (table shape) |
| `packages/react/src/GateRegistry.ts` (`:72`) | service | request-response | `packages/react/src/GateWriter.ts:104-157` (private seam) | role-match |
| new package-private module or export in `GateWriter.ts` (registry built from an already-resolved reporter) | utility | construction | `GateWriter.ts` `makeOwnedGateRegistry` / `gateWriterFor` (out of barrel) | exact (seam) |
| `packages/react/src/QadiAtoms.ts` (`:246-249`) | service | request-response | itself; `:247-249` already forwards `onIdCollision` | exact |
| `packages/react/src/HydrationEngine.ts` (`:478`, `:663`) | service | event-driven | itself (`emitAll(plan.events, { leftOut: ... })`) | exact |
| `packages/react/src/QadiProvider.tsx` (`:207-211`, `:266-275`) | component | event-driven | itself | exact |
| `packages/react/test/DeveloperSignals.test.ts` (+ new table characterisation test) | test | request-response | same file (`said`, `useProduction` at `:59-77`) | exact |
| `packages/react/test/QadiProvider.production.test.tsx` | test | event-driven | itself (latch isolated by one-file-per-process) | exact |
| `packages/react/test/GateRegistry.test.tsx` (+ SIGR-01 RED test) | test | request-response | itself | exact |
| `packages/react/test/DeveloperSignals.tst.ts` (new) | type test | n/a | `packages/react/test/HydrationBuckets.tst.ts` | exact |
| `scripts/check-house-style.mjs` (`MODULE_STATE_BUDGET`) | config / gate | batch | `UNTRUSTED_DECODE_BUDGET` (`:640-1750`) | exact |
| `AGENTS.md` (§13 wording, §6 budget table) | docs | n/a | §7a table (`| Location | Count | Why |`) | exact |
| `.planning/phases/QD-71-*/71-mutation.mjs` | script | batch | `.planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-mutation.mjs` | exact |
| spec: ADR-QD-184, INV-QD-387/388, BEH-QD-691..695, CCR-QD-463, `.changeset/*.md` | docs | n/a | ADR-QD-183 (`spec/decisions/183-*.md`), CCR-QD-462, `.changeset/react-hydration-drop-buckets.md` | exact |

## Current shape of the code being replaced (`DeveloperSignals.ts`)

- `isDevelopment` (`:74`); `DeveloperSignal` = `Data.TaggedEnum` of 8 tags (`:84-100`); hand-kept
  `type ReporterName = "onHydrationMismatch" | "onGateIdCollision" | "onDropped" | "onDeveloperSignal"` (`:103`);
  `describeSignal` is a module-scope `Match.type().pipe(Match.tagsExhaustive(...))` (`:153`); `say` (`:214`);
  `contain(reporter: ReporterName, supplied)` (`:227-235`).
- Three resolvers restate one rule (`:244-251`, `:269-276`, `:346-350`):
  ```ts
  supplied === undefined ? (isDevelopment() ? byDefault : undefined) : contain("onDropped", supplied);
  ```
- The fourth (`:404-431`) puts `isDevelopment()` inside each `Match` arm, and the latch is
  `let warnedInstrumentedInProduction = false;` at `:394`, the only column-0 `let`/`var` in `packages/*/src`
  (checked with `/usr/bin/grep -n "^let \|^var " -r packages/*/src`).
- The SIGR-01 defect: `GateRegistry.ts:72` `const report = gateIdCollisionReporter(options?.onIdCollision);`
  contains under the fixed name `"onGateIdCollision"` (`:276`).
- Defaults `saysDehydrationDropped` / `saysHydrationDropped` (`:319`, `:325`) are exported and paired by hand at
  `HydrationEngine.ts:478` and `:663`.

## Pattern Assignments

### `DeveloperSignals.ts` — the signal table (config table, total over a closed tagged union)

**Analog A:** `packages/react/src/HydrationEngine.ts:228-233`, total record via `satisfies`, rows are string literals:
```ts
export const PAYLOAD_PRODUCERS = {
  PayloadSubjectMismatch: "SubjectCheck",
  UnsupportedPayloadVersion: "UnsupportedPayloadVersion",
  MalformedPayload: "Malformed",
  PayloadTooDeep: "TooDeep",
} satisfies { readonly [R in PayloadRefusalReason]: PayloadProducer };
```
Here `satisfies` plus a mapped key gives TS2741 on a missing row while keeping the literal types of the values, which is
what D-03 needs (a union derived from the rows' values, `(typeof TABLE)[keyof typeof TABLE]["option"]`).

**Analog B (derive a type from rows, key union from the table):** `packages/core/src/HydrationMetrics.ts:82`
`const HYDRATION_DROP_TABLE = {...}`, `:214` `export type HydrationDropReason = keyof typeof HYDRATION_DROP_TABLE;`
and `:224` `(typeof HYDRATION_DROP_TABLE)[R]["kind"] extends K`. Here the key set is derived from the table; in Phase 71
the key set is `DeveloperSignal["_tag"]` (already a closed union), so use Analog A's mapped-key `satisfies`
and derive `ReporterName` from the values.

**Analog C (index by a tag the code wrote; no `Object.hasOwn`):** `HydrationEngine.ts:270-276` `PAYLOAD_REASONS`
(AGENTS.md §5a third dispatch form). The table is read as `TABLE[signal._tag]`, no fail-closed row.

**Analog D (rows hold functions, existing in this file):** `describeSignal` (`DeveloperSignals.ts:153`) is the
module-scope exhaustive form. Rows must not re-state sentences; the row's `says...` default points at `say`/`describeSignal`.

Constraints to carry into the plan (D-02..D-04, AGENTS.md §6): no `as`/`!`/`any`; `Record<string, unknown>` is
rejected by the owner's memory note; the per-entry-point option names are a record per signal
(`GateIdCollision: { makeQadiAtoms: "onGateIdCollision", makeGateRegistry: "onIdCollision" }`), so the entry point
selects the name at the type level (a key of the row), which is what gives the SIGR-01 fix by construction.
`ReporterThrew` has an empty entry-point record, and `ReporterName` must still include its derived name (D-03);
`contain` takes `ReporterName` and calls `say(DeveloperSignal.ReporterThrew({ reporter, error }))` unchanged.
Doc-comment shape: one-line summary, then rationale paragraphs, as in the file's existing comments.

### `DeveloperSignals.ts` — one resolver (D-04) and the latch (D-01)

Keep today's rule text as the single implementation:
```ts
// containment (:227-235): keep verbatim, only the name now comes from the row
try { supplied(value); } catch (error) { say(DeveloperSignal.ReporterThrew({ reporter, error })); }
// supplied-or-default (:350): the development check expressed once
supplied === undefined ? (isDevelopment() ? byDefault : undefined) : contain(name, supplied)
// latch (:404-410): the once-per-process rule is the only branch that mutates state
if (warnedInstrumentedInProduction) return; warnedInstrumentedInProduction = true; say(signal);
```
`providerSignalReporter` must keep never returning `undefined` (`:428-431`); the table states why. `sayProviderSignal`'s
`Match.type<ProviderSignal>().pipe(Match.tagsExhaustive(...))` (`:404`) is the existing hoisted-once matcher form;
if the table replaces it, the "where the default speaks" column is the replacement for the per-arm `isDevelopment()`.
Keep `providerSignals` (`:379`) and `isDevelopment` (`:74`, read by `QadiProvider.tsx:266`) exported.

### D-05 seam: how a constructor stays out of the barrel

**Barrel `packages/react/src/index.ts` re-exports (via `export *`) exactly:** `DecisionOutcome.ts`, `DevtoolsFeed.ts`,
`GateRegistry.ts`, `Hydration.ts`, `QadiAtoms.ts`, `QadiProvider.tsx`, `components.tsx`, `hooks.ts`.
**Not re-exported (package-private):** `DeveloperSignals.ts`, `GateWriter.ts`, `HydrationBuckets.ts`,
`HydrationEngine.ts`, `HydrationEvent.ts`, `MissingQadiProviderError.ts`, `QuestionBook.ts`, `SeededDecision.ts`,
`SeededQuestion.ts`, `SweepScheduler.ts`, `useGate.ts`. `export *` of `GateRegistry.ts` exports every export of that
file, so a constructor placed there is public; it must live in a non-barrel module.

**Analog:** `GateWriter.ts` states its own rule (`:1-12`): "Out of the barrel (AGENTS.md §9) ... `GateRegistry.ts`
re-exports the four public types by name; nothing else here is reachable from outside the package." Excerpt
(`:147-157`):
```ts
export const makeOwnedGateRegistry = (parts: GateRegistry & GateWriter): GateRegistry =>
  new OwnedGateRegistry(parts);
export const gateWriterFor = (registry: object): GateWriter | undefined =>
  OwnedGateRegistry.writerOf(registry);
```
and `GateRegistry.ts:43-47` imports from it and re-exports public types by name only:
```ts
import { makeOwnedGateRegistry } from "./GateWriter.ts";
export type { GateInstance, GateKind, GateRegistry, GateRenderState } from "./GateWriter.ts";
```
Plan implication: `makeGateRegistry` (public, `GateRegistry.ts:67`) and `makeQadiAtoms` (`QadiAtoms.ts:247-249`, today
`makeGateRegistry(options?.onGateIdCollision === undefined ? {} : { onIdCollision: options.onGateIdCollision })`)
both call a non-barrel builder that takes the already-resolved reporter, so the public `GateRegistryOptions` is
untouched. Keep the single containment: `makeQadiAtoms` resolves its own reporter (under `onGateIdCollision`) and
hands the registry the resolved function, which the registry must not wrap a second time.
The `gateIdCollisionReporter` is called today only at `GateRegistry.ts:72` and `QadiAtoms.ts` (the forwarding),
so grep every other caller before removing the export (`/usr/bin/grep -rn gateIdCollisionReporter packages`).
The check-api-surface gate (barrel stays at 941 exports) is the proof the seam did not leak.

### `HydrationEngine.ts` (`:478`, `:663`) — D-06

Current:
```ts
emitAll(plan.events, { leftOut: hydrationDropReporter(options?.onDropped, saysDehydrationDropped) });   // :478
emitAll(plan.events, { dropped: hydrationDropReporter(options?.onDropped, saysHydrationDropped) });      // :663
```
Imports at `:53-54`. Pairing by construction: pass the signal tag (or the row) instead of `byDefault`, so the default
comes from the `DehydrationDropped` / `HydrationDropped` row and the wrong pairing is not expressible. Resolution
stays once per call (D-07). The two `onDropped` option types are at `:320` and `:533`.

### `QadiProvider.tsx` — D-07 timing stays

`:207-211` resolves per report through a ref (`providerSignalReporter(signalRef.current)(signal)`), `:266-275` reads
`isDevelopment()` and raises `InstrumentedInProduction` (latch comment at `:172-174`, `:263`). Touch only if the
resolver's call shape changes; the per-report resolution must remain so an inline callback stays current.

### Tests

**`packages/react/test/DeveloperSignals.test.ts`** helpers to reuse for the D-09 characterisation (`:59-77`):
```ts
const said = (act: () => void): ReadonlyArray<string> => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try { act(); return warn.mock.calls.map((call) => String(call[0])); } finally { warn.mockRestore(); }
};
const useProduction = () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  return () => { process.env.NODE_ENV = previous; };
};
```
The file already pins the sentence per signal (`:80-190`), the throw matrix (`:260-330`, `:387`) and uses `afterEach(() => vi.restoreAllMocks())`.
New characterisation should reuse these; name existing tests for rows already pinned.

**Latch isolation:** `QadiProvider.production.test.tsx` header (`:1-7`): "Alone in its file on purpose: the latch is
module state ... vitest isolates a module graph per file, so this is the only test in the suite that can observe it
fresh." There is no reset function and no `vi.resetModules`. A new once-per-process test (D-09: two providers mounted
in sequence) either goes in that file or in its own new file; any other file that triggers the console default in
production would consume the latch for itself only (per-file isolation), but a second test in one file cannot
observe it fresh. Do not add a reset export (it would be public state and breach D-01). It sets/restores `process.env.NODE_ENV`
inline and mounts `<QadiProvider atoms subject instrument>` with `<Can>` (`:21-45`).

**`QadiProvider.signals.test.tsx`, `GateRegistry.test.tsx`, `GateRegistry.store.test.ts`:** existing pins for supplied-reporter
behaviour and registry collisions; the SIGR-01 RED test is added next to the existing `onIdCollision` collision test
in `GateRegistry.test.tsx` (read it for the colliding-registration helper before writing, not read here), asserting
via `said(...)` that the throw line names `onIdCollision`; its sibling through `makeQadiAtoms({ onGateIdCollision })` names
`onGateIdCollision` and is green on the base.

**Type test analog `packages/react/test/HydrationBuckets.tst.ts`:** header doc states the intent (`:1-12`); written-out
union beside each pin; the totality pin uses `@ts-expect-error is missing in type` plus a positive twin:
```ts
test("an entry bucket record missing a reason or naming an unknown one is refused", () => {
  // @ts-expect-error is missing in type
  const missing: DropBuckets<EntryDropReason, unknown> = { EntryTooDeep: [], MalformedEntry: [] };
  expect(missing).type.toBe<EntryBucketRecord>();
  ...
  // @ts-expect-error does not exist in type
```
It compares to a written-out type, never to its own annotation, and imports the package-private records directly
from `../src/...`. For Phase 71: pin `ReporterName` equals a written-out union of the table's option names, and a
table missing a signal row fails (needs the table's row type exported for the pin, package-private, as
`PAYLOAD_PRODUCERS` is "Exported for `HydrationBuckets.tst.ts`; this module is package-private").
AGENTS.md §6 rules: a negative `toBeCallableWith`/`toBeConstructableWith` pin adds a row to the `NOT_CALLABLE_PIN_BUDGET`
table in AGENTS.md and to the script's budget together, needs a positive twin with the same subject text, and
for an `Effect`/`Stream` returning function goes through `Params<F>`. `@ts-expect-error` pins are not counted by
that budget (only `not.toBeCallableWith`/`not.toBeConstructableWith` are), so prefer them.

### `scripts/check-house-style.mjs` — `MODULE_STATE_BUDGET` (D-01)

**Analog:** `UNTRUSTED_DECODE_BUDGET` is the closest (per-file count in `packages/*/src`, both directions, table check,
names guard). Pieces to copy:

1. Declaration (`:640-651`): a JSDoc-typed `const X = { "packages/...": N }` with a per-entry reason comment.
2. A names guard (`:659-666`, `UNTRUSTED_DECODE_BUDGET_NAMES`) and its check (`:1713-1724`):
   `new RegExp(`\\b(?:const|function)\\s+${name}\\b`)` must find the declaration; for a `let`, the name is
   `warnedInstrumentedInProduction`, so the regex needs `let` too (`(?:const|let|function)`).
3. A `Map` of lines (`:671`, `const UNTRUSTED_DECODE_LINES = new Map();`) filled inside the per-line loop (`:1258-1266`):
   ```ts
   if (!isTestFile && rel.startsWith("packages/")) {
     const matches = line.match(UNTRUSTED_DECODE_TOKEN) ?? [];
     if (matches.length > 0) { const found = UNTRUSTED_DECODE_LINES.get(rel) ?? []; ... set(rel, found); }
   }
   ```
   `line` there is already `strip`ped (`:1089`: removes regex literals, `//` comments, `/* */` on one line, `"`/`'`
   strings and single-line template text; multi-line block comments are skipped by the `trimStart().startsWith("*")`
   guard at `:1160`). For `MODULE_STATE_BUDGET` the token is `/^(?:let|var)\s/` on the stripped line (column 0 only),
   which is what keeps indented function-local `let` (e.g. `makeGateRegistry`'s `let collisions = 0;`, `let stale`)
   out, with no `Object.hasOwn`/parser needed. Check `isTestFile` (src-only, like the other budgets) and `rel`
   starting `packages/` and containing `/src/`.
4. Both-direction check (`:1692-1710`): for each budget key, `found.length !== budget` fails with
   `[untrusted-decode] declares N ..., found M at line(s) ...` and "Update X in scripts/check-house-style.mjs and AGENTS.md
   section 7a's table"; then for each found file not in the budget, a failure naming the rule.
5. AGENTS.md table check (`:1727-1750`): finds the header with
   `/^\|\s*Location\s*\|\s*Count\s*\|\s*Why\s*\|/` and reads rows with
   ``/^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|/``; failures `[untrusted-decode-table]`. **Gotcha:** this header regex is
   unique to §7a; the new table must use a different header (for example `| Location | Count | Why |` is taken, so use
   `| Module-scope state | Count | Why |`, or the first-column header will match §7a's parser if identical).
   Use a distinct header text and a distinct tag `[module-state-table]`, and add `[module-state]` for the count check.

`UNTRACED_BUDGET` (`:469`, check `:1410-1417`) is the other analog: a plain `{file: count}` with
"Update UNTRACED_BUDGET ... AGENTS.md §5's table so all three agree". Also update the file's header comment that
enumerates budgets (`:24`, `:42`) and the `:1160-1190` comment "These five budgets are src-only" if relevant.

**Self-test:** `check-house-style.mjs` has no self-test mode (no `--self-test`, no `selfTest`; verified by grep).
So WX-06 evidence is a planted second column-0 `let` in a scratch copy or working-tree plant never committed, run with
`node scripts/check-house-style.mjs`, first output line recorded in `71-RED-EVIDENCE.md`. (`scripts/check-dod-table.mjs`
and `run-check.mjs` are other gates; `check-house-style` itself is a step of `pnpm check`.)

**Do not flag:** `Policy.ts`'s `depthMemo` is a `const` (`packages/core/src/Policy.ts:1322,1331`), so a `let`/`var`-only rule
leaves it and read-only lookup tables alone, as D-01 prefers.

### AGENTS.md

- §13 sentence to correct in place (the "No module-scope state is left in this package" bullet, ADR-QD-053 guard bullet):
  keep the superseded claim as a corrected passage, the house's way (the same bullet already preserves its history:
  "This section previously read as forbidding it ...").
- New table placed with §6's other budgets, in the shape of §7a's:
  `| Location | Count | Why |` rows written as `` `packages/react/src/DeveloperSignals.ts` | 1 | ... ``. See the
  header-uniqueness gotcha above.
- If a negative tstyche pin is added, update §6's `NOT_CALLABLE_PIN_BUDGET` table.

### `71-mutation.mjs`

**Analog:** `.planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-mutation.mjs` (header comment `:1-14`;
`GROUPS` at `:19-33`). Excerpt:
```js
const D = ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/";
const R = "packages/react/src/";
const GROUPS = {
  react: { config: "stryker.react.mjs", report: "reports/mutation-react/mutation.json", files: [`${R}HydrationEngine.ts`] },
  buckets: { ..., files: [`${R}HydrationBuckets.ts`], closeOnly: true },
};
const invocation = (group) => `pnpm exec stryker run ${GROUPS[group].config} --mutate ${GROUPS[group].files.join(",")}`;
```
Config is `stryker.react.mjs` at the repo root (also `stryker.config.mjs`, others). Subcommands: `record base|close <group>`,
`compare`, `--self-test`; `record` refuses a dirty tree via `dirtyReasons`/`gitStatus`; the removed-mutant rule and
`EXAMINED` come from Phase 70. Plan: copy it, change `D`, and make `GROUPS` one per file (`DeveloperSignals`, `GateRegistry`,
`QadiAtoms`, `HydrationEngine`, `QadiProvider`) all with `stryker.react.mjs`; one group per file keeps each `--mutate` run
bounded and each record's "single head" rule intact. A new file (if the table is split out, D-08) is `closeOnly: true`.
Records go to `71-mutation-base.json` / `71-mutation-close.json`. The scorer is excluded from `pnpm check` by being in `.planning`.

### Spec and records (analog: Phase 70's)

- **ADR:** `spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md` is the most recent ADR shape
  (latest entries: `182-...`, `183-...`, plus `spec/decisions/index.yaml`, where `ADR-QD-183` starts at line 561 and carries a
  `status` string such as "Accepted — amends ADR-QD-123 ...; amended 2026-11-22 (ADR-QD-183: ...)"). Add `ADR-QD-184`
  there; ADR-QD-041 (`041-a-mismatch-is-announced.md`) and ADR-QD-052
  (`052-hydration-is-counted-where-both-ends-can-see-it.md`) get an "amended" status annotation like ADR-QD-183 gave its targets.
- **Invariants:** `spec/invariants.md` change-history row at line 13, e.g. "1.173 (2026-11-22): ... (ARCH-117, CCR-QD-462)";
  the next row is 1.174 citing INV-QD-387/388 and CCR-QD-463. Edit only through `node scripts/spec-revise.mjs --date 2026-11-22`
  (never hand-edit registers; never run `next-id.mjs`).
- **Behaviours:** `spec/behaviors/09-react.md` (provider/atom-set signals), `19-hydration.md` (BEH-QD-230 and `ReporterThrew`
  lines near `:529`, `:749`), `28-devtools-screens.md` (`onIdCollision` near `:459`, `:544`). TypeScript fences must be
  `typescript` if runnable, `ts` for signatures (AGENTS.md §12).
- **Changeset:** `.changeset/react-hydration-drop-buckets.md`:
  ```md
  ---
  "@qadi/react": patch
  ---

  <one sentence of what changed and what did not>
  ```
  Phase 71's states that a direct `makeGateRegistry` caller's `ReporterThrew` line now names `onIdCollision`.

## Shared Patterns

### Confinement of `console` / `process.env`
**Source:** `DeveloperSignals.ts:1-35` header and `say` (`:214`); `no-ambient-console` exemption at `check-house-style.mjs:356`
(unchanged). **Apply to:** every new file this phase adds (a split-out table must not mention either global).

### Table total by construction, tag-indexed
**Source:** `HydrationEngine.ts:228-276` plus AGENTS.md §5a's third form. **Apply to:** the signal table and any
derived `ReporterName`/entry-point record. No `switch`, no `Object.hasOwn`, no fail-closed row.

### Budget in both directions plus an AGENTS.md table
**Source:** `UNTRUSTED_DECODE_BUDGET` flow above. **Apply to:** `MODULE_STATE_BUDGET`.

### Doc-comment shape
**Source:** `DeveloperSignals.ts` comments: a one-line summary, then rationale and ADR/ARCH citations after it. Cite
ARCH-60 for containment and ADR-QD-041/184 for the confinement.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| a script self-test for `check-house-style.mjs` | gate | The script has no self-test mode; use a planted `let` (D-10.3). |
| a test that resets the latch | test | None exists by design; isolation is per test file (`QadiProvider.production.test.tsx:1-7`). |

## Metadata

**Analog search scope:** `packages/react/src`, `packages/react/test`, `packages/core/src` (tables), `scripts/check-house-style.mjs`, `.planning/phases/QD-70-*`, `spec/decisions`, `.changeset`.
**Not read in full (planner should read before editing):** `GateRegistry.test.tsx`, `GateRegistry.store.test.ts`, `QadiProvider.signals.test.tsx`, `QadiAtoms.ts` around `:232-260`, `spec/behaviors/*.md`, `ADR-QD-183` body, `stryker.react.mjs`.
**Pattern extraction date:** 2026-11-22
