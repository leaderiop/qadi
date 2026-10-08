/**
 * The HTTP route family that answers a host's ports for a remote asker
 * (ARCH-31, ADR-QD-NEXT): `POST <prefix>/<PortName>` with a JSON question,
 * answering with the closed `PortWireReply` as JSON.
 *
 * Only an adapter. Decoding the question, refusing one about any subject but
 * the session's, checking the host's serving declaration and reading the port
 * are `answerRemotely`'s (`@qadi/core`); this module speaks HTTP and nothing
 * else (ADR-QD-036). `POST` rather than `GET`, because a custom-predicate
 * question carries JSON, there is no number parsing from a query string, and no
 * cache will store a per-session answer; every reply carries
 * `Cache-Control: no-store` for the same reason.
 *
 * **The subject is the session's.** Both forms take it from `SubjectExtractor`
 * and provide it as `CurrentSubject`; neither reads a subject from the body. A
 * question that names anyone else is a 403 and names no one's answer.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type {
  Permission,
  Policy,
  PortName,
  PortServices,
  PortServing,
  PortWireRefusal,
  PortWireReply,
} from "@qadi/core";
import { answerRemotely, CurrentSubject, forEveryPort, tabulatePorts } from "@qadi/core";
import { loadNoResource } from "./NoResource.ts";
import { addGuardedRoute } from "./PermissionRegistry.ts";
import { toResponse } from "./QadiHttpError.ts";
import { SubjectExtractor } from "./SubjectExtractor.ts";

/**
 * The status each refusal answers with, closed over the refusals so a new one is
 * a compile error here and not a 500.
 */
const REFUSAL_STATUS: { readonly [R in PortWireRefusal]: number } = {
  Malformed: 400,
  SubjectMismatch: 403,
  NotServed: 404,
  Unencodable: 500,
};

/**
 * The HTTP status a reply is sent with: `Answered` 200, `Unavailable` 503, and a
 * refusal by its reason.
 *
 * The body is always the reply, and a client decodes it whatever the status, so
 * the semantics live in the reply and the status is only for the layers between
 * (a proxy, a log, `curl`).
 */
export const PORT_REPLY_STATUS: (reply: PortWireReply) => number = Match.type<PortWireReply>().pipe(
  Match.tagsExhaustive({
    Answered: () => 200,
    Unavailable: () => 503,
    Refused: (reply) => REFUSAL_STATUS[reply.reason],
  }),
);

/** Options for {@link portRoutes} and {@link portRoutesUnguarded}. */
export interface PortRoutesOptions {
  /** Where the routes mount, without a trailing slash. Defaults to `"/__ports"`. */
  readonly prefix?: `/${string}` | undefined;
}

const DEFAULT_PREFIX = "/__ports";

const pathOf = (options: PortRoutesOptions | undefined, port: PortName): `/${string}` =>
  `${options?.prefix ?? DEFAULT_PREFIX}/${port}`;

/** A reply as a response: its status from the table, never cached. */
const respond = (reply: PortWireReply): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.jsonUnsafe(reply, {
    status: PORT_REPLY_STATUS(reply),
    headers: { "cache-control": "no-store" },
  });

/** The request's JSON body, or `undefined` when it has none to read — a malformed question. */
const questionOf = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  return yield* request.json.pipe(Effect.orElseSucceed((): unknown => undefined));
});

/** One port's answering half, closed over its serving declaration. */
type Answer = (body: unknown) => Effect.Effect<PortWireReply, never, PortServices | CurrentSubject>;

/**
 * Each served port's `answerRemotely`, or `undefined` where `serving` does not
 * name the port.
 *
 * Built through the registry so the route code below is not generic in the
 * port: a port not named has no route at all.
 */
const answersFor = (serving: PortServing): { readonly [K in PortName]: Answer | undefined } =>
  tabulatePorts<{ readonly [K in PortName]: Answer | undefined }>((d) => {
    const declared = serving[d.port];
    return declared === undefined ? undefined : (body) => answerRemotely(d, declared)(body);
  });

/** Every port, in the registry's order. */
const PORT_NAMES: ReadonlyArray<PortName> = forEveryPort((d): PortName => d.port);

const merged = <R>(layers: ReadonlyArray<Layer.Layer<never, never, R>>): Layer.Layer<never, never, R> =>
  layers.reduce<Layer.Layer<never, never, R>>((all, layer) => Layer.merge(all, layer), Layer.empty);

/**
 * Serves each port `serving` names, **behind a policy**, and lists every route in
 * `/__permissions`.
 *
 * Guarded through `addGuardedRoute`, so a denied subject is a 403 and a broken
 * attribute store a 502 like any guarded route, and the registry knows the
 * paths. The question is answered about the extracted subject only. A port not
 * named in `serving` is not routed at all.
 */
export const portRoutes = <P extends Permission>(
  permission: P,
  policy: Policy,
  serving: PortServing,
  options?: PortRoutesOptions,
) => {
  const answers = answersFor(serving);
  return merged(
    PORT_NAMES.map((port) => {
      const answer = answers[port];
      if (answer === undefined) return Layer.empty;
      return addGuardedRoute(
        "POST",
        pathOf(options, port),
        permission,
        policy,
        loadNoResource,
      )(() => Effect.map(Effect.flatMap(questionOf, answer), respond));
    }),
  );
};

/**
 * Serves each port `serving` names with **no** policy: the extracted subject is
 * answered about itself and nothing else.
 *
 * The `reason` is never read. It exists so that an unguarded route is something
 * a reviewer can see somebody decided, the role `publicEndpoint(reason)` plays
 * for an endpoint and `permissionRegistryRouteUnguarded(reason)` for the
 * registry. Unlike that route this logs **once, at construction**: a port route
 * is hit on every client re-check, and a warning per request would bury the log
 * it is meant to appear in.
 *
 * An anonymous caller is answered about the anonymous subject, so a store that
 * knows nothing of it answers as it would to any unknown id. Nothing is
 * registered in `/__permissions`, because there is no permission to list.
 */
export const portRoutesUnguarded = (
  reason: string,
  serving: PortServing,
  options?: PortRoutesOptions,
) => {
  const answers = answersFor(serving);
  return Layer.merge(
    Layer.effectDiscard(
      Effect.logWarning(
        "qadi/http: serving port routes unguarded — each answers only about the " +
          `request's own subject. Reason given: ${reason}`,
      ),
    ),
    merged(
      PORT_NAMES.map((port) => {
        const answer = answers[port];
        if (answer === undefined) return Layer.empty;
        return HttpRouter.add(
          "POST",
          pathOf(options, port),
          Effect.gen(function* () {
            const request = yield* HttpServerRequest.HttpServerRequest;
            const extracted = yield* Effect.result(SubjectExtractor.extract(request));
            if (extracted._tag === "Failure") return toResponse(extracted.failure);
            const body = yield* questionOf;
            const reply = yield* answer(body).pipe(
              Effect.provideService(CurrentSubject, extracted.success),
            );
            return respond(reply);
          }),
        );
      }),
    ),
  );
};
