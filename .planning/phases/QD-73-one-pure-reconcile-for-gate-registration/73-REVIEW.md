---
phase: QD-73-one-pure-reconcile-for-gate-registration
reviewed: 2026-11-23T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - packages/react/src/GateWriter.ts
  - packages/react/src/useGate.ts
  - packages/react/test/GateWriter.reconcile.test.ts
  - packages/react/test/GateWriter.reconcile.tst.ts
  - packages/react/test/GateWriter.test.tsx
  - packages/react/test/GateRegistration.characterisation.test.tsx
  - packages/react/test/GateRegistry.test.tsx
  - packages/react/test/support/gates.ts
  - packages/react/test/support/trees.tsx
  - packages/react/test/edges.test.tsx
  - spec/decisions/186-gate-registration-is-one-keyed-reconcile.md
  - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md
  - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
  - spec/decisions/103-a-question-is-opened-once.md
  - spec/decisions/index.yaml
  - spec/behaviors/09-react.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
  - AGENTS.md
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
  necessity: 1
status: issues_found
---

# Phase QD-73: Code Review Report

**Reviewed:** 2026-11-23
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

The keyed `reconcile`, the one-ref hook and the `useGates` single pass are correct, and I found no
bug that reaches a consumer. I traced the following and each holds:

- Effect order on a writer change, on unmount and under StrictMode's double run. The teardown
  cleanup resets the ref before the registration effect runs against the new writer, so there is no
  double registration and no stale handle.
- A `writer` of `undefined` returns from both effects.
- `Record.collect` and `Record.map` both walk `Object.keys`, so `wanted` is in the same order as
  `entries`.
- `sameIdentity` compares exactly kind, atom, wraps and marker, and `reconcile`'s doc comment,
  ADR-QD-186 decision 3 and BEH-QD-702 all say that. The reconcile tests pin each of the four
  alone, and pin policy and resource alone as keeping the entry.
- Every title quoted in BEH-QD-701 to 705 and in INV-QD-391 and 392 exists verbatim in the file it
  names (checked by script).
- The revisions in the CCR-QD-465 row match the document headers: 186 at 1.0, 140 at 1.3, 111 at
  1.2, 103 at 1.5, BEH 3.13, INV 1.181, traceability 1.256, README 1.302. Its file list matches
  the phase diff.
- The four reconcile/hook/characterisation/registry test files pass (88 tests),
  `check-house-style` is clean, and oxlint reports nothing new.
- No line added in `packages/` is over 90 characters. No `as`, `!`, `any` or `switch` was added.
  The new test helpers hold no module-scope mutable state.

The findings are one necessity finding on the failure rule, three places where doc and spec text
claim more than the code or a gate backs, and test and spec tidiness items.

Not flagged:

- The `Record` namespace import shadowing the global type works (`Record<GateKind, …>` still
  resolves to the global type).
- The double blank line at `useGate.ts:118-119` predates the phase.
- The long lines in `GateWriter.ts`, `GateWriter.test.tsx` and `GateRegistry.test.tsx` predate the
  phase. All are unchanged lines according to `git blame`.

## Warnings

### WR-01: Impossible-state guard — the rollback and `AggregateError` path of `reconcile` cannot run with any writer this package can produce

**File:** `packages/react/src/GateWriter.ts:336-376` (also ADR-QD-186 decision 6, BEH-QD-702, and
the four "when a step throws" tests)
**Category:** necessity
**Issue:** The `try`/`catch`, the `made` list, the per-handle rollback and the count-rule
`AggregateError` guard against a writer or handle that throws. The repository shows that cannot
happen here:

- A `GateWriter` is obtainable only through `gateWriterFor`, which returns the slot of an
  `OwnedGateRegistry`. `OwnedGateRegistry` is built only by `buildGateRegistry`. A hand-built
  registry has no writer (`GateWriter.ts:251-252`, `GateRegistry.store.test.ts` "a hand-built
  registry has no writer").
- In `buildGateRegistry`, `register`, `update` and `unregister` are plain `Map` and `Set` writes.
  `changed()` swallows every listener throw (`GateWriter.ts:190-196`). The collision reporter is
  wrapped by `contain` in `reporterFor` (`DeveloperSignals.ts:503-508`).
- The doc comment concedes it: "A handle from `buildGateRegistry` never throws, so with the
  package's registry nothing stays registered…". The only writers that throw are the test fakes.

So about 40 lines of source, four reconcile tests, one hook test, a decision (ADR-QD-186 item 6),
a normative requirement (BEH-QD-702) and a doc paragraph defend against a state that is not
reachable. The rule is also not the atomic one the ADR says it is. Its "Alternatives considered"
rejects a best-effort step because it "leaves a half-applied step". But a throw after an earlier
unregister leaves that unregister applied, and `live` keeps the dead entry as if it were
registered. The hook only escapes the consequence because React unmounts the component on an
effect throw. It also re-implements the devtools `throwCollected` count rule (ADR-QD-177) in a
second place.

This is the category a necessity review is for, not a defect: the code runs, it just defends
nothing. It is also not one of the locked decisions D-01 to D-13 (decision 6 was added by the
phase). Removal is a scope decision for the owner.

**Fix:** Either remove the failure rule and let a throw propagate, then drop decision 6, the
BEH-QD-702 sentence, the four tests and the hook-level "a reconcile that throws…" test.
Or keep it and say plainly where it applies, so the claim matches the code. In the doc comment and
in ADR-QD-186 decision 6, state that no writer this package builds can throw, and that the rule
exists for a foreign `GateWriter` a test supplies. Also say that a throw leaves the unregisters
already applied.

### WR-02: Hook doc comment says tests check the "no other copy" rule; INV-QD-392 says nothing does, and the CCR-QD-465 row says tests hold the single ref

**File:** `packages/react/src/useGate.ts:85-86`; `spec/traceability.md` (CCR-QD-465 row, "the step's
rules, the single ref and behaviour preserved are held by tests"); `spec/invariants.md` INV-QD-392
**Issue:** The doc comment on `useGateRegistrations` says "only tests check that it holds no other
copy of identities or states". No test checks that. The tests pin behaviour (what registers, when
it ends, how many notifications). INV-QD-392's own Enforcement paragraph says "No type or lint
rule counts the refs or the effects, so that the hook keeps one ref and no copy is checked by
review". The CCR row says "the single ref … [is] held by tests", which contradicts the INV. The
proving grep in 73-RED-EVIDENCE.md was a one-off scan, not a test or a gate. Three documents give
three different answers to "what enforces the one-ref rule", and two of them are wrong. The
sentence also puts enforcement meta-commentary in a doc comment, where it will go stale.
**Fix:** Delete the sentence from the doc comment, or reduce it to "The hook keeps `registered` and
nothing else between commits." In the CCR-QD-465 row, drop "the single ref" from the held-by-tests
list and say it is kept by review, as INV-QD-392 does.

### WR-03: INV-QD-392 says the hook "keeps no copy of any identity or state", but its one ref holds every identity it registered

**File:** `spec/invariants.md` INV-QD-392 (statement and Implication, around lines 4499 and 4503)
**Issue:** The ref is a `Map<string, Registered>`, and `Registered` is `{ identity, handle }`. The
hook therefore does keep a copy of each identity, the one it registered under. It must, because
the next commit's `sameIdentity` compares against it. The statement "It keeps no copy of any
identity or state", and the Implication "there is no copy of identities or states to fall out of
step with the registry", are false as written. The code is right; the spec text is not. 73-CONTEXT
D-13 had the accurate wording ("holds no copy of identities or states between commits **beyond its
registrations**"), and the INV dropped the qualifier. The hook's own doc comment is also accurate
("no *other* copy").
**Fix:** Restore the qualifier in the INV statement and Implication. For example: "It keeps no copy
of an identity or a state other than the identity each of its registrations was made for, and no
state diff of its own."

### WR-04: Test title "registers a new id and calls nothing else" is contradicted by its own expectation

**File:** `packages/react/test/GateWriter.reconcile.test.ts:115`
**Issue:** The expected log is `[["update", "a", "Pending"], ["register", "b", "Allowed",
undefined]]`. The test does call something else: it calls `update` on the kept `a`. The title
describes the old, pre-update `reconcile`. 73-RED-EVIDENCE.md quotes this title as a failing title
under the register-before-unregister gut, so a reader checking the evidence reads a title that says
the opposite of the assertion.
**Fix:** Retitle it to what it holds, for example "keeps a live entry, updates it, and registers an
id that was not live". Update the quotation in 73-RED-EVIDENCE.md in the same edit.

## Info

### IN-01: Mis-indented block in the AggregateError test

**File:** `packages/react/test/GateWriter.reconcile.test.ts:492-497`
**Issue:** The `if (!(caught instanceof AggregateError)) { throw … }` block and the
`expect(caught.message).toBe(\n "…",\n )` call sit at the wrong indent: the closing braces and the
string are two columns left of the code around them. It is the only mis-indented block in the
phase's tests, in a codebase that wraps by hand and has no formatter gate to catch it.
**Fix:** Re-indent the two statements to the surrounding level.

### IN-02: `sameIdentity` is exported and used nowhere outside `GateWriter.ts`

**File:** `packages/react/src/GateWriter.ts:281`
**Issue:** The phase moved the only outside caller (`useGate.ts`) onto `reconcile`. No test imports
`sameIdentity` either. `GateWriter.ts` is out of the barrel, so the API-surface gate does not see
it, but it is now a public symbol of the module with one internal caller, and INV-QD-391's Source
line names it as part of the invariant.
**Fix:** Make it a non-exported `const`. Keep it in the INV Source line as an internal function,
or name only `reconcile`.

### IN-03: `notificationsOf` is documented as the one shared counter, but three gate test files still hand-roll it

**File:** `packages/react/test/support/gates.ts:1-7`; `packages/react/test/GateRegistry.test.tsx:331-334`;
`packages/react/test/hooks.rerender.test.tsx:88-91`; `packages/react/test/GateRegistry.store.test.ts:60-90`
**Issue:** The header says "Tests that state how many times a registry told its subscribers share
this one counter, so the subscription and the running count are written once". They do not.
`GateRegistry.test.tsx`, `hooks.rerender.test.tsx` and the store test each keep their own
`let notified = 0; subscribe(() => { notified += 1; })`. Two of the store cases need the
unsubscribe handle, which `notificationsOf` does not return. The store case "does not notify for an
unchanged state" is one of the tests BEH-QD-703 and INV-QD-391 cite as the equal-state enforcer.
A smaller duplicate: `GateWriter.test.tsx:19` and `GateWriter.reconcile.test.ts:72-73` each define
the same `canRead` and `canWrite` factories, and each builds its own identity fixture
(`identityFor` and `identity`).
**Fix:** Either return `{ told, unsubscribe }` from the helper and move the remaining gate-registry
counters onto it, or narrow the header to "the tests that read a running count after a step". Move
the `canRead`/`canWrite` factories into `support/` if a third caller appears.

### IN-04: Type-pin header and INV-QD-391 claim slightly more than the `.tst.ts` pins

**File:** `packages/react/test/GateWriter.reconcile.tst.ts:1-13, 24-28`; `spec/invariants.md` INV-QD-391
**Issue:**
- The header says "each refused value is held in a `const` that `expect` reads" and "each refusal
  differs from its accepted twin in one thing". The `GateCurrent` refusal is a bare
  `export type … ` with no `const`. Its "twin" is `export type { GateWanted }`, a different name
  that is neither a twin nor explained, so the file's single re-export line looks accidental.
- The `GateCurrent` pin fixes the absence of one name. A renamed index-aligned type compiles. INV-QD-391
  says the compiler refuses "any name for an index-aligned `GateCurrent` type", which reads as
  stronger than that.
- "a GateIdentity literal without an id is accepted" asserts `expect(identity).type.toBe<GateIdentity>()`
  on a value annotated `GateIdentity`, which cannot fail. The real check is that the literal
  compiles.
**Fix:** In the header, say the `GateCurrent` pin is a by-name absence pin and why `GateWanted` is
re-exported. In INV-QD-391 say "refuses the name `GateCurrent`". Optionally drop the vacuous
`expect` and keep only the annotated literal.

### IN-05: Traceability row attributes the reconcile-rule note to BEH-QD-704

**File:** `spec/traceability.md` (the `packages/react/test/GateRegistry.test.tsx` row)
**Issue:** The row ends "BEH-QD-704 — the rules of the reconcile are pinned in
GateWriter.reconcile.test.ts and the characterisation (ADR-QD-186)". BEH-QD-704 is about teardown on
unmount and writer change. The three cases that left this file were equal-state and equal-record
(BEH-QD-703 and BEH-QD-705) and dropped-key (BEH-QD-702), so the label points at the wrong
behaviour, and the sentence is a pointer to elsewhere, not something this file pins.
**Fix:** Name the behaviours the removed cases belonged to (BEH-QD-702, BEH-QD-703, BEH-QD-705), or
drop the sentence.

### IN-06: Characterisation file — row placement, redundant header list, and overlapping reconcile tests

**File:** `packages/react/test/GateRegistration.characterisation.test.tsx:1-22, 566`;
`packages/react/test/GateWriter.reconcile.test.ts:201, 226, 243`
**Issue:**
- "a changed gates prop moves every entry to the new registry, keeping its id" is a writer-change
  row filed under `describe("off means absent")`. A writer change is not absence, and BEH-QD-704
  cites it as such.
- The header's "Shared helpers it uses: …" paragraph repeats the import list line for line and will
  go stale the first time an import changes.
- The reconcile tests "keeps the entry when only the policy or the resource changed" (201) and
  "keeps unchanged identities with fresh policy objects, calling only update" (243) assert the same
  thing, one entry versus two. "reconciling the same input twice…" (226) overlaps with "tells a kept
  handle its state even when unchanged…" (192). The 73-RED-EVIDENCE.md table maps the removed
  registry cases onto 226 and 243, so deleting either needs that table updated too.
**Fix:** Move the writer-change row to a describe named for it, or rename the describe. Delete the
helper list from the header. Merge the overlapping reconcile cases or keep them and say why.

---

_Reviewed: 2026-11-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
