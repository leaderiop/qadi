/**
 * Archive export — bundling a verified, ordered set of `AuditEntry` rows for
 * long-term storage or transfer, the second of the six
 * [DecommissioningChecklist.ts](./DecommissioningChecklist.ts) steps.
 */
import * as Effect from "effect/Effect";
import type { AuditEntry } from "./AuditEntry.ts";
import { verifyChainIntegrity } from "./ChainIntegrity.ts";

/**
 * Opaque pass-through metadata `@qadi/audit` never validates or interprets —
 * the same reauthentication-style refusal
 * [SignatureCapturePort.ts](./SignatureCapturePort.ts) makes for
 * `algorithm`/`keyId`, one layer up: identity and key material are outside
 * this library's competence, so the shape is carried, not judged.
 */
export interface KeyMaterial {
  readonly keyId: string;
  readonly algorithm: string;
  readonly publicKey: string;
}

export interface ArchivalOptions {
  readonly keyMaterial?: ReadonlyArray<KeyMaterial> | undefined;
}

export interface AuditArchive {
  readonly archiveVersion: string;
  readonly metadata: {
    readonly createdAt: number;
    readonly entryCount: number;
    readonly chainIntegrityVerified: boolean;
  };
  readonly entries: ReadonlyArray<AuditEntry>;
  readonly keyMaterial?: ReadonlyArray<KeyMaterial> | undefined;
}

const ARCHIVE_VERSION = "1";

/**
 * Verifies the chain, then bundles. Fails with `ChainIntegrityError` rather
 * than archiving a set of rows already known to have a gap or a duplicate —
 * an archive exists to be trusted later, so it refuses to be built on a
 * foundation this package can already tell is broken.
 *
 * `verifyChainIntegrity` tolerates and is tested against entries arriving
 * out of write order — it checks the *sequence numbers*, not array order.
 * `metadata.chainIntegrityVerified: true` would be a false claim if the
 * archive then stored `entries` exactly as handed in: a reviewer trusting a
 * verified archive to be in sequence order would get rows in whatever order
 * the caller happened to read them back in. Sorted here, by `sequenceNumber`
 * — stably, so the (opt-in, unordered-by-definition) entries carrying none
 * keep their relative order rather than being shuffled by an incidental
 * comparator result.
 */
export const archiveAuditTrail = Effect.fn("qadi.audit.archiveAuditTrail")(function* (
  entries: ReadonlyArray<AuditEntry>,
  now: number,
  options?: ArchivalOptions,
) {
  yield* verifyChainIntegrity(entries);

  const ordered = entries.toSorted(
    (a, b) => (a.sequenceNumber ?? Number.POSITIVE_INFINITY) - (b.sequenceNumber ?? Number.POSITIVE_INFINITY),
  );

  const archive: AuditArchive = {
    archiveVersion: ARCHIVE_VERSION,
    metadata: {
      createdAt: now,
      entryCount: ordered.length,
      chainIntegrityVerified: true,
    },
    entries: ordered,
    ...(options?.keyMaterial === undefined ? {} : { keyMaterial: options.keyMaterial }),
  };
  return archive;
});
