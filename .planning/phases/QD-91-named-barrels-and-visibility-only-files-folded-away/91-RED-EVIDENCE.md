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
