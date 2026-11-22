---
"@qadi/core": minor
---

**Breaking.** A stored record is `StoredRecord`, one class `{ environment, record }`, built with `new StoredRecord({ environment, record })`: the shape the wire already had, held in memory too. `stored._tag` and every field of the record move under `stored.record`, so `stored.evaluationId` is `stored.record.evaluationId`. `Stamped`, `StoredDecisionRecord`, `StoredObligationRecord` and `stampRecord` are removed, with no alias. `sinkRecordOrder`, a new export, orders records, and `storedRecordOrder` now orders `StoredRecord`s by the record each holds. The wire is unchanged byte for byte, and so is every refusal `decodeStoredRecord` gives.

The decision log no longer logs `qadi: a decision log's append half failed` or its publish twin. A defect in either half is reported once, by the sink emitter, as a defect in any sink is.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
