/**
 * Builds each feed and the dock model the way a host does: bare, then configured.
 *
 * A host's hook builds the value with no inputs and hands them through `configure`
 * inside the same build, so a test that builds the same way tests what ships. A
 * `configure` that throws (a refused capacity) becomes the build's defect, as a throw
 * from a constructor's body is.
 *
 * `configuredBy` is that one step for all four, and `react/useConfigured.ts` is the hook
 * form of the same step. It is structural, so this file imports nothing from `src/react`.
 */
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import { makeDiagnosticsFeed, type DiagnosticsFeed } from "../src/model/DiagnosticsFeed.ts";
import type { DiagnosticsOptions } from "../src/model/Diagnostics.ts";
import { makeDockModel, type DockModel, type DockModelInputs } from "../src/model/DockModel.ts";
import { makeGatesFeed, type GatesFeed, type GatesFeedInputs } from "../src/model/GatesFeed.ts";
import { makeTimelineFeed, type TimelineFeed, type TimelineFeedInputs } from "../src/model/TimelineFeed.ts";

const configuredBy = <A extends { readonly configure: (inputs: I) => void }, I>(
  make: () => Effect.Effect<A, never, Scope.Scope>,
  inputs: I,
): Effect.Effect<A, never, Scope.Scope> => Effect.tap(make(), (built) => Effect.sync(() => built.configure(inputs)));

export const timelineFeedOf = (inputs: TimelineFeedInputs): Effect.Effect<TimelineFeed, never, Scope.Scope> =>
  configuredBy(makeTimelineFeed, inputs);

export const diagnosticsFeedOf = (
  options: DiagnosticsOptions | undefined,
): Effect.Effect<DiagnosticsFeed, never, Scope.Scope> => configuredBy(makeDiagnosticsFeed, options);

export const gatesFeedOf = (inputs: GatesFeedInputs): Effect.Effect<GatesFeed, never, Scope.Scope> =>
  configuredBy(makeGatesFeed, inputs);

export const dockModelOf = (inputs: DockModelInputs): Effect.Effect<DockModel, never, Scope.Scope> =>
  configuredBy(makeDockModel, inputs);
