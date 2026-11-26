# Phase 91 fold spike

Each candidate fold was made on its own scratch clone of the phase base and measured there. The main tree was never edited and no candidate's source was committed; the patches below are the record.

spike base: 69e5247d205949df7396dfacb0a29bc96a02f321
madge files base: 251
layout: per-package node_modules links present
tsc command: pnpm exec tsc -b tsconfig.build.json

## Method

- Clone: `node 91-check.mjs scratch spike-<id> --at phase_base`, then each `packages/*/node_modules` (a symlink to the main checkout's directory in the scratch mode) was replaced by a real directory holding copies of its links. A relative `@qadi/core` link therefore resolves to the clone's own `packages/core`, so a candidate in core is what the dependents compile against (research Pitfall 7). `packages/*/node_modules/@qadi/core` resolves to `<clone>/packages/core`; the root `node_modules` stays the one symlink.
- Edit: the absorbed file's declarations and doc comments move into the target, the absorbed file is deleted, every `src` import of it is re-pointed, and the barrel line is replaced by a named export of the names it carried (the barrels are still `export *` at the base, so a star barrel line cannot point at a target that holds more than the absorbed file did). Tests are untouched: the build graph excludes them.
- Patch: `git diff --binary 69e5247d205949df7396dfacb0a29bc96a02f321` in the clone, written to `spike/<id>.patch`.
- Checks, in the clone, with stdin closed: `pnpm circular` (`madge --circular --extensions ts,tsx packages/*/src`) and `pnpm exec tsc -b tsconfig.build.json`; each one's full output and exit code is in `spike/out/<id>.madge.txt` and `spike/out/<id>.tsc.txt` (the exit is the last line, `f` also carries a `house-style:` section). `spike/out/base.madge.txt` and `spike/out/base.tsc.txt` are the same two commands on the unedited clone: 251 files, no cycle, `tsc` exit 0.
- A clean `tsc` prints nothing, so each `.tsc.txt` holds `exit: 0` alone and has no (file, code) group.

## Verdicts

| candidate | what | patch | sha256 | madge | files | tsc | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a | PortSpanDecode into PortSpanEncode (core) | spike/a.patch | 0804847ae7ebf08f9f95614f497f834bc0276b09da4ec1a6208abebec6ea5d0f | No circular dependency found | 250 | exit 0, no (file, code) groups | acyclic |
| b | PortInterpreter into PortSpan (core) | spike/b.patch | 34d8ddfdb94ef407b6c5bdcf6bff12495ea33d6c8eaf5e5580724f6ea542073a | No circular dependency found | 250 | exit 0, no (file, code) groups | acyclic |
| b-prime | PortInterpreter into PortSpanEncode (core) | spike/b-prime.patch | c1c3bfa2442473ef7f7d772b9b9c8195872f23f9ce17fb76ca2d9f9c23638e35 | Found 1 circular dependency: core/src/PortSpan.ts > core/src/PortSpanEncode.ts | 250 | exit 0, no (file, code) groups | cycle |
| b-double-prime | PortSpanDecode into PortSpan (core) | spike/b-double-prime.patch | d1c1b7ec3577e3d080ba93f2d14e234b3e692511d8b28e64bf773379640132f6 | Found 1 circular dependency: core/src/PortSpan.ts > core/src/PortSpanEncode.ts | 250 | exit 0, no (file, code) groups | cycle |
| c | GateRegistry into GateWriter (react) | spike/c.patch | 017a8860d7ed08c389c88cd03cf2a58c0c89e7eba3c6cd76281b271eafdb5669 | No circular dependency found | 250 | exit 0, no (file, code) groups | acyclic |
| d | SequenceIntegrity into ArchiveFacts (audit) | spike/d.patch | 45f67cdfb6453caa790bc119ec631777c4a2b1281ec7ab19b470db9ede60aa2d | No circular dependency found | 250 | exit 0, no (file, code) groups | acyclic |
| e | Hydration into HydrationEngine as written (react) | spike/e.patch | 821e10263e322e992401f45741ccd5bd9b7f3a400ec7c73f5deb4e141ea84965 | Found 1 circular dependency: react/src/QadiAtoms.ts > react/src/HydrationEngine.ts | 250 | exit 0, no (file, code) groups | cycle |
| e-prime | HydrationTarget, the structural parameter alone (react) | spike/e-prime.patch | 3dbb152f60c5a951eed923e114c980d02cbd60eadae5309b9db7de1f3c6590e6 | No circular dependency found | 251 | exit 0, no (file, code) groups | acyclic |
| e-prime-fold | HydrationTarget, then Hydration into HydrationEngine (react) | spike/e-prime-fold.patch | 9edea2dcd215a240910d9efa35e4848edb32825dcf7d63f1f68f17c0995d5816 | No circular dependency found | 250 | exit 0, no (file, code) groups | acyclic |
| f | EvaluationSpan into PortSpanEncode (core; measured, never folded) | spike/f.patch | 720a1caf83b870aeb0eb92b719e3d1c35a67452765e27eba04e9289143963bae | No circular dependency found | 250 | exit 0, no (file, code) groups | acyclic; not folded: check-house-style fails ENOENT with the span-key declaration file gone |

## Reading

- Every measured verdict is the one research expected: seven acyclic and `tsc`-clean, three cycles (`b-prime`, `b-double-prime`, `e`). Later plans fold exactly the acyclic ones: `a`, `b`, `c`, `d`, and `e-prime` then `e-prime-fold` for Hydration.
- The file counts agree with research: 251 at the base, 250 after each single fold, 251 after `e-prime` (it removes no file), 250 after `e-prime-fold`.
- `b-prime` and `b-double-prime` close the same edge, `PortSpan.ts` and `PortSpanEncode.ts` (types flow one way, machinery the other), from the two directions. `e` closes `QadiAtoms.ts` and `HydrationEngine.ts`, because `hydrateDecisions(atoms: QadiAtoms, …)` names the atom set that already imports the engine.
- `b-prime` is `tsc`-clean here (declaration placed before its use); research's TS2448/TS2454 on it came from where its patch placed the declaration. The cycle verdict does not depend on it.
- `f` is acyclic and `tsc`-clean, and is not folded (`EvaluationSpan.ts` is the span-key declaration `[span-key-source]` reads, and a merged file would spell the shared key in the declaration). `node scripts/check-house-style.mjs` in that clone throws `ENOENT` opening `packages/core/src/EvaluationSpan.ts` and exits 1, recorded in `spike/out/f.tsc.txt` under `house-style:`.
