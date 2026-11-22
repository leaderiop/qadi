# Phase 68 RED and characterisation evidence

Phase base `<B>`: `3d66becb9034fb16ffd97ccd5966b92d972e3b8e`. Every run below is on the unchanged sources
(`git diff --quiet <B> HEAD -- ":(glob)packages/*/src/**"` holds); only the six test files of plan 68-03 differ from the
base. Each plant was applied to the unchanged source, run against the one test it targets, and reversed at once.

## Stage devtools (`TimelineFeed.test.ts`, `DiagnosticsFeed.test.ts`, `ExternalStore.test.ts`)

```text
ok TimelineFeed.test.ts: failing exactly [TF26 TF27 TF29]
ok DiagnosticsFeed.test.ts: failing exactly []
ok ExternalStore.test.ts: failing exactly []
ok plant-tf28.patch fails "TF28 a listener"
ok plant-f31.patch fails "F31 a listener"
ok plant-f32.patch fails "F32 a listener"
ok plant-es.patch fails "never reads what a listener throws"
red-check: devtools passed
```

## Stage core (`Admission.test.ts`, `UntrustedDecode.test.ts`, `packages/react/test/UntrustedSeams.test.ts`)

```text
ok Admission.test.ts: failing exactly [E11 E12 E13]
ok UntrustedDecode.test.ts: failing exactly []
ok UntrustedSeams.test.ts: failing exactly []
ok plant-h.patch fails "H6 two unknown envelope keys"
ok plant-h7.patch fails "H7 an unknown key nested"
ok plant-u30.patch fails "U30 a union"
ok plant-u31.patch fails "U31 an accessor"
red-check: core passed
```

Both stages passed:

red-check: all passed

## The six RED tests: first assertion line of each failure

Copied from the `failureMessages` of the vitest JSON reports of the two RED runs.

| Test | First assertion line | What it says |
| ---- | -------------------- | ------------ |
| TF26 | `AssertionError: expected { started: 1, finalized: +0 } to deeply equal { started: 1, finalized: 1 }` | the throw on the emptied timeline leaves `configure` before the old read is superseded |
| TF27 | `AssertionError: expected { reads: 1 } to deeply equal { reads: 2 }` | the same throw leaves before the same source is read again |
| TF29 | `AssertionError: expected Error: timeline boom to equal Error: status boom` | the timeline listener's throw escapes before any status is published |
| E11 | `AssertionError: expected { _tag: 'Not', policy: { …(2) } } to equal { _tag: 'HasRole', role: 'editor' }` | the policy is read a second time after the depth gate judged the first |
| E12 | `AssertionError: expected 10 to equal 3` | the `maxDepth` the refusal carries is a second read, not the one the gate used |
| E13 | `AssertionError: expected { id: 'u8', roles: Set{}, …(2) } to equal { id: 'u7', roles: Set{}, …(2) }` | the subject admitted is a second read |

## The eight plants

| Plant | Source it changed | Test it failed |
| ----- | ----------------- | -------------- |
| `plant-tf28.patch` | `packages/devtools/src/model/TimelineFeed.ts` (`readSource` starts the read in a `finally` after the `Reading` publish) | TF28 |
| `plant-f31.patch` | `packages/devtools/src/model/DiagnosticsFeed.ts` (publishes `Starting` after the fork) | F31 |
| `plant-f32.patch` | `packages/devtools/src/model/DiagnosticsFeed.ts` (swallows a throw on the `Live` publish) | F32 |
| `plant-es.patch` | `packages/devtools/src/model/ExternalStore.ts` (reads the thrown value with `instanceof`) | the `notify` test, "never reads what a listener throws" |
| `plant-h.patch` | `packages/react/src/HydrationEngine.ts` (the envelope decoder's `unknownKeys` set to `"ignore"`) | H6 |
| `plant-h7.patch` | `packages/core/src/UntrustedDecode.ts` (the strict option set to `onExcessProperty: "ignore"`) | H7 |
| `plant-u30.patch` | `packages/core/src/UntrustedDecode.ts` (the `ignore` projection reads `_tag` once into a copy) | U30 |
| `plant-u31.patch` | `packages/core/src/UntrustedDecode.ts` (the `ignore` projection skips a key that is no longer own) | U31 |

`red-check.sh` reverses each plant on every exit path and fails if a source under `packages/*/src` is left modified; both
runs ended with no source modified.
