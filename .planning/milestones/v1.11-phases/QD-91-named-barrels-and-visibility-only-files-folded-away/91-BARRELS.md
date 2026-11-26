# Phase 91 barrel generation

`<S>` is the phase's system-temp scratch root (`qd91` under the resolved temporary directory); `<D>` is this phase's directory. The generator and its child are not committed.

- generator sha256: 0dbf05080359967875ac0946f1e9e518a80bee723d2485bf04fff4feb65d5284 (`<S>/gen/genbarrel.mjs`)
- child sha256: f586f2dced3b719880f77428643783b9184e71aa3e309f3a7c7f421ab38eda63 (`<S>/gen/child.mjs`)
- command: `node <S>/gen/genbarrel.mjs <package> <S>/gen/<package>-modules.txt <D>91-surface-base.json <S>/gen/<package>-header.txt > <S>/gen/<package>-index.ts`, run from the repository root; each `<package>-modules.txt` is the `from` specifiers of the `phase_base` barrel's `export *` lines, one `./X.ts` per line.

## core

- modules: 61; names: 545; collisions: 0; kind replacements: 0
- output: 640 lines, sha256 ec9dbc8b846dd352f898c131e0bef8f32ec85fa8a63ae5575186e7519d5cda9f

## refactor(91-09): name the core barrel's exports per module
- head: b4878f9ca98aa8dab3483047838084d5f517d6e4
- madge files: 251
- pnpm circular: exit 0: Processed 251 files (905ms) (68 warnings)
- pnpm build: exit 0: > tsc -b tsconfig.build.json
- pnpm typecheck: exit 0: > tsc -b tsconfig.json && tsc -p tsconfig.test.json
- node .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-check.mjs surface: exit 0: surface: equal to the base, 948 exports
- pnpm spec:package: exit 0: package-install: 9 package(s) pack, resolve and authorize (528 runtime export(s))
- node scripts/check-house-style.mjs: exit 0: house-style: 652 file(s) clean (3 declared switch(es), 82 type-test file(s))

## react

- modules: 8; names: 62; collisions: 0; kind replacements: 0
- the generator classifies each name as the module reaches it, so `AllowDisclosure` and `DenyDisclosure` (re-exported by `./Hydration.ts` through `export type`) come out as `type` without a replacement; both sit in the `export type` group of `./Hydration.ts`, their base home and kind
- `./QadiProvider.tsx` names all nine of its base names: four in the value group (`useQadiContext` among them) and five in the type group
- output: 85 lines, sha256 2095bfb832f814d3aa788ea235745cb49e9e6c8ea05f73ea9abf497d691f56e6

## refactor(91-09): name the react barrel's exports per module
- head: 400d27f046beaa66c4ae42f0b4d8ffe112bcd4a1
- madge files: 251
- pnpm circular: exit 0: Processed 251 files (882ms) (68 warnings)
- pnpm build: exit 0: > tsc -b tsconfig.build.json
- pnpm typecheck: exit 0: > tsc -b tsconfig.json && tsc -p tsconfig.test.json
- node .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-check.mjs surface: exit 0: surface: equal to the base, 948 exports
- pnpm spec:package: exit 0: package-install: 9 package(s) pack, resolve and authorize (528 runtime export(s))
- node scripts/check-house-style.mjs: exit 0: house-style: 652 file(s) clean (3 declared switch(es), 82 type-test file(s))

## audit

- modules: 16; names: 72; collisions: 0; kind replacements: 0
- `SIGNATURE_MEANINGS` and `SignatureMeaning` are named at `./SignatureCapturePort.ts` (its re-export of core's names stays), no group carries a package specifier, and `AuditEntry` stays in the `export type` group, its base kind
- output: 101 lines, sha256 aa01f97a419a147a3a49267d42db89066714c83685f6584658412f792fd584d3

## refactor(91-09): name the audit barrel's exports per module
- head: b646c87b9c5777ac279c4edb11d0d51a662068b3
- madge files: 251
- pnpm circular: exit 0: Processed 251 files (868ms) (68 warnings)
- pnpm build: exit 0: > tsc -b tsconfig.build.json
- pnpm typecheck: exit 0: > tsc -b tsconfig.json && tsc -p tsconfig.test.json
- node .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-check.mjs surface: exit 0: surface: equal to the base, 948 exports
- pnpm spec:package: exit 0: package-install: 9 package(s) pack, resolve and authorize (528 runtime export(s))
- node scripts/check-house-style.mjs: exit 0: house-style: 652 file(s) clean (3 declared switch(es), 82 type-test file(s))
