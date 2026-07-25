/**
 * React integration.
 *
 * Evaluation is an Effect, so the provider carries a `ManagedRuntime` that
 * supplies the guard services. A single parameterised factory backs both the
 * module-level hooks and `createGuardHooks()` — the predecessor maintained two
 * near-identical 250-line implementations that had to be kept in sync by hand.
 */
import type { AuthSubject, Decision, EvaluationServices, Policy } from "@guard/core";
import { currentSubjectLayer, evaluate, isAllowed } from "@guard/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as ManagedRuntime from "effect/ManagedRuntime";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Services the runtime must supply, minus the subject the provider injects. */
export type GuardRuntimeServices = Exclude<
  EvaluationServices,
  import("@guard/core").CurrentSubject
>;

export interface GuardContextValue {
  readonly runtime: ManagedRuntime.ManagedRuntime<GuardRuntimeServices, never>;
  readonly subject: AuthSubject | undefined;
}

/** Raised when a hook is used outside a provider. */
export class MissingGuardProviderError extends Error {
  constructor(hookName: string) {
    super(
      `${hookName} must be used inside <GuardProvider>. ` +
        `Without a provider there is no subject, and failing loudly is safer ` +
        `than silently denying every check.`,
    );
    this.name = "MissingGuardProviderError";
  }
}

/** The result of an in-flight policy evaluation. */
export interface PolicyState {
  readonly decision: Decision | undefined;
  readonly allowed: boolean;
  readonly loading: boolean;
  readonly error: unknown;
}

const PENDING: PolicyState = {
  decision: undefined,
  allowed: false,
  loading: true,
  error: undefined,
};

/**
 * Builds an isolated provider and hook set over a fresh React context.
 *
 * Used once for the module-level exports, and callable again by consumers that
 * need isolated contexts — multi-tenant apps, or tests rendering two subjects
 * side by side.
 */
export const createGuardHooks = () => {
  const Context = createContext<GuardContextValue | null>(null);

  const useGuardContext = (hookName: string): GuardContextValue => {
    const value = useContext(Context);
    if (value === null) throw new MissingGuardProviderError(hookName);
    return value;
  };

  const GuardProvider = ({
    runtime,
    subject,
    children,
  }: {
    readonly runtime: ManagedRuntime.ManagedRuntime<GuardRuntimeServices, never>;
    /** `undefined` while the subject is still loading. */
    readonly subject: AuthSubject | undefined;
    readonly children: ReactNode;
  }): ReactNode => {
    const value = useMemo<GuardContextValue>(
      () => ({ runtime, subject }),
      [runtime, subject],
    );
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  /** The current subject, or `undefined` while loading. */
  const useSubject = (): AuthSubject | undefined =>
    useGuardContext("useSubject").subject;

  /**
   * Evaluates a policy against the current subject.
   *
   * The policy is a plain value, so its identity drives the effect. Build
   * policies as module-level constants; a policy constructed inline in render
   * is a new object each time and will re-evaluate on every render.
   */
  const usePolicy = (policy: Policy): PolicyState => {
    const { runtime, subject } = useGuardContext("usePolicy");
    const [state, setState] = useState<PolicyState>(PENDING);

    useEffect(() => {
      if (subject === undefined) {
        setState(PENDING);
        return;
      }

      let cancelled = false;
      const program = evaluate(policy).pipe(
        Effect.provide(currentSubjectLayer(subject)),
      );

      runtime.runPromiseExit(program).then((exit) => {
        if (cancelled) return;
        setState(
          exit._tag === "Success"
            ? {
                decision: exit.value,
                allowed: isAllowed(exit.value),
                loading: false,
                error: undefined,
              }
            : // A failed evaluation is not a denial. Surfacing the error lets
              // the caller distinguish "not permitted" from "could not tell".
              { decision: undefined, allowed: false, loading: false, error: exit.cause },
        );
      });

      return () => {
        cancelled = true;
      };
    }, [runtime, subject, policy]);

    return state;
  };

  /** Whether the current subject satisfies the policy. `false` while loading. */
  const useCan = (policy: Policy): boolean => usePolicy(policy).allowed;

  /** Evaluates several named policies at once. */
  const usePolicies = (
    policies: Readonly<Record<string, Policy>>,
  ): Readonly<Record<string, PolicyState>> => {
    const { runtime, subject } = useGuardContext("usePolicies");
    const [state, setState] = useState<Readonly<Record<string, PolicyState>>>({});

    useEffect(() => {
      if (subject === undefined) return;

      let cancelled = false;
      const layer = currentSubjectLayer(subject);

      Promise.all(
        Object.entries(policies).map(([key, policy]) =>
          runtime
            .runPromiseExit(evaluate(policy).pipe(Effect.provide(layer)))
            .then((exit) => [key, exit] as const),
        ),
      ).then((entries) => {
        if (cancelled) return;
        const next: Record<string, PolicyState> = {};
        for (const [key, exit] of entries) {
          next[key] =
            exit._tag === "Success"
              ? {
                  decision: exit.value,
                  allowed: isAllowed(exit.value),
                  loading: false,
                  error: undefined,
                }
              : { decision: undefined, allowed: false, loading: false, error: exit.cause };
        }
        setState(next);
      });

      return () => {
        cancelled = true;
      };
    }, [runtime, subject, policies]);

    return state;
  };

  /** Renders `children` when the policy allows, `fallback` otherwise. */
  const Can = ({
    policy,
    fallback = null,
    pending = null,
    children,
  }: {
    readonly policy: Policy;
    readonly fallback?: ReactNode;
    /** Rendered while the decision is in flight. */
    readonly pending?: ReactNode;
    readonly children: ReactNode;
  }): ReactNode => {
    const state = usePolicy(policy);
    if (state.loading) return pending;
    return state.allowed ? children : fallback;
  };

  /** Renders `children` when the policy denies. */
  const Cannot = ({
    policy,
    pending = null,
    children,
  }: {
    readonly policy: Policy;
    readonly pending?: ReactNode;
    readonly children: ReactNode;
  }): ReactNode => {
    const state = usePolicy(policy);
    if (state.loading) return pending;
    return state.allowed ? null : children;
  };

  return {
    GuardProvider,
    useSubject,
    usePolicy,
    useCan,
    usePolicies,
    Can,
    Cannot,
  } as const;
};

/** The default context. Most applications need only this one. */
const defaultHooks = createGuardHooks();

export const GuardProvider = defaultHooks.GuardProvider;
export const useSubject = defaultHooks.useSubject;
export const usePolicy = defaultHooks.usePolicy;
export const useCan = defaultHooks.useCan;
export const usePolicies = defaultHooks.usePolicies;
export const Can = defaultHooks.Can;
export const Cannot = defaultHooks.Cannot;

/** Convenience layer builder for the services a runtime must supply. */
export const guardRuntimeLayer = Layer.mergeAll;
