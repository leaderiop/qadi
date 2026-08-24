/**
 * The vocabulary a simulation is described in — a leaf module, owned by nobody.
 *
 * `Simulation.ts` runs one, `Sources.ts` decides where its answers come from and
 * `Capture.ts` records them, and all three need these three names. Defining them
 * in any one of the three made an import cycle
 * ([madge](../../../../package.json) is merge gate 5), which is the same
 * situation `Resource.ts` was extracted to fix and it is resolved the same way:
 * a leaf the engine does not own, in the shape `Identity.ts`, `Permission.ts`
 * and `Obligation.ts` already follow.
 */
import type * as Layer from "effect/Layer";
import { makeSubject } from "@qadi/core";
import type {
  ActedEventInput,
  AuthSubject,
  CurrentSubject,
  EvaluationId,
  EvaluationServices,
  PermissionKey,
  RelationshipEdgeInput,
  Resource,
} from "@qadi/core";

/**
 * A subject that does not exist, described in the terms a form produces.
 *
 * Plain strings rather than `Role` values: `makeSubject` already takes role
 * *names* and pre-flattened permission keys, which is exactly what a chip in a
 * text field yields. A caller holding real `Role` values flattens them with
 * `fromRoles` before getting here.
 */
export interface SimulatedSubject {
  readonly id: string;
  readonly roles?: ReadonlyArray<string>;
  readonly permissions?: ReadonlyArray<PermissionKey>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

/**
 * Everything a simulated evaluation needs — as **data**.
 *
 * There is deliberately no `Layer` in this type. A caller cannot hand the
 * simulator a live port through the input, because the input gives them nowhere
 * to put one; the only way to reach real resolvers is the explicit `LiveSource`,
 * which an application author has to construct on purpose.
 */
export interface SimulationInput {
  readonly subject: SimulatedSubject;
  readonly action?: string;
  readonly resource?: Resource;
  /**
   * What the attribute resolver would answer — consulted only on a subject
   * miss, exactly as a real resolver is.
   */
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly relationships?: ReadonlyArray<RelationshipEdgeInput>;
  readonly history?: ReadonlyArray<ActedEventInput>;
}

/**
 * The three ports a source supplies.
 *
 * `CurrentSubject` and `EvaluationId` are excluded because the simulator owns
 * them: the subject is the thing being simulated, and ids are made sequential so
 * two runs can be compared field by field. A `Live` layer able to supply either
 * could change *what is being asked*, not merely how it is answered — so the
 * exclusion is in the type rather than in a convention.
 */
export type EvaluationPorts = Exclude<EvaluationServices, CurrentSubject | EvaluationId>;

/** Convenience for a caller composing a `LiveSource` by hand. */
export type EvaluationPortsLayer = Layer.Layer<EvaluationPorts>;

/** The subject a form described, as the evaluator's `AuthSubject`. */
export const subjectOf = (self: SimulatedSubject): AuthSubject =>
  makeSubject({
    id: self.id,
    roles: self.roles ?? [],
    permissions: self.permissions ?? [],
    attributes: self.attributes ?? {},
  });
