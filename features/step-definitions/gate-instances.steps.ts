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
 */
import { Before, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import * as Layer from "effect/Layer";
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
    ),
  );

let policyName = "doc:read";
let guards = 0;
let hooks = 0;
let view: { readonly unmount: () => void } | undefined;

Before({ tags: "@gate-instances" }, () => {
  cleanup();
  clearGatesUnsafe();
  policyName = "doc:read";
  guards = 0;
  hooks = 0;
  view = undefined;
});

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

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given("a page with {int} guards on {string}", (count: number, name: string) => {
  guards = count;
  policyName = name;
});

Given("a page with {int} guard on {string}", (count: number, name: string) => {
  guards = count;
  policyName = name;
});

Given("a page with {int} hook asking {string}", (count: number, name: string) => {
  hooks = count;
  policyName = name;
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

const Probe = ({ policy }: { readonly policy: Policy }) =>
  createElement("span", null, String(useCan(policy)));

const draw = (instrument: boolean): void => {
  const policy = policyNamed(policyName);
  const children = [
    ...Array.from({ length: guards }, (_unused, index) =>
      createElement(Can, { key: `g${String(index)}`, policy, children: "control" }),
    ),
    ...Array.from({ length: hooks }, (_unused, index) =>
      createElement(Probe, { key: `h${String(index)}`, policy }),
    ),
  ];

  act(() => {
    view = render(
      createElement(QadiProvider, {
        atoms: atoms(),
        subject: alice,
        instrument,
        children: createElement(Fragment, null, ...children),
      }),
    );
  });
};

When("the page renders without instrumentation", () => {
  draw(false);
});

When("the page renders with instrumentation", () => {
  draw(true);
});

When("the page unmounts", () => {
  act(() => {
    view?.unmount();
  });
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then("no guard is registered", () => {
  assert.deepEqual(instances(), []);
});

Then("{int} guards are registered", (count: number) => {
  assert.equal(instances().length, count);
});

Then("{int} guard is registered", (count: number) => {
  assert.equal(instances().length, count);
});

Then("exactly {int} guard is registered", (count: number) => {
  // The surfaces nest, so the failure this catches is one component appearing
  // twice with the inner row labelled a hook its author never wrote.
  assert.equal(instances().length, count);
});

Then("they are grouped into {int} question", (count: number) => {
  // Through `@qadi/devtools`, which does not depend on `@qadi/react`. The two
  // agree only because both go through `Equal.equals`.
  assert.equal(gateGroups(instances()).length, count);
});

Then("that guard reports the state {string}", (state: string) => {
  assert.equal(theOne().state, state);
});

Then("{int} guard can be pointed at", (count: number) => {
  assert.equal(instances().filter(isLocatable).length, count);
});

Then("no guard can be pointed at", () => {
  // A hook has no node of its own: enumerable, and not locatable.
  assert.equal(instances().filter(isLocatable).length, 0);
});

Then("the marker generates no box", () => {
  const element = theOne().element;
  assert.ok(element !== undefined && element !== null);
  // `display: contents` is the enabling condition: a wrapper with default
  // styling would reflow a flex row the moment somebody started debugging it.
  assert.equal((element as HTMLElement).style.display, "contents");
});
