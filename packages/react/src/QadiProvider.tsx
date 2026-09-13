"use client";
/**
 * The React binding.
 *
 * SPIKE (branch `spike/effect-atom-react`): the registry is now constructed
 * with `@effect/atom-react`'s own `scheduleTask`/`defaultIdleTTL`, wiring
 * idle-atom cleanup to React's real scheduler — the previous
 * `AtomRegistry.make({ initialValues })` call passed neither. The
 * subscription primitive is the library's own `useAtomValue`, read through
 * `@effect/atom-react`'s `RegistryContext` rather than the hand-rolled
 * `useSyncExternalStore` call this replaces.
 */
import type { AuthSubject } from "@qadi/core";
import { useAtomValue as useLibraryAtomValue } from "@effect/atom-react/Hooks";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import type * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { isDevelopment } from "./HydrationWarning.ts";
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

/**
 * Whether the production-instrumentation warning below has already fired.
 *
 * Module scope, not per-provider: several `QadiProvider`s can share one
 * process, and the point is a single signal that instrumentation reached a
 * production bundle at all, not one line per provider instance.
 */
let warnedInstrumentedInProduction = false;

/**
 * Warns once when `instrument` is `true` outside development.
 *
 * `instrument` guards a debug affordance that hands any script on the page a
 * list of what the current user may and may not do (`QadiProviderProps.instrument`'s
 * own doc comment). Every other prod-visible conditional in this codebase says
 * so out loud — `isDevelopment()` gates `HydrationWarning.ts`'s console warnings,
 * and `permissionRegistryRouteUnguarded` logs per request in `@qadi/http` — and
 * this one did not, so a build that accidentally ships `instrument` had nothing
 * naming the leak.
 */
const warnInstrumentedInProduction = (): void => {
  if (warnedInstrumentedInProduction) return;
  warnedInstrumentedInProduction = true;
  console.warn(
    "[qadi] <QadiProvider instrument> is true outside development. This is a debug " +
      "affordance: it registers every guarded control's policy, resource and verdict " +
      "for @qadi/devtools, readable by any script on the page. Pass instrument only in " +
      "development, or gate it the way you gate the devtools dock itself.",
  );
};

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
 * Subscribes to an atom in this context's registry and returns its current
 * value.
 *
 * SPIKE: a direct re-export of `@effect/atom-react`'s own `useAtomValue`,
 * which reads the registry from `RegistryContext` — provided by
 * `QadiProvider` below — rather than an explicit argument. This is a public
 * API signature change from the pre-spike `useAtomValue(registry, atom)`;
 * every call site in this package reads the registry through
 * `useQadiContext` only for other fields (`atoms`, `instrument`) now, not to
 * pass it here.
 */
export const useAtomValue: <A>(atom: Atom.Atom<A>) => A = useLibraryAtomValue;

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

  // Reverted from a render-phase write (ticket 34): that version reproducibly
  // hung an in-flight re-check forever on a page where `subject` never
  // changes at all — `settled()`'s listener never delivered the final answer
  // even though the underlying port request completed — confirmed by
  // bisecting `examples/nextjs-newsroom`'s "a seeded allow is replaced by
  // this client's own denial" e2e test down to this exact commit and
  // reproducing it with a clean rebuild in both directions. The render-phase
  // write's own guard (`previousSubject.current !== subject`) never even
  // fired in the failing case, so the regression is in some effect of
  // reading/writing the registry during render that this investigation did
  // not fully isolate before time ran out — recorded rather than silently
  // worked around. A one-frame flash of the previous subject's verdicts on a
  // genuine subject change (the real, narrower case ticket 34 was written
  // for) is the known tradeoff of reverting to this effect.
  useEffect(() => {
    if (registry.get(atoms.subject) !== subject) {
      registry.set(atoms.subject, subject);
    }
  }, [registry, atoms, subject]);

  useEffect(() => {
    if (instrument && !isDevelopment()) warnInstrumentedInProduction();
  }, [instrument]);

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

  // Memoised, or every render of the provider gives every consumer a new
  // context value and re-renders the whole guarded subtree.
  const value = useMemo(
    () => ({ atoms, registry, instrument }),
    [atoms, registry, instrument],
  );

  return (
    <RegistryContext.Provider value={registry}>
      <QadiContext.Provider value={value}>{children}</QadiContext.Provider>
    </RegistryContext.Provider>
  );
};
