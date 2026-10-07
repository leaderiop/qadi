/**
 * `authorizeRequest`, directly, against plain effects: the
 * order, the scope and the two log lines every `@qadi/http` surface now gets
 * from one place (ARCH-19). Surface-level answers (status, body, projection)
 * stay in `http.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  EvaluationIdLive,
  EvaluationServicesNone,
  RelationshipResolver,
  attributeResolverPort,
  gte,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  literal,
  makeResourceId,
  makeSubject,
  neq,
  obligation,
  obliged,
  permission,
  permissionKey,
  portsLayer,
  PortReply,
  scriptedPort,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import { authorizeRequest, SubjectExtractionFailed, subjectExtractorBearer } from "../src/index.ts";

const readPermission = permission("devtools", "read");
const readPolicy = hasPermission(readPermission);

const ALICE = "alice-token";
const BOB = "bob-token";
const alice = makeSubject({ id: "alice", permissions: [permissionKey(readPermission)] });
const bob = makeSubject({ id: "bob" });

const lookupSubject = (token: string): Effect.Effect<AuthSubject> =>
  Effect.succeed(token === ALICE ? alice : bob);

const requestAs = (token: string) =>
  HttpServerRequest.fromWeb(
    new Request("http://localhost/__decisions", { headers: { authorization: `Bearer ${token}` } }),
  );

const withLogs = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
  const logs: Array<unknown> = [];
  return {
    logs,
    run: effect.pipe(Effect.provide(Logger.layer([Logger.make((options) => logs.push(options.message))]))),
  };
};

const standing = Layer.mergeAll(subjectExtractorBearer(lookupSubject), EvaluationServicesNone);

describe("authorizeRequest", () => {
  it.effect("an allow carries the witness, the evaluated resource and the subject", () =>
    Effect.gen(function* () {
      const result = yield* authorizeRequest(readPermission, readPolicy)(requestAs(ALICE)).pipe(
        Effect.provide(standing),
      );
      assert.deepStrictEqual(result.authorized.permission, readPermission);
      assert.deepStrictEqual(result.resource, {});
      assert.strictEqual(result.subject.id, alice.id);
    }));

  it.effect("a denial fails with AccessDenied and logs exactly one line", () =>
    Effect.gen(function* () {
      const { logs, run } = withLogs(
        authorizeRequest(readPermission, readPolicy)(requestAs(BOB)).pipe(Effect.provide(standing), Effect.flip),
      );
      const error = yield* run;
      assert.strictEqual(error._tag, "AccessDenied");
      assert.deepStrictEqual(logs, [
        [`qadi/http: request denied (ACL001) — subject "bob": subject lacks permission 'devtools:read'`],
      ]);
    }));

  it.effect("an obligation nobody discharged is refused, as connect-time guard refuses it", () =>
    Effect.gen(function* () {
      const policy = obliged(obligation("must-log"), readPolicy);
      const { logs, run } = withLogs(
        authorizeRequest(readPermission, policy)(requestAs(ALICE)).pipe(Effect.provide(standing), Effect.flip),
      );
      const error = yield* run;
      assert.strictEqual(error._tag, "UndischargedObligation");
      assert.strictEqual(logs.length, 1);
    }));

  it.effect("an extraction failure logs one line and never loads the resource", () =>
    Effect.gen(function* () {
      let loads = 0;
      const brokenStore = subjectExtractorBearer(() =>
        Effect.fail(new SubjectExtractionFailed({ reason: "token service unreachable" })),
      );
      const { logs, run } = withLogs(
        authorizeRequest(readPermission, readPolicy, () =>
          Effect.sync(() => {
            loads += 1;
            return {};
          }),
        )(requestAs(ALICE)).pipe(
          Effect.provide(Layer.mergeAll(brokenStore, EvaluationServicesNone)),
          Effect.flip,
        ),
      );
      const error = yield* run;
      assert.strictEqual(error._tag, "SubjectExtractionFailed");
      assert.strictEqual(loads, 0);
      assert.deepStrictEqual(logs, [["qadi/http: subject extraction failed — token service unreachable"]]);
    }));

  it.effect("a resolver outage fails as itself and the edge logs nothing", () =>
    Effect.gen(function* () {
      const brokenResolver = scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer;
      const layer = Layer.mergeAll(
        portsLayer({ AttributeResolver: brokenResolver }),
        subjectExtractorBearer(lookupSubject),
        EvaluationIdLive,
      );
      const { logs, run } = withLogs(
        authorizeRequest(readPermission, hasAttribute("clearance", gte(1)))(requestAs(ALICE)).pipe(
          Effect.provide(layer),
          Effect.flip,
        ),
      );
      const error = yield* run;
      assert.strictEqual(error._tag, "AttributeResolveError");
      assert.deepStrictEqual(logs, []);
    }));

  it.effect("evaluates the loaded resource, and returns that one", () =>
    Effect.gen(function* () {
      const ownerPolicy = hasRelationship("owner");
      const relationshipResolver = Layer.succeed(RelationshipResolver, {
        check: (check) => Effect.succeed(check.resourceId === makeResourceId("doc-1") ? "Related" : "Unrelated"),
      });
      const layer = Layer.mergeAll(
        portsLayer({ RelationshipResolver: relationshipResolver }),
        subjectExtractorBearer(lookupSubject),
        EvaluationIdLive,
      );
      const loaded = yield* authorizeRequest(readPermission, ownerPolicy, () => Effect.succeed({ id: "doc-1" }))(
        requestAs(ALICE),
      ).pipe(Effect.provide(layer));
      assert.deepStrictEqual(loaded.resource, { id: "doc-1" });

      // No `id` reaches `HasRelationship`'s own wiring failure, not a denial.
      const missing = yield* authorizeRequest(readPermission, ownerPolicy, () => Effect.succeed({}))(
        requestAs(ALICE),
      ).pipe(Effect.provide(layer), Effect.flip);
      assert.strictEqual(missing._tag, "MissingResourceId");
    }));

  it.effect("without a loader it evaluates against an empty resource, so a Neq policy denies (BEH-QD-178)", () =>
    Effect.gen(function* () {
      const policy = hasResourceAttribute("owner", neq(literal("zed")));
      const error = yield* authorizeRequest(readPermission, policy)(requestAs(ALICE)).pipe(
        Effect.provide(standing),
        Effect.flip,
      );
      assert.strictEqual(error._tag, "AccessDenied");
    }));

  it.effect("extracts again on every call, so a revocation shows on the next one", () =>
    Effect.gen(function* () {
      let revoked = false;
      const lookup = (token: string): Effect.Effect<AuthSubject> =>
        Effect.succeed(revoked ? bob : token === ALICE ? alice : bob);
      const layer = Layer.mergeAll(subjectExtractorBearer(lookup), EvaluationServicesNone);
      const check = authorizeRequest(readPermission, readPolicy)(requestAs(ALICE)).pipe(Effect.provide(layer));

      assert.strictEqual((yield* Effect.result(check))._tag, "Success");
      revoked = true;
      assert.strictEqual((yield* Effect.result(check))._tag, "Failure");
    }));
});
