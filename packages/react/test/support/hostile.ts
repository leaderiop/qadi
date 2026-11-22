/**
 * A thrown value that can be neither stringified nor asked for its message.
 *
 * The one hostile value the reporter tests share (ADR-QD-182): both its
 * `toString` and its `message` getter throw. `@qadi/react` keeps its own copy
 * because a test folder is not a package boundary other packages may cross.
 */
export const hostile = {
  toString(): string {
    throw new Error("toString threw");
  },
  get message(): string {
    throw new Error("message threw");
  },
};

/** An `Error` whose `message` getter throws, so `String` of it throws too. */
export const hostileError = Object.defineProperty(new Error("unread"), "message", {
  get(): string {
    throw new Error("message threw");
  },
});
