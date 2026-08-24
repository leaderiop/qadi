"use client";
/**
 * The React binding.
 *
 * Everything React-specific in this package lives here: one context carrying
 * the atoms and the registry that holds their state, and one subscription
 * primitive built on `useSyncExternalStore`. The hooks in `hooks.ts` and the
 * components in `components.tsx` are written against these and contain no
 * subscription logic of their own.
 */
import type { AuthSubject } from "@qadi/core";
import type * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { QadiAtoms } from "./QadiAtoms.ts";

export interface QadiContextValue {
  readonly atoms: QadiAtoms;
  readonly registry: AtomRegistry.AtomRegistry;
  /**
   * Whether guards in this subtree record that they exist.
   *
   * Carried on the context rather than read from a global, so it is per
   * authorization context — a multi-tenant application can instrument one
   * provider without instrumenting the others — and so a test can turn it on
   * without touching process state.
   */
  readonly instrument: boolean;
}

const QadiContext = createContext<QadiContextValue | null>(null);

/** Raised when a hook is used outside a provider. */
export class MissingQadiProviderError extends Error {
  constructor(hookName: string) {
    super(
      `${hookName} must be used inside <QadiProvider>. ` +
        `Without a provider there is no subject, and failing loudly is safer ` +
        `than silently denying every check.`,
    );
    this.name = "MissingQadiProviderError";
  }
}

/**
 * Reads the enclosing guard context.
 *
 * Exported because the hooks live in a separate module; not part of the
 * package's public surface.
 */
export const useQadiContext = (hookName: string): QadiContextValue => {
  const value = useContext(QadiContext);
  if (value === null) throw new MissingQadiProviderError(hookName);
  return value;
};

/**
 * Subscribes to an atom and returns its current value.
 *
 * The registry is the external store: it owns the value, recomputes it when a
 * dependency changes, and hands back the same reference until it does — which
 * is precisely the contract `useSyncExternalStore` requires.
 */
export const useAtomValue = <A,>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<A>,
): A => {
  const subscribe = useCallback(
    (onChange: () => void) => registry.subscribe(atom, onChange),
    [registry, atom],
  );
  const snapshot = useCallback(() => registry.get(atom), [registry, atom]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
};

/** Seed values applied when the provider creates its registry. */
export type InitialValues = Iterable<readonly [Atom.Atom<unknown>, unknown]>;

export interface QadiProviderProps {
  /** The atom set for this authorization context, from `makeQadiAtoms`. */
  readonly atoms: QadiAtoms;
  /** The authenticated subject, or `undefined` while it is still loading. */
  readonly subject: AuthSubject | undefined;
  /**
   * Extra atom values to seed. Rarely needed; useful for server-rendered
   * decisions and for tests that want to assert on a settled state.
   */
  readonly initialValues?: InitialValues;
  /**
   * Let `@qadi/devtools` enumerate and locate the guards in this subtree.
   *
   * **Off by default, and off means absent**: no guard registers, no marker
   * element is rendered, and the DOM is byte for byte what it was. A production
   * bundle that never passes this ships nothing extra.
   *
   * On, each `<Can>` and `<Cannot>` wraps its children in a `display: contents`
   * span — which generates no box, so it changes no layout — and every guard
   * records its policy, its resource and what it rendered. That is what the
   * React panel's per-instance list and its highlight lens read
   * ([ADR-QD-053](../../../spec/decisions/053-a-gate-can-be-found.md)).
   *
   * Guard it the way you guard the dock itself. It is a debug affordance, and
   * on a production page it hands any script a list of what the current user
   * may and may not do.
   */
  readonly instrument?: boolean;
  readonly children: ReactNode;
}

/**
 * Provides an authorization context to a subtree.
 *
 * Each provider owns its own registry, so two providers with different atoms
 * cannot see each other's decisions. That is what makes a multi-tenant
 * application safe by construction rather than by convention.
 */
export const QadiProvider = ({
  atoms,
  subject,
  initialValues,
  instrument = false,
  children,
}: QadiProviderProps): ReactNode => {
  // The subject is seeded at registry construction rather than written in an
  // effect, so the first render already has it. Writing it afterwards would
  // show every guarded control in its pending state for one frame.
  const registryRef = useRef<AtomRegistry.AtomRegistry | undefined>(undefined);
  const registry = (registryRef.current ??= AtomRegistry.make({
    initialValues: [
      [atoms.subject, subject] as const,
      ...(initialValues ?? []),
    ],
  }));

  const disposeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    // Disposal is deferred by a tick and cancelled on remount, so React's
    // development-mode double-mount does not destroy a live registry.
    if (disposeTimer.current !== undefined) {
      clearTimeout(disposeTimer.current);
      disposeTimer.current = undefined;
    }
    return () => {
      disposeTimer.current = setTimeout(() => {
        registry.dispose();
        registryRef.current = undefined;
      }, 0);
    };
  }, [registry]);

  useEffect(() => {
    if (registry.get(atoms.subject) !== subject) {
      registry.set(atoms.subject, subject);
    }
  }, [registry, atoms, subject]);

  // Memoised, or every render of the provider gives every consumer a new
  // context value and re-renders the whole guarded subtree.
  const value = useMemo(
    () => ({ atoms, registry, instrument }),
    [atoms, registry, instrument],
  );

  return <QadiContext.Provider value={value}>{children}</QadiContext.Provider>;
};
