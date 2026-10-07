/**
 * What the dock's wiring read sees, and what the dock is and is not handed.
 *
 * The integration `@qadi/react` and `@qadi/devtools` cannot test alone: neither
 * depends on the other (ADR-QD-053), and the example is the one place both
 * meet. `useDevtoolsFeed` builds the feed from the provider's registry and
 * `useDiagnostics` is devtools' own hook, so what this proves is that the two
 * fit — structurally and in behaviour — with **no** hoisting in `atoms.ts`.
 *
 * It used to prove the opposite shape. A layer *value* built twice is two
 * caches, so the dock's own build of `browserLayer` read a throwaway and the
 * Services panel said "0 completed entries" for as long as the page stayed
 * open; the example hoisted the cache out of the layer by hand to stop it
 * (CCR-QD-200). The property is `@qadi/react`'s now
 * (`DevtoolsFeed.test.tsx`), and this is its cross-package proof.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { hasRole } from "@qadi/core";
import { useDiagnostics } from "@qadi/devtools/react";
import { Can, QadiProvider, useDevtoolsFeed } from "@qadi/react";
import { clientPortCalls, atoms } from "../src/client/atoms.ts";
import { users } from "../src/domain/subjects.ts";

afterEach(cleanup);

const dockExtras = { collector: clientPortCalls };

/** Every wiring read the dock's diagnostics took, as the dock would show it. */
const wiringReads: Array<string> = [];

const Probe = () => {
  const feed = useDevtoolsFeed(dockExtras);
  const diagnostics = useDiagnostics({ ...feed.diagnostics, intervalMillis: 20 });
  const wiring = diagnostics.wiring;
  wiringReads.push(wiring._tag === "Read" ? `Read:${wiring.report.cache.size}` : wiring._tag);
  return null;
};

describe("the dock's wiring read", () => {
  it("sees the cache the provider's decisions filled, with no hoist", async () => {
    const first = users[0];
    if (first === undefined) throw new Error("nothing to evaluate with");

    render(
      <QadiProvider atoms={atoms} subject={first.subject}>
        <Can policy={hasRole("Editor")}>asked</Can>
        <Probe />
      </QadiProvider>,
    );

    await waitFor(
      () => expect(wiringReads.some((read) => /^Read:[1-9]/.test(read))).toBe(true),
      { timeout: 3000 },
    );
  });
});

describe("the dock's props", () => {
  it("the dock is not handed a mismatch count it would never show", () => {
    // A source assertion is the honest test: the observable symptom is "nothing".
    // `diagnostics` samples `hydration`, which supersedes the legacy count, and
    // `QuestionsPanel.test.tsx` already pins that `hydration` hides it.
    const source = readFileSync(join(import.meta.dirname, "../src/client/Dock.tsx"), "utf8");
    expect(source).not.toContain("hydrationMismatches=");
  });
});
