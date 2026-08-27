/**
 * Interactive behavior for the Qadi landing page.
 *
 * Ported from the approved interactive prototype's `DCLogic` component
 * (`Main.dc.html`) — same state machine, same timings, same easing — but
 * rewritten as plain DOM manipulation instead of a virtual-DOM re-render
 * model. Each `init*`/`start*` function below corresponds to the prototype
 * method of the same name.
 */
import { arch, codeColors, features, lines, stepInfo } from "../data/landing-content.js";

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const DIM_BORDER = "1px solid oklch(1 0 0 / 0.1)";
const MONO = "'IBM Plex Mono',monospace";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------------------------------------------------------------------------
// Typed-code walkthrough (hero panel)
// ---------------------------------------------------------------------------

const codeState = { step: 0, timer: null };

function renderTypedCode() {
  const active = codeState.step + 1;
  const pre = document.getElementById("typed-code");
  if (pre) {
    const rows = lines
      .map((ln) => {
        const isActive = ln.s === 0 || ln.s === active;
        const style = [
          `opacity:${ln.s === 0 ? 1 : ln.s === active ? 1 : 0.26}`,
          `background:${ln.s === active ? "oklch(0.72 0.15 195 / 0.09)" : "transparent"}`,
          `border-left:${ln.s === active ? "2px solid oklch(0.72 0.15 195)" : "2px solid transparent"}`,
          "padding-left:10px",
          "margin-left:-12px",
          "transition:opacity 0.45s, background 0.45s, border-color 0.45s",
        ].join(";");
        const spans = ln.t
          .map((tk) => `<span style="color:${codeColors[tk[1]]}">${escapeHtml(tk[0])}</span>`)
          .join("");
        void isActive;
        return `<div style="${style}">${spans}</div>`;
      })
      .join("");
    pre.innerHTML = rows;
  }

  const info = stepInfo[codeState.step];
  const capNum = document.getElementById("cap-num");
  const capTitle = document.getElementById("cap-title");
  const capBody = document.getElementById("cap-body");
  if (capNum) capNum.textContent = info.n;
  if (capTitle) capTitle.textContent = info.title;
  if (capBody) capBody.textContent = info.body;

  document.querySelectorAll(".step-dot").forEach((dot, i) => {
    dot.style.background = i === codeState.step ? "oklch(0.78 0.13 195)" : "oklch(1 0 0 / 0.15)";
  });
}

function startCycle() {
  clearInterval(codeState.timer);
  const secs = 4.5;
  codeState.timer = setInterval(() => {
    codeState.step = (codeState.step + 1) % stepInfo.length;
    renderTypedCode();
  }, secs * 1000);
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
  renderTypedCode();
  startCycle();
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard (install command)
// ---------------------------------------------------------------------------

function initCopyInstall() {
  const btn = document.getElementById("copy-install");
  if (!btn) return;
  let timeout;
  btn.addEventListener("click", () => {
    if (navigator.clipboard) navigator.clipboard.writeText("pnpm add @qadi/core");
    btn.textContent = "copied ✓";
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      btn.textContent = "copy";
    }, 1600);
  });
}

// ---------------------------------------------------------------------------
// Architecture walkthrough
// ---------------------------------------------------------------------------

const archState = { aStep: 0, aScen: 0, timer: null };

function chipHtml(label, val, active) {
  return `<div style="flex:1;padding:9px 13px;background:oklch(0.13 0.012 260);border-radius:8px;transition:all 0.4s;border:${
    active ? "1px solid oklch(0.72 0.15 195 / 0.7)" : DIM_BORDER
  };box-shadow:${active ? "0 0 18px oklch(0.72 0.15 195 / 0.25)" : "none"}">
    <div style="font-size:10.5px;color:oklch(0.55 0.01 260);margin-bottom:3px;font-family:${MONO}">${escapeHtml(label)}</div>
    <div style="font-size:12px;color:oklch(0.85 0.006 260);font-family:${MONO};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(val)}</div>
  </div>`;
}

function arrowHtml(active) {
  return `<div style="text-align:center;color:${
    active ? "oklch(0.78 0.13 195)" : "oklch(0.38 0.01 260)"
  };font-size:13px;line-height:1.1;transition:color 0.4s">↓</div>`;
}

function svcRowHtml(name, idx, result, s) {
  const running = s === idx;
  const done = s > idx;
  const status = running ? ["… evaluating", "oklch(0.82 0.13 195)"] : done ? result : ["· pending", "oklch(0.45 0.01 260)"];
  return `<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 12px;border-radius:6px;transition:all 0.4s;background:${
    running ? "oklch(0.72 0.15 195 / 0.12)" : "oklch(0.17 0.014 260)"
  };border:${running ? "1px solid oklch(0.72 0.15 195 / 0.5)" : "1px solid transparent"}">
    <span style="font-size:11.5px;font-family:${MONO};color:oklch(0.8 0.006 260)">${escapeHtml(name)}</span>
    <span style="font-size:11.5px;font-family:${MONO};color:${status[1]};transition:color 0.3s">${escapeHtml(status[0])}</span>
  </div>`;
}

function decChipHtml(label, isAllow, sc, s) {
  const decided = s >= 3;
  const winner = decided && sc.allow === isAllow;
  const col = isAllow ? "0.75 0.14 150" : "0.65 0.16 25";
  return `<div style="flex:1;text-align:center;padding:10px;border-radius:8px;font-family:${MONO};font-size:13px;transition:all 0.4s;color:oklch(${col});opacity:${
    decided ? (winner ? 1 : 0.22) : 0.55
  };background:${winner ? `oklch(${col} / 0.14)` : "oklch(0.13 0.012 260)"};border:${
    winner ? `1px solid oklch(${col} / 0.7)` : DIM_BORDER
  };box-shadow:${winner ? `0 0 20px oklch(${col} / 0.3)` : "none"}">${label}</div>`;
}

function renderArchDiagram() {
  const sc = arch[archState.aScen];
  const s = archState.aStep;
  const outDone = s >= 4;
  const outColor = sc.out[2];
  const html = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;gap:10px">
        ${chipHtml("subject", sc.subject, s === 0)}
        ${chipHtml("resource", "doc-1", s === 0)}
        ${chipHtml("policy", "canReadTitle", s === 0)}
      </div>
      ${arrowHtml(s === 1)}
      <div style="padding:14px 16px;border-radius:8px;transition:all 0.4s;background:oklch(0.72 0.15 195 / 0.07);border:${
        s === 1 || s === 2 ? "1px solid oklch(0.72 0.15 195 / 0.6)" : "1px solid oklch(0.72 0.15 195 / 0.25)"
      };box-shadow:${s === 1 || s === 2 ? "0 0 24px oklch(0.72 0.15 195 / 0.2)" : "none"}">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:13px;font-weight:600;color:oklch(0.78 0.13 195);font-family:${MONO}">evaluate</span>
          <span style="font-size:10.5px;color:oklch(0.55 0.01 260);font-family:${MONO}">an Effect · deps as Layers</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${svcRowHtml('hasRole("editor")', 1, sc.svc1, s)}
          ${svcRowHtml("hasPermission(doc:read)", 2, sc.svc2, s)}
        </div>
      </div>
      ${arrowHtml(s === 3)}
      <div style="display:flex;gap:10px">
        ${decChipHtml("Allow", true, sc, s)}
        ${decChipHtml("Deny", false, sc, s)}
      </div>
      ${arrowHtml(s === 4)}
      <div style="padding:12px 16px;border-radius:8px;transition:all 0.4s;background:oklch(0.13 0.012 260);border:${
        outDone ? `1px solid ${outColor.replace(")", " / 0.6)")}` : DIM_BORDER
      };box-shadow:${outDone ? `0 0 20px ${outColor.replace(")", " / 0.25)")}` : "none"}">
        <div style="font-size:12.5px;font-family:${MONO};color:${
          outDone ? outColor : "oklch(0.5 0.01 260)"
        };transition:color 0.3s">${escapeHtml(outDone ? sc.out[0] : "enforceProjected — awaiting decision")}</div>
        ${outDone ? `<div style="font-size:10.5px;font-family:${MONO};color:oklch(0.55 0.01 260);margin-top:3px">${escapeHtml(sc.out[1])}</div>` : ""}
      </div>
    </div>`;
  const container = document.getElementById("arch-diagram");
  if (container) container.innerHTML = html;
}

function renderArchTrace() {
  const sc = arch[archState.aScen];
  const s = archState.aStep;
  const lines_ = sc.trace
    .slice(0, s + 1)
    .map(
      (ln) =>
        `<div style="font-size:12px;line-height:2;color:${ln[1]};white-space:pre-wrap;animation:traceIn 0.35s ease both">${escapeHtml(ln[0])}</div>`,
    )
    .join("");
  const cursor =
    '<span style="display:inline-block;width:7px;height:13px;background:oklch(0.78 0.13 195);animation:blink 1s step-end infinite;vertical-align:middle"></span>';
  const container = document.getElementById("arch-trace");
  if (container) container.innerHTML = lines_ + cursor;
}

function renderArchCaption() {
  const sc = arch[archState.aScen];
  const caption = document.getElementById("arch-caption");
  if (caption) caption.textContent = sc.caps[archState.aStep];
}

function renderArchScenarioButtons() {
  document.querySelectorAll(".arch-scen-btn").forEach((btn, i) => {
    const active = i === archState.aScen;
    btn.style.background = active ? "oklch(0.72 0.15 195 / 0.15)" : "transparent";
    btn.style.borderColor = active ? "oklch(0.72 0.15 195 / 0.6)" : "oklch(1 0 0 / 0.15)";
    btn.style.color = active ? "oklch(0.85 0.1 195)" : "oklch(0.6 0.01 260)";
  });
}

function renderArch() {
  renderArchDiagram();
  renderArchTrace();
  renderArchCaption();
  renderArchScenarioButtons();
}

function startArch() {
  clearInterval(archState.timer);
  archState.timer = setInterval(() => {
    if (archState.aStep >= 4) {
      archState.aStep = 0;
      archState.aScen = (archState.aScen + 1) % arch.length;
    } else {
      archState.aStep += 1;
    }
    renderArch();
  }, 2000);
}

function initArchitecture() {
  document.querySelectorAll(".arch-scen-btn").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      archState.aScen = i;
      archState.aStep = 0;
      renderArch();
      startArch();
    });
  });
  renderArch();
  startArch();
}

// ---------------------------------------------------------------------------
// Features grid auto-cycling highlight + API reporting/enforcing toggle
// ---------------------------------------------------------------------------

const sectionState = { featIdx: 0, apiMode: 0, timer: null, modelTimer: null };

function updateFeatureHighlight() {
  document.querySelectorAll(".feature-card").forEach((card, i) => {
    const active = i === sectionState.featIdx;
    card.style.borderColor = active ? "oklch(0.72 0.15 195 / 0.7)" : "oklch(1 0 0 / 0.08)";
    card.style.boxShadow = active ? "0 0 24px oklch(0.72 0.15 195 / 0.18)" : "none";
    const demo = card.querySelector(".feature-demo");
    if (demo) {
      demo.style.opacity = active ? "1" : "0";
      demo.style.maxHeight = active ? "24px" : "0px";
    }
  });
}

function updateApiMode() {
  const repChip = document.getElementById("api-rep-chip");
  const enfChip = document.getElementById("api-enf-chip");
  if (repChip) {
    repChip.style.borderColor = sectionState.apiMode === 0 ? "oklch(0.75 0.14 150 / 0.6)" : "oklch(1 0 0 / 0.14)";
    repChip.style.color = sectionState.apiMode === 0 ? "oklch(0.78 0.12 150)" : "oklch(0.55 0.01 260)";
  }
  if (enfChip) {
    enfChip.style.borderColor = sectionState.apiMode === 1 ? "oklch(0.75 0.13 80 / 0.6)" : "oklch(1 0 0 / 0.14)";
    enfChip.style.color = sectionState.apiMode === 1 ? "oklch(0.78 0.11 80)" : "oklch(0.55 0.01 260)";
  }
  document.querySelectorAll(".api-row").forEach((row, i) => {
    const reporting = i < 2;
    const highlighted = reporting ? sectionState.apiMode === 0 : sectionState.apiMode === 1;
    row.style.background = highlighted ? (reporting ? "oklch(0.75 0.14 150 / 0.06)" : "oklch(0.75 0.13 80 / 0.05)") : "transparent";
  });
}

function startSections() {
  clearInterval(sectionState.timer);
  sectionState.timer = setInterval(() => {
    sectionState.featIdx = (sectionState.featIdx + 1) % features.length;
    sectionState.apiMode = 1 - sectionState.apiMode;
    updateFeatureHighlight();
    updateApiMode();
  }, 2800);

  clearInterval(sectionState.modelTimer);
  let modelCount = 0;
  const modelEl = document.getElementById("model-count");
  sectionState.modelTimer = setInterval(() => {
    if (modelCount >= 38) {
      clearInterval(sectionState.modelTimer);
      return;
    }
    modelCount += 1;
    if (modelEl) modelEl.textContent = String(modelCount);
  }, 55);
}

function initSections() {
  updateFeatureHighlight();
  updateApiMode();
  startSections();
}

// ---------------------------------------------------------------------------
// Scroll progress bar (nav top border)
// ---------------------------------------------------------------------------

function initScrollProgress() {
  const progressEl = document.getElementById("scroll-progress");
  if (!progressEl) return;
  const onScroll = () => {
    const d = document.documentElement;
    const st = d.scrollTop || document.body.scrollTop || 0;
    const max = Math.max(d.scrollHeight, document.body.scrollHeight) - d.clientHeight;
    if (max > 0) progressEl.style.width = (st / max) * 100 + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
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

function initMarquee() {
  const reduced = prefersReducedMotion();
  const marqueeEl = document.getElementById("marquee-track");
  if (!marqueeEl || reduced) return;
  let x = 0;
  let last = null;
  const step = (ts) => {
    if (last !== null) {
      x += (ts - last) * 0.045;
      const half = marqueeEl.scrollWidth / 2;
      if (half > 0 && x >= half) x -= half;
      marqueeEl.style.transform = "translateX(" + -x + "px)";
    }
    last = ts;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// Hero canvas star-geometry animation
// ---------------------------------------------------------------------------

function initHeroArt() {
  const mount = document.getElementById("hero-art-mount");
  if (!mount) return;
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
  const reduced = prefersReducedMotion();
  const frame = () => {
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.72;
    const cy = h * 0.46;
    const pulse = 0.5 + Math.sin(t * 0.8) * 0.5;
    star(cx, cy, 300, t * 0.05, gold, 0.08 + pulse * 0.05, 1);
    star(cx, cy, 210, -t * 0.07, teal, 0.09 + pulse * 0.06, 1);
    star(cx, cy, 130, t * 0.09, gold, 0.13 + pulse * 0.06, 1.2);
    star(cx, cy, 62, -t * 0.12, teal, 0.18, 1.2);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + t * 0.03 * (i % 2 === 0 ? 1 : -1);
      const rad = 330 + (i % 3) * 42;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad * 0.55;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.globalAlpha = 0.08 + 0.07 * (0.5 + Math.sin(t + i) * 0.5);
      ctx.fillStyle = i % 2 === 0 ? gold : teal;
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }
    t += 0.016;
    if (!reduced) requestAnimationFrame(frame);
  };
  frame();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function boot() {
  initTypedCode();
  initCopyInstall();
  initArchitecture();
  initSections();
  initScrollProgress();
  initReveals();
  initMarquee();
  initHeroArt();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
