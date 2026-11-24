/**
 * Builds each feed and the dock model the way a host does: bare, then configured.
 *
 * A host's hook builds the value with no inputs and hands them through `configure`
 * inside the same build, so a test that builds the same way tests what ships. A
 * `configure` that throws (a refused capacity) becomes the build's defect, as a throw
 * from a constructor's body is.
 */
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import { makeDiagnosticsFeed, type DiagnosticsFeed } from "../src/model/DiagnosticsFeed.ts";
import type { DiagnosticsOptions } from "../src/model/DiagnosticsStore.ts";
import { makeDockModel, type DockModel, type DockModelInputs } from "../src/model/DockModel.ts";
import { makeGatesFeed, type GatesFeed, type GatesFeedInputs } from "../src/model/GatesFeed.ts";
import { makeTimelineFeed, type TimelineFeed, type TimelineFeedInputs } from "../src/model/TimelineFeed.ts";

export const timelineFeedOf = (inputs: TimelineFeedInputs): Effect.Effect<TimelineFeed, never, Scope.Scope> =>
  Effect.tap(makeTimelineFeed(), (built) => Effect.sync(() => built.configure(inputs)));

export const diagnosticsFeedOf = (
  options: DiagnosticsOptions | undefined,
): Effect.Effect<DiagnosticsFeed, never, Scope.Scope> =>
  Effect.tap(makeDiagnosticsFeed(), (built) => Effect.sync(() => built.configure(options)));

export const gatesFeedOf = (inputs: GatesFeedInputs): Effect.Effect<GatesFeed, never, Scope.Scope> =>
  Effect.tap(makeGatesFeed(), (built) => Effect.sync(() => built.configure(inputs)));

export const dockModelOf = (inputs: DockModelInputs): Effect.Effect<DockModel, never, Scope.Scope> =>
  Effect.tap(makeDockModel(), (built) => Effect.sync(() => built.configure(inputs)));
