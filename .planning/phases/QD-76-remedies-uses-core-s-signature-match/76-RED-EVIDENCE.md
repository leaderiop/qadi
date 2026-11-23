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
