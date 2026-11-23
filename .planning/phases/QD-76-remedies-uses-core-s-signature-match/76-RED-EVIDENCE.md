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

