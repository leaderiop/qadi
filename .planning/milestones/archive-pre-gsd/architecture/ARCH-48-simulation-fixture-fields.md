---
id: ARCH-48
title: Describe each simulation input field once — one closed field table in the devtools model; the weakening sweep, the remedies' grants, the subject rename, the replay's unseeded list, the fixture ports and the form's chip commands are derived from it (fixes the missing signature drop)
strength: Strong          # from the 2026-10-13 architecture review (wave 5, card #3, "Describe each simulation fixture field once")
status: superseded-by-phase-13
disposition: "ported by Phase 13 (GAP-02, GAP-03, GAP-04) from rescue/wave5-1013 950977f; was `done` on the unmerged branch only (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []            # T1 (the defect patch) depends on nothing. Soft: ARCH-57 (core `fixturePortsLayer` setup union) before or after T8, second lander adapts; see §9
blocks: []
adrs_touched:
  - ADR-QD-047 (amend, Rev 1.7: the simulator's form is the model's — each input field is described once in `SimulationFields.ts`, and the session's chip commands and form reading are derived from it; "renders that model and computes nothing" now covers the chip text too)
  - ADR-QD-094 (read: the pattern — "a port is described once; its wrappers, default, environment and double are derived". This plan applies it to the seven fields of `SimulationInput`, and keys the fixture half by core's `PortName` so a port added to the registry is a compile error here)
  - ADR-QD-050 (constraint: a simulation is sealed and Fixtures mode takes data, never a layer; the fixture-port table maps fields to `PortFixtureData`, it does not admit a layer)
  - ADR-QD-099 + ARCH-40 (constraint: out of the barrel means not importable; the table and its derived operations stay package-private, only the types the session's interface names are exported, each with a `spec/overview.md` row and a `test/surface.test.ts`/`surface.tst.ts` line)
  - ADR-QD-034 (constraint: `Match`, not `switch`; `SWITCH_BUDGET` unchanged. The table is a closed `Record` read by key, like `FieldLattice.ts`'s law table, and `remedyFor`'s `if`-chain becomes `Match.type<Requirement>()`)
  - ADR-QD-037 (constraint: madge gate 5; `SimulationFields.ts` is a leaf above `SimulationForm.ts`/`SimulationEdit.ts`/`SimulationInput.ts` and must not import `Edits.ts`, `Remedies.ts`, `Replay.ts` or `SimulationSession.ts`)
  - ADR-QD-025 + ADR-QD-076 + ADR-QD-098 (constraint: `packages/devtools/src/model/**` is mutated by `stryker.devtools.mjs`, `ignoreStatic: true`, break 80, sequential. A module-scope table's string columns are *static* mutants and are ignored, so every label and reason is pinned by a `deepStrictEqual` instead)
  - ADR-QD-055 (read: `HasCustom` is opaque; D-48-c names it as a skipped remedy rather than offering one)
packages: ["@qadi/devtools", "spec", "features (BDD, one scenario)"]
estimate: L   # ≈ 4–5 days for T0–T13. Defect path (T0 + T1) ≈ 2–3 h, shippable alone as a patch. T2 (remedy gap) ≈ ½ day once D-48-c is decided.
---

# ARCH-48 — Describe each simulation input field once

## 1. Verified evidence (at `b655b3b`)

Checked on `main` at `b655b3b` (`git rev-parse --short HEAD` → `b655b3b`, "Wave 4 architecture deepenings and security
patches (ARCH-30 to ARCH-45) (#150)"). ARCH-20 (`SimulationSession`, `SimulationForm`), ARCH-33 (`HeldChoice`) and
ARCH-40 (the named devtools barrel) are all `status: done` and in that commit, so every line below is code those plans
wrote. In particular ARCH-20 C6 is where `signatures` gained its form field — and where the weakening sweep was not told.

**Probes** live in `$P = /private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-48/`,
never in the repo. They are ephemeral; each row says how to rebuild it. The scratch directory cannot resolve workspace
packages, so the probes import `@qadi/core` and the devtools model by absolute path to their `src/`.

- **Runtime probe** `drop-signature.probe.test.ts` with a scratch `vitest.config.mts` (`root: $P`, alias `@qadi/core` →
  `packages/core/src/index.ts`, plain `vitest` imports — `@effect/vitest` from another root fails with
  `Cannot read properties of undefined (reading 'config')`). Run:
  `cd packages/devtools && npx vitest run --config $P/vitest.config.mts --reporter=verbose --silent=false`.
- **Type spike** `SimulationFields.ts` with a scratch `tsconfig.json` extending `tsconfig.base.json`
  (`paths` → core `src`, `rewriteRelativeImportExtensions: false` because the imports are absolute, `lib` + `DOM` for
  core's `crypto`). Run: `cd packages/devtools && ../../node_modules/.bin/tsc -p $P/tsconfig.json`.

| Probe | Output at `b655b3b` |
| ----- | ------------------- |
| `singleEdits({ subject: { id: "alice", roles: ["editor"] }, resource: { id: "doc-1" }, signatures: [{ subjectId: "alice", meaning: "approved", resourceId: "doc-1" }] })` | `[ 'without role editor' ]` — **no signature row** |
| `sweepPlan(hasSignature("approved"), <same input>, {})` | edits `[ 'DropRole without role editor' ]` |
| `makeSimulationSession({ sightings: [hasSignature("approved")] })`, `edit(<same input>)`, `getSnapshot().plan` | edits `[ 'DropRole without role editor' ]`, `evaluations: 2` — the **session** states a sweep that cannot ask "was it the signature?" |
| `remedyEdits(hasSignature("approved"), { subject: { id: "alice" }, resource: { id: "doc-1" } })` | `edits: []`, `skipped: []` — **neither a remedy nor a named skip** |
| Type spike, as written (one closed `{ [K in SimulationField]: FieldDescription<FieldElements[K]> }` table, derived `FieldOps` closed over the element type, `FIELD_ORDER` checked to name every key, a `{ [K in PortName]: … }` fixture map) | **compiles clean**: no `as`, no `any`, no `!`. With the signatures row's `@ts-expect-error` removed: `TS2322: Type '"DropSignature"' is not assignable to type 'DropKind'` — the table catches the defect at compile time |
| Type spike with the `signatures` row deleted | `TS2741: Property 'signatures' is missing in type …` — a missing row is a compile error |

| # | Claim (review card 3) | Verdict | At `b655b3b` |
| - | --------------------- | ------- | ------------ |
| C1 | Seven list/record fields of `SimulationInput` — roles, permissions, subject.attributes, attributes, relationships, history, signatures — are handled separately across ~7 modules | **CONFIRMED** | `SimulationInput.ts` — `SimulatedSubject` (roles, permissions, attributes) and `SimulationInput` (attributes, relationships, history, signatures). Seven modules restate them: `SimulationForm.ts` (codecs, `sameSignature`, `renameSubject`, `addChip`/`removeAt`/`withPair`/`withoutPair`), `Edits.ts` (six drop functions, `sameEdge`/`sameEvent`), `Remedies.ts` (`remedyFor`'s five grants), `Replay.ts` (`unseededByReplay`), `SimulationSource.ts` (`fixtureLayer`), `SimulationSession.ts` (`renameSubject` command), `react/Simulator.tsx` (`SubjectCard`, `FixturesCard`, `Chips`, `Pairs`). |
| C2 | Chip codec in `model/SimulationForm.ts` | **CONFIRMED** | `roleCodec`, `permissionCodec`, `attributeCodec`, `edgeCodec`, `eventCodec`, `signatureCodec` — one per element type; `attributeCodec` serves both attribute fields. The codecs are sound (ARCH-20's round-trip law) and are **kept**; this plan only stops restating *which* codec each field uses. |
| C3 | Equality split: `sameEdge`/`sameEvent` in `Edits.ts` ~:219-223, `sameSignature` in `SimulationForm.ts`, roles/permissions inline `(a,b)=>a===b` in `Simulator.tsx` | **CONFIRMED**, and there is a fifth notion | `Edits.ts` — `sameEdge`, `sameEvent` (:219-223); `SimulationForm.ts` — `sameSignature` (:403); `Simulator.tsx` `SubjectCard` passes `same={(a, b) => a === b}` twice. The fifth: the two `Pairs` editors never call an equality — `withPair` *replaces* by name, so a record field's duplicate rule ("replace") differs from a list field's ("refuse") and is written in a different function. |
| C4 | Field updates are hand-written spreads: nine `session.edit({...draft, subject: {...draft.subject, roles}})` in `Simulator.tsx` | **CHANGED (count)** | `grep -c "session.edit(" Simulator.tsx` → **8**: seven field writes (three nested `subject` spreads in `SubjectCard`, four flat in `FixturesCard`) plus `withAction` in `CheckCard`. The point stands; the number is eight, of which seven are this plan's. |
| C5 | Rename-follows rule is `renameSubject` | **CONFIRMED** | `SimulationForm.ts` — `renameSubject` (:507-517) lists `relationships`, `history`, `signatures` by hand; `SimulationSession` — `renameSubject` command (:591) calls it. |
| C6 | Drop edits are six functions in `Edits.ts` | **CONFIRMED** | `roleDrops`, `permissionDrops`, `subjectAttributeDrops`, `fixtureAttributeDrops`, `relationshipDrops`, `eventDrops`, joined by `singleEdits` (:36). Each restates the lens (`self.subject.roles`, …), the "absent field stays absent" rule and the equality. |
| C7 | Grant edits in `model/Remedies.ts` | **CONFIRMED** | `remedyFor` (:420) — `GrantRole`, `GrantPermission`, `SetSubjectAttribute`, `AddRelationship`, `AddEvent` each restate the lens and the presence check; `SetAction`/`SetResourceAttribute` change the *question*, not a held field, and stay out of the table. `remedyFor` is an `if`-chain on `self._tag` whose last arm is an implicit `Acted` fall-through. |
| C8 | Unseeded reasons in `model/Replay.ts` ~:53 keyed by display strings ("resolver attributes") that must match the Simulator's labels | **CHANGED** | `unseededByReplay` (:53) is keyed by display strings, but **nothing joins them to the form**: `UnseededCard` only lists `field` and `reason`; the "badge each section" its doc comment describes was never built. They already disagree once: the replay says **"subject attributes"**, the `SubjectCard` labels that editor **"attributes"**. Cosmetic today (the card sits under a "subject" heading), but it is exactly the drift the claim predicts, and `UnseededField.field` is public (`spec/overview.md`), so a host keying on it keys on prose. |
| C9 | LIVE DEFECT — `EditKind` lists `DropRole`, `DropPermission`, `DropSubjectAttribute`, `DropFixtureAttribute`, `DropRelationship`, `DropEvent` and no `DropSignature`; on a `hasSignature` policy the "which grant is load-bearing?" sweep shows no signature row | **CONFIRMED** (runtime probe, three entry points) | `SimulationEdit.ts` — `EditKind` (:40-56). `singleEdits` has no `signatures` arm, so `sweepPlan`, `whatIf` and the session's `plan` all omit it. `Edits.test.ts`'s `full` fixture has no `signatures` either, so no test could notice. Signatures *are* in the form (`FixturesCard`), the codec (`signatureCodec`), the rename rule, the fixture ports (`fixtureLayer`) and the unseeded table: the one cell ARCH-20 C6 missed. Severity **medium**: a reviewer asking "was it the signature?" of an allow gets a table that never names it, and reads "no row flipped" as "the signature was not load-bearing". |
| C10 | Whether a matching grant/`AddSignature` remedy is missing (`Remedies.ts`) | **CONFIRMED gap; deliberate in code, but contradicts the spec** | `requirementCases.HasSignature: () => []` (:359), with a comment that a remedy would mean "building a plausible on-file signature (meaning, role) out of nothing". That reason does not hold: `hasSignature`'s node carries `meaning`, `signerRole?` and `scope` (`Policy.ts`), which is everything `askSignature` (`PortAccess.ts`) matches on — the same position `HasActed` is in, and `AddEvent` builds its event from the node's name. Worse, the probe shows the requirement is **not named as skipped either**, while BEH-QD-222 says "A requirement no remedy could be built for MUST be named, with the reason". `HasCustom: () => []` has the same silence. `Remedies.test.ts` pins both silences ("proposes nothing for hasSignature — a signature is not built out of nothing"). Not a security defect; a **low** spec/behaviour gap, decided in D-48-c. |
| C11 | Fixture half already keyed by port in core: `fixturePortsLayer({ RelationshipResolver: input.relationships, … })` in `model/SimulationSource.ts` ~:115 | **CONFIRMED** (lines :117-145) | `SimulationSource.ts` — `fixtureLayer`. Core's `PortFixtureData`/`PORT_FIXTURES`/`fixturePortsLayer` (`Ports.ts`, ADR-QD-094 Rev 1.3, ARCH-42) are closed over `PortName`. But `fixturePortsLayer` takes a *partial* `PortFixtures`, so a sixth port added to core compiles here silently and the simulator leaves it at its default. `CustomPredicate` is deliberately unfed (the comment explains why); that reason lives in a comment, not in a type. |
| C12 | Chip semantics (duplicates by structure, subject attribution, refusal) are testable only through DOM (`Simulator.test.tsx` C5/C6) | **CHANGED** | The *functions* are tested headlessly: `SimulationForm.test.ts` "list edits" covers `addChip`'s refusals and structural duplicates, `removeAt`, `renameSubject`. What only the DOM reaches is the **wiring** — which codec, equality, lens and subject each field's editor uses (e.g. that `signatures` is paired with `sameSignature` and the current subject) — `Simulator.test.tsx` "the fixtures as the codec writes them — C5, C6" and "the fixtures card". And the wiring lives in `Simulator.tsx`, outside `stryker.devtools.mjs`'s `src/model/**`, so no mutant ever tests it. |
| C13 | `addChip(field, text)`/`removeChip(field, i)` on the session | **design proposal, not evidence** | Today `SimulationSession` has `edit(next)`, `renameSubject(to)`, `editResourceText(text)`; BEH-QD-322's listing says "…and one synchronous command per field of the form", which is not what HEAD has (one `edit` for all seven). Settled in D-48-d/D-48-h. |

**Also found while verifying (not on the card):**

- **E1.** `Edits.ts`'s order (roles, permissions, subject attributes, fixture attributes, relationships, events),
  `unseededByReplay`'s order and the form's top-to-bottom order are the same seven fields in the same order, maintained
  three times. One `FIELD_ORDER` serves all three; the sweep's E4.9 determinism ("the same input sweeps to the same rows
  in the same places") then holds by construction.
- **E2.** `remedyFor`'s `if`-chain ends in an implicit `Acted` arm. Adding a `Signature` requirement is caught by the
  compiler only because `self.event` would not exist on it; converting it to `Match.type<Requirement>().pipe(Match.tagsExhaustive(…))`
  (the shape `refValue` and `witness` in the same module already use, AGENTS.md §5a) makes the next requirement a
  compile error at the right line.
- **E3.** `UnseededField`, `EditKind`, `SimulationEdit`, `SimulationInput`, `SimulationSession` are public
  (`src/index.ts`, `spec/overview.md` rows at "`EditDirection`, `EditKind`, `SimulationEdit`" and "`UnseededField`,
  `BaselineCaveat`, `Baseline`"). `Edits.ts`'s functions, `remedyEdits`, `unseededByReplay` and the 21 form codecs are
  package-private since ARCH-40 (`test/surface.tst.ts` pins `singleEdits`/`remedyEdits` as "no exported member"). So
  the deepening is mostly internal; its public face is `EditKind` (+`DropSignature`, maybe `AddSignature`), the session's
  two new commands, `UnseededField.key`, and the types those name.
- **E4.** Nothing outside `@qadi/devtools` names `EditKind` or dispatches on it (`grep -rn EditKind packages/*/src examples`
  → only `devtools/src/index.ts`, `SimulationEdit.ts`); `WhatIfTable.tsx` groups by `direction`, not `kind`. Adding a
  member breaks no in-repo consumer.

## 2. Goal and success criteria

`SimulationInput` has seven held fields, and today each module that touches them — the form, the weakening sweep, the
remedies, the rename rule, the replay, the fixture ports — restates the field's **lens** (where it lives in the input),
its **element codec**, its **equality**, its **label** and what it means for that module. The **interface** a reader must
learn to add or change a field is seven modules wide and its **implementation** is spread across all of them, so the
modules are **shallow** in the one dimension that matters here: adding `signatures` touched six of the seven cells and
missed the seventh. This plan makes one **deep** module, `model/SimulationFields.ts`: a closed per-field description
table (ADR-QD-094's "described once", applied to the simulator's input) with the operations every consumer needs
derived from it. **Locality**: a field is one row, and a missing row or column is a compile error. **Leverage**: the
weakening sweep, the grants, the rename, the unseeded list, the chip commands and the form reading each become a few
lines over the table, and the fixture half is keyed by core's `PortName`, so a port core adds reaches the simulator as a
compile error instead of a silent default. The **seam** a test crosses moves from the DOM (`Simulator.test.tsx`) to
`SimulationSession` (`addChip`/`removeChip`/`snapshot.fields`), which is inside the model's mutation gate. `Simulator.tsx`
becomes an **adapter** that maps table rows to editors.

Success criteria (each observable):

1. **The defect is closed first.** A `hasSignature` policy with a signature fixture sweeps to a `DropSignature` row that
   flips the verdict: `pnpm vitest run packages/devtools/test/model/Edits.test.ts packages/devtools/test/model/WhatIf.test.ts packages/devtools/test/model/SimulationSession.test.ts`
   green with the new tests (T1), and the same tests red on `b655b3b`.
2. `packages/devtools/src/model/SimulationFields.ts` exists; `SIMULATION_FIELDS` is typed
   `{ readonly [K in SimulationField]: FieldDescription<FieldElements[K]> }`; deleting any row or any column fails
   `pnpm typecheck` (pinned by `test/model/SimulationFields.tst.ts`, `// @ts-expect-error` cases).
3. Every `Drop…` member of `EditKind` is used by exactly one row, and every row's drop kind is a `Drop…` member: a
   tstyche assertion `expect<DropKindOfRows>().type.toBe<Extract<EditKind, \`Drop${string}\`>>()`.
4. `grep -nE "roleDrops|permissionDrops|subjectAttributeDrops|fixtureAttributeDrops|relationshipDrops|eventDrops" packages/devtools/src`
   → no hits; `singleEdits` is a fold over `FIELD_ORDER`.
5. `grep -n "relationships\|history\|signatures" packages/devtools/src/model/SimulationForm.ts` finds them only in codec
   doc comments — `renameSubject` derives from the table's `attribution` column.
6. `unseededByReplay` is derived (`FIELD_ORDER.map(…)`); each `UnseededField` carries `key: SimulationField` and its
   `field` is the row's label, which is the label the form shows (the "subject attributes"/"attributes" mismatch is gone).
7. `SimulationSource.ts`'s fixture data is a `{ readonly [K in PortName]: … }` table; adding a sixth `PortName` member in
   core fails `pnpm typecheck` in `@qadi/devtools` (tst case).
8. `SimulationSession` has `addChip(field, text)` and `removeChip(field, index)`, and `SimulationSnapshot.fields` is the
   form reading; `grep -c "session.edit(" packages/devtools/src/react/Simulator.tsx` → **1** (the action), and
   `Simulator.tsx` no longer imports a codec or an equality.
9. A property test: for every generated `SimulationInput`, `singleEdits` yields one row per **distinct** element of every
   field, and each row's `apply` removes exactly that element and nothing else (`SimulationFields.test.ts`).
10. `pnpm check` green, including `pnpm circular`, `pnpm test:tstyche`, `pnpm spec:api`, `pnpm spec:claims`, and
    `stryker run stryker.devtools.mjs` at or above break 80 with no new survivors in `SimulationFields.ts`.

## 3. Non-goals

- **Changing a codec.** ARCH-20's codecs and their round-trip laws stay exactly as they are; the table references them.
- **Moving the chip's typing buffer into the session.** ARCH-20 decided the uncommitted text is the view's only state
  (D-20-f, `Simulator.tsx` header). D-48-d keeps that unless the user picks B.
- **A `CustomPredicate` form field.** `SimulationInput` has no vocabulary for a custom predicate's answer
  (`SimulationSource.ts` comment). This plan turns that comment into a typed `NoFormVocabulary` cell; building the form is
  separate devtools UI work.
- **The question fields** (`action`, `resource`). They are what is asked, not what the subject holds; `Edits.ts` and
  `Remedies.ts` already keep them out of the weakenings, and `withAction`/`withResource`/`editResourceText` stay.
- **Renaming `SimulationInput`'s keys** to port names (`attributes` → `AttributeResolver`). It is a public type (ADR-QD-047)
  and the field names read better in a form; the `PortName` keying lives in the fixture table instead (D-48-f).
- **The policy explorer's session** — ARCH-50. **Core's `fixturePortsLayer` signature** — ARCH-57.
- **Label collisions inside prose** (`relation` containing `" on "`). `edgeLabel`/`eventLabel` share that weakness today and
  `dedupeByLabel` keys on labels; this plan keeps edge/event labels byte-identical and does not widen the risk (§9).

## 4. Constraints

- **AGENTS.md §1 imports** — `effect/Match`, `effect/Struct` as namespaces; `.ts` relative extensions; `import type` for
  `PortName`, `PortFixtureData`, `SignatureInput`, … from `@qadi/core` (a named import from the root, per §1).
- **§5a / ADR-QD-034, `SWITCH_BUDGET`** — no `switch`. The table is a closed `Record` read by key (the
  `FieldLattice.ts` law-table shape); `remedyFor` becomes `Match.type<Requirement>()` hoisted to module scope. The
  `SWITCH_BUDGET` count (three, in `Walk.ts`/`Matcher.ts`) is untouched.
- **§5, `UNTRACED_BUDGET`** — everything here is pure and synchronous; no `Effect.fn`/`fnUntraced` is added.
- **§6** — no `as` (except `as const`, which `no-as` excepts), no `any`, no `!`, no `Record<string, unknown>` as a widened
  implementation type (user memory): the spike's `FieldOps` closes over the element type with a generic `derive<K>`,
  which is what removes the need. `SimulationInput`'s own `Readonly<Record<string, unknown>>` attribute bags are the
  domain type and stay.
- **§9 barrels / ADR-QD-099 / ARCH-40** — `SimulationFields.ts` stays out of `src/index.ts`. Exported are only the
  types the session's interface names: `SimulationField` (and, under D-48-h = A, `FieldView`, `ChipView`). Each export
  is three edits (barrel line, `spec/overview.md` row for gate 13, `test/surface.test.ts`/`surface.tst.ts` line);
  `test/surface.tst.ts` gains `// @ts-expect-error no exported member` lines for `SIMULATION_FIELDS` and `fieldOps`.
- **ADR-QD-037, madge (`pnpm circular`)** — `SimulationFields.ts` imports `SimulationForm.ts` (codecs and the three
  equalities), `SimulationEdit.ts` (types), `SimulationInput.ts` (types) and `@qadi/core` types only. `sameEdge`/`sameEvent`
  therefore **move from `Edits.ts` to `SimulationForm.ts`** beside `sameSignature` (the spike imported them from
  `Edits.ts`; the real module must not, because `Edits.ts` will import the table).
- **Coverage (root `vitest.config.ts`)** — `packages/devtools/src/model/**` is held at 95% lines/branches; `src/react/**`
  at 90%. The new module lands with its own `test/model/SimulationFields.test.ts`.
- **Mutation (`stryker.devtools.mjs`, ADR-QD-025/076/098)** — `ignoreStatic: true` means mutants in the table literal's
  string columns (labels, placeholders, reasons) are *static* and not run. Every such value is therefore pinned by an
  exact `deepStrictEqual` (as `Replay.test.ts` pins `unseededByReplay` today), and the derived operations — which run
  per call and are not static — carry the behavioural tests.
- **Gate 12 (`pnpm spec:claims`, `scripts/check-devtools-claims.mjs`)** — the `spec/devtools-spec/02-screens.md` §5
  edit must not introduce an unregistered claim of absence (e.g. "has no field for custom predicates" would need a row).
  Word the `CustomPredicate` note as a reason ("answers a custom predicate only from Snapshot or Live"), or register it.
- **Gate 13 (`pnpm spec:api`)** — every new export gets a row; `EditKind`'s row text stays valid.
- **`spec/` is normative (AGENTS.md §11)** — BEH-QD-222, BEH-QD-225, BEH-QD-322 change with the code, plus one new
  invariant and the traceability rows, in the same change.
- **Releases** — every changeset here waits for the user's explicit go-ahead to release (standing instruction since
  2026-10-06).

## 5. Decisions needed before work starts

### D-48-a — How the fields are described

- **A. One closed description table plus derived operations, in a new `model/SimulationFields.ts`** (the spike).
  `FieldElements` maps each `SimulationField` key to its element type (`roles: string`, `permissions: PermissionKey`,
  `subjectAttributes`/`attributes: AttributePair`, `relationships: RelationshipEdgeInput`, `history: ActedEventInput`,
  `signatures: SignatureInput`). Each `FieldDescription<A>` row states: `label`, `placeholder`, `read`/`write` (the lens;
  `read` answers `undefined` for an absent field so "absent stays absent" is the table's rule, not each consumer's),
  `codec`, `same`, `duplicate: "Refuse" | "Replace"`, `attribution` (`{ of, to } | undefined` — who the element names,
  and how to move it on a rename), `drop: { kind, label }`, `grant: GrantKind | undefined`, `answeredBy: Subject | Port(PortName)`.
  `fieldOps(key)` derives `chips`, `addChip`, `removeChip`, `drops`, `grant`, `rename`; consumers fold over `FIELD_ORDER`.
  + One place per field; a missing row or column is TS2741/TS2322 (spike-proven); no `as`.
  + Derived operations run per call, so Stryker measures them; the table's prose is pinned by exact tests.
  − A generic, closed-over module is more abstract to read than six small functions; mitigated by keeping each row a
    plain object a reader can scan, as `PORT_FIXTURES` is.
- **B. Keep per-module code; add `DropSignature` and a type-level coverage test** (a tst that `keyof SimulationInput`
  ∪ `keyof SimulatedSubject` maps onto `Drop…` kinds).
  + Smallest diff. − Fixes this instance only; the next field still needs six edits in six modules, and the rename,
  replay and form cells stay unchecked.
- **C. Schema-first fields** (`Schema.Struct` per field, derive codecs). − AGENTS.md §7 reserves schema-first for the
  Policy ADT's trust boundary; per-chip text is not one (ARCH-20 D-20-f rejected the same).
- **Recommendation: A.**
- **status: open**

### D-48-b — The `DropSignature` row's label

The label is the row's identity (`dedupeByLabel`), so two distinct signatures must not read the same.

- **A. Prose like edges and events**: `without signature <meaning>[ on <resourceId>][ as <signerRole>][ by <subjectId>]`
  (the `by` only when it is not the form's subject). − Two signatures differing only in `signedAt`/`algorithm`/`keyId`
  collapse to one row, and dropping one leaves the other — the row would claim to test what it does not.
- **B. The chip's text**: `without signature <signatureCodec.encode(…)>` (`approved:doc-1`, or the JSON form).
  + Injective by the codec's round-trip law. − Reads unlike every other weakening row; the JSON form is long.
- **C. Prose for the common case, the chip's JSON text when any of `signedAt`/`algorithm`/`keyId` is present.**
  + Reads like its neighbours where it can; exact where prose would collide. − Two rules in one label function (pinned
  by tests for both arms).
- **Recommendation: C.** The prose part is shared with edges/events' separator weakness (§3, §9), no worse.
- **status: open** (T1 can ship with C; if the user picks A or B, T1's expected labels change and nothing else does)

### D-48-c — The signature remedy, and the silent `HasCustom`

BEH-QD-222: "A requirement no remedy could be built for MUST be named, with the reason." At HEAD `HasSignature` and
`HasCustom` produce neither a remedy nor a skip.

- **A. `AddSignature` strengthening for `HasSignature`, and a named skip for `HasCustom`.** `requirementCases.HasSignature`
  yields `{ _tag: "Signature", meaning, signerRole, scope }`. `remedyFor`: `scope: "Resource"` needs a string
  `resource.id` (otherwise `skip("signature <meaning>", "the check names no resource id")`, as `Relationship`/`Acted` do);
  the remedy appends `{ subjectId: input.subject.id, meaning, ...(signerRole ? { signerRole } : {}), ...(scope === "Resource" ? { resourceId } : {}) }`
  — a subject-global row for `scope: "Any"`, because that is the only row `signatureHistoryFromSignatures` answers an
  `Any` query from (`askSignature`, `PortAccess.ts`). Already met (`some` signature with the same subject, resource,
  meaning and — when the node names one — signer role) → no row, as for `AddEvent`. `HasCustom` yields a
  `CustomRequirement` that always skips: "a custom predicate's answer has no form field; run against Snapshot or Live".
  `EditKind` gains `AddSignature` (strengthen group).
  + Brings the code into line with BEH-QD-222; a denial on a `hasSignature` policy gets the fix it asks for, built from
  the node exactly as `AddEvent` is. + The signatures row gains its `grant` cell, so the table has no hole.
  − Inverts two `Remedies.test.ts` tests ("proposes nothing for hasSignature/hasCustom") and adds a public `EditKind`
  member.
- **B. Named skips for both** (no new edit kind). + Satisfies BEH-QD-222 with no new `EditKind`. − Keeps a remedy that is
  buildable from the node unbuilt, on the reasoning C10 shows does not hold.
- **C. Status quo, and amend BEH-QD-222** to exempt "a requirement this sweep does not model". − Writes the silence into
  the spec.
- **Recommendation: A.**
- **status: open** (blocks T2 and the signatures row's `grant` cell in T7; T1 does not wait for it)

### D-48-d — Where a chip's refusal lives

- **A. The command returns it.** `addChip(field, text): ChipAdded` where `ChipAdded = Decoded<void>`-shaped
  (`{ _tag: "Ok" } | { _tag: "Refused", reason }`); the view's `Buffer` keeps the text and shows the reason, as today.
  + Keeps ARCH-20's "the only state held here is a chip editor's uncommitted typing buffer". + Refusal reasons are
  testable through the session (the seam the review asked for). − A store command that returns a value (the others
  return `void`).
- **B. The session holds a per-field buffer** (`snapshot.fields[i].pending: { text, error }`, plus `typeChip(field, text)`).
  + The buffer survives a tab switch, as ARCH-50 proposes for the explorer's draft. − Reopens D-20-f; a keystroke
  becomes a store commit and a re-render of the whole snapshot.
- **Recommendation: A.** If ARCH-50 lands with a session-held draft and the user wants the screens to agree, B is a
  follow-up that changes only the view and two session commands.
- **status: open**

### D-48-e — `UnseededField`'s shape

- **A. Additive: `{ key: SimulationField; field: string; reason: string }`**, `field` = the row's label (unchanged values
  for six rows; "subject attributes" unchanged too — the *form's* label moves to match it, D-48-h/T10).
  + Non-breaking; hosts reading `field` see the same strings; a host can now key on `key`.
- **B. Replace `field` with `key`.** + No prose identity at all. − Breaking for a public type, for no reader gain over A.
- **Recommendation: A.**
- **status: open**

### D-48-f — Key the fixture half by `PortName`

- **A. A closed `FIXTURE_DATA: { readonly [K in PortName]: ((self: SimulationInput) => PortFixtureData[K] | undefined) | NoFormVocabulary }`**
  in `SimulationFields.ts`, with `CustomPredicate: noFormVocabulary("…reason…")`; `SimulationSource.fixtureLayer` builds
  `fixturePortsLayer`'s argument from it; rows carry `answeredBy: { _tag: "Port"; port }` and a tst asserts the set of
  ports named by rows equals `Exclude<PortName, "CustomPredicate">`.
  + A port core adds is TS2741 here (spike-proven), and the custom-predicate exclusion is a typed cell with its reason.
  − Five lines that look like the old five; the difference is that the compiler now owns the list.
- **B. Leave `fixtureLayer` as is.** + No churn while ARCH-57 changes `fixturePortsLayer`. − Keeps C11's silent default.
- **Recommendation: A**, landed after or rebased onto ARCH-57 (§9).
- **status: open**

### D-48-g — Spec shape

- **A. Amend ADR-QD-047 (Rev 1.7)** — one paragraph: the simulator's input fields are described once
  (`SimulationFields.ts`), after ADR-QD-094's pattern; the chip commands and form reading are the session's. Plus
  BEH-QD-222/225/322 edits and one new invariant (INV-QD-NEXT: "a weakening sweep offers one drop for every distinct
  element the input holds, in every field").
  + Proportionate: ARCH-20 and ARCH-40 both amended ADR-047 for devtools-model changes of this size.
- **B. A new ADR "a simulation field is described once".** + Mirrors ADR-094's standing. − An ADR for a
  package-private table; the public decision is the session's interface, which ADR-047 already owns.
- **Recommendation: A.**
- **status: open**

### D-48-h — Does the snapshot carry the form reading?

- **A. Yes: `SimulationSnapshot.fields: ReadonlyArray<FieldView>`**, `FieldView = { key, label, placeholder, holder: "Subject" | "Port", chips: ReadonlyArray<ChipView> }`,
  `ChipView = { text: string; refused: boolean }` — computed by `formOf(draft)` in `build()`. `Simulator.tsx` maps rows
  to editors and computes nothing (ADR-QD-047's rule, now true of chip text as well). Exports `SimulationField`,
  `FieldView`, `ChipView`.
  + A refused value shown as its refusal (ARCH-20's rule) is decided in the model, under the mutation gate. + A host
  driving the session headlessly (BEH-QD-322) gets the form, not just the draft.
  − Three new public type names; `build()` encodes every chip on every commit (seven short lists — negligible).
- **B. No: `Simulator.tsx` imports the package-private `fieldOps` and encodes chips itself.** + No new public names.
  − The view keeps computing; chip display stays outside Stryker.
- **Recommendation: A.**
- **status: open**

## 6. Tasks

### T0 — Re-verify the evidence at the branch point
- **Status:** [ ] todo
- **Depends on:** —
- **Files:** none in the repo; probes in `$P` (rebuild from §1 if the scratchpad is gone)
- **Steps:**
  1. `git log --oneline -1`; if not `b655b3b`, `git diff b655b3b -- packages/devtools/src/model packages/devtools/src/react/Simulator.tsx packages/core/src/Ports.ts`
     and re-check every §1 row whose symbol moved (name the symbol; line numbers are hints).
  2. `grep -n '"Drop' packages/devtools/src/model/SimulationEdit.ts` — still six, no `DropSignature`?
  3. Re-run the runtime probe (§1 command). Expect `singleEdits: [ 'without role editor' ]` and `remedies: [] []`.
  4. Re-run the type spike. Expect a clean compile, then TS2322 without the `@ts-expect-error`, TS2741 with the row deleted.
  5. Check siblings: has ARCH-57 changed `fixturePortsLayer`'s parameter? Has ARCH-50 touched `SimulationSession.ts`
     or `HeldChoice.ts`? Has ARCH-55 renamed/dropped `PortName`, `PortFixtureData` or `fixturePortsLayer` from core's
     barrel? Has ARCH-52 changed `SignatureInput`? Record each in §10.
- **Tests:** none
- **Verify:** the probe outputs above
- **Done when:** §1 is confirmed or corrected in §10's log.

### T1 — DEFECT: the weakening sweep drops signatures (test-first; ships alone as a patch)
- **Status:** [ ] todo
- **Depends on:** T0. D-48-b (label format; recommended C — ship with C unless told otherwise)
- **Files:** `packages/devtools/src/model/SimulationEdit.ts`, `packages/devtools/src/model/Edits.ts`,
  `packages/devtools/test/model/Edits.test.ts`, `packages/devtools/test/model/WhatIf.test.ts`,
  `packages/devtools/test/model/SimulationSession.test.ts`,
  `features/features/devtools-simulator/devtools-simulator.feature`, `features/features/devtools-simulator/devtools-simulator.steps.test.ts`,
  `spec/behaviors/29-devtools-simulator.md`, `spec/traceability.md` (only if a row's test list changes), `.changeset/simulation-drops-signatures.md` (*new*)
- **Steps:**
  1. **Red first.** In `Edits.test.ts`, give `full` two signatures —
     `{ subjectId: "alice", meaning: "approved", resourceId: "doc-1" }` and `{ subjectId: "alice", meaning: "reviewed" }`
     (subject-global) — and extend "derives one row per grant, in the input's own order" and "tags each row with the kind"
     with `"without signature approved on doc-1"`, `"without signature reviewed"` / `"DropSignature"` ×2, last. Add:
     "names the signer role and another subject" (`signerRole: "approver"` → `… as approver`; `subjectId: "bob"` → `… by bob`);
     "keeps two signatures that differ only in keyId apart" (D-48-b = C: both rows present, JSON labels);
     "drops one signature, leaving the others" in "applying an edit"; "returns a bare input untouched" covers `signatures`
     absent; "derives nothing from grants that are present but empty" gains `signatures: []`.
  2. In `WhatIf.test.ts`, a sweep of `hasSignature("approved")` over alice + resource `doc-1` + the matching signature:
     the `without signature approved on doc-1` row is `Compared` with `flipped.before: true`, `after: false`.
  3. In `SimulationSession.test.ts` — the review's "through the session" reproduction: a session on `hasSignature("approved")`,
     `edit(...)` with the signature; `getSnapshot().plan.edits.map(e => e.kind)` includes `"DropSignature"` and
     `plan.evaluations` is 2 (one drop + baseline) for an input holding only that signature.
  4. Run the three files: red on the new assertions only.
  5. **Fix.** `SimulationEdit.ts`: add `| "DropSignature"` after `"DropEvent"` in the weakenings block of `EditKind`.
     `Edits.ts`: add `signatureDrops` after `eventDrops` (same "absent field stays absent" shape, filter by `!sameSignature(signature, other)`,
     importing `sameSignature` from `./SimulationForm.ts` — no cycle: `SimulationForm.ts` imports only `SimulationInput.ts`),
     a `signatureLabel(signature, subjectId)` implementing D-48-b, and `...signatureDrops(input)` last in `singleEdits`.
     Update `singleEdits`'s doc comment ("… relationships, events, then signatures").
  6. BDD (REQ-QD-026): scenario "Dropping the signature the answer turned on" — Given alice holding the signature
     "approved" on "doc-1" / When a what-if sweep runs against the "approval" policy / Then the sweep reports
     "without signature approved on doc-1" as flipping the verdict. Add the `Given` step and the `"approval"` policy to the
     steps file's policy table.
  7. `spec/behaviors/29-devtools-simulator.md` BEH-QD-222: add a sentence under "A sweep MUST offer both weakenings and
     strengthenings": the weakenings drop each element of every held field — roles, permissions, subject attributes,
     resolver attributes, relationships, events and signatures. Change History 1.8 with `CCR-QD-NEXT`.
  8. Changeset `@qadi/devtools`: **patch** if the user accepts a new `EditKind` member as a fix, else **minor** with a
     note "`EditKind` gains `DropSignature`; an exhaustive match over `EditKind` needs an arm". Recommend **minor** (0.x).
- **Tests:** the above, written first.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Edits.test.ts packages/devtools/test/model/WhatIf.test.ts packages/devtools/test/model/SimulationSession.test.ts`;
  `pnpm test:bdd`; `pnpm typecheck`; `node scripts/check-house-style.mjs`; `pnpm spec:verify:strict`
- **Done when:** the probe's first three rows print a `DropSignature` row; the tests are green and were red on `b655b3b`.

### T2 — GAP: the remedy sweep is silent on `hasSignature` and `hasCustom` (test-first)
- **Status:** [ ] todo
- **Depends on:** D-48-c (written for A; under B drop steps 3–4's edit and keep the skips)
- **Files:** `packages/devtools/src/model/Remedies.ts`, `packages/devtools/src/model/SimulationEdit.ts`,
  `packages/devtools/test/model/Remedies.test.ts`, `packages/devtools/test/model/WhatIf.test.ts`,
  `spec/behaviors/29-devtools-simulator.md`, `.changeset/simulation-signature-remedy.md` (*new*)
- **Steps:**
  1. **Red first** in `Remedies.test.ts`: replace "proposes nothing for hasSignature — a signature is not built out of
     nothing" with "offers the signature the policy names": `hasSignature("approved")` over alice + `{ id: "doc-1" }` →
     `["with signature approved on doc-1"]`; `hasSignature("approved", { signerRole: "approver" })` → `… as approver`;
     `hasSignature("approved", { scope: "Any" })` → `["with signature approved"]` and the applied input's signature has no
     `resourceId`; already held → no row; held by another subject or with another role → a row; no resource id under
     `"Resource"` → `skipped: [{ requirement: "signature approved", reason: "the check names no resource id" }]`.
     Replace "proposes nothing for hasCustom" with "names a custom predicate it cannot remedy":
     `skipped: [{ requirement: "custom predicate isOwner", reason: "a custom predicate's answer has no form field; run against Snapshot or Live" }]`.
  2. In `WhatIf.test.ts`: a denial on `hasSignature("approved")` is answered by an `AddSignature` row whose outcome allows.
  3. `SimulationEdit.ts`: `| "AddSignature"` in the strengthenings block after `"AddEvent"`.
  4. `Remedies.ts`: `Requirement` gains `Signature { meaning; signerRole: string | undefined; scope: HistoryScope }`
     and `Custom { name }`; `requirementCases.HasSignature`/`HasCustom` yield them (delete the "out of nothing" comment;
     keep the ADR-QD-055 one). Convert `remedyFor` from its `if`-chain to a module-scope
     `Match.type<Requirement>().pipe(Match.tagsExhaustive({ … }))` returning `(input) => Built | undefined` — the
     `refValue` shape in the same file (E2). Implement `Signature` per D-48-c A; `Custom` → `skip`.
  5. BEH-QD-222: add to the strengthenings paragraph that a `hasSignature` requirement is answered with the signature its
     node names, and that an opaque `hasCustom` is named as skipped.
  6. Changeset `@qadi/devtools` minor: "`EditKind` gains `AddSignature`; a `hasCustom` requirement is reported in
     `skipped`".
- **Tests:** the above, red first.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Remedies.test.ts packages/devtools/test/model/WhatIf.test.ts`;
  `pnpm typecheck`; `node scripts/check-house-style.mjs` (no `switch`, `SWITCH_BUDGET` unchanged)
- **Done when:** the probe's fourth row prints an `AddSignature` edit, and a `hasCustom` policy reports one skip.

### T3 — `SimulationFields.ts`: the table, its derived operations, and their type-level pins
- **Status:** [ ] todo
- **Depends on:** T1, D-48-a (= A), D-48-b, D-48-f, D-48-h
- **Files:** `packages/devtools/src/model/SimulationFields.ts` (*new*), `packages/devtools/src/model/SimulationForm.ts`
  (receives `sameEdge`/`sameEvent`), `packages/devtools/src/model/Edits.ts` (re-imports them),
  `packages/devtools/test/model/SimulationFields.test.ts` (*new*), `packages/devtools/test/model/SimulationFields.tst.ts` (*new*),
  `packages/devtools/test/surface.tst.ts`
- **Steps:**
  1. Move `sameEdge`/`sameEvent` (with their doc comment) from `Edits.ts` to `SimulationForm.ts`'s "Edges, events,
     signatures" section, beside `sameSignature`; `Edits.ts`, `Remedies.ts`, `Simulator.tsx` and the tests import them
     from there. `pnpm circular` stays clean.
  2. Write `SimulationFields.ts` from the spike (§1, `$P/SimulationFields.ts`), with the real columns:
     `FieldElements`, `SimulationField = keyof FieldElements`, `FieldDescription<A>` (D-48-a A's columns, with
     `attribution: { of: (a: A) => string; to: (a: A, id: string) => A } | undefined` — never a structural `"subjectId" in a`
     check), `SIMULATION_FIELDS` (seven rows; `label`s `"roles"`, `"permissions"`, `"subject attributes"`,
     `"resolver attributes"`, `"relationships"`, `"history"`, `"signatures"`; drop labels byte-identical to today's
     `Edits.ts` prose for the first six; the signatures row per T1), `FIELD_ORDER` (`as const satisfies ReadonlyArray<SimulationField>`,
     plus the compile-time "every key ordered" check), `fieldOps<K>(key): FieldOps`, `formOf(input): ReadonlyArray<FieldView>`
     (D-48-h), `FIXTURE_DATA` keyed by `PortName` (D-48-f) with `NoFormVocabulary` carrying the custom-predicate reason
     now in `SimulationSource.ts`'s comment.
  3. Record fields: `read` = `Object.entries`, `write` = `Object.fromEntries` (own properties, so `__proto__` stays a key —
     the property `withPair` documents), `same` = same name, `duplicate: "Replace"` (a replaced pair goes **last**, as
     `withPair` does — `SimulationForm.test.ts` "puts a replaced pair last" moves here).
  4. The two unseeded reasons (`NOTHING_BUT_AN_ID`, `ANSWERS_NOT_FIXTURES`) move here from `Replay.ts` and are selected
     by `answeredBy`: `Subject` → the first, `Port` → the second.
  5. Type-level pins in `SimulationFields.tst.ts` (tstyche): a description object without a column is an error; the
     table without a row is an error; `DropKindOfRows` equals `Extract<EditKind, \`Drop${string}\`>`; under D-48-c A,
     `GrantKindOfRows` equals the grant kinds that strengthen a held field (`GrantRole | GrantPermission |
     SetSubjectAttribute | AddRelationship | AddEvent | AddSignature`); ports named by rows ∪ `"CustomPredicate"` equals
     `PortName`.
  6. `test/surface.tst.ts`: `// @ts-expect-error no exported member` for `SIMULATION_FIELDS`, `fieldOps`, `formOf`,
     `FIELD_ORDER`, `FIXTURE_DATA`.
- **Tests:** `SimulationFields.test.ts` — (a) the table's prose pinned exactly (labels, placeholders, reasons, order) —
  the static-mutant guard from §4; (b) each derived operation per field, generated: `addChip` round-trips with the codec,
  refuses `"nothing to add"`, refuses a structural duplicate for list fields and replaces for record fields, decodes a
  short-form edge/event/signature against the **current** subject; `removeChip` removes exactly the index and leaves an
  absent field absent; `rename` moves exactly the elements naming the old id; `drops` — criterion 9's property.
- **Verify:** `pnpm vitest run packages/devtools/test/model/SimulationFields.test.ts`; `pnpm test:tstyche`;
  `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs`
- **Done when:** the module compiles with no `as`/`any`/`!`, its tests and tst pins are green, and no consumer uses it yet.

### T4 — Derive the weakening sweep from the table
- **Status:** [ ] todo
- **Depends on:** T3
- **Files:** `packages/devtools/src/model/Edits.ts`, `packages/devtools/test/model/Edits.test.ts`
- **Steps:**
  1. **Differential first**: in a scratch test (not committed), assert `old singleEdits(x)` and
     `dedupeByLabel(FIELD_ORDER.flatMap(k => fieldOps(k).drops(x)))` agree on labels, kinds and `apply` results for
     1,000 generated inputs (reuse `SimulationForm.test.ts`'s arbitraries). Record the run in §10.
  2. Replace `singleEdits`'s body with the fold; delete the seven drop functions, `edgeLabel`, `eventLabel`,
     `signatureLabel`, `omitKey`, `weaken` (now the table's). Keep `pairEdits`, `combinations`, `dedupeByLabel`,
     `DEFAULT_MAX_PAIRS`, the module's doc comment (it is the "which grant is load-bearing?" explanation) and the
     "order runs from what a subject is toward what the world says" sentence, now pointing at `FIELD_ORDER`.
  3. `Edits.test.ts` survives **unchanged** except imports (`sameEdge`/`sameEvent` from `SimulationForm.ts`); its
     "sameEdge and sameEvent" describe moves to `SimulationFields.test.ts` beside `sameSignature`'s.
- **Tests:** existing `Edits.test.ts` is the regression; criterion 9's property is in T3.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Edits.test.ts packages/devtools/test/model/WhatIf.test.ts`;
  criterion 4's grep
- **Done when:** criterion 4 holds and the suite is green untouched.

### T5 — Derive the subject rename from the table
- **Status:** [ ] todo
- **Depends on:** T3
- **Files:** `packages/devtools/src/model/SimulationForm.ts`, `packages/devtools/src/model/SimulationSession.ts`,
  `packages/devtools/test/model/SimulationForm.test.ts`, `packages/devtools/test/model/SimulationFields.test.ts`
- **Steps:**
  1. Replace `SimulationForm.renameSubject` with `renameSubject` in `SimulationFields.ts`: set `subject.id`, then fold
     `FIELD_ORDER` through `fieldOps(k).rename`. Delete the `SimulationForm.ts` version (package-private).
  2. `SimulationSession.renameSubject` imports it from `./SimulationFields.ts`.
  3. Move `SimulationForm.test.ts`'s "renameSubject" describe ("moves exactly the elements naming the old id", "adds no
     field that was not there") to `SimulationFields.test.ts`; `SimulationSession.test.ts`'s rename tests stay.
- **Tests:** moved, not duplicated.
- **Verify:** `pnpm vitest run packages/devtools/test/model/SimulationFields.test.ts packages/devtools/test/model/SimulationForm.test.ts packages/devtools/test/model/SimulationSession.test.ts`;
  criterion 5's grep
- **Done when:** criterion 5 holds.

### T6 — Derive the replay's unseeded list from the table
- **Status:** [ ] todo
- **Depends on:** T3, D-48-e
- **Files:** `packages/devtools/src/model/Replay.ts`, `packages/devtools/test/model/Replay.test.ts`,
  `packages/devtools/test/model/SimulationSession.test.ts`
- **Steps:**
  1. `UnseededField` gains `readonly key: SimulationField` (D-48-e A); `import type { SimulationField }` from
     `./SimulationFields.ts`.
  2. `unseededByReplay = FIELD_ORDER.map((key) => ({ key, field: SIMULATION_FIELDS[key].label, reason: unseededReason(key) }))`
     (the reasons now live with the table, T3 step 4). Keep the module doc comment's "the interesting half" paragraph.
  3. `Replay.test.ts` (:120-150): the existing `deepStrictEqual` against `unseededByReplay` stays; add one exact literal of
     all seven `{ key, field, reason }` (the static-mutant guard).
- **Tests:** as above.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Replay.test.ts packages/devtools/test/model/SimulationSession.test.ts`
- **Done when:** criterion 6's first half holds (the form-label half lands in T10).

### T7 — Derive the remedies' grants from the table
- **Status:** [ ] todo
- **Depends on:** T2, T3
- **Files:** `packages/devtools/src/model/Remedies.ts`, `packages/devtools/test/model/Remedies.test.ts`
- **Steps:**
  1. Each held-field arm of the `remedyFor` matcher (T2) builds its edit with `fieldOps(key).grant(element, label)`
     (append via the row's `write`, keeping "absent becomes a one-element list" as today) and checks presence with the
     row's `same` — the `Role`, `Permission`, `SubjectAttribute`, `Relationship`, `Acted`, `Signature` arms. `Action` and
     `ResourceAttribute` stay hand-written (they change the question).
  2. Delete the now-unused `sameEdge`/`sameEvent` imports from `Remedies.ts`.
- **Tests:** `Remedies.test.ts` unchanged (it is the regression); its stack-safety test ("100k-deep chain") must stay green.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Remedies.test.ts packages/devtools/test/model/WhatIf.test.ts`
- **Done when:** no lens into `SimulationInput`'s held fields is written in `Remedies.ts` (`grep -n "subject.roles\|subject.permissions\|\.relationships\|\.history\|\.signatures" packages/devtools/src/model/Remedies.ts` → none outside comments).

### T8 — Key the fixture ports by `PortName`
- **Status:** [ ] todo
- **Depends on:** T3, D-48-f; **coordinate with ARCH-57** (§9)
- **Files:** `packages/devtools/src/model/SimulationSource.ts`, `packages/devtools/test/model/SimulationSource.test.ts`,
  `packages/devtools/test/model/SimulationFields.tst.ts`
- **Steps:**
  1. `fixtureLayer(input)` = `fixturePortsLayer({ AttributeResolver: dataOf(FIXTURE_DATA.AttributeResolver, input), … })`
     with `dataOf` answering `undefined` for `NoFormVocabulary`. Move the custom-predicate comment's substance into the
     `NoFormVocabulary` reason; leave a one-line pointer.
  2. If ARCH-57 has landed (`fixturePortsLayer` takes a per-port setup union), map each cell into its `Data` arm instead —
     the table is unchanged.
  3. tst: a mocked `PortName` with a sixth member is not assignable to the table's key set (or: assert
     `keyof typeof FIXTURE_DATA` equals `PortName`).
- **Tests:** `SimulationSource.test.ts`'s existing Fixtures-mode tests are the regression.
- **Verify:** `pnpm vitest run packages/devtools/test/model/SimulationSource.test.ts packages/devtools/test/model/Simulation.test.ts`;
  `pnpm test:tstyche`; `pnpm typecheck`
- **Done when:** criterion 7 holds.

### T9 — The session's chip commands and form reading
- **Status:** [ ] todo
- **Depends on:** T3, T5, D-48-d, D-48-h
- **Files:** `packages/devtools/src/model/SimulationSession.ts`, `packages/devtools/src/index.ts`,
  `packages/devtools/test/model/SimulationSession.test.ts`, `packages/devtools/test/surface.test.ts`,
  `packages/devtools/test/surface.tst.ts`
- **Steps:**
  1. **Tests first** in `SimulationSession.test.ts`, new describe "the form's fields, through the session":
     `addChip("relationships", "owner:doc-1")` attributes the edge to the current subject; after
     `renameSubject("bob")` a further `addChip("relationships", "viewer:doc-9")` leaves the first edge on bob (ARCH-20 T4 (a),
     now headless); a structural duplicate is `Refused("already there")` and the draft is unchanged (same reference, no
     notify); two edges differing only by subject are two chips; `"  "` is `Refused("nothing to add")`; a record field
     replaces a pair and puts it last; `removeChip(field, i)` removes exactly one; `removeChip` on an absent field is a
     no-op that does not notify; `snapshot.fields` lists the seven rows in `FIELD_ORDER` with each chip's codec text and a
     refused value as `refused: true`; a stale result becomes stale after `addChip` (the draft moved).
  2. `SimulationSession` gains `addChip: (field: SimulationField, text: string) => ChipAdded` and
     `removeChip: (field: SimulationField, index: number) => void`; both commit through `edit`'s path (so `stale`,
     `resourceText` and the no-op-on-same-draft rule are the one implementation). `SimulationSnapshot` gains
     `fields: ReadonlyArray<FieldView>` built by `formOf(draft)` in `build()`.
  3. Export `SimulationField`, `ChipAdded`, `FieldView`, `ChipView` from `src/index.ts` (type-only, named, alphabetical
     within the `SimulationFields.ts` group); `test/surface.tst.ts` pins them; `test/surface.test.ts` needs no change
     (types only) — confirm.
- **Tests:** as step 1, red first.
- **Verify:** `pnpm vitest run packages/devtools/test/model/SimulationSession.test.ts`; `pnpm test:tstyche`;
  `node scripts/check-api-surface.mjs` (fails until T12's overview rows — run it again there)
- **Done when:** every chip rule in step 1 is asserted through the session.

### T10 — `Simulator.tsx` maps the rows
- **Status:** [ ] todo
- **Depends on:** T9
- **Files:** `packages/devtools/src/react/Simulator.tsx`, `packages/devtools/test/react/Simulator.test.tsx`
- **Steps:**
  1. Replace `Chips`/`Pairs` with one `FieldEditor` over a `FieldView` (chips, `Remove` per chip calling
     `session.removeChip(key, i)`, the `Draft` buffer committing through `session.addChip(key, text)` and showing the
     returned reason). `SubjectCard` renders `snapshot.fields` with `holder === "Subject"`, `FixturesCard` the `"Port"` ones.
  2. Test ids stay byte-identical through a view-local closed map
     `const testIdOf: { readonly [K in SimulationField]: string } = { roles: "qadi-roles", permissions: "qadi-permissions", subjectAttributes: "qadi-subject-attributes", attributes: "qadi-fixture-attributes", relationships: "qadi-relationships", history: "qadi-history", signatures: "qadi-signatures" }`
     (TS2741 if a field is added without one).
  3. The subject card's attribute editor now reads **"subject attributes"** (the row's label), matching the replay's
     unseeded card; `Simulator.test.tsx`'s `chip("attributes", …)` calls become `chip("subject attributes", …)`.
  4. Delete the imports of `sameEdge`, `sameEvent`, `sameSignature`, every codec, `addChip`, `removeAt`, `withPair`,
     `withoutPair`. `withAction`/`actionOf` stay (`CheckCard`).
- **Tests:** `Simulator.test.tsx` C5/C6 and "the fixtures card" stay as **two** smoke tests of the wiring (one chip per
  card, one refusal shown, one remove); the rest of their assertions now live in `SimulationSession.test.ts` (T9) and are
  removed here (replace, don't layer).
- **Verify:** `pnpm vitest run packages/devtools/test/react/Simulator.test.tsx packages/devtools/test/react/DevtoolsDock.test.tsx`;
  criterion 8's grep
- **Done when:** criterion 8 holds and the React suite is green.

### T11 — Delete what the table replaced
- **Status:** [ ] todo
- **Depends on:** T4–T10
- **Files:** `packages/devtools/src/model/SimulationForm.ts`, `packages/devtools/test/model/SimulationForm.test.ts`
- **Steps:**
  1. Delete `addChip`, `removeAt`, `withPair`, `withoutPair` from `SimulationForm.ts` if nothing imports them
     (`grep -rn "addChip\|removeAt\|withPair\|withoutPair" packages/devtools/src` → only `SimulationFields.ts`'s own
     derived ops). Their tests in "list edits" moved to `SimulationFields.test.ts` in T3; delete the originals.
  2. Update `SimulationForm.ts`'s module comment: it is the element codecs and their equalities; *which* field uses
     which is `SimulationFields.ts`.
  3. Check ARCH-40's count in `spec/overview.md`'s 1.67 note ("the 21 `SimulationForm` codecs") — history, so do not
     edit it; the new count goes in T12's change-history line.
- **Tests:** none new.
- **Verify:** `pnpm typecheck`; `pnpm lint`; `pnpm vitest run packages/devtools`
- **Done when:** no dead export remains in `SimulationForm.ts`.

### T12 — Spec, overview, traceability, ADR amendment, changeset
- **Status:** [ ] todo
- **Depends on:** T1–T11, D-48-g
- **Files:** `spec/behaviors/29-devtools-simulator.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`,
  `spec/decisions/047-a-headless-devtools-model.md`, `spec/decisions/index.yaml`, `spec/README.md` (CCR register),
  `spec/devtools-spec/02-screens.md`, `.changeset/simulation-fields-described-once.md` (*new*)
- **Steps:** per §8.
- **Tests:** none; the gates are the test.
- **Verify:** `pnpm spec:examples` (BEH-QD-322's ` ```typescript ` fence gains an `addChip` line and must compile);
  `pnpm spec:verify:strict`; `pnpm spec:gates`; `pnpm spec:claims`; `node scripts/check-api-surface.mjs`
- **Done when:** every gate above is green.

### T13 — The full gate, mutation included
- **Status:** [ ] todo
- **Depends on:** T12
- **Files:** none
- **Steps:**
  1. `pnpm check` (the merge gate; it runs `pnpm mutation`, so `stryker run stryker.devtools.mjs` is included).
  2. Read `reports/mutation-devtools/mutation.json` for `SimulationFields.ts`, `Edits.ts`, `Remedies.ts`, `Replay.ts`:
     every survivor is either killed by a new test or recorded with its reason in §10 (equivalent mutants only).
- **Tests:** whatever the survivors ask for.
- **Verify:** `pnpm check`
- **Done when:** green, and §10 lists any equivalent survivors.

## 7. Test strategy

**Replace, don't layer.** The behaviour each test pins moves to the narrowest seam that can see it:

| Test today | After |
| ---------- | ----- |
| `Edits.test.ts` (singleEdits order/kinds/labels, applying an edit, `composeEdits`, `pairEdits`) | **Survives unchanged** (imports only). It is T4's regression; T1 extends it with signatures. "sameEdge and sameEvent" **moves** to `SimulationFields.test.ts` beside `sameSignature`'s. |
| `SimulationForm.test.ts` codec laws, refusals, `sameSignature` | **Survive** (codecs are unchanged). |
| `SimulationForm.test.ts` "list edits" (`addChip`, `removeAt`), "renameSubject", "puts a replaced pair last" | **Move** to `SimulationFields.test.ts`, re-expressed per field over `fieldOps`; originals deleted (T11). |
| `Remedies.test.ts` | Survives; two tests **inverted** by T2 (signature remedy, custom skip). |
| `Replay.test.ts` | Survives; gains the exact seven-row literal with `key`. |
| `SimulationSession.test.ts` | **Grows**: T1's plan row; T9's "the form's fields, through the session" (the chip semantics the review wanted off the DOM). |
| `Simulator.test.tsx` C5/C6 + "the fixtures card" | **Shrink** to two wiring smoke tests; their chip assertions live in `SimulationSession.test.ts`. |
| `WhatIf.test.ts` | Survives; gains the `DropSignature` flip (T1) and the `AddSignature` fix (T2). |
| BDD `devtools-simulator.feature` | Gains "Dropping the signature the answer turned on" (REQ-QD-026). |

**Property coverage** (fast-check, already a devtools dependency): criterion 9 — for any generated input (the
`SimulationForm.test.ts` arbitraries for edges, events, signatures and attribute values; roles and permissions from small
alphabets so duplicates occur), `singleEdits` has exactly one row per distinct element per field, in `FIELD_ORDER`, and
each `apply` removes that element only (other fields reference-equal). A second property: `addChip(field, encode(a))`
after `removeChip` of `a` restores the draft (codec ∘ table round trip), for every field.

**Differential** (T4 step 1, not committed): old `singleEdits` vs the derived fold on 1,000 inputs, before the old
functions are deleted.

**Type-level** (`tstyche`, `SimulationFields.tst.ts`): missing row, missing column, `Drop…`/grant kind coverage, port
coverage; `surface.tst.ts` for what stays private and what is exported.

**Mutation** (`stryker.devtools.mjs`, break 80): the derived operations are per-call code and are killed by the property
and session tests. The table's string columns are static mutants under `ignoreStatic: true` and are pinned by exact
literals instead (§4). Expect the mutant count in `Edits.ts` to drop (six near-identical functions gone) and
`SimulationFields.ts` to carry roughly what `Edits.ts` and the `SimulationForm.ts` list helpers carried.

**Coverage**: `packages/devtools/src/model/**` at 95% lines/branches — `SimulationFields.ts`'s `NoFormVocabulary` arm and
`duplicate: "Replace"` arm each need a direct test (a record field and `FIXTURE_DATA.CustomPredicate`).

## 8. Spec and documentation updates

- **`spec/behaviors/29-devtools-simulator.md`** (Change History 1.8 for T1, 1.9 for the rest, each `CCR-QD-NEXT`):
  - BEH-QD-222 — the weakenings drop each element of every held field, signatures included (T1); `hasSignature` is
    remedied with the signature its node names and `hasCustom` is named as skipped (T2, per D-48-c).
  - BEH-QD-225 — `UnseededField` carries `key`; the field named is the label the form shows (T6/T10).
  - BEH-QD-322 — the listing replaces "…and one synchronous command per field of the form" with the real commands:
    `edit`, `editResourceText`, `renameSubject`, `addChip(field, text)`, `removeChip(field, index)`; the snapshot's
    `fields`; a REQUIREMENT: "A chip MUST be added to a field by its codec and refused, with the reason, when it does not
    decode or duplicates an element by structure; a record field replaces a pair of the same name." The ` ```typescript `
    fence gains an `addChip` call (gate: `pnpm spec:examples`).
  - The "Package-private since CCR-QD-321" note under BEH-QD-322 gains `SimulationFields.ts`'s table and operations.
- **`spec/invariants.md`** — INV-QD-NEXT: "A weakening sweep offers one drop for every distinct element the input
  holds, in every field" — Source `SimulationFields.ts` (`SIMULATION_FIELDS`, `FIELD_ORDER`), `Edits.ts` (`singleEdits`);
  Enforcement: the tst coverage pins (a missing row or drop kind does not compile) and criterion 9's property; found by
  ARCH-48, whose probe showed a signature fixture never offered as a drop. Change History 1.78.
- **`spec/traceability.md`** — rows for `test/model/SimulationFields.test.ts` (BEH-QD-222, BEH-QD-225, BEH-QD-322,
  INV-QD-NEXT) and `test/model/SimulationFields.tst.ts` (INV-QD-NEXT); behaviour 29's module list gains
  `SimulationFields`; `SimulationSession.test.ts`'s row gains INV-QD-NEXT; `Simulator.test.tsx`'s row is unchanged.
- **`spec/overview.md`** (gate 13) — new rows: `SimulationField`, `ChipAdded`, `FieldView`, `ChipView` | type |
  `model/SimulationFields.ts` (with a one-line note: the closed set of a simulation's held fields; the table itself is
  package-private). The `UnseededField` row notes `key`. Change History 1.70 lists the additions and `EditKind`'s new
  members, not breaking unless the user rules an added union member breaking.
- **`spec/decisions/047-a-headless-devtools-model.md`** — Rev 1.7 amendment (D-48-g A): the simulator's input fields
  are described once, after ADR-QD-094's pattern; the weakenings, grants, rename, unseeded list, fixture ports and
  chip commands derive from that description; `Simulator.tsx` maps rows. `index.yaml` revision bumped.
- **`spec/devtools-spec/02-screens.md`** §5 — Change History 0.13: the four fixture rows and three subject rows are one
  description each; the what-if table offers a signature drop and remedy. Word the custom-predicate note so gate 12
  (`pnpm spec:claims`) does not read it as an unregistered claim of absence.
- **`spec/README.md`** — the CCR register rows (`CCR-QD-NEXT` for T1's patch, `CCR-QD-NEXT` for the deepening).
- **Website** (`apps/website/src/content/docs/docs/packages/devtools.md`) — the "Simulation and what-if" bullet gains
  half a sentence: the session also holds the form (`addChip`, `removeChip`, `snapshot.fields`). No code fence changes,
  so `pnpm spec:website-examples` is unaffected; run `pnpm website` anyway.
- **Changesets** (`@qadi/devtools`; release only on the user's explicit go-ahead):
  - `simulation-drops-signatures.md` — T1. **minor** recommended ("`EditKind` gains `DropSignature`: the weakening sweep
    now drops each signature fixture; an exhaustive match over `EditKind` needs an arm"); patch only if the user rules
    an added union member non-breaking.
  - `simulation-signature-remedy.md` — T2, minor ("`EditKind` gains `AddSignature`; a `hasCustom` requirement is named
    in `skipped`").
  - `simulation-fields-described-once.md` — T3–T11, minor: "`SimulationSession` gains `addChip`/`removeChip` and
    `snapshot.fields`; `UnseededField` gains `key`; the subject card's attribute editor is labelled 'subject attributes';
    new types `SimulationField`, `ChipAdded`, `FieldView`, `ChipView`." No removal from the public interface.

## 9. Risks and rollback

- **Sibling overlaps.**
  - **ARCH-50** (ExplorerSession) edits `SimulationSession.ts` only if it moves `HeldChoice` wiring, and edits
    `DevtoolsDock.tsx`, `spec/behaviors/28`/`29`, `spec/overview.md`'s devtools rows and `02-screens.md`. Textual
    conflicts only; whichever lands second rebases. If ARCH-50 holds a draft in its session, D-48-d B becomes the
    consistent choice for the simulator too (a follow-up, not a blocker).
  - **ARCH-57** changes `fixturePortsLayer` to take a per-port setup union. T8 is written for both orders: before ARCH-57,
    it feeds the current `PortFixtures`; after, it wraps each `FIXTURE_DATA` cell in the `Data` arm. Whichever lands
    second adapts `SimulationSource.fixtureLayer` (a five-line edit).
  - **ARCH-55** (named core barrel) must keep `PortName`, `PortFixtureData`, `fixturePortsLayer` exported; this plan adds
    no new core import beyond `PortName`/`PortFixtureData`, both already exported at `b655b3b`.
  - **ARCH-51** (LeafNeeds) states each leaf's request preconditions and port once in core. T2's "`scope: "Resource"`
    needs a resource id" restates one such fact for `HasSignature`, exactly as `Relationship`/`Acted` do today. If ARCH-51
    lands first and exports its table, T2/T7 read the precondition from it instead; if it lands second, ARCH-51 may
    point `Remedies.ts` at it. Not a blocker.
  - **ARCH-52** (signature ledger read seam) — if it changes `SignatureInput`, `signatureCodec`/`sameSignature` and T1's
    label follow; the table's signatures row is the one place that notices (a TS error in the row).
- **Label drift.** Edge/event drop labels must stay byte-identical (WhatIfTable rows, BDD steps, a reviewer's memory);
  T4's differential and the unchanged `Edits.test.ts` catch a change.
- **The subject card's visible label** changes from "attributes" to "subject attributes" (T10). A host's end-to-end test
  selecting by `aria-label="Add attributes"` breaks; the test id `qadi-subject-attributes` does not change. Noted in the
  changeset.
- **`EditKind` growth is public.** A host with an exhaustive `Match` over `EditKind` gets a compile error on upgrade —
  the intended effect of a closed union (user memory: closed union over widening), stated in the changeset.
- **Sweep cost grows** by one evaluation per signature fixture (and pairs grow quadratically under the existing
  `DEFAULT_MAX_PAIRS` cap, which still reports `omittedPairs`). The cost line states it before the sweep runs.
- **Mutation score.** Collapsing six drop functions into one derived operation removes mutants that were killed many times
  over; the remaining ones in a generic function can be harder to kill. T13 reads survivors explicitly.
- **Rollback.** T1 and T2 are independent patches and revert alone. T3–T11 land as one PR; reverting it restores the
  per-module code, and T1's `signatureDrops` (still in that history) keeps the defect fixed. Public additions
  (`addChip`, `removeChip`, `fields`, `key`, the four types) are additive, so a revert is a breaking change only for a
  host that adopted them between releases — release T3–T11 only with the user's go-ahead, after it has settled.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written; evidence verified at `b655b3b` (runtime probe: no signature drop through `singleEdits`, `sweepPlan` and the session; no remedy and no skip for `hasSignature`; type spike: table compiles with no `as`, missing row TS2741, `DropSignature` TS2322) | planning |
| 2026-10-13 | T0-T13 | Implemented as one commit on wave5/architecture-deepenings (D-48-a..h as recommended; single changeset; no new ADR, ADR-QD-047 Rev 1.8). pnpm check:pr green; Stryker devtools 98.70 (SimulationFields 99.47, 1 survivor killed after). | wave-5 |
