import "server-only";
/**
 * Standing, revoked between a render and a re-check.
 *
 * `/edge/divergent` exists to make one thing happen for real: the server allows
 * something, the page ships that allow as a seed, and by the time the browser
 * asks for itself the answer has changed. Faking it with a timer would be a
 * demonstration of a timer; this changes the attribute the policy actually reads.
 *
 * A module-scope `Set`, which is a demo's database. It is process-wide like
 * everything else here, so two browsers pointed at the same server share it —
 * said out loud rather than left to surprise someone.
 */
const revoked = new Set<string>();

export const revoke = (subjectId: string): void => {
  revoked.add(subjectId);
};

export const restore = (subjectId: string): void => {
  revoked.delete(subjectId);
};

export const standingOf = (subjectId: string): string => (revoked.has(subjectId) ? "suspended" : "good");
