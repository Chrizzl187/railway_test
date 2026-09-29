/* ==========================================================================
   Solace — motion showcase. Vanilla JS, no dependencies.
   Modules: core · nav · hero · marquee · story · panel · flow · closing
   ========================================================================== */
(() => {
"use strict";

/* ------------------------------ core ------------------------------ */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(pointer: fine)").matches;
const pad2 = n => String(n).padStart(2, "0");
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = typeof a === "string" ? hex(a) : a, B = typeof b === "string" ? hex(b) : b; return A.map((v, i) => v + (B[i] - v) * t); };
const rgb = c => `rgb(${c.map(v => Math.round(v)).join(",")})`;
const easeOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

function tween(from, to, dur, fn, done) {
  if (RM) { fn(to); done && done(); return; }
  const t0 = performance.now();
  const step = now => {
    const t = clamp((now - t0) / dur);
    fn(lerp(from, to, easeOutExpo(t)));
    t < 1 ? requestAnimationFrame(step) : done && done();
  };
  requestAnimationFrame(step);
}

// one shared rAF loop
const frameFns = [];
const onFrame = fn => frameFns.push(fn);
let lastT = performance.now();
(function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  for (const f of frameFns) f(now / 1000, dt);
  requestAnimationFrame(loop);
})(lastT);

function visible(el, margin = "150px") {
  const state = { on: false };
  new IntersectionObserver(es => es.forEach(e => (state.on = e.isIntersecting)), { rootMargin: margin }).observe(el);
  return state;
}

// pointer (page coords) + scroll velocity
const ptr = { x: -1e5, y: -1e5, on: false };
addEventListener("pointermove", e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = e.pointerType !== "touch"; }, { passive: true });
document.addEventListener("pointerleave", () => (ptr.on = false));
let scrollVel = 0, lastY = scrollY;
onFrame((t, dt) => { const v = (scrollY - lastY) / Math.max(dt, .001); lastY = scrollY; scrollVel = lerp(scrollVel, v, .12); });

// boot: wait for fonts so type animation doesn't reflow
Promise.race([document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, 1400))]).then(() => document.body.classList.add("is-ready"));

// reveal on scroll
{
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .18, rootMargin: "0px 0px -6% 0px" });
  $$("[data-reveal]").forEach(el => { el.style.setProperty("--d", el.dataset.d || 0); io.observe(el); });
}

// split text into per-letter spans
function splitChars(el, text = el.textContent) {
  el.textContent = "";
  [...text].forEach(c => {
    const s = document.createElement("span");
    s.className = "ch";
    if (c === " ") { s.style.whiteSpace = "pre"; s.textContent = " "; } else s.textContent = c;
    el.appendChild(s);
  });
}

// letters swell and lift near the pointer; idle wave when nobody's around
function proximity(root, { radius = 240, gain = .45, lift = .1, idle = .3, color = null, base = null } = {}) {
  const chars = $$(".ch", root).map(el => ({ el, v: 0 }));
  const vis = visible(root, "0px");
  let tPrev = 0;
  onFrame((t) => {
    if (!vis.on) return;
    chars.forEach((c, i) => {
      let target = 0;
      if (ptr.on && FINE) {
        const r = c.el.getBoundingClientRect();
        const d = Math.hypot(ptr.x - (r.left + r.width / 2), ptr.y - (r.top + r.height / 2));
        target = smooth(clamp(1 - d / radius));
      }
      if (!RM) target = Math.max(target, (Math.sin(t * 1.5 - i * .6) * .5 + .5) * idle);
      c.v += (target - c.v) * .06;
      c.el.style.transform = `translateY(${(-c.v * lift).toFixed(3)}em) scale(${(1 + c.v * gain).toFixed(3)})`;
      if (color) c.el.style.color = rgb(mix(base, color, clamp(c.v * 1.4)));
    });
  });
}

// magnetic buttons
if (FINE && !RM) {
  const mags = $$(".magnetic");
  addEventListener("pointermove", e => {
    mags.forEach(el => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const near = Math.abs(dx) < r.width / 2 + 24 && Math.abs(dy) < r.height / 2 + 24;
      if (near) { el.style.transition = "transform .7s var(--ease)"; el.style.transform = `translate(${(dx * .1).toFixed(1)}px,${(dy * .14).toFixed(1)}px)`; el.dataset.m = 1; }
      else if (el.dataset.m) { el.style.transition = "transform 1s var(--ease)"; el.style.transform = ""; delete el.dataset.m; }
    });
  }, { passive: true });
}

/* ------------------------------ nav ------------------------------ */
{
  const nav = $("#nav"); let prev = scrollY;
  const upd = () => {
    const y = scrollY;
    nav.classList.toggle("solid", y > 40);
    nav.classList.toggle("hide", y > prev && y > 400);
    if (y < prev) nav.classList.remove("hide");
    prev = y;
  };
  addEventListener("scroll", upd, { passive: true }); upd();
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const t = $(a.getAttribute("href")); if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: RM ? "auto" : "smooth" });
  }));
}

/* ------------------------------ hero ------------------------------ */
{
  const hero = $("#hero"), cv = $("#ribbons"), ctx = cv.getContext("2d"), inner = $("#heroInner");
  const vis = visible(hero, "0px");
  let W = 0, H = 0;
  // Each ribbon = one spring-driven head + a history of where it's been.
  // The tail samples that history, so it always flows along the head's real (curvy) path.
  const N = 48, STRIDE = 6;   // slow heads → sample the history more sparsely so tails stay long
  const R = [
    { k: .028, d: .91, hue: 34, w: 7,   a: .95 },
    { k: .022, d: .92, hue: 18, w: 5.5, a: .75 },
    { k: .017, d: .93, hue: 352, w: 4.2, a: .55 },
  ].map(r => ({ ...r, h: { x: 0, y: 0, vx: 0, vy: 0 }, hist: [] }));
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R.forEach(r => { if (!r.hist.length) { r.h.x = W * .65; r.h.y = H * .4; r.hist = Array.from({ length: N * STRIDE }, () => ({ x: r.h.x, y: r.h.y })); } });
  };
  new ResizeObserver(resize).observe(hero); resize();

  // The pointer only *leans* on the ribbons: their own drift keeps going and the pointer's
  // pull (hp.w) fades in and out slowly, so nothing ever snaps to the cursor.
  const hp = { x: 0, y: 0, on: false, last: 0, w: 0 };
  hero.addEventListener("pointermove", e => { if (e.pointerType === "touch") return; const r = hero.getBoundingClientRect(); hp.x = e.clientX - r.left; hp.y = e.clientY - r.top; hp.on = true; hp.last = performance.now(); });
  hero.addEventListener("pointerleave", () => (hp.on = false));
  hero.addEventListener("pointerdown", e => {   // click = a gentle push
    const r = hero.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top;
    R.forEach(rb => { const dx = rb.h.x - cx, dy = rb.h.y - cy, d = Math.hypot(dx, dy) + 1; rb.h.vx += dx / d * 5; rb.h.vy += dy / d * 5; });
  });

  function target(t, i) {
    const wide = W >= 900;                                  // keep idle motion clear of the headline
    const cx = W * (wide ? .73 : .5), ax = W * (wide ? .17 : .34), ay = H * (wide ? .3 : .09);
    const idle = { x: cx + Math.sin(t * .55 + i * .5) * ax, y: H * (wide ? .44 : .2) + Math.sin(t * .83 + i * .5 + 1) * ay };
    if (hp.w < .001) return idle;
    const k = hp.w * .45;                                   // pointer has at most ~45% say
    return { x: lerp(idle.x, hp.x + Math.sin(t * .9 + i * 2) * 60 * i, k), y: lerp(idle.y, hp.y + Math.cos(t * 1.1 + i * 2) * 60 * i, k) };
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    R.forEach((r, ri) => {
      if (ri === 0) hp.w += (((hp.on && performance.now() - hp.last < 4000) ? 1 : 0) - hp.w) * .02;   // slow fade in / out
      const h = r.h, tg = target(t, ri);
      h.vx = (h.vx + (tg.x - h.x) * r.k) * r.d; h.vy = (h.vy + (tg.y - h.y) * r.k) * r.d;
      h.x += h.vx; h.y += h.vy;
      r.hist.pop(); r.hist.unshift({ x: h.x, y: h.y });
      for (let pass = 0; pass < 2; pass++) {
        let prev = r.hist[0];
        for (let j = 1; j < N; j++) {
          const p = r.hist[j * STRIDE], k = 1 - j / N;
          if (pass === 0) { ctx.strokeStyle = `hsla(${r.hue + j * .5},100%,58%,${(.05 + k * .12) * r.a})`; ctx.lineWidth = (1 + k * r.w) * 3.2; }
          else { ctx.strokeStyle = `hsla(${r.hue + j * .5},100%,${64 + k * 12}%,${(.08 + k * .8) * r.a})`; ctx.lineWidth = .6 + Math.pow(k, 1.4) * r.w; }
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke(); prev = p;
        }
      }
      if (ri === 0) { // energy spark on the lead ribbon
        const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 44);
        g.addColorStop(0, "rgba(255,244,205,.8)"); g.addColorStop(.2, "rgba(255,190,80,.35)"); g.addColorStop(1, "rgba(255,106,61,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, 44, 0, 6.283); ctx.fill();
      }
    });
  }
  if (RM) { for (let i = 0; i < 240; i++) draw(i * .016, .016); }
  else onFrame((t, dt) => { if (vis.on) draw(t, dt); });

  // hero copy drifts and fades as you leave
  const par = () => {
    const y = scrollY, h = hero.offsetHeight;
    if (y > h) return;
    inner.style.transform = `translateY(${y * .22}px)`;
    inner.style.opacity = clamp(1 - y / (h * .75));
  };
  addEventListener("scroll", par, { passive: true });

  // kinetic "sun."
  const sw = $("#sunword"); splitChars(sw);
  proximity(sw, { radius: 240, gain: .07, lift: .04, idle: .5 });

  // live card
  const kw = $("#liveKw"), line = $("#sparkLine"), fill = $("#sparkFill"), clock = $("#liveClock"), bat = $("#liveBat");
  const data = Array.from({ length: 30 }, (_, i) => 4.2 + Math.sin(i * .5) * .5 + (Math.random() - .5) * .3);
  const path = () => {
    const w = 260, h = 56, min = 3.2, max = 5.2;
    const pts = data.map((v, i) => [i / (data.length - 1) * w, h - 6 - (clamp((v - min) / (max - min))) * (h - 12)]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` Q${x0},${y0} ${mx},${(y0 + y1) / 2}`; }
    d += ` T${pts.at(-1)[0]},${pts.at(-1)[1]}`;
    line.setAttribute("d", d); fill.setAttribute("d", d + ` L${w},${h} L0,${h}Z`);
  };
  let shown = 4.2;
  const tick = () => {
    data.push(clamp(data.at(-1) + (Math.random() - .5) * .55, 3.4, 5.0)); data.shift(); path();
    tween(shown, data.at(-1), 900, v => { shown = v; kw.textContent = v.toFixed(1); });
    const d = new Date(); clock.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  tick(); setInterval(tick, 1600);
  // sparkline draw-on at load
  if (!RM) { line.style.strokeDasharray = 600; line.style.strokeDashoffset = 600; line.getBoundingClientRect(); line.style.transition = "stroke-dashoffset 2.2s .9s var(--ease)"; requestAnimationFrame(() => (line.style.strokeDashoffset = 0)); setTimeout(() => (line.style.strokeDasharray = ""), 3400); }
  void bat;
}

/* ------------------------------ marquee ------------------------------ */
{
  const root = $("#marquee"), vis = visible(root, "0px");
  const rows = $$(".mrow", root).map(el => ({ el, dir: +el.dataset.dir, x: 0, half: 0 }));
  const meas = () => rows.forEach(r => { r.half = r.el.scrollWidth / 2; if (r.dir > 0 && r.x === 0) r.x = -r.half; });
  new ResizeObserver(meas).observe(root); addEventListener("load", meas); meas();
  let skew = 0;
  onFrame((t, dt) => {
    if (!vis.on && !RM) return;
    if (RM) return;
    const boost = Math.abs(scrollVel) * .35;
    skew = lerp(skew, clamp(scrollVel * -.004, -9, 9), .1);
    rows.forEach(r => {
      r.x += r.dir * (70 + boost) * dt;
      if (r.dir < 0 && r.x <= -r.half) r.x += r.half;
      if (r.dir > 0 && r.x >= 0) r.x -= r.half;
      r.el.style.transform = `translateX(${r.x.toFixed(1)}px) skewX(${skew.toFixed(2)}deg)`;
    });
  });
}

/* ------------------------------ story ------------------------------ */
{
  const story = $("#day"), stage = $("#stage"), sun = $("#sun");
  const H0 = 5, H1 = 21.5;
  const STEPS = [
    { h: 5,    tag: "Pre-dawn",    when: "05:00 · Pre-dawn",  t: "Quiet before dawn.",           p: "The house runs on last night's sunshine, drawing nothing from the grid." },
    { h: 7.5,  tag: "Morning",     when: "07:30 · First light", t: "First light, first watts.",  p: "Panels wake up. Solace tops the battery before the day's demand begins." },
    { h: 12.5, tag: "Noon",        when: "12:30 · Peak sun",  t: "Noon: sell the surplus.",       p: "The roof makes three times what the house needs. The extra goes back to the grid at the day's best rate." },
    { h: 17.5, tag: "Dusk",        when: "17:30 · Golden hour", t: "Dusk: stored sun takes over.", p: "As tariffs peak, the battery steps in. The most expensive hours cost you nothing." },
    { h: 20.5, tag: "Night",       when: "20:30 · Night",     t: "Lights on. Bill near zero.",    p: "Tomorrow looks clear, so Solace keeps a small reserve and plans the morning." },
  ];
  STEPS.forEach(s => (s.p0 = (s.h - H0) / (H1 - H0)));

  // build captions
  const caps = $("#captions");
  const stepEls = STEPS.map(s => {
    const el = document.createElement("div"); el.className = "step";
    el.innerHTML = `<div class="when"><span>${s.when}</span></div><h3></h3><p>${s.p}</p>`;
    const h3 = $("h3", el);
    s.t.split(" ").forEach((w, i) => { const m = document.createElement("span"); m.className = "m"; m.innerHTML = `<span class="w" style="--i:${i}">${w}</span>`; h3.append(m, " "); });
    caps.appendChild(el); return el;
  });

  // timeline
  const tl = $("#timeline"), tlClock = $("#tlClock");
  const track = document.createElement("i"); track.className = "track"; tl.appendChild(track);
  const tlBtns = STEPS.map((s, i) => {
    const b = document.createElement("button"); b.textContent = s.tag; b.setAttribute("role", "tab");
    b.addEventListener("click", () => {
      const top = story.offsetTop + (s.p0 + .004) * (story.offsetHeight - innerHeight);
      scrollTo({ top, behavior: RM ? "auto" : "smooth" });
    });
    tl.appendChild(b); return b;
  });

  // stars
  const stars = $("#stars");
  for (let i = 0; i < 110; i++) {
    const s = document.createElement("i"), z = .5 + Math.random() * 1.5;
    s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;transform:scale(${z});animation-delay:${(Math.random() * 4).toFixed(2)}s;opacity:${.4 + Math.random() * .6}`;
    stars.appendChild(s);
  }

  // roof panel cells
  {
    const g = $("#cells"), NS = "http://www.w3.org/2000/svg";
    const L = y => 112 - (y - 54) / 70 * 66, Rr = y => 336 - (y - 54) / 70 * 30;
    [[60, 88], [93, 119]].forEach(([y0, y1]) => {
      const cols = 6;
      for (let c = 0; c < cols; c++) {
        const f0 = c / cols, f1 = (c + 1) / cols, gap = .012;
        const x = (y, f) => { const l = L(y) + 9, r = Rr(y) - 9; return l + (r - l) * f; };
        const pts = [[x(y0, f0 + gap), y0], [x(y0, f1 - gap), y0], [x(y1, f1 - gap), y1], [x(y1, f0 + gap), y1]];
        const p = document.createElementNS(NS, "polygon");
        p.setAttribute("points", pts.map(q => q.join(",")).join(" ")); p.setAttribute("class", "panelcell");
        p.setAttribute("stroke", "#ffffff33"); p.setAttribute("stroke-width", ".8"); g.appendChild(p);
      }
    });
  }

  // colour keyframes
  const SKY = [
    [5,    "#0a0e24", "#1d2350"], [6.3, "#2b2a66", "#ff8a5c"], [7.8, "#4d7fcf", "#f7c9a0"], [10, "#3f86d8", "#a9d4f5"],
    [13,   "#2a74e0", "#8ec9ff"], [16.5, "#3c6ed0", "#f2cf9c"], [18.7, "#5a3a86", "#ff7a4a"], [19.8, "#2a2058", "#a24a66"], [21.5, "#090d20", "#1b1f4a"],
  ];
  const sky = (h, k) => {
    if (h <= SKY[0][0]) return hex(SKY[0][k]);
    for (let i = 1; i < SKY.length; i++) if (h <= SKY[i][0]) { const a = SKY[i - 1], b = SKY[i]; return mix(a[k], b[k], smooth((h - a[0]) / (b[0] - a[0]))); }
    return hex(SKY.at(-1)[k]);
  };
  const pw = (pts, h) => { if (h <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (h <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return lerp(y0, y1, smooth((h - x0) / (x1 - x0))); } return pts.at(-1)[1]; };
  const BAT = [[5, 62], [6.3, 58], [7, 62], [9, 80], [11.5, 98], [12.5, 100], [16.5, 100], [17.5, 96], [19, 84], [21.5, 66]];
  const LOAD = [[5, .5], [7, 1.6], [8.5, 1.0], [12, .9], [15, 1.1], [18, 2.4], [19.5, 2.6], [21.5, 1.4]];
  const solar = h => { const x = (h - 6.2) / 13.4; return x <= 0 || x >= 1 ? 0 : Math.pow(Math.sin(Math.PI * x), 1.15) * 5.4; };
  // cumulative $ saved (numeric)
  const SAVE = []; { let c = 0; for (let h = 5; h <= 21.5001; h += .05) { c += solar(h) * .05 * .31 * .96; SAVE.push(c); } }
  const saved = h => SAVE[clamp(Math.round((h - 5) / .05), 0, SAVE.length - 1)];

  const el = {
    clock: $("#hudClock"), solar: $("#hudSolar"), home: $("#hudHome"), bat: $("#hudBat"), saved: $("#hudSaved"),
    bS: $("#barSolar"), bH: $("#barHome"), bB: $("#barBat"), batFill: $("#batFill"), house: $("#house"),
    hills: [$("#hill1"), $("#hill2"), $("#hill3")], captionsWrap: caps,
  };
  let W = 0, Hh = 0;
  const meas = () => { W = stage.clientWidth; Hh = stage.clientHeight; };
  new ResizeObserver(meas).observe(stage); meas();

  let active = -1, cur = -1, target = 0, last = {};
  const setText = (k, node, v) => { if (last[k] !== v) { node.textContent = v; last[k] = v; } };

  function render(p) {
    const h = H0 + p * (H1 - H0);
    const a = Math.PI * (h - 6.2) / 13.4, elev = Math.sin(a);
    const dl = smooth(clamp(elev * 3.2));               // 0 night → 1 full day
    const top = sky(h, 1), bot = sky(h, 2);
    const s = stage.style;
    s.setProperty("--sky-top", rgb(top)); s.setProperty("--sky-bot", rgb(bot));

    // sun position on an arc, colour by elevation
    const sx = W * (.5 - Math.cos(a) * .56), sy = Hh * .74 - elev * Hh * .58;
    sun.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) scale(${(1.15 - clamp(elev) * .35).toFixed(3)})`;
    const sc = mix("#ff6a3a", "#fff0b0", smooth(clamp(elev * 2.2)));
    s.setProperty("--sun-col", rgb(sc));
    s.setProperty("--gx", sx + "px"); s.setProperty("--gy", sy + "px");
    s.setProperty("--glow", (clamp(1 - Math.abs(elev) * 2) * clamp((elev + .35) / .3) * .85).toFixed(3));
    s.setProperty("--stars", (elev > 0 ? clamp(1 - elev * 5) : 1).toFixed(3));
    const cc = mix(bot, [255, 255, 255], .55);
    s.setProperty("--cloud", `rgb(${cc.map(Math.round).join(" ")} / ${(.08 + dl * .5).toFixed(2)})`);

    // hills: night blues → day greens, hazed toward the sky
    const H_N = ["#1b2350", "#131a3d", "#0b1029"], H_D = ["#6d9a72", "#4a8060", "#2f5f4a"];
    [0, 1, 2].forEach(i => {
      let c = mix(H_N[i], H_D[i], dl);
      c = mix(c, bot, [.28, .12, .04][i]);
      s.setProperty(`--h${i + 1}`, rgb(c));
    });
    s.setProperty("--house", rgb(mix(mix("#2b3054", "#f0e5d3", dl), bot, .1)));
    s.setProperty("--roof", rgb(mix("#1a1f3e", "#3d4568", dl)));
    // windows light up in the dark
    const lit = clamp(1 - dl * 1.6);
    s.setProperty("--lit", lit.toFixed(3));
    // roof panels catch the sun
    const sol = solar(h);
    s.setProperty("--shine", clamp(sol / 5.4).toFixed(3));
    hills(p);

    // HUD
    const load = pw(LOAD, h), bat = pw(BAT, h), sv = saved(h);
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    const ts = `${pad2(hh)}:${pad2(mm)}`;
    setText("clock", el.clock, ts); setText("tl", tlClock, ts);
    setText("solar", el.solar, sol.toFixed(1) + " kW"); setText("home", el.home, load.toFixed(1) + " kW");
    setText("bat", el.bat, Math.round(bat) + "%"); setText("saved", el.saved, "$" + sv.toFixed(2));
    el.bS.style.transform = `scaleX(${clamp(sol / 5.4)})`; el.bH.style.transform = `scaleX(${clamp(load / 3)})`; el.bB.style.transform = `scaleX(${bat / 100})`;
    const bh = 40 * bat / 100; el.batFill.setAttribute("y", 226 - bh); el.batFill.setAttribute("height", bh);
    tl.querySelector(".track").style.transform = `scaleX(${p})`;

    // active caption
    let idx = 0; STEPS.forEach((st, i) => { if (h >= st.h - .001) idx = i; });
    if (idx !== active) {
      active = idx;
      fitCaptions();
      stepEls.forEach((e, i) => { e.classList.toggle("on", i === idx); e.classList.toggle("gone", i < idx); });
      tlBtns.forEach((b, i) => { b.classList.toggle("on", i === idx); b.setAttribute("aria-selected", i === idx); });
    }
  }
  function fitCaptions() {           // card height follows the active step
    const s = stepEls[Math.max(0, active)], cs = getComputedStyle(caps);
    caps.style.height = (s.offsetHeight + parseFloat(getComputedStyle(s).top) + parseFloat(cs.paddingBottom)) + "px";
  }
  addEventListener("resize", () => fitCaptions());
  document.fonts && document.fonts.ready.then(fitCaptions);
  function hills(p) {
    el.hills[0].style.transform = `translateY(${(-p * 3).toFixed(2)}vh)`;
    el.hills[1].style.transform = `translateY(${(p * 1).toFixed(2)}vh)`;
    el.hills[2].style.transform = `translateY(${(p * 4).toFixed(2)}vh)`;
  }

  const vis = visible(story, "100px");
  const prog = () => { const r = story.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };
  target = prog(); cur = target; render(cur);
  onFrame(() => {
    if (!vis.on) return;
    target = prog();
    const d = target - cur;
    if (Math.abs(d) < .00035 && cur === target) return;
    cur = RM ? target : (Math.abs(d) < .0004 ? target : cur + d * .11);
    render(cur);
  });
  addEventListener("resize", () => render(cur));
}

/* ------------------------------ app panel ------------------------------ */
{
  const panel = $("#panel"), wrap = $("#phoneWrap");
  const toasts = $("#toasts");
  const toast = msg => {
    $$(".toast", toasts).forEach(o => { o.classList.remove("in"); o.classList.add("out"); setTimeout(() => o.remove(), 450); });
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; toasts.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("in")));
    setTimeout(() => { t.classList.remove("in"); t.classList.add("out"); setTimeout(() => t.remove(), 450); }, 2800);
  };

  // pointer tilt
  if (FINE && !RM) {
    let rx = 0, ry = 0, tx = 0, ty = 0, inside = false;
    wrap.addEventListener("pointermove", e => { const r = wrap.getBoundingClientRect(); ty = ((e.clientX - r.left) / r.width - .5) * 3; tx = -((e.clientY - r.top) / r.height - .5) * 2.4; inside = true; });
    wrap.addEventListener("pointerleave", () => { tx = ty = 0; inside = false; });
    const vis = visible(wrap, "0px");
    onFrame(() => { if (!vis.on) return; rx += (tx - rx) * .04; ry += (ty - ry) * .04; panel.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`; });
  }

  // state
  const BASE = .6;
  const use = $("#useNum"), fillBar = $("#loadFill");
  let shown = 2.4;
  const devs = $$(".dev", panel);
  const total = () => BASE + devs.reduce((s, d) => s + ($(".tg", d).checked ? +d.dataset.kw : 0), 0);
  const refresh = () => {
    const t = total();
    tween(shown, t, 700, v => { shown = v; use.textContent = v.toFixed(1); });
    fillBar.style.width = clamp(t / 10) * 100 + "%";
  };
  devs.forEach(d => {
    const tg = $(".tg", d), sm = $("small", d);
    tg.addEventListener("change", () => {
      d.classList.toggle("on", tg.checked);
      sm.textContent = tg.checked ? d.dataset.on : d.dataset.off;
      refresh();
      const name = $("b", d).textContent;
      toast(tg.checked ? `${name} on · ${d.dataset.kw} kW${+d.dataset.kw > 5 ? " — Solace will use surplus sun first" : ""}` : `${name} off`);
    });
  });
  refresh();

  // sync
  const sync = $("#sync"), syncLabel = $("#syncLabel");
  sync.addEventListener("click", () => {
    if (sync.dataset.state !== "idle") return;
    sync.dataset.state = "loading"; syncLabel.textContent = "Syncing with your inverter…";
    setTimeout(() => { sync.dataset.state = "done"; syncLabel.textContent = "Synced just now"; toast("All devices up to date"); }, 1400);
    setTimeout(() => (sync.dataset.state = "idle"), 3000);
  });

  // theme
  const theme = $("#theme");
  theme.addEventListener("click", () => { const on = panel.classList.toggle("dark"); theme.setAttribute("aria-pressed", on); });

  // mode
  const seg = $("#seg"), desc = $("#modeDesc");
  const MODES = [
    ["Eco", "Grid is the last resort. Big loads wait for surplus sun, even if it takes longer."],
    ["Balanced", "Sun first, grid second. Big loads move to the cheapest hours."],
    ["Backup", "Keeps the battery above 80% so you're covered if the grid drops."],
  ];
  const ring = $("#ringFg"), ringNum = $("#ringNum"), ringLbl = $("#ringLbl");
  let stormOn = false, bat = 62;
  const setRing = v => { ring.style.strokeDashoffset = 201 * (1 - v / 100); tween(bat, v, 1200, x => (ringNum.textContent = Math.round(x) + "%")); bat = v; };
  setRing(62);
  $$("button", seg).forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.i; seg.style.setProperty("--i", i);
    $$("button", seg).forEach(x => x.setAttribute("aria-checked", x === b));
    desc.classList.add("swap"); setTimeout(() => { desc.textContent = MODES[i][1]; desc.classList.remove("swap"); }, 220);
    toast(`${MODES[i][0]} mode`);
    if (!stormOn) setRing(i === 2 ? 82 : i === 0 ? 55 : 62);
  }));

  // hold to enable storm mode
  const storm = $("#storm"), sT = $("#stormTitle"), sS = $("#stormSub");
  let timer = null;
  const setStorm = on => {
    stormOn = on; storm.classList.toggle("on", on); storm.setAttribute("aria-pressed", on);
    sT.textContent = on ? "Storm mode on" : "Hold to enable Storm mode";
    sS.textContent = on ? "Battery reserved at 100% · tap to end" : "Reserves 100% battery for an outage";
    ringLbl.textContent = on ? "Reserved" : "Battery";
    setRing(on ? 100 : 62);
    toast(on ? "Storm mode on — battery reserved for 72 h" : "Storm mode ended");
  };
  const begin = e => { if (stormOn || (e.pointerType === "mouse" && e.button !== 0)) return; storm.classList.add("holding"); timer = setTimeout(() => { storm.classList.remove("holding"); timer = -1; setStorm(true); }, 1000); };
  const cancel = () => { if (timer > 0) clearTimeout(timer); storm.classList.remove("holding"); if (timer !== -1) timer = null; };
  storm.addEventListener("pointerdown", begin);
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => storm.addEventListener(ev, cancel));
  storm.addEventListener("click", e => {
    if (timer === -1) { timer = null; return; }         // click that ended a successful hold
    if (stormOn) setStorm(false);                         // tap to end
    else if (e.detail === 0) setStorm(true);              // keyboard: Enter / Space
  });
  storm.addEventListener("contextmenu", e => e.preventDefault());
}

/* ------------------------------ energy flow ------------------------------ */
{
  const stage = $("#fstage"), cv = $("#flowCanvas"), ctx = cv.getContext("2d");
  const vis = visible(stage, "0px");
  const SC = {
    midday:  { solar: 5.2, bat: -1.6, grid: -2.0, off: false, text: "Noon: the roof makes 3× what the house uses. Solace fills the battery first, then sells the rest at the day's best rate.",
               n: ["Roof at peak", "Base load + heat pump", "Charging from sun", "Exporting at $0.31/kWh"] },
    evening: { solar: .4, bat: 2.1, grid: 0, off: false, text: "Evening peak: the grid is at its priciest, so the battery covers the house and grid draw stays at zero.",
               n: ["Sun fading", "Cooking + EV top-up", "Covering the house", "Idle — peak rates"] },
    cloudy:  { solar: .8, bat: .3, grid: 1.0, off: false, text: "Heavy cloud cuts solar by 85%. Solace tops up from the grid only in cheap hours and leans on stored energy for the rest.",
               n: ["Heavy cloud", "Normal evening use", "Trickle support", "Importing at $0.11/kWh"] },
    outage:  { solar: 1.2, bat: .9, grid: 0, off: true, text: "Grid down at 2:14 am. Solace islands your home in under a second — panels and battery keep the essentials running.",
               n: ["Panels still working", "Essentials only", "Discharging", "Down — islanded"] },
  };
  let key = "midday";
  const NODE = { solar: [.16, .24], grid: [.84, .24], home: [.5, .5], bat: [.5, .82] };
  const COL = { solar: "#ffb23e", grid: "#8b7bff", bat: "#6ef3c5", out: "#ffb23e" };
  const edges = ["solar", "bat", "grid"].map(id => ({ id, f: SC.midday[id], acc: Math.random(), parts: [] }));
  let W = 0, H = 0, P = {};
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2); W = stage.clientWidth; H = stage.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const k in NODE) P[k] = [NODE[k][0] * W, NODE[k][1] * H];
    edges.forEach(e => {
      const a = P[e.id], b = P.home, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      let nx = dy / len, ny = -dx / len; if (ny > 0) { nx = -nx; ny = -ny; }
      const bow = e.id === "bat" ? 0 : len * .16;
      e.p0 = a; e.p1 = [mx + nx * bow, my + ny * bow]; e.p2 = b;
    });
  };
  new ResizeObserver(resize).observe(stage); resize();
  const bez = (e, t) => {
    const u = 1 - t;
    return [u * u * e.p0[0] + 2 * u * t * e.p1[0] + t * t * e.p2[0], u * u * e.p0[1] + 2 * u * t * e.p1[1] + t * t * e.p2[1],
            2 * u * (e.p1[0] - e.p0[0]) + 2 * t * (e.p2[0] - e.p1[0]), 2 * u * (e.p1[1] - e.p0[1]) + 2 * t * (e.p2[1] - e.p1[1])];
  };
  const posOf = (e, pt, time) => {
    const tau = pt.out ? 1 - pt.u : pt.u;
    const [x, y, dx, dy] = bez(e, tau), l = Math.hypot(dx, dy) || 1;
    const env = Math.sin(Math.PI * pt.u);
    const w = Math.sin(pt.u * 9 + pt.ph + time * 2.4) * pt.amp * env;
    let px = x + (-dy / l) * w, py = y + (dx / l) * w;
    if (ptr.on) {           // pointer nudges particles like a fluid
      const r = stage.getBoundingClientRect(), mx = ptr.x - r.left, my = ptr.y - r.top, ddx = px - mx, ddy = py - my, d = Math.hypot(ddx, ddy);
      if (d < 80 && d > 0) { const f = (1 - d / 80) ** 2 * 9; px += ddx / d * f; py += ddy / d * f; }
    }
    return [px, py];
  };

  // readouts
  const $v = { solar: $("#vSolar"), grid: $("#vGrid"), home: $("#vHome"), bat: $("#vBat"), lGrid: $("#lGrid"), lBat: $("#lBat") };
  const $r = { prod: $("#rProd"), cons: $("#rCons"), bat: $("#rBat"), grid: $("#rGrid"), pN: $("#rProdN"), cN: $("#rConsN"), bN: $("#rBatN"), gN: $("#rGridN") };
  const nGrid = $("#nGrid");
  const disp = { solar: 5.2, bat: -1.6, grid: -2.0 };
  const fmt = v => `${Math.abs(v).toFixed(1)}`;
  const unit = "<small>kW</small>";
  let lastLabels = "";
  function readouts() {
    const sc = SC[key], home = disp.solar + disp.bat + disp.grid;
    $v.solar.textContent = fmt(disp.solar) + " kW"; $v.home.textContent = fmt(home) + " kW";
    $v.bat.textContent = fmt(disp.bat) + " kW"; $v.grid.textContent = sc.off ? "— kW" : fmt(disp.grid) + " kW";
    $r.prod.innerHTML = fmt(disp.solar) + unit; $r.cons.innerHTML = fmt(home) + unit;
    $r.bat.innerHTML = fmt(disp.bat) + unit; $r.grid.innerHTML = (sc.off ? "0.0" : fmt(disp.grid)) + unit;
    const lb = sc.bat < 0 ? "Charging" : sc.bat > 0 ? "Discharging" : "Idle";
    const lg = sc.off ? "Offline" : sc.grid < 0 ? "Exporting" : sc.grid > 0 ? "Importing" : "Idle";
    if (lb + lg !== lastLabels) { lastLabels = lb + lg; $v.lBat.textContent = lb; $v.lGrid.textContent = lg; }
  }

  // scenario switching
  const tabs = $("#tabs"), pill = $(".pill", tabs), scen = $("#scenario");
  const placePill = () => { const b = $('[aria-selected="true"]', tabs); pill.style.width = b.offsetWidth + "px"; pill.style.transform = `translateX(${b.offsetLeft}px)`; };
  function setScenario(k, instant) {
    key = k; const sc = SC[k];
    $$("button", tabs).forEach(b => b.setAttribute("aria-selected", b.dataset.s === k));
    placePill();
    nGrid.classList.toggle("off", sc.off);
    const apply = () => { scen.textContent = sc.text; scen.classList.remove("swap"); $r.pN.textContent = sc.n[0]; $r.cN.textContent = sc.n[1]; $r.bN.textContent = sc.n[2]; $r.gN.textContent = sc.n[3]; };
    if (instant || RM) apply(); else { scen.classList.add("swap"); setTimeout(apply, 220); }
    if (RM) { disp.solar = sc.solar; disp.bat = sc.bat; disp.grid = sc.grid; edges.forEach(e => (e.f = sc[e.id])); warm(); draw(0); readouts(); }
  }
  $$("button", tabs).forEach(b => b.addEventListener("click", () => setScenario(b.dataset.s)));
  addEventListener("resize", placePill);
  document.fonts && document.fonts.ready.then(placePill);

  const spawn = (e, mag, sign) => e.parts.push({ u: 0, out: sign < 0, sp: .2 + Math.min(mag, 5) * .03, ph: Math.random() * 6.28, amp: 2 + Math.random() * 4, r: 1.6 + Math.random() * 1.6 });
  function sim(dt) {
    const sc = SC[key];
    ["solar", "bat", "grid"].forEach(id => { disp[id] += (sc[id] - disp[id]) * Math.min(1, dt * 3.2); });
    edges.forEach(e => {
      e.f += (sc[e.id] - e.f) * Math.min(1, dt * 2.4);
      const mag = Math.abs(e.f);
      if (mag > .04) { e.acc += dt * (.7 + mag * 2.6); while (e.acc >= 1) { e.acc -= 1; spawn(e, mag, e.f); } }
      e.parts.forEach(p => (p.u += dt * p.sp)); e.parts = e.parts.filter(p => p.u < 1);
    });
  }
  function warm() { for (let i = 0; i < 260; i++) sim(.033); }
  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    // rails
    edges.forEach(e => {
      const on = Math.abs(e.f) > .04, off = e.id === "grid" && SC[key].off;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = off ? "rgba(255,255,255,.10)" : `rgba(255,255,255,${on ? .1 : .05})`;
      ctx.lineWidth = 1.5; ctx.setLineDash(off ? [4, 6] : []);
      ctx.beginPath(); ctx.moveTo(...e.p0); ctx.quadraticCurveTo(...e.p1, ...e.p2); ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    edges.forEach(e => {
      e.parts.forEach(pt => {
        const a = Math.min(1, pt.u * 7, (1 - pt.u) * 7);
        const [x, y] = posOf(e, pt, time);
        const tail = posOf(e, { ...pt, u: Math.max(0, pt.u - .05) }, time);
        const col = pt.out ? COL.out : COL[e.id];
        ctx.strokeStyle = col; ctx.globalAlpha = a * .5; ctx.lineWidth = pt.r * 1.3;
        ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(x, y); ctx.stroke();
        ctx.globalAlpha = a * .18; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, pt.r * 3.4, 0, 6.283); ctx.fill();
        ctx.globalAlpha = a; ctx.fillStyle = "#fff6dd"; ctx.beginPath(); ctx.arc(x, y, pt.r, 0, 6.283); ctx.fill();
      });
    });
    ctx.globalAlpha = 1;
  }
  setScenario("midday", true); warm(); readouts();
  if (RM) { draw(0); }
  else onFrame((t, dt) => { if (!vis.on) return; sim(dt); draw(t); readouts(); });
}

/* ------------------------------ closing ------------------------------ */
{
  const big = $("#bigType");
  $$(".l", big).forEach(l => { splitChars(l, l.dataset.text); });
  const lines = $$(".l", big);
  proximity(lines[0], { radius: 320, gain: .04, lift: .025, idle: .3, color: [255, 200, 110], base: [244, 239, 230] });
  proximity(lines[1], { radius: 320, gain: .035, lift: .025, idle: .35, color: [255, 240, 190], base: [255, 178, 62] });

  const hz = $("#horizon"), sec = $("#get");
  onFrame(() => {
    const r = sec.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    const p = clamp((innerHeight - r.top) / (innerHeight + r.height * .4));
    hz.style.transform = `translateY(${((1 - p) * 34).toFixed(1)}vmin) scale(${(.9 + p * .18).toFixed(3)})`;
  });

  const form = $("#signup"), email = $("#email"), note = $("#formNote");
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (form.dataset.state !== "idle") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
      form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
      note.textContent = "Enter a valid email so we know where to send your scan."; email.focus(); return;
    }
    note.textContent = ""; form.dataset.state = "loading";
    setTimeout(() => { form.dataset.state = "done"; note.textContent = "You're on the list. Your roof scan lands in your inbox within a working day."; }, 1300);
    setTimeout(() => { form.dataset.state = "idle"; email.value = ""; }, 5200);
  });
}
})();
