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
 * The registry under test is the scenario's own atom set's `gates`
 * (ADR-QD-080), which lives in World state beside the rest of the step state
 * (`policyName`/`guards`/`hooks`/`view`), per ADR-EC-009. Nothing is process-wide,
 * so nothing is reset between scenarios.
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
  EvaluationServicesNone,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { gateGroups, isLocatable } from "@qadi/devtools";
import type { GateInstanceLike } from "@qadi/devtools";
import type { QadiAtoms } from "@qadi/react";

// Registered before `@testing-library/react` is imported: it reads `document`
// at module scope, so the order here is load-bearing rather than stylistic.
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

const { Can, makeQadiAtoms, QadiProvider, useCan } = await import(
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

const atoms = () => makeQadiAtoms(EvaluationServicesNone);

const policyNamed = (name: string): Policy => {
  const found = policies[name];
  if (found === undefined) throw new Error(`no policy named ${name}`);
  return found;
};

const instances = Effect.fn("gate-instances.instances")(function* () {
  const { atoms: built } = yield* readState();
  const listed: ReadonlyArray<GateInstanceLike> = built?.gates.instances() ?? [];
  return listed;
});

const theOne = Effect.fn("gate-instances.theOne")(function* () {
  const first = (yield* instances())[0];
  if (first === undefined) throw new Error("no guard is registered");
  return first;
});

interface GateInstancesWorldState {
  readonly policyName: string;
  readonly guards: number;
  readonly hooks: number;
  readonly view: { readonly unmount: () => void } | undefined;
  /** The atom set the page rendered under, whose `gates` is the registry under test. */
  readonly atoms: QadiAtoms | undefined;
  /** A second page, under its own atom set, when a scenario asks for one. */
  readonly secondPolicyName: string | undefined;
  readonly secondAtoms: QadiAtoms | undefined;
}

const initialState: GateInstancesWorldState = {
  policyName: "doc:read",
  guards: 0,
  hooks: 0,
  view: undefined,
  atoms: undefined,
  secondPolicyName: undefined,
  secondAtoms: undefined,
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

  const built = atoms();
  let rendered: { readonly unmount: () => void } | undefined;
  act(() => {
    rendered = render(
      createElement(QadiProvider, {
        atoms: built,
        subject: alice,
        instrument,
        children: createElement(Fragment, null, ...children),
      }),
    );
  });
  yield* patch(() => ({ view: rendered, atoms: built }));

  if (s.secondPolicyName !== undefined) {
    const secondBuilt = atoms();
    const secondPolicy = policyNamed(s.secondPolicyName);
    act(() => {
      render(
        createElement(QadiProvider, {
          atoms: secondBuilt,
          subject: alice,
          instrument,
          children: createElement(Can, { policy: secondPolicy, children: "control" }),
        }),
      );
    });
    yield* patch(() => ({ secondAtoms: secondBuilt }));
  }
});

describeFeature(feature, World.layer, ({ AfterAllScenarios, Before, Given, When, Then }) => {
  Before(function* () {
    cleanup();
    const { state } = yield* World;
    yield* Ref.set(state, initialState);
  });

  // vitest's `isolate: false` (features/vitest.config.ts) means this file's
  // module scope — and the `GlobalRegistrator.register()` call above — is
  // never re-evaluated per file, so without this the happy-dom globals would
  // stay installed on `globalThis` for every file that runs after this one.
  AfterAllScenarios(function* () {
    yield* Effect.promise(() => GlobalRegistrator.unregister());
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

  Given(
    "a second page, under its own atom set, with {int} guard on {string}",
    function* (_count: number, name: string) {
      yield* patch(() => ({ secondPolicyName: name }));
    },
  );

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

  When("both pages render with instrumentation", function* () {
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
    assert.deepEqual(yield* instances(), []);
  });

  Then("{int} guards are registered", function* (count: number) {
    assert.equal((yield* instances()).length, count);
  });

  Then("{int} guard is registered", function* (count: number) {
    assert.equal((yield* instances()).length, count);
  });

  Then("exactly {int} guard is registered", function* (count: number) {
    // The surfaces nest, so the failure this catches is one component appearing
    // twice with the inner row labelled a hook its author never wrote.
    assert.equal((yield* instances()).length, count);
  });

  Then("they are grouped into {int} question", function* (count: number) {
    // Through `@qadi/devtools`, which does not depend on `@qadi/react`. The two
    // agree only because both go through `Equal.equals`.
    assert.equal(gateGroups(yield* instances()).length, count);
  });

  Then("that guard reports the state {string}", function* (state: string) {
    assert.equal((yield* theOne()).state, state);
  });

  Then("{int} guard can be pointed at", function* (count: number) {
    assert.equal((yield* instances()).filter(isLocatable).length, count);
  });

  Then("no guard can be pointed at", function* () {
    // A hook has no node of its own: enumerable, and not locatable.
    assert.equal((yield* instances()).filter(isLocatable).length, 0);
  });

  Then("the marker generates no box", function* () {
    const element = (yield* theOne()).element;
    assert.ok(element !== undefined && element !== null);
    // `display: contents` is the enabling condition: a wrapper with default
    // styling would reflow a flex row the moment somebody started debugging it.
    assert.equal((element as HTMLElement).style.display, "contents");
  });

  Then("the first atom set lists {int} guard on {string}", function* (count: number, name: string) {
    const { atoms: first } = yield* readState();
    assert.deepEqual(
      first?.gates.instances().map((one) => one.policy),
      Array.from({ length: count }, () => policyNamed(name)),
    );
  });

  Then("the second atom set lists {int} guard on {string}", function* (count: number, name: string) {
    const { secondAtoms } = yield* readState();
    assert.deepEqual(
      secondAtoms?.gates.instances().map((one) => one.policy),
      Array.from({ length: count }, () => policyNamed(name)),
    );
  });
});
