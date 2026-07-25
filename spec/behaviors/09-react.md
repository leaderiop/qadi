# 09 — React Integration

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-BEH-09                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-001) |

---

## BEH-EG-065: Provider and runtime

> **See:** [ADR-EG-014](../decisions/014-react-managed-runtime.md)

```ts
export const GuardProvider: (props: {
  readonly runtime: ManagedRuntime.ManagedRuntime<GuardRuntimeServices, never>;
  readonly subject: AuthSubject | undefined;
  readonly children: ReactNode;
}) => ReactNode;
```

`subject: undefined` means the subject is still loading.

## BEH-EG-066: Hooks

```ts
export const useSubject: () => AuthSubject | undefined;
export const usePolicy: (policy: Policy) => PolicyState;
export const useCan: (policy: Policy) => boolean;
export const usePolicies: (
  policies: Readonly<Record<string, Policy>>,
) => Readonly<Record<string, PolicyState>>;

export interface PolicyState {
  readonly decision: Decision | undefined;
  readonly allowed: boolean;
  readonly loading: boolean;
  readonly error: unknown;
}
```

```
REQUIREMENT: An evaluation failure MUST be reported as `error`, distinct from a
             denial. An attribute-backend outage must not be indistinguishable
             from "not permitted".
```

```
REQUIREMENT: Using a hook outside a provider MUST throw. Denying silently would
             present a wiring mistake as a permissions problem.
```

## BEH-EG-067: Components

```ts
export const Can: (props: {
  readonly policy: Policy;
  readonly fallback?: ReactNode;
  readonly pending?: ReactNode;
  readonly children: ReactNode;
}) => ReactNode;

export const Cannot: (props: {
  readonly policy: Policy;
  readonly pending?: ReactNode;
  readonly children: ReactNode;
}) => ReactNode;
```

## BEH-EG-068: Isolated contexts

```ts
export const createGuardHooks: () => {
  readonly GuardProvider: ...;
  readonly useSubject: ...;
  readonly usePolicy: ...;
  readonly useCan: ...;
  readonly usePolicies: ...;
  readonly Can: ...;
  readonly Cannot: ...;
};
```

```
REQUIREMENT: There MUST be exactly one implementation. The module-level exports
             MUST be `createGuardHooks()` called once. The predecessor
             maintained two near-identical 250-line copies.
```

## BEH-EG-069: Policy identity

```
RECOMMENDED: Build policies as module-level constants. A policy constructed
             inline in render is a new object on every render and will
             re-evaluate each time.
```

---

_Previous: [08 — Serialization](./08-serialization.md)_
