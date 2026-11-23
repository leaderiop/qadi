# Phase 76 evidence: the remedy table asks core about fixture rows

Measured on `phase_base` `bf339146723bd1eabd1f08dd94f489d8480027ef`: no file under `packages/*/src` differs from it, and
the tests below are the first change under `packages/` after it (commit `22d5b10c`, after the fixture-judgement decision).

## The agreement on the base

Base sha: `bf339146723bd1eabd1f08dd94f489d8480027ef`. Agreement commit: `22d5b10c050edb325ea797861b98695699e38fc7`
(five files: the shared helper `packages/devtools/test/remedyAgreement.ts`, the two agreement tests under
`packages/devtools/test/model/`, and one appended `describe` in each of `packages/core/test/SignatureHistory.test.ts` and
`packages/core/test/DecisionHistory.test.ts`).

Commands, from the repository root, each run three times one after the other (nothing else running), each exiting
non-zero because red rows fail:

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedySignatureConformance.test.ts --reporter=json --outputFile=<report> < /dev/null
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedyActedConformance.test.ts --reporter=json --outputFile=<report> < /dev/null
pnpm exec vitest run --project core packages/core/test/SignatureHistory.test.ts packages/core/test/DecisionHistory.test.ts --reporter=json --outputFile=<report> < /dev/null
```

| File | Run 1 | Run 2 | Run 3 | File duration (runs 1, 2, 3) |
| ---- | ----- | ----- | ----- | ---------------------------- |
| `RemedySignatureConformance.test.ts` | 5 passed, 2 failed | 5 passed, 2 failed | 5 passed, 2 failed | 127, 124, 123 ms |
| `RemedyActedConformance.test.ts` | 1 passed, 6 failed | 1 passed, 6 failed | 1 passed, 6 failed | 36, 36, 36 ms |
| `SignatureHistory.test.ts` and `DecisionHistory.test.ts` | 22 passed, 5 failed | 22 passed, 5 failed | 22 passed, 5 failed | 12 ms and 14 ms in each run |

The signature file's count row and four site rows passed in each run, so the product of 1184 cases (4 sites, 4 leaves, 74
lists) holds on the base; its two refusal rows failed. The acted file's count row (144 cases: 4 sites, 2 leaves, 18 lists)
passed; its four site rows and two refusal rows failed. In the core run exactly the five refusal rows failed and the
22 other tests passed.

### The regressions

The first failure line of each devtools refusal row, as the report holds it (identical in the three runs):

| File | Row | First failure line |
| ---- | --- | ------------------ |
| signature | a fixture row it cannot key | `AssertionError: expected [ 'with signature approved' ] to deeply equal []` (core fails the read; the remedy table offers `with signature approved`) |
| signature | a site whose subject id it cannot key | `Error: Schema validation failed` (core's read dies: the error refuses the symbol subject id) |
| acted | a fixture row it cannot key | `AssertionError: core decided, not failed` (the history fixture answers `NotActed`, so core denies) |
| acted | a site whose subject id it cannot key | `TypeError: Cannot convert a Symbol value to a string` (the history fixture answers `NotActed`, so core denies, and the denial's reason names the subject) |

### The refused requests in core

| Row | First failure line |
| --- | ------------------ |
| a signature read whose request the key refuses: fails as SignatureHistoryUnavailable with no subject id, never dying | `Error: Schema validation failed` (`signatureHistoryPort.failure` builds the error with the symbol subject id and its schema refuses it) |
| a subject whose id is a symbol | `AssertionError: the read answered` (`NotActed`, which `hasNotActed` reads as an allow) |
| an event that is a symbol | `AssertionError: the read answered` (`NotActed`) |
| a fixture row whose subject id is a symbol | `AssertionError: the read answered` (`NotActed` for the read at a resource and the read at any) |
| a fixture row whose event cannot be read | `TypeError: Cannot perform 'getPrototypeOf' on a proxy that has been revoked` (thrown while the layer is built) |

### The acted divergences

The four site rows of the acted file list 14 distinct mismatches, 2 at the site whose resource id is doc-1 and 4 at each of
the three sites with no usable resource id, every one at `Any` scope (no `Resource` scope mismatch). Each line is
`<leaf> | <list> | core <outcome> | remedies <what it gave>`.

A redundant event row at a site with a resource id: core allows because the subject acted on another resource, and the
remedy table offers a row anyway.

| Site | Leaf | List | Core | Remedy table gave |
| ---- | ---- | ---- | ---- | ----------------- |
| resource id doc-1 | hasActed approved at scope Any | alice approved doc-2 | Allow | edit `with event approved on doc-1` |
| resource id doc-1 | hasActed approved at scope Any | the decoy, then alice approved doc-2 | Allow | edit `with event approved on doc-1` |

A false skip at a site with no usable id: core allows an `Any`-scoped check from a row on any resource, and the remedy
table skips with `the check names no resource id`. The same four lists at each of the three sites (a resource with no
id, an id that is not a string, no resource):

| Site | Leaf | List | Core | Remedy table gave |
| ---- | ---- | ---- | ---- | ----------------- |
| resource has no id | hasActed approved at scope Any | alice approved doc-1 | Allow | skip `event approved: the check names no resource id` |
| resource has no id | hasActed approved at scope Any | alice approved doc-2 | Allow | skip `event approved: the check names no resource id` |
| resource has no id | hasActed approved at scope Any | the decoy, then alice approved doc-1 | Allow | skip `event approved: the check names no resource id` |
| resource has no id | hasActed approved at scope Any | the decoy, then alice approved doc-2 | Allow | skip `event approved: the check names no resource id` |
| resource id not a string | hasActed approved at scope Any | alice approved doc-1 | Allow | skip `event approved: the check names no resource id` |
| resource id not a string | hasActed approved at scope Any | alice approved doc-2 | Allow | skip `event approved: the check names no resource id` |
| resource id not a string | hasActed approved at scope Any | the decoy, then alice approved doc-1 | Allow | skip `event approved: the check names no resource id` |
| resource id not a string | hasActed approved at scope Any | the decoy, then alice approved doc-2 | Allow | skip `event approved: the check names no resource id` |
| no resource | hasActed approved at scope Any | alice approved doc-1 | Allow | skip `event approved: the check names no resource id` |
| no resource | hasActed approved at scope Any | alice approved doc-2 | Allow | skip `event approved: the check names no resource id` |
| no resource | hasActed approved at scope Any | the decoy, then alice approved doc-1 | Allow | skip `event approved: the check names no resource id` |
| no resource | hasActed approved at scope Any | the decoy, then alice approved doc-2 | Allow | skip `event approved: the check names no resource id` |

### What holds these tests

`76-agreement-check.mjs` holds the three agreement files (the shared helper and the two agreement tests) frozen to commit
`22d5b10c`, and holds `SignatureHistory.test.ts`, `DecisionHistory.test.ts` and `Remedies.test.ts` append-only from it. The
one declared substitution reads `NO_CUSTOM_PREDICATE_FIELD.reason` as the custom-predicate sentence literal it replaces in
`Remedies.test.ts`: an import-and-expression edit that changes no row's expected value, which the rule on the existing
remedy rows allows. The sentence's one literal among the tests then lives in `SimulationFields.test.ts`, asserted against
`NO_CUSTOM_PREDICATE_FIELD`. The red rows above turn green in the plans that change the fixtures and the remedy table,
without a row being touched.

Two readings the rows fix, for the plans that change the source. The site-subject refusal rows give core an empty fixture
(`{ answers: [] }`), not the port's default: the default port never reads the request, so no change to the fixture could
make core fail there, and the plan's description of the base (the error refusing the symbol subject id) is that of an
empty fixture. The product rows pass the list as it is, so a form with no history or signatures field reaches core as
the port's default, which answers the same as an empty fixture on every product case.

## Each signature rule gutted once

Each gut is one scratch edit to the working tree, run through exactly the commands named, recorded here from the JSON report (or the gate's own log) and reverted with `git checkout -- <file>`. None is committed and none is left in the tree. Every refusal gut expects a typed failure or a skip, never a throw (ADR-QD-189 decision 4).

### lookup-unshared

Scratch edit (`packages/core/src/SignatureHistory.ts`): in `signatureAnswerFromSignatures`, a query that names no resource answers `signatureAnswerOf` over `signatures.filter((row) => row.subjectId === query.subjectId)`, an unshared copy with the pair scoping dropped, in place of the lookup. The judgement and the layer then no longer read one lookup.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project core packages/core/test/SignatureHistory.test.ts --reporter=json --outputFile=<scratch>/gut-lookup-unshared-core.json < /dev/null
```

Result: 18 passed, 3 failed of 21.

Failed (every failing test in the report):

  - `SignatureHistory.test.ts`: answers as askSignature over the fixture layer does, on every case of the product
  - `SignatureHistory.test.ts`: a refused fixture row fails as the read does, with the refusal and never matched: false
  - `SignatureHistory.test.ts`: a refused query key fails as the read does, with no subject id and never matched: false

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedySignatureConformance.test.ts --reporter=json --outputFile=<scratch>/gut-lookup-unshared-dev.json < /dev/null
```

Result: 1 passed, 6 failed of 7.

Failed (every failing test in the report):

  - `RemedySignatureConformance.test.ts`: at a site whose resource id is doc-1
  - `RemedySignatureConformance.test.ts`: at a site whose resource has no id
  - `RemedySignatureConformance.test.ts`: at a site whose resource id is not a string
  - `RemedySignatureConformance.test.ts`: at a site with no resource
  - `RemedySignatureConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedySignatureConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

### lookup-shared-scoping

Scratch edit (`packages/core/src/SignatureHistory.ts`): in `signatureLookup`, after the query's own key is computed (its refusal kept), a query that names no resource answers every grouped row whose `signerId` is the query's subject in place of its pair's group.

**This corrects D-11's first predicted outcome.** D-11 predicted that dropping the subject-global scoping in the shared lookup would fail the core conformance test and the devtools agreement. It cannot: the layer (`signatureHistoryFromSignatures`) and the judgement (`signatureAnswerFromSignatures`) read the one `signatureLookup`, so a change to it moves both sides together and the conformance and agreement tests, which compare the two, stay green. That is the property the phase builds, not a gap in the tests. What the gut does fail is the fixture's own scoping tests (the subject-global row and the colliding-pair row), which pin the lookup's answer directly. `lookup-unshared` above realises D-11's intent: a judgement that drifts from the read fails both the conformance test and the agreement.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project core packages/core/test/SignatureHistory.test.ts --reporter=json --outputFile=<scratch>/gut-lookup-shared-scoping-core.json < /dev/null
```

Result: 19 passed, 2 failed of 21.

Failed (every failing test in the report):

  - `SignatureHistory.test.ts`: a subject-global query sees only rows stored with no resourceId
  - `SignatureHistory.test.ts`: each colliding-looking pair answers only its own row

Required green (each read from the report as passed):

  - `SignatureHistory.test.ts`: fails as SignatureHistoryUnavailable with no subject id and the refusal as its cause, never dying
  - `SignatureHistory.test.ts`: answers as askSignature over the fixture layer does, on every case of the product
  - `SignatureHistory.test.ts`: a refused fixture row fails as the read does, with the refusal and never matched: false
  - `SignatureHistory.test.ts`: at a Resource site with no id, the missing id is answered before any row is read
  - `SignatureHistory.test.ts`: a refused query key fails as the read does, with no subject id and never matched: false

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedySignatureConformance.test.ts --reporter=json --outputFile=<scratch>/gut-lookup-shared-scoping-dev.json < /dev/null
```

Result: 7 passed, 0 failed of 7.

Failed (every failing test in the report):

  - none

Required green (each read from the report as passed):

  - `RemedySignatureConformance.test.ts`: at a site whose resource id is doc-1
  - `RemedySignatureConformance.test.ts`: at a site whose resource has no id
  - `RemedySignatureConformance.test.ts`: at a site whose resource id is not a string
  - `RemedySignatureConformance.test.ts`: at a site with no resource
  - `RemedySignatureConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedySignatureConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

### missing-id-skipped

Scratch edit (`packages/core/src/SignatureHistory.ts`): the judgement's missing-id check (`if (isResourceScoped(leaf) && query.resourceId === undefined) return Result.fail(new MissingResourceId(…))`) deleted.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project core packages/core/test/SignatureHistory.test.ts --reporter=json --outputFile=<scratch>/gut-missing-id-skipped-core.json < /dev/null
```

Result: 19 passed, 2 failed of 21.

Failed (every failing test in the report):

  - `SignatureHistory.test.ts`: answers as askSignature over the fixture layer does, on every case of the product
  - `SignatureHistory.test.ts`: at a Resource site with no id, the missing id is answered before any row is read

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedySignatureConformance.test.ts --reporter=json --outputFile=<scratch>/gut-missing-id-skipped-dev.json < /dev/null
```

Result: 4 passed, 3 failed of 7.

Failed (every failing test in the report):

  - `RemedySignatureConformance.test.ts`: at a site whose resource has no id
  - `RemedySignatureConformance.test.ts`: at a site whose resource id is not a string
  - `RemedySignatureConformance.test.ts`: at a site with no resource

Required green (each read from the report as passed):

  - `RemedySignatureConformance.test.ts`: at a site whose resource id is doc-1

### signature-refusal-as-unmet

Scratch edit (`packages/core/src/SignatureHistory.ts`): the judgement's refusal branch answers `Result.succeed({ matched: false, onFile: 0 })` in place of the port's failure; the layer's mapping is untouched. A refusal then reads as an unmet requirement, which denies `hasSignature` and grants `not(hasSignature(…))` (INV-QD-007).

Command (repository root, stdin closed):

```
pnpm exec vitest run --project core packages/core/test/SignatureHistory.test.ts --reporter=json --outputFile=<scratch>/gut-signature-refusal-as-unmet-core.json < /dev/null
```

Result: 19 passed, 2 failed of 21.

Failed (every failing test in the report):

  - `SignatureHistory.test.ts`: a refused fixture row fails as the read does, with the refusal and never matched: false
  - `SignatureHistory.test.ts`: a refused query key fails as the read does, with no subject id and never matched: false

Required green (each read from the report as passed):

  - `SignatureHistory.test.ts`: fails as SignatureHistoryUnavailable with no subject id and the refusal as its cause, never dying

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedySignatureConformance.test.ts --reporter=json --outputFile=<scratch>/gut-signature-refusal-as-unmet-dev.json < /dev/null
```

Result: 5 passed, 2 failed of 7.

Failed (every failing test in the report):

  - `RemedySignatureConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedySignatureConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

Required green (each read from the report as passed):

  - `RemedySignatureConformance.test.ts`: at a site whose resource id is doc-1
  - `RemedySignatureConformance.test.ts`: at a site whose resource has no id
  - `RemedySignatureConformance.test.ts`: at a site whose resource id is not a string
  - `RemedySignatureConformance.test.ts`: at a site with no resource

### signature-member-unchecked

Scratch edit (`packages/core/src/SignatureHistory.ts`): `signatureHistoryPort.failure` sets `subjectId: query.subjectId` without its `isSubjectId` test, so a symbol subject id reaches the error's schema and the failure dies with `Schema validation failed` instead of failing typed.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project core packages/core/test/SignatureHistory.test.ts --reporter=json --outputFile=<scratch>/gut-signature-member-unchecked-core.json < /dev/null
```

Result: 19 passed, 2 failed of 21.

Failed (every failing test in the report):

  - `SignatureHistory.test.ts`: fails as SignatureHistoryUnavailable with no subject id and the refusal as its cause, never dying
  - `SignatureHistory.test.ts`: a refused query key fails as the read does, with no subject id and never matched: false

Required green (each read from the report as passed):

  - `SignatureHistory.test.ts`: answers as askSignature over the fixture layer does, on every case of the product
  - `SignatureHistory.test.ts`: a refused fixture row fails as the read does, with the refusal and never matched: false
  - `SignatureHistory.test.ts`: at a Resource site with no id, the missing id is answered before any row is read

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedySignatureConformance.test.ts --reporter=json --outputFile=<scratch>/gut-signature-member-unchecked-dev.json < /dev/null
```

Result: 6 passed, 1 failed of 7.

Failed (every failing test in the report):

  - `RemedySignatureConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

Required green (each read from the report as passed):

  - `RemedySignatureConformance.test.ts`: at a site whose resource id is doc-1
  - `RemedySignatureConformance.test.ts`: at a site whose resource has no id
  - `RemedySignatureConformance.test.ts`: at a site whose resource id is not a string
  - `RemedySignatureConformance.test.ts`: at a site with no resource
  - `RemedySignatureConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read

### signature-failures-widened

Scratch edit (`packages/core/src/SignatureHistory.ts`): the judgement's declared error union gains `AttributeResolveError` (a `type` import from `./Errors.ts`).

Commands (stdin closed, status and log in the scratch folder):

```
pnpm test:tstyche < /dev/null > <scratch>/gut-signature-failures-widened.tstyche.log 2>&1; echo $? > <scratch>/gut-signature-failures-widened.tstyche.status
pnpm typecheck < /dev/null > <scratch>/gut-signature-failures-widened.typecheck.log 2>&1; echo $? > <scratch>/gut-signature-failures-widened.typecheck.status
```

`pnpm test:tstyche` exited 1; its summary read `Tests: 1 failed, 399 passed, 2 skipped` and the one failure is `packages/core/test/SignatureHistory.tst.ts:24:5`, `signatureAnswerFromSignatures answers a SignatureAnswer or exactly its two failures` (the pin PS). `pnpm typecheck` exited 2; the log's first error is `packages/devtools/src/model/Remedies.ts(585,80): error TS2379: Argument of type 'AttributeResolveError | MissingResourceId | SignatureHistoryUnavailable' is not assignable to parameter of type 'DecisionHistoryUnavailable | MissingResourceId | SignatureHistoryUnavailable'`, because `skipReason` takes only the three failures. A widened failure union is a compile error in the consumer and a failed type pin.

### http-signature-member-projected

Scratch edit (`packages/http/src/QadiHttpError.ts`): the `SignatureHistoryUnavailable` projection carries `subjectId: error.subjectId` in place of its conditional spread.

**Found while running this gut (a test that was too weak, fixed first).** With the two history rows as 76-03 and 76-04 wrote them, this gut passed all 54 tests: they compared the projection and the encoded body with `toEqual`, which reads a member stated `undefined` as absent, so an unconditional `subjectId: undefined` equalled the bare object. Each of the two rows (HP1 and HP2) gained two assertions that the key is absent (`"subjectId" in …` and `"event" in …` are false), added lines only, committed alone as `e73b71a3` `test(76-06)` before the gut was run on the strengthened rows. The run below is on that head.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project http packages/http/test/QadiHttpError.test.ts --reporter=json --outputFile=<scratch>/gut-http-signature-member-projected-http.json < /dev/null
```

Result: 53 passed, 1 failed of 54.

Failed (every failing test in the report):

  - `QadiHttpError.test.ts`: the SignatureHistoryUnavailable projection and response body carry no subject id when the error has none

Required green (each read from the report as passed):

  - `QadiHttpError.test.ts`: SignatureHistoryUnavailable's projection carries resourceId only when the error had one
  - `QadiHttpError.test.ts`: the DecisionHistoryUnavailable projection and response body carry no event when the error has none


## Each acted, remedy and record rule gutted once

Same procedure as above: one scratch edit, the named commands, the result read from the report, then `git checkout -- <file>`. No gut is committed or left in the tree, and no gut expects a throw: the history refusal guts fail the rows that pin a typed failure, and the remedy refusal gut fails the rows that pin the skip's text.

### acted-lookup-unshared

Scratch edit (`packages/core/src/DecisionHistory.ts`): in `actedAnswerFromEvents`, answer `events.some((row) => row.subjectId === query.subjectId && row.event === query.event && row.resourceId === query.resourceId) ? "Acted" : "NotActed"` in place of the lookup (the missing-id check is kept; the refusal is gone with the shared lookup).

Command (repository root, stdin closed):

```
pnpm exec vitest run --project core packages/core/test/DecisionHistory.test.ts --reporter=json --outputFile=<scratch>/gut-acted-lookup-unshared-core.json < /dev/null
```

Result: 10 passed, 3 failed of 13.

Failed (every failing test in the report):

  - `DecisionHistory.test.ts`: answers as askActed over the fixture layer does, on every case of the product
  - `DecisionHistory.test.ts`: a refused subject or event row fails as the read does, with the refusal and never NotActed
  - `DecisionHistory.test.ts`: a refused event fails as the read does, with no event and never NotActed

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedyActedConformance.test.ts --reporter=json --outputFile=<scratch>/gut-acted-lookup-unshared-dev.json < /dev/null
```

Result: 1 passed, 6 failed of 7.

Failed (every failing test in the report):

  - `RemedyActedConformance.test.ts`: at a site whose resource id is doc-1
  - `RemedyActedConformance.test.ts`: at a site whose resource has no id
  - `RemedyActedConformance.test.ts`: at a site whose resource id is not a string
  - `RemedyActedConformance.test.ts`: at a site with no resource
  - `RemedyActedConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedyActedConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

### acted-any-as-resource

Scratch edit (`packages/core/src/DecisionHistory.ts`): `actedAnswerFromEvents` asks `decisionHistoryPort.asks.HasActed({ ...leaf, scope: "Resource" }, site)` in place of the leaf's own request, the missing-id check unchanged. An `Any` leaf at a site with a resource id then asks about that one resource.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project core packages/core/test/DecisionHistory.test.ts --reporter=json --outputFile=<scratch>/gut-acted-any-as-resource-core.json < /dev/null
```

Result: 12 passed, 1 failed of 13.

Failed (every failing test in the report):

  - `DecisionHistory.test.ts`: answers as askActed over the fixture layer does, on every case of the product

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedyActedConformance.test.ts --reporter=json --outputFile=<scratch>/gut-acted-any-as-resource-dev.json < /dev/null
```

Result: 6 passed, 1 failed of 7.

Failed (every failing test in the report):

  - `RemedyActedConformance.test.ts`: at a site whose resource id is doc-1

Required green (each read from the report as passed):

  - `RemedyActedConformance.test.ts`: at a site whose resource has no id
  - `RemedyActedConformance.test.ts`: at a site whose resource id is not a string
  - `RemedyActedConformance.test.ts`: at a site with no resource
  - `RemedyActedConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedyActedConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

### acted-unknown-added

Scratch edit (`packages/core/src/DecisionHistory.ts`): the judgement's declared answer is `ActedResult` (which adds `"Unknown"`) in place of `"Acted" | "NotActed"`.

Command (stdin closed, status and log in the scratch folder):

```
pnpm test:tstyche < /dev/null > <scratch>/gut-acted-unknown-added.tstyche.log 2>&1; echo $? > <scratch>/gut-acted-unknown-added.tstyche.status
```

Exit status 1. Both tstyche passes (the rule-off pass and the rule-on pass) printed `Tests: 1 failed` (400 passed, 1 skipped; 399 passed, 2 skipped), and the log names the pin: `actedAnswerFromEvents answers Acted or NotActed, or fails as the history read fails` (PA), in `packages/core/test/DecisionHistory.tst.ts`.

### history-member-unchecked

Scratch edit (`packages/core/src/DecisionHistory.ts`): `decisionHistoryPort.failure` sets `event: query.event` without its `isEvent` test, so a symbol event reaches the error's schema.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project core packages/core/test/DecisionHistory.test.ts --reporter=json --outputFile=<scratch>/gut-history-member-unchecked-core.json < /dev/null
```

Result: 11 passed, 2 failed of 13.

Failed (every failing test in the report):

  - `DecisionHistory.test.ts`: an event that is a symbol fails with no event and the refusal as its cause, never answering NotActed
  - `DecisionHistory.test.ts`: a refused event fails as the read does, with no event and never NotActed

Required green (each read from the report as passed):

  - `DecisionHistory.test.ts`: a subject whose id is a symbol fails as DecisionHistoryUnavailable, never answering NotActed
  - `DecisionHistory.test.ts`: a fixture row whose subject id is a symbol fails every read, never answering NotActed
  - `DecisionHistory.test.ts`: a fixture row whose event cannot be read fails every read, never throwing
  - `DecisionHistory.test.ts`: answers as askActed over the fixture layer does, on every case of the product
  - `DecisionHistory.test.ts`: a refused subject or event row fails as the read does, with the refusal and never NotActed

### history-refusal-as-unacted

Scratch edit (`packages/core/src/DecisionHistory.ts`): `actedLookup` answers `Result.succeed("NotActed")` wherever it would fail with a refusal, an entry's or the query's. A refusal then reads as "never acted", which `hasNotActed` grants.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project core packages/core/test/DecisionHistory.test.ts --reporter=json --outputFile=<scratch>/gut-history-refusal-as-unacted-core.json < /dev/null
```

Result: 7 passed, 6 failed of 13.

Failed (every failing test in the report):

  - `DecisionHistory.test.ts`: a subject whose id is a symbol fails as DecisionHistoryUnavailable, never answering NotActed
  - `DecisionHistory.test.ts`: an event that is a symbol fails with no event and the refusal as its cause, never answering NotActed
  - `DecisionHistory.test.ts`: a fixture row whose subject id is a symbol fails every read, never answering NotActed
  - `DecisionHistory.test.ts`: a fixture row whose event cannot be read fails every read, never throwing
  - `DecisionHistory.test.ts`: a refused subject or event row fails as the read does, with the refusal and never NotActed
  - `DecisionHistory.test.ts`: a refused event fails as the read does, with no event and never NotActed

Required green (each read from the report as passed):

  - `DecisionHistory.test.ts`: answers as askActed over the fixture layer does, on every case of the product

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedyActedConformance.test.ts --reporter=json --outputFile=<scratch>/gut-history-refusal-as-unacted-dev.json < /dev/null
```

Result: 5 passed, 2 failed of 7.

Failed (every failing test in the report):

  - `RemedyActedConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedyActedConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

Required green (each read from the report as passed):

  - `RemedyActedConformance.test.ts`: at a site whose resource id is doc-1
  - `RemedyActedConformance.test.ts`: at a site whose resource has no id
  - `RemedyActedConformance.test.ts`: at a site whose resource id is not a string
  - `RemedyActedConformance.test.ts`: at a site with no resource

### http-history-member-projected

Scratch edit (`packages/http/src/QadiHttpError.ts`): the `DecisionHistoryUnavailable` projection carries `event: error.event` in place of its conditional spread. This runs on the strengthened HP2 row (`e73b71a3`, see `### http-signature-member-projected`).

Command (repository root, stdin closed):

```
pnpm exec vitest run --project http packages/http/test/QadiHttpError.test.ts --reporter=json --outputFile=<scratch>/gut-http-history-member-projected-http.json < /dev/null
```

Result: 53 passed, 1 failed of 54.

Failed (every failing test in the report):

  - `QadiHttpError.test.ts`: the DecisionHistoryUnavailable projection and response body carry no event when the error has none

Required green (each read from the report as passed):

  - `QadiHttpError.test.ts`: the SignatureHistoryUnavailable projection and response body carry no subject id when the error has none

### remedy-missing-id-met

Scratch edit (`packages/devtools/src/model/Remedies.ts`): the `Signature` arm's failure branch answers `undefined` (met) for `MissingResourceId`, so a check that names no resource id is read as satisfied. Both files in one invocation.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedySignatureConformance.test.ts packages/devtools/test/model/Remedies.test.ts --reporter=json --outputFile=<scratch>/gut-remedy-missing-id-met-dev.json < /dev/null
```

Result: 82 passed, 4 failed of 86.

Failed (every failing test in the report):

  - `Remedies.test.ts`: declines a resource-scoped signature when the check names no resource id
  - `RemedySignatureConformance.test.ts`: at a site whose resource has no id
  - `RemedySignatureConformance.test.ts`: at a site whose resource id is not a string
  - `RemedySignatureConformance.test.ts`: at a site with no resource

Required green (each read from the report as passed):

  - `RemedySignatureConformance.test.ts`: at a site whose resource id is doc-1
  - `RemedySignatureConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedySignatureConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

### remedy-row-from-site

Scratch edit (`packages/devtools/src/model/Remedies.ts`): the signature row's resource id is `resourceIdOf(input.resource)` in place of the request's, so an `Any` check at a site with a resource id offers a row scoped to it. Both files in one invocation.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedySignatureConformance.test.ts packages/devtools/test/model/Remedies.test.ts --reporter=json --outputFile=<scratch>/gut-remedy-row-from-site-dev.json < /dev/null
```

Result: 82 passed, 4 failed of 86.

Failed (every failing test in the report):

  - `Remedies.test.ts`: offers the signature the policy names, built from its node
  - `Remedies.test.ts`: applies a signature remedy as the row the port answers from
  - `Remedies.test.ts`: offers a signature when the fixtures hold a different one
  - `RemedySignatureConformance.test.ts`: at a site whose resource id is doc-1

Required green (each read from the report as passed):

  - `RemedySignatureConformance.test.ts`: at a site whose resource has no id
  - `RemedySignatureConformance.test.ts`: at a site whose resource id is not a string
  - `RemedySignatureConformance.test.ts`: at a site with no resource
  - `RemedySignatureConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedySignatureConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

### remedy-refusal-text-dropped

Scratch edit (`packages/devtools/src/model/Remedies.ts`): `skipReason`'s `SignatureHistoryUnavailable` arm answers `SIGNATURE_PORT_REFUSED` alone, without the cause's `thrownMessage`.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedySignatureConformance.test.ts --reporter=json --outputFile=<scratch>/gut-remedy-refusal-text-dropped-dev.json < /dev/null
```

Result: 5 passed, 2 failed of 7.

Failed (every failing test in the report):

  - `RemedySignatureConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedySignatureConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

Required green (each read from the report as passed):

  - `RemedySignatureConformance.test.ts`: at a site whose resource id is doc-1
  - `RemedySignatureConformance.test.ts`: at a site whose resource has no id
  - `RemedySignatureConformance.test.ts`: at a site whose resource id is not a string
  - `RemedySignatureConformance.test.ts`: at a site with no resource

### remedy-acted-triple

Scratch edit (`packages/devtools/src/model/Remedies.ts`): the `Acted` arm's body is the exact-triple check the code before ADR-QD-189 used: a missing id skips; `fieldOps("history").holds` on `{ subjectId, event, resourceId }` is met; otherwise the grant.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/RemedyActedConformance.test.ts --reporter=json --outputFile=<scratch>/gut-remedy-acted-triple-dev.json < /dev/null
```

Result: 1 passed, 6 failed of 7.

Failed (every failing test in the report):

  - `RemedyActedConformance.test.ts`: at a site whose resource id is doc-1
  - `RemedyActedConformance.test.ts`: at a site whose resource has no id
  - `RemedyActedConformance.test.ts`: at a site whose resource id is not a string
  - `RemedyActedConformance.test.ts`: at a site with no resource
  - `RemedyActedConformance.test.ts`: a fixture row it cannot key is skipped with its refusal and offered no row, while core fails the read
  - `RemedyActedConformance.test.ts`: a site whose subject id it cannot key is skipped with its refusal and offered no row, while core fails the read

Required green (each read from the report as passed):

  - `RemedyActedConformance.test.ts`: the product holds 144 cases over four sites, two leaves and 18 lists

The mismatches the report prints, per site row (distinct `<leaf> | <list> |` lines, counted from the failure messages), 14 in all:

  - at a site whose resource id is doc-1: 2 mismatches, all at `Any` scope
    - `hasActed approved at scope Any | alice approved doc-2 |`
    - `hasActed approved at scope Any | the decoy, then alice approved doc-2 |`
  - at a site whose resource has no id: 4 mismatches, all at `Any` scope
    - `hasActed approved at scope Any | alice approved doc-1 |`
    - `hasActed approved at scope Any | alice approved doc-2 |`
    - `hasActed approved at scope Any | the decoy, then alice approved doc-1 |`
    - `hasActed approved at scope Any | the decoy, then alice approved doc-2 |`
  - at a site whose resource id is not a string: 4 mismatches, all at `Any` scope
    - `hasActed approved at scope Any | alice approved doc-1 |`
    - `hasActed approved at scope Any | alice approved doc-2 |`
    - `hasActed approved at scope Any | the decoy, then alice approved doc-1 |`
    - `hasActed approved at scope Any | the decoy, then alice approved doc-2 |`
  - at a site with no resource: 4 mismatches, all at `Any` scope
    - `hasActed approved at scope Any | alice approved doc-1 |`
    - `hasActed approved at scope Any | alice approved doc-2 |`
    - `hasActed approved at scope Any | the decoy, then alice approved doc-1 |`
    - `hasActed approved at scope Any | the decoy, then alice approved doc-2 |`

These are the 14 of "### The acted divergences" above, row for row: 2 at the site whose resource id is doc-1 and 4 at each of the three sites with no usable resource id, every one at `Any` scope. The two refusal rows fail as well (the exact-triple check never reads core's refusal).

### custom-cell-copied

Scratch edit (`packages/devtools/src/model/SimulationFields.ts`): `FIXTURE_DATA.CustomPredicate` is a fresh object literal with the same `_tag` and the same sentence. The sentence is then written twice and the value is no longer the one the remedy table reads.

Command (repository root, stdin closed):

```
pnpm exec vitest run --project devtools packages/devtools/test/model/SimulationFields.test.ts --reporter=json --outputFile=<scratch>/gut-custom-cell-copied-dev.json < /dev/null
```

Result: 83 passed, 1 failed of 84.

Failed (every failing test in the report):

  - `SimulationFields.test.ts`: the custom-predicate cell is the value whose reason the remedy table gives

Required green (each read from the report as passed):

  - `SimulationFields.test.ts`: says why a custom predicate has no cell

### overview-row-deleted

Scratch edit (`spec/overview.md`): the `signatureAnswerFromSignatures` row of the public API tables deleted.

Command (stdin closed):

```
node scripts/check-api-surface.mjs < /dev/null > <scratch>/gut-overview-row-deleted.api.log 2>&1; echo $? > <scratch>/gut-overview-row-deleted.api.status
```

Exit status 1. The failing line: `packages/core/src/SignatureHistory.ts  [missing] \`signatureAnswerFromSignatures\` is exported by @qadi/core and is not named in spec/overview.md's Public API surface section. Add it to a table, or to "Not listed above" with a reason.`


## The mutation close of the remedy and fixture files

The three groups are measured on one head, `7fe825414c699d9f2e52c52d58ca20d7750dfbec` (`<scratch>/stryker-close-{core,devtools,http}.log`), each by the invocation of `76-mutation-base.json`, and `record close <group>` wrote them into `76-mutation-close.json`. The first close was measured on `0bdfe042`; it showed two new survivors in `QadiHttpError.ts` (below), a `test(76-06)` commit (`7fe82541`) killed them, and every group was re-measured with `record close core --restart` on the new head, so the close and the tree share one head. No file under `packages/` changes after it.

| Group / file | Base (`phase_base`) | Close | Survived | Ignored |
| ------------ | ------------------- | ----- | -------- | ------- |
| core `SignatureHistory.ts` | 71/72 | 87/88 | 1 (the base survivor, line 362 now) | 36 to 36 |
| core `SignatureMatch.ts` | 13/13 | 14/14 | 0 | 1 to 2 (1 admitted by EXAMINED) |
| core `PortAccess.ts` | 47/47 | 46/46 | 0 | 17 to 17 |
| core `DecisionHistory.ts` | 32/32 | 52/52 | 0 | 41 to 41 |
| core `Errors.ts` | 1/1 | 1/1 | 0 | 35 to 35 |
| **core group** | 164/165 | 200/201 | 1 | |
| devtools `Remedies.ts` | 297/297 | 277/277 | 0 | 48 to 54 (6 admitted by EXAMINED) |
| devtools `SimulationFields.ts` | 190/190 | 190/190 | 0 | 108 to 108 |
| **devtools group** | 487/487 | 467/467 | 0 | |
| http `QadiHttpError.ts` | 26/26 | 34/34 | 0 | 45 to 45 |

`node 76-mutation.mjs compare` prints `no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants`. No file's score fell (cross-multiplied: `277 * 297 = 297 * 277`), so `compare` logs no "killed mutants removed" line; the only change in a valid count that lowers it is `Remedies.ts` (297 to 277) and `PortAccess.ts` (47 to 46), both with every remaining valid mutant killed.

### The first close and the survivors it showed

The first close, on `0bdfe042`, held `QadiHttpError.ts` at 32/34 with two new survivors on line 283, the conditional spread of `DecisionHistoryUnavailable`'s `event` (`ConditionalExpression -> true` and `ObjectLiteral -> {}`): no row projected an error that carries an event. The row `DecisionHistoryUnavailable's projection and response body carry the event when the error had one` was added to `QadiHttpError.test.ts` (`test(76-06)`, `7fe82541`, added lines only, building the error through `decisionHistoryPort.failure` so the `PORT_DOUBLE_BUDGET` stays at 12). The re-measured close reads 34/34.

### The base survivor

The base survivor `SignatureHistory.ts:366` `ConditionalExpression -> false` is still the file's one survivor, now at line 362 (`compare` carries it through `git diff -U0`). It is **equivalent**, so no test can kill it and it is explained rather than gone: `input.resourceId === undefined ? undefined : makeResourceId(input.resourceId)` guards only the type, because `makeResourceId` is `Brand.nominal<ResourceId>()`, the identity at run time, so forcing the condition false calls `makeResourceId(undefined)`, which returns `undefined`, the very value the true branch gives. The line is not one the phase wrote (it is not among the written ranges of the file below, and its text is the base's).

## Static mutants run by hand

Each group's config spread with `ignoreStatic: false`, with its `jsonReporter` and `htmlReporter` redirected to the scratch folder (`<scratch>/stryker.examined-<group>.mjs`), run from the repository root with stdin closed, on the close head, over every file of the group (not only those whose Ignored count grew):

```
pnpm exec stryker run <scratch>/stryker.examined-core.mjs --mutate packages/core/src/SignatureHistory.ts,packages/core/src/SignatureMatch.ts,packages/core/src/PortAccess.ts,packages/core/src/DecisionHistory.ts,packages/core/src/Errors.ts < /dev/null > <scratch>/stryker-examined-core.log 2>&1
pnpm exec stryker run <scratch>/stryker.examined-devtools.mjs --mutate packages/devtools/src/model/Remedies.ts,packages/devtools/src/model/SimulationFields.ts < /dev/null > <scratch>/stryker-examined-devtools.log 2>&1
pnpm exec stryker run <scratch>/stryker.examined-http.mjs --mutate packages/http/src/QadiHttpError.ts < /dev/null > <scratch>/stryker-examined-http.log 2>&1
```

Final scores by hand: core 98.15, devtools 100.00, http 100.00. A file's written lines are the `+` lines of `git diff -U0 <phase_base> <close head> -- <file>`. Every mutant on a written line, static ones included, is Killed (no Timeout, no RuntimeError, nothing else). The by-hand runs held 15 mutants that were not Killed or Timeout, none on a written line; all but the carried 362 are static, and each is of a kind the base already held: `DecisionHistory.ts` 63, 100 and 112 (`StringLiteral -> ""`, Survived), 172, 199, 211 (`ObjectLiteral -> {}`, RuntimeError) and 231 (`ArrowFunction -> () => undefined`, RuntimeError); `SignatureHistory.ts` 94 and 135 (`StringLiteral -> ""`, Survived), 238 and 260 (`ObjectLiteral -> {}`, RuntimeError), 287 (`ArrowFunction -> () => undefined`, RuntimeError) and the carried 362 (above); `QadiHttpError.ts` 177 (`BlockStatement -> {}`) and 251 (`ObjectLiteral -> {}`), both RuntimeError. None is new; the base record holds the same kinds as Ignored.

`EXAMINED` in `76-mutation.mjs` admits exactly the seven Ignored mutants the close holds beyond its base, and the by-hand run Killed each on its own line: `SignatureMatch.ts:39` (`ArrowFunction -> () => undefined`); `Remedies.ts:439` (`StringLiteral -> ""`), `489` (`ObjectLiteral -> {}`), and `559`, `580`, `608`, `620` (`ArrowFunction -> () => undefined`). Each admitted count is no more than the by-hand kills of its kind on that file's written lines. The self-test still reads `self-test: 38 passed`.

### Written lines and mutants, per file

#### `packages/core/src/SignatureHistory.ts` (core)

Whole file by hand: Killed 118, Survived 3, RuntimeError 3.
Written-line ranges (`+` lines of `git diff -U0 bf339146 7fe82541`): 33, 45, 54, 56, 206-208, 288-289, 292-293, 338-339, 341-344, 352, 354, 388-418, 425-461.
Mutants on a written line: 25 (Killed 25).

| file:line | mutator | replacement | status |
| --- | --- | --- | --- |
| `SignatureHistory.ts:292` | ObjectLiteral | `{}` | Killed |
| `SignatureHistory.ts:293` | ObjectLiteral | `{}` | Killed |
| `SignatureHistory.ts:354` | BlockStatement | `{}` | Killed |
| `SignatureHistory.ts:388` | ArrowFunction | `() => undefined` | Killed |
| `SignatureHistory.ts:389` | ArrowFunction | `() => undefined` | Killed |
| `SignatureHistory.ts:390` | ArrowFunction | `() => undefined` | Killed |
| `SignatureHistory.ts:390` | ArrayDeclaration | `[]` | Killed |
| `SignatureHistory.ts:391` | LogicalOperator | `groups.get(key) && []` | Killed |
| `SignatureHistory.ts:391` | ArrayDeclaration | `["Stryker was here"]` | Killed |
| `SignatureHistory.ts:417` | BlockStatement | `{}` | Killed |
| `SignatureHistory.ts:425` | ObjectLiteral | `{}` | Killed |
| `SignatureHistory.ts:427` | ArrowFunction | `() => undefined` | Killed |
| `SignatureHistory.ts:428` | ArrayDeclaration | `[]` | Killed |
| `SignatureHistory.ts:452` | BlockStatement | `{}` | Killed |
| `SignatureHistory.ts:454` | ConditionalExpression | `false` | Killed |
| `SignatureHistory.ts:454` | ConditionalExpression | `true` | Killed |
| `SignatureHistory.ts:454` | LogicalOperator | `isResourceScoped(leaf) \|\| query.resourceId === undefined` | Killed |
| `SignatureHistory.ts:454` | EqualityOperator | `query.resourceId !== undefined` | Killed |
| `SignatureHistory.ts:454` | ConditionalExpression | `true` | Killed |
| `SignatureHistory.ts:454` | BlockStatement | `{}` | Killed |
| `SignatureHistory.ts:455` | ObjectLiteral | `{}` | Killed |
| `SignatureHistory.ts:457` | ObjectLiteral | `{}` | Killed |
| `SignatureHistory.ts:458` | ArrowFunction | `() => undefined` | Killed |
| `SignatureHistory.ts:459` | ArrayDeclaration | `[]` | Killed |
| `SignatureHistory.ts:460` | ArrowFunction | `() => undefined` | Killed |

#### `packages/core/src/SignatureMatch.ts` (core)

Whole file by hand: Killed 16.
Written-line ranges (`+` lines of `git diff -U0 bf339146 7fe82541`): 12-14, 29-46.
Mutants on a written line: 2 (Killed 2).

| file:line | mutator | replacement | status |
| --- | --- | --- | --- |
| `SignatureMatch.ts:39` | ArrowFunction | `() => undefined` | Killed |
| `SignatureMatch.ts:43` | ObjectLiteral | `{}` | Killed |

#### `packages/core/src/PortAccess.ts` (core)

Whole file by hand: Killed 63.
Written-line ranges (`+` lines of `git diff -U0 bf339146 7fe82541`): 67, 472-476, 492-496.
Mutants on a written line: 0 (none).

| file:line | mutator | replacement | status |
| --- | --- | --- | --- |

#### `packages/core/src/DecisionHistory.ts` (core)

Whole file by hand: Killed 86, Survived 3, RuntimeError 4.
Written-line ranges (`+` lines of `git diff -U0 bf339146 7fe82541`): 20, 23, 25-30, 39-40, 49, 179-180, 232-238, 269-277, 279-280, 282-296, 298-304, 312-317, 322, 326-364.
Mutants on a written line: 32 (Killed 32).

| file:line | mutator | replacement | status |
| --- | --- | --- | --- |
| `DecisionHistory.ts:234` | ArrowFunction | `() => undefined` | Killed |
| `DecisionHistory.ts:235` | ObjectLiteral | `{}` | Killed |
| `DecisionHistory.ts:236` | ObjectLiteral | `{}` | Killed |
| `DecisionHistory.ts:284` | BlockStatement | `{}` | Killed |
| `DecisionHistory.ts:287` | BlockStatement | `{}` | Killed |
| `DecisionHistory.ts:288` | ObjectLiteral | `{}` | Killed |
| `DecisionHistory.ts:289` | ArrayDeclaration | `[]` | Killed |
| `DecisionHistory.ts:290` | ArrayDeclaration | `[]` | Killed |
| `DecisionHistory.ts:290` | ObjectLiteral | `{}` | Killed |
| `DecisionHistory.ts:291` | ArrayDeclaration | `[]` | Killed |
| `DecisionHistory.ts:291` | ObjectLiteral | `{}` | Killed |
| `DecisionHistory.ts:295` | ArrowFunction | `() => undefined` | Killed |
| `DecisionHistory.ts:298` | ArrowFunction | `() => undefined` | Killed |
| `DecisionHistory.ts:299` | ArrowFunction | `() => undefined` | Killed |
| `DecisionHistory.ts:300` | ArrayDeclaration | `[]` | Killed |
| `DecisionHistory.ts:300` | ArrowFunction | `() => undefined` | Killed |
| `DecisionHistory.ts:301` | StringLiteral | `""` | Killed |
| `DecisionHistory.ts:301` | StringLiteral | `""` | Killed |
| `DecisionHistory.ts:326` | ObjectLiteral | `{}` | Killed |
| `DecisionHistory.ts:328` | ArrowFunction | `() => undefined` | Killed |
| `DecisionHistory.ts:329` | ArrayDeclaration | `[]` | Killed |
| `DecisionHistory.ts:356` | BlockStatement | `{}` | Killed |
| `DecisionHistory.ts:358` | LogicalOperator | `isResourceScoped(leaf) \|\| query.resourceId === undefined` | Killed |
| `DecisionHistory.ts:358` | ConditionalExpression | `true` | Killed |
| `DecisionHistory.ts:358` | ConditionalExpression | `false` | Killed |
| `DecisionHistory.ts:358` | ConditionalExpression | `true` | Killed |
| `DecisionHistory.ts:358` | EqualityOperator | `query.resourceId !== undefined` | Killed |
| `DecisionHistory.ts:358` | BlockStatement | `{}` | Killed |
| `DecisionHistory.ts:359` | ObjectLiteral | `{}` | Killed |
| `DecisionHistory.ts:361` | ObjectLiteral | `{}` | Killed |
| `DecisionHistory.ts:363` | ArrowFunction | `() => undefined` | Killed |
| `DecisionHistory.ts:364` | ArrayDeclaration | `[]` | Killed |

#### `packages/core/src/Errors.ts` (core)

Whole file by hand: Killed 35, Timeout 1.
Written-line ranges (`+` lines of `git diff -U0 bf339146 7fe82541`): 116-122, 126, 134-137, 142.
Mutants on a written line: 0 (none).

| file:line | mutator | replacement | status |
| --- | --- | --- | --- |

#### `packages/devtools/src/model/Remedies.ts` (devtools)

Whole file by hand: Killed 331.
Written-line ranges (`+` lines of `git diff -U0 bf339146 7fe82541`): 22, 24, 33-35, 39-40, 44, 48-49, 53-54, 83-94, 332-333, 366-368, 378-380, 436-468, 555-558, 560-571, 574-579, 581-605, 608-609.
Mutants on a written line: 63 (Killed 63).

| file:line | mutator | replacement | status |
| --- | --- | --- | --- |
| `Remedies.ts:368` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:368` | ArrayDeclaration | `[]` | Killed |
| `Remedies.ts:368` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:380` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:380` | ArrayDeclaration | `[]` | Killed |
| `Remedies.ts:380` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:437` | StringLiteral | `""` | Killed |
| `Remedies.ts:439` | StringLiteral | `""` | Killed |
| `Remedies.ts:455` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:456` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:457` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:458` | StringLiteral | ```` | Killed |
| `Remedies.ts:459` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:460` | StringLiteral | ```` | Killed |
| `Remedies.ts:465` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:465` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:561` | StringLiteral | `""` | Killed |
| `Remedies.ts:562` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:563` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:563` | StringLiteral | ```` | Killed |
| `Remedies.ts:564` | BlockStatement | `{}` | Killed |
| `Remedies.ts:565` | ConditionalExpression | `false` | Killed |
| `Remedies.ts:565` | ConditionalExpression | `true` | Killed |
| `Remedies.ts:565` | EqualityOperator | `answer !== "Acted"` | Killed |
| `Remedies.ts:565` | StringLiteral | `""` | Killed |
| `Remedies.ts:567` | ConditionalExpression | `true` | Killed |
| `Remedies.ts:567` | EqualityOperator | `resourceId !== undefined` | Killed |
| `Remedies.ts:567` | ConditionalExpression | `false` | Killed |
| `Remedies.ts:567` | StringLiteral | ```` | Killed |
| `Remedies.ts:568` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:569` | StringLiteral | `""` | Killed |
| `Remedies.ts:569` | StringLiteral | ```` | Killed |
| `Remedies.ts:583` | StringLiteral | `""` | Killed |
| `Remedies.ts:584` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:585` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:585` | StringLiteral | ```` | Killed |
| `Remedies.ts:586` | BlockStatement | `{}` | Killed |
| `Remedies.ts:587` | ConditionalExpression | `true` | Killed |
| `Remedies.ts:587` | ConditionalExpression | `false` | Killed |
| `Remedies.ts:590` | ConditionalExpression | `true` | Killed |
| `Remedies.ts:590` | ConditionalExpression | `false` | Killed |
| `Remedies.ts:590` | EqualityOperator | `resourceId !== undefined` | Killed |
| `Remedies.ts:590` | StringLiteral | `"Stryker was here!"` | Killed |
| `Remedies.ts:590` | StringLiteral | ```` | Killed |
| `Remedies.ts:591` | ConditionalExpression | `true` | Killed |
| `Remedies.ts:591` | ConditionalExpression | `false` | Killed |
| `Remedies.ts:591` | EqualityOperator | `signerRole !== undefined` | Killed |
| `Remedies.ts:591` | StringLiteral | `"Stryker was here!"` | Killed |
| `Remedies.ts:591` | StringLiteral | ```` | Killed |
| `Remedies.ts:594` | StringLiteral | `""` | Killed |
| `Remedies.ts:595` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:598` | ConditionalExpression | `true` | Killed |
| `Remedies.ts:598` | ConditionalExpression | `false` | Killed |
| `Remedies.ts:598` | EqualityOperator | `signerRole !== undefined` | Killed |
| `Remedies.ts:598` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:599` | ConditionalExpression | `true` | Killed |
| `Remedies.ts:599` | ConditionalExpression | `false` | Killed |
| `Remedies.ts:599` | EqualityOperator | `resourceId !== undefined` | Killed |
| `Remedies.ts:599` | ObjectLiteral | `{}` | Killed |
| `Remedies.ts:601` | StringLiteral | ```` | Killed |
| `Remedies.ts:608` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:608` | ArrowFunction | `() => undefined` | Killed |
| `Remedies.ts:609` | StringLiteral | ```` | Killed |

#### `packages/devtools/src/model/SimulationFields.ts` (devtools)

Whole file by hand: Killed 298.
Written-line ranges (`+` lines of `git diff -U0 bf339146 7fe82541`): 549-560, 573-574, 578-579, 586.
Mutants on a written line: 3 (Killed 3).

| file:line | mutator | replacement | status |
| --- | --- | --- | --- |
| `SimulationFields.ts:555` | ObjectLiteral | `{}` | Killed |
| `SimulationFields.ts:556` | StringLiteral | `""` | Killed |
| `SimulationFields.ts:558` | StringLiteral | `""` | Killed |

#### `packages/http/src/QadiHttpError.ts` (http)

Whole file by hand: Killed 77, RuntimeError 2.
Written-line ranges (`+` lines of `git diff -U0 bf339146 7fe82541`): 206-214, 278-284, 294, 297-301.
Mutants on a written line: 18 (Killed 18).

| file:line | mutator | replacement | status |
| --- | --- | --- | --- |
| `QadiHttpError.ts:278` | StringLiteral | `""` | Killed |
| `QadiHttpError.ts:278` | ObjectLiteral | `{}` | Killed |
| `QadiHttpError.ts:281` | ArrowFunction | `() => undefined` | Killed |
| `QadiHttpError.ts:281` | ObjectLiteral | `{}` | Killed |
| `QadiHttpError.ts:283` | EqualityOperator | `error.event !== undefined` | Killed |
| `QadiHttpError.ts:283` | ConditionalExpression | `true` | Killed |
| `QadiHttpError.ts:283` | ConditionalExpression | `false` | Killed |
| `QadiHttpError.ts:283` | ObjectLiteral | `{}` | Killed |
| `QadiHttpError.ts:297` | ArrowFunction | `() => undefined` | Killed |
| `QadiHttpError.ts:297` | ObjectLiteral | `{}` | Killed |
| `QadiHttpError.ts:299` | ConditionalExpression | `true` | Killed |
| `QadiHttpError.ts:299` | EqualityOperator | `error.subjectId !== undefined` | Killed |
| `QadiHttpError.ts:299` | ConditionalExpression | `false` | Killed |
| `QadiHttpError.ts:299` | ObjectLiteral | `{}` | Killed |
| `QadiHttpError.ts:300` | ConditionalExpression | `true` | Killed |
| `QadiHttpError.ts:300` | EqualityOperator | `error.resourceId !== undefined` | Killed |
| `QadiHttpError.ts:300` | ConditionalExpression | `false` | Killed |
| `QadiHttpError.ts:300` | ObjectLiteral | `{}` | Killed |

### Deleted code

76-04 deleted lines of `DecisionHistory.ts` the base holds mutants on (the `HashSet` fixture body and the `ActedEvent` and `ActedAnywhere` classes; the deleted `ActedAnywhereInput` is an interface and carries no mutant). `compare` finds each base mutant's close line through `git diff -U0 <base head> <close head>`; a mutant whose line was removed or rewritten has none, so it is no new mutant. What the base record keeps of those lines (it holds each file's counts, open mutants and Ignored mutants; the Killed ones are not retained), per file, from `<scratch>/deleted.out`:

- packages/core/src/SignatureHistory.ts: base valid 72, base lines removed or rewritten 33,45,54,56,287-288,333,335-342,349-354,356,358,398-407; Ignored base mutants on them: 0; open ones: 0
- packages/core/src/SignatureMatch.ts: base valid 13, base lines removed or rewritten 12; Ignored base mutants on them: 0; open ones: 0
- packages/core/src/PortAccess.ts: base valid 47, base lines removed or rewritten 67,472-475,491-494; Ignored base mutants on them: 0; open ones: 0
- packages/core/src/DecisionHistory.ts: base valid 32, base lines removed or rewritten 17,20,24,26,35,44,225,255-260,262-267,269-272,274,276,288-292,296-314; Ignored base mutants on them: 1; open ones: 0
- Ignored DecisionHistory.ts:225 ArrowFunction -> () => undefined
- packages/core/src/Errors.ts: base valid 1, base lines removed or rewritten 116,120,132; Ignored base mutants on them: 0; open ones: 0
- packages/devtools/src/model/Remedies.ts: base valid 297, base lines removed or rewritten 34,44,73-78,316-322,355,365-370,426-427,514-515,517-522,525-530,532-560,563; Ignored base mutants on them: 4; open ones: 0
- packages/devtools/src/model/SimulationFields.ts: base valid 190, base lines removed or rewritten 561-562,566,573-577; Ignored base mutants on them: 3; open ones: 0
- packages/http/src/QadiHttpError.ts: base valid 26, base lines removed or rewritten 206-212,276-277,287,290-293; Ignored base mutants on them: 4; open ones: 0

`DecisionHistory.ts`'s score did not fall (32/32 to 52/52), so the removed-mutant rule is not exercised for it; the one Ignored base mutant on a removed line (225, `ArrowFunction -> () => undefined`) is carried by kind, and its kind is not above the base's count. The files whose valid count went down (`Remedies.ts` 297 to 277, `PortAccess.ts` 47 to 46) lost only Killed mutants with the code that held them, which is the removed-mutant rule; neither score fell.
