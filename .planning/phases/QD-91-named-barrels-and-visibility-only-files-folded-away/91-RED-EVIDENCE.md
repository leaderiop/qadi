# Phase 91 RED evidence

Each block below is written by `91-check.mjs variant`: the check ran inside a scratch clone, after the edit the block names, and failed.

## 91-check base
- scratch: v-base at a672a6f390
- edit: the clone's base record 91-mutation-base.json deleted
- diff: 4c275b0a17e210631922eb92e775c98a7dab42d2185e980b8d21286d84007884 (1 files, +0 -356)
- run: script 91-check.mjs base
- exit: 1
- failing text: phase_base is not recorded

## 91-check commit
- scratch: v-commit at a672a6f390
- edit: none: the base tree has no commit with this subject
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs commit docs(91-02): record the phase check seen failing .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md
- exit: 1
- failing text: 0 commits since phase_base have the subject: docs(91-02): record the phase check seen failing

## 91-check unchanged
- scratch: v-unchanged at a672a6f390
- edit: a comment line appended to packages/core/test/Resource.test.ts
- diff: 2450d251ba45dd546aa4e08fcdfd5e96424a27b54d220535548c5e7f84c00b41 (1 files, +2 -0)
- run: script 91-check.mjs unchanged packages/core/test/Resource.test.ts
- exit: 1
- failing text: packages/core/test/Resource.test.ts differs from phase_base

## 91-check vitest
- scratch: v-vitest at a672a6f390
- edit: packages/core/test/Resource.test.ts: the expected id of a string id changed from "a" to "b"
- diff: 658b4b843a0710a6d5cfdecb4148b5f685a172d3136c91173cedd35c4d1cb5b6 (1 files, +1 -1)
- run: script 91-check.mjs vitest packages/core/test/Resource.test.ts
- exit: 1
- failing text: resourceIdOf — the writer's reading of the id rule a string id is the resource's id fails: AssertionError: expected 'a' to equal 'b'

## 91-check scan-ids
- scratch: v-ids at a672a6f390
- edit: a comment holding D-12 appended to packages/core/src/Resource.ts
- diff: 0145535093153c0aa115278b8885a6634dd9c83d5622ed1941577761c57cc42e (1 files, +2 -0)
- run: script 91-check.mjs scan-ids
- exit: 1
- failing text: packages/core/src/Resource.ts:37 names a decision number: // D-12 says so

## 91-check scan-forbidden as-cast
- scratch: v-forbidden-as at a672a6f390
- edit: an as cast appended to packages/core/src/Resource.ts
- diff: 37327e4e83a1efa24dcac06aae98dbd031f1fa83832925736b7dcc2f63f0eabb (1 files, +2 -0)
- run: script 91-check.mjs scan-forbidden
- exit: 1
- failing text: packages/core/src/Resource.ts:37 uses an as cast: export const planted = (v: unknown) => v as string;

## 91-check scan-forbidden agents-section-6
- scratch: v-forbidden-agents at a672a6f390
- edit: a line added under the heading of AGENTS.md section 6
- diff: 784179ad643bf518c4b3a85f8f15988404d554e580dba3b5ca4ddc63185adea7 (1 files, +2 -0)
- run: script 91-check.mjs scan-forbidden
- exit: 1
- failing text: AGENTS.md differs from phase_base outside sections 7a, 9 and 16: only those may change

## 91-check scan-forbidden budget-number
- scratch: v-forbidden-budget at a672a6f390
- edit: the first number of SWITCH_BUDGET in scripts/check-house-style.mjs raised by one
- diff: 380d38b482112974be8f91dfce6576c9430f762cb134ed653dff5b48c467c7bd (1 files, +1 -1)
- run: script 91-check.mjs scan-forbidden
- exit: 1
- failing text: scripts/check-house-style.mjs: an entry of SWITCH_BUDGET differs from phase_base: no budget moves

## 91-check trailers
- scratch: v-trailers at f652558cc5
- edit: a commit with no trailer added in the clone
- diff: 2450d251ba45dd546aa4e08fcdfd5e96424a27b54d220535548c5e7f84c00b41 (1 files, +2 -0)
- run: script 91-check.mjs trailers
- exit: 1
- failing text: f652558c test(91-02): planted commit with no trailer: the message has 0 Co-Authored-By lines, not one

## 91-check records
- scratch: v-records at a672a6f390
- edit: packages/core/test/EvaluationSpan.contract.test.ts renamed, which spec/behaviors/30-port-calls.md names
- diff: 0b9c94d75f8e995b91b2430a0b81190d7c0babb4b4eb792e32e4b47126f3cdfe (1 files, +0 -0)
- run: script 91-check.mjs records
- exit: 1
- failing text: BEH-QD-711 (spec/behaviors/30-port-calls.md) names packages/core/test/EvaluationSpan.contract.test.ts, which does not exist
- failing text: BEH-QD-712 (spec/behaviors/30-port-calls.md) names packages/core/test/EvaluationSpan.contract.test.ts, which does not exist
- failing text: BEH-QD-713 (spec/behaviors/30-port-calls.md) names packages/core/test/EvaluationSpan.contract.test.ts, which does not exist

## 91-check records-close
- scratch: v-records-close at a672a6f390
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs records --close
- exit: 1
- failing text: spec/README.md holds no row | CCR-QD-483 |
- failing text: spec/behaviors/30-port-calls.md holds 0 headings ## BEH-QD-791:, not one
- failing text: spec/behaviors/19-hydration.md holds 0 headings ## BEH-QD-792:, not one

## 91-check circular
- scratch: v-circular at a672a6f390
- edit: packages/core/src/PortName.ts imports ./Ports.ts
- diff: e023ec8b2b5846fd08b3c0db47efc303007658fe477495a302c2cb4b2f082363 (1 files, +2 -0)
- run: circular
- exit: 1
- failing text: 1) core/src/PortDerivation.ts > core/src/PortDefault.ts > core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts
- failing text: 2) core/src/PortDefault.ts > core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts > core/src/PortDescription.ts
- failing text: 3) core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts > core/src/PortDescription.ts

## 91-check surface
- scratch: v-surface at a672a6f390
- edit: none: the base tree has no scripts/surface-diff.mjs
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: surface
- exit: 1
- failing text: scripts/surface-diff.mjs does not exist
- failing text: .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-surface-base.json does not exist
- failing text: .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-SURFACE.md does not exist

## 91-check structural
- scratch: v-structural at a672a6f390
- edit: none: the base tree has no commit with this subject
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs structural --record FOLDS refactor(91-10): fold the port span decoder into the span machinery
- exit: 1
- failing text: 0 commits since phase_base have the subject: refactor(91-10): fold the port span decoder into the span machinery

## 91-check seen-failing
- scratch: v-seen at a672a6f390
- edit: the evidence file lists every title of packages/react/test/Hydration.tst.ts but the last
- diff: dfa13d92ff16947735f667d710cb46a676eb7a5693838462fb39c7f79022857f (1 files, +10 -0)
- run: script 91-check.mjs seen-failing packages/react/test/Hydration.tst.ts
- exit: 1
- failing text: no seen failing line in the evidence for: a seed's constructor input is its verdict's seed fields plus the subject (ADR-QD-157)

## 91-check barrels
- scratch: v-shapes at a672a6f390
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs barrels --text
- exit: 1
- failing text: packages/core/src/index.ts:1 is an export * line: export * from "./AttributeResolver.ts";
- failing text: packages/core/src/index.ts:2 is an export * line: export * from "./AuthSubject.ts";
- failing text: packages/core/src/index.ts:3 is an export * line: export * from "./Authorized.ts";

## 91-check homes
- scratch: v-shapes at a672a6f390
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs homes
- exit: 1
- failing text: .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-surface-base.json does not exist: the kinds of the base names cannot be read

## 91-check folds
- scratch: v-shapes at a672a6f390
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs folds
- exit: 1
- failing text: 0 commits since phase_base have the subject: refactor(91-10): fold the port span decoder into the span machinery
- failing text: 0 commits since phase_base have the subject: refactor(91-10): fold the interpreter set into the span types
- failing text: 0 commits since phase_base have the subject: refactor(91-11): fold the gate registry constructor into the gate writer

## 91-check rule
- scratch: v-shapes at a672a6f390
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs rule
- exit: 1
- failing text: scripts/check-house-style.mjs does not declare NAMED_BARRELS
- failing text: scripts/check-house-style.mjs does not hold [named-barrel-self-test]
- failing text: scripts/check-house-style.mjs does not hold [named-barrel]

## 91-check changesets
- scratch: v-shapes at a672a6f390
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs changesets
- exit: 1
- failing text: 0 changesets are added since phase_base, not 3
- failing text: .changeset/core-named-barrel.md is not added since phase_base
- failing text: .changeset/react-named-barrel.md is not added since phase_base

## 91-check spike
- scratch: v-shapes at a672a6f390
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs spike
- exit: 1
- failing text: .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-SPIKE.md does not exist

## 91-check spike-rerun
- scratch: v-shapes at a672a6f390
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs spike --rerun
- exit: 1
- failing text: .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-SPIKE.md does not exist

## 91-check escape
- scratch: v-shapes at a672a6f390
- edit: none: the base tree has no scripts/lib/declaration-escape.mjs and no check 3c
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs escape
- exit: 1
- failing text: scripts/lib/declaration-escape.mjs does not exist

## 91-check escape-scan
- scratch: v-shapes at a672a6f390
- edit: none: the base tree has no scripts/lib/declaration-escape.mjs
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs escape-scan packages/core/lib
- exit: 1
- failing text: scripts/lib/declaration-escape.mjs does not exist

## 91-check scratch-clean-check
- scratch: v-shapes at a672a6f390
- edit: none: the clone lives under the scratch root, which therefore exists
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs scratch-clean --check
- exit: 1
- failing text: /private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd91 still exists

## 91-check scratch-name
- scratch: v-shapes at a672a6f390
- edit: none: a name holding .. is refused
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs scratch ../escape
- exit: 1
- failing text: ../escape is not a scratch name: no / and no ..

## 91-mutation landed-base
- scratch: v-landed-base at a672a6f390
- edit: phase_base of the clone's base record set to the parent of the recorded phase_base
- diff: d61db9a83cc704163c6002cd736f46e90fc2c8d170706c642fd006f33fcc78ee (1 files, +1 -1)
- run: script 91-mutation.mjs landed base
- exit: 1
- failing text: groups.core.head is not phase_base
- failing text: groups.audit.head is not phase_base
- failing text: groups.react.head is not phase_base

## 91-mutation landed-coverage-base
- scratch: v-landed-covbase at a672a6f390
- edit: the clone's 91-coverage-base.json deleted
- diff: d5aaa6985908881b038b66ed42159863b53189d6024e6c142d6e6e9ab5757fb7 (1 files, +0 -314)
- run: script 91-mutation.mjs landed coverage-base
- exit: 1
- failing text: .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-coverage-base.json does not exist

## 91-mutation landed-close
- scratch: v-scorer at a672a6f390
- edit: none: the base tree has no close commit
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-mutation.mjs landed close
- exit: 1
- failing text: exactly one commit must be "docs(91-21): record the mutation close", found 0

## 91-mutation landed-coverage-close
- scratch: v-scorer at a672a6f390
- edit: none: the base tree has no coverage close commit
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-mutation.mjs landed coverage-close
- exit: 1
- failing text: exactly one commit must be "docs(91-21): record the coverage close", found 0

## 91-mutation compare
- scratch: v-scorer at a672a6f390
- edit: none: the base tree has no close record
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-mutation.mjs compare
- exit: 1
- failing text: node:fs:624
- failing text:     return binding.readFileUtf8(path, stringToFlags(options.flag));
- failing text:                    ^

## 91-mutation probe
- scratch: v-scorer at a672a6f390
- edit: none: the base tree has no close record
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-mutation.mjs probe --group core
- exit: 1
- failing text: node:fs:624
- failing text:     return binding.readFileUtf8(path, stringToFlags(options.flag));
- failing text:                    ^

## 91-mutation record-close
- scratch: v-scorer at a672a6f390
- edit: none: the base tree has no Stryker report under reports/mutation/
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-mutation.mjs record close --group core
- exit: 1
- failing text: node:fs:624
- failing text:     return binding.readFileUtf8(path, stringToFlags(options.flag));
- failing text:                    ^

## 91-mutation record-base-dirty
- scratch: v-record-base at a672a6f390
- edit: an uncommitted comment line appended to packages/core/src/Resource.ts
- diff: c1a8cd63bf88eec7394c1424e6500c53f6a0d527bef12b43730484d7afd45f38 (1 files, +2 -0)
- run: script 91-mutation.mjs record base --group core
- exit: 1
- failing text: record from a clean tree; these differ from HEAD:
- failing text:  M packages/core/src/Resource.ts

## 91-mutation coverage-base-moved-source
- scratch: v-cov-base at a4b3e04a73
- edit: a comment line appended to packages/core/src/Resource.ts and committed in the clone
- diff: c1a8cd63bf88eec7394c1424e6500c53f6a0d527bef12b43730484d7afd45f38 (1 files, +2 -0)
- run: script 91-mutation.mjs coverage base
- exit: 1
- failing text: the tree outside .planning differs from 69e5247d205949df7396dfacb0a29bc96a02f321: the coverage base is taken on the unchanged tree

## 91-check suite
- scratch: v-vitest at a672a6f390
- edit: packages/core/test/Resource.test.ts: the expected id of a string id changed from "a" to "b"
- diff: 658b4b843a0710a6d5cfdecb4148b5f685a172d3136c91173cedd35c4d1cb5b6 (1 files, +1 -1)
- run: script 91-check.mjs suite
- exit: 1
- failing text: resourceIdOf — the writer's reading of the id rule a string id is the resource's id fails: AssertionError: expected 'a' to equal 'b'

## 91-check close
- scratch: v-close at a672a6f390
- edit: none: the base tree, whose children are red
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-check.mjs close
- exit: 1
- failing text: node .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-pinned-check.mjs --all-applied exited 1
- failing text: node .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-earlier-checks.mjs exited 1
- failing text: 91-check.mjs records --close exited 1

## 91-mutation coverage-close-floor
- scratch: v-cov-floor at d9ccfe9a34
- edit: every file under packages/core/test but Resource.test.ts deleted and committed in the clone, so core's total falls below 95
- diff: 68ba460c0e3777b7bcaf61d45e497fb84e8d7310cc3ce8a15424b8b192e7a632 (133 files, +224 -47739)
- run: script 91-mutation.mjs coverage close
- exit: 1
- failing text: ERROR: Coverage for lines (0.27%) does not meet global threshold (90%)
- failing text: ERROR: Coverage for functions (0.07%) does not meet global threshold (90%)
- failing text: ERROR: Coverage for statements (0.23%) does not meet global threshold (90%)

## surface-type-only-class
- scratch: s-typeonly at e958e84400
- edit: append export type { AccessDenied } from "./Errors.ts"; to packages/core/src/index.ts: an explicit export shadows the star export and turns a class into a type-only name
- diff: 1f480cc973a09a710bf5f7ab0f9500bab75edfb26eef1a96a54a8cac9cfdf9fd (1 files, +1 -0)
- run: surface
- exit: 1
- failing text: surface-diff compare exited 1: KIND @qadi/core AccessDenied both -> type | surface-diff: 1 difference(s)

## surface-dropped-name
- scratch: s-dropped at e958e84400
- edit: delete the export * from "./Retention.ts"; line of packages/audit/src/index.ts (no package depends on audit)
- diff: b57c3554df13c0fb6d3ade4687482178fbf8222437bfc24b02015a4f309bfa05 (1 files, +0 -1)
- run: surface
- exit: 1
- failing text: surface-diff compare exited 1: REMOVED @qadi/audit PurgePlan (type) | REMOVED @qadi/audit RetentionInputInvalid (both) | REMOVED @qadi/audit RetentionInputRefusal (both)

## surface-missing-lib
- scratch: s-nolib at e958e84400
- edit: none: a fresh clone with no build, so every packages/*/lib is absent
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script scripts/surface-diff.mjs snapshot /private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd91/x.json
- exit: 1
- failing text: surface-diff: @qadi/audit .: packages/audit/lib/index.d.ts is missing; run pnpm build

## surface-self-test-classifier
- scratch: s-classifier at e958e84400
- edit: scripts/lib/surface-scan.mjs: the node.parent?.parent?.isTypeOnly clause removed from typeOnlyHop
- diff: a106bb5eb5aa64518e0c94f9fbe9e19a86ad1aa94422b96f5729357220d2c5fd (1 files, +1 -2)
- run: script scripts/surface-diff.mjs --self-test
- exit: 1
- failing text: surface-diff self-test: a class, a pair, a dropped name and an added name are each named: got ["ADDED @scratch/pkg Extra (type)","REMOVED @scratch/pkg Plain (type)"], wanted ["KIND @scratch/pkg Err both -> type","ADDED @scratch/pkg Extra (type)","KIND @scratch/pkg Pair both -> type","REMOVED @scratch/pkg Plain (type)"]
- failing text: surface-diff self-test: compare of different snapshots exits 1 naming each difference: ADDED @scratch/pkg Extra (type)
- failing text: REMOVED @scratch/pkg Plain (type)

## dod-step-27
- scratch: s-dod at e958e84400
- edit: spec/process/definitions-of-done.md: row 27 removed from the table
- diff: 3e38fd99af1f3f4ef5fc0b1cf8e8a9651fa0b19900d1b6a32ea2f343dc4fe66b (1 files, +0 -1)
- run: script scripts/check-dod-table.mjs
- exit: 1
- failing text: spec/process/definitions-of-done.md  [missing] `pnpm check` runs `node scripts/surface-diff.mjs --self-test` as step 27 and the table stops at 26.
- failing text: README.md  [count] says "all twenty-six gates" and `pnpm check` runs 27.
- failing text: 2 merge-gate drift(s). `pnpm check` and spec/process/definitions-of-done.md are one thing described twice.

## values-core-type-only
- scratch: v-core at 02009ea482
- edit: packages/core/src/index.ts: export * from "./Errors.ts" replaced by a named list of its values without AccessDenied, and export type { AccessDenied } from "./Errors.ts"
- diff: 9bacb86091e2e4ca796cc87ea3a29075646fd8ac1d80a0637fd90132d215c39f (1 files, +2 -1)
- run: vitest packages/core/test/surface.test.ts
- exit: 1
- seen failing: @qadi/core's root exports exactly these runtime values
- failing text: AssertionError: expected [ 'AccessDeniedPublic', …(340) ] to deeply equal [ 'AccessDenied', …(341) ]

## values-react-type-only
- scratch: v-react at 02009ea482
- edit: packages/react/src/index.ts: export * from "./QadiProvider.tsx" replaced by a named list of its values without useQadiContext, and export type { useQadiContext } from "./QadiProvider.tsx"
- diff: 9f40718322a091937d8948c03a9dc43d406aa7bad6db8316c69f626e07fb8860 (1 files, +2 -1)
- run: vitest packages/react/test/surface.test.ts
- exit: 1
- seen failing: @qadi/react's root exports exactly these runtime values
- seen failing: @qadi/react's root reaches useQadiContext from the package root
- failing text: AssertionError: expected [ 'Can', 'Cannot', …(25) ] to deeply equal [ 'Can', 'Cannot', …(26) ]
- failing text: AssertionError: expected 'undefined' to equal 'function'

## values-audit-type-only
- scratch: v-audit at 02009ea482
- edit: packages/audit/src/index.ts: export * from "./SequenceIntegrity.ts" replaced by export { SequenceIntegrityError } and export type { verifySequenceIntegrity } from "./SequenceIntegrity.ts"
- diff: 05a917acc8849b88d78409338f5a9ec094643737612a2bf49276c9525fd40267 (1 files, +2 -1)
- run: vitest packages/audit/test/surface.test.ts
- exit: 1
- seen failing: @qadi/audit's root exports exactly these runtime values
- failing text: AssertionError: expected [ 'ArchiveInputInvalid', …(39) ] to deeply equal [ 'ArchiveInputInvalid', …(40) ]

## escape-self-check
- scratch: escape-self at 242282311c
- edit: scripts/lib/declaration-escape.mjs: the /src/ rule of declarationEscapes disabled (if (false) in place of the segment test), so the planted cases that expect a src/ reason are judged short
- diff: 472ae31b7b8f8fea0b5c75721b456e74a1aa5d4ae5cc239a450868c628b57b01 (1 files, +1 -1)
- run: package
- exit: 1
- failing text:   [escape-self-check] planted case "an escape outside the package" was not judged as planted (9 cases)
- failing text:   [escape-self-check] planted case "a path into src inside the package" was not judged as planted (9 cases)
- failing text:   [escape-self-check] planted case "an escape after a string holding //" was not judged as planted (9 cases)

## escape-layout
- scratch: escape-layout at 242282311c
- edit: packages/react/node_modules replaced by a real directory linking every entry of the main tree's except @qadi/core (react resolves @qadi/core through tsconfig.base.json paths only); packages/core/src/index.ts: export * from "./Decision.ts" replaced by an export { 16 values } and an export type { 9 types } group naming every name of that module except Trace; pnpm build exited 2 on the unrelated devtools TS2305 (Inspect.ts, Trace) after emitting react's lib
- diff: 554a5dd3a1b52e3c06453088f07f2860e9c1642597f6b0cf9fe1458448c84b38 (1 files, +2 -1)
- run: script 91-check.mjs escape-scan packages/react/lib
- exit: 1
- failing text: lib/HydrationEngine.d.ts: names a src/ path: ../../core/src/Decision.ts
- failing text: lib/HydrationEngine.d.ts: resolves outside its package: ../../core/src/Decision.ts
- failing text: lib/SeededDecision.d.ts: names a src/ path: ../../core/src/Decision

## pinned-held-body
- scratch: p-held-body at 46432b6dfd
- edit: packages/core/test/PortSpan.test.ts: the expected value of the assertion on line 79 changed from {} to { x: 1 }, outside the declared import region
- diff: 25acdd7be8ea047fc80101e94c97d914bf884ba49a7f910596656d25e103a175 (1 files, +1 -1)
- run: script 91-pinned-check.mjs
- exit: 1
- failing text: packages/core/test/PortSpan.test.ts: differs from its base text at line 79

## pinned-held-moved
- scratch: p-held-moved at 46432b6dfd
- edit: packages/http/test/accessPlan.test.ts renamed to accessPlanMoved.test.ts (git mv, staged)
- diff: 21381c4092e559825e8561d721573086b21a17675027d36e83e6bb6b7963a37f (1 files, +0 -0)
- run: script 91-pinned-check.mjs
- exit: 1
- failing text: packages/http/test/accessPlan.test.ts moved to packages/http/test/accessPlanMoved.test.ts

## pinned-declared-outside
- scratch: p-declared-outside at d6e82e755e
- edit: a scratch commit with the decoder-fold subject re-points line 19 of packages/core/test/PortSpan.test.ts and also changes the assertion on line 79
- diff: 068c51eacaccce897bbf3decce697f34395dfb27044894246bef9d6161f83a73 (1 files, +2 -2)
- run: script 91-pinned-check.mjs
- exit: 1
- failing text: packages/core/test/PortSpan.test.ts: differs outside its declared lines at line 79

## pinned-declared-non-import
- scratch: p-declared-non-import at a87805dc14
- edit: a scratch commit with the decoder-fold subject replaces line 19 of packages/core/test/PortSpan.test.ts by an import and a const statement
- diff: 271055e6956b47ed84cfc89a11890a77212472601f283f3a807e9d610fbdaaf0 (1 files, +2 -1)
- run: script 91-pinned-check.mjs
- exit: 1
- failing text: packages/core/test/PortSpan.test.ts: line 2 of what replaces region 1 is not an import declaration

## pinned-held-source
- scratch: p-held-source at 46432b6dfd
- edit: packages/react/src/QadiProvider.tsx line 50 (the gateWriterFor import, outside the declared line 49) edited
- diff: c3e38e6f03a4ea169fe87e65217903ac81ecbfc32fe785339786ec215ddf86f4 (1 files, +1 -1)
- run: script 91-pinned-check.mjs
- exit: 1
- failing text: packages/react/src/QadiProvider.tsx: differs from its base text at line 50

## pinned-earlier-held
- scratch: p-earlier-held at cd9185ff59
- edit: a scratch commit chore(91-99): touch edits a comment line (line 2) of packages/react/src/RegistryLease.ts
- diff: 5232a15e31381603e52e527ad411fa20637e7b43123760b717eafd19f3c52daf (1 files, +1 -1)
- run: script 91-pinned-check.mjs
- exit: 1
- failing text: packages/react/src/RegistryLease.ts: changed by cd9185ff59 "chore(91-99): touch", and phase 86's pinned check holds it (only "docs(91-19): name the registry lease's one caller" may)

## pinned-born
- scratch: p-born at 46432b6dfd
- edit: line 1 of packages/audit/test/surface.test.ts replaced by a comment
- diff: 55c07e761525cde757f6357008e0b433b0afd123f178f22bb1ddb5ee94fd57b1 (1 files, +1 -1)
- run: script 91-pinned-check.mjs
- exit: 1
- failing text: packages/audit/test/surface.test.ts: differs from the commit that added it at line 1

## pinned-all-applied
- scratch: p-all-applied at 46432b6dfd
- edit: none: the unedited clone, run with --all-applied (no fold has landed)
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 91-pinned-check.mjs --all-applied
- exit: 1
- failing text: packages/react/test/HydrationTarget.tst.ts: no commit adds it
- failing text: packages/react/test/DecisionOutcome.tst.ts: its declared edit is not applied
- failing text: packages/react/test/DeveloperSignalReporters.test.tsx: its declared edit is not applied

## earlier-unexplained
- scratch: earlier-unexplained at 781503092b
- edit: a scratch commit chore(91-99): touch swaps two import lines of packages/react/test/GateWriter.test.tsx: the 86 pinned row gains a path no existing subject explains
- diff: a31b8b77a1b8920e9ef04bd04145f3448eaffb71542a070c290ce91be1a5cae0 (1 files, +1 -1)
- run: script 91-earlier-checks.mjs
- exit: 1
- failing text: 86-pinned-check.mjs: expected exit 0, got exit 1: packages/react/test/GateWriter.test.tsx is reported as M against its base, not unchanged
- failing text: 85-check.mjs base: exit 0: 2741584f50d176281038b478d0350dc35f174cc2
- failing text: 85-check.mjs scan-ids: exit 1: packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: /** The status tag of every notification a feed publishes from now on, in order. */

## earlier-unmoved
- scratch: earlier-unmoved at 27fcf35e53
- edit: a scratch commit with the exact decoder-fold subject touches only 91-SURFACE.md under .planning: the 90 pinned row's expected move, and the six scan-forbidden moves, are missing
- diff: 8c3b114962bb661440e842f5d0c626730a91006ca39df8fb62f4e7f1e5f53990 (1 files, +1 -0)
- run: script 91-earlier-checks.mjs
- exit: 1
- failing text: 85-check.mjs scan-forbidden: missing reason "scripts/check-house-style.mjs differs from phase_base: no budget moves"
- failing text: 86-check.mjs scan-forbidden: missing reason "scripts/check-house-style.mjs differs from phase_base: no budget moves"
- failing text: 87-check.mjs scan-forbidden: missing reason "scripts/check-house-style.mjs differs from phase_base: no budget moves"

## earlier-row-without-run
- scratch: earlier-row-without-run at 2e8089e1cf
- edit: the clone's copy of the script has the RUNS entry for 86-check.mjs records --close deleted, so a row has no run
- diff: 9e4d855d85525cf6d40a875d6882e2fcf90bcb5e0ae0dba251e7ddc68b82ab13 (1 files, +0 -1)
- run: script 91-earlier-checks.mjs
- exit: 1
- failing text: missing run: 86-check.mjs records --close
- failing text: 85-check.mjs base: exit 0: 2741584f50d176281038b478d0350dc35f174cc2
- failing text: 85-check.mjs scan-ids: exit 1: packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: /** The status tag of every notification a feed publishes from now on, in order. */

## span-untrusted-decode
- scratch: span-json at 136830bf37
- edit: a JSON.parse call spread into the object decodePortSpan returns, in packages/core/src/PortSpanEncode.ts of the decoder-fold commit
- diff: cb80f6c97fb46fa8b63eddb752b5102abfd289e99f1aec9c83431caa1fa4f05a (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/PortSpanEncode.ts  [untrusted-decode] declares 2 untrusted-decode token(s), found 3 at line(s) 71, 74, 273.
- failing text:     Update UNTRUSTED_DECODE_BUDGET in scripts/check-house-style.mjs and AGENTS.md section 7a's table, with the reason, so they agree.
- failing text: 1 house-style violation(s). See AGENTS.md.

## span-key-source
- scratch: span-key at 136830bf37
- edit: a second spelling of the shared subject id key, a spread of { subjectId: "qadi.subject_id" } into the object decodePortSpan returns, in packages/core/src/PortSpanEncode.ts of the decoder-fold commit
- diff: 849d165f30e1f10336e49454d955cf3bffde8c90dbe543ab22a994e9f252cef8 (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/PortSpanEncode.ts:273  [span-key-source] mentions the span key `qadi.subject_id`; read it through EvaluationSpan.ts (ADR-QD-188).
- failing text:     ...{ subjectId: "qadi.subject_id" },
- failing text: 1 house-style violation(s). See AGENTS.md.

## gate-collision-ignored
- scratch: gate-collision at 45e366ac6d
- edit: makeGateRegistry in packages/react/src/GateWriter.ts passes undefined to buildGateRegistry instead of the reporter resolved under onIdCollision
- diff: a2a819becbf9977ea87018ed06cc6d4b3b8f1249681b532f5d998d42f5f64e3f (1 files, +1 -3)
- run: vitest packages/react/test/DeveloperSignals.test.ts packages/react/test/GateRegistry.store.test.ts packages/react/test/GateWriter.reconcile.test.ts packages/react/test/DeveloperSignalReporters.test.tsx
- exit: 1
- seen failing: makeGateRegistry: onIdCollision three registrations of one id with no reporter warn once in development, in the exact words
- seen failing: when each reporter is resolved a registry built in development keeps its console default after the environment turns to production
- seen failing: scope and collisions disambiguates a colliding id and reports it once per id
- seen failing: scope and collisions a registry built with no options warns once per colliding id in development
- seen failing: scope and collisions says nothing in production unless onIdCollision is supplied
- seen failing: a throwing collision reporter is named by the option it was passed through a throwing onIdCollision on makeGateRegistry is named onIdCollision in development
- seen failing: a throwing collision reporter is named by the option it was passed through a throwing onIdCollision on makeGateRegistry is named onIdCollision in production
- failing text: AssertionError: expected [] to deeply equal [ Array(1) ]
- failing text: AssertionError: expected [] to deeply equal [ Array(1) ]
- failing text: AssertionError: expected [] to deeply equal [ 'x' ]

## sequence-check-type-only
- scratch: sequence-type-only at 8eadbc5516
- edit: packages/audit/src/index.ts: the sequence check's names exported type-only from ./ArchiveFacts.ts
- diff: dc03caaeb05d475734602c1905cae19ad77ce3f34ca15900f5456fea12a7d54a (1 files, +1 -1)
- run: vitest packages/audit/test/surface.test.ts
- exit: 1
- seen failing: @qadi/audit's root exports exactly these runtime values
- failing text: AssertionError: expected [ 'ArchiveInputInvalid', …(38) ] to deeply equal [ 'ArchiveInputInvalid', …(40) ]

## hydrate-target-red
- scratch: hydration-red at 57b8cd1f92
- edit: the born pin file added, no source change
- diff: 6a03f3eaad74f019f22fe820f6231b0bb17ceb2ca5887abb65ee5dc754c04472 (1 files, +41 -0)
- run: tstyche packages/react/test/HydrationTarget.tst.ts
- exit: 1
- seen failing: hydrateDecisions accepts any value that has the hydrate capability
- failing text: Error: Expression is not callable with the given arguments.
- failing text: Error: Expression is not callable with the given arguments.
- failing text: Argument of type '{ readonly hydrate: Written; }' is not assignable to parameter of type 'QadiAtoms'.
- failing text: Type '{ readonly hydrate: Written; }' is missing the following properties from type 'QadiAtoms': runtime, subject, decision, decisions, and 3 more.

## hydrate-target-atoms-lack-hydrate
- scratch: hydrate-target-neg at 0d8c82e866
- edit: QadiAtoms no longer extends HydrationTarget, so it has no hydrate member
- diff: ccaba2362b56546debaf11ca89176cc7dfd50ad6d4615698f29830fd57ec54c0 (1 files, +1 -1)
- run: tstyche packages/react/test/HydrationTarget.tst.ts
- exit: 1
- seen failing: an atom set is a hydrate target
- seen failing: the atom set states hydrate through the one signature
- failing text: Error: Type 'QadiAtoms' is not assignable to type 'HydrationTarget'.
- failing text: Error: Property 'hydrate' does not exist on type 'QadiAtoms'. ts(2339)
- failing text: Error: Type 'QadiAtoms' is not assignable to type 'HydrationTarget'.

## hydrate-target-accepts-anything
- scratch: hydrate-target-neg at 0d8c82e866
- edit: hydrateDecisions' first parameter also accepts a value that has only a decision member
- diff: a2ed9ef819b267aa9049763142fc494b9dd6c31710626ac963c25e53924d6598 (1 files, +1 -1)
- run: tstyche packages/react/test/HydrationTarget.tst.ts
- exit: 1
- seen failing: a value without hydrate is not a hydrate target
- failing text: Error: Type '{ readonly decision: unknown; }' is assignable to type 'HydrationTarget | { readonly decision: unknown; }'.
- failing text: Error: Type '{ readonly decision: unknown; }' is assignable to type 'HydrationTarget | { readonly decision: unknown; }'.

## hydrate-probe-refusal
- scratch: hydrate-widen at 3d38da3608
- edit: hydrateDecisions' first parameter widened from HydrationTarget to object, its body casting to HydrationTarget
- diff: 7030a58549c59e4074383436d31716cfeb8ac1e6306913ca2753be1383909852 (1 files, +2 -2)
- run: package
- exit: 1
- failing text:   the consumer does not type-check against the shipped .d.ts:
- failing text: .package-check/consumer.ts(152,3): error TS2578: Unused '@ts-expect-error' directive.
- failing text: package-install: 1 failure(s) across 9 package(s).

## hydrate-wrong-subject
- scratch: hydrate-wrong-subject at 3d38da3608
- edit: hydrateDecisions forwards a different subject id to the target's hydrate
- diff: 93233336e2b045978b7af6966aeb2fb6c4d1ccbc37fb6cad8b20b021e4e002f4 (1 files, +1 -1)
- run: vitest packages/react/test/Hydration.test.ts packages/react/test/HydrationPayload.test.ts packages/react/test/HydrationCounts.test.ts
- exit: 1
- seen failing: hydrateDecisions reports a malformed non-policy field under its own reason
- seen failing: hydrateDecisions refuses an entry carrying an excess, unrecognized field rather than silently accepting it
- seen failing: hydrateDecisions refuses a policy carrying an excess, unrecognized field rather than silently accepting it
- seen failing: hydrateDecisions drops an entry nested past MAX_DECODE_DEPTH rather than raising a raw RangeError
- seen failing: hydrateDecisions still seeds a policy nested well within MAX_DECODE_DEPTH
- seen failing: hydrateDecisions a spread copy of the atom set seeds the real questions
- seen failing: hydrateDecisions keeps a seed across a collection that lands before the first read
- seen failing: hydrateDecisions still covers the window before this client can answer
- seen failing: hydrateDecisions keeps the server's evaluation id, for correlation
- seen failing: hydrateDecisions uses the disclosed trace when one was shipped
- seen failing: hydrateDecisions seeds an allow that restricts nothing
- seen failing: hydrateDecisions tolerates a hand-crafted payload missing everything optional
- seen failing: hydrateDecisions drops a hand-crafted allow missing its obligations, which version 2 requires
- seen failing: hydration mismatch REPORTS a server allow this client denies
- seen failing: hydration mismatch carries the client's reason, which is the diagnosis
- seen failing: hydration mismatch reports the reverse direction too, with no reason to give
- seen failing: hydration mismatch reports ONCE PER QUESTION, not once per re-evaluation
- seen failing: hydration mismatch reports once per REGISTRY, not once per atom set (tickets 140, 142)
- seen failing: hydration mismatch warns on the console when no reporter is supplied
- seen failing: hydration mismatch an explicit reporter still runs in a production build
- seen failing: hydration mismatch reports a resource-scoped disagreement with its resource
- seen failing: a re-check continues the server's evaluation carries the seeded evaluation id into the client's own answer
- seen failing: a re-check that settles asynchronously REPORTS a server allow this client denies
- seen failing: counting what crosses the network counts the entries a client seeds
- seen failing: counting what crosses the network ACCOUNTS FOR EVERY ENTRY IN A PAYLOAD hydrateDecisions IS HANDED
- seen failing: a payload that seeds nothing says so announces entries whose policy did not decode
- seen failing: a payload that seeds nothing says so still seeds the entries that did decode
- seen failing: a payload that seeds nothing says so counts each refusal against its own reason
- seen failing: a payload that seeds nothing says so counts an entry nested past the structural depth guard against its own reason
- seen failing: a payload that seeds nothing says so warns on the console when no reporter is supplied
- seen failing: a payload that seeds nothing says so a refused payload says the payload was refused, not that zero decisions were lost
- seen failing: a payload that seeds nothing says so counts a refusal even where nothing reports it
- seen failing: counting re-checks counts a seeded question this client answers for itself
- seen failing: counting re-checks counts a disagreement against both counters, so the pair is a rate
- seen failing: counting re-checks counts an agreement as a re-check and not as a mismatch
- seen failing: counting re-checks counts once per question, however often it is read
- seen failing: counting re-checks counts with no mismatch reporter wired
- seen failing: what a seed carries is what the server decided HasPermission survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided HasPermission with fields survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided HasRole (denied) survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided AllOf survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided AnyOf survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided Not survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided Labeled survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided Obliged survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided a Disclosed trace naming another root than the entry's policy is dropped as malformed
- seen failing: a Disclosed seed that contradicts its own trace is dropped (ARCH-32) H1 an Allow whose Disclosed trace says allowed:false
- seen failing: a Disclosed seed that contradicts its own trace is dropped (ARCH-32) H2 an Allow showing every field whose Disclosed trace restricts to [title]
- seen failing: a Disclosed seed that contradicts its own trace is dropped (ARCH-32) H3 a Deny whose Disclosed trace says allowed:true
- seen failing: a Disclosed seed that contradicts its own trace is dropped (ARCH-32) H4 a Deny whose Disclosed reason is not the trace's
- seen failing: a Disclosed seed that contradicts its own trace is dropped (ARCH-32) an evaluated, disclosed entry whose trace root is changed in one duplicated field is dropped
- seen failing: a Disclosed seed that contradicts its own trace is dropped (ARCH-32) an evaluated decision, disclosed, still seeds (the control)
- failing text: AssertionError: expected "vi.fn()" to be called with arguments: [ ObjectContaining{…} ]
- failing text: AssertionError: expected "vi.fn()" to be called with arguments: [ ObjectContaining{…} ]
- failing text: AssertionError: expected "vi.fn()" to be called with arguments: [ ObjectContaining{…} ]

## dehydrate-drops-options
- scratch: dehydrate-drops-options at 3d38da3608
- edit: dehydrateDecisions calls dehydrateWith(entries) without its options
- diff: 9a82abb0c382d514a74fda448418940ff743b694e53465a86178fab61c1bd71d (1 files, +1 -1)
- run: vitest packages/react/test/Hydration.test.ts packages/react/test/HydrationPayload.test.ts packages/react/test/HydrationCounts.test.ts packages/react/test/DecisionOutcome.test.ts
- exit: 1
- seen failing: dehydrateDecisions discloses the trace only when asked
- seen failing: dehydrateDecisions SAYS WHAT IT DROPPED, rather than shipping a short payload in silence
- seen failing: dehydrateDecisions says nothing in a production build unless a reporter was supplied
- seen failing: hydrateDecisions uses the disclosed trace when one was shipped
- seen failing: what a seed carries is what the server decided HasPermission survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided HasPermission with fields survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided HasRole (denied) survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided AllOf survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided AnyOf survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided Not survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided Labeled survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided Obliged survives dehydrate, JSON and hydrate
- seen failing: what a seed carries is what the server decided a Disclosed trace naming another root than the entry's policy is dropped as malformed
- seen failing: a Disclosed seed that contradicts its own trace is dropped (ARCH-32) an evaluated, disclosed entry whose trace root is changed in one duplicated field is dropped
- seen failing: dehydrateDecisions' output is pinned byte for byte (ARCH-51) withholds the trace and the reason by default
- seen failing: dehydrateDecisions' output is pinned byte for byte (ARCH-51) discloses the trace and the reason under includeTrace
- failing text: AssertionError: expected 'Withheld' to be 'Disclosed' // Object.is equality
- failing text: AssertionError: expected [] to have a length of 1 but got +0
- failing text: AssertionError: expected [] to have a length of 1 but got +0

## named-barrel-star-core
- scratch: named-barrel-star-core at da1e5f4ad7
- edit: an export * from "./Policy.ts"; appended to packages/core/src/index.ts
- diff: 2660a839d83e9b4768aabaed726ae9782b7e128b7addbf506aeab5eff0f60534 (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] `export *` re-widens the interface to every name a module declares: name the exports per module (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-star-react
- scratch: named-barrel-star-react at da1e5f4ad7
- edit: an export * from "./QadiAtoms.ts"; appended to packages/react/src/index.ts
- diff: dc56406fc02611b9cc42cbb8fe73e6032ed2e20ffee5970c83418a19cfd98de5 (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/react/src/index.ts  [named-barrel] `export *` re-widens the interface to every name a module declares: name the exports per module (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-star-audit
- scratch: named-barrel-star-audit at da1e5f4ad7
- edit: an export * from "./AuditArchive.ts"; appended to packages/audit/src/index.ts
- diff: 7a26fc3d323e215601cf94d45275c59d41ffe926b9f3d9fd6e9b3bc500d9b57b (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel] `export *` re-widens the interface to every name a module declares: name the exports per module (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-star-devtools
- scratch: named-barrel-star-devtools at da1e5f4ad7
- edit: an export * from "./model/Diagnostics.ts"; appended to packages/devtools/src/index.ts
- diff: 275e9509c6091b3e958f2e859eca60ff21f5c16cae3ff3bf8411aa8de0cfd99d (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/devtools/src/index.ts  [named-barrel] `export *` re-widens the interface to every name a module declares: name the exports per module (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-star-devtools-react
- scratch: named-barrel-star-devtools-react at da1e5f4ad7
- edit: an export * from "../react/DecisionLog.tsx"; appended to packages/devtools/src/react/index.ts
- diff: 4fbbfadf2d12768b81fbfc98c6582f271d5c9473bebe6d3c5c7841cbe8c5e617 (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/devtools/src/react/index.ts  [named-barrel] `export *` re-widens the interface to every name a module declares: name the exports per module (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-mixed
- scratch: named-barrel-mixed at da1e5f4ad7
- edit: one export { ... } from group added to packages/testing/src/index.ts, which is a pure export * barrel
- diff: c72c31c36406cbc3e87bc7833fdee1aa0d138dcd6164c65aa0b192d091c366f6 (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/testing/src/index.ts  [named-barrel] mixes `export *` with a named group: name every export of the root, or none of them (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-self-test
- scratch: named-barrel-self-test at da1e5f4ad7
- edit: namedBarrelProblems made to ignore export * (star fixed to false), so the real tree passes and only the planted check can see it
- diff: 36dfc62b8e5b89cca169a64cf660e617d05b93ab073b2bb2838c6466a7cab3f1 (1 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted export * was not refused.
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted export * was not refused.
- failing text: packages/devtools/src/index.ts  [named-barrel-self-test] a planted export * was not refused.

## span-untrusted-decode-after-folds
- scratch: span-untrusted-decode-after-folds at da1e5f4ad7
- edit: a JSON.parse call planted in packages/core/src/PortSpanEncode.ts
- diff: 9c39b88913d995e46c26a311742c4cb36eb248e4cb2798b744dc1d3dd697d4f8 (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/PortSpanEncode.ts  [untrusted-decode] declares 2 untrusted-decode token(s), found 3 at line(s) 71, 74, 274.
- failing text:     Update UNTRUSTED_DECODE_BUDGET in scripts/check-house-style.mjs and AGENTS.md section 7a's table, with the reason, so they agree.
- failing text: 1 house-style violation(s). See AGENTS.md.

## span-key-source-after-folds
- scratch: span-key-source-after-folds at da1e5f4ad7
- edit: a second "qadi.subject_id" literal planted in packages/core/src/PortSpanEncode.ts
- diff: d0c7af154efa61994de04ad58f2c3300173ba88ff7f8fc3b3351c614da16e481 (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/PortSpanEncode.ts:274  [span-key-source] mentions the span key `qadi.subject_id`; read it through EvaluationSpan.ts (ADR-QD-188).
- failing text:     export const plantedKey = "qadi.subject_id";
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-order
- scratch: named-barrel-order at da1e5f4ad7
- edit: the first named group of packages/core/src/index.ts swapped with the next group of another module
- diff: 61f116f964e4d6e4575984d30edb0a69c2a54fb697bbd0914c4eee3c4df3cf4b (1 files, +8 -8)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] "./AttributeResolver.ts" sorts before "./AuthSubject.ts": keep the named groups in module-path order (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-unlisted
- scratch: named-barrel-unlisted at da1e5f4ad7
- edit: every export * line of packages/http/src/index.ts turned into an export { ... } group of that module, so it is a named barrel off the list
- diff: ae7aa16e7570b49f823d123b14a6b1b3de667984e49187569951005440dae466 (1 files, +14 -14)
- run: house-style
- exit: 1
- failing text: packages/http/src/index.ts  [named-barrel] is a named barrel that NAMED_BARRELS does not list: add it there, or export `*` (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## fold-if-false
- scratch: mut21 at 84727bb9ea
- edit: the decoder's skip condition replaced by false
- diff: 854cd9dfabbfe83cab31a7a1d5417750f2895edc5a743a7e9a4d056fd44b2829 (2 files, +40 -1)
- run: vitest packages/core/test/PortSpanFold.mutation.test.ts
- exit: 1
- seen failing: decodeSpan: what a key without an attribute or a field reads as skips a key the struct names but declares no field for, and keeps the other fields
- seen failing: decodeSpan: what a key without an attribute or a field reads as reads a key with no attribute as absent, even for a field that would accept undefined
- failing text: TypeError: Cannot read properties of undefined (reading 'ast')
- failing text: AssertionError: expected { loose: undefined } to deeply equal {}

## fold-and
- scratch: mut21 at 84727bb9ea
- edit: the skip condition joined with && instead of ||
- diff: c5abfcc74c8b28c92cc5076f1c8e055c4b5f6bd413d09890c28aa2ba5fedb745 (2 files, +40 -1)
- run: vitest packages/core/test/PortSpanFold.mutation.test.ts
- exit: 1
- seen failing: decodeSpan: what a key without an attribute or a field reads as skips a key the struct names but declares no field for, and keeps the other fields
- seen failing: decodeSpan: what a key without an attribute or a field reads as reads a key with no attribute as absent, even for a field that would accept undefined
- failing text: TypeError: Cannot read properties of undefined (reading 'ast')
- failing text: AssertionError: expected { loose: undefined } to deeply equal {}

## fold-remote-literal
- scratch: mut21 at 84727bb9ea
- edit: the remote literal of the interpreter union replaced by an empty string
- diff: 5323ecc64348a976cd22263aa5e3fa8b25f1733fe7396bb341adc02655acaad0 (2 files, +40 -1)
- run: vitest packages/core/test/PortSpanFold.mutation.test.ts
- exit: 1
- seen failing: decodeSpan: a port question's interpreter reads each of the three interpreters as itself
- failing text: AssertionError: expected {} to deeply equal { interpreter: 'remote' }

## fold-raw-false
- scratch: mut21 at 84727bb9ea
- edit: the raw-attribute-absent operand replaced by false
- diff: 56d70f740d1242f0c84ce2ddd8a445b2a6406f04b981cfe39f13dc0fb905ddce (2 files, +40 -1)
- run: vitest packages/core/test/PortSpanFold.mutation.test.ts
- exit: 1
- seen failing: decodeSpan: what a key without an attribute or a field reads as reads a key with no attribute as absent, even for a field that would accept undefined
- failing text: AssertionError: expected { loose: undefined } to deeply equal {}

## fold-field-false
- scratch: mut21 at 84727bb9ea
- edit: the field-absent operand replaced by false
- diff: 963f61c9efc6c77cc56b82b15b2b85967fc76af0a008df5ce4bd6366d83ba46d (2 files, +40 -1)
- run: vitest packages/core/test/PortSpanFold.mutation.test.ts
- exit: 1
- seen failing: decodeSpan: what a key without an attribute or a field reads as skips a key the struct names but declares no field for, and keeps the other fields
- failing text: TypeError: Cannot read properties of undefined (reading 'ast')

## surface-diff-null-entries
- scratch: rv-in07 at 264dc155c5
- edit: validated() as before the fix (the typeof guard that lets a null entries, entry or name through), with the new self-test rows kept
- diff: 1eecf48329055aa6d81b7f7e23273f6511a2607ce978c8bcbae6b5639dc38ee1 (1 files, +4 -8)
- run: script scripts/surface-diff.mjs --self-test
- exit: 1
- failing text: surface-diff self-test: a snapshot whose entries are null is refused by name: Cannot convert undefined or null to object
- failing text: surface-diff self-test: an entry that is null is refused by name: Cannot read properties of null (reading 'names')
- failing text: surface-diff self-test: a null name in a list is refused by name: Cannot read properties of null (reading 'kind')

## named-barrel-review-star-after-statement
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: an `export *` after another statement on the same line of the core barrel
- diff: ac6e6366e24a43b1c4a752d9cc953141c1a9c04d2002bf4a1e4e155136875dea (1 files, +2 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 642: `export *` re-widens the interface to every name a module declares: name the exports per module (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-group-order
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: a group out of module-path order appended to the core barrel
- diff: e3e6f141616f64eeac36275f5700dfde6ac92e65906e4248d58aa176ddbcb520 (1 files, +2 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 642: "./!.ts" sorts before "./ValueText.ts": keep the named groups in module-path order (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-foreign-group
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: a group from another package appended to the core barrel
- diff: b7e69183671c46e6b23727e4855ce35a7e263f7e7dcb79fad167131e0b99a4c8 (1 files, +2 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 642: re-exports "@qadi/zz", which is not a module of this package (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-relative-outside
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: a relative group whose module is outside the package source, appended to the core barrel
- diff: 9fa2914a97c09946034b41996a572ab3dcbe6561ca9ff5cd22fe412a0fac0732 (1 files, +2 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 642: re-exports "../../zz/src/zz.ts", which is not a module of this package (AGENTS.md §9).
- failing text: packages/core/src/index.ts  [named-barrel] line 642: "../../zz/src/zz.ts" sorts before "./ValueText.ts": keep the named groups in module-path order (AGENTS.md §9).
- failing text: 2 house-style violation(s). See AGENTS.md.

## named-barrel-review-two-value-groups
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: two value groups for one module appended to the core barrel
- diff: 47286d64230516727d2c9c7a91dc440142b3469be18582cf354f16c1aaaa19e2 (1 files, +3 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 643: "./zz.ts": more than one value group: one value group, then one type group, per module (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-two-type-groups
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: two type groups for one module appended to the core barrel
- diff: 5892823b9001c0f2bec0f1cd79bc92417f71809060f2d2d98054bb23aa989b90 (1 files, +3 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 643: "./zz.ts": more than one type group: one value group, then one type group, per module (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-type-before-value
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: a module's type group before its value group, appended to the core barrel
- diff: 18e2d20a18228f8024c6012dd1ad9ca056a956653eb3639db017648f510bbfe9 (1 files, +3 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 643: "./zz.ts": its type group comes before its value group: one value group, then one type group (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-inline-type
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: an inline type inside a value group appended to the core barrel
- diff: 6f0938f979b533dad64a1785fd337061ba84916c87eb9c89a3f56420c3053e61 (1 files, +2 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 642: "./zz.ts": `type Zz` inside a value group: name it in the module's `export type { … }` group (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-names-order
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: a group whose names are out of order appended to the core barrel
- diff: dfe4f85c46e0df4d5faafc8612641c3154c03db3fafdb05c47569447e910160d (1 files, +2 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 642: "./zz.ts": zy sorts before zz or repeats it: keep a group's names in name order (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-declaration
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: a local declaration appended to the core barrel
- diff: dd405e6a6749aecf9df00a04eb7848cd142a7f1f4d7caa3b850a6284dc9f8ad2 (1 files, +2 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 642: a declaration or statement of its own is not a module group: a named barrel holds only `export { … } from` and `export type { … } from` groups (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-import-reexport
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: an import re-exported with no from clause, appended to the core barrel
- diff: d96eba65c0ae979ff3bf6c212223dfd26d8f101d61e31c3ec5e620e3c460082c (1 files, +3 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 642: an import declaration is not a module group: a named barrel holds only `export { … } from` and `export type { … } from` groups (AGENTS.md §9).
- failing text: packages/core/src/index.ts  [named-barrel] line 643: an export with no from clause is not a module group: a named barrel holds only `export { … } from` and `export type { … } from` groups (AGENTS.md §9).
- failing text: 2 house-style violation(s). See AGENTS.md.

## named-barrel-review-empty
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: the core barrel emptied to one comment
- diff: f02575fc2acb0f8bdde117ed79e8fc0fa6c1b7e73c703513eb0c4652425bf7d4 (1 files, +1 -640)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] holds no named group (AGENTS.md §9).
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted group out of module-path order was not refused as: module-path order
- failing text: 2 house-style violation(s). See AGENTS.md.

## named-barrel-review-unlisted
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: a sixth index.ts holding a relative named group, off NAMED_BARRELS (packages/http/src/zz/index.ts)
- diff: d2c5bc975fe0f6a5568007eaad48613a6428e2683ed239ec0b867d87a50adc70 (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/http/src/zz/index.ts  [named-barrel] is a named barrel that NAMED_BARRELS does not list: add it there, or export `*` (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-mixed
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: a named group from another package appended to http's pure export * barrel
- diff: 0f6b9dd80a10cc2b99c9e17217aba8ff8b619330227a72b63379f4c2ba36d25c (2 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/http/src/index.ts  [named-barrel] mixes `export *` with a named group: name every export of the root, or none of them (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-self-test-star
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the export * refusal neutralised; the barrels unchanged
- diff: 98eeb2aa9d55ae2241a06c16d32f14ce11c3d943d022568a1f2c513a3c136f5e (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted `export *` after another statement on its line was not refused as: `export *` re-widens
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted `export *` after another statement on its line was not refused as: `export *` re-widens
- failing text: packages/devtools/src/index.ts  [named-barrel-self-test] a planted `export *` after another statement on its line was not refused as: `export *` re-widens

## named-barrel-review-self-test-other
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the not-a-module-group refusal neutralised; the barrels unchanged
- diff: 2b702e4fa0894f89eb05d526995e372fa0ae0266f31a45e34671caee58b98bc2 (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted declaration in the barrel was not refused as: a declaration or statement of its own is not a module group
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted name imported and re-exported with no from clause was not refused as: an import declaration is not a module group; an export with no from clause is not a module group
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted declaration in the barrel was not refused as: a declaration or statement of its own is not a module group

## named-barrel-review-self-test-empty
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the no-named-group refusal neutralised; the barrels unchanged
- diff: 9731ea53a8fa2bcd0808dd043e80ba5adf5d12f1e747fab7dc7ccceb7fff0e60 (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted barrel with no group was not refused as: holds no named group
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted barrel with no group was not refused as: holds no named group
- failing text: packages/devtools/src/index.ts  [named-barrel-self-test] a planted barrel with no group was not refused as: holds no named group

## named-barrel-review-self-test-outside
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the outside-the-package refusal neutralised; the barrels unchanged
- diff: f9db114b290c56871c60cc2290c762bddb5ea14db05bf1972bcf74f7d0d673de (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted group from another package was not refused as: not a module of this package
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted relative group outside the package's source was not refused as: not a module of this package
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted group from another package was not refused as: not a module of this package

## named-barrel-review-self-test-type-before-value
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the type-before-value refusal neutralised; the barrels unchanged
- diff: 29f2f8936c4d82ce68b38d16c00b1d7d9e2edd7ffe1b41f02f7a8c890952798c (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted type group before its module's value group was not refused as: comes before its value group
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted type group before its module's value group was not refused as: comes before its value group
- failing text: packages/devtools/src/index.ts  [named-barrel-self-test] a planted type group before its module's value group was not refused as: comes before its value group

## named-barrel-review-self-test-inline-type
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the inline-type refusal neutralised; the barrels unchanged
- diff: 391e69de8d0194bd1dd0520ecd79d2c6a32be6e0f4af3629fa7aa09196200a0a (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted inline type inside a value group was not refused as: inside a value group
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted inline type inside a value group was not refused as: inside a value group
- failing text: packages/devtools/src/index.ts  [named-barrel-self-test] a planted inline type inside a value group was not refused as: inside a value group

## named-barrel-review-self-test-second-group
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the second-group refusal neutralised; the barrels unchanged
- diff: 16c3c7863c874c0f19da07ffbe5923b6f733eeb962205fd6b2373f74292c8f04 (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted second value group for one module was not refused as: more than one value group
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted second type group for one module was not refused as: more than one type group
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted second value group for one module was not refused as: more than one value group

## named-barrel-review-self-test-names-order
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the name-order refusal neutralised; the barrels unchanged
- diff: 4cde2ae23a116f1aae679409a1b9c88a05cc05c4d25eba89923df738cbd4920d (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted group whose names are out of order was not refused as: keep a group's names in name order
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted group whose names are out of order was not refused as: keep a group's names in name order
- failing text: packages/devtools/src/index.ts  [named-barrel-self-test] a planted group whose names are out of order was not refused as: keep a group's names in name order

## named-barrel-review-self-test-group-order
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the module-path-order refusal neutralised; the barrels unchanged
- diff: da06f3cd5cb3a8e4f31fbc2f6c3286f8fd2beb6944744b4e101baa4e31d5006d (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted group out of module-path order was not refused as: module-path order
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted group out of module-path order was not refused as: module-path order
- failing text: packages/devtools/src/index.ts  [named-barrel-self-test] a planted group out of module-path order was not refused as: module-path order

## named-barrel-review-self-test-mixed
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the mixed-index refusal neutralised; the barrels unchanged
- diff: 02aa9df486ceefb7a613e90d45f52d8644e20aa51126a6cbb39049323bda216b (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/zz/src/index.ts  [named-barrel-self-test] a planted index mixing `export *` with a group from another package was not refused as: mixes `export *`
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-self-test-unlisted
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with the unlisted-barrel refusal neutralised; the barrels unchanged
- diff: 496a8a17b9dec776f10885f106c434869359b58c82c17f6fe3fe9c2293d84161 (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/zz/src/index.ts  [named-barrel-self-test] a planted unlisted named barrel was not refused as: NAMED_BARRELS does not list
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-self-test-control
- scratch: rv-wr01 at 5fc4f5d6cc
- edit: scripts/check-house-style.mjs with an index off the list judged as a listed barrel, so the pure barrel and the implementation index plants are refused; the barrels unchanged
- diff: 774c21e443e8bce78f580fabc92dc04714d1da53f01fe19c8e5ae8a9fd39cc7f (2 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/http/src/index.ts  [named-barrel] line 6: `export *` re-widens the interface to every name a module declares: name the exports per module (AGENTS.md §9).
- failing text: packages/http/src/index.ts  [named-barrel] line 7: `export *` re-widens the interface to every name a module declares: name the exports per module (AGENTS.md §9).
- failing text: packages/http/src/index.ts  [named-barrel] line 8: `export *` re-widens the interface to every name a module declares: name the exports per module (AGENTS.md §9).

## named-barrel-review-group-order
- scratch: rv-wr01 at ddba1c3661
- edit: a group out of module-path order appended to the core barrel
- diff: e3e6f141616f64eeac36275f5700dfde6ac92e65906e4248d58aa176ddbcb520 (1 files, +2 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] line 642: "./!.ts" sorts before "./ValueText.ts": keep the named groups in module-path order (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-empty
- scratch: rv-wr01 at ddba1c3661
- edit: the core barrel emptied to one comment
- diff: f02575fc2acb0f8bdde117ed79e8fc0fa6c1b7e73c703513eb0c4652425bf7d4 (1 files, +1 -640)
- run: house-style
- exit: 1
- failing text: packages/core/src/index.ts  [named-barrel] holds no named group (AGENTS.md §9).
- failing text: 1 house-style violation(s). See AGENTS.md.

## named-barrel-review-self-test-group-order
- scratch: rv-wr01 at ddba1c3661
- edit: scripts/check-house-style.mjs with the module-path-order refusal neutralised; the barrels unchanged
- diff: 7a8c87b56626aebb05c49c70942a3733196a270ce21eec85b4b0fb23b3266207 (1 files, +1 -1)
- run: house-style
- exit: 1
- failing text: packages/audit/src/index.ts  [named-barrel-self-test] a planted group out of module-path order was not refused as: module-path order
- failing text: packages/core/src/index.ts  [named-barrel-self-test] a planted group out of module-path order was not refused as: module-path order
- failing text: packages/devtools/src/index.ts  [named-barrel-self-test] a planted group out of module-path order was not refused as: module-path order

## hydrate-probe-deleted
- scratch: rv-wr02 at ff3a8994a8
- edit: the consumer's whole hydrate probe deleted (the two hydrations, their expects and the refusal), with the imports only it used
- diff: 4ebae8c19f33fdaabf9de1b21a9dbf701d5297611ac029cba5419165a4b1f23d (1 files, +0 -22)
- run: package
- exit: 1
- failing text:   the consumer fixture never makes the call hydrateDecisions:atoms, hydrateDecisions:capability when it runs: hydrateDecisions of the packed @qadi/react root must be called through the atom set and through a value holding only hydrate
- failing text:   the consumer fixture never refuses hydrateDecisions on a value without hydrate: every refused-call probe must be a call whose first argument is an object literal with no property of that name, led by a @ts-expect-error
- failing text: package-install: 2 failure(s) across 9 package(s).

## hydrate-probe-capability-deleted
- scratch: rv-wr02 at ff3a8994a8
- edit: the consumer's hydration through { hydrate } alone deleted, with the two expects that read it
- diff: e8bfa339e60dcd2471387c4464d1875fe424d88a28b91e14e74ea9ccb6c18dd2 (1 files, +0 -3)
- run: package
- exit: 1
- failing text:   the consumer fixture never makes the call hydrateDecisions:capability when it runs: hydrateDecisions of the packed @qadi/react root must be called through the atom set and through a value holding only hydrate
- failing text: package-install: 1 failure(s) across 9 package(s).
- failing text: Sandbox kept in .package-check/ for inspection.

## hydrate-probe-refusal-deleted
- scratch: rv-wr02 at ff3a8994a8
- edit: the consumer's @ts-expect-error refusal of hydrateDecisions({}, …) deleted with its call
- diff: 934ee113a0ca784ceb106aba5c6f21943c9d2586e88e624f18f5808d619c8701 (1 files, +0 -3)
- run: package
- exit: 1
- failing text:   the consumer fixture never refuses hydrateDecisions on a value without hydrate: every refused-call probe must be a call whose first argument is an object literal with no property of that name, led by a @ts-expect-error
- failing text: package-install: 1 failure(s) across 9 package(s).
- failing text: Sandbox kept in .package-check/ for inspection.

## hydrate-probe-never-run
- scratch: rv-wr02 at ff3a8994a8
- edit: the consumer's hydration through { hydrate } alone left in a function the run never calls
- diff: 7f223065dd48ec2c0449266df35cbc49d116364691fed1adc75ba111634c2a0c (1 files, +2 -1)
- run: package
- exit: 1
- failing text:   the consumer fixture never makes the call hydrateDecisions:capability when it runs: hydrateDecisions of the packed @qadi/react root must be called through the atom set and through a value holding only hydrate
- failing text: package-install: 1 failure(s) across 9 package(s).
- failing text: Sandbox kept in .package-check/ for inspection.

## escape-undeclared-subpath
- scratch: rv-sec4 at 9e37862527
- edit: a react source whose built declaration names import("@qadi/core/lib/Decision.js"), its compile error silenced so the declaration is emitted
- diff: b5a7c8251ac89e056452f8be94d7ffb8e4deac5343be58dfd6304b21bed9095e (1 files, +2 -0)
- run: package
- exit: 1
- failing text:   @qadi/react/lib/DeepSubpath.d.ts: names a subpath no package declares as an entry point: @qadi/core/lib/Decision.js
- failing text: package-install: 1 failure(s) across 9 package(s).
- failing text: Sandbox kept in .package-check/ for inspection.

## escape-self-check-subpath
- scratch: rv-sec4 at 9e37862527
- edit: the undeclared-subpath refusal in scripts/lib/declaration-escape.mjs neutralised; the packages unchanged
- diff: 2037570e0e9262bc6293a106a2e2b001294d36540c0f2d9b61100bcb60fe3e12 (2 files, +1 -1)
- run: package
- exit: 1
- failing text:   [escape-self-check] planted case "a deep import into a package's lib" was not judged as planted (13 cases)
- failing text:   [escape-self-check] planted case "a subpath of a package that declares other subpaths" was not judged as planted (13 cases)
- failing text:   [escape-self-check] planted case "a bare src path of another package" was not judged as planted (13 cases)

## hydrate-target-review-atoms-lack-hydrate
- scratch: rv-in02 at cc9e5b769e
- edit: QadiAtoms does not extend HydrationTarget, so it has no hydrate member
- diff: a1298b6cb93e46d08a0e4f66dcdf42d6db1234fcdda45b8e9ddab1462ce39ac8 (1 files, +1 -1)
- run: tstyche packages/react/test/HydrationTarget.tst.ts
- exit: 1
- seen failing: an atom set is a hydrate target
- seen failing: the atom set's hydrate is the written-out signature
- failing text: Error: Type 'QadiAtoms' is not assignable to type 'HydrationTarget'.
- failing text: Error: Property 'hydrate' does not exist on type 'QadiAtoms'. ts(2339)
- failing text: Error: Type 'QadiAtoms' is not assignable to type 'HydrationTarget'.

## hydrate-target-review-second-member
- scratch: rv-in02 at cc9e5b769e
- edit: HydrationTarget gains a second required member, runtime, so hydrate alone no longer satisfies it
- diff: ab70498fdd10ddb9d4748845f5ad856d58c64ca5eb3e9163d85b7db99f7b6291 (1 files, +1 -0)
- run: tstyche packages/react/test/HydrationTarget.tst.ts
- exit: 1
- seen failing: hydrateDecisions accepts any value that has the hydrate capability
- seen failing: a value holding the written-out hydrate alone is a hydrate target
- failing text: Error: Expression is not callable with the given arguments.
- failing text: Error: Type '{ readonly hydrate: Written; }' is not assignable to type 'HydrationTarget'.
- failing text: Error: Expression is not callable with the given arguments.

## hydrate-target-review-any-payload
- scratch: rv-in02 at cc9e5b769e
- edit: HydrationTarget's hydrate takes its payload as any, so a hydrate reading another payload satisfies it
- diff: 48301e77bb850290b51f6e1017b1374da0be408fa7f3d1b6cfa5e2d38bf7a574 (1 files, +1 -1)
- run: tstyche packages/react/test/HydrationTarget.tst.ts
- exit: 1
- seen failing: the atom set's hydrate is the written-out signature
- seen failing: a value whose hydrate reads another payload is not a hydrate target
- failing text: Error: Type '(dehydrated: any, subject: AuthSubject, options?: HydrateOptions | undefined) => InitialValues' is not the same as type 'Written'.
- failing text: Error: Type '{ readonly hydrate: (dehydrated: string, subject: AuthSubject) => InitialValues; }' is assignable to type 'HydrationTarget'.
- failing text: Error: Type '(dehydrated: any, subject: AuthSubject, options?: HydrateOptions | undefined) => InitialValues' is not the same as type 'Written'.

## port-span-read-fourth-interpreter
- scratch: rv-in04 at e461853f46
- edit: portInterpreter gains a fourth member, batch, that no row of the span read test writes out
- diff: 1dc7ba23f0fa52bec684b4497153a2caed08e6b8231c65b03f3eda62f7211e04 (1 files, +1 -1)
- run: vitest packages/core/test/PortSpanRead.test.ts
- exit: 1
- seen failing: decodeSpan: a port question's interpreter reads each of the three interpreters as itself
- failing text: AssertionError: expected [ 'evaluate', 'toPredicate', …(2) ] to deeply equal [ 'evaluate', 'toPredicate', 'remote' ]
