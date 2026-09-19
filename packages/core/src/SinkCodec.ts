/**
 * The wire form of a {@link SinkRecord}, so a sink can forward one to another
 * process.
 *
 * An in-memory sink hands a consumer the real objects. Anything that crosses a
 * boundary — a socket to a devtools page, a replica forwarding to a shared
 * store, a serverless function shipping its log before it dies — needs a form
 * that survives JSON and can be rebuilt on the far side. That is not a transport
 * concern: the wire *shape* is a contract two processes agree on, and it belongs
 * beside the record it describes rather than inside whichever transport happens
 * to carry it first.
 *
 * **Schema-derived, decoded as untrusted.** A record crossing a process boundary
 * crosses a trust boundary, which is the reasoning
 * [ADR-QD-002](../../../spec/decisions/002-schema-derived-policy-adt.md) applies to
 * policies — and hand-written codecs drifting from their types is the defect
 * this library was rewritten to remove. `decodeRecord` therefore validates; it
 * does not cast.
 *
 * **The nine `EvaluationError` tags are the one exception to "hand-written
 * class, Schema at the boundary"** ([AGENTS.md §4](../../../AGENTS.md),
 * [ADR-QD-060](../../../spec/decisions/060-schema-taggederror-for-the-nine-wire-crossing-errors.md)):
 * they are `Schema.TaggedError` classes, so the class already *is* the wire
 * schema and {@link EvaluationErrorSchema} below is nothing more than their
 * union — no second, hand-mapped description to drift from the first.
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
import type { Decision } from "./Decision.ts";
import { Allow, Deny, TraceSchema } from "./Decision.ts";
import type { SinkRecord } from "./DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord } from "./DecisionRecord.ts";
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
} from "./Errors.ts";
import { makeSubjectId } from "./Identity.ts";
import { Obligation } from "./Obligation.ts";
import { MAX_DECODE_DEPTH, Policy, PolicyDecodeTooDeep, UNTRUSTED_DECODE_OPTIONS } from "./Policy.ts";

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

const DecisionSchema = Schema.Struct({
  _tag: Schema.Literals(["Allow", "Deny"]),
  evaluationId: Schema.String,
  subjectId: Schema.String,
  durationMillis: Schema.Number,
  trace: TraceSchema,
  visibleFields: Schema.optional(Schema.Array(Schema.String)),
  obligations: Schema.Array(Obligation),
  reason: Schema.optional(Schema.String),
});

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
    decided: Schema.optional(DecisionSchema),
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

const encodeDecision = (decision: Decision): typeof DecisionSchema.Type => {
  const base = {
    evaluationId: decision.evaluationId,
    subjectId: decision.subjectId,
    durationMillis: decision.durationMillis,
    trace: decision.trace,
    obligations: decision._tag === "Allow" ? decision.obligations : [],
  };
  return decision._tag === "Allow"
    ? {
        ...base,
        _tag: "Allow",
        ...(decision.visibleFields === undefined
          ? {}
          : { visibleFields: decision.visibleFields }),
      }
    : { ...base, _tag: "Deny", reason: decision.reason };
};

const decodeDecision = (wire: typeof DecisionSchema.Type): Decision =>
  wire._tag === "Allow"
    ? new Allow({
        evaluationId: wire.evaluationId,
        subjectId: makeSubjectId(wire.subjectId),
        durationMillis: wire.durationMillis,
        trace: wire.trace,
        visibleFields: wire.visibleFields,
        obligations: wire.obligations,
      })
    : new Deny({
        evaluationId: wire.evaluationId,
        subjectId: makeSubjectId(wire.subjectId),
        durationMillis: wire.durationMillis,
        trace: wire.trace,
        reason: wire.reason ?? "denied",
      });

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
      if (onPath.has(child)) return false;
      onPath.add(child);
      stack.push({ value: child, children: childrenOf(child), index: 0 });
    } else if (!isJsonScalarSafe(child)) {
      return false;
    }
  }

  return true;
};

/**
 * True when every caller-supplied `unknown` value a `SinkRecord` can carry
 * reaches the wire safely — `resource` **and** `policy`'s `HasCustom.params`.
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
      isJsonSafe(record.policy),
  }),
);

/**
 * The wire projection of a record, ready to be JSON-encoded.
 *
 * `Match.tagsExhaustive` over `SinkRecord`, not a ternary on `record._tag` —
 * see {@link isRecordJsonSafe}'s doc comment for why a ternary here is
 * false-exhaustive rather than merely stylistic.
 */
export const toWire: (record: SinkRecord) => SinkRecordWire = Match.type<SinkRecord>().pipe(
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
export const fromWireUnsafe: (wire: SinkRecordWire) => SinkRecord = Match.type<SinkRecordWire>().pipe(
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
  Effect.map(decodeRecordWire(input), fromWireUnsafe);
