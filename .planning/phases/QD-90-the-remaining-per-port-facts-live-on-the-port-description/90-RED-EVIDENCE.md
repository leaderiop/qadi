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
