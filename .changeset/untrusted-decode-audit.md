---
"@qadi/audit": minor
---

**Breaking.** Two refusals for input nested past the decode bound are now reported as too deep, not as malformed.

- `ArchiveRefusal` gains `TooDeep { maxDepth }`: `readAuditArchive` refuses a stored archive nested past `MAX_DECODE_DEPTH` outside its entries, before any decode, where it was `Malformed`. An entry nested too deep is still `EntryNotDecodable`.
- `decodeAuditEntry` refuses a row nested past the bound outside its record as `DecodeRefusal.TooDeep`, where it was `DecodeRefusal.Malformed`.

Migration: add a `TooDeep` arm to any exhaustive match on `ArchiveRefusal`; treat a `DecodeRefusal.TooDeep` as you treat `Malformed` unless you want the distinction.
