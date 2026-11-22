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

## Reads after the change

Command: `node <S>/reads.mjs` from the repository root, with the projection of the `fix(66-02)` commit applied.

```text
ignore, one object	a=1	extra=0	Success
ignore, one object, undeclared _tag	_tag=0	a=1	Success
ignore, one object, declared _tag	_tag=1	a=1	Success
ignore, union	a=0	_tag=2	b=1	Success
ignore, unwalked	id=1	entries=1	raw=1	extra=0	Success
refuse, one object	a=2	Success
refuse, unwalked	id=2	entries=2	raw=2	Success
ignore, one level down	a=2	Success
decodeSinkRecord	_tag=2	version=1	evaluationId=1	at=1	subjectId=1	policy=1	outcome=1	addedLater=0	Success
decodeSinkRecordWithJson	_tag=2	version=1	evaluationId=1	at=1	subjectId=1	policy=1	outcome=1	addedLater=0	Success
decodeStoredRecord	environment=1	record=1	addedLater=0	_tag=0	Success
```

Under `ignore` each declared value is read once and an undeclared one (`extra`, the other union member's `a`, the unwalked slots' `extra`, `addedLater`) never. A union's `_tag` is read twice, once to choose the member and once as a kept value (`ignore, union` and the two sink record decoders). A one-object schema's declared `_tag` is read once, as a kept value, and an undeclared `_tag` never (`ignore, one object, declared _tag` and `undeclared _tag`, and the stored envelope's `_tag=0`). The `refuse` lines and the one-level-down line are unchanged from the base: the guard and the decode still read own values there.

## The projection's variants

Each variant undoes one part of the change in the working tree, runs the two test files and restores the file (`python3 <S>/variants.py <S>`). Each line lists the case ids that failed, of 127.

```text
A the projection reads every own value: R15,R16,S16,S17,U22,U23,U24,U25 of 127
B a one-object schema reads _tag: S16,U23,U29 of 127
C an inherited _tag chooses: U26 of 127
D a non-enumerable own _tag chooses: U26 of 127
```

- A restores `Object.entries(input)` in `project`: the names-first read is what turns the eight RED cases.
- B removes the one-object shortcut in `envelopeKeysOf`, so a one-object schema reads `_tag` again: it fails the two undeclared-`_tag` cases and the declared-`_tag` count.
- C replaces the own-enumerable test with `TAG in input`, so an inherited `_tag` chooses a member.
- D replaces it with `Object.hasOwn`, so a non-enumerable own `_tag` chooses a member.

## Added-lines scan

Command: `node <S>/added-tokens.mjs <phase_base>`, over `git diff -U0 <phase_base> -- packages`.

```text
added-tokens: 0 hit(s)
```

Shown failing once, with the line `export const planted = (x: unknown) => x as string;` appended to `packages/core/src/EnvelopeKeys.ts` (restored with `git checkout` afterwards):

```text
packages/core/src/EnvelopeKeys.ts: export const planted = (x: unknown) => x as string;: as
added-tokens: 1 hit(s)
```
