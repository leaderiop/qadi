/**
 * A {@link SinkRecord}'s wire form, owned in both directions: one call out, one
 * call in.
 *
 * - **Outbound**: {@link encodeSinkRecord} turns a record into a verified JSON
 *   value (`SinkRecordJson`), or a `SinkRecordNotEncodable` naming why and
 *   where; {@link encodeSinkRecordString} gives the same as text.
 * - **Inbound**: {@link decodeSinkRecord} turns untrusted `unknown` into a
 *   record, or a `SinkRecordNotDecodable`; {@link decodeSinkRecordString} does
 *   the same from text, adding "not JSON" as a reason.
 *
 * The guard, the projection, the schema encode, the depth bound and the
 * rebuild are this module's implementation, so every sink (forwarding, the
 * decision stream, the audit encoder, the devtools source) makes one call and
 * puts the same bytes on the wire. Before ARCH-09 each assembled a different
 * subset of them, and each defect in the shared guard was fixed one caller at
 * a time.
 *
 * **Two invariants the interface carries.** Whatever the outbound operation
 * emits, the inbound operation accepts, and rebuilds equal to the original up
 * to the named normalisations below (INV-QD-902). Neither direction throws,
 * whatever it is given, so one record can never end a feed (INV-QD-903).
 *
 * **Named normalisations.** A resolver error's `cause` crosses through
 * `Schema.Defect()` on every path (ADR-QD-060): an `Error` keeps `name`,
 * `message` and `cause`, a cycle is dropped, a `bigint` becomes `"10n"` and a
 * non-finite number `null`. A record is never refused because of its `cause`,
 * which is diagnostic, and an outage record is the one an operator most wants
 * to see. A `Date` in `resource` or `params` crosses as its ISO string. A
 * property whose value is `undefined` crosses as absent.
 *
 * **Schema-derived, decoded as untrusted.** A record crossing a process
 * boundary crosses a trust boundary, which is the reasoning
 * [ADR-QD-002](../../../spec/decisions/002-schema-derived-policy-adt.md) applies to
 * policies, so the wire form is one schema and decoding validates rather than
 * casts. The nine `EvaluationError` tags are `Schema.TaggedError` classes
 * ([AGENTS.md §4](../../../AGENTS.md),
 * [ADR-QD-060](../../../spec/decisions/060-schema-taggederror-for-the-nine-wire-crossing-errors.md)),
 * so the class already *is* the wire schema of an error.
 *
 * **The seam for the wire's shape.** How the outcome is carried and any wire
 * version handling live behind `decodeSinkRecord`, so they change in this
 * module and nowhere else.
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { Trace } from "./Decision.ts";
import type { DecisionOutcome, SinkRecord } from "./DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord } from "./DecisionRecord.ts";
import { DecisionWire, decodeDecision, encodeDecision } from "./DecisionWire.ts";
import { exceedsJsonDepth } from "./DecodeDepthGuard.ts";
import {
  AttributeResolveError,
  CustomPredicateError,
  DecisionHistoryUnavailable,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyTooDeep,
  RelationshipResolveError,
  SignatureHistoryUnavailable,
  DecodeRefusal,
  EncodeRefusal,
  SinkRecordNotDecodable,
  SinkRecordNotEncodable,
} from "./Errors.ts";
import type { OpaqueKind, WirePath } from "./Errors.ts";
import { makeSubjectId } from "./Identity.ts";
import {
  MAX_DECODE_DEPTH,
  Policy,
  PolicyDecodeTooDeep,
  policyDepth,
  UNTRUSTED_DECODE_OPTIONS,
} from "./Policy.ts";

/**
 * An `EvaluationError` on the wire — the union of the nine wire-crossing
 * classes themselves (ADR-QD-060), not a second description of them.
 *
 * `cause` (`AttributeResolveError`, `RelationshipResolveError`,
 * `DecisionHistoryUnavailable`, `SignatureHistoryUnavailable`) is
 * `Schema.Defect()` on each class, not a hand-rolled renderer: an `Error`
 * encodes to `{ name, message, cause? }` and decodes back to one; anything
 * else — a circular object, a function, a thrown non-`Error` — is formatted
 * and falls back to a string, the same "never break the thing observing it"
 * guarantee the old `renderCause` gave, from a maintained library schema
 * instead of one this file owned alone.
 *
 * **No wire-embedded `code`.** The deleted `ErrorSchema`'s `code` field was,
 * by its own doc comment, written on encode and ignored on decode — a value
 * nothing ever validated. A reader wanting the stable `ACL###` now derives it
 * from the decoded error's `_tag` via `errorCode()`/`ERROR_CODES`
 * (`Errors.ts`), which cannot drift from the tag the way a second,
 * independently-written wire value could.
 */
export const EvaluationErrorSchema = Schema.Union([
  MissingResource,
  MissingAction,
  AttributeResolveError,
  RelationshipResolveError,
  MissingResourceId,
  DecisionHistoryUnavailable,
  PolicyTooDeep,
  CustomPredicateError,
  SignatureHistoryUnavailable,
]);

/**
 * The `subjectId` `fromWireUnsafe` substitutes when a wire record's own `subjectId`
 * is absent — an older sender, mid rolling-deploy, predating that field
 * (`SinkRecordWire`'s own doc comment above).
 *
 * A distinctive sentinel, not `""` (PH-03): `SubjectId` is a total,
 * non-validating brand (`Identity.ts`), so `""` is itself a legal subject id
 * a real caller could hold, and using it for "unknown" would make the two
 * indistinguishable to a devtools row or an audit reviewer reading the
 * decoded record back. Matches this file's own idiom for the same problem
 * one field over — `fromWireUnsafe`'s "no outcome" fallback names the malformation
 * in the value rather than reusing a value a real record could also produce.
 */
const UNKNOWN_SUBJECT = makeSubjectId("<unknown subject: wire version skew>");

/** The wire form of a {@link SinkRecord}. */
export const SinkRecordWire = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal("Decision"),
    evaluationId: Schema.String,
    at: Schema.Number,
    // Optional on the wire, though never absent from anything this module
    // encodes: `SinkRecordWire` crosses process boundaries (a devtools
    // socket, a replica forwarding to a shared store), and a sender running
    // an older version during a rolling deploy predates this field. Rejecting
    // such a record outright would silently drop real decisions for the
    // length of the deploy; `fromWireUnsafe` falls back to {@link UNKNOWN_SUBJECT}
    // instead — not `""`, which `SubjectId`'s brand (a total, non-validating
    // `Brand.nominal`, `Identity.ts`) accepts as a legal id in its own right,
    // making "the sender predates this field" indistinguishable downstream
    // from "this subject's real id happens to be the empty string" (PH-03).
    subjectId: Schema.optional(Schema.String),
    policy: Policy,
    resource: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
    action: Schema.optional(Schema.String),
    cache: Schema.optional(Schema.Literals(["hit", "coalesced", "miss"])),
    decided: Schema.optional(DecisionWire),
    failed: Schema.optional(EvaluationErrorSchema),
  }),
  Schema.Struct({
    _tag: Schema.Literal("Obligations"),
    evaluationId: Schema.String,
    at: Schema.Number,
    outcome: Schema.Literals(["Discharged", "HandlerFailed", "Refused", "NotRequired"]),
    obligationIds: Schema.Array(Schema.String),
  }),
]);

export type SinkRecordWire = typeof SinkRecordWire.Type;

/**
 * True for a value `JSON.stringify` can round-trip without lying: no
 * `undefined`-swallowing, no function silently dropped, no cycle recursing
 * forever.
 *
 * A general walk, not one specialized to `resource` — it accepts any
 * `unknown` and descends through arbitrary nesting, which is what lets
 * {@link isRecordJsonSafe} below reuse it unchanged for `policy` too. This
 * doc comment used to claim `SinkRecord.resource` was "the one caller-supplied
 * `unknown` value that reaches the wire", which was false: `HasCustom.params`
 * (`Policy.ts`) is a second one, buried inside `policy` rather than sitting
 * beside it, and both of this guard's real-world consumers — `@qadi/audit`'s
 * `encodeAuditEntry`, `@qadi/http`'s decision-stream route — were written
 * against that premise and checked only `resource`. A resource or a policy
 * carrying a circular reference or a `BigInt` used to throw a `TypeError` out
 * of `JSON.stringify` at whichever boundary encoded it either way.
 *
 * **`NaN`, `Infinity` and `-Infinity` are refused, not accepted as numbers.**
 * `JSON.stringify` does not throw on them — it silently renders every one of
 * them as `null`, which is exactly the kind of lying this guard exists to
 * catch: a caller reading the round-tripped value back gets `null`, not the
 * non-finite number they wrote, and nothing on the way there ever failed.
 *
 * **Walks with an explicit array-backed stack, mirroring {@link exceedsJsonDepth}
 * (`DecodeDepthGuard.ts`), rather than recursing.** A guard meant to stand
 * between an adversarial value and the caller had the exact class of problem
 * it exists to guard against: a function-call-recursive walk exhausts the
 * call stack on the same deep-nesting input the depth guard was written to
 * catch before `Schema` ever saw it, and `isJsonSafe` sat downstream of that
 * guard on the audit-encode path without one of its own. `seen` used to track
 * the current path by copying it — `new Set(seen).add(value)` — into a fresh
 * `Set` at every node along the walk, which made the whole walk O(d²) even
 * with no sharing or cycles at all: a value nested `d` levels deep with no
 * branching copies a same-sized set `d` times. The stack below tracks the
 * current path with one mutable `Set` instead, added to on descent and
 * removed from on backtrack, so cycle detection and the walk itself are both
 * linear in the number of nodes visited. A value legitimately reachable twice
 * via two different paths (not a cycle) is still never falsely refused: it is
 * only ever in `onPath` while one of its occurrences is being walked.
 *
 * **Deliberately a second walker, not `exceedsJsonDepth` reused, because it
 * answers a different question (RP-05).** `exceedsJsonDepth` bound-checks
 * depth only, over raw not-yet-`Schema`-walked input that came from
 * `JSON.parse` — which cannot produce cycles, so it has none to detect; a
 * cyclic *in-memory* object would only make it terminate by walking the
 * cycle until the depth bound fires, reporting "too deep" for what is
 * actually "circular". `isJsonSafe` walks live, caller-constructed values —
 * `SinkRecord.resource`, `HasCustom.params` — where a genuine reference cycle
 * is the failure to catch, and depth is not the question at all: `Number.isFinite`
 * and function/`undefined` rejection above have no depth-guard analogue
 * either. Folding the two into one walker would need it to report both
 * "too deep" and "circular" from every call site, for two guards whose
 * callers want different things — `decodeRecordWire`'s depth guard runs
 * before `Schema` ever sees the input; this one runs on values that have
 * already been fully constructed and never touch `Schema` at all.
 */
const isJsonContainer = (value: unknown): value is object =>
  typeof value === "object" && value !== null && !(value instanceof Date);

/**
 * Built-ins `JSON.stringify` renders as `{}` (or as an index object), so a
 * walk over their `Object.values` — none — would accept them and the value
 * would cross as something it is not (ARCH-09 C8): `{ tags: new Set(["a"]) }`
 * reached the audit trail as `{ tags: {} }`. `Error` is deliberately absent:
 * every resolver error's `cause` is usually one, and this guard now walks the
 * outcome too, so refusing it would refuse every outage record. ARCH-09's
 * outbound operation replaces this guard, and with it this exception.
 */
const OPAQUE_BRANDS: ReadonlySet<string> = new Set([
  "[object Map]",
  "[object Set]",
  "[object WeakMap]",
  "[object WeakSet]",
  "[object RegExp]",
  "[object Promise]",
  "[object ArrayBuffer]",
  "[object DataView]",
]);

const isOpaqueBuiltIn = (value: object): boolean =>
  ArrayBuffer.isView(value) || OPAQUE_BRANDS.has(Object.prototype.toString.call(value));

const isJsonScalarSafe = (value: unknown): boolean => {
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (value instanceof Date) return true;
  return false;
};

const childrenOf = (value: object): ReadonlyArray<unknown> =>
  Array.isArray(value) ? value : Object.values(value);

export const isJsonSafe = (value: unknown): boolean => {
  if (!isJsonContainer(value)) return isJsonScalarSafe(value);
  if (isOpaqueBuiltIn(value)) return false;

  const onPath = new Set<object>([value]);
  const stack: Array<{
    readonly value: object;
    readonly children: ReadonlyArray<unknown>;
    index: number;
  }> = [{ value, children: childrenOf(value), index: 0 }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame === undefined) break;
    if (frame.index >= frame.children.length) {
      onPath.delete(frame.value);
      stack.pop();
      continue;
    }
    const child = frame.children[frame.index];
    frame.index += 1;
    if (isJsonContainer(child)) {
      if (onPath.has(child) || isOpaqueBuiltIn(child)) return false;
      onPath.add(child);
      stack.push({ value: child, children: childrenOf(child), index: 0 });
    } else if (!isJsonScalarSafe(child)) {
      return false;
    }
  }

  return true;
};

/**
 * True when an outcome's own caller-supplied `unknown` — a resolver error's
 * `cause` — reaches the wire safely.
 *
 * `cause` is not an own enumerable property of a `Schema.TaggedError`
 * instance, so a walk over the outcome object never sees it, while
 * `JSON.stringify` does (through the class's `toJSON`) — which is how a cyclic
 * `cause` passed this guard and then threw. A `Decided` outcome has no `unknown`
 * of its own: its obligations' `attributes` come from the policy's `obliged`
 * nodes, which the `policy` walk already covers.
 */
const isOutcomeJsonSafe: (outcome: DecisionOutcome) => boolean = Match.type<DecisionOutcome>().pipe(
  Match.tagsExhaustive({
    Decided: () => true,
    Failed: (outcome) => !Predicate.hasProperty(outcome.error, "cause") || isJsonSafe(outcome.error.cause),
  }),
);

/**
 * True when every caller-supplied `unknown` value a `SinkRecord` can carry
 * reaches the wire safely — `resource`, `policy`'s `HasCustom.params`, **and**
 * the outcome: a resolver error's `cause`, and a decision's obligations'
 * `attributes`.
 *
 * **The outcome is walked too (ARCH-09 T2).** The guard used to stop at
 * `resource` and `policy`, so a `Failed` record whose `cause` held a reference
 * cycle — the shape an axios-style HTTP client error has — or a `BigInt`
 * passed it, and then threw out of `JSON.stringify`: on `@qadi/http`'s decision
 * stream that ended every subscriber's connection, and in `@qadi/audit` it
 * counted as a store failure, so five of them opened the circuit breaker and
 * the healthy records after them were dropped. A plain `Error` cause still
 * passes (it walks as `{}`, which is lossy until ARCH-09's outbound operation
 * carries it through `Schema.Defect()`); opaque built-ins — `Map`, `Set`,
 * `RegExp`, binary data — are refused anywhere in the record. ARCH-09's
 * outbound operation, which walks the *encoded* record, is the permanent fix
 * and replaces this guard.
 *
 * `isJsonSafe(resource)` alone is exactly the check both of its real-world
 * callers had, and exactly the gap this closes: a `policy` built with
 * `hasCustom(name, params)` (ADR-QD-055's escape hatch) carries its own
 * `unknown` — `params` — and neither `@qadi/audit`'s `encodeAuditEntry` nor
 * `@qadi/http`'s decision-stream route walked into it before refusing a
 * record. `isJsonSafe` itself needed no change to cover this: it already
 * walks an arbitrary object graph, and a `Policy` is exactly that — every
 * `HasCustom` node's `params`, however deep, is just another child in the
 * same recursive walk. Only a name for "check the whole record" was missing.
 *
 * An `ObligationRecord` carries neither field and is always safe.
 *
 * `Match.tagsExhaustive` rather than a ternary on `record._tag` (issue #109,
 * D6-D7 of `EFFECT-IDIOM-DASHBOARD.md`): `SinkRecord` has exactly two tags
 * today, so `record._tag === "Obligations" ? … : …` reads as
 * exhaustive but is not one by construction — a third `SinkRecord` tag would
 * compile cleanly and fall through this function's `else` branch as though it
 * were a `Decision`, silently reusing that branch's `resource`/`policy`
 * guard on a shape it was never written for. `Match.tagsExhaustive` makes a
 * new tag here the same compile error §5a's `resolveRef`/`mergeFields`
 * `never`-arm fix already gives elsewhere in this codebase, for the identical
 * reason: this is the AGENTS.md §5a house pattern, not the `SWITCH_BUDGET`'s —
 * a ternary was never a `switch` statement, so this conversion needs no
 * budget update.
 */
export const isRecordJsonSafe: (record: SinkRecord) => boolean = Match.type<SinkRecord>().pipe(
  Match.tagsExhaustive({
    Obligations: () => true,
    Decision: (record) =>
      (record.resource === undefined || isJsonSafe(record.resource)) &&
      isJsonSafe(record.policy) &&
      isOutcomeJsonSafe(record.outcome),
  }),
);

/**
 * The wire projection of a record, ready to be JSON-encoded.
 *
 * `Match.tagsExhaustive` over `SinkRecord`, not a ternary on `record._tag` —
 * see {@link isRecordJsonSafe}'s doc comment for why a ternary here is
 * false-exhaustive rather than merely stylistic.
 */
const project: (record: SinkRecord) => SinkRecordWire = Match.type<SinkRecord>().pipe(
  Match.tagsExhaustive({
    Obligations: (record) => ({
      _tag: "Obligations" as const,
      evaluationId: record.evaluationId,
      at: record.at,
      outcome: record.outcome,
      obligationIds: record.obligationIds,
    }),
    Decision: (record) => ({
      _tag: "Decision" as const,
      evaluationId: record.evaluationId,
      at: record.at,
      subjectId: record.subjectId,
      policy: record.policy,
      ...(record.resource === undefined ? {} : { resource: record.resource }),
      ...(record.action === undefined ? {} : { action: record.action }),
      ...(record.cache === undefined ? {} : { cache: record.cache }),
      ...(record.outcome._tag === "Decided"
        ? { decided: encodeDecision(record.outcome.decision) }
        : { failed: record.outcome.error }),
    }),
  }),
);

/**
 * Rebuilds a record from its wire projection.
 *
 * **Not a validating entry point (PH-05).** This performs no decoding —
 * it `Match`-matches an already-typed `SinkRecordWire` into the internal
 * record classes, nothing more. `decodeRecord` below is the sanctioned
 * receipt path for anything crossing the trust boundary this module exists
 * for: it runs the depth guard, then `Schema.decodeUnknownEffect` with
 * {@link UNTRUSTED_DECODE_OPTIONS}, *then* this function. The `…Unsafe`
 * suffix (AGENTS.md §8) names that at every import site — a caller who
 * concludes "the wire type is my contract" and calls this directly on a
 * `JSON.parse` result has skipped validation entirely, and nothing at the
 * type level stops it.
 *
 * `Match.tagsExhaustive` over `SinkRecordWire`, not an `if (wire._tag === …)`
 * — see {@link isRecordJsonSafe}'s doc comment for why that reads as
 * exhaustive today (`SinkRecordWire` also has exactly two tags) without being
 * one by construction.
 *
 * `decided` absent and `failed` absent cannot both hold for a record this
 * module produced, but the wire is untrusted, so the fallback is a `Failed`
 * naming the malformation rather than a cast or a thrown error. A devtools row
 * saying "the sender sent neither outcome" is more useful than a dropped
 * record, and it can never be mistaken for a decision.
 *
 * **Known conflation, tracked rather than fixed here (audit tickets 96 and
 * 155).** Both branches below reuse `MissingResource`/`ACL004` — a real
 * resolver-wiring failure's tag — as a stand-in for "the sender violated
 * the wire protocol", which is a different failure class wearing another
 * error's identity: a devtools row or a metric bucketed by `ACL004` cannot
 * tell "a policy read a missing attribute" from "a wire record was
 * malformed" apart.
 *
 * A dedicated tag (say `MalformedWireRecord`) is the right fix, but
 * `EvaluationError` (`Errors.ts`) is a closed union, not an open one: every
 * member must also gain an `ERROR_CODES` entry, a member in this file's
 * `EvaluationErrorSchema` union (ADR-QD-060), *and* an arm in `@qadi/http`'s
 * `QadiHttpError.ts` `Match.tagsExhaustive` over `EnforcementError` — by that
 * file's own doc comment, deliberately built to fail the build until someone
 * decides the new tag's status code. That is a cross-package, exported-type
 * change, out of scope for this file alone. Pinned instead:
 * `SinkCodec.test.ts`'s "the wire is untrusted" and "both outcomes present"
 * tests assert today's `MissingResource`-shaped fallback stays exactly as it
 * is until that dedicated marker lands.
 */
const rebuild: (wire: SinkRecordWire) => SinkRecord = Match.type<SinkRecordWire>().pipe(
  Match.tagsExhaustive({
    Obligations: (wire) =>
      new ObligationRecord({
        evaluationId: wire.evaluationId,
        at: wire.at,
        outcome: wire.outcome,
        obligationIds: wire.obligationIds,
      }),
    Decision: (wire) =>
      new DecisionRecord({
        evaluationId: wire.evaluationId,
        at: wire.at,
        // `?? UNKNOWN_SUBJECT` mirrors every other fallback in this file:
        // unreachable for anything this module encodes, real for a wire
        // record sent by an older process during a rolling deploy, before
        // this field existed. See `UNKNOWN_SUBJECT`'s own doc comment (PH-03)
        // for why the fallback is a sentinel and not `""`.
        subjectId: wire.subjectId === undefined ? UNKNOWN_SUBJECT : makeSubjectId(wire.subjectId),
        policy: wire.policy,
        ...(wire.resource === undefined ? {} : { resource: wire.resource }),
        ...(wire.action === undefined ? {} : { action: wire.action }),
        ...(wire.cache === undefined ? {} : { cache: wire.cache }),
        outcome:
          // Ticket 155: a wire record naming BOTH `decided` and `failed` — which
          // this module never encodes, but the wire is untrusted — silently
          // prefers `decided`. There is no principled reason to pick one outcome
          // over the other for a record that names both; today's preference is
          // an artifact of check order, not a decision. See the conflation note
          // above for why a dedicated "both present" marker isn't added here.
          wire.decided !== undefined
            ? new Decided({ decision: decodeDecision(wire.decided) })
            : wire.failed !== undefined
              ? new Failed({ error: wire.failed })
              : // Ticket 96: a wire record naming NEITHER outcome fabricates a
                // `MissingResource` — reusing ACL004, a resolver-wiring failure's
                // code, for what is actually a protocol violation. See the
                // conflation note above.
                new Failed({
                  error: new MissingResource({ attribute: "<malformed record: no outcome>" }),
                }),
      }),
  }),
);

/**
 * The wire projection of a record. Kept exported only until every caller has
 * moved to {@link encodeSinkRecord} (ARCH-09 T10 removes it).
 */
export const toWire: (record: SinkRecord) => SinkRecordWire = project;

/**
 * The encoded form of a record: what {@link encodeSinkRecord} returns, what
 * forwarding's `send` receives, and what an audit row carries.
 *
 * Derived from the one wire schema (ADR-QD-002), never hand-written:
 * `Schema.toEncoded` gives the schema whose `Type` is the wire's encoded
 * side, so `@qadi/audit` can embed it in its own row schema.
 */
export const SinkRecordJson = Schema.toEncoded(SinkRecordWire);

export type SinkRecordJson = typeof SinkRecordWire.Encoded;

/** One step of a walk: an object key or array index, and the value under it. */
type WireEntry = readonly [key: string | number, child: unknown];

/** A container the walk has entered and not yet left. */
interface WalkFrame {
  readonly container: object;
  readonly entries: ReadonlyArray<WireEntry>;
  readonly depth: number;
  readonly isArray: boolean;
  index: number;
}

/**
 * The `OpaqueKind` of each built-in brand JSON cannot carry. A lookup table
 * rather than a dispatch: any brand absent here (and not `Object`/`Array`) is
 * `"OtherBuiltIn"`. Binary data is recognised by `ArrayBuffer.isView` or its
 * buffer brands, since each typed array has a brand of its own.
 */
const OPAQUE_KIND_BY_BRAND: ReadonlyMap<string, OpaqueKind> = new Map<string, OpaqueKind>([
  ["Map", "Map"],
  ["Set", "Set"],
  ["WeakMap", "WeakMap"],
  ["WeakSet", "WeakSet"],
  ["RegExp", "RegExp"],
  ["Promise", "Promise"],
  ["Error", "Error"],
  ["ArrayBuffer", "BinaryData"],
  ["SharedArrayBuffer", "BinaryData"],
  ["DataView", "BinaryData"],
  ["Boolean", "BoxedPrimitive"],
  ["Number", "BoxedPrimitive"],
  ["String", "BoxedPrimitive"],
]);

/** `"Set"` for a `Set`: the `Object.prototype.toString` brand, unwrapped. */
const brandOf = (value: object): string => Object.prototype.toString.call(value).slice(8, -1);

const opaqueKindOf = (value: object, brand: string): OpaqueKind =>
  ArrayBuffer.isView(value) ? "BinaryData" : (OPAQUE_KIND_BY_BRAND.get(brand) ?? "OtherBuiltIn");

const hasCustomToJSON = (value: object): boolean =>
  Predicate.hasProperty(value, "toJSON") && typeof value.toJSON === "function";

const hasEnumerableSymbolKey = (value: object): boolean =>
  Object.getOwnPropertySymbols(value).some((key) => Object.prototype.propertyIsEnumerable.call(value, key));

const entriesOf = (value: object): ReadonlyArray<WireEntry> =>
  Array.isArray(value)
    ? Array.from(value, (child: unknown, index): WireEntry => [index, child])
    : Object.entries(value);

/**
 * The first value in an encoded record that would not survive JSON as itself,
 * or `undefined` when the whole value round-trips.
 *
 * One iterative walk with one mutable on-path set, the technique `isJsonSafe`
 * used, over the *encoded* output — so it cannot miss a field the way per-field
 * guards did: whatever the encode emitted is what it checks. Its depth count
 * matches `exceedsJsonDepth`'s (the root is depth 0, each child one more, and
 * any value deeper than `maxDepth` is refused), so it refuses exactly what a
 * receiver's depth guard would.
 *
 * An `undefined` object property is absence, not a hazard: JSON drops the key
 * and decode reads it as absent, and `Schema`'s own encoded output carries such
 * keys for unset optional fields. An `undefined` array element is refused,
 * because JSON writes it as `null`. A valid `Date` is accepted and crosses as
 * its ISO string, a named normalisation. The path is rebuilt from the stack
 * only when a hazard is found, so the accepting walk allocates no paths.
 */
const wireHazard = (root: unknown, maxDepth: number): EncodeRefusal | undefined => {
  const onPath = new Set<object>();
  const stack: Array<WalkFrame> = [];
  const pathHere = (): WirePath =>
    stack.flatMap((frame) => {
      const entry = frame.entries[frame.index - 1];
      return entry === undefined ? [] : [entry[0]];
    });

  const visit = (value: unknown, depth: number, isElement: boolean): EncodeRefusal | undefined => {
    if (value === undefined) {
      return isElement ? EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "undefined-element" }) : undefined;
    }
    if (depth > maxDepth) return EncodeRefusal.TooDeep({ path: pathHere(), maxDepth });
    if (value === null || typeof value === "string" || typeof value === "boolean") return undefined;
    if (typeof value === "number") {
      return Number.isFinite(value) ? undefined : EncodeRefusal.NonFinite({ path: pathHere() });
    }
    if (typeof value === "function") return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "function" });
    if (typeof value === "symbol") return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "symbol" });
    if (typeof value === "bigint") return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "bigint" });
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? EncodeRefusal.NonFinite({ path: pathHere() }) : undefined;
    }
    if (onPath.has(value)) return EncodeRefusal.Circular({ path: pathHere() });
    const brand = brandOf(value);
    if (hasCustomToJSON(value)) return EncodeRefusal.Opaque({ path: pathHere(), kind: "CustomToJSON", brand });
    const isArray = Array.isArray(value);
    if (!isArray && brand !== "Object") {
      return EncodeRefusal.Opaque({ path: pathHere(), kind: opaqueKindOf(value, brand), brand });
    }
    if (hasEnumerableSymbolKey(value)) return EncodeRefusal.Unrepresentable({ path: pathHere(), kind: "symbol" });
    onPath.add(value);
    stack.push({ container: value, entries: entriesOf(value), depth, isArray, index: 0 });
    return undefined;
  };

  const atRoot = visit(root, 0, false);
  if (atRoot !== undefined) return atRoot;
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame === undefined) break;
    const entry = frame.entries[frame.index];
    if (entry === undefined) {
      onPath.delete(frame.container);
      stack.pop();
      continue;
    }
    frame.index += 1;
    const refusal = visit(entry[1], frame.depth + 1, frame.isArray);
    if (refusal !== undefined) return refusal;
  }
  return undefined;
};

/**
 * `true` once a trace nests deeper than `maxDepth` nodes. Iterative, and
 * bounded by `maxDepth`, so a trace no evaluation produced (a cyclic one)
 * still terminates, as too deep.
 */
const traceExceeds = (trace: Trace, maxDepth: number): boolean => {
  const stack: Array<{ readonly node: Trace; readonly depth: number }> = [{ node: trace, depth: 1 }];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    if (frame.depth > maxDepth) return true;
    for (const child of frame.node.children) stack.push({ node: child, depth: frame.depth + 1 });
  }
  return false;
};

/**
 * Refuses, before the encode, the two recursive positions the wire schema
 * descends with no bound of its own — so the encode itself cannot overflow
 * the stack (a policy about 5,000 levels deep made it throw). Each bound is
 * no tighter than the final walk's: a policy or trace more than
 * `MAX_DECODE_DEPTH` nodes deep is more than that deep on the wire too, so
 * these refuse nothing the walk would accept.
 *
 * `policyDepth` is memoised per policy object and already computed for any
 * record `evaluate` produced; it throws only on a cycle.
 */
const preEncodeHazard: (record: SinkRecord) => EncodeRefusal | undefined = Match.type<SinkRecord>().pipe(
  Match.tagsExhaustive({
    Obligations: () => undefined,
    Decision: (record) => {
      const depth = Result.try(() => policyDepth(record.policy));
      if (Result.isFailure(depth)) return EncodeRefusal.Circular({ path: ["policy"] });
      if (depth.success > MAX_DECODE_DEPTH) {
        return EncodeRefusal.TooDeep({ path: ["policy"], maxDepth: MAX_DECODE_DEPTH });
      }
      return record.outcome._tag === "Decided" && traceExceeds(record.outcome.decision.trace, MAX_DECODE_DEPTH)
        ? EncodeRefusal.TooDeep({ path: ["decided", "trace"], maxDepth: MAX_DECODE_DEPTH })
        : undefined;
    },
  }),
);

/** The wire schema's encoder, built once. */
const encodeWire = Schema.encodeResult(SinkRecordWire);

/** A thrown value's message, without letting a hostile `toString` throw again. */
const describeThrown = (thrown: unknown): string =>
  Result.getOrElse(
    Result.try(() => (thrown instanceof Error ? thrown.message : String(thrown))),
    () => "a value that could not be described",
  );

const encodeFailed = (thrown: unknown): EncodeRefusal => EncodeRefusal.EncodeFailed({ message: describeThrown(thrown) });

/**
 * A record as a verified JSON wire value, or the reason it cannot be one.
 *
 * Runs the depth pre-checks, the schema encode (so every resolver error's
 * `cause` crosses through `Schema.Defect()`, ADR-QD-060), and then one walk
 * over the encoded output. What it returns `JSON.stringify` renders without
 * throwing and {@link decodeSinkRecord} accepts (INV-QD-902); it never
 * throws, whatever the record holds (INV-QD-903).
 */
export const encodeSinkRecord = (record: SinkRecord): Result.Result<SinkRecordJson, SinkRecordNotEncodable> => {
  const refuse = (refusal: EncodeRefusal) =>
    Result.fail(new SinkRecordNotEncodable({ recordTag: record._tag, evaluationId: record.evaluationId, refusal }));

  const before = Result.try({ try: () => preEncodeHazard(record), catch: encodeFailed });
  if (Result.isFailure(before)) return refuse(before.failure);
  if (before.success !== undefined) return refuse(before.success);

  const encoded = Result.try({ try: () => encodeWire(project(record)), catch: encodeFailed });
  if (Result.isFailure(encoded)) return refuse(encoded.failure);
  if (Result.isFailure(encoded.success)) return refuse(encodeFailed(encoded.success.failure));
  const json = encoded.success.success;

  const hazard = Result.try({ try: () => wireHazard(json, MAX_DECODE_DEPTH), catch: encodeFailed });
  if (Result.isFailure(hazard)) return refuse(hazard.failure);
  if (hazard.success !== undefined) return refuse(hazard.success);
  return Result.succeed(json);
};

/**
 * A record as JSON text, or the reason it cannot be.
 *
 * `JSON.stringify` cannot throw here: {@link encodeSinkRecord} has verified the
 * value is cycle-free, at most `MAX_DECODE_DEPTH` levels deep, holds no
 * `bigint`, and has no `toJSON` but `Date`'s.
 */
export const encodeSinkRecordString = (record: SinkRecord): Result.Result<string, SinkRecordNotEncodable> =>
  Result.map(encodeSinkRecord(record), (json) => JSON.stringify(json));

/**
 * Rebuilds a record from an already-validated wire value. Kept exported only
 * until every caller has moved to {@link decodeSinkRecord} (ARCH-09 T10
 * removes it).
 */
export const fromWireUnsafe: (wire: SinkRecordWire) => SinkRecord = rebuild;

/** The wire schema's untrusted decoder, built once. */
const decodeWire = Schema.decodeUnknownResult(SinkRecordWire, UNTRUSTED_DECODE_OPTIONS);

const notDecodable = (refusal: DecodeRefusal) => Result.fail(new SinkRecordNotDecodable({ refusal }));

/**
 * Untrusted input as a record, or the reason it is not one.
 *
 * The depth guard runs first, so the schema's recursion through `Policy` and
 * `Trace` cannot overflow; then the schema decode with
 * `UNTRUSTED_DECODE_OPTIONS`; then the rebuild into record classes. It accepts
 * whatever {@link encodeSinkRecord} emits (INV-QD-902).
 *
 * **The seam for the wire's shape.** How the outcome is carried, the
 * neither/both fallbacks below (tickets 96 and 155) and any future version
 * handling live behind this function, so no adapter observes them and a change
 * to them is an edit to this module alone.
 *
 * No `Result.try` around the decode: the depth guard is what makes it safe, and
 * a throw past it would be a library defect that should stay visible.
 */
export const decodeSinkRecord = (input: unknown): Result.Result<SinkRecord, SinkRecordNotDecodable> => {
  if (exceedsJsonDepth(input, MAX_DECODE_DEPTH)) {
    return notDecodable(DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }));
  }
  const wire = decodeWire(input);
  if (Result.isFailure(wire)) return notDecodable(DecodeRefusal.Malformed({ message: wire.failure.message }));
  return Result.succeed(rebuild(wire.success));
};

/**
 * JSON text as a record, or the reason it is not one: `NotJson` when the text
 * does not parse, otherwise whatever {@link decodeSinkRecord} says. Never
 * throws (INV-QD-903).
 */
export const decodeSinkRecordString = (text: string): Result.Result<SinkRecord, SinkRecordNotDecodable> => {
  const parsed = Result.try((): unknown => JSON.parse(text));
  return Result.isFailure(parsed) ? notDecodable(DecodeRefusal.NotJson()) : decodeSinkRecord(parsed.success);
};

/** Encodes a record to a plain JSON value. */
export const encodeRecord = Schema.encodeEffect(SinkRecordWire);

/**
 * `encodeRecord`'s synchronous sibling — for a caller who already knows the
 * encode cannot fail and does not want to pay for the `Effect` wrapping.
 *
 * `SinkRecordWire`'s encode direction is provably total for anything `toWire`
 * produces: every field it and its nested schemas (`Policy`, `TraceSchema`,
 * `Obligation`, `EvaluationErrorSchema`) encode with is a plain structural
 * one — `Schema.Struct`/`Schema.Union`/`Schema.Array`/`Schema.optional` over
 * `Schema.String`/`Schema.Number`/`Schema.Literals`, none of it a `Schema.filter`
 * or other refinement that could reject an already-well-typed value on the way
 * *out*. The depth guard `Policy.ts`'s `MAX_DECODE_DEPTH`/`exceedsJsonDepth`
 * enforce is wrapped around **decode** specifically (`fromJson`,
 * `decodePolicyUnknown`) — a value already held as a typed `Policy` was
 * already validated at whichever decode produced it, and encoding it back out
 * does not re-walk that check. `DecisionSinkForwarding.ts`'s `record` is what
 * this exists for (issue #107) — it previously paid `Effect.flatMap` and the
 * `Effect`-returning encoder's own machinery for a step `@qadi/http`'s own
 * `DecisionStreamRoute.ts` already treats as total, calling `toWire` and
 * `JSON.stringify`-ing the result directly with no `Schema` encode step at
 * all.
 */
export const encodeRecordSync = Schema.encodeSync(SinkRecordWire);

/**
 * **Known gap, not fixed here (GH-01): this hard-rejects forward version
 * skew, the mirror image of the backward skew `SinkRecordWire.subjectId`'s
 * own doc comment says would be unacceptable.** `UNTRUSTED_DECODE_OPTIONS`
 * sets `onExcessProperty: "error"` — correctly, for the embedded `Policy`,
 * where an adversarial typo'd field must fail rather than decode silently
 * (ADR-QD-002). But it applies to the whole envelope, not just `Policy`, so a
 * NEWER sender that has gained an envelope-level field an OLDER receiver's
 * schema does not know about hard-rejects the record outright — exactly the
 * "silently drop real decisions for the length of the deploy" harm the
 * subjectId comment above says a sender predating a field must not suffer,
 * just on the envelope's *shape* instead of one field's presence.
 *
 * Not fixed locally because both ways to close it are wire-protocol design
 * decisions, not local patches: either give the envelope a version/known-
 * fields marker so an older reader can tolerate unknown envelope keys while
 * `Policy` stays strict, or split the decode so `onExcessProperty: "error"`
 * applies only at the `Policy`/`TraceSchema` positions and the envelope
 * itself uses the default (lenient) excess-property handling — `Schema`'s
 * `ParseOptions` apply to a whole decode call, not per nested schema, so the
 * second option needs decoding the envelope and its embedded `Policy`
 * separately rather than as one `Schema.decodeUnknownEffect` call. Either
 * choice changes this module's wire contract and belongs in an ADR, per the
 * recommendation on issue GH-01, not as a guess made in a doc comment.
 */
const decodeSinkRecordWireUnknown = Schema.decodeUnknownEffect(SinkRecordWire, UNTRUSTED_DECODE_OPTIONS);

/**
 * Decodes a record's wire form from **untrusted** input.
 *
 * Pre-checks structural depth with {@link exceedsJsonDepth}
 * (`DecodeDepthGuard.ts`) before `Schema` ever recurses into the input — the
 * same shared guard, in the same order, `Policy.ts`'s own
 * `fromJson`/`fromJsonValue` run it in, and for the same reason:
 * `SinkRecordWire` embeds `Policy` and the self-recursive `TraceSchema`, and
 * neither has a depth cap of its own. Without this check, `Schema`'s own
 * descent through `Schema.suspend` raises a raw `RangeError` defect on a
 * payload nested past the call stack's limit — the exact class of
 * stack-overflow the 0.4.0 hardening fixed for
 * `Policy.fromJson`/`fromJsonValue`, still reachable through every
 * sink/hydration decode path that went through this file instead. Fails
 * with `PolicyDecodeTooDeep` rather than a second, look-alike error type —
 * the failure is the identical shape in both places, raw JSON nested deeper
 * than a decoder can safely walk, so a second class here would just be the
 * drift ADR-QD-002's reasoning warns about, one error type over.
 *
 * The guard itself used to be a second, hand-copied implementation kept in
 * lock-step with `Policy.ts`'s by doc comment alone rather than by the
 * compiler — exactly the drift ADR-QD-002 exists to rule out for the codec
 * it sits beside. `DecodeDepthGuard.ts` is the fix: one implementation,
 * imported by both call sites (and available to a third, `@qadi/react`'s
 * `Hydration.ts`, which decodes the same two recursive shapes from a
 * dehydrated payload and now guards them the same way).
 *
 * Also decodes with {@link UNTRUSTED_DECODE_OPTIONS} (CCR-QD-139), for the same
 * reason `Policy.ts`'s own untrusted entry points do: `SinkRecordWire` embeds
 * `Policy` across the identical trust boundary ADR-QD-002 describes, and without
 * it an excess property on an otherwise-valid tag — a typo'd
 * `{"_tag":"HasPermission","permision":...}` — decoded silently rather than
 * failing, dropping the grant rather than reporting the typo.
 */
export const decodeRecordWire = (
  input: unknown,
): Effect.Effect<SinkRecordWire, PolicyDecodeTooDeep | Schema.SchemaError> =>
  exceedsJsonDepth(input, MAX_DECODE_DEPTH)
    ? Effect.fail(new PolicyDecodeTooDeep({ maxDepth: MAX_DECODE_DEPTH }))
    : decodeSinkRecordWireUnknown(input);

/**
 * Decodes an untrusted value into a `SinkRecord`.
 *
 * Validates first, then rebuilds. A malformed payload fails with a
 * `Schema.SchemaError`; a payload nested past {@link decodeRecordWire}'s
 * depth guard fails with `PolicyDecodeTooDeep`. Either way it never produces
 * a half-built record.
 */
export const decodeRecord = (input: unknown) =>
  Effect.map(decodeRecordWire(input), rebuild);
