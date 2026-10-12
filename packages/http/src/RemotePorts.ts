/**
 * The client half of a remote port: the ports a host answers over HTTP, as one
 * layer (ARCH-31, ADR-QD-NEXT).
 *
 * Only an adapter. `remotePorts` (`@qadi/core`) builds each port's Shape from a
 * `send` and turns every non-answer into the port's own typed error; this
 * module supplies a `send` over `HttpClient`. The question is a JSON `POST` to
 * `<baseUrl><prefix>/<PortName>`, and the reply body is decoded **whatever the
 * status**, because the body is the reply (`PortRoutes.ts`): a 503 with an
 * `Unavailable` reply is an outage, a 502 from a proxy with an HTML page is a
 * transport failure, and neither is ever read as an answer.
 *
 * The host provides the client: `FetchHttpClient.layer` in a browser, and for
 * cookies `Layer.succeed(FetchHttpClient.RequestInit, { credentials: "same-origin" })`.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import type { PortName, PortServices } from "@qadi/core";
import { RemotePortFailure, remotePorts } from "@qadi/core";

/** Where the answering side's port routes are, and which ports to ask them. */
export interface RemotePortsOptions {
  /** The answering side's origin and path, without a trailing slash: `"https://api.example.com"` or `"/api"`. */
  readonly baseUrl: string;
  /** The ports to ask remotely. Every other port keeps its fail-closed default. */
  readonly ports: ReadonlyArray<PortName>;
  /** Where the answering side mounts its routes (`PortRoutesOptions.prefix`). Defaults to `"/__ports"`. */
  readonly prefix?: `/${string}` | undefined;
}

const DEFAULT_PREFIX = "/__ports";

const transport = (error: unknown): RemotePortFailure =>
  RemotePortFailure.Transport({ message: error instanceof Error ? error.message : String(error) });

/**
 * The ports `options` names, asked of the answering side over `HttpClient`.
 *
 * Requires the client and provides the port services, exactly where a host
 * would provide `portsLayer`.
 */
export const remotePortsLayer = (
  options: RemotePortsOptions,
): Layer.Layer<PortServices, never, HttpClient.HttpClient> =>
  Layer.unwrap(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      return remotePorts(
        (port, question) =>
          HttpClientRequest.post(`${options.baseUrl}${options.prefix ?? DEFAULT_PREFIX}/${port}`).pipe(
            HttpClientRequest.bodyJson(question),
            Effect.flatMap((request) => client.execute(request)),
            Effect.flatMap((response) => response.json),
            Effect.mapError(transport),
          ),
        options.ports,
      );
    }),
  );
