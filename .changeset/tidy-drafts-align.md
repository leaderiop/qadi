---
"@qadi/react": patch
---

A test now pins that a `DecisionSink` provided in the layer `makeQadiAtoms` is
built from reaches the atom runtime, so browser-side decisions are recorded.

It always did — `DecisionSink` is optional, so it is absent from
`QadiRuntimeServices` and nothing in the types said a layer may carry one — but
that was verified with a throwaway probe rather than a test. It is the client
half of the server/client pairing a merged devtools timeline depends on, so it is
asserted rather than assumed.
