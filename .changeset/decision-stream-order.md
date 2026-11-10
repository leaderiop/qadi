---
"@qadi/core": minor
"@qadi/http": minor
"@qadi/devtools": patch
---

A reconnect to `/__decisions` during the backlog no longer loses records (ARCH-60). The backlog was sent in decision order (by `at`) while a reconnect resumed after the last event id the client saw, so whenever decision order and arrival order differed (overlapping evaluations, any record ingested from an edge function) a client cut off mid-backlog resumed past records it had never received, with no error. A reconnect after the backlog also re-sent records the client had. The backlog now travels in cursor order, so a reconnect loses and repeats nothing (BEH-QD-349, INV-QD-250).

`@qadi/core`: the stream's order has one owner, `DecisionStream.ts`. Added: `encodeDecisionStream` (a log read as transport-free frames, the backlog in cursor order, one `synced`, then live), `decodeDecisionStream` (frames read back into a backlog, presented in `storedRecordOrder`, or none, and a live stream), `DecisionStreamFrame`, `EncodeDecisionStreamOptions`, `ReceivedFrame` and `DecisionStreamRead`. Both are codec-free: the record's bytes and the refusal words are the caller's. `DecisionStreamEvent`, `DecisionRecordEvent`, `DecisionStreamSynced`, `formatLogCursor` and `parseLogCursor` are declared in that module now, under the same names.

**Breaking (`@qadi/http`):** `frame`, `syncedFrame` and `decisionFrames` are removed, with no aliases. Use `@qadi/core`'s `encodeDecisionStream` and write each frame yourself. `decisionStreamRoute`, `decisionBacklogRoute`, the record bytes, both refusal warnings, both span names and `onRefused` are unchanged.

`@qadi/devtools`: `sourceFromEventSource` is the `EventSource` adapter over `@qadi/core`'s `decodeDecisionStream`. Its signature, `SourceRead`, `onMalformed` and what it prints are unchanged.

The order is the server's: a fixed reader connected to a server older than this release still loses records on a reconnect during the backlog. Upgrade the server.
