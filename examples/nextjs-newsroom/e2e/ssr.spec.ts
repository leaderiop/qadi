/**
 * What the server sent, before any JavaScript ran.
 *
 * Every assertion in this file reads the **served HTML**. Nothing waits for
 * hydration, nothing polls, and nothing races — which is what makes "no flash" a
 * testable claim rather than a hopeful one. A test that asserted the same thing
 * after hydration would pass on a page with a flash and prove nothing.
 */
import { expect, test } from "@playwright/test";

const as = (user: string) => [{
  name: "qadi-newsroom-user",
  value: user,
  domain: "127.0.0.1",
  path: "/",
}];

/** The raw bytes, with no browser in the way. */
const served = async (path: string, user: string): Promise<string> => {
  const response = await fetch(`http://127.0.0.1:3211${path}`, {
    headers: { cookie: `qadi-newsroom-user=${user}` },
  });
  expect(response.status).toBe(200);
  return response.text();
};

const states = (html: string): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const match of html.matchAll(/data-state="([A-Za-z]+)"/g)) {
    const key = match[1] ?? "";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

test.describe("seeded server rendering", () => {
  test("the newsroom serves settled guards and no pending ones", async () => {
    const html = await served("/newsroom", "omar");
    const counts = states(html);

    expect(counts["Pending"]).toBeUndefined();
    expect(counts["Rechecking"]).toBeUndefined();
    expect((counts["Allowed"] ?? 0) + (counts["Denied"] ?? 0)).toBeGreaterThan(5);
  });

  test("the same page for a Reader is settled too, and differently", async () => {
    const html = await served("/newsroom", "yasmine");
    const counts = states(html);

    expect(counts["Pending"]).toBeUndefined();
    expect(counts["Denied"] ?? 0).toBeGreaterThan(counts["Allowed"] ?? 0);
  });

  test("the unseeded page serves pending guards — the flash, for contrast", async () => {
    const html = await served("/spa", "omar");
    const counts = states(html);

    // The point of the control. Same guards, same subject, nothing seeded.
    expect(counts["Pending"] ?? 0).toBeGreaterThan(0);
  });
});

test.describe("what crosses to the browser", () => {
  test("a Reader is never sent a source contact", async () => {
    const html = await served("/newsroom", "yasmine");

    // Not "is hidden" — is absent. A guard chooses what to render; a prop
    // crosses before anything is rendered, which is how this leaked once.
    expect(html).not.toContain("port authority clerk");
    expect(html).not.toContain("Do not name the clerk");
  });

  test("an Editor is sent it, because they are entitled to it", async () => {
    const html = await served("/newsroom", "omar");
    expect(html).toContain("port authority clerk");
  });

  test("a denial's reason is withheld unless the page asks", async () => {
    const html = await served("/edge/leakage", "yasmine");

    // The default payload replaces a denial's reason with the literal
    // "hydrated"; the opt-in one names the branch that refused.
    expect(html).toContain("hydrated");
    expect(html).toContain("may read this article");
  });
});

test.describe("the guarded devtools routes", () => {
  test("refuse an anonymous reader", async () => {
    const response = await fetch("http://127.0.0.1:3211/api/__decisions");
    expect(response.status).toBe(403);
  });

  test("refuse an authenticated reader without the permission", async () => {
    const response = await fetch("http://127.0.0.1:3211/api/__decisions", {
      headers: { cookie: "qadi-newsroom-user=yasmine" },
    });
    // Authenticated and still refused, so the guard is a policy decision rather
    // than a credential check.
    expect(response.status).toBe(403);
  });

  test("stream to a reader the policy permits", async () => {
    const controller = new AbortController();
    const response = await fetch("http://127.0.0.1:3211/api/__decisions", {
      headers: { cookie: "qadi-newsroom-user=hakim" },
      signal: controller.signal,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    // Without this a proxy buffers the stream into oblivion and the feed appears
    // to hang rather than to work slowly.
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    controller.abort();
  });
});

test.describe("the proxy is not a security boundary", () => {
  test("a forged x-middleware-subrequest changes nothing", async () => {
    const plain = await fetch("http://127.0.0.1:3211/api/articles/night-shift", {
      headers: { cookie: "qadi-newsroom-user=yasmine" },
    });
    const forged = await fetch("http://127.0.0.1:3211/api/articles/night-shift", {
      headers: {
        cookie: "qadi-newsroom-user=yasmine",
        "x-middleware-subrequest": "middleware:middleware:middleware",
      },
    });

    expect(plain.status).toBe(403);
    expect(forged.status).toBe(403);
  });

  test("a claimed identity changes nothing", async () => {
    const claimed = await fetch("http://127.0.0.1:3211/api/articles/night-shift", {
      headers: { cookie: "qadi-newsroom-user=yasmine", "x-claimed-user": "hakim" },
    });
    expect(claimed.status).toBe(403);
  });

  test("the cookie is what decides", async () => {
    const editor = await fetch("http://127.0.0.1:3211/api/articles/night-shift", {
      headers: { cookie: "qadi-newsroom-user=omar" },
    });
    expect(editor.status).toBe(200);
  });
});

test.describe("the port endpoints answer only about the session", () => {
  test("a subjectId in the query is not identity", async () => {
    const response = await fetch(
      "http://127.0.0.1:3211/api/ports/attribute?subjectId=hakim&attribute=clearance",
      { headers: { cookie: "qadi-newsroom-user=yasmine" } },
    );
    const body: unknown = await response.json();

    // Yasmine's clearance, not Hakim's, however the question was phrased.
    expect(JSON.stringify(body)).toContain('"level":0');
  });
});

test.describe("the browser half", () => {
  test("a seeded allow is replaced by this client's own denial", async ({ context, page }) => {
    // The seed is asserted against the **served bytes**, not against the page
    // after hydration — and that is not a convenience. BEH-QD-151 says a seed
    // must not be read while a re-check is in flight, so the moment this client
    // starts asking, the guard correctly reads *pending* rather than the
    // server's allow. Allowed → Pending → Denied is the specified sequence, and
    // only the first of those three is ever in the HTML.
    const html = await served("/edge/divergent", "omar");
    expect(html).toContain('data-testid="state-standing" data-state="Allowed"');

    await context.addCookies(as("omar"));
    await page.goto("/edge/divergent");

    // Re-checked: the standing was revoked between that render and this.
    await expect(page.getByTestId("state-standing")).toHaveAttribute("data-state", "Denied", {
      timeout: 15_000,
    });

    // The specified three-step sequence, recorded per render rather than polled
    // — a poller at any interval can miss the middle state, and missing it is
    // what makes this look like a plain Allowed → Denied flip.
    await expect(page.getByTestId("seen-sequence")).toHaveAttribute(
      "data-seen",
      "Success,Initial+waiting,Success",
    );
  });

  test("a copy of the atom set seeds nothing", async ({ context, page }) => {
    await context.addCookies(as("omar"));
    await page.goto("/edge/unregistered");

    await expect(page.getByTestId("registered-count")).toHaveText("1");
    await expect(page.getByTestId("foreign-count")).toHaveText("0");
    await expect(page.getByTestId("unregistered-drops")).toContainText("UnregisteredAtoms");
  });

  test("a payload for another subject is refused whole", async ({ context, page }) => {
    await context.addCookies(as("omar"));
    await page.goto("/edge/wrong-subject");

    await expect(page.getByTestId("drops-wrong-subject")).toContainText("PayloadSubjectMismatch");
  });

  test("three undecodable entries are reported once", async ({ context, page }) => {
    await context.addCookies(as("omar"));
    await page.goto("/edge/version-skew");

    const drops = page.getByTestId("drops-version-skew");
    await expect(drops).toContainText("UndecodablePolicy");
    await expect(drops).toContainText("× 3");
    // One line, not three.
    await expect(drops.locator("li")).toHaveCount(1);
  });

  test("an action re-authorizes whatever the button looked like", async ({ context, page }) => {
    await context.addCookies(as("yasmine"));
    await page.goto("/edge/action");

    const button = page.getByTestId("publish-button-the-harbour-contract");
    await expect(button).toHaveAttribute("data-allowed", "false");
    await button.click();

    const outcome = page.getByTestId("publish-outcome-the-harbour-contract");
    await expect(outcome).toHaveAttribute("data-ok", "false");
    // A refusal, and it says which rule refused — not a generic 403.
    await expect(outcome).toContainText("refused:");
  });
});

/**
 * What the browser found, and what can actually be pinned here.
 *
 * Both of these failed in front of a person after passing their unit tests,
 * which is the argument for having driven the app at all. Only one is a
 * regression guard: the other reproduced solely under `next dev`, and this suite
 * runs a production build, so it stays green on the broken version. Its comment
 * says so rather than letting the green tick imply otherwise.
 *
 * A third candidate was dropped entirely — see the README's open items. It
 * asserted a cause that measurement did not support, and passed for an unrelated
 * reason, which is worse than having no test at all.
 */
test.describe("regressions found by driving the app", () => {
  /** Switching to another user, and the control agreeing that it happened. */
  const switchTo = async (page: import("@playwright/test").Page, user: string) => {
    await page.selectOption("select[name=user]", user);
    await page.click("form button[type=submit]");
  };

  /**
   * **This does not guard the bug it was written for**, and saying so is the
   * point of the comment.
   *
   * The switcher reported the wrong user in `next dev` and never in
   * `next start` — measured both ways, with and without the `key` that fixes it.
   * This suite runs against a production build, so it would pass on the broken
   * version, and it did: removing the fix left it green.
   *
   * It is kept because it asserts something true and cheap — that switching
   * changes both the control and the decisions under it — and because a reader
   * who finds the `key` in `Shell.tsx` and looks for its test should find this
   * and the reason it is not one.
   */
  test("the user switcher reports the user it switched to", async ({ context, page }) => {
    await context.addCookies(as("yasmine"));
    await page.goto("/newsroom");

    await switchTo(page, "omar");

    await expect(page.locator("select[name=user]")).toHaveValue("omar", { timeout: 15_000 });
    await expect(page.getByTestId("state-read:the-harbour-contract"))
      .toHaveAttribute("data-state", "Allowed");
  });

  test("the server feed connects after switching to a subject who may read it", async ({
    context,
    page,
  }) => {
    // `/__decisions` is guarded, so the EventSource is authorized as whoever
    // held the session when it opened. Built once at module scope, a refusal was
    // never retried and switching to a permitted subject left the panel with the
    // browser's own decisions and none of the server's.
    await context.addCookies(as("yasmine"));
    await page.goto("/newsroom");
    await expect(page.getByTestId("server-feed-refused")).toBeVisible();

    await switchTo(page, "hakim");

    await expect(page.getByTestId("server-feed-refused")).toHaveCount(0, { timeout: 15_000 });
    await expect
      .poll(
        () =>
          page
            .locator('[data-testid="qadi-devtools"] tbody tr')
            .evaluateAll((rows) =>
              rows.filter((row) => row.textContent?.startsWith("Server")).length
            ),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);
  });

  test("a disagreement with the seed is announced", async ({ context, page }) => {
    // `/edge/divergent`'s verdict changes from its seed, and for a while nothing
    // said so. The seed is a dependency of the decision atom and nothing mounts
    // it, so a registry could drop its value — and whether the disagreement was
    // reported became a fact about registry lifetime rather than the decision.
    await context.addCookies(as("omar"));
    await page.goto("/edge/divergent");

    await expect(page.getByTestId("state-standing")).toHaveAttribute("data-state", "Denied", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("mismatch-report")).toContainText("disagreements reported: 1");
  });

  test("invalidating re-asks the ports", async ({ context, page }) => {
    // Counted at the network, because the symptom was absence: the atoms really
    // were discarded and really were recomputed, and a `DecisionCache` in the
    // layer answered the recomputation, so nothing was ever asked again.
    await context.addCookies(as("hakim"));
    await page.goto("/edge/invalidate");
    await expect(page.getByTestId("safe-standing (over HTTP)"))
      .toHaveAttribute("data-state", "Allow", { timeout: 15_000 });

    let portCalls = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/ports/attribute")) portCalls += 1;
    });
    // Settle first, so nothing in flight is counted as a consequence of the click.
    await page.waitForTimeout(1_500);
    portCalls = 0;

    await page.click('[data-testid="invalidate"]');

    await expect.poll(() => portCalls, { timeout: 15_000 }).toBeGreaterThan(0);
  });
});
