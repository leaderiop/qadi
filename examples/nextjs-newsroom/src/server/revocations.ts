import "server-only";
/**
 * Standing, revoked between a render and a re-check.
 *
 * `/edge/divergent` exists to make one thing happen for real: the server allows
 * something, the page ships that allow as a seed, and by the time the browser
 * asks for itself the answer has changed. Faking it with a timer would be a
 * demonstration of a timer; this changes the attribute the policy actually reads.
 *
 * A `Set`, which is a demo's database — pinned to `globalThis`, because the page
 * that revokes and the route handler the browser then asks are different module
 * graphs and a plain module-scope `Set` is two sets. That is exactly how this
 * route silently failed to demonstrate anything: the page revoked, the browser
 * asked, and the answer was still `good`.
 *
 * Process-wide, so two browsers pointed at the same server share it — said out
 * loud rather than left to surprise someone.
 */
import { revokedOnce } from "./processGlobal.ts";

const revoked = revokedOnce();

export const revoke = (subjectId: string): void => {
  revoked.add(subjectId);
};

export const restore = (subjectId: string): void => {
  revoked.delete(subjectId);
};

export const standingOf = (subjectId: string): string => (revoked.has(subjectId) ? "suspended" : "good");
