/**
 * Owns a provider's registry: builds and seeds it, records the latest committed atoms
 * and subject, writes the subject on every commit and recycles the registry.
 *
 * The lease decides when a recycle runs (ADR-QD-195); the owner decides what a build, a
 * commit and a recycle do. It imports no React, so every path is driven without
 * rendering and measured by the mutation run. Building it schedules nothing, so a server
 * render and a render React discards leave nothing pending, and only a release reaches
 * the lease's `defer`. A recycle resets the registry in place and never disposes it, and
 * calls `reset` through the property so a `reset` replaced on the instance is the one
 * called; it writes back the latest committed subject, never a seed, because a seed is
 * not an authority (ADR-QD-039). The subject is written on every commit without reading
 * first: the subject atom ignores an equal write, and a write that does not read first
 * keeps the seed of a node nothing has read, before any recycle, across a host
 * `registry.refresh` (ADR-QD-199).
 *
 * Out of the barrel (AGENTS.md §9): `QadiProvider.tsx` is its one caller, and the
 * package's own tests reach it directly.
 */
import type { AuthSubject } from "@qadi/core";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { InitialValues } from "./HydrationEngine.ts";
import type { QadiAtoms } from "./QadiAtoms.ts";
import { makeRegistryLease } from "./RegistryLease.ts";
import type { LeaseDefer } from "./RegistryLease.ts";

/** What a registry is built from: the first atom set and subject, and the host's initial values. */
export interface RegistryOwnerSeed {
  readonly atoms: QadiAtoms;
  readonly subject: AuthSubject | undefined;
  readonly initialValues: InitialValues | undefined;
}

/** What a provider keeps for its life: the registry, and the commit, hold and release it forwards. */
export interface RegistryOwner {
  /** The one registry, for the provider's whole life; a recycle resets it in place. */
  readonly registry: AtomRegistry.AtomRegistry;
  /**
   * A commit's effect: calls `onAtomsReplaced` when `atoms` is not the atom set last
   * committed (the first commit compares with the one the owner was built from), records
   * `atoms` and `subject` as the latest, then writes the subject.
   */
  readonly commit: (
    atoms: QadiAtoms,
    subject: AuthSubject | undefined,
    onAtomsReplaced: () => void,
  ) => void;
  /** A mount or a reveal: the lease's own `hold`. */
  readonly hold: () => void;
  /** A cleanup: the lease's own `release`. */
  readonly release: () => void;
}

/**
 * Builds an owner over a registry seeded with `seed.subject` for `seed.atoms.subject`,
 * then the host's initial values, so a host entry for the subject atom wins.
 *
 * `defer` is the lease's: `undefined` selects its own default. The built registry passes
 * neither `scheduleTask` nor `defaultIdleTTL` (ADR-QD-014).
 */
export const makeRegistryOwner = (seed: RegistryOwnerSeed, defer?: LeaseDefer): RegistryOwner => {
  const registry = AtomRegistry.make({
    initialValues: [[seed.atoms.subject, seed.subject] as const, ...(seed.initialValues ?? [])],
  });
  let latest = { atoms: seed.atoms, subject: seed.subject };
  // The write runs even when a finalizer makes the reset throw: the reset has cleared the
  // nodes by then, and a consumer would otherwise subscribe to an unset subject.
  const lease = makeRegistryLease(() => {
    try {
      registry.reset();
    } finally {
      registry.set(latest.atoms.subject, latest.subject);
    }
  }, defer);
  return {
    registry,
    commit: (atoms, subject, onAtomsReplaced) => {
      if (latest.atoms !== atoms) onAtomsReplaced();
      latest = { atoms, subject };
      registry.set(atoms.subject, subject);
    },
    hold: lease.hold,
    release: lease.release,
  };
};
