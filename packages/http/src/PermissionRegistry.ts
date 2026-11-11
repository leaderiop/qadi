/**
 * A queryable registry of which permission each endpoint requires, which the
 * `/__permissions` introspection route (`PermissionRegistryRoute.ts`) serves.
 *
 * Populated from two mechanisms feeding one model, per ADR-QD-036 Rev 1.6:
 * `guardApi` (`GuardApi.ts`) registers its access plan's `Required`
 * endpoints (`AccessPlan.ts`) when the layer that provides `RequirePermission` is built, and
 * `addGuardedRoute` (`GuardRoute.ts`) pushes a descriptor at the point a bare
 * `HttpRouter` route registers — forced apart only because `HttpApiEndpoint`
 * carries an annotation slot and a bare `HttpRouter.Route` does not. Each registers as a
 * consequence of guarding, never as a second call to remember. Both
 * write through the same `register` method on the same `Ref`-backed
 * `Context.Service`, ordered by `Layer` composition rather than a plain
 * mutable module-level collection, so the registry provably cannot be read
 * before every route that populates it has run.
 *
 * The `/__permissions` routes are not here. They are `addGuardedRoute` callers
 * and this module is what `addGuardedRoute` writes to, so they live in
 * `PermissionRegistryRoute.ts`; here they would close an import cycle
 * (ADR-QD-037, ARCH-75).
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import type { Permission, PermissionKey } from "@qadi/core";
import { permissionKey } from "@qadi/core";

/** One route that requires a permission, as recorded in `PermissionRegistry`. */
export interface EndpointDescriptor {
  readonly method: string;
  readonly path: string;
  readonly group: string | undefined;
}

export type PermissionRegistryData = HashMap.HashMap<PermissionKey, ReadonlyArray<EndpointDescriptor>>;

const addDescriptor = (
  data: PermissionRegistryData,
  key: PermissionKey,
  descriptor: EndpointDescriptor,
): PermissionRegistryData =>
  HashMap.modifyAt(
    data,
    key,
    Option.match({
      onNone: () => Option.some<ReadonlyArray<EndpointDescriptor>>([descriptor]),
      onSome: (existing) => Option.some([...existing, descriptor]),
    }),
  );

export interface PermissionRegistryShape {
  readonly register: (permission: Permission, descriptor: EndpointDescriptor) => Effect.Effect<void>;
  readonly snapshot: Effect.Effect<PermissionRegistryData>;
}

export class PermissionRegistry extends Context.Service<PermissionRegistry, PermissionRegistryShape>()(
  "qadi/http/PermissionRegistry",
) {
  static readonly register = (permission: Permission, descriptor: EndpointDescriptor) =>
    PermissionRegistry.use((r) => r.register(permission, descriptor));
  static readonly snapshot = PermissionRegistry.use((r) => r.snapshot);
}

/**
 * The registry's base layer: an empty `Ref`-backed store. Sufficient on its
 * own: `guardApi` registers the endpoints it planned from an `HttpApi` into it and
 * `addGuardedRoute` a bare route, so every stack that guards anything provides
 * this layer.
 */
export const PermissionRegistryLive: Layer.Layer<PermissionRegistry> = Layer.effect(
  PermissionRegistry,
  Effect.gen(function* () {
    const ref = yield* Ref.make<PermissionRegistryData>(HashMap.empty());
    return {
      register: (permission, descriptor) =>
        Ref.update(ref, (data) => addDescriptor(data, permissionKey(permission), descriptor)),
      snapshot: Ref.get(ref),
    };
  }),
);
