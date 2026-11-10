/**
 * Turns an `AuditPortReply` into the effect a scripted audit double returns.
 *
 * Package-private (AGENTS.md §9, ADR-QD-099): both doubles import it, the
 * barrel does not, so the one place a reply's meaning lives is not a public
 * name. Built once at module scope (AGENTS.md §5a); each arm returns a function
 * of the double's normal behaviour (`ok`) and the port's own error builder
 * (`fail`).
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import type { AuditPortReply } from "./AuditPortReply.ts";

/** A reply's effect, given what `Ok` does and how the port's error is built. */
export type AuditPortAnswer = <A, E>(
  ok: Effect.Effect<A, E>,
  fail: (cause: unknown) => E,
) => Effect.Effect<A, E>;

// A helper, not a bare arrow: an arm would otherwise infer a non-generic type.
const answer = (f: AuditPortAnswer): AuditPortAnswer => f;

export const answerReply: (reply: AuditPortReply) => AuditPortAnswer = Match.type<AuditPortReply>().pipe(
  Match.tagsExhaustive({
    Ok: () => answer((ok) => ok),
    Fail: (reply) => answer((_ok, fail) => Effect.fail(fail(reply.cause))),
    Die: (reply) => answer(() => Effect.die(reply.defect)),
    Interrupt: () => answer(() => Effect.interrupt),
    Never: () => answer(() => Effect.never),
    Latch: (reply) => answer(() => Effect.andThen(reply.latch.open, Effect.never)),
  }),
);
