/**
 * The trees the gate tests render under a provider, and what their registry lists.
 *
 * The registry tests and the registration characterisation ask the same questions of the
 * same subject and resources, mount them under the same `QadiProvider`, and read the same
 * projection of what registered, so those fixtures and trees are written once here and
 * every file that renders a guard shares them.
 */
import {
  EvaluationServicesNone,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
} from "@qadi/core";
import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { StrictMode } from "react";
import type { ReactElement, ReactNode } from "react";
import type {
  GateInstance,
  GateKind,
  GateRegistry,
  GateRenderState,
} from "../../src/GateRegistry.ts";
import { usePolicies } from "../../src/hooks.ts";
import { makeQadiAtoms } from "../../src/QadiAtoms.ts";
import type { QadiAtoms } from "../../src/QadiAtoms.ts";
import { QadiProvider } from "../../src/QadiProvider.tsx";

export const canRead = hasPermission(permission("doc", "read"));
export const canWrite = hasPermission(permission("doc", "write"));
export const isAdmin = hasRole("admin");

export const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });
export const docA = { type: "doc", id: "a" };
export const docB = { type: "doc", id: "b" };

/** A fresh atom set whose evaluation settles in the first render. */
export const atoms = () => makeQadiAtoms(EvaluationServicesNone);

/** How `providerTree` mounts its provider. */
export interface TreeOptions {
  readonly instrument: boolean;
  /** Wraps the provider in `StrictMode`. */
  readonly strict?: boolean;
  /** The registry the provider is told to write to, in place of its atom set's own. */
  readonly gates?: GateRegistry;
}

/** `child` under the `QadiProvider` for `set` and `alice`, as `options` says. */
export const providerTree = (
  set: QadiAtoms,
  child: ReactNode,
  options: TreeOptions,
): ReactElement => {
  const route = options.gates === undefined ? {} : { gates: options.gates };
  const provider = (
    <QadiProvider atoms={set} subject={alice} instrument={options.instrument} {...route}>
      {child}
    </QadiProvider>
  );
  return options.strict === true ? <StrictMode>{provider}</StrictMode> : provider;
};

/** What `guardTrees` hands back. */
export interface GuardTrees {
  /** Mounts `children` under a fresh atom set and makes that set the current one. */
  readonly mount: (children: ReactNode, instrument: boolean) => RenderResult;
  /** Makes `set` the current one and returns it. */
  readonly adopt: (set: QadiAtoms) => QadiAtoms;
  /** The guards the current atom set lists. */
  readonly instances: () => ReadonlyArray<GateInstance>;
}

/**
 * Mounts guards, each in a fresh atom set, and reads the registry of the set most
 * recently mounted or adopted.
 *
 * Each mount builds its own atom set, so its registry is its own: no test reads another's
 * guards, and nothing needs resetting between them (ADR-QD-080). The current set is
 * closure state, so two trees never share one.
 */
export const guardTrees = (): GuardTrees => {
  let current: QadiAtoms = atoms();
  const adopt = (set: QadiAtoms): QadiAtoms => {
    current = set;
    return set;
  };
  const mount = (children: ReactNode, instrument: boolean): RenderResult => {
    const set = adopt(atoms());
    return render(providerTree(set, children, { instrument }));
  };
  return { mount, adopt, instances: () => current.gates.instances() };
};

const policies = { read: canRead, admin: isAdmin };

/** Asks `usePolicies` the named policies, building the record in the order given. */
export const Group = ({
  names,
}: {
  readonly names?: ReadonlyArray<"read" | "admin">;
}) => {
  const wanted: Record<string, typeof canRead> = {};
  for (const name of names ?? ["read", "admin"]) wanted[name] = policies[name];
  usePolicies(wanted);
  return null;
};

/** Instances as `[name, kind, state]`, the name being what follows the hook's own id. */
export const listed = (instances: ReadonlyArray<GateInstance>) =>
  instances
    .map((one): readonly [string, GateKind, GateRenderState] => [
      one.id.slice(one.id.indexOf("/") + 1),
      one.kind,
      one.state,
    ])
    .sort((a, b) => a[0].localeCompare(b[0]));
