// Numbers from the paper: Fig. 3 (decoded from the vector figure, it matches the plotted bars to 0.1),
// Table 1, Fig. 4 and the appendix tables. Each entry is [mean, std] over three seeds.
(() => {
  const TASKS = ["Lift", "Can", "Square", "Transport", "ToolHang"];
  const PGPG_DP = [[96.7, 1.2], [89.3, 4.6], [72.0, 7.2], [58.7, 6.1], [56.0, 8.7]];
  const RM = {
    "Diffusion Policy": {
      "Base policy": [[44.0, 7.2], [42.7, 1.2], [39.3, 3.1], [24.7, 4.6], [35.3, 4.6]],
      "Mixed BC": [[32.7, 5.0], [72.0, 3.5], [46.0, 3.5], [38.0, 7.2], [32.0, 2.0]],
      "Filtered BC": [[56.7, 6.1], [90.0, 7.2], [63.3, 5.0], [54.0, 10.0], [49.3, 1.2]],
      "DPPO": [[75.7, 4.1], [70.0, 4.5], [28.7, 3.2], [50.2, 7.4], null],
      "CPL_KL": [[96.7, 1.5], [87.3, 2.3], [71.3, 4.2], [42.0, 0.0], [29.3, 1.2]],
      "PGPG": PGPG_DP,
    },
    "Flow-matching policy": {
      "Base policy": [[47.3, 2.3], [42.7, 3.1], [47.3, 6.1], [32.0, 10.0], [48.0, 3.5]],
      "Mixed BC": [[18.7, 6.1], [64.7, 5.8], [35.3, 2.3], [31.3, 6.4], [4.7, 6.4]],
      "Filtered BC": [[52.0, 13.9], [92.0, 2.0], [60.0, 8.7], [75.3, 7.6], [8.0, 5.3]],
      "CPL_KL": [[99.3, 1.2], [92.7, 1.2], [74.7, 1.2], [64.0, 2.1], [35.3, 9.2]],
      "PGPG": [[95.3, 2.3], [92.0, 5.3], [68.0, 2.0], [76.7, 1.2], [51.3, 10.1]],
    },
  };
  const META = {
    "Base policy": { html: "Base policy", what: "the pretrained policy, before fine-tuning" },
    "Mixed BC": { html: "Mixed BC", what: "behavior cloning on the demos and all rollouts" },
    "Filtered BC": { html: "Filtered BC", priv: true, what: "behavior cloning on the demos and the rollouts the simulator marks successful" },
    "DPPO": { html: "DPPO", what: "PPO fine-tuning on the sparse task reward, same rollout budget" },
    "CPL_KL": { html: "CPL<sub>KL</sub>", priv: true, what: "CPL with labels from the benchmark's ground-truth reward" },
    "PGPG": { html: "PGPG" },
  };
  const LS = {
    "CLIP": [[36.0, 7.2], [62.0, 6.0], [58.0, 8.7], [21.3, 4.2], [30.7, 9.0]],
    "S3D": [[53.3, 3.1], [60.0, 3.5], [62.8, 4.6], [26.7, 4.2], [54.0, 8.7]],
    "Robometer": [[38.7, 8.1], [85.3, 3.1], [40.0, 3.5], [28.0, 6.9], [31.3, 6.1]],
    "PGPG": PGPG_DP,
  };
  const LIB = [
    ["T1", "soup, sauce in basket", "put both the alphabet soup and the tomato sauce in the basket", [18.0, 5.3], [37.3, 3.1], [64.7, 7.6]],
    ["T2", "cheese, butter in basket", "put both the cream cheese box and the butter in the basket", [58.0, 2.0], [76.7, 1.2], [94.7, 3.1]],
    ["T3", "stove, moka pot", "turn on the stove and put the moka pot on it", [80.0, 3.5], [76.7, 1.2], [87.3, 3.1]],
    ["T4", "bowl in drawer", "put the black bowl in the bottom drawer of the cabinet and close it", [86.7, 4.2], [96.0, 2.0], [100.0, 0.0]],
    ["T5", "two mugs, two plates", "put the white mug on the left plate and put the yellow and white mug on the right plate", [64.0, 5.3], [81.3, 1.2], [78.7, 1.2]],
    ["T6", "book in caddy", "pick up the book and place it in the back compartment of the caddy", [53.3, 8.1], [72.7, 4.2], [58.7, 1.2]],
    ["T7", "mug, pudding, plate", "put the white mug on the plate and put the chocolate pudding to the right of the plate", [63.3, 1.2], [78.7, 8.1], [84.7, 9.9]],
    ["T8", "soup, cheese in basket", "put both the alphabet soup and the cream cheese box in the basket", [40.0, 10.4], [62.0, 6.0], [84.0, 2.0]],
    ["T9", "two moka pots", "put both moka pots on the stove", [3.3, 3.1], [3.3, 3.1], [1.3, 1.2]],
    ["T10", "mug in microwave", "put the yellow and white mug in the microwave and close it", [38.7, 7.0], [63.3, 13.3], [66.7, 6.4]],
  ];
  const LIB_AVG = [[50.5, 2.0], [64.8, 2.8], [72.1, 1.1]];
  const LIB_GAIN = [21.5, 7.3];   // the paper's average gains of PGPG, from unrounded per-seed results
  const MT = [
    ["Temporal OT", [[20.7, 1.2], [58.7, 5.8], [62.7, 3.1], [36.7, 6.1], [32.0, 5.3]], [[82.0, 2.0], [72.0, 5.3], [51.3, 10.1], [43.3, 5.0], [41.3, 8.3]]],
    ["DTW", [[90.7, 3.1], [70.0, 5.3], [72.7, 1.2], [45.3, 11.0], [30.0, 8.7]], [[80.0, 5.3], [78.0, 7.2], [62.7, 7.0], [38.7, 2.3], [31.3, 7.0]]],
    ["ORCA", [[32.0, 2.0], [70.7, 5.0], [42.0, 3.5], [47.3, 4.6], [41.3, 3.1]], PGPG_DP],
  ];
  // Fig. 4b, 4c (Lift): label accuracy and retention against the threshold, and policy success
  const EPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const ACC = [72.3, 73.4, 74.8, 90.1, 93.4, 97.7, 97.9, 98.0, 98.3, 99.2];
  const RET = [100.0, 91.0, 82.8, 73.3, 59.6, 53.5, 50.3, 47.4, 43.4, 31.4];
  const SUC = [[0.1, 92.7, 4.2], [0.3, 96.0, 2.0], [0.6, 96.7, 1.2], [0.95, 62.7, 6.1]];
  // Fig. 4a: number of reference demonstrations
  const ND = { M: [1, 4, 10, 20, 40],
    lift: [[76.7, 9.5], [76.7, 4.2], [94.7, 1.2], [96.0, 2.0], [97.3, 2.3]],
    square: [[46.0, 9.2], [54.7, 7.0], [66.7, 6.4], [72.7, 4.2], [72.0, 7.2]] };
  const AB = [
    { tab: "Encoder", sub: "Visual encoder that ORCA runs on. R3M is best, VC-1 is competitive, and the general vision-language SigLIP2 is weaker.",
      cols: ["Encoder", "Lift", "Can", "Square"],
      rows: [["Base policy", [44.0, 7.2], [42.7, 1.2], [39.3, 3.1]], ["VC-1", [96.0, 4.0], [83.3, 4.6], [52.7, 3.1]],
        ["SigLIP2", [68.7, 7.0], [58.0, 8.7], [42.7, 7.0]], ["R3M (ours)", [96.7, 1.2], [89.3, 4.6], [72.0, 7.2], "ours"]] },
    { tab: "Max vs. mean", sub: "How the scores against the M references are combined. The mean asks a segment to match a blurred expert that does not exist; the max keeps every expert mode.",
      cols: ["Aggregation", "Lift", "Square"],
      rows: [["Mean", [90.7, 2.3], [52.7, 2.1]], ["Max (ours)", [96.7, 1.2], [72.0, 7.2], "ours"]] },
    { tab: "Rollouts", sub: "Number of autonomous rollouts. Fewer cost a little: Lift holds up down to 250, Square declines slowly.",
      cols: ["Rollouts", "Lift", "Square"],
      rows: [["500 (ours)", [96.7, 1.2], [72.0, 7.2], "ours"], ["375", [94.7, 3.2], [71.7, 2.5]], ["250", [96.0, 3.0], [69.7, 6.1]], ["125", [92.3, 4.5], [65.7, 3.1]]] },
    { tab: "Segment length", sub: "Square. Segments must be long enough to contain a meaningful sub-behavior; from L = 150 on, results are stable.",
      cols: ["Segment length L", "Square"],
      rows: [["100", [54.3, 7.6]], ["150", [71.3, 7.1]], ["200 (ours)", [72.0, 7.2], "ours"]] },
    { tab: "Demo budget", sub: "Fewer demonstrations in the fine-tuning set, with the references unchanged. Even with no demonstrations at all, PGPG improves Can and Square over the base policy.",
      cols: ["Demonstrations", "Lift", "Can", "Square"],
      rows: [["Base policy", [44.0, 7.2], [42.7, 1.2], [39.3, 3.1]], ["0 (rollouts only)", [32.7, 4.6], [64.7, 6.4], [51.3, 5.0]],
        ["40", [95.3, 1.2], [88.0, 4.0], [56.7, 6.1]], ["120 (ours)", [96.7, 1.2], [89.3, 4.6], [72.0, 7.2], "ours"]] },
  ];

  const $ = (id) => document.getElementById(id);
  const fmt = (v) => v.toFixed(1);
  const dcls = (d) => (Math.abs(d) < 0.05 ? "eq" : d > 0 ? "up" : "dn");
  const dtxt = (d) => (Math.abs(d) < 0.05 ? "±0.0" : (d > 0 ? "+" : "−") + Math.abs(d).toFixed(1));
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const pm = (c) => (c ? `${fmt(c[0])}<span class="pm">±${fmt(c[1])}</span>` : `<span class="pm">not run</span>`);

  // One row of paired bars: grey baseline on top, purple PGPG below. A missing baseline shows as "not run".
  function pairRow(label, base, ours, avg, gain = ours - base) {
    const r = document.createElement("div");
    r.className = "brow" + (avg ? " avg" : "");
    const bb = base == null ? `<span class="na">not run</span>` : `<div class="b base"><span>${fmt(base)}</span></div>`;
    r.innerHTML = `<div class="lab">${label}</div>
      <div class="track">${bb}<div class="b ours"><span>${fmt(ours)}</span></div></div>
      <div class="delta ${base == null ? "" : dcls(gain)}">${base == null ? "–" : dtxt(gain)}</div>`;
    return r;
  }
  // Bars grow once the block is on screen, and again whenever the data change.
  function grow(host) {
    const bars = host.querySelectorAll(".b");
    requestAnimationFrame(() => bars.forEach((b) => { b.style.width = `calc(${b.dataset.w}% * 0.86)`; }));
  }
  function setW(row, base, ours) {
    const bs = row.querySelectorAll(".b");
    let i = 0;
    if (base != null) bs[i++].dataset.w = base;
    bs[i].dataset.w = ours;
  }
  function whenVisible(host, fn) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { fn(); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(host);
  }
  function tabs(host, names, onPick, cls = "tab", start = 0) {
    host.innerHTML = "";
    const btns = names.map((n, i) => {
      const b = document.createElement("button");
      b.className = cls + (i === start ? " on" : "");
      b.innerHTML = typeof n === "string" ? n : n.html;
      if (n.title) b.title = n.title;
      b.onclick = () => { if (b.disabled) return; btns.forEach((t) => t.classList.remove("on")); b.classList.add("on"); onPick(i); };
      host.appendChild(b);
      return b;
    });
    return btns;
  }
  // Draw into host the first time it is visible, then immediately on every later change.
  function lazy(host, draw) {
    let seen = false;
    whenVisible(host, () => { seen = true; grow(host); });
    return (...a) => { draw(...a); if (seen) grow(host); };
  }

  // ---------- Robomimic, Fig. 3 ----------
  {
    const policies = Object.keys(RM);
    let pol = policies[0], cmp = "Base policy";
    const cmpNames = ["Base policy", "Mixed BC", "Filtered BC", "DPPO", "CPL_KL"];
    const host = $("rm-bars");
    const draw = lazy(host, () => {
      const P = RM[pol], B = P[cmp], O = P.PGPG;
      host.innerHTML = "";
      TASKS.forEach((t, i) => {
        const r = pairRow(t, B[i] && B[i][0], O[i][0]);
        setW(r, B[i] && B[i][0], O[i][0]);
        host.appendChild(r);
      });
      const idx = TASKS.map((_, i) => i).filter((i) => B[i]);
      const bm = mean(idx.map((i) => B[i][0])), om = mean(idx.map((i) => O[i][0]));
      const lab = idx.length === TASKS.length ? "Average" : `Average<small>${idx.length} tasks, no ToolHang</small>`;
      const r = pairRow(lab, bm, om, true);
      setW(r, bm, om);
      host.appendChild(r);
      const m = META[cmp];
      $("rm-key").innerHTML = m.html + (m.priv ? ' <span class="priv">&dagger;</span>' : "");
      $("rm-what").textContent = m.what;
    });
    const cmpBtns = tabs($("rm-cmp"), cmpNames.map((n) => ({ html: META[n].html + (META[n].priv ? '<span class="priv"> &dagger;</span>' : ""), title: META[n].what })),
      (i) => { cmp = cmpNames[i]; draw(); }, "");
    tabs($("rm-tabs"), policies, (i) => {
      pol = policies[i];
      const hasDPPO = !!RM[pol].DPPO;
      cmpBtns[3].disabled = !hasDPPO;
      cmpBtns[3].title = hasDPPO ? META.DPPO.what : "DPPO is applied to the diffusion policy only";
      if (!hasDPPO && cmp === "DPPO") { cmp = "Base policy"; cmpBtns.forEach((b, j) => b.classList.toggle("on", j === 0)); }
      draw();
    });
    draw();

    let rows = "";
    for (const [p, ms] of Object.entries(RM)) {
      rows += `<tr class="grp"><td colspan="7">${p}</td></tr>`;
      const best = TASKS.map((_, i) => Math.max(...Object.values(ms).map((v) => (v[i] ? v[i][0] : -1))));
      const avgs = Object.fromEntries(Object.entries(ms).map(([k, v]) => [k, v.every(Boolean) ? mean(v.map((c) => c[0])) : null]));
      const bestAvg = Math.max(...Object.values(avgs).filter((v) => v != null));
      for (const [k, v] of Object.entries(ms)) {
        const m = META[k];
        const cells = v.map((c, i) => `<td class="${c && c[0] === best[i] ? "best" : ""}">${pm(c)}</td>`).join("");
        const a = avgs[k] == null ? `${fmt(mean(v.filter(Boolean).map((c) => c[0])))}<span class="pm">4 tasks</span>` : fmt(avgs[k]);
        rows += `<tr class="${k === "PGPG" ? "ours" : ""}"><td>${m.html}${m.priv ? ' <span class="priv">&dagger;</span>' : ""}</td>${cells}<td class="${avgs[k] === bestAvg ? "best" : ""}">${a}</td></tr>`;
      }
    }
    $("rm-table").innerHTML = `<table><thead><tr><th>Method</th>${TASKS.map((t) => `<th>${t}</th>`).join("")}<th>Avg.</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="note" style="padding:0 12px 10px;margin:0">&dagger; privileged information: the simulator's success signal (Filtered BC) or the benchmark's ground-truth reward (CPL<sub>KL</sub>). Bold: best mean per column. DPPO was run with the diffusion policy on four tasks.</p>`;
  }

  // ---------- label sources ----------
  {
    const names = Object.keys(LS);
    const host = $("ls-bars");
    let view = 0;
    const draw = lazy(host, () => {
      host.innerHTML = "";
      const val = (k) => (view === 0 ? mean(LS[k].map((c) => c[0])) : LS[k][view - 1][0]);
      const bestOther = Math.max(...names.filter((n) => n !== "PGPG").map(val));
      names.forEach((n) => {
        const ours = n === "PGPG", v = val(n);
        const d = document.createElement("div");
        d.className = "brow" + (ours ? " avg" : "");
        d.innerHTML = `<div class="lab">${n}</div><div class="track"><div class="b ${ours ? "ours" : "base"}" style="top:7px" data-w="${v}"><span>${fmt(v)}</span></div></div>
          <div class="delta ${ours ? dcls(v - bestOther) : ""}">${ours ? dtxt(v - bestOther) : ""}</div>`;
        host.appendChild(d);
      });
    });
    tabs($("ls-tabs"), ["Average", ...TASKS], (i) => { view = i; draw(); });
    draw();
    const best = TASKS.map((_, i) => Math.max(...names.map((n) => LS[n][i][0])));
    const bestAvg = Math.max(...names.map((n) => mean(LS[n].map((c) => c[0]))));
    const body = names.map((n) => {
      const a = mean(LS[n].map((c) => c[0]));
      return `<tr class="${n === "PGPG" ? "ours" : ""}"><td>${n}</td>${LS[n].map((c, i) => `<td class="${c[0] === best[i] ? "best" : ""}">${pm(c)}</td>`).join("")}<td class="${a === bestAvg ? "best" : ""}">${fmt(a)}</td></tr>`;
    }).join("");
    $("ls-table").innerHTML = `<table><thead><tr><th>Label source</th>${TASKS.map((t) => `<th>${t}</th>`).join("")}<th>Avg.</th></tr></thead><tbody>${body}</tbody></table>`;
    $("ls-bars").insertAdjacentHTML("afterend", `<p class="muted" style="font-size:12.5px;margin:12px 0 0">Diffusion policy. The delta is PGPG's margin over the best other label source.</p>`);
  }

  // ---------- cost of a label ----------
  {
    const host = $("cost");
    whenVisible(host, () => host.querySelectorAll(".b").forEach((b) => { b.style.width = b.dataset.w + "%"; if (+b.dataset.w > 40) b.classList.add("in"); }));
  }

  // ---------- GR00T N1.7 on LIBERO-10 ----------
  {
    const host = $("vla-bars");
    let cmp = 0, sel = 0;
    const CMP = [{ html: "Pretrained", k: 3 }, { html: 'Filtered BC<span class="priv"> &dagger;</span>', k: 4, title: "uses the simulator's success signal to select rollouts" }];
    const draw = lazy(host, () => {
      host.innerHTML = "";
      LIB.forEach((t, i) => {
        const base = t[CMP[cmp].k][0], ours = t[5][0];
        const r = pairRow(`${t[0]}<small>${t[1]}</small>`, base, ours);
        r.classList.add("pick");
        if (i === sel) r.classList.add("sel");
        r.tabIndex = 0;
        r.setAttribute("role", "button");
        r.setAttribute("aria-label", `${t[0]}: ${t[2]}`);
        r.onclick = () => pick(i);
        r.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } };
        setW(r, base, ours);
        host.appendChild(r);
      });
      const r = pairRow("Average", LIB_AVG[cmp][0], LIB_AVG[2][0], true, LIB_GAIN[cmp]);
      setW(r, LIB_AVG[cmp][0], LIB_AVG[2][0]);
      host.appendChild(r);
      $("vla-key").innerHTML = CMP[cmp].html;
    });
    tabs($("vla-cmp"), CMP, (i) => { cmp = i; draw(); }, "");
    draw();

    const film = $("vt-film");
    film.innerHTML = [1, 2, 3, 4].map((f) => `<figure><img alt="" width="213" height="213" /><span class="t">${f}</span></figure>`).join("");
    const imgs = film.querySelectorAll("img");
    const nums = $("vt-nums");
    function pick(i) {
      sel = (i + LIB.length) % LIB.length;
      const t = LIB[sel];
      host.querySelectorAll(".brow.pick").forEach((r, j) => r.classList.toggle("sel", j === sel));
      $("vt-id").textContent = t[0];
      $("vt-instr").textContent = "“" + t[2].charAt(0).toUpperCase() + t[2].slice(1) + "”";
      imgs.forEach((im, f) => { im.src = `assets/libero/t${String(sel + 1).padStart(2, "0")}_${f + 1}.jpg`; im.alt = f === 3 ? `${t[0]} completed` : ""; });
      const rows = [["Pretrained", t[3]], ['Filtered BC <span class="priv">&dagger;</span>', t[4]], ["PGPG", t[5], "ours"]];
      nums.innerHTML = rows.map(([n, c, k]) => `<div class="tn ${k || ""}"><span>${n}</span><span class="bar"><i style="width:0"></i></span><span class="v">${fmt(c[0])}<span class="pm">±${fmt(c[1])}</span></span></div>`).join("");
      requestAnimationFrame(() => nums.querySelectorAll(".bar i").forEach((b, j) => { b.style.width = rows[j][1][0] + "%"; }));
    }
    $("vt-prev").onclick = () => pick(sel - 1);
    $("vt-next").onclick = () => pick(sel + 1);
    pick(0);
  }

  // ---------- evaluation rollouts from one initial state ----------
  // One successful episode per policy, all three from the same initial state (same eval seed and shard;
  // the first frames match): assets/rollouts/tNN_{base,fbc,pgpg}.mp4, with the first frame as poster.
  {
    const card = $("ro"), grid = $("ro-grid"), playBtn = $("ro-play");
    const RO = ["T3", "T4", "T5", "T6", "T7", "T8"].map((id) => LIB.find((t) => t[0] === id));
    const POL = [["base", "Pretrained", 3], ["fbc", 'Filtered BC <span class="priv">&dagger;</span>', 4], ["pgpg", "PGPG", 5]];
    grid.innerHTML = POL.map(([k, n]) => `<div class="ro-v${k === "pgpg" ? " ours" : ""}"><div class="ro-hd"><span>${n}</span><span class="v"></span></div>
      <div class="ro-frame"><video muted loop playsinline preload="none" width="512" height="256"></video></div></div>`).join("");
    const vids = [...grid.querySelectorAll("video")], vals = grid.querySelectorAll(".ro-hd .v");
    vids.forEach((v) => { v.muted = true; });
    // the videos play only while the card is on screen, and not on their own under reduced motion
    let playing = !matchMedia("(prefers-reduced-motion: reduce)").matches, inView = false;
    const run = () => vids.forEach((v) => (playing && inView ? v.play().catch(() => {}) : v.pause()));
    function restart() {
      vids.forEach((v) => { v.currentTime = 0; });
      run();
    }
    function setPlaying(p) {
      playing = p;
      playBtn.classList.toggle("on", p);
      playBtn.querySelector("span").textContent = p ? "Pause" : "Play";
      playBtn.querySelector("path").setAttribute("d", p ? "M6 5h4v14H6zM14 5h4v14h-4z" : "M7 5l12 7-12 7z");
      run();
    }
    function show(i) {
      const t = RO[i], f = `assets/rollouts/t${t[0].slice(1).padStart(2, "0")}`;
      $("ro-instr").textContent = "“" + t[2].charAt(0).toUpperCase() + t[2].slice(1) + "”";
      vids.forEach((v, j) => {
        v.poster = `${f}_${POL[j][0]}.jpg`;
        v.src = `${f}_${POL[j][0]}.mp4`;
        v.setAttribute("aria-label", `${["Pretrained", "Filtered BC", "PGPG"][j]}, ${t[0]}: ${t[2]}`);
      });
      vals.forEach((s, j) => { s.textContent = `${fmt(t[POL[j][2]][0])}% on ${t[0]}`; });
      restart();
    }
    tabs($("ro-tabs"), RO.map((t) => ({ html: `${t[0]} <small>${t[1]}</small>`, title: t[2] })), show);
    tabs($("ro-view"), ["Scene", "Scene + wrist"], (i) => card.classList.toggle("both", i === 1), "");
    playBtn.onclick = () => setPlaying(!playing);
    $("ro-restart").onclick = () => { setPlaying(true); restart(); };
    new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; run(); }, { threshold: 0.25 }).observe(card);
    show(0);
    setPlaying(playing);
  }

  // ---------- sequence-matching metric x marginal scoring, Table 1 ----------
  {
    const host = $("mt-bars");
    let view = 0;
    const draw = lazy(host, () => {
      host.innerHTML = "";
      MT.forEach(([n, a, b]) => {
        const base = view === 0 ? mean(a.map((c) => c[0])) : a[view - 1][0];
        const ours = view === 0 ? mean(b.map((c) => c[0])) : b[view - 1][0];
        const r = pairRow(n === "ORCA" ? `ORCA<small>+ MPS is PGPG</small>` : n, base, ours, n === "ORCA");
        setW(r, base, ours);
        host.appendChild(r);
      });
    });
    tabs($("mt-tabs"), ["Average", ...TASKS], (i) => { view = i; draw(); });
    draw();
  }

  // ---------- threshold: label accuracy, retention and success, Fig. 4b and 4c ----------
  {
    const host = $("eps-chart");
    const W = 460, H = 270, L = 40, R = 14, T = 14, B = 38;
    const X = (e) => L + (e / 1) * (W - L - R);
    const Y = (v) => T + (1 - (v - 0) / 100) * (H - T - B);
    const path = (xs, ys) => xs.map((x, i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(ys[i]).toFixed(1)}`).join(" ");
    const len = (xs, ys) => xs.slice(1).reduce((s, x, i) => s + Math.hypot(X(x) - X(xs[i]), Y(ys[i + 1]) - Y(ys[i])), 0);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Label accuracy, fraction of pairs kept, and policy success rate against the discrimination threshold">`;
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach((e) => {
      svg += `<line x1="${X(e)}" x2="${X(e)}" y1="${T}" y2="${H - B}" class="lc-grid"/><text x="${X(e)}" y="${H - B + 15}" class="lc-tick" text-anchor="middle">${e}</text>`;
    });
    [0, 25, 50, 75, 100].forEach((v) => {
      svg += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="lc-grid"/><text x="${L - 7}" y="${Y(v) + 3.5}" class="lc-tick" text-anchor="end">${v}</text>`;
    });
    svg += `<text x="${(L + W - R) / 2}" y="${H - 6}" class="lc-ax" text-anchor="middle">discrimination threshold <tspan font-style="italic">&#949;</tspan><tspan font-style="italic" font-size="8" dy="3">&#963;</tspan></text>
      <text transform="translate(11 ${(T + H - B) / 2}) rotate(-90)" class="lc-ax" text-anchor="middle">%</text>`;
    // success band and line
    const sx = SUC.map((s) => s[0]);
    const band = SUC.map((s) => `${X(s[0]).toFixed(1)} ${Y(s[1] + s[2]).toFixed(1)}`).join(" L") + " L" + SUC.slice().reverse().map((s) => `${X(s[0]).toFixed(1)} ${Y(s[1] - s[2]).toFixed(1)}`).join(" L");
    svg += `<path d="M${band} Z" fill="var(--brand)" opacity=".12"/>`;
    svg += `<path d="${path(EPS, ACC)}" class="lc-line lc-draw" style="--len:${len(EPS, ACC).toFixed(0)};stroke:var(--teal)"/>`;
    svg += `<path d="${path(EPS, RET)}" class="lc-line lc-draw dash" style="--len:${len(EPS, RET).toFixed(0)};stroke:var(--coral)"/>`;
    svg += `<path d="${path(sx, SUC.map((s) => s[1]))}" class="lc-line lc-draw" style="--len:${len(sx, SUC.map((s) => s[1])).toFixed(0)};stroke:var(--brand);stroke-width:2.6"/>`;
    EPS.forEach((e, i) => {
      svg += `<circle cx="${X(e)}" cy="${Y(ACC[i])}" r="3" fill="var(--teal)" stroke="#fff" stroke-width="1"/>`;
      svg += `<circle cx="${X(e)}" cy="${Y(RET[i])}" r="3" fill="var(--coral)" stroke="#fff" stroke-width="1"/>`;
    });
    SUC.forEach((s) => { svg += `<circle cx="${X(s[0])}" cy="${Y(s[1])}" r="${s[0] === 0.6 ? 6 : 4.5}" fill="var(--brand)" stroke="#fff" stroke-width="1.5"/>`; });
    svg += `<text x="${X(0.6)}" y="${Y(96.7) - 12}" class="lc-tick" text-anchor="middle" style="fill:var(--brand);font-weight:700">best</text>`;
    svg += `<g font-family="Inter, sans-serif" font-size="11.5">
      <text x="${X(0.02)}" y="${Y(63)}" fill="var(--teal)" font-weight="600">label accuracy</text>
      <text x="${X(0.47)}" y="${Y(44)}" fill="var(--coral)" font-weight="600">pairs kept</text>
      <text x="${X(0.63)}" y="${Y(62)}" fill="var(--brand)" font-weight="600">policy success</text></g>`;
    svg += `<line id="eps-cur" class="lc-cursor" x1="${X(0.6)}" x2="${X(0.6)}" y1="${T}" y2="${H - B}"/></svg>`;
    host.innerHTML = svg;
    whenVisible(host, () => host.classList.add("go"));

    const steps = [...EPS, 0.95];
    const inp = $("eps-in"), out = $("eps-out"), read = $("eps-read"), cur = $("eps-cur");
    function show() {
      const e = steps[+inp.value];
      const i = EPS.indexOf(e);
      const s = SUC.find((x) => x[0] === e);
      out.textContent = e.toFixed(e === 0.95 ? 2 : 1);
      cur.setAttribute("x1", X(e)); cur.setAttribute("x2", X(e));
      read.innerHTML = `<div><b style="color:var(--teal)">${i >= 0 ? fmt(ACC[i]) + "%" : "–"}</b><span>label accuracy</span></div>
        <div><b style="color:var(--coral)">${i >= 0 ? fmt(RET[i]) + "%" : "–"}</b><span>pairs kept</span></div>
        <div><b style="color:var(--brand)">${s ? fmt(s[1]) + "%" : "–"}</b><span>${s ? "policy success" : "success not measured"}</span></div>`;
    }
    inp.addEventListener("input", show);
    show();
  }

  // ---------- number of reference demonstrations, Fig. 4a ----------
  {
    const host = $("nd-cols");
    const grid = [25, 50, 75, 100].map((y) => `<div class="cols-grid" style="bottom:${y}%"><span>${y}</span></div>`).join("");
    // error bar spans mean ± std; positions are relative to the bar's own height
    const bar = (c, k) => `<div class="cbar ${k}" style="--h:${c[0]}%"><span class="cv" style="bottom:calc(${100 + (c[1] / c[0]) * 100}% + 3px)">${fmt(c[0])}</span>
      <span class="err" style="bottom:${(1 - c[1] / c[0]) * 100}%;height:${(2 * c[1] / c[0]) * 100}%;"></span></div>`;
    const cols = ND.M.map((m, i) => `<div class="cgrp">${bar(ND.lift[i], "l1")}${bar(ND.square[i], "l2")}</div>`).join("");
    host.className = "cols";
    host.innerHTML = `<div class="cols-plot">${grid}${cols}</div><div class="cols-labs">${ND.M.map((m) => `<div>${m}</div>`).join("")}</div>
      <div class="cols-x">reference demonstrations</div>`;
    whenVisible(host, () => host.classList.add("go"));
  }

  // ---------- more ablations ----------
  {
    const host = $("ab-table");
    function draw(i) {
      const a = AB[i];
      $("ab-sub").textContent = a.sub;
      const best = a.cols.slice(1).map((_, j) => Math.max(...a.rows.map((r) => r[j + 1][0])));
      const body = a.rows.map((r) => {
        const ours = r[r.length - 1] === "ours";
        const cells = r.slice(1, a.cols.length).map((c, j) => `<td class="${c[0] === best[j] ? "best" : ""}">${pm(c)}</td>`).join("");
        return `<tr class="${ours ? "ours" : ""}"><td>${r[0]}</td>${cells}</tr>`;
      }).join("");
      host.innerHTML = `<table class="mini"><thead><tr>${a.cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
    }
    tabs($("ab-tabs"), AB.map((a) => a.tab), draw);
    draw(0);
  }
})();
