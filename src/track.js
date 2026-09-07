import * as THREE from "three";
export const wrap = (v, n) => ((v % n) + n) % n;
export const angleDelta = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export class Track {
  constructor(data) {
    this.data = data;
    this.width = data.width;
    this.samples = 720;
    this.curve = new THREE.CatmullRomCurve3(
      data.points.map(([x, z], i) => new THREE.Vector3(x, 0, z)),
      true,
      "centripetal",
    );
    this.curve.arcLengthDivisions = 2400;
    this.length = this.curve.getLength();
    this.points = Array.from({ length: this.samples }, (_, i) =>
      this.at(i / this.samples),
    );
  }
  height(t) {
    return 0.35 + this.data.elevation * (1 - Math.cos(t * Math.PI * 4)) * 0.5;
  }
  at(t, offset = 0) {
    t = wrap(t, 1);
    const p = this.curve.getPointAt(t),
      tangent = this.curve.getTangentAt(t).normalize();
    p.y = this.height(t);
    p.x += tangent.z * offset;
    p.z -= tangent.x * offset;
    return {
      x: p.x,
      y: p.y,
      z: p.z,
      heading: Math.atan2(tangent.x, tangent.z),
      t,
      tangent,
    };
  }
  nearest(x, z, hint) {
    let best = Infinity,
      index = 0;
    const scan = (i) => {
      i = wrap(i, this.samples);
      const p = this.points[i],
        d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < best) {
        best = d;
        index = i;
      }
    };
    if (hint === undefined) for (let i = 0; i < this.samples; i++) scan(i);
    else {
      const center = Math.round(hint * this.samples);
      for (let j = -28; j <= 28; j++) scan(center + j);
      if (best > 900) for (let i = 0; i < this.samples; i++) scan(i);
    }
    const a = this.points[index],
      b = this.points[(index + 1) % this.samples];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const f = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)),
    );
    const p = this.at((index + f) / this.samples);
    const offset =
      (x - p.x) * Math.cos(p.heading) - (z - p.z) * Math.sin(p.heading);
    return { ...p, offset, distance: Math.hypot(x - p.x, z - p.z) };
  }
  curvature(t, distance = 16) {
    return (
      Math.abs(
        angleDelta(
          this.at(t + distance / this.length).heading - this.at(t).heading,
        ),
      ) / distance
    );
  }
}
