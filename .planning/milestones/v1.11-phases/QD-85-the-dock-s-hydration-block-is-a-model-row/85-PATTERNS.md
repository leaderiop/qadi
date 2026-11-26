# Phase 85: The dock's hydration block is a model row - Pattern Map

**Mapped:** 2026-11-25
**Files analyzed:** 27 (groups below)
**Analogs found:** 26 / 27

Every analog path was checked with `git ls-files` (tracked): `packages/devtools/**`, `spec/**`, `.changeset/**`, `.planning/milestones/v1.10-phases/QD-84-*/84-*.mjs`. No gitignored mirror is named. Line numbers for `QuestionsPanel.tsx`, `DockModel.ts`, `DevtoolsDock.tsx`, `useStoreSnapshot.ts` and all spec registers are in `85-RESEARCH.md` "Verified line map" and "Spec registers" (HEAD `0f790a4d`, unchanged since `ac7578f3`); this file does not repeat them, it names the analog and the excerpt to copy. Findings Q1-Q6 of the research bind every assignment below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/devtools/src/model/HydrationView.ts` (new) | model (pure view) | transform | `src/model/PortCards.ts` | exact |
| `packages/devtools/src/model/DockModel.ts` (hydration store, `DockModel.hydration`, key reader, header) | model (store wiring) | event-driven | its own `services` store (lines 397-409) | exact |
| `packages/devtools/src/react/QuestionsPanel.tsx` (tag renderer, `hydration` store prop) | component | request-response | `src/react/ServicesPanel.tsx` `screenOf` + `ServicesPanel` | exact |
| `packages/devtools/src/react/DevtoolsDock.tsx` (`DockFrame` status-only, `Screen` loses `shown`) | component | event-driven | its own `usePaused` use (line ~114) | self |
| `packages/devtools/src/react/useStoreSnapshot.ts` (status hook) | hook | event-driven | `usePaused` (same file, 24-25) | exact |
| `test/model/HydrationView.test.ts` (new) | test | transform | `test/model/PortCards.test.ts` | exact |
| `test/model/HydrationView.tst.ts` (new) | test (type) | n/a | `test/model/PortCards.tst.ts` + Phase 84 `useConfigured.tst.ts` rules | role-match |
| `test/react/QuestionsPanel.hydration.characterisation.test.tsx` (new, H1-H12) | test | request-response | `test/react/QuestionsPanel.feed.characterisation.test.tsx` | exact |
| `test/react/DockFrame.renders.test.tsx` (new) | test | event-driven | `test/collectorDouble.ts` + `QuestionsPanel.feed.characterisation` `settledAs`; render counter: `packages/react/test/InstrumentToggle.characterisation.test.tsx:17-35` | partial |
| `test/react/QuestionsPanel.test.tsx` (declared edit, lines 92-195) | test | request-response | itself + `questionsPanelInput.ts` independence rule | self |
| `test/model/DockModel.test.ts` (M57-M60, store list `:1792-1819`) | test | event-driven | M54 (`:1695`) and "the services store moves once per key field" (`:1777`) | exact |
| `test/model/ConfigureRule.test.ts` (eleven stores, CR22) | test | event-driven | itself (`:583-671`, `:895-932`) | self |
| `test/model/DockModel.listeners.test.ts` (eleven stores, DL row) | test | event-driven | itself (`:64-154`, `:328-346`) | self |
| `85-check.mjs` | script | batch | `84-check.mjs` | exact |
| `85-pinned-check.mjs` | script | batch | `84-pinned-check.mjs` | exact |
| `85-mutation.mjs` | script | batch | `84-mutation.mjs` | exact |
| `85-earlier-checks.mjs` | script | batch | `84-earlier-checks.mjs` | exact |
| `85-RED-EVIDENCE.md` | doc | n/a | `84-RED-EVIDENCE.md` | exact |
| `spec/decisions/198-the-hydration-block-is-a-model-row.md` (new ADR) | doc | n/a | `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md` | exact |
| `spec/decisions/185-...md`, `168-...md` (dated amendment) | doc | n/a | ADR-185's amendment blockquotes (`:177`, `:185`) | exact |
| `spec/decisions/index.yaml` | register | n/a | the ADR-QD-197 entry (`:617-620`) | exact |
| `spec/behaviors/28-devtools-screens.md` (BEH-QD-761..765 new; 700, 699, 735, 742, 218 amended) | doc | n/a | BEH-QD-756..760 (ends `:4011`) and BEH-QD-615 for the store rule | exact |
| `spec/invariants.md` (INV-QD-415..416 new; 390, 407 amended) | doc | n/a | INV-QD-413..414 (`:4805` is the last) | exact |
| `spec/traceability.md`, `spec/README.md` | register | n/a | rows for BEH-QD-756..760 (`:98-106`), CCR-QD-476 row (`README:413`) | exact |
| `.changeset/devtools-the-hydration-block-is-a-model-row.md` | config | n/a | `.changeset/devtools-lens-reads-each-fact-once.md` | exact |
| (no analog) render-count of a private React component with `React.Profiler` | test | event-driven | none in `packages/devtools/test` | none |

## Pattern Assignments

### `src/model/HydrationView.ts` (model, transform)

**Analog:** `src/model/PortCards.ts`. Copy: header doc style (one-line summary, then the rule and the ADR numbers, then "Package-private (ADR-QD-099)"), the input record with a doc'd `unsampled` field, and the `Data.taggedEnum` pairing of a type and a same-named const.

**Imports and input record** (`PortCards.ts:15-37`, adapted):
```ts
import * as Data from "effect/Data";
import * as Match from "effect/Match";          // PortCards only; HydrationView uses ternaries (Q4), so omit
import type { WiringRead } from "./Diagnostics.ts";

/** What the join reads: the wiring read and the activity, taken at one moment. */
export interface ServicesInput {
  readonly wiring: WiringRead;
  readonly activity: ReadonlyArray<PortActivity>;
  readonly portCalls: PortCallLog | undefined;
  /** No sample has been taken, so a missing field is not yet a statement about the host. */
  readonly unsampled: boolean;
}
```
For this file: `import * as Data from "effect/Data"`, `import { unaccountedEntries } from "./Hydration.ts"`, `import type { HydrationActivity, HydrationDrops } from "./Hydration.ts"`. Nothing else (no React; `pnpm circular` stays clean). Key type states `hydration: HydrationActivity | undefined` explicitly (Pitfall 85-C).

**Closed union** (`PortCards.ts:56-64`, the `CallsView` precedent):
```ts
export type CallsView = Data.TaggedEnum<{
  Hidden: {};
  Uncollected: {};
  Listed: { readonly calls: ReadonlyArray<CallRow>; readonly earlier: string | undefined };
}>;

export const CallsView = Data.taggedEnum<CallsView>();
```
Target: `HydrationView = Pending | Unwired | Counts` and the nested `DropsView = None { watched } | Raised { rows }` (RESEARCH Pattern 1 has the full shape).

**Core rule and byte-identity** (from RESEARCH Pattern 1; strings are copied from `QuestionsPanel.tsx:389-425`, which the planner re-reads when writing the task). Use function declarations and ternaries, never module-scope arrow consts or string constants (Q4: they become `Ignored` mutants, D-16 forbids them). `AGENTS.md` §5a forbids a new `switch`.
```ts
export function hydrationView(input: HydrationInput): HydrationView {
  return input.hydration !== undefined
    ? countsOf(input.hydration)
    : input.unsampled ? HydrationView.Pending() : HydrationView.Unwired();
}
```
Rate: absent at `rechecked === 0`, else `${mismatched} of ${rechecked} re-checked question${rechecked === 1 ? "" : "s"} disagreed with the server.` No-drops: `All ${activity.drops.length} reasons are watched` uses the length of ALL drops. Scope: `Process-wide totals, not this page's.` + space + the `unaccountedEntries(activity) === undefined` branch (seeded-more-than-built sentence) or `${n} dehydrated entr${n === 1 ? "y" : "ies"} have no seeding counted in this process.` (0 reads "0 dehydrated entries", D-08). Raised rows: `drops.filter((d) => d.count > 0)`.

**Error handling:** none; the function is total over its input (INV-QD-415).

---

### `src/model/DockModel.ts` (model, event-driven)

**Analog:** its own `services` store, `DockModel.ts:397-409`:
```ts
// The port cards are a function of the shown reading alone: no host code is read, so nothing here is guarded.
const services = yield* makeDerivedStore({
  parents: [shownReading],
  key: (): ServicesInput => {
    const { status, reading } = shownReading.getSnapshot();
    return {
      wiring: reading.wiring,
      activity: reading.activity,
      portCalls: reading.portCalls,
      unsampled: isUnsampled(status),
    };
  },
  compute: portCards,
});
```
Add `hydration` after it, before `configure`, with `parents: [shownReading]`, key `{ hydration: reading.hydration, unsampled }` (read `reading.hydration` as is, never copied: Pitfall 85-B), `compute: hydrationView`. Keep `questions` unchanged: `unsampled: supplied === undefined && isUnsampled(status)` (`:391`). The shared key reader is a function declaration or an inner `const` of `makeDockModel` (not a module-scope arrow: Q4, 13th `Ignored` mutant). Returned model (`:449`) gains `hydration: { subscribe: hydration.subscribe, getSnapshot: hydration.getSnapshot }` after `services`. `DockModel` interface (`:221-255`) gains `readonly hydration: ReadableStore<HydrationView>` with a doc line. Update the header paragraph (`:31-38`, "four derived stores"). No eighth `configure` step (BEH-QD-742's AggregateError order).

---

### `src/react/QuestionsPanel.tsx` (component, request-response)

**Analog:** `src/react/ServicesPanel.tsx` (hoisted `Match`, a store prop read by `useStoreSnapshot`). Imports and structure (`ServicesPanel.tsx:19-21, 60-95`):
```tsx
import * as Match from "effect/Match";
import type { ReadableStore } from "../model/ExternalStore.ts";
...
const screenOf: (self: ServicesView) => ReactNode = Match.type<ServicesView>().pipe(
  Match.tagsExhaustive({
    Withheld: () => null,
    NotHanded: () => (<p style={muted} data-testid="qadi-wiring-absent">...</p>),
    Failed: ({ reason }) => (...{reason}...),
    Read: ({ rows, cache }) => (<>{rows.map((row) => (<PortCard key={row.port} row={row} />))}<CacheCard size={cache} /></>),
  }),
);

export const ServicesPanel: FC<ServicesPanelProps> = ({ services, diagnostics }) => {
  const view = useStoreSnapshot(services);
```
Target: `hydrationBlock: (self: HydrationView) => ReactNode = Match.type<HydrationView>().pipe(Match.tagsExhaustive({ Pending, Unwired, Counts }))`, a second hoisted match for `DropsView`. Fixed advice (Unwired JSX with three `<code>` spans) and `NO_COUNTS_YET` (`:89-90`) stay panel constants. Every `data-testid` (nine) and the em-dash markup of a drop row stay in the panel. Remove imports at `:29, 39, 40` and the `isUnsampled` call at `:112`.

**Q1 binding:** keep the prop optional (`readonly hydration?: ReadableStore<HydrationView> | undefined`) and read `hydration ?? NO_HYDRATION`, a module-scope store of the shape of `idle` in `DiagnosticsFeed.ts:122-126` holding `HydrationView.Unwired()`, so `Lens.questions.characterisation.test.tsx` (held, renders with no `hydration`) compiles and renders as on the base.

---

### `src/react/useStoreSnapshot.ts` (hook, event-driven)

**Analog:** `usePaused`, same file (lines 24-25):
```ts
export const usePaused = (timeline: TimelineStore): boolean =>
  useStoreSnapshot({ subscribe: timeline.subscribe, getSnapshot: timeline.isPaused });
```
Target (RESEARCH Pattern 4): `useDiagnosticsStatus = (readout) => useStoreSnapshot({ subscribe: readout.subscribe, getSnapshot: () => readout.getSnapshot().status })`, with a doc paragraph in the file's style ("one subscription, the one a direct call would make; React compares the status with `Object.is`, and `Live`'s identity is kept"). `"use client";` stays line 1. Type imports use `import type`.

### `src/react/DevtoolsDock.tsx` (component)

Line 112 `const { status, reading: shown } = useStoreSnapshot(model.diagnostics);` becomes `const status = useDiagnosticsStatus(model.diagnostics);`. `Screen` drops the `shown` prop (`:229`, `:181`) and passes `hydration={model.hydration}` at `:258`. Drop the dead `Diagnostics` type import (`:18`, Pitfall 85-E). `usePaused(timeline)` at the neighbouring line is the in-file precedent for the call shape.

---

### `test/model/HydrationView.test.ts` (test, transform)

**Analog:** `test/model/PortCards.test.ts`. Header states what it is the headless twin of and "Fields are asserted one at a time, never a whole row, so a row gaining a field edits no line written here". Imports (`PortCards.test.ts:9-25`):
```ts
import { assert, describe, it } from "@effect/vitest";
import { CallsView, ServicesView, ... portCards } from "../../src/model/PortCards.ts";
import type { PortCardRow, ServicesInput } from "../../src/model/PortCards.ts";
```
Copy: `describe`/`it` plain (pure function, no `Effect`), exact-string assertions. Cover every arm and boundary (D-15): the three tags and activity precedence under `unsampled` true/false, `rechecked` 0/1/n, `count > 0`, `drops: []`, unaccounted `undefined`/1/n/0, a foreign reason with its `UNRECOGNISED` meaning. This file also takes the exact-string rules that `QuestionsPanel.test.tsx:92-195` asserted by substring (Q6): `1 of 4`, no rate at 0, no drops, `Process-wide`, `6 dehydrated entries`, `seeded more than it built`, `1 dehydrated entry `. No Stryker disable comments.

### `test/model/HydrationView.tst.ts` (type test)

**Analog:** `test/model/PortCards.tst.ts` (header explains the compile errors pinned; `import { expect, test } from "tstyche"`; positive `expect<T>().type.toBe<U>()`). Restriction (AGENTS.md §6 `NOT_CALLABLE_PIN_BUDGET`): no `not.toBeCallableWith` / `not.toBeConstructableWith`; `PortCards.tst.ts` uses `not.toBeAssignableFrom`, which is allowed. Pin: `expect<HydrationView["_tag"]>().type.toBe<"Pending" | "Unwired" | "Counts">()`, and `not.toBeAssignableFrom<{ readonly _tag: "Idle" }>()` plus an `@ts-expect-error` for an unknown tag, each with a positive twin in the file.

---

### `test/react/QuestionsPanel.hydration.characterisation.test.tsx` (new, born green, H1-H12)

**Analog:** `test/react/QuestionsPanel.feed.characterisation.test.tsx` (header lines 1-20: what is pinned, "React files sit outside the mutation glob", "Never edited after it is written"; imports lines 21-35):
```tsx
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { DevtoolsDock } from "../../src/react/index.ts";
import type { DevtoolsDockProps, DiagnosticsOptions } from "../../src/react/index.ts";
import { makeGateRegistryDouble } from "../gateRegistryDouble.ts";
import { questionsProp } from "./questionsProp.ts";
```
Each cell mounts `<DevtoolsDock reading={{ hydration }} …>` and compares `screen.getByTestId("qadi-hydration").outerHTML` (block root, `QuestionsPanel.tsx:351`) whole, client `render`, never `renderToString` (Pitfall 85-H). Cell table H1-H12 is in RESEARCH "Characterisation cells". H9 includes a reason containing `<b>` (security row). Written and committed on the phase base before any source edit; each cell shown failing once by a scratch edit, recorded in `85-RED-EVIDENCE.md` as `- failed: <title>`. The two existing characterisation files stay unedited.

### `test/react/DockFrame.renders.test.tsx` (new)

**Analogs (partial):** the collector double and the settle idiom.
`test/collectorDouble.ts` (tracked):
```ts
export const makeCollectorDouble = (
  script: (call: number) => PortCallLog = () => emptyLog,
): { readonly state: { calls: number }; readonly collector: PortCallCollector } => { ... state.calls += 1; return script(state.calls) ... }
```
Mount `<DevtoolsDock diagnostics={{ collector, intervalMillis: 10 }} …>` inside `<Profiler id="dock" onRender={…}>`, settle with `vi.waitFor(() => assert.isAtLeast(state.calls, n))` inside `act` (as `settledAs` in the feed characterisation does). Per Q2: the script answers a different `portCalls` log per call while the status stays `Live`; assert zero commits after the first `Live` settle across 3+ polls; control: a status move (collector throws on call N) commits once. Counter precedent for a render count: `packages/react/test/InstrumentToggle.characterisation.test.tsx:17-35` (memoised probe with `let renders`; the planner opens it). Old-frame scratch variant: restore `const { status, reading: shown } = useStoreSnapshot(model.diagnostics)`; record the failing output.

### `test/react/QuestionsPanel.test.tsx` (declared edit, Q6)

Only lines 92-195 (the 9 hydration tests) change. Each builds a store with a local helper, not `hydrationView`, mirroring `questionsPanelInput.ts`'s independence rule:
```ts
const storeOf = (view: HydrationView): ReadableStore<HydrationView> =>
  ({ subscribe: () => () => {}, getSnapshot: () => view });
// <QuestionsPanel ... hydration={storeOf(HydrationView.Counts({ ... }))} />
```
Keep one render-per-tag test each and every `data-testid`. `85-pinned-check.mjs` declares this region as the only editable span; `80-pinned-check.mjs` and `84-pinned-check.mjs` will exit 1 on this file by name, like the standing `79-pinned` `TF29`; do not edit those scripts.

### Store-pin tests (eleven stores)

**Analog:** the files themselves; exact lines and replacements are the table in RESEARCH "Store pins". One commit with `DockModel.ts` (Pitfall 85-G). New model rows, copy M54's shape (`DockModel.test.ts:1695-1719`):
```ts
it.effect("M54: ...", () => Effect.gen(function* () {
  const { collector } = makeCollectorDouble(() => { if (fail) throw new Error("the collector blew up"); return { calls: [], dropped: 0, capacity: 10 }; });
  const model = yield* dockModelOf({ diagnostics: { collector }, reading });
  const before = model.services.getSnapshot();
  const heard = heardOf(model);
  fail = true; yield* TestClock.adjust("2 seconds");
  assert.strictEqual(model.services.getSnapshot(), before);
  assert.strictEqual(heard.calls, 0);
```
M57-M60 are specified in RESEARCH; the DL row copies the `throwingRow("services", { heard: true })` row at `DockModel.listeners.test.ts:328-346` (`heard: true` is [ASSUMED] A4; read it from the red run). CR22 numbers (A1) are read from the red run, not trusted.

---

### Phase scripts (`85-*.mjs`, `85-RED-EVIDENCE.md`)

**Analogs:** `.planning/milestones/v1.10-phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-{check,pinned-check,mutation,earlier-checks}.mjs`. Port checklist from `84-PATTERNS.md`, changed to 85:
- every hard-coded `84` (phase, evidence/summary file names, subject regex `/^[a-z]+[(]85-[0-9]{2}[)]!?: /`, scratch dir `qd85`, id-token regexes: `85-\d{2}`, `QD-85`, `Phase 85`, requirement prefix `HYDV-0N`, keep `D-\d+`, `WX-0N`, `-NEXT`); derive the phase directory from `import.meta.url`.
- `85-check.mjs` modes (RESEARCH validation map): `no-react-in-model`, `three-predicates`, `panel-decides-nothing`, `records`, plus `commit`/`seen-failing`; each with a planted-failure self-test; keep the `"use client";` exemption from `judgeForbidden`.
- `85-pinned-check.mjs`: held list byte for byte; the one declared edit is `QuestionsPanel.test.tsx` lines 92-195 (Q6); additions-only for any `.tst.ts` surface file.
- `85-mutation.mjs`: groups `dock` (`DockModel.ts`, base then close; may not fall; no new Survived/NoCoverage/Ignored) and `hydration` (`HydrationView.ts`, `ABSOLUTE`: no open mutant AND no Ignored, which 84's did not forbid: Q4); outputs `85-mutation-base.json` / `85-mutation-close.json`; `UNMEASURED` = `QuestionsPanel.tsx`, `DevtoolsDock.tsx`, `useStoreSnapshot.ts` with the `REACT_WHY` string. Base command: `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/DockModel.ts < /dev/null`, taken on a clean tree before any edit.
- `85-earlier-checks.mjs`: re-run 84, 83, 81, 79, 80 from a scratch copy; expect `79-pinned` `TF29`, `80-pinned` and `84-pinned` on `QuestionsPanel.test.tsx`.
- Never edit earlier phase directories.

### `spec/decisions/198-the-hydration-block-is-a-model-row.md` (ADR)

**Analog:** `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md`. Layout: `# ADR-QD-198 — ...`, Document Control table (`QADI-ADR-198`, Revision 1.0, Effective 2026-11-25, `Status: Accepted — extends ADR-QD-168, amends ADR-QD-185`, change history `1.0 (2026-11-25): new (CCR-QD-477)`), then `## Context`, `## Decision`, `## Alternatives considered`, `## Consequences`, `## What enforces it`, `## Related`. Document ID equals the file number (gate 10). Amendments to 185 and 168 are dated blockquotes in the "Noted 2026-11-22" style (`185:177`, `:185`); older counts stay as written. Edit headers only through `node scripts/spec-revise.mjs <doc> "<change (CCR-QD-477)>" --date 2026-11-25`; never `next-id.mjs`.

### `index.yaml`, BEH/INV, traceability, README

**Analogs:** the ADR-QD-197 entry (`index.yaml:617-620`: `- id`, `file`, `title`, `status`); BEH-QD-756..760 format (`## BEH-QD-7NN: <title>`, `> **Decision:**/**Scope:**/**Invariant:**` blockquote, fenced REQUIREMENT, prose, `Pinned by …. Specified in ADR-QD-198 (CCR-QD-477).`) and BEH-QD-615 for the store rule (state it as identity of the two key fields, Q3); INV-QD-413..414 format (`**Source**:`, `**Implication**:`, `**Enforcement**:`, `**Related**:`). BEH-QD-699's anchor is linked from nine places: keep the heading and add a dated `Restated` note, or move every link in one commit. Use ` ```ts ` for signature listings, ` ```typescript ` only when it compiles. README CCR row: copy the CCR-QD-476 row (`README:413`), naming every document and `Rev`, and "Unused: ..." for unconsumed reservations (BEH-QD-761..765 are all planned; INV 415..416 both used).

### Changeset

**Analog:** `.changeset/devtools-lens-reads-each-fact-once.md`:
```md
---
"@qadi/devtools": patch
---

<one paragraph, internal change>. Nothing a host renders, receives or calls changes. No export changes.
```
New file `.changeset/devtools-the-hydration-block-is-a-model-row.md`; text drafted in RESEARCH "Changeset". Do not run `changeset version`.

## Shared Patterns

### Derived store over the shown reading
**Source:** `DockModel.ts:397-409` and `ExternalStore.ts` (`sameFields` `:153`, `makeDerivedStore` `:197`, `K extends object & Required<K>`). **Apply to:** the `hydration` store; key fields compared by `===`, `undefined` stated explicitly.

### Hoisted `Match.type` + `tagsExhaustive`
**Source:** `ServicesPanel.tsx:60-95`. **Apply to:** both tag renderers in `QuestionsPanel.tsx` (AGENTS.md §5a; `SWITCH_BUDGET` stays 3).

### Package-private out of the barrel
**Source:** `PortCards.ts` header ("Package-private (ADR-QD-099)"); `[devtools-named-barrel]`. **Apply to:** `HydrationView.ts`, the status hook; neither enters `src/index.ts` or `src/react/index.ts`; `DockModel` gains a member only (gate 13 stays at 942).

### Stryker `ignoreStatic` (module-scope code is `Ignored`)
**Source:** `stryker.devtools.mjs:49`; `83-mutation-close.json` (`DockModel.ts`: killed 65, survived 0, noCoverage 0, ignored 12). **Apply to:** `HydrationView.ts` and the shared key reader: function declarations, sentences inside bodies, no module-scope arrow consts or string constants.

### Held-file discipline
Born characterisations (`QuestionsPanel.characterisation`, `.feed.characterisation`, `Lens.questions.characterisation`, `DockFrame.stops.characterisation`, `ConfigureFirstRender.characterisation`) are byte-held; later rows go in a new file. Each new test and check is shown failing once and recorded in `85-RED-EVIDENCE.md`, then reverted with `git checkout`.

### Forbidden forms
No `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, `console`, `Record<string, unknown>`, module-scope `let`, `// Stryker disable`, `not.toBeCallableWith` pins, `JSON.parse`/`Schema.decode*` in the view. No D-number, `85-NN`, `HYDV-0N`, `Phase 85`, `ADR-QD-NEXT` in shipped source, test titles or scenarios. Verify commands run as `bash -c '...'` with `< /dev/null`; use `/usr/bin/grep`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Profiler-based render count in `DockFrame.renders.test.tsx` | test | event-driven | No `Profiler` or render counter exists under `packages/devtools/test`; use the collector double plus `React.Profiler` per RESEARCH "How to prove the D-11 render count", with the `packages/react/test/InstrumentToggle.characterisation.test.tsx:17-35` counter as the only repo precedent. |

## Metadata

**Analog search scope:** `packages/devtools/src/model`, `src/react`, `test/model`, `test/react`, `test/*.ts`; `.planning/milestones/v1.10-phases/QD-84-*`; `spec/decisions`; `.changeset`.
**Files read in this pass:** `PortCards.ts` (head), `DockModel.ts` (380-412), `useStoreSnapshot.ts`, `ServicesPanel.tsx` (55-100), `PortCards.test.ts` and `.tst.ts` (heads), `QuestionsPanel.feed.characterisation.test.tsx` (head), `collectorDouble.ts`, `DockModel.test.ts` M54, `DevtoolsDock.tsx` (100-125), the lens changeset, `84-PATTERNS.md`, and 85-CONTEXT/85-RESEARCH. Not opened by this mapper: the `84-*.mjs` scripts, ADR-197's body, `InstrumentToggle.characterisation.test.tsx`; the planner opens them while porting (84-PATTERNS lists the line-level changes).
**Pattern extraction date:** 2026-11-25
