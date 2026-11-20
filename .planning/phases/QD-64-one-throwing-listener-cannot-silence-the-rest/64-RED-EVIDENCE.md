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
