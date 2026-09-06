/**
 * Interactive behavior for the Qadi landing page.
 *
 * Ported from the approved interactive prototype's `DCLogic` component
 * (`Main.dc.html`) — same state machine, same timings, same easing — but
 * rewritten as plain DOM manipulation instead of a virtual-DOM re-render
 * model. Each `init*`/`start*` function below corresponds to the prototype
 * method of the same name.
 *
 * The typed-code panel and architecture diagram build their DOM once and
 * mutate only the properties that change per tick — an earlier version
 * reassigned `innerHTML` on every timer tick, which reflows the whole
 * subtree every 2-4.5s. Same for the hero canvas and marquee: both now pause
 * via IntersectionObserver/visibilitychange instead of running their
 * requestAnimationFrame loop for the page's entire lifetime regardless of
 * scroll position or tab visibility.
 */
import { arch, codeColors, features, lines, modelCount, stepInfo } from "../data/landing-content.js";

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Runs `onShow`/`onHide` as one or more elements enter/leave the viewport
// (any of them counts as "visible") and as the tab is backgrounded/restored.
// Shared by every section that auto-cycles on a timer or an animation loop,
// so only the section a reader is actually looking at is ever moving.
function gateByVisibility(els, { onShow, onHide }) {
  const targets = Array.isArray(els) ? els : [els];
  const visible = new Set();

  function apply() {
    if (visible.size > 0 && document.visibilityState === "visible") onShow();
    else onHide();
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      apply();
    },
    { threshold: 0 },
  );
  targets.forEach((el) => io.observe(el));
  document.addEventListener("visibilitychange", apply);
}

const DIM_BORDER = "1px solid oklch(1 0 0 / 0.1)";
const MONO = "'IBM Plex Mono',monospace";

// ---------------------------------------------------------------------------
// Typed-code walkthrough (hero panel)
// ---------------------------------------------------------------------------

const codeState = { step: 0, timer: null, rowEls: null, paused: false };

// A critique found the hero running three concurrent motion sources once
// settled — this typed-code cycle, the ambient star canvas (`initHeroArt`),
// and the marquee ticker further down — reading busier than a system
// documented as "evidentiary... rather than persuasive" intends. Rather than
// literally pausing the canvas on the code panel's brief per-step
// transition (0.45s every 4.5s — too fast to read as a deliberate handoff),
// `heroArtState.dimmed` keeps the canvas visually secondary for as long as
// the code panel is the thing actively narrating, then lets it rise to its
// full, documented presence once the panel completes its tour and
// auto-pauses (see `setCodePaused`) — one motion source is primary at a
// time, not both competing throughout.
const heroArtState = { dimmed: false };

function buildTypedCodeRows(pre) {
  return lines.map((ln) => {
    const row = document.createElement("div");
    row.style.paddingLeft = "10px";
    // The active step's row gets a background tint plus a left border (see
    // applyTypedCodeStep) with no other spacing of its own — a critique
    // found the highlighted text sitting flush against that tint's own top
    // and bottom edge, on every row, not only the visibly cramped ones a
    // screenshot happened to catch. 2px is intentionally small: enough to
    // stop the highlight from touching the text, not enough to loosen the
    // panel's own tight code-block density.
    row.style.paddingTop = "2px";
    row.style.paddingBottom = "2px";
    row.style.marginLeft = "-12px";
    row.style.transition = "opacity 0.45s, background 0.45s, border-color 0.45s";
    ln.t.forEach(([text, tag]) => {
      const span = document.createElement("span");
      span.style.color = codeColors[tag];
      span.textContent = text;
      row.appendChild(span);
    });
    pre.appendChild(row);
    return { row, s: ln.s };
  });
}

function applyTypedCodeStep(rowEls, step) {
  const active = step + 1;
  rowEls.forEach(({ row, s }) => {
    row.style.opacity = s === 0 || s === active ? "1" : "0.26";
    row.style.background = s === active ? "oklch(0.72 0.15 195 / 0.09)" : "transparent";
    row.style.borderLeft = s === active ? "2px solid oklch(0.72 0.15 195)" : "2px solid transparent";
  });
}

function renderTypedCode() {
  const pre = document.getElementById("typed-code");
  if (pre) {
    if (!codeState.rowEls) codeState.rowEls = buildTypedCodeRows(pre);
    applyTypedCodeStep(codeState.rowEls, codeState.step);
  }

  const info = stepInfo[codeState.step];
  const capNum = document.getElementById("cap-num");
  const capTitle = document.getElementById("cap-title");
  const capBody = document.getElementById("cap-body");
  if (capNum) capNum.textContent = info.n;
  if (capTitle) capTitle.textContent = info.title;
  if (capBody) capBody.textContent = info.body;

  document.querySelectorAll(".step-dot").forEach((dot, i) => {
    const active = i === codeState.step;
    dot.style.background = active ? "oklch(0.78 0.13 195)" : "oklch(1 0 0 / 0.15)";
    dot.setAttribute("aria-current", String(active));
  });
}

function startCycle() {
  clearInterval(codeState.timer);
  if (prefersReducedMotion() || codeState.paused) {
    heroArtState.dimmed = false;
    return;
  }
  heroArtState.dimmed = true;
  const secs = 4.5;
  codeState.timer = setInterval(() => {
    codeState.step = (codeState.step + 1) % stepInfo.length;
    renderTypedCode();
    // A critique found `#cap-body`'s aria-live region re-announcing on this
    // timer for as long as the hero stays in view, with no bound but the
    // OS-level prefers-reduced-motion setting most sighted readers never
    // touch. One unattended pass through all four steps is enough to have
    // narrated the whole walkthrough once; auto-pause there instead of
    // repeating it indefinitely. `setCodePaused` re-arms the existing pause
    // button UI, so a reader who wants the loop back just presses play.
    if (codeState.step === 0) setCodePaused(true, document.getElementById("pause-btn"));
  }, secs * 1000);
}

// The hero code walkthrough and the architecture trace below (see
// `initArchitecture`) both auto-advance indefinitely once visible, with the
// only stop mechanism previously being the OS-level prefers-reduced-motion
// setting — a critique flagged that as a WCAG 2.2.2 gap most sighted readers
// have no way to trigger. This toggle and its architecture-section twin are
// the in-page pause each one needed.
function setCodePaused(paused, pauseBtn) {
  codeState.paused = paused;
  if (paused) {
    clearInterval(codeState.timer);
    heroArtState.dimmed = false;
  } else {
    startCycle();
  }
  if (pauseBtn) {
    pauseBtn.textContent = paused ? "▶ play" : "⏸ pause";
    pauseBtn.setAttribute("aria-pressed", String(paused));
  }
}

function initTypedCode() {
  document.querySelectorAll(".step-dot").forEach((dot, i) => {
    dot.addEventListener("click", () => {
      codeState.step = i;
      renderTypedCode();
      startCycle();
    });
  });
  const replayBtn = document.getElementById("replay-btn");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      codeState.step = 0;
      renderTypedCode();
      startCycle();
    });
  }
  const pauseBtn = document.getElementById("pause-btn");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => setCodePaused(!codeState.paused, pauseBtn));
  }
  renderTypedCode();
  // Unlike the architecture/feature/model cycles below, this one previously
  // ran unconditionally from page load — an `aria-live="polite"` region
  // (`#cap-body`) narrating on a 4.5s timer for the whole time the page is
  // open, long after the hero scrolls out of view. Gate it the same way.
  const capBody = document.getElementById("cap-body");
  if (capBody) {
    gateByVisibility(capBody, {
      onShow: startCycle,
      onHide: () => {
        clearInterval(codeState.timer);
        heroArtState.dimmed = false;
      },
    });
  } else {
    startCycle();
  }
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard (install command)
// ---------------------------------------------------------------------------

function initCopyInstall() {
  const btn = document.getElementById("copy-install");
  if (!btn) return;
  // A screen reader does not reliably announce an aria-live update on the
  // element the user's own focus is currently sitting on (reproduced on
  // VoiceOver/Safari), so the status text is announced through a separate
  // `role="status"` region instead of an aria-live attribute on the button
  // whose own text it mutates.
  const status = document.getElementById("copy-install-status");
  const announce = (text) => {
    if (status) status.textContent = text;
  };
  // SC 2.5.3 (Label in Name): a control's accessible name must contain its
  // visible text. `aria-label` stayed fixed at "Copy install command" while
  // the button's own visible text cycled through "copied ✓"/"copy failed" —
  // correct at rest, briefly out of sync with what was on screen. Setting
  // both together keeps the label true to whichever state is currently
  // showing, not just the default one.
  const setState = (label, text) => {
    btn.setAttribute("aria-label", label);
    btn.textContent = text;
  };
  let timeout;
  const reset = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      setState("Copy install command", "copy");
    }, 1600);
  };
  btn.addEventListener("click", () => {
    if (!navigator.clipboard) {
      setState("Copy install command failed", "copy failed");
      announce("Copy failed");
      reset();
      return;
    }
    navigator.clipboard.writeText("pnpm add @qadi/core").then(
      () => {
        setState("Copied install command", "copied ✓");
        announce("Install command copied to clipboard");
        reset();
      },
      () => {
        setState("Copy install command failed", "copy failed");
        announce("Copy failed");
        reset();
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Architecture walkthrough
// ---------------------------------------------------------------------------

const archState = { aStep: 0, aScen: 0, pinned: null, timer: null, diagramRefs: null, traceRefs: null, firstView: true, paused: false, toured: new Set() };
const traceAnimState = { lastScen: -1, lastStep: -1 };

function makeChip(label) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "flex:1;padding:9px 13px;background:oklch(0.13 0.012 260);border-radius:8px;transition:all 0.4s";
  const labelEl = document.createElement("div");
  labelEl.style.cssText = `font-size:11px;color:oklch(0.6 0.01 260);margin-bottom:3px;font-family:${MONO}`;
  labelEl.textContent = label;
  const valEl = document.createElement("div");
  valEl.style.cssText = `font-size:12px;color:oklch(0.85 0.006 260);font-family:${MONO};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
  wrap.append(labelEl, valEl);
  return { wrap, valEl };
}

function updateChip({ wrap, valEl }, val, active) {
  valEl.textContent = val;
  wrap.style.border = active ? "1px solid oklch(0.72 0.15 195 / 0.7)" : DIM_BORDER;
  wrap.style.boxShadow = active ? "0 0 20px oklch(0.72 0.15 195 / 0.25)" : "none";
}

function makeArrow() {
  const el = document.createElement("div");
  el.style.cssText = "text-align:center;font-size:13px;line-height:1.1;transition:color 0.4s";
  el.textContent = "↓";
  return el;
}

function updateArrow(el, active) {
  el.style.color = active ? "oklch(0.78 0.13 195)" : "oklch(0.6 0.01 260)";
}

function makeSvcRow(name) {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;justify-content:space-between;gap:12px;padding:7px 12px;border-radius:6px;transition:all 0.4s";
  const nameEl = document.createElement("span");
  nameEl.style.cssText = `font-size:11.5px;font-family:${MONO};color:oklch(0.82 0.006 260)`;
  nameEl.textContent = name;
  const statusEl = document.createElement("span");
  statusEl.style.cssText = `font-size:11.5px;font-family:${MONO};transition:color 0.3s`;
  row.append(nameEl, statusEl);
  return { row, statusEl };
}

function updateSvcRow({ row, statusEl }, idx, result, s) {
  const running = s === idx;
  const done = s > idx;
  const status = running ? ["… evaluating", "oklch(0.82 0.13 195)"] : done ? result : ["· pending", "oklch(0.6 0.01 260)"];
  row.style.background = running ? "oklch(0.72 0.15 195 / 0.12)" : "oklch(0.17 0.014 260)";
  row.style.border = running ? "1px solid oklch(0.72 0.15 195 / 0.5)" : "1px solid transparent";
  statusEl.textContent = status[0];
  statusEl.style.color = status[1];
}

function makeDecChip(label) {
  const el = document.createElement("div");
  el.style.cssText = `flex:1;text-align:center;padding:10px;border-radius:8px;font-family:${MONO};font-size:13px;transition:all 0.4s`;
  el.textContent = label;
  return el;
}

// Only the verdict actually reached is colored; every other state reads as
// neutral text at full opacity rather than a dimmed tint of the verdict hue,
// so the losing/pending chip stays legible (WCAG AA) instead of relying on
// low opacity to de-emphasize it.
function updateDecChip(el, isAllow, sc, s) {
  const decided = s >= 3;
  const winner = decided && sc.allow === isAllow;
  const col = isAllow ? "0.75 0.14 150" : "0.65 0.16 25";
  el.style.color = winner ? `oklch(${col})` : "oklch(0.6 0.01 260)";
  el.style.background = winner ? `oklch(${col} / 0.14)` : "oklch(0.13 0.012 260)";
  el.style.border = winner ? `1px solid oklch(${col} / 0.7)` : DIM_BORDER;
  el.style.boxShadow = winner ? `0 0 20px oklch(${col} / 0.25)` : "none";
}

function buildArchDiagram(container) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:8px";

  const topRow = document.createElement("div");
  topRow.style.cssText = "display:flex;gap:10px";
  const subjectChip = makeChip("subject");
  const resourceChip = makeChip("resource");
  const policyChip = makeChip("policy");
  topRow.append(subjectChip.wrap, resourceChip.wrap, policyChip.wrap);

  const arrow1 = makeArrow();

  const evalBox = document.createElement("div");
  evalBox.style.cssText = "padding:14px 16px;border-radius:8px;transition:all 0.4s;background:oklch(0.72 0.15 195 / 0.07)";
  const evalHeader = document.createElement("div");
  evalHeader.style.cssText = "display:flex;justify-content:space-between;margin-bottom:10px";
  const evalLabel = document.createElement("span");
  evalLabel.style.cssText = `font-size:13px;font-weight:600;color:oklch(0.78 0.13 195);font-family:${MONO}`;
  evalLabel.textContent = "evaluate";
  const evalSub = document.createElement("span");
  evalSub.style.cssText = `font-size:11px;color:oklch(0.7 0.01 260);font-family:${MONO}`;
  evalSub.textContent = "an Effect · deps as Layers";
  evalHeader.append(evalLabel, evalSub);
  const svcList = document.createElement("div");
  svcList.style.cssText = "display:flex;flex-direction:column;gap:6px";
  const svc1 = makeSvcRow('hasRole("editor")');
  const svc2 = makeSvcRow("hasPermission(doc:read)");
  svcList.append(svc1.row, svc2.row);
  evalBox.append(evalHeader, svcList);

  const arrow2 = makeArrow();

  const decRow = document.createElement("div");
  decRow.style.cssText = "display:flex;gap:10px";
  const allowChip = makeDecChip("Allow");
  const denyChip = makeDecChip("Deny");
  decRow.append(allowChip, denyChip);

  const arrow3 = makeArrow();

  const outBox = document.createElement("div");
  outBox.style.cssText = "padding:12px 16px;border-radius:8px;transition:all 0.4s;background:oklch(0.13 0.012 260)";
  const outMain = document.createElement("div");
  outMain.style.cssText = `font-size:12.5px;font-family:${MONO};transition:color 0.3s`;
  const outDetail = document.createElement("div");
  outDetail.style.cssText = `font-size:11px;font-family:${MONO};color:oklch(0.6 0.01 260);margin-top:3px`;
  outBox.append(outMain, outDetail);

  wrap.append(topRow, arrow1, evalBox, arrow2, decRow, arrow3, outBox);
  container.appendChild(wrap);

  return { subjectChip, resourceChip, policyChip, arrow1, evalBox, svc1, svc2, arrow2, allowChip, denyChip, arrow3, outBox, outMain, outDetail };
}

function updateArchDiagram(refs, sc, s) {
  updateChip(refs.subjectChip, sc.subject, s === 0);
  updateChip(refs.resourceChip, "doc-1", s === 0);
  updateChip(refs.policyChip, "canReadTitle", s === 0);
  updateArrow(refs.arrow1, s === 1);

  const evalActive = s === 1 || s === 2;
  refs.evalBox.style.border = evalActive ? "1px solid oklch(0.72 0.15 195 / 0.6)" : "1px solid oklch(0.72 0.15 195 / 0.25)";
  refs.evalBox.style.boxShadow = evalActive ? "0 0 20px oklch(0.72 0.15 195 / 0.25)" : "none";
  updateSvcRow(refs.svc1, 1, sc.svc1, s);
  updateSvcRow(refs.svc2, 2, sc.svc2, s);

  updateArrow(refs.arrow2, s === 3);
  updateDecChip(refs.allowChip, true, sc, s);
  updateDecChip(refs.denyChip, false, sc, s);

  updateArrow(refs.arrow3, s === 4);
  const outDone = s >= 4;
  const outColor = sc.out[2];
  refs.outBox.style.border = outDone ? outColor.replace(")", " / 0.6)") : DIM_BORDER;
  refs.outBox.style.boxShadow = outDone ? `0 0 20px ${outColor.replace(")", " / 0.25)")}` : "none";
  refs.outMain.textContent = outDone ? sc.out[0] : "enforceProjected — awaiting decision";
  refs.outMain.style.color = outDone ? outColor : "oklch(0.6 0.01 260)";
  refs.outDetail.textContent = outDone ? sc.out[1] : "";
  refs.outDetail.style.display = outDone ? "block" : "none";
}

// Every `arch` scenario carries exactly 5 trace lines, so 5 persistent line
// elements plus the cursor can be built once instead of re-parsed each tick.
function buildArchTrace(container) {
  const lineEls = Array.from({ length: 5 }, () => {
    const el = document.createElement("div");
    el.style.cssText = "font-size:12px;line-height:2;white-space:pre-wrap";
    el.style.display = "none";
    container.appendChild(el);
    return el;
  });
  const cursor = document.createElement("span");
  cursor.style.cssText =
    "display:inline-block;width:7px;height:13px;background:oklch(0.78 0.13 195);animation:blink 1s step-end infinite;vertical-align:middle";
  container.appendChild(cursor);
  return { lineEls, cursor };
}

function updateArchTrace(refs, sc, s, scen) {
  const scenChanged = scen !== traceAnimState.lastScen;
  refs.lineEls.forEach((el, i) => {
    if (i > s) {
      el.style.display = "none";
      return;
    }
    el.textContent = sc.trace[i][0];
    el.style.color = sc.trace[i][1];
    el.style.display = "block";
    // Only the newly-revealed line (or every visible line right after a
    // scenario switch) replays the type-in animation — not every already-
    // shown line on every tick, which is what a full innerHTML rebuild did.
    if (scenChanged || i > traceAnimState.lastStep) {
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "traceIn 0.35s ease both";
    }
  });
  traceAnimState.lastScen = scen;
  traceAnimState.lastStep = s;
}

function renderArchCaption() {
  const sc = arch[archState.aScen];
  const caption = document.getElementById("arch-caption");
  if (caption) caption.textContent = sc.caps[archState.aStep];
}

function renderArchScenarioButtons() {
  document.querySelectorAll(".arch-scen-btn").forEach((btn, i) => {
    const active = i === archState.aScen;
    const pinned = i === archState.pinned;
    btn.style.background = active ? "oklch(0.72 0.15 195 / 0.15)" : "transparent";
    btn.style.borderColor = active ? "oklch(0.72 0.15 195 / 0.6)" : "oklch(1 0 0 / 0.15)";
    btn.style.borderWidth = pinned ? "1.5px" : "1px";
    btn.style.color = active ? "oklch(0.85 0.1 195)" : "oklch(0.6 0.01 260)";
    btn.setAttribute("aria-pressed", String(pinned));
  });
}

function renderArch() {
  const sc = arch[archState.aScen];
  const s = archState.aStep;

  const diagramContainer = document.getElementById("arch-diagram");
  if (diagramContainer) {
    if (!archState.diagramRefs) archState.diagramRefs = buildArchDiagram(diagramContainer);
    updateArchDiagram(archState.diagramRefs, sc, s);
  }

  const traceContainer = document.getElementById("arch-trace");
  if (traceContainer) {
    if (!archState.traceRefs) archState.traceRefs = buildArchTrace(traceContainer);
    updateArchTrace(archState.traceRefs, sc, s, archState.aScen);
  }

  renderArchCaption();
  renderArchScenarioButtons();
}

const ARCH_STEP_MS = 3800;
const ARCH_FIRST_STEP_MS = 5200;

function startArch() {
  clearTimeout(archState.timer);
  if (prefersReducedMotion() || archState.paused) return;
  // A first-time reader hasn't yet built the Allow/Deny vocabulary the trace
  // lines assume, so the diagram's very first view gets a longer dwell
  // before anything moves — a critique found the flat 2s cadence outran
  // reading speed on first visit. Interacting (clicking a scenario) already
  // proves the reader is engaged, so only the unattended first tick waits
  // longer; every step after settles to the steady pace, which now matches
  // the hero typed-code panel's own unhurried ~4-4.5s rhythm instead of
  // running noticeably faster than it.
  const delay = archState.firstView ? ARCH_FIRST_STEP_MS : ARCH_STEP_MS;
  archState.firstView = false;
  const tick = () => {
    if (archState.aStep >= 4) {
      archState.aStep = 0;
      // A pinned scenario replays on loop instead of handing off to the next
      // one — "pin" would otherwise be a lie the auto-advance overrides
      // after every click.
      if (archState.pinned === null) {
        archState.toured.add(archState.aScen);
        archState.aScen = (archState.aScen + 1) % arch.length;
        // A critique found `#arch-trace`/`#arch-caption`'s aria-live regions
        // re-announcing on this timer for as long as the diagram stays in
        // view, with no bound but prefers-reduced-motion. Once every
        // scenario has had one unattended full pass, stop rather than tour
        // them again — a pinned scenario is exempt because pinning is
        // already an explicit request to keep watching that one replay, and
        // the pause button remains its own stop mechanism either way.
        if (archState.toured.size >= arch.length) {
          renderArch();
          setArchPaused(true, document.getElementById("arch-pause-btn"));
          return;
        }
      }
    } else {
      archState.aStep += 1;
    }
    renderArch();
    archState.timer = setTimeout(tick, ARCH_STEP_MS);
  };
  archState.timer = setTimeout(tick, delay);
}

function setArchPaused(paused, pauseBtn) {
  archState.paused = paused;
  if (paused) clearTimeout(archState.timer);
  else {
    // Pressing play after the tour cap above auto-paused should give a
    // fresh full tour, not immediately re-trigger the cap on the very next
    // step-wrap because `toured` was already full from the last pass.
    archState.toured = new Set();
    startArch();
  }
  if (pauseBtn) {
    pauseBtn.textContent = paused ? "▶ play" : "⏸ pause";
    pauseBtn.setAttribute("aria-pressed", String(paused));
  }
}

function initArchitecture() {
  document.querySelectorAll(".arch-scen-btn").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      archState.pinned = archState.pinned === i ? null : i;
      archState.aScen = i;
      archState.aStep = 0;
      archState.toured = new Set();
      renderArch();
      startArch();
    });
  });
  const archPauseBtn = document.getElementById("arch-pause-btn");
  if (archPauseBtn) {
    archPauseBtn.addEventListener("click", () => setArchPaused(!archState.paused, archPauseBtn));
  }
  renderArch();

  // Gated on the diagram specifically, not the whole `#architecture`
  // section: the section spans diagram, trace, and the closing services
  // paragraph, so on a mobile-width single-column stack it stays
  // "intersecting" — and the timer kept ticking — long after the diagram
  // itself had scrolled off the top of the screen. That let the trace
  // advance to a step the reader had never seen the diagram reach, breaking
  // the cause/effect correlation this section exists to demonstrate. Gating
  // on the diagram means the animation freezes the instant it leaves view
  // and resumes from wherever it left off once it's back — so whatever the
  // trace shows always matches what was last visible in the diagram, on
  // any viewport width.
  const diagram = document.getElementById("arch-diagram");
  if (diagram) {
    gateByVisibility(diagram, { onShow: startArch, onHide: () => clearTimeout(archState.timer) });
  } else {
    startArch();
  }
}

// ---------------------------------------------------------------------------
// Features grid auto-cycling highlight + API reporting/enforcing toggle
// ---------------------------------------------------------------------------

const sectionState = { featIdx: 0, apiMode: 0, featTimer: null, apiTimer: null, modelTimer: null, featPaused: false, apiPaused: false };

function updateFeatureHighlight() {
  document.querySelectorAll(".feature-card").forEach((card, i) => {
    const active = i === sectionState.featIdx;
    card.style.borderColor = active ? "oklch(0.72 0.15 195 / 0.7)" : "oklch(1 0 0 / 0.08)";
    const demo = card.querySelector(".feature-demo");
    if (demo) {
      demo.style.opacity = active ? "1" : "0";
      demo.style.gridTemplateRows = active ? "1fr" : "0fr";
    }
  });
}

function updateApiMode() {
  const repChip = document.getElementById("api-rep-chip");
  const enfChip = document.getElementById("api-enf-chip");
  if (repChip) {
    repChip.style.borderColor = sectionState.apiMode === 0 ? "oklch(0.72 0.15 195 / 0.6)" : "oklch(1 0 0 / 0.14)";
    repChip.style.color = sectionState.apiMode === 0 ? "oklch(0.78 0.13 195)" : "oklch(0.6 0.01 260)";
  }
  if (enfChip) {
    enfChip.style.borderColor = sectionState.apiMode === 1 ? "oklch(0.75 0.13 80 / 0.6)" : "oklch(1 0 0 / 0.14)";
    enfChip.style.color = sectionState.apiMode === 1 ? "oklch(0.78 0.11 80)" : "oklch(0.6 0.01 260)";
  }
  document.querySelectorAll(".api-row").forEach((row, i) => {
    const reporting = i < 2;
    const highlighted = reporting ? sectionState.apiMode === 0 : sectionState.apiMode === 1;
    row.style.background = highlighted ? (reporting ? "oklch(0.72 0.15 195 / 0.06)" : "oklch(0.75 0.13 80 / 0.05)") : "transparent";
  });
}

function startFeatureCycle() {
  clearInterval(sectionState.featTimer);
  if (prefersReducedMotion() || sectionState.featPaused) return;
  sectionState.featTimer = setInterval(() => {
    sectionState.featIdx = (sectionState.featIdx + 1) % features.length;
    updateFeatureHighlight();
  }, 2800);
}

function startApiCycle() {
  clearInterval(sectionState.apiTimer);
  if (prefersReducedMotion() || sectionState.apiPaused) return;
  sectionState.apiTimer = setInterval(() => {
    sectionState.apiMode = 1 - sectionState.apiMode;
    updateApiMode();
  }, 2800);
}

// Same WCAG 2.2.2 in-page stop mechanism as `setCodePaused`/`setArchPaused`
// above — these two cycles didn't have one, unlike the hero and architecture
// cycles, despite auto-advancing on the same indefinite timer.
function setFeaturePaused(paused, pauseBtn) {
  sectionState.featPaused = paused;
  if (paused) clearInterval(sectionState.featTimer);
  else startFeatureCycle();
  if (pauseBtn) {
    pauseBtn.textContent = paused ? "▶ play" : "⏸ pause";
    pauseBtn.setAttribute("aria-pressed", String(paused));
  }
}

function setApiPaused(paused, pauseBtn) {
  sectionState.apiPaused = paused;
  if (paused) clearInterval(sectionState.apiTimer);
  else startApiCycle();
  if (pauseBtn) {
    pauseBtn.textContent = paused ? "▶ play" : "⏸ pause";
    pauseBtn.setAttribute("aria-pressed", String(paused));
  }
}

// A one-shot count-up, not a perpetual cycle — triggered separately, the
// first time #models scrolls into view (see initSections), rather than on
// page load where it used to finish counting long before most readers
// scrolled far enough to see it. The markup renders the real `modelCount`
// server-side (so it's never wrong for a client with JS off or blocked);
// this resets the display to 0 only once JS has actually taken over, then
// counts back up as its own animation.
function startModelCount() {
  clearInterval(sectionState.modelTimer);
  const modelEl = document.getElementById("model-count");
  if (prefersReducedMotion()) {
    if (modelEl) modelEl.textContent = String(modelCount);
    return;
  }
  let count = 0;
  if (modelEl) modelEl.textContent = "0";
  sectionState.modelTimer = setInterval(() => {
    if (count >= modelCount) {
      clearInterval(sectionState.modelTimer);
      return;
    }
    count += 1;
    if (modelEl) modelEl.textContent = String(count);
  }, 55);
}

function isFeatureCardFocused() {
  return Boolean(document.activeElement && document.activeElement.classList.contains("feature-card"));
}

function initFeatureCardControl() {
  const cards = document.querySelectorAll(".feature-card");
  cards.forEach((card, i) => {
    const inspect = () => {
      clearInterval(sectionState.featTimer);
      sectionState.featIdx = i;
      updateFeatureHighlight();
    };
    const release = () => {
      // A pointer leaving one card while another already has keyboard focus
      // should not resume the auto-cycle out from under it.
      if (isFeatureCardFocused()) return;
      startFeatureCycle();
    };
    card.addEventListener("mouseenter", inspect);
    card.addEventListener("focus", inspect);
    card.addEventListener("mouseleave", release);
    card.addEventListener("blur", release);
  });
}

function initSections() {
  updateFeatureHighlight();
  updateApiMode();

  // The feature-card highlight (#features) and the API reporting/enforcing
  // toggle (#api) each cycle on their own independent timer, gated to their
  // own section's visibility — so a reader looking at one never sees the
  // other silently re-tint off-screen.
  const featuresSection = document.getElementById("features");
  if (featuresSection) {
    gateByVisibility(featuresSection, {
      // A layout shift (e.g. a `.feature-demo` reveal) can toggle the
      // IntersectionObserver's ratio and re-fire onShow while a reader still
      // has a card focused — restarting the cycle here without the same
      // check `release()` uses would silently move the highlight off the
      // card the reader is actually tabbed to.
      onShow: () => {
        if (isFeatureCardFocused()) return;
        startFeatureCycle();
      },
      onHide: () => clearInterval(sectionState.featTimer),
    });
  } else {
    startFeatureCycle();
  }

  const apiSection = document.getElementById("api");
  if (apiSection) {
    gateByVisibility(apiSection, { onShow: startApiCycle, onHide: () => clearInterval(sectionState.apiTimer) });
  } else {
    startApiCycle();
  }

  const modelsSection = document.getElementById("models");
  if (modelsSection) {
    let started = false;
    gateByVisibility(modelsSection, {
      onShow: () => {
        if (started) return;
        started = true;
        startModelCount();
      },
      onHide: () => {},
    });
  } else {
    startModelCount();
  }

  initFeatureCardControl();

  const featPauseBtn = document.getElementById("features-pause-btn");
  if (featPauseBtn) {
    featPauseBtn.addEventListener("click", () => setFeaturePaused(!sectionState.featPaused, featPauseBtn));
  }
  const apiPauseBtn = document.getElementById("api-pause-btn");
  if (apiPauseBtn) {
    apiPauseBtn.addEventListener("click", () => setApiPaused(!sectionState.apiPaused, apiPauseBtn));
  }
}

// ---------------------------------------------------------------------------
// Model matrix "show more" toggles
// ---------------------------------------------------------------------------

function initPillToggles() {
  document.querySelectorAll(".pill-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.closest(".model-category");
      if (!category) return;
      const expanded = category.classList.toggle("expanded");
      btn.textContent = expanded ? btn.dataset.less : btn.dataset.more;
      btn.setAttribute("aria-expanded", String(expanded));
    });
  });
}

// ---------------------------------------------------------------------------
// Glossary-pill tooltip, touch path. `:focus-visible` alone (see
// `.gloss-pill` in landing.css) is inconsistently reachable by tap across
// mobile browsers, so a tap here toggles a `.gloss-active` class explicitly
// instead of trusting that heuristic — the same tooltip either way, just a
// guaranteed way in for touch. A second tap on the open pill, or a tap
// anywhere outside it, closes it again.
// ---------------------------------------------------------------------------

function initGlossaryTooltips() {
  const pills = document.querySelectorAll(".gloss-pill[data-gloss]");
  if (!pills.length) return;
  const closeAll = () => pills.forEach((p) => p.classList.remove("gloss-active"));
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const wasActive = pill.classList.contains("gloss-active");
      closeAll();
      if (!wasActive) pill.classList.add("gloss-active");
    });
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".gloss-pill")) closeAll();
  });
}

// ---------------------------------------------------------------------------
// Feature / package grid "show more" toggles — same mechanic as the model
// pill toggles above, generalized for card grids.
// ---------------------------------------------------------------------------

function initCardToggles() {
  document.querySelectorAll(".card-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.closest(".card-group");
      if (!group) return;
      const expanded = group.classList.toggle("expanded");
      btn.textContent = expanded ? btn.dataset.less : btn.dataset.more;
      btn.setAttribute("aria-expanded", String(expanded));
    });
  });
}

// ---------------------------------------------------------------------------
// Scroll progress bar (nav top border)
// ---------------------------------------------------------------------------

function initScrollProgress() {
  const progressEl = document.getElementById("scroll-progress");
  if (!progressEl) return;
  // `transform: scaleX()` instead of `.style.width` — this codebase's own
  // marquee and bar-fill animations already avoid layout-triggering writes
  // the same way; this was the one holdout, measured at a genuinely cheap
  // 0.3-0.8ms per call but still worth matching. rAF-batched so a burst of
  // native scroll events collapses to at most one write per frame.
  let ticking = false;
  const apply = () => {
    ticking = false;
    const d = document.documentElement;
    const st = d.scrollTop || document.body.scrollTop || 0;
    const max = Math.max(d.scrollHeight, document.body.scrollHeight) - d.clientHeight;
    if (max > 0) progressEl.style.transform = `scaleX(${st / max})`;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  apply();
}

// ---------------------------------------------------------------------------
// Footer in-page anchors (Roadmap / the problem / packages / architecture)
// ---------------------------------------------------------------------------

// The only legitimate use of smooth-scrolling on this page — everything else
// relies on ordinary wheel/trackpad scrolling, which a global
// `scroll-behavior: smooth` on `html` used to intercept (see landing.css).
// Scoped here instead, so these four deliberate jumps stay smooth without
// fighting the reader's own scroll input everywhere else.
function initFooterAnchors() {
  document.querySelectorAll('a[href^="#"]:not([href="#main-content"])').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      // Every numbered section carries `tabindex="-1"` specifically so a
      // keyboard/screen-reader user who jumps here lands in the new content
      // rather than keeping focus back on the link that was just activated —
      // `scrollIntoView` alone moves the viewport, never the focus.
      target.focus({ preventScroll: true });
    });
  });
}

// ---------------------------------------------------------------------------
// Section-index rail — jump-to-section plus a live scroll-spy. The rail's
// own markup and its 10 `data-section` ids come from `pageSections` in
// landing-content.js (index.astro renders the buttons from the same list),
// so this file never hand-repeats the section order a third time.
// ---------------------------------------------------------------------------

function initSectionRail() {
  const dots = document.querySelectorAll(".section-rail-dot");
  if (!dots.length) return;

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const target = document.getElementById(dot.dataset.section);
      if (!target) return;
      target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      target.focus({ preventScroll: true });
    });
  });

  const sections = Array.from(dots)
    .map((dot) => document.getElementById(dot.dataset.section))
    .filter(Boolean);
  if (!sections.length) return;

  const setActive = (id) => {
    dots.forEach((dot) => dot.setAttribute("aria-current", String(dot.dataset.section === id)));
  };
  const clearActive = () => {
    dots.forEach((dot) => dot.setAttribute("aria-current", "false"));
  };

  // A section counts as "current" once it has crossed a fixed reading line
  // near the top of the viewport, not merely once any pixel of it is on
  // screen — every section on this page runs 500-1500px tall, so naive
  // full-page intersection would keep two or three of them "visible", and
  // therefore ambiguous, at once. `intersecting` tracks every section
  // currently past that line (`rootMargin` shrinks the observed viewport
  // down to a thin band 15-20% from the top); the *last* one in page order
  // among them is the one actually sitting under the line right now.
  const intersecting = new Set();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) intersecting.add(en.target);
        else intersecting.delete(en.target);
      });
      if (!intersecting.size) {
        // Nothing is under the reading line right now — either above the
        // very first section (still in the hero/marquee) or below the very
        // last one. Only the first case should clear the rail: a reader who
        // scrolls back up past #problem before ever reaching it hasn't
        // "returned to" whatever was last current, they've left every
        // section behind, and the rail previously kept pointing at it
        // (a critique reproduced this scrolling `dag` (07) into view, then
        // straight back to the top — the rail stayed on "07 · roles" at
        // scroll position 0). Below the last section there is nothing to
        // clear to instead, so the last-current section staying lit is the
        // more useful reading of "you're past everything this rail tracks."
        const first = sections[0];
        if (first && first.getBoundingClientRect().top > 0) clearActive();
        return;
      }
      const current = sections.filter((s) => intersecting.has(s)).at(-1);
      if (current) setActive(current.id);
    },
    { rootMargin: "-15% 0px -80% 0px", threshold: 0 },
  );
  sections.forEach((sec) => io.observe(sec));
}

// ---------------------------------------------------------------------------
// Problem-section compare recap — see index.astro's COMPARE RECAP comment
// and landing.css's `.compare-recap` comment for why this is a JS-toggled
// `position: fixed` bar rather than plain CSS `position: sticky`.
// ---------------------------------------------------------------------------

function initCompareRecap() {
  const recap = document.getElementById("compare-recap");
  const afterCard = document.querySelector(".compare-after");
  const nav = document.querySelector(".site-nav");
  if (!recap || !afterCard) return;

  const positionRecap = () => {
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    recap.style.top = `${navHeight + 12}px`;
  };
  positionRecap();
  window.addEventListener("resize", positionRecap);

  const mq = window.matchMedia("(max-width: 900px)");
  let inView = false;
  const apply = () => recap.classList.toggle("visible", mq.matches && inView);

  mq.addEventListener("change", apply);
  const io = new IntersectionObserver(
    (entries) => {
      inView = entries.some((en) => en.isIntersecting);
      apply();
    },
    // A reader has already seen the full "qadi" card, and the recap's job
    // is done, once its bottom has scrolled two-thirds of the way up the
    // viewport — the `-40%` bottom margin ends the recap there instead of
    // leaving it visible for the whole time any sliver of the card remains
    // on screen.
    { rootMargin: "-80px 0px -40% 0px", threshold: 0 },
  );
  io.observe(afterCard);
}

// ---------------------------------------------------------------------------
// Role-DAG diagram — decorative motion only, gated the same way as every
// other animated section (see the module comment at the top of this file).
// Unlike the marquee/hero-canvas/typed-code/architecture cycles above, this
// one has no JS-driven rAF/timer loop to start and stop — the flow-dots are
// SMIL `<animateMotion>` and the node groups are a plain infinite CSS
// `floaty` keyframe, both declared directly in the markup. `pauseAnimations`/
// `unpauseAnimations` are real SVGSVGElement methods that suspend the whole
// SMIL timeline; the `dag-paused` class (landing.css) does the equivalent
// for the CSS side via `animation-play-state`.
// ---------------------------------------------------------------------------

function initDagAnimations() {
  const svg = document.getElementById("dag-svg");
  if (!svg) return;
  if (prefersReducedMotion()) {
    svg.classList.add("dag-paused");
    if (typeof svg.pauseAnimations === "function") svg.pauseAnimations();
    return;
  }
  const wrap = svg.closest(".dag-svg-wrap") || svg;
  gateByVisibility(wrap, {
    onShow: () => {
      svg.classList.remove("dag-paused");
      if (typeof svg.unpauseAnimations === "function") svg.unpauseAnimations();
    },
    onHide: () => {
      svg.classList.add("dag-paused");
      if (typeof svg.pauseAnimations === "function") svg.pauseAnimations();
    },
  });
}

// ---------------------------------------------------------------------------
// Scroll-reveal
// ---------------------------------------------------------------------------

function initReveals() {
  document.body.classList.add("reveal-armed");
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in-view");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
  );
  els.forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------------------
// Model marquee
// ---------------------------------------------------------------------------

// Runs a `requestAnimationFrame` loop only while the marquee band is in the
// viewport and the tab is visible — previously this ran at 60fps for the
// entire time the page was open, including scrolled off-screen or
// backgrounded.
function initMarquee() {
  const marqueeEl = document.getElementById("marquee-track");
  if (!marqueeEl) return;
  const band = marqueeEl.parentElement || marqueeEl;
  const pauseBtn = document.getElementById("marquee-pause-btn");

  // An indefinitely auto-scrolling ticker is WCAG 2.2.2's own canonical
  // example of content needing a stop mechanism; under reduced motion there
  // is nothing to pause, so the control is hidden rather than wired to a
  // no-op.
  if (prefersReducedMotion()) {
    if (pauseBtn) pauseBtn.style.display = "none";
    return;
  }

  let x = 0;
  let last = null;
  let rafId = null;
  let paused = false;

  const step = (ts) => {
    if (last !== null) {
      x += (ts - last) * 0.045;
      const half = marqueeEl.scrollWidth / 2;
      if (half > 0 && x >= half) x -= half;
      marqueeEl.style.transform = "translateX(" + -x + "px)";
    }
    last = ts;
    rafId = requestAnimationFrame(step);
  };

  const start = () => {
    if (rafId !== null || paused) return;
    last = null; // avoid a large jump computed from a stale timestamp after a pause
    rafId = requestAnimationFrame(step);
  };
  const stop = () => {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  };

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      paused = !paused;
      pauseBtn.setAttribute("aria-pressed", String(paused));
      pauseBtn.setAttribute("aria-label", paused ? "Play scrolling model marquee" : "Pause scrolling model marquee");
      pauseBtn.textContent = paused ? "▶" : "⏸";
      if (paused) stop();
      else start();
    });
  }

  gateByVisibility(band, { onShow: start, onHide: stop });
}

// ---------------------------------------------------------------------------
// Hero canvas star-geometry animation
// ---------------------------------------------------------------------------

// Same visibility/intersection gating as the marquee above — this drew every
// frame for the page's whole lifetime before, even when the hero was
// scrolled out of view.
function initHeroArt() {
  const mount = document.getElementById("hero-art-mount");
  if (!mount) return;
  const pauseBtn = document.getElementById("hero-art-pause-btn");
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  mount.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = mount.clientWidth;
    h = mount.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  window.addEventListener("resize", size);

  const gold = "#c9a227";
  const teal = "#4fb6c4";
  const star = (cx, cy, r, rot, color, alpha, lw) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const rr = k % 2 === 0 ? r : r * 0.42;
      const a = (Math.PI / 8) * k;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.restore();
  };

  let t = 0;
  const drawFrame = () => {
    ctx.clearRect(0, 0, w, h);
    // See `heroArtState`'s own comment above: recede while the typed-code
    // panel is actively narrating so it reads as atmosphere behind the
    // panel's motion rather than a second, equally-weighted subject.
    const k = heroArtState.dimmed ? 0.55 : 1;
    const cx = w * 0.72;
    const cy = h * 0.46;
    const pulse = 0.5 + Math.sin(t * 0.8) * 0.5;
    star(cx, cy, 300, t * 0.05, gold, (0.08 + pulse * 0.05) * k, 1);
    star(cx, cy, 210, -t * 0.07, teal, (0.09 + pulse * 0.06) * k, 1);
    star(cx, cy, 130, t * 0.09, gold, (0.13 + pulse * 0.06) * k, 1.2);
    star(cx, cy, 62, -t * 0.12, teal, 0.18 * k, 1.2);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + t * 0.03 * (i % 2 === 0 ? 1 : -1);
      const rad = 330 + (i % 3) * 42;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad * 0.55;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.globalAlpha = (0.08 + 0.07 * (0.5 + Math.sin(t + i) * 0.5)) * k;
      ctx.fillStyle = i % 2 === 0 ? gold : teal;
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }
  };

  if (prefersReducedMotion()) {
    drawFrame();
    if (pauseBtn) pauseBtn.style.display = "none";
    return;
  }

  let rafId = null;
  let paused = false;

  const loop = () => {
    t += 0.016;
    drawFrame();
    rafId = requestAnimationFrame(loop);
  };
  const start = () => {
    if (rafId !== null || paused) return;
    rafId = requestAnimationFrame(loop);
  };
  const stop = () => {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  };

  // This ambient canvas previously had no in-page stop mechanism beyond the
  // OS-level prefers-reduced-motion setting, unlike every other auto-cycling
  // element on the page (typed-code, architecture, feature, API and marquee
  // all have one) — a WCAG 2.2.2 gap most sighted readers have no way to
  // trigger.
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      paused = !paused;
      pauseBtn.textContent = paused ? "▶ play background" : "⏸ pause background";
      pauseBtn.setAttribute("aria-pressed", String(paused));
      if (paused) stop();
      else start();
    });
  }

  // The hero's typed-code panel starts its own cycle immediately on load
  // (see initTypedCode); starting this ambient canvas at the same instant
  // gave a first-time visitor two independent, competing motion sources
  // before they'd finished reading the H1 — a critique's cognitive-load pass
  // caught this. Delaying only the FIRST start (not re-entries after
  // scrolling away and back) lets the headline and code panel read alone
  // first, then lets this fade in as atmosphere rather than a second subject.
  let hasStartedOnce = false;
  const gatedStart = () => {
    if (hasStartedOnce) {
      start();
      return;
    }
    hasStartedOnce = true;
    setTimeout(start, 1500);
  };

  gateByVisibility(mount, { onShow: gatedStart, onHide: stop });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function boot() {
  initTypedCode();
  initCopyInstall();
  initArchitecture();
  initSections();
  initPillToggles();
  initGlossaryTooltips();
  initCardToggles();
  initScrollProgress();
  initFooterAnchors();
  initSectionRail();
  initCompareRecap();
  initReveals();
  initMarquee();
  initHeroArt();
  initDagAnimations();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
