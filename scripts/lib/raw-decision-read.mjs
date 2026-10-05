/**
 * What counts as reading a decision result's `AsyncResult` state directly,
 * rather than through `@qadi/react`'s `outcomeOf` (ADR-QD-017, ARCH-14).
 *
 * One pattern, shared by `check-house-style.mjs`'s `DECISION_READ_BUDGET`
 * (library source) and the two doc-fence gates (`check-doc-examples.mjs`,
 * `check-website-doc-examples.mjs`), so "a raw read" means the same thing in
 * code and in documentation.
 *
 * Three ways a stale answer escapes, all covered:
 *
 * - `.waiting` — branching on the flag is how a re-check gets its own ladder,
 *   and a ladder that forgets it renders the previous allow (ARCH-14 C5).
 * - `.previousSuccess` — a `Failure` keeps the last success there.
 * - `AsyncResult.isSuccess(` and its siblings, and the value accessors
 *   (`value`, `getOrElse`, `getOrThrow`, the `match` family, `toExit`), which
 *   either ignore `waiting` or return a failure's `previousSuccess`.
 *
 * Global, so a caller counting reads gets every one on a line —
 * `AsyncResult.isSuccess(r) && !r.waiting` is two. Callers reset `lastIndex`
 * by using `String.prototype.match`/`matchAll`, never `RegExp.prototype.test`.
 */
export const RAW_DECISION_READ =
  /\.waiting\b|\.previousSuccess\b|\bAsyncResult\.(?:isSuccess|isFailure|isInitial|isNotInitial|isWaiting|value|getOrElse|getOrThrow|match|matchWithError|matchWithWaiting|toExit)\(/g;
