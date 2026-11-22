/**
 * The hydration payload codec, in both directions.
 *
 * That is `dehydrateWith` and `hydrateWith`. Each direction is a module-private
 * planner returning the `HydrationEvent`s a call implies, and `HydrationEvent.ts`
 * is the one place those become counts and reports (ARCH-60). The seed slot a
 * question keeps its seeds in, the rule that the client's own answer wins
 * ([INV-QD-028](../../../spec/invariants.md)) and the once-per-registry
 * announcement of a disagreement are `SeededQuestion.ts`'s (ADR-QD-155); this
 * module fills a slot through {@link HydrationSeedLookup} and does nothing else
 * with a seed.
 *
 * Private, and out of the barrel on purpose (AGENTS.md §9,
 * [ADR-QD-039](../../../spec/decisions/039-a-seed-is-not-an-authority.md)): a
 * consumer that could reach a seed slot could write an authorization decision
 * straight into the registry, bypassing the subject check and the evaluator.
 * `Hydration.ts` is the public interface over this module and re-exports by name
 * only what a consumer may hold. This file imports nothing from `Hydration.ts`,
 * `QadiAtoms.ts` or `QadiProvider.tsx`, so no cycle (counting `import type`
 * edges, ADR-QD-037) can form through it.
 *
 * **A seed is not a `Decision`**: `SeededDecision.ts` holds the closed types
 * that say so, and this module rebuilds one from a payload without inventing a
 * trace root or a deny reason to make it look like an evaluation.
 *
 * No `"use client"`: this must also run under a server render.
 */
import type {
  AuthSubject,
  Decision,
  DecisionClaim,
  DecisionWire,
  DehydrationDropReason,
  Policy,
  Resource,
  SubjectId,
} from "@qadi/core";
import {
  decisionDisagreement,
  Policy as PolicySchema,
  encodeDecision,
  untrustedDecoder,
} from "@qadi/core";
import type { UntrustedValueRefusal } from "@qadi/core";
import * as Data from "effect/Data";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as Atom from "effect/reactivity/Atom";
import type { HydrationDropReporter } from "./DeveloperSignals.ts";
import { hydrationDropReporter, saysDehydrationDropped, saysHydrationDropped } from "./DeveloperSignals.ts";
import { dehydrationBuckets, dropEvents, entryBuckets } from "./HydrationBuckets.ts";
import type { DecisionEntry, EntryDropReason, HydrationHooks, PayloadRefusalReason } from "./HydrationEvent.ts";
import { HydrationEvent, emitHydration } from "./HydrationEvent.ts";
import type { SeededDecision } from "./SeededDecision.ts";
import { ALLOW_WITHHELD, AllowSeedFields, DENY_WITHHELD, DenySeedFields, SeededAllow, SeededDeny } from "./SeededDecision.ts";
import type { SeedSlot } from "./SeededQuestion.ts";

// Named here rather than reached through the barrel: `DeveloperSignals.ts` stays
// out of it (AGENTS.md §9), and `.d.ts` emission has to be able to name them.
export type { HydrationMismatch, HydrationMismatchReporter } from "./DeveloperSignals.ts";
export type { DecisionEntry } from "./HydrationEvent.ts";

/** Seed values applied when the provider creates its registry. */
export type InitialValues = Iterable<readonly [Atom.Atom<unknown>, unknown]>;

// ---------------------------------------------------------------------------
// The payload
// ---------------------------------------------------------------------------

/**
 * One decision's wire form inside a payload: the seed's fields under the wire's tag.
 *
 * The subject lives on the envelope instead of each entry, and the trace (and,
 * for a denial, the reason) is replaced by a `disclosure`. The entry is built from
 * the seed's own fields, so the payload and the seed read one statement and no
 * field list is written twice (ARCH-91).
 */
const AllowEntry = Schema.TaggedStruct("Allow", AllowSeedFields.fields);

const DenyEntry = Schema.TaggedStruct("Deny", DenySeedFields.fields);

/**
 * One entry of a version-2 payload.
 *
 * `policy` is declared as `Schema.Unknown` rather than left off so decoding with
 * the module's strict decode — `onExcessProperty: "error"` — flags a
 * genuinely unrecognized key without also flagging `policy` itself. It has its
 * own decode path (`decodePolicy`) because it needs a type transformation
 * this struct does not perform, and folding it in would run `PolicySchema` a
 * second time.
 */
const DehydratedEntryWire = Schema.Struct({
  policy: Schema.Unknown,
  resource: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  decision: Schema.Union([AllowEntry, DenyEntry]),
});

/** One dehydrated entry. `policy` is a plain JSON value, not a `Policy`. */
export type DehydratedEntry = typeof DehydratedEntryWire.Type;

/** The payload's version: the only one `hydrateWith` reads (ADR-QD-078). */
const PAYLOAD_VERSION = 2;

const DehydratedDecisionsWire = Schema.Struct({
  version: Schema.Literal(PAYLOAD_VERSION),
  subjectId: Schema.optional(Schema.String),
  entries: Schema.Array(DehydratedEntryWire),
});

/**
 * A serializable projection of decisions, bound to one subject.
 *
 * Named for what it is. It is **not** `ReadonlyArray<Decision>`: the trace and a
 * denial's reason are withheld unless disclosed, so a hydrated decision is not
 * equal to the one the server made. It carries the same verdict, visible fields
 * and obligations — the things a UI acts on.
 *
 * `subjectId` is the subject these decisions were made for, checked on
 * hydration. **`undefined` means an empty payload** — `dehydrateDecisions([])`,
 * with no entries to name a subject — and is not itself a subject id
 * (EC-06): `""` would look like data a caller could key a cache on, when it
 * means "there is nothing here". A real subject id is never empty.
 */
export type DehydratedDecisions = typeof DehydratedDecisionsWire.Type;

/**
 * The envelope alone, with entries left as `unknown`.
 *
 * Entries are decoded one at a time so a bad one is dropped by itself rather
 * than taking the payload with it.
 */
const Envelope = DehydratedDecisionsWire.mapFields(
  Struct.assign({ entries: Schema.Array(Schema.Unknown) }),
);

/**
 * Encoding a typed policy **can** fail, so this side returns an `Option` too.
 *
 * The public constructors accept policies the schema refuses — `gte(NaN)`,
 * `gte(-Infinity)`, `hasRelationship(…, { depth: 1.5 })` — and an encode that
 * threw would crash a server's render. An entry whose policy does not encode is
 * left out as `UnencodablePolicy` instead (ARCH-60).
 */
const encodePolicy = Schema.encodeOption(PolicySchema);

/**
 * Every untrusted read in this module goes through `UntrustedDecode.ts`'s
 * decoder: the depth guard, then the strict decode, in that order, so a payload
 * nested past the call stack's limit is a typed refusal rather than a raw
 * `RangeError` defect. Decoding is the untrusted side, so a malformed value is
 * dropped rather than thrown on — the same fail-closed treatment a mismatched
 * subject gets.
 *
 * The envelope decoder leaves `entries` unwalked and each entry is guarded from
 * its own root by the entry decoder (INV-QD-306), which is what keeps one
 * hostile entry from refusing the payload or its siblings. The entry's `policy`
 * is then decoded again from its own root: that entry-then-policy double check
 * is deliberate and measured (ADR-QD-143), and it is why the policy decoder's
 * `TooDeep` arm is the same code the entry decoder's is.
 */
const decodePolicy = untrustedDecoder(PolicySchema, { unknownKeys: "refuse" }).decode;

/**
 * A payload whose `version` is not {@link PAYLOAD_VERSION}, raised by the
 * envelope decoder's `prepare`: a refusal of this module's own, beside the
 * decoder's `TooDeep` and `Malformed`, so `prepare` fails without a cast.
 */
type PayloadVersionRefusal = Data.TaggedEnum<{ UnsupportedPayloadVersion: {} }>;
const PayloadVersionRefusal = Data.taggedEnum<PayloadVersionRefusal>();

/**
 * Only `version: 2` is read. Any other value — or none, the format 0.9 and
 * earlier wrote, whose reader 0.11.0 removed (ADR-QD-078's 2026-10-06
 * amendment) — is a format this client does not read, which is not the same as
 * a malformed one and is the signature of mismatched releases. A value that is
 * not an object (an array included) passes through for the decode to call
 * malformed.
 */
const checkVersion = (input: unknown): Result.Result<unknown, PayloadVersionRefusal> =>
  Predicate.isObject(input) && (!Object.hasOwn(input, "version") || input["version"] !== PAYLOAD_VERSION)
    ? Result.fail(PayloadVersionRefusal.UnsupportedPayloadVersion())
    : Result.succeed(input);

/**
 * The payload decoder. `entries` is unwalked, since each entry is guarded from its
 * own root below (INV-QD-306), and the version is checked after the guard and
 * before the strict decode, so a version-3 payload nested past the bound is
 * `PayloadTooDeep`, not `UnsupportedPayloadVersion` (BEH-QD-488).
 */
const decodeEnvelope = untrustedDecoder(Envelope, {
  unknownKeys: "refuse",
  unwalked: ["entries"],
  prepare: checkVersion,
}).decode;

/**
 * What raises a whole-payload refusal: one of the payload decoder's own
 * refusals, by tag, or the subject check.
 */
type PayloadProducer = (UntrustedValueRefusal | PayloadVersionRefusal)["_tag"] | "SubjectCheck";

/**
 * Each whole-payload refusal reason, and the producer that raises it.
 *
 * One row per reason of core's drop-reason table of kind `payload`, so a
 * `payload` row the table gains does not compile here until its producer is
 * stated: the guarantee the two bucket records give the other two kinds
 * (ADR-QD-183, amending ADR-QD-152's consequence that such a row compiled
 * everywhere). Exported only for its conformance test, the module being
 * package-private.
 */
export const PAYLOAD_PRODUCERS = {
  PayloadSubjectMismatch: "SubjectCheck",
  UnsupportedPayloadVersion: "UnsupportedPayloadVersion",
  MalformedPayload: "Malformed",
  PayloadTooDeep: "TooDeep",
} satisfies { readonly [R in PayloadRefusalReason]: PayloadProducer };

/** The union itself when it has exactly one member, `never` otherwise. */
type OnlyMember<U, All = U> = U extends unknown ? ([All] extends [U] ? U : never) : never;

/**
 * The one reason whose row in {@link PAYLOAD_PRODUCERS} names `P`, and `never`
 * when no row does or two rows do.
 */
type ReasonRaisedBy<P extends PayloadProducer> = OnlyMember<
  {
    readonly [R in PayloadRefusalReason]: (typeof PAYLOAD_PRODUCERS)[R] extends P ? R : never;
  }[PayloadRefusalReason]
>;

/**
 * Each producer, and the reason its refusal is reported under: the inverse of
 * {@link PAYLOAD_PRODUCERS}, checked against it. A producer no row names, or two
 * rows name, types its slot `never`, and a decoder refusal with no slot is a
 * missing property, so the two directions cannot disagree. Indexed by the
 * refusal's own tag, so it needs no `Object.hasOwn` (AGENTS.md section 5a, as
 * `VERDICTS`).
 */
const PAYLOAD_REASONS: { readonly [P in PayloadProducer]: ReasonRaisedBy<P> } = {
  TooDeep: "PayloadTooDeep",
  Malformed: "MalformedPayload",
  UnsupportedPayloadVersion: "UnsupportedPayloadVersion",
  SubjectCheck: "PayloadSubjectMismatch",
};

const decodeEntry = untrustedDecoder(DehydratedEntryWire, { unknownKeys: "refuse" }).decode;

/**
 * Where a refused entry read lands: `TooDeep` is `EntryTooDeep` whichever read
 * raised it, `Malformed` is `malformed`, the reason of the read that did
 * (`MalformedEntry` for the entry, `UndecodablePolicy` for the policy). Shared by
 * both reads.
 */
const entryDropReason = (refusal: UntrustedValueRefusal, malformed: EntryDropReason): EntryDropReason =>
  Match.value(refusal).pipe(
    Match.tagsExhaustive({
      TooDeep: (): EntryDropReason => "EntryTooDeep",
      Malformed: (): EntryDropReason => malformed,
    }),
  );

export interface DehydrateOptions {
  /**
   * Ship the full trace, and a denial's reason.
   *
   * Off by default, and the default is the security decision. A trace names every
   * node's tag, its label and the sentence explaining why it refused — a
   * description of the policy's internal structure plus which branch this subject
   * failed, readable by anyone with developer tools and by any script on the page.
   * Withheld, an entry carries `disclosure: { _tag: "Withheld" }` and neither.
   */
  readonly includeTrace?: boolean;
  /**
   * Called with the entries left out of the payload, and why — once per reason,
   * with `wholePayload` always `false` (a server builds a payload; it never
   * refuses one whole).
   *
   * The same `HydrationDrop` shape `HydrateOptions.onDropped` receives, so one
   * function over `HydrationDropReason` serves both ends. Supplying this replaces
   * the development-mode console warning and runs in production, exactly as
   * `onHydrationMismatch` does — an entry left out means something upstream fed
   * this call another user's decision or built a policy the schema cannot carry,
   * which is a bug worth alerting on rather than only logging.
   *
   * It observes; it cannot change the outcome. The entries are left out either
   * way ([BEH-QD-146](../../../spec/behaviors/19-hydration.md)) — the only safe
   * reading of a mixed payload is to trust none of it.
   */
  readonly onDropped?: HydrationDropReporter<DecisionEntry, DehydrationDropReason>;
}

/** A wire verdict: the closed set of tags `encodeDecision` produces. */
type WireVerdict = DecisionWire["_tag"];
type WireOf = { readonly [V in WireVerdict]: Extract<DecisionWire, { readonly _tag: V }> };
type EntryOf = { readonly [V in WireVerdict]: Extract<DehydratedEntry["decision"], { readonly _tag: V }> };
type SeedOf = { readonly Allow: SeededAllow; readonly Deny: SeededDeny };
type DisclosedOf = {
  readonly [V in WireVerdict]: Extract<EntryOf[V]["disclosure"], { readonly _tag: "Disclosed" }>;
};

/** What one verdict does at the three places the Allow/Deny branch used to be written. */
interface Row<V extends WireVerdict> {
  readonly entry: (wire: WireOf[V], includeTrace: boolean) => EntryOf[V];
  readonly seed: (entry: EntryOf[V], subjectId: SubjectId) => SeedOf[V];
  readonly claim: (entry: EntryOf[V], disclosure: DisclosedOf[V]) => DecisionClaim;
}

/**
 * Each wire verdict's row: its payload entry, its seed and its claim against a disclosed trace.
 *
 * The Allow/Deny branch was written in `dehydrateDecision`, `rebuild` and
 * `entryAgrees`. A mapped type over `DecisionWire["_tag"]` makes a verdict
 * without a row a compile error, the closed-table pattern of `FieldLattice.ts`
 * (ADR-QD-092) and `HYDRATION_DROP_TABLE` (ADR-QD-152). The entry is built from
 * `encodeDecision`'s value, never from a struct's keys, because that value's key
 * order is the payload's bytes. The deny claim's `obligations: []` and the
 * reason from the disclosure are `entryAgrees`' rule, unchanged (INV-QD-170)
 * (ARCH-91, ADR-QD-157).
 */
const VERDICTS: { readonly [V in WireVerdict]: Row<V> } = {
  Allow: {
    entry: (wire, includeTrace) => ({
      ...Struct.omit(wire, ALLOW_WITHHELD),
      disclosure: includeTrace ? { _tag: "Disclosed", trace: wire.trace } : { _tag: "Withheld" },
    }),
    seed: (entry, subjectId) => new SeededAllow({ ...entry, subjectId }),
    claim: (entry) => ({ verdict: "Allow", visibleFields: entry.visibleFields, obligations: entry.obligations }),
  },
  Deny: {
    entry: (wire, includeTrace) => ({
      ...Struct.omit(wire, DENY_WITHHELD),
      disclosure: includeTrace
        ? { _tag: "Disclosed", trace: wire.trace, reason: wire.reason }
        : { _tag: "Withheld" },
    }),
    seed: (entry, subjectId) => new SeededDeny({ ...entry, subjectId }),
    claim: (_entry, disclosure) => ({ verdict: "Deny", reason: disclosure.reason, obligations: [] }),
  },
};

/** The one place a verdict becomes its row, generic so a call keeps its value and its row correlated. */
const rowOf = <V extends WireVerdict>(tag: V): Row<V> => VERDICTS[tag];

const entryOf = <V extends WireVerdict>(wire: WireOf[V] & { readonly _tag: V }, includeTrace: boolean): EntryOf[V] =>
  rowOf(wire._tag).entry(wire, includeTrace);

const seedOf = <V extends WireVerdict>(entry: EntryOf[V] & { readonly _tag: V }, subjectId: SubjectId): SeedOf[V] =>
  rowOf(entry._tag).seed(entry, subjectId);

const claimOf = <V extends WireVerdict>(
  entry: EntryOf[V] & { readonly _tag: V },
  disclosure: DisclosedOf[V],
): DecisionClaim => rowOf(entry._tag).claim(entry, disclosure);

const dehydrateDecision = (decision: Decision, includeTrace: boolean): DehydratedEntry["decision"] =>
  entryOf(encodeDecision(decision), includeTrace);

/**
 * One decision as a payload entry, or `None` when its policy does not encode.
 *
 * Derived from `encodeDecision`, so the fields a decision ships are the ones
 * `@qadi/core` says it has. The trace, and a denial's reason, ship only under
 * `includeTrace`. Reached only through {@link dehydrateWith}.
 */
const dehydrateEntry = (entry: DecisionEntry, includeTrace: boolean): Option.Option<DehydratedEntry> =>
  Option.map(encodePolicy(entry.policy), (policy) => ({
    policy,
    resource: entry.resource,
    decision: dehydrateDecision(entry.decision, includeTrace),
  }));

/** Emits a call's events in order. */
const emitAll = (events: ReadonlyArray<HydrationEvent>, hooks: HydrationHooks): void => {
  for (const event of events) emitHydration(event, hooks);
};

/**
 * What {@link dehydrateWith} produces, and the events it implies.
 *
 * Pure: writes no metric and calls no reporter. Private on purpose: were it
 * exported, a second caller could build a payload that skipped the subject
 * filter, its count or its report (ARCH-51, ADR-QD-078).
 *
 * The first entry's `subjectId` names the payload and any entry disagreeing with
 * it is **dropped**, because a payload mixing subjects is a bug whose only safe
 * reading is to trust none of it. Of the rest, an entry whose policy does not
 * encode is left out as `UnencodablePolicy`, so the call is total: one
 * `LeftOut` per non-empty reason, then `Dehydrated` for what was written. The
 * left-out events come from the side's bucket record.
 */
const planDehydration = (
  entries: ReadonlyArray<DecisionEntry>,
  includeTrace: boolean,
): { readonly payload: DehydratedDecisions; readonly events: ReadonlyArray<HydrationEvent> } => {
  // `undefined`, not `""` (EC-06): an empty `entries` names no subject at
  // all, and `""` is not a value `SubjectId` can actually hold, so it read as
  // data rather than as "nothing here." `subjectId` is `undefined` only when
  // `entries` is already empty, so the loop below sees no entry in that case
  // and needs no special-casing.
  const subjectId = entries[0]?.decision.subjectId;

  // The subject filter first, so a foreign entry is never encoded and an entry
  // both foreign and unencodable is `ForeignSubject`.
  const drops = dehydrationBuckets();
  const written: Array<DehydratedEntry> = [];
  for (const entry of entries) {
    if (entry.decision.subjectId !== subjectId) {
      drops.ForeignSubject.push(entry);
      continue;
    }
    const encoded = dehydrateEntry(entry, includeTrace);
    if (Option.isSome(encoded)) written.push(encoded.value);
    else drops.UnencodablePolicy.push(entry);
  }

  // Said, not merely done. Dropping is correct and specified; doing it in
  // silence is what let a server ship one row where it meant to ship a thousand
  // and see nothing wrong. And counted: `qadi_hydration_seeded_total` next to the
  // dehydrated count is the difference between "hydration ran" and "hydration
  // ran and did nothing".
  const events: ReadonlyArray<HydrationEvent> = [
    ...dropEvents(drops, (reason, entries) => HydrationEvent.LeftOut({ reason, entries })),
    HydrationEvent.Dehydrated({ count: written.length }),
  ];

  return { payload: { version: PAYLOAD_VERSION, subjectId, entries: written }, events };
};

/**
 * Projects decisions into a version-2 payload bound to one subject, dropping,
 * counting and reporting every entry decided for another or whose policy does
 * not encode. Never throws.
 *
 * The mirror of {@link hydrateWith}. It owns both the subject filter and the
 * envelope, so a payload cannot be built from unfiltered entries (ARCH-51,
 * ADR-QD-078). Counts go to the default registry and the default warning to the
 * console, both through `HydrationEvent.ts` (ADR-QD-052, ADR-QD-041), after the
 * payload is built.
 */
export const dehydrateWith = (
  entries: ReadonlyArray<DecisionEntry>,
  options?: DehydrateOptions,
): DehydratedDecisions => {
  const plan = planDehydration(entries, options?.includeTrace ?? false);
  emitAll(plan.events, { leftOut: hydrationDropReporter(options?.onDropped, saysDehydrationDropped) });
  return plan.payload;
};

const rebuild = (entry: DehydratedEntry, subjectId: SubjectId): SeededDecision =>
  seedOf(entry.decision, subjectId);

/**
 * Whether an entry's disclosed trace agrees with the entry, and is its policy's.
 *
 * A disclosed trace names the root policy it traced, and the evaluator's root
 * tag is always the policy's own `_tag`. One that says otherwise is not a trace
 * of this entry's policy — hand-built, or spliced from another entry — so the
 * entry is refused rather than seeded with it.
 *
 * The entry also repeats the verdict, `visibleFields`, `obligations` and
 * (a denial's) `reason` that the trace root already holds. `@qadi/core`'s
 * {@link decisionDisagreement} is the one rule for whether two such copies
 * agree; the verdict's row in {@link VERDICTS} only shapes the claim, and a seed that disagrees with the
 * trace it carries is refused the same way (INV-QD-170). A `Withheld` seed has
 * no trace, so its fields are the only copy and there is nothing to compare.
 */
const entryAgrees = (entry: DehydratedEntry, policy: Policy): boolean => {
  const decision = entry.decision;
  if (decision.disclosure._tag !== "Disclosed") return true;
  if (decision.disclosure.trace.policyTag !== policy._tag) return false;
  return decisionDisagreement(claimOf(decision, decision.disclosure), decision.disclosure.trace) === undefined;
};

export interface HydrateOptions {
  /**
   * Called with the entries this client refused to seed, and why.
   *
   * The sibling of `DehydrateOptions.onDropped`, in the same `HydrationDrop`
   * shape, and it carries a reason because
   * the ways a payload fails to seed have different causes: the payload naming
   * another subject is a cache-key bug, an entry malformed apart from its policy is usually version skew, an
   * undecodable policy is version skew of the policy shape specifically, a payload
   * of a `version` this client does not read — or of none, the pre-0.10 format —
   * is mismatched releases or a deploy in flight, a payload that
   * is not an envelope at all is not something a well-behaved server produces, and
   * neither is an entry nested past the structural depth guard. A bare count
   * cannot tell them apart, and each wants a different fix.
   *
   * The entries are `unknown`, because they are what failed to decode: nothing
   * about them can be assumed.
   *
   * Supplying this replaces the development-mode console warning and runs in
   * production, exactly as `DehydrateOptions.onDropped` and `onHydrationMismatch`
   * do.
   *
   * It observes; it cannot change the outcome. The entries are not seeded either
   * way — the only safe reading of a payload that cannot be verified is to ask
   * the questions again.
   */
  readonly onDropped?: HydrationDropReporter<unknown>;
}

/** What a hydration seeds, and the events it implies. */
interface HydrationPlan {
  readonly initialValues: InitialValues;
  readonly events: ReadonlyArray<HydrationEvent>;
}

/**
 * What {@link hydrateWith} seeds, and the events it implies.
 *
 * Pure: writes no metric and calls no reporter, so nothing a reporter does can
 * stop an entry being seeded or counted. Private, like {@link planDehydration}.
 * Every refused entry is collected in the side's bucket record, and the drop
 * events come from that record alone.
 */
const planHydration = (seedFor: HydrationSeedLookup, payload: unknown, subject: AuthSubject): HydrationPlan => {
  // The count rule — a refused payload is at least one drop — is the
  // `PayloadRefused` arm's, not this function's (INV-QD-045).
  const refuse = (reason: PayloadRefusalReason, entries: ReadonlyArray<unknown>): HydrationPlan => ({
    initialValues: [],
    events: [HydrationEvent.PayloadRefused({ reason, entries })],
  });

  const visible: ReadonlyArray<unknown> =
    Predicate.isObject(payload) && Array.isArray(payload["entries"]) ? payload["entries"] : [];

  const envelope = decodeEnvelope(payload);
  if (Result.isFailure(envelope)) {
    return refuse(PAYLOAD_REASONS[envelope.failure._tag], visible);
  }
  const { subjectId, entries } = envelope.success;

  // `undefined` names an empty payload (EC-06), not a subject that failed to
  // match — there is nothing to seed and nothing to warn about, the same
  // fail-quiet outcome as a genuinely empty `entries`. A payload that lied —
  // `subjectId: undefined` alongside real `entries` — still gets no trust:
  // there is no subject here to check them against, so they are dropped the same
  // way a real mismatch drops them, just without asserting a wrong id that was
  // never named.
  if (subjectId === undefined) {
    return entries.length > 0
      ? refuse(PAYLOAD_REASONS.SubjectCheck, entries)
      : { initialValues: [], events: [] };
  }

  // The whole payload is rejected on a subject mismatch, not entry by entry: the
  // id is a property of the payload, so one wrong id means the wrong page. The
  // entries are handed back whole; unlike the dehydrate side this discloses
  // nothing new — they are the caller's own argument, returned to them — so only
  // the *default* reporter withholds them.
  if (subjectId !== subject.id) return refuse(PAYLOAD_REASONS.SubjectCheck, entries);

  const seeded: Array<readonly [Atom.Atom<unknown>, unknown]> = [];
  const drops = entryBuckets();

  for (const entry of entries) {
    const fields = decodeEntry(entry);
    // Checked before the policy: an entry malformed at this level — a string
    // where durationMillis belongs, an obligations value that isn't an array, a
    // disclosure of the wrong shape — is a different failure than a policy shape
    // this schema doesn't know, and warrants its own reason.
    if (Result.isFailure(fields)) {
      drops[entryDropReason(fields.failure, "MalformedEntry")].push(entry);
      continue;
    }

    const decoded = decodePolicy(fields.success.policy);
    // Collected rather than reported one at a time: a version skew makes *every*
    // entry of a shape undecodable, and one warning per entry would bury the
    // page's other output under a payload's worth of identical lines.
    if (Result.isFailure(decoded)) {
      drops[entryDropReason(decoded.failure, "UndecodablePolicy")].push(entry);
      continue;
    }

    if (!entryAgrees(fields.success, decoded.success)) {
      drops.MalformedEntry.push(entry);
      continue;
    }

    seeded.push(seedFor(decoded.success, fields.success.resource).hold(rebuild(fields.success, subject.id)));
  }

  const events: ReadonlyArray<HydrationEvent> = [
    ...dropEvents(drops, (reason, entries) => HydrationEvent.EntriesDropped({ reason, entries })),
    HydrationEvent.Seeded({ count: seeded.length }),
  ];

  return { initialValues: seeded, events };
};

/**
 * Turns a payload into `initialValues`, seeding what it can verify.
 *
 * `payload` is `unknown` on purpose: it arrives as JSON in a page, and
 * `JSON.parse` yields `any`, so a type on the parameter protects nothing. This
 * **never throws** — every exit is a drop that is counted and announced
 * (BEH-QD-230, INV-QD-045), including a payload that is not an object, has no
 * `entries` array, or names a version this client does not read — or none.
 *
 * Drops every entry whose shape or policy this client cannot verify, and the
 * whole payload when it names another subject. A dropped entry leaves its atom
 * `Initial`, so the client asks the question properly — the page flashes, which
 * is exactly what would have happened without hydration and is the correct
 * outcome for a payload that cannot be verified. Not throwing is deliberate: a
 * cache serving one user's page to another is a misconfiguration, and turning it
 * into a blank page would be a worse outcome than re-deciding. Trusting it would
 * be a breach.
 *
 * Held by the question's seed slot, never written to the decision atom. See
 * `makeSeededQuestion` (`SeededQuestion.ts`).
 *
 * `seedFor` is the atom set's own closure over its families
 * (`QadiAtoms.hydrate`), so the seed slots stay unreachable from outside it
 * (ADR-QD-039) without a module-scope side table keyed on the atom set.
 */
export const hydrateWith = (
  seedFor: HydrationSeedLookup,
  payload: unknown,
  subject: AuthSubject,
  options?: HydrateOptions,
): InitialValues => {
  const plan = planHydration(seedFor, payload, subject);
  // Emitted after the whole plan, never interleaved with it.
  emitAll(plan.events, { dropped: hydrationDropReporter(options?.onDropped, saysHydrationDropped) });
  return plan.initialValues;
};

/** Finds the slot standing behind one decision. Closure-private to an atom set. */
export type HydrationSeedLookup = (policy: Policy, resource: Resource | undefined) => SeedSlot;
