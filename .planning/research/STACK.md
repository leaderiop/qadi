# Stack Research: v1.7 Arch Wave 12 (Phases 62-68)

**Domain:** tech-debt resolution in an existing Effect v4 library (no new features)
**Researched:** 2026-11-20
**Confidence:** HIGH. Every behaviour below was either probed with a throwaway file (deleted afterwards; `git status` shows no probe file left) or read from the installed source. Anything not verified is marked **unverified**.

**Bottom line: add no dependency, change no version, add no tool.** The one real finding is a root cause for Phase 62, and it has a fix that needs no pin rewrite (a tsconfig line), plus the rewrite forms the context already planned.

## Installed versions (what the claims are about)

| Tool | Version | Evidence |
|------|---------|----------|
| tstyche | 7.2.5 (npm `latest`; `next` is 8.0.0-beta.0, not evaluated) | `node_modules/tstyche/package.json`; `npm view tstyche dist-tags` |
| TypeScript **tstyche runs on** | 6.0.3 (JS compiler API, fetched into tstyche's store) | `tstyche.json` `"target": "6.0.3"`; run header "uses TypeScript 6.0.3 with ./tsconfig.test.json" |
| TypeScript **the `typecheck` gate runs on** | 7.0.2 native (`tsgo`) patched by `@effect/tsgo` 0.67.5 | `node_modules/.bin/tsc --version` prints `Version 7.0.2+effect-tsgo.0.67.5`; `pnpm-workspace.yaml:32` `typescript: ^7.0.0` |
| @effect/language-service (plugin tstyche loads) | 0.87.5 | `node_modules/@effect/language-service/package.json` |
| effect | 4.1.2 | `node_modules/effect/package.json` |
| vitest / @effect/vitest | 5.1.0 / 4.1.2 | their `package.json` |
| Stryker core / vitest-runner | 10.1.1 / 10.1.1 | their `package.json` |
| Node | engines `>=22.12.0` (local 26.13.0) | `package.json:75` |

Two TypeScripts matter: a `.tst.ts` is judged by 6.0.3 under tstyche and by 7.0.2 under `pnpm typecheck` (`tsconfig.test.json` includes `packages/*/test/**/*.ts`). A pin must hold under both.

---

## 1. Why `expect(f).type.not.toBeCallableWith(args)` passes for any Effect-returning `f` (Phase 62)

### Root cause (HIGH, probed + source)

It is not tstyche's matcher and not the Effect type. It is the **`floatingEffect` diagnostic of `@effect/language-service`**, which tstyche loads because `tsconfig.test.json` (via `tsconfig.base.json` `compilerOptions.plugins`) names the plugin with `"diagnostics": true`.

Mechanism, from `node_modules/tstyche/dist/api.js`:

1. `AbilityLayer.visitExpect` (line ~3488) rewrites `expect(f).type.toBeCallableWith(a)` into the expression statement `;(f)(a)` in an edited copy of the file (`update(expectStart, expectExpressionEnd, ";")` and `erase(expectEnd, matcherNameEnd)`). `toBeConstructableWith` is rewritten to `new(f)(a)` the same way (line ~3508).
2. `Layers.close` (line ~3764) asks the project service for the diagnostics of that edited text, and `AbilityLayer.close` (line ~3412) attaches every one that lands on the matcher or its source to `expectNode.abilityDiagnostics`.
3. `ToBeCallableWith.match` (line 5390-5393) is `isMatch: expectNode.abilityDiagnostics.size === 0`. Any diagnostic at all, of any code, means "not callable".
4. A bare call whose result is an Effect or a Stream is an expression statement that is "neither yielded nor used in an assignment", so the plugin adds `effect(floatingEffect)` to it. That diagnostic is there for valid arguments too.

Consequence: for an Effect or Stream returning subject, `not.toBeCallableWith` is `true` always (vacuous, silent), and the positive `toBeCallableWith` is `false` always (loud, spurious failure).

Probe, same file, default config (`ZzProbe1.tst.ts`, deleted):

| Subject | Pin | Should | Got |
|---------|-----|--------|-----|
| `(n: number) => Effect<number>` | `toBeCallableWith(1)` | pass | **fail** |
| same | `toBeCallableWith("x")` | fail | fail |
| same | `not.toBeCallableWith(1)` | fail | **pass (vacuous)** |
| same | `not.toBeCallableWith("x")` | pass | pass |
| `(n: number) => number` | all four | as stated | all correct |
| `Effect<_, never, Scope>`, `Stream` | `toBeCallableWith(1)` | pass | **fail** |
| `Stream` | `not.toBeCallableWith(1)` | fail | **pass (vacuous)** |
| `Layer`, `Option` returning | positive and negative | as stated | **correct** (not affected) |

So the blind spot affects Effect and Stream subjects only. `PortAccess.tst.ts` and `Qadi.tst.ts:172` already carry a comment naming `effect(floatingEffect)` for `Stream`; `Facade.tst.ts:9` correctly says a `Promise` return is fine. The repo had the cause on three comments but not as a rule.

The positive form does **not** share the silent blind spot: it fails loudly on Effect and Stream, so a positive pin on such a subject can never be green. Consistent with that, no passing positive pin in the suite has an Effect or Stream subject (the suite is green).

### Replacement pin forms: which DO fail when broken (all probed under the default config)

| Form | Holds when true | Fails when broken | Notes |
|------|-----------------|-------------------|-------|
| `expect<Parameters<typeof f>>().type.toBe<[n: number]>()` | yes | **yes** (`Type '[n: number]' is not the same as type '[n: string]'`) | Strongest: states the exact signature. |
| `expect<Parameters<typeof f>[0]>().type.not.toBeAssignableFrom<X>()` | yes | **yes** (flipped to a member of the param type, it failed) | Pins one refused value. Must carry a positive control (`toBeAssignableFrom<ok>`), else a typo passes. |
| `// @ts-expect-error <fragment>` then `void f(bad);` (or `const _x = f(bad); void _x;`) | yes | **yes**, three ways (below) | Pins the exact refusal text. |
| `expect(f).type.toBeCallableWith(args)` positive, **non-Effect/Stream subject** | yes | **yes** | Fine on plain returns, `Layer`, `Option`, `Promise`. |
| `expect(f).type.toBeCallableWith(args)` positive, **Effect/Stream subject** | **never** | n/a | Unusable. |
| `expect(f).type.not.toBeCallableWith(args)`, Effect/Stream subject | always | **never** | The vacuous pin. |
| `expect(C).type.not.toBeConstructableWith(args)` | yes | **yes** for a public constructor (`Expression is constructable with the given arguments`) | Works because a class instance is not an Effect. But it cannot name the reason (below). |

`// @ts-expect-error` inside a `.tst.ts` is **not** plain TypeScript. tstyche 7 erases the directive from the edited text and matches it itself (`SuppressedLayer`, api.js:3587; `SuppressedService.match`, api.js:4300). What I observed:

- **A fragment is required**: `// @ts-expect-error not assignable to parameter of type 'number'`. A bare directive that suppresses something fails with "Directive requires an argument". The fragment is matched as a substring, `...` allowed (api.js:4342).
- **Wrong reason fails**: fragment `expected 2 arguments` against an arity-vs-type mismatch gave "The diagnostic message did not match" and exit code 1; the summary prints `Suppressed: 1 failed`. This is the guard `not.toBeCallableWith` lacks (it accepts any diagnostic).
- **Broken (valid) call fails twice**: tstyche reports `Unused '@ts-expect-error' directive. ts(2578)` and so does `tsc -p` (tsgo reports TS2578). Probed with both a `void`-prefixed and an assigned valid call.
- **Only one error may sit on the line**: a bare `eff("x");` produces two diagnostics (`floatingEffect` and the real TS2345), so tstyche says "Only a single error can be suppressed".
- **Do not write a bare Effect call.** `// @ts-expect-error` does not suppress the plugin's diagnostic under tsgo: `tsc -p` reported `TS377001 ... effect(floatingEffect)` as an **error** on the bare call lines, so `pnpm typecheck` would fail. `void f(bad);` and `const _x = f(bad); void _x;` are clean in both tools (probed; `noUnusedLocals` is satisfied by the `void _x`).

`not.toBeConstructableWith` details (probed with a generic class `Admitted<S extends Src = Src>` with a `private constructor` and a static factory, same shape as Phase 65):

- private constructor, right arguments: `not.toBeConstructableWith` passes; positive form fails with "Constructor of class 'Admitted<S>' is private and only accessible within the class declaration." Both are correct.
- public constructor, right arguments: the negative form **fails** (so it is not vacuous).
- **Reason-blind**: `expect(Open).type.not.toBeConstructableWith("asked")` (public constructor, wrong arity) passes. A negative pin cannot tell "private" from "wrong arguments". For `Admitted`, prefer `// @ts-expect-error is private and only accessible within the class declaration` on a `new Admitted(...)` line with correct arguments (probed: passes when private, fails with TS2578 when the constructor is public). Add `expect(Admitted.admit).type.toBeCallableWith(...)` as the positive control (probed OK; a static method on a class is not an Effect).

### Does a tstyche option, version or matcher fix it without rewriting pins? (report only, nothing upgraded)

**Yes, by configuration of the plugin, not of tstyche.** tstyche has no matcher or option for this: `toBeCallableWith` always counts every diagnostic. Two verified ways to turn the plugin's rule off for the synthesized statement:

1. **A tstyche-only tsconfig** (`tstyche.json` already has a `tsconfig` key; the CLI also accepts `--tsconfig`). A child config that extends `tsconfig.test.json` and **restates the whole `plugins` entry** with `"diagnosticSeverity": { "unstableApiUsage": "off", "floatingEffect": "off" }`. Restating is required because a child's `plugins` array replaces the parent's; the repo's current entry is `tsconfig.base.json` (plugins block, lines ~50-65). Verified: with it, A2, A3, S3, L3, O3 above fail as they should and A1, R1, S1, L1, O1 pass.
2. **A per-file header** `// @effect-diagnostics effect/floatingEffect:off` as the first line of a `.tst.ts` (documented in `node_modules/@effect/language-service/README.md:369`). Verified in the same probe; identical results. 27 files hold the 86 pins, so this is 27 one-line edits, but nothing else about a pin changes.

**Measured effect of route 1 on the existing suite** (a full `tstyche --tsconfig <override>` run, 66 files with my probe file): all 65 real files passed; the only failures were the five deliberate "should fail" tests in my probe. So all 86 `not.toBeCallableWith` pins are **true today** (the functions really do refuse those arguments) and become **able to fail** with no rewrite. Run time was 9 s, the same as the default. This does not clear "wrong reason": a negative pin still passes on any diagnostic, so a pin whose arguments are wrong for an unrelated reason stays green. The flip probe in `_WAVE12-CONTEXT.md` ("81 of 86 fail when turned positive") is consistent with this, and I did not reproduce its 81 (**unverified**: whether 5 pins differ by being multi-line or by something else).

Trade-offs for the planner (decision belongs to Phase 62, which is not locked on mechanism):

| Route | Fixes all 86 at once | Rewrites pins | Risk |
|-------|----------------------|---------------|------|
| Override tsconfig for tstyche | yes | none | The plugin entry is duplicated, so it can drift from `tsconfig.base.json`. A one-line `NOT_CALLABLE_PIN_BUDGET`-style check that the two `diagnosticSeverity` blocks agree apart from `floatingEffect` would remove that. A global switch also means a future pin cannot be vacuous this way, which a per-pin rewrite cannot promise. |
| Per-file header | yes (27 lines) | none | A file added later without the header is vacuous again; needs the same gate. |
| Rewrite pins to `Parameters<F>` / `@ts-expect-error` | per pin | 86 | Strongest per-pin (reason-checked) but the largest diff, and the form most likely to be mis-copied. |

The three are compatible: fix the cause with route 1 or 2, then rewrite only the pins that name no reason where a reason matters. The characterisation `.tst.ts` the context asks for can pin the known-wrong control **only with the plugin rule on**, i.e. in a file that restores it with `// @effect-diagnostics effect/floatingEffect:error` (**unverified**: I did not probe that this directive overrides a project-level `off`; the README says rule-specific comments win over the wildcard, and a project default is plausibly overridden the same way). If route 2 is chosen instead, the characterisation file simply omits the header and asserts the vacuous result.

**What not to do:** do not file an upstream tstyche issue (owner rule), and note it would be the wrong project anyway: the behaviour is tstyche counting a third-party plugin's diagnostics, so any upstream conversation would be with `@effect/language-service`. Do not upgrade to tstyche 8 beta to look for a fix.

---

## 3. Stryker 10.1.1: how mutants are keyed, and `ignoreStatic` (Phases 66, 67, 68)

### Keying

- **Within a run** a mutant is a numeric id Stryker hands out in instrumentation order. It is not stable across edits. The `reports/mutation/mutation.json` ids you archive are only meaningful for the run that wrote them.
- **Across runs** only the incremental feature carries results over, and it keys a mutant by file name, mutator name, **location (line and column) and replacement**, relocating locations through a diff-match-patch of the old and new source (`node_modules/@stryker-mutator/core/dist/src/mutants/incremental-differ.js`, header comment and `mutantToIdentifyingKey`). It is a position key plus a text diff, not a line-text key. A re-wrapped line moves the position, and the differ relocates or drops the mutant.
- **This repo does not use incremental.** `grep` finds no `--incremental` in `package.json` (`mutation` script, line 28), any `stryker*.mjs`, `scripts/` or `.github`. So "Phase 58's mutant ids are archived, so re-wrapping is free" (`_WAVE12-CONTEXT.md`, Phase 68) is correct for a mechanical reason: every `pnpm mutation` run mutates from scratch and nothing reads the old ids. The only cost of re-wrapping is that a before/after comparison harness (XC-05's `NN-mutation-base.json`, compared per file) must compare scores per file, not by mutant id.

### `ignoreStatic: true` (set in `stryker.config.mjs:` `ignoreStatic: true`, ADR-QD-076)

"Static" is decided **dynamically by coverage, not by the syntax of the line**. `mutant-test-planner.js:56` calls `testCoverage.hasStaticCoverage(mutant.id)`, which is true when the mutant's code ran while **no test was active** (i.e. at module import; the instrumenter's coverage object has `{ static, perTest }` buckets, `instrumenter/dist/src/util/syntax-helpers.js:30`). Then (`mutant-test-planner.js:71-90`):

| Coverage of the mutant | `ignoreStatic: true` result |
|------------------------|------------------------------|
| only per-test (ran inside a test) | tested normally, only against the tests that covered it |
| both static and per-test ("hybrid") | **tested**, against its per-test tests only |
| static only (ran at import, never inside a test) | `Ignored`, "Static mutant (and ignoreStatic was enabled)"; it does **not** count against the score |

What that means for Phase 66 (module-scope decoders), from `packages/core/src/UntrustedDecode.ts`:

- `untrustedDecoder(schema, options)` runs `PROJECTION[options.unknownKeys](schema.ast)` and `Schema.decodeUnknownResult(...)` at **build time** (lines ~191-205). Every decoder in `SinkCodec.ts`, the audit files and `HydrationEngine.ts` is built at import, so those build-time mutants (including everything in `EnvelopeKeys.ts` reached from `envelopeKeysOf`) are static-only unless a test also builds a decoder inside an `it`. They show as `Ignored`, and a file can read near 100% with half of it unmeasured. Phase 57 already hit this (`57-RESEARCH.md` Pitfall 5, `.planning/milestones/v1.6-phases/QD-57-*/57-RESEARCH.md:543`).
- The code Phase 66 changes, `project`'s returned function (`UntrustedDecode.ts:166-175`), runs only when `decode` is called, i.e. **inside tests**, so its mutants are per-test and are measured. The build-time lines around it (`project(keysOf)` itself, the `PROJECTION` row) are static-only.
- Phase 57's recipe still applies: build decoders **inside `it` bodies** in the new tests for the derivation and the `ignore` path, and, for evidence that static-only mutants are killed, run once with `ignoreStatic: false` using a config kept **outside the repository** (`56-09-PLAN.md` rule, quoted in 57-RESEARCH). Do not edit `stryker.config.mjs` to flip it.

Phase 67 note (`DecisionCache.ts` eviction guard, `SharedComputation.ts` claim tag): both bodies run inside a test (inside `Effect.sync` and the layer's `onAnswered`), so their mutants are per-test and the two named survivors are real, not static artefacts.

### Restructuring forms, with what each does to the mutant set (reasoned from Stryker's mutators; **unverified by a Stryker run**, because running Stryker is forbidden here)

- `while (HashMap.size(entries) > capacity) { const oldest = Chunk.head(...); if (Option.isSome(oldest)) ... }` has an equivalent mutant because the `if` can never be false. **Do not "fix" it by adding `Chunk.isNonEmpty(insertionOrder) &&` to the loop condition**: the type guard then becomes a left operand that is always true, and Stryker's logical-operator and conditional-expression mutants of it are equivalent again. A restructure with no impossible branch in the source is what D5 asks for. Candidates that have no branch to mutate: thread a `NonEmptyChunk` and use `Chunk.headNonEmpty` (exists in 4.1.2, `Chunk.d.ts:2069`, with `isNonEmpty` at `:1997`), or fold the eviction through an `Option` combinator so the branch lives in the library, not the source. Pick by the type that `HashMap`/`Chunk` can actually give without `as` (house rule).
- `Match.tagsExhaustive` on `{_tag: "Hit"|"Claimed"|"Joined"}` fixes the `"Claimed"` string-literal survivor. Probed at runtime in effect 4.1.2: an unmatched tag **throws** `Error effect/match/Match/exhaustive: absurd`, so a mutated tag becomes a defect that fails the test that claimed. Because `A` and `E` are generic inside `run`, the matcher cannot be hoisted to module scope with `Match.type`; use `Match.value(claimed).pipe(Match.tagsExhaustive({...}))` per call. `AGENTS.md` §5a measured `Match.value` at 3.5-7.7x a `switch` per dispatch; this runs once per cache ask, not per policy node, so it needs no benchmark but should be named in the CCR row (**unverified**: not benchmarked).

---

## 4. `AggregateError` and `throw` in devtools model code (Phase 64)

- **Available, no setup.** `tsconfig.base.json` has `lib: ["ESNext"]`, `target: "ESNext"`; `tsconfig.react-base.json` (what `@qadi/devtools` extends via `packages/devtools/tsconfig.src.json`) has `lib: ["ESNext", "DOM"]`. Probed with tsgo 7.0.2: a file using `new AggregateError(errors, "msg")` and `e.errors` compiled clean under **both** the devtools config and plain `tsconfig.base.json`. Runtime: `engines.node >=22.12.0`; `new AggregateError([a, b], "m")` gives `name === "AggregateError"`, `errors.length === 2` on the local Node 26.13.0 (AggregateError has been in Node since 15 and in all evergreen browsers; the dock is a browser panel, **unverified** for old browsers, which the repo does not target).
- **No existing use**: `grep AggregateError packages/*/src packages/*/test` is empty. It is a new idiom here, a platform feature, not a new dependency.
- **House rules allow `throw` in devtools model code.** `AGENTS.md` §6 forbids `async`/`await`, `Promise`, ambient `console`/`process.env`/`Date`, `as`/`any`/`!`, `Effect.either`, `switch` on `_tag`; §4 forbids `Effect.orDie` "in evaluation or enforcement paths". None forbids `throw`. `.oxlintrc.json` turns on no throw rule, and `scripts/check-house-style.mjs` has no throw rule (its only hit is a comment). Existing devtools `throw`s: `packages/devtools/src/model/Source.ts:143` (`new Error`, construction guard), `PortCalls.ts:194`, `Timeline.ts:85`, and a **rethrow** `throw error` at `react/useScoped.ts:32`. D1's "one error rethrown as-is, several as one `AggregateError`" is a rethrow plus a throw of a built-in; both are within the house rules. `ExternalStore.ts` is plain synchronous code with no Effect in it, so Effect's `Cause` is not in play there.
- Phase 64 mechanics to keep in mind (read from `ExternalStore.ts:34-47`): `listeners` is a `Set`, and `notify` iterates it live, so an unsubscribe during notify mutates the set being iterated. A `Set` iteration is defined for deletion of a visited or unvisited element (a deleted unvisited element is simply not visited), and an element added during iteration **is** visited. If the new RED test "unsubscribe during notify still safe" is meant to keep today's semantics, iterate the same set; if D1's implementation snapshots (`[...listeners]`) first, a listener removed mid-notify would still be called once. Decide that deliberately and pin it; this is not a library bug.

---

## 5. TS private constructor + static factory on a generic class under `verbatimModuleSyntax` and declaration emit (Phase 65)

Probed with a throwaway copy of `Admission.ts` (private constructor, `static admit<S extends RowSource>(question, rowSource: S): Result<Admitted<S>, PolicyTooDeep>` holding the `new Admitted(...)`, and `export const admit = Admitted.admit;`) plus a consumer file shaped like `Walk.ts` (`admit(question, "asked")`, a function annotated `Admitted<"asked">`, an `import type { Admitted }`), emitted with `tsc --emitDeclarationOnly` under the real `tsconfig.base.json` options (`declaration`, `verbatimModuleSyntax`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`):

- **No diagnostics, no TS2883.** Emitted: `private constructor();`, `static admit<S extends RowSource>(question: Question, rowSource: S): Result.Result<Admitted<S>, PolicyTooDeep>;` and `export declare const admit: typeof Admitted.admit;`. The consumer's inferred return type printed as `Result<Admitted<"asked">, PolicyTooDeep>` with `import("effect/Result")` and `import("./Errors.ts").PolicyTooDeep` inlined, so nothing unnameable.
- **The generic survives the alias.** `typeof Admitted.admit` keeps the `S extends RowSource` signature, so `admit(question, "asked")` still returns `Admitted<"asked">` and `Walk.ts:878` needs no edit.
- **Unbound static is safe here** because the body names `Admitted` and never `this`. If the factory ever used `this.x`, `export const admit = Admitted.admit` would break at runtime and no compiler rule would say so. Name it in the doc comment or write `export const admit = <S extends RowSource>(q, s: S) => Admitted.admit(q, s)` only if that is wanted; the alias form is what the context fixes.
- **Non-exported `SuppliedBy`** appears in the class's public `supplied: SuppliedBy[Source]`. Emit is fine today (TS declares it locally with `export {}`); the change does not alter that.
- **`oxlint`** run on the probe: no findings. **`scripts/check-house-style.mjs`** run on the probe: two findings, both of mine and neither a rule against the shape: `[no-type-assertion]` on an `as` I used in the probe, and `[admission-once]` because the probe file was not named `Admission.ts`. The gate `ADMISSION_ALLOWED` (`check-house-style.mjs:587`) counts `new PolicyTooDeep` in `packages/core/src/Admission.ts` and expects exactly **1**; moving `admit` into the class keeps it at 1, so no budget edit is needed as long as the construction is not duplicated.
- **Pin it with the probed forms in section 1**: `// @ts-expect-error is private and only accessible within the class declaration` on a `new Admitted(...)` line with correct arguments, in a `.tst.ts` or a `.test.ts`. `new Admitted` in a `.tst.ts` is compiled by tsgo too, and the message text is TS's; if tsgo and 6.0.3 word it differently, the fragment must be a substring of both. I only observed the 6.0.3 wording (`Constructor of class 'Admitted<S>' is private and only accessible within the class declaration.`); tsgo reported only TS2578 for the broken case, so **unverified** whether its text is identical. Use a short fragment such as `is private`.

---

## What NOT to add

| Avoid | Why | Use instead |
|-------|-----|-------------|
| Any new dependency (tstyche plugin, `expect-type`, `tsd`, an `aggregate-error` package, a Stryker plugin) | Every phase is expressible in what is installed; `AggregateError` is built in. | Existing tstyche + the plugin config above. |
| `not.toBeCallableWith` on an Effect- or Stream-returning subject, positive `toBeCallableWith` on one | Vacuous / always-failing under the default config (probed). | `Parameters<F>` pins, `@ts-expect-error <fragment>`, or fix the cause (section 1). |
| A bare `// @ts-expect-error` (no fragment) in a `.tst.ts` | tstyche refuses it ("Directive requires an argument"). | Always give a message fragment. |
| A bare Effect call under `@ts-expect-error` | Two diagnostics (tstyche) and an unsuppressed `TS377001` error (tsgo). | `void f(bad);` or `const _x = f(bad); void _x;`. |
| `not.toBeConstructableWith` as the only pin for a private constructor | Reason-blind: a public constructor with wrong arity also passes. | `@ts-expect-error is private ...` plus a positive control on the static factory. |
| `// Stryker disable` comments | D5; none exist in `packages/*/src`; `stryker.config.mjs` says "no ignore list". | Restructure so no equivalent mutant exists. |
| Editing `stryker.config.mjs` to set `ignoreStatic: false`, or enabling `--incremental` | ADR-QD-076 fixed it for all six configs; the evidence run belongs in a scratch config outside the repo. | Decoders built inside `it` bodies; an out-of-repo evidence config. |
| `Chunk.isNonEmpty(...) &&` added to the eviction loop condition | Re-creates an equivalent mutant on an always-true operand. | A structure with no impossible branch (section 3). |
| `switch` for the `Claimed`/`Hit`/`Joined` dispatch | `SharedComputation.ts` is not in `SWITCH_BUDGET`; a new `switch` fails the gate. | `Match.value(...).pipe(Match.tagsExhaustive({...}))`. |
| `node scripts/next-id.mjs`, `pnpm check`, running Stryker during research | Reservation file / forbidden for this research run. | The reserved block in `_WAVE12-CONTEXT.md`. |
| Upgrading tstyche (`next` is 8.0.0-beta.0), TypeScript, effect, Stryker | Out of scope; no fix there was evidenced. | Stay on the installed versions. |

## Alternatives considered

| Category | Recommended | Alternative | Why not |
|----------|-------------|-------------|---------|
| Make `not.toBeCallableWith` honest | Turn `floatingEffect` off for tstyche only (tsconfig override or file header) | Rewrite all 86 pins | Larger diff, same truth; keep rewrites for pins that need a reason. |
| Pin "this is refused" | `@ts-expect-error <fragment>` on `void f(bad)` | `not.toBeCallableWith` | Reason-blind; the fragment checks why. |
| Pin an exact signature | `Parameters<F>` + `toBe` | `toBeCallableWith` | Never usable on Effect/Stream subjects. |
| Aggregate several listener errors | built-in `AggregateError` | `Cause`/`Effect` aggregation | `ExternalStore` is synchronous non-Effect code; the owner chose `AggregateError` (D1). |
| Prove a private constructor | `@ts-expect-error` fragment | `not.toBeConstructableWith` | Reason-blind (above). |

## Version compatibility

| Pair | Note |
|------|------|
| tstyche 7.2.5 target 6.0.3 vs `pnpm typecheck` TS 7.0.2 tsgo | A `.tst.ts` is checked by both. Fragments must match 6.0.3's wording (tstyche) and compile clean under 7.0.2 (TS2578 for an unused directive is reported by both). The plugin is loaded in both, as the JS plugin (6.0.3) and as the `effect-tsgo` patch (7.0.2); `floatingEffect` fires in both (TS377001 under tsgo). |
| `@effect/language-service` 0.87.5 `diagnosticSeverity` | Read by tstyche's project service from the tsconfig; a child tsconfig's `plugins` replaces, not merges. |
| Stryker 10.1.1 + `typescript ^7` | Already handled: `tsconfigFile: "tsconfig.stryker-disabled.json"` (a path that does not exist, because `ts.parseConfigFileTextToJson` is gone in TS 7). Do not "fix" it. |

## Installation

None. This milestone installs and upgrades nothing.

## Sources

- `node_modules/tstyche/dist/api.js` lines 3404-3530 (`AbilityLayer`), 3587-3666 (`SuppressedLayer`), 3747-3787 (`Layers`), 4281-4358 (`SuppressedService`), 5370-5422 (`ToBeCallableWith`, `ToBeConstructableWith`). HIGH (read, then confirmed by probe).
- `node_modules/@effect/language-service/README.md:369-395` (diagnostic directives and `diagnosticSeverity`). HIGH.
- `node_modules/@stryker-mutator/core/dist/src/mutants/{incremental-differ.js,mutant-test-planner.js,test-coverage.js}`, `instrumenter/dist/src/util/syntax-helpers.js:30`. HIGH (read; no Stryker run, which is forbidden).
- Probes (all deleted; `git status` shows no `Zz*` file or probe tsconfig): tstyche on `.tst.ts` files under `packages/core/test/` with the default config, with `--tsconfig <override>`, and with the file directive; the full tstyche suite under the override; `tsc -p` (tsgo 7.0.2) on a probe `.tst.ts`; `tsc --emitDeclarationOnly` on a copy of `Admission.ts`; `tsc -p` on an `AggregateError` file under two configs; a Node script for `Match.tagsExhaustive`'s unmatched-tag behaviour. HIGH.
- Repo: `tstyche.json`, `tsconfig.base.json`, `tsconfig.react-base.json`, `tsconfig.test.json`, `stryker.config.mjs`, `.oxlintrc.json`, `scripts/check-house-style.mjs:587`, `packages/core/src/Admission.ts`, `UntrustedDecode.ts`, `DecisionCache.ts:270-290`, `SharedComputation.ts:296-335`, `packages/devtools/src/model/ExternalStore.ts`, `packages/core/test/{Qadi,DecisionLog}.tst.ts`, `packages/promise/test/Facade.tst.ts`. HIGH.
- Not consulted online: tstyche 8 beta release notes (**unverified**). npm registry used only for dist-tags.

---
*Stack research for: v1.7 Arch Wave 12 (Phases 62-68)*
*Researched: 2026-11-20*
