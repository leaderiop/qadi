/**
 * The fixtures and trees that the registry tests and the registration characterisation
 * both use: three policies, two resources, an atom set whose evaluation settles in the first
 * render, the `QadiProvider` tree they mount a guard under, and the grouped `usePolicies`
 * guard they render. The registry test also mounts providers of its own, so it reads
 * `alice`, the subject `providerTree` mounts under, from here too.
 *
 * Each is written once here because both files use it. A helper only one file uses stays
 * in that file.
 */
import {
  EvaluationServicesNone,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
} from "@qadi/core";
import { StrictMode } from "react";
import type { ReactElement, ReactNode } from "react";
import type { GateRegistry } from "../../src/GateRegistry.ts";
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
interface TreeOptions {
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
