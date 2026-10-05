/**
 * Superseded by `PortDerivation.ts`, which holds this scaffolding now; kept as
 * a re-export only until the port modules derive their wrappers from their
 * descriptions (ARCH-10 T3), which deletes it.
 */
export {
  boundedPermits,
  retryCountingAttempts,
  wrapService,
  wrapServiceEffect,
} from "./PortDerivation.ts";
