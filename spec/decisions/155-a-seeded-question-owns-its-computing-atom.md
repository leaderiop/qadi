# ADR-QD-155 — A seeded question owns its computing atom, in its own module

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-155                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-14                                     |
> | Status         | Accepted — amends ADR-QD-149, ADR-QD-140       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-14): Initial (ARCH-89, CCR-QD-433) |

---

## Context

Architecture review #6 found that the seed-to-evaluation link in `@qadi/react` is split across two modules and
tested through a fake.

- **A callback handed a callback.** `makeSeededQuestion` (`HydrationEngine.ts`) takes `computedFor`, a function
  that receives another function (`seededIn`) and returns the computing atom. The atom itself is built in
  `QadiAtoms.ts`, in `seededDecision`. So the rule that carries the seed's evaluation id into the client's own
  evaluation ([BEH-QD-186](../behaviors/19-hydration.md)) has its two halves in two files, and neither can be read
  without the other.
- **A fake in the tests.** `HydrationEngine.test.ts` exercises the seed's precedence, its announcement and its
  grant through a fake `computedFor`, so the link the tests are about is the one thing they replace.
- **The liveness rule, said three times.** "Count the question live first inside the reader, release in its
  finalizer" is stated in `QuestionBook.ts` (`BookOptions.build`), in `QadiAtoms.ts` and in `HydrationEngine.ts`.
  Three statements of one rule drift.

The change was put in scope behind a human checkpoint, because [ADR-QD-103](./103-a-question-is-opened-once.md),
[ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md) and [ADR-QD-149](./149-a-seed-is-held-by-its-question.md)
had just been decided and the question was whether they allowed it. They do: none of the three is reversed.

Four options were gathered as evidence first (three built and measured in throwaway worktrees, one argued in
prose), and the user chose from that evidence.

## Decision

**A seeded question builds its own computing atom, in a module of its own.** (ARCH-89, CCR-QD-433.)

1. **The module.** A new package-private module `packages/react/src/SeededQuestion.ts` owns the seeded
   question. `makeSeededQuestion({ policy, resource, runtime, subject, report, live })` builds the computing atom
   over the atom set's runtime and its kept-alive subject atom, and its reader calls `live` itself. No input is a
   function that receives a function.

2. **What moves, and what stays.**
   - Moves to `SeededQuestion.ts`: `isMismatch`, `SeedSlot`, `SeedGrant`, `AnnounceState`, `DECISIONS_KEY`,
     `SeededQuestion` and `makeSeededQuestion`. `DECISIONS_KEY` moves down because `SeededQuestion.ts` importing
     it from `QadiAtoms.ts` is a madge cycle ([ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md)),
     and `QadiAtoms.ts` still needs it for `invalidate`.
   - Stays: `HydrationEngine.ts` is the payload codec and imports `type SeedSlot`. `QadiAtoms.ts`'s build is one
     `makeSeededQuestion` call, and `seededDecision` and its local `DECISIONS_KEY` are deleted.
     `QadiRuntimeServices` stays in `QadiAtoms.ts`: it is a public alias of core's `StandingEvaluationServices`,
     which the new module names directly, so nothing about the alias needs to move.

3. **The rules that do not change.**
   - The seed is read through `seededIn(get.registry)`, never with `get(grantAtom)`. A seed given after the first
     read therefore does not re-run the computation, and an unhydrated question leaves no grant node.
   - Exactly one `Atom.readable` per question.
   - `live()` is the reader's first statement, so the question is counted live before its computation reads the
     subject.
   - The subject handed in is the `keepAlive`, `withEquality` atom itself, never a base from before those were
     applied.
   - `WeakMap<SeedGrant, SeededDecision>` is the only seed holder.
   - The module is out of the barrel ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)) and carries no
     `"use client"`.

4. **The liveness rule is stated once,** at `BookOptions.build` in `QuestionBook.ts`. `makeSeededQuestion`'s doc
   points there instead of restating it.

5. **The house-style budget follows the code.** `DECISION_READ_BUDGET` and its names keep the same count and the
   same name (`makeSeededQuestion`), keyed to `SeededQuestion.ts`, in the same change as the sentence in AGENTS.md
   §13 that names the file.

## Alternatives considered

- **1a, invert in place.** The same inversion, with the code left in `HydrationEngine.ts`. The link would be in one
  module, but that module is the payload codec: it grows from 588 to about 811 lines and gains `evaluate`,
  `CurrentSubject` and `Effect`, against its own header ("everything between a server's decision and the moment this
  client supersedes it"). Measured: src 1165 lines, the react suite 32 files and 503 tests passing, and, with two
  closing tests, `HydrationEngine.ts` at 0.9796 and `QadiAtoms.ts` at 0.9000, both at or above their bases. It is the
  cheaper of the two inversions in records, and it leaves ADR-QD-149's file citation true. It was passed over for the
  codec's sake.
- **2, a seed holder first.** A `SeedHolder` with `seededIn`, and `makeSeededQuestion({ seeds, computed, live })`.
  This removes the callback handed a callback and makes the grant properties testable on a bare registry. But the
  computing atom stays in `QadiAtoms.ts`, so the seed-to-evaluation link stays split and the four cases keep a fake
  computing atom (an `Atom.readable` in place of the real one). Measured: src 1183 lines, `QadiAtoms.ts` at 0.8909,
  below its base of 0.8966.
- **3, keep the seam and record a rejection.** Nothing built. The fake stays, the link stays split, and the liveness
  rule would be de-duplicated in comments only.

**The chosen option, measured.** Option 1b costs src 1177 to 1187 lines (`HydrationEngine.ts` 588, `QadiAtoms.ts` 352,
`SeededQuestion.ts` 247). The react suite is 33 files and 503 tests with none failing, `pnpm check:pr` exits 0, and the
30 end-to-end scenarios pass. At the phase base `HydrationEngine.ts` scored 0.9784 and `QadiAtoms.ts` 0.8966 under
Stryker. The five surviving mutants in the code that moves are equivalent ones, and they move to the new module with
it.

## Consequences

- No export of `@qadi/react` changes: every moved declaration is package-private, and no render sequence changes. The
  release shape is a `@qadi/react` patch.
- The seed-to-evaluation link is in one module and is tested through a real atom runtime, with the four fake
  computing atoms gone.
- `SeededQuestion.ts` is judged at the close by the survivors that moved with its code, never re-baselined: a new file
  carrying five equivalent survivors from its parents is not a new weakness.
- [ADR-QD-149](./149-a-seed-is-held-by-its-question.md) gets a dated amendment (its file citation becomes
  `SeededQuestion.ts`) and so does [ADR-QD-140](./140-a-gates-write-side-is-a-leaf-below-the-atom-set.md) (its
  import-edge list gains `SeededQuestion.ts`), both pointing here. Their earlier text is unchanged.
- [ADR-QD-103](./103-a-question-is-opened-once.md) ("the atom set is its one adapter") and
  [ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md) (the sweep, which names no seed file) stay true as
  written.
- [INV-QD-028](../invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer),
  [INV-QD-105](../invariants.md#inv-qd-105-a-live-question-is-never-evicted-and-one-question-has-one-handle-while-tracked),
  [INV-QD-317](../invariants.md#inv-qd-317-a-seed-outlives-a-registrys-idle-removal-but-never-the-clients-answer-or-its-questions-row)
  and
  [INV-QD-318](../invariants.md#inv-qd-318-a-registry-holds-a-grant-node-only-for-a-question-it-was-seeded-for)
  and BEH-QD-517 and BEH-QD-518 name `SeededQuestion.ts` as their source. No gate catches a stale citation (a gate
  run passed with every one still naming `HydrationEngine.ts`), so each is edited and checked by hand.

## Related

[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md),
[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-103](./103-a-question-is-opened-once.md),
[ADR-QD-140](./140-a-gates-write-side-is-a-leaf-below-the-atom-set.md),
[ADR-QD-148](./148-the-atom-set-owns-its-eviction-sweep.md),
[ADR-QD-149](./149-a-seed-is-held-by-its-question.md),
[INV-QD-028](../invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer),
[INV-QD-105](../invariants.md#inv-qd-105-a-live-question-is-never-evicted-and-one-question-has-one-handle-while-tracked),
[INV-QD-317](../invariants.md#inv-qd-317-a-seed-outlives-a-registrys-idle-removal-but-never-the-clients-answer-or-its-questions-row),
[INV-QD-318](../invariants.md#inv-qd-318-a-registry-holds-a-grant-node-only-for-a-question-it-was-seeded-for),
[BEH-QD-186](../behaviors/19-hydration.md), BEH-QD-517, BEH-QD-518.
