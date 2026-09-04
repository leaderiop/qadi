/**
 * Steps for `gate-instances.feature`.
 *
 * These scenarios render React, which no other feature file does — the property
 * under test is what a *component* records about itself, and there is no way to
 * observe that without mounting one. `@testing-library/react` and a DOM come
 * from the same devDependencies the package's own suite uses.
 *
 * The grouping is asserted through `@qadi/devtools`, which does not depend on
 * `@qadi/react`. That is the pairing worth exercising end to end: the two agree
 * about what one question is only because both go through `Equal.equals`.
 *
 * `gateInstances()`/`clearGatesUnsafe()` stay plain, synchronous calls against
 * `@qadi/react`'s own process-wide registry (ADR-QD-053) — that registry is the
 * system under test here, not per-scenario World data. Only the local step
 * state (`policyName`/`guards`/`hooks`/`view`) lives in this Feature's
 * `Context.Service` World, per ADR-EC-009.
 */
import { describeFeature, loadFeature } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {
  AttributeResolverNone,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
  RelationshipResolverNever,
  SignatureHistoryNone,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { gateGroups, isLocatable } from "@qadi/devtools";
import type { GateInstanceLike } from "@qadi/devtools";

// Registered before `@testing-library/react` is imported: it reads `document`
// at module scope, so the order here is load-bearing rather than stylistic.
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

const { Can, clearGatesUnsafe, gateInstances, makeQadiAtoms, QadiProvider, useCan } = await import(
  "@qadi/react"
);
const { act, cleanup, render } = await import("@testing-library/react");
const { createElement, Fragment } = await import("react");

const feature = await loadFeature(fileURLToPath(new URL("./gate-instances.feature", import.meta.url)));

const policies: Record<string, Policy> = {
  "doc:read": hasPermission(permission("doc", "read")),
  admin: hasRole("admin"),
};

const alice = makeSubject({ id: "alice", permissions: ["doc:read"] });

const atoms = () =>
  makeQadiAtoms(
    Layer.mergeAll(
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
      CustomPredicateNone,
      SignatureHistoryNone,
    ),
  );

const policyNamed = (name: string): Policy => {
  const found = policies[name];
  if (found === undefined) throw new Error(`no policy named ${name}`);
  return found;
};

const instances = (): ReadonlyArray<GateInstanceLike> =>
  gateInstances() as ReadonlyArray<GateInstanceLike>;

const theOne = (): GateInstanceLike => {
  const first = instances()[0];
  if (first === undefined) throw new Error("no guard is registered");
  return first;
};

interface GateInstancesWorldState {
  readonly policyName: string;
  readonly guards: number;
  readonly hooks: number;
  readonly view: { readonly unmount: () => void } | undefined;
}

const initialState: GateInstancesWorldState = {
  policyName: "doc:read",
  guards: 0,
  hooks: 0,
  view: undefined,
};

export interface WorldShape {
  readonly state: Ref.Ref<GateInstancesWorldState>;
}

export class World extends Context.Service<World, WorldShape>()("features/gate-instances/World") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      return World.of({ state: yield* Ref.make(initialState) });
    }),
  );
}

const readState = Effect.fn("gate-instances.readState")(function* () {
  const { state } = yield* World;
  return yield* Ref.get(state);
});

const patch = Effect.fn("gate-instances.patch")(function* (
  fn: (s: GateInstancesWorldState) => Partial<GateInstancesWorldState>,
) {
  const { state } = yield* World;
  yield* Ref.update(state, (s) => ({ ...s, ...fn(s) }));
});

const Probe = ({ policy }: { readonly policy: Policy }) =>
  createElement("span", null, String(useCan(policy)));

const draw = Effect.fn("gate-instances.draw")(function* (instrument: boolean) {
  const s = yield* readState();
  const policy = policyNamed(s.policyName);
  const children = [
    ...Array.from({ length: s.guards }, (_unused, index) =>
      createElement(Can, { key: `g${String(index)}`, policy, children: "control" }),
    ),
    ...Array.from({ length: s.hooks }, (_unused, index) =>
      createElement(Probe, { key: `h${String(index)}`, policy }),
    ),
  ];

  let rendered: { readonly unmount: () => void } | undefined;
  act(() => {
    rendered = render(
      createElement(QadiProvider, {
        atoms: atoms(),
        subject: alice,
        instrument,
        children: createElement(Fragment, null, ...children),
      }),
    );
  });
  yield* patch(() => ({ view: rendered }));
});

describeFeature(feature, World.layer, ({ Before, Given, When, Then }) => {
  Before(function* () {
    cleanup();
    clearGatesUnsafe();
    const { state } = yield* World;
    yield* Ref.set(state, initialState);
  });

  // -------------------------------------------------------------------------
  // Given
  // -------------------------------------------------------------------------

  Given("a page with {int} guards on {string}", function* (count: number, name: string) {
    yield* patch(() => ({ guards: count, policyName: name }));
  });

  Given("a page with {int} guard on {string}", function* (count: number, name: string) {
    yield* patch(() => ({ guards: count, policyName: name }));
  });

  Given("a page with {int} hook asking {string}", function* (count: number, name: string) {
    yield* patch(() => ({ hooks: count, policyName: name }));
  });

  // -------------------------------------------------------------------------
  // When
  // -------------------------------------------------------------------------

  When("the page renders without instrumentation", function* () {
    yield* draw(false);
  });

  When("the page renders with instrumentation", function* () {
    yield* draw(true);
  });

  When("the page unmounts", function* () {
    const s = yield* readState();
    act(() => {
      s.view?.unmount();
    });
  });

  // -------------------------------------------------------------------------
  // Then
  // -------------------------------------------------------------------------

  Then("no guard is registered", function* () {
    assert.deepEqual(instances(), []);
  });

  Then("{int} guards are registered", function* (count: number) {
    assert.equal(instances().length, count);
  });

  Then("{int} guard is registered", function* (count: number) {
    assert.equal(instances().length, count);
  });

  Then("exactly {int} guard is registered", function* (count: number) {
    // The surfaces nest, so the failure this catches is one component appearing
    // twice with the inner row labelled a hook its author never wrote.
    assert.equal(instances().length, count);
  });

  Then("they are grouped into {int} question", function* (count: number) {
    // Through `@qadi/devtools`, which does not depend on `@qadi/react`. The two
    // agree only because both go through `Equal.equals`.
    assert.equal(gateGroups(instances()).length, count);
  });

  Then("that guard reports the state {string}", function* (state: string) {
    assert.equal(theOne().state, state);
  });

  Then("{int} guard can be pointed at", function* (count: number) {
    assert.equal(instances().filter(isLocatable).length, count);
  });

  Then("no guard can be pointed at", function* () {
    // A hook has no node of its own: enumerable, and not locatable.
    assert.equal(instances().filter(isLocatable).length, 0);
  });

  Then("the marker generates no box", function* () {
    const element = theOne().element;
    assert.ok(element !== undefined && element !== null);
    // `display: contents` is the enabling condition: a wrapper with default
    // styling would reflow a flex row the moment somebody started debugging it.
    assert.equal((element as HTMLElement).style.display, "contents");
  });
});
