# Phase 91: Named barrels, and visibility-only files folded away - Context

**Gathered:** 2026-11-26 (smart discuss, autonomous mode. Every decision below was decided autonomously on 2026-11-26 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Breaking changes are allowed with a changeset and an upgrade note, but this phase's roadmap entry and BARL-01 require the public surface at the end to equal the surface at the base, so nothing here is Breaking.)
**Status:** Ready for planning

<domain>
## Phase Boundary

`@qadi/core`, `@qadi/react` and `@qadi/audit` publish through pure `export *` barrels. So every name a barreled module
exports is public, and a module that holds one public name and some private ones can only be kept out of the barrel,
with a second file that re-exports the public part. Five such visibility-only files exist. This phase replaces the three
barrels with named lists, as `@qadi/devtools` already has (ADR-QD-047, CCR-QD-321). It then folds each visibility-only
file into the module that owns its concept, but only where `pnpm circular` shows no cycle comes back.

Code read at HEAD `7127fb4b` (Phase 90 closed). The phase base is the parent of the first Phase 91 commit.
- **Barrels.**
  - `packages/core/src/index.ts`: 61 `export *` lines. Line 39 is `PortSpan.ts` and line 40 is `PortSpanDecode.ts`.
  - `packages/react/src/index.ts`: 8 lines. Line 3 is `GateRegistry.ts`, line 4 `Hydration.ts`, line 6 `QadiProvider.tsx`.
    Lines 7-10 are a comment on `components.tsx`/`hooks.ts`.
  - `packages/audit/src/index.ts`: 16 lines. Line 12 is `SequenceIntegrity.ts`. `ArchiveFacts.ts` is not in it.
  - The devtools precedent: `packages/devtools/src/index.ts` (154 lines, 44 named groups, header 1-20 "the list below is
    the interface") and `src/react/index.ts` (12 groups). It is pinned by `packages/devtools/test/surface.test.ts`
    (runtime value names) and `surface.tst.ts`.
  - Gate 13 (`node scripts/check-api-surface.mjs`) prints **943** exports across 9 packages at HEAD. Phase 90 added
    `PORT_NAMES`, so the roadmap's "942" is stale; the roadmap itself says the baseline is "the Phase 91 base figure".
- **The five visibility-only files.**
  - core `src/PortSpanDecode.ts` (26 lines). It holds only `decodePortSpan` and imports `PortSpan.ts` (types) and
    `PortSpanEncode.ts`.
  - core `src/PortInterpreter.ts` (21 lines). It holds `portInterpreter = Schema.Literals([...])` and its type. Its
    header says "Package-private: the type is public through `PortSpan.ts`, the schema is not". `PortSpan.ts:80`
    re-exports the type, and `PortSpanEncode.ts:35` imports the schema.
  - react `src/Hydration.ts` (95 lines). It has two one-line delegations, `dehydrateDecisions → dehydrateWith` (55-59)
    and `hydrateDecisions(atoms: QadiAtoms, …) → atoms.hydrate(…)` (90-95). It also has a re-export block (37-44) that
    publishes 15 names declared in `DeveloperSignals.ts`, `HydrationEngine.ts`, `HydrationEvent.ts` and
    `SeededDecision.ts`. Its `import type { QadiAtoms }` (31) is the edge that blocks the fold.
  - react `src/GateRegistry.ts` (60 lines). It holds `makeGateRegistry` and `GateRegistryOptions`, and re-exports four
    types from `GateWriter.ts` (37).
  - audit `src/SequenceIntegrity.ts` (26 lines). It is one re-export line (26) under the "not tamper-evident"
    disclaimer (2-24). That header names the four citing documents.
- **The fold targets.**
  - core `src/PortSpanEncode.ts` (246 lines). Its header (18-22) says it is "Deliberately out of the barrel … The public
    half is `PortSpan.ts` … and `PortSpanDecode.ts`".
  - core `src/PortSpan.ts` (140 lines). Today it is types only (`import type * as Schema`, 23). Its header (16, 21) and
    78-80 name the two files to be folded.
  - react `src/GateWriter.ts` (364 lines). Its only import is `import type … from "@qadi/core"` (25), so it has no local
    import. Its header (7-10, 20) names `GateRegistry.ts`.
  - react `src/HydrationEngine.ts` (676 lines). Its header (13-14) says "Private, and out of the barrel on purpose
    (ADR-QD-039)". It holds `dehydrateWith` (473) and `hydrateWith` (661), and it imports nothing from `QadiAtoms.ts`.
  - audit `src/ArchiveFacts.ts` (215 lines). Its header (14-15) says it is "out of the barrel … the two names that are
    public, `verifySequenceIntegrity` and `SequenceIntegrityError`".
- **Import edges, measured read-only with `madge --json packages/react/src` at HEAD.**
  - `Hydration.ts → DeveloperSignals, HydrationEngine, HydrationEvent, QadiAtoms, SeededDecision`.
  - `QadiAtoms.ts → … GateRegistry, GateWriter, HydrationEngine …`.
  - `HydrationEngine.ts → DeveloperSignals, HydrationBuckets, HydrationEvent, SeededDecision, SeededQuestion`.
  - `GateRegistry.ts → DeveloperSignals, GateWriter`. `GateWriter.ts` has no local import.
  - `DeveloperSignals.ts → SeededDecision`.
  - `RegistryLease.ts` has exactly one importer, `RegistryOwner.ts`.
  - So `Hydration.ts` folded into `HydrationEngine.ts` as written is the cycle `HydrationEngine → QadiAtoms →
    HydrationEngine`.
  - `GateRegistry` folded into `GateWriter` makes `GateWriter` import `DeveloperSignals → SeededDecision`. Neither
    reaches back, so that fold is acyclic.
- **Gate couplings.**
  - `scripts/check-house-style.mjs`:
    - `barrel-order` (2124-2157) checks pure `export *` barrels only (`continue` when not pure).
    - `devtools-named-barrel` (2159-2198) has `DEVTOOLS_BARRELS` (2171), `STAR_EXPORT`/`NAMED_EXPORT` (2172-2173) and
      the two failure texts (2183, 2192).
    - `SPAN_KEY_DECLARATION` (2438) is `EvaluationSpan.ts`, and `SPAN_KEY_SHARED` (2441) is `PortSpanEncode.ts`.
    - `UNTRUSTED_DECODE_BUDGET` (655-667, row `PortSpanEncode.ts: 2` at 662) and its `_NAMES` row (678,
      `["spanStruct"]`).
  - `scripts/check-api-surface.mjs`:
    - `surfaceOf` (265-281) reads `export *` lines when there are any, and otherwise reads the index itself;
    - `REEXPORT_FROM` (78) and `REEXPORT_NAME` (102) read `export type { X }` and `export { X }` alike, so gate 13
      cannot see a lost value meaning.
  - `scripts/check-package-install.mjs` (gate 14, checks 0-4, header 17-27; 3b at 396-475) has no `.d.ts` escape check.
  - In `AGENTS.md`: §7a's table row for `PortSpanEncode.ts` (707), §9 (731-750, "`@qadi/devtools` is the one today",
    "`devtools-named-barrel`") and §16 (954-983).
- **Tests that import a file this phase deletes (import lines only):**
  - core: `PortSpan.test.ts:19`;
  - audit: `SequenceIntegrity.test.ts`, `AuditArchive.test.ts`, `ForeignRows.test.ts`, `RowListAdmission.test.ts`,
    `BatchReadOnce.test.ts`, and Phase 89's held `AdmissionOrder.characterisation.test.ts`;
  - react, 21 files: `Hydration.test.ts`, `Hydration.tst.ts`, `Hydration.lifetime.test.ts`, `HydrationPayload.test.ts`,
    `HydrationCounts.test.ts`, `UntrustedSeams.test.ts`, `QadiAtoms.test.ts`, `DecisionOutcome.test.ts`,
    `DecisionOutcome.tst.ts`, `GateRegistry.test.tsx`, `GateRegistry.store.test.ts`,
    `GateRegistration.characterisation.test.tsx`, `GateWriter.test.tsx`, `GateWriter.reconcile.test.ts`,
    `DeveloperSignalReporters.test.tsx`, `QadiProvider.tst.ts`, `support/gates.ts`, `support/trees.tsx`, and more.

**Stale or imprecise claims in the roadmap, `_WAVE16-CONTEXT.md` and the research (each checked at HEAD):**
1. **"942 exports at the Phase 91 base".** Gate 13 prints 943, because Phase 90's `PORT_NAMES` is the 943rd. The
   roadmap's own note ("the Phase 91 base figure, not a literal") governs. The baseline is whatever plan 1 measures,
   expected 943.
2. **"`SPAN_KEY_SHARED`, the `UNTRUSTED_DECODE_BUDGET` row and AGENTS.md §7a follow the folded span file"** assumes
   the span file's path moves. With the folds the roadmap decides (Decode into Encode, Interpreter into `PortSpan.ts`),
   `PortSpanEncode.ts` is the target and keeps its path. `SPAN_KEY_SHARED` and the budget key do not move.
   `PortSpanDecode.ts` holds no counted token (`decodeSpan` is not `Schema.decode*`), so the count stays 2. What follows
   the fold in its commit is the prose, a re-measured count and a seen-failing proof that both rules still bite (D-17).
   That only reaches BARL-04's wording if "follow" means "agree with". D-17 records this reading.
3. **"compare a folded file with the sum of its sources' latest post-review records (Phase 89 for `ArchiveFacts.ts`;
   Phase 90 for core files)".** `90-mutation-close.json` does not cover `PortSpanEncode.ts`, `PortSpan.ts`,
   `PortSpanDecode.ts` or `PortInterpreter.ts`, and neither does any wave record. `89-mutation-close.json` covers
   `ArchiveFacts.ts` and `SequenceIntegrity.ts`, and `86-mutation-close.json` covers `RegistryLease.ts`. So the core base
   must be re-taken at the phase base (D-32).
4. **"README" among the four disclaimer citations** is `packages/audit/README.md` (lines 115 and 128), not the root
   `README.md`. The root README is the owner's unstaged edit and must never be staged (D-01).
5. **"`GateWriter` stops being a zero-import leaf".** It already imports types from `@qadi/core` (25). The precise
   claim is that it has no local import today and imports `DeveloperSignals.ts` after the fold. The same wording to fix
   is in `GateWriter.ts:7-10,20`, ADR-QD-140 (title and 61, "a leaf below `GateRegistry.ts`") and ADR-QD-080 (161).
6. **"`QadiProvider.tsx` publishes names by accident today".** Every one of its nine exports is documented in
   `spec/overview.md` (571-575): `QadiProvider`, `useQadiContext`, `useAtomValue`, `QadiProviderProps`,
   `QadiContextValue`, and the re-exports `InitialValues`, `MissingQadiProviderError`, `ProviderSignal`,
   `ProviderSignalReporter`. The accident is the mechanism: whatever the file exports becomes public. The named list ends
   that. No name is dropped, and `useQadiContext` stays (D-14).
7. **The `SequenceIntegrity.ts` citations are more than four.** Beyond the four the file names, present-tense
   statements in `spec/behaviors/33-audit-pipeline.md:850`, `spec/invariants.md:2473`, ADR-QD-056 (133, 423) and
   ADR-QD-190 (72) also name the file. ADR-QD-110's mentions are history. The stale sweep handles them (D-30).
8. **ADRs the folds make false that are not in the roadmap's amend list (037, 047, 099):**
   - ADR-QD-039: `HydrationEngine.ts` out of the barrel;
   - ADR-QD-077: `PortSpanEncode.ts` out of the barrel;
   - ADR-QD-080 and ADR-QD-140: `GateWriter.ts` "a leaf below `GateRegistry.ts`";
   - ADR-QD-110: `SequenceIntegrity.ts` re-exports;
   - ADR-QD-051 (204) and ADR-QD-107 (84): "stated once in `PortInterpreter.ts`";
   - ADR-QD-009 (45): the disclaimer citation.

   Each gets a dated note (D-26), the precedent Phase 90 set with ADR-QD-134.
9. The research's import list for 91.4 ("the port modules, `EvaluationSpan.ts`, `PortAccess.ts`") is wider than the real
   edit. Only `PortSpan.ts` and `PortSpanEncode.ts` import `PortInterpreter.ts`, and only the barrel and
   `PortSpan.test.ts` import `PortSpanDecode.ts`.
10. **The Out of Scope line** the folds supersede reads "Splitting the Port* family files that exist to break madge
    import cycles (ADR-QD-037), i.e. PortInterpreter, PortSpanDecode, PortSpanEncode and PortKey" (PROJECT.md §Out of
    Scope). `PortSpanEncode.ts` and `PortKey.ts` remain cycle-breakers after the phase. The ADR-QD-037 amendment says so
    when the line goes (D-26).

After this phase:
- The three barrels are named lists, generated from compiler symbol flags. Each name is at the module that exports it
  today, and a name whose module was folded away is at the module that declares it. The root surface (names and their
  value/type kind) equals the base snapshot, and gate 13 reads the base figure.
- Four visibility-only files are gone: `PortSpanDecode.ts`, `PortInterpreter.ts`, `GateRegistry.ts` and
  `SequenceIntegrity.ts`. `Hydration.ts` is gone too, because `hydrateDecisions` takes a structural parameter declared in
  the engine. That removes the cycle.
- One house-style rule, `named-barrel`, covers the five named barrels, checks itself on every run, and refuses a mixed
  or unlisted named barrel.
- Gate 14 refuses a packed `.d.ts` that reaches outside its package or into a `src/` path.
- A committed surface-diff tool has a planted-defect self-test, and that self-test runs in `pnpm check`.

ARCH-138. Packages: `@qadi/core`, `@qadi/react`, `@qadi/audit`, one patch changeset each (D-29). Records: ADR-QD-204
(new), CCR-QD-483, BEH-QD-791..795, INV-QD-427..428. Dated amendments go on ADR-QD-037, 047 and 099. Dated notes go on
ADR-QD-009, 039, 051, 077, 080, 107, 110 and 140. The prose of AGENTS.md §7a, §9 and §16 changes, and so do
CONTRIBUTING.md and the DoD table.

Evidence: the code at HEAD (file:line above and in `<code_context>`); `.planning/phases/_WAVE16-CONTEXT.md` §Phase 91;
`.planning/research/` (SUMMARY fold-verdict table and "Where the researchers disagree" (91); ARCHITECTURE F1, §Phase 91;
PITFALLS X-2, X-3, 91-A..91-I, M-1; STACK §4); ADR-QD-037, 047 (CCR-QD-321 amendment, 224), 099 (85), 080, 140, 110,
039, 077; `86-REVIEW-DISPOSITION.md` IN-02; `90-REVIEW-DISPOSITION.md` and `90-VERIFICATION.md` (the lessons).
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (carried forward from Phases 85-90; not re-decided)
- **D-01:** Work only on branch `arch-wave-16`, on the main tree, one phase at a time. No merge, push, tag, release,
  publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under `.planning/milestones`. Never
  stage `.planning/config.json`, the root `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/` or
  `*.iter*.md`. Run every phase script from the repo root, and feed `< /dev/null` to every command.
- **D-02:** Use only the reserved records: ARCH-138, ADR-QD-204, CCR-QD-483, BEH-QD-791..795, INV-QD-427..428. Never
  run `node scripts/next-id.mjs`. Name any unused reservation in the CCR row ("Unused: …"). Pass `--date` with the real
  edit date to `scripts/spec-revise.mjs`. Make review-round spec fixes in place, within this phase's own unreleased
  revision, with no second bump (the 89 and 90 lessons).
- **D-03:** Every behaviour or type change is preceded by a test written on the phase base: RED there for a change,
  green for preserved behaviour. Every new check is shown failing once, with the scratch variant and the failing text
  recorded in `91-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` is green at the phase end (WX-01).
- **D-04 (the wave's changeset policy, Phase 85 D-04):** one `.changeset/*.md` per edited public package. Each is a
  `patch` that states the consumer-visible change, or "No export changes." when there is none. See D-29.
- **D-05:** Every commit ends with exactly one trailer line, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Area 1: The surface baseline, the tools and the spike (plan 1, on the phase base)
- **D-06 (the committed surface-diff tool, BARL-01):** `scripts/surface-diff.mjs`.
  - **What it reads.** For every public package (not `private: true`, the gate 13 rule), it reads every entry point's
    `types` target in the built `lib/`. It asks the compiler for the entry module's exports, resolving aliases, and
    records each as `{ name, kind }`, where `kind` is `value`, `type` or `both`. It uses `typescript/unstable/sync` (TS 7
    has no classic `ts.*` API), started through `scripts/lib/typescript-server-child.mjs`, as
    `scripts/lib/module-state-scan.mjs` and `probe-guard-parse.mjs` are. It refuses a missing `lib/` entry rather than
    reading nothing.
  - **Modes.**
    - `snapshot <out.json>`: package → sorted `{name, kind}` list, plus per-package counts.
    - `compare <a.json> <b.json>`: fails on any added or removed name and any changed kind, naming each.
    - `--self-test`: builds scratch packages outside the repo whose declarations plant four defects: a class exported
      with `export type`, a const-and-type pair exported with `export type`, a dropped type name, and an added name. It
      requires `compare` to report each, and an identical pair to pass.
  - **In the merge gate.** `"surface:self-test": "node scripts/surface-diff.mjs --self-test"` is appended as the last
    step of `pnpm check`, after `bench:self-test`, so no gate number moves. The step is added to the DoD table in the
    same commit (`check-dod-table.mjs`, gate 11). `check:pr` derives it.
  - Rejected: **a phase-local tool only.** A committed tool that no gate runs rots, and future barrel edits need it.
  - Rejected: **a committed surface snapshot as a new gate.** That is a second definition of the public surface beside
    `spec/overview.md` (AGENTS.md §15). Names stay gate 13's, and kinds of values are D-08's.
- **D-07 (the baseline):**
  - **The snapshot.** `pnpm build`, then `node scripts/surface-diff.mjs snapshot` on the phase base, written to
    `91-surface-base.json` with the base SHA.
  - **The figures.** Gate 13's figure (expected 943) and per-package sub-counts.
  - **The pairs.** The count of names with kind `both` per package (research: ≈34 core, 1 react, 7 audit, plus 41
    `export class` in core), recorded in `91-SURFACE.md`.
  - **The close.** It compares equal to this file, and gate 13 prints the same figure.
- **D-08 (`surface.test.ts` for core, react and audit, born on the base; the devtools precedent):**
  - **What each file holds.** `packages/{core,react,audit}/test/surface.test.ts` holds a literal, sorted list of the
    runtime value names `Object.keys(await import("../src/index.ts"))` must equal. The list is written out, never
    computed. `useQadiContext` is in react's.
  - **When.** Committed green on the base, then held byte for byte (its header names the three-edit rule: barrel line,
    overview row, this file).
  - **What it catches.** This is the permanent guard against `export type { X }` deleting a value (PITFALLS 91-B):
    gate 13 cannot see it, and this test fails at once.
  - No `surface.tst.ts` for these three. Type names are gate 13's (a dropped type is `STALE`), and a type has one kind.
  - Rejected: **a compiler-based kind check inside the house rule.** It is a second mechanism for what this test already
    holds, and it needs a TypeScript server inside `pnpm lint`'s hot path.
- **D-09 (gate 14's `.d.ts` escape check, landed before any barrel commit, BARL-02):**
  - **The check.** In `scripts/check-package-install.mjs`, a pure function over each packed `.d.ts` with its comments
    stripped (doc comments link `../../../spec/…` today) collects every module specifier: `import("…")`,
    `from "…"`, `export … from "…"` and `/// <reference path="…">`. It refuses a relative specifier that resolves
    outside its own package root, and any specifier holding a `/src/` segment.
  - **Where it runs.** It is run over every `.d.ts` of every packed public package, as check 3c (planner's label;
    renumbering nothing).
  - **Self-check.** The function is also run on planted texts on every run (one escape, one `src` path, one clean
    file). A planted escape that passes fails the gate, so the check cannot silently match nothing.
  - **Seen failing.** On a scratch copy with a barrel that omits a type a dependent package's inferred declaration needs
    (the TS2883-silent case, PITFALLS 91-E). The emitted `import("../../…/src/…")` is refused, and the text is recorded.
  - AGENTS.md §16 gains one sentence naming the check.
  - Rejected: **a bare `grep '../../'`**. Every `lib/*.d.ts` doc comment matches it.
- **D-10 (the pre-fold madge simulation, research flag):**
  - **Where.** Plan 1 runs it on **scratch copies outside the repo**, never on the main tree.
  - **The checks per candidate.** `madge --circular --extensions ts,tsx packages/*/src` (the `pnpm circular`
    invocation) and `tsc -b`.
  - **Candidates and expected verdicts:**
    - (a) `PortSpanDecode` into `PortSpanEncode`: acyclic;
    - (b) `PortInterpreter` into `PortSpan.ts`: acyclic;
    - (b′) `PortInterpreter` into `PortSpanEncode`: a cycle;
    - (b″) `PortSpanDecode` into `PortSpan.ts`: a cycle;
    - (c) `GateRegistry` into `GateWriter`: acyclic;
    - (d) `SequenceIntegrity` into `ArchiveFacts`: acyclic;
    - (e) `Hydration` into `HydrationEngine` as written: a cycle;
    - (e′) the same after D-21's structural parameter: acyclic;
    - (f) `EvaluationSpan` into `PortSpanEncode`: measured so the verdict is recorded; not folded whatever it says
      (D-22).
  - **The record.** `91-SPIKE.md` holds one verdict per candidate, with the madge output, the `tsc` result and the scratch
    patch's SHA-256. It is the evidence for the ADR-QD-037 amendment.
  - **If a verdict differs.** If a "do" candidate cycles or fails `tsc`, that fold is not made. Its verdict is recorded
    and the phase proceeds (BARL-03: "every fold madge refuses is recorded with its verdict").

### Area 2: The named barrels (plan 1, after D-06..D-10; zero file moves)
- **D-11 (generated, never hand-typed, BARL-02):**
  - **Where it lives.** The barrel generator is written in the session scratchpad and is **not committed** (roadmap).
  - **What it does.** It runs through `typescript-server-child.mjs` and calls `getExportsOfModule` per barreled module.
    For a symbol with any value meaning (a class, a const-and-type pair, an overloaded function such as
    `createPermissionGroup` or `tabulatePorts`) it emits `export { … }`. For a symbol with only a type meaning it emits
    `export type { … }`.
  - **Layout.** At most one value group and then one type group per module. Groups run in module-path order (ASCII,
    case-sensitive, the order `barrel-order` and the devtools rule use), and names are ASCII-sorted inside a group. Lines
    are wrapped by hand at about 90 columns (AGENTS.md §17).
  - **The header.** "The list below is the interface" header, after `packages/devtools/src/index.ts:1-20`. React's
    `components.tsx`/`hooks.ts` comment becomes part of that header.
  - **Recorded.** Its source's SHA-256 and the exact command go in `91-BARRELS.md`.
  - **Trust.** The generator is not trusted. Every barrel it writes is judged by:
    - `surface-diff compare` against the base;
    - gate 13's figure;
    - `tsc -b`, `pnpm build` and `pnpm typecheck`;
    - `pnpm spec:package` (with D-09);
    - D-08's `surface.test.ts`.
- **D-12 (one commit per barrel; no mixed state):**
  - **Order.** Core, then react, then audit.
  - **What a commit holds.** One package's `src/index.ts` and nothing else. No `export *` remains in it, and no module
    is moved.
  - **After each commit:** `pnpm build`, `pnpm typecheck`, `pnpm spec:api`, `pnpm spec:package` and `surface-diff
    compare`, each recorded with its exit code.
  - Rejected: **`export *` as a stepping stone.** It is out of scope, it publishes folded internals, and gate 13 cannot
    see it.
- **D-13 (where each name is named: the home rule):**
  - **Unfolded names.** A name is named at the barreled module that exports it today, re-exports included. This
    reproduces today's routing exactly, and so the overview's Source column stays true for every name the folds do not
    touch.
  - **The in-module re-export lines stay.** Each is a module's documented public home:
    - `Decision.ts:362-363` (FieldLattice);
    - `Matcher.ts:336,342` (Compare, Operand);
    - `Predicate.ts:55`;
    - `Qadi.ts:39` (Handover);
    - `TraceDiff.ts:38`;
    - `AuditArchive.ts:49`;
    - `QadiProvider.tsx:119,123,127`;
    - `QadiAtoms.ts:42,44`;
    - `HydrationEngine.ts:64-65`.
  - **Folded names.** A name whose home a fold deletes is named at the module that **declares** it:
    - `decodePortSpan` at `PortSpanEncode.ts`;
    - `PortInterpreter` at `PortSpan.ts`;
    - `makeGateRegistry`, `GateRegistryOptions` and the four gate types at `GateWriter.ts`;
    - `verifySequenceIntegrity` and `SequenceIntegrityError` at `ArchiveFacts.ts`;
    - `dehydrateDecisions`, `hydrateDecisions`, `DehydratedDecisions`, `DehydratedEntry`, `DehydrateOptions` and
      `HydrateOptions` at `HydrationEngine.ts`;
    - `HydrationDrop` and `HydrationDropReporter` at `DeveloperSignals.ts`;
    - `DecisionEntry` at `HydrationEvent.ts`;
    - `SeededAllow`, `SeededDeny`, `SeededDecision`, `ClientDecision`, `AllowDisclosure`, `DenyDisclosure`, `permits`
      and `isSeeded` at `SeededDecision.ts`.
  - **The judge.** `91-check.mjs homes` checks every name's home against a recorded table: the base homes, with the
    moves above.
  - Rejected: **one route per name** (name everything at its declaring module and delete the in-module re-exports). That
    would edit Phase 89's held `AdmissionOrder.characterisation.test.ts`, ~17 other test and bench imports, and about 20
    overview Source cells, for no consumer-visible gain, and the roadmap's generator recipe is per barreled module.
    Deferred.
- **D-14 (`QadiProvider.tsx` and `useQadiContext`):**
  - **What is listed.** The named list holds all nine names (domain note 6), and none is removed or added.
    `useQadiContext` is documented public (overview 571) and is in react's `surface.test.ts` value list.
  - **What changes in the file.** Its three re-export lines stay (D-13). The only edit to the file in this phase is the
    `GateRegistry` type import (D-19).
- **D-15 (cross-package re-exports):** audit's `SignatureCapturePort.ts:59-60` re-exports core's `SIGNATURE_MEANINGS`
  and `SignatureMeaning`. That line stays where it states its reason, and the barrel names the two at
  `./SignatureCapturePort.ts`. No barrel group carries a package specifier. The house rule (D-24) refuses a
  non-relative group in a named barrel, so this is checked.

### Area 3: The folds (plan 2; one fold per commit)
- **D-16 (the fold procedure, BARL-03):**
  - **Order.**
    1. `PortSpanDecode` into `PortSpanEncode`;
    2. `PortInterpreter` into `PortSpan`;
    3. `GateRegistry` into `GateWriter`;
    4. `SequenceIntegrity` into `ArchiveFacts`;
    5. D-21's structural-parameter commit;
    6. the `Hydration` fold.
  - **What each fold commit does:**
    - moves the declarations and their doc comments verbatim;
    - rewrites, in the absorbing file's header, the sentence that justified the visibility-only file, so the reason is
      not lost (PITFALLS 91-H);
    - deletes the file;
    - re-points every `src` and test import (import lines only, D-23);
    - regenerates the package's named list (D-11's generator, re-run; the home moves of D-13).
  - **After each commit:** `pnpm circular`, `tsc -b`, `pnpm build`, `pnpm spec:api`, `pnpm spec:package` and
    `surface-diff compare` against the base, all clean. The verdict is recorded in `91-FOLDS.md` against the commit
    SHA.
  - **Spec and citations.** The overview's Source cells and the spec citations move in the records plans (D-28, D-30),
    in one revision each, not commit by commit.
- **D-17 (`PortSpanDecode` into `PortSpanEncode`; the span-rule couplings in the same commit):**
  - **The new public name.** `decodePortSpan` becomes `PortSpanEncode.ts`'s only public name. `spanStruct`,
    `encodeSpan`, `decodeSpan`, `sharedQuestionKeys`, `attemptsStruct` and the rest stay unnamed, so they are
    package-private.
  - **Headers.** The header (18-22) is reworded: the machinery is package-private, and the barrel names only the
    decoder (ADR-QD-077, ADR-QD-204). `PortSpan.ts:16,21` are reworded to match.
  - **The rules move with it, in the same commit (BARL-04, domain note 2):**
    - `SPAN_KEY_SHARED` keeps its value (the path is unchanged);
    - the `[untrusted-decode]` count for `PortSpanEncode.ts` is re-measured at 2 and recorded;
    - the `UNTRUSTED_DECODE_BUDGET` comment (661) and AGENTS.md §7a's row (707) gain one clause: the public
      `decodePortSpan` reads through the same per-field struct decode, with no counted token.
  - **Seen failing, on scratch copies of that commit, both recorded:**
    - a planted `JSON.parse` in `PortSpanEncode.ts` fails `[untrusted-decode]`;
    - a planted second spelling of `"qadi.subject_id"` inside `decodePortSpan` fails `[span-key-source]`.
  - Rejected: **folding `PortSpanEncode.ts` into `EvaluationSpan.ts`.** That is the one fold that would move
    `SPAN_KEY_SHARED`, and it is D-22's rejection.
- **D-18 (`PortInterpreter` into `PortSpan.ts`):**
  - **What moves.** `portInterpreter` (the schema, package-private) and `PortInterpreter` (its type) are declared in
    `PortSpan.ts`. `PortSpan.ts` becomes a runtime module, importing `effect/Schema` as a value.
  - **Imports.** `PortSpanEncode.ts:35` imports the schema from `./PortSpan.ts`.
  - **The barrel.** It names only the type. `PortSpan.ts:74-80` are reworded ("stated once, here").
  - **Why it needed the named barrel first.** Under the old `export *` this fold would have published `portInterpreter`.
    That is why the barrels come first.
  - Not into `PortSpanEncode.ts`: that is a cycle (D-10 b′).
- **D-19 (`GateRegistry` into `GateWriter`):**
  - **What moves.** `makeGateRegistry` and `GateRegistryOptions` move into `GateWriter.ts`, with the `reporterFor` and
    `SIGNALS` import from `./DeveloperSignals.ts`.
  - **What stays unnamed.** `buildGateRegistry`, `gateWriterFor`, `reconcile`, `GateHandle`, `GateWriter`,
    `GateIdentity`, `Registered` and `GateWanted`, so the writer slot is still unreachable from outside (ADR-QD-080).
  - **Headers.** `GateWriter.ts`'s header (1-23) is reworded: React-free, below the atom set, and its one local import is
    `DeveloperSignals.ts`. GateRegistry's doc becomes `makeGateRegistry`'s and the section doc.
  - **Imports re-pointed:** `QadiAtoms.ts:32`, `QadiProvider.tsx:49`, `DevtoolsFeed.ts:44` and `hooks.ts:13`.
  - **The provider.** The `QadiProvider.tsx` edit is that one import line. Phase 86's `provider-forwards-only` judge is
    re-run on it through `91-earlier-checks.mjs` (PROJECT.md Known Issue: "a later phase that rewrites the provider
    re-runs it by hand").
- **D-20 (`SequenceIntegrity` into `ArchiveFacts`):**
  - **What moves.** The disclaimer (`SequenceIntegrity.ts:4-17`, "not tamper-evident …", "No grouping key …") becomes
    the doc of `verifySequenceIntegrity`/`SequenceIntegrityError` in `ArchiveFacts.ts`.
  - **The header.** Its "The file survives …" paragraph is rewritten in `ArchiveFacts.ts`'s header (14-15): the module
    is package-private except these two names, which the barrel names here, and four documents cite this paragraph.
  - **What stays out.** Phase 89's admission stays out of `ArchiveFacts.ts`.
  - **The citations.** The four (`packages/audit/README.md:115,128`, `spec/urs.md:48`, `spec/models/17-purpose.md:240`,
    ADR-QD-009:45) are re-pointed in plan 5, after the roadmap order.
- **D-21 (`Hydration.ts`: the structural parameter, decided; the wave grey area):** option (a) is taken.
  - **Commit A (a type change, RED first).**
    - `HydrationEngine.ts` declares a package-private `interface HydrationTarget { readonly hydrate: (dehydrated:
      DehydratedDecisions, subject: AuthSubject, options?: HydrateOptions) => InitialValues }`. It carries
      `QadiAtoms.hydrate`'s doc (QadiAtoms.ts 136-155), which moves there.
    - `QadiAtoms` `extends HydrationTarget` and drops its own `hydrate` member, so the signature is stated once.
    - `hydrateDecisions(atoms: HydrationTarget, …)`.
    - `Hydration.ts` loses its `QadiAtoms` import.
    - A born tstyche file pins:
      - `hydrateDecisions` accepts a `{ hydrate }`-only forwarding object (RED on the base: TS2345);
      - `QadiAtoms` is assignable to `Parameters<typeof hydrateDecisions>[0]` (positive, green on the base);
      - `QadiAtoms["hydrate"]` `toBe` its written-out signature (held).

      The file uses positive pins and `not.toBeAssignableTo` only, so `NOT_CALLABLE_PIN_BUDGET` does not move.
    - Then `pnpm circular`.
  - **Commit B (the fold).**
    - `dehydrateDecisions` and `hydrateDecisions` move into `HydrationEngine.ts` with their docs, and the ADR-QD-028
      security paragraph goes into its header.
    - The header's "Private, and out of the barrel" (13-14) becomes "package-private except the names the barrel names
      here".
    - The re-export block (37-44) is deleted, and its names are homed per D-13. `Hydration.ts` is deleted.
    - `dehydrateDecisions` stays the documented delegation to `dehydrateWith`.
  - **Fallback (c).** It applies if commit A cycles, fails `tsc`, or makes any dependent `.d.ts` need `HydrationTarget`
    by name (TS2883) or escape (D-09), because a new public name would break BARL-01. Then revert to keeping
    `Hydration.ts` and record the cycle and the reason in ADR-QD-204 and the ADR-QD-037 amendment. React's changeset
    then says "No export changes."
  - **Gate 14 probes the changed signature (WX-03; the 90 lesson):**
    - the packed consumer calls `hydrateDecisions(atoms, …)` and `hydrateDecisions({ hydrate: atoms.hydrate }, …)`;
    - a `@ts-expect-error` beside the accepted twin refuses `hydrateDecisions({}, …)`.
  - Rejected: **(b), fold only `dehydrateDecisions`.** It leaves a one-function file that fails the deletion test.
  - Rejected: **(c) as the first choice.** The fold the owner chose would then be recorded, not made.
  - Rejected: **a second statement of `hydrate`'s signature in the engine tied by a pin.** "Stated once" is the
    codebase's rule.
- **D-22 (`EvaluationSpan.ts` stays apart, decided):**
  - **Why.** It is not a visibility-only file: it declares the evaluate family's spans and is `SPAN_KEY_DECLARATION`.
    `[span-key-source]` needs it apart from `SPAN_KEY_SHARED`, because a merged file would spell the shared key in the
    declaration.
  - **The record.** The spike measures (f), and ADR-QD-204 records the verdict as "not folded".
- **D-23 (tests keep their names; only import lines change):**
  - **Imports.** Each test import of a deleted module is re-pointed to the home module the barrel uses for that name
    (D-13). One import line may become several.
  - **What does not move.** Test file names, titles and bodies are unchanged. So the `spec/traceability.md` rows, the
    `NOT_CALLABLE_PIN_BUDGET` rows (`Hydration.tst.ts` 1) and the `SPAN_KEY_LITERAL_BUDGET` rows (`PortSpan.test.ts` 9)
    do not move.
  - **Declared regions.** The import regions are declared per file, by exact lines, in `91-pinned-check.mjs` (the 89
    lesson).

### Area 4: The house rule and the house documents (plan 3, after the folds; roadmap order)
- **D-24 (`devtools-named-barrel` becomes `named-barrel`, BARL-04):**
  - **The list.** `NAMED_BARRELS` lists the five paths (core, react, audit, and devtools' two). It is the record, checked
    in both directions:
    - a listed path that is missing, holds an `export *`, holds a non-relative group, or has its groups out of
      module-path order fails;
    - any other `packages/*/src/**/index.ts(x)` that carries a relative named re-export group fails as an unlisted named
      barrel;
    - any index that mixes `export *` with a relative named group fails as mixed.
  - **Unchanged.** `barrel-order` stays as it is for the pure barrels (http, testing; promise and the predicate
    packages are implementation-as-index).
  - **The self-check (BARL-04's self-test).** The check is one function over `(rel, text)`, and on every run it is also
    applied to each listed barrel's text with `export * from "./X.ts";` planted. A planted variant that passes fails the
    gate as `[named-barrel-self-test]`. It runs in `pnpm lint`, so it is in `pnpm check`.
  - **Seen failing (recorded), on scratch copies:** an `export *` in each of the five, two groups out of order, a sixth
    named barrel off the list, and a mixed barrel.
  - **Renamed everywhere live.** The failure texts, ADR-QD-099's text through its amendment, ADR-QD-047's through its
    amendment, and `spec/traceability.md:530`'s tool cell. Change history keeps the old name (AGENTS.md §15).
- **D-25 (prose that moves in the same commit as the rule):**
  - **AGENTS.md §9.** A package whose root names modules that are only partly public names its exports per module, in
    module-path order. Those are `@qadi/core`, `@qadi/react`, `@qadi/audit` and `@qadi/devtools`. `named-barrel` refuses
    `export *` there, and checks its own list. The pure `export *` barrels (http, testing) stay pure because each of
    their modules is wholly public. Adding a public name takes three edits: a barrel line, an overview row and a line in
    that package's `test/surface.test.ts`. "Shared scaffolding stays out" and the TS2883 rule are kept.
  - **§16.** The escape check's sentence (D-09).
  - **CONTRIBUTING.md.** The "A public export" row (90) names the three edits, and a row is added for the surface-diff
    tool.
  - **The DoD table.** The `surface:self-test` row goes in with D-06's commit.

### Area 5: Records (plans 4-6)
- **D-26 (ADR-QD-204 new; amendments and notes):**
  - **The new ADR.** `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md` states:
    - the barrel rule and the home rule (D-11, D-13, D-24);
    - the fold verdict table (D-10) with each commit;
    - the Hydration decision (D-21) and the `EvaluationSpan` verdict (D-22);
    - the surface baseline and close (D-07);
    - the escape check (D-09);
    - "What enforces it", naming commands, never gate numbers alone. It says which checks run in `pnpm check`
      (`named-barrel` and its self-check, the three `surface.test.ts`, gate 13, gate 14's escape check,
      `surface:self-test`, `pnpm circular`) and which are phase-local (`91-check.mjs` judges, the spike).
  - **ADR-QD-037** gets a dated amendment. It covers which ADR-QD-037 cycle-breakers remain (`PortSpanEncode.ts`,
    `PortKey.ts`, `QuestionBook.ts`, `MissingQadiProviderError.ts`, `SinkWire.ts`, `JsonRefusal.ts` and the others it
    lists), which were folded, the measured verdicts, and the removal of PROJECT.md's Out of Scope line (domain note
    10).
  - **ADR-QD-047** gets a dated amendment: its named-barrel form is the rule for five barrels, and the three-edit rule.
  - **ADR-QD-099** gets a dated amendment: the CCR-QD-321 named-barrel paragraph covers core, react and audit, and a
    part-public module's other names are package-private by the same rule.
  - **Dated `>` notes, one revision each:**
    - ADR-QD-039: `HydrationEngine.ts` is part-public, and `hydrateDecisions` is structural;
    - ADR-QD-077: `PortSpanEncode.ts` names `decodePortSpan`;
    - ADR-QD-080: `makeGateRegistry` is in `GateWriter.ts`, and the slot is still unnamed;
    - ADR-QD-110: the check is declared and published from `ArchiveFacts.ts`, with the disclaimer;
    - ADR-QD-140: the leaf now imports `DeveloperSignals.ts` only, and is still below the atom set and React-free;
    - ADR-QD-051 and ADR-QD-107: `PortInterpreter` is stated once in `PortSpan.ts`;
    - ADR-QD-009: its citation is re-pointed.
  - **PROJECT.md.** The Out of Scope line is removed, and the Known Issues lose 86 IN-02 (D-30). The provider-order line
    stays, with "re-run in Phase 91" added.
- **D-27 (BEH and INV allocation; the planner may rebalance, but must use all five BEH and both INV ids or name an
  unused one in CCR-QD-483):**
  - **BEH-QD-791** (`30-port-calls.md`): the port span decoder is declared with the span machinery, and is that
    module's only public name. The interpreter set is declared with the span types, and its schema stays
    package-private. The surface is unchanged.
  - **BEH-QD-792** (`19-hydration.md`): `dehydrateDecisions` and `hydrateDecisions` live in the hydration engine.
    `hydrateDecisions` takes any value with the `hydrate` capability (an atom set, or a copy that forwards it), and
    what it seeds is unchanged. Under fallback (c), it states the recorded cycle instead.
  - **BEH-QD-793** (`09-react.md`, linking BEH-QD-233 in `28-devtools-screens.md`): `makeGateRegistry` is built where
    the registry's store lives. A colliding id is still reported under `onIdCollision`, and the writer stays
    unreachable from outside the package.
  - **BEH-QD-794** (`33-audit-pipeline.md`): `verifySequenceIntegrity` and `SequenceIntegrityError` are declared with the
    archive facts that compute the same check. They carry the gap-and-duplicate, not tamper-evident, disclaimer, and
    the names are unchanged.
  - **BEH-QD-795** (`09-react.md` or the doc the planner judges closest; record the choice): each named barrel lists
    exactly its package's root surface, per module, and a consumer reaches every name, `useQadiContext` included, from
    the package root as before.
  - **INV-QD-427:** each public package's root exports exactly the names and kinds of the base. Each name is named at one
    module, and no packed declaration file names a path outside its own package or into a `src/` tree. It links
    INV-QD-027.
  - **INV-QD-428:** no module exists only to publish names. A fold leaves no import cycle (`pnpm circular`), and a
    part-public module's other names stay unimportable (gate 14 check 3b). Each remaining ADR-QD-037 cycle-breaker is
    named.
  - Moving with them: the `spec/traceability.md` rows for the new tests and tools, `spec/decisions/index.yaml`, and the
    CCR-QD-483 row in `spec/README.md`. Any ` ```typescript ` fence must compile. Signatures go in ` ```ts ` fences.
- **D-28 (`spec/overview.md`, one revision, BARL-05):**
  - **Source cells.** Each folded name's Source cell names its new home: rows 290 and 293 (core), rows 591-601 (react)
    and rows 784-785 (audit).
  - **Prose.** The "Entry points" prose (950-956) says a part-public module's other names are not importable. Rows 594
    and 601 drop "re-exported from" where the name is now declared there.
  - **No new row.** Gate 13 needs none: the names are unchanged.
- **D-29 (the changesets; the close check expects exactly these three):**
  - `.changeset/core-named-barrel.md`, `@qadi/core` patch: "No export changes. The barrel names its exports per module;
    `decodePortSpan` and `PortInterpreter` are declared where their concepts live."
  - `.changeset/react-named-barrel.md`, `@qadi/react` patch:
    - "The barrel names its exports per module.
      `hydrateDecisions` takes any value with a `hydrate` method of the same signature (`QadiAtoms` still satisfies it,
      and `QadiAtoms` states that method through it); no call site changes. No export is added or removed."
    - Under fallback (c), "No export changes."
  - `.changeset/audit-named-barrel.md`, `@qadi/audit` patch: "No export changes. The barrel names its exports per module;
    the sequence check is declared in the archive facts module."
  - No other package's `src` is edited. If the stale sweep or D-09 forces an edit elsewhere, that package gets its own
    "No export changes." patch, and the close check's expected set grows with it, named (the 90 verification lesson).
- **D-30 (the stale sweep, the last plan before mutation):**
  - **The search.** For every deleted path (`PortSpanDecode.ts`, `PortInterpreter.ts`, `GateRegistry.ts`,
    `SequenceIntegrity.ts`, `Hydration.ts` in react, never devtools' `model/Hydration.ts`) and the old rule name: a
    `/usr/bin/grep -rnF` over `spec`, `packages/*/README.md`, `packages/*/src`, `apps`, `examples`, `AGENTS.md`,
    `CONTRIBUTING.md`, `scripts` and `stryker*.mjs`.
  - **The outcome.** Each hit is fixed (present tense) or recorded as history (exempt, AGENTS.md §15), in
    `91-SWEEP.md`.
  - **86 IN-02.** It is fixed here. `RegistryLease.ts:12-13` becomes "`RegistryOwner.ts` is its one caller" (madge:
    its only importer), and PROJECT.md's Known Issue goes.

### Area 6: Phase scripts and measurement
- **D-31 (phase scripts, the Phase 85-90 pattern; each with a `--self-test`, each mode seen failing once):**
  - **`91-check.mjs`.**
    - Modes: `base`, `commit`, `unchanged`, `seen-failing`, `vitest`, and `suite` (the vitest projects of core, react,
      audit, devtools, http and testing, because the latter three consume the changed roots). Also `scan-ids` (adds
      `BARL-0\d`, `91-\d{2}`, `QD-91`, `Phase 91`), `scan-forbidden`, `trailers`, and `records [--close]`.
    - Shape judges:
      - `barrels`: no `export *` in the three, groups relative and in module-path order, at most one value and one type
        group per module, every listed module exists, and `surface-diff compare` with the base is clean;
      - `homes`: D-13's table, read from the barrel text;
      - `folds`: the five files are absent, each target declares what moved, and no `src`, test or bench import names a
        deleted path. Each fold is its own commit (by exact subject), with `pnpm circular` clean recorded at that
        commit;
      - `escape`: gate 14's check exists, its self-check runs, and it is clean on the packed tree;
      - `rule`: `NAMED_BARRELS` is the five paths, `[named-barrel-self-test]` exists, and no live `devtools-named-barrel`
        remains;
      - `circular`;
      - `changesets`: exactly D-29's set since the phase base, by package, each holding its stated sentence.
  - **`91-pinned-check.mjs`.** The held, declared and born sets. Every declared region is its exact lines (the 89 and 90
    lessons), and the earlier phases' held files are named.
    - Held byte for byte: every test outside D-23's import regions, the three `surface.test.ts` after their commit, the
      devtools barrels, `PortServing.ts`, `RegistryOwner.ts` and the `QadiProvider.tsx` body outside its import block.
  - **`91-earlier-checks.mjs`.** It runs Phases 85-90's checks from scratch copies against an expected-reports ledger
    measured in plan 1. Each entry is keyed on the **exact subject** of the 91 commit that explains it. The 90-14/90-15
    and 90-gaps changeset subjects moved 88/89 counts last time, so the subjects are copied, never paraphrased.
    - Expected movers: 86's pinned set (`RegistryLease.ts` header, `QadiProvider.tsx` import line) and its
      `provider-forwards-only` judge (must still pass); 89's pinned set (`ArchiveFacts.ts`, the deleted
      `SequenceIntegrity.ts`, `AdmissionOrder.characterisation.test.ts`'s import line); 90's records rows on the shared
      spec registers; and every earlier `records --close` that judges a register at "the next revision".
    - The script never edits an archived check's path constants.
  - **`91-mutation.mjs`.** It implements D-32.

  A test title names a property, never a D-number, a requirement id or a phase number (WX-07).
- **D-32 (mutation, WX-05; re-take the base first; roadmap and PITFALLS 91-I):**
  - **The base.** `91-mutation-base.json` is taken on the phase base, one invocation per config, strictly one at a time
    on a quiet host:
    - core: `pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/PortSpanEncode.ts,packages/core/src/PortSpan.ts,packages/core/src/PortSpanDecode.ts,packages/core/src/PortInterpreter.ts`;
    - audit: `pnpm exec stryker run stryker.audit.mjs --mutate packages/audit/src/ArchiveFacts.ts,packages/audit/src/SequenceIntegrity.ts`;
    - react: `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/RegistryLease.ts` (the IN-02 header
      edit makes it a touched file).
  - **Cross-check.** The audit and react base figures are checked against `89-mutation-close.json` and
    `86-mutation-close.json`. A re-take below its record for an untouched file is investigated before anything moves.
    Core has no wave record for these files (domain note 3).
  - **The close.** The same invocations, minus the deleted paths. Stryker is never handed a missing path.
  - **`RENAMED`.** A folded file's close score must be at least the combined score of its sources, Σkilled/Σvalid:
    - `PortSpanEncode.ts` ← `PortSpanEncode.ts` + `PortSpanDecode.ts`;
    - `PortSpan.ts` ← `PortSpan.ts` + `PortInterpreter.ts`;
    - `ArchiveFacts.ts` ← `ArchiveFacts.ts` + `SequenceIntegrity.ts`.

    A file with no valid mutants on both sides is recorded N/A with its reason. A drop is closed with a test, never
    re-baselined and never by equivalence when a test can reach it (the 90 WX-05 lesson).
  - **Static code.** Under `ignoreStatic: true`, `portInterpreter`'s `Schema.Literals` is hidden. Its literal mutants are
    `EXAMINED`: run by hand with `ignoreStatic: false` and seen Killed by the existing interpreter-outside-the-set test
    (the 87/88/90 mechanism).
  - **`UNMEASURED`.** No Stryker config covers these files:
    - `HydrationEngine.ts`, `GateWriter.ts`, `Hydration.ts`, `GateRegistry.ts`, `QadiAtoms.ts`, `QadiProvider.tsx`,
      `DevtoolsFeed.ts` and `hooks.ts` are outside `stryker.react.mjs`'s list;
    - the barrels are excluded by every config.

    Each folded behaviour is proven by a test seen failing on a scratch variant, recorded:
    - `hydrateDecisions` forwarding the wrong subject;
    - `dehydrateDecisions` dropping `options`;
    - `makeGateRegistry` ignoring `onIdCollision`;
    - `verifySequenceIntegrity` re-exported as a type only (D-08 catches it).
- **D-33 (coverage):** `91-coverage-base.json` and `91-coverage-close.json` hold the core (≥ 95%), react (≥ 90%) and
  audit (≥ 90%) totals and the per-file figures of every touched file. A folded file is compared with the line-weighted
  sum of its sources, and nothing falls.

### Claude's Discretion
- The exact names `surface-diff.mjs`, `surface:self-test`, `NAMED_BARRELS`, `[named-barrel-self-test]`,
  `HydrationTarget`, the escape check's label, and the born test files, within the shapes fixed above.
- How the generator wraps long groups, and the wording of each barrel's header.
- The plan count and wave split, within the roadmap's order:
  1. the spike, baselines, tools, escape check, `surface.test.ts`, then the three barrels;
  2. the folds;
  3. the rule and §9/§16/CONTRIBUTING;
  4. the span couplings, which land inside fold 1's commit (D-17), so plan 4 only verifies and records them;
  5. the citations;
  6. the stale sweep, then mutation last.

  The records plan (ADR, BEH/INV, overview, traceability) comes before the sweep, with one `spec-revise` pass per
  document.
- BEH-QD-795's home document (D-27), recorded in CCR-QD-483.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` §"Phase 91: Named barrels, and visibility-only files folded away": the goal, the five success
  criteria, and the planning notes (research flag, plan order, "constraints that are findings").
- `.planning/REQUIREMENTS.md`: BARL-01..05 and WX-01..07.
- `.planning/phases/_WAVE16-CONTEXT.md`: D2 (fold only where `pnpm circular` proves no cycle), the Phase 91 grey area,
  the reserved ids, and §Phase 91 evidence. Also `.planning/phases/_SHARED-CONTEXT.md` (verify-command hygiene, XC-05).
- `.planning/PROJECT.md`: §Out of Scope (the Port* line to remove) and §Known Issues (v1.11), which holds 86 IN-02 and
  the provider-order re-run.
- `.planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-CONTEXT.md` D-04, the changeset policy.
- `.planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-check.mjs`,
  `90-pinned-check.mjs`, `90-earlier-checks.mjs`, `90-mutation.mjs`, `90-REVIEW-DISPOSITION.md` and
  `90-VERIFICATION.md`: the script pattern and the lessons. Those are exact regions, honest enforcement claims, ledgers
  keyed on exact commit subjects, spec fixes in place, the changeset set at close, gate 14 probing every changed
  signature, and WX-05 drops closed by a test.
- `.planning/phases/QD-86-*/86-check.mjs` (`provider-forwards-only`, 793) and `86-REVIEW-DISPOSITION.md` (IN-02).
- `.planning/phases/QD-89-*/89-mutation-close.json` and `QD-86-*/86-mutation-close.json`: the mutation cross-check
  records.

### Research
- `.planning/research/SUMMARY.md`: §Phase 91, the fold-verdict table, Research Flags, and "Where the researchers
  disagree" (91).
- `.planning/research/ARCHITECTURE.md`: F1 (the Hydration cycle), §Phase 91 (91.1-91.5).
- `.planning/research/PITFALLS.md`: X-2 (budgets by path), X-3 (archived scripts), 91-A (gate 13 is a name check),
  91-B (`export type` deletes values), 91-C (cycles), 91-D (span rules by path), 91-E (TS2883 in other packages),
  91-F (no `export *` stepping stone), 91-G (the rule's prose), 91-H (citations), 91-I (mutation), M-1.
- `.planning/research/STACK.md` §4 (the barrel rules go blind on named barrels).

### Spec
- `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md` (Rev 1.7): amended by D-26.
- `spec/decisions/047-a-headless-devtools-model.md`: its CCR-QD-321 amendment (224, "`devtools-named-barrel`").
  Amended.
- `spec/decisions/099-entry-points-are-a-closed-list.md`: the 2026-10-08 amendment (85). Amended.
- `spec/decisions/039-a-seed-is-not-an-authority.md`, `077-both-interpreters-read-ports-through-one-module.md`,
  `080-a-gate-registry-belongs-to-its-atom-set.md` (161), `110-an-archives-facts-are-computed-once.md`,
  `140-a-gates-write-side-is-a-leaf-below-the-atom-set.md` (61, 65), `051-a-span-says-what-was-asked.md` (204),
  `107-a-port-is-answered-remotely-through-its-description.md` (84), `009-observability-via-effect.md` (45): dated
  notes.
- `spec/decisions/028-decision-hydration.md` (the security shape that moves into the engine's header) and
  `056-audit-companion-package.md` (133, 423).
- `spec/overview.md`: rows 290, 293 (core); 571-575 and 591-601 (react); 784-785 (audit); "Not listed above" (936);
  "Entry points" (948-962).
- `spec/behaviors/30-port-calls.md` (54), `19-hydration.md`, `09-react.md`, `28-devtools-screens.md` (BEH-QD-233, 448),
  `33-audit-pipeline.md` (850); `spec/invariants.md` (INV-QD-027 at ~1052, 2473); `spec/traceability.md` (530);
  `spec/urs.md` (48); `spec/models/17-purpose.md` (240).
- `AGENTS.md` §7a (707), §9 (731-750), §15 (adding a gate step), §16 (954-983), §6 (`NOT_CALLABLE_PIN_BUDGET`,
  `SPAN_KEY_LITERAL_BUDGET` tables, held), §17 (hand-wrapping).
- `CONTRIBUTING.md` "I'm changing…" table (row "A public export", 90).

### Code
- Barrels: `packages/core/src/index.ts`, `packages/react/src/index.ts`, `packages/audit/src/index.ts`; the precedent
  `packages/devtools/src/index.ts`, `src/react/index.ts`, `test/surface.test.ts`, `test/surface.tst.ts`.
- Folded files and targets: core `PortSpanDecode.ts`, `PortInterpreter.ts`, `PortSpanEncode.ts`, `PortSpan.ts`; react
  `Hydration.ts`, `HydrationEngine.ts`, `GateRegistry.ts`, `GateWriter.ts`, `QadiAtoms.ts` (`hydrate` doc and member 136-155,
  re-exports 42, 44), `QadiProvider.tsx` (imports 36-63, re-exports 119-127), `DevtoolsFeed.ts:44`, `hooks.ts:13`,
  `RegistryLease.ts:12-13`; audit `SequenceIntegrity.ts`, `ArchiveFacts.ts`, `SignatureCapturePort.ts:59-60`,
  `AuditArchive.ts:49`.
- Not folded: core `EvaluationSpan.ts` (D-22).
- Gates:
  - `scripts/check-house-style.mjs`: `barrel-order` 2124-2157, `devtools-named-barrel` 2159-2198, the span-key
    constants 2438-2449, `UNTRUSTED_DECODE_BUDGET` 655-679;
  - `scripts/check-api-surface.mjs`: `BARREL` 66, `REEXPORT_FROM` 78, `surfaceOf` 265;
  - `scripts/check-package-install.mjs`: header 17-27, 3b 396-475, check 4 476ff, the consumer probe lists 107-160;
  - `scripts/check-dod-table.mjs`; `package.json` `check` (42).
- TypeScript API: `scripts/lib/module-state-scan.mjs`, `scripts/lib/typescript-server-child.mjs`,
  `scripts/lib/probe-guard-parse.mjs`, `node_modules/typescript/dist/api/sync/api.d.ts` (`getExportsOfModule`,
  `getAliasedSymbol`, `SymbolFlags`; typescript 7.0.2).
- Stryker: `stryker.config.mjs` (core glob, barrel excluded, `ignoreStatic: true`), `stryker.audit.mjs` (glob),
  `stryker.react.mjs` (an explicit list of 6, which includes `RegistryLease.ts`).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/devtools/src/index.ts` is the named-barrel template: a header saying "the list below is the interface",
  value and type groups per module in path order, and wrapped lists. `packages/devtools/test/surface.test.ts` is the
  value-list template for D-08.
- The rule `devtools-named-barrel` (`STAR_EXPORT`, `NAMED_EXPORT`, comment stripping at 2177-2179) becomes the
  `named-barrel` function. Its regexes are reused.
- `scripts/lib/typescript-server-child.mjs` (`runTypescriptChild`, `nameServerPids`) runs a `typescript/unstable/sync`
  child under a timeout. Both the surface tool and the scratch generator use it.
- `scripts/bench/analyze.mjs --self-test`, run in `pnpm check` as `bench:self-test`, is the precedent for D-06's
  `surface:self-test`.
- `check-package-install.mjs` check 4's probe lists (107-160) are where D-21's `hydrateDecisions` probes go.
- `90-pinned-check.mjs` (exact regions, amendment chains) and `90-earlier-checks.mjs` (scratch copies, the subject-keyed
  ledger) are copied in shape.

### Established Patterns
- A module out of the barrel says so in its header with its ADR (`PortSpanEncode.ts:18-22`, `HydrationEngine.ts:13-14`,
  `GateWriter.ts:7-10`, `ArchiveFacts.ts:14-15`, `RegistryLease.ts:12-13`). Under named barrels a part-public module
  says which names the barrel names, and why the rest are private.
- madge counts `import type` edges (ADR-QD-037). A cycle-breaker says so in its header, as `QadiProvider.tsx:116-118`
  and `QadiAtoms.ts:43` do.
- A re-export placed for `.d.ts` emission is named in its comment (TS2883, `Hydration.ts:34-37`). When a fold deletes
  one, the barrel names the type at its declaring module instead (D-13), and D-09 catches a missed one.
- A budget or a rule keyed by path is edited together with its AGENTS.md table in one commit (X-2).
- Test files keep their names through a move, so traceability rows and budget tables stay put (PITFALLS 91-H).

### Integration Points
- Gate 13 reads a named barrel's names through `REEXPORT_FROM`, so no `check-api-surface.mjs` edit is needed. A mixed
  barrel would silently drop the named names (`surfaceOf` reads only `export *` lines when any exist), and D-12 and
  D-24 make that impossible.
- Gate 14 check 3b already refuses every non-entry `lib/` module, so the part-public modules' other names stay
  unimportable without change. Check 4's consumer gains the `hydrateDecisions` probes.
- `@qadi/devtools`, `@qadi/http` and `@qadi/testing` import `@qadi/core` and `@qadi/react` by root name only. Their
  declarations are where an omitted type would surface (PITFALLS 91-E), which is why D-09 reads every packed package.
- `pnpm circular` (madge over `packages/*/src`, 245 files at HEAD) runs in `pnpm check` and `check:pr`. After the five
  folds it reads 240.
</code_context>

<specifics>
## Specific Ideas
- The surface is judged by kind, not only by name: `{name, kind}` from the compiler, with a self-test that plants the
  exact defect the research found (`export type` of a class or a const-and-type pair). Gate 13 alone would pass both.
- "Generated, never hand-typed" is honest only if the output is judged by tools that do not share the generator's code.
  The surface tool, gate 13, `tsc`, gate 14 and the value lists each read the result independently.
- The phase must not grow a barrel framework. Three barrels are rewritten, four files are folded, one parameter becomes
  structural, one rule is generalised, one escape check is added, and one tool is committed.
- Nothing public moves. A consumer's imports, a test's titles, metric ids and span names are byte-identical. Only
  module layout, headers, import lines and the house documents change.
</specifics>

<deferred>
## Deferred Ideas
- **One route per name.** Name every name at its declaring module, and delete the in-module public-home re-exports
  (`Decision.ts`, `Matcher.ts`, `Predicate.ts`, `Qadi.ts`, `TraceDiff.ts`, `AuditArchive.ts`, `QadiProvider.tsx`,
  `QadiAtoms.ts`, `HydrationEngine.ts`). Rejected for this phase in D-13; it is a follow-up once the named barrels exist.
- **Converting the http, testing, predicate-sql, predicate-prisma or promise barrels.** Out of scope (not in the
  review). D-24's rule refuses a mixed or unlisted named barrel, so a later conversion is a list edit.
- **Adding `HydrationEngine.ts` and `GateWriter.ts` to `stryker.react.mjs`.** They are UNMEASURED here (D-32). Measuring
  them needs a base and a decision on the curated list's scope (ADR-QD-093).
- **Unifying `dehydrateWith` with `dehydrateDecisions`.** Tied to the carried-forward "`HydrationEngine`'s tests
  consolidated onto the public seam".
- **Folding any other ADR-QD-037 cycle-breaker** (`SinkWire.ts`, `JsonRefusal.ts`, `SinkRecordFields.ts`,
  `MissingQadiProviderError.ts`, `QuestionBook.ts`, `PortKey.ts`, `PortSpanEncode.ts`). Each still breaks a cycle, and
  ADR-QD-037's amendment names them.
- **A compiler-based kind check in the house rule.** D-08's value lists hold the property. Reopen it only if a type-only
  public class appears that a value list cannot express.
- Carried forward unchanged from the milestone: exporting the lens session from `@qadi/devtools`' barrel; aligning
  `@qadi/react`'s gate registry with ADR-QD-177's rethrow contract; the upstream `RegistryProvider` dispose shape;
  structural identity for feed inputs.
</deferred>
