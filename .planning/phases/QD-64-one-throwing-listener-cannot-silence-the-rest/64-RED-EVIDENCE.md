# RED evidence on the phase base

## RED on the base

phase_base: 8f3cb792c3a92acefadcd32be0f38b0df8f46641

Both runs are the phase-base source (no `packages/*/src` file changed) with only this plan's tests added. "existing" marks a case that was already in the file.

### ExternalStore.test.ts: 14 tests, 5 failed

| Case | Title | Status | First failure line |
| --- | --- | --- | --- |
| existing | returns the initial value, and the same reference until something changes | passed |  |
| existing | notifies once when set to a different reference | passed |  |
| existing | does not notify when set to the reference it already holds | passed |  |
| existing | publish notifies even when the reference is unchanged | passed |  |
| existing | stops notifying a listener once it unsubscribes, and only that one | passed |  |
| R1 | calls every later listener when an earlier one throws | failed | AssertionError: expected [] to deeply equal [ 'b' ] |
| R2 | rethrows two thrown values as one AggregateError holding both in call order, with the fixed message | failed | AssertionError: expected Error: a failed to be an instance of AggregateError |
| R3 | rethrows a single thrown value itself once every listener ran, undefined and null included | failed | AssertionError: expected [] to deeply equal [ 'second' ] |
| R4 | decides by how many threw, not by what: two undefined throws are an AggregateError of two | failed | AssertionError: expected undefined to be an instance of AggregateError |
| R5 | keeps an AggregateError a listener throws as one value: alone it is rethrown itself, beside another it is one element | failed | AssertionError: expected Error: outer a failed to be an instance of AggregateError |
| C1 | with no throw, calls every listener once in subscription order and throws nothing | passed |  |
| C2 | does not call a listener removed during the notification before its turn | passed |  |
| C3 | calls a listener added during the notification in the same pass | passed |  |
| C4 | holds the new value before any listener runs, and keeps it when one throws | passed |  |

### TimelineFeed, DiagnosticsFeed and GatesFeed: 87 tests, 3 failed

| Case | Title | Status | First failure line |
| --- | --- | --- | --- |
| F30 | F30 a listener that throws does not silence the next one, and configure rethrows what it threw | failed | AssertionError: expected [] to deeply equal [ 'Off' ] |
| G48 | G48 a listener that throws does not silence the next one, and configure rethrows what it threw after taking the registry | failed | AssertionError: expected [] to deeply equal [ 'Read' ] |
| TF25 | TF25 a timeline listener that throws does not silence the next one, and accept rethrows what it threw | failed | AssertionError: expected [] to deeply equal [ [ 'x' ] ] |

The other 84 cases of the three files passed.

## The seam's variants

Each variant is one edit of the committed seam, run against `ExternalStore.test.ts` (14 tests), and fails exactly the store cases named for it; v0 is the unedited control and `ExternalStore.ts` equals HEAD after the run.

| Variant | Edit | Tests | Failed | Result |
| --- | --- | --- | --- | --- |
| v0 | unedited | 14 | 0 | as expected |
| v1 | iterate a snapshot of the set | 14 | 2 | as expected |
| v2 | notify before the value is assigned | 14 | 1 | as expected |
| v3 | decide by the first thrown value's truthiness | 14 | 2 | as expected |
| v4 | flatten a nested AggregateError | 14 | 1 | as expected |
| v5 | count in the message | 14 | 1 | as expected |
| v6 | no early return when nothing threw | 14 | 6 | as expected |
| v7 | swallow what a listener throws | 14 | 6 | as expected |
| v8 | rethrow the first of several | 14 | 3 | as expected |

Failed counts: v1 (C2, C3), v2 (C4), v3 (R3, R4), v4 (R5), v5 (R2), v6 (C1, C2, C3 and the three existing cases that notify with no throw), v7 (R1, R2, R3, R4, R5, C4), v8 (R2, R4, R5).

What each variant breaks:

- v1, iterating a snapshot of the set: live iteration (a listener removed before its turn is still called, one added during the pass is not).
- v2, notifying before the value is assigned: the value is held before any listener runs.
- v3, deciding by the first thrown value's truthiness: the decision is by how many threw, so a falsy thrown value still counts.
- v4, flattening a nested `AggregateError`: a nested `AggregateError` stays one value.
- v5, a count in the message: the message is one fixed literal.
- v6, no early return when nothing threw: nothing is thrown when nothing threw.
- v7, swallowing what a listener throws: nothing a listener throws is swallowed.
- v8, rethrowing the first of several: several thrown values are never reduced to one.

Run: `variants: 9 of 9 as expected`.
