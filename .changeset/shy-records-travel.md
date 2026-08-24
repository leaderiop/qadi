---
"@qadi/core": minor
---

A record can cross a process boundary.

An in-memory sink hands a consumer real objects. Anything that crosses a
boundary — a socket to a devtools page, a replica forwarding to a shared store, a
serverless function shipping its log before it dies — needs a form that survives
JSON and can be rebuilt on the far side, and `SinkRecord` had none.

`toWire` / `fromWire` project between the record and its wire shape;
`encodeRecord` / `decodeRecord` go through the schema. The wire shape lives
beside the record it describes rather than inside whichever transport carries it
first, because it is a contract two processes agree on.

**Decoded as untrusted.** A record crossing a process boundary crosses a trust
boundary, which is the reasoning ADR-QD-002 applies to policies. `decodeRecord`
validates rather than casts, so a payload naming a policy shape the ADT does not
have is refused rather than walked.

**Errors carry their stable code.** `ERROR_CODES` has said since it was written
that it exists "for logging and cross-process correlation"; this is that use. The
code is written on encode and **ignored on decode** — the tag rebuilds the error,
because trusting a sender's code to choose a class would let it name one error
and receive another.

The mapping is hand-written, and that is forced: AGENTS.md §4 requires
`Data.TaggedError` and explicitly not `Schema.TaggedErrorClass`, so the errors
cannot be Schema-derived where they are defined. A round-trip property over
generated policies stands in for the gate the policy codec gets.

Two losses are recorded rather than hidden:

- an error's `cause` is `unknown` — possibly an `Error`, a circular object, or a
  function — so it is **rendered to a string**. An `Error` keeps its message; a
  value whose `toString` throws yields a marker, because the encoder a transport
  calls must never be able to break the thing it observes.
- an explicitly-`undefined` optional field arrives **absent**, since
  `Schema.optional` drops absent keys. Both read as `undefined`.

A decision record naming neither outcome decodes to a `Failed` that says so.
Unreachable for anything this library encodes, but the wire is untrusted, and a
row reading "the sender sent neither outcome" beats a silently dropped record.

See BEH-QD-199, BEH-QD-200.
