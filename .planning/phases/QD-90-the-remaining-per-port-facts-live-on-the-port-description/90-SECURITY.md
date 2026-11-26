---
phase: "90"
slug: "the-remaining-per-port-facts-live-on-the-port-description"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 37
threats_closed: 37
threats_open: 0
asvs_level: 1
created: "2026-11-26"
---

# Phase 90 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (16 PLAN `<threat_model>` blocks; T-90-SC repeated in every plan, counted once).
> Verified at HEAD 060f2eae against phase_base 46174873.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| policy site / caller-supplied resource → scoped port read | a resource-scoped acted, relationship or signature question needs the resource id; an Any-scoped one must not | resource id (authorization input) |
| port judgements → reads | a fixture judgement must refuse exactly when the read does | fixture answers |
| port spans → tracers and devtools | devtools decodes a span by its name | span names, question/answer attributes |
| metric registry → operators | a key is `type:id:description`; a moved key reads zero forever | port-call counters |
| fixture data → devtools Fixtures simulation / review layer | typed data becomes a port layer | plain fixture data |
| package consumers → published `@qadi/core` | a hand-built `PortDescription` stops compiling on upgrade | public types |
| phase scripts, records, scratch clones → the commit history and main tree | judges, base/close records, variants, bench patches | evidence records |
| the phase → the release pipeline | a tag, version or changelog would publish the Breaking minor | release artefacts |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation (evidence) | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-90-01 | Repudiation | mutation and coverage base records | low | mitigate | `90-mutation.mjs` `dirtyReasons` (l.152) refuses a dirty tree, and its self-test l.723 plants one. `landed` (l.467-541) checks phase_base, groups.core.head == phase_base, the exact invocation and the thirteen files. The base commits come first: 404b1541 (scorer + record) and 2d9e1ab4 (coverage-base alone) | closed |
| T-90-02 | Tampering | a coverage run that measures nothing | medium | mitigate | `90-mutation.mjs:337` refuses a summary with "no file" or a missing one of the thirteen. Self-test l.702-703; `--self-test`: 100 passed | closed |
| T-90-03 | Tampering | a judge that passes on a hand list | medium | mitigate | `sixth-port close` compares the recorded (file, code) groups: 57 errors in 25 groups. RED `sixth-port-close-group-missing` and `span-declared-twice` show planted drift failing. `90-check.mjs --self-test`: 496 passed | closed |
| T-90-04 | Repudiation | `90-RED-EVIDENCE.md` | low | mitigate | Each block names the scratch commit, the diff SHA-256, the run, the exit and the failing text (e.g. `route-relationship-bare` l.1277-1286). Every commit touching it is a one-path planning commit, apart from the spike record 5105fef2 (planning paths only) | closed |
| T-90-05 | Tampering | a variant edit leaking into the main tree | medium | mitigate | `judgeScratchName` (90-check.mjs:582) refuses `/` and `..`. No RED/variant commit touches `packages/`. The product diff is exactly the 32 planned files. `90-pinned-check.mjs --all-applied`: 408 files hold their base text | closed |
| T-90-06 | Elevation of privilege | an id-less resource-scoped read answered (fail-open) | high | mitigate | `PortAccess.ts:345-362`: every scoped read goes through `readScoped`. When the row needs an id, `requireResourceId` runs and fails with `MissingResourceId` before `readPort`. Route table `PortFacts.characterisation.test.ts:503-551` has 18 refused rows; l.668-693 assert MissingResourceId, `reached: []`, zero calls counted and the port's own span only. The file was born at 8e044761 (90-03), never edited, and predates the routing commits c7660557/9c12b14a. 44/44 rows pass | closed |
| T-90-07 | Denial of service | an Any-scoped read refused for a missing id | medium | mitigate | 20 Any rows (l.513-550) assert an answer, `reached: [undefined]`, counted 1. RED `route-byscope-true` shows them failing under the always-true variant | closed |
| T-90-08 | Repudiation | a refused read leaving no question on its span | low | mitigate | `PortAccess.ts:354-359` annotates before `Effect.fail`. Each route row asserts the span's `scope`/`resourceId` (l.687). RED `route-annotation-after-failure` fails 18 rows plus 3 PortAccess rows | closed |
| T-90-09 | Elevation of privilege | a judgement or read answering a resource-scoped question without an id | high | mitigate | `LeafNeeds.test.ts:168-201`: the read is refused exactly when row and scope ask for one, over every fixture and shape, and each ByScope judgement refuses exactly when its read does. Born at f6bc8f4a, never edited; 23/23 pass | closed |
| T-90-10 | Tampering | a public type changing shape when it moves | medium | mitigate | `PortFacts.tst.ts:32-76,158-172` pins PortFixtureData, PortSpanName, PortSpanOf, PortName, PORT_NAMES and PORT_FIXTURES through the barrel. `run-tstyche.mjs PortFacts PortName`: both passes, 11 tests / 37 assertions | closed |
| T-90-11 | Tampering | a spike patch changed after it was measured | medium | mitigate | `shasum -a 256` of all 10 `spike/*.patch` files equals the hashes recorded in `90-SPIKE.md` | closed |
| T-90-12 | Denial of service | an import cycle reaching a published package | medium | mitigate | `90-check.mjs circular`: "no circular dependency found". RED `circular-portname` and `registry-leaf-imports-registry` record the rejected chains | closed |
| T-90-13 | Denial of service | hot-path slowdown in the scoped read | medium | mitigate | `90-check.mjs bench`: "the verdict is the analysis's: pass". `bench/analysis.txt` gate pass | closed |
| T-90-14 | Tampering | a patch left applied after `ab.sh` | low | mitigate | `git status --short -- packages` is empty at HEAD | closed |
| T-90-34 | Tampering | a bench patch edited after its A/B | medium | mitigate | `bench/routing.patch` SHA-256 fedbbea7… equals `routing.patch.sha256` and `routing.meta.txt` `patch_sha256:`, with `head: 77a2209f`. `90-check.mjs bench` passes | closed |
| T-90-15 | Tampering | a held test quietly edited | medium | mitigate | `90-pinned-check.mjs --all-applied`: "408 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied". `Ports.test.ts` has no phase commit | closed |
| T-90-16 | Repudiation | an earlier check's output explained after the fact | low | mitigate | `90-earlier-checks.mjs` exit 0 in close; `--self-test`: 68 passed | closed |
| T-90-17 | Tampering | an earlier phase's script edited to pass | medium | mitigate | `git diff --name-only 46174873..HEAD -- .planning` outside the QD-90 dir is only ROADMAP.md and STATE.md. No earlier phase directory and no `scripts/` file changed | closed |
| T-90-18 | Repudiation | a port metric key or word order moved | medium | mitigate | `PortMetrics.ts:66-152`: ids and descriptions untouched; only the source of `PORT_NAMES` changed (same order). Characterisation l.216-246 pins preregistration order. `Ports.test.ts` held | closed |
| T-90-19 | Spoofing | a port claiming another port's span | medium | mitigate | `Ports.ts:62` `satisfies DistinctSpanNames<PortTypes>` (`PortDerivation.ts:124-151`). Pinned positive and negative at `PortFacts.tst.ts:108-116`. RED `span-shared-claim` gives TS1360. An audit probe also confirmed `any`, `never`, `string`, a pattern and a union overlapping another port's span are refused (see SEC-OBS-2) | closed |
| T-90-20 | Tampering | a span name silently renamed | low | mitigate | `PortFacts.tst.ts:48-54` pins each `PortSpanOf` literal; the characterisation facts golden is l.157-181; house-style `no-port-span-key-literals` (RED `span-literal-house-style`) | closed |
| T-90-21 | Tampering | non-serializable fixture data entering a production simulation | low | mitigate | `PortFixtureData` shape pinned unchanged (`PortFacts.tst.ts:32-40`). The member's doc at `PortDescription.ts:329-340` states "Data only, never a layer". Devtools readers (`SimulationSource.ts:123`) are unedited | closed |
| T-90-22 | Denial of service | load-time ReferenceError from a builder used before declaration | medium | mitigate | Four builders sit above their descriptions (AttributeResolver 162<181, DecisionHistory 195<221, RelationshipResolver 270<306, SignatureHistory 229<269). The CustomPredicate builder is referenced lazily inside the `fixture` arrow (CustomPredicate.ts:247-248), so there is no TDZ (SEC-OBS-5). RED `fixture-builder-below` gives TS2448 | closed |
| T-90-23 | Elevation of privilege | a relationship read answered without the resource id | high | mitigate | `PortAccess.ts:266-268` `BareOf` is `undefined` when all of a port's rows are Always. `scopedCall.RelationshipResolver.bare: undefined` (l.281-284) forces the id check, and `withId` writes in the checked id. RED `route-relationship-bare` gives TS2322. Route rows l.504-507 (3 refused, 1 answered with `reached: ["doc-1"]`) | closed |
| T-90-24 | Denial of service | an Any-scoped read refused for an id it does not need | medium | mitigate | The `ByScope` arm is `isResourceScoped` (`PortAccess.ts:302-305`). RED `route-byscope-true` fails 20 Any rows plus 3 LeafNeeds rows | closed |
| T-90-25 | Repudiation | a refused read leaving no question on the port span | low | mitigate | Same as T-90-08: annotate at l.354-358, fail at l.359. Reordered variant seen failing | closed |
| T-90-26 | Repudiation | a mutation allowance with no evidence | medium | mitigate | `90-mutation.mjs:80-118` EQUIVALENT/EXAMINED/STATIC_PROVEN. The STATIC_PROVEN proof title "HasRelationship, absent resource, under evaluate" exists (route row l.504). `compare` exit 0. The three EQUIVALENT reasons were re-derived by hand and hold: `bare` is undefined only for the relationship port, whose only row is Always | closed |
| T-90-27 | Tampering | a close measured on another tree | low | mitigate | Mutation-close head 4e63bbb9 is the parent of 79f26130; coverage-close head 79f26130 is the parent of 47fd2cc8. `git diff 4e63bbb9 HEAD -- packages/core/src` is empty. `landed close` and `landed coverage-close` both ok | closed |
| T-90-35 | Tampering | a held test edited to kill a mutant | medium | mitigate | `PortFacts.mutation.test.ts` is absent (`seen-failing --if-present`: absent). Pinned-check holds every other file | closed |
| T-90-28 | Repudiation | an enforcement claim the gate does not make | medium | mitigate | ADR-QD-203 `## What enforces it`. `records --close` exit 0 | closed |
| T-90-29 | Tampering | a revision bumped twice or a foreign id | low | mitigate | `records --close` exit 0 (one minor per document); `scan-ids`: "no id or phase wording in added lines" | closed |
| T-90-30 | Repudiation | a breaking change shipped without notice | medium | mitigate | `.changeset/core-port-facts-on-the-description.md` begins `**Breaking.**`. The new `typescript` fence in upgrading.md compiles: `check-website-doc-examples.mjs`: "78 block(s) compile" | closed |
| T-90-31 | Tampering | a house rule edited beyond the change | low | mitigate | One AGENTS.md commit (c03e7fe1), confined to §3. `scan-forbidden` exit 0 | closed |
| T-90-32 | Elevation of privilege | an unrequested release of the Breaking minor | high | mitigate | `close`: "18 checks and the no-release facts pass" (versions, changelogs, tag at HEAD, milestones). No package.json, CHANGELOG or lockfile diff. `git tag --points-at HEAD` is empty. No `origin/arch-wave-16` ref, so nothing was pushed | closed |
| T-90-33 | Repudiation | a requirement reported met without evidence | low | mitigate | `90-16-SUMMARY.md:92-103`: each of PFACT-01..05 and WX-01..07 names a command and an output line | closed |
| T-90-36 | Tampering | recursive removal outside the scratch root | medium | mitigate | `cleanScratch`/`judgeScratchRoot` (90-check.mjs:584-587, 1331-1337) require basename `qd90` directly under realpath(TMPDIR). Self-test l.2000-2014 plants both refusals. Ran `scratch-clean` then `--check`: removed / "is gone" | closed |
| T-90-SC | Tampering | npm/pip/cargo installs | high | accept | No `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change in 46174873..HEAD. Logged as AR-90-01 below | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-90-01 | T-90-SC | The phase installs or adds no package (RESEARCH package legitimacy audit: none). Verified: no manifest, lockfile or workspace-catalog change between phase_base and HEAD | plan-time disposition (90-01..90-16 PLAN), verified by gsd-security-auditor | 2026-11-26 |

*Accepted risks do not resurface in future audit runs.*

---

## Observations (not open threats)

| ID | Where | Observation | Failure scenario | Suggested action |
|----|-------|-------------|------------------|------------------|
| SEC-OBS-1 | `packages/core/src/PortAccess.ts:304` | The `ByScope` arm is `"scope" in leaf && isResourceScoped(leaf)`, so a ByScope leaf with no `scope` field is read with no id: it fails open. Unreachable today: the three ByScope leaves type `scope` as required, the strict decoder requires it, and the builders default to `"Resource"` (`Policy.ts:683,700,760`). Base semantics for a scope-less runtime object were the same. `AsksByScope` (`LeafNeeds.ts:91`) is a hand-written union, not tied to the leaf having `scope` | A future leaf tag added to `AsksByScope` whose type has no `scope` compiles; if its fixture is marked unscoped, `LeafNeeds.test.ts` stays green while the read goes to the port with no id | Default the guard to closed, or constrain `AsksByScope` to tags whose `LeafOf` has `scope` |
| SEC-OBS-2 | `packages/core/src/PortDerivation.ts:124-151` | `DistinctSpanNames` refuses shared literals, patterns, `string`, `any`, `never` and unions that overlap another port's span. It still accepts a span typed as a union of two fresh literals, and compares port spans only with each other, not with non-port spans (`qadi.allOf`, `qadi.port.answerRemotely`, …). Today each port span is declared once and nothing collides | A description typed `SpanName = "qadi.x" \| "qadi.y"` compiles; `PortSpanName` widens | Optionally add an `IsUnion` refusal and a pin row |
| SEC-OBS-3 | `packages/core/src/PortDescription.ts:340`, `Ports.ts:294,336` | `fixture` is a member of every exported description. Only `PORT_FIXTURES` and `fixturePortsLayer` read it; their consumers are devtools' Fixtures simulation and `@qadi/testing`'s review layer, both pre-existing. Production `portsLayer`, the derived wrappers and `PortAccess` never read it, and an unset port still falls back to the fail-closed `NONE[d.port]`. No new capability: the builders were already exported | — | None. Keep `.fixture` out of `portsLayer` and the derivations |
| SEC-OBS-4 | `packages/core/src/PortAccess.ts:301` | The `Always` arm of `needsResourceId` is dead code today: the one Always leaf's port has `bare: undefined`, so `&&` short-circuits before the arm. This explains the three EQUIVALENT mutants (PortAccess.ts 54/57). For HasRelationship, fail-closed rests on the compile-time `BareOf` plus route rows, not on the arm | If the arm is deleted, nothing fails today; it only matters once a port mixes Always and ByScope leaves | None now; a port that mixes the two rows must add route-table rows for its Always leaves |
| SEC-OBS-5 | `packages/core/src/CustomPredicate.ts:208,247-248,272` | `customPredicateFromRecord` is below `customPredicatePort` but referenced only inside the `fixture` arrow, so there is no TDZ at module load | An eager point-free reference would raise TS2448 / a load-time ReferenceError | Optionally move the builder above the description for uniformity |
| SEC-OBS-6 | `packages/core/src/PortRemote.ts:60-99`, `PortAccess.ts:584-588` | The served read (`answerRemotely` → `servePortRead`) skips `readScoped`. This phase did not touch it, and it is not a policy-leaf read: a host answers the asker's already-routed question under a subject-match check and a fail-closed allowlist. Every policy-leaf call site (`Walk.ts:190,248,283`, `Predicate.ts:591`) goes through `askActed`/`askRelationship`/`askSignature` → `readScoped` | — | None |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-26 | 37 | 37 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

Commands run (read-only for the tree; scratch removed afterwards): vitest on PortFacts.characterisation, LeafNeeds, PortAccess, Ports, PortDescription (228 passed; 44 route rows); `run-tstyche.mjs PortFacts PortName` (both passes, 37 assertions); `90-check.mjs close` (18 checks and the no-release facts pass); the four phase scripts' self-tests (496, 100, 68, passed); `check-website-doc-examples.mjs` (78 blocks); `scratch-clean` then `--check`; a tsc probe of `DistinctSpanNames` edge types. Not run: Stryker, the bench, `pnpm check:pr`, `spike --rerun` (recorded results relied on; patch hashes checked by hand).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-26
