import test from "node:test";
import assert from "node:assert/strict";
import { Track } from "../src/track.js";
import { Race } from "../src/race.js";
import { makeKart, stepKart, aiInput, collide, STEP } from "../src/physics.js";
import { TRACKS, DEFAULT_PROFILE, vehicleStats } from "../src/data.js";
import { sanitize, importPreset, buildPreset } from "../src/persistence.js";
const profile = () => structuredClone(DEFAULT_PROFILE);
test("Grand Prix layouts use their declared arcade lengths and wider roads", () => {
  assert.equal(TRACKS.length, 4);
  for (const data of TRACKS) {
    const t = new Track(data);
    assert.ok(Math.abs(t.length - data.targetLength) < 0.5);
    assert.ok(t.width >= 18);
  }
});
test("Suzuka crossover has a clear upper deck and no cross-level collisions", () => {
  const t = new Track(TRACKS.find((t) => t.id === "suzuka"));
  let crossings = 0;
  for (let i = 0; i < t.samples; i++) {
    const a = t.points[i],
      b = t.points[(i + 1) % t.samples];
    for (let j = i + 30; j < t.samples; j++) {
      if (i === 0 && j > t.samples - 30) continue;
      const c = t.points[j],
        d = t.points[(j + 1) % t.samples],
        rx = b.x - a.x,
        rz = b.z - a.z,
        sx = d.x - c.x,
        sz = d.z - c.z,
        den = rx * sz - rz * sx;
      if (Math.abs(den) < 0.00001) continue;
      const u = ((c.x - a.x) * sz - (c.z - a.z) * sx) / den,
        v = ((c.x - a.x) * rz - (c.z - a.z) * rx) / den;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        crossings++;
        assert.ok(
          Math.abs(
            t.height((i + u) / t.samples) - t.height((j + v) / t.samples),
          ) > 7,
        );
      }
    }
  }
  assert.equal(crossings, 1);
  const a = makeKart(t, vehicleStats(profile())),
    b = makeKart(t, vehicleStats(profile()), 1);
  Object.assign(a, { x: 0, z: 0, y: 0.35, vx: 10 });
  Object.assign(b, { x: 1, z: 0, y: 10.35, vx: 0 });
  collide(a, b);
  assert.equal(a.vx, 10);
  assert.equal(b.vx, 0);
  assert.equal(a.x, 0);
});
test("legacy builds and distinct new circuit records survive save validation", () => {
  const p = sanitize({
    vehicle: "vector",
    records: {
      "coast-clear-vector-pure": 42,
      "singapore-clear-vector-pure": 91,
      "monaco-rain-vector-pure": 108,
    },
  });
  assert.equal(p.vehicle, "vector");
  assert.equal(Object.keys(p.records).length, 3);
});
test("track geometry closes and nearest point recovers driving position", () => {
  for (const data of TRACKS) {
    const track = new Track(data);
    assert.ok(track.length > 650);
    for (const t of [0.05, 0.23, 0.58, 0.94]) {
      const p = track.at(t, 2);
      const n = track.nearest(p.x, p.z);
      assert.ok(Math.abs(n.t - t) < 0.005);
      assert.ok(Math.abs(n.offset - 2) < 0.4);
    }
    assert.deepEqual(track.at(0), track.at(1));
  }
});
test("tuning has measurable power, mass, drag and steering trade-offs", () => {
  const p = profile(),
    base = vehicleStats(p);
  p.tuning.engine = 1.25;
  p.tuning.aero = 1;
  const tuned = vehicleStats(p);
  assert.ok(tuned.power > base.power);
  assert.ok(tuned.mass > base.mass);
  assert.ok(tuned.drag > base.drag);
  assert.ok(tuned.maxSpeed < base.maxSpeed + 1.25);
});
test("render frame grouping does not change the fixed-step simulation", () => {
  const track = new Track(TRACKS[0]);
  const run = (hz) => {
    const r = new Race(track, profile(), { opponents: 0 });
    r.countdown = 0;
    r.state = "racing";
    for (let i = 0; i < hz * 3; i++) r.update(1 / hz, { throttle: 1 });
    return r.player;
  };
  const a = run(30),
    b = run(120);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.02);
  assert.ok(Math.abs(a.speed - b.speed) < 0.01);
});
test("drifting charges and grants a release boost", () => {
  const t = new Track({ ...TRACKS[2], width: 120 }),
    k = makeKart(t, vehicleStats(profile()));
  k.speed = 20;
  k.vx = Math.sin(k.heading) * 20;
  k.vz = Math.cos(k.heading) * 20;
  for (let i = 0; i < 100; i++)
    stepKart(k, { throttle: 1, steer: 0.5, drift: true }, t, STEP);
  assert.ok(k.driftCharge > 0.3);
  for (let i = 0; i < 100; i++)
    stepKart(k, { throttle: 1, steer: 0.4, drift: true }, t, STEP);
  const charge = k.driftCharge;
  stepKart(k, { throttle: 1, steer: 0, drift: false }, t, STEP);
  assert.ok(charge > 0.45);
  assert.ok(k.boostTime > 0);
});
test("ordered checkpoints reject a shortcut across the start line", () => {
  const t = new Track(TRACKS[0]),
    r = new Race(t, profile(), { opponents: 0, laps: 1 });
  r.countdown = 0;
  r.state = "racing";
  const p = t.at(0.002);
  Object.assign(r.player, p, { lastT: 0.998 });
  r.step({});
  assert.equal(r.player.laps, 0);
  assert.equal(r.state, "racing");
});
test("reset moves backward to validated checkpoint and adds a penalty", () => {
  const t = new Track(TRACKS[0]),
    r = new Race(t, profile(), { opponents: 0 });
  r.countdown = 0;
  r.state = "racing";
  Object.assign(r.player, t.at(0.41), {
    checkpoint: 2,
    progress: 0.41,
    lastT: 0.41,
  });
  assert.equal(r.resetPlayer(), true);
  assert.ok(r.player.t < 0.26);
  assert.ok(r.player.progress < 0.26);
  assert.equal(r.time, 2);
  assert.equal(r.resetPlayer(), false);
});
test("shield counters pulse and items are single use", () => {
  const t = new Track(TRACKS[0]),
    r = new Race(t, profile(), { opponents: 1 });
  r.countdown = 0;
  r.state = "racing";
  r.player.item = "emp";
  r.karts[1].shield = 3;
  r.useItem();
  assert.equal(r.karts[1].slow, 0);
  assert.equal(r.player.item, null);
  r.player.item = "emp";
  r.karts[1].shield = 0;
  r.useItem();
  assert.equal(r.karts[1].slow, 2.4);
});
test("pausing freezes race timing and karts", () => {
  const r = new Race(new Track(TRACKS[0]), profile(), { opponents: 0 });
  r.state = "paused";
  const before = JSON.stringify(r.player);
  for (let i = 0; i < 120; i++) r.update(STEP, { throttle: 1 });
  assert.equal(r.time, 0);
  assert.equal(JSON.stringify(r.player), before);
});
test("untrusted saves and imported presets are bounded and validated", () => {
  const p = sanitize({
    vehicle: "bad",
    color: "url(evil)",
    tuning: { engine: 1e99 },
    settings: { music: -20, bindings: { throttle: "<script>" } },
    presets: [null],
  });
  assert.equal(p.vehicle, "vortex");
  assert.equal(p.color, DEFAULT_PROFILE.color);
  assert.equal(p.tuning.engine, 1.25);
  assert.equal(p.settings.music, 0);
  assert.equal(p.settings.bindings.throttle, "KeyW");
  assert.deepEqual(
    importPreset(JSON.stringify(buildPreset(profile()))),
    buildPreset(profile()),
  );
  assert.throws(() => importPreset('{"vehicle":"fake"}'));
});
test("AI completes a legal lap on each original circuit without teleporting", () => {
  for (const data of TRACKS) {
    const track = new Track(data),
      r = new Race(track, profile(), { opponents: 0, laps: 1, difficulty: 1 });
    r.countdown = 0;
    r.state = "racing";
    let maxJump = 0;
    for (let i = 0; i < 120 * 180 && r.state !== "finished"; i++) {
      const x = r.player.x,
        z = r.player.z;
      r.step(aiInput(r.player, track, 1, r.karts, r.time));
      maxJump = Math.max(maxJump, Math.hypot(r.player.x - x, r.player.z - z));
    }
    assert.equal(
      r.state,
      "finished",
      `${data.id}: progress=${r.player.progress.toFixed(2)}, checkpoint=${r.player.checkpoint}, t=${r.player.t.toFixed(2)}, speed=${r.player.speed.toFixed(1)}`,
    );
    assert.equal(r.player.laps, 1);
    assert.ok(maxJump < 1);
    assert.ok(r.player.lapTimes[0] > 20);
    assert.ok(r.samples.length > 100);
  }
});
test("traffic and rain remain stable across complete races", () => {
  for (const data of TRACKS) {
    const track = new Track(data),
      r = new Race(track, profile(), {
        opponents: 5,
        laps: 1,
        difficulty: 1,
        weather: "rain",
      });
    r.countdown = 0;
    r.state = "racing";
    for (let i = 0; i < 120 * 180 && r.state !== "finished"; i++)
      r.step(aiInput(r.player, track, 1, r.karts, r.time));
    assert.equal(
      r.state,
      "finished",
      `${data.id}: six-kart wet race completes`,
    );
    assert.ok(
      r.karts.every((k) => Number.isFinite(k.x) && Number.isFinite(k.speed)),
    );
    assert.ok(r.karts.slice(1).some((k) => k.progress > 0.4));
    assert.ok(
      Math.abs(r.samples[10].time - r.samples[0].time - 0.5) < 1e-8,
      "replay records at exactly 20 Hz",
    );
  }
});
