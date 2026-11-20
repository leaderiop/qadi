---
phase: QD-62
reviewers: [codex, opencode, ollama]
reviewed_at: 2026-11-20T02:06:48Z
plans_reviewed: [62-01-PLAN.md, 62-02-PLAN.md, 62-03-PLAN.md, 62-04-PLAN.md, 62-05-PLAN.md, 62-06-PLAN.md, 62-07-PLAN.md, 62-08-PLAN.md]
models:
  codex: "gpt-6-astra (reasoning=high)"
  opencode: "unknown"
  ollama: "llama3"
model_sources:
  codex: "banner"
  opencode: "unknown"
  ollama: "requested"
---

# Cross-AI Plan Review — Phase QD-62

<!-- gsd:plan-revision-conflicts:begin -->
## Plan-Revision Conflicts
<!-- gsd:plan-revision-conflicts:end -->

## Codex Review

## 62-01

**Summary:** The configuration change and characterisation address the actual mechanism. The plan is ready apart from a minor inconsistency with the locked execution layout.

**Strengths**

- The diagnosis matches installed tstyche: callability is determined by whether `abilityDiagnostics` is empty. Its `fixme` handling also rejects an unexpectedly passing assertion. See [api.js:4663](/Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/tstyche/dist/api.js:4663) and [api.js:5699](/Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/tstyche/dist/api.js:5699).
- Placing the fixture under `packages/core/test` ensures the configured project includes it; that matters because tstyche otherwise falls back to its baseline configuration. See [tsconfig.test.json:19](/Users/mohammadalmechkor/Projects/Perso/qadi/tsconfig.test.json:19).

**Concerns**

- **LOW:** The rule-on characterisation block runs in both passes, while the locked context says each half runs in exactly one pass. The block has no exclusion of its own. See [62-01-PLAN.md:198](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-01-PLAN.md:198) and [62-CONTEXT.md:72](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-CONTEXT.md:72).

**Suggestions**

- Reconcile the execution-count requirement with the chosen one-file layout. Duplicate execution is harmless technically, but the plan should explicitly resolve the discrepancy.

**Risk assessment: LOW.** The core mechanism is supported by installed source, and both compiler paths are explicitly checked.

## 62-02

**Summary:** The rewrite and controls are narrowly scoped and consistent with the current signatures. I found no blocking implementation issue.

**Strengths**

- The DecisionLog rewrite targets the required `environment` property directly. Its optionality mutation therefore tests the intended contract rather than an unrelated diagnostic. See [DecisionLog.ts:188](/Users/mohammadalmechkor/Projects/Perso/qadi/packages/core/src/DecisionLog.ts:188).
- The proposed controls match the actual API shapes: `admit` requires its second argument and returns a `Result`; `WriteFailed` requires `UnwrittenStaging`. See [Admission.ts:97](/Users/mohammadalmechkor/Projects/Perso/qadi/packages/core/src/Admission.ts:97) and [AuditWriteOutcome.ts:83](/Users/mohammadalmechkor/Projects/Perso/qadi/packages/audit/src/AuditWriteOutcome.ts:83).
- The source mutation is restored in `finally`, avoiding the unsafe blanket checkout suggested in earlier research.

**Concerns**

- **LOW:** The verification establishes unchanged negative-pin *counts*, which cannot establish that their arguments remained unchanged. The stronger “never edit the negative” requirement still needs diff review. See [62-02-PLAN.md](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-02-PLAN.md), Task 2 verification.

**Suggestions**

- Retain the small diff review as an explicit acceptance step; no additional framework is needed.

**Risk assessment: LOW.** These changes affect tests only and have focused positive and negative evidence.

## 62-03

**Summary:** The sweep’s diagnostic oracle is well designed, but the prescribed record format makes its own verifier fail.

**Strengths**

- Checking raw compiler diagnostics avoids mistaking any failing assertion for proof of argument rejection.
- Covering constructors is justified: the existing seven negatives and their positive controls are visible in [Decision.tst.ts:27](/Users/mohammadalmechkor/Projects/Perso/qadi/packages/core/test/Decision.tst.ts:27).

**Concerns**

- **HIGH — deterministic verification failure:** Task 1 requires nine `Sxx` tracer rows; Task 2 appends 87 full-sweep rows. Its verifier collects every `Sxx` row across the entire document and requires exactly 87. Following the instructions produces **96 rows**. I reproduced that count using the supplied matching expression. See [62-03-PLAN.md:211](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-03-PLAN.md:211), [62-03-PLAN.md:238](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-03-PLAN.md:238), and [62-03-PLAN.md:243](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-03-PLAN.md:243).
- **LOW:** The overload inventory omits `filterStreamProjected`, although existing parameter-type pins exercise it. See [Qadi.tst.ts:187](/Users/mohammadalmechkor/Projects/Perso/qadi/packages/core/test/Qadi.tst.ts:187) versus [62-03-PLAN.md:84](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-03-PLAN.md:84).

**Suggestions**

- Restrict row parsing to `## Sweep`, or give tracer rows a different prefix.
- Derive the overload inventory from the actual parameter-type pins and include `filterStreamProjected`.

**Risk assessment: HIGH as written.** Execution cannot satisfy the prescribed row-count check without deviating from the plan.

## 62-04

**Summary:** The separate walk and bidirectional budget fit existing conventions. The principal weakness is silently ignoring executable syntax that the checker cannot parse.

**Strengths**

- A separate walk is necessary: the existing collector explicitly excludes `.tst.ts`. See [check-house-style.mjs:889](/Users/mohammadalmechkor/Projects/Perso/qadi/scripts/check-house-style.mjs:889).
- The distinct table header avoids colliding with the existing first-match table reader. See [check-house-style.mjs:1585](/Users/mohammadalmechkor/Projects/Perso/qadi/scripts/check-house-style.mjs:1585).

**Concerns**

- **MEDIUM:** `blankCode` removes template interpolations as though they were string content. An assertion inside `${…}` consequently disappears from both counting and control checking. I confirmed the supplied implementation counts such a negative as zero. tstyche traverses nested syntax nodes, so this is executable assertion syntax, not merely quoted text. See [62-04-PLAN.md:166](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-04-PLAN.md:166) and [api.js:4019](/Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/tstyche/dist/api.js:4019).
- **MEDIUM:** Task 1 commits the budget before Task 2 adds its AGENTS table. That contradicts the applicable requirement to update budget and table in the same task. See [62-04-PLAN.md:504](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-04-PLAN.md:504) and [_SHARED-CONTEXT.md:11](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/_SHARED-CONTEXT.md:11).

**Suggestions**

- Preserve executable interpolation contents, or reject unsupported assertion-bearing syntax explicitly.
- Commit the initial budget and its table together.
- Compare the walk’s actual path set with `--listFiles`, rather than only comparing totals.

**Risk assessment: MEDIUM.** Current conventional pins are covered, but the claimed durable coverage has a silent omission.

## 62-05

**Summary:** This plan contains the most important correctness gaps. Textual control presence and configuration equality do not currently establish that a control executes successfully with the rule enabled.

**Strengths**

- Separating value subjects from type subjects prevents a `Params<F>` positive from incorrectly controlling a bare `F` negative. See [62-05-PLAN.md:147](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-05-PLAN.md:147).
- Checking the complete plugin entry protects meaningful settings already present in [tsconfig.base.json:60](/Users/mohammadalmechkor/Projects/Perso/qadi/tsconfig.base.json:60).

**Concerns**

- **HIGH — skipped controls count as evidence:** K5 collects positives without checking whether tstyche executes them. A positive inside `test.skip` satisfies the checker. I reproduced **zero control-check findings**, then ran an isolated Effect-returning fixture: both configurations exited **0** with the control skipped; enabling that control made the rule-on run exit **1**. See [62-05-PLAN.md:163](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-05-PLAN.md:163) and tstyche’s skip handling at [api.js:5757](/Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/tstyche/dist/api.js:5757).
- **HIGH — the base can disable the “rule-on” pass:** K7 removes `floatingEffect` from **both** sides before comparison and checks only that the child sets it off. Setting the base to `"off"` therefore passes the drift check; I reproduced zero findings. The characterisation’s explicit `:error` directive does not prove the base setting remains enabled. See [62-05-PLAN.md:220](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-05-PLAN.md:220) and [62-05-PLAN.md:248](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-05-PLAN.md:248).

**Suggestions**

- Require an executed, ordinarily passing control; reject skipped, filtered, or expected-failure substitutes outside the explicit characterisation exception.
- Assert that the inherited configuration enables `floatingEffect`.
- Add failure demonstrations for a skipped control and a base-level `"floatingEffect": "off"` edit.

**Risk assessment: HIGH.** Both gaps permit green checks while invalidating the central enforcement argument.

## 62-06

**Summary:** The single-command runner is a good integration choice. Its configuration coverage needs a stronger guarantee.

**Strengths**

- Wrapping both passes preserves the gate count because gate 11 recursively expands aliases and splits shell conjunctions. See [check-dod-table.mjs:61](/Users/mohammadalmechkor/Projects/Perso/qadi/scripts/check-dod-table.mjs:61).
- Fixed argument arrays, no shell, explicit working directory, and checking both statuses are appropriate. See [62-06-PLAN.md:135](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-06-PLAN.md:135).

**Concerns**

- **MEDIUM:** Passing `--tsconfig tsconfig.test.json` does not ensure every selected file uses that project. tstyche explicitly falls back to baseline for files outside `include`; its default discovery includes locations that [tsconfig.test.json:19](/Users/mohammadalmechkor/Projects/Perso/qadi/tsconfig.test.json:19) does not cover. The runner checks discovery and skip-token placement, but not project assignment. See [api.js:4229](/Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/tstyche/dist/api.js:4229) and [62-06-PLAN.md:138](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-06-PLAN.md:138).

**Suggestions**

- Fail when any selected test runs under baseline or another unintended project.
- Demonstrate this with a discovered fixture outside the configured include set.

**Risk assessment: MEDIUM.** Existing files are covered, but new discovered locations can silently escape the intended second-pass configuration.

## 62-07

**Summary:** The records plan follows the repository’s actual documentation machinery and reserved identifiers. No independent blocking issue found.

**Strengths**

- Amending ADR-QD-037 is necessary because it explicitly records `tsconfig.test.json` as the selected project. See [ADR-QD-037:113](/Users/mohammadalmechkor/Projects/Perso/qadi/spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md:113).
- The proposed CCR demonstration exercises a real gate: cited identifiers are compared with registered rows. See [verify-traceability.sh:298](/Users/mohammadalmechkor/Projects/Perso/qadi/spec/scripts/verify-traceability.sh:298).

**Concerns**

- **LOW:** The proposed ADR states universal guarantees about passing twins and configuration coverage. Those statements must describe the final verified implementation, including deliberate exceptions. See [62-07-PLAN.md:169](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-07-PLAN.md:169).

**Suggestions**

- Finalise the guarantee wording after validating the permanent checks; name the characterisation exception explicitly.

**Risk assessment: LOW.** The register and revision work is conventional and appropriately avoids inventing runtime behaviours.

## 62-08

**Summary:** The closure sequence and empty mutation scope are appropriate. The custom forbidden-token scan proves less than its acceptance criteria claim.

**Strengths**

- Skipping Stryker is justified by its source-only mutation scope, while coverage still runs through `check:pr`. See [stryker.config.mjs:81](/Users/mohammadalmechkor/Projects/Perso/qadi/stryker.config.mjs:81) and [vitest.config.ts:9](/Users/mohammadalmechkor/Projects/Perso/qadi/vitest.config.ts:9).
- The final runner line is meaningful: `run-check` exits immediately on a failed step before printing successful completion. See [run-check.mjs:86](/Users/mohammadalmechkor/Projects/Perso/qadi/scripts/run-check.mjs:86).

**Concerns**

- **MEDIUM:** The scanner excludes every line beginning with `export`, including executable declarations. I reproduced zero findings for `export const example = async () => {};`. It also compares net token counts, so removing one forbidden occurrence and adding another can pass. See [62-08-PLAN.md:194](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-08-PLAN.md:194) and [62-08-PLAN.md:231](/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-62-type-pins-that-can-fail/62-08-PLAN.md:231).
- This lacks an automatic backstop for type tests because the ordinary house-style collector excludes them. See [check-house-style.mjs:871](/Users/mohammadalmechkor/Projects/Perso/qadi/scripts/check-house-style.mjs:871).

**Suggestions**

- Exclude only import/re-export syntax, not exported declarations.
- Inspect added occurrences rather than net counts, or explicitly retain manual diff review and narrow the automated claim.

**Risk assessment: MEDIUM.** Closure could report compliance despite newly introduced forbidden constructs.

**Overall assessment: changes requested; all 8 plans reviewed.** Fix the sweep-record blocker and the control/configuration enforcement gaps before execution. The serial ordering and runtime scope are sound; the main risk is overstating what green tooling proves.

Skipped full `check:pr`, typecheck, and Stryker; repository files were unchanged. Verification used source inspection, in-memory checks, and isolated tstyche runs.

---

## OpenCode Review

opencode review failed or returned empty output. stderr:

Raw response body:
OpenCode review returned no assistant text (#1936: agent ended its turn with no final message).
Diagnostic: stop reason=?, output tokens=?
Diagnosis: opencode ran with no effort argument, so the reviewer CLI's own configuration applied and exited with status 1.

Cause found on rerun: the configured Gemini model (`gemini-4-neon`) hit its free-tier daily quota ("Quota exceeded … retry in 5h59m"). The lane did not review.

---

## Ollama Review

ollama review failed or returned empty output. stderr:

Raw response body:
{"error":{"message":"model 'llama3' not found","type":"not_found_error","param":null,"code":null}}

Diagnosis: ollama is an HTTP lane and carries no reasoning-effort setting.

Cause: the local Ollama server has no models pulled (`/api/tags` returned `{"models":[]}`). The lane did not review.

---

## Consensus Summary

Only one lane produced a review (Codex, source-grounded, with `file:line` citations and isolated tstyche reproductions). OpenCode and Ollama failed for environmental reasons, so there is no cross-reviewer consensus. The concerns below are Codex's alone. Re-run `/gsd-review --phase 62` once another lane is available if a second opinion is wanted.

Codex's verdict: **changes requested.** The serial ordering and runtime scope are sound. The main risk is that green tooling proves less than the plans claim.

### Agreed Strengths
None: only one reviewer. Codex's main strengths:
- The diagnosis matches installed tstyche (`node_modules/tstyche/dist/api.js:4663`). Callability is "no diagnostics", so `floatingEffect` makes negative pins on `Effect` and `Stream` subjects vacuous.
- A separate `.tst.ts` walk is required, because `collect()` skips type tests (`scripts/check-house-style.mjs:889`).
- Splitting value subjects from type subjects (`Params<F>`) in the control check is correct.

### Agreed Concerns
None: only one reviewer. Codex's concerns by severity:
1. **HIGH — 62-03 cannot pass its own verify.** Task 1 writes nine `Sxx` tracer rows and Task 2 appends 87 sweep rows. The verifier counts every `^| S\d{2} |` row in the file and wants exactly 87. Codex reproduced 96. Fix: parse only rows under `## Sweep`, or give tracer rows a different prefix.
2. **HIGH — 62-05 `[not-callable-control]` accepts a skipped control.** A positive inside `test.skip` satisfies the textual check. Codex reproduced a rule-on run that passes with the control skipped and fails once the control is enabled.
3. **HIGH — 62-05 `[tstyche-plugin-drift]` cannot see the base turned off.** `withoutFloatingEffect` removes `floatingEffect` from both sides before comparing. Setting `tsconfig.base.json` to `"off"` therefore passes, and the "rule-on" pass becomes rule-off. Fix: also assert that the inherited entry keeps `floatingEffect` on, and show the check failing on that edit.
4. **MEDIUM — 62-04 `blankCode` drops template interpolations,** so a pin inside `${…}` is never counted.
5. **MEDIUM — 62-04 commits the budget before its AGENTS.md table.** This breaks the same-change rule in `_SHARED-CONTEXT.md:11`.
6. **MEDIUM — 62-06 does not check which project each file runs under.** tstyche falls back to its baseline config for files outside `tsconfig.test.json`'s `include` (`api.js:4229`). Fix: fail when any file runs under an unintended project.
7. **MEDIUM — 62-08 forbidden-token scan has two holes.** It skips every line starting with `export`, so `export const f = async () => {}` passes. It also compares net counts, so removing one occurrence and adding another passes.
8. **LOW:**
   - 62-01's rule-on block runs in both passes, against CONTEXT's "exactly one pass".
   - 62-02's verify checks only negative counts, not unchanged arguments.
   - 62-03's overload inventory omits `filterStreamProjected` (`Qadi.tst.ts:187`).
   - 62-07's ADR wording must match the final checks and name the characterisation exception.

### Divergent Views
None: only one reviewer.
