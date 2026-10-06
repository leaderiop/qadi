/**
 * Steps for `wire-versions.feature`.
 *
 * A dedicated `Context.Service` World, scoped to this Feature only: these
 * scenarios are about bytes crossing between two processes, not about one
 * decision, the same reasoning as `hydration-counts.steps.test.ts`.
 *
 * Only the public interface is used — `encodeSinkRecordString`,
 * `decodeSinkRecordString` and `@qadi/audit`'s `decodeAuditEntry` — and the
 * version-1 bytes are literals, written the way a release before 0.10 wrote
 * them: nothing has written version 1 since 0.10, and nothing reads it since
 * 0.11.0 (ADR-QD-096's 2026-10-06 amendment), so they appear here only as the
 * input of refusals.
 */
import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import {
  DecisionRecord,
  DecodeRefusal,
  decodeSinkRecordString,
  encodeSinkRecordString,
  Failed,
  hasPermission,
  makeSubjectId,
  MissingResource,
  permission,
  WIRE_VERSIONS,
} from "@qadi/core";
import type { SinkRecord, SinkRecordNotDecodable } from "@qadi/core";
import { decodeAuditEntry } from "@qadi/audit";

const feature = await loadFeature(fileURLToPath(new URL("./wire-versions.feature", import.meta.url)));

/** The record every scenario sends: a resolver could not find `owner`. */
const sent: SinkRecord = new DecisionRecord({
  evaluationId: "g",
  at: 1,
  subjectId: makeSubjectId("u1"),
  policy: hasPermission(permission("doc", "read")),
  outcome: new Failed({ error: new MissingResource({ attribute: "owner" }) }),
});

const POLICY = '{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}}';
const ENVELOPE_V1 = `"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":${POLICY}`;
const FAILED = '{"_tag":"MissingResource","attribute":"owner"}';
const DECIDED =
  '{"_tag":"Deny","evaluationId":"g","subjectId":"u1","durationMillis":2,"trace":{"policyTag":"HasPermission","allowed":false,"reason":"no","children":[],"obligations":[]},"obligations":[],"reason":"no"}';

/** `sent`, as a release before 0.10 wrote it: wire version 1, no `version`. */
const SENT_V1 = `{${ENVELOPE_V1},"failed":${FAILED}}`;
/** `sent`, as wire version 2. */
const SENT_V2 = `{"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":${POLICY},"outcome":{"_tag":"Failed","error":${FAILED}}}`;
/** A version-2 decision's envelope with no `outcome`. */
const ENVELOPE_V2 = `"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":${POLICY}`;

/** A JSON object's text with one more top-level field. */
const withField = (text: string, key: string, value: unknown): string =>
  JSON.stringify({ ...JSON.parse(text), [key]: value });

interface WireVersionsWorldState {
  readonly text: string;
  readonly read: Result.Result<SinkRecord, SinkRecordNotDecodable> | undefined;
}

const initialState: WireVersionsWorldState = { text: "", read: undefined };

export interface WorldShape {
  readonly state: Ref.Ref<WireVersionsWorldState>;
}

export class World extends Context.Service<World, WorldShape>()("features/wire-versions/World") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      return World.of({ state: yield* Ref.make(initialState) });
    }),
  );
}

const readState = Effect.fn("wire-versions.readState")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

const patch = Effect.fn("wire-versions.patch")(function* (
  fn: (s: WireVersionsWorldState) => Partial<WireVersionsWorldState>,
) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...fn(s) }));
});

/** What was read, failing the scenario if nothing was. */
const readResult = Effect.fn("wire-versions.readResult")(function* () {
  const { read } = yield* readState();
  if (read === undefined) throw new Error("nothing was read");
  return read;
});

describeFeature(feature, World.layer, ({ Before, Given, When, Then }) => {
  Before(function* () {
    const { state } = yield* World;
    yield* Ref.set(state, initialState);
  });

  // -------------------------------------------------------------------------
  // Given
  // -------------------------------------------------------------------------

  Given("a failed decision record carried as wire version 1", function* () {
    yield* patch(() => ({ text: SENT_V1 }));
  });

  Given("a failed decision record carried as wire version 2", function* () {
    yield* patch(() => ({ text: SENT_V2 }));
  });

  Given("a failed decision record", function* () {
    yield* patch(() => ({ text: "" }));
  });

  Given("the sender added an envelope field {string}", function* (key: string) {
    yield* patch((s) => ({ text: withField(s.text, key, "00-abc") }));
  });

  Given("the sender marked it as wire version {int}", function* (version: number) {
    yield* patch((s) => ({ text: withField(s.text, "version", version) }));
  });

  Given("a decision record carried as wire version 1 naming both outcomes", function* () {
    yield* patch(() => ({ text: `{${ENVELOPE_V1},"decided":${DECIDED},"failed":${FAILED}}` }));
  });

  Given("a decision record carried as wire version 2 naming no outcome", function* () {
    yield* patch(() => ({ text: `{${ENVELOPE_V2}}` }));
  });

  Given("an audit row written by an earlier release, whose error still carries its code", function* () {
    yield* patch(() => ({
      text: JSON.stringify({ record: JSON.parse(SENT_V1.replace('"attribute":"owner"', '"attribute":"owner","code":"ACL004"')) }),
    }));
  });

  Given("an audit row whose record is wire version 2", function* () {
    yield* patch(() => ({ text: JSON.stringify({ record: JSON.parse(SENT_V2), sequenceNumber: 1 }) }));
  });

  // -------------------------------------------------------------------------
  // When
  // -------------------------------------------------------------------------

  When("the record is read", function* () {
    yield* patch((s) => ({ read: decodeSinkRecordString(s.text) }));
  });

  When("the audit row is read back", function* () {
    yield* patch((s) => ({ read: Result.map(decodeAuditEntry(JSON.parse(s.text)), (row) => row.record) }));
  });

  When("it is written", function* () {
    const written = encodeSinkRecordString(sent);
    if (Result.isFailure(written)) throw new Error(`refused: ${written.failure.refusal._tag}`);
    yield* patch(() => ({ text: written.success, read: decodeSinkRecordString(written.success) }));
  });

  // -------------------------------------------------------------------------
  // Then
  // -------------------------------------------------------------------------

  Then("it is read as the record that was sent", function* () {
    const read = yield* readResult();
    assert.ok(Result.isSuccess(read), "the record was refused");
    assert.deepStrictEqual(read.success, sent);
  });

  Then("they read back as the record that was sent", function* () {
    const read = yield* readResult();
    assert.ok(Result.isSuccess(read), "the record was refused");
    assert.deepStrictEqual(read.success, sent);
  });

  Then("it is refused as malformed, naming {string}", function* (field: string) {
    const read = yield* readResult();
    assert.ok(Result.isFailure(read), "the record was read");
    const refusal = read.failure.refusal;
    assert.strictEqual(refusal._tag, "Malformed");
    assert.ok(refusal._tag === "Malformed" && refusal.message.includes(`["${field}"]`), JSON.stringify(refusal));
  });

  Then("it is refused as an unsupported version, naming no version", function* () {
    const read = yield* readResult();
    assert.ok(Result.isFailure(read), "the record was read");
    assert.deepStrictEqual(
      read.failure.refusal,
      DecodeRefusal.UnsupportedVersion({ version: undefined, supported: WIRE_VERSIONS }),
    );
  });

  Then("it is refused as an unsupported version", function* () {
    const read = yield* readResult();
    assert.ok(Result.isFailure(read), "the record was read");
    assert.strictEqual(read.failure.refusal._tag, "UnsupportedVersion");
  });

  Then("the bytes are wire version 2, naming the outcome {string}", function* (tag: string) {
    const { text } = yield* readState();
    const bytes: unknown = JSON.parse(text);
    assert.ok(Predicate.hasProperty(bytes, "version") && bytes.version === 2);
    assert.ok(Predicate.hasProperty(bytes, "outcome") && Predicate.hasProperty(bytes.outcome, "_tag"));
    assert.strictEqual(bytes.outcome._tag, tag);
    assert.ok(!Object.hasOwn(bytes, "decided") && !Object.hasOwn(bytes, "failed"));
    assert.strictEqual(text, SENT_V2);
  });
});
