# Phase 62: Type pins that can fail - Research

**Researched:** 2026-11-20
**Domain:** tstyche 7.2.5 (on TypeScript 6.0.3) type-level tests, `@effect/language-service` 0.87.5 diagnostics, the repo's house-style and merge-gate scripts
**Confidence:** HIGH (every behavioural claim below was probed in this session; probe output is quoted)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Carried forward (locked before this discussion)**
- **D6 (milestone, `_WAVE12-CONTEXT.md`):** fix the cause, the pins and the gate:
  - A tstyche-only tsconfig turns `floatingEffect` off. It is a child of `tsconfig.test.json`, wired through `tstyche.json`.
  - `DecisionLog.tst.ts:30` is still rewritten through `Parameters<…>`.
  - The 11 uncontrolled pins get a control.
  - `NOT_CALLABLE_PIN_BUDGET` is added.
- **PIN-02:** a check fails when the tstyche tsconfig's Effect plugin settings drift from `tsconfig.base.json`'s,
  apart from `floatingEffect`. TypeScript's `extends` replaces `compilerOptions.plugins` wholesale, so the child
  tsconfig must restate the whole `@effect/language-service` entry.
- **Numbering:** ARCH-109, ADR-QD-175, CCR-QD-453, BEH-QD-646–650 and INV-QD-369–370, all reserved.
  - Never run `node scripts/next-id.mjs`.
  - Name any unused reservation "Unused" in the CCR-QD-453 row.

**Characterisation file**
- **D-01:** The characterisation pins both halves of PIN-01 as executed, green tests.
  - **Config half.** Under the tstyche config, positive pins on the Effect and Stream subjects pass for valid
    arguments. The negative pin on the same valid arguments is marked `// @tstyche fixme`. That means it must fail,
    and tstyche fails the run if it ever passes: "The 'expect()' was supposed to fail, but it passed",
    `node_modules/tstyche/dist/api.js` ~5672-5726.
  - **Rule-on half.** With `floatingEffect` on, the negative pin on valid arguments passes. This is the known-wrong
    control, so an upgrade that changes the behaviour is noticed.
  - **Mechanism for the rule-on half.**
    - **Primary:** the in-file directive `// @effect-diagnostics effect/floatingEffect:error`. It is position-based;
      see `node_modules/@effect/language-service/README.md`, "Configuring diagnostics". Whether it can re-enable a
      rule the project config turned off is unverified, so probe it first.
    - **Fallback (owner's choice):** a second tstyche run in step 6, under the unchanged `tsconfig.test.json`, on a
      fixture the main run excludes. The step 6 command, the DoD table row and its step-6 paragraph then change
      together. This is gate 11, `node scripts/check-dod-table.mjs`.
    - **Interaction with D-07.** D-07 makes a rule-on pass part of step 6 regardless. So the planner may put the
      rule-on half in a fixture that only that pass runs, giving two files (one per pass, each excluded from the
      other), instead of depending on the directive. Either way, each half runs in exactly one pass.
- **D-02:** The subjects are synthetic local declarations: `declare const` functions returning
  `Effect.Effect<number>` and `Stream.Stream<number>`, plus a plain-return control. The file pins tool behaviour, not
  API; `DecisionLog.tst.ts` stays the real-world case.
- **D-03:** The constructor form is covered too. A synthetic construct signature that returns an Effect,
  `declare const C: new (n: number) => Effect.Effect<number>`, is pinned with `toBeConstructableWith` under both
  settings.

**Existing workaround pins**
- **D-04:** These pins stay as they are:
  - the 12 `Params<F>` pins, in `DecisionCache.tst.ts`, `PortAccess.tst.ts` and `DiagnosticsStore.tst.ts`;
  - the `Parameters<…>` pins, at `Qadi.tst.ts` ~:170-180 and `DecisionStream.tst.ts` ~:49-56.

  Their explanatory comments are reworded so they are true under the new config. The new text says that
  `floatingEffect` is off under tstyche's own tsconfig, and that the form stays because it states the reason through
  the parameter type and so does not depend on that config. Comments to reword:
  - the `DecisionCache.tst.ts` header (~:9-13)
  - `PortAccess.tst.ts` ~:31-36
  - `DiagnosticsStore.tst.ts:21-26`
  - `Qadi.tst.ts:171-174`
  - `DecisionStream.tst.ts` ~:49-52

  `Facade.tst.ts:9-10` stays true, since a Promise is not a floating Effect. Re-grep `floating|vacuous` in
  `*.tst.ts` to confirm the set.
- **D-05:** The rule stays and is written into AGENTS.md §6. A bare negative pin is allowed only on a plain-return
  subject. A pin on an Effect- or Stream-returning subject states its reason through the parameter type, so no pin's
  honesty depends on the tstyche config. This is the same principle as D6's DecisionLog rewrite.
- **D-06:** AGENTS.md names both parameter-type forms:
  - `Params<F>` for a whole-call refusal: `expect<Params<typeof f>>().type.not.toBeCallableWith(…)`.
  - `Parameters<typeof f>[i]` with `not.toBeAssignableTo` for a single parameter.

  The three local one-line `Params<F>` copies stay beside the comments that explain them. No shared helper is added:
  test helpers are not exported across packages.

**Budget gate (`NOT_CALLABLE_PIN_BUDGET`)**
- **D-07:** The gate checks exact per-file counts in both directions, with its own walk and an AGENTS.md §6
  paragraph and table that it checks the way `[untrusted-decode-table]` checks §7a. On top of that it machine-checks
  the plain-return rule in two parts:
  1. **Control check.** `scripts/check-house-style.mjs` requires, for every negative pin, a positive pin on the same
     subject text in the same file: callable for callable, constructable for constructable.
  2. **Rule-on pass.** Step 6 also runs the suite once with `floatingEffect` on, under `tsconfig.test.json`. There, a
     positive pin on an Effect or Stream subject fails for any arguments, so a bare negative pin on such a subject
     cannot have a passing control.
     - Files whose meaning depends on the rule being off, such as the characterisation config half, are excluded from
       that pass, and the reverse holds for the rule-on half.
     - A consequence: positive pins on Effect or Stream subjects must also go through the parameter type, as the
       existing `Params<F>` positives already do. The suite is fully green with the rule on today, which is the
       current config.

  Accepted cost: about 8 s more in step 6. One full run measured 8.4 s on 2026-11-20 (65 files, 343 tests, 737
  assertions). The step 6 command, the DoD table row and its paragraph change together (gate 11).
- **D-08:** The budget covers both negative forms that tstyche builds a call for, `not.toBeCallableWith` and
  `not.toBeConstructableWith`, counted separately per file.
  - The 7 negative constructor pins in `Decision.tst.ts` join: lines 31, 32, 36, 37, 42, 46 and 47, with controls at
    27 and 41.
  - The name stays `NOT_CALLABLE_PIN_BUDGET`, as in PIN-05; its AGENTS.md paragraph and table say it covers `new`.
  - The control check and the rule-on pass apply to both forms.
- **D-09:** The walk scans every file tstyche runs, not just `packages/*/test`.
  - It uses tstyche's own `testFileMatch` outside `node_modules`. The default is `**/*.tst.*`,
    `**/__typetests__/*.test.*` and `**/typetests/*.test.*` (`node_modules/tstyche/dist/api.js` ~1635).
  - The gate fails if the walk finds zero files.
  - It needs its own walk because `collect()` (`scripts/check-house-style.mjs:876-889`) deliberately skips
    `.tst.ts` (:871, :889).

**Proof every pin can fail**
- **D-10:** A one-off flip sweep.
  - In a scratch copy, every remaining negative pin, callable and constructor, is flipped to its positive form, and
    tstyche runs under the new config. Every flipped pin must fail.
  - Per-pin results are recorded in the phase directory beside the PIN-04 classification table.
  - The working tree is left as found.
  - It is not a committed script or a gate; durability comes from D-07 and the characterisation.
  - Under the old setting the flip was not a valid oracle: Probe 2 flipped all 81 and they all failed, the vacuous
    pin included. With `floatingEffect` off, it is valid.
- **D-11:** The sweep's oracle is strict. Each flipped pin must fail with a TypeScript compiler argument or overload
  diagnostic, such as TS2345, TS2353, TS2554 or TS2769, recorded per pin. A failure from any other source fails the
  sweep: a language-service diagnostic, or a missing import.

### Claude's Discretion
- **Names and locations:** the tstyche tsconfig (for example `tsconfig.tstyche.json`) and the characterisation
  file(s).
- **The PIN-02 drift check:** where it lives (likely a named rule in `scripts/check-house-style.mjs`) and its exact
  comparison. The intended comparison is the whole `@effect/language-service` entry, with only
  `diagnosticSeverity.floatingEffect` allowed to differ.
- **How step 6 runs its two passes:** the `test:tstyche` body, tstyche CLI flags and exclusions. Both passes must live
  inside step 6, and gate 11 must stay green.
- **The control check's details:** how "same subject text" is matched for `expect(x)` and `expect<T>()` subjects, and
  the budget's per-file record shape (separate callable and constructable counts).
- **The PIN-04 classification table's format:** subject, declared return, form, control line.
- **Records:**
  - A new ADR-QD-175 for the tstyche config and the budget, following the budget ADR precedents: ADR-QD-055,
    ADR-QD-073, ADR-QD-094 and ADR-QD-123.
  - And/or a revision of ADR-QD-037, which made tstyche a gate.
  - Whether a BEH or INV entry is warranted.
  - Unused reservations named in the CCR row.
- **The characterisation file's header:** the tool versions (tstyche 7.2.5 on TypeScript 6.0.3;
  `@effect/language-service` 0.87.5), the repro, and what to do when an upgrade flips the rule-on half (revisit the
  tstyche config, the drift check and the rule-on pass).
- **Overloads:** `Params<F>` and `Parameters<F>` read only the last overload. The AGENTS.md paragraph notes this if any
  pinned subject is overloaded.
- **Showing each new check fail once:**
  - the budget, on an added, a removed, a commented and a line-split pin (PIN-05);
  - the control check;
  - the rule-on pass;
  - the drift check;
  - the DecisionLog rewrite, with `environment` made optional (PIN-03).

### Deferred Ideas (OUT OF SCOPE)
- **An upstream tstyche or `@effect/language-service` issue** about the synthesized call reading as "not callable".
  It is not filed without the owner's explicit OK; the repro goes in the characterisation file's header.
- **A discipline for `@ts-expect-error` pins in `.tst.ts`.** These can be satisfied by the wrong error (PITFALLS P2),
  so they could get a message fragment or a budget. This is a later phase. Phase 65 adds one such pin, and tstyche
  already reports matched suppressions.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIN-01 | Characterisation `.tst.ts` pins tstyche's behaviour with the rule on and off | Probe 1 (section "Probe results"): directive re-enables the rule mid-file, so ONE file holds both halves; `fixme` semantics verified; `--skip` keeps the config half out of the rule-on pass |
| PIN-02 | tstyche runs under a tsconfig with `floatingEffect` off; all `*.tst.ts` green; drift check | `tsconfig.tstyche.json` child verified green on 65/65 files; `extends` replaces `plugins` wholesale (verified); drift-check design + working prototype |
| PIN-03 | `DecisionLog.tst.ts:30` states its reason; shown failing when `environment` optional | `Parameters<typeof makeDecisionLog>[0]` + `not.toBeAssignableTo` probed: green on the real signature, red on an optional-`environment` signature, and independent of the config |
| PIN-04 | 11 uncontrolled pins get a control; classification of 81 pins recorded | The 11 reproduced exactly by a same-text matcher; subjects classified by return type (only `makeDecisionLog` returns an Effect) |
| PIN-05 | `NOT_CALLABLE_PIN_BUDGET`, own walk, both directions, AGENTS.md table, shown failing four ways | Token counting verified (81 callable + 7 constructor in 28 files); walk = tstyche's file list (verified identical); table-header collision found and a distinct header proposed |
| WX-01..WX-07 | Cross-cutting | Gate 11 blast radius measured (70 drifts for a naive `&&`, 0 for a one-command script); records precedents; Stryker/coverage scope confirmed empty for this phase |
</phase_requirements>

## Summary

The directive question that the milestone flagged as its top risk resolves in the planner's favour. `// @effect-diagnostics effect/floatingEffect:error` (and the unprefixed `floatingEffect:error`) re-enables the rule from that line down, even when the project tsconfig sets it `"off"`. So the characterisation is **one file**: a config half above the directive (run under the new tsconfig, negative pins marked `// @tstyche fixme`) and a rule-on half below it (the known-wrong negative pins pass). The `-next-line` form does not work (tstyche reports `has no effect ... ts(-1)`), as the milestone research said. The fallback of a second fixture is not needed for the rule-on half.

The rule-on pass (D-07) is best wired as `tstyche --tsconfig tsconfig.test.json --skip <token>`, where `<token>` is a substring of the config-half `describe` title. tstyche's `testFileMatch` has no negation, `--skip` is a case-insensitive substring match on describe/test names, and it fails closed (rename the title and the skipped fixme pins run and fail). The two passes cost 8.28 s and 8.34 s wall time and both are green on all 65 current files.

The one real surprise is gate 11. `check-dod-table.mjs` expands `pnpm test:tstyche` recursively and splits on `&&`, so `"test:tstyche": "tstyche && tstyche --tsconfig ..."` makes step 6 two steps and renumbers every later step: measured at **70 drifts** in a scratch copy. A one-command script (`node scripts/run-tstyche.mjs`) keeps the count at 25 and needs exactly three text edits (the DoD row, the DoD step-6 paragraph, the ADR-037 heading), after which gate 11 passes (`25 step(s) match pnpm check, 150 reference(s) resolve`). This adds one file under `scripts/` that CONTEXT's file list does not name; it is inside "how step 6 runs its two passes" (Claude's discretion) but the planner should surface it.

**Primary recommendation:** Build in this order: characterisation file (one file, directive + fixme), `tsconfig.tstyche.json` + `tstyche.json`, rewrites and controls package by package, the budget/control/drift rules in `check-house-style.mjs`, then `scripts/run-tstyche.mjs` with the DoD/ADR text edits, and the records last. Adding the budget before the controls turns every intermediate commit red.

## Probe results (evidence for the planner)

All probes were run with `npx tstyche … < /dev/null` against tstyche 7.2.5 / TypeScript 6.0.3 in a scratch directory and scratch tsconfigs; every probe file and tsconfig was deleted afterwards (`git status --short` is as found).

### P1. A file outside the tsconfig's `include` silently runs under tstyche's "baseline TSConfig"

The first probe, placed in a scratch directory outside `packages/*/test/**`, printed `uses TypeScript 6.0.3 with baseline TSConfig` and showed the rule **off** even under the old config. tstyche only applies the configured tsconfig to a file that tsconfig's `include` selects (`node_modules/tstyche/dist/api.js:4201-4204`: `fileNames.includes(filePath)`; `:4237-4240`: `? () => this.#projectConfig.specifier : () => undefined`, and `:4244` falls back to `{ kind: 1, specifier: "baseline" }`). A real file prints `uses TypeScript 6.0.3 with ./tsconfig.test.json` [VERIFIED: probe output]. **Every scratch, RED and sweep file in this phase must live under `packages/*/test/**` (or in a probe tsconfig with its own `include`), and the line after `TSTyche 7.2.5 at ...` must name the intended tsconfig, not `baseline`.**

### P2. The directive re-enables the rule below it (D-01 primary mechanism works)

Probe tsconfig: a child of `tsconfig.test.json` that restates the full plugin entry with `"diagnosticSeverity": { "unstableApiUsage": "off", "floatingEffect": "off" }`, `include` narrowed to the probe directory. Subjects: `declare const f: (n: number) => Effect.Effect<number>`, `declare const s: (n: number) => Stream.Stream<number>`, `declare const C: new (n: number) => Effect.Effect<number>`, `declare const p: (n: number) => number`. Same eight pins above and below `// @effect-diagnostics effect/floatingEffect:error`.

| Pin | Above the directive, rule off | Below the directive |
|-----|------------------------------|---------------------|
| `expect(f).type.not.toBeCallableWith(1)` | FAILS ("Expression is callable with the given argument.") | passes |
| `expect(s).type.not.toBeCallableWith(1)` | FAILS | passes |
| `expect(C).type.not.toBeConstructableWith(1)` | FAILS ("... is constructable ...") | passes |
| `expect(f).type.toBeCallableWith(1)` | passes | FAILS ("Expression is not callable ...") |
| `expect(s).type.toBeCallableWith(1)` | passes | FAILS |
| `expect(C).type.toBeConstructableWith(1)` | passes | FAILS ("... is not constructable ...") |
| `expect(p).type.not.toBeCallableWith(1)` (plain return) | FAILS (correct) | (not probed) |

The unprefixed `// @effect-diagnostics floatingEffect:error` behaves identically [VERIFIED: probe output]. `// @effect-diagnostics-next-line effect/floatingEffect:error` does not: `Error: @effect-diagnostics-next-line floatingEffect:error has no effect, make sure you are suppressing the right rule. ts(-1)` [VERIFIED: probe output]. The README documents the position-based form and its `off`-then-`error` use [CITED: node_modules/@effect/language-service/README.md "Configuring diagnostics", lines 365-373].

Under the **old** config (rule on, `tsconfig.test.json`) the same file shows the vacuous state: the three bare negatives on `f`/`s`/`C` pass for valid arguments and the three positives fail [VERIFIED: probe output]. That is the rule-on half's "known-wrong" behaviour, and it also confirms D-03 (the constructor form is affected identically).

### P3. `// @tstyche fixme` behaves as CONTEXT says

Rule off, three fixme'd negatives on valid arguments: `pass`, summary `Assertions: 3 passed, 3 fixme, 6 total`. Rule on (same file): three errors `The 'expect()' was supposed to fail, but it passed. Consider removing the '// @tstyche fixme' directive.` and exit code 1 [VERIFIED: probe output]. The fixme'd expects are counted as `fixme`, not `passed`.

### P4. `--skip` excludes a `describe` by title and fails closed

`tstyche --tsconfig <rule-on> --skip "tool behaviour" <dir>` skipped the three tests under two `describe("tool behaviour: …")` blocks and ran the unrelated file: `Tests: 1 passed, 3 skipped, 4 total` [VERIFIED: probe output]. Source: `node_modules/tstyche/dist/api.js:5758`, `node.name.toLowerCase().includes(this.#resolvedConfig.skip.toLowerCase())`. Without `--skip`, the same file under the rule-on tsconfig fails (3 positives fail with `effect(floatingEffect)` text, 3 fixme pins "supposed to fail, but it passed") [VERIFIED: probe output].

### P5. Both passes are green on all 65 files, 8.3 s each

| Pass | Command | Result | Wall time |
|------|---------|--------|-----------|
| Main (rule off) | `npx tstyche --tsconfig <new child tsconfig> packages/` | `Test files: 65 passed, 65 total`, `Tests: 343 passed`, `Assertions: 737 passed`, `Suppressed: 55 matched, 55 total` | `real 8.28` |
| Rule-on | `npx tstyche --tsconfig tsconfig.test.json packages/` | identical counts | `real 8.34` |

[VERIFIED: probe output]. Accepted cost matches D-07 (about +8 s).

### P6. `extends` replaces `compilerOptions.plugins` wholesale

`tsc --showConfig` (TypeScript 6.0.3 from tstyche's store) on a child that restates only `{ "name": "@effect/language-service", "diagnosticSeverity": { "floatingEffect": "off" } }` prints `[{"name":"@effect/language-service","diagnosticSeverity":{"floatingEffect":"off"}}]`: every other setting of the base entry is gone. On a child that restates the full entry the printed `include` is inherited unchanged (`["packages/*/src/**/*.ts", …, "packages/*/test/**/*.ts", …]`) [VERIFIED: probe output]. The chain `tsconfig.test.json` → `tsconfig.react-base.json` → `tsconfig.base.json` defines `plugins` only in `tsconfig.base.json:60` (the `"plugins": [ { "name": "@effect/language-service", … } ]` entry) [VERIFIED: tsconfig.base.json read this session].

### P7. The flip sweep is feasible and gives exact TypeScript codes (D-10, D-11)

tstyche's own text output **drops the primary diagnostic's code** (only `related` diagnostics print `ts(6500)`; `api.js:5318-5325` builds the failure diagnostic with `.add({ related })` and no `code`). A custom reporter does not have that limit: for an `expect:fail` event, `payload.result.expect.abilityDiagnostics` is the raw `Set<ts.Diagnostic>` with `.code` (`node_modules/tstyche/dist/api.d.ts:61`, `:524-526`), and `--reporters file:///abs/path/reporter.mjs` loads a default-exported class (`api.js:6011-6013`). A 15-line scratch reporter (`SweepReporter` printing `{file, line, matcher, not, event, diags:[{code,source,msg}]}` per assertion; line from `matcherNameNode.name`) gives per-pin attribution.

Dry run on the current tree, under the new tsconfig, with every negative pin in all 28 files flipped to positive in `zz62-flip-*.tst.ts` copies placed beside the originals (same relative imports): **88 flipped pins (81 callable + 7 constructor), 88 failed, 0 passed, 0 failed without a diagnostic, and every negative pin's `file:line` matched a failing flipped row.** Code histogram over the failures: `ts:2322` ×47, `ts:2345` ×33, `ts:2554` ×10, `ts:2353` ×5, `ts:2559` ×2, `ts:2375` ×2, `ts:2379` ×3. No `effect` diagnostic (code 3), no 2304/2307/2339 [VERIFIED: probe output]. The allowed set therefore has to be wider than D-11's "such as" list: TS2322 is the most common code (an object-literal argument is elaborated to the property), and TS2375/2379 come from `exactOptionalPropertyTypes`.

Under the **rule-on** config the flipped `DecisionLog.tst.ts:30` carries two diagnostics: `{"code":3,"msg":"This Effect value is neither yielded nor used in an assignme…"}` (the Effect language service's `floatingEffect`) and `{"code":2345,…}`. Under the new tsconfig only `{"code":2345}` remains [VERIFIED: probe output]. So "any diagnostic with code 3 or `msg` containing `effect(`" is the language-service signature the oracle must reject.

### P8. The DecisionLog rewrite (PIN-03) holds under both configs and fails on an optional `environment`

Scratch test in `packages/core/test/`:

```ts
type Options = Parameters<typeof makeDecisionLog>[0];
expect(makeDecisionLog({ environment: "Server" })).type.toBe<Effect.Effect<DecisionLog>>();
expect<{ readonly environment: string }>().type.toBeAssignableTo<Options>();      // control
expect<{ readonly capacity: number }>().type.not.toBeAssignableTo<Options>();     // the pin
```

On the real signature (`makeDecisionLog = (options: { readonly environment: string; readonly capacity?: number }): Effect.Effect<DecisionLog>`, `packages/core/src/DecisionLog.ts:188-192`) it passes. Against a local `(options: { readonly environment?: string; readonly capacity?: number }) => Effect.Effect<DecisionLog>` it fails with `Type '{ readonly capacity: number; }' is assignable to type '{ readonly environment?: string; readonly capacity?: number; }'.` Under the rule-on config it fails identically. The **original** bare pin `expect(makeOptional).type.not.toBeCallableWith({ capacity: 10 })` against the optional signature FAILS under the new tsconfig ("Expression is callable with the given argument.") and PASSES (vacuous) under the rule-on config [VERIFIED: probe output]. This shows both halves of D6 independently: the config makes the old form honest, and the rewrite makes it config-independent. The real RED evidence for PIN-03 is the executor's transient `environment?: string` edit to `DecisionLog.ts` (restored with `git checkout`); the scratch probe above is the pre-check. Note the rewritten line is no longer a `not.toBeCallableWith`, so it leaves the budget (`DecisionLog.tst.ts` has no other negative callable pin).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Type-level pin execution (tstyche) | Dev tooling: `tstyche.json` + `tsconfig.tstyche.json` | `scripts/run-tstyche.mjs` (two passes) | Pure compile-time check; no runtime or package tier is involved |
| Budget, control check, drift check | Static gate: `scripts/check-house-style.mjs` (step 4 of `pnpm check`) | AGENTS.md §6 table | House-style rules already live there; a new merge step would renumber gates |
| Rule documentation | `AGENTS.md` §6 | ADR-QD-175, `spec/process/definitions-of-done.md` | Rules are gated by the table the script verifies |
| Step 6 shape | `package.json` `test:tstyche` -> one script | DoD table row + paragraph (gate 11) | Gate 11 equates the table with `pnpm check`'s commands |
| Library code | none | none | No `packages/*/src` change, no changeset, no export (ARCH-109) |

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| tstyche | 7.2.5 | Type-level test runner (already installed, `package.json:71` `"tstyche": "^7.2.5"`) | The repo's gate 6 (ADR-QD-037) |
| TypeScript (tstyche target) | 6.0.3 | Compiler tstyche runs (`tstyche.json` `"target": "6.0.3"`) | Pinned by ADR-QD-037; present in `~/Library/TSTyche/typescript@6.0.3` |
| `@effect/language-service` | 0.87.5 | Source of the `floatingEffect` diagnostic | Already configured in `tsconfig.base.json` |
| Node | 26.13.0 | Runs the gate scripts | Existing |

No package is added, upgraded or removed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| One-command script for step 6 | `"test:tstyche": "tstyche && tstyche --tsconfig …"` | Two gate-11 rows and 70 drifts measured; renumbers every later gate and ~90 prose references |
| `--skip <token>` for the rule-on pass | A second `--config` file with a narrower `testFileMatch` | `testFileMatch` has no negation (`api.js:3090-3134` `Glob`), so it would have to enumerate directories and a new `.tst.ts` in a new directory would silently miss the pass |
| Directive for the rule-on half | A second fixture only the rule-on pass runs | Not needed; the directive is verified and keeps both halves in one file |
| Inline JSON `tsconfig` string in `tstyche.json` (tstyche accepts it, `api.js:4213-4218`) | A real `tsconfig.tstyche.json` | A file is what PIN-02's drift check and D6 name; inline JSON is undiscoverable |

**Installation:** none.

## Package Legitimacy Audit

No external package is installed by this phase. Nothing to audit.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
pnpm check  ──►  step 4  node scripts/check-house-style.mjs
                   ├─ [tstyche-plugin-drift]   tsconfig.tstyche.json  vs  tsconfig.base.json   (plugin entry)
                   ├─ walk(tstyche default testFileMatch) ──► *.tst.* files   (zero files = failure)
                   │     blank comments/strings ─► count .not.toBeCallableWith / .not.toBeConstructableWith
                   │     ├─ [not-callable-pin]    count == NOT_CALLABLE_PIN_BUDGET[file], both directions
                   │     ├─ [not-callable-control] every negative has a same-text, same-form positive in the file
                   │     └─ [not-callable-pin-table] AGENTS.md §6 table == budget (distinct header)
                   │
           step 6  node scripts/run-tstyche.mjs      (the one command gate 11 sees)
                   ├─ pass 1  tstyche                       (tstyche.json -> tsconfig.tstyche.json, floatingEffect off)
                   │      all 65+ files, incl. the characterisation file (config half + directive-restored rule-on half)
                   └─ pass 2  tstyche --tsconfig tsconfig.test.json --skip <config-half title>
                          same files, floatingEffect ON: a positive pin on a bare Effect/Stream subject fails,
                          so "negative has a same-text positive that passes" => "subject is not a bare Effect"
```

### Recommended file layout
```
tsconfig.tstyche.json                       # child of tsconfig.test.json; restates the whole plugin entry, floatingEffect "off"
tstyche.json                                # { "target": "6.0.3", "tsconfig": "tsconfig.tstyche.json" }
scripts/run-tstyche.mjs                     # two spawnSync calls, exits non-zero if either fails
packages/core/test/<Characterisation>.tst.ts   # must be under packages/*/test/** (P1); name is discretionary
.planning/phases/QD-62-type-pins-that-can-fail/   # 62-PIN-CLASSIFICATION.md, 62-FLIP-SWEEP.md
```

### Pattern 1: One characterisation file, directive splits the halves
```ts
// Under the tstyche tsconfig, floatingEffect is off ...
describe("<unique token> (floatingEffect off)", () => {
  test("a call returning an Effect or Stream is callable", () => {
    expect(f).type.toBeCallableWith(1);
    expect(s).type.toBeCallableWith(1);
    expect(C).type.toBeConstructableWith(1);
  });
  test("a negative pin on valid arguments fails", () => {
    // @tstyche fixme
    expect(f).type.not.toBeCallableWith(1);
    // @tstyche fixme
    expect(s).type.not.toBeCallableWith(1);
    // @tstyche fixme
    expect(C).type.not.toBeConstructableWith(1);
  });
});

// @effect-diagnostics effect/floatingEffect:error

describe("floatingEffect on", () => {
  test("a negative pin on valid arguments passes: the known-wrong control", () => {
    expect(f).type.not.toBeCallableWith(1);
    expect(s).type.not.toBeCallableWith(1);
    expect(C).type.not.toBeConstructableWith(1);
  });
});
```
Only the first `describe` title carries the `--skip` token, so the rule-on half also runs in the rule-on pass (it passes in both configs; verified by probe P2 under the rule-on tsconfig). Plain-return control (`p`): a bare negative on `p` is honest, add one if the file should show the honest form. Source: probes P2-P4.

### Pattern 2: the step-6 script
```js
// scripts/run-tstyche.mjs (shape only)
import { spawnSync } from "node:child_process";
const TSTYCHE = new URL("../node_modules/tstyche/dist/bin.js", import.meta.url).pathname; // PATH-independent
const RULE_ON_SKIP = "<the config-half token>"; // must be a substring of exactly the config-half describe title
const run = (args) => spawnSync(process.execPath, [TSTYCHE, ...args], { stdio: "inherit" }).status ?? 1;
const main = run([]);                                                               // tstyche.json: floatingEffect off
const ruleOn = run(["--tsconfig", "tsconfig.test.json", "--skip", RULE_ON_SKIP]);   // floatingEffect on
process.exit(main === 0 && ruleOn === 0 ? 0 : 1);
```
Run both passes even if the first fails, so one run shows everything; `check:pr` and `check:fast` both run `pnpm test:tstyche`, so both pick up both passes (`scripts/run-check.mjs:41` splits `check`, not the alias). `bin.js` existence: `node_modules/tstyche/dist/bin.js` [VERIFIED: directory listing]. No shell, fixed argv.

### Pattern 3: the control check, matched by text
For every `expect…` call whose chain is `.type.[not.]toBeCallableWith|toBeConstructableWith(`, record (file, form, subject-kind, subject text with whitespace collapsed). A negative needs a positive with the same (form, kind, text) in the same file. Subject-kind separates `expect(x)` (value) from `expect<T>()` (type), so `expect<Params<typeof f>>()` and `expect(f)` never match each other.

Forward-parse each `\bexpect\b` in the blanked text: optional `<…>` (balance `<`/`>`, skip `=>`), then `(…)` (balance parens), then match `^\s*\.\s*type\s*\.\s*(not\s*\.\s*)?(toBeCallableWith|toBeConstructableWith)\s*\(`. This reproduced the milestone inventory exactly (below).

### Anti-Patterns to Avoid
- **A `&&` body for `test:tstyche`:** measured 70 gate-11 drifts (section Gate 11).
- **Putting scratch/RED files outside `packages/*/test/**`:** they run under `baseline` and prove nothing (P1).
- **Relying on `-next-line` directives:** refused by the language service (P2).
- **Reusing `| Location | Count | Why |` for the new AGENTS.md table:** `check-house-style.mjs:1585` finds the first row matching that header, which is §7a's. The new table needs its own header (below).
- **Restating only `floatingEffect` in the child tsconfig:** drops `diagnostics`, `namespaceImportPackages`, `unstableApiUsage: "off"` and the exit-code flags (P6).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excluding a file from a tstyche run | A `testFileMatch` negation or a second glob list | `--skip <describe title token>` | No negation exists; the skip fails closed |
| Per-pin failure codes for the sweep | Parsing tstyche's text output | A scratch reporter reading `abilityDiagnostics` | The text drops the primary code (P7) |
| Selecting the budget's file list | A hand-written list of directories | A walk that mirrors tstyche's default `testFileMatch` (and `--listFiles` as a one-off cross-check) | The walk found the same 65 files as `npx tstyche --listFiles` (set-equal; only sort order differs) |
| Reading `tsconfig` JSONC | A regex over the text | ~15-line comment-blanking parser, then `JSON.parse` | No script parses JSONC today and TypeScript 7.0.2 in `node_modules` exposes no JS API (`require("typescript")` keys: `version`, `versionMajorMinor`) |
| Expanding `extends` | A full TypeScript config resolver | Follow the single string `extends` until `compilerOptions.plugins` appears | The chain is three files, single-string `extends` |

**Key insight:** every piece of this phase is a small amount of text processing over files the repo already owns. The risk is not the code, it is silent no-ops (a walk finding zero files, a tsconfig not applied, a skip matching nothing), so each piece needs a failure mode that is loud.

## Gate 11 impact (question 3)

`scripts/check-dod-table.mjs` reads `package.json`'s `check`, splits on `&&`, and expands every `pnpm <alias>` whose name is in `scripts`, recursively (`expand`, `check-dod-table.mjs:61-67`: `const inner = /^pnpm ([\w:-]+)$/.exec(part); if (inner !== null && inner[1] in scripts) return expand(scripts[inner[1]], inner[1]);`). It then requires the table's rows to equal those commands in order (`[mismatch]`, `[missing]`, `[phantom]`, `[numbering]`), checks every live "gate N"/"step N" reference names a command of that row (`identifiers`: the alias, the script basename, the bare command word), and checks README's `all N gates, in order` count in words.

Measured in a scratch copy of the gate's inputs (`package.json`, `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `spec/`, `scripts/`, `stryker*.mjs`, `.github/workflows`), never in the repo:

| Variant | Result |
|---------|--------|
| Base | `dod-table: 25 step(s) match pnpm check, 150 reference(s) resolve` |
| A: `"test:tstyche": "tstyche && tstyche --tsconfig tsconfig.test.json --skip …"` | **70 merge-gate drifts**, including `README.md  [count] says "all twenty-five gates" and \`pnpm check\` runs 26.` Step 6 becomes two steps and every later number shifts (90 live prose references name a gate or step) |
| B: `"test:tstyche": "node scripts/run-tstyche.mjs"`, no doc edits | 3 drifts: the row mismatch, `spec/decisions/037-…md:83  [unnamed] names gate 6 …  ### \`tstyche\`, gate 6`, and `spec/process/definitions-of-done.md:108  [stale] names gate 6, and the command in this paragraph is step 1.` |
| B plus the three edits below | `dod-table: 25 step(s) match pnpm check, 150 reference(s) resolve` |

The three edits that turn B green: (1) the DoD row 6 command cell becomes `` `node scripts/run-tstyche.mjs` `` (row text at `spec/process/definitions-of-done.md:30` is `| 6 | \`tstyche\` | Type-level tests pass (\`*.tst.ts\`) |`; the gate cell should also say "with `floatingEffect` off, then on"); (2) the step-6 paragraph (lines 104-118) names `test:tstyche` or the script ("Step 6 (`test:tstyche`) depends on …"), because the bare word `tstyche` is no longer an identifier of step 6 (tokens become `test:tstyche` and `run-tstyche.mjs`); (3) the ADR-QD-037 heading `### \`tstyche\`, gate 6` (line 83) gets `(\`test:tstyche\`)`. **Every new prose sentence in AGENTS.md, ADR-QD-175 and the CCR row that says "step 6" or "gate 6" must name `test:tstyche` or `run-tstyche.mjs` in the same paragraph**, or gate 11 reports `[unnamed]`. The CCR row itself is exempt (`HISTORICAL` matches `^\|\s*CCR-QD-\d+`).

`scripts/run-check.mjs` (`check:pr`, `check:fast`) is not affected by the shape: it splits `package.json`'s `check` on `&&` and runs `pnpm test:tstyche` as one step (`run-check.mjs:41`); `FAST_DROPS` does not list it, so the fast tier now also runs both passes (+8 s). `spec/process/definitions-of-done.md` needs a `spec-revise` bump (see Records).

## Control check feasibility (question 4)

A scratch script (whole-file blanking of comments, strings and templates with offsets kept, then the forward parse above) over the 65 files (excluding the probe files): **165 pins with a callable/constructable matcher: 88 negative (81 callable + 7 constructable), 77 positive; 28 files hold a negative pin; no pin's `expect(...).type.not.toBeXWith(` span crosses a line today.** Counting the token `\.\s*not\s*\.\s*toBeCallableWith\b` / `…toBeConstructableWith\b` over the blanked text independently gives callable 81, constructable 7, 28 files, equal to the parse.

**Negatives with no same-text, same-form positive in their file (11, equal to the CONTEXT list):**

| File:line | Form | Subject as written | Returns |
|-----------|------|--------------------|---------|
| `audit/test/AuditPortReply.tst.ts:31` | callable | `AuditPortReply.Latch` | tagged value |
| `audit/test/AuditWriteOutcome.tst.ts:18` | callable | `AuditWriteOutcome.WriteFailed` | tagged value |
| `core/test/DecisionLog.tst.ts:30` | callable | `makeDecisionLog` | **Effect** (rewritten, leaves the budget) |
| `core/test/Explanation.tst.ts:35`, `:46` | callable | `foldExplanationCases` | `R` (generic result) |
| `core/test/Matcher.tst.ts:33`, `:42` | callable | `foldMatcherCases` | `R` |
| `core/test/Qadi.tst.ts:115` | callable | `enforceProjectedLoaded` | a function (curried; `Qadi.ts:205-209`) |
| `core/test/WalkEnvironment.tst.ts:40`, `:41` | callable | `admit` | `Result.Result<Admitted<Source>, PolicyTooDeep>` (`Admission.ts:97-100`) |
| `http/test/RequirePermission.tst.ts:63` | callable | `plainEndpoint.annotate` | endpoint |

`Qadi.tst.ts:116` (`enforceLoaded`) and `:119-120` (`enforceProjected`) already have same-text positives elsewhere in that file; only line 115's subject lacks one. **Granularity:** the mechanical check is per subject text, so the 10 non-DecisionLog pins need 7 distinct positives (`Latch`, `WriteFailed`, `foldExplanationCases`, `foldMatcherCases`, `enforceProjectedLoaded`, `admit`, `plainEndpoint.annotate`). PIN-04 asks for a control per pin, "single-variable" (the valid twin of that pin's call). Write one per pin: the checker is only the floor and cannot see whether the control's arguments are the pin's twin, so AGENTS.md's wording must say so.

**Only `makeDecisionLog` among the 11 returns an Effect.** The other ten return plain values or functions, so a positive control on them passes in the rule-on pass. For the other 70 negative pins the existing same-text positives already pass in the rule-on pass (the suite is green with the rule on, P5), which is what makes them honest: a same-text positive that passes with the rule on proves the subject's call is not a bare Effect.

**Matching edge cases found:**
- `expect<Params<typeof f>>()` subjects: 12 (PortAccess ×6, DiagnosticsStore ×3, DecisionCache ×3 via the alias `GetOrCompute`); all have same-text positives. Type-kind subjects must compare as `type:Params<typeof askActed>`, never as the value subject `askActed`.
- Expression subject: `http/test/GuardRoute.tst.ts:133` `addGuardedRoute("GET", "/x", readPermission, readPolicy)` (value kind). Text equality on the collapsed subject works; it has a same-text positive.
- Subject text is compared after collapsing whitespace, so a multi-line subject matches its one-line twin. No subject is multi-line today.
- Pins whose **arguments** are multi-line (`Explanation`, `Matcher`, `Qadi:115-119`, `RequirePermission:63`) are fine: only the subject and matcher token matter.
- Four block-comment lines mention the token in prose (`DecisionCache.tst.ts:13`, `PortAccess.tst.ts:6`, `:35`, `PortSpan.tst.ts:5`); a counter that does not blank comments over-counts by 4.

## Budget mechanics (question 5)

**Stripping.** `strip()` in `check-house-style.mjs` (line 946) is per line, and block-comment tracking is inline in the main loop (lines ~1000-1010), so neither can be called on a whole file. A pin split as `expect(x).type.not\n  .toBeCallableWith(…)` is invisible to a per-line regex. Recommended: a small whole-file `blank(text)` (comments, strings, templates replaced by spaces/underscores, newlines kept; the prototype is ~20 lines) and a global regex over the result, the same approach as the cross-line rules at lines 1612-1680 (`[no-prefixed-error-tag]` etc.), which also read whole files. Alternatively join lines already run through `strip()` and the loop's block-comment tracker; both work, and both need the four-case demonstration.

**Tokens.** `/\.\s*not\s*\.\s*toBeCallableWith\b/g` and `/\.\s*not\s*\.\s*toBeConstructableWith\b/g`, counted separately per file (D-08). Positive tokens for the control check come from the forward parse above (a positive's subject text is needed, so a token count alone is not enough).

**Walk.** Mirror tstyche's selection from the repo root: skip directories named `node_modules` and any entry starting with `.` (tstyche's `**` segment pattern is `(\/(?!(node_modules)(\/|$))[^./][^/]*)*?`, `api.js:3101`, so hidden directories such as `.planning`, `.scratch`, `.agents`, `.codex` are never visited), and match: `**/*.tst.*`, `**/__typetests__/*.test.*`, `**/typetests/*.test.*` (default `testFileMatch`, `api.js:1635`: `testFileMatch: ["**/*.tst.*", "**/__typetests__/*.test.*", "**/typetests/*.test.*"],`). `.tst.d.ts`-style names also match `*.tst.*`. Fail if zero files are found (P4 in PITFALLS). Fail if `tstyche.json` declares its own `testFileMatch`, because the walk would then silently diverge from the tool; today `tstyche.json` has only `target` and `tsconfig`. Cross-check done once: the walk's 65 paths equal `npx tstyche --listFiles` (0.26 s; usable as a one-off verification, not as the gate's mechanism, since D-09 asks for an own walk).

**Optional hardening (not requested):** also fail a walked file outside `packages/*/test/**` (P1: it would run under `baseline`, so the rule-on pass would not cover it). All 65 today satisfy it (the full runs print a single `uses … with ./tsconfig…` line).

**Budget shape.** `Record<string, { callable: number, constructable: number }>`, one comment per row giving the reason where a row is an exception. Expected end state: 80 callable pins in 26 files (DecisionLog leaves), 7 constructable in `Decision.tst.ts` (so `Decision.tst.ts` is a 27th file with `callable: 0`), plus the characterisation file (config half 2 callable + 1 constructable fixme'd negatives, rule-on half 2 + 1 more, i.e. 4 and 2, plus 1 if a plain-return negative is added); that row's reason says it is the documented exception to the plain-return rule and its pins are excluded from the flip sweep (their flipped form passes by design).

**Table check.** Follow `[untrusted-decode-table]` (`check-house-style.mjs:1590-1607`): find the header row, read rows until the table ends, compare to the budget in both directions. That block's header regex is `^\|\s*Location\s*\|\s*Count\s*\|\s*Why\s*\|` and AGENTS.md has it at line 541 (§7a); other headers are `| Location | Why untraced |` (260), `| Location | Dispatches on |` (333), `| Class | Crosses |` (185), `| Don't | Do |` (41, 378), `| Pattern | Meaning |` (558). Propose `| Type-test file | Callable pins | Constructable pins | Why |` (not present anywhere in AGENTS.md; matched with `^\|\s*Type-test file\s*\|`), rows `` | `packages/…/X.tst.ts` | n | m | reason | ``. Name the checks `[not-callable-pin]`, `[not-callable-control]`, `[not-callable-pin-table]`, `[tstyche-plugin-drift]`. The AGENTS.md paragraph goes at the end of §6 after the `METRIC_ID_LITERAL_BUDGET` paragraph (§6 spans lines 376-465); in the house-style header comment it is the eleventh budget (AGENTS.md's own ordinals are off by one for the later budgets: it calls `PORT_DOUBLE_BUDGET` the "sixth" where the script's header says "seventh"; do not attempt to reconcile them in this phase). Scope is test-scope like `PORT_DOUBLE_BUDGET`.

## Drift check (question 6)

Where: a named rule in `scripts/check-house-style.mjs` (step 4), `[tstyche-plugin-drift]`. Comparison, verified by a prototype run against the real files: parse both tsconfigs as JSONC, take the `@effect/language-service` entry from `tsconfig.base.json` and from the child (the child's own `compilerOptions.plugins`), remove `diagnosticSeverity.floatingEffect` from the child's copy, and require `isDeepStrictEqual` with the base entry; separately require the child's `diagnosticSeverity.floatingEffect === "off"`. Prototype output on the probe child: `floatingEffect: off`, `equal apart from floatingEffect: true`, `test config entry equals base: true`; on a child with `"unstableApiUsage": "off", ` removed: `equal apart from floatingEffect: false` (the drift check's RED). Three more cheap assertions: `tstyche.json`'s `tsconfig` names the child, the child `extends` `./tsconfig.test.json`, and `tsconfig.test.json` / `tsconfig.react-base.json` do not define their own `plugins` (otherwise the "base entry" the child must equal is not what step 2 uses; walk the `extends` chain to the nearest `plugins`, as the prototype does).

JSONC: no script parses JSONC today (`check-package-install.mjs:104,121` `JSON.parse` plain-JSON tsconfigs; `tsconfig.base.json` and `tsconfig.test.json` contain `//` comments). Blank `//` and `/* */` outside strings, drop trailing commas, `JSON.parse`. `isDeepStrictEqual` is order-sensitive for arrays (`namespaceImportPackages`), which is the strictness wanted. Restating the entry means each future change to the base entry now needs two edits, which is exactly what the rule makes loud.

## Records (question 9)

- **Precedents for a phase that added a house-style budget:** CCR-QD-145 (ADR-QD-073 + `UNTRACED_BUDGET`: ADR + traceability only, no BEH/INV); CCR-QD-039 (AGENTS.md §5a made enforceable: no new ADR); CCR-QD-401 (ADR-QD-123 new + BEH-QD-368 + INV-QD-259, because the metric table is library-visible); CCR-QD-421/ADR-QD-143 (INV-QD-305, library-visible decode guard). The BEH/INV cases are the ones where the rule describes shipped behaviour. This phase changes no library behaviour.
- **Recommendation:** new **ADR-QD-175** (the tstyche configuration, the plain-return/reason-stated rule, the control check, the rule-on pass and the budget; precedent shape ADR-QD-123: Context / Decision / Consequences, `Document ID QADI-ADR-175` — gate 10 requires the ID to equal the file number, `verify-traceability.sh` check 3a) **and a short `spec-revise` amendment of ADR-QD-037** (currently Rev 1.6; its `### tstyche, gate 6` section states `tstyche.json`'s tsconfig and describes gate 6, and the heading needs the `test:tstyche` token anyway, Gate 11 edit 3). New file `spec/decisions/175-…md` + an `index.yaml` entry (format at `index.yaml:545-549`: `id`, `file`, `title`, `status: "Accepted — amends ADR-QD-037"`) + an `ADR-QD-175` row in `spec/traceability.md` (check 3 requires every ADR file to be in it; line 367 is the ADR-QD-174 row to copy). Revisions are written with `node scripts/spec-revise.mjs <doc> "<what changed>"` (bumps the Revision row and prepends the Change History entry; `--check` is part of `pnpm spec:verify`).
- **BEH-QD-646–650 and INV-QD-369–370: recommend naming all of them Unused** in the CCR-QD-453 row (precedent text: `Ids used: …. Unused: none.` ends CCR-QD-452's row). The invariants register holds library invariants (INV-QD-367/368 are about the cache), and no library behaviour changes. If the owner wants an invariant ("a negative callable pin can fail"), INV-QD-369 with Enforcement = the budget/control/rule-on pass is defensible, but then `spec/invariants.md` and `traceability.md` §2 rows are required (check 2). Either way **ADR-QD-175 is the only new id that is certain.**
- **CCR-QD-453 row:** append to the register in `spec/README.md` after the CCR-QD-452 row (line 389); format `| CCR-QD-453 | 2026-11-… | <files with Revs> | ARCH-109. **<bold lead>.** … Ids used: … Unused: … |`; bump `spec/README.md` (currently Rev 1.258) with `spec-revise`. `verify-traceability.sh` check 7 fails if AGENTS.md or `spec/` cites `CCR-QD-453` before the row exists, so write the row in the same commit as the first citation.
- **Traceability rows:** new rows in `spec/traceability.md` §4 for the characterisation file and `scripts/run-tstyche.mjs` if it should be cited; existing row for `DecisionCache.tst.ts` is at line 464 as the format example. Check 6 only verifies cited paths exist.
- **Docs that move together (each needs a `spec-revise` entry):** `spec/README.md`, `spec/decisions/037-…md`, `spec/traceability.md`, `spec/process/definitions-of-done.md`. `spec/overview.md` is untouched (no export; gate 13 expects none).
- Gate 11 also scans `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `spec/**`, `scripts/**` for "gate N"/"step N" references; the CCR and Change History rows are exempt.

## Mutation and coverage (question 10)

Nothing this phase touches is in either scope. Every Stryker `mutate` glob is under `packages/*/src` (`stryker.config.mjs:81`, `stryker.devtools.mjs:47` `packages/devtools/src/model/**/*.ts`, `stryker.predicate-*.mjs:46/48`, `stryker.http.mjs`, `stryker.audit.mjs`, `stryker.react.mjs`) and vitest coverage is `include: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"]` with `**/*.tst.ts` excluded as inert (`vitest.config.ts`). The phase changes only `*.tst.ts`, `scripts/`, JSON config, AGENTS.md and `spec/`, so WX-05's "per-file Stryker score of touched files" is an empty set: record that in the plan ("no `packages/*/src` file is touched, so no `NN-mutation-base.json` row exists"). Never run Stryker for this phase (project rule). Coverage thresholds are unaffected.

## Common Pitfalls

### Pitfall 1: tstyche silently runs a file under the baseline TSConfig
**What goes wrong:** a probe, RED or sweep file outside the tsconfig's `include` shows the rule off in every pass, so a "rule-on" result or a "RED" proves nothing.
**Why:** tstyche only attaches the configured tsconfig to included files (`api.js:4201-4204`, `:4237-4244`).
**How to avoid:** put scratch files under `packages/<pkg>/test/`; read the `uses TypeScript 6.0.3 with …` line; the characterisation file must live under `packages/*/test/**`.
**Warning signs:** `with baseline TSConfig`.

### Pitfall 2: gate 11 renumbers if step 6 becomes two commands
**What goes wrong:** 70 drifts (measured). **How to avoid:** one command (`node scripts/run-tstyche.mjs`) plus the three text edits above; run `node scripts/check-dod-table.mjs < /dev/null` after each edit. **Warning signs:** `[count] says "all twenty-five gates" and pnpm check runs 26`.

### Pitfall 3: the `--skip` token matches too much or too little
**What goes wrong:** a token that also appears in another title skips real tests in the rule-on pass; a renamed title makes the skip match nothing. **Why:** substring, case-insensitive (`api.js:5758`). **How to avoid:** a distinctive token used in exactly one title; the no-match case fails loudly (the fixme'd pins pass and are reported), which is the wanted direction. Show it once as a RED: rename the title, run pass 2, see three `supposed to fail, but it passed` errors.

### Pitfall 4: the D-04 re-grep misses a comment
`grep -i 'floating|vacuous'` over `*.tst.ts` finds `DecisionCache:11`, `PortAccess:33`, `Qadi:96,172-173`, `DecisionStream:50`, `Facade:9-10` but **not** `DiagnosticsStore.tst.ts:21-26` (its wording is "the Effect language service reports the synthesized call", no "floating"). Use `floating|vacuous|language service|synthes`. `Qadi.tst.ts:95-96` ("nothing here is a floating effect for `@effect/language-service`'s diagnostics to flag") and `PortSpan.tst.ts:5` (a refusal "is asserted with `not.toBeCallableWith`") stay true and need no edit; `Facade.tst.ts:9-10` stays as CONTEXT says.

### Pitfall 5: a child tsconfig that restates only `floatingEffect`
Verified in P6: the entry is replaced, not merged. The drift check is what keeps the restated copy honest.

### Pitfall 6: the new AGENTS.md table is read as §7a's
Header collision (Budget mechanics). Use the distinct header; also confirm `[untrusted-decode-table]` still passes after the AGENTS.md edit.

### Pitfall 7: "commented pin" and "line-split pin" are two different demonstrations
Read PIN-05 as: (a) an **added** negative pin raises the count and fails; (b) a **removed** pin lowers it and fails; (c) an existing pin turned into a **comment** lowers the count and fails (and a commented-out *extra* pin must not change the count: that is the positive twin showing the stripper works); (d) a **line-split** added pin (`.not` and `.toBeCallableWith` on separate lines) must still be counted and so fails. Each needs its twin on the base, per the milestone's verify-command rule.

### Pitfall 8: the characterisation file is exempt from the flip sweep and from rule-on by design
Its bare negatives on Effect/Stream subjects are the documented exception (D-05); flipped, they pass under the new tsconfig. Exclude the whole file from the sweep and say so in the sweep record and its table row.

### Pitfall 9: `Params<F>` and `Parameters<F>` read only the last overload
Not checked per subject in this session. Verify before writing the AGENTS.md sentence that no pinned subject is overloaded (the AGENTS.md note is conditional per CONTEXT).

### Pitfall 10: the probe's own scratch tsconfig `include`
When probing with a scratch tsconfig, narrowing `include` to the scratch directory is fine, but the real wiring must inherit `include` from `tsconfig.test.json` (P6 shows it is inherited unchanged) so the new tsconfig covers exactly the files step 2 covers.

## Code Examples

### The flip-sweep reporter (scratch, not committed)
```js
// Source: node_modules/tstyche/dist/api.d.ts (Reporter, expect:* events, ExpectNode.abilityDiagnostics)
export default class SweepReporter {
  constructor(config) { this.config = config; }
  on([event, payload]) {
    if (!event.startsWith("expect:") || event === "expect:start") return;
    const node = payload.result.expect;
    const sf = node.matcherNode.getSourceFile();
    const { line } = sf.getLineAndCharacterOfPosition(node.matcherNameNode.name.getStart());
    const diags = [...node.abilityDiagnostics].map((d) => ({ code: d.code, source: d.source ?? "ts" }));
    console.log("SWEEP " + JSON.stringify({ file: sf.fileName, line: line + 1,
      matcher: node.matcherNameNode.name.text, not: node.isNot, event: event.slice(7), diags }));
  }
}
// NO_COLOR=1 npx tstyche --reporters file:///abs/reporter.mjs --tsconfig tsconfig.tstyche.json zz62-flip </dev/null
```
Procedure for D-10/D-11: after all rewrites and controls, copy each `*.tst.ts` that holds a negative pin to `zz62-flip-<name>.tst.ts` beside it, rewrite `.not.toBeCallableWith` -> `.toBeCallableWith` and `.not.toBeConstructableWith` -> `.toBeConstructableWith`, **skip the characterisation file**, run the command above with the same flags the main pass uses, then require for every original negative pin (file:line of the matcher name): the flipped row exists, `event === "fail"`, `diags.length > 0`, every `diag.code` in the allowed set, none with code 3 or `source` other than `ts`. Delete the copies; record per pin file, line, subject, form, codes, and the invocation. Allowed set from the dry run: **2322, 2345, 2353, 2375, 2379, 2554, 2559**, plus 2555, 2561, 2769 from D-11 for headroom; any other code (2304, 2307, 2339, 2551, 2552, 2724, code 3) fails the sweep and is reviewed by hand.

### The pin-count walk (shape)
```js
// Source: node_modules/tstyche/dist/api.js:1635 (testFileMatch), :3101 (node_modules/dot-segment rule)
const TEST_FILE = [/(?:^|\/)[^./][^/]*\.tst\.[^/]*$/, /(?:^|\/)__typetests__\/[^./][^/]*\.test\.[^/]*$/, /(?:^|\/)typetests\/[^./][^/]*\.test\.[^/]*$/];
const walkTypeTests = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.name === "node_modules" || e.name.startsWith(".") ? [] :
  e.isDirectory() ? walkTypeTests(join(dir, e.name)) :
  TEST_FILE.some((re) => re.test(relative(ROOT, join(dir, e.name)))) ? [join(dir, e.name)] : []);
// if (walkTypeTests(ROOT).length === 0) fail("[not-callable-pin] found no type-test files; the walk is looking in the wrong place");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Negative pin on an Effect-returning function passes vacuously (rule on for tstyche) | tstyche has its own tsconfig with `floatingEffect` off; reason-stating forms for Effect/Stream subjects | This phase | Every negative pin can fail, and the form does not depend on the config |
| Count of pins unchecked | `NOT_CALLABLE_PIN_BUDGET` + control check + rule-on pass | This phase | A pin cannot be added, removed or left uncontrolled silently |

**Deprecated/outdated:** the comments in the five D-04 files claiming a bare negative "could never fail" (true only under the old config).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A new `scripts/run-tstyche.mjs` is acceptable even though CONTEXT's "Files in scope" does not list a new script (it lists `package.json`'s `test:tstyche`) | Gate 11, Pattern 2 | If the owner wants no new script, the alternative is accepting the 70-drift renumbering (outside this phase's scope) or dropping the rule-on pass from step 6 (contradicts D-07). Surface it in planning, do not decide silently |
| A2 | BEH-QD-646–650 and INV-QD-369–370 can all be named Unused | Records | The owner may want INV-QD-369 as a documented invariant; costs two register rows if so |
| A3 | No pinned `Params<F>` / `Parameters<F>` subject is overloaded | Pitfall 9 | The AGENTS.md note about last-overload reading would be needed; not probed this session |
| A4 | `check:fast` running both passes (+8 s) is acceptable | Gate 11 | The fast tier is documented as a developer loop; the owner may prefer a fast-tier swap. Not decided by CONTEXT |
| A5 | `tsgo` (TypeScript 7.0.2, `pnpm typecheck` step 2) compiles the characterisation file and the `@effect-diagnostics` directive without a new diagnostic | Pattern 1 | A directive the plugin flags as unused/unknown would turn step 2 red. The rule-on probe under TS 6.0.3 showed no complaint for the position-based directive; tsgo itself was not run |

## Open Questions

1. **Is a new script acceptable for step 6?** (A1) Recommendation: yes; it is the only shape that keeps gate 11's row count. Planner should state it in the plan summary for the owner.
2. **Should the characterisation file carry a plain-return negative?** D-02 says "plus a plain-return control". A bare negative on `p` is honest and adds one callable pin to its budget row; a positive on `p` is the control. Recommendation: include both, so the file shows all three subject kinds.
3. **Real-source RED for PIN-03.** The scratch probe already shows red on an optional-`environment` signature; the executor should still do the transient `DecisionLog.ts` edit once for the record. (`git checkout` it back; no src diff may remain.)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, tstyche | yes | v26.13.0 | none needed |
| pnpm | `pnpm test:tstyche`, `check:pr` | yes | 10.17.1 | none needed |
| tstyche | step 6 | yes | 7.2.5 | none |
| TypeScript 6.0.3 (tstyche store) | tstyche | yes | `~/Library/TSTyche/typescript@6.0.3` | tstyche fetches on a cold cache (needs network, existing behaviour) |
| `@effect/language-service` | the rule under test | yes | 0.87.5 | none |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | tstyche 7.2.5 (type-level); node scripts for the gates |
| Config file | `tstyche.json` (to point at `tsconfig.tstyche.json`); `tsconfig.test.json` for the rule-on pass |
| Quick run command | `npx tstyche packages/core/test/<File>.tst.ts < /dev/null` ; `node scripts/check-house-style.mjs < /dev/null` ; `node scripts/check-dod-table.mjs < /dev/null` |
| Full suite command | `pnpm test:tstyche < /dev/null` (both passes, ~17 s) ; `pnpm check:pr < /dev/null` for the phase gate |

### Phase Requirements -> Test Map

| Req / Decision | Behavior | Test Type | Automated Command | RED-first evidence |
|----------------|----------|-----------|-------------------|--------------------|
| PIN-01, D-01..D-03 | Config half fails negatives under the new tsconfig; rule-on half passes them; constructor form covered | tstyche | `npx tstyche --tsconfig tsconfig.tstyche.json <char file> < /dev/null` (green) | On the base tsconfig (`npx tstyche --tsconfig tsconfig.test.json <char file>`): config-half positives fail with `effect(floatingEffect)` and the fixme pins report `supposed to fail, but it passed` (probe P4 shows exactly this) |
| PIN-02 (tsconfig) | All files green under the new tsconfig | tstyche | `npx tstyche < /dev/null` -> `Test files: N passed` | Point `tstyche.json` back at `tsconfig.test.json`: the char file's config half fails |
| PIN-02 (drift) | Plugin entry equals base apart from `floatingEffect` | house-style | `node scripts/check-house-style.mjs < /dev/null` -> `[tstyche-plugin-drift]` clean | Remove one setting (e.g. `"unstableApiUsage": "off"`) from the child: rule fails; restore: green |
| PIN-03 | `DecisionLog.tst.ts` pin states its reason | tstyche | `npx tstyche packages/core/test/DecisionLog.tst.ts < /dev/null` | Transient `readonly environment?: string` in `packages/core/src/DecisionLog.ts:189`: the pin fails; `git checkout` the file |
| PIN-04 (controls) | Every negative has a same-text positive | house-style | `node scripts/check-house-style.mjs < /dev/null` -> `[not-callable-control]` clean | Delete one control (e.g. `admit`'s): rule names the file and subject; restore |
| PIN-04 (classification) | 81 code pins classified | file check | `/usr/bin/grep -c '^|' .planning/phases/QD-62-…/62-PIN-CLASSIFICATION.md` equals the table rows (expect 81 + 7 constructor rows + header) | table absent on the base |
| PIN-05 | Budget exact both ways; table checked | house-style | `node scripts/check-house-style.mjs < /dev/null` -> `[not-callable-pin]`, `[not-callable-pin-table]` clean | Four demonstrations (Pitfall 7) plus a table-row edit; and a zero-files RED (point the walk at an empty dir) |
| D-07 part 1 | Control check | house-style | as PIN-04 | as PIN-04 |
| D-07 part 2 | Rule-on pass catches a bare negative on an Effect subject | tstyche | `node scripts/run-tstyche.mjs < /dev/null` | Add under `packages/core/test/` a file with `declare const e: (n: number) => Effect.Effect<number>`, a positive `expect(e).type.toBeCallableWith(1)` and a bare negative `expect(e).type.not.toBeCallableWith("x")`: pass 1 green, the control check green (text only), **pass 2 red**; delete the file |
| D-08 | Constructor pins counted and controlled | house-style | as PIN-05 | add/remove a `not.toBeConstructableWith` in `Decision.tst.ts` |
| D-09 | Walk = tstyche's list, zero files fails | house-style + one-off | `npx tstyche --listFiles < /dev/null` compared with the walk once; empty-walk RED | as PIN-05 |
| D-10/D-11 | Every flipped pin fails with an allowed TS code | one-off sweep | the reporter command in Code Examples; record in `62-FLIP-SWEEP.md` | A positive twin: run the same sweep on the **old** tsconfig and show the DecisionLog line still "fails" (so the old oracle was unsound, as D-10 says) is optional; the mandatory twin is "flip a pin whose arguments are actually valid and see it pass" (the characterisation file's `p`/`f` positives) |
| Gate 11 | Step 6 equals the table | script | `node scripts/check-dod-table.mjs < /dev/null` -> `dod-table: 25 step(s) match pnpm check, 150 reference(s) resolve` | Change `package.json` first: 3 drifts; then the three text edits |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null` | n/a |
| WX-02 | Records complete | script | `bash spec/scripts/verify-traceability.sh --strict < /dev/null`, `node scripts/spec-revise.mjs --check < /dev/null` | cite `CCR-QD-453` before its register row exists: check 7 fails |
| WX-04 | No forbidden construct added | script | `node scripts/check-house-style.mjs < /dev/null` (note: `collect()` skips `.tst.ts`, so review new `.tst.ts` for `as`, `!`, `any`, `switch` by hand: `/usr/bin/grep -nE ' as |!\.|\bany\b|switch' <files>`) | n/a |
| WX-05 | Mutation/coverage | none | n/a | Record "no `packages/*/src` touched" in the first plan |

### Sampling Rate
- **Per task commit:** `npx tstyche <touched file> < /dev/null` plus `node scripts/check-house-style.mjs < /dev/null`
- **Per wave merge:** `pnpm test:tstyche < /dev/null` and `node scripts/check-dod-table.mjs < /dev/null`
- **Phase gate:** `pnpm check:pr < /dev/null` green (ten silent minutes means hung)

### Wave 0 Gaps
- [ ] The characterisation file and `tsconfig.tstyche.json` do not exist yet (first plan)
- [ ] No existing test covers the new `check-house-style.mjs` rules; each is shown failing once by the demonstrations above rather than by a committed test
- [ ] `62-PIN-CLASSIFICATION.md` and `62-FLIP-SWEEP.md` in the phase directory

Every verify command needs a positive twin on the base (milestone rule): for each `[rule]` clean-run command, the twin is the RED edit in the right-hand column run first, then reverted.

## Security Domain

`security_enforcement` is on (ASVS level 1). This phase ships no runtime code, no network access and no input from outside the repository.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication / V3 Session / V4 Access Control | no | no runtime surface |
| V5 Input Validation | marginal | the gate scripts read repo files only; `run-tstyche.mjs` uses a fixed argv with `spawnSync` and no shell |
| V6 Cryptography | no | none |
| V10 Malicious code / supply chain | yes | no dependency is added or changed; the tstyche target is pinned (`6.0.3`) |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Command injection through the new script | Tampering | constant argv array, `shell` unset, `process.execPath` instead of a PATH lookup |
| A weakened gate (budget scanning zero files, rule-on pass skipping everything) | Tampering / Repudiation | the zero-files failure, the fail-closed `--skip`, the drift check |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **§6 Forbidden:** `as`, `!`, `any`, `switch`, `async`/`await`, `console`/`process.env` in `packages/*/src`; do not add any to new `*.tst.ts` either (WX-04) even though `collect()` skips `.tst.ts`. New scripts under `scripts/` are not scanned by the style rules; keep them plain (no `switch`, no ambient clock).
- **§6 budgets:** a budget changes only together with its AGENTS.md table; checked in both directions; the new one needs a paragraph in §6 that cites its ADR.
- **§10 Tests:** every behaviour in `spec/behaviors/` has tests (not engaged: no BEH added unless the owner chooses otherwise).
- **§11:** `spec/` is normative; placeholder ids (`ADR-QD-NEXT` etc.) are refused by `[no-numbering-placeholder]` in shipped source, tests and BDD scenarios; use the reserved ids only.
- **§15:** a "gate N"/"step N" in prose must name its command in the same paragraph; the merge gate is `pnpm check` only (`check:pr` skips only `pnpm mutation`).
- **§17:** hand-wrap at about ninety columns; `oxfmt` is not a gate.
- **Doc-comment shape:** one-line summary first, the why after.
- **Workflow rules (`_SHARED-CONTEXT`, memory):** `/usr/bin/grep`, quote globs, every command `< /dev/null`, never run Stryker, `pnpm check`, `pnpm mutation`, `node scripts/next-id.mjs`; release nothing.

## Sources

### Primary (HIGH confidence)
- Probes run this session against tstyche 7.2.5 / TypeScript 6.0.3 (outputs quoted above)
- `node_modules/tstyche/dist/api.js` lines 137-181 (`Diagnostic`), 1635 (`testFileMatch`), 3090-3134 (`Glob`), 3190-3247 (`Select`), 4100-4260 (`ProjectService`, baseline fallback), 5313-5325 (`explain`), 5758 (`--skip`), 6011-6013 (custom reporters); `api.d.ts:61,303-312,505-540`
- `node_modules/@effect/language-service/README.md` 365-400 ("Configuring diagnostics"), version 0.87.5
- `scripts/check-house-style.mjs` (lines 40-60, 635-665, 871-889, 946-965, 1540-1607, 1612-1680, 1885-1990), `scripts/check-dod-table.mjs`, `scripts/run-check.mjs`, `spec/process/definitions-of-done.md:20-60,104-118`, `AGENTS.md` §5-§7a, §15, `tstyche.json`, `tsconfig.base.json`, `tsconfig.test.json`, `tsconfig.react-base.json`, `package.json:25,41,71`
- `spec/README.md` CCR rows (CCR-QD-039, 145, 401, 452), `spec/decisions/index.yaml:540-549`, `spec/decisions/037-…md`, `spec/decisions/123-…md`, `spec/scripts/verify-traceability.sh`

### Secondary / Tertiary
- None. No web or Context7 lookup was needed: the tools are installed locally and the behaviour was probed directly.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (nothing added; versions read from the tree)
- Directive override, fixme, `--skip`, two passes, drift prototype, sweep oracle, DecisionLog rewrite: HIGH (probed, outputs quoted)
- Gate 11 impact: HIGH (measured in a scratch copy of the gate's inputs)
- Records recommendation: MEDIUM (precedent-based; the BEH/INV choice is the owner's)
- tsgo (`pnpm typecheck`) behaviour on the directive: UNVERIFIED (A5)

**Research date:** 2026-11-20
**Valid until:** 2026-12-20, or until tstyche, TypeScript 6.0.x or `@effect/language-service` is upgraded (the characterisation file exists to notice exactly that)
