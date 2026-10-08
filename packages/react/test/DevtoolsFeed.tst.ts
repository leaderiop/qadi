/**
 * Pins what a host may add to the devtools feed, at the type level.
 *
 * The feed owns `layer` and `questions`; everything else in `extra` is the
 * host's and keeps its type on the way through. A collision has to be a compile
 * error rather than a quiet override, and the constraint that makes it one is a
 * self-referential mapped type, which is exactly the kind of thing a refactor
 * to something tidier would loosen without any runtime test noticing.
 */
import { expect, test } from "tstyche";
import type * as Layer from "effect/Layer";
import type { QadiAtoms, QadiRuntimeServices } from "../src/QadiAtoms.ts";
import type { AskedQuestion } from "../src/QuestionBook.ts";
import { runtimeLayer, useDevtoolsFeed } from "../src/DevtoolsFeed.ts";
import type { DevtoolsDiagnosticsFeed } from "../src/DevtoolsFeed.ts";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";

declare const layer: Layer.Layer<QadiRuntimeServices>;
declare const questions: () => ReadonlyArray<AskedQuestion>;
declare const collector: { readonly calls: number };

test("the feed owns layer and questions: setting either in extra is an error", () => {
  expect(useDevtoolsFeed).type.not.toBeCallableWith({ layer });
  expect(useDevtoolsFeed).type.not.toBeCallableWith({ questions });
  expect(useDevtoolsFeed).type.not.toBeCallableWith({ collector, layer });
});

test("anything else in extra is allowed, including nothing", () => {
  expect(useDevtoolsFeed).type.toBeCallableWith({});
  expect(useDevtoolsFeed).type.toBeCallableWith({ collector });
  expect(useDevtoolsFeed).type.toBeCallableWith({ collector, intervalMillis: 5 });
});

test("extra keeps its types on diagnostics, next to the two fields the feed owns", () => {
  const feed = useDevtoolsFeed({ collector });
  expect(feed.diagnostics.collector).type.toBe<{ readonly calls: number }>();
  expect(feed.diagnostics.layer).type.toBe<Layer.Layer<QadiRuntimeServices>>();
  expect(feed.diagnostics.questions).type.toBe<() => ReadonlyArray<AskedQuestion>>();
  expect(feed.diagnostics).type.toBeAssignableTo<DevtoolsDiagnosticsFeed>();
});

test("runtimeLayer asks for nothing it does not build", () => {
  expect(runtimeLayer).type.toBe<
    (atoms: QadiAtoms, registry: AtomRegistry.AtomRegistry) => Layer.Layer<QadiRuntimeServices>
  >();
  expect<ReturnType<typeof runtimeLayer>>().type.toBe<Layer.Layer<QadiRuntimeServices, never, never>>();
});
