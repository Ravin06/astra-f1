import { angleDelta } from "./track.js";
export const STEP = 1 / 120;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function makeKart(track, stats, index = 0) {
  const p = track.at(0.008 - index * 0.007, (index % 2 === 0 ? -1 : 1) * 2.2);
  return {
    ...p,
    stats,
    id: index,
    vx: 0,
    vz: 0,
    speed: 0,
    steer: 0,
    yaw: 0,
    roll: 0,
    pitch: 0,
    boost: 65,
    boostTime: 0,
    driftCharge: 0,
    drifting: false,
    shield: 0,
    slow: 0,
    damage: 0,
    hit: 0,
    progress: p.t,
    lastT: p.t,
    checkpoint: 1,
    laps: 0,
    lapStart: 0,
    lapTimes: [],
    finished: false,
    finishTime: 0,
    item: null,
    itemCooldown: 0,
    resetCooldown: 0,
    distance: 0,
    wrongWay: 0,
  };
}
export function stepKart(k, input, track, dt, options = {}) {
  const st = k.stats,
    surface = track.nearest(k.x, k.z, k.t);
  k.t = surface.t;
  let fx = Math.sin(k.heading),
    fz = Math.cos(k.heading),
    rx = fz,
    rz = -fx;
  let forward = k.vx * fx + k.vz * fz,
    lateral = k.vx * rx + k.vz * rz;
  const offroad = Math.abs(surface.offset) > track.width / 2;
  const rain = options.weather === "rain";
  const grip =
    st.grip *
    (rain ? 0.73 : 1) *
    (offroad ? 0.53 : 1) *
    (1 + (st.aero * forward * forward) / 3600);
  const steerTarget = clamp(input.steer || 0, -1, 1) * st.steering;
  k.steer += (steerTarget - k.steer) * Math.min(1, dt * 9);
  const drifting =
    !!input.drift &&
    Math.abs(forward) > 8 &&
    (Math.abs(k.steer) > 0.1 || k.drifting);
  if (k.drifting && !drifting) {
    if (k.driftCharge > 0.45) {
      k.boostTime = Math.max(k.boostTime, Math.min(2.5, k.driftCharge * 0.7));
      k.boost = Math.min(100, k.boost + 10 * k.driftCharge);
    }
    k.driftCharge = 0;
  }
  k.drifting = drifting;
  if (drifting)
    k.driftCharge = Math.min(3.5, k.driftCharge + dt * Math.abs(k.steer));
  if (input.boost && k.boost > 0 && forward > 1) {
    k.boostTime = Math.max(k.boostTime, dt * 2);
    k.boost = Math.max(0, k.boost - dt * 24);
  } else k.boost = Math.min(100, k.boost + dt * 2.4);
  const boosted = k.boostTime > 0;
  for (const key of [
    "boostTime",
    "shield",
    "slow",
    "hit",
    "itemCooldown",
    "resetCooldown",
  ])
    k[key] = Math.max(0, k[key] - dt);
  const speedLimit =
    st.maxSpeed *
    (boosted ? 1.33 : 1) *
    (k.slow > 0 ? 0.5 : 1) *
    (1 - k.damage * 0.0018);
  const power =
    st.power * (168 / st.mass) * (boosted ? 1.65 : 1) * (offroad ? 0.55 : 1);
  const throttle = clamp(input.throttle || 0, 0, 1),
    brake = clamp(input.brake || 0, 0, 1);
  let accel =
    throttle *
    power *
    Math.max(0.06, 1 - (Math.max(0, forward) / speedLimit) * 0.72);
  if (brake > 0)
    accel -= forward > 0.5 ? brake * st.brake : brake * power * 0.45;
  accel -=
    forward * (offroad ? 0.42 : 0.06) + st.drag * forward * Math.abs(forward);
  if (forward > speedLimit) accel -= (forward - speedLimit) * 3;
  if (forward < -7) accel += (-7 - forward) * 5;
  // Bicycle steering with saturated tire forces; lateral velocity survives a drift.
  const wheelAngle = k.steer * (0.46 / (1 + Math.abs(forward) * 0.026));
  const desiredYaw =
    (forward / 2.4) * Math.tan(wheelAngle) * (drifting ? 1.2 : 1);
  const maxYaw = (grip * 1.7) / Math.max(6, Math.abs(forward));
  k.yaw +=
    (clamp(desiredYaw, -maxYaw, maxYaw) - k.yaw) *
    Math.min(1, dt * (drifting ? 4 : 8));
  k.heading += k.yaw * dt;
  const lateralTarget = drifting ? -k.steer * Math.abs(forward) * 0.22 : 0;
  lateral +=
    (lateralTarget - lateral) * Math.min(1, dt * grip * (drifting ? 0.3 : 1.0));
  forward += accel * dt;
  if (!throttle && !brake && Math.abs(forward) < 0.1) forward = 0;
  fx = Math.sin(k.heading);
  fz = Math.cos(k.heading);
  rx = fz;
  rz = -fx;
  k.vx = fx * forward + rx * lateral;
  k.vz = fz * forward + rz * lateral;
  k.x += k.vx * dt;
  k.z += k.vz * dt;
  k.speed = forward;
  k.distance += Math.abs(forward) * dt;
  k.y += (surface.y - k.y) * Math.min(1, dt * 18);
  k.roll +=
    (clamp(-k.yaw * forward * 0.007, -0.13, 0.13) - k.roll) *
    Math.min(1, dt * 8);
  k.pitch +=
    (clamp(accel * 0.005, -0.09, 0.09) - k.pitch) * Math.min(1, dt * 8);
  const limit = track.width / 2 + 3;
  if (Math.abs(surface.offset) > limit) {
    const sign = Math.sign(surface.offset),
      inward = sign * (Math.abs(surface.offset) - limit);
    k.x -= Math.cos(surface.heading) * inward;
    k.z += Math.sin(surface.heading) * inward;
    const normalSpeed =
      k.vx * Math.cos(surface.heading) - k.vz * Math.sin(surface.heading);
    if (normalSpeed * sign > 0) {
      k.vx -= Math.cos(surface.heading) * normalSpeed * 1.45;
      k.vz += Math.sin(surface.heading) * normalSpeed * 1.45;
    }
    if (k.hit === 0 && Math.abs(normalSpeed) > 2) {
      k.hit = 0.4;
      if (options.damage && !k.shield)
        k.damage = Math.min(100, k.damage + Math.abs(normalSpeed) * 0.5);
    }
  }
  k.wrongWay =
    Math.abs(angleDelta(k.heading - surface.heading)) > 2 &&
    Math.abs(forward) > 3
      ? k.wrongWay + dt
      : 0;
}
export function collide(a, b, damage = false) {
  if (Math.abs(a.y - b.y) > 2.2) return;
  const dx = b.x - a.x,
    dz = b.z - a.z,
    d = Math.hypot(dx, dz);
  if (d >= 3.0 || d < 0.001) return;
  const nx = dx / d,
    nz = dz / d,
    overlap = (3.0 - d) * 0.5;
  a.x -= nx * overlap;
  a.z -= nz * overlap;
  b.x += nx * overlap;
  b.z += nz * overlap;
  const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  if (rel > 0) {
    const force = rel * 0.66;
    if (!a.shield) {
      a.vx -= nx * force;
      a.vz -= nz * force;
    }
    if (!b.shield) {
      b.vx += nx * force;
      b.vz += nz * force;
    }
    if (rel > 3) {
      a.hit = b.hit = 0.3;
      if (damage) {
        if (!a.shield) a.damage = clamp(a.damage + rel * 0.2, 0, 100);
        if (!b.shield) b.damage = clamp(b.damage + rel * 0.2, 0, 100);
      }
    }
  }
}
export function aiInput(k, track, difficulty, karts, time = 0) {
  const look = 7 + Math.abs(k.speed) * 0.43;
  let lane = Math.sin(time * 0.25 + k.id * 4) * 0.7 + ((k.id % 3) - 1) * 1.35;
  for (const other of karts) {
    if (other === k) continue;
    const gap = other.progress - k.progress;
    if (gap > 0 && gap * track.length < 13 && Math.abs(other.t - k.t) < 0.05)
      lane += (k.id % 2 ? 1 : -1) * 2;
  }
  lane = clamp(lane, -track.width * 0.3, track.width * 0.3);
  const target = track.at(k.t + look / track.length, lane);
  const error = angleDelta(
    Math.atan2(target.x - k.x, target.z - k.z) - k.heading,
  );
  const bend = Math.max(
    track.curvature(k.t),
    track.curvature(k.t + look / track.length),
  );
  const desired =
    Math.min(
      k.stats.maxSpeed * (0.68 + difficulty * 0.1),
      Math.sqrt(8.4 / Math.max(0.006, bend)),
    ) * (k.id % 3 === 0 ? 0.97 : 1);
  return {
    steer: clamp(error * 2.1, -1, 1),
    throttle: k.speed < desired ? 1 : 0.12,
    brake: k.speed > desired + 3 ? 0.65 : 0,
    drift: false,
    boost: bend < 0.008 && k.boost > 70,
  };
}
