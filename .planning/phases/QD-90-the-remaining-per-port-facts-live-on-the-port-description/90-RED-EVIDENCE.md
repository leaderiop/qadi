# Phase 90 RED evidence

Each block below is one run of a phase check or a held mutation mode on a scratch clone, with the edit that made it fail and the failing text it printed; the shape checks that need the sixth port or the routing add their blocks in later plans.

## base-record-deleted
- scratch: v-base at 9a13cc3552
- edit: the recorded phase_base file 90-mutation-base.json deleted
- diff: f1ef012f532704d129312b8a5242f323de26888c1b0b9d7808d7c748bebf0b1c (1 files, +0 -2545)
- run: script 90-check.mjs base
- exit: 1
- failing text: phase_base is not recorded

## commit-wrong-subject
- scratch: v-commit at 9a13cc3552
- edit: none: the base tree, a subject no commit has
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs commit chore(90-99): a subject no commit has .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-check.mjs
- exit: 1
- failing text: 0 commits since phase_base have the subject: chore(90-99): a subject no commit has

## unchanged-held-test
- scratch: v-unchanged at 9a13cc3552
- edit: a comment line appended to the held test PortAccess.test.ts
- diff: f0ab29b8a10458b0b624190704dc7388de65dd87a4fd2b471be204c71c34d609 (1 files, +1 -0)
- run: script 90-check.mjs unchanged packages/core/test/PortAccess.test.ts
- exit: 1
- failing text: packages/core/test/PortAccess.test.ts differs from phase_base

## scan-ids
- scratch: v-ids at 9a13cc3552
- edit: a decision-number comment appended to packages/core/src/PortName.ts
- diff: f6ad64ff9fade9c928c33f5ae43777603fb3add5939364d07d504c9208b234ef (1 files, +1 -0)
- run: script 90-check.mjs scan-ids
- exit: 1
- failing text: packages/core/src/PortName.ts:54 names a decision number: // D-49 says so

## scan-forbidden-as
- scratch: v-forb at 9a13cc3552
- edit: an as cast appended to packages/core/src/Errors.ts
- diff: b505bbbe893bf2d9ead71ada31440a2395544a2f910d1749faa511b5ce296fd4 (1 files, +1 -0)
- run: script 90-check.mjs scan-forbidden
- exit: 1
- failing text: packages/core/src/Errors.ts:639 uses an as cast: export const planted = (value: unknown) => value as string;

## scan-forbidden-agents
- scratch: v-forb2 at 9a13cc3552
- edit: a line appended to AGENTS.md outside section 3
- diff: 197261770dfde7a0cd5eab34f372b411e0ae7b78ae447c669d2e2459e0444815 (1 files, +1 -0)
- run: script 90-check.mjs scan-forbidden
- exit: 1
- failing text: AGENTS.md differs from phase_base outside its section 3: only that section may change

## trailers-missing
- scratch: v-trailers at 0b499a61f5
- edit: a scratch commit chore(90-99) with no Co-Authored-By trailer
- diff: 745053d0b9ed39562a9807d122c2a181700f4056fef73e007f53c0953d823413 (1 files, +1 -0)
- run: script 90-check.mjs trailers
- exit: 1
- failing text: 0b499a61 chore(90-99): a commit without the trailer: the message has 0 Co-Authored-By lines, not one

## records-renamed
- scratch: v-records at 9a13cc3552
- edit: packages/core/test/GuardHealthCheck.test.ts renamed, a file a Pinned by paragraph of 30-port-calls.md names
- diff: 177e4d677361544d26a2893aab86f188d750dd8c9a7e5b2e5139e3d646a5326f (1 files, +0 -0)
- run: script 90-check.mjs records
- exit: 1
- failing text: BEH-QD-714 names packages/core/test/GuardHealthCheck.test.ts, which does not exist

## circular-portname
- scratch: v-circ at 9a13cc3552
- edit: PortName.ts imports ./Ports.ts and re-exports PORTS
- diff: a23866a0c83c5cb03de2f2022873541d8eda6b6e34c6eb3314f7457e208221cb (1 files, +2 -0)
- run: circular
- exit: 1
- failing text: 1) core/src/PortDerivation.ts > core/src/PortDefault.ts > core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts
- failing text: 2) core/src/PortDefault.ts > core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts > core/src/PortDescription.ts
- failing text: 3) core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts > core/src/PortDescription.ts

## seen-failing-missing-title
- scratch: v-seen at 9a13cc3552
- edit: the clone's evidence names two of the three titles of PortName.tst.ts, the third line left out
- diff: d5860e7e86ee486ab6a1850d82170838b8c50e86725f341dcae6ecebe373c06a (1 files, +4 -2)
- run: script 90-check.mjs seen-failing packages/core/test/PortName.tst.ts
- exit: 1
- failing text: no seen failing line in the evidence for: a description's span is its own port's, and no other

## seen-failing-prefix
- scratch: v-seen2 at 9a13cc3552
- edit: none: the base tree, a prefix no title has
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs seen-failing packages/core/test/PortName.tst.ts --titles-matching zzz no title starts so
- exit: 1
- failing text: the file reports zero tests

## seen-failing-absent-file
- scratch: v-seen3 at 9a13cc3552
- edit: none: the base tree, a file that does not exist and no --if-present
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs seen-failing packages/core/test/NoSuchFile.tst.ts
- exit: 1
- failing text: packages/core/test/NoSuchFile.tst.ts does not exist

## vitest-inverted-assertion
- scratch: v-vitest at 9a13cc3552
- edit: the expected class of AccessDenied in Errors.test.ts changed from denied to outage
- diff: 708108c5bae0f73b367b68fc75b4c22024cb151e6e9ec7d2cb0dbcec892a0781 (1 files, +2 -2)
- run: vitest packages/core/test/Errors.test.ts
- exit: 1
- seen failing: ENFORCEMENT_ERROR_CLASSES assigns every tag its documented class
- seen failing: classifyEnforcementError a real AccessDenied classifies to outage
- failing text: AssertionError: expected { AccessDenied: 'denied', …(10) } to deeply equal { AccessDenied: 'outage', …(10) }
- failing text: AssertionError: expected 'denied' to be 'outage' // Object.is equality

## suite-inverted-assertion
- scratch: v-suite at 9a13cc3552
- edit: the expected class of AccessDenied in Errors.test.ts changed from denied to outage
- diff: 708108c5bae0f73b367b68fc75b4c22024cb151e6e9ec7d2cb0dbcec892a0781 (1 files, +2 -2)
- run: script 90-check.mjs suite
- exit: 1
- failing text: ENFORCEMENT_ERROR_CLASSES assigns every tag its documented class fails: AssertionError: expected { AccessDenied: 'denied', …(10) } to deeply equal { AccessDenied: 'outage', …(10) }
- failing text: classifyEnforcementError a real AccessDenied classifies to outage fails: AssertionError: expected 'denied' to be 'outage' // Object.is equality

## records-close
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs records --close
- exit: 1
- failing text: BEH-QD-786 has no heading in spec/behaviors/30-port-calls.md
- failing text: BEH-QD-787 has no heading in spec/behaviors/30-port-calls.md
- failing text: BEH-QD-788 has no heading in spec/behaviors/30-port-calls.md

## port-facts
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs port-facts
- exit: 1
- failing text: packages/core/src/PortName.ts does not declare export const PORT_NAMES = [...] as const
- failing text: packages/core/src/PortName.ts does not declare export type PortName = (typeof PORT_NAMES)[number]
- failing text: packages/core/src/PortMetrics.ts does not import PORT_NAMES as a value from ./PortName.ts

## scoped-route
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs scoped-route
- exit: 1
- failing text: packages/core/src/PortAccess.ts does not import LEAF_NEEDS as a value from ./LeafNeeds.ts
- failing text: packages/core/src/PortAccess.ts type ScopedPort is a hand union of string literals
- failing text: packages/core/src/PortAccess.ts names isResourceScoped 2 times outside its import, not once

## spike
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs spike
- exit: 1
- failing text: .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-SPIKE.md does not exist

## bench
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs bench
- exit: 1
- failing text: .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-BENCH.md does not exist
- failing text: 0 commits since phase_base have the subject docs(90-06): fix the routing patch before its bench
- failing text: the analysis of routing.patch has no # gate: line

## bench-pass
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs bench --pass
- exit: 1
- failing text: .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-BENCH.md does not exist
- failing text: 0 commits since phase_base have the subject docs(90-06): fix the routing patch before its bench
- failing text: the analysis of routing.patch has no # gate: line

## routing-landed
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs routing-landed
- exit: 1
- failing text: no gate of record: .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/ holds no analysis with a # gate: line

## bench-smoke
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs bench --smoke
- exit: 1
- failing text: .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/workloads.txt does not exist

## spike-rerun
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs spike --rerun
- exit: 1
- failing text: .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-SPIKE.md does not exist

## scratch-clean-check
- scratch: v-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs scratch-clean --check
- exit: 1
- failing text: /private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd90 still exists

## mutation-landed-base
- scratch: m-landed-base at 9a13cc3552
- edit: phase_base in 90-mutation-base.json set to 333f45e0d02e3bd59b4020f030f3fd1557298550, the parent of the phase base
- diff: df811db3df3f1a06e62b32615b215a3f9687f4328752b2a85ee5e84b25c9a16a (1 files, +1 -1)
- run: script 90-mutation.mjs landed base
- exit: 1
- failing text: groups.core.head is not phase_base
- failing text: the commit is not a child of 333f45e0d02e3bd59b4020f030f3fd1557298550

## mutation-landed-coverage-base
- scratch: m-landed-cov at 9a13cc3552
- edit: 90-coverage-base.json deleted
- diff: e342e6116f5030713796f61bdb03f02b3e8d634b3a6356503879384beec5445d (1 files, +0 -92)
- run: script 90-mutation.mjs landed coverage-base
- exit: 1
- failing text: .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-coverage-base.json does not exist

## mutation-landed-close
- scratch: m-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-mutation.mjs landed close
- exit: 1
- failing text: exactly one commit since 46174873c60e85bcd0c6702867c602cad8460310 must be "docs(90-13): record the mutation close", found 0

## mutation-landed-coverage-close
- scratch: m-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-mutation.mjs landed coverage-close
- exit: 1
- failing text: exactly one commit since 46174873c60e85bcd0c6702867c602cad8460310 must be "docs(90-13): record the coverage close", found 0

## mutation-compare
- scratch: m-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-mutation.mjs compare
- exit: 1
- failing text: node:fs:624
- failing text:     return binding.readFileUtf8(path, stringToFlags(options.flag));
- failing text:                    ^

## mutation-probe
- scratch: m-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-mutation.mjs probe
- exit: 1
- failing text: node:fs:624
- failing text:     return binding.readFileUtf8(path, stringToFlags(options.flag));
- failing text:                    ^

## mutation-record-close
- scratch: m-tree at 9a13cc3552
- edit: none: the base tree
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-mutation.mjs record close
- exit: 1
- failing text: node:fs:624
- failing text:     return binding.readFileUtf8(path, stringToFlags(options.flag));
- failing text:                    ^

## mutation-record-base-dirty
- scratch: m-record at 9a13cc3552
- edit: an uncommitted comment line appended to packages/core/src/PortName.ts
- diff: 8e18d9ffdcb13087f8905c07013cf0624c9aa35006a1ff1d61d950e3c400771b (1 files, +1 -0)
- run: script 90-mutation.mjs record base
- exit: 1
- failing text: record from a clean tree; these differ from HEAD:
- failing text:  M packages/core/src/PortName.ts

## mutation-coverage-close
- scratch: m-cov at 811cd3e566
- edit: every core test file deleted except Errors.test.ts, committed in the clone
- diff: e2645cda38246aa01e85847cd9add6b065ac6c0a674d5a81025fc01e90ed3005 (123 files, +92 -45435)
- run: script 90-mutation.mjs coverage close
- exit: 1
- failing text: ERROR: Coverage for lines (9.16%) does not meet global threshold (90%)
- failing text: ERROR: Coverage for functions (0.43%) does not meet global threshold (90%)
- failing text: ERROR: Coverage for statements (7.96%) does not meet global threshold (90%)

## close
- scratch: v-close at 9a13cc3552
- edit: none: the base tree, the heavy runner
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-check.mjs close
- exit: 1
- failing text: node .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-pinned-check.mjs --all-applied exited 1
- failing text: node .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-earlier-checks.mjs exited 1
- failing text: 90-check.mjs records --close exited 1

## port-facts-spans
- scratch: pf-spans at 8e04476105
- edit: each port description's span value gets an X suffix in its port module
- diff: e658a001185826ad20eb8848c439cc81d2ff63ae2f98ab3d4a50713162cfa1f8 (5 files, +5 -5)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port states its own facts AttributeResolver states its facts
- seen failing: each port states its own facts DecisionHistory states its facts
- seen failing: each port states its own facts RelationshipResolver states its facts
- seen failing: each port states its own facts CustomPredicate states its facts
- seen failing: each port states its own facts SignatureHistory states its facts
- seen failing: a scoped read at every site HasRelationship, absent resource, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource without id, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasSignature, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, resource with usable id, under evaluate
- failing text: AssertionError: expected { port: 'AttributeResolver', …(5) } to deeply equal { port: 'AttributeResolver', …(5) }
- failing text: AssertionError: expected { port: 'DecisionHistory', …(5) } to deeply equal { port: 'DecisionHistory', …(5) }
- failing text: AssertionError: expected { port: 'RelationshipResolver', …(5) } to deeply equal { port: 'RelationshipResolver', …(5) }

## port-facts-methods
- scratch: pf-methods at 8e04476105
- edit: each description's method string gets an X suffix
- diff: f3740b26065d06c4fa8e83df9a08fd8aca82fb03064a051dfc3f0a1e099bde12 (5 files, +5 -5)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port states its own facts AttributeResolver states its facts
- seen failing: each port states its own facts DecisionHistory states its facts
- seen failing: each port states its own facts RelationshipResolver states its facts
- seen failing: each port states its own facts CustomPredicate states its facts
- seen failing: each port states its own facts SignatureHistory states its facts
- failing text: AssertionError: expected { port: 'AttributeResolver', …(5) } to deeply equal { port: 'AttributeResolver', …(5) }
- failing text: AssertionError: expected { port: 'DecisionHistory', …(5) } to deeply equal { port: 'DecisionHistory', …(5) }
- failing text: AssertionError: expected { port: 'RelationshipResolver', …(5) } to deeply equal { port: 'RelationshipResolver', …(5) }

## port-facts-allowlists
- scratch: pf-allowlists at 8e04476105
- edit: each description's serving allowlist term is changed to another term
- diff: 2668588f62a3cb075f6c4b33a28e4db50fb7ac065fa62f3e355fdfbe56021a17 (5 files, +5 -5)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port states its own facts AttributeResolver states its facts
- seen failing: each port states its own facts DecisionHistory states its facts
- seen failing: each port states its own facts RelationshipResolver states its facts
- seen failing: each port states its own facts CustomPredicate states its facts
- seen failing: each port states its own facts SignatureHistory states its facts
- seen failing: a host answers one fixed question per port SignatureHistory answers once its records are opted in
- failing text: AssertionError: expected { port: 'AttributeResolver', …(5) } to deeply equal { port: 'AttributeResolver', …(5) }
- failing text: AssertionError: expected { port: 'DecisionHistory', …(5) } to deeply equal { port: 'DecisionHistory', …(5) }
- failing text: AssertionError: expected { port: 'RelationshipResolver', …(5) } to deeply equal { port: 'RelationshipResolver', …(5) }

## port-facts-fixture-names
- scratch: pf-fixture-names at 8e04476105
- edit: each fixture builder's shape name gets an X suffix
- diff: eeda283a162e447b56a9e113b2baebe0313b587efe05db5045b3826cae12c4e1 (5 files, +5 -5)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port states its own facts AttributeResolver states its facts
- seen failing: each port states its own facts DecisionHistory states its facts
- seen failing: each port states its own facts RelationshipResolver states its facts
- seen failing: each port states its own facts CustomPredicate states its facts
- seen failing: each port states its own facts SignatureHistory states its facts
- failing text: AssertionError: expected { port: 'AttributeResolver', …(5) } to deeply equal { port: 'AttributeResolver', …(5) }
- failing text: AssertionError: expected { port: 'DecisionHistory', …(5) } to deeply equal { port: 'DecisionHistory', …(5) }
- failing text: AssertionError: expected { port: 'RelationshipResolver', …(5) } to deeply equal { port: 'RelationshipResolver', …(5) }

## port-facts-tabulate-swap
- scratch: pf-tabulate-swap at 8e04476105
- edit: tabulatePorts: the AttributeResolver and DecisionHistory rows swap places in Ports.ts
- diff: c8a050ad199eace7fa9eaea863281f0dec9533d0acd5e0ada0b2b8457809dfef (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: the registry lists the ports in one order forEveryPort visits the five ports in registry order
- seen failing: the registry lists the ports in one order tabulatePorts keys its rows in registry order
- seen failing: a host answers one fixed question per port servingFor declares what one policy per port asks
- failing text: AssertionError: expected [ 'DecisionHistory', …(4) ] to deeply equal [ 'AttributeResolver', …(4) ]
- failing text: AssertionError: expected [ 'DecisionHistory', …(4) ] to deeply equal [ 'AttributeResolver', …(4) ]
- failing text: AssertionError: expected '{"DecisionHistory":{"events":["approv…' to equal '{"AttributeResolver":{"attributes":["…'

## port-facts-metric-names-swap
- scratch: pf-metric-names-swap at 8e04476105
- edit: PORT_NAMES_BY_NAME: AttributeResolver and DecisionHistory swap places in PortMetrics.ts
- diff: 5e43dd9cb9517bcee38203315f12c4b2e1dbd120c6e4cb80a4df38a65291367f (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port metric preregisters its words portCallsTotal preregisters the five ports, in order
- seen failing: each port metric preregisters its words portRetriesTotal preregisters the five ports, in order
- seen failing: each port metric preregisters its words portTimeoutsTotal preregisters the five ports, in order
- seen failing: each port metric preregisters its words servedPortCallsTotal preregisters the five ports, in order
- failing text: AssertionError: expected [ [ 'DecisionHistory', +0 ], …(4) ] to deeply equal [ [ 'AttributeResolver', +0 ], …(4) ]
- failing text: AssertionError: expected [ [ 'DecisionHistory', +0 ], …(4) ] to deeply equal [ [ 'AttributeResolver', +0 ], …(4) ]
- failing text: AssertionError: expected [ [ 'DecisionHistory', +0 ], …(4) ] to deeply equal [ [ 'AttributeResolver', +0 ], …(4) ]

## port-facts-predicate-names-swap
- scratch: pf-predicate-names-swap at 8e04476105
- edit: PREDICATE_PORT_NAMES_BY_NAME: AttributeResolver and DecisionHistory swap places in PortMetrics.ts
- diff: ed0114a5c2fbd284909f21b6d9ab96c66e9a46b799c8d3516f6d4b61c85b1e97 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port metric preregisters its words predicatePortCallsTotal preregisters the two ports toPredicate reads, in order
- failing text: AssertionError: expected [ [ 'DecisionHistory', +0 ], …(1) ] to deeply equal [ [ 'AttributeResolver', +0 ], …(1) ]

## port-facts-none-names
- scratch: pf-none-names at 8e04476105
- edit: each description's fail-closed default name gets an X suffix
- diff: 6dd2925da8fb3efdfeeb26cfcb31e8773d79a1e645d8ab61b3b69278ed9c650d (5 files, +5 -5)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port states its own facts AttributeResolver states its facts
- seen failing: each port states its own facts DecisionHistory states its facts
- seen failing: each port states its own facts RelationshipResolver states its facts
- seen failing: each port states its own facts CustomPredicate states its facts
- seen failing: each port states its own facts SignatureHistory states its facts
- failing text: AssertionError: expected { port: 'AttributeResolver', …(5) } to deeply equal { port: 'AttributeResolver', …(5) }
- failing text: AssertionError: expected { port: 'DecisionHistory', …(5) } to deeply equal { port: 'DecisionHistory', …(5) }
- failing text: AssertionError: expected { port: 'RelationshipResolver', …(5) } to deeply equal { port: 'RelationshipResolver', …(5) }

## port-facts-wire-question-rename
- scratch: pf-wire-question-rename at 8e04476105
- edit: the wire question's field is renamed in each port module (struct, toQuestion, fromQuestion)
- diff: 50b1097378820cbaacfeab09323b038f73f296cc96e8f529f32e917ac79c29aa (5 files, +15 -15)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port's question and answer travel as one fixed text AttributeResolver's question
- seen failing: each port's question and answer travel as one fixed text DecisionHistory's question
- seen failing: each port's question and answer travel as one fixed text RelationshipResolver's question
- seen failing: each port's question and answer travel as one fixed text CustomPredicate's question
- seen failing: each port's question and answer travel as one fixed text SignatureHistory's question
- seen failing: a host answers one fixed question per port AttributeResolver answers a served attribute
- seen failing: a host answers one fixed question per port DecisionHistory answers a served event
- seen failing: a host answers one fixed question per port RelationshipResolver answers a served relation
- seen failing: a host answers one fixed question per port CustomPredicate answers a served predicate
- seen failing: a host answers one fixed question per port SignatureHistory answers once its records are opted in
- failing text: AssertionError: expected '{"subjectId":"alice","attr":"clearanc…' to equal '{"subjectId":"alice","attribute":"cle…'
- failing text: AssertionError: expected '{"subjectId":"alice","evt":"approved"…' to equal '{"subjectId":"alice","event":"approve…'
- failing text: AssertionError: expected '{"subjectId":"alice","rel":"owner","r…' to equal '{"subjectId":"alice","relation":"owne…'

## port-facts-wire-answer-wrap
- scratch: pf-wire-answer-wrap at 8e04476105
- edit: the shared wire encodeAnswer wraps its JSON in an array
- diff: 250800150c6665a559d22a8b79d5d48e727a69ecc3eafb9cdb85c545ab0810d7 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port's question and answer travel as one fixed text AttributeResolver's answer
- seen failing: each port's question and answer travel as one fixed text DecisionHistory's answer
- seen failing: each port's question and answer travel as one fixed text RelationshipResolver's answer
- seen failing: each port's question and answer travel as one fixed text CustomPredicate's answer
- seen failing: each port's question and answer travel as one fixed text SignatureHistory's answer
- seen failing: a host answers one fixed question per port AttributeResolver answers a served attribute
- seen failing: a host answers one fixed question per port DecisionHistory answers a served event
- seen failing: a host answers one fixed question per port RelationshipResolver answers a served relation
- seen failing: a host answers one fixed question per port CustomPredicate answers a served predicate
- seen failing: a host answers one fixed question per port SignatureHistory answers once its records are opted in
- failing text: AssertionError: expected '[{"value":5}]' to equal '{"value":5}'
- failing text: AssertionError: expected '["Acted"]' to equal '"Acted"'
- failing text: AssertionError: expected '["Related"]' to equal '"Related"'

## port-facts-serving-for-reversed
- scratch: pf-serving-for-reversed at 8e04476105
- edit: servingFor reverses the ports' declaration members before merging them
- diff: c2ec3f8a1885e79593ae97e4af8ff46254a5801ebda6e6db9bb88221548b6fc6 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a host answers one fixed question per port servingFor declares what one policy per port asks
- failing text: AssertionError: expected '{"SignatureHistory":{"signatures":"ow…' to equal '{"AttributeResolver":{"attributes":["…'

## port-facts-acted-bare
- scratch: pf-acted-bare at 8e04476105
- edit: readActed's route is forced to the bare read
- diff: 82701142577b5c1049f8624a133ef227ee3f69effbec0991271bf60a4ffed958 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under toPredicate
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true

## port-facts-acted-scoped
- scratch: pf-acted-scoped at 8e04476105
- edit: readActed's route is forced to the scoped read
- diff: f75afcea47ea2ab75250a4b08b94c7eec4f5821534e244bc0d67134e25409167 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a scoped read at every site HasActed, scope Any, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with usable id, under toPredicate
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true

## port-facts-signature-bare
- scratch: pf-signature-bare at 8e04476105
- edit: askSignature's route is forced to the bare read
- diff: 940e6718fb2de9f8840f12311636ae133a853882fed732a5dc644ce283eb7297 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a scoped read at every site HasSignature, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with non-string id, under evaluate
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true

## port-facts-signature-scoped
- scratch: pf-signature-scoped at 8e04476105
- edit: askSignature's route is forced to the scoped read
- diff: e1c98c4bb762750c4d87a3276a6fc6d3d61b81eaebeff7dcfa33145d8f9e2466 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a scoped read at every site HasSignature, scope Any, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, resource with usable id, under evaluate
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true

## port-facts-id-check-skipped
- scratch: pf-id-check-skipped at 8e04476105
- edit: readScoped skips the resource id check
- diff: 996eee869b256594a64fd3853a55bfff43769c083107bcd395ac0e318c45115e (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a scoped read at every site HasRelationship, absent resource, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource without id, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasSignature, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with non-string id, under evaluate
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true
- failing text: AssertionError: expected false to be true

## port-facts-annotation-removed
- scratch: pf-annotation-removed at 8e04476105
- edit: readScoped's miss branch no longer annotates the question
- diff: 16cc3b9f172e482a8167d4f52ccb72013100be1cfabfc5b53b90d33eea1b1ae4 (1 files, +0 -5)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a scoped read at every site HasRelationship, absent resource, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource without id, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasSignature, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with non-string id, under evaluate
- failing text: AssertionError: expected { relation: undefined, …(1) } to deeply equal { relation: 'owner', …(1) }
- failing text: AssertionError: expected { relation: undefined, …(1) } to deeply equal { relation: 'owner', …(1) }
- failing text: AssertionError: expected { relation: undefined, …(1) } to deeply equal { relation: 'owner', …(1) }

## port-facts-scoped-wrong-interpreter
- scratch: pf-scoped-wrong-interpreter at 8e04476105
- edit: readScoped's hit branch reads as the remote interpreter
- diff: e277c125703dba50ef9613b1b1459185310d1dc60561235e640379baefc79962 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a scoped read at every site HasRelationship, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with usable id, under evaluate
- failing text: AssertionError: expected [] to deeply equal [ [ 'RelationshipResolver', 1 ] ]
- failing text: AssertionError: expected [] to deeply equal [ [ 'DecisionHistory', 1 ] ]
- failing text: AssertionError: expected [] to deeply equal [ [ 'DecisionHistory', 1 ] ]

## port-facts-scoped-effect-fn
- scratch: pf-scoped-effect-fn at 8e04476105
- edit: readScoped is wrapped in Effect.fn
- diff: 9a0e805ca3b40dd232ea1ba8c2734c436630653fae13571cc33916d2e3b317f0 (1 files, +2 -2)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a scoped read at every site HasRelationship, absent resource, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource without id, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasSignature, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with usable id, under evaluate
- failing text: AssertionError: expected [ Array(2) ] to deeply equal [ 'qadi.hasRelationship' ]
- failing text: AssertionError: expected [ Array(2) ] to deeply equal [ 'qadi.hasRelationship' ]
- failing text: AssertionError: expected [ Array(2) ] to deeply equal [ 'qadi.hasRelationship' ]

## port-facts-predicate-counted-as-evaluator
- scratch: pf-predicate-counted-as-evaluator at 8e04476105
- edit: countFor counts toPredicate reads in the evaluator's series
- diff: 9dc07f2a1f653a954bd545f4f8cbdbb0c1f8cca263da40d2e52d7e25017f5d67 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a scoped read at every site HasActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with usable id, under toPredicate
- failing text: AssertionError: expected [ [ 'DecisionHistory', 1 ] ] to deeply equal []
- failing text: AssertionError: expected [ [ 'DecisionHistory', 1 ] ] to deeply equal []
- failing text: AssertionError: expected [ [ 'DecisionHistory', 1 ] ] to deeply equal []

## port-facts-04-span-literal
- scratch: pf-t4-span-literal at f6bc8f4aca
- edit: the AttributeResolver row of PortSpans reads qadi.attributeX
- diff: 1efe6698958d80b3516515aec9eec90b1aac65682851a796732d096875f1b795 (1 files, +1 -1)
- run: tstyche packages/core/test/PortFacts.tst.ts
- exit: 1
- seen failing: PortSpanName is the five span names
- seen failing: PortSpanOf is each port's own span
- failing text: Error: Type 'PortSpanName' is not the same as type '"qadi.acted" | "qadi.hasRelationship" | "qadi.hasCustom" | "qadi.hasSignature" | "qadi.attribute"'.
- failing text: Error: Type '"qadi.attributeX"' is not the same as type '"qadi.attribute"'.
- failing text: Error: Type 'PortSpanName' is not the same as type '"qadi.acted" | "qadi.hasRelationship" | "qadi.hasCustom" | "qadi.hasSignature" | "qadi.attribute"'.

## port-facts-04-span-key
- scratch: pf-t4-span-key at f6bc8f4aca
- edit: the AttributeResolver key of PortSpans renamed to AttributeResolverX
- diff: afa5e2f63a6dd0dac11c2ab1e7c4780aa0ae90ab56df9adec5c8126138f5dfc9 (1 files, +1 -1)
- run: tstyche packages/core/test/PortFacts.tst.ts
- exit: 1
- seen failing: PortSpanOf is each port's own span
- seen failing: PortName is the five ports
- failing text: Error: Type '"AttributeResolver"' does not satisfy the constraint 'keyof PortSpans'. ts(2344)
- failing text: Error: Type 'keyof PortSpans' is not the same as type '"DecisionHistory" | "RelationshipResolver" | "CustomPredicate" | "SignatureHistory" | "AttributeResolver"'.
- failing text: Error: Type '"AttributeResolver"' does not satisfy the constraint 'keyof PortSpans'. ts(2344)

## port-facts-04-fixture-member
- scratch: pf-t4-fixture-member at f6bc8f4aca
- edit: PortFixtureData's DecisionHistory member holds SignatureInput rows
- diff: 0ba475a66f2571812248ea66bf37f1b1360956a5b1cef1ee51d5c4acc3040b0e (1 files, +1 -1)
- run: tstyche packages/core/test/PortFacts.tst.ts
- exit: 1
- seen failing: PortFixtureData is the five members a host states
- failing text: Error: Type 'PortFixtureData' is not the same as type '{ readonly AttributeResolver: { readonly [key: string]: unknown; }; readonly RelationshipResolver: readonly RelationshipEdgeInput[]; readonly DecisionHistory: readonly ActedEventInput[]; readonly SignatureHistory: readonly SignatureInput[]; readonly CustomPredicate: { readonly [key: string]: boolean; }; }'.
- failing text: Error: Type 'PortFixtureData' is not the same as type '{ readonly AttributeResolver: { readonly [key: string]: unknown; }; readonly RelationshipResolver: readonly RelationshipEdgeInput[]; readonly DecisionHistory: readonly ActedEventInput[]; readonly SignatureHistory: readonly SignatureInput[]; readonly CustomPredicate: { readonly [key: string]: boolean; }; }'.

## port-facts-04-acted-bare-read
- scratch: pf-t4-acted-bare-read at f6bc8f4aca
- edit: readActed reads the bare port for every scope, never readScoped
- diff: 7b981fb2768d3262d6a3a766251d267abd08dceba849f2a992f54288010399f8 (1 files, +1 -3)
- run: vitest packages/core/test/LeafNeeds.test.ts
- exit: 1
- seen failing: a scoped read requires an id exactly where its leaf's row says a read is refused for a missing id exactly when its row and scope ask for one
- seen failing: a scoped read requires an id exactly where its leaf's row says a ByScope leaf's judgement refuses exactly when its read does
- failing text: AssertionError: HasActed[Resource] none: expected false to equal true
- failing text: AssertionError: HasActed[Resource] none: expected true to equal false

## port-facts-04-signature-row-always
- scratch: pf-t4-signature-row-always at f6bc8f4aca
- edit: LEAF_NEEDS HasSignature row says Always
- diff: f69d1215fc6e438cc6b8d92423ac6c1d56970ed0d4a95315646cb3a24bfea746 (1 files, +1 -1)
- run: vitest packages/core/test/LeafNeeds.test.ts
- exit: 1
- seen failing: a scoped read requires an id exactly where its leaf's row says a read is refused for a missing id exactly when its row and scope ask for one
- seen failing: a scoped read requires an id exactly where its leaf's row says a ByScope leaf's judgement refuses exactly when its read does
- failing text: AssertionError: HasSignature[Any]: expected false to be true
- failing text: AssertionError: expected 12 to equal 18

## port-facts-04-signature-row-never
- scratch: pf-t4-signature-row-never at f6bc8f4aca
- edit: LEAF_NEEDS HasSignature row says Never
- diff: 1c5c7dda3bbe2d4a1541d0b82f73bca09eafcacd743d0250e25886ccb37a2680 (1 files, +1 -1)
- run: vitest packages/core/test/LeafNeeds.test.ts
- exit: 1
- seen failing: a scoped read requires an id exactly where its leaf's row says a read is refused for a missing id exactly when its row and scope ask for one
- seen failing: a scoped read requires an id exactly where its leaf's row says a ByScope leaf's judgement refuses exactly when its read does
- seen failing: a scoped read requires an id exactly where its leaf's row says the leaf tags that ask about one resource are exactly four
- failing text: AssertionError: HasSignature[Resource]: expected true to be false
- failing text: AssertionError: expected 12 to equal 18
- failing text: AssertionError: expected [ 'HasActed', 'HasNotActed', …(1) ] to deeply equal [ 'HasActed', 'HasNotActed', …(2) ]

## port-facts-04-signature-judgement-inverted
- scratch: pf-t4-signature-judgement-inverted at f6bc8f4aca
- edit: the signature judgement tests the opposite scope for its resource id
- diff: 8ab8c483087edf111bb3c128dbadcf65349d8de715776d6eaa2abaaca2fbad81 (1 files, +1 -1)
- run: vitest packages/core/test/LeafNeeds.test.ts
- exit: 1
- seen failing: a scoped read requires an id exactly where its leaf's row says a ByScope leaf's judgement refuses exactly when its read does
- failing text: AssertionError: HasSignature[Resource] none: expected false to equal true

## registry-leaf-imports-registry
- scratch: spike-leaf-imports-registry at 8ae31ae12e
- edit: PortName.ts imports ./Ports.ts
- diff: 0b8dee53b5903fb932783ae6d051ea6281d80c72ad5370dd31a3235034f91569 (1 files, +5 -0)
- run: circular
- exit: 1
- failing text: 1) core/src/PortDerivation.ts > core/src/PortDefault.ts > core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts
- failing text: 2) core/src/PortDefault.ts > core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts > core/src/PortDescription.ts
- failing text: 3) core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts > core/src/PortDescription.ts

## sixth-port base
- scratch: sixth-base at 46174873c6
- edit: a sixth PortSpans row FakePort: "qadi.fake"
- tsc: packages/core/src/PortAccess.ts TS2536 x8
- tsc: packages/core/src/PortMetrics.ts TS2741 x1
- tsc: packages/core/src/PortRemote.ts TS2536 x4
- tsc: packages/core/src/PortServing.ts TS2344 x1
- tsc: packages/core/src/PortServing.ts TS2536 x1
- tsc: packages/core/src/Ports.ts TS2379 x1
- tsc: packages/core/src/Ports.ts TS2536 x17
- tsc: packages/core/src/Ports.ts TS2741 x2
- tsc: packages/core/src/Ports.ts TS377004 x1
- tsc: packages/devtools/src/model/Capture.ts TS2536 x2
- tsc: packages/devtools/src/model/PortCalls.ts TS2741 x1
- tsc: packages/devtools/src/model/PortCards.ts TS2345 x1
- tsc: packages/devtools/src/model/PortReading.ts TS2741 x1
- tsc: packages/devtools/src/model/SimulationFields.ts TS2536 x2
- tsc: packages/devtools/src/model/SimulationFields.ts TS2741 x1
- tsc: packages/devtools/src/model/SimulationSource.ts TS2536 x2
- tsc: packages/devtools/src/model/SimulationSource.ts TS2741 x1
- tsc: packages/http/src/PortRoutes.ts TS2322 x1
- tsc: packages/http/src/PortRoutes.ts TS2345 x1
- tsc: packages/http/src/PortRoutes.ts TS2536 x1
- tsc: packages/http/src/PortRoutes.ts TS377004 x1
- tsc: packages/testing/src/QadiReviewLayer.ts TS2536 x2
- errors: 53
- groups: 22

## sixth-port close (spike: end)
- scratch: sixth-close-spike at 8ae31ae12e
- edit: "FakePort" appended to PORT_NAMES
- tsc: packages/core/src/PortAccess.ts TS2345 x1
- tsc: packages/core/src/PortAccess.ts TS2536 x10
- tsc: packages/core/src/PortRemote.ts TS2345 x1
- tsc: packages/core/src/PortRemote.ts TS2536 x4
- tsc: packages/core/src/PortServing.ts TS2344 x1
- tsc: packages/core/src/PortServing.ts TS2536 x1
- tsc: packages/core/src/Ports.ts TS2344 x1
- tsc: packages/core/src/Ports.ts TS2379 x1
- tsc: packages/core/src/Ports.ts TS2536 x20
- tsc: packages/core/src/Ports.ts TS2741 x1
- tsc: packages/core/src/Ports.ts TS2769 x1
- tsc: packages/core/src/Ports.ts TS377004 x1
- tsc: packages/devtools/src/model/Capture.ts TS2345 x1
- tsc: packages/devtools/src/model/Capture.ts TS2536 x2
- tsc: packages/devtools/src/model/PortCalls.ts TS2322 x1
- tsc: packages/devtools/src/model/PortCalls.ts TS2741 x1
- tsc: packages/devtools/src/model/PortCards.ts TS2345 x1
- tsc: packages/devtools/src/model/PortReading.ts TS2741 x1
- tsc: packages/devtools/src/model/SimulationFields.ts TS2741 x1
- tsc: packages/devtools/src/model/SimulationSource.ts TS2741 x1
- tsc: packages/http/src/PortRoutes.ts TS2322 x1
- tsc: packages/http/src/PortRoutes.ts TS2345 x1
- tsc: packages/http/src/PortRoutes.ts TS2536 x1
- tsc: packages/http/src/PortRoutes.ts TS377004 x1
- tsc: packages/testing/src/QadiReviewLayer.ts TS2536 x1
- errors: 57
- groups: 25

## sixth-port-base-group-missing
- scratch: sixth-seen at 8ae31ae12e
- edit: the recorded base set without its PortMetrics.ts group
- diff: 5dcac5386def967f6996c3ea2c2d2200d61ece653ad2692b37636b9a9d6d4da0 (1 files, +68 -0)
- run: script 90-check.mjs sixth-port base
- exit: 1
- failing text: a group the record lacks: packages/core/src/PortMetrics.ts TS2741

## pinned-held-core
- scratch: pinned-held-core at 501710b22a
- edit: a comment line appended to the held core test Ports.test.ts
- diff: 107aadd3c95c136d4050f0145c34f1c30b221db1e6b783b78b01d520648fa74a (1 files, +2 -0)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: packages/core/test/Ports.test.ts: differs from its base text at line 642

## pinned-held-devtools
- scratch: pinned-held-devtools at 501710b22a
- edit: a comment line appended to the held devtools test support file builtFeeds.ts
- diff: 27446275b58e865e3e00543d9f5ba0b81663f6d110c29288b4dae063e2d1404d (1 files, +2 -0)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: packages/devtools/test/builtFeeds.ts: differs from its base text at line 38

## pinned-held-features
- scratch: pinned-held-features at 501710b22a
- edit: a comment line appended to the held features file step-definitions/CustomPredicateWhenSteps.ts
- diff: 259ff49187d69c3522e258256f530c43256424cc576a34c9c78bce4f00e74a0e (1 files, +2 -0)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: features/step-definitions/CustomPredicateWhenSteps.ts: differs from its base text at line 12

## pinned-portserving
- scratch: pinned-portserving at 501710b22a
- edit: a comment line appended to the held source file PortServing.ts
- diff: 4cee3bc03aac20dece042b4e17314949651791c27cff82178543ae7d68ffc6b7 (1 files, +2 -0)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: packages/core/src/PortServing.ts: differs from its base text at line 115

## pinned-leafneeds-outside
- scratch: pinned-leafneeds-outside at 501710b22a
- edit: one row title of LeafNeeds.test.ts changed outside its declared regions (line 56)
- diff: 29d0f54cff32766f3c4778514035df5dc25d21e1c701acd96820c2a1da28998d (1 files, +1 -1)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: packages/core/test/LeafNeeds.test.ts: differs from the commit that added it at line 54
- failing text: packages/core/test/LeafNeeds.test.ts: differs outside its declared lines at line 54

## pinned-char-outside
- scratch: pinned-char-outside at 501710b22a
- edit: a comment line appended to the characterisation outside its import block
- diff: 6b4471854b7713b07cadff18b228b42ba3ec5048bcf7c23571884347deb3fdc4 (1 files, +2 -0)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: packages/core/test/PortFacts.characterisation.test.ts: differs from the commit that added it at line 698

## pinned-char-const
- scratch: pinned-char-const at 501710b22a
- edit: a const inserted among the imports of the characterisation (line 31)
- diff: 8d3d8f49b69767d1cf9c7cc7e477175ffc7560cd1d34470413c1f5e627f33800 (1 files, +1 -0)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: packages/core/test/PortFacts.characterisation.test.ts: line 31 inside its import region is not an import declaration

## pinned-tst-born
- scratch: pinned-tst-born at 501710b22a
- edit: a member type of PortFacts.tst.ts changed inside its born text
- diff: b16b78b97b8f331e2065b72c995244c0af29c0d774da002a28c922717d9698f8 (1 files, +1 -1)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: packages/core/test/PortFacts.tst.ts: differs from the commit that added it at line 24

## pinned-bench
- scratch: pinned-bench at 501710b22a
- edit: a comment line appended to the bench file Evaluate.bench.ts
- diff: 5158d429bf30fe79d6a46b7ab939c43bbbb86c42ed0faafd80dd911be9ce187f (1 files, +2 -0)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: packages/core/bench/Evaluate.bench.ts: differs from the commit that added it at line 623

## pinned-mutation-commit
- scratch: pinned-mutation-commit at b61125457b
- edit: packages/core/test/PortFacts.mutation.test.ts added in a scratch commit under the subject test(90-99): scratch only
- diff: 60461c76e7ead16c010c1dd643f36c13d64547b6a3d272fff2c0d48d1a03547a (1 files, +1 -0)
- run: script 90-pinned-check.mjs
- exit: 1
- failing text: packages/core/test/PortFacts.mutation.test.ts: added by a commit other than the one that may add it

## pinned-all-applied
- scratch: pinned-all-applied at 501710b22a
- edit: none: the unedited clone with --all-applied, the declared commits missing
- diff: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (0 files, +0 -0)
- run: script 90-pinned-check.mjs --all-applied
- exit: 1
- failing text: packages/core/test/PortName.tst.ts: its declared edit is not applied
- failing text: packages/core/test/PortDescription.test.ts: its declared edit is not applied
- failing text: packages/core/src/LeafNeeds.ts: its declared edit is not applied

## earlier-guard-unexplained
- scratch: earlier-guard at 4652820454
- edit: AGENTS.md changed under a subject no ledger row names
- diff: bfd272a1c824717aefcef27662db5083c4dccd1d9b3040a2d8faedbb1f6c9eb7 (1 files, +1 -1)
- run: script 90-earlier-checks.mjs
- exit: 1
- failing text: 85-check.mjs scan-forbidden: expected exit 0, got exit 1: AGENTS.md differs from phase_base: no budget moves
- failing text: 86-check.mjs scan-forbidden: expected exit 0, got exit 1: AGENTS.md differs from phase_base: no budget moves
- failing text: 87-check.mjs scan-forbidden: expected exit 0, got exit 1: AGENTS.md differs from phase_base: no budget moves

## earlier-records-unbumped
- scratch: earlier-records at 31e23b27e0
- edit: a change-history row appended to spec/README.md under the subject of the decision commit, the revision not bumped
- diff: f2c2545693c03fdf76e7f5e27949f68df9dc6247b115172a2186baa9feb204b9 (1 files, +1 -0)
- run: script 90-earlier-checks.mjs
- exit: 1
- failing text: 88-check.mjs records --close: missing reason "spec/README.md is at Revision 1.416, not 1.414"
- failing text: 88-check.mjs records --close: missing reason "spec/traceability.md is at Revision 1.335, not 1.333"
- failing text: 88-check.mjs records --close: unexpected reason "spec/README.md is at Revision 1.415, not 1.414"

## port-names-swap-vitest
- scratch: names-swap-vitest at 61ff69b836
- edit: PORT_NAMES with AttributeResolver and DecisionHistory swapped
- diff: 2477bbc35b40886eb963d28357a86c05d32dd8d6204636c4db3a67dab395595d (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: each port metric preregisters its words portCallsTotal preregisters the five ports, in order
- seen failing: each port metric preregisters its words portRetriesTotal preregisters the five ports, in order
- seen failing: each port metric preregisters its words portTimeoutsTotal preregisters the five ports, in order
- seen failing: each port metric preregisters its words servedPortCallsTotal preregisters the five ports, in order
- failing text: AssertionError: expected [ [ 'DecisionHistory', +0 ], …(4) ] to deeply equal [ [ 'AttributeResolver', +0 ], …(4) ]
- failing text: AssertionError: expected [ [ 'DecisionHistory', +0 ], …(4) ] to deeply equal [ [ 'AttributeResolver', +0 ], …(4) ]
- failing text: AssertionError: expected [ [ 'DecisionHistory', +0 ], …(4) ] to deeply equal [ [ 'AttributeResolver', +0 ], …(4) ]

## port-names-swap-tstyche
- scratch: names-swap-tstyche at 61ff69b836
- edit: PORT_NAMES with AttributeResolver and DecisionHistory swapped
- diff: 2477bbc35b40886eb963d28357a86c05d32dd8d6204636c4db3a67dab395595d (1 files, +1 -1)
- run: tstyche packages/core/test/PortFacts.tst.ts
- exit: 1
- seen failing: PORT_NAMES is the five names, in the registry's order
- failing text: Error: Type 'readonly ["DecisionHistory", "AttributeResolver", "RelationshipResolver", "CustomPredicate", "SignatureHistory"]' is not the same as type 'readonly ["AttributeResolver", "DecisionHistory", "RelationshipResolver", "CustomPredicate", "SignatureHistory"]'.
- failing text: Error: Type 'readonly ["DecisionHistory", "AttributeResolver", "RelationshipResolver", "CustomPredicate", "SignatureHistory"]' is not the same as type 'readonly ["AttributeResolver", "DecisionHistory", "RelationshipResolver", "CustomPredicate", "SignatureHistory"]'.

## port-names-predicate-misspelt
- scratch: names-misspelt at 61ff69b836
- edit: PREDICATE_PORT_NAMES holding "AttributeResolvr"
- diff: 976a36ceb6b499d354137f9d1d0e92755918d5e2d5f443c1173e8f37e257fe5c (1 files, +1 -1)
- run: tsc-src
- exit: 2
- failing text: packages/core/src/PortMetrics.ts(135,3): error TS2820: Type '"AttributeResolvr"' is not assignable to type '"AttributeResolver" | "CustomPredicate" | "DecisionHistory" | "RelationshipResolver" | "SignatureHistory"'. Did you mean '"AttributeResolver"'?
- tsc: packages/core/src/PortMetrics.ts TS2820 x1

## port-names-imports-ports
- scratch: names-cycle at 61ff69b836
- edit: PortName.ts importing ./Ports.ts
- diff: e115d5ce18dd37431c75bda7be0917239b2ab554f769c728d29529d229e710aa (1 files, +3 -0)
- run: circular
- exit: 1
- failing text: 1) core/src/PortDerivation.ts > core/src/PortDefault.ts > core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts
- failing text: 2) core/src/PortDefault.ts > core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts > core/src/PortDescription.ts
- failing text: 3) core/src/PortName.ts > core/src/Ports.ts > core/src/AttributeResolver.ts > core/src/PortDescription.ts

## span-shared-claim
- scratch: span-dup at 71885b1e9c
- edit: relationshipResolverPort span const set to "qadi.acted", the span decisionHistoryPort already states
- diff: ca0a4fe9059665cbb3b6164be6cccc7b92567a7e563c7bfc17ebfd6830bb1e0a (1 files, +1 -1)
- run: tsc-src
- exit: 2
- failing text: packages/core/src/Ports.ts(65,3): error TS1360: Type '{ AttributeResolver: PortDescription<"AttributeResolver", AttributeResolver, AttributeResolverShape, [subjectId: SubjectId, attribute: string], unknown, AttributeResolveError, [subjectId: SubjectId, attribute: string], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly attribute: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly resolved: optionalKey<Boolean>; }>; readonly pose: (args: [subjectId: SubjectId, attribute: string]) => { readonly attribute: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: unknown, args: [subjectId: SubjectId, attribute: string]) => { resolved: boolean; }; }, { HasAttribute: (leaf: LeafOf["HasAttribute"], site: ReadSite) => [subjectId: SubjectId, attribute: string]; }, "qadi.attribute">; DecisionHistory: PortDescription<"DecisionHistory", DecisionHistory, DecisionHistoryShape, [query: ActedQuery], "Acted" | "NotActed" | "Unknown", DecisionHistoryUnavailable, [query: ActedQuery], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly event: optionalKey<String>; readonly scope: optionalKey<Literals<readonly ["Any", "Resource"]>>; readonly resourceId: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly answer: optionalKey<Literals<readonly ["Acted", "NotActed", "Unknown"]>>; }>; readonly pose: (args: [query: ActedQuery]) => { readonly event: string | undefined; readonly resourceId: string | undefined; readonly scope: "Any" | "Resource" | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: "Acted" | "NotActed" | "Unknown", args: [query: ActedQuery]) => { answer: "Acted" | "NotActed" | "Unknown"; }; }, { HasActed: (leaf: LeafOf["HasActed"] | LeafOf["HasNotActed"], site: ReadSite) => [query: ActedQuery]; HasNotActed: (leaf: LeafOf["HasActed"] | LeafOf["HasNotActed"], site: ReadSite) => [query: ActedQuery]; }, "qadi.acted">; RelationshipResolver: PortDescription<"RelationshipResolver", RelationshipResolver, RelationshipResolverShape, [request: RelationshipCheck], "Related" | "Unknown" | "Unrelated", RelationshipResolveError, [request: PendingRelationshipCheck], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly relation: optionalKey<String>; readonly resourceId: optionalKey<String>; readonly depth: optionalKey<Number>; }>; readonly answer: SpanStruct<{ readonly answer: optionalKey<Literals<readonly ["Related", "Unrelated", "Unknown"]>>; }>; readonly pose: (args: [request: PendingRelationshipCheck]) => { readonly depth: number | undefined; readonly relation: string | undefined; readonly resourceId: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: "Related" | "Unknown" | "Unrelated", args: [request: PendingRelationshipCheck]) => { answer: "Related" | "Unknown" | "Unrelated"; }; }, { HasRelationship: (leaf: LeafOf["HasRelationship"], site: ReadSite) => [request: PendingRelationshipCheck]; }, "qadi.acted">; CustomPredicate: PortDescription<"CustomPredicate", CustomPredicate, CustomPredicateShape, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], boolean, CustomPredicateError, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly name: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly answer: optionalKey<Boolean>; }>; readonly pose: (args: CustomArgs) => { readonly name: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: boolean, args: CustomArgs) => { answer: boolean; }; }, { HasCustom: (leaf: LeafOf["HasCustom"], site: ReadSite) => [name: string, subject: AuthSubject, resource: Resource | undefined, params: unknown]; }, "qadi.hasCustom">; SignatureHistory: PortDescription<"SignatureHistory", SignatureHistory, SignatureHistoryShape, [query: SignatureQuery], readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], SignatureHistoryUnavailable, [query: SignatureQuery], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly meaning: optionalKey<String>; readonly scope: optionalKey<Literals<readonly ["Any", "Resource"]>>; readonly signerRole: optionalKey<String>; readonly resourceId: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly matched: optionalKey<Boolean>; }>; readonly pose: (args: [query: SignatureQuery]) => { readonly meaning: string | undefined; readonly resourceId: string | undefined; readonly scope: "Any" | "Resource" | undefined; readonly signerRole: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], args: [query: SignatureQuery]) => { readonly matched?: boolean; }; }, { HasSignature: (leaf: LeafOf["HasSignature"], site: ReadSite) => [query: SignatureQuery]; }, "qadi.hasSignature">; }' does not satisfy the expected type 'never'.
- tsc: packages/core/src/Ports.ts TS1360 x1

## span-widened-string
- scratch: span-wide at 71885b1e9c
- edit: customPredicatePort span const annotated string
- diff: 8200818cbd621c4e0f9c0e2d7287492dada43cb7e5e5d4af254bca09b7b33fb2 (1 files, +1 -1)
- run: tsc-src
- exit: 2
- failing text: packages/core/src/CustomPredicate.ts(217,3): error TS2344: Type 'string' does not satisfy the constraint '`qadi.${string}`'.
- failing text: packages/core/src/CustomPredicate.ts(256,75): error TS2345: Argument of type 'PortDescription<"CustomPredicate", CustomPredicate, CustomPredicateShape, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], boolean, CustomPredicateError, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly name: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly answer: optionalKey<Boolean>; }>; readonly pose: (args: CustomArgs) => { readonly name: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: boolean, args: CustomArgs) => { answer: boolean; }; }, { HasCustom: (leaf: { readonly _tag: "HasCustom"; readonly name: string; readonly params?: unknown; readonly fields?: readonly string[] | undefined; }, site: ReadSite) => [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown]; }, string>' is not assignable to parameter of type 'PortDescription<"CustomPredicate", CustomPredicate, CustomPredicateShape, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], boolean, CustomPredicateError, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], PortSpanAttributesLike, LeafRequests<[name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown]>, `qadi.${string}`>'.
- failing text: packages/core/src/CustomPredicate.ts(309,16): error TS2345: Argument of type 'PortDescription<"CustomPredicate", CustomPredicate, CustomPredicateShape, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], boolean, CustomPredicateError, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly name: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly answer: optionalKey<Boolean>; }>; readonly pose: (args: CustomArgs) => { readonly name: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: boolean, args: CustomArgs) => { answer: boolean; }; }, { HasCustom: (leaf: { readonly _tag: "HasCustom"; readonly name: string; readonly params?: unknown; readonly fields?: readonly string[] | undefined; }, site: ReadSite) => [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown]; }, string>' is not assignable to parameter of type 'PortDescription<"CustomPredicate", CustomPredicate, CustomPredicateShape, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], boolean, CustomPredicateError, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], PortSpanAttributesLike, LeafRequests<[name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown]>, `qadi.${string}`>'.
- tsc: packages/core/src/CustomPredicate.ts TS2344 x1
- tsc: packages/core/src/CustomPredicate.ts TS2345 x4
- tsc: packages/core/src/PortRemote.ts TS2345 x1
- tsc: packages/core/src/Ports.ts TS1360 x1
- tsc: packages/core/src/Ports.ts TS2344 x1
- tsc: packages/core/src/Ports.ts TS2769 x1
- tsc: packages/devtools/src/model/Capture.ts TS2345 x1

## span-widened-pattern
- scratch: span-pat at 71885b1e9c
- edit: customPredicatePort span const annotated as the pattern qadi.${string}
- diff: cc237b54be46b82d7959579db3c4a9c5566d3f35aa725b7ee487320ad52a1636 (1 files, +1 -1)
- run: tsc-src
- exit: 2
- failing text: packages/core/src/Ports.ts(65,3): error TS1360: Type '{ AttributeResolver: PortDescription<"AttributeResolver", AttributeResolver, AttributeResolverShape, [subjectId: SubjectId, attribute: string], unknown, AttributeResolveError, [subjectId: SubjectId, attribute: string], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly attribute: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly resolved: optionalKey<Boolean>; }>; readonly pose: (args: [subjectId: SubjectId, attribute: string]) => { readonly attribute: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: unknown, args: [subjectId: SubjectId, attribute: string]) => { resolved: boolean; }; }, { HasAttribute: (leaf: LeafOf["HasAttribute"], site: ReadSite) => [subjectId: SubjectId, attribute: string]; }, "qadi.attribute">; DecisionHistory: PortDescription<"DecisionHistory", DecisionHistory, DecisionHistoryShape, [query: ActedQuery], "Acted" | "NotActed" | "Unknown", DecisionHistoryUnavailable, [query: ActedQuery], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly event: optionalKey<String>; readonly scope: optionalKey<Literals<readonly ["Any", "Resource"]>>; readonly resourceId: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly answer: optionalKey<Literals<readonly ["Acted", "NotActed", "Unknown"]>>; }>; readonly pose: (args: [query: ActedQuery]) => { readonly event: string | undefined; readonly resourceId: string | undefined; readonly scope: "Any" | "Resource" | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: "Acted" | "NotActed" | "Unknown", args: [query: ActedQuery]) => { answer: "Acted" | "NotActed" | "Unknown"; }; }, { HasActed: (leaf: LeafOf["HasActed"] | LeafOf["HasNotActed"], site: ReadSite) => [query: ActedQuery]; HasNotActed: (leaf: LeafOf["HasActed"] | LeafOf["HasNotActed"], site: ReadSite) => [query: ActedQuery]; }, "qadi.acted">; RelationshipResolver: PortDescription<"RelationshipResolver", RelationshipResolver, RelationshipResolverShape, [request: RelationshipCheck], "Related" | "Unknown" | "Unrelated", RelationshipResolveError, [request: PendingRelationshipCheck], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly relation: optionalKey<String>; readonly resourceId: optionalKey<String>; readonly depth: optionalKey<Number>; }>; readonly answer: SpanStruct<{ readonly answer: optionalKey<Literals<readonly ["Related", "Unrelated", "Unknown"]>>; }>; readonly pose: (args: [request: PendingRelationshipCheck]) => { readonly depth: number | undefined; readonly relation: string | undefined; readonly resourceId: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: "Related" | "Unknown" | "Unrelated", args: [request: PendingRelationshipCheck]) => { answer: "Related" | "Unknown" | "Unrelated"; }; }, { HasRelationship: (leaf: LeafOf["HasRelationship"], site: ReadSite) => [request: PendingRelationshipCheck]; }, "qadi.hasRelationship">; CustomPredicate: PortDescription<"CustomPredicate", CustomPredicate, CustomPredicateShape, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], boolean, CustomPredicateError, [name: string, subject: AuthSubject, resource: Readonly<Record<string, unknown>> | undefined, params: unknown], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly name: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly answer: optionalKey<Boolean>; }>; readonly pose: (args: CustomArgs) => { readonly name: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: boolean, args: CustomArgs) => { answer: boolean; }; }, { HasCustom: (leaf: LeafOf["HasCustom"], site: ReadSite) => [name: string, subject: AuthSubject, resource: Resource | undefined, params: unknown]; }, `qadi.${string}`>; SignatureHistory: PortDescription<"SignatureHistory", SignatureHistory, SignatureHistoryShape, [query: SignatureQuery], readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], SignatureHistoryUnavailable, [query: SignatureQuery], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly meaning: optionalKey<String>; readonly scope: optionalKey<Literals<readonly ["Any", "Resource"]>>; readonly signerRole: optionalKey<String>; readonly resourceId: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly matched: optionalKey<Boolean>; }>; readonly pose: (args: [query: SignatureQuery]) => { readonly meaning: string | undefined; readonly resourceId: string | undefined; readonly scope: "Any" | "Resource" | undefined; readonly signerRole: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], args: [query: SignatureQuery]) => { readonly matched?: boolean; }; }, { HasSignature: (leaf: LeafOf["HasSignature"], site: ReadSite) => [query: SignatureQuery]; }, "qadi.hasSignature">; }' does not satisfy the expected type 'never'.
- tsc: packages/core/src/Ports.ts TS1360 x1

## span-literal-house-style
- scratch: span-lit at 71885b1e9c
- edit: "qadi.attribute" written as a string in PortAccess.ts
- diff: fea3291d5fb5e3bc2934d8256aa34aa79c4db797825e6aa9da81eeaac74b3718 (1 files, +1 -0)
- run: house-style
- exit: 1
- failing text: packages/core/src/PortAccess.ts:144  [no-port-span-key-literals] A port span's keys are stated once, in its description (`attributes`). Write through `annotateQuestion`/`annotateAnswer`/`attemptsStruct` and read through `decodePortSpan`; do not spell a `qadi.<key>` here.
- failing text:     const spanLiteral = "qadi.attribute";
- failing text: 1 house-style violation(s). See AGENTS.md.

## span-literal-port-facts
- scratch: span-lit at 71885b1e9c
- edit: "qadi.attribute" written as a string in PortAccess.ts
- diff: fea3291d5fb5e3bc2934d8256aa34aa79c4db797825e6aa9da81eeaac74b3718 (1 files, +1 -0)
- run: script 90-check.mjs port-facts spans
- exit: 1
- failing text: packages/core/src/PortAccess.ts holds a "qadi. string literal: a span name is read from its description

## span-check-always-unknown
- scratch: span-always at 71885b1e9c
- edit: DistinctSpanNames returning unknown whichever way the check falls
- diff: 1e8ad610b9c28aaffd02f192afce7b1218f68102a5663b7437f062b51867cda4 (1 files, +1 -1)
- run: tstyche packages/core/test/PortFacts.tst.ts
- exit: 1
- seen failing: no two ports share a span name, and each names one literal
- failing text: Error: Type 'unknown' is not the same as type 'never'.
- failing text: Error: Type 'unknown' is not the same as type 'never'.
- failing text: Error: Type 'unknown' is not the same as type 'never'.

## span-declared-twice
- scratch: span-two at 71885b1e9c
- edit: a second const attributeSecondSpanName = "qadi.attribute" in AttributeResolver.ts
- diff: 261bbdcceea1a30a88721cee7e7c229952d33c9ac374ef97b0c613f73dedd599 (1 files, +1 -0)
- run: script 90-check.mjs port-facts spans
- exit: 1
- failing text: qadi.attribute has 2 const <x>SpanName declarations in packages/core/src/, not one (AttributeResolver)

## span-optional
- scratch: span-optional at 71885b1e9c
- edit: PortDescription.span made optional
- diff: 0d3999acebe3eda9588d607592dfc93c2c9d40209e4f1c89cdd98ba5b7720122 (1 files, +1 -1)
- run: tstyche packages/core/test/PortFacts.tst.ts
- exit: 1
- seen failing: PortSpanName is the five span names
- seen failing: PortSpanOf is each port's own span
- seen failing: no two ports share a span name, and each names one literal
- seen failing: span is a required member of a description
- failing text: Error: Type '"qadi.acted" | "qadi.attribute" | "qadi.hasRelationship" | "qadi.hasCustom" | "qadi.hasSignature" | undefined' is not the same as type '"qadi.acted" | "qadi.attribute" | "qadi.hasRelationship" | "qadi.hasCustom" | "qadi.hasSignature"'.
- failing text: Error: Type '"qadi.attribute" | undefined' is not the same as type '"qadi.attribute"'.
- failing text: Error: Type '"qadi.acted" | undefined' is not the same as type '"qadi.acted"'.

## fixture-missing
- scratch: fix-missing at 96009eb592
- edit: the fixture member removed from signatureHistoryPort
- diff: 982a18f01619c3f059c2fcb61e9dcd61890d40a87d2ad2041bc474103b3434fb (1 files, +0 -1)
- run: tsc-src
- exit: 2
- failing text: packages/core/src/SignatureHistory.ts(281,25): error TS2345: Argument of type '{ port: "SignatureHistory"; method: string; span: "qadi.hasSignature"; attributes: { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly meaning: optionalKey<String>; readonly scope: optionalKey<Literals<readonly ["Any", "Resource"]>>; readonly signerRole: optionalKey<String>; readonly resourceId: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly matched: optionalKey<Boolean>; }>; readonly pose: (args: [query: SignatureQuery]) => { readonly meaning: string | undefined; readonly resourceId: string | undefined; readonly scope: "Any" | "Resource" | undefined; readonly signerRole: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], args: [query: SignatureQuery]) => { readonly matched?: boolean; }; }; asks: { HasSignature: (leaf: { readonly _tag: "HasSignature"; readonly meaning: string; readonly signerRole?: string | undefined; readonly scope: "Any" | "Resource"; readonly fields?: readonly string[] | undefined; }, site: ReadSite) => [query: SignatureQuery]; }; wire: { toAnswer: (answer: readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[]) => Result<readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], { readonly _tag: "Circular"; readonly path: WirePath; } | { readonly _tag: "EncodeFailed"; readonly message: string; } | { readonly _tag: "NonFinite"; readonly path: WirePath; } | { readonly _tag: "Opaque"; readonly path: WirePath; readonly kind: OpaqueKind; readonly brand: string; } | { readonly _tag: "TooDeep"; readonly path: WirePath; readonly maxDepth: number; } | { readonly _tag: "Unrepresentable"; readonly path: WirePath; readonly kind: UnrepresentableKind; }>; fromAnswer: (wire: readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[]) => readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[]; question: Struct<{ readonly subjectId: brand<String, "SubjectId">; readonly resourceId: optionalKey<brand<String, "ResourceId">>; readonly meaning: optionalKey<String>; readonly signerRole: optionalKey<String>; }>; answer: $Array<Struct<{ readonly signerId: brand<String, "SubjectId">; readonly meaning: String; readonly signerRole: optional<String>; readonly signedAt: Number; readonly algorithm: optional<String>; readonly keyId: optional<String>; }>>; toQuestion: ([query]: [query: SignatureQuery]) => { subjectId: SubjectId; resourceId: ResourceId | undefined; meaning: string | undefined; signerRole: string | undefined; }; fromQuestion: (question: { readonly subjectId: string & Brand<"SubjectId">; readonly resourceId?: string & Brand<"ResourceId">; readonly meaning?: string; readonly signerRole?: string; }, subject: AuthSubject) => [query: SignatureQuery]; }; serving: PortServingFacet<"SignatureHistory", [query: SignatureQuery], [query: SignatureQuery]>; service: typeof SignatureHistory; invoke: (shape: SignatureHistoryShape) => (query: SignatureQuery) => Effect<readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], SignatureHistoryUnavailable, never>; make: (name: string, call: (query: SignatureQuery) => Effect<readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], SignatureHistoryUnavailable, never>) => { name: string; signaturesFor: (query: SignatureQuery) => Effect<readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], SignatureHistoryUnavailable, never>; }; failure: ([query]: [query: SignatureQuery], cause: unknown) => SignatureHistoryUnavailable; none: { name: string; answer: readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[]; }; }' is not assignable to parameter of type 'Omit<PortDescription<"SignatureHistory", SignatureHistory, SignatureHistoryShape, [query: SignatureQuery], readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], SignatureHistoryUnavailable, [query: SignatureQuery], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly meaning: optionalKey<String>; readonly scope: optionalKey<Literals<readonly ["Any", "Resource"]>>; readonly signerRole: optionalKey<String>; readonly resourceId: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly matched: optionalKey<Boolean>; }>; readonly pose: (args: [query: SignatureQuery]) => { readonly meaning: string | undefined; readonly resourceId: string | undefined; readonly scope: "Any" | "Resource" | undefined; readonly signerRole: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], args: [query: SignatureQuery]) => { readonly matched?: boolean; }; }, { HasSignature: (leaf: { readonly _tag: "HasSignature"; readonly meaning: string; readonly signerRole?: string | undefined; readonly scope: "Any" | "Resource"; readonly fields?: readonly string[] | undefined; }, site: ReadSite) => [query: SignatureQuery]; }, "qadi.hasSignature", readonly SignatureInput[]>, "defect" | "key" | "wire"> & { readonly wire: DerivedWireSpec<[query: SignatureQuery], readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], { readonly subjectId: string & Brand<"SubjectId">; readonly resourceId?: string & Brand<"ResourceId">; readonly meaning?: string; readonly signerRole?: string; }, { readonly subjectId: string; readonly resourceId?: string; readonly meaning?: string; readonly signerRole?: string; }, readonly { readonly signerId: string & Brand<"SubjectId">; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[], readonly { readonly signerId: string; readonly meaning: string; readonly signerRole?: string | undefined; readonly signedAt: number; readonly algorithm?: string | undefined; readonly keyId?: string | undefined; }[]>; }'.
- tsc: packages/core/src/SignatureHistory.ts TS2345 x1

## fixture-builder-below
- scratch: fix-order at 96009eb592
- edit: attributeResolverFromRecord moved below attributeResolverPort
- diff: 2ed107ac4b9e731d5edcdf8a1b07ec10ad54665aef3158069ea3e7855426dc2c (1 files, +14 -13)
- run: tsc-src
- exit: 2
- failing text: packages/core/src/AttributeResolver.ts(216,12): error TS2448: Block-scoped variable 'attributeResolverFromRecord' used before its declaration.
- failing text: packages/core/src/AttributeResolver.ts(216,12): error TS2454: Variable 'attributeResolverFromRecord' is used before being assigned.
- tsc: packages/core/src/AttributeResolver.ts TS2448 x1
- tsc: packages/core/src/AttributeResolver.ts TS2454 x1

## fixture-optional
- scratch: fix-optional at 96009eb592
- edit: PortDescription.fixture made optional
- diff: 55fff13f2d18edbd2756af3530031dbeedcaa4fefddb0659113fbc6972329a48 (1 files, +1 -1)
- run: tstyche packages/core/test/PortFacts.tst.ts
- exit: 1
- seen failing: PortFixtureData is the five members a host states
- seen failing: span and fixture are required members of a description
- seen failing: PORT_FIXTURES is one builder per port, from its own data to its own service
- failing text: Error: Type 'PortFixtureData' is not the same as type '{ readonly AttributeResolver: { readonly [key: string]: unknown; }; readonly RelationshipResolver: readonly RelationshipEdgeInput[]; readonly DecisionHistory: readonly ActedEventInput[]; readonly SignatureHistory: readonly SignatureInput[]; readonly CustomPredicate: { readonly [key: string]: boolean; }; }'.
- failing text: Error: Type 'Omit<PortDescription<"AttributeResolver", AttributeResolver, AttributeResolverShape, [subjectId: SubjectId, attribute: string], unknown, AttributeResolveError, [subjectId: SubjectId, attribute: string], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly attribute: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly resolved: optionalKey<Boolean>; }>; readonly pose: (args: [subjectId: SubjectId, attribute: string]) => { readonly attribute: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: unknown, args: [subjectId: SubjectId, attribute: string]) => { resolved: boolean; }; }, { HasAttribute: (leaf: { readonly _tag: "HasAttribute"; readonly attribute: string; readonly matcher: Matcher; readonly fields?: readonly string[] | undefined; }, site: ReadSite) => [subjectId: SubjectId, attribute: string]; }, "qadi.attribute", { readonly [key: string]: unknown; }>, "fixture">' is assignable to type 'DescriptionOf<"AttributeResolver">'.
- failing text: Error: Type 'Omit<PortDescription<"DecisionHistory", DecisionHistory, DecisionHistoryShape, [query: ActedQuery], "Unknown" | "Acted" | "NotActed", DecisionHistoryUnavailable, [query: ActedQuery], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly event: optionalKey<String>; readonly scope: optionalKey<Literals<readonly ["Any", "Resource"]>>; readonly resourceId: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly answer: optionalKey<Literals<readonly ["Acted", "NotActed", "Unknown"]>>; }>; readonly pose: (args: [query: ActedQuery]) => { readonly resourceId: string | undefined; readonly event: string | undefined; readonly subjectId: string | undefined; readonly scope: "Any" | "Resource" | undefined; }; readonly disclose: (outcome: "Unknown" | "Acted" | "NotActed", args: [query: ActedQuery]) => { answer: "Unknown" | "Acted" | "NotActed"; }; }, { HasActed: (leaf: { readonly _tag: "HasActed"; readonly event: string & Brand<"EventName">; readonly scope: "Any" | "Resource"; readonly fields?: readonly string[] | undefined; } | { readonly _tag: "HasNotActed"; readonly event: string & Brand<"EventName">; readonly scope: "Any" | "Resource"; readonly fields?: readonly string[] | undefined; }, site: ReadSite) => [query: ActedQuery]; HasNotActed: (leaf: { readonly _tag: "HasActed"; readonly event: string & Brand<"EventName">; readonly scope: "Any" | "Resource"; readonly fields?: readonly string[] | undefined; } | { readonly _tag: "HasNotActed"; readonly event: string & Brand<"EventName">; readonly scope: "Any" | "Resource"; readonly fields?: readonly string[] | undefined; }, site: ReadSite) => [query: ActedQuery]; }, "qadi.acted", readonly ActedEventInput[]>, "fixture">' is assignable to type 'DescriptionOf<"DecisionHistory">'.

## fixture-negated
- scratch: fix-negated at 96009eb592
- edit: customPredicatePort.fixture answering the negation of each answer
- diff: 4a2e25ac5adbfb7a46c502182c4b02cf611aedf2db4395da343c2d8b00a240ee (1 files, +1 -1)
- run: vitest packages/core/test/Ports.test.ts packages/core/test/PortFacts.characterisation.test.ts
- exit: 1
- seen failing: a host answers one fixed question per port CustomPredicate answers a served predicate
- seen failing: fixturePortsLayer each port answers from its data: the sampled question allows, a missing one denies
- seen failing: fixturePortsLayer a layer wins over the same port's answers, and leaves the others alone
- failing text: AssertionError: expected '{"_tag":"Answered","answer":false}' to equal '{"_tag":"Answered","answer":true}'
- failing text: AssertionError: expected 'deny,allow' to deeply equal 'allow,deny'
- failing text: AssertionError: expected false to be true

## route-byscope-true
- scratch: r-byscope at 9c12b14ad3
- edit: the ByScope arm of the route matcher answering true for every leaf
- diff: 858267b2e79da99c258d136cb00061e299330ddc1fd2e1332c9a9defb1ff4ba2 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts packages/core/test/LeafNeeds.test.ts
- exit: 1
- seen failing: a scoped read requires an id exactly where its leaf's row says a read is refused for a missing id exactly when its row and scope ask for one
- seen failing: a scoped read requires an id exactly where its leaf's row says a ByScope leaf's judgement refuses exactly when its read does
- seen failing: evaluate and toPredicate agree where both apply (D-11) an allow is a True constant and a deny a False one, and an absence is the same
- seen failing: a scoped read at every site HasActed, scope Any, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Any, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Any, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Any, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Any, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasSignature, scope Any, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Any, resource with usable id, under evaluate
- failing text: AssertionError: HasActed[Any] none: expected true to equal false
- failing text: AssertionError: HasActed[Any] none: expected false to equal true
- failing text: AssertionError: expected 14 to equal 18

## route-annotation-after-failure
- scratch: r-order at 9c12b14ad3
- edit: the question annotation moved after the failing return in readScoped
- diff: c4a4da3899ad0f948435a37b191343f9465b96d6623abb48458ee61e5adcb5c4 (1 files, +1 -1)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts packages/core/test/PortAccess.test.ts
- exit: 1
- seen failing: a missing resource id still leaves its question on the span (D-07) askActed
- seen failing: a missing resource id still leaves its question on the span (D-07) askRelationship
- seen failing: a missing resource id still leaves its question on the span (D-07) askSignature
- seen failing: a scoped read at every site HasRelationship, absent resource, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource without id, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasSignature, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with non-string id, under evaluate
- failing text: AssertionError: expected {} to deeply equal { 'qadi.subject_id': 'alice', …(3) }
- failing text: AssertionError: expected {} to deeply equal { 'qadi.subject_id': 'alice', …(3) }
- failing text: AssertionError: expected {} to deeply equal { 'qadi.subject_id': 'alice', …(4) }

## route-effect-fn
- scratch: r-fn at 9c12b14ad3
- edit: readScoped's generator wrapped in Effect.fn("qadi.readScoped")
- diff: 805cac8625c2a8505c062ebfae872910d534e52d7fd03a809bfd9b7b775fe263 (1 files, +2 -2)
- run: vitest packages/core/test/PortFacts.characterisation.test.ts packages/core/test/PortAccess.test.ts
- exit: 1
- seen failing: a read is one body, locally and served (ARCH-47) a signature question leaves equal local and served spans, apart from the interpreter
- seen failing: a read is one body, locally and served (ARCH-47) the signature answer keys are the struct's, and onFile is recorded on neither span
- seen failing: a local read equals a served read, port by port (ARCH-47) DecisionHistory askActed, scope Resource leaves equal spans, apart from the interpreter, when answered
- seen failing: a local read equals a served read, port by port (ARCH-47) DecisionHistory askActed, scope Resource a store that fails is the port's typed error on both, with the same question
- seen failing: a local read equals a served read, port by port (ARCH-47) DecisionHistory askActed, scope Resource a store that dies is the port's typed error on both, never a defect
- seen failing: a local read equals a served read, port by port (ARCH-47) DecisionHistory askActed, scope Resource a store that throws is the port's typed error on both, never a defect
- seen failing: a local read equals a served read, port by port (ARCH-47) RelationshipResolver askRelationship leaves equal spans, apart from the interpreter, when answered
- seen failing: a local read equals a served read, port by port (ARCH-47) RelationshipResolver askRelationship a store that fails is the port's typed error on both, with the same question
- seen failing: a local read equals a served read, port by port (ARCH-47) RelationshipResolver askRelationship a store that dies is the port's typed error on both, never a defect
- seen failing: a local read equals a served read, port by port (ARCH-47) RelationshipResolver askRelationship a store that throws is the port's typed error on both, never a defect
- seen failing: a local read equals a served read, port by port (ARCH-47) SignatureHistory askSignature, scope Resource leaves equal spans, apart from the interpreter, when answered
- seen failing: a local read equals a served read, port by port (ARCH-47) SignatureHistory askSignature, scope Resource a store that fails is the port's typed error on both, with the same question
- seen failing: a local read equals a served read, port by port (ARCH-47) SignatureHistory askSignature, scope Resource a store that dies is the port's typed error on both, never a defect
- seen failing: a local read equals a served read, port by port (ARCH-47) SignatureHistory askSignature, scope Resource a store that throws is the port's typed error on both, never a defect
- seen failing: a missing resource id still leaves its question on the span (D-07) askActed
- seen failing: a missing resource id still leaves its question on the span (D-07) askRelationship
- seen failing: a missing resource id still leaves its question on the span (D-07) askSignature
- seen failing: a scoped read at every site HasRelationship, absent resource, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource without id, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasRelationship, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with usable id, under evaluate
- seen failing: a scoped read at every site HasNotActed, scope Resource, absent resource, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource without id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with non-string id, under toPredicate
- seen failing: a scoped read at every site HasNotActed, scope Resource, resource with usable id, under toPredicate
- seen failing: a scoped read at every site HasSignature, scope Resource, absent resource, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource without id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with non-string id, under evaluate
- seen failing: a scoped read at every site HasSignature, scope Resource, resource with usable id, under evaluate
- failing text: AssertionError: expected undefined to equal 'evaluate'
- failing text: AssertionError: expected [] to deeply equal [ 'qadi.matched' ]
- failing text: AssertionError: expected undefined to equal 'evaluate'

## route-switch
- scratch: r-switch at 9c12b14ad3
- edit: a switch on the leaf's LEAF_NEEDS resourceId row inside readScoped
- diff: 3c6bef1a1026fc9066ca71e13a89420565b03955e8d5e2818fe38f01da5fa4ed (1 files, +7 -2)
- run: house-style
- exit: 1
- failing text: packages/core/src/PortAccess.ts:348  [no-switch] Dispatch with effect/Match, not switch — AGENTS.md §5a.
- failing text:     A hot path that genuinely needs one is declared in SWITCH_BUDGET with its reason.
- failing text: 1 house-style violation(s). See AGENTS.md.

## route-relationship-bare
- scratch: r-bare at 9c12b14ad3
- edit: the relationship port given a bare call that carries no resource id
- diff: e9e6bc5f3be2f9411c9e7368c12a67e05944e05c5c1c768f85fb83834a5b9b6e (1 files, +1 -1)
- run: tsc-src
- exit: 2
- failing text: packages/core/src/PortAccess.ts(283,5): error TS2322: Type '([request]: [any]) => any[]' is not assignable to type 'undefined'.
- failing text: packages/core/src/PortAccess.ts(283,13): error TS7031: Binding element 'request' implicitly has an 'any' type.
- tsc: packages/core/src/PortAccess.ts TS2322 x1
- tsc: packages/core/src/PortAccess.ts TS7031 x1

## scoped-port-hand-union
- scratch: r-hand at 9c12b14ad3
- edit: ScopedPort written back as a hand union with CustomPredicate added
- diff: d8fee28024274d6923aa37aa092758aea6c256a6866f507da4b1d733fdd89c91 (1 files, +1 -3)
- run: tsc-src
- exit: 2
- failing text: packages/core/src/PortAccess.ts(277,7): error TS2741: Property 'CustomPredicate' is missing in type '{ DecisionHistory: { withId: (request: [query: ActedQuery]) => [query: ActedQuery]; bare: (request: [query: ActedQuery]) => [query: ActedQuery]; }; RelationshipResolver: { withId: ([request]: [request: PendingRelationshipCheck], resourceId: ResourceId) => [{ subjectId: SubjectId; relation: string; depth: number | undefined; resourceId: ResourceId; }]; bare: undefined; }; SignatureHistory: { withId: (request: [query: SignatureQuery]) => [query: SignatureQuery]; bare: (request: [query: SignatureQuery]) => [query: SignatureQuery]; }; }' but required in type '{ readonly CustomPredicate: ScopedCall<"CustomPredicate">; readonly DecisionHistory: ScopedCall<"DecisionHistory">; readonly RelationshipResolver: ScopedCall<"RelationshipResolver">; readonly SignatureHistory: ScopedCall<"SignatureHistory">; }'.
- tsc: packages/core/src/PortAccess.ts TS2741 x1

## sixth-port close
- scratch: sixth-close at 1dcbac5651
- edit: "FakePort" appended to PORT_NAMES
- tsc: packages/core/src/PortAccess.ts TS2345 x1
- tsc: packages/core/src/PortAccess.ts TS2536 x10
- tsc: packages/core/src/PortRemote.ts TS2345 x1
- tsc: packages/core/src/PortRemote.ts TS2536 x4
- tsc: packages/core/src/PortServing.ts TS2344 x1
- tsc: packages/core/src/PortServing.ts TS2536 x1
- tsc: packages/core/src/Ports.ts TS2344 x1
- tsc: packages/core/src/Ports.ts TS2379 x1
- tsc: packages/core/src/Ports.ts TS2536 x20
- tsc: packages/core/src/Ports.ts TS2741 x1
- tsc: packages/core/src/Ports.ts TS2769 x1
- tsc: packages/core/src/Ports.ts TS377004 x1
- tsc: packages/devtools/src/model/Capture.ts TS2345 x1
- tsc: packages/devtools/src/model/Capture.ts TS2536 x2
- tsc: packages/devtools/src/model/PortCalls.ts TS2322 x1
- tsc: packages/devtools/src/model/PortCalls.ts TS2741 x1
- tsc: packages/devtools/src/model/PortCards.ts TS2345 x1
- tsc: packages/devtools/src/model/PortReading.ts TS2741 x1
- tsc: packages/devtools/src/model/SimulationFields.ts TS2741 x1
- tsc: packages/devtools/src/model/SimulationSource.ts TS2741 x1
- tsc: packages/http/src/PortRoutes.ts TS2322 x1
- tsc: packages/http/src/PortRoutes.ts TS2345 x1
- tsc: packages/http/src/PortRoutes.ts TS2536 x1
- tsc: packages/http/src/PortRoutes.ts TS377004 x1
- tsc: packages/testing/src/QadiReviewLayer.ts TS2536 x1
- errors: 57
- groups: 25

## sixth-port-close-group-missing
- scratch: sixth-close-seen at 1dcbac5651
- edit: the recorded close set without its first group
- diff: eded0218d52ff7fbbb46f9fc04587d9b301dd86c4a96cfee6faf0a803214c22a (1 files, +30 -0)
- run: script 90-check.mjs sixth-port close
- exit: 1
- failing text: a group the record lacks: packages/core/src/PortAccess.ts TS2345

## 90 review fixes

The review round's new test rows and compile-time refusals, each seen failing in a scratch clone before the fix it pins (the
clone holds the commit before the fix, with the new row written in) or, for a control row, under a planted edit that the
row must catch. Each block below is written by `90-check.mjs variant`.

## span-union-refused
- scratch: rv-span at bb4ef25de0
- edit: PortFacts.review.tst.ts written in on the commit before the fix, whose SpanOffenders has no union refusal and tests containment
- diff: 90188ec1ad425e56db6c36383a0c54663ddabcfae29e18f696f80800d3c00e17 (1 files, +45 -0)
- run: tstyche packages/core/test/PortFacts.review.tst.ts
- exit: 1
- seen failing: a span that is a union of names is refused
- seen failing: a span that is a union holding a pattern is refused
- seen failing: two spans that share one member through their unions are refused
- failing text: Error: Type 'unknown' is not the same as type 'never'.
- failing text: Error: Type 'unknown' is not the same as type 'never'.
- failing text: Error: Type 'unknown' is not the same as type 'never'.

## span-distinct-accepted
- scratch: rv-span at bb4ef25de0
- edit: the fixed SpanOffenders planted to refuse every entry (its overlap arm replaced by K)
- diff: 3b95d7de331fe3a0643430263419c32661290add0d4036f81f405f8b910d7ba6 (2 files, +78 -9)
- run: tstyche packages/core/test/PortFacts.review.tst.ts
- exit: 1
- seen failing: a registry of distinct literal spans is accepted, the library's own included
- failing text: Error: The type argument cannot be of the 'never' type.
- failing text: Error: The type argument cannot be of the 'never' type.
- failing text: Error: The type argument cannot be of the 'never' type.

## unscoped-read-reclassified
- scratch: rv-unscoped at bf40eceb8d
- edit: on the fix: HasAttribute moved to AsksAlways with its row set to Always, and the AttributeResolver scopedCall row the compiler asks for added (withId the request, bare undefined)
- diff: 08ad8b22f5011b0bdea260fe8d0f88f12a8163fe7167fa60468a0ceddc3129f4 (2 files, +25 -6)
- run: tsc-src
- exit: 2
- failing text: packages/core/src/PortAccess.ts(419,30): error TS2345: Argument of type 'PortDescription<"AttributeResolver", AttributeResolver, AttributeResolverShape, [subjectId: SubjectId, attribute: string], unknown, AttributeResolveError, [subjectId: SubjectId, attribute: string], { readonly question: SpanStruct<{ readonly subjectId: optionalKey<String>; readonly interpreter: optionalKey<Literals<readonly ["evaluate", "toPredicate", "remote"]>>; readonly attribute: optionalKey<String>; }>; readonly answer: SpanStruct<{ readonly resolved: optionalKey<Boolean>; }>; readonly pose: (args: [subjectId: SubjectId, attribute: string]) => { readonly attribute: string | undefined; readonly subjectId: string | undefined; }; readonly disclose: (outcome: unknown, args: [subjectId: SubjectId, attribute: string]) => { resolved: boolean; }; }, { HasAttribute: (leaf: { readonly _tag: "HasAttribute"; readonly attribute: string; readonly matcher: Matcher; readonly fields?: readonly string[] | undefined; }, site: ReadSite) => [subjectId: SubjectId, attribute: string]; }, "qadi.attribute", Readonly<Record<string, unknown>>>' is not assignable to parameter of type 'DescriptionOf<"CustomPredicate">'.
- failing text: packages/core/src/PortAccess.ts(442,7): error TS2375: Type 'Effect<boolean, CustomPredicateError, CustomPredicate>' is not assignable to type 'Effect<unknown, AttributeResolveError, AttributeResolver>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
- failing text: packages/core/src/PortAccess.ts(442,7): error TS377003: Missing errors CustomPredicateError in the expected Effect type. effect(missingEffectError)
- tsc: packages/core/src/PortAccess.ts TS2345 x1
- tsc: packages/core/src/PortAccess.ts TS2375 x1
- tsc: packages/core/src/PortAccess.ts TS377003 x1
- tsc: packages/core/src/PortAccess.ts TS377004 x1
