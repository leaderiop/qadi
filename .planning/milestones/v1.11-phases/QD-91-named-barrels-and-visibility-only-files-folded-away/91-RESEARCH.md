# Phase 91: Named barrels, and visibility-only files folded away - Research

**Researched:** 2026-11-26
**Domain:** TypeScript package-surface engineering in an Effect v4 monorepo: barrel files, declaration emit, madge cycles, the TypeScript 7 `unstable` API, house-style gates, Stryker scope.
**Confidence:** HIGH on everything measured in the scratch rehearsal (every number below was produced by a command this session); MEDIUM on spec anchors and on the records plans, which were read from `91-CONTEXT.md` and not re-opened line by line.

Method. Everything ran in a scratch copy of the repository (`git archive` of HEAD with `node_modules` symlinked, its own `git init`, base commit `60bfe76`) and in a scratch `git clone` for the earlier-phase scripts. The main tree was never edited. `<S>` below is `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/b04729bd-9815-4720-957d-3637602848ac/scratchpad`; it is deleted at the end of this research (see Cleanliness proof), so each probe also records its command, its exit code, the key output lines and the SHA-256 of what it ran. The prototypes are described precisely enough to be rebuilt; their hashes are in P12.

<user_constraints>
## User Constraints (from 91-CONTEXT.md)

`91-CONTEXT.md` is the verbatim text and wins on any wording. Everything in it was decided autonomously on 2026-11-26 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest".

### Locked Decisions (D-01 .. D-33, summarised faithfully)

- **D-01..D-05 (binding, carried forward).** Branch `arch-wave-16` only, main tree, no merge/push/tag/release/publish/`changeset version`. Never `git add -A` under `.planning/milestones`; never stage `.planning/config.json`, root `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/`, `*.iter*.md`. Run every phase script from the repo root with `< /dev/null`. Reserved records only: ARCH-138, ADR-QD-204, CCR-QD-483, BEH-QD-791..795, INV-QD-427..428; never run `node scripts/next-id.mjs`; one `spec-revise` pass per register with the real `--date`; review-round spec fixes in place, no second bump. Every behaviour or type change is preceded by a test written on the phase base (RED for a change, green for preserved behaviour); every new check is shown failing once with the variant and text recorded in `91-RED-EVIDENCE.md`; `pnpm check:pr < /dev/null` green at the end. One patch changeset per edited public package. Every commit ends with exactly one `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer line.
- **D-06 surface-diff tool.** `scripts/surface-diff.mjs`; modes `snapshot <out.json>`, `compare <a> <b>`, `--self-test` (planted: a class exported `export type`, a const-and-type pair exported `export type`, a dropped type name, an added name; an identical pair must pass). Reads every public package's `types` targets in the built `lib/`, through `typescript/unstable/sync` started via `scripts/lib/typescript-server-child.mjs`; refuses a missing `lib/` entry. `"surface:self-test": "node scripts/surface-diff.mjs --self-test"` appended LAST to `pnpm check`, after `bench:self-test`, and added to the DoD table in the same commit. Rejected: phase-local only; a committed snapshot gate.
- **D-07 baseline.** `pnpm build`, snapshot on the phase base to `91-surface-base.json` with the SHA; gate 13's figure (expected 943) and per-package sub-counts; the count of `both` names per package in `91-SURFACE.md`; the close compares equal.
- **D-08 `surface.test.ts`** for core, react and audit, born green on the base, a literal sorted list of the runtime value names `Object.keys(await import("../src/index.ts"))` must equal (written out, never computed; `useQadiContext` in react's); held byte for byte afterwards. No `surface.tst.ts`. Rejected: a compiler-based kind check inside the house rule.
- **D-09 gate 14 escape check** ("3c", planner's label), landed before any barrel commit: a pure function over each packed `.d.ts` with comments stripped that collects `import("…")`, `from "…"`, `export … from "…"`, `/// <reference path>`; refuses a relative specifier resolving outside its package root and any specifier with a `/src/` segment; run over every `.d.ts` of every packed public package; self-checked on planted texts every run; seen failing on a scratch copy with a barrel omitting a type a dependent's inferred declaration needs; AGENTS.md §16 gains a sentence. Rejected: bare `grep '../../'`.
- **D-10 madge simulation** on scratch copies outside the repo; candidates (a) Decode into Encode acyclic, (b) Interpreter into `PortSpan` acyclic, (b′) Interpreter into Encode cycle, (b″) Decode into `PortSpan` cycle, (c) GateRegistry into GateWriter acyclic, (d) SequenceIntegrity into ArchiveFacts acyclic, (e) Hydration into Engine as written cycle, (e′) after D-21 acyclic, (f) EvaluationSpan into PortSpanEncode measured and not folded whatever it says. Record in `91-SPIKE.md` (madge output, `tsc` result, patch SHA-256). A "do" candidate that cycles or fails `tsc` is not folded and its verdict recorded.
- **D-11 generated barrels.** The generator lives in the scratchpad and is NOT committed; it runs through `typescript-server-child.mjs` and `getExportsOfModule` per barreled module; a symbol with any value meaning gets `export { … }`, a type-only symbol `export type { … }`; at most one value group then one type group per module; groups in module-path (ASCII, case-sensitive) order, names ASCII-sorted in a group; hand-wrapped at about 90 columns; "The list below is the interface" header after `packages/devtools/src/index.ts:1-20`; source SHA-256 and command in `91-BARRELS.md`; judged by surface-diff compare, gate 13, `tsc -b`, `pnpm build`, `pnpm typecheck`, `pnpm spec:package`, `surface.test.ts`.
- **D-12 one commit per barrel** (core, react, audit), the commit holds one package's `src/index.ts` only, no `export *` remains, after each commit: `pnpm build`, `pnpm typecheck`, `pnpm spec:api`, `pnpm spec:package`, `surface-diff compare`, each with its exit code. Rejected: `export *` as a stepping stone.
- **D-13 home rule.** An unfolded name is named at the barreled module that exports it today (re-exports included); the in-module re-export lines stay (`Decision.ts:362-363`, `Matcher.ts:336,342`, `Predicate.ts:55`, `Qadi.ts:39`, `TraceDiff.ts:38`, `AuditArchive.ts:49`, `QadiProvider.tsx:119,123,127`, `QadiAtoms.ts:42,44`, `HydrationEngine.ts:64-65`). A folded name is named at the module that declares it (table in CONTEXT). `91-check.mjs homes` judges the table. Rejected: one route per name (deferred).
- **D-14** `QadiProvider.tsx`: all nine names stay, `useQadiContext` included; its only edit is the `GateRegistry` import (D-19). **D-15** audit's `SignatureCapturePort.ts:59-60` cross-package re-export stays; the barrel names the two names at `./SignatureCapturePort.ts`; no barrel group carries a package specifier; D-24 refuses a non-relative group.
- **D-16 fold procedure and order.** (1) Decode into Encode, (2) Interpreter into `PortSpan`, (3) GateRegistry into GateWriter, (4) SequenceIntegrity into ArchiveFacts, (5) D-21 commit A, (6) the Hydration fold; each fold moves declarations and docs verbatim, rewrites the absorbing header sentence that justified the old file, deletes the file, re-points every `src` and test import (import lines only), regenerates the named list; after each commit `pnpm circular`, `tsc -b`, `pnpm build`, `pnpm spec:api`, `pnpm spec:package`, `surface-diff compare` clean; verdict in `91-FOLDS.md` against the commit SHA.
- **D-17** `decodePortSpan` becomes `PortSpanEncode.ts`'s only public name; headers reworded; `SPAN_KEY_SHARED` keeps its value, `[untrusted-decode]` count re-measured at 2, the `UNTRUSTED_DECODE_BUDGET` comment (661) and AGENTS.md §7a's row (707) gain one clause; seen failing: a planted `JSON.parse` and a planted second spelling of `"qadi.subject_id"` in `decodePortSpan`.
- **D-18** `portInterpreter` and `PortInterpreter` declared in `PortSpan.ts` (becomes a runtime module); `PortSpanEncode.ts` imports the schema from `./PortSpan.ts`; barrel names only the type. **D-19** `makeGateRegistry` and `GateRegistryOptions` into `GateWriter.ts` with the `reporterFor`/`SIGNALS` import from `./DeveloperSignals.ts`; the rest stays unnamed; headers reworded; imports re-pointed at `QadiAtoms.ts:32`, `QadiProvider.tsx:49`, `DevtoolsFeed.ts:44`, `hooks.ts:13`; 86's `provider-forwards-only` re-run. **D-20** the disclaimer (`SequenceIntegrity.ts:4-17`) becomes the doc of the two names in `ArchiveFacts.ts`; the four citations re-pointed in plan 5.
- **D-21 `hydrateDecisions` structural parameter (option a).** Commit A (type change, RED first): package-private `HydrationTarget { readonly hydrate: (dehydrated: DehydratedDecisions, subject: AuthSubject, options?: HydrateOptions) => InitialValues }` in `HydrationEngine.ts` carrying `QadiAtoms.hydrate`'s doc; `QadiAtoms extends HydrationTarget` and drops its own `hydrate`; `hydrateDecisions(atoms: HydrationTarget, …)`; `Hydration.ts` loses its `QadiAtoms` import; a born tstyche file with positive pins and `not.toBeAssignableTo` only; then `pnpm circular`. Commit B (fold). Fallback (c) if commit A cycles, fails `tsc`, or makes a dependent `.d.ts` need `HydrationTarget` by name or escape. Gate 14 probes `hydrateDecisions(atoms, …)`, `hydrateDecisions({ hydrate: atoms.hydrate }, …)`, and a `@ts-expect-error` beside the accepted twin refusing `hydrateDecisions({}, …)`.
- **D-22** `EvaluationSpan.ts` stays apart; (f) measured and recorded "not folded". **D-23** tests keep names, titles, bodies; only import lines change; import regions declared per file by exact lines in `91-pinned-check.mjs`.
- **D-24** `devtools-named-barrel` becomes `named-barrel` over `NAMED_BARRELS` (the five paths), checked in both directions (missing path, `export *`, non-relative group, groups out of module-path order, an unlisted `packages/*/src/**/index.ts(x)` carrying a relative named group, a mixed index); `barrel-order` unchanged for pure barrels; one function over `(rel, text)` self-applied to each listed barrel's text with `export * from "./X.ts";` planted, failing as `[named-barrel-self-test]`; seen failing on scratch copies: `export *` in each of five, two groups out of order, a sixth named barrel off the list, a mixed barrel; renamed in every live place, history keeps the old name. **D-25** AGENTS.md §9, §16, CONTRIBUTING.md and the DoD table move in the same commits as the rule/tool.
- **D-26** ADR-QD-204 (new) plus dated amendments on ADR-QD-037, 047, 099 and dated `>` notes on 009, 039, 051, 077, 080, 107, 110, 140; PROJECT.md loses the Out of Scope line and 86 IN-02. **D-27** BEH-QD-791..795 and INV-QD-427..428 as assigned (the planner may rebalance but uses all or names an unused one in CCR-QD-483). **D-28** `spec/overview.md` one revision (Source cells, "Entry points" prose, no new row). **D-29** exactly three patch changesets (`core-named-barrel`, `react-named-barrel`, `audit-named-barrel`); any other package edited gets its own "No export changes." patch and the close check's set grows with it. **D-30** stale sweep of the five deleted paths and the old rule name over `spec`, `packages/*/README.md`, `packages/*/src`, `apps`, `examples`, `AGENTS.md`, `CONTRIBUTING.md`, `scripts`, `stryker*.mjs` recorded in `91-SWEEP.md`; 86 IN-02 fixed (`RegistryLease.ts:12-13` becomes "`RegistryOwner.ts` is its one caller").
- **D-31 phase scripts** `91-check.mjs` (modes and judges), `91-pinned-check.mjs`, `91-earlier-checks.mjs` (ledger keyed on the exact subject of the 91 commit that explains each mover), `91-mutation.mjs`, each with `--self-test`; test titles name properties, never ids. **D-32 mutation** base re-taken on the phase base, one invocation per config, strictly one at a time; commands as in CONTEXT; `RENAMED` combined-score rule for the three folds; `portInterpreter`'s `Schema.Literals` `EXAMINED` with `ignoreStatic: false`; `UNMEASURED` files each proven by a test seen failing on a scratch variant. **D-33 coverage** `91-coverage-base.json` and `91-coverage-close.json`, core at least 95%, react and audit at least 90%, per-file figures for touched files, folded files compared with the line-weighted sum of their sources.

### Claude's Discretion

The exact names `surface-diff.mjs`, `surface:self-test`, `NAMED_BARRELS`, `[named-barrel-self-test]`, `HydrationTarget`, the escape check's label, the born test files; how the generator wraps long groups and the wording of each barrel's header; the plan count and wave split within the roadmap's order (1 spike/baselines/tools/escape check/`surface.test.ts`/three barrels, 2 folds, 3 rule and §9/§16/CONTRIBUTING, 4 span couplings landing inside fold 1, 5 citations, 6 stale sweep then mutation last; the records plan comes before the sweep); BEH-QD-795's home document (recorded in CCR-QD-483).

### Deferred Ideas (OUT OF SCOPE)

One route per name; converting the http, testing, predicate-sql, predicate-prisma or promise barrels; adding `HydrationEngine.ts`/`GateWriter.ts` to `stryker.react.mjs`; unifying `dehydrateWith` with `dehydrateDecisions`; folding any other ADR-QD-037 cycle-breaker (`SinkWire.ts`, `JsonRefusal.ts`, `SinkRecordFields.ts`, `MissingQadiProviderError.ts`, `QuestionBook.ts`, `PortKey.ts`, `PortSpanEncode.ts`); a compiler-based kind check in the house rule; carried-forward milestone items (lens session export, gate-registry rethrow alignment, upstream `RegistryProvider` dispose shape, structural identity for feed inputs).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (REQUIREMENTS.md lines 59-73, abridged) | Research Support |
|----|-----------------------------------------------------|------------------|
| BARL-01 | A surface-diff tool (`{name, value-or-type}`) with a planted-defect self-test is committed before any barrel changes; the surface at the base equals the surface at the end | P3 (the TypeScript API works and its pitfalls), P2 (the type-only trap the tool must catch), P12 (prototype hashes). Baseline numbers in P0 |
| BARL-02 | The three barrels name their exports per module, generated from compiler symbol flags, one commit per barrel, `useQadiContext` stays, a `../../` escape check in gate 14 | P3 (generator, kind pinning), P4 (gate 13 and 14 behaviour on named barrels), P2 (escape check prototype and the silent-escape conditions) |
| BARL-03 | Each visibility-only file folds into its owner, one fold per commit, `pnpm circular` clean after each; `Hydration.ts` folds only through a structural parameter | P1 (candidate verdict table, full seven-commit rehearsal), P5 (D-21 tstyche pins) |
| BARL-04 | `devtools-named-barrel` becomes a named-barrel rule over all five barrels with a self-test; `SPAN_KEY_SHARED`, the `UNTRUSTED_DECODE_BUDGET` row and AGENTS.md §7a follow the folded span file | P4 (house-style is blind to a mixed core barrel today; the rule prototype passes all five and fails both plants), P1 (the two span rules still bite after the fold, with planted-defect text) |
| BARL-05 | ADR-QD-204 and the amendments; `spec/overview.md` names each export at its new home; the changeset | P9 (sweep inventory), P10 (earlier-checks movers). Spec anchors are `[CITED: 91-CONTEXT.md]` only |
| WX-01 | `pnpm check:pr` green | Validation Architecture, P0 (green base figures), P1 (every rehearsal commit builds, typechecks, tests) |
| WX-02 | Reserved ids only | User Constraints; no `next-id.mjs` was run |
| WX-03 | Gate 14 probes every changed public signature | P5 and Pitfall 6 (where the `hydrateDecisions` probes go, what the probe guard accepts) |
| WX-04 | Nothing new from the forbidden list; a budget changes with its AGENTS.md table | Pitfall 8; the fold touches no budget row (P1) |
| WX-05 | Coverage thresholds; mutation score of touched files does not fall; unmeasured files listed | P11 (commands, base figures, record cross-checks, UNMEASURED list) |
| WX-06 | New checks seen failing | Validation Architecture (seen-failing variants, each measured once here) |
| WX-07 | No ids in test titles; nothing released or pushed | Pitfall 9 |
</phase_requirements>

## Summary

The plan in `91-CONTEXT.md` works as written, with eight measured corrections (the Addendum appended to `91-CONTEXT.md` carries each as a D-NNa entry). All five folds, in CONTEXT's order, run on a scratch copy as seven commits (C0 three generated barrels, C1 to C6 the folds with D-21 as two commits): `pnpm circular` is clean after every commit, `tsc -b tsconfig.build.json`, `tsc -b tsconfig.json` and `tsc -p tsconfig.test.json` each exit 0 after every commit, the compiler surface equals the base snapshot name for name and kind, gate 13 prints 943, the runtime key sets of core, react and audit equal the base, gate 14 exits 0 on the final state, the vitest projects of the three packages match the base (167 files, 4308 tests), and the full tstyche suite is green in both passes. The one thing that did not work first time was the generator: deriving a name's kind from its declaring module widened two const-and-type pairs that the base exports `export type` (`AllowDisclosure`, `DenyDisclosure`) into runtime values. The generator must pin each kind from the base snapshot.

Candidate verdicts match D-10 exactly: (a), (b), (c), (d), (e′) are acyclic; (b′), (b″) and (e) cycle; (f) is acyclic and `tsc`-clean but not folded, because `check-house-style.mjs` crashes with ENOENT when `EvaluationSpan.ts` (the `SPAN_KEY_DECLARATION`) is gone. Two findings sharpen the escape check: in the intact monorepo layout, omitting a type from a barrel makes `tsc -b` fail loudly with TS2883 and emit no `.d.ts` (fifteen names tried, none exited 0 with an escape); the silent `import("../../…/src/…")` appears only when the dependent resolves `@qadi/core` through `tsconfig.base.json` `paths` alone, and the shipped tarball includes `src/`, so the `/src/` rule matters. And the earlier-checks ledger has two real movers that CONTEXT predicted (86's and 89's pinned sets) plus a third it did not (90's own `90-pinned-check.mjs`, one line: `PortSpan.test.ts` import).

**Primary recommendation:** Land plan 1 in the CONTEXT order (surface tool and `surface.test.ts` and escape check first, then the three generated barrels with kinds pinned from the base snapshot), then the folds exactly as rehearsed, then the rule. Judge every barrel by the surface tool and the value lists, never by gate 13 alone: gate 13, `tsc`, and gate 14 are all blind to `export type { AccessDenied }` (a class) while the surface tool and `surface.test.ts` catch it at once (P2).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| What a package publishes (the named barrel) | Package root `src/index.ts` (build-time artefact boundary) | `package.json` `exports` map | The barrel is the only list; the `exports` map is closed (ADR-QD-099), so a module outside the barrel is unimportable |
| Surface identity (names and kinds) | Merge-gate scripts (`surface-diff`, gate 13) | `surface.test.ts` per package | The compiler is the only reader of value-vs-type meaning; gate 13 reads text and cannot see it |
| Barrel shape (no `export *`, order, relative only) | House-style rule `named-barrel` | Generator (scratch) | A rule that checks itself on every run replaces remembering the convention |
| Declaration-emit hygiene (no `src` path or foreign `../../` in a `.d.ts`) | Gate 14 check 3c over the packed tarball | `tsc` TS2883 | The tarball is what a consumer installs; `tsc` is loud but only when the link layout is intact |
| Cycle freedom after a fold | `pnpm circular` (madge) | `tsc -b` | madge counts `import type` edges, so type-only edges that tsc ignores still cycle |
| Hydration capability seam | `HydrationEngine.ts` (package-private interface) | `QadiAtoms` extends it | One statement of `hydrate`'s signature (the codebase's "stated once" rule) |
| Mutation and coverage evidence | Stryker per-package configs, vitest coverage | Phase scripts | Core, audit, react have separate configs with different `vitest.dir` |

## Verification at HEAD (file:line, drift corrected)

HEAD is `58f4c750` (`docs(91): capture phase context`); the code is Phase 90's close. Probes below were measured at the phase base `60bfe76`-equivalent code (the scratch archive of HEAD).

- **madge files: 251 at HEAD, not 245 [VERIFIED: `node_modules/.bin/madge --circular --extensions ts,tsx packages/*/src`, exit 0, "Processed 251 files" in the scratch base].** After all five folds: 246 (CONTEXT said 240). The per-commit counts are in P1.
- **Gate 13 prints 943 [VERIFIED: `node scripts/check-api-surface.mjs`, scratch base]**; per package core 545, react 62, audit 72, devtools 152, http 75, predicate-prisma 10, predicate-sql 6, promise 4, testing 17 (sum 943).
- **The compiler snapshot totals 948 across 10 entry points [VERIFIED: `kit/snapshot.mjs`, P3]**: devtools' root and its `/react` entry share 5 names, which gate 13 de-duplicates. The tool's total is not gate 13's figure; D-07's "gate 13 prints the same figure" and the tool's own per-entry counts are two numbers. State both in `91-SURFACE.md`.
- **Gate 14 prints `528 runtime export(s)` [VERIFIED: gate 14 on C6, exit 0]**; the number is printed, not compared.
- **vitest (core, react, audit): 167 files, 4308 tests** at base and at the final rehearsal state [VERIFIED: `vitest run packages/{core,react,audit}/test`].
- **tstyche: 82 type-test files at base (83 with the born `HydrationTarget` file)**, green in both passes; `--listFiles` equals `scripts/lib/type-tests.mjs`'s walk; `NOT_CALLABLE_PIN_BUDGET` unchanged [VERIFIED: `node scripts/run-tstyche.mjs`].
- **House-style: 649 files clean at base, 644 on the final state** [VERIFIED: `node scripts/check-house-style.mjs`].
- **Both-kind names (the ones `export type` would break):**

| Package | both | classes | const-and-type pairs |
|---|---|---|---|
| core | 72 | 40 | 32 |
| react | 4 | 3 | 1 |
| audit | 22 | 14 | 8 |

CONTEXT's estimates (about 34 core, 1 react, 7 audit pairs, plus 41 core classes) are close for react and core classes; the measured pair counts are 32, 1 and 8, and audit has 14 classes. Use the measured table in `91-SURFACE.md`.

- **Hidden-value names (kind `type` at the barrel but the declaring module also has a value):** react `AllowDisclosure`, `DenyDisclosure`; audit `AuditEntry` (a class); devtools `ObligationState`, `RecordOutcome`. These are the names a kind-from-declaring-module generator gets wrong. [VERIFIED: P3 generator run with and without the kind pin; runtime keys DIFFER on the unpinned run]
- **Gate-14 probe lists** are at `scripts/check-package-install.mjs:107-160` (`TYPE_ONLY_PROBES`, `RUNTIME_PROBES`, `REFUSED_SHAPE_PROBES`); the consumer imports `QadiProvider` from `@qadi/react` at line 544 and has no `hydrateDecisions` mention [VERIFIED: `grep` and `sed -n 536,560p`].
- **House-style stale comment (found by the sweep):** `scripts/check-house-style.mjs:1043` cites `packages/react/src/Hydration.ts` as the real example of a `Policy as PolicySchema` rename inside a multi-line import. That file is deleted by the Hydration fold; the comment's example must be re-pointed in the same commit or in the sweep (D-30 searches `scripts`) [VERIFIED: `git grep -nF 'Hydration.ts' -- scripts`, line 1043; line 780 is `Hydration.tst.ts`, a different file that stays].

## Spike evidence (BARL-01..05, probes P0 to P12)

### P0: the base figures (every verdict is compared with these)

`git archive HEAD` into `<S>/base/` (base commit `60bfe76` after its own `git init`), root `node_modules` symlinked, each `packages/*/node_modules` rsync'd as a real directory of symlinks (so `@qadi/core` resolves through `node_modules`, the intact layout), plus `features/`, `apps/website`, `examples/nextjs-newsroom` and the gitignored `packages/predicate-prisma/prisma/generated`. `pnpm build` equivalent `tsc -b tsconfig.build.json` exit 0; `tsc -b tsconfig.json && tsc -p tsconfig.test.json` exit 0.

The base snapshot is `<S>/out/surface-base.json`, SHA-256 `4973a8e404f2b11d37620b0d7794856fc95b1fd87656745e6622779d587c30c6`. Figures in "Verification at HEAD" are from it and from gate 13.

### P1: the candidate verdict table, then the full rehearsal

Each candidate was applied as a patch on a fresh copy of the base with the three barrels still `export *` (the star state), then `madge` and `tsc -b` run. Patch SHA-256 (the star-state patch):

| Candidate | Patch SHA-256 | madge (exit, files, cycle) | `tsc -b` | Verdict |
|-----------|---------------|----------------------------|----------|---------|
| (a) `PortSpanDecode` into `PortSpanEncode` | 147a5feb0ed0e7c5203a79da11f1a213fa21caa7ea70e227cc839ea46f4e2693 | exit 0, 250 | clean | acyclic |
| (b) `PortInterpreter` into `PortSpan` | 4782a47a30b35616b04de64e68380a49028cb73a2339a19e0610b78930281f90 | exit 0 | clean | acyclic |
| (b′) `PortInterpreter` into `PortSpanEncode` | 670a3900016900fae84acacf65f450779c6a0a122d0a4bf293d5deb7002a25e5 | exit 1: `core/src/PortSpan.ts > core/src/PortSpanEncode.ts` | TS2448/TS2454 (use before declaration, an artefact of where the patch placed the declaration) | cycle |
| (b″) `PortSpanDecode` into `PortSpan` | a348c72459ad5f1391ff26a41d0c0b76975566bdea7a994f10527d08fa723a6f | exit 1, same cycle | clean | cycle |
| (c) `GateRegistry` into `GateWriter` | 07321165ac9f71af6d27e746d4373cc3e31784d11a1e987b4c341902ad31b5a4 | exit 0 | clean | acyclic (touches 17 files) |
| (d) `SequenceIntegrity` into `ArchiveFacts` | e57347f84044c8fb38127b5c228447f3ee0d38da8890e93cac0108121a23dd4a | exit 0 | clean | acyclic |
| (e) `Hydration` into `HydrationEngine` as written | 1a94b67dec618de8f56f8e12617b5017be74cd79b4fcae32cab5912640071218 | exit 1: `react/src/QadiAtoms.ts > react/src/HydrationEngine.ts` | clean | cycle |
| (e′) commit A `HydrationTarget` | 2c4cba3ab3004f9b26999d3810d24c097482a301a262dd884a5d8e3caa2aa435 | exit 0, 251 | clean | acyclic |
| (e′) commit A plus commit B fold | 0e290fcbf0558c14383a34a9a4d63c830d0e6d5f948525802034ddf47fa138c9 | exit 0, 250 | clean | acyclic |
| (f) `EvaluationSpan` into `PortSpanEncode` | 587bdb98dd01488802f42542199a1c9a4df8e9554d13ade0aad0651dd0ff68e5 | exit 0 | clean | acyclic and `tsc`-clean; `check-house-style.mjs` then crashes ENOENT (`SPAN_KEY_DECLARATION` missing); D-22 stands |

The first run of the (e′) commit-A patch printed three TS6133 errors (unused `DehydratedDecisions`, `HydrateOptions`, `InitialValues` imports in `QadiAtoms.ts` once its `hydrate` member moved); its first SHA was `f3046d7c…`, the tidied one is above. The real commit A must tidy those three imports.

**The seven-commit rehearsal on named barrels** (`git checkout -f -B rehearsal 60bfe76`, then C0 to C6; commit ids in the scratch repo; the whole-rehearsal patch `<S>/out/rehearsal-full.patch` has SHA-256 `057f92a43305765529c65166dd9f3a08e4dceed33e7a8e8b7e9eff08a2b39931`, 41 files changed, 898 insertions, 394 deletions):

| Commit | What | madge files after | `tsc -b` build, typecheck, test | Surface vs base | gate 13 |
|--------|------|-------------------|---------------------------------|-----------------|---------|
| C0 `25bdb71` | three generated named barrels | 251 | 0, 0, 0 | identical (runtime keys identical for core, react, audit) | 943 |
| C1 `f1e27e1` | Decode into Encode | 250 | 0, 0, 0 | identical | 943 |
| C2 `1d2e1e8` | Interpreter into `PortSpan` | 249 | 0, 0, 0 | identical | 943 |
| C3 `96d9110` | GateRegistry into GateWriter | 248 | 0, 0, 0 | identical | 943 |
| C4 `17fcd56` | SequenceIntegrity into ArchiveFacts | 247 | 0, 0, 0 | identical | 943 |
| C5 `ce7dfe6` | `HydrationTarget` (D-21 commit A) | 247 | 0, 0, 0 | identical | 943 |
| C6 `582f56c` | Hydration fold (D-21 commit B) | 246 | 0, 0, 0 | identical | 943 |

(The rehearsal follows D-16's order: C1 to C4 are folds 1 to 4, C5 is D-21 commit A, C6 is commit B.) After C6: gate 14 exit 0 (`528 runtime export(s)`), escape check clean, `check-house-style.mjs` clean on 644 files with `[untrusted-decode]` (`PortSpanEncode.ts: 2`) and `[span-key-source]` holding with no edit.

**D-17's two seen-failing variants, measured on C6** (both exit 1):

- A planted `JSON.parse("{}")` inside `decodePortSpan`: `packages/core/src/PortSpanEncode.ts  [untrusted-decode] declares 2 untrusted-decode token(s), found 3 at line(s) 68, 71, 266.` followed by `Update UNTRUSTED_DECODE_BUDGET in scripts/check-house-style.mjs and AGENTS.md section 7a's table, with the reason, so they agree.` and `1 house-style violation(s). See AGENTS.md.`
- A planted second spelling of `"qadi.subject_id"` inside `decodePortSpan`: `packages/core/src/PortSpanEncode.ts:266  [span-key-source] mentions the span key `qadi.subject_id`; read it through EvaluationSpan.ts (ADR-QD-188).` and `1 house-style violation(s). See AGENTS.md.`

So both span rules still bite after the fold, with no edit to `SPAN_KEY_SHARED` or the budget row (the file path is unchanged and `decodePortSpan` reads through the per-field struct decode: the count stays 2).

### P2: the type-only trap, TS2883, and the `.d.ts` escape

**The value-deletion trap.** Planting `export type { AccessDenied }` (a class) and `export type { Policy }` (a const-and-type pair) in the core barrel on the C0 state:

- gate 13: still 943 (blind);
- `tsc -b`: errors only where a dependent uses the value (react's use of `Policy`; none for `AccessDenied`);
- gate 14 on the `AccessDenied`-only variant: exit 0 and prints `527 runtime export(s)` instead of 528;
- surface tool compare: `KIND AccessDenied both -> type` and `KIND Policy both -> type`;
- runtime keys lose both names (`surface.test.ts`'s value list fails at once).

Gate 13, the build, `typecheck` and gate 14 are all blind to the `AccessDenied` variant. Only the surface tool and the value lists catch it, which is why D-06 and D-08 are both needed. A consumer sees `TS1362` ("cannot be used as a value because it was exported using 'export type'") for a value and `TS1361` for an `import type` (proved on a mini package).

**TS2883 is the normal failure, in the intact layout.** Omitting a name the dependents' emitted declarations reference through `import("@qadi/core")` from the core barrel gave, for fifteen names tried (`tsc -b tsconfig.build.json` exit and error count): `AccessDeniedPublic` 2/1, `AttributeResolver` 1/6 (TS2883), `CustomPredicate` 1/6, `DecisionHistory` 1/6, `EvaluationId` 2/7 (5 TS2883), `MissingAction` 2/1, `MissingResource` 2/1, `MissingResourceId` 2/5, `PolicyTooDeep` 2/1, `PredicateNotRenderable` 1/4 (2 TS2883), `RelationshipResolver` 1/6, `SignatureHistory` 2/9 (6 TS2883), `SignatureHistoryUnavailable` 2/5 (1 TS2883), `SinkRecordNotEncodable` 2/5 (1 TS2883), `Trace` 2/7 (6 TS2883). `Resource` was not found as a name. No case exited 0 with an escape. The failing project's `.d.ts` is not emitted, so the failure is loud and leaves no silent artefact. A typical text: `../node_modules/@qadi/core/src/Decision.ts` in the react project, exit 2.

**The silent escape exists, with one precondition.** Removing the `packages/react/node_modules/@qadi/core` link (so core resolves only through `tsconfig.base.json` `paths` to `packages/core/src/index.ts`) and omitting `Trace`, react's `lib/HydrationEngine.d.ts:63` contains `import("../../core/src/Decision.ts").Trace`, with only an unrelated TS2305 error from devtools. The escape prototype (below) flags it as `names a src/ path`. This is D-09's "seen failing" scenario, and it is reproducible only without the link. A consumer install resolves `@qadi/core` from `node_modules` too, but the tarball ships `src/` (`files` is `["lib","src","README.md"]`, so `/src/` is a real path under the package), which is why the `/src/` segment rule is more than cosmetic.

**The `.d.ts` census of the baseline `lib`.** 251 files, 616 relative specifiers, bare packages `@qadi/core`, `effect`, `react` only; escape check clean. 46 `lib` `.d.ts` files contain `../../` inside doc comments, so comment stripping is mandatory, and `/// <reference path="…">` lines must survive the strip (they begin with `///`, which a naive line-comment stripper deletes).

`escape.mjs` (prototype, SHA in P12): a comment-stripping tokenizer that preserves `/// <reference …>` lines, collects `import("…")`, `from "…"`, side-effect `import "…"`, `require()` and reference paths, and refuses (a) any specifier with a `/src/` segment and (b) a relative or absolute specifier that resolves outside the package root.

### P3: the TypeScript 7 `unstable` API, the generator and the surface-diff prototype

All of this is `typescript@7.0.2` through `typescript/unstable/sync` and `typescript/unstable/ast` [VERIFIED: `node_modules/typescript/dist/api/sync/api.d.ts` read; the calls below ran].

- API used: `new API({ cwd })`, `api.updateSnapshot({ openProjects: [tsconfig] })`, `snapshot.getProjects()[0]` (`.checker`, `.program`), `checker.getSymbolAtLocation(sourceFile)`, `checker.getExportsOfModule(moduleSymbol)`, `checker.getImmediateAliasedSymbol(sym)`, `checker.isUnknownSymbol(sym)`, `SymbolFlags` (`Alias`, `Value`, `Type`, `Class`, `Enum`, `ValueModule`, `Function`), `SyntaxKind` (`ExportSpecifier`, `ImportSpecifier`, `ImportClause`, `NamespaceExport`, `NamespaceImport`).
- Performance: `getExportsOfModule` over a built `lib/index.d.ts` took about 6 ms for 545 exports; a full 10-entry snapshot took about 454 ms.
- **Classifier rule (the one that works).** Walk the alias chain with `getImmediateAliasedSymbol`; a hop is type-only when an `ExportSpecifier`/`ImportSpecifier` has `isTypeOnly`, or its `parent.parent.isTypeOnly` (the `ExportDeclaration`/`ImportClause` for `export type { C } from "…"`, where the flag is on the declaration, not the specifier), or an `ImportClause` has `isTypeOnly`. Throw on `isUnknownSymbol`. `kind = typeOnly ? "type" : (value && type) ? "both" : value ? "value" : "type"`; shape is class, enum, namespace, function, pair, const, or type. Star re-exports resolve to the final symbols with no special code; in-module `export type`/`export {}` lines appear as `ExportSpecifier` alias hops.
- **One `API` per entry point.** Reusing one API across snapshots raised "getNodeId requires a RemoteNode". Create one, use it, `close()` it, per entry.
- **A temp tsconfig outside the repo opens a built `lib/index.d.ts`:** `{ files: [entry], compilerOptions: { noEmit: true, skipLibCheck: true, module: "nodenext", moduleResolution: "nodenext", target: "esnext", types: [], strict: true } }`. The repo's own `tsconfig.json` files cannot open a `lib` entry (declaration output is outside `include`).
- **A missing `lib/` entry must throw** ("run pnpm build"), the D-06 requirement.
- **Planted-defect self-test prototype (all four defects detected, identical passes):** class exported as `export type` gives `KIND Err both -> type`; a const-and-type pair exported as `export type` gives `KIND Pair both -> type`; a dropped type gives `REMOVED Plain (type)`; an added name gives `ADDED Extra (type)`.
- **Generator** (`genbarrel.mjs`, scratch, not committed): module list one per line as `./X.ts`, `./X.ts only a b`, or `./X.ts except a`; optional fifth argument is the base snapshot, which pins each name's kind. For each module it asks the compiler for the module's own exports, classifies each as a consumer sees it, skips a name already seen in an earlier module (collisions listed, zero found), and writes one value group then one type group per module in ASCII module order, names ASCII-sorted. It first emitted core 580 lines, react 69, audit 82; with the fold-final module lists and kind pinning the C6 barrels are core 583 lines (SHA-256 `74264f04d3a7236f3e7e7efb01e04663acc0066ce9fa891a6e135bf05c6cf13c`), react 67 (`87b56fe8d0244f21a4c8dfe783f493f97178bd966183cbf8b027563f6c20a6e1`), audit 85 (`d93c6c51eee9d0d752bfac8ec2582afa5562ac74d567aab9d3fc6d0b6ec52879`). The unfolded-generation (first run, kinds not pinned) bodies were core `5ff8070f…`, react `ad65071b…`, audit `607c0c6d…`.
- **Kind pinning is mandatory.** The first rehearsal's C6 surface check failed: the generator derived kinds from the declaring module, so `AllowDisclosure` and `DenyDisclosure` (const-and-type pairs that the base barrel exports type-only) became values and the runtime keys differed. The fix (fifth argument) pinned them: `kind pinned from the base snapshot: AllowDisclosure: both -> type; DenyDisclosure: both -> type`. D-13's home table must therefore carry kinds, and the committed barrel keeps `export type { AllowDisclosure, DenyDisclosure } from "./SeededDecision.ts"`.
- **Line width.** The prototype writes a one-line group when it fits in 100 columns and otherwise one name per line; `packages/devtools/src/index.ts` keeps a 95-column line single. CONTEXT says about 90; it is discretion, and no judge reads the width.

### P4: gates 13 and 14 and house-style on named barrels

- `scripts/check-api-surface.mjs`'s `surfaceOf`/`REEXPORT_FROM` read the generated multi-line named groups correctly: gate 13 prints 943 on all seven rehearsal commits [VERIFIED].
- **A mixed barrel (a named barrel with an `export *` appended) is loud at gate 13**, not silent as CONTEXT says: `[stale]` rows and `495 API-surface drift(s)`. House-style, however, is blind to it: `house-style: 649 file(s) clean`, because `barrel-order` (about 2124-2157) skips a non-pure barrel and `devtools-named-barrel` (about 2159-2198) checks only the two hard-coded devtools paths. This confirms D-24's `named-barrel` is needed, and that its "mixed" case is a second line of defence behind gate 13, not the only one.
- **The `named-barrel` rule prototype** (`kit/named-barrel.mjs`, a pure `(rel, text) -> problems[]`: strips comments, refuses an `export *`, a non-relative group specifier, and groups out of order): on the C6 text of all five barrels, clean gives 0 problems, a planted `export * from "./X.ts";` gives 1, two swapped groups give 1.
- **No other `index.ts` would trip the unlisted-named-barrel rule.** `packages/http/src/index.ts` has 14 `export *` and no named relative group, `testing` has 6 and none, and `promise`, `predicate-sql`, `predicate-prisma` have no `export *` and no relative named group (they are implementation-as-index) [VERIFIED: `grep -c` over each file].
- No other script reads these barrels' text. The other `index.ts` mentions are vitest coverage excludes, Stryker `!…/index.ts` excludes, `extract-code-fences.mjs` path maps and `tsconfig.base.json` `paths` [VERIFIED: grep].
- Gate 14 check 3b (`scripts/check-package-install.mjs:396-475`) refuses every non-entry `lib` module; deleted files simply stop existing in the packed `lib`. It passed on C6.

### P5: D-21's tstyche pins, both passes

The born file (`<S>/out/HydrationTarget.tst.ts`, 34 lines, SHA-256 `f724a4dbd62d56b6a6f0629c0ddfb98a44fa1b6256e3a2a19e4b3700ccd9742a`) has four tests: `hydrateDecisions` is callable with a `{ hydrate: Written }` forwarding object; `QadiAtoms` is assignable to `Parameters<typeof hydrateDecisions>[0]`; `QadiAtoms["hydrate"]` is `toBe<Written>()`; and `{ readonly decision: unknown }` is `not.toBeAssignableTo` the first parameter. It uses positive pins and `not.toBeAssignableTo` only, so `NOT_CALLABLE_PIN_BUDGET` does not move.

- **With `QadiAtoms` still the parameter (C4, before D-21 commit A) the first pin is RED**: tstyche reports "1 failed, 3 passed" in both passes with `Expression is not callable with the given arguments. Argument of type '{ readonly hydrate: Written; }' is not assignable to parameter of type 'QadiAtoms'. … missing the following properties … runtime, subject, decision, decisions, and 3 more.` It is not literally printed as TS2345, so the RED text recorded in `91-RED-EVIDENCE.md` is this one.
- At C5 (commit A) and C6 all four pass in both passes.
- **The file imports `hydrateDecisions` from `../src/Hydration.ts` in commit A; the fold (commit B) deletes that file.** The import line is a declared edit in `91-pinned-check.mjs` (the file is born in commit A and its one import line is re-pointed in commit B).
- Full suite: 83 files, `--listFiles` equals the walk, both passes green.

### P6: gate 14 probe insertion points (WX-03)

Gate 14's consumer is generated text inside `scripts/check-package-install.mjs`; it imports `QadiProvider` from `@qadi/react` (line 544). `hydrateDecisions` is not probed today. The probe guard (lines 1126-1210) checks that every name in `TYPE_ONLY_PROBES` annotates a declared value outside a refused literal, every `REFUSED_SHAPE_PROBES` entry (`PortDescription`, `fixture` is the precedent, line 154) annotates a literal whose named property carries a `@ts-expect-error`, and every `RUNTIME_PROBES` name is called or read in the run. `HydrationTarget` is package-private and appears in no dependent's `.d.ts` (P2), so it has no probe name; the refusal is of a call argument, not a typed literal. The recommended form is plain consumer statements (compiled by check 4's `tsc`, where an unused `@ts-expect-error` is itself an error), executed in the run for the accepted twins. [ASSUMED: that adding plain statements needs no guard-list entry; the planner confirms against `probe-guard-parse.mjs` and records it, A5]

### P7: mutation and coverage planning facts (not run; Stryker was not run)

See "Mutation and coverage facts (P11)" below.

### P8: the earlier-checks ledger (probe 7)

See "Earlier-checks measured ledger (P10)" below.

### P12: prototype hashes (the scratch kit is deleted)

SHA-256 prefixes of the prototype files (full 64-hex values computed from the files before deletion): `fold.py` 748c3b717125b4cc, `cand.sh` 37ddbf76747dc8c9, `rehearse.sh` f496c14733f7d055, `genbarrel.mjs` d88a07cd244fe957, `surface-lib.mjs` 16c10b8346d3ec0c, `snapshot.mjs` 5630c845a7d93555, `compare.mjs` dc79712ee081b6a5, `escape.mjs` 7249b2f30bfc53f8, `keys.mjs` 30293e9b0c929b04, `probe1.mjs` 89782f394c409e2a, `omit.sh` 64bd94534859e8bb, `install-barrels.sh` ef66bfb4b2e9a5e9, `named-barrel.mjs` 26e11ce3d28905b0. Rehearsal commit patch SHA-256 prefixes (last run): C0 fc12eb73995b4609, C1 36bdd795b198bd14, C2 d7aa5bed2e6daa35, C3 eea6a27bb72562c9, C4 2e259560659f0071, C5 3875aa0479ebe69d, C6 86783f558310c0fd.

## Earlier-checks measured ledger (P10)

Measured with the committed `90-earlier-checks.mjs` run from a scratch clone at HEAD (`TMPDIR` pointed into the scratchpad so its `qd90/earlier` copies stay out of the real tree), exit 0, 73 lines: 62 `exit 0` rows and 10 `exit 1` rows, all matching its own ledger. Then again after applying the rehearsal patch as one scratch commit (the code state of all seven commits, no spec or AGENTS.md edit). Diff of the two outputs:

| Row | At HEAD | After the code rehearsal | Mover |
|-----|---------|--------------------------|-------|
| `86-pinned-check.mjs` | `pinned: 59 files hold their base text, 1 of 1 born files held`, exit 0 | exit 1, 18 lines of the form `packages/react/test/<file> is reported as M against its base, not unchanged` | the 18 react test files whose import lines change (`DecisionOutcome.test.ts`, `DecisionOutcome.tst.ts`, `DeveloperSignalReporters.test.tsx`, `GateRegistration.characterisation.test.tsx`, `GateRegistry.store.test.ts`, `GateRegistry.test.tsx`, `GateWriter.reconcile.test.ts`, `GateWriter.test.tsx`, `Hydration.lifetime.test.ts`, `Hydration.test.ts`, `Hydration.tst.ts`, `HydrationCounts.test.ts`, `HydrationPayload.test.ts`, `QadiAtoms.test.ts`, `QadiProvider.tst.ts`, `UntrustedSeams.test.ts`, `support/gates.ts`, `support/trees.tsx`); plus, once the IN-02 edit lands, `RegistryLease.ts`'s header |
| `89-pinned-check.mjs` | `pinned: 46 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied`, exit 0 | exit 1, 7 lines: `packages/audit/src/SequenceIntegrity.ts was deleted`; `AuditArchive.test.ts: differs from its base text at line 8`; `SequenceIntegrity.test.ts … line 6`; `packages/audit/src/index.ts … line 1`; `ForeignRows.test.ts: the text between regions differs … line 27 (between importHostBatch and importFaults)`; `AdmissionOrder.characterisation.test.ts: the text between regions differs … line 24 (between header and import)`; `BatchReadOnce.test.ts: differs from the commit that added it at line 20` | the audit folds and the audit barrel |
| every other row (85, 85-pinned, 86 scan/records/owner-shape/provider-forwards-only, 87, 88, 88-pinned, 89 admission-step and entry-points-first, all `--self-test`) | unchanged | unchanged | none |

Two further facts. First, the first-differing-line text ("at line 8") depends on the exact edit, so a ledger row written before the commit exists cannot fix the line number. The 91 ledger rows for these two scripts should be `reasons`-style sets keyed on the **path set** (each line matched by a pattern with any line number), keyed on the exact subject of the commit that explains it. Second, `90-pinned-check.mjs` is a **third mover** CONTEXT did not list: at HEAD it prints `pinned: 408 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied` (exit 0) and after the code rehearsal exits 1 with exactly one line, `packages/core/test/PortSpan.test.ts: differs from its base text at line 19`. `90-check.mjs records --close`, `scan-forbidden`, `scan-ids` stay clean after the code rehearsal (exit 0). `90-check.mjs` also refuses a detached branch (`the branch is detached, not arch-wave-16`), so a scratch clone must create a branch of that name. `90-check.mjs` and the other Phase 90 scripts should join 91's `RUNS`.

The remaining earlier-checks behaviour on the shared spec registers was not rehearsed (the rehearsal had no spec edit). At HEAD `88-check.mjs records --close` already exits 1 with `spec/README.md is at Revision 1.416, not 1.414`, and `89-check.mjs records --close` with `… not 1.415`; Phase 91's own `spec-revise` pass moves both to the next revision, by the same mechanism that moved them in Phase 90. The expected movement of `scan-forbidden` after 91's AGENTS.md edit (rows 85 to 89 already read `AGENTS.md differs from phase_base: no budget moves` at HEAD) is the same mechanism; whether `90-check.mjs scan-forbidden` moves to exit 1 after 91's AGENTS.md commit is [ASSUMED] (A3). Measure it on the real tree after that commit.

## Mutation and coverage facts (P11)

Stryker was not run (instruction). Read-only facts:

- **Core** (`stryker.config.mjs`): `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]`, `ignoreStatic: true`, `coverageAnalysis: "perTest"`, `timeoutMS: 20000`, `thresholds: { high: 90, low: 80, break: 80 }`. So `PortSpanEncode.ts`, `PortSpan.ts`, `PortSpanDecode.ts`, `PortInterpreter.ts` are all covered by the glob; deleted paths vanish from it. Core has no wave record for these four files (D-32's re-take is required).
- **Audit** (`stryker.audit.mjs`): `mutate: ["packages/audit/src/**/*.ts", "!packages/audit/src/index.ts"]`, same options. `ArchiveFacts.ts` and `SequenceIntegrity.ts` are covered.
- **React** (`stryker.react.mjs`): an explicit list, `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts`, `RegistryLease.ts`, `RegistryOwner.ts`, with `vitest.dir: "packages/react"`. So `HydrationEngine.ts`, `GateWriter.ts`, `Hydration.ts`, `GateRegistry.ts`, `QadiAtoms.ts`, `QadiProvider.tsx`, `DevtoolsFeed.ts`, `hooks.ts` are UNMEASURED, as D-32 says. The only react file the phase touches that this config measures is `RegistryLease.ts` (the IN-02 header edit).
- **`--mutate` with several comma-separated paths** is the form the Phase 90 script uses (`pnpm exec stryker run stryker.config.mjs --mutate <comma list>`, `90-mutation.mjs` line 117), so D-32's four-file core invocation has precedent. [VERIFIED: `90-mutation.mjs:117`]
- **Records to cross-check the re-taken base** (read from `89-mutation-close.json` and `86-mutation-close.json` this session): `packages/audit/src/ArchiveFacts.ts` `killed 54, timeout 0, survived 0, noCoverage 0, ignored 4, detected 54, valid 54`; `packages/audit/src/SequenceIntegrity.ts` `killed 0 … valid 0` (a one-line re-export has no mutants); `packages/react/src/RegistryLease.ts` `killed 28 … detected 28, valid 28`. The 89 record's `phase91_base` field is `{ "file": "packages/audit/src/ArchiveFacts.ts", "head": "01f7ec14e5ad4544574e1bdc38dab4823d4a518e", "detected": 54, "valid": 54, "score": 100 }`: Phase 89 already stored the number Phase 91 compares with.
- **Consequence for `RENAMED`:** the audit fold moves no executable code (`SequenceIntegrity.ts` is the disclaimer comment plus one re-export line, and the implementation already lives in `ArchiveFacts.ts`), so `ArchiveFacts.ts`'s close figure should be 54/54 plus 0/0 = 100%. Record the SequenceIntegrity side as N/A (no valid mutants on that side). The core folds move real code (`decodePortSpan`; `portInterpreter`'s `Schema.Literals`, hidden by `ignoreStatic: true`, so its literals are `EXAMINED` by hand).
- **Coverage command** (what Phase 90 used, with the package substituted; `90-coverage-close.json` records it): `pnpm exec vitest run packages/<p>/test --coverage.enabled --coverage.include=packages/<p>/src/** --coverage.exclude=packages/<p>/src/index.ts --coverage.reporter=json-summary --coverage.reportsDirectory=<dir>`. Measured at the base in the scratch tree for the two packages Phase 90 did not measure (exit 0 each):
  - audit: 24 files, lines 100, functions 100, branches 100, statements 100; `ArchiveFacts.ts` 100/100/100/100; `SequenceIntegrity.ts` 100/100/100/100.
  - react: 21 files, lines 99.5, functions 98.68, branches 99.04, statements 99.54; `GateRegistry.ts`, `GateWriter.ts`, `Hydration.ts`, `HydrationEngine.ts`, `QadiAtoms.ts`, `RegistryLease.ts` each 100/100/100/100.
  - core: not re-measured; `90-coverage-close.json` (one commit before this base's code) records 94 files, lines 99.89, functions 99.78, branches 98.4, statements 99.64 [CITED: `.planning/phases/QD-90-…/90-coverage-close.json`]. D-33's base must be re-taken on the Phase 91 base anyway.
- **Not read:** `90-mutation.mjs` and `89-mutation.mjs` beyond the lines quoted; their self-test shapes are the template `91-mutation.mjs` copies.

## Spec anchors, records and the stale sweep (P9)

Spec register edits were not rehearsed (read-only). Counts of the files that mention each deleted path, from `git grep -lF` over `spec`, `packages/*/README.md`, `packages/*/src`, `packages/*/test`, `packages/*/bench`, `apps`, `examples`, `features`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`, `scripts`, `stryker*.mjs`, `.github` (grouped by top directory; a working-tree `grep -rF` also hits `examples/nextjs-newsroom/.next/**` build output, which is untracked and not part of the sweep):

| Deleted path | Hits outside `packages/*/{src,test}` |
|--------------|--------------------------------------|
| `PortSpanDecode.ts` | `spec/overview.md` (1) |
| `PortInterpreter.ts` | `spec/behaviors` (1), `spec/decisions` (2), `spec/overview.md` (1) |
| `GateRegistry.ts` | `spec/behaviors` (1), `spec/decisions` (6), `spec/invariants.md` (1), `spec/overview.md` (1), `spec/process` (1), `spec/README.md` (1) |
| `SequenceIntegrity.ts` | `packages/audit/README.md` (1), `spec/behaviors` (1), `spec/decisions` (4), `spec/invariants.md` (1), `spec/models` (1), `spec/overview.md` (1), `spec/README.md` (1), `spec/urs.md` (1) |
| react `Hydration.ts` | `spec/overview.md` (9), `spec/README.md` (4), `spec/invariants.md` (4), `spec/decisions/078` (4), `spec/traceability.md` (2), `packages/react/CHANGELOG.md` (2), decisions 198, 152, 072, 014 (1 each), `spec/behaviors` 19-hydration and 09-react (1 each), `scripts/check-house-style.mjs` (the line-1043 comment) |

`packages/react/CHANGELOG.md` is release history (exempt, AGENTS.md section 15). `spec/README.md`'s mentions are largely change history (exempt). `scripts` has no live reference to the four other deleted names, and `stryker*.mjs` has none. The overview row numbers, Source cells and the exact ADR anchors in D-26/D-28 are `[CITED: 91-CONTEXT.md]` and were not re-verified here (A6).

## Architecture Patterns

### System architecture diagram (the module graph the phase must keep acyclic)

```
        consumers (apps, examples, tarball installs)
                       |   import { name } from "@qadi/<pkg>"
                       v
   packages/<pkg>/package.json "exports" (closed list, no ./*)
                       |
                       v
   src/index.ts  ---- named groups per module, module-path order ----+
        |  generated once (scratch generator, kind pinned from base)  |
        |  judged by: surface-diff compare | gate 13 | tsc | gate 14   |
        |             surface.test.ts value list | named-barrel rule  |
        v                                                             |
   ┌── core ────────────────────────────────┐                         |
   │ PortSpan.ts  <-- (portInterpreter)     │  fold 2: schema+type    |
   │   ^                                     │  declared here          |
   │   | imports schema                      │                         |
   │ PortSpanEncode.ts (decodePortSpan)      │  fold 1: decoder folded |
   │   ^ SPAN_KEY_SHARED, [untrusted-decode] │  in; only public name   |
   │ EvaluationSpan.ts (SPAN_KEY_DECLARATION)│  stays apart (D-22)     |
   └─────────────────────────────────────────┘                         |
   ┌── react ───────────────────────────────┐                         |
   │ DeveloperSignals.ts --> SeededDecision  │                         |
   │ GateWriter.ts (+ makeGateRegistry) ----> DeveloperSignals (new edge, acyclic)
   │ HydrationEngine.ts (HydrationTarget,    │                         |
   │      dehydrateDecisions, hydrateDecisions)                        |
   │ QadiAtoms.ts  extends HydrationTarget ---> HydrationEngine        |
   │ QadiProvider.tsx, hooks.ts, DevtoolsFeed.ts --> GateWriter        |
   └─────────────────────────────────────────┘                         |
   ┌── audit ───────────────────────────────┐                         |
   │ ArchiveFacts.ts (+ verifySequenceIntegrity, SequenceIntegrityError, disclaimer)
   └─────────────────────────────────────────┘                         |
                                                                       v
   gate 14: pack -> install -> consumer compile+run -> check 3b (non-entry lib refused)
            -> check 3c (every packed .d.ts: no /src/ segment, no specifier outside the package)
   pnpm check: ... lint (named-barrel + self-test) ... surface:self-test (last)
```

### Recommended file touch list (from the rehearsal, 41 files)

Code and tests: audit `index.ts`, `SequenceIntegrity.ts` (deleted), six audit tests; core `index.ts`, `PortInterpreter.ts` and `PortSpanDecode.ts` (deleted), `PortSpan.ts`, `PortSpanEncode.ts`, `core/test/PortSpan.test.ts`; react `index.ts`, `GateRegistry.ts` and `Hydration.ts` (deleted), `GateWriter.ts`, `HydrationEngine.ts`, `QadiAtoms.ts`, `QadiProvider.tsx`, `DevtoolsFeed.ts`, `hooks.ts`, 18 react tests and two support files. Not in the rehearsal (the planner adds them): the surface tool, `surface.test.ts` x3, the escape check, the `named-barrel` rule and its table, the born `HydrationTarget` tstyche file, the `RegistryLease.ts` IN-02 header edit, all spec and AGENTS.md prose, the DoD table, `CONTRIBUTING.md`, three changesets, and the phase scripts.

### Pattern 1: judge a generated artefact by tools that do not share its code

The barrel is generated from compiler flags. It is judged by the same compiler through an independent consumer path (the built `lib/` surface snapshot), by a text reader (gate 13), by runtime keys (`surface.test.ts`), by the packed consumer (gate 14) and by a structure rule (`named-barrel`). Each catches a different class of generator error (P2's value-deletion trap is caught by exactly two of them).

### Pattern 2: pin a name's kind from the base, not from where it is declared

```ts
// Source: scratch prototype, verified on the rehearsal (P3)
const bk = baseKinds.get(c.name);               // from the base snapshot
if (bk !== undefined && (bk === "type") !== (c.kind === "type")) c.kind = bk;
```

### Pattern 3: a structural parameter stated once

```ts
// Source: D-21 commit A, compiled and rehearsed (P1 e′)
export interface HydrationTarget {
  readonly hydrate: (dehydrated: DehydratedDecisions, subject: AuthSubject, options?: HydrateOptions) => InitialValues;
}
export interface QadiAtoms extends HydrationTarget { /* ...no hydrate member... */ }
export const hydrateDecisions = (target: HydrationTarget, /* ... */) => /* target.hydrate(...) */;
```

### Anti-Patterns to Avoid

- **`export *` as a stepping stone.** It publishes folded internals (`portInterpreter`) and gate 13 reports it as drift only after the fact.
- **Hand-typing a barrel.** The three barrels are 580, 69 and 82 lines; an omission is silent for a type-only name used by no dependent.
- **`grep '\.\./\.\./'` as the escape check.** 46 `lib` `.d.ts` files carry `../../` in doc comments.
- **Reusing one `API` instance across entry points** (getNodeId error) and **opening a `lib` entry through a repo tsconfig** (it is outside `include`).
- **Judging the folds by `tsc` alone.** madge counts `import type` edges; (e) compiles cleanly and still cycles.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Value-vs-type meaning of an export | A regex over barrel text | `getExportsOfModule` plus the alias-chain walk (P3) | `export type { C } from` puts `isTypeOnly` on the declaration, not the specifier; star re-exports resolve for free |
| Import-cycle detection after a fold | A custom graph walk | `pnpm circular` (madge, `--extensions ts,tsx`) | It already counts type-only edges, the exact edge that blocked (e) |
| Starting the TypeScript server | Another process wrapper | `scripts/lib/typescript-server-child.mjs` | The two existing seams already use it (`module-state-scan.mjs`, `probe-guard-parse.mjs`) |
| Comment stripping in the escape check | `replace(/\/\/.*/g, "")` | A small tokenizer that keeps `/// <reference …>` | A naive strip deletes reference directives and mis-strips `://` in strings |
| Port-span key discovery | A second key list | `SPAN_KEY_DECLARATION` reading (already in the rule) | The rule reads the key set from the declaration; a folded file must not duplicate a key |
| The barrel list | Typing it | The scratch generator with kinds pinned | 700 names across three files |

**Key insight:** every check here guards a property that a different check is blind to (P2). Adding a check is cheap; relying on one is the defect.

## Common Pitfalls

### Pitfall 1: generated kinds widen a type-only name into a value
**What goes wrong:** `AllowDisclosure` and `DenyDisclosure` become runtime exports; `surface-diff compare` and the runtime keys report the difference.
**Why it happens:** the generator reads the declaring module, which has a value; the base barrel exports it `export type`.
**How to avoid:** pin each kind from `91-surface-base.json` (D-11a). **Warning signs:** `KIND … type -> both` rows; gate 14's `528` becoming `530`.

### Pitfall 2: a type-only export of a class passes gate 13, the build and gate 14
**What goes wrong:** `export type { AccessDenied }` deletes the runtime value; only a consumer that uses it fails.
**How to avoid:** `surface.test.ts` value lists in the same commit as each barrel, plus `surface-diff compare` after each commit (D-12).

### Pitfall 3: the escape check cannot be shown failing in the intact layout
**What goes wrong:** omitting a name gives TS2883 and no `.d.ts`, so "seen failing" never reaches the escape check.
**How to avoid:** record two variants: the planted `.d.ts` text (pure function, exit non-zero) and a scratch with `packages/react/node_modules/@qadi/core` removed and `Trace` omitted (D-09a).

### Pitfall 4: the born `HydrationTarget` pin file imports a file the fold deletes
**What goes wrong:** commit B deletes `Hydration.ts`; the born tstyche file's import fails.
**How to avoid:** declare the one import line as an edit in `91-pinned-check.mjs` and re-point it in commit B.

### Pitfall 5: first-differing-line text in the earlier-checks ledger
**What goes wrong:** a ledger row pinned to `… at line 8` is wrong the moment the edit changes.
**How to avoid:** match each reason by path with any line number, keyed on the commit subject (P10).

### Pitfall 6: the gate-14 refusal probe is a call, not a typed literal
**What goes wrong:** `REFUSED_SHAPE_PROBES` expects a typed literal; `hydrateDecisions({}, …)` is a call argument.
**How to avoid:** use plain consumer statements and let check 4's `tsc` fail on an unused `@ts-expect-error`; confirm the probe guard accepts them (A5).

### Pitfall 7: the scratch clone's `node_modules` layout decides whether the escape is silent
**What goes wrong:** a clone with a symlinked root `node_modules` but no per-package `node_modules/@qadi/*` links resolves core through `paths`, which makes TS2883 vanish and the escape appear.
**How to avoid:** build the per-package link directories; state the layout in `91-SPIKE.md`.

### Pitfall 8: a fold that appears to move a budget
**What goes wrong:** `UNTRUSTED_DECODE_BUDGET` and `SPAN_KEY_SHARED` look like they must move with the fold.
**How to avoid:** they do not: `PortSpanEncode.ts` keeps its path and its count (2). What moves is prose (AGENTS.md §7a clause, the comment at the budget). Proved by the two planted variants in P1.

### Pitfall 9: ids in test titles and comments
The born test titles name properties ("hydrateDecisions accepts any value that has the hydrate capability"), not D-numbers or phase numbers (WX-07); `91-check.mjs scan-ids` adds `BARL-0\d`, `91-\d{2}`, `QD-91`, `Phase 91`.

### Pitfall 10: stale comment in `check-house-style.mjs:1043`
The comment names the deleted `Hydration.ts` as its example. Re-point it in the Hydration-fold commit.

### Pitfall 11: `90-check.mjs` and the earlier scripts run from a clone need a branch named `arch-wave-16`
A detached checkout fails them (`the branch is detached, not arch-wave-16`).

## Code Examples

### The escape check's core (shape that ran, P2)

```js
// Source: scratch prototype escape.mjs (sha 7249b2f30bfc53f8…), P2
// strip comments but keep /// <reference path="…"> directives
// collect: import("…"), from "…", import "…", require("…"), reference paths
// refuse: any specifier containing a "/src/" segment,
//         any relative/absolute specifier resolving outside the package root
```

### The unfolded-name pin (generator argument)

```
node genbarrel.mjs <root> react <modules.txt> <collisions.txt> <out/surface-base.json> > barrel-react.ts
# stderr: react: kind pinned from the base snapshot: AllowDisclosure: both -> type; DenyDisclosure: both -> type
# stderr: react: 8 modules, N names, 0 collisions
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `export *` barrels plus a visibility-only re-export file per part-public module | Named barrel per package; part-public modules keep their other names private | This phase (ADR-QD-204), after ADR-QD-047 did it for devtools | no more files that exist only to publish names |
| `ts.createProgram` classic API | `typescript/unstable/sync` (TypeScript 7) | TypeScript 7 | the only API that reads symbol flags and aliases in this repo |

**Deprecated/outdated:** CONTEXT's "mixed barrel is silent at gate 13" (it is loud there); "245 madge files"; "about 34/7 pairs".

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The generator's 100-column one-line threshold is acceptable (CONTEXT says about 90) | P3 | cosmetic; no judge reads width |
| A2 | tstyche's RED text for the first pin is the "not assignable to QadiAtoms … missing the following properties" form, not TS2345 | P5 | `91-RED-EVIDENCE.md` records whatever the real run prints; harmless |
| A3 | `90-check.mjs scan-forbidden` moves to exit 1 after 91's AGENTS.md edit, like rows 85 to 89 | P10 | the ledger row is wrong; measure on the real tree |
| A4 | The spec anchors (overview rows, ADR lines) in D-26/D-28 are accurate | Spec anchors | a Source cell edit lands on the wrong row; the gate-13 run and the sweep catch it |
| A5 | Plain consumer statements for the `hydrateDecisions` probes need no probe-guard list entry | P6 | gate 14 fails its own guard; add a list entry |
| A6 | `STATE.md`, `90-REVIEW-DISPOSITION.md`, `90-VERIFICATION.md`, `.planning/research/*` Phase 91 parts were not re-read; CONTEXT carries their conclusions | all | a lesson not carried; the planner reads them |
| A7 | The mutation base re-take on the real phase base reproduces 54/54 for `ArchiveFacts.ts` and 28/28 for `RegistryLease.ts` | P11 | a lower figure is investigated before anything moves (D-32) |

## Open Questions

1. **Does the 91 ledger need rows for Phase 90's own scripts?**
   - What we know: `90-pinned-check.mjs` has one mover (`PortSpan.test.ts` line 19); `90-check.mjs` rows are clean after the code state.
   - What is unclear: the AGENTS.md-edit effect on `90-check.mjs scan-forbidden` (A3).
   - Recommendation: include Phase 90's scripts in `RUNS`; add the row after measuring on the real tree.
2. **Pin gate 14's printed runtime-export count?** Decided below (D-09b): no. A second source of truth beside the value lists.
3. **Which package `README`s name the deleted files?** Only `packages/audit/README.md` (`SequenceIntegrity.ts`). The react and core READMEs are clean per the sweep counts.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | every script | ✓ | v26.13.0 | — |
| pnpm | `pnpm check`, `pnpm circular` | ✓ | 10.17.1 | — |
| TypeScript (tsc) | build, typecheck, surface tool | ✓ | 7.0.2 with effect-tsgo | — |
| TypeScript for tstyche | `pnpm test:tstyche` | ✓ | 6.0.3 (`tstyche.json` target) | — |
| madge | `pnpm circular` | ✓ | ^8 | — |
| vitest and `@vitest/coverage-*` | tests and coverage | ✓ | repo pin | — |
| Stryker | mutation | ✓ (not run here) | repo pin | — |
| rsync, git, python3 | scratch rehearsal only | ✓ | — | — |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest and `@effect/vitest` (runtime), tstyche (type tests, two passes), phase scripts with `--self-test` |
| Config file | `packages/*/vitest.config.ts`, `tstyche.json`, `tsconfig.tstyche.json`, `tsconfig.test.json` |
| Quick run command | `pnpm exec vitest run packages/core/test/surface.test.ts packages/react/test/surface.test.ts packages/audit/test/surface.test.ts` |
| Full suite command | `pnpm check:pr < /dev/null` (release PR: `pnpm check`) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BARL-01 | surface tool detects each planted defect and passes an identical pair | script self-test | `node scripts/surface-diff.mjs --self-test` | ❌ Wave 0 |
| BARL-01 | surface equals the base after each commit | script | `node scripts/surface-diff.mjs snapshot <out>` then `compare <base> <out>` (after `pnpm build`) | ❌ Wave 0 |
| BARL-02 | each barrel's runtime value names equal a written-out list | unit | `pnpm exec vitest run packages/<core\|react\|audit>/test/surface.test.ts` | ❌ Wave 0 |
| BARL-02 | no packed `.d.ts` names a `/src/` path or a path outside its package | script | `node scripts/check-package-install.mjs` (check 3c) | ❌ Wave 0 |
| BARL-02 | gate 13 prints the base figure | script | `node scripts/check-api-surface.mjs` | ✅ |
| BARL-03 | no cycle after each fold | script | `pnpm circular` | ✅ |
| BARL-03 | `hydrateDecisions` accepts a `{ hydrate }`-only object, an atom set is assignable | type test | `pnpm test:tstyche` | ❌ Wave 0 (born in commit A) |
| BARL-03 | folded behaviour unchanged | unit | `pnpm exec vitest run packages/core packages/react packages/audit` | ✅ |
| BARL-04 | named barrels are named, relative, in order; the rule checks itself | lint | `node scripts/check-house-style.mjs` | ✅ (rule to be written) |
| BARL-05 | overview names every export at its new home | script | `node scripts/check-api-surface.mjs` | ✅ |
| BARL-05 | spec fences compile, records exist | script | `pnpm spec:api`, `pnpm spec:package`, `node .planning/phases/QD-91-…/91-check.mjs records --close` | ❌ Wave 0 (`91-check.mjs`) |
| WX-01 | whole gate | script | `pnpm check:pr < /dev/null` | ✅ |
| WX-03 | gate 14 probes `hydrateDecisions` (accepted twins, refused `{}`) | script | `node scripts/check-package-install.mjs` | ✅ (probes to add) |
| WX-04 | no new forbidden form in added lines | script | `91-check.mjs scan-forbidden` | ❌ Wave 0 |
| WX-05 | mutation and coverage do not fall | script | `91-mutation.mjs`, the coverage command in P11 | ❌ Wave 0 |
| WX-06 | each new check seen failing | variants | the scratch variants below | recorded in `91-RED-EVIDENCE.md` |
| WX-07 | no ids in titles; no release | script | `91-check.mjs scan-ids`, `trailers` | ❌ Wave 0 |

### Seen-failing scratch variants (each shown failing once; measured results from this research where they exist)
- `surface-diff`: class as `export type`, pair as `export type`, dropped name, added name (all four detected, P3).
- `surface.test.ts`: `export type { AccessDenied }` in the core barrel (value key lost; P2).
- Escape check: a planted `.d.ts` with `import("../../core/src/Decision.ts").Trace`; and a scratch with the `@qadi/core` link removed and `Trace` omitted (P2).
- `named-barrel`: `export *` in each of the five, two groups out of order, a sixth named barrel off the list, a mixed barrel (prototype passes the clean five and fails the first two plants, P4).
- D-17: `JSON.parse` and a second `"qadi.subject_id"` in `decodePortSpan` (texts in P1).
- D-21: the first tstyche pin RED on the base (text in P5).
- Mutation-style proofs for UNMEASURED code: `hydrateDecisions` forwarding the wrong subject; `dehydrateDecisions` dropping `options`; `makeGateRegistry` ignoring `onIdCollision`; `verifySequenceIntegrity` re-exported type-only (D-08).

### Sampling Rate
- **Per task commit:** the four-line set after a barrel or fold commit: `pnpm circular`, `tsc -b tsconfig.build.json`, `pnpm build`-then-`surface-diff compare`, `node scripts/check-api-surface.mjs`.
- **Per wave merge:** `pnpm typecheck`, the three packages' vitest, `pnpm test:tstyche`, `node scripts/check-house-style.mjs`, gate 14.
- **Phase gate:** `pnpm check:pr < /dev/null` green, plus `91-check.mjs` and `91-earlier-checks.mjs`.

### Wave 0 Gaps
- [ ] `scripts/surface-diff.mjs` (and `surface:self-test` in `pnpm check`, DoD table row)
- [ ] `packages/{core,react,audit}/test/surface.test.ts`
- [ ] gate 14 check 3c and its self-check
- [ ] the born `HydrationTarget` tstyche file
- [ ] `named-barrel` rule, `NAMED_BARRELS`, `[named-barrel-self-test]`
- [ ] `91-check.mjs`, `91-pinned-check.mjs`, `91-earlier-checks.mjs`, `91-mutation.mjs`
- [ ] Framework install: none.

## Security Domain

`security_enforcement` is not set to false (absent means enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — (the phase moves no authorization decision) |
| V5 Input Validation | partly | `untrustedDecoder` stays the only untrusted-JSON decode path; the fold must not add a `Schema.decode*`/`JSON.parse` token outside the `UNTRUSTED_DECODE_BUDGET` rows (P1 variants) |
| V6 Cryptography | no | — |
| V14 Configuration | yes | gate 14's escape check: no packed declaration reaches a `src/` tree or outside its package |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A value silently deleted from the public API by `export type` (an authorization error class or a policy constructor becomes unusable, or a consumer's `catch` of `AccessDenied` breaks) | Denial of service / Tampering | `surface.test.ts` value lists and `surface-diff compare` (P2) |
| A folded internal becoming public (`portInterpreter`, a gate writer slot) | Information disclosure / Elevation | named barrels; gate 14 check 3b refuses non-entry modules; ADR-QD-080's writer slot stays unnamed |
| A packed `.d.ts` that points into `src/` of another package | Tampering (supply chain) | gate 14 check 3c |
| A second untrusted-decode path introduced by the fold | Tampering | `[untrusted-decode]` budget unchanged at 2 for `PortSpanEncode.ts` (P1) |

## Package Legitimacy Audit

No external packages are installed or added. The scratch rehearsal used only the repository's own `node_modules` (symlinked). **Packages removed due to SLOP:** none. **Packages flagged SUS:** none. The `gsd-tools package-legitimacy` seam was not needed.

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Imports:** `effect` submodule namespace imports only (`import * as Effect from "effect/Effect"`); relative imports carry `.ts`; `import type` is mandatory for type-only imports (`verbatimModuleSyntax`). Cross-package: named import from the dependency root.
- **Services, layers, errors:** `Context.Service` with a separately exported `…Shape`; layers are top-level consts beside the service; `Data.TaggedError` by default with the twelve budgeted `Schema.TaggedError` exceptions; array-form `Effect.catchTag`; never `Effect.orDie` in evaluation paths.
- **Functions and dispatch:** `Effect.fn`; the three budgeted `Effect.fnUntraced` sites; `Match` over `switch` except the three budgeted switches.
- **Forbidden:** `async`/`await`, `new Promise`, `node:fs` import, `Date.now()`/`new Date()`, `performance.now()`, `crypto.randomUUID()`, `console.*`/`process.env` outside the one exempt file, `Effect.either`, `as`/`as any`/`!`/`any` (one budgeted `any` file), a module-scope `let` (one counted).
- **Barrels (section 9):** `export *` alphabetical for pure barrels; devtools is the one named barrel today; this phase generalises it. Shared scaffolding stays out; TS2883 re-exports explicit.
- **Gates and budgets:** `UNTRUSTED_DECODE_BUDGET`, `SPAN_KEY_LITERAL_BUDGET`, `NOT_CALLABLE_PIN_BUDGET`, `MODULE_STATE_BUDGET`, `HAS_CUSTOM_BUDGET`, `PORT_DOUBLE_BUDGET`, `METRIC_ID_LITERAL_BUDGET`: a budget changes only together with its AGENTS.md table in one commit (this phase moves none).
- **Spec and docs:** `spec/` is normative; TypeScript fences compile; `spec/overview.md` names every export (gate 13); the DoD table equals `pnpm check` (gate 11); gate 12 devtools claims.
- **Formatting:** hand-wrapped about ninety columns; `oxfmt` stays out of the gate.
- **Publish:** `pnpm publish`, never `npm publish`; a new public package goes in `tsconfig.build.json` (none here).
- **Memory directives:** closed union over widening, complete over simple, `Record<string, unknown>` is a hack, no new releases, autonomous mode decides.

## Sources

### Primary (HIGH confidence)
- Scratch rehearsal outputs (this session): madge, `tsc -b`, gate 13, gate 14, house-style, vitest, tstyche, coverage, `90-earlier-checks.mjs` runs; all recorded with commands and hashes above.
- `node_modules/typescript/dist/api/sync/api.d.ts` (the `unstable` API).
- `/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-CONTEXT.md`, `REQUIREMENTS.md` lines 59-73, `stryker.config.mjs`, `stryker.audit.mjs`, `stryker.react.mjs`, `scripts/check-package-install.mjs`, `scripts/check-house-style.mjs`, `scripts/check-api-surface.mjs`, `AGENTS.md`.
- `.planning/phases/QD-89-…/89-mutation-close.json`, `QD-86-…/86-mutation-close.json`, `QD-90-…/90-coverage-close.json`, `90-earlier-checks.mjs`, `86-pinned-check.mjs`.

### Secondary (MEDIUM confidence)
- `.planning/phases/QD-90-…/90-RESEARCH.md` (shape and precedent).

### Tertiary (LOW confidence)
- none.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing is added.
- Architecture (folds, barrels, gates): HIGH, rehearsed commit by commit.
- Spec anchors and records: MEDIUM, read from CONTEXT only (A4, A6).
- Pitfalls: HIGH, each from a measured run.

**Research date:** 2026-11-26
**Valid until:** while `packages/*/src` equals the HEAD it was measured at (`58f4c750`); re-measure the madge counts and the rehearsal if another phase lands first.

## Cleanliness proof

At the end of this research the scratchpad `<S>` (rehearsal trees, kit, outputs, the scratch clone) is deleted, and the hand-back message records: `git -C /Users/mohammadalmechkor/Projects/Perso/qadi status --porcelain -- packages spec scripts features .changeset` prints nothing; `git worktree list` shows only the main tree; no tracked `lib/` path changed (`packages/*/lib` is gitignored and was never touched in the real tree). The only files this research changed are this `91-RESEARCH.md` and the appended "Addendum after research (2026-11-26)" in `91-CONTEXT.md`. Nothing was committed.
