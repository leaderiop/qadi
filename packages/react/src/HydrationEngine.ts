/**
 * Everything between a server's decision and the moment this client supersedes it.
 *
 * That is the payload codec in both directions (`dehydrateWith` and
 * `hydrateWith`), the seed atom a server-rendered decision is written to, the
 * rule that the client's own answer wins
 * ([INV-QD-028](../../../spec/invariants.md)), the once-per-registry
 * announcement of a disagreement. Each codec direction is a module-private
 * planner returning the `HydrationEvent`s a call implies, and `HydrationEvent.ts`
 * is the one place those become counts and reports (ARCH-60). It used to be spread
 * over `Hydration.ts`, a module-scope side table keyed on the atom set, and
 * `QadiAtoms.ts`'s `seededDecision`, tangled there with the liveness bookkeeping
 * the eviction sweep needs, which is not hydration at all.
 *
 * Private, and out of the barrel on purpose (AGENTS.md §9,
 * [ADR-QD-039](../../../spec/decisions/039-a-seed-is-not-an-authority.md)): a
 * consumer that could reach a seed atom could write an authorization decision
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
  DehydrationDropReason,
  Policy,
  Resource,
  SubjectId,
} from "@qadi/core";
import {
  DecisionWireAllow,
  DecisionWireDeny,
  decisionDisagreement,
  Policy as PolicySchema,
  encodeDecision,
  isAllowed,
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
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { HydrationDropReporter, HydrationMismatchReporter } from "./DeveloperSignals.ts";
import { hydrationDropReporter, saysDehydrationDropped, saysHydrationDropped } from "./DeveloperSignals.ts";
import type { DecisionEntry, EntryDropReason, HydrationHooks, PayloadRefusalReason } from "./HydrationEvent.ts";
import { HydrationEvent, emitHydration } from "./HydrationEvent.ts";
import type { ClientDecision, SeededDecision } from "./SeededDecision.ts";
import { AllowDisclosure, DenyDisclosure, SeededAllow, SeededDeny, permits } from "./SeededDecision.ts";

// Named here rather than reached through the barrel: `DeveloperSignals.ts` stays
// out of it (AGENTS.md §9), and `.d.ts` emission has to be able to name them.
export type { HydrationMismatch, HydrationMismatchReporter } from "./DeveloperSignals.ts";
export type { DecisionEntry } from "./HydrationEvent.ts";

/** Seed values applied when the provider creates its registry. */
export type InitialValues = Iterable<readonly [Atom.Atom<unknown>, unknown]>;

/**
 * Whether the two answers disagree.
 *
 * The **verdict** only. Two allows differing in `visibleFields` or obligations
 * are not a mismatch: what a developer sees, and what this exists to explain,
 * is a control appearing and then disappearing. Field-set differences would
 * report every projection difference as a wiring problem.
 */
export const isMismatch = (seeded: SeededDecision, decided: Decision): boolean =>
  permits(seeded) !== isAllowed(decided);

// ---------------------------------------------------------------------------
// The payload
// ---------------------------------------------------------------------------

/**
 * The `DecisionWire` fields an allow entry does not carry: the subject lives on
 * the envelope and the trace is replaced by a `disclosure`.
 */
const ALLOW_WITHHELD = ["subjectId", "trace"] as const;

/**
 * A deny entry withholds what an allow does, plus the two fields a denial
 * discloses only under `includeTrace`, inside its `disclosure`.
 */
const DENY_WITHHELD = ["subjectId", "trace", "obligations", "reason"] as const;

/**
 * One decision's wire form inside a payload, derived from `DecisionWire`.
 *
 * The subject lives on the envelope instead of each entry, and the trace (and,
 * for a denial, the reason) is replaced by a `disclosure` — so what is left of
 * the wire shape is whatever `@qadi/core` says it is, with no field list written
 * twice.
 */
const AllowEntry = DecisionWireAllow.mapFields((fields) => ({
  ...Struct.omit(fields, ALLOW_WITHHELD),
  disclosure: AllowDisclosure,
}));

const DenyEntry = DecisionWireDeny.mapFields((fields) => ({
  ...Struct.omit(fields, DENY_WITHHELD),
  disclosure: DenyDisclosure,
}));

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
const decodePolicy = untrustedDecoder(PolicySchema).decode;

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
 * `PayloadTooDeep`, not `UnsupportedPayloadVersion` (D-04, D-07).
 */
const decodeEnvelope = untrustedDecoder(Envelope, { unwalked: ["entries"], prepare: checkVersion }).decode;

/** The decoder's refusal as the reason the payload is refused with. */
const payloadRefusalReason: (refusal: UntrustedValueRefusal | PayloadVersionRefusal) => PayloadRefusalReason =
  Match.type<UntrustedValueRefusal | PayloadVersionRefusal>().pipe(
    Match.tagsExhaustive({
      TooDeep: (): PayloadRefusalReason => "PayloadTooDeep",
      Malformed: (): PayloadRefusalReason => "MalformedPayload",
      UnsupportedPayloadVersion: (): PayloadRefusalReason => "UnsupportedPayloadVersion",
    }),
  );

const decodeEntry = untrustedDecoder(DehydratedEntryWire).decode;

const tooDeepEntry = (): EntryDropReason => "EntryTooDeep";
const asMalformed = (malformed: EntryDropReason): EntryDropReason => malformed;

/**
 * Where a refused entry read lands: `TooDeep` is `EntryTooDeep` whichever read
 * raised it, `Malformed` is the reason of the read that did (`MalformedEntry`
 * for the entry, `UndecodablePolicy` for the policy). Shared by both reads.
 */
const entryDropReason: (refusal: UntrustedValueRefusal) => (malformed: EntryDropReason) => EntryDropReason =
  Match.type<UntrustedValueRefusal>().pipe(
    Match.tagsExhaustive({
      TooDeep: () => tooDeepEntry,
      Malformed: () => asMalformed,
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

const dehydrateDecision = (decision: Decision, includeTrace: boolean): DehydratedEntry["decision"] => {
  const wire = encodeDecision(decision);
  return wire._tag === "Allow"
    ? {
        ...Struct.omit(wire, ALLOW_WITHHELD),
        disclosure: includeTrace ? { _tag: "Disclosed", trace: wire.trace } : { _tag: "Withheld" },
      }
    : {
        ...Struct.omit(wire, DENY_WITHHELD),
        disclosure: includeTrace
          ? { _tag: "Disclosed", trace: wire.trace, reason: wire.reason }
          : { _tag: "Withheld" },
      };
};

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
 * `LeftOut` per non-empty reason, then `Dehydrated` for what was written.
 */
const planDehydration = (
  entries: ReadonlyArray<DecisionEntry>,
  includeTrace: boolean,
): { readonly payload: DehydratedDecisions; readonly events: ReadonlyArray<HydrationEvent> } => {
  // `undefined`, not `""` (EC-06): an empty `entries` names no subject at
  // all, and `""` is not a value `SubjectId` can actually hold, so it read as
  // data rather than as "nothing here." `subjectId` is `undefined` only when
  // `entries` is already empty, so the filter below still reduces to `[]`
  // in that case with no special-casing needed.
  const subjectId = entries[0]?.decision.subjectId;

  const own = entries.filter((e) => e.decision.subjectId === subjectId);
  const foreign = entries.filter((e) => e.decision.subjectId !== subjectId);

  // The subject filter first, so a foreign entry is never encoded and an entry
  // both foreign and unencodable is `ForeignSubject`.
  const written: Array<DehydratedEntry> = [];
  const unencodable: Array<DecisionEntry> = [];
  for (const entry of own) {
    const encoded = dehydrateEntry(entry, includeTrace);
    if (Option.isSome(encoded)) written.push(encoded.value);
    else unencodable.push(entry);
  }

  // Said, not merely done. Dropping is correct and specified; doing it in
  // silence is what let a server ship one row where it meant to ship a thousand
  // and see nothing wrong. And counted: `qadi_hydration_seeded_total` next to the
  // dehydrated count is the difference between "hydration ran" and "hydration
  // ran and did nothing".
  const events: Array<HydrationEvent> = [];
  if (foreign.length > 0) events.push(HydrationEvent.LeftOut({ reason: "ForeignSubject", entries: foreign }));
  if (unencodable.length > 0) {
    events.push(HydrationEvent.LeftOut({ reason: "UnencodablePolicy", entries: unencodable }));
  }
  events.push(HydrationEvent.Dehydrated({ count: written.length }));

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

const rebuild = (entry: DehydratedEntry, subjectId: SubjectId): SeededDecision => {
  const d = entry.decision;
  return d._tag === "Allow"
    ? new SeededAllow({
        evaluationId: d.evaluationId,
        subjectId,
        durationMillis: d.durationMillis,
        visibleFields: d.visibleFields,
        obligations: d.obligations,
        disclosure: d.disclosure,
      })
    : new SeededDeny({
        evaluationId: d.evaluationId,
        subjectId,
        durationMillis: d.durationMillis,
        disclosure: d.disclosure,
      });
};

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
 * agree; this module only shapes the claim, and a seed that disagrees with the
 * trace it carries is refused the same way (INV-QD-170). A `Withheld` seed has
 * no trace, so its fields are the only copy and there is nothing to compare.
 */
const entryAgrees = (entry: DehydratedEntry, policy: Policy): boolean => {
  const decision = entry.decision;
  if (decision.disclosure._tag !== "Disclosed") return true;
  if (decision.disclosure.trace.policyTag !== policy._tag) return false;
  return (
    decisionDisagreement(
      decision._tag === "Allow"
        ? { verdict: "Allow", visibleFields: decision.visibleFields, obligations: decision.obligations }
        : { verdict: "Deny", reason: decision.disclosure.reason, obligations: [] },
      decision.disclosure.trace,
    ) === undefined
  );
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
  if (Result.isFailure(envelope)) return refuse(payloadRefusalReason(envelope.failure), visible);
  const { subjectId, entries } = envelope.success;

  // `undefined` names an empty payload (EC-06), not a subject that failed to
  // match — there is nothing to seed and nothing to warn about, the same
  // fail-quiet outcome as a genuinely empty `entries`. A payload that lied —
  // `subjectId: undefined` alongside real `entries` — still gets no trust:
  // there is no subject here to check them against, so they are dropped the same
  // way a real mismatch drops them, just without asserting a wrong id that was
  // never named.
  if (subjectId === undefined) {
    return entries.length > 0 ? refuse("PayloadSubjectMismatch", entries) : { initialValues: [], events: [] };
  }

  // The whole payload is rejected on a subject mismatch, not entry by entry: the
  // id is a property of the payload, so one wrong id means the wrong page. The
  // entries are handed back whole; unlike the dehydrate side this discloses
  // nothing new — they are the caller's own argument, returned to them — so only
  // the *default* reporter withholds them.
  if (subjectId !== subject.id) return refuse("PayloadSubjectMismatch", entries);

  const seeded: Array<readonly [Atom.Atom<unknown>, unknown]> = [];
  const tooDeep: Array<unknown> = [];
  const malformed: Array<unknown> = [];
  const undecodable: Array<unknown> = [];

  const bucketOf: Record<EntryDropReason, Array<unknown>> = {
    EntryTooDeep: tooDeep,
    MalformedEntry: malformed,
    UndecodablePolicy: undecodable,
  };

  for (const entry of entries) {
    const fields = decodeEntry(entry);
    // Checked before the policy: an entry malformed at this level — a string
    // where durationMillis belongs, an obligations value that isn't an array, a
    // disclosure of the wrong shape — is a different failure than a policy shape
    // this schema doesn't know, and warrants its own reason.
    if (Result.isFailure(fields)) {
      bucketOf[entryDropReason(fields.failure)("MalformedEntry")].push(entry);
      continue;
    }

    const decoded = decodePolicy(fields.success.policy);
    // Collected rather than reported one at a time: a version skew makes *every*
    // entry of a shape undecodable, and one warning per entry would bury the
    // page's other output under a payload's worth of identical lines.
    if (Result.isFailure(decoded)) {
      bucketOf[entryDropReason(decoded.failure)("UndecodablePolicy")].push(entry);
      continue;
    }

    if (!entryAgrees(fields.success, decoded.success)) {
      malformed.push(entry);
      continue;
    }

    seeded.push([seedFor(decoded.success, fields.success.resource), rebuild(fields.success, subject.id)]);
  }

  const events: Array<HydrationEvent> = [];
  if (tooDeep.length > 0) events.push(HydrationEvent.EntriesDropped({ reason: "EntryTooDeep", entries: tooDeep }));
  if (malformed.length > 0) {
    events.push(HydrationEvent.EntriesDropped({ reason: "MalformedEntry", entries: malformed }));
  }
  if (undecodable.length > 0) {
    events.push(HydrationEvent.EntriesDropped({ reason: "UndecodablePolicy", entries: undecodable }));
  }
  events.push(HydrationEvent.Seeded({ count: seeded.length }));

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
 * Written to the seed atom, never to the decision atom. See
 * {@link makeSeededQuestion}.
 *
 * `seedFor` is the atom set's own closure over its families
 * (`QadiAtoms.hydrate`), so the seed atoms stay unreachable from outside it
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

// ---------------------------------------------------------------------------
// The seed atom, and the atom that reads through it
// ---------------------------------------------------------------------------

/** Finds the seed atom standing behind one decision. Closure-private to an atom set. */
export type HydrationSeedLookup = (
  policy: Policy,
  resource: Resource | undefined,
) => Atom.Writable<SeededDecision | undefined>;

/**
 * Announcement state for one question, kept **per registry**.
 *
 * Two providers over the same atom set — two tabs, or a server render followed
 * by the client's own registry — each get their own first answer, and each must
 * report its own first disagreement. A single closure flag shared across every
 * registry that ever reads this atom would let only the first registry's first
 * answer ever be announced or counted; every other registry's genuinely-first
 * re-check would silently join the "already announced" branch of a flag it never
 * flipped. Held in a `WeakMap<AtomRegistry, …>` rather than a bare closure
 * variable, scoped to one question because nothing outside it needs the map.
 */
interface AnnounceState {
  /**
   * Announced once per question **per registry**, the first time that
   * registry's client answers it for itself — absorbing StrictMode's double
   * render, which a value comparison would report twice.
   */
  announced: boolean;
  /**
   * The seed, as this registry first saw it.
   *
   * Kept because `get.once(seed)` can read `undefined` for a seed that was
   * definitely there: a registry may drop the value of an atom nothing mounted,
   * and the seed atom is only ever a *dependency* of the question's atom. Under
   * `registry.mount` it survives and the disagreement is reported; under a
   * `QadiProvider`, which subscribes rather than mounts, it does not and the
   * report would be silently skipped. Remembering the first non-absent reading
   * makes the announcement depend only on what was seeded and what this client
   * then decided, not on registry lifetime.
   *
   * Written in the branch that already reads the seed reactively, so it costs
   * nothing and adds no dependency of its own.
   */
  observedSeed: SeededDecision | undefined;
}

/** A question's seed atom, and the atom a consumer reads the decision through. */
export interface SeededQuestion<E> {
  /** Where `hydrate` writes a server decision. Never reachable from outside. */
  readonly seed: Atom.Writable<SeededDecision | undefined>;
  /** The decision atom: the client's answer, or the seed until it has one. */
  readonly read: Atom.Atom<AsyncResult.AsyncResult<ClientDecision, E>>;
}

/**
 * Builds one question's seed atom and the atom that reads through it.
 *
 * A decision and the seed that covers its first frames are **separate atoms**,
 * and that separation is the whole of INV-QD-028. A seed written directly into
 * the decision atom is *preserved over the value that atom computes*:
 * `AtomRegistry` sets `preserveInitialValueOnBuild` for a seeded node and, when
 * the build finishes with the node still awaiting a value, keeps the seed and
 * throws the computed value away. An effect that settles asynchronously escapes
 * that, because it publishes through `setSelf` on a later turn — but one that
 * settles **synchronously** returns its value straight out of the read, and the
 * seed wins permanently. Every policy that needs no resolver settles
 * synchronously, so that was the common case, and it left a subject holding a
 * server-issued allow they no longer qualified for. Keeping the two apart makes
 * the precedence explicit and one-directional instead of a consequence of when
 * an effect happens to settle.
 *
 * Exactly one `Atom.readable` per question, as before: adding an atom would
 * change notification and batching, and with it the render sequences
 * `QadiProvider.test.tsx` pins.
 */
export const makeSeededQuestion = <E,>(input: {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  /** Builds the computing atom; handed the seed so it can `get.once` the server's evaluation id. */
  readonly computedFor: (
    seed: Atom.Writable<SeededDecision | undefined>,
  ) => Atom.Atom<AsyncResult.AsyncResult<Decision, E>>;
  readonly report: HydrationMismatchReporter | undefined;
  /**
   * The question book's liveness bookkeeping for the eviction sweep. Runs FIRST inside
   * the reader, before any `get`, exactly where it ran when it was inline.
   */
  readonly track: (get: Atom.AtomContext) => void;
}): SeededQuestion<E> => {
  const { policy, resource, report } = input;
  // Declared before `computed`, which reads it with `get.once` to carry the
  // server's evaluation id into the re-check.
  const seed = Atom.make<SeededDecision | undefined>(undefined);
  const computed = input.computedFor(seed);

  const announceState = new WeakMap<AtomRegistry.AtomRegistry, AnnounceState>();
  const announceStateFor = (registry: AtomRegistry.AtomRegistry): AnnounceState => {
    const existing = announceState.get(registry);
    if (existing !== undefined) return existing;
    const created: AnnounceState = { announced: false, observedSeed: undefined };
    announceState.set(registry, created);
    return created;
  };

  const read = Atom.readable((get): AsyncResult.AsyncResult<ClientDecision, E> => {
    input.track(get);

    const state = announceStateFor(get.registry);
    const result = get(computed);
    // `Initial` is the only state in which this client has never answered for
    // itself. The moment it has — allow, deny or failure — that answer is
    // authoritative and the seed is spent. That includes while a *later*
    // re-check is in flight: a re-checking result already carries its own
    // previous decision, and falling back to the seed there would resurrect
    // something older still.
    if (!AsyncResult.isInitial(result)) {
      if (!state.announced) {
        state.announced = true;
        // `get.once`, not `get`. This block previously ran only when a
        // reporter was wired, and was guarded that way so an atom set without
        // one "reads exactly the atoms it read before — no reporter, no added
        // dependency, no change". Counting must happen whether or not a
        // reporter is wired, so the guard could not stay; `get.once` keeps the
        // promise it was protecting, because it registers no dependency. It is
        // also the honest read here: the seed is already spent in this branch,
        // so re-running on a later seed change could not change the answer.
        // `?? state.observedSeed`: the registry's copy is authoritative when it
        // has one, and the first reading stands in when it has dropped it.
        const seeded = get.once(seed) ?? state.observedSeed;
        if (seeded !== undefined) {
          // A failure is not a disagreement. The client could not answer, so
          // there is nothing for the server's answer to disagree with, and
          // reporting one would be INV-QD-006 in reverse. It is still a
          // re-check: the question was seeded and has now been asked again.
          const mismatch =
            AsyncResult.isSuccess(result) && isMismatch(seeded, result.value)
              ? { policy, resource, seeded, decided: result.value }
              : undefined;
          emitHydration(HydrationEvent.Rechecked({ mismatch }), { mismatch: report });
        }
      }
      return result;
    }
    const seeded = get(seed);
    if (seeded !== undefined) state.observedSeed = seeded;
    return seeded === undefined ? result : AsyncResult.success(seeded);
  });

  return { seed, read };
};
