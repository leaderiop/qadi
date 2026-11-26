# Phase 89 RED evidence

The base is the one `89-mutation-base.json` records (`phase_base` 8ee14f6f703f3121d44d15a1515d02eff62ca63f). Every line below comes from a real run with stdin closed, each scratch edit made on a file backed up into the scratch directory first and restored with `cp`. The line forms: `- red before: <title or file>` followed by an indented `  - failed on: <the first failing text as vitest printed it>` and, for a file run before the module it imports exists, an indented `  (scratch state: <module> absent at HEAD <sha>; test blob <sha>)`; `- failed (<tag>): <title>` followed by an indented `  (scratch edit: <the edit>; <n> row(s) failed under it)`; `- variant <id>: <what it changes>` followed by indented `  - failed: <title>` lines; `- check failed: <mode>: <first stderr line>`. The trailer value every commit of the phase carries is `Claude Opus 5.5` (the phase decision, not any other model name).

## 89-01 the admission order and spans

- failed (base writer-keys-first): W7 a NaN now with key material that is not a list: NowNotFinite wins
  (scratch edit: the key-material block moved above the now check; 4 row(s) failed under it)
- failed (base writer-keys-first): W8 a NaN now with a key-material item that is refused: NowNotFinite wins
  (scratch edit: the key-material block moved above the now check; 4 row(s) failed under it)
- failed (base writer-keys-first): O1 the writer refuses the first fault of now, then key material, then rows, or archives
  (scratch edit: the key-material block moved above the now check; 4 row(s) failed under it)
- failed (base writer-keys-first): L1 a refused now reads options.keyMaterial zero times and an admitted now reads it once
  (scratch edit: the key-material block moved above the now check; 4 row(s) failed under it)
- failed (base writer-rows-first): W9 a NaN now with rows that are not a list: NowNotFinite wins
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): W10 a NaN now with a row the codec did not make: NowNotFinite wins
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): W11 a NaN now with a sequence break: NowNotFinite wins
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): W12 key material that is not a list with rows that are not a list: KeyMaterialNotAList wins
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): W13 key material that is not a list with a row the codec did not make: KeyMaterialNotAList wins
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): W14 key material that is not a list with a sequence break: KeyMaterialNotAList wins
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): W15 a key-material item that is refused with rows that are not a list: KeyMaterialItemRefused wins
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): W16 a key-material item that is refused with a row the codec did not make: KeyMaterialItemRefused wins
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): W17 a key-material item that is refused with a sequence break: KeyMaterialItemRefused wins
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): O1 the writer refuses the first fault of now, then key material, then rows, or archives
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): S1 the writer refused for now opens only its own span
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): S2 the writer refused for key material that is not a list opens only its own span
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): S3 the writer refused for a key-material item opens only its own span
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): L2 refused key material reads no property of the rows
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-rows-first): L3 a refused now reads no property of the rows
  (scratch edit: verifiedArchiveFacts(entries) yielded before the now check; 15 row(s) failed under it)
- failed (base writer-no-now): W1 a NaN now alone: NowNotFinite
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-now): W7 a NaN now with key material that is not a list: NowNotFinite wins
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-now): W8 a NaN now with a key-material item that is refused: NowNotFinite wins
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-now): W9 a NaN now with rows that are not a list: NowNotFinite wins
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-now): W10 a NaN now with a row the codec did not make: NowNotFinite wins
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-now): W11 a NaN now with a sequence break: NowNotFinite wins
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-now): O1 the writer refuses the first fault of now, then key material, then rows, or archives
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-now): S1 the writer refused for now opens only its own span
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-now): L1 a refused now reads options.keyMaterial zero times and an admitted now reads it once
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-now): L3 a refused now reads no property of the rows
  (scratch edit: the writer now check deleted; 10 row(s) failed under it)
- failed (base writer-no-keys): W2 key material that is not a list alone: KeyMaterialNotAList
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): W3 a key-material item that is refused alone: KeyMaterialItemRefused
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): W12 key material that is not a list with rows that are not a list: KeyMaterialNotAList wins
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): W13 key material that is not a list with a row the codec did not make: KeyMaterialNotAList wins
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): W14 key material that is not a list with a sequence break: KeyMaterialNotAList wins
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): W15 a key-material item that is refused with rows that are not a list: KeyMaterialItemRefused wins
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): W16 a key-material item that is refused with a row the codec did not make: KeyMaterialItemRefused wins
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): W17 a key-material item that is refused with a sequence break: KeyMaterialItemRefused wins
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): O1 the writer refuses the first fault of now, then key material, then rows, or archives
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): S2 the writer refused for key material that is not a list opens only its own span
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): S3 the writer refused for a key-material item opens only its own span
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): L1 a refused now reads options.keyMaterial zero times and an admitted now reads it once
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base writer-no-keys): L2 refused key material reads no property of the rows
  (scratch edit: the key-material snapshot replaced by Result.succeed(undefined); 13 row(s) failed under it)
- failed (base facts-no-rows): W4 rows that are not a list alone: EntriesNotAList
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): W5 a row the codec did not make alone: EntryNotMadeByCodec
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): W18 a row the codec did not make with a sequence break: EntryNotMadeByCodec wins
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): V1 rows that are not a list: EntriesNotAList
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): V2 a row the codec did not make: EntryNotMadeByCodec
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): V4 a row the codec did not make with a sequence break: EntryNotMadeByCodec wins
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): O1 the writer refuses the first fault of now, then key material, then rows, or archives
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): O3 the verify refuses the first fault of the list, then a row, then the break, or passes
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): SF1 the writer refused for rows that are not a list opens its span and the sequence span
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): SF2 the writer refused for a row the codec did not make opens its span and the sequence span
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): SF3 the verify refused for rows that are not a list opens only the sequence span
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): SF4 the verify refused for a row the codec did not make opens only the sequence span
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): F1 rows that are not a list: EntriesNotAList
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): F2 a row the codec did not make: EntryNotMadeByCodec
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): F4 a row the codec did not make with a sequence break: EntryNotMadeByCodec wins
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-rows): F5 any call opens exactly the sequence span
  (scratch edit: the rowsRefusal block of verifiedArchiveFacts deleted; 16 row(s) failed under it)
- failed (base facts-no-break): W6 a sequence break alone: SequenceIntegrityError
  (scratch edit: the break failure of verifiedArchiveFacts deleted; 7 row(s) failed under it)
- failed (base facts-no-break): V3 a sequence break: SequenceIntegrityError
  (scratch edit: the break failure of verifiedArchiveFacts deleted; 7 row(s) failed under it)
- failed (base facts-no-break): O1 the writer refuses the first fault of now, then key material, then rows, or archives
  (scratch edit: the break failure of verifiedArchiveFacts deleted; 7 row(s) failed under it)
- failed (base facts-no-break): O3 the verify refuses the first fault of the list, then a row, then the break, or passes
  (scratch edit: the break failure of verifiedArchiveFacts deleted; 7 row(s) failed under it)
- failed (base facts-no-break): S4 the writer failing on a break opens its span and the sequence span
  (scratch edit: the break failure of verifiedArchiveFacts deleted; 7 row(s) failed under it)
- failed (base facts-no-break): S6 the verify failing on a break opens only the sequence span
  (scratch edit: the break failure of verifiedArchiveFacts deleted; 7 row(s) failed under it)
- failed (base facts-no-break): F3 a sequence break: SequenceIntegrityError
  (scratch edit: the break failure of verifiedArchiveFacts deleted; 7 row(s) failed under it)
- failed (base facts-break-first): W4 rows that are not a list alone: EntriesNotAList
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): W18 a row the codec did not make with a sequence break: EntryNotMadeByCodec wins
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): V1 rows that are not a list: EntriesNotAList
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): V4 a row the codec did not make with a sequence break: EntryNotMadeByCodec wins
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): O1 the writer refuses the first fault of now, then key material, then rows, or archives
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): O3 the verify refuses the first fault of the list, then a row, then the break, or passes
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): SF1 the writer refused for rows that are not a list opens its span and the sequence span
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): SF3 the verify refused for rows that are not a list opens only the sequence span
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): F1 rows that are not a list: EntriesNotAList
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): F4 a row the codec did not make with a sequence break: EntryNotMadeByCodec wins
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base facts-break-first): F5 any call opens exactly the sequence span
  (scratch edit: the facts and break check of verifiedArchiveFacts moved above rowsRefusal; 11 row(s) failed under it)
- failed (base plan-maxage-first): R6 a NaN now with a NaN maxAgeMs: planRetention answers NowNotFinite
  (scratch edit: the now and maxAgeMs checks of planRetention swapped; 6 row(s) failed under it)
- failed (base plan-maxage-first): R7 a NaN now with a maxAgeMs of -1: planRetention answers NowNotFinite
  (scratch edit: the now and maxAgeMs checks of planRetention swapped; 6 row(s) failed under it)
- failed (base plan-maxage-first): P6 a NaN now with a NaN maxAgeMs: planPurge answers NowNotFinite
  (scratch edit: the now and maxAgeMs checks of planRetention swapped; 6 row(s) failed under it)
- failed (base plan-maxage-first): P7 a NaN now with a maxAgeMs of -1: planPurge answers NowNotFinite
  (scratch edit: the now and maxAgeMs checks of planRetention swapped; 6 row(s) failed under it)
- failed (base plan-maxage-first): O2 both plans refuse the first fault of now, then maxAgeMs, then rows, or plan
  (scratch edit: the now and maxAgeMs checks of planRetention swapped; 6 row(s) failed under it)
- failed (base plan-maxage-first): L4 each plan refused for now reads maxAgeMs zero times and no row
  (scratch edit: the now and maxAgeMs checks of planRetention swapped; 6 row(s) failed under it)
- failed (base plan-rows-first): R8 a NaN now with rows that are not a list: planRetention answers NowNotFinite
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): R9 a NaN now with a row the codec did not make: planRetention answers NowNotFinite
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): R10 a NaN maxAgeMs with rows that are not a list: planRetention answers MaxAgeInvalid
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): R11 a NaN maxAgeMs with a row the codec did not make: planRetention answers MaxAgeInvalid
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): R12 a maxAgeMs of -1 with rows that are not a list: planRetention answers MaxAgeInvalid
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): R13 a maxAgeMs of -1 with a row the codec did not make: planRetention answers MaxAgeInvalid
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): P8 a NaN now with rows that are not a list: planPurge answers NowNotFinite
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): P9 a NaN now with a row the codec did not make: planPurge answers NowNotFinite
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): P10 a NaN maxAgeMs with rows that are not a list: planPurge answers MaxAgeInvalid
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): P11 a NaN maxAgeMs with a row the codec did not make: planPurge answers MaxAgeInvalid
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): P12 a maxAgeMs of -1 with rows that are not a list: planPurge answers MaxAgeInvalid
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): P13 a maxAgeMs of -1 with a row the codec did not make: planPurge answers MaxAgeInvalid
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): O2 both plans refuse the first fault of now, then maxAgeMs, then rows, or plan
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): L4 each plan refused for now reads maxAgeMs zero times and no row
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-rows-first): L5 each plan refused for maxAgeMs reads no row
  (scratch edit: rowsRefusal moved above the now check of planRetention; 15 row(s) failed under it)
- failed (base plan-no-checks): R1 a NaN now alone: planRetention answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R2 a NaN maxAgeMs alone: planRetention answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R3 a maxAgeMs of -1 alone: planRetention answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R4 rows that are not a list alone: planRetention answers EntriesNotAList
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R5 a row the codec did not make alone: planRetention answers EntryNotMadeByCodec
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R6 a NaN now with a NaN maxAgeMs: planRetention answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R7 a NaN now with a maxAgeMs of -1: planRetention answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R8 a NaN now with rows that are not a list: planRetention answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R9 a NaN now with a row the codec did not make: planRetention answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R10 a NaN maxAgeMs with rows that are not a list: planRetention answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R11 a NaN maxAgeMs with a row the codec did not make: planRetention answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R12 a maxAgeMs of -1 with rows that are not a list: planRetention answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): R13 a maxAgeMs of -1 with a row the codec did not make: planRetention answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P1 a NaN now alone: planPurge answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P2 a NaN maxAgeMs alone: planPurge answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P3 a maxAgeMs of -1 alone: planPurge answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P4 rows that are not a list alone: planPurge answers EntriesNotAList
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P5 a row the codec did not make alone: planPurge answers EntryNotMadeByCodec
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P6 a NaN now with a NaN maxAgeMs: planPurge answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P7 a NaN now with a maxAgeMs of -1: planPurge answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P8 a NaN now with rows that are not a list: planPurge answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P9 a NaN now with a row the codec did not make: planPurge answers NowNotFinite
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P10 a NaN maxAgeMs with rows that are not a list: planPurge answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P11 a NaN maxAgeMs with a row the codec did not make: planPurge answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P12 a maxAgeMs of -1 with rows that are not a list: planPurge answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): P13 a maxAgeMs of -1 with a row the codec did not make: planPurge answers MaxAgeInvalid
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): O2 both plans refuse the first fault of now, then maxAgeMs, then rows, or plan
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): S8 both plans open no span, refused or admitted, called inside Effect.sync
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): L4 each plan refused for now reads maxAgeMs zero times and no row
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-no-checks): L5 each plan refused for maxAgeMs reads no row
  (scratch edit: the three checks of planRetention deleted; 30 row(s) failed under it)
- failed (base plan-as-effect): O2 both plans refuse the first fault of now, then maxAgeMs, then rows, or plan
  (scratch edit: planRetention returning its result inside Effect.succeed; 2 row(s) failed under it)
- failed (base plan-as-effect): S8 both plans open no span, refused or admitted, called inside Effect.sync
  (scratch edit: planRetention returning its result inside Effect.succeed; 2 row(s) failed under it)
- failed (base verify-named): S6 the verify failing on a break opens only the sequence span
  (scratch edit: the public verify given its own span name qadi.audit.verify; 4 row(s) failed under it)
- failed (base verify-named): S7 the verify succeeding opens only the sequence span
  (scratch edit: the public verify given its own span name qadi.audit.verify; 4 row(s) failed under it)
- failed (base verify-named): SF3 the verify refused for rows that are not a list opens only the sequence span
  (scratch edit: the public verify given its own span name qadi.audit.verify; 4 row(s) failed under it)
- failed (base verify-named): SF4 the verify refused for a row the codec did not make opens only the sequence span
  (scratch edit: the public verify given its own span name qadi.audit.verify; 4 row(s) failed under it)
- failed (base writer-inline-facts): S4 the writer failing on a break opens its span and the sequence span
  (scratch edit: the writer doing the row and break checks inline instead of yielding verifiedArchiveFacts; 4 row(s) failed under it)
- failed (base writer-inline-facts): S5 the writer succeeding opens its span and the sequence span
  (scratch edit: the writer doing the row and break checks inline instead of yielding verifiedArchiveFacts; 4 row(s) failed under it)
- failed (base writer-inline-facts): SF1 the writer refused for rows that are not a list opens its span and the sequence span
  (scratch edit: the writer doing the row and break checks inline instead of yielding verifiedArchiveFacts; 4 row(s) failed under it)
- failed (base writer-inline-facts): SF2 the writer refused for a row the codec did not make opens its span and the sequence span
  (scratch edit: the writer doing the row and break checks inline instead of yielding verifiedArchiveFacts; 4 row(s) failed under it)
- failed (base facts-renamed): S4 the writer failing on a break opens its span and the sequence span
  (scratch edit: the span of verifiedArchiveFacts renamed qadi.audit.facts; 9 row(s) failed under it)
- failed (base facts-renamed): S5 the writer succeeding opens its span and the sequence span
  (scratch edit: the span of verifiedArchiveFacts renamed qadi.audit.facts; 9 row(s) failed under it)
- failed (base facts-renamed): S6 the verify failing on a break opens only the sequence span
  (scratch edit: the span of verifiedArchiveFacts renamed qadi.audit.facts; 9 row(s) failed under it)
- failed (base facts-renamed): S7 the verify succeeding opens only the sequence span
  (scratch edit: the span of verifiedArchiveFacts renamed qadi.audit.facts; 9 row(s) failed under it)
- failed (base facts-renamed): SF1 the writer refused for rows that are not a list opens its span and the sequence span
  (scratch edit: the span of verifiedArchiveFacts renamed qadi.audit.facts; 9 row(s) failed under it)
- failed (base facts-renamed): SF2 the writer refused for a row the codec did not make opens its span and the sequence span
  (scratch edit: the span of verifiedArchiveFacts renamed qadi.audit.facts; 9 row(s) failed under it)
- failed (base facts-renamed): SF3 the verify refused for rows that are not a list opens only the sequence span
  (scratch edit: the span of verifiedArchiveFacts renamed qadi.audit.facts; 9 row(s) failed under it)
- failed (base facts-renamed): SF4 the verify refused for a row the codec did not make opens only the sequence span
  (scratch edit: the span of verifiedArchiveFacts renamed qadi.audit.facts; 9 row(s) failed under it)
- failed (base facts-renamed): F5 any call opens exactly the sequence span
  (scratch edit: the span of verifiedArchiveFacts renamed qadi.audit.facts; 9 row(s) failed under it)

## 89-01 the batch reads

- red before: B1 planRetention reads maxAgeMs once over two rows
  - failed on: AssertionError: expected 3 to equal 1
- red before: B2 planPurge reads maxAgeMs once over two rows
  - failed on: AssertionError: expected 3 to equal 1
- red before: B3 a refused maxAgeMs is read once by each plan
  - failed on: AssertionError: expected { retention: 2, purge: 2 } to deeply equal { retention: 1, purge: 1 }
- red before: B4 a null or undefined policy is MaxAgeInvalid with value undefined in each plan
  - failed on: TypeError: Cannot read properties of null (reading 'maxAgeMs')
- red before: B6 the writer archives the row that was checked when the list answers differently on a second read, and its reader reads the bundle back
  - failed on: AssertionError: expected { …(2) } to equal AuditEntry{ record: { …(7) }, …(1) }
- red before: B7 the sequence check judges the rows that were checked when the list answers differently on a second read
  - failed on: AssertionError: expected 'SequenceIntegrityError' to equal 'success'
- red before: B8 planRetention plans the row that was checked when the list answers differently on a second read
  - failed on: AssertionError: expected +0 to equal 1
- red before: B9 planPurge plans the row that was checked when the list answers differently on a second read
  - failed on: AssertionError: expected +0 to equal 1
- red before: B10 the writer reads the rows list as its length once and each index once
  - failed on: AssertionError: expected [ [ '0', 4 ], [ '1', 4 ], …(7) ] to deeply equal [ [ '0', 1 ], [ '1', 1 ], …(2) ]
- red before: B11 the sequence check reads the rows list as its length once and each index once
  - failed on: AssertionError: expected [ [ '0', 4 ], [ '1', 4 ], …(7) ] to deeply equal [ [ '0', 1 ], [ '1', 1 ], …(2) ]
- red before: B12 planRetention reads the rows list as its length once and each index once
  - failed on: AssertionError: expected [ [ '0', 2 ], [ '1', 2 ], …(4) ] to deeply equal [ [ '0', 1 ], [ '1', 1 ], …(2) ]
- red before: B13 planPurge reads the rows list as its length once and each index once
  - failed on: AssertionError: expected [ [ '0', 3 ], [ '1', 3 ], …(4) ] to deeply equal [ [ '0', 1 ], [ '1', 1 ], …(2) ]
- failed (base policy-value): B5 a policy that is a number, a string or an empty object is MaxAgeInvalid with value undefined in each plan
  (scratch edit: planRetention refuses with MaxAgeInvalid({ value: policy }); 12 row(s) failed under it)

## 89-02 the phase check

- check failed: base: phase_base is not an ancestor of HEAD
- check failed: commit: the commit holds .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-mutation-base.json, .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-mutation.mjs, not .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-mutation-base.json
- check failed: unchanged: packages/audit/test/AdmissionOrder.characterisation.test.ts differs from phase_base
- check failed: seen-failing: no failure line in the evidence for: no such title
- check failed: vitest: the report names no test file
- check failed: suite: B1 planRetention reads maxAgeMs once over two rows fails
- check failed: scan-ids: packages/audit/test/scratch-ids.ts:1 names a decision number: // D-12
- check failed: scan-forbidden: packages/audit/test/scratch-forbidden.ts:1 uses an as cast: export const x = (y: unknown) => y as string;
- check failed: trailers: the message has 0 Co-Authored-By lines, not one
- check failed: records: BEH-QD-781 has no heading in spec/behaviors/33-audit-pipeline.md
- check failed: admission-step: packages/audit/src/HostBatch.ts does not exist
- check failed: entry-points-first: archiveAuditTrail: the first statement of its body does not call admitBatch or admitRows: if (!Number.isFinite(now)) { const refusal = ArchiveInputRefusal.NowNotFinite({ 

## 89-03 the pinned-test check

- check failed: pinned-held: packages/audit/test/helpers.ts: differs from its base text at line 123
- check failed: pinned-extra: packages/audit/src/CodecMade.ts: differs from its base text at line 73
- check failed: pinned-born: packages/audit/test/BatchReadOnce.test.ts: differs from the commit that added it at line 203
- check failed: pinned-region: packages/audit/test/ForeignRows.test.ts: region planOrder is not the lines it becomes
- check failed: pinned-between: packages/audit/test/ForeignRows.test.ts: the text between regions differs from its base text at line 115 of the base, "  it(\"the rows are refused before a sequence break among the" is missing or changed (between nowBeforeRows and planOrder)
- check failed: pinned-all-applied: packages/audit/test/ForeignRows.test.ts: its declared edit is not applied

## 89-04 the earlier-phase checks

- check failed: earlier-fixed: 85-check.mjs scan-forbidden: expected the line "scan-forbidden: no forbidden form in added line", got "scan-forbidden: no forbidden form in added lines"
- check failed: earlier-unexpected: unexpected run: 85-check.mjs scan-forbidden
- check failed: earlier-computed: 88-check.mjs records --close: expected exit 1, got exit 0: records: the pinned-by lists name tests that exist, and every reserved record is written

## 89-05 the admission step

- red before: packages/audit/test/HostBatch.test.ts
  - failed on: Error: Cannot find module '../src/HostBatch.ts' imported from <root>/packages/audit/test/HostBatch.test.ts
  (scratch state: packages/audit/src/HostBatch.ts absent at HEAD d34819c63936c3327415300b51c03dd974561c5a; test blob a6eff7b41516a242bf179b594d4e464eedd9b6ba)

## 89-05 the step variants

- variant now-terms: terms called and checked before now
  - failed: H6 a bad now with refused terms is NowNotFinite
  - failed: H11 a bad now with refused terms and rows that are not a list is NowNotFinite
  - failed: H12 a bad now with refused terms and a refused row is NowNotFinite
  - failed: H13 the terms are called once for an admitted now and never for a refused now
- variant rows-terms: rows admitted before terms
  - failed: H9 refused terms with rows that are not a list is the terms refusal
  - failed: H10 refused terms with a refused row is the terms refusal
  - failed: H14 the rows are not read when the now or the terms are refused
- variant isfinite: isFinite(batch.now) for Number.isFinite
  - failed: H15 a now of NaN, both infinities, the string 1, undefined, null or 1n is NowNotFinite with the value given
- variant terms-on-refused-now: terms called before the now check, its result used after
  - failed: H13 the terms are called once for an admitted now and never for a refused now
- variant no-snapshot: rowsRefusal(entries) and new AdmittedRows(entries) on the list given
  - failed: H19 admitRows admits the row that was checked when the list answers differently on a second read
  - failed: H20 admitRows reads the length once and each index once
  - failed: H22 the admitted rows are a fresh array the list given cannot change
- variant no-list-guard: takeRows(entries) with no Array.isArray
  - failed: H4 admitted terms then a rows list that is not a list is EntriesNotAList
  - failed: H17 admitRows refuses each of the seven values that are not a list with the value given
- variant filter-first: rowsRefusal asked of the filtered array
  - failed: H18 admitRows refuses a hole at its index
- variant positive-now: batch.now > 0 for the finite check
  - failed: H15 a now of NaN, both infinities, the string 1, undefined, null or 1n is NowNotFinite with the value given
  - failed: H16 a now of 0, -0 or 1 is admitted as given
- variant empty-refused: an empty list refused as EntriesNotAList
  - failed: H21 admitRows admits an empty list as no rows
- variant terms-dropped: the admitted batch carries terms: undefined
  - failed: H1 an admitted batch passes the now, the terms and the rows through
- variant now-unchecked: the now is never checked (a narrower variant: no variant above turned H2 red)
  - failed: H2 a bad now alone is NowNotFinite
  - failed: H6 a bad now with refused terms is NowNotFinite
  - failed: H7 a bad now with rows that are not a list is NowNotFinite
  - failed: H8 a bad now with a refused row is NowNotFinite
  - failed: H11 a bad now with refused terms and rows that are not a list is NowNotFinite
  - failed: H12 a bad now with refused terms and a refused row is NowNotFinite
  - failed: H13 the terms are called once for an admitted now and never for a refused now
  - failed: H14 the rows are not read when the now or the terms are refused
  - failed: H15 a now of NaN, both infinities, the string 1, undefined, null or 1n is NowNotFinite with the value given
- variant now-last: the now checked after the terms and the rows (a narrower variant: no variant above turned H7 and H8 red)
  - failed: H6 a bad now with refused terms is NowNotFinite
  - failed: H7 a bad now with rows that are not a list is NowNotFinite
  - failed: H8 a bad now with a refused row is NowNotFinite
  - failed: H11 a bad now with refused terms and rows that are not a list is NowNotFinite
  - failed: H12 a bad now with refused terms and a refused row is NowNotFinite
  - failed: H13 the terms are called once for an admitted now and never for a refused now
  - failed: H14 the rows are not read when the now or the terms are refused
- variant terms-ignored: a refused terms read is not a refusal (a narrower variant: no variant above turned H3 red)
  - failed: H3 refused terms alone is the terms refusal
  - failed: H9 refused terms with rows that are not a list is the terms refusal
  - failed: H10 refused terms with a refused row is the terms refusal
  - failed: H14 the rows are not read when the now or the terms are refused
- variant rows-unchecked: a refused rows list is not a refusal (a narrower variant: no variant above turned H5 red)
  - failed: H4 admitted terms then a rows list that is not a list is EntriesNotAList
  - failed: H5 admitted terms then a refused row is EntryNotMadeByCodec

## 89-07 the archive wiring

- red before: SF1 the writer refused for rows that are not a list opens its span and the sequence span
  - failed on: AssertionError: expected { Object (outcome, names) } to deeply equal { Object (outcome, names) }
- red before: SF2 the writer refused for a row the codec did not make opens its span and the sequence span
  - failed on: AssertionError: expected { Object (outcome, names) } to deeply equal { Object (outcome, names) }
- red before: SF3 the verify refused for rows that are not a list opens only the sequence span
  - failed on: AssertionError: expected { Object (outcome, names) } to deeply equal { Object (outcome, names) }
- red before: SF4 the verify refused for a row the codec did not make opens only the sequence span
  - failed on: AssertionError: expected { Object (outcome, names) } to deeply equal { Object (outcome, names) }

## 89-07 the type pin

- variant V1: `value: number` in `NowRefusalCases`
  - failed: each public refusal union is its members spelled out
- variant V2: `KeyMaterialItemRefused` dropped from the archive own cases
  - failed: each public refusal union is its members spelled out
  - failed: each public refusal union is its two fragments plus its own members
- variant V3: `NowNotFinite` restated in the retention own cases with `value: string`
  - failed: each public refusal union is its members spelled out
  - failed: each public refusal union is its two fragments plus its own members
  - failed: the shared members are one type in both unions
- variant V4: `verifiedArchiveFacts` taking `{ entries }`
  - failed: verifiedArchiveFacts takes only admitted rows
- variant V6: `declare private readonly nominal: never` removed from `AdmittedRows`
  - failed: admitted rows are nominal

## 89-08 the per-entry-point rows

- failed (writer-rows-first): archiveAuditTrail refuses each batch as the admission step refuses it
  (scratch edit: archiveAuditTrail calls admitRows(entries) and fails on its refusal before admitBatch; 4 row(s) failed under it)
- failed (verify-skips-holes): verifySequenceIntegrity refuses each rows list as the admission step refuses it
  (scratch edit: verifySequenceIntegrity admits entries with the holes filtered out first; 1 row(s) failed under it)
- failed (retention-maxage-first): planRetention refuses each batch as the admission step refuses it
  (scratch edit: planRetention checks maxAgeOf(policy) and fails on it before admitBatch; 1 row(s) failed under it)
- failed (purge-maxage-first): planPurge refuses each batch as the admission step refuses it
  (scratch edit: planPurge checks maxAgeOf(policy) and fails on it before admitBatch; 1 row(s) failed under it)

## 89-09 the entry-point variants

- variant verify-span-first: the public verify opens the span named qadi.audit.verifySequenceIntegrity around its own admission
  - failed: S6 the verify failing on a break opens only the sequence span
  - failed: S7 the verify succeeding opens only the sequence span
  - failed: SF3 the verify refused for rows that are not a list opens only the sequence span
  - failed: SF4 the verify refused for a row the codec did not make opens only the sequence span
  - failed: verifying a sequence opens a span named qadi.audit.verifySequenceIntegrity
  (5 failing row(s) of 724 in the audit project)
- variant purge-maps-retention: planPurge maps planRetention over the list given and iterates that list, not the admitted rows
  - failed: B2 planPurge reads maxAgeMs once over two rows
  - failed: B9 planPurge plans the row that was checked when the list answers differently on a second read
  - failed: B13 planPurge reads the rows list as its length once and each index once
  (3 failing row(s) of 724 in the audit project)
- variant age-rereads-policy: the age rule takes the policy and compares with policy.maxAgeMs again, not the limit the terms check admitted
  - failed: B1 planRetention reads maxAgeMs once over two rows
  - failed: B2 planPurge reads maxAgeMs once over two rows
  (2 failing row(s) of 724 in the audit project)
- variant now-restated: RetentionInputRefusal states NowNotFinite: { readonly value: unknown } itself instead of taking NowRefusalCases
  - check failed: admission-step: NowNotFinite: is a member key in 2 files of packages/audit/src, not one: packages/audit/src/Retention.ts, packages/audit/src/HostBatch.ts
  (0 failing row(s) of 724 in the audit project)

## 89-09 the judge clauses

- variant second-rowsrefusal: ArchiveFacts.ts calls rowsRefusal(entries) a second time
  - check failed: admission-step: packages/audit/src/ArchiveFacts.ts calls rowsRefusal(; only HostBatch.ts may
- variant effect-in-step: HostBatch.ts holds an Effect.succeed(0) constant
  - check failed: admission-step: HostBatch.ts uses Effect: Effect.succeed
- variant bare-isfinite: HostBatch.ts also asks the global isFinite(batch.now)
  - check failed: admission-step: HostBatch.ts calls a bare isFinite(
- variant step-in-barrel: index.ts exports HostBatch.ts
  - check failed: admission-step: packages/audit/src/HostBatch.ts is reached from packages/audit/src/index.ts:11
- variant back-edge: HostBatch.ts imports a type from ArchiveFacts.ts
  - check failed: admission-step: HostBatch.ts imports ./ArchiveFacts.ts, ./AuditEntry.ts (type), ./CodecMade.ts, effect/Data, effect/Predicate, effect/Result, not effect/Data, effect/Predicate, effect/Result, ./AuditEntry.ts (type), ./CodecMade.ts
- variant codecmade-changed: a blank line appended to CodecMade.ts
  - check failed: admission-step: packages/audit/src/CodecMade.ts differs from phase_base
- variant purge-calls-retention: planPurge calls planRetention after its own admission
  - check failed: entry-points-first: planPurge calls planRetention
- variant first-not-step: archiveAuditTrail opens with const unused = now; before the step
  - check failed: entry-points-first: archiveAuditTrail: the first statement of its body does not call admitBatch or admitRows: const unused = now;
- variant facts-take-list: verifiedArchiveFacts is typed with ReadonlyArray<AuditEntry> and reads the list
  - check failed: entry-points-first: verifiedArchiveFacts takes ReadonlyArray<AuditEntry>, not AdmittedRows

## 89-09 the mutation close

- close run: `pnpm exec stryker run stryker.audit.mjs --mutate` over the five base files and `HostBatch.ts`, alone on a clean tree at bd039183 with stdin closed: 248 mutants instrumented; AuditArchive.ts 78/78, ArchiveFacts.ts 54/54, Retention.ts 56/56, CodecMade.ts 18/18, HostBatch.ts 21/22 detected, one Survived and one Ignored; SequenceIntegrity.ts holds no mutant and Stryker lists no row for it
- check failed: mutation probe: packages/audit/src/HostBatch.ts:86 is new and has a Survived mutant: MethodExpression -> taken
- check failed: mutation probe: packages/audit/src/HostBatch.ts:69 is new and Ignored: ArrowFunction -> () => undefined
- equivalent: packages/audit/src/HostBatch.ts MethodExpression taken: a hole is refused before the line, so no element is undefined and the filter only narrows the type
- hand run: `pnpm exec stryker run <scratch config spreading stryker.audit.mjs with ignoreStatic: false, reports to the scratch directory> --mutate packages/audit/src/HostBatch.ts`, 12 seconds: 23 mutants, 22 Killed (the static ones among them), the one Survived mutant is the equivalent filter above
- examined: packages/audit/src/HostBatch.ts ArrowFunction () => undefined: Killed

## 89 review fixes

Each row below was run against HEAD 76d38f52 (the source the review read) with only the new test file added, stdin closed, before its fix was written.

- red before: M1 null, false, an empty string and an empty list, which compare as 0, are MaxAgeInvalid with the value given in each plan
  - failed on: AssertionError: the plan admitted the limit
- red before: M2 a numeric string and true are MaxAgeInvalid with the value given in each plan
  - failed on: AssertionError: the plan admitted the limit
- red before: M3 a boxed number and an object with its own valueOf are MaxAgeInvalid with the value given in each plan, and valueOf is never called
  - failed on: AssertionError: the plan admitted the limit
- red before: M4 a Symbol and an object with no prototype are MaxAgeInvalid with the value given in each plan, and neither throws
  - failed on: TypeError: Cannot convert a Symbol value to a number
- red before: X1 admitRows refuses a list whose length reads past any array's at index 0, having read the length and that index once
  - failed on: RangeError: Invalid array length
- red before: X2 each entry point refuses a list whose length reads past any array's at index 0, with no RangeError
  - failed on: RangeError: Invalid array length
- red before: X3 admitRows stops a long sparse list at its first hole, and a long list at its first foreign entry, having read two indexes
  - failed on: AssertionError: expected [ [ '0', 1 ], [ '1', 1 ], …(99999) ] to deeply equal [ [ '0', 1 ], [ '1', 1 ], …(1) ]
- red before: X4 each entry point stops a long sparse list at its first hole, and a long list at its first foreign entry, having read two indexes
  - failed on: AssertionError: expected { archived: { at: 1, …(1) }, …(3) } to deeply equal { archived: { at: 1, …(1) }, …(3) }
- red before: X5 admitRows refuses a list whose length reads as a string or an object as EntriesNotAList with the list given, reading no index
  - failed on: AssertionError: expected 'admitted' to equal [ AuditEntry{ …(2) },  ]
- check failed: admission-step: packages/audit/src/CodecMade.ts is not a leaf: it imports ./AuditEntry.ts
  (scratch edit: `import type { AuditEntry } from "./AuditEntry.ts";` added to CodecMade.ts; `pnpm circular` refuses the same edit: 1) audit/src/AuditEntry.ts > audit/src/CodecMade.ts)
- check failed: admission-step: packages/audit/src/ArchiveFacts.ts calls isCodecMade(; only HostBatch.ts may
  (scratch edit: `export const probeRow = (entry: unknown) => isCodecMade(entry);` appended to ArchiveFacts.ts)
- check failed: pinned: packages/audit/src/CodecMade.ts: the text between regions differs from its base text at line 27 (between dataImport and rowsRefusal)
  (scratch edit: `// edit` appended to the `codecMade` WeakSet line, outside the declared regions)
- check failed: pinned: packages/audit/src/CodecMade.ts: region rowsRefusal is not the lines it becomes
  (scratch edit: `// edit` appended to the `isCodecMade` declaration line, inside the region)
- check failed: pinned: packages/audit/test/AdmissionOrder.characterisation.test.ts: region spanFlips is not the lines it becomes
  (scratch edit: the SF3 title put back to its base wording, "opens only the sequence span")
- failed (variant verify-admits-in-span): F3 rows that are not a list are refused by admitRows, and neither the verify nor the writer runs verifiedArchiveFacts on them
  (scratch edit: verifySequenceIntegrity admits inside `Effect.withSpan(..., "qadi.audit.verifySequenceIntegrity")`; 6 row(s) failed under it)
- failed (variant verify-admits-in-span): F4 a row admitRows refuses, with a break among the rest, keeps the verify and the writer from running verifiedArchiveFacts
  (scratch edit: verifySequenceIntegrity admits inside `Effect.withSpan(..., "qadi.audit.verifySequenceIntegrity")`; 6 row(s) failed under it)
