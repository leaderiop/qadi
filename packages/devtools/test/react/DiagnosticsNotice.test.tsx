/**
 * The shared diagnostics notice, rendered alone.
 *
 * The notice is the one place a poll's status is worded, so each state, the
 * once-per-stop alert and the restart's focus handling are pinned here without a
 * dock. The two screens that render it are covered with it in
 * `DiagnosticsScreens.test.tsx`.
 */
import { assert, describe, it } from "@effect/vitest";
import { vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { DiagnosticsStatus } from "../../src/model/DiagnosticsFeed.ts";
import { DiagnosticsNotice, diagnosticsRootProps, noStops } from "../../src/react/DiagnosticsNotice.tsx";
import type { DiagnosticsNoticeProps } from "../../src/react/DiagnosticsNotice.tsx";
import { colors, withAlpha } from "../../src/react/theme.ts";

const freshRef = (): DiagnosticsNoticeProps["announced"] => ({ current: noStops });

const noop = () => undefined;

/** The border colour a style property gives `value`, normalised the way the element's own style is. */
const borderColorOf = (value: string): string => {
  const probe = document.createElement("span");
  probe.style.borderColor = value;
  return probe.style.borderColor;
};

/** The background a style property gives `value`, normalised the same way. */
const backgroundOf = (value: string): string => {
  const probe = document.createElement("span");
  probe.style.background = value;
  return probe.style.background;
};

const stopped = (reason: string, sampled: boolean) => DiagnosticsStatus.Stopped({ reason, sampled });

const notice = (status: DiagnosticsStatus, announced = freshRef(), onRestart = noop) => (
  <DiagnosticsNotice status={status} onRestart={onRestart} announced={announced} />
);

describe("the diagnostics notice", () => {
  it("N1 Off renders only the empty status region", () => {
    const { container } = render(notice(DiagnosticsStatus.Off()));
    assert.strictEqual(container.innerHTML, '<div role="status" data-testid="qadi-diagnostics-region"></div>');
  });

  it("N2 Live renders only the empty status region", () => {
    const { container } = render(notice(DiagnosticsStatus.Live()));
    assert.strictEqual(container.innerHTML, '<div role="status" data-testid="qadi-diagnostics-region"></div>');
  });

  it("N3 Starting is a quiet status with no tint and no button", () => {
    render(notice(DiagnosticsStatus.Starting()));
    const starting = screen.getByTestId("qadi-diagnostics-starting");
    assert.strictEqual(starting.parentElement, screen.getByRole("status"));
    assert.strictEqual(
      starting.textContent,
      "Waiting for the first sample. Diagnostics has started and has not read anything yet. This screen fills in when the first sample arrives.",
    );
    assert.strictEqual(starting.style.borderColor, borderColorOf(colors.border));
    assert.strictEqual(starting.style.background, "");
    assert.isNull(screen.queryByRole("button"));
  });

  it("N4 a stop after a sample is an amber alert carrying the reason verbatim", () => {
    const reason = "boom\n  at frame";
    render(notice(stopped(reason, true)));
    const alert = screen.getByRole("alert");
    assert.strictEqual(alert.getAttribute("data-testid"), "qadi-diagnostics-stopped");
    assert.strictEqual(alert.getAttribute("data-sampled"), "true");
    assert.strictEqual(alert.getAttribute("data-announce"), "alert");
    assert.include(alert.textContent ?? "", "Diagnostics stopped.");
    assert.include(alert.textContent ?? "", "The reading below is the last one it took and is not updating.");
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-reason").textContent, reason);
    const box = screen.getByTestId("qadi-diagnostics-notice");
    assert.strictEqual(box.style.borderColor, borderColorOf(colors.error));
    assert.strictEqual(box.style.background, backgroundOf(withAlpha(colors.error, 0.12)));
  });

  it("N5 a stop before any sample says it took no reading", () => {
    render(notice(stopped("boom", false)));
    const section = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(section.getAttribute("data-sampled"), "false");
    assert.include(section.textContent ?? "", "before it took a reading");
    assert.include(section.textContent ?? "", "Nothing below was sampled by this dock.");
  });

  it("N6 an empty reason renders no reason block", () => {
    render(notice(stopped("", false)));
    assert.isNull(screen.queryByTestId("qadi-diagnostics-reason"));
    assert.isNotNull(screen.getByTestId("qadi-diagnostics-restart"));
  });

  it("N7 the reason is a bounded, keyboard-reachable, wrapping block that keeps every line", () => {
    const reason = Array.from({ length: 200 }, (_, line) => `at frame ${String(line)}`).join("\n");
    render(notice(stopped(reason, true)));
    const block = screen.getByTestId("qadi-diagnostics-reason");
    assert.strictEqual(block.getAttribute("role"), "group");
    assert.strictEqual(block.getAttribute("aria-label"), "Why diagnostics stopped");
    assert.strictEqual(block.getAttribute("tabindex"), "0");
    assert.strictEqual(block.style.maxHeight, "96px");
    assert.strictEqual(block.style.whiteSpace, "pre-wrap");
    assert.strictEqual(block.style.overflowWrap, "anywhere");
    assert.strictEqual(block.style.overflow, "auto");
    assert.strictEqual(block.textContent, reason);
  });

  it("N8 restart calls onRestart once and puts focus on the screen root", () => {
    const onRestart = vi.fn();
    const status = stopped("boom", false);
    render(
      <div {...diagnosticsRootProps(status)} data-testid="root">
        {notice(status, freshRef(), onRestart)}
      </div>,
    );
    const restart = screen.getByRole("button", { name: "Restart diagnostics" });
    assert.strictEqual(restart.getAttribute("type"), "button");
    assert.isNull(restart.getAttribute("aria-label"));
    assert.isNull(restart.getAttribute("aria-pressed"));
    assert.strictEqual(restart.style.outline, "");

    act(() => {
      fireEvent.click(restart);
    });
    assert.strictEqual(onRestart.mock.calls.length, 1);
    assert.strictEqual(document.activeElement, screen.getByTestId("root"));
  });

  it("N9 a stop alerts once, again for a new stop, and a strict-mode first render still alerts", () => {
    const announced = freshRef();
    const first = stopped("boom", true);
    const view = render(notice(first, announced));
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-announce"), "alert");

    view.unmount();
    const again = render(notice(first, announced));
    const silent = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(silent.getAttribute("data-announce"), "none");
    assert.isNull(silent.getAttribute("role"));

    again.rerender(notice(stopped("boom", true), announced));
    const next = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(next.getAttribute("data-announce"), "alert");
    assert.strictEqual(next.getAttribute("role"), "alert");
    again.unmount();

    render(<StrictMode>{notice(stopped("boom", true), freshRef())}</StrictMode>);
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-announce"), "alert");
  });

  it("N10 the root props name the status and make the root a focus target, not a tab stop", () => {
    for (const status of [
      DiagnosticsStatus.Off(),
      DiagnosticsStatus.Starting(),
      DiagnosticsStatus.Live(),
      stopped("boom", true),
    ]) {
      const props = diagnosticsRootProps(status);
      assert.strictEqual(props["data-diagnostics-status"], status._tag);
      assert.strictEqual(props.tabIndex, -1);
      assert.deepStrictEqual(props.style, { padding: 12 });
    }
  });

  it("N11 the alert holds the lead and the body only, and the reason follows it outside the alert", () => {
    const reason = "boom\n  at frame one\n  at frame two";
    render(notice(stopped(reason, true)));
    const alert = screen.getByRole("alert");
    const block = screen.getByTestId("qadi-diagnostics-reason");
    assert.strictEqual(
      alert.textContent,
      "Diagnostics stopped. The sampler failed with an unexpected error and is no longer polling. The reading below is the last one it took and is not updating.",
    );
    assert.isFalse(alert.contains(block));
    assert.strictEqual(block.closest("[role='alert']"), null);
    assert.strictEqual(block.parentElement, screen.getByTestId("qadi-diagnostics-notice"));
    assert.strictEqual(alert.nextElementSibling, block);
  });

  it("N12 a second stop on a mounted notice remounts it, so its alert is present on the new mount", () => {
    const announced = freshRef();
    const view = render(notice(stopped("first", true), announced));
    const first = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(first.getAttribute("role"), "alert");

    view.rerender(notice(stopped("second", true), announced));

    const second = screen.getByTestId("qadi-diagnostics-stopped");
    assert.notStrictEqual(second, first);
    assert.isFalse(first.isConnected);
    assert.strictEqual(second.getAttribute("role"), "alert");
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-reason").textContent, "second");

    const same = stopped("second", true);
    view.rerender(notice(same, announced));
    const third = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(third.getAttribute("role"), "alert");
    view.rerender(notice(same, announced));
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped"), third);
  });

  it("N13 the polite status region stays mounted and empty until the poll is Starting, then holds its copy", () => {
    const announced = freshRef();
    const view = render(notice(DiagnosticsStatus.Off(), announced));
    const region = screen.getByRole("status");
    assert.strictEqual(region.textContent, "");
    assert.strictEqual(region.getAttribute("data-testid"), "qadi-diagnostics-region");
    assert.strictEqual(region.getAttribute("style"), null);

    view.rerender(notice(DiagnosticsStatus.Starting(), announced));
    assert.strictEqual(screen.getByRole("status"), region);
    assert.include(region.textContent ?? "", "Waiting for the first sample.");

    view.rerender(notice(DiagnosticsStatus.Live(), announced));
    assert.strictEqual(screen.getByRole("status"), region);
    assert.strictEqual(region.textContent, "");

    view.rerender(notice(stopped("boom", false), announced));
    assert.strictEqual(screen.getByRole("status"), region);
    assert.strictEqual(region.textContent, "");
    assert.isNotNull(screen.getByRole("alert"));

    view.rerender(notice(DiagnosticsStatus.Starting(), announced));
    assert.strictEqual(screen.getByRole("status"), region);
    assert.include(region.textContent ?? "", "Waiting for the first sample.");
    assert.isNull(screen.queryByRole("alert"));
  });
});
