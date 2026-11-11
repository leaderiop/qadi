/**
 * The error every hook throws when it is used outside a `QadiProvider`.
 *
 * Declared in a leaf module of its own because `useGate.ts` throws it from
 * `useGates`, and importing it from `QadiProvider.tsx` would close the import
 * cycle `useGate.ts` → `QadiProvider.tsx` → `useGate.ts` (ADR-QD-037). Its public home is unchanged:
 * `QadiProvider.tsx` re-exports it by name, so the class a consumer imports is
 * the very class thrown here.
 */

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
