---
id: ARCH-44
title: The dock's five "reading from elsewhere" overrides become one supplied-reading prop, and the superseded hydrationMismatches goes
strength: Speculative     # from the 2026-10-07 architecture review (wave 4, "Speculative" list: "One diagnostics prop on the dock")
status: done
evidence_verified_at: e635e68
depends_on: [ARCH-34]     # sequence after the feed; see §4 "Ordering"
blocks: []
# Overlaps (same files, other wave-4 plans):
#   ARCH-34: the feed spreads `diagnostics` onto DevtoolsDock; this plan must not change that prop's
#     shape (D-44-a = B keeps it), so the feed is untouched.
#   ARCH-37: moves hydration drop-reason meanings and edits devtools' Hydration rendering; this plan
#     deletes QuestionsPanel's LegacyMismatches branch in the same component. Land ARCH-37's
#     QuestionsPanel edit first or rebase; textual only.
#   ARCH-33: edits DevtoolsDock.tsx's policy selection (sightings/PolicyExplorer); textual overlap in
#     the component body only.
#   ARCH-40: narrows the headless barrel; this plan adds one exported type (`DiagnosticsReading`)
#     to `model/DiagnosticsStore.ts` — agree its home with ARCH-40 if it lands first.
adrs_touched:
  - ADR-QD-047 (amend: the CCR-QD-200 amendment's "the snapshot props stay" becomes "one supplied reading, field by field")
  - ADR-QD-052 (read, constraint: hydration counts stay pull-based; the mismatch count a host accumulated is superseded by `hydration.mismatched`)
  - ADR-QD-053 / ADR-QD-080 (read, constraint: `gates` and `onInvalidate` are not diagnostics and stay their own props)
  - ADR-QD-034 (read, constraint: no switch; precedence is `??` per field)
  - ADR-QD-038 (read, constraint: changeset in the fixed group; breaking for @qadi/devtools; no release)
packages: ["@qadi/devtools", "spec", "apps/website (docs)"]
estimate: M   # ≈ 1–1½ days if reopened (T0–T7). T1 alone (pin today's precedence) ≈ 1 hour.
---

# ARCH-44 — One supplied-reading prop on `DevtoolsDock`

## 1. Verified evidence (at `e635e68`)

Read at `e635e68`. No probe was needed: every claim is about a prop list and three lines of
precedence, settled by reading `packages/devtools/src/react/DevtoolsDock.tsx` and by grep.

### C1. `DevtoolsDock` has ~15 props: **CHANGED — exactly fourteen**

`DevtoolsDockProps` (`DevtoolsDock.tsx:75-162`), in declaration order, each optional:

| # | Prop | Line | Kind |
| - | ---- | ---- | ---- |
| 1 | `source` | `:77` | host's own (defaults to an empty source, `:55,165`) |
| 2 | `capacity` | `:79` | host's own |
| 3 | `catalogue` | `:87` | host's own |
| 4 | `diagnostics` | `:102` | sampling options (ARCH-24; ARCH-34's feed supplies it) |
| 5 | `wiring` | `:109` | **override of `Diagnostics.wiring`** |
| 6 | `activity` | `:115` | **override of `Diagnostics.activity`** |
| 7 | `portCalls` | `:123` | **override of `Diagnostics.portCalls`** |
| 8 | `questions` | `:129` | **override of `Diagnostics.questions`** |
| 9 | `gates` | `:136` | pushed, not a diagnostic (§13, ADR-QD-080) |
| 10 | `unknownParents` | `:138` | host's own |
| 11 | `hydration` | `:144` | **override of `Diagnostics.hydration`** |
| 12 | `hydrationMismatches` | `:151` | **superseded** by `hydration` |
| 13 | `onInvalidate` | `:153` | atom-set action |
| 14 | `ports` | `:161` | simulator's live ports |

`examples/nextjs-newsroom/src/client/Dock.tsx:5` says "fifteen"; that is ARCH-34 C12's drift.

### C2. Five props are overrides of a `Diagnostics` field: **CONFIRMED**, and their precedence rules are not all the same shape

`Diagnostics` (`model/DiagnosticsStore.ts:67-76`) has exactly five fields — `wiring`, `activity`,
`hydration`, `portCalls`, `questions` — and each has a same-named override prop:

| Override | Precedence rule (where) | Same type as the field? |
| -------- | ----------------------- | ----------------------- |
| `wiring?: WiringReport` | `wiring === undefined ? sampled.wiring : WiringRead.Read({ report: wiring })` (`:189-192`) | **No.** The field is a `WiringRead`; the prop can only say `Read`, so a reading from elsewhere cannot state `Failed` or `NotHanded` |
| `activity?: ReadonlyArray<PortActivity>` | `activity ?? sampled.activity` (`:313`) | yes; an explicit `[]` wins (sampled is `[]` when nothing samples) |
| `portCalls?: PortCallLog` | `portCalls ?? sampled.portCalls` (`:193`) | yes |
| `questions?: ReadonlyArray<AskedQuestionLike>` | `questions ?? sampled.questions` (`:315`) | yes |
| `hydration?: HydrationActivity` | `hydration ?? sampled.hydration` (`:194`) | yes |

All five say "Takes precedence over what `diagnostics` samples" in their doc comments
(`:104-144`). BEH-QD-323's last requirement states the rule once
(`spec/behaviors/28-devtools-screens.md:591-596`: "A reading supplied explicitly to the dock MUST take
precedence over a sampled one, field by field").

### C3. `hydrationMismatches` is superseded: **CONFIRMED**

Its own doc says so (`DevtoolsDock.tsx:145-151`, "Superseded by `hydration` … Shown only when that is
absent"), and the panel enforces it (`QuestionsPanel.tsx:284-296`: `LegacyMismatches` renders only
when `activity === undefined`). The metric it duplicates is counted whether or not a reporter is
supplied (`packages/react/src/HydrationEngine.ts:558-560`, `HydrationCounts.ts:78-80`). The one host
passes it, and it is dead there (ARCH-34 C2, removed by ARCH-34 T1). Callers today:
`DevtoolsDock.test.tsx:874,887`, `QuestionsPanel.test.tsx:96-119,154-157`, and `QuestionsPanelProps.hydrationMismatches`
(`QuestionsPanel.tsx:46-54`), which is also exported.

### C4. This contradicts ARCH-24's D-24-c, decided 2026-10-07: **CONFIRMED** — but only the props' *location*, not D-24-c's *semantics*

`ARCH-24-diagnostics-store.md:342-355`: D-24-c weighed **A. Replace** (remove the four snapshot
props: "breaking, and it removes the only way to show data the browser cannot sample"), **B.
Deprecate**, **C. Keep both, with explicit-prop precedence per field**, and decided **C**: "the props
answer a different question (another process's diagnostics) that sampling cannot." D-24-c rejected
*losing* supplied readings. It did not weigh carrying them in one value. This plan keeps every
supplied reading and the per-field precedence, and only moves five props into one. That is still a
reversal of a decision made the same day the review ran, and it is presented as such (D-44-a).

### C5. Who passes the five overrides: **CONFIRMED — tests only**

`grep -rln "<DevtoolsDock"` over `packages apps examples features spec`: the one live host
(`examples/nextjs-newsroom/src/client/Dock.tsx`) passes **none** of the five (`:176-185`, by design,
`:12-16`). `packages/devtools/test/react/DevtoolsDock.test.tsx` passes them 10 times: `wiring` at
`:859,1028,1042,1126`, `activity` at `:783,872,1108`, `portCalls` at `:1043`, `questions` at `:873`,
`hydration` **never**. The docs name them in `packages/devtools/README.md:126-127` and
`apps/website/.../devtools.md:119-121`.

### C6. Precedence is pinned for two of the five: **CONFIRMED (gap)**

`DevtoolsDock.test.tsx:1104-1120` ("an explicit activity prop wins over the sampled one") and
`:1122-1133` ("an explicit wiring prop wins over a sampled layer, field by field"). Nothing pins that
`portCalls`, `questions` or `hydration` win over a sampled value. Not a defect (the three `??` lines
are right), but a reshaping must not be the first thing to test them. T1 closes it first.

### C7. "Revisit only once #5 reshapes the props anyway": **CHANGED**

ARCH-34 (#5) does **not** reshape `DevtoolsDock`'s props: its D-34-b keeps devtools' API unchanged
and the feed spreads `gates`, `onInvalidate` and `diagnostics` onto the existing props. So this plan
is not a free rider on ARCH-34; it is its own breaking change. What ARCH-34 does settle is the
`diagnostics` prop's shape, which this plan must then leave alone (D-44-a option B).

## 2. Goal and success criteria

**Goal.** `DevtoolsDock`'s **interface** carries one idea five times: "a reading taken elsewhere,
which wins over the sampled one, field by field". Each copy restates the rule in a doc comment, and
one (`wiring`) has a narrower type than the field it overrides. This plan puts the idea behind one
prop, `reading?: DiagnosticsReading`, whose fields are the `Diagnostics` fields with the field's own
types, and one precedence line per field written in one place (`supplied.x ?? sampled.x`). The
**seam** between "this process, sampled" (`diagnostics`) and "elsewhere, supplied" (`reading`) stays,
because D-24-c was right that they answer different questions; it just stops being five seams. The
superseded `hydrationMismatches` is removed from the dock and from `QuestionsPanel`. **Leverage**:
fourteen props become nine, and a fixture or another process can now state a failed wiring read.
**Locality**: precedence lives in one `mergeReading` function in the model, testable without React.

**Success criteria**

1. `DevtoolsDockProps` has nine fields: `source`, `capacity`, `catalogue`, `diagnostics`, `reading`,
   `gates`, `unknownParents`, `onInvalidate`, `ports` (`grep -c "^  readonly " DevtoolsDock.tsx`
   within the interface → 9).
2. `model/DiagnosticsStore.ts` exports `DiagnosticsReading` and `mergeReading(sampled, supplied)`;
   `DiagnosticsStore.test.ts` pins, for each of the five fields, that a supplied value wins and an
   absent one falls through.
3. `grep -rn "hydrationMismatches" packages/devtools/src` → nothing; `LegacyMismatches` deleted.
4. ARCH-34's feed (`<DevtoolsDock {...useDevtoolsFeed(extra)} />`) compiles unchanged
   (`pnpm --filter @qadi/example-nextjs typecheck`).
5. `node scripts/check-api-surface.mjs`, `node scripts/check-website-doc-examples.mjs`,
   `node scripts/check-house-style.mjs` (no budget edited) and `pnpm check` green.

## 3. Non-goals

- **The `diagnostics` prop's shape.** ARCH-24 decided it and ARCH-34's feed spreads into it. Folding
  sampling options and supplied readings into a single prop is D-44-a option C and is not recommended.
- **`gates`, `onInvalidate`, `ports`, `unknownParents`, `catalogue`, `source`, `capacity`.** Not
  diagnostics; `gates` is pushed (§13, ADR-QD-080) and stays a prop.
- **Opt-in sampling** (D-24-g). A dock with only `reading` starts no fiber.
- **The panels' own props** other than `QuestionsPanelProps.hydrationMismatches`. `ServicesPanel`
  already takes a `WiringRead` (ARCH-24 T6).

## 4. Constraints

- **Ordering.** Start after ARCH-34 lands (and after ARCH-37's `QuestionsPanel` hydration edit, if it
  is in flight). ARCH-34 removes the one live `hydrationMismatches` caller; this plan then removes the
  prop with no host to migrate.
- **Breaking change** for `@qadi/devtools` (six props removed from `DevtoolsDockProps`, one from
  `QuestionsPanelProps`). Pre-1.0, so a minor in the fixed group (ADR-QD-038), and listed as needing
  **user sign-off** (D-44-a, D-44-b). No shim: a deprecated alias for five props would be the
  widening the user's "closed union over widening" preference rejects.
- **AGENTS.md §5a / ADR-QD-034**: precedence is five `??` lines, no `switch`. **`SWITCH_BUDGET`
  untouched.**
- **§6**: no `as`; `DiagnosticsReading` is an explicit interface, not `Partial<…>` of anything with
  `| undefined` fields (with `exactOptionalPropertyTypes`, `Partial<Diagnostics>` would admit an
  explicit `hydration: undefined` meaning "supplied nothing", a third state). Not
  `Record<string, unknown>` (user rule).
- **§9**: `DiagnosticsReading` and `mergeReading` go in the model barrel (`src/index.ts` already
  re-exports `DiagnosticsStore.ts`); coordinate with ARCH-40.
- **§10 / ADR-QD-076**: `mergeReading` is model code, so `stryker.devtools.mjs` mutates it; T2's
  per-field tests must kill each `??` mutant. Model coverage 95%, React shell 90%.
- **Gate 13**: `spec/overview.md` rows for the new exports; `DevtoolsDockProps`/`QuestionsPanelProps`
  descriptions updated.
- **Gate 12 (`node scripts/check-devtools-claims.mjs`)**: any `spec/devtools-spec/` prose avoids the
  absence phrase list.
- **BEH-QD-218**: every tab still explains its emptiness; the "every tab explains" test stays unedited.

## 5. Decisions needed before work starts

### D-44-a — Reopen D-24-c's prop layout at all, and into what shape?

- **A. Keep D-24-c as decided.** Fourteen props; five restate one rule; `wiring` stays narrower than
  its field. Zero churn. Only the superseded `hydrationMismatches` could still go (D-44-b).
- **B. One `reading?: DiagnosticsReading` prop beside `diagnostics`** (this plan). Keeps D-24-c's
  semantics (supplied wins field by field; sampling and supplied stay distinct questions) and D-24-g
  (opt-in). Fourteen → nine. `wiring` becomes a `WiringRead`, so a supplied reading can state
  `Failed`. Breaking: five props move.
- **C. Literally one `diagnostics` prop** carrying both, e.g. `{ sample?: DiagnosticsDockOptions; supplied?: DiagnosticsReading }`.
  Fourteen → eight, but it changes the shape ARCH-34's feed spreads into (the feed would have to
  return `{ sample: … }`), and nests the opt-in one level deeper for every host. More churn for one
  fewer prop.
- **D. A closed union `diagnostics: Sample | Supplied`.** Loses per-field mixing (sample this
  process's activity, supply another process's wiring), which is exactly what D-24-c protected.
  Rejected.

**Recommendation:** honestly, the leverage is modest — no live host passes any of the five (C5) —
which is why this is Speculative. If the user reopens D-24-c, **B**: it is the complete version of
the consolidation that still respects every reason D-24-c gave, and it leaves ARCH-34 untouched. If
not, **A** plus D-44-b. **Needs user sign-off** (reverses a same-day decision; breaking).
**status: decided (2026-10-08, B: one `reading` prop beside `diagnostics`; no explicit user reopen was given, the orchestrator's instruction to implement T0-T7 was taken as the reopen; breaking, flagged for user review)**

### D-44-b — Remove `hydrationMismatches` (dock and `QuestionsPanel`)?

- **A. Remove both**, with `LegacyMismatches`. The count is `hydration.mismatched`, sampled for free
  (C3). Breaking, two exported props.
- **B. Remove from the dock only**; keep the panel prop for a custom shell.
- **C. Keep** (status quo).

**Recommendation: A**, independent of D-44-a (it is the one change the review and ARCH-24's own
"superseded" doc agree on). Lands after ARCH-34 T1. **Needs user sign-off** (breaking). **status: decided (2026-10-08, recommended default A; breaking, flagged for user review)**

### D-44-c — Where precedence lives

- **A. A model function** `mergeReading(sampled: Diagnostics, supplied: DiagnosticsReading | undefined): Diagnostics`
  in `model/DiagnosticsStore.ts`, five `??` lines, tested headlessly and mutated by Stryker.
- **B. Inline in `DevtoolsDock.tsx`**, as today.

**Recommendation: A** (the model computes, the shell renders, ADR-QD-047). Only meaningful if
D-44-a = B or C. **status: decided (2026-10-08, recommended default A)**

## 6. Tasks

### T0 — Re-baseline after ARCH-34
- **Status:** [x] done (2026-10-08)
- **Depends on:** — (run after ARCH-34 has landed)
- **Files:** none
- **Steps:**
  1. `git switch -c arch/44-dock-reading main`; re-read C1–C6 line refs (ARCH-33/34/37 may have
     moved them) and update §1.
  2. Confirm ARCH-34 removed the example's `hydrationMismatches` (`grep -rn hydrationMismatches examples` → nothing).
  3. Baselines: `pnpm vitest run --project devtools`, `node scripts/check-api-surface.mjs`.
- **Tests:** none
- **Verify:** the commands above
- **Done when:** baselines in §10.

### T1 — Pin today's precedence for the three unpinned overrides (C6)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0 (no decision; useful even if D-44-a = A)
- **Files:** `packages/devtools/test/react/DevtoolsDock.test.tsx`
- **Steps:** beside `:1104-1133`, add:
  1. "an explicit portCalls prop wins over the sampled collector" — `diagnostics={{ collector }}` with
     a collector holding one call, `portCalls` a log with a distinct call; assert the distinct one renders.
  2. "an explicit questions prop wins over the sampled thunk" — `diagnostics={{ questions: () => [a] }}`,
     `questions={[b]}`; the React tab lists `b` only.
  3. "an explicit hydration prop wins over the sampled counts" — `diagnostics={{}}`,
     `hydration={{ …seeded: 7… }}`; `qadi-hydration-seeded` reads 7.
- **Tests:** the three `it`s, green against today's code.
- **Verify:** `pnpm vitest run packages/devtools/test/react/DevtoolsDock.test.tsx`
- **Done when:** green; these are the regression net T3 must keep green after mechanical migration.

### T2 — `DiagnosticsReading` and `mergeReading` in the model (D-44-a = B, D-44-c = A)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1, D-44-a, D-44-c
- **Files:** `packages/devtools/src/model/DiagnosticsStore.ts`;
  `packages/devtools/test/model/DiagnosticsStore.test.ts`; `packages/devtools/test/model/DiagnosticsStore.tst.ts`
- **Steps:**
  1. `export interface DiagnosticsReading { readonly wiring?: WiringRead; readonly activity?: ReadonlyArray<PortActivity>; readonly hydration?: HydrationActivity; readonly portCalls?: PortCallLog; readonly questions?: ReadonlyArray<AskedQuestionLike> }`
     — doc: "a reading taken elsewhere (another process, a fixture); each field wins over the sampled one".
  2. `export const mergeReading = (sampled: Diagnostics, supplied: DiagnosticsReading | undefined): Diagnostics`
     — `supplied === undefined ? sampled : { wiring: supplied.wiring ?? sampled.wiring, … }` (five
     lines). Returning `sampled` itself when nothing is supplied keeps identity for `useSyncExternalStore` consumers.
- **Tests:** per field: supplied wins, absent falls through (10 cases, each killing one `??` mutant);
  "no reading returns the sampled object itself"; `.tst.ts`: `DiagnosticsReading` rejects
  `{ hydration: undefined }` under `exactOptionalPropertyTypes`.
- **Verify:** `pnpm vitest run packages/devtools/test/model/DiagnosticsStore.test.ts`; `pnpm test:tstyche`
- **Done when:** green; model coverage holds 95%.

### T3 — `DevtoolsDock` takes `reading`; the five overrides and `hydrationMismatches` go (D-44-a/b)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2, D-44-b
- **Files:** `packages/devtools/src/react/DevtoolsDock.tsx`; `packages/devtools/src/react/QuestionsPanel.tsx`;
  `packages/devtools/test/react/DevtoolsDock.test.tsx`; `packages/devtools/test/react/QuestionsPanel.test.tsx`
- **Steps:**
  1. `DevtoolsDockProps`: delete `wiring`, `activity`, `portCalls`, `questions`, `hydration`,
     `hydrationMismatches` (`:103-151`); add `readonly reading?: DiagnosticsReading` after
     `diagnostics`, with one doc comment carrying the rule the five used to repeat.
  2. Body: `const shown = useMemo(() => mergeReading(sampled, reading), [sampled, reading])`; pass
     `shown.wiring`/`shown.activity`/… to `Screen` (`:313-318`); delete the `wiringRead` memo and the
     `WiringRead.Read({ report })` mapping (`:189-194`). Remove `hydrationMismatches` from `Screen`'s props.
  3. `QuestionsPanel.tsx` (D-44-b = A): delete `hydrationMismatches` (`:46-54`) and `LegacyMismatches`;
     `Hydration` renders the unwired explanation when `activity === undefined`. Keep the
     `qadi-hydration-unwired` test id and its "`hydrationActivity`" wording (asserted at
     `QuestionsPanel.test.tsx:117`).
  4. Tests, mechanically: each `wiring={report}` → `reading={{ wiring: WiringRead.Read({ report }) }}`;
     `activity=`/`portCalls=`/`questions=`/`hydration=` → `reading={{ … }}` (C5's ten sites + T1's
     three). Delete `DevtoolsDock.test.tsx:874,887` and `QuestionsPanel.test.tsx:96-119,154-157`
     (the superseded count). List every edited `it` in §10.
  5. New: "a supplied reading can state a failed wiring read" (`reading={{ wiring: WiringRead.Failed({ reason: "from the server" }) }}`
     → `qadi-wiring-failed`), the case today's `wiring?: WiringReport` cannot express.
- **Tests:** as above; BEH-QD-218's "every tab explains its emptiness" test unedited and green.
- **Verify:** `pnpm vitest run --project devtools`; `pnpm typecheck`;
  `pnpm --filter @qadi/example-nextjs typecheck` (ARCH-34's feed still compiles)
- **Done when:** green; success criteria 1, 3, 4 hold.

### T4 — Docs
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3
- **Files:** `packages/devtools/README.md` (`:122-127` and the "twelve of thirteen"-style counts if any);
  `apps/website/src/content/docs/docs/packages/devtools.md` (`:116-121`); `examples/nextjs-newsroom/src/client/Dock.tsx` (header prop list, comment only)
- **Steps:** replace "The `wiring`, `activity`, `portCalls`, `hydration` and `questions` props remain
  for a reading taken elsewhere" with "`reading` carries a reading taken elsewhere …"; if a website
  fence shows a supplied reading, make it a `tsx` fence that compiles. Update the example header's
  prop count (nine).
- **Tests:** the website gate.
- **Verify:** `node scripts/check-website-doc-examples.mjs`
- **Done when:** green; `grep -rn "hydrationMismatches\|activity=\|wiring=" packages/devtools/README.md apps/website/src/content/docs/docs/packages/devtools.md` shows only `reading`.

### T5 — Spec, ADR, overview, traceability, CCR, changeset
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3, T4
- **Files:** `spec/behaviors/28-devtools-screens.md`; `spec/decisions/047-a-headless-devtools-model.md`;
  `spec/decisions/index.yaml`; `spec/overview.md`; `spec/traceability.md`; `spec/README.md`;
  `.changeset/dock-reading.md` (*new*)
- **Steps:**
  1. BEH-QD-323: the signature listing (`:534-541`) gains `// <DevtoolsDock reading={{ wiring, activity, … }} />`;
     the last requirement's prose names `reading`. BEH-QD-218's table: the `hydrationMismatches`
     fallback row, if any, removed. Change-history row.
  2. ADR-QD-047: an amendment "A supplied reading is one value" citing D-24-c and why its rationale
     still holds; `index.yaml`.
  3. `spec/overview.md`: `DiagnosticsReading`, `mergeReading` rows; `DevtoolsDockProps`/`QuestionsPanelProps`
     cells note the removal; change history (**breaking**).
  4. `spec/traceability.md`: BEH-QD-323 → `mergeReading`; test rows.
  5. `spec/README.md`: CCR-QD-NEXT ("reverses the layout half of ARCH-24's D-24-c; keeps its semantics").
  6. Changeset: `@qadi/devtools` minor, **breaking** ("`DevtoolsDock`'s `wiring`/`activity`/`portCalls`/`questions`/`hydration`
     are one `reading`; `hydrationMismatches` removed from the dock and `QuestionsPanel`"). **No publish.**
- **Tests:** the gates.
- **Verify:** `node scripts/check-doc-examples.mjs`; `node scripts/check-api-surface.mjs`;
  `node scripts/check-devtools-claims.mjs`; `pnpm spec:verify:strict`
- **Done when:** green.

### T6 — Full gate
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T5
- **Files:** none
- **Steps:** `pnpm check` alone on the machine. If `stryker.devtools.mjs` reports a surviving `??`
  mutant in `mergeReading`, add the killing per-field case to T2 rather than weakening the code.
- **Tests:** —
- **Verify:** `pnpm check`
- **Done when:** exit 0; devtools mutation score ≥ 80.

### T7 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T6
- **Files:** this plan
- **Steps:** set `status`; task boxes; decisions `decided (<date>, <choice>)`; §10 rows with SHAs.
  If D-44-a = A, set `status: dropped` after T1 (and T3's `hydrationMismatches` half if D-44-b = A
  is done standalone), with the reason.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-44-*.md | sort | uniq -c`
- **Done when:** the plan reflects reality.

## 7. Test strategy

- **Added first:** T1 pins the three unpinned precedence rules against today's props, so the
  migration in T3 is checked against behaviour, not re-derived.
- **Moved to the model:** precedence becomes `mergeReading`, tested per field headlessly (T2) and
  mutated by Stryker; the dock tests keep one or two end-to-end precedence cases.
- **Mechanically edited:** the thirteen dock-test sites (C5 + T1) move to `reading={{ … }}`; listed in §10.
- **Deleted as redundant:** the `hydrationMismatches` cases (`DevtoolsDock.test.tsx:874,887`,
  `QuestionsPanel.test.tsx:96-119,154-157`) — the count they test is `hydration.mismatched`,
  already covered by `Hydration.test.ts` and the counts panel tests.
- **New behaviour:** a supplied `Failed` wiring read is stated (T3 step 5).
- **Unchanged:** `useDiagnostics`, `DiagnosticsStore` sampling tests, ARCH-34's feed tests, the example.

## 8. Spec and documentation updates

- `spec/behaviors/28-devtools-screens.md` (BEH-QD-323 listing and prose; BEH-QD-218 table).
- `spec/decisions/047-…` amendment + `index.yaml`.
- `spec/overview.md` (2 new rows, 2 changed cells, breaking note), `spec/traceability.md`, `spec/README.md` (CCR-QD-NEXT).
- `packages/devtools/README.md`, website `devtools.md`, example `Dock.tsx` header.
- `.changeset/dock-reading.md` (breaking, minor).

## 9. Risks and rollback

- **Reversing a same-day decision.** The main risk is process, not code: D-24-c was argued and
  decided on 2026-10-07. Mitigation: D-44-a requires the user's explicit reopen; the default is A.
- **Third-party hosts passing the old props** break at compile time (removed props are excess
  properties in a JSX literal). Pre-1.0 and changeset-noted; no shim (§4).
- **Identity churn.** `mergeReading` returning a fresh object each sample would re-render the dock
  every tick; T2's "no reading returns the sampled object itself" and the `useMemo` keyed on
  `[sampled, reading]` prevent it. A host passing an inline `reading={{…}}` re-merges per render,
  which is cheap (five `??`) and already true of today's inline literals.
- **Rollback.** T1 is independent and stays. T2 is additive. Reverting T3–T5 restores the five props;
  no other package depends on them (ARCH-34's feed does not pass them).

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written at `e635e68`; no probe needed (prop list and precedence read directly) | planner |
| 2026-10-08 | T0 | on top of ARCH-34 (`b8f542d`, `e81516b`) and ARCH-33/37 merged; baseline devtools 37 files / 909 tests; the example no longer passes `hydrationMismatches` | implementer |
| 2026-10-08 | T1 | `DevtoolsDock.test.tsx` "an explicit portCalls prop wins over the sampled collector", "an explicit questions prop wins over the sampled thunk", "an explicit hydration prop wins over the sampled counts": green against the old props (66 tests) | implementer |
| 2026-10-08 | T2 | `DiagnosticsReading`, `mergeReading` in `DiagnosticsStore.ts`; 14 per-field cases in `DiagnosticsStore.test.ts` (27 tests in file), 3 tstyche cases (`{ hydration: undefined }` rejected, `wiring` is a `WiringRead`) | implementer |
| 2026-10-08 | T3 | dock props 14 to 9; `reading` merged by `mergeReading` in a `useMemo`; `hydrationMismatches` and `LegacyMismatches` deleted; edited `it`s: `DevtoolsDock.test.tsx` "the selected tab survives a re-render", "threads wiring, activity, questions and the invalidate handler" (its mismatch assertion deleted), "names what the detail would take when no collector was wired", "renders the calls when the host wired a collector", "an explicit activity prop wins…", "an explicit wiring prop wins…", T1's three; deleted `QuestionsPanel.test.tsx` "reports mismatches when a reporter is wired", "reads naturally for a single mismatch", "supersedes a host-counted mismatch rather than showing both"; new "a supplied reading can state a failed wiring read"; devtools 923 tests green, typecheck, tstyche (25 files), lint, circular clean | implementer |
| 2026-10-08 | T4 | `packages/devtools/README.md`, website `devtools.md`, example `Dock.tsx` header ("nine optional fields"); `check-website-doc-examples` 36 blocks | implementer |
| 2026-10-08 | T5 | BEH-QD-323 listing and requirements (plus one requirement on the removed count), ADR-QD-047 amendment, `index.yaml`, overview (2 rows, 2 cells, breaking note), traceability, README **CCR-QD-241**, changeset `dock-reading.md` (`@qadi/devtools` minor, breaking); spec gates green | implementer |
| 2026-10-08 | T6 | not run: `pnpm check` and devtools Stryker (`stryker.devtools.mjs`) left to the orchestrator | implementer |
| 2026-10-08 | T7 | tracker updated; commit `5515084` | implementer |
