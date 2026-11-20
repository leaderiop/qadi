# Phase 66 RED evidence

phase_base: 48921088b0228724469b6624de91658c650e46c3

## RED on the base

Command, from the repository root, on the tree at `phase_base` plus the two appended test blocks (stdin closed):

`pnpm exec vitest run --project core packages/core/test/UntrustedDecode.test.ts packages/core/test/UntrustedSeams.test.ts --reporter=json --outputFile=<S>/red.json`

It exits 1. Every failure is in the eight cases that pin the defect; the six characterisations pass.

| Case | Base | First failure line |
| --- | --- | --- |
| U22 | failed | `Error: the accessor was read` |
| U23 | failed | `Error: the accessor was read` |
| U24 | failed | `Error: the accessor was read` |
| U25 | failed | `Error: the accessor was read` |
| U26 | passed | characterisation |
| U27 | passed | characterisation |
| U28 | passed | characterisation |
| U29 | passed | characterisation |
| R15 | failed | `AssertionError: expected [Function] to not throw an error but 'Error: the accessor was read' was thrown` |
| R16 | failed | `AssertionError: expected 1 to equal +0` |
| R17 | passed | characterisation |
| S16 | failed | `AssertionError: expected [Function] to not throw an error but 'Error: the accessor was read' was thrown` |
| S17 | failed | `AssertionError: expected [Function] to not throw an error but 'Error: the accessor was read' was thrown` |
| S18 | passed | characterisation |

127 tests, 8 failed

U22 to U25 are thrown out of the decode itself (the undeclared accessor runs inside the projection), R15, S16 and S17 are caught by `assert.doesNotThrow` for the same reason, and R16 reads `addedLater` once where it must be read never.

## Measured reads on the base

Command: `node <S>/reads.mjs` from the repository root. One line per case: the case, `key=reads` for each accessor, then how the decode ended.

```text
ignore, one object	a=1	extra=1	Success
ignore, one object, undeclared _tag	_tag=1	a=1	Success
ignore, one object, declared _tag	_tag=1	a=1	Success
ignore, union	a=1	_tag=1	b=1	Success
ignore, unwalked	id=1	entries=1	raw=1	extra=1	Success
refuse, one object	a=2	Success
refuse, unwalked	id=2	entries=2	raw=2	Success
ignore, one level down	a=2	Success
decodeSinkRecord	_tag=1	version=1	evaluationId=1	at=1	subjectId=1	policy=1	outcome=1	addedLater=1	Success
decodeSinkRecordWithJson	_tag=1	version=1	evaluationId=1	at=1	subjectId=1	policy=1	outcome=1	addedLater=1	Success
decodeStoredRecord	environment=1	record=1	addedLater=1	_tag=1	Success
```

Under `ignore` every own accessor of the input is read once, declared or not: the undeclared `extra`, an undeclared `_tag`, the other union member's `a`, the unwalked slots' `extra`, the sink record's `addedLater` and the stored envelope's `addedLater` and `_tag`. Under `refuse` the guard and the decode each read a declared value (`a=2`, each unwalked slot `=2`), and one level down under `ignore` the guard and the decode read it twice.

## The hydration pin

`packages/react/test/UntrustedSeams.test.ts:203`, the case `H1 a shallow unknown envelope key -> MalformedPayload, nothing seeded`, in the describe at `:202`. It asserts `{ seeded: 0, reasons: ["MalformedPayload"] }` for one shallow unknown envelope key.

Run: `pnpm exec vitest run --project react packages/react/test/UntrustedSeams.test.ts --reporter=json --outputFile=<S>/h1.json`, 25 tests, 0 failed, H1 passed.

`HydrationEngine.ts` states `unknownKeys: "refuse"` (lines 164, 194 and 209) and is not edited, nor is anything under `packages/react`. No hydration test is added.
