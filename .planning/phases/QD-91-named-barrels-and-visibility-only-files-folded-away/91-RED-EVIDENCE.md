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
