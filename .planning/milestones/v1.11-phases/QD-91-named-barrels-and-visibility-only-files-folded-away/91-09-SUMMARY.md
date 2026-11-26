---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 09
subsystem: build
tags: [barrels, named-exports, surface, generator]

requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: 91-surface-base.json (kinds), 91-check.mjs (barrels, homes, structural, surface), 91-pinned-check.mjs, 91-earlier-checks.mjs, the three surface.test.ts value lists
provides:
  - core, react and audit root barrels that name their exports per module, with no export *
  - 91-BARRELS.md, the generator record and one structural block per barrel commit
affects: [91-10 through 91-14 (each fold edits a named barrel line), 91-15 (the named-barrel rule), 91-16 (ADR-QD-204)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: cc0b42087fd5992355ac32ea50e0c1e003d0d249
plan_head_after: 22e83755424151b5da083ce6d92f76777861e0b6
commits: 4

actuals:
  tokens: 40000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a barrel is generated, not typed: an uncommitted generator reads each module's exports from the compiler and pins kinds from the base snapshot"

key-files:
  created:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-BARRELS.md
  modified:
    - packages/core/src/index.ts
    - packages/react/src/index.ts
    - packages/audit/src/index.ts

key-decisions:
  - "Each barrel's header is a doc comment in the devtools model; react's absorbs the components.tsx and hooks.ts note as a paragraph of it, so no stray comment sits between groups"

requirements-completed: []

duration: 45min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 09: Named barrels Summary

**Core, react and audit now name their exports per module in generated barrels, one commit each, the public surface still equal to the base (948 exports, gate 13 at 943).**

## Accomplishments

- A scratch generator (`<S>/gen/genbarrel.mjs` and its TypeScript child `child.mjs`, neither committed, neither importing `scripts/lib/surface-scan.mjs`) reads each module's own exports through `typescript/unstable/sync` on the package's `tsconfig.src.json`, pins every kind from `91-surface-base.json`, refuses a module that contributes no name, a name the base lacks and a base name no module emits, and writes one `export { … }` then one `export type { … }` group per module in ASCII module order with ASCII-sorted names (one line up to 90 columns, else one name per line).
- `generator sha256: 0dbf05080359967875ac0946f1e9e518a80bee723d2485bf04fff4feb65d5284`, `child sha256: f586f2dced3b719880f77428643783b9184e71aa3e309f3a7c7f421ab38eda63`; the command is in `91-BARRELS.md`.
- Per barrel (names by base kind; modules; collisions 0 in each; kind replacements 0 in each):

| Barrel | Lines | Modules | Names | Base kinds (value / type / both) | Value groups | Type groups | sha256 | Commit |
| ------ | ----: | ------: | ----: | -------------------------------- | -----------: | ----------: | ------ | ------ |
| core | 640 | 61 | 545 | 270 / 203 / 72 | 57 | 50 | `ec9dbc8b846dd352f898c131e0bef8f32ec85fa8a63ae5575186e7519d5cda9f` | `b4878f9c` |
| react | 85 | 8 | 62 | 24 / 34 / 4 | 8 | 7 | `2095bfb832f814d3aa788ea235745cb49e9e6c8ea05f73ea9abf497d691f56e6` | `400d27f0` |
| audit | 101 | 16 | 72 | 19 / 31 / 22 | 16 | 14 | `aa01f97a419a147a3a49267d42db89066714c83685f6584658412f792fd584d3` | `b646c87b` |

- Structural block of each commit (in `91-BARRELS.md`): `pnpm circular` exit 0 (`madge files: 251`), `pnpm build` exit 0, `pnpm typecheck` exit 0, `91-check.mjs surface` exit 0 (`equal to the base, 948 exports`, which also holds gate 13 at 943), `pnpm spec:package` (gate 14, escape check included) exit 0 (`9 package(s) … 528 runtime export(s)`), `node scripts/check-house-style.mjs` exit 0 (`652 file(s) clean`).
- Each barrel's `surface.test.ts` passed right after its barrel was written and again after its commit (core 1 test, react 2, audit 1).
- After the third commit: `91-check.mjs barrels` (`3 barrels are named per module, and the surface equals the base`), `homes` (`every name of 3 barrels sits at its home, in its kind's group`), `surface` (`equal to the base, 948 exports`), `91-pinned-check.mjs` (`516 held, 26 declared (0 applied), 3 born, 27 earlier-held, clean`), `scan-ids` and `trailers` (29 commits, each with the one trailer), all exit 0.
- React: all nine `./QadiProvider.tsx` names are there (value group `MissingQadiProviderError`, `QadiProvider`, `useAtomValue`, `useQadiContext`; type group `InitialValues`, `ProviderSignal`, `ProviderSignalReporter`, `QadiContextValue`, `QadiProviderProps`); `AllowDisclosure` and `DenyDisclosure` appear only in the `export type` group of `./Hydration.ts`.
- Audit: `SIGNATURE_MEANINGS` (value) and `SignatureMeaning` (type) are named at `./SignatureCapturePort.ts`; no group carries a package specifier; `AuditEntry` is in the `export type` group, its base kind.
- Earlier-phase checks: `node 91-earlier-checks.mjs` exit 0, `87 runs, all match their rows`. The prediction held: `89-pinned-check.mjs` moved to exit 1 with `packages/audit/src/index.ts: differs from its base text at line 1`, the only 89 pinned movement; the 85 to 90 `scan-forbidden` rows were already at exit 1 on `AGENTS.md differs from phase_base` and the `records --close` rows on the spec README revision, as the ledger records.

## Task Commits

1. Task 1 (generator, core barrel): `b4878f9c` `refactor(91-09): name the core barrel's exports per module`
2. Task 2 (react barrel): `400d27f0` `refactor(91-09): name the react barrel's exports per module`
3. Task 3 (audit barrel): `b646c87b` `refactor(91-09): name the audit barrel's exports per module`; the record: `22e83755` `docs(91-09): record the barrel generation`

Each barrel commit holds exactly its `src/index.ts` and `91-check.mjs commit` accepted all four subjects.

## Deviations from Plan

### Observations that are not defects

**1. Kind replacements are 0 for react, not two.** The plan expects the stderr of the react run to show `AllowDisclosure: both -> type; DenyDisclosure: both -> type`. This generator classifies each name as the module reaches it (the alias chain through `./Hydration.ts`'s `export type { … } from "./SeededDecision.ts"` is type-only), so both names already come out as `type`, and the output is what the plan wants: both names in an `export type { … } from "./Hydration.ts";` group, their base home and kind. The base pin is still enforced (a mismatch would be replaced and printed) and it never fired for any of the three packages. Recorded in `91-BARRELS.md` under react.

**2. `91-check.mjs homes` is slow.** It took 6 minutes 9 seconds (140 s of system time) on the last run, after finishing in under a minute earlier in the plan; the first attempt as part of a chained command ran past the 300-second tool limit and was moved to the background. It passed. Not changed (a held script of an earlier plan).

**3. The barrel headers cite ADR-QD-204 before it exists.** The plan names that citation; the record is born by the decision plan, so for now the id has no document. No check refused it (`spec:package`, house-style, `scan-ids` all exit 0).

### Choices the plan left open (autonomous, most complete option)

**4.** React's header carries the `components.tsx` and `hooks.ts` note as the last paragraph of its doc comment, not as a `//` comment between groups, so the barrel is one header and then groups only.

**5.** The `homes`, `barrels`, `surface` and `commit` judges, `scan-ids` and `trailers` were run beyond the plan's list for completeness; gate 14 is part of `structural` (it is `pnpm spec:package`).

### Plan defects

None.

## Known Stubs

None.

## Threat Flags

None: the three barrels publish the same 545, 62 and 72 names with the same kinds (T-91-19, T-91-20 mitigated by the surface compare, `homes`, the value lists, build, typecheck and gate 14).

## Self-Check: PASSED

- `packages/core/src/index.ts`, `packages/react/src/index.ts`, `packages/audit/src/index.ts` and `91-BARRELS.md` exist and hold no `export *`.
- Commits `b4878f9c`, `400d27f0`, `b646c87b` and `22e83755` are ancestors of HEAD and `trailers` finds each with the one trailer.
