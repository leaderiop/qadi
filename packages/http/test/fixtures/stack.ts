/**
 * The test stack every `@qadi/http` route test composes: the routes, then the
 * permission registry, the subject extractor, the evaluation services, an optional decision
 * cache and the platform services, each provided to everything before it (ARCH-36 D-36-f).
 *
 * Test-only on purpose. The stack's steps are an application's inputs (which subjects, which
 * ports, a cache, a log), so a library layer cannot own them; a test that needs a different
 * shape composes its own. Naming the steps here is for reading: a single inline chain infers
 * correctly on `effect@4.0.0`.
 */
import * as Layer from "effect/Layer";
import * as HttpServer from "effect/http/HttpServer";
import { decisionCacheLayer } from "@qadi/core";
import { PermissionRegistryLive } from "../../src/PermissionRegistry.ts";
import type { SubjectExtractor } from "../../src/SubjectExtractor.ts";

/** Wraps `routes` in the registry, `subjects`, `services` and the platform services. */
export const stack = <A, E, R, S>(
  routes: Layer.Layer<A, E, R>,
  subjects: Layer.Layer<SubjectExtractor>,
  services: Layer.Layer<S>,
) => {
  const withRegistry = routes.pipe(Layer.provideMerge(PermissionRegistryLive));
  const withSubjects = withRegistry.pipe(Layer.provideMerge(subjects));
  const withServices = withSubjects.pipe(Layer.provideMerge(services));
  return withServices.pipe(Layer.provideMerge(HttpServer.layerServices));
};

/** {@link stack} with a `DecisionCache` between the services and the platform services. */
export const stackWithCache = <A, E, R, S>(
  routes: Layer.Layer<A, E, R>,
  subjects: Layer.Layer<SubjectExtractor>,
  services: Layer.Layer<S>,
) => {
  const withRegistry = routes.pipe(Layer.provideMerge(PermissionRegistryLive));
  const withSubjects = withRegistry.pipe(Layer.provideMerge(subjects));
  const withServices = withSubjects.pipe(Layer.provideMerge(services));
  const withCache = withServices.pipe(Layer.provideMerge(decisionCacheLayer()));
  return withCache.pipe(Layer.provideMerge(HttpServer.layerServices));
};
