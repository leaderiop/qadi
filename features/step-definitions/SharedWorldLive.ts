import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import { initialWorldState, World } from "./SharedWorld.ts";

export const WorldLive = Layer.effect(
  World,
  Effect.gen(function* () {
    return World.of({ state: yield* Ref.make(initialWorldState) });
  }),
);
