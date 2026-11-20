# Phase 62: Type pins that can fail - Context

**Gathered:** 2026-11-20
**Status:** Ready for planning

<domain>
## Phase Boundary

After this phase, every negative type pin in the repo can fail and stays able to fail. "Negative type pin" means
`not.toBeCallableWith` and, per D-08, `not.toBeConstructableWith`.

The phase delivers:
- **The cause, fixed for tstyche (D6).** tstyche gets its own tsconfig, with `floatingEffect` off.
- **A characterisation test.** It pins the tool's behaviour under both settings.
- **One rewritten pin.** `DecisionLog.tst.ts:30` is rewritten through the parameter type.
- **Controls.** The 11 pins that have no positive control get one.
- **The budget.** `NOT_CALLABLE_PIN_BUDGET` counts negative pins and requires controls.
- **A rule-on pass.** Step 6 also runs the suite with `floatingEffect` on, so the plain-return rule is machine-checked.
- **A flip sweep.** A one-off sweep proves that every remaining negative pin fails when flipped to positive.

**Files in scope:**
- `*.tst.ts` files
- the type-test config: `tstyche.json` and a new tsconfig
- `scripts/check-house-style.mjs`
- `package.json`'s `test:tstyche` script
- `AGENTS.md`
- `spec/process/definitions-of-done.md`
- spec records

No `packages/*/src` change, no changeset and no new public export. ARCH-109.

**Out of scope:**
- An upstream tstyche or language-service issue. It is not filed without the owner's explicit OK.
- A budget for `@ts-expect-error` pins.
- Any source change.

</domain>

<decisions>
## Implementation Decisions

### Carried forward (locked before this discussion)
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

### Characterisation file
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

### Existing workaround pins
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

### Budget gate (`NOT_CALLABLE_PIN_BUDGET`)
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

### Proof every pin can fail
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/phases/_WAVE12-CONTEXT.md`: owner decisions D1–D9 (D6 governs this phase), the reserved numbering
  table, and the Phase 62 evidence (Probe 1, Probe 2, root cause, required items).
- `.planning/phases/_SHARED-CONTEXT.md`: house rules, verify-command hygiene (zsh, `/usr/bin/grep`, quoting), the
  RED-first rule, and the XC-05 mutation procedure.
- `.planning/REQUIREMENTS.md`: PIN-01 to PIN-05 and WX-01 to WX-07.
- `.planning/ROADMAP.md`: the "Phase 62: Type pins that can fail" goal and four success criteria.

### Research (2026-11-20)
- `.planning/research/SUMMARY.md`: the "Phase 62" section and the Research Flags (directive override is unverified).
- `.planning/research/FEATURES.md`: the "Phase 62" section, with the exact 81-pin inventory, per-file counts and the
  11 uncontrolled pins. Its figure of "9" constructor pins is wrong: there are 7 negative pins and 2 controls.
- `.planning/research/STACK.md`: the root cause (`floatingEffect` on tstyche's synthesized call) and the mechanism
  options.
- `.planning/research/ARCHITECTURE.md`: the directive forms (the `-next-line` form does not work) and the budget
  precedents.
- `.planning/research/PITFALLS.md`: P1, P2, P4, P13 and P15. P4 covers a budget that scans zero files.

### House rules and gates
- `AGENTS.md` §6: budgets and where the new paragraph and table go. §5, §5a and §7a hold the precedent tables
  (`UNTRACED_BUDGET`, `SWITCH_BUDGET`, `UNTRUSTED_DECODE_BUDGET`). Also §10 (tests), §11 (spec) and §15 (a "gate N"
  must name its script).
- `scripts/check-house-style.mjs`:
  - `UNTRUSTED_DECODE_BUDGET` (:635) and `[untrusted-decode-table]` (:1596-1606) are the table-check pattern.
  - `[metric-id-literal]` (~:1888-2084) and `[no-numbering-placeholder]` (~:2091-2132) are the own-walk precedents.
  - `collect()` (:876-889) skips `.tst.ts`.
- `spec/process/definitions-of-done.md`: the step 6 row (:30) and the step 6 paragraph (:104-118).
- `scripts/check-dod-table.mjs`: gate 11 (the DoD table must equal what `pnpm check` runs).
- `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md`: ADR-QD-037, which made tstyche a gate
  (rev 1.3 pins TypeScript 6.0.3).
- Budget ADR precedents:
  - `spec/decisions/055-a-named-registered-custom-predicate.md`
  - `spec/decisions/073-the-fnuntraced-exception-is-measured.md`
  - `spec/decisions/094-a-port-is-described-once.md`
  - `spec/decisions/123-a-metric-is-declared-once.md`

### Tool behaviour
- `node_modules/tstyche/dist/api.js`:
  - `isMatch: expectNode.abilityDiagnostics.size === 0` (~:4663) is why any diagnostic reads as "not callable".
  - The `fixme` directive is at ~:1794 and ~:5672-5726.
  - The default `testFileMatch` is at ~:1635.
- `node_modules/@effect/language-service/README.md`, "Configuring diagnostics" (~:365-395): the position-based
  `// @effect-diagnostics effect/floatingEffect:<severity>` directive and the project-level `diagnosticSeverity`.

### Config files
- `tstyche.json`: `{ "target": "6.0.3", "tsconfig": "tsconfig.test.json" }`.
- `tsconfig.test.json`, which extends `tsconfig.react-base.json`.
- `tsconfig.base.json`: the `@effect/language-service` plugin entry, with
  `diagnosticSeverity: { unstableApiUsage: "off" }`.
- `package.json:25` (`"test:tstyche": "tstyche"`) and `:41` (`check`, step 6).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Budget machinery in `scripts/check-house-style.mjs`:**
  - exact-count budgets checked in both directions;
  - AGENTS.md table checks;
  - comment- and string-stripping before token counts;
  - own-walk rules.
- **Replacement pin forms already in the repo:**
  - `Params<F>`: `DecisionCache.tst.ts:28`, `PortAccess.tst.ts:38`, `DiagnosticsStore.tst.ts:27`.
  - `Parameters<…>[i]` with `not.toBeAssignableTo` or `not.toBeAssignableFrom`: `DecisionStream.tst.ts:49-56`,
    `Qadi.tst.ts:175-180`.
- **`// @tstyche fixme`** (tstyche 7.2.5) for an assertion that must fail.

### Established Patterns
- **Budgets:** an exact count checked both ways, a table in AGENTS.md that the gate verifies, and a paragraph that
  cites its ADR.
- **`.tst.ts` files are also compiled by step 2,** `tsc -p tsconfig.test.json`, which includes
  `packages/*/test/**/*.ts`. The new tstyche tsconfig therefore changes step 6 only.
- **tstyche checks `// @ts-expect-error` suppressions.** The suite reports `Suppressed: 55 matched, 55 total`.
- **The suite is green with `floatingEffect` on today:** 65/65 files. So no existing positive pin targets a bare
  Effect or Stream subject, and the rule-on pass (D-07) starts green.

### Integration Points
- `tstyche.json` is pointed at the new tsconfig.
- `package.json` `test:tstyche` gains the rule-on pass (D-07).
- `spec/process/definitions-of-done.md`'s step 6 row and paragraph must match (gate 11).
- AGENTS.md §6 gets the new paragraph and table.
- Spec records:
  - a CCR-QD-453 row in `spec/README.md`;
  - ADR-QD-175 plus `spec/decisions/index.yaml`, or a revision of ADR-QD-037;
  - `spec/traceability.md` if a BEH or INV is added.
- **The 11 pins without a positive control** (line numbers on the base; see the FEATURES.md inventory):
  - `packages/audit/test/AuditPortReply.tst.ts:31`
  - `packages/audit/test/AuditWriteOutcome.tst.ts:18`
  - `packages/core/test/DecisionLog.tst.ts:30` (rewritten under D6, with its positive `{ environment: string }`)
  - `packages/core/test/Explanation.tst.ts:35` and `:46`
  - `packages/core/test/Matcher.tst.ts:33` and `:42`
  - `packages/core/test/Qadi.tst.ts:115`
  - `packages/core/test/WalkEnvironment.tst.ts:40` and `:41`
  - `packages/http/test/RequirePermission.tst.ts:63`

</code_context>

<specifics>
## Specific Ideas

- **Why D-07 enforces the rule without type analysis.** While `floatingEffect` is on, a positive pin on an Effect or
  Stream subject fails for any arguments, because tstyche treats any diagnostic on its synthesized call as "not
  callable". It follows that "every negative pin has a control on the same subject" plus "every control passes with
  the rule on" implies "no negative pin is on a bare Effect or Stream subject". `Params<F>` subjects return `void`, so
  they pass in both passes.
- **Expected end state of the budget.** 80 callable pins in 26 files once `DecisionLog.tst.ts` drops out, plus 7
  constructor pins in `Decision.tst.ts`, plus whatever the characterisation file holds by design. The characterisation
  file's bare negative pins on Effect subjects are the documented exception to D-05: they exist to pin the tool, and
  its table row says so.
- **The sweep record.** It should show per pin: the file and line, the subject, the form, the TS code it failed with,
  and the tstyche invocation used. Use the same invocation that the D-07 main pass runs.

</specifics>

<deferred>
## Deferred Ideas

- **An upstream tstyche or `@effect/language-service` issue** about the synthesized call reading as "not callable".
  It is not filed without the owner's explicit OK; the repro goes in the characterisation file's header.
- **A discipline for `@ts-expect-error` pins in `.tst.ts`.** These can be satisfied by the wrong error (PITFALLS P2),
  so they could get a message fragment or a budget. This is a later phase. Phase 65 adds one such pin, and tstyche
  already reports matched suppressions.

</deferred>

---

*Phase: 62-type-pins-that-can-fail*
*Context gathered: 2026-11-20*
