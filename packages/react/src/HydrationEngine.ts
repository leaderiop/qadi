/**
 * Everything between a server's decision and the moment this client supersedes it.
 *
 * That is the payload codec, the seed atom a server-rendered decision is written
 * to, the rule that the client's own answer wins
 * ([INV-QD-028](../../../spec/invariants.md)), the once-per-registry
 * announcement of a disagreement, and the re-check count. It used to be spread
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
  ClientHydrationDropReason,
  Decision,
  Policy,
  Resource,
  SubjectId,
} from "@qadi/core";
import {
  DecisionWireAllow,
  DecisionWireDeny,
  MAX_DECODE_DEPTH,
  Obligation,
  Policy as PolicySchema,
  TraceSchema,
  UNTRUSTED_DECODE_OPTIONS,
  encodeDecision,
  exceedsJsonDepth,
  isAllowed,
} from "@qadi/core";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { countDehydrated, countDropped, countRecheck, countSeeded } from "./HydrationCounts.ts";
import type { HydrationDropReporter, HydrationMismatchReporter } from "./HydrationWarning.ts";
import { hydrationDropReporter, hydrationMismatchReporter } from "./HydrationWarning.ts";
import type { ClientDecision, SeededDecision } from "./SeededDecision.ts";
import { AllowDisclosure, DenyDisclosure, SeededAllow, SeededDeny, permits } from "./SeededDecision.ts";

// Named here rather than reached through the barrel: `HydrationWarning.ts` stays
// out of it (AGENTS.md §9), and `.d.ts` emission has to be able to name them.
export type { HydrationMismatch, HydrationMismatchReporter } from "./HydrationWarning.ts";

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
 * One decision's wire form inside a payload, derived from `DecisionWire`.
 *
 * The subject lives on the envelope instead of each entry, and the trace (and,
 * for a denial, the reason) is replaced by a `disclosure` — so what is left of
 * the wire shape is whatever `@qadi/core` says it is, with no field list written
 * twice.
 */
const AllowEntry = DecisionWireAllow.mapFields((fields) => ({
  ...Struct.omit(fields, ["subjectId", "trace"]),
  disclosure: AllowDisclosure,
}));

const DenyEntry = DecisionWireDeny.mapFields((fields) => ({
  ...Struct.omit(fields, ["subjectId", "trace", "obligations", "reason"]),
  disclosure: DenyDisclosure,
}));

/**
 * One entry of a version-2 payload.
 *
 * `policy` is declared as `Schema.Unknown` rather than left off so decoding with
 * {@link UNTRUSTED_DECODE_OPTIONS} — `onExcessProperty: "error"` — flags a
 * genuinely unrecognized key without also flagging `policy` itself. It has its
 * own decode path ({@link decodePolicy}) because it needs a type transformation
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

/** The payload's current version. */
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
 * An entry of the payload format that predates `version`.
 *
 * Its `trace` and `reason` were a fabrication whenever the server withheld them,
 * and indistinguishable from a real one when it did not, so a client reading one
 * **always** seeds `Withheld`: the safe direction is less disclosure, and the
 * only loss is a debug trace for the length of a deploy.
 */
const DehydratedEntryV1Wire = Schema.Struct({
  policy: Schema.Unknown,
  resource: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  allowed: Schema.Boolean,
  evaluationId: Schema.String,
  durationMillis: Schema.Number,
  visibleFields: Schema.optional(Schema.Array(Schema.String)),
  obligations: Schema.optional(Schema.Array(Obligation)),
  reason: Schema.optional(Schema.String),
  trace: Schema.optional(TraceSchema),
});

/**
 * An entry as the payload format before `version` shipped it.
 *
 * @deprecated Read-only compatibility for cached pages produced before payload
 * `version: 2`. Removed in the next minor release.
 */
export type DehydratedEntryV1 = typeof DehydratedEntryV1Wire.Type;

const DehydratedDecisionsV1Wire = Schema.Struct({
  subjectId: Schema.optional(Schema.String),
  entries: Schema.Array(DehydratedEntryV1Wire),
});

/**
 * A payload from before `version` existed. Read, never written.
 *
 * @deprecated Read-only compatibility for cached pages produced before payload
 * `version: 2`. Removed in the next minor release.
 */
export type DehydratedDecisionsV1 = typeof DehydratedDecisionsV1Wire.Type;

/** Every payload shape `hydrateDecisions` reads: the current one, and the one before it. */
export type DehydratedPayload = DehydratedDecisions | DehydratedDecisionsV1;

/**
 * The envelope alone, with entries left as `unknown`.
 *
 * Entries are decoded one at a time so a bad one is dropped by itself rather
 * than taking the payload with it.
 */
const EnvelopeV2 = DehydratedDecisionsWire.mapFields(
  Struct.assign({ entries: Schema.Array(Schema.Unknown) }),
);
const EnvelopeV1 = DehydratedDecisionsV1Wire.mapFields(
  Struct.assign({ entries: Schema.Array(Schema.Unknown) }),
);

/** Encoding a typed policy cannot fail, so this side is sync and total. */
const encodePolicy = Schema.encodeSync(PolicySchema);

/**
 * Decoding is the untrusted side, so every decoder here returns an `Option` and
 * a malformed value is dropped rather than thrown on — the same fail-closed
 * treatment a mismatched subject gets.
 *
 * `Schema`'s own recursive descent through `PolicySchema`'s `Schema.suspend` has
 * no depth cap of its own, so {@link hydrateWith} runs {@link exceedsJsonDepth}
 * over each entry before any of these, mirroring the guard-then-decode order
 * `SinkCodec.ts`'s `decodeSinkRecord` uses for the identical trust boundary: a
 * payload nested past the call stack's limit is dropped as a typed reason rather
 * than raising a raw `RangeError` defect.
 *
 * Every decode uses {@link UNTRUSTED_DECODE_OPTIONS}. Without it `Schema`'s
 * default `onExcessProperty: "ignore"` would silently strip an unrecognized key
 * from an otherwise-valid value instead of refusing it, the silent-data-loss
 * shape `UNTRUSTED_DECODE_OPTIONS`'s own doc comment in `Policy.ts` exists to
 * rule out.
 */
const decodePolicy = Schema.decodeUnknownOption(PolicySchema, UNTRUSTED_DECODE_OPTIONS);
const decodeEnvelopeV2 = Schema.decodeUnknownOption(EnvelopeV2, UNTRUSTED_DECODE_OPTIONS);
const decodeEnvelopeV1 = Schema.decodeUnknownOption(EnvelopeV1, UNTRUSTED_DECODE_OPTIONS);
const decodeEntryV2 = Schema.decodeUnknownOption(DehydratedEntryWire, UNTRUSTED_DECODE_OPTIONS);
const decodeEntryV1 = Schema.decodeUnknownOption(DehydratedEntryV1Wire, UNTRUSTED_DECODE_OPTIONS);

/** One decision the server made, ready to be dehydrated. */
export interface DecisionEntry {
  readonly policy: Policy;
  /** Present when the decision was made against a resource. */
  readonly resource?: Resource | undefined;
  readonly decision: Decision;
}

const dehydrateDecision = (decision: Decision, includeTrace: boolean): DehydratedEntry["decision"] => {
  const wire = encodeDecision(decision);
  return wire._tag === "Allow"
    ? {
        ...Struct.omit(wire, ["subjectId", "trace"]),
        disclosure: includeTrace ? { _tag: "Disclosed", trace: wire.trace } : { _tag: "Withheld" },
      }
    : {
        ...Struct.omit(wire, ["subjectId", "trace", "obligations", "reason"]),
        disclosure: includeTrace
          ? { _tag: "Disclosed", trace: wire.trace, reason: wire.reason }
          : { _tag: "Withheld" },
      };
};

/**
 * One decision as a payload entry.
 *
 * Derived from `encodeDecision`, so the fields a decision ships are the ones
 * `@qadi/core` says it has. The trace, and a denial's reason, ship only under
 * `includeTrace`.
 */
export const dehydrateEntry = (entry: DecisionEntry, includeTrace: boolean): DehydratedEntry => ({
  policy: encodePolicy(entry.policy),
  resource: entry.resource,
  decision: dehydrateDecision(entry.decision, includeTrace),
});

/** A payload for `entries`, already filtered to one subject. */
export const dehydratedPayload = (
  subjectId: string | undefined,
  entries: ReadonlyArray<DehydratedEntry>,
): DehydratedDecisions => {
  countDehydrated(entries.length);
  return { version: PAYLOAD_VERSION, subjectId, entries };
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

const rebuildV1 = (entry: DehydratedEntryV1, subjectId: SubjectId): SeededDecision =>
  entry.allowed
    ? new SeededAllow({
        evaluationId: entry.evaluationId,
        subjectId,
        durationMillis: entry.durationMillis,
        visibleFields: entry.visibleFields,
        obligations: entry.obligations ?? [],
        disclosure: { _tag: "Withheld" },
      })
    : new SeededDeny({
        evaluationId: entry.evaluationId,
        subjectId,
        durationMillis: entry.durationMillis,
        disclosure: { _tag: "Withheld" },
      });

/** One entry, decoded as far as its policy, and how to finish rebuilding it. */
interface EntryRead {
  readonly policy: unknown;
  readonly resource: Resource | undefined;
  /** `None` when the entry contradicts itself. */
  readonly rebuild: (policy: Policy, subjectId: SubjectId) => Option.Option<SeededDecision>;
}

const readEntry = (entry: unknown): Option.Option<EntryRead> =>
  Option.map(decodeEntryV2(entry), (decoded) => ({
    policy: decoded.policy,
    resource: decoded.resource,
    rebuild: (policy, subjectId) => {
      const disclosure = decoded.decision.disclosure;
      // A disclosed trace names the root policy it traced, and the evaluator's
      // root tag is always the policy's own `_tag`. One that says otherwise is not
      // a trace of this entry's policy — hand-built, or spliced from another
      // entry — so the entry is refused rather than seeded with it.
      return disclosure._tag === "Disclosed" && disclosure.trace.policyTag !== policy._tag
        ? Option.none()
        : Option.some(rebuild(decoded, subjectId));
    },
  }));

const readEntryV1 = (entry: unknown): Option.Option<EntryRead> =>
  Option.map(decodeEntryV1(entry), (decoded) => ({
    policy: decoded.policy,
    resource: decoded.resource,
    rebuild: (_policy, subjectId) => Option.some(rebuildV1(decoded, subjectId)),
  }));

export interface HydrateOptions {
  /**
   * Called with the entries this client refused to seed, and why.
   *
   * The sibling of `DehydrateOptions.onDropped`, and it carries a reason because
   * the ways a payload fails to seed have different causes: the payload naming
   * another subject is a cache-key bug, an unregistered atom set is a wiring
   * mistake, an entry malformed apart from its policy is usually version skew, an
   * undecodable policy is version skew of the policy shape specifically, a payload
   * of a `version` this client does not read is a deploy in flight, a payload that
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

/**
 * Turns a payload into `initialValues`, seeding what it can verify.
 *
 * `payload` is `unknown` on purpose: it arrives as JSON in a page, and
 * `JSON.parse` yields `any`, so a type on the parameter protects nothing. This
 * **never throws** — every exit is a drop that is counted and announced
 * (BEH-QD-230, INV-QD-045), including a payload that is not an object, has no
 * `entries` array, or names a version this client does not read.
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
  const report = hydrationDropReporter(options?.onDropped);
  const refuse = (
    reason: ClientHydrationDropReason,
    entries: ReadonlyArray<unknown>,
    count: number = entries.length,
  ): InitialValues => {
    countDropped(reason, count);
    report?.({ reason, entries });
    return [];
  };

  const visible: ReadonlyArray<unknown> =
    Predicate.isObject(payload) && Array.isArray(payload["entries"]) ? payload["entries"] : [];
  // A refused payload is at least one drop, so a counter moves even when there
  // are no entries to count and a dashboard sees the refusal at all.
  const atLeastOne = Math.max(1, visible.length);

  // Entries are guarded one by one below; this covers everything else, which the
  // envelope decode would otherwise recurse into on its way to refusing it.
  if (!Predicate.isObject(payload) || exceedsJsonDepth({ ...payload, entries: [] }, MAX_DECODE_DEPTH)) {
    return refuse("MalformedPayload", visible, atLeastOne);
  }

  // An absent `version` is the format that predates it, which is still read. Any
  // other value is a format this client does not know, which is not the same as
  // a malformed one and is the signature of a deploy in flight.
  const versioned = Object.hasOwn(payload, "version");
  if (versioned && payload["version"] !== PAYLOAD_VERSION) {
    return refuse("UnsupportedPayloadVersion", visible, atLeastOne);
  }

  const envelope = versioned ? decodeEnvelopeV2(payload) : decodeEnvelopeV1(payload);
  if (Option.isNone(envelope)) return refuse("MalformedPayload", visible, atLeastOne);
  const { subjectId, entries } = envelope.value;

  // `undefined` names an empty payload (EC-06), not a subject that failed to
  // match — there is nothing to seed and nothing to warn about, the same
  // fail-quiet outcome as a genuinely empty `entries`. A payload that lied —
  // `subjectId: undefined` alongside real `entries` — still gets no trust:
  // there is no subject here to check them against, so they are dropped the same
  // way a real mismatch drops them, just without asserting a wrong id that was
  // never named.
  if (subjectId === undefined) {
    if (entries.length > 0) refuse("PayloadSubjectMismatch", entries);
    return [];
  }

  // The whole payload is rejected on a subject mismatch, not entry by entry: the
  // id is a property of the payload, so one wrong id means the wrong page. The
  // entries are handed back whole; unlike the dehydrate side this discloses
  // nothing new — they are the caller's own argument, returned to them — so only
  // the *default* reporter withholds them.
  if (subjectId !== subject.id) return refuse("PayloadSubjectMismatch", entries);

  const read = versioned ? readEntry : readEntryV1;
  const seeded: Array<readonly [Atom.Atom<unknown>, unknown]> = [];
  const tooDeep: Array<unknown> = [];
  const malformed: Array<unknown> = [];
  const undecodable: Array<unknown> = [];

  for (const entry of entries) {
    if (exceedsJsonDepth(entry, MAX_DECODE_DEPTH)) {
      tooDeep.push(entry);
      continue;
    }

    const fields = read(entry);
    // Checked before the policy: an entry malformed at this level — a string
    // where durationMillis belongs, an obligations value that isn't an array, a
    // disclosure of the wrong shape — is a different failure than a policy shape
    // this schema doesn't know, and warrants its own reason.
    if (Option.isNone(fields)) {
      malformed.push(entry);
      continue;
    }

    const decoded = decodePolicy(fields.value.policy);
    // Collected rather than reported one at a time: a version skew makes *every*
    // entry of a shape undecodable, and one warning per entry would bury the
    // page's other output under a payload's worth of identical lines.
    if (Option.isNone(decoded)) {
      undecodable.push(entry);
      continue;
    }

    const rebuilt = fields.value.rebuild(decoded.value, subject.id);
    if (Option.isNone(rebuilt)) {
      malformed.push(entry);
      continue;
    }

    seeded.push([seedFor(decoded.value, fields.value.resource), rebuilt.value]);
  }

  if (tooDeep.length > 0) refuse("EntryTooDeep", tooDeep);
  if (malformed.length > 0) refuse("MalformedEntry", malformed);
  if (undecodable.length > 0) refuse("UndecodablePolicy", undecodable);

  countSeeded(seeded.length);

  return seeded;
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
 * The reporter an atom set will use for mismatches, or `undefined` for none.
 *
 * `QadiAtoms.ts` resolves this once per atom set and hands the result to each
 * question, so the development-mode default is decided at construction.
 */
export const resolveMismatchReporter = (
  supplied: HydrationMismatchReporter | undefined,
): HydrationMismatchReporter | undefined => hydrationMismatchReporter(supplied);

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
   * `QadiAtoms`' liveness bookkeeping for the eviction sweep. Runs FIRST inside
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
          const mismatched = AsyncResult.isSuccess(result) && isMismatch(seeded, result.value);
          countRecheck(mismatched);
          if (mismatched && report !== undefined && AsyncResult.isSuccess(result)) {
            report({ policy, resource, seeded, decided: result.value });
          }
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
