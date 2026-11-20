# ADR-QD-177 — One throwing listener cannot silence the rest

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-177                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-20                                     |
> | Status         | Accepted — amends ADR-QD-173                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-20): Initial release (ARCH-111, CCR-QD-455) |

---

## Context

`makeExternalStore` (`packages/devtools/src/model/ExternalStore.ts`) is the store every `@qadi/devtools` model is built
on: the timeline, diagnostics and gates feeds' stores, and the dock's own. Its `notify` called the listeners in a plain
loop, so a listener that threw ended the notification: every listener after it missed the change, and the throw left
through whatever had published. [ADR-QD-173](./173-the-devtools-headless-interface-is-its-feeds.md) made the feeds the
headless interface, so a host's listener now sits in the same set as the dock's own, and
[BEH-QD-638](../behaviors/28-devtools-screens.md#beh-qd-638-the-gates-feed-is-the-roots-gate-watch) and the feeds' docs
answered by asking a host's listener never to throw. A host breaks that rule without seeing it, until a panel stops
updating.

## Decision

1. `notify` calls every listener in the set, each inside a `try`, and keeps what each one threw.
2. After the last listener it decides by how many threw, never by what was thrown. None: it returns. One: it rethrows
   that value itself, `undefined` and `null` included. More than one: it throws one `AggregateError` whose `errors` are
   the thrown values in call order and whose message is exactly "More than one of the store's listeners threw.", with
   no count and no thrown value in it.
3. An `AggregateError` a listener throws is one value like any other. It is never flattened, and nothing in `notify`
   reads a thrown value's type.
4. As before, the loop reads the live set, so a listener removed before its turn is not called and one added during the
   notification is called in the same pass; and the store holds the new value before any listener runs, and keeps it
   when one throws.
5. The window between a feed's run `begin()` and its `fork()` is out of scope. A throw on the status published there,
   the timeline's `Reading` over a `Stopped` or the diagnostics feed's `Starting`, still leaves before the new read or
   poll is forked, and the feeds' texts say so. A throw on the timeline publish a `configure` with a new capacity makes
   leaves earlier still, before `begin()`: no read is started, so a source handed in by that call is not read, the
   previous read goes on, and only `restart` reads it, because the feed already holds the new inputs.

## Alternatives considered

- **Catch and log a throw.** Rejected: the throw would be swallowed, a host would not learn its listener failed, and
  `@qadi/devtools` has nothing to log it to (AGENTS.md §6 refuses an ambient `console`).
- **Iterate a copy of the set.** Rejected: it changes which listeners a notification reaches. A listener removed before
  its turn would still be called, and one added during the notification would not. The live set is kept.
- **Rethrow only the first value.** Rejected: every later failure is lost.
- **Put the count in the message.** Rejected: `errors.length` already holds it, and a fixed message is one literal that
  the store's test and BEH-QD-656 can quote.
- **Flatten a nested `AggregateError`.** Rejected: a store whose listener publishes to another store can receive an
  inner notification's `AggregateError` (the timeline feed's own store is a listener of the store under it), and
  flattening loses which notification it came from and needs a branch on the thrown value's type.
- **Close the window between `begin()` and `fork()`.** Not decided here: it is a change to each feed's run, not to
  `notify`, and it is outside this decision's scope.

## Consequences

- One function changes, and every store in the package inherits the contract. No public type changes; the release
  note is a patch for `@qadi/devtools`.
- A publishing call (`configure`, `restart`, a read, a tick, the host registry's notification) throws one
  `AggregateError` where it used to throw the first listener's value, but only when two or more listeners threw.
- [BEH-QD-656](../behaviors/28-devtools-screens.md#beh-qd-656-a-throwing-listener-does-not-silence-the-others) and
  [INV-QD-373](../invariants.md#inv-qd-373-every-listener-is-called-and-what-one-throws-is-never-swallowed) state the
  contract; BEH-QD-638's rule for the feed's own `subscribe` and ADR-QD-173 are amended.
- `@qadi/react`'s own gate registry, which swallows a listener's throw, is not changed.

## Related

[ADR-QD-173](./173-the-devtools-headless-interface-is-its-feeds.md), BEH-QD-638, BEH-QD-656, INV-QD-365, INV-QD-373.
