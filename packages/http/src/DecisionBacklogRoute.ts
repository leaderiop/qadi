/**
 * `/__decisions/backlog` — a decision log's retained records as one JSON
 * array, for readers that do not stream.
 *
 * The reader it is for is the CLI shell ADR-QD-049 describes, and anything
 * else that wants the past with `curl` rather than an `EventSource`: an
 * operator's script, a support bundle, a test. Each element is a stored-record
 * envelope, `{ environment, record }`, the same bytes `/__decisions` frames
 * carry (`@qadi/core`'s `encodeStoredRecord`), so one decoder —
 * `decodeStoredRecord` — reads both.
 *
 * **Not atomic with `/__decisions`.** Two requests are two reads: a record made
 * between this response and a later stream connection is in neither. A reader
 * that wants the past and the future without a gap uses `/__decisions`, whose
 * prelude is the backlog on the same connection as the live stream.
 *
 * **Guarded, with no unguarded variant**, for the reason `/__decisions` is
 * (BEH-QD-202): it publishes decisions — subject ids, verdicts, resources, and
 * whatever a trace names about why — which is strictly more disclosure than
 * `/__permissions`' topology. It registers with `PermissionRegistry` through
 * `addGuardedRoute`, so `/__permissions` lists it.
 */
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { DecisionLog, Permission, Policy, SinkRecordNotEncodable, StoredRecordJson } from "@qadi/core";
import { encodeStoredRecord, reportEncodeRefusal } from "@qadi/core";
import type { DecisionStreamOptions } from "./DecisionStreamRoute.ts";
import { addGuardedRoute } from "./PermissionRegistry.ts";
import { NO_RESOURCE } from "./RequirePermission.ts";

/**
 * Reports one record the codec refused to serve: `onRefused` when given,
 * otherwise a warning naming the refusal, where in the record it was found,
 * and the evaluation. The record is left out of the body either way.
 */
const reportRefused = Effect.fn("qadi.http.decisionBacklog.refused")(function* (
  refusal: SinkRecordNotEncodable,
  onRefused: ((refusal: SinkRecordNotEncodable) => void) | undefined,
) {
  yield* reportEncodeRefusal(refusal, {
    message: "qadi/http: a decision record could not be served in the backlog",
    onRefused,
  });
});

/**
 * Mounts `/__decisions/backlog`, serving `log`'s retained records to callers
 * the policy permits.
 *
 * The body is a JSON array of stored-record envelopes in `storedRecordOrder`,
 * `content-type: application/json` and `cache-control: no-store` — a snapshot
 * of authorization data a shared cache must not keep. A record the codec
 * refuses is left out and reported, so one record never empties the response.
 *
 * `log` is anything with a `snapshot` — a `DecisionLog`, or a fake — so this
 * route cannot write to the log it serves.
 */
export const decisionBacklogRoute = <P extends Permission>(
  permission: P,
  policy: Policy,
  log: Pick<DecisionLog, "snapshot">,
  options?: Pick<DecisionStreamOptions, "onRefused">,
) =>
  addGuardedRoute(
    "GET",
    "/__decisions/backlog",
    permission,
    policy,
    () => Effect.succeed(NO_RESOURCE),
  )(() =>
    Effect.gen(function* () {
      const records = yield* log.snapshot;
      const body: Array<StoredRecordJson> = [];
      for (const stored of records) {
        const encoded = encodeStoredRecord(stored);
        if (Result.isSuccess(encoded)) body.push(encoded.success);
        else yield* reportRefused(encoded.failure, options?.onRefused);
      }
      // `JSON.stringify` cannot throw here: every element passed the codec's
      // walk, which refuses cycles, `bigint`, depth past the decode bound and
      // any `toJSON` but `Date`'s.
      return HttpServerResponse.text(JSON.stringify(body), {
        contentType: "application/json",
        headers: { "cache-control": "no-store" },
      });
    }),
  );
