import "./style.css";
import { TRACKS, VEHICLES, DRIVERS, DEFAULT_PROFILE } from "./data.js";
import { Track, angleDelta } from "./track.js";
import { Race } from "./race.js";
import { Graphics } from "./graphics.js";
import { Input } from "./input.js";
import { AudioSystem } from "./audio.js";
import { UI, plainTime } from "./ui.js";
import {
  loadProfile,
  saveProfile,
  buildPreset,
  importPreset,
} from "./persistence.js";
class App {
  constructor() {
    this.profile = loadProfile();
    this.page = "home";
    this.selectedTrack = 0;
    this.config = {
      mode: "quick",
      laps: 3,
      opponents: 5,
      difficulty: 1,
      weather: "clear",
      items: true,
      collisions: true,
      damage: false,
    };
    this.tracks = TRACKS.map((t) => new Track(t));
    this.race = null;
    this.ui = new UI(this);
    this.graphics = new Graphics(
      document.querySelector("#world"),
      this.profile.settings,
    );
    this.audio = new AudioSystem(this.profile.settings);
    this.input = new Input(this.profile.settings, (action) =>
      this.action(action),
    );
    this.replayIndex = 0;
    this.replayClock = 0;
    this.replayPaused = false;
    this.previous = performance.now();
    this.lastHud = 0;
    this.countBeep = -1;
    this.saveWarning = false;
    this.makePreviews();
    this.showWorld();
    this.ui.render();
    this.bindTouch();
    this.graphics.renderer.setAnimationLoop((now) => this.frame(now));
    window.addEventListener("beforeunload", () => this.save());
    document.querySelector("#loading").classList.add("done");
    setTimeout(() => document.querySelector("#loading")?.remove(), 600);
    // Read-only telemetry for diagnostics. No gameplay bypasses in the shipped build.
    window.apex = {
      get state() {
        return {
          page: app.page,
          track: TRACKS[app.selectedTrack].id,
          race: app.race
            ? {
                state: app.race.state,
                time: app.race.time,
                lap: app.race.player.laps,
                speed: app.race.player.speed,
                position: app.race.position,
                x: app.race.player.x,
                z: app.race.player.z,
                heading: app.race.player.heading,
                t: app.race.player.t,
                checkpoint: app.race.player.checkpoint,
                boost: app.race.player.boost,
                item: app.race.player.item,
              }
            : null,
          render: app.graphics.renderer.info.render,
        };
      },
    };
  }
  save() {
    if (!saveProfile(this.profile) && !this.saveWarning) {
      this.ui.toast(
        "Browser storage is unavailable. Export your build to keep it.",
      );
      this.saveWarning = true;
    }
  }
  makePreviews() {
    for (const t of this.tracks) {
      this.graphics.buildWorld(t);
      const p = t.at(0.12);
      this.graphics.camera.position.set(p.x + 65, p.y + 45, p.z + 80);
      this.graphics.camera.lookAt(p.x, p.y, p.z);
      this.graphics.camera.fov = 47;
      this.graphics.camera.updateProjectionMatrix();
      this.graphics.renderer.render(this.graphics.scene, this.graphics.camera);
      const c = document.createElement("canvas");
      c.width = 400;
      c.height = 280;
      const ctx = c.getContext("2d"),
        source = this.graphics.renderer.domElement;
      const crop = source.height * 1.43;
      ctx.drawImage(
        source,
        (source.width - crop) / 2,
        0,
        crop,
        source.height,
        0,
        0,
        400,
        280,
      );
      // Overlay the entire centerline so every destination is recognizable.
      ctx.fillStyle = "rgba(10,23,30,.36)";
      ctx.fillRect(0, 0, 400, 280);
      const b = t.bounds,
        scale = Math.min(310 / (b.maxX - b.minX), 185 / (b.maxZ - b.minZ));
      const offsetX = (400 - (b.maxX - b.minX) * scale) / 2,
        offsetZ = (280 - (b.maxZ - b.minZ) * scale) / 2;
      ctx.beginPath();
      t.points.forEach((p, i) => {
        const x = offsetX + (p.x - b.minX) * scale,
          y = offsetZ + (p.z - b.minZ) * scale;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#142b32";
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = "#f5eada";
      ctx.lineWidth = 5;
      ctx.stroke();
      const line = t.at(0.008);
      ctx.fillStyle = "#f8794b";
      ctx.beginPath();
      ctx.arc(
        offsetX + (line.x - b.minX) * scale,
        offsetZ + (line.z - b.minZ) * scale,
        7,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      this.ui.previews[t.data.id] = c.toDataURL("image/webp", 0.84);
    }
  }
  showWorld() {
    this.graphics.buildWorld(
      this.tracks[this.selectedTrack],
      this.config.weather,
    );
    this.graphics.setKarts([this.profile]);
  }
  navigate(page) {
    this.page = page;
    this.input.clear();
    this.ui.render();
    this.bindTouch();
  }
  start() {
    this.audio.start();
    this.input.clear();
    const config = { ...this.config };
    if (config.mode === "trial") {
      config.opponents = 0;
      config.items = false;
      config.collisions = false;
    }
    if (config.mode === "practice") config.opponents = 0;
    this.race = new Race(this.tracks[this.selectedTrack], this.profile, config);
    this.raceSaved = false;
    this.countBeep = -1;
    this.graphics.buildWorld(this.tracks[this.selectedTrack], config.weather);
    const profiles = [
      this.profile,
      ...this.race.karts.slice(1).map((k, i) => ({
        ...structuredClone(DEFAULT_PROFILE),
        vehicle: VEHICLES[i % 3].id,
        color: VEHICLES[i % 3].color,
        helmet: [
          "#b8cb66",
          "#81b5c4",
          "#d89a61",
          "#d56369",
          "#c9c3b3",
          "#778397",
          "#c2d2d0",
        ][i],
        suit: i % 2 ? "#283d43" : "#e7dfcc",
        number: String(12 + i * 7),
      })),
    ];
    this.graphics.setKarts(profiles);
    this.navigate("race");
  }
  action(action, data = {}) {
    if (action !== "blur") this.audio.start();
    if (
      ["garage", "driver", "records", "setup", "settings", "help"].includes(
        action,
      )
    ) {
      this.navigate(action);
      return;
    }
    if (action === "home") {
      this.race = null;
      this.showWorld();
      this.navigate("home");
      this.save();
      return;
    }
    if (action === "start" || action === "restart") {
      this.start();
      return;
    }
    if (action === "test-drive") {
      this.config.mode = "practice";
      this.start();
      return;
    }
    if (action === "track") {
      this.selectedTrack = Number(data.value);
      this.showWorld();
      this.ui.render();
      return;
    }
    if (action === "vehicle") {
      this.profile.vehicle = data.value;
      this.profile.color = VEHICLES.find((v) => v.id === data.value).color;
      this.graphics.setKarts([this.profile]);
      this.save();
      this.ui.render();
      return;
    }
    if (action === "color") {
      this.profile[data.key] = data.value;
      this.graphics.setKarts([this.profile]);
      this.save();
      this.ui.render();
      return;
    }
    if (action === "select-driver") {
      this.profile.driver = Number(data.value);
      const d = DRIVERS[this.profile.driver];
      Object.assign(this.profile, {
        helmet: d.helmet,
        suit: d.suit,
        number: d.number,
      });
      this.graphics.setKarts([this.profile]);
      this.save();
      this.ui.render();
      return;
    }
    if (action === "pause" || action === "blur") {
      if (this.page === "race") {
        this.race.previousState = this.race.state;
        this.race.state = "paused";
        this.navigate("pause");
      } else if (action === "pause" && this.page === "pause")
        this.action("resume");
      return;
    }
    if (action === "resume") {
      this.race.state = this.race.previousState || "racing";
      this.navigate("race");
      return;
    }
    if (action === "item" && this.page === "race") {
      this.race.useItem();
      return;
    }
    if (action === "reset" && this.page === "race") {
      this.ui.toast(
        this.race.resetPlayer()
          ? "Returned to last checkpoint · +2 seconds"
          : "Reset recharging",
      );
      return;
    }
    if (action === "camera") {
      this.profile.settings.camera = (this.profile.settings.camera + 1) % 4;
      this.graphics.cameraReady = false;
      this.save();
      this.ui.toast(
        ["CHASE CAMERA", "COCKPIT CAMERA", "HOOD CAMERA", "CINEMATIC CAMERA"][
          this.profile.settings.camera
        ],
      );
      return;
    }
    if (action === "save-preset") {
      const name = document.querySelector("#preset-name").value.trim();
      if (!name) {
        this.ui.toast("Give your build a name first.");
        return;
      }
      if (this.profile.presets.length >= 20) {
        this.ui.toast("20 builds saved. Export a build to keep another copy.");
        return;
      }
      this.profile.presets.push({ name, build: buildPreset(this.profile) });
      this.save();
      this.ui.render();
      this.ui.toast("Build saved to this browser.");
      return;
    }
    if (action === "load-preset") {
      Object.assign(
        this.profile,
        structuredClone(this.profile.presets[Number(data.value)].build),
      );
      this.graphics.setKarts([this.profile]);
      this.save();
      this.ui.render();
      this.ui.toast("Build loaded.");
      return;
    }
    if (action === "export") {
      const blob = new Blob(
        [JSON.stringify(buildPreset(this.profile), null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `apex-${this.profile.vehicle}-build.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.ui.toast("Build exported.");
      return;
    }
    if (action === "import") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async () => {
        try {
          const file = input.files[0];
          if (!file) return;
          if (file.size > 20000) throw new Error("Preset file is too large.");
          Object.assign(this.profile, importPreset(await file.text()));
          this.graphics.setKarts([this.profile]);
          this.save();
          this.ui.render();
          this.ui.toast("Build imported.");
        } catch (e) {
          this.ui.toast(e.message);
        }
      };
      input.click();
      return;
    }
    if (action === "rebind") {
      this.ui.toast(`Press a key for ${data.value}. Escape cancels.`);
      this.input.capture = (code) => {
        if (code === "Escape") return;
        if (
          !/^(Key[A-Z]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Digit[0-9])$/.test(
            code,
          )
        ) {
          this.ui.toast("Use a letter, number, arrow, Shift, or Space.");
          return;
        }
        const bindings = this.profile.settings.bindings,
          other = Object.keys(bindings).find(
            (k) => bindings[k] === code && k !== data.value,
          );
        if (other) bindings[other] = bindings[data.value];
        bindings[data.value] = code;
        this.input.clear();
        this.save();
        this.ui.render();
        this.ui.toast("Control updated.");
      };
      return;
    }
    if (action === "replay") {
      this.replayIndex = 0;
      this.replayClock = 0;
      this.replayPaused = false;
      this.navigate("replay");
      return;
    }
    if (action === "replay-toggle") {
      this.replayPaused = !this.replayPaused;
      this.ui.render();
      return;
    }
    if (action === "results") {
      this.navigate("results");
      return;
    }
  }
  field(key, value) {
    if (key === "replay") {
      this.replayIndex = Number(value);
      this.replayClock = this.replayIndex * 0.05;
      this.graphics.cameraReady = false;
      return;
    }
    if (key === "selectedTrack") {
      this.selectedTrack = Number(value);
      this.showWorld();
      this.ui.render();
      return;
    }
    const [group, prop] = key.split(".");
    if (group === "config") {
      this.config[prop] = ["laps", "opponents", "difficulty"].includes(prop)
        ? Number(value)
        : value;
      if (prop === "weather") this.showWorld();
    } else if (group === "settings") {
      this.profile.settings[prop] = [
        "engine",
        "effects",
        "music",
        "camera",
        "sensitivity",
        "deadzone",
      ].includes(prop)
        ? Number(value)
        : value;
      if (prop === "quality") this.graphics.applyQuality();
      if (prop === "camera") this.graphics.cameraReady = false;
    } else if (group === "tuning") this.profile.tuning[prop] = Number(value);
    else {
      this.profile[key] =
        key === "spoiler"
          ? value === "true"
          : key === "number"
            ? String(value).replace(/\D/g, "").slice(0, 2).padStart(2, "0")
            : value;
      this.graphics.setKarts([this.profile]);
    }
    this.save();
    this.ui.render();
  }
  bindTouch() {
    for (const button of document.querySelectorAll("[data-touch]")) {
      const name = button.dataset.touch;
      button.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.input.touch[name] = true;
      });
      for (const evt of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(evt, () => (this.input.touch[name] = false));
    }
  }
  finish() {
    if (!this.raceSaved) {
      const r = this.race,
        k = r.player;
      this.profile.races++;
      if (r.finishPosition === 1 && r.karts.length > 1) this.profile.wins++;
      this.profile.distance += k.distance;
      const key = `${r.track.data.id}-${r.config.weather}-${this.profile.vehicle}-${r.config.items ? "items" : "pure"}`,
        best = Math.min(...k.lapTimes);
      if (!this.profile.records[key] || best < this.profile.records[key])
        this.profile.records[key] = best;
      this.save();
      this.raceSaved = true;
      this.audio.tone(660, 0.35, 0.5);
      setTimeout(() => this.audio.tone(880, 0.5, 0.4), 180);
    }
    this.navigate("results");
  }
  frame(now) {
    const dt = Math.min(0.1, (now - this.previous) / 1000);
    this.previous = now;
    const controls = this.input.read();
    if (this.page === "race") {
      if (
        this.profile.settings.assist &&
        !controls.drift &&
        Math.abs(controls.steer) < 0.05 &&
        this.race.player.speed > 4
      ) {
        const k = this.race.player,
          p = this.race.track.nearest(k.x, k.z, k.t);
        controls.steer = Math.max(
          -0.22,
          Math.min(
            0.22,
            angleDelta(p.heading - k.heading) * 0.65 - p.offset * 0.018,
          ),
        );
      }
      this.race.update(dt, controls);
      const count = Math.ceil(this.race.countdown - 0.6);
      if (count !== this.countBeep && count >= 0) {
        this.countBeep = count;
        this.audio.tone(count ? 440 : 880, 0.15, 0.3);
      }
      while (this.race.events.length) {
        const event = this.race.events.shift();
        if (event.type === "lap")
          this.ui.toast(`LAP ${event.lap} · ${plainTime(event.time)}`);
        if (event.type === "pickup") {
          this.ui.toast(
            `${event.item === "turbo" ? "SURGE" : event.item === "shield" ? "HALO" : "PULSE"} READY · Use your item key`,
          );
          this.audio.tone(740, 0.15, 0.3);
        }
        if (event.type === "item")
          this.audio.tone(event.item === "emp" ? 120 : 540, 0.3, 0.5);
        if (event.type === "finish") this.finish();
      }
      if (this.race.player.hit > 0 && this.lastHit <= 0)
        this.audio.tone(65, 0.2, 0.65, "triangle");
      this.lastHit = this.race.player.hit;
      if (now - this.lastHud > 50) {
        this.ui.updateHUD();
        this.lastHud = now;
      }
    }
    let replayFrame = null;
    if (this.page === "replay") {
      if (!this.replayPaused) this.replayClock += dt;
      this.replayIndex = Math.min(
        this.race.samples.length - 1,
        Math.floor(this.replayClock / 0.05),
      );
      if (
        this.replayIndex >= this.race.samples.length - 1 &&
        !this.replayPaused
      ) {
        this.replayPaused = true;
        this.ui.render();
      }
      replayFrame = this.race.samples[this.replayIndex];
      const scrub = document.querySelector("#replay-scrub");
      if (scrub && document.activeElement !== scrub)
        scrub.value = this.replayIndex;
    }
    this.graphics.render(dt, this.race, this.profile, this.page, replayFrame);
    this.audio.update(
      this.race?.player,
      this.page === "race",
      controls.throttle,
    );
  }
}
let app;
try {
  app = new App();
} catch (error) {
  console.error(error);
  const loading = document.querySelector("#loading");
  if (loading) {
    loading.innerHTML =
      '<span class="brand">APEX /</span><p>THE PADDOCK COULD NOT START</p><p style="max-width:450px;text-align:center;letter-spacing:0;padding:20px">This game requires WebGL 2. Enable hardware acceleration in your browser and reload. See the browser console for details.</p>';
  }
}
