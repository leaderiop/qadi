/**
 * Runs code under a chosen `NODE_ENV` and reads what it writes with `console.warn`.
 *
 * The reporter tests state each developer signal's sentence under both environments and
 * compare the console's lines whole, so the swap and the spy are written once here and the
 * three files that need them share it.
 */
import { vi } from "vitest";

export type Environment = "development" | "production";

export const environments: ReadonlyArray<Environment> = ["development", "production"];

/** Runs `act` with `NODE_ENV` set to `environment`, restoring it after. */
export const inEnvironment = <A,>(environment: Environment, act: () => A): A => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = environment;
  try {
    return act();
  } finally {
    process.env.NODE_ENV = previous;
  }
};

/** The lines `act` writes with `console.warn`, in order. */
export const said = (act: () => void): ReadonlyArray<string> => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    act();
    return warn.mock.calls.map((call) => String(call[0]));
  } finally {
    warn.mockRestore();
  }
};
