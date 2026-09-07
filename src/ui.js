import {
  TRACKS,
  VEHICLES,
  DRIVERS,
  COLORS,
  ITEMS,
  vehicleStats,
} from "./data.js";
export const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const clock = (t) => {
  if (!Number.isFinite(t)) return "—";
  const m = Math.floor(t / 60),
    s = Math.floor(t % 60),
    ms = Math.floor((t % 1) * 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}<small>.${String(ms).padStart(3, "0")}</small>`;
};
export const plainTime = (t) =>
  Number.isFinite(t)
    ? `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, "0")}`
    : "—";
const arrow = '<span aria-hidden="true">↗</span>';
const select = (label, key, value, opts) =>
  `<label class="field"><span>${label}</span><select data-field="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
const range = (label, key, value, min, max, step = ".05", unit = "") =>
  `<label class="field range"><span>${label}<output>${Number(value).toFixed(step === "1" ? 0 : 2)}${unit}</output></span><input aria-label="${label}" type="range" data-field="${key}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
const check = (label, key, value) =>
  `<label class="check"><span>${label}</span><input type="checkbox" data-field="${key}" ${value ? "checked" : ""}><i></i></label>`;
const colors = (key, value) =>
  `<div class="swatches">${COLORS.map((c) => `<button data-action="color" data-key="${key}" data-value="${c}" aria-label="${key} ${c}" aria-pressed="${c === value}" class="swatch ${c === value ? "selected" : ""}" style="--swatch:${c}"></button>`).join("")}</div>`;
const keyLabel = (code) =>
  code
    ?.replace("Key", "")
    .replace("Arrow", "")
    .replace("Left", "")
    .replace("Right", "") || "—";
export class UI {
  constructor(app) {
    this.app = app;
    this.root = document.querySelector("#ui");
    this.previews = {};
    this.toastTimer = null;
    this.root.addEventListener("click", (e) => {
      const button = e.target.closest("[data-action]");
      if (button && !button.disabled)
        app.action(button.dataset.action, button.dataset);
    });
    this.root.addEventListener("change", (e) => {
      if (e.target.dataset.field)
        app.field(
          e.target.dataset.field,
          e.target.type === "checkbox" ? e.target.checked : e.target.value,
        );
    });
    this.root.addEventListener("input", (e) => {
      if (e.target.type === "range")
        e.target.previousElementSibling.querySelector("output").textContent =
          Number(e.target.value).toFixed(e.target.step === "1" ? 0 : 2);
    });
  }
  toast(text) {
    const t = document.querySelector("#toast");
    t.textContent = text;
    t.classList.add("visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove("visible"), 3200);
  }
  header(page) {
    const p = this.app.profile;
    return `<header class="topbar"><button class="logo" data-action="home" aria-label="APEX home">APEX<span>/</span><small>COASTLINE RACING</small></button><nav aria-label="Main navigation">${[
      ["home", "PLAY"],
      ["garage", "GARAGE"],
      ["driver", "DRIVER"],
      ["records", "RECORDS"],
    ]
      .map(
        ([key, label]) =>
          `<button data-action="${key}" class="${key === page ? "active" : ""}">${label}</button>`,
      )
      .join(
        "",
      )}</nav><div class="profile"><span class="online-dot"></span><span>LOCAL DRIVER<small>${escapeHTML(DRIVERS[p.driver].name.toUpperCase())}</small></span><button class="number-avatar" data-action="driver" aria-label="Customize driver">${p.number}</button><button class="settings-button" data-action="settings" aria-label="Settings">⚙</button></div></header>`;
  }
  footer() {
    return `<footer class="footer"><span><span class="status-dot"></span> ALL ROADS. ALL YOURS.</span><div><span><kbd>W A S D</kbd> DRIVE</span><span><kbd>SPACE</kbd> DRIFT</span><span><kbd>SHIFT</kbd> BOOST</span></div><button data-action="help">CONTROLS <span>↗</span></button></footer>`;
  }
  render() {
    const a = this.app,
      p = a.profile,
      page = a.page,
      v = VEHICLES.find((v) => v.id === p.vehicle),
      track = TRACKS[a.selectedTrack];
    document.body.dataset.page = page;
    if (page === "race") {
      this.root.innerHTML = this.hud();
      return;
    }
    if (page === "replay") {
      this.root.innerHTML = `<div class="replay-label"><span class="eyebrow">RACE REPLAY</span><h2>${track.name}</h2></div><div class="replay-controls"><button data-action="replay-toggle" class="secondary">${a.replayPaused ? "PLAY" : "PAUSE"}</button><input type="range" aria-label="Replay position" id="replay-scrub" min="0" max="${Math.max(0, a.race.samples.length - 1)}" value="${a.replayIndex}" data-field="replay"><button data-action="results" class="primary">BACK TO RESULTS</button></div>`;
      return;
    }
    if (page === "pause") {
      this.root.innerHTML =
        this.hud() +
        `<div class="modal-backdrop"><section class="dialog narrow"><span class="eyebrow">TAKE A BREATHER</span><h2>In the pits.</h2><p>Your race is paused.</p><button class="primary full" data-action="resume">RESUME RACE <span>→</span></button><button class="secondary full" data-action="restart">RESTART RACE</button><button class="text-button full" data-action="home">RETURN TO PADDOCK</button><div class="mini-help">ESC TO RESUME · R TO RESET ON TRACK</div></section></div>`;
      return;
    }
    if (page === "results") {
      this.root.innerHTML = this.results();
      return;
    }
    let content = "";
    if (page === "home")
      content = `<main class="home-content"><section class="hero-copy"><div class="eyebrow"><span class="orange-line"></span> FIND YOUR NEXT APEX</div><h1>GOOD LINES.<br><em>GREAT TIMES.</em></h1><p>Chase the coast. Own the corners.<br>A little rivalry goes a long way.</p><div class="hero-actions"><button class="primary" data-action="start">LET’S RACE <span>→</span></button><button class="round-button" data-action="setup" aria-label="Configure race">≡</button><span class="race-summary">${a.config.mode === "trial" ? "TIME TRIAL" : a.config.mode === "practice" ? "FREE DRIVE" : `${a.config.laps} LAPS · ${a.config.opponents + 1} RACERS`}<small>${a.config.weather.toUpperCase()} CONDITIONS</small></span></div></section><div class="kart-caption"><span class="eyebrow">YOUR CURRENT RIDE</span><h3>${v.name} <span>/${String(VEHICLES.indexOf(v) + 1).padStart(2, "0")}</span></h3><button data-action="garage">MAKE IT YOURS ${arrow}</button></div><section class="destinations"><div class="section-top"><span><b>CHOOSE YOUR ESCAPE</b><span class="muted"> / 03 ORIGINAL CIRCUITS</span></span><button data-action="setup">RACE SETUP ${arrow}</button></div><div class="track-list">${TRACKS.map((t, i) => `<button class="track-card ${i === a.selectedTrack ? "selected" : ""}" data-action="track" data-value="${i}"><div class="track-image" style="background-image:url('${this.previews[t.id] || ""}')"><span class="track-index">0${i + 1}</span><span class="track-selected">${i === a.selectedTrack ? "✓" : ""}</span></div><div class="track-info"><span class="track-region">${t.region}</span><h3>${t.name}<span>↗</span></h3><div class="track-meta"><span>${i === 0 ? "FLOWING" : i === 1 ? "TECHNICAL" : "HIGH SPEED"} <i>•</i> ${Math.round(a.tracks[i].length)} M</span><span class="difficulty" aria-label="Difficulty ${t.difficulty} of 5">${Array.from({ length: 5 }, (_, j) => `<i class="${j < t.difficulty ? "on" : ""}"></i>`).join("")}</span></div></div></button>`).join("")}</div></section></main>`;
    if (page === "garage") {
      const stats = vehicleStats(p);
      content = `<main class="workshop"><section class="workshop-panel"><span class="eyebrow">THE PADDOCK / VEHICLE STUDIO</span><h1>Your ride.<br><em>Your rules.</em></h1><div class="segmented">${VEHICLES.map((car) => `<button class="${p.vehicle === car.id ? "active" : ""}" data-action="vehicle" data-value="${car.id}">${car.name}</button>`).join("")}</div><div class="workshop-scroll"><div class="subheading">01 / FINISH & DETAILS</div>${colors("color", p.color)}<div class="form-grid">${select(
        "Paint finish",
        "finish",
        p.finish,
        [
          ["metallic", "Metallic clearcoat"],
          ["matte", "Matte finish"],
        ],
      )}${select("Rear aero", "spoiler", p.spoiler, [
        ["true", "RS rear wing"],
        ["false", "Clean tail"],
      ])}</div><div class="subheading">02 / PERFORMANCE TUNING</div>${range("Engine output", "tuning.engine", p.tuning.engine, 0.8, 1.25)}${range("Tire grip", "tuning.grip", p.tuning.grip, 0.8, 1.2)}${range("Downforce", "tuning.aero", p.tuning.aero, 0, 1)}${range("Steering ratio", "tuning.steering", p.tuning.steering, 0.7, 1.3)}<p class="fine-print">More power adds mass. More downforce trades top speed for cornering grip.</p><div class="subheading">03 / YOUR BUILDS</div><div class="preset-save"><input id="preset-name" maxlength="28" aria-label="Build name" placeholder="Name this build"><button class="secondary" data-action="save-preset">SAVE</button></div>${p.presets.length ? `<div class="preset-list">${p.presets.map((pr, i) => `<button data-action="load-preset" data-value="${i}">${escapeHTML(pr.name)} <span>LOAD ↗</span></button>`).join("")}</div>` : ""}<div class="button-row"><button class="text-button" data-action="export">EXPORT BUILD ↗</button><button class="text-button" data-action="import">IMPORT BUILD ↙</button></div></div></section><aside class="spec-sheet"><span class="eyebrow">${v.tag}</span><h2>${v.name}</h2><p>${v.text}</p><div class="spec-main"><strong>${Math.round(stats.maxSpeed * 3.6)}</strong><span>KM/H<br>DESIGN LIMIT</span></div><div class="spec-bars">${[
        ["POWER", stats.power / 24],
        ["GRIP", stats.grip / 14],
        ["BRAKING", stats.brake / 35],
      ]
        .map(
          ([name, n]) =>
            `<div><span>${name}</span><i><b style="width:${Math.min(100, n * 100)}%"></b></i></div>`,
        )
        .join(
          "",
        )}</div><div class="spec-small"><span>${Math.round(stats.mass)}<small>KG</small></span><span>${v.drive}<small>DRIVETRAIN</small></span></div><button class="primary full" data-action="test-drive">TEST DRIVE <span>→</span></button></aside></main>`;
    }
    if (page === "driver")
      content = `<main class="workshop"><section class="workshop-panel"><span class="eyebrow">THE PADDOCK / DRIVER STUDIO</span><h1>Leave your<br><em>signature.</em></h1><div class="workshop-scroll"><div class="subheading">01 / MEET YOUR DRIVER</div>${DRIVERS.map((d, i) => `<button class="driver-card ${p.driver === i ? "selected" : ""}" data-action="select-driver" data-value="${i}"><span class="driver-number" style="--driver:${d.helmet}">${d.number}</span><span><b>${d.name}</b><small>${d.title}</small></span><span class="driver-check">${p.driver === i ? "✓" : "↗"}</span></button>`).join("")}<div class="subheading">02 / PERSONAL COLORS</div><label class="field"><span>Helmet</span></label>${colors("helmet", p.helmet)}<label class="field"><span>Racing suit</span></label>${colors("suit", p.suit)}<label class="field number-field"><span>Racing number</span><input type="text" maxlength="2" inputmode="numeric" pattern="[0-9]{1,2}" value="${p.number}" data-field="number" aria-label="Racing number"></label></div></section><aside class="driver-caption"><span class="eyebrow">${DRIVERS[p.driver].title}</span><h2>${DRIVERS[p.driver].name}</h2><p>${DRIVERS[p.driver].bio}</p><span class="balanced-note">EQUAL PERFORMANCE. INDIVIDUAL STYLE.</span></aside></main>`;
    if (page === "records")
      content = `<main class="records-page"><span class="eyebrow">EVERY LAP TELLS A STORY</span><h1>Your racing <em>record.</em></h1><div class="record-stats"><div><strong>${p.races}</strong><span>RACES FINISHED</span></div><div><strong>${p.wins}</strong><span>RACE WINS</span></div><div><strong>${(p.distance / 1000).toFixed(1)}</strong><span>KILOMETERS RACED</span></div></div><section class="record-table"><div class="section-top"><b>PERSONAL BEST LAPS</b><span class="muted">BY TRACK, WEATHER & VEHICLE</span></div>${
        Object.keys(p.records).length
          ? Object.entries(p.records)
              .map(
                ([key, t]) =>
                  `<div class="record-row"><span>${TRACKS.find((t) => key.startsWith(t.id))?.name || key}<small>${key.split("-").slice(1).join(" / ").toUpperCase()}</small></span><strong>${clock(t)}</strong></div>`,
              )
              .join("")
          : `<div class="empty-record"><h3>A clean timing sheet.</h3><p>Finish your first race to set a lap record.</p><button class="primary" data-action="start">SET YOUR FIRST TIME <span>→</span></button></div>`
      }</section><div class="achievement-list">${[
        [p.races >= 1, "FIRST FINISH", "Complete a race"],
        [p.wins >= 1, "TOP STEP", "Win a race"],
        [p.distance >= 10000, "COASTAL REGULAR", "Race 10 kilometers"],
      ]
        .map(
          ([yes, n, desc]) =>
            `<div class="achievement ${yes ? "unlocked" : ""}"><span>${yes ? "✓" : "○"}</span><b>${n}<small>${desc}</small></b></div>`,
        )
        .join("")}</div></main>`;
    if (page === "setup")
      content = `<div class="modal-backdrop setup-backdrop"><section class="dialog setup"><button class="close" data-action="home" aria-label="Close race setup">×</button><span class="eyebrow">MAKE IT YOUR RACE</span><h2>The starting line.</h2><p>${track.name} / ${track.description}</p><div class="form-grid">${select(
        "Race mode",
        "config.mode",
        a.config.mode,
        [
          ["quick", "Quick Race"],
          ["custom", "Custom Race"],
          ["trial", "Time Trial"],
          ["practice", "Practice / Free Drive"],
        ],
      )}${select(
        "Circuit",
        "selectedTrack",
        a.selectedTrack,
        TRACKS.map((t, i) => [i, t.name]),
      )}${select("Laps", "config.laps", a.config.laps, [
        [1, "1 lap"],
        [3, "3 laps"],
        [5, "5 laps"],
        [10, "10 laps"],
      ])}${select("AI opponents", "config.opponents", a.config.opponents, [
        [0, "Solo"],
        [3, "3 opponents"],
        [5, "5 opponents"],
        [7, "7 opponents"],
      ])}${select("AI difficulty", "config.difficulty", a.config.difficulty, [
        [0, "Rookie"],
        [1, "Club"],
        [2, "Expert"],
      ])}${select("Weather", "config.weather", a.config.weather, [
        ["clear", "Clear skies"],
        ["rain", "Rain / reduced grip"],
        ["fog", "Coastal fog"],
      ])}</div><div class="settings-checks">${check("Power-ups", "config.items", a.config.items)}${check("Vehicle collisions", "config.collisions", a.config.collisions)}${check("Performance damage", "config.damage", a.config.damage)}</div><p class="fine-print">Time Trial runs solo without items or collisions. Practice has unlimited laps.</p><button class="primary full" data-action="start">START YOUR ENGINES <span>→</span></button></section></div>`;
    if (page === "settings") content = this.settings();
    if (page === "help")
      content = `<div class="modal-backdrop"><section class="dialog help"><button class="close" data-action="home" aria-label="Close controls">×</button><span class="eyebrow">QUICK DRIVER BRIEFING</span><h2>Find your flow.</h2><div class="help-controls">${Object.entries(
        p.settings.bindings,
      )
        .map(
          ([action, key]) =>
            `<div><span>${action.toUpperCase()}</span><kbd>${keyLabel(key)}</kbd></div>`,
        )
        .join(
          "",
        )}</div><p>Hold drift while steering into a corner. Counter-steer to control the slide, then release to earn a boost. Golden diamonds grant an item; green strips give a speed burst.</p><p>Gamepad: left stick steers, triggers accelerate/brake, A drifts, B boosts, X uses an item, Y changes camera, Start pauses.</p><p class="fine-print">Reset returns you to your last checkpoint with a 2-second penalty. Key bindings can be changed in Settings.</p><button class="primary full" data-action="home">GOT IT <span>→</span></button></section></div>`;
    this.root.innerHTML = this.header(page) + content + this.footer();
  }
  settings() {
    const s = this.app.profile.settings;
    return `<div class="modal-backdrop"><section class="dialog settings"><button class="close" data-action="home" aria-label="Close settings">×</button><span class="eyebrow">DIAL IT IN</span><h2>Your comfort zone.</h2><div class="settings-scroll"><div class="subheading">DISPLAY & CAMERA</div><div class="form-grid">${select(
      "Graphics quality",
      "settings.quality",
      s.quality,
      [
        ["low", "Low"],
        ["medium", "Medium"],
        ["high", "High"],
        ["ultra", "Ultra"],
      ],
    )}${select("Race camera", "settings.camera", s.camera, [
      [0, "Chase"],
      [1, "Cockpit"],
      [2, "Hood"],
      [3, "Cinematic"],
    ])}</div>${check("Reduced ambient motion & particles", "settings.reducedMotion", s.reducedMotion)}${check("Steering assist", "settings.assist", s.assist)}<div class="subheading">AUDIO MIX</div>${range("Engine", "settings.engine", s.engine, 0, 1)}${range("Effects", "settings.effects", s.effects, 0, 1)}${range("Music", "settings.music", s.music, 0, 1)}<div class="subheading">CONTROLS</div>${range("Steering sensitivity", "settings.sensitivity", s.sensitivity, 0.5, 1.5)}${range("Gamepad dead zone", "settings.deadzone", s.deadzone, 0.02, 0.4, ".01")}<div class="binding-grid">${Object.entries(
      s.bindings,
    )
      .map(
        ([action, key]) =>
          `<button class="binding" data-action="rebind" data-value="${action}"><span>${action.toUpperCase()}</span><kbd>${keyLabel(key)}</kbd></button>`,
      )
      .join(
        "",
      )}</div><p class="fine-print">Click a binding, then press a key. Keyboard arrows also work. Gamepads use the browser’s standard mapping.</p></div><button class="primary full" data-action="home">SAVE & RETURN <span>→</span></button></section></div>`;
  }
  hud() {
    const p = this.app.profile;
    return `<main class="hud"><div class="hud-top"><div class="position"><strong id="position">1</strong><span>POSITION<small id="racers">/ 6</small></span></div><div class="lap"><span>LAP</span><strong id="lap">1 <small>/ 3</small></strong></div><div class="timing"><span>RACE TIME</span><strong id="time">00:00<small>.000</small></strong><div>BEST LAP <b id="best-lap">—</b></div></div><button class="pause-icon" data-action="pause" aria-label="Pause race">Ⅱ</button></div><div id="countdown" class="countdown"></div><div id="race-message" class="race-message"></div><div class="hud-bottom"><div class="map-panel"><canvas id="minimap" width="230" height="170" aria-label="Track map and racer positions"></canvas><span>${TRACKS[this.app.selectedTrack].name.toUpperCase()}</span></div><div class="race-controls"><span><kbd>${keyLabel(p.settings.bindings.drift)}</kbd> DRIFT</span><span><kbd>${keyLabel(p.settings.bindings.boost)}</kbd> BOOST</span><span><kbd>${keyLabel(p.settings.bindings.camera)}</kbd> CAMERA</span></div><div class="telemetry"><div class="item-slot" id="item-slot"><span id="item-name">NO ITEM</span><kbd>${keyLabel(p.settings.bindings.item)}</kbd></div><div class="speed-main"><span class="gear" id="gear">1<small>GEAR</small></span><strong id="speed">000</strong><span class="speed-unit">KM/H</span></div><div class="rpm"><i id="rpm-fill"></i></div><div class="boost-label"><span>SURGE RESERVE</span><b id="boost-text">65%</b></div><div class="boost-bar"><i id="boost-fill"></i></div><span class="drift-label" id="drift-label">HOLD THE LINE</span></div></div><div class="touch-controls"><div><button data-touch="left" aria-label="Steer left">◀</button><button data-touch="right" aria-label="Steer right">▶</button></div><div><button data-touch="drift">DRIFT</button><button data-touch="brake">BRAKE</button><button data-touch="throttle">GO</button><button data-touch="boost">BOOST</button><button data-action="item">ITEM</button></div></div></main>`;
  }
  updateHUD() {
    const a = this.app,
      r = a.race,
      k = r.player,
      $ = (id) => document.getElementById(id);
    if (!$("speed")) return;
    $("position").textContent = r.position;
    $("racers").textContent = `/ ${r.karts.length}`;
    $("lap").innerHTML =
      `${Math.min(k.laps + 1, r.config.laps)} <small>/ ${r.config.mode === "practice" ? "∞" : r.config.laps}</small>`;
    $("time").innerHTML = clock(r.time);
    $("best-lap").textContent = k.lapTimes.length
      ? plainTime(Math.min(...k.lapTimes))
      : "—";
    $("speed").textContent = String(
      Math.round(Math.abs(k.speed) * 3.6),
    ).padStart(3, "0");
    const gear =
      k.speed < -0.1 ? "R" : Math.min(6, Math.floor(Math.abs(k.speed) / 8) + 1);
    $("gear").innerHTML = `${gear}<small>GEAR</small>`;
    $("rpm-fill").style.width = `${25 + ((Math.abs(k.speed) % 8) / 8) * 75}%`;
    $("boost-fill").style.width = `${k.boost}%`;
    $("boost-text").textContent = `${Math.round(k.boost)}%`;
    $("drift-label").textContent = k.drifting
      ? `${k.driftCharge > 1.5 ? "SUPER " : ""}DRIFT CHARGING ${"›".repeat(Math.floor(k.driftCharge) + 1)}`
      : k.boostTime > 0
        ? "SURGE ACTIVE"
        : k.shield > 0
          ? "HALO PROTECTION"
          : r.config.damage
            ? `CONDITION ${Math.round(100 - k.damage)}%`
            : "HOLD THE LINE";
    $("drift-label").classList.toggle("charged", k.drifting || k.boostTime > 0);
    $("item-name").textContent = k.item
      ? ITEMS[k.item].name.toUpperCase()
      : "NO ITEM";
    $("item-slot").classList.toggle("loaded", !!k.item);
    $("countdown").textContent =
      r.countdown > 0.6
        ? Math.ceil(r.countdown - 0.6)
        : r.time < 0.7
          ? "GO"
          : "";
    $("race-message").textContent =
      k.wrongWay > 1
        ? "WRONG WAY"
        : k.slow > 0
          ? "PULSE HIT · REDUCED POWER"
          : "";
    this.drawMap();
  }
  drawMap() {
    const c = document.querySelector("#minimap");
    if (!c) return;
    const ctx = c.getContext("2d"),
      r = this.app.race,
      pts = r.track.points;
    const xs = pts.map((p) => p.x),
      zs = pts.map((p) => p.z),
      minx = Math.min(...xs),
      minz = Math.min(...zs),
      dx = Math.max(...xs) - minx,
      dz = Math.max(...zs) - minz,
      scale = Math.min(190 / dx, 135 / dz);
    const map = (p) => [20 + (p.x - minx) * scale, 15 + (p.z - minz) * scale];
    ctx.clearRect(0, 0, 230, 170);
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = map(p);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "#ffffff30";
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = "#ffffff70";
    ctx.lineWidth = 2;
    ctx.stroke();
    for (const k of [...r.karts].reverse()) {
      const [x, y] = map(k);
      ctx.beginPath();
      ctx.arc(x, y, k.id ? 3.3 : 5, 0, Math.PI * 2);
      ctx.fillStyle = k.id ? "#dedfcf" : "#ff784b";
      ctx.fill();
      if (!k.id) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }
  results() {
    const a = this.app,
      r = a.race,
      k = r.player;
    return `<div class="results-backdrop"><main class="results"><span class="eyebrow">${TRACKS[a.selectedTrack].name.toUpperCase()} / RACE COMPLETE</span><div class="results-title"><h1>${r.finishPosition === 1 ? "A view from<br><em>the top.</em>" : "What<br><em>a ride.</em>"}</h1><div class="finish-number">${String(r.finishPosition).padStart(2, "0")}<span>FINISH POSITION</span></div></div><div class="results-metrics"><div><span>TOTAL TIME</span><strong>${clock(k.finishTime)}</strong></div><div><span>BEST LAP</span><strong>${clock(Math.min(...k.lapTimes))}</strong></div><div><span>DISTANCE</span><strong>${(k.distance / 1000).toFixed(2)}<small> KM</small></strong></div></div><div class="result-table">${r.ordered.map((kart, i) => `<div class="${kart.id === 0 ? "you" : ""}"><span>${String(i + 1).padStart(2, "0")}</span><b>${kart.id === 0 ? DRIVERS[a.profile.driver].name : ["Remi Cross", "Sora Vale", "Nico Flint", "Kit Moreno", "Ash Calder", "Eli Hart", "Toni Ray"][kart.id - 1]} ${kart.id === 0 ? "<small>YOU</small>" : ""}</b><span>${kart.finished ? plainTime(kart.finishTime) : `${Math.min(kart.laps + 1, r.config.laps)} / ${r.config.laps} LAPS · RACING`}</span></div>`).join("")}</div><div class="button-row"><button class="primary" data-action="restart">RACE AGAIN <span>→</span></button><button class="secondary" data-action="replay">WATCH REPLAY ↗</button><button class="text-button" data-action="home">BACK TO PADDOCK</button></div></main></div>`;
  }
}
