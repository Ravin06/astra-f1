import { makeKart, stepKart, collide, aiInput, STEP } from "./physics.js";
import { vehicleStats, VEHICLES, DEFAULT_PROFILE } from "./data.js";
import { wrap } from "./track.js";
export class Race {
  constructor(track, profile, config) {
    this.track = track;
    this.config = {
      laps: 3,
      opponents: 5,
      difficulty: 1,
      weather: "clear",
      items: true,
      damage: false,
      collisions: true,
      mode: "quick",
      ...config,
    };
    this.time = 0;
    this.countdown = 3.6;
    this.state = "countdown";
    this.accumulator = 0;
    this.events = [];
    this.samples = [];
    this.sampleClock = 0;
    const count = ["trial", "practice"].includes(this.config.mode)
      ? 0
      : this.config.opponents;
    this.karts = [makeKart(track, vehicleStats(profile))];
    for (let i = 1; i <= count; i++)
      this.karts.push(
        makeKart(
          track,
          vehicleStats({
            ...structuredClone(DEFAULT_PROFILE),
            vehicle: VEHICLES[(i - 1) % 3].id,
          }),
          i,
        ),
      );
    // Grid cars begin before the line; their first start-line crossing is never a lap.
    for (const k of this.karts) {
      k.progress = 0.008 - k.id * 0.007;
      k.lastT = k.t;
    }
    this.pickups = [0.15, 0.39, 0.64, 0.86].map((t) => ({ t, cooldown: 0 }));
    this.boostPads = [0.23, 0.72];
    this.lastPlace = null;
    this.finishPosition = 0;
  }
  get player() {
    return this.karts[0];
  }
  get ordered() {
    return [...this.karts].sort((a, b) =>
      a.finished && b.finished
        ? a.finishTime - b.finishTime
        : a.finished
          ? -1
          : b.finished
            ? 1
            : b.progress - a.progress,
    );
  }
  get position() {
    return this.ordered.indexOf(this.player) + 1;
  }
  update(delta, input) {
    this.accumulator += Math.min(delta, 0.1);
    while (this.accumulator >= STEP) {
      this.step(input);
      this.accumulator -= STEP;
    }
  }
  step(input) {
    if (this.state === "finished" || this.state === "paused") return;
    if (this.countdown > 0) {
      this.countdown -= STEP;
      if (this.countdown <= 0) {
        this.state = "racing";
        this.events.push({ type: "go" });
      }
      return;
    }
    this.time += STEP;
    for (const pickup of this.pickups)
      pickup.cooldown = Math.max(0, pickup.cooldown - STEP);
    for (const k of this.karts) {
      if (k.finished) continue;
      const controls =
        k.id === 0
          ? input
          : aiInput(
              k,
              this.track,
              this.config.difficulty,
              this.karts,
              this.time,
            );
      stepKart(k, controls, this.track, STEP, this.config);
      const nearest = this.track.nearest(k.x, k.z, k.t);
      k.t = nearest.t;
      let delta = k.t - k.lastT;
      if (delta > 0.5) delta -= 1;
      if (delta < -0.5) delta += 1;
      if (Math.abs(delta) < 0.04) k.progress += delta;
      // Ordered quarter checkpoints prevent reverse-line and reset lap exploits.
      const checkpointT = k.checkpoint * 0.25;
      if (
        k.checkpoint < 4 &&
        k.t >= checkpointT &&
        k.t < checkpointT + 0.035 &&
        delta > 0
      )
        k.checkpoint++;
      if (k.checkpoint === 4 && k.lastT > 0.94 && k.t < 0.06 && delta > 0) {
        k.laps++;
        k.checkpoint = 1;
        k.lapTimes.push(this.time - k.lapStart);
        k.lapStart = this.time;
        if (k.id === 0)
          this.events.push({
            type: "lap",
            lap: k.laps,
            time: k.lapTimes.at(-1),
          });
        if (k.laps >= this.config.laps && this.config.mode !== "practice") {
          k.finished = true;
          k.finishTime = this.time;
          if (k.id === 0) {
            this.finishPosition = this.position;
            this.state = "finished";
            this.events.push({ type: "finish" });
          }
        }
      }
      k.lastT = k.t;
      if (this.config.items && !k.item)
        for (const pickup of this.pickups) {
          if (
            pickup.cooldown === 0 &&
            Math.abs(k.t - pickup.t) * this.track.length < 2.5 &&
            Math.abs(nearest.offset) < 4
          ) {
            const pos = this.ordered.indexOf(k);
            k.item =
              pos > 2
                ? "turbo"
                : ["shield", "emp", "turbo"][
                    (Math.floor(this.time) + k.id) % 3
                  ];
            pickup.cooldown = 5;
            if (k.id === 0) this.events.push({ type: "pickup", item: k.item });
            break;
          }
        }
      for (const t of this.boostPads)
        if (
          Math.abs(k.t - t) * this.track.length < 2 &&
          Math.abs(nearest.offset) < 3
        )
          k.boostTime = Math.max(k.boostTime, 0.8);
      for (const other of this.karts) {
        if (other === k) continue;
        const d = (other.progress - k.progress) * this.track.length;
        if (
          d > 3 &&
          d < 17 &&
          Math.abs(other.x - k.x) * Math.abs(Math.cos(k.heading)) +
            Math.abs(other.z - k.z) * Math.abs(Math.sin(k.heading)) <
            3
        )
          k.boost = Math.min(100, k.boost + STEP * 4);
      }
      if (k.id > 0 && k.item && this.time % 5 < STEP) this.useItem(k);
    }
    if (this.config.collisions)
      for (let i = 0; i < this.karts.length; i++)
        for (let j = i + 1; j < this.karts.length; j++)
          collide(this.karts[i], this.karts[j], this.config.damage);
    this.sampleClock += STEP;
    if (this.sampleClock >= 0.05 - 1e-9) {
      this.sampleClock -= 0.05;
      this.samples.push({
        time: this.time,
        karts: this.karts.map((k) => ({
          x: k.x,
          y: k.y,
          z: k.z,
          heading: k.heading,
          steer: k.steer,
          roll: k.roll,
          pitch: k.pitch,
          speed: k.speed,
          boostTime: k.boostTime,
          shield: k.shield,
        })),
      });
      if (this.samples.length > 12000) this.samples.shift();
    }
  }
  useItem(k = this.player) {
    if (this.state !== "racing" || !k.item) return;
    const item = k.item;
    k.item = null;
    if (item === "turbo") k.boostTime = 3;
    if (item === "shield") k.shield = 5;
    if (item === "emp")
      for (const other of this.karts)
        if (
          other !== k &&
          Math.hypot(k.x - other.x, k.z - other.z) < 22 &&
          !other.shield
        )
          other.slow = 2.4;
    if (k.id === 0) this.events.push({ type: "item", item });
  }
  resetPlayer() {
    const k = this.player;
    if (k.resetCooldown > 0 || this.state !== "racing") return false;
    // Reset to the last validated checkpoint, never advance race progress.
    const t = (k.checkpoint - 1) * 0.25 + 0.003,
      p = this.track.at(t);
    k.progress -= wrap(k.t - t, 1);
    Object.assign(k, p, {
      vx: 0,
      vz: 0,
      speed: 0,
      yaw: 0,
      lastT: t,
      boostTime: 0,
      resetCooldown: 5,
    });
    this.time += 2;
    return true;
  }
}
