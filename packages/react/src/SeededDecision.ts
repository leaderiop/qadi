/**
 * What a server-rendered decision is, once it has crossed into a client.
 *
 * A seed is not a `Decision` ([ADR-QD-028](../../../spec/decisions/028-decision-hydration.md)):
 * it is a projection of one, carrying the verdict, the visible fields and the
 * obligations a UI acts on, and a trace only when the server chose to disclose
 * it. {@link SeededAllow} and {@link SeededDeny} say so in the type, so a reader
 * cannot take a withheld trace for an evaluated one, and no trace root or deny
 * reason has to be invented to make a seed look like what it is not.
 *
 * A leaf module, imported by `HydrationEngine.ts`, `SeededQuestion.ts` and
 * `DeveloperSignals.ts` (whose `HydrationMismatch` names a `SeededDecision`):
 * declaring these in the engine would make the warning module import it back,
 * and madge counts that type-only edge as a cycle (ADR-QD-037). Not in the
 * barrel; `Hydration.ts` re-exports by name what a consumer may hold.
 *
 * No `"use client"`: this must also run under a server render.
 */
import type { Allow, Deny, SubjectId } from "@qadi/core";
import { DecisionWireAllow, DecisionWireDeny } from "@qadi/core";
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";


/** The trace and reason were left out of the payload, as they are by default. */
const Withheld = Schema.TaggedStruct("Withheld", {});

/**
 * What a seeded allow knows about the server's trace.
 *
 * `Withheld` is the default and the security decision (BEH-QD-147): a trace
 * names every node's tag, its label and the sentence explaining why it refused,
 * readable by anyone with developer tools and by any script on the page.
 * `Disclosed` carries the server's own trace, when `dehydrateDecisions` was told
 * to ship it.
 *
 * Built from {@link DecisionWireAllow}'s own `trace` field, not a second
 * description of it (ADR-QD-002).
 */
export const AllowDisclosure = Schema.Union([
  Withheld,
  Schema.TaggedStruct("Disclosed", { trace: DecisionWireAllow.fields.trace }),
]);
export type AllowDisclosure = typeof AllowDisclosure.Type;

/**
 * What a seeded denial knows about the server's trace and reason.
 *
 * A denial's reason is the same disclosure as its trace in one sentence, so the
 * two are withheld together and disclosed together.
 */
export const DenyDisclosure = Schema.Union([
  Withheld,
  Schema.TaggedStruct("Disclosed", {
    trace: DecisionWireDeny.fields.trace,
    reason: DecisionWireDeny.fields.reason,
  }),
]);
export type DenyDisclosure = typeof DenyDisclosure.Type;

/**
 * The `DecisionWire` fields an allow entry and its seed do not carry.
 *
 * The subject lives on the envelope and on the seed's own `subjectId`, and the
 * trace is replaced by a `disclosure`.
 */
export const ALLOW_WITHHELD = ["subjectId", "trace"] as const;

/**
 * A deny entry withholds what an allow does, plus the two fields a denial
 * discloses only under `includeTrace`, inside its `disclosure`.
 *
 * A denial's `obligations` are always empty (BEH-QD-081, ADR-QD-019), so they are not carried.
 */
export const DENY_WITHHELD = [...ALLOW_WITHHELD, "obligations", "reason"] as const;

/**
 * An allow seed's fields, stated once: the wire's allow minus what it withholds, plus its disclosure.
 *
 * `_tag` is omitted because the class carries its own (ADR-QD-078). The payload
 * entry is built from these same fields, so the entry and the seed cannot
 * disagree (ARCH-91, ADR-QD-157, the ADR-QD-135 pattern). `visibleFields` is the
 * wire's optional key, absent when the server sent none, which means every
 * field (see `VisibleFields`).
 */
export const AllowSeedFields = Schema.Struct({
  ...Struct.omit(DecisionWireAllow.fields, ["_tag", ...ALLOW_WITHHELD]),
  disclosure: AllowDisclosure,
});

/**
 * A denial seed's fields, stated once: the wire's denial minus what it withholds, plus its disclosure.
 *
 * See {@link AllowSeedFields}; a denial carries no `visibleFields`, `obligations` or `reason` outside its disclosure.
 */
export const DenySeedFields = Schema.Struct({
  ...Struct.omit(DecisionWireDeny.fields, ["_tag", ...DENY_WITHHELD]),
  disclosure: DenyDisclosure,
});

/**
 * The server's allow, as this client received it.
 *
 * Not an `Allow`: there is no evaluation tree here unless the server disclosed
 * one, and `_tag: "SeededAllow"` is distinct from `"Allow"` so
 * `Match.tagsExhaustive` (ADR-QD-003) and `Equal` cannot confuse the two. Read
 * its verdict with {@link permits}. Its fields are {@link AllowSeedFields} plus
 * the subject.
 */
export class SeededAllow extends Data.TaggedClass("SeededAllow")<
  typeof AllowSeedFields.Type & { readonly subjectId: SubjectId }
> {}

/**
 * The server's denial, as this client received it. See {@link SeededAllow}.
 * Its fields are {@link DenySeedFields} plus the subject.
 */
export class SeededDeny extends Data.TaggedClass("SeededDeny")<
  typeof DenySeedFields.Type & { readonly subjectId: SubjectId }
> {}

/** A decision rebuilt from a payload, which is a projection and not an evaluation. */
export type SeededDecision = SeededAllow | SeededDeny;

/**
 * Anything a decision atom can hold: an evaluated decision, or a seeded one.
 *
 * Closed (ADR-QD-003): four distinct tags. A consumer comparing
 * `decision._tag === "Allow"` keeps compiling and now treats a seeded allow as
 * not allowed, which fails closed — it never grants anything. Read the verdict
 * with {@link permits}.
 */
export type ClientDecision = Allow | Deny | SeededAllow | SeededDeny;

/** The verdict of every case, exhaustively: a fifth tag is a compile error here. */
const verdictOf: (self: ClientDecision) => boolean = Match.type<ClientDecision>().pipe(
  Match.tagsExhaustive({
    Allow: () => true,
    SeededAllow: () => true,
    Deny: () => false,
    SeededDeny: () => false,
  }),
);

const seededOf: (self: ClientDecision) => boolean = Match.type<ClientDecision>().pipe(
  Match.tagsExhaustive({
    Allow: () => false,
    SeededAllow: () => true,
    Deny: () => false,
    SeededDeny: () => true,
  }),
);

/**
 * Whether a decision permits the action, evaluated or seeded.
 *
 * The one verdict read for a {@link ClientDecision}: `isAllowed` from
 * `@qadi/core` rejects one, on purpose, so the compiler finds every site that
 * would have read a seed as if it were an evaluation. A type predicate, so the
 * `false` branch narrows to the two denial classes.
 */
export const permits = (self: ClientDecision): self is Allow | SeededAllow => verdictOf(self);

/** Whether a decision is a server seed rather than this client's own evaluation. */
export const isSeeded = (self: ClientDecision): self is SeededDecision => seededOf(self);
