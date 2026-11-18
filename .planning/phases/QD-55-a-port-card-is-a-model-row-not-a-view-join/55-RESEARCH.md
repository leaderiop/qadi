# Phase 55: A port card is a model row, not a view join - Research

**Researched:** 2026-11-18
**Domain:** `@qadi/devtools` — a pure model row per `PortName` behind the Services tab; behaviour-preserving refactor
**Confidence:** HIGH (every fact below was read at `4d891643` this session; the typing recipe was compiled in a scratch project)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Model shape and home**
- **D-01:** The join lives in a new module, `packages/devtools/src/model/PortCards.ts`, exporting `portCards(input)`. It is the counterpart of `joinQuestions` in `Gates.ts` and sits beside `PortReading.ts`.
- **D-02:** It returns words, not raw data: a `ServicesView` tagged enum with `NotHanded`, `Failed{reason}` and `Read{rows, cache}`.
  - Each row carries:
    - the state text;
    - the activity line;
    - the consequence text and its tone (warning when defaulted, plain otherwise);
    - the `data-port` and `data-defaulted` values;
    - a closed calls union: `Hidden` (uncollected and unsampled), `Uncollected` (the "pass `portCalls`" note), or `Listed{calls, earlier}`.
  - The wiring-state `Match` moves into the model. The view only maps tags to JSX.
- **D-03:** The dock model calls it, once for each merged diagnostics snapshot, and `ServicesPanel` receives the `ServicesView`. This follows ADR-QD-162, where `joinQuestions` is a `DockModel` store. Phase 56 edits `DockModel` after this phase (soft dependency).
- **D-04:** The cache card's wording (`N completed entries` / `absent`) moves into the model. Fixed prose stays in the view, because it is text and not computation: the process-wide scope note and the no-TTL sentence.

**Keying by `PortName` (CARD-03)**
- **D-05:** `PortActivity.port` narrows from `string` to `PortName`. It is exported from `@qadi/devtools`, so this is a public type change with a Breaking changeset entry (see D-15).
- **D-06:** `portActivity` reads one entry per registry port, using `forEveryPort` over the descriptions and looking up each port's own name in the metric. There is no cast and no iteration over the metric's string keys. The `> 0` "reached" filter (issue #107) is kept.
- **D-07:** Report rows stay keyed by `WiredServiceName`: the 5 ports plus `EvaluationId`, `CurrentSubject`, `DecisionCache` and `DecisionSink`.
  - Activity and calls become per-port records, `{ readonly [K in PortName]: … }`.
  - Calls are grouped once per log, not filtered once per card.
  - A non-port row takes a closed "not a port" branch through a type guard derived from the registry. It is not a string comparison.
- **D-08:** Proof:
  - a tstyche file pins two compile errors: a misspelt port in the activity/calls records, and one in a `PortActivity` literal;
  - a scoped grep in verification shows that no `===` on a port string remains in the join.

**Wording preserved (CARD-01)**
- **D-09:** All text and `data-testid`s stay byte-identical. That includes today's "never called" on the four non-port service cards, although no metric ever counts them. That wording is deferred (see Deferred Ideas), not fixed here.
- **D-10:** `SHOWN_PER_PORT = 5` and `NO_ACTIVITY_READING` move to the model with their *why* comments.
- **D-11:** All per-call wording moves to the model row, and the view prints strings:
  - the `· N attempts` suffix (`describe`);
  - the "served"/"translation" labels (only `remote` and `toPredicate` are labelled);
  - "in flight" vs `x.x ms`;
  - "and N earlier".
- **D-12:** The model supplies each call row's React key, with the same value as today (`${span}-${String(at)}-${description}`).

**Tests, mutation, records**
- **D-13 (CARD-01, WX-06):** A new `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` is written on the phase base. The precedent is `QuestionsPanel.characterisation.test.tsx`.
  - It asserts every card's full text and `data-testid`s, and `data-port`/`data-defaulted`.
  - It covers every combination of: wiring state, sampled or unsampled, calls collected or not, and fewer or more than 5 calls, including every interpreter label and the in-flight duration.
  - It is green before and after the change and is never edited.
- **D-14 (CARD-04):**
  - Each render case in `ServicesPanel.test.tsx` and `ServicesPanel.reading.test.tsx` first becomes a headless `packages/devtools/test/model/PortCards.test.ts` case.
  - The render case is deleted only once its model twin is green (Phase 26 precedent).
  - A short render test keeps the `data-testid`s and the tag-to-JSX mapping.
  - `portCards` gets a unit test that is RED by import before the module exists.
- **D-15 (WX-05):** Phase 53's D-14 rule applies, with the static-ignored credit the owner accepted in Phase 54 (ADR-QD-167 Rev 1.1).
  - Record `55-mutation-base.json` (`stryker.devtools.mjs`) for every touched model file on the phase base: `Wiring.ts`, `DockModel.ts`, and `PortCalls.ts`/`PortReading.ts` if touched.
  - A touched file whose score drops passes only when its survivor set is unchanged and the drop is exactly killed mutants that moved into `PortCards.ts`, where they are still killed.
  - Any other drop is closed with a test, never re-baselined.
  - New `PortCards.ts` has no surviving mutant that a test could kill.
  - The view is outside the mutate glob (`packages/devtools/src/model/**/*.ts`).
- **D-16 (WX-07):** One `@qadi/devtools` **minor** changeset with one **Breaking** entry: `PortActivity.port` is now `PortName`. The panel's wording is unchanged.
- **D-17 (CARD-05, WX-02):**
  - ADR-QD-168 follows ADR-QD-162's precedent, restates ADR-QD-047's "the panel renders that model and computes nothing" for the Services tab, and keeps ADR-QD-160.
  - INV-QD-355: a port card's readings are joined by `PortName` in one pure model function.
  - INV-QD-356: the Services panel computes nothing.
  - CCR-QD-446 and BEH-QD-611..615 cover the rest. An unused reservation is named "Unused: …" in the CCR row.
  - `spec/overview.md` changes only if an export changes; gate 13 `check-api-surface.mjs` decides.

### Claude's Discretion
- Exact names of the view type, the row fields and the calls union, provided they read as domain words.
- Whether the non-port guard lives in `PortCards.ts` or `Wiring.ts`.
- BEH placement across the devtools behaviour docs.

### Deferred Ideas (OUT OF SCOPE)
- The four non-port service cards (`EvaluationId`, `CurrentSubject`, `DecisionCache`, `DecisionSink`) read "never called" (or "no activity reading"), although no metric ever counts them. A later phase could say "not a port — no calls are counted". Kept byte-identical here under CARD-01 (D-09).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CARD-01 | Characterisation of every card's text and testids on the base, byte-identical after | §Q1 wording inventory, §Characterisation matrix (14 cells through the dock's public props, `outerHTML` goldens, the `QuestionsPanel.characterisation.test.tsx` shape) |
| CARD-02 | One pure function: wiring read + activity + call log + unsampled flag → one row per `PortName` | §Q3 (where it runs), §Code Examples (`portCards` shape), §Open Question 1 (the `NotHanded`+unsampled case needs a representation) |
| CARD-03 | Three readings keyed by `PortName`; misspelt/unknown port is a compile error; no string-key comparison in the join | §Q4 (typechecked recipe: `forEveryPort`, `tabulatePorts`, `Object.hasOwn(PORTS, …)` guard, `Map`-based grouping), §tstyche pins |
| CARD-04 | Panel renders rows only; most render cases move to model tests; short render test keeps testids | §Q2 render-case inventory (32 + 24, each classified), §Q3 panel props |
| CARD-05 | ADR-QD-168 follows ADR-162; ADR-047 restated for the Services tab | §Q6 records |
| WX-01 | `pnpm check:pr < /dev/null` green | §Validation Architecture |
| WX-02 | ADR/CCR/BEH/INV/traceability with reserved numbers only | §Reserved ids, §Q6 |
| WX-03 | `spec/overview.md` names every added/removed export | §Q3: no export added or removed; only the `PortActivity` row's text changes |
| WX-04 | No new `as`/`!`/`any`/`switch`/`fnUntraced`/`async`/ambient | §Q7 pitfalls (`as` is matched textually, JSX prose included) |
| WX-05 | Stryker score of touched files does not fall | §Q5 (base was 100% on 5 files in a stale report; any new equivalent mutant in `Wiring.ts`/`DockModel.ts` is a fall) |
| WX-06 | Characterisation before behaviour change | §Characterisation matrix; sequencing in §Architecture Patterns |
| WX-07 | Breaking in changeset **and** `upgrading.md` | §Q6: **D-16 names only the changeset; WX-07 (REQUIREMENTS.md:89) also requires an `upgrading.md` entry** |
</phase_requirements>

## Summary

Phase 55 moves everything `ServicesPanel.tsx` computes (state wording, the activity line with its three suffixes, newest-first/five-shown/"and N earlier", per-call wording, the uncollected/unsampled rules, the cache size text, the wiring-state `Match`) into one pure function `portCards` in a new package-private module `model/PortCards.ts`, and has the dock model hold its result as a store so the panel receives a finished `ServicesView`. The panel keeps only fixed prose and a tag-to-JSX mapping. Keying by `PortName` is achievable cast-free: `forEveryPort`/`tabulatePorts` from `@qadi/core`, an `Object.hasOwn(PORTS, name)` type predicate (the `isGateState` pattern) for the four non-port rows, and `Map`-based grouping. I compiled that recipe against the repo's real `@qadi/core` source in a scratch project; both "misspelt port" pins fire as compile errors.

Four findings change the plan relative to CONTEXT.md. (1) **WX-07 requires an `upgrading.md` entry**, not only the changeset D-16 names. (2) **Narrowing `PortActivity.port` breaks two test sites outside the Services tests**: `features/features/devtools-screens/devtools-screens.steps.test.ts:419` (`entry.port === "EvaluationId"` → TS2367, reproduced) and `packages/devtools/test/model/DockModel.test.ts:787` (`suppliedActivity` is a widened `{port: string}[]`, reproduced). Both are type-only test edits and must land in the same commit as the type change. (3) D-02's three view tags cannot express "`NotHanded` while unsampled renders nothing" without either a fourth tag or a flag (Open Question 1). (4) A `services` store is the dock model's **ninth** store, so ADR-QD-168 and the `DockModel.ts` header must restate the count that ADR-QD-162 states as eight.

The wording inventory is complete and cross-checked against `55-UI-SPEC.md` (approved, same values). The four non-port rows render "never called" **and also the "pass `portCalls`" uncollected note** today; both are kept. Because `src/model/**` is held at 95% coverage and is inside the Stryker glob, moving the view logic into the model puts it under both bars automatically; the characterisation test (which renders through the dock) also kills model mutants.

**Primary recommendation:** sequence as characterisation (green on base) → `PortCards.ts` + `PortCards.test.ts` + keying/type edits (panel untouched) → `services` store + panel rewrite + deletion of migrated render cases in one commit → records/changeset/`upgrading.md` → mutation compare. Hold `ServicesView` in `DockModel.services` (a `Pick<ExternalStore<ServicesView>, "subscribe" | "getSnapshot">`, mirroring `questions`), recomputed only when `wiring`, `activity`, `portCalls` or the `unsampled` flag changes identity.

## Base facts (verified against HEAD this session)

`git log --oneline -1` = `4d891643 docs(55): smart discuss context` (expected). No source changed since Phase 54. Baseline run: `pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.test.tsx packages/devtools/test/react/ServicesPanel.reading.test.tsx packages/devtools/test/model/Wiring.test.ts < /dev/null` → 3 files, 86 tests passed (32 + 24 + 30). [VERIFIED: ran it]

- `packages/devtools/src/react/ServicesPanel.tsx` (325 lines): `NO_ACTIVITY_READING` :28; `SHOWN_PER_PORT = 5` :37; `ServicesPanelProps` :39-60 (`wiring`, `activity`, `portCalls?`, `diagnostics`); `card` style :62-67; `Shown` :74-79; `wiringView` (hoisted `Match.type<WiringRead>()` returning `(shown) => ReactNode`) :81-115; `ServicesPanel` :117-141 (`isUnsampled(diagnostics.status)` at :125); `PortCard` :143-193; `RecentCalls` :202-259; `describe` :266-269; `callsFor` :271-272; `stateOf` :281-288; `CacheCard` :307-320; `activityFor` :322-325.
- `packages/devtools/src/model/Wiring.ts` (237 lines): `WiredServiceName` :41-46; `PortReport` :48-73; `CacheReport` :75-79; `wiringReport` :95-126; `portRow` :128-139; `PortActivity` :141-160 with `readonly port: string;` at :142; `portActivity` :185-218; `required`/`optional` :223-237.
- `packages/devtools/src/model/PortCalls.ts`: `PortCallPort = PortCall["_tag"]` :40; `PORT_BY_SPAN` :51-53 (the cast-free string→`PortName` step, built with `forEveryPort`); `PortCall` :139; `PortCallLog` :141-154; `ROWS` :274-280.
- `packages/devtools/src/model/PortReading.ts`: `PORT_READING` :29-72; `describeCall` :75-76.
- `packages/devtools/src/model/DiagnosticsStore.ts`: `WiringRead` :58-65 (`NotHanded`/`Failed{reason}`/`Read{report}`); `Diagnostics` :70; `mergeReading` :123; `keep` :152 (`Equal.equals`); `makeDiagnosticsStore` :154.
- `packages/devtools/src/model/DiagnosticsFeed.ts`: `DiagnosticsSnapshot` :65; `isUnsampled` :118 (`Off`→false, `Starting`→true, `Live`→false, `Stopped`→`!sampled`).
- `packages/devtools/src/model/DockModel.ts` (294 lines): `shownReading = makeExternalStore<DiagnosticsSnapshot>(mergedOf(fed, supplied))` :160; `remerge` :161-167; `joinKeyNow`/`rejoin`/`questions` store :192-218; `shownReading.subscribe(rejoin)` :241; returned object :257-293 (`diagnostics` :263, `questions` :269).
- `packages/devtools/src/react/DevtoolsDock.tsx`: `useStoreSnapshot(model.diagnostics)` :182; `Screen` :306; Services lambda :330-337 (`props.shown.wiring/activity/portCalls`); Questions lambda passes `props.model.questions` :341.
- `packages/core/src/PortInterpreter.ts:19`: `export const portInterpreter = Schema.Literals(["evaluate", "toPredicate", "remote"]);` [VERIFIED: read]. `packages/core/src/Ports.ts`: `PORTS` registry, `tabulatePorts`, `forEveryPort` (declaration order AttributeResolver, DecisionHistory, RelationshipResolver, CustomPredicate, SignatureHistory) [VERIFIED: read]; all exported via `export * from "./Ports.ts"` (`index.ts:42`).
- `AGENTS.md` §9: the devtools barrels are named exports; `PortActivity` is already exported (`src/index.ts:139-145`). `ServicesPanel` is **not** exported from `react/index.ts` (the upgrade guide lists it among removed exports), so a `ServicesView` type consumed by it stays package-private.

### Reserved ids (Phase 55)

ARCH-102, ADR-QD-168, CCR-QD-446, BEH-QD-611..615, INV-QD-355..356. Highest in use on HEAD: ADR-QD-167 (`spec/decisions/index.yaml` tail), CCR-QD-445 (`spec/README.md:382`), BEH-QD-610, INV-QD-354 (`spec/invariants.md`). `/usr/bin/grep -c 'BEH-QD-61[1-5]\|INV-QD-35[5-6]\|ADR-QD-168\|CCR-QD-446'` over `spec/` found nothing — free. Next document revisions (current → next): `spec/README.md` 1.248 → 1.249; `spec/traceability.md` 1.215 → 1.216; `spec/overview.md` 1.122 → 1.123; `spec/invariants.md` 1.152 → 1.153; `spec/behaviors/28-devtools-screens.md` 1.30 → 1.31; ADR-QD-047 1.16 → 1.17. [VERIFIED: `Revision` rows read]. Never run `next-id.mjs`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Join wiring row + activity + calls by `PortName`, all wording | `@qadi/devtools` headless model (`model/PortCards.ts`) | — | "Renders that model and computes nothing" (ADR-QD-047); testable without React |
| When to recompute the join, snapshot identity | Dock model store (`DockModel.services`) | — | ADR-QD-162's precedent: one synchronous step per merged snapshot, reference kept when nothing moved |
| Reading metrics per port | Model (`Wiring.ts portActivity`) | `@qadi/core` registry (`forEveryPort`) | The keys come from the registry, not the metric's string keys |
| Tag → JSX, fixed prose, styles, tone → colour | `@qadi/devtools/react` (`ServicesPanel.tsx`) | — | Prose with `<code>` markup is text, not computation (D-04) |
| Unsampled flag | Dock model (`isUnsampled(status)`) | — | Already the model's rule (`DiagnosticsFeed.ts:118`); the panel stops importing it |

## Standard Stack

No new package. Everything is in-repo or already a dependency. [VERIFIED: `packages/devtools/package.json` read]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` | 4.1.2 (installed) | `Data.taggedEnum`, `Match.tagsExhaustive`, `Metric.value` | The house tag/dispatch idiom (AGENTS.md §5a; `GatesView`, `WiringRead`) [VERIFIED: node_modules/effect/package.json] |
| `@qadi/core` | workspace | `PortName`, `PORTS`, `forEveryPort`, `tabulatePorts`, the five metrics | The registry is the only source of port names |
| vitest | 5.1.0 | model + render tests | [VERIFIED: baseline run banner] |
| tstyche | 7.2.5, target TS 6.0.3 | compile-error pins | `tstyche.json`; existing `Wiring.tst.ts` ran green [VERIFIED: ran it] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Store `services` in `DockModel` | A field on `DiagnosticsSnapshot` | `DiagnosticsSnapshot` is public (`react/index.ts`); a field there is a second public break. Rejected |
| Store `services` in `DockModel` | `useMemo(() => portCards(...))` in `DockFrame` | A view join again; contradicts D-03 and INV-QD-356. Rejected |
| `Object.hasOwn(PORTS, name)` guard | `Set<string>` built with `forEveryPort` | Same result; the own-key test is the existing `isGateState` pattern (`core/src/GateState.ts`) |

**Installation:** none.

## Package Legitimacy Audit

No external package is installed or added by this phase. `gsd-tools query package-legitimacy check` is not applicable.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
host props (reading?, diagnostics?)        collector.snapshot / metrics / layer
        │                                              │
        ▼                                              ▼
 DiagnosticsFeed ──► DiagnosticsStore (keep: Equal.equals per field) ──┐
        │ status                                                       │ wiring, activity,
        ▼                                                              │ portCalls
 mergedOf(fed, supplied) ──► shownReading store {status, reading} ◄────┘
        │  (listener registered BEFORE any host/React listener)
        ▼
 reservice():  key = { reading.wiring, reading.activity, reading.portCalls, isUnsampled(status) }
        │   all four === last key ? ──yes──► publish nothing (snapshot identity kept)
        │   no
        ▼
 portCards(key)  ── pure ──►  ServicesView
        │                       NotHanded | Withheld? | Failed{reason} | Read{ rows[PortCardRow], cache }
        │   inside: viewOf (hoisted Match) ─► per row: isPortName(row.port)?
        │             yes: activityByPort[row.port], callsByPort[row.port]   (Map-grouped once)
        │             no : no activity entry, no calls          (closed "not a port" branch)
        ▼
 DockModel.services store ──► DevtoolsDock Screen ──► <ServicesPanel services={…} diagnostics={notice}/>
                                                          │ useStoreSnapshot
                                                          ▼
                                       Match.tagsExhaustive(view) → JSX (prints strings, maps tone → style)
```

### Recommended Project Structure
```
packages/devtools/src/model/PortCards.ts      # NEW, package-private: portCards, ServicesView, PortCardRow, CallsView, SHOWN_PER_PORT, NO_ACTIVITY_READING
packages/devtools/src/model/Wiring.ts         # PortActivity.port: PortName; portActivity via forEveryPort; isPortName guard (discretion: or PortCards.ts)
packages/devtools/src/model/DockModel.ts      # + services store, header count restated
packages/devtools/src/react/ServicesPanel.tsx # props { services, diagnostics }; renders rows only
packages/devtools/src/react/DevtoolsDock.tsx  # Services lambda passes props.model.services
packages/devtools/test/model/PortCards.test.ts, PortCards.tst.ts           # NEW
packages/devtools/test/react/ServicesPanel.characterisation.test.tsx       # NEW, written on the base, never edited
```

### Recommended sequencing (each step green)
1. **Base (no src change):** commit `55-mutation.mjs` + `55-mutation-base.json` on the untouched green tree; then `ServicesPanel.characterisation.test.tsx` (green). Run Stryker alone, never next to vitest.
2. `PortCards.test.ts` RED by import, then `PortCards.ts` + `Wiring.ts` keying/guard + `portActivity` rewrite + the two type-only test edits (§Q4) + `PortCards.tst.ts`. The panel is untouched; all old render tests still green.
3. `DockModel.services` + its tests; `ServicesPanel.tsx` rewrite + `DevtoolsDock.tsx`; delete each migrated render case (its twin is already green from step 2); add the short render test. **One commit**: the old render tests render `<ServicesPanel wiring= activity= portCalls=>`, so they cannot survive the prop change.
4. Records, changeset, `upgrading.md`, `55-mutation-after.json` + compare, full gates.

### Pattern 1: the `ServicesView` shape (names are discretion; this is the recommended reading)
```typescript
// Sketch — the tag/union shapes follow GatesView/QuestionsView in Gates.ts:262-293
export type CallsView = Data.TaggedEnum<{
  /** Nothing to say: no collector and no sample yet, or a collector that saw no call for this port. */
  Hidden: {};
  /** No collector and a sample was taken: the "pass portCalls" note. */
  Uncollected: {};
  Listed: { readonly calls: ReadonlyArray<CallRow>; readonly earlier: string | undefined }; // "and 3 earlier" | undefined
}>;
export interface CallRow {
  readonly key: string;                       // `${span}-${String(at)}-${description}` (D-12)
  readonly text: string;                      // describeCall + " · N attempts"
  readonly interpreter: string | undefined;   // "served" | "translation" | undefined
  readonly duration: string;                  // "in flight" | "1.3 ms"
}
export interface PortCardRow {
  readonly port: WiredServiceName;            // data-port, <strong>, React key
  readonly defaulted: "true" | "false" | undefined; // data-defaulted
  readonly state: string;
  readonly activity: string;
  readonly consequence: string;
  readonly tone: "Warning" | "Plain";
  readonly calls: CallsView;
}
export type ServicesView = Data.TaggedEnum<{
  NotHanded: {};
  Withheld: {};   // NotHanded while unsampled: renders nothing (Open Question 1)
  Failed: { readonly reason: string };
  Read: { readonly rows: ReadonlyArray<PortCardRow>; readonly cache: string };
}>;
```

### Anti-Patterns to Avoid
- **Plain-object index by an untrusted string** (`byPort[call._tag]`): `__proto__`/`constructor` read as present (INV-QD-351/352's class). Use a `Map` for grouping.
- **`list.find((e) => e.port === d.port)`** in the join: typed, but it is still a `===` on a port and trips the D-08 grep; use `Map.has`/`Map.get`. First entry must win (see Pitfall 3).
- **Conjuncts with an equivalent mutant** (`x !== undefined && x > 1`): the `true &&` mutant is unkillable. Write `attempts === undefined || attempts <= 1 ? plain : suffixed`, where every operand changes the result.
- **Importing `isUnsampled` into the model join.** The flag is an input (D-01); `DockModel` computes it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One value per port | A literal 5-key object | `tabulatePorts<ByPort<X>>((d) => …)` (precedent `http/src/PortRoutes.ts:98`, `devtools/src/model/Capture.ts:72`) | A sixth port is a row without an edit |
| Port names from the metric | Iterating `occurrences.keys()` | `forEveryPort` + `occurrences.get(d.port)` | The metric's keys are `string`; the registry's are `PortName` |
| `WiredServiceName` → `PortName` | A `=== "EvaluationId" \|\| …` chain, or a cast | `(name): name is PortName => Object.hasOwn(PORTS, name)` | Derived from the registry, own keys only (`core/src/GateState.ts` `isGateState`) |
| Snapshot identity | A deep compare of the view | Compare the four input references, as `rejoin` does (`DockModel.ts:203-218`) | `Diagnostics` fields already keep identity via `keep(Equal.equals)` |
| Store mechanics | A new subscribe/notify | `makeExternalStore` + `useStoreSnapshot` | One `useSyncExternalStore` call in the package |

## Q1. Exact wording inventory (D-09, D-13)

All strings `[VERIFIED: ServicesPanel.tsx read this session]` and agree with `55-UI-SPEC.md`. `·` is U+00B7, `—` is U+2014.

**Root:** `<div {...diagnosticsRootProps(diagnostics.status)} data-testid="qadi-services">`: `DiagnosticsNotice`, then the wiring view, then `<p data-testid="qadi-activity-scope">` (fixed prose :127-139, always present).

**`wiringView` (:81-115), by tag**

| Tag | Output |
|-----|--------|
| `NotHanded`, `unsampled` | `null` (nothing between notice and footer) |
| `NotHanded`, sampled | `<p data-testid="qadi-wiring-absent">No layer was handed to the dock, so which implementation is behind each port cannot be shown. Pass <code>diagnostics={{ layer }}</code>, or a <code>wiring</code> report read elsewhere.</p>` |
| `Failed{reason}` (regardless of `unsampled`) | `<p data-testid="qadi-wiring-failed" style=amber>The layer handed to the dock failed to build, so which implementation is behind each port cannot be shown: {reason}</p>` |
| `Read{report}` | one `PortCard` per `report.ports` row in report order (React key = `port.port`), then `CacheCard`. `noActivityReading = unsampled && activity.length === 0` is computed on the whole list, once for every card |

**`PortCard`** (`<section data-testid="qadi-port" data-port={port} data-defaulted={String(defaulted) | absent}>`): `<strong>{port}</strong>`, `qadi-port-state`, `qadi-port-activity`, `qadi-port-consequence`, then `RecentCalls`.

- **State (`stateOf` :281-288), rule order is the contract:** `!present` → `required ? "not provided to this reader" : "absent"`; else `defaulted === true` → `` `defaulted — ${name ?? "unnamed"}` ``; else `name ?? "wired, unnamed"`.
- **Activity (:162-175):** no entry → `noActivityReading ? "no activity reading" : "never called"`; entry → `` `${calls} call${calls === 1 ? "" : "s"}` `` + (`translationCalls === 0 ? "" : " · N from translation"`) + (`retries === 0 ? "" : " · N retried"`) + (`timeouts === 0 ? "" : " · N timed out"`), in that order. `calls` may be 0 (`"0 calls · 2 from translation"`).
- **Consequence (:177-190):** text `defaulted === false ? "if defaulted: " + consequence : consequence` (so `true` and `undefined` print bare). Style: `defaulted === true` → `color: colors.error` (UI-SPEC: "warning" tone); else plain muted.
- **`data-defaulted`:** `defaulted === undefined ? undefined : String(defaulted)`.

**`RecentCalls` (:202-259)** — evaluated in this order:

| Condition | Output |
|-----------|--------|
| `portCalls === undefined` and `unsampled` | `null` |
| `portCalls === undefined` and sampled | `<div data-testid="qadi-calls-uncollected">What each call asked is not shown — pass <code>portCalls</code> from <code>collectPortCalls</code> to read it from the spans.</div>` |
| collected, `calls.length === 0` for this card | `null` (**also the case for every non-port card**) |
| collected, non-empty | `<div data-testid="qadi-port-calls">`: newest first (`[...calls].reverse().slice(0, 5)`); each `<div data-testid="qadi-port-call">` = `<span>{describe(call)}</span>`, optional `<span data-testid="qadi-port-call-interpreter">` (`remote` → `served`, `toPredicate` → `translation`, `evaluate`/`undefined` → element not rendered), `<span data-testid="qadi-port-call-duration">` (`durationMillis === undefined ? "in flight" : durationMillis.toFixed(1) + " ms"`); key `${call.span}-${String(call.at)}-${describe(call)}`. Then, only if `calls.length > shown.length`, `<div data-testid="qadi-port-calls-more">and {calls.length - shown.length} earlier</div>` |

`describe` (:266-269): `attempts !== undefined && attempts > 1 ? \`${describeCall(call)} · ${attempts} attempts\` : describeCall(call)`. Exactly 5 calls shows no overflow row; 6 shows `and 1 earlier`.

**`CacheCard` (:307-320):** `<section data-testid="qadi-cache-card"><strong>DecisionCache</strong><span data-testid="qadi-cache-size">{present ? \`${size ?? 0} completed entries\` : "absent"}</span></section>` plus the fixed prose line `Bounded by capacity and evicted by insertion order — there is no time-to-live. Flushing a cache differs from clearing this panel's log.` (`&apos;` in source).

**Do the four non-port rows render "never called" today? Yes — confirmed by code.** `activityFor(activity, "EvaluationId")` finds nothing (no metric counts them), so the activity span reads `never called` (or `no activity reading` when unsampled with an empty list). **They also render the uncollected note** (`callsFor` returns `[]`; `RecentCalls` has no port check), and `DevtoolsDock.test.tsx:1027` asserts `isNotEmpty(queryAllByTestId("qadi-calls-uncollected"))` against the real nine-row report. Both stay (D-09); CONTEXT names only the first.

## Characterisation matrix (D-13) — the minimal set that reaches every branch

**Reach the panel only through `DevtoolsDock`'s public props** (the panel's own props change in this phase, so a file that renders `<ServicesPanel>` could not stay unedited). Copy `QuestionsPanel.characterisation.test.tsx`: `render(<DevtoolsDock {...props} />)`, click the "Services" button, compare `screen.getByTestId("qadi-services").outerHTML` whole against a `GOLDEN` literal (never substrings). Supply `reading={{ wiring: WiringRead.Read({ report }), activity, portCalls }}`. Status is chosen by the `diagnostics` prop: absent → `Off` (sampled); `{ layer: Layer.effectDiscard(Effect.never) }` → `Starting` (**unsampled**, the precedent's `neverBuilt`); `{}` → `Live`. Fixtures are local to the file (the precedent defines its own); reuse the shapes from `ServicesPanel.test.tsx:20-54` (`wiring`, `logOf`) and `:367-377` (`attributeCall`).

**Fixture R9** (one report reaching every state word; report order = the real one):

| # | `port` | `required` | `present` | `name` | `defaulted` | state text |
|---|--------|-----------|-----------|--------|-------------|-----------|
| 1 | AttributeResolver | true | true | `"attributeResolverFromRecord"` | false | `attributeResolverFromRecord`, `if defaulted: …` |
| 2 | DecisionHistory | true | true | `"DecisionHistoryNone (retrying)"` | true | `defaulted — DecisionHistoryNone (retrying)`, amber |
| 3 | RelationshipResolver | true | true | undefined | true | `defaulted — unnamed` |
| 4 | CustomPredicate | true | true | undefined | undefined | `wired, unnamed` (present port with no `defaulted`, as `ServicesPanel.test.tsx:23-29` has) |
| 5 | SignatureHistory | true | false | undefined | undefined | `not provided to this reader`, no `data-defaulted` |
| 6 | EvaluationId | true | true | `"ids"` | undefined | `ids` |
| 7 | CurrentSubject | true | true | undefined | undefined | `wired, unnamed` |
| 8 | DecisionCache | false | false | undefined | undefined | `absent` |
| 9 | DecisionSink | false | true | undefined | undefined | `wired, unnamed` |

Use distinct `consequence` strings (or the real five from `PORT_READING`) so a swapped row shows.

**Activity fixture A:** AttributeResolver `{calls 12, retries 2, timeouts 1, translationCalls 3}` (all three suffixes, order); DecisionHistory `{1,0,0,0}` (`1 call`); RelationshipResolver `{0,0,0,2}` (`0 calls · 2 from translation`); CustomPredicate `{0,3,0,0}`; SignatureHistory absent.

**Calls fixture C** (log is oldest-first; the panel reverses): AttributeResolver 8 calls — covers `and 3 earlier`, interpreters `toPredicate`/`remote`/`evaluate`/`undefined`, `attempts` 3 / 1 / undefined, durations `undefined` / `0` / `1.25` / `12.34`; DecisionHistory exactly 5 (no overflow row); RelationshipResolver exactly 6 (`and 1 earlier`); CustomPredicate 1; SignatureHistory none. The 20 per-port sentences are already pinned by `ServicesPanel.reading.test.tsx` and move to `PortCards.test.ts`; C needs one call per port arm only.

| Cell | wiring | status | activity | portCalls | what it pins |
|------|--------|--------|----------|-----------|--------------|
| 1 | `NotHanded` (no reading) | Off | — | — | absent note + footer |
| 2 | `NotHanded` | Starting | — | — | **nothing** between notice and footer |
| 3 | `Failed{reason}` | Off | — | — | failed note, amber, no cards, no cache card |
| 4 | `Failed{reason}` | Starting | — | — | same markup when unsampled |
| 5 | R9, cache absent | Off | `[]` | undefined | `never called` ×9, uncollected note ×9 (incl. 4 non-port rows) |
| 6 | R9 | Starting | `[]` | undefined | `no activity reading` ×9, no note |
| 7 | R9 | Starting | `[AttributeResolver only]` | undefined | `never called` for the rest (the `activity.length` test is list-wide), no note |
| 8 | R9, cache `{present, size 7}` | Off | A | undefined | all three suffixes, `0 calls`, `1 call`; `7 completed entries` |
| 9 | R9, cache `{present, size undefined}` | Off | `[]` | `{calls: [], …}` | collected-but-empty → no block; `0 completed entries` |
| 10 | R9 | Off | A | C | the list: order, labels, attempts, durations, overflow |
| 11 | R9 | Starting | `[]` | C | list renders even when unsampled; `no activity reading` |
| 12 | two-row report (AttributeResolver, DecisionCache) | Off | `[]` | log with a RelationshipResolver call | a call for a port with no card is ignored |
| 13 | R9 | Off | two entries for AttributeResolver (`calls 1` then `calls 9`) | undefined | first entry wins (today's `find`) |
| 14 (optional) | the real `wiringReport` via `diagnostics={{ layer }}` | Live | — | — | real nine rows + real consequences; async (`findBy…`) |

Record goldens by running the new test on the base and pasting the output; cell 13 is a pre-existing behaviour no test pins today and the model's grouping must preserve it.

## Q2. Render-case inventory (D-14)

`ServicesPanel.test.tsx` has 32 `it(`; `ServicesPanel.reading.test.tsx` has 4 `it.effect` plus 20 generated from `READINGS` = 24 test instances. [VERIFIED: grep + baseline run]

**(a)** = model case for `PortCards.test.ts`; **(b)** = keep as render case; **(c)** = already covered elsewhere.

| File:line | Case | Class |
|-----------|------|-------|
| test.tsx:61 | names a wired implementation | a |
| :70 | unnamed present → `wired, unnamed`, no "unwired" | a |
| :79 | never says "unwired" anywhere | a (all rows) + b (whole `qadi-services` text, because the fixed prose lives in the view) |
| :84 | states what being defaulted costs | a |
| :93 | defaulted: `data-defaulted` true, state text, warning tone, no "if defaulted" | a (tone is a field) + b (tone → colour mapping, one assertion) |
| :119 | defaulted with no name → `defaulted — unnamed` | a |
| :140 | wired: `data-defaulted` false, `if defaulted: …` | a |
| :165 | non-port row has no `data-defaulted` | a (`defaulted: undefined`) + b (undefined → attribute absent) |
| :171 | signature call: resource vs anywhere | a |
| :220 | `· 3 attempts` only when > 1 | a |
| :256 | never called vs absent; `12 calls · 2 retried` | a |
| :275 | no retries mention → `1 call` | a |
| :285 | timeouts beside retries | a |
| :298 | footer says counts are process-wide | b (fixed prose) |
| :309 | `NotHanded`: note, no cards, footer present | a (tag, no rows) + b (`qadi-wiring-absent`, `qadi-activity-scope` testids) |
| :319 | absent cache says `absent` | a |
| :324 | wired cache `7 completed entries` | a |
| :335 | cache flush differs from clearing | b (fixed prose) |
| :344 | no TTL, bound is capacity | b (fixed prose) |
| :379 | translation label only | a |
| :397 | remote label `served` | a |
| :414 | `2 calls · 3 from translation` | a |
| :429 | uncollected note | a (`Uncollected`) + b (`qadi-calls-uncollected` text mentions `collectPortCalls`: fixed prose) |
| :440 | each call under its own port | a (grouping) |
| :472 | value/nothing/no answer, newest first | a |
| :495 | unrecorded → `not recorded` | a (also `reading` file) |
| :511 | in flight, never `0.0 ms` | a |
| :527 | five shown, `3 earlier` | a + b (`qadi-port-calls-more` prints the model's string) |
| :543 | nothing added to a never-called port | a (`Hidden`) |
| :555 | counts and calls apart; footer says "read from spans" | a + b (footer) |
| :575 | depth and no answer | a |
| :606 | CustomPredicate and SignatureHistory, recorded and not | a |
| reading.test.tsx:152-171 | 20 call readings, each `row.firstElementChild.textContent` | a (compare `CallRow.text`; the table is data, reuse as-is) |
| reading :174 | "five consequences, byte for byte" | **renders nothing** — it asserts `wiringReport` data. Keep as is (c), or move beside `Wiring.test.ts` |
| reading :196, :215, :234 | real report: retried default / real adapter / absent port | a (feed `portCards` with the real `wiringReport`, same `Effect.provide`) + the characterisation's cell 14 |

**Short render test (b), suggested content:** every `data-testid` appears for a hand-built `ServicesView`; each of the four tags maps to its markup; tone → colour; `data-defaulted` undefined → attribute absent; the three `CallsView` tags; an interpreter label is rendered only when present; DOM order (header, consequence, calls); `DiagnosticsNotice` still wired, `qadi-services` carries `data-diagnostics-status`. Build the `ServicesView` by hand — the `questionsPanelInput.ts` precedent does not call `joinQuestions` "so a defect in the join is a failure, not an input".

**Other tests that render the Services tab and assert its text (must stay green unedited; all go through `DevtoolsDock`):**
- `DiagnosticsScreens.test.tsx` (D1-D4): `qadi-cache-card`, `qadi-port` + `qadi-port-activity` (`1 call`/`3 calls`/`7 calls`), `qadi-cache-size` (`9 completed entries`), `qadi-services[data-diagnostics-status]`, `qadi-wiring-absent` absent while `Stopped`. D3 (hidden-then-shown) needs the `services` store built from `shownReading.getSnapshot()` so the supplied reading is on screen in the first frame.
- `DevtoolsDock.test.tsx` :750-784 (`qadi-wiring-absent`), :825-828 (state/activity/cache text), :1023-1028 and :1057-1060 (`qadi-calls-uncollected` / `qadi-port-call`), :1074-1143, :1170-1172, :1210-1221 (`qadi-wiring-failed`, `qadi-activity-scope`).
- `DiagnosticsLifetime.test.tsx` K3 (:189-247): `qadi-wiring-absent` ↔ `qadi-cache-card` as `diagnostics` toggles.
- `features/features/devtools-screens/devtools-screens.steps.test.ts:412-420` reads `portActivity` and **must be edited** (Q4).
- No hit under `examples/`, `apps/website` (only prose at `packages/devtools.md:245`), or any e2e/playwright; no `spec/` code fence constructs a `PortActivity` (`28-devtools-screens.md:303` is a ` ```ts ` signature listing, `:637` a `ts` fence mentioning `ReadonlyArray<PortActivity>`; neither compiled). [VERIFIED: repo-wide grep excluding `.planning`, `node_modules`, `.stryker-tmp`]

## Q3. Dock-model integration (D-03)

**Where `props.shown` comes from.** `DockFrame` reads `useStoreSnapshot(model.diagnostics)` (`DevtoolsDock.tsx:182`), i.e. `shownReading` (`DockModel.ts:160`): `mergedOf(fed, supplied)` = the feed's `{status, reading}` with the supplied reading laid over it field by field (`mergeReading`), returning `snapshot` itself when nothing is supplied. `Diagnostics` fields keep identity across samples via `keep(Equal.equals)` (`DiagnosticsStore.ts:152`), so `reading.wiring/activity/portCalls` are reference-stable until they change. `unsampled` today is `isUnsampled(diagnostics.status)` read in the panel (`ServicesPanel.tsx:125`); `joinKeyNow` already does the same in the model (`DockModel.ts:192-199`).

**Recommendation: a `services` store beside `questions`.**
```typescript
// DockModel.ts, after shownReading exists (:160); subscribe next to `shownReading.subscribe(rejoin)` (:241)
const servicesKeyNow = () => {
  const { status, reading } = shownReading.getSnapshot();
  return { wiring: reading.wiring, activity: reading.activity, portCalls: reading.portCalls, unsampled: isUnsampled(status) };
};
let lastServices = servicesKeyNow();
const services = makeExternalStore<ServicesView>(portCards(lastServices));
const reservice = () => {
  const key = servicesKeyNow();
  if (key.wiring === lastServices.wiring && key.activity === lastServices.activity &&
      key.portCalls === lastServices.portCalls && key.unsampled === lastServices.unsampled) return;
  lastServices = key;
  services.set(portCards(key));
};
shownReading.subscribe(reservice); // registered before any host listener, so it moves first
// return { …, services: { subscribe: services.subscribe, getSnapshot: services.getSnapshot } }
```
- **No explicit call in `configure`:** its only input is `shownReading`, and `remerge()` (`:290`) publishes through it. A `reading`-only `configure` that builds a new merged object but the same field references recomputes nothing (the same logic as `rejoin`'s key compare).
- **No `closed` guard needed:** unlike `rejoin`, `reservice` runs no host code.
- **Ordering/tearing:** `makeExternalStore.set` notifies listeners in insertion order; `reservice` is added at build, before React's `useSyncExternalStore` subscribes, so a render that reads `shownReading` (notice) and `services` sees one moment.
- **Count:** this is the model's **ninth** store. ADR-QD-162 decision 4 states eight; ADR-QD-168 must restate the count, the `DockModel.ts` header ("Eight stores, counted once", :24-31) must be updated, and BEH-QD-465's `DockModel` fence gains `readonly services: Pick<ExternalStore<ServicesView>, "subscribe" | "getSnapshot">;` with a dated amendment note (the way CCR-QD-440 did for `questions`).

**Panel props.** Recommended: `ServicesPanel` takes `services: Pick<ExternalStore<ServicesView>, "subscribe" | "getSnapshot">` and `diagnostics`, and reads it with `useStoreSnapshot`, exactly as `QuestionsPanel` does with `questions` (`QuestionsPanel.tsx:61, 122`). The `Screen` lambdas are called in `Screen`'s body, not as components, so a hook cannot live in the dock's Services lambda; passing the store avoids hoisting a subscription into `DockFrame`. CONTEXT D-03 says the panel "receives the `ServicesView`"; both satisfy the intent. Tests then need a three-line store double (`{ subscribe: () => () => {}, getSnapshot: () => view }`), as `questionsPanelInput.ts` does. The panel still needs `diagnostics.status` for `diagnosticsRootProps`/`DiagnosticsNotice` but no longer imports `isUnsampled`.

**Is the new type public?** No. `ServicesPanel` is not in `react/index.ts`, `DockModel` is package-private (ADR-QD-099), and neither `ServicesView` nor `PortCards.ts` goes in either barrel. So no `surface.test.ts`/`surface.tst.ts` edit, no `spec/overview.md` row, and gate 13 (`check-api-surface.mjs`) is unaffected by additions. The only public change is `PortActivity.port: string → PortName` (already exported, `src/index.ts:139-145`): update the `PortActivity` row's text in `spec/overview.md:904` (Rev 1.123) even though gate 13 checks names only. If the planner exports `ServicesView` anyway: a named line in `src/index.ts`, a row in `overview.md`, a line in `test/surface.test.ts` and `surface.tst.ts`, alphabetical by module path (`devtools-named-barrel`).

**Changeset.** One `.changeset/devtools-port-activity-is-a-port-name.md` (`"@qadi/devtools": minor`), body in the existing Breaking shape (`.changeset/devtools-feed-hands-the-gate-registry.md`): `**Breaking.**` first, what breaks (a `PortActivity` literal or variable typed `port: string`, and a comparison of `entry.port` with a non-port word), what does not (the panel's wording, `portActivity`'s result for any reachable port), "See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`." The packages are `fixed` together in `.changeset/config.json`.

## Q4. Keying (D-05..D-08)

**Rewriting `portActivity`** (`Wiring.ts:185-218`). Keep the four `Metric.value(...)` reads; replace the `Set` of string keys with the registry:
```typescript
return forEveryPort((d): PortActivity => ({
  port: d.port,
  calls: calls.occurrences.get(d.port) ?? 0,
  retries: retries.occurrences.get(d.port) ?? 0,
  timeouts: timeouts.occurrences.get(d.port) ?? 0,
  translationCalls: translated.occurrences.get(d.port) ?? 0,
})).filter((a) => a.calls > 0 || a.retries > 0 || a.timeouts > 0 || a.translationCalls > 0);
```
Order is unchanged for every reachable state: the metrics preregister `PORT_NAMES = Record.keys(PORT_NAMES_BY_NAME)` in the same declaration order as `forEveryPort` (`PortMetrics.ts:62-67`, `Ports.ts` `tabulatePorts`), and the existing `Wiring.test.ts` `deepStrictEqual` cases (`:343-392`) stay green. The one observable difference: a word written to a metric outside the registry (the metric accepts any `string`) is no longer reported, and no card could have shown it. `forEveryPort`'s visitor returns the fixed `R = PortActivity` with `port: d.port` typed `K extends PortName` — compiled cleanly in the scratch project. [VERIFIED: scratch tsc, exit 0]

**Every construction site of `PortActivity` / what breaks** (repo-wide grep for `translationCalls` and `portActivity`):
- Contextually typed literals compile unchanged: `DevtoolsDock.test.tsx:757, 816, 1105`; `DiagnosticsScreens.test.tsx:78`; `ServicesPanel.test.tsx:258, 277, 289, 418, 557`; `Wiring.test.ts:347-385` (inside `deepStrictEqual`); `DiagnosticsStore.test.ts:125` (contextual) and `:305, :321` (`as const`).
- **Breaks (reproduced with a scratch tsc):** `packages/devtools/test/model/DockModel.test.ts:787-789`, `const suppliedActivity = [{ port: "AttributeResolver", … }]` has no contextual type, so it widens to `{port: string}[]` and fails at its four uses (:836, :848, :931, :946, TS2345). Fix: annotate `ReadonlyArray<PortActivity>` or add `as const` (house-allowed). **Breaks:** `features/features/devtools-screens/devtools-screens.steps.test.ts:419`, `activity.find((entry) => entry.port === "EvaluationId")` → TS2367 ("types 'PortName' and '"EvaluationId"' have no overlap"); `tsconfig.test.json` includes `features/features/**/*.steps.test.ts`, so `pnpm typecheck` fails. Fix: `const ports: ReadonlyArray<string> = activity.map((entry) => entry.port); assert.notInclude(ports, "EvaluationId")` (the assertion is "absent", per its own comment). Both are type-only edits to tests that are not characterisations, so WX-06's "never edited" does not cover them; land them with the type change.
- Nothing in `packages/react`, `packages/http`, `packages/testing`, `packages/audit`, `examples/`, `apps/website` (no code fence), or `spec/` code fences constructs one.

**Cast-free `WiredServiceName → PortName`** (typechecked, scratch tsc exit 0):
```typescript
import { PORTS } from "@qadi/core";
export const isPortName = (name: WiredServiceName): name is PortName => Object.hasOwn(PORTS, name);
```
Own keys only (the `isGateState` pattern, `core/src/GateState.ts`); `PORT_BY_SPAN` (`PortCalls.ts:51`) does the string→`PortName` step with a `Map` and is the alternative. Prefer the guard: its two mutants (`true`/`false`) are killed by one port row and one non-port row. Location (discretion): `Wiring.ts` beside `WiredServiceName` keeps `PortCards.ts` a pure join and `Wiring.tst.ts` already pins `PortName ⊂ WiredServiceName`; the cost is one more new function in a file whose mutation score must not fall.

**Per-port records, grouped once, no `===` on a port** (typechecked):
```typescript
type ByPort<A> = { readonly [K in PortName]: A };
const activityByPort = (list: ReadonlyArray<PortActivity>): ByPort<PortActivity | undefined> => {
  const first = new Map<PortName, PortActivity>();
  for (const entry of list) if (!first.has(entry.port)) first.set(entry.port, entry); // first wins, as `find` did
  return tabulatePorts<ByPort<PortActivity | undefined>>((d) => first.get(d.port));
};
const NO_CALLS: ReadonlyArray<PortCall> = [];
const callsByPort = (log: PortCallLog | undefined): ByPort<ReadonlyArray<PortCall>> => {
  const grouped = new Map<PortName, Array<PortCall>>();
  for (const call of log?.calls ?? NO_CALLS) {
    const held = grouped.get(call._tag);
    if (held === undefined) grouped.set(call._tag, [call]); else held.push(call);
  }
  return tabulatePorts<ByPort<ReadonlyArray<PortCall>>>((d) => grouped.get(d.port) ?? NO_CALLS);
};
```
`tabulatePorts<F>((d) => F[K])` with a uniform value type is the documented, used form (`http/src/PortRoutes.ts:98`). The `Map` makes a hostile host-supplied `_tag: "__proto__"` inert. Export `ByPort` (or `ActivityByPort`/`CallsByPort`) from `PortCards.ts` so the tstyche file can name it.

**The type-level test** (`packages/devtools/test/model/PortCards.tst.ts`; the idiom is `Wiring.tst.ts`/`DiagnosticsStore.tst.ts`: `import { expect, test } from "tstyche"`; `pnpm exec tstyche <file>` ran in 2 s):
```typescript
test("a port's activity is keyed by the registry's PortName, not a string", () => {
  expect<PortActivity["port"]>().type.toBe<PortName>();
  expect<PortActivity>().type.not.toBeAssignableFrom<{ readonly port: "AttributeResolvr"; readonly calls: number; readonly retries: number; readonly timeouts: number; readonly translationCalls: number }>();
  expect<PortActivity>().type.not.toBeAssignableFrom<{ readonly port: string; /* …same four numbers */ }>();
});
test("the per-port records have exactly the registry's keys", () => {
  expect<keyof ActivityByPort>().type.toBe<PortName>();
  expect<keyof CallsByPort>().type.toBe<PortName>();
  expect<CallsByPort>().type.not.toBeAssignableFrom<Omit<CallsByPort, "SignatureHistory">>();
});
```
`.type.not.toBeAssignableFrom` is already used at `DiagnosticsStore.tst.ts`; `toRaiseError` also exists in the installed tstyche 7.2.5 (`dist/index.d.ts`) if a literal-in-call form is wanted, though no repo file uses it yet. `// @ts-expect-error` is used only in `surface.tst.ts`. [VERIFIED: grep]

**D-08 grep** (scope it to the lines this phase adds, `.planning/phases/_SHARED-CONTEXT.md` hygiene; run under `/usr/bin/grep`): `git diff <base> -U0 -- packages/devtools/src/model/PortCards.ts | /usr/bin/grep -nE '\b(port|_tag)\b *(===|!==)|(===|!==) *(d\.|row\.|entry\.|call\.)?(port|_tag)\b'` returns nothing. Other `===` in the file (`calls === 1`) are not port comparisons; do not grep bare `===`.

## Q5. Mutation (D-15)

- **Config:** `stryker.devtools.mjs`: `mutate: ["packages/devtools/src/model/**/*.ts"]`, `ignoreStatic: true`, `coverageAnalysis: "perTest"`, vitest `packages/devtools/vitest.config.ts` (its `include` is `test/**/*.test.ts(x)`, so **the render tests, including the characterisation, are in the mutation run** and kill model mutants through the dock), `thresholds.break: 80`, JSON report `reports/mutation-devtools/mutation.json`. [VERIFIED: read]
- **Scoped invocation** (the Phase 54 shape, `stryker.config.mjs` → `stryker.devtools.mjs`): `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/Wiring.ts,packages/devtools/src/model/DockModel.ts[,packages/devtools/src/model/PortCards.ts]' < /dev/null`. Phase 54's core run took 55 s for three files; a devtools run is expected in the minutes range [ASSUMED]. Run alone; a RED suite breaks the dry run. A stale untracked `.stryker-tmp/` sits at the root — do not delete it, scope greps.
- **Harness:** copy `.planning/phases/QD-54-…/54-mutation.mjs` and retarget `D` (QD-55 dir), `RP = reports/mutation-devtools/mutation.json`, `CF = stryker.devtools.mjs`, the staleness probe (`packages/devtools/src`, `packages/devtools/test` instead of core), `FILES`. `base` records `[Wiring.ts, DockModel.ts]`; `after` records those plus `PortCards.ts`. It refuses a report older than the newest src/test file, so run `base` immediately after the run.
- **Files Phase 55 touches in the glob:** `Wiring.ts` (`portActivity`, `PortActivity`, the guard), `DockModel.ts` (the store), new `PortCards.ts`. `PortCalls.ts` and `PortReading.ts` are only imported (`PortCallLog`, `PortCall`, `describeCall`); do not baseline them unless edited. `DiagnosticsStore.ts` is untouched (`WiringRead` is imported as a type).
- **Orientation, not a baseline:** the stale `reports/mutation-devtools/mutation.json` (git-ignored, 2026-11-16, older than `Wiring.ts`'s 2026-11-17 edit) shows `Wiring.ts` 50 Killed / 4 Ignored, `DockModel.ts` 123 Killed / 2 Ignored, `PortCalls.ts` 37 Killed + 3 Timeout / 7 Ignored, `PortReading.ts` 64 Killed / 17 Ignored, `DiagnosticsStore.ts` 60 Killed / 6 Ignored — **no survivors**. If the fresh base is 100%, then `Wiring.ts` and `DockModel.ts` may not gain a single survivor, equivalent or not (WX-05). Re-record; never use this file as the base.
- **What "moved into `PortCards.ts`" means here:** nothing killable moves out of a model file. The logic being moved came from `ServicesPanel.tsx`, which is outside the glob, so `Wiring.ts`/`DockModel.ts` should not fall at all; D-15's moved-mutant allowance is almost certainly moot, and the harness `compare` can be the simple "no touched base file falls; `PortCards.ts` has no killable survivor".
- **Static credit:** `PortCards.ts`'s module-scope constants (`SHOWN_PER_PORT`, `NO_ACTIVITY_READING`, the interpreter-label table, hoisted `Match`) are static, so with `ignoreStatic: true` their mutants are *Ignored*, not killed. To show "no survivor a test could kill" for them, do the Phase 54 evidence run once on the after tree (a copy of `stryker.devtools.mjs` with `ignoreStatic: false`, reporters changed, written to the scratchpad; same `--mutate` list; write `55-mutation-static.json`), and give credit only if every Ignored mutant is Killed there, matched on mutator/line/column/replacement. Cheap, and it settles the question the owner accepted in ADR-QD-167 Rev 1.1.
- **Equivalent mutants to design away** (Stryker default mutators; `NumericLiteral` is not among them [ASSUMED]): `x !== undefined && x > 1` has an unkillable `true &&` mutant, and `n ?? 0` vs `n || 0` is equivalent. Prefer `attempts === undefined || attempts <= 1 ? plain : suffixed` (each operand matters because `undefined <= 1` is false) and `calls.toReversed().slice(0, SHOWN_PER_PORT)` (one copy, no `[...calls]` array-declaration mutant to explain).
- **Tests the mutation bar forces** (so the plan lists them): `DockModel` — `services` keeps its reference when only `hydration`/`questions` change; recomputes on `wiring`, on `activity`, on `portCalls`, and on the unsampled flip alone (`Starting → Live`); keeps its reference when the status object changes but the flag does not (`Off → Live`); a `reading`-only `configure` with the same field references publishes nothing; initial value is built from the merged snapshot (supplied reading visible at build). Next free ids in `DockModel.test.ts` are M48.. (M47 and P2 are the last); add `model.services.subscribe` to the `listen` helper (`:79-90`) so M10 (c) stays honest, and `"services"` is already in M9's tab list (tabs, not stores). `Wiring` — each of the four counters alone, calls 0 with translation only, the `> 0` filter at each of its four operands, a port absent from every metric. Coverage: `src/model/**` is held at **95%** (`vitest.config.ts:49-54`), so every branch of `PortCards.ts` needs a model test.

## Q6. Records (D-17)

- **ADR-QD-047** (`spec/decisions/047-a-headless-devtools-model.md`, Rev 1.16): line 50 says "`@qadi/devtools/react` renders that model and computes nothing"; `spec/overview.md:841` repeats it. ADR-QD-047 already carries dated amendments (1.16, 2026-11-16: "the gate registry is the dock model's eighth store"), so add a dated amendment (Rev 1.17) for the Services tab and update `index.yaml`'s status string.
- **ADR-QD-160** (Rev 1.6): "Port facts are read from the description"; its text names `ServicesPanel.tsx`'s `describeOne` and says `Wiring.ts`/`ServicesPanel.tsx` "need no edit" for a sixth port (`:57, :103`). That stays true (the new code derives from `forEveryPort`/`tabulatePorts`); ADR-QD-168 lists it under "keeps".
- **ADR-QD-162** (Rev 1.5): the precedent in full: Context / Decision / Consequences / Related, `Status: Accepted — amends ADR-QD-047; applies ADR-QD-152; keeps …`. Decision 4 is the store count to restate. File name `168-<slug>.md`; Document ID `QADI-ADR-168` must equal the file number (gate 10); `decisions/index.yaml` tail entry shape is `id/file/title/status`.
- **Behaviours** — `spec/behaviors/28-devtools-screens.md` is the home (BEH-QD-215, 216, 573, 575, 583-585 live there; new sections go at the end after BEH-QD-585, with the `> **Decision:** … · **Scope:** … · **Invariant:** …` header and `REQUIREMENT:` blocks, ` ```ts ` fences for package-private types). Suggested split: 611 a port card is one row of one function keyed by `PortName`; 612 the card's wording is unchanged and each rule is stated once (state order, activity suffix order, consequence voice, tone); 613 recent calls (newest first, five, `earlier`, labels, attempts, `in flight`, the three calls states incl. non-port rows); 614 `portActivity` reads one entry per registry port with the `> 0` filter; 615 the services store is one moment and keeps its reference. Amend BEH-QD-465 (fence + ninth store), BEH-QD-573 ("`ServicesPanel.reading.test.tsx` … green on the phase base and after" gets history), BEH-QD-575 (still true; note `PortCards.ts` adds no per-port edit).
- **Invariants** — `spec/invariants.md` ends at INV-QD-354 (`:4097`); append `INV-QD-355` (a port card's readings are joined by `PortName` in one pure model function) and `INV-QD-356` (the Services panel computes nothing); relate INV-QD-107 and INV-QD-343 (the questions analogue).
- **Traceability** — `spec/traceability.md`: header Rev 1.216 + change-history line; the doc-28 row (`:70`) gains BEH-QD-611–615 and `PortCards.ts`; an ADR-QD-168 row; rows for `PortCards.test.ts`, `PortCards.tst.ts`, `ServicesPanel.characterisation.test.tsx`; update the existing `ServicesPanel.test.tsx` (`:563`) and `ServicesPanel.reading.test.tsx` (`:564`) rows for what they keep.
- **CCR-QD-446** — a row after `spec/README.md:382` (CCR-QD-445's shape: files touched with revisions, `.changeset/…` named, "Unused: …" for any reserved number not used); `README.md` Rev 1.249.
- **`spec/devtools-spec/`** (gate 12, `check-devtools-claims.mjs` — it fails on an unregistered *claim of absence* phrase and on a registered one that no longer matches): `00-overview.md:159` and `02-screens.md:353` mention the services screen / `portActivity`, none of the card wording. No edit is required; if any edit adds an absence phrase ("not built", "no …" in the gate's `PHRASES`), register it in that folder's "Claims of absence" table.
- **`upgrading.md`** (`apps/website/src/content/docs/docs/reference/upgrading.md`): add `## 0.13: PortActivity.port is a PortName` after the last 0.13 section (currently "audit reports core's refusal…", `:829`). WX-07 requires it. Prose only, or a code fence that compiles under `check-website-doc-examples.mjs` (a `PortActivity` literal needs `port: "AttributeResolver"`, not a `string`-typed variable).
- **Gate 13** `check-api-surface.mjs`: no export added or removed ⇒ no `overview.md` row change required; the row text for `PortActivity` is updated anyway.

## Q7. Pitfalls and gates

### Pitfall 1: `as` is matched textually, in JSX prose and across the strip
`check-house-style.mjs`'s `no-type-assertion` (`re: /\bas\s+(?!const\b)(?:[A-Za-z_$]|[([{])/`, `testScope: true`) runs per physical line after `strip()`, which blanks `"…"`, `'…'` and single-line template text and `//` comments, but **not JSX text** and not multi-line templates. The retained view prose must not wrap so a line contains `as <letter>`; the `CacheCard` comment (`ServicesPanel.tsx:298-302`) records the same call. Run `/usr/bin/grep -nE '\bas\s+[A-Za-z_$([{]' <file>` on every edited view/model file before `pnpm lint`. `as const` is exempt (usable for the two test annotations).

### Pitfall 2: Hoist the matchers (AGENTS.md §5a)
The wiring-state `Match.type<WiringRead>()` and any `ServicesView` `Match` are built once at module scope; recursive/curried dispatchers annotate the const (`: (self: WiringRead) => (shown: Shown) => ServicesView`), as `wiringView` does today. No `switch` (the `SWITCH_BUDGET` is exact). Tone → colour and interpreter → label should be closed tables keyed by the union (a fourth interpreter is then a compile error, where today's `=== "toPredicate" || === "remote"` silently leaves it unlabelled):
```typescript
const INTERPRETER_LABEL: { readonly [K in PortInterpreter]: string | undefined } =
  { evaluate: undefined, toPredicate: "translation", remote: "served" };
```
(`PortInterpreter` is core's public type, `PortInterpreter.ts:19`.)

### Pitfall 3: `find` semantics are behaviour
`activityFor` used `find`, so duplicate entries for a port resolve to the **first**; a `Map` that overwrites changes that. `callsFor` kept log order per port (oldest first, then reversed). Pin both (characterisation cell 13; model tests).

### Pitfall 4: Idle and identity
Do not return a fresh `ServicesView` per call from the store: `set` only notifies on a new reference, so recompute only when an input reference moved (Q3). Hoist constant tag values (`GATES_ABSENT`-style) for `NotHanded`/`Withheld` if identity of repeated recomputes matters to a test.

### Pitfall 5: Cycles and barrels
`PortCards.ts` imports `type WiringRead` (DiagnosticsStore), `PortCall`/`PortCallLog` (PortCalls), `describeCall` (PortReading), `Wiring`, `@qadi/core`; `DockModel` imports `PortCards`; `ServicesPanel` imports `PortCards` types. No import points back, so `pnpm circular` (`madge --circular … packages/*/src`) stays clean. Out of both barrels (`devtools-named-barrel` refuses `export *`; named groups are alphabetical by module path).

### Pitfall 6: React and DOM rules (AGENTS.md §13)
"No React state for decisions": the panel holds none; `useStoreSnapshot` is the package's one `useSyncExternalStore` call. "`@qadi/react` calls no DOM API" is not touched (devtools). Instrumentation rules are not touched.

### Pitfall 7: Other budgets
`METRIC_ID_LITERAL_BUDGET`: model/render tests here read no metric by id; `Wiring.test.ts` already uses `Metric.update(portCallsTotal, …)` and `Metric.value`, so add none. `PORT_DOUBLE_BUDGET`: no port error is constructed. `UNTRACED_BUDGET`/`SWITCH_BUDGET`/`ANY_BUDGET`: no change.

### Pitfall 8: Record the mutation base on the untouched green tree
Not after a new test is added (Phase 54 Pitfall 4). Commit the harness and base JSON alone first.

## Code Examples

`portCards` core (sketch; the typed parts — guard, `tabulatePorts` grouping, `forEveryPort` — compiled in the scratch project):
```typescript
export interface ServicesInput {
  readonly wiring: WiringRead;
  readonly activity: ReadonlyArray<PortActivity>;
  readonly portCalls: PortCallLog | undefined;
  readonly unsampled: boolean;
}
const viewOf: (self: WiringRead) => (input: ServicesInput) => ServicesView = Match.type<WiringRead>().pipe(
  Match.tagsExhaustive({
    NotHanded: () => ({ unsampled }) => (unsampled ? WITHHELD : NOT_HANDED),
    Failed: ({ reason }) => () => ServicesView.Failed({ reason }),
    Read: ({ report }) => (input) => rowsOf(report, input),
  }),
);
export const portCards = (input: ServicesInput): ServicesView => viewOf(input.wiring)(input);
```
`rowsOf` builds `activityByPort(input.activity)` and `callsByPort(input.portCalls)` once, then maps `report.ports` through `rowOf(row, …)`, where `isPortName(row.port) ? { activity: byActivity[row.port], calls: byCalls[row.port] } : { activity: undefined, calls: NO_CALLS }`; `noActivityReading = input.unsampled && input.activity.length === 0`; `calls` view per row: `portCalls === undefined ? (unsampled ? HIDDEN : UNCOLLECTED) : calls.length === 0 ? HIDDEN : Listed(...)`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Panel pairs polled questions with guards at render (`QuestionsPanel`) | `joinQuestions` in `Gates.ts`, held as `DockModel.questions` | ADR-QD-162, 2026-11-16 | The template for this phase |
| `isDefaultName` parsed a display name | `isPortDefault` read from core | ADR-QD-160 | `PortReport.defaulted` is a fact; the card only prints it |
| Per-port arms in the view (`describeOne`) | `PORT_READING` table keyed by `PortName` | ARCH-94 | The consequence/call sentence is already model; this phase moves the rest |

## Runtime State Inventory

Not a rename/migration phase. Omitted. (The "Hidden/Uncollected" wording is rendered state, not stored state; nothing persists.)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Stryker's default mutator set has no `NumericLiteral` mutator, and `x !== undefined && x > 1` yields an unkillable `true &&` mutant | Q5 | Design advice becomes unnecessary or insufficient; the real run decides |
| A2 | A scoped devtools Stryker run takes minutes (Phase 54's core run: 55 s for three files) | Q5 | Scheduling only |
| A3 | The scoped base report for `Wiring.ts`/`DockModel.ts` will be 100% (inferred from a stale 2026-11-16 report) | Q5 | If the base has survivors, the "no new survivor" bar relaxes to "survivor set unchanged" |
| A4 | A panel prop as a store (vs the value) is acceptable to the owner under D-03's wording | Q3 | Cosmetic: both satisfy "the dock model calls `portCards` once per snapshot" |
| A5 | A ninth store is acceptable and is stated in ADR-QD-168 (not a count the owner wants kept at eight) | Q3 | Alternative is a field on a public type (rejected above) |
| A6 | `readonly` literal-key `ByPort` exported from `PortCards.ts` is a fine tstyche seam | Q4 | Pure test ergonomics |

## Open Questions

1. **How does the view represent `NotHanded` while unsampled (renders nothing) vs `NotHanded` when sampled (the absent note)?**
   - Known: D-02 lists three tags; `wiringView` returns `null` for the first and the `<p>` for the second (`ServicesPanel.tsx:83-90`); UI-SPEC keeps this behaviour.
   - Unclear: a boolean on `NotHanded` would make the view branch (a computation), contradicting INV-QD-356.
   - Recommendation: a fourth tag (`Withheld`), as `QuestionsView.Unsampled` is a separate tag from `Absent` in the precedent (`Gates.ts:286-291`). Likewise `Hidden` should cover both "no collector and unsampled" and "collector saw nothing for this port", so the view never inspects an empty list.
2. **Panel receives the store or the value?** Recommendation: the store, mirroring `QuestionsPanel` (Q3). Low risk either way.
3. **Count wording.** ADR-QD-168 states nine stores; `DockModel.ts` header, BEH-QD-465 amended, ADR-QD-047 dated amendment. Confirm with the owner only if they dislike a count change.
4. **`upgrading.md` entry.** WX-07 requires it; D-16 names only the changeset. Recommendation: write the 0.13 section (prose-first).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | ✓ | v26.13.0 (engines ≥ 22.12) | — |
| pnpm | all commands | ✓ | 10.17.1 | — |
| vitest / `@effect/vitest` | tests | ✓ | 5.1.0 | — |
| tstyche | type pins | ✓ | 7.2.5 (TS 6.0.3) | — |
| Stryker (`stryker.devtools.mjs`) | WX-05 | ✓ (not run here) | repo-pinned | — |
| `madge`, `oxlint` | `pnpm circular`, `pnpm lint` | ✓ (repo scripts) | repo-pinned | — |

**Missing dependencies:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 (+ `@effect/vitest`, `@testing-library/react`, happy-dom); tstyche 7.2.5 for types |
| Config file | `packages/devtools/vitest.config.ts` (root `vitest.config.ts` holds coverage thresholds: `src/model/**` 95%, `src/react/**` 90%); `tstyche.json` |
| Quick run command | `pnpm exec vitest run --project devtools packages/devtools/test/model/PortCards.test.ts packages/devtools/test/react/ServicesPanel.characterisation.test.tsx < /dev/null` |
| Full suite command | `pnpm check:pr < /dev/null` (never run vitest from inside a package; `check` adds `pnpm mutation`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-01 | every card's markup byte-identical before/after | characterisation (render via dock) | `pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.characterisation.test.tsx < /dev/null` | ❌ Wave 0 |
| CARD-02 | `portCards` returns the row per `PortName` with all wording | unit | `… packages/devtools/test/model/PortCards.test.ts` | ❌ Wave 0 (RED by import first) |
| CARD-03 | misspelt/unknown port is a compile error; one entry per registry port | tstyche + unit | `pnpm exec tstyche packages/devtools/test/model/PortCards.tst.ts`; `… test/model/Wiring.test.ts` | ❌ Wave 0 / ✅ Wiring |
| CARD-04 | panel prints a hand-built `ServicesView`; testids and tag mapping | render | `… test/react/ServicesPanel.test.tsx` (rewritten short) | ✅ (rewrite) |
| CARD-04 | `services` store: one moment, reference kept | model | `… test/model/DockModel.test.ts -t "M4[89]\|M5"` | ✅ (add M48..) |
| CARD-05/WX-02 | records exist with reserved numbers | gate | `pnpm spec:verify:strict`, `pnpm spec:gates`, `pnpm spec:claims`, `pnpm spec:api` | ✅ |
| WX-04 | no `as`/`switch`/etc. | gate | `pnpm lint` (`node scripts/check-house-style.mjs`) | ✅ |
| WX-05 | mutation not lower | harness | `node .planning/phases/QD-55-…/55-mutation.mjs compare` after two scoped Stryker runs | ❌ Wave 0 |
| WX-07 | Breaking recorded | review | changeset + `upgrading.md` present | ❌ |

### Sampling Rate
- **Per task commit:** the quick run command plus any touched file's test.
- **Per wave merge:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm exec tstyche`, `pnpm lint`, `pnpm circular`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the two scoped Stryker runs and `compare`.

### Wave 0 Gaps
- [ ] `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` — CARD-01, written on the base, green, never edited
- [ ] `packages/devtools/test/model/PortCards.test.ts` — CARD-02/04 (RED by import)
- [ ] `packages/devtools/test/model/PortCards.tst.ts` — CARD-03
- [ ] `.planning/phases/QD-55-…/55-mutation.mjs` + `55-mutation-base.json` — WX-05
- [ ] `servicesInput.ts` store double for the render test (cf. `questionsPanelInput.ts`)

## Security Domain

`security_enforcement` is enabled (ASVS level 1). This is a local debug panel; no new trust boundary is created. The only untrusted inputs are host-supplied `DiagnosticsReading` fields (JS, possibly untyped) and a layer's failure text.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 Auth, session, access control | no | — |
| V5 Input Validation | yes | Registry-derived guard (`Object.hasOwn(PORTS, …)`); `Map`-keyed grouping (a host-supplied `_tag: "__proto__"`/`constructor` is inert); React escapes all text (`reason`, names, call text) |
| V6 Cryptography | no | — |
| V7 Error handling | yes | A failed layer is *stated* (`Failed{reason}`), never blank; the join is total (no throw on unknown ports) |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prototype-name key read as present (`__proto__`, `toString`) | Tampering | `Map`/`Object.hasOwn`, never `obj[key]` on a string (INV-QD-351/352's class) |
| Stale allow shown as current | Spoofing | Not applicable: no decision is read here (`outcomeOf` rule, AGENTS.md §13, untouched) |
| Span attribute disclosing a value | Information disclosure | Unchanged: `PortCall` rows carry `resolved: boolean`, never the value (INV-QD-044); the model prints only `describeCall` |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- `effect/*` submodule namespace imports; relative imports carry `.ts`; `import type` for types; named imports across packages (`@qadi/core`).
- `Context.Service`, top-level layer consts, `Data.TaggedError`: not touched. `Effect.fn` applies to effectful functions; `portCards` is a plain pure function (as `joinQuestions`).
- Dispatch on `_tag` with `Match.tagsExhaustive`, built once at module scope; no `switch` (SWITCH_BUDGET exact). No `as` (except `as const`), `!`, `any`.
- No `Date.now`/`console`/`process.env`/`async`.
- `Schema` for trust boundaries: not applicable (no untrusted JSON decode here; `untrustedDecoder` untouched).
- Barrels: devtools barrels are named exports, alphabetical by module path; out of barrel = package-private.
- Spec is normative (§11); documentation is gated (§15): `spec/overview.md` names every export (gate 13); `check-devtools-claims.mjs` (gate 12); the DoD table (gate 11). `pnpm check` is the merge gate; `check:pr` skips mutation.
- Doc-comment shape: one-line summary first, the *why* after. Hand-wrapped ~90 columns; `oxfmt` is not a gate.
- User memory: closed union over widening (the `CallsView`, tone and label tables are closed); prefer complete over simple; `Record<string, unknown>` is a hack (use `Map`/`tabulatePorts`); never merge a version-packages PR; ask once when blocked.
- Shell: zsh, `grep` aliased to ugrep, so use `/usr/bin/grep` and quote globs; run vitest from the repo root with stdin closed; never run `node scripts/next-id.mjs`.

## Sources

### Primary (HIGH confidence, read or run this session)
- `packages/devtools/src/react/ServicesPanel.tsx`, `DevtoolsDock.tsx`, `QuestionsPanel.tsx`, `useStoreSnapshot.ts`, `useDockModel.ts`, `DiagnosticsNotice.tsx`
- `packages/devtools/src/model/Wiring.ts`, `PortCalls.ts`, `PortReading.ts`, `DiagnosticsStore.ts`, `DiagnosticsFeed.ts`, `DockModel.ts`, `Gates.ts`, `ExternalStore.ts`, `index.ts`, `react/index.ts`
- `packages/core/src/Ports.ts`, `PortName.ts`, `PortInterpreter.ts`, `PortMetrics.ts`, `GateState.ts`, `PortSpan.ts`, `index.ts`
- Tests: `ServicesPanel.test.tsx`, `ServicesPanel.reading.test.tsx`, `Wiring.test.ts`, `DiagnosticsScreens.test.tsx`, `DevtoolsDock.test.tsx` (greps), `DockModel.test.ts`, `QuestionsPanel.characterisation.test.tsx`, `questionsPanelInput.ts`, `Wiring.tst.ts`, `PortCalls.tst.ts`, `DiagnosticsStore.tst.ts`, `features/…/devtools-screens.steps.test.ts`
- `stryker.devtools.mjs`, `vitest.config.ts`, `tstyche.json`, `scripts/check-house-style.mjs` (rules, `strip`), `scripts/check-devtools-claims.mjs`, `.changeset/*`
- `spec/decisions/047…`, `160…`, `162…`, `167…`, `index.yaml`; `spec/behaviors/28-devtools-screens.md`; `spec/overview.md`; `spec/README.md`; `spec/traceability.md`; `spec/invariants.md`
- `.planning/REQUIREMENTS.md`, `ROADMAP.md`, `phases/_WAVE11-CONTEXT.md`, `_SHARED-CONTEXT.md`, `QD-54-*` (`54-RESEARCH.md`, `54-mutation.mjs`, `54-01-SUMMARY.md`), `QD-55-*/55-UI-SPEC.md`
- Runs: baseline vitest (86 passed); `pnpm exec tstyche packages/devtools/test/model/Wiring.tst.ts` (green); scratch `tsc` projects confirming (1) both break sites (TS2345 on the widened literal, TS2367 on `=== "EvaluationId"`), and (2) the guard, `tabulatePorts` grouping, `forEveryPort` rewrite and both compile-error pins against the real `@qadi/core` source (exit 0).

### Secondary / Tertiary
- None. No external docs were needed: every API used is in-repo or already installed. Context7 was unreachable (connection timed out) and was not required.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new package; versions read from the installed tree.
- Architecture: HIGH — the join, the store and the typing recipe follow `joinQuestions`/`PORT_BY_SPAN`/`isGateState` and were compiled.
- Pitfalls: HIGH for the `as`/`find`/identity/type-break findings (read or reproduced); MEDIUM for Stryker equivalent-mutant advice (A1) and runtime (A2).

**Research date:** 2026-11-18
**Valid until:** until the first source edit lands on the branch (line numbers are at `4d891643`); re-verify with `git log --oneline -1` and re-read `ServicesPanel.tsx` if Phase 56 work reaches `DockModel.ts` first.
