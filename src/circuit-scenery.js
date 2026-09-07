import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const mat = (color, roughness = 0.7, metalness = 0.1) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });
function add(parent, geo, m, x = 0, y = 0, z = 0) {
  const o = new T.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
const box = (p, m, x, y, z, w, h, d) =>
  add(p, new T.BoxGeometry(w, h, d), m, x, y, z);
function rod(p, m, a, b, r = 0.3) {
  const va = new T.Vector3(...a),
    vb = new T.Vector3(...b),
    o = add(p, new T.CylinderGeometry(r, r, va.distanceTo(vb), 8), m);
  o.position.copy(va).add(vb).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    vb.sub(va).normalize(),
  );
  return o;
}
function sign(text) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#edf0df";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#17272e";
  ctx.font = "bold 82px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 68);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return new T.MeshBasicMaterial({ map: t, side: T.DoubleSide });
}
function wheel(parent, x, y, z, night) {
  const g = new T.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const white = mat("#c9d2cf", 0.5, 0.5),
    light = new T.MeshBasicMaterial({ color: night ? "#b7edfa" : "#e6e2cf" });
  add(g, new T.TorusGeometry(23, 0.4, 7, 64), white, 0, 27, 0);
  add(g, new T.TorusGeometry(22.3, 0.07, 4, 64), light, 0, 27, 0.1);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2,
      xx = Math.sin(a) * 23,
      yy = 27 + Math.cos(a) * 23;
    rod(g, white, [0, 27, 0], [xx, yy, 0], 0.07);
    box(g, white, xx, yy, 0, 2.2, 2, 2.3);
  }
  rod(g, white, [-9, 0, 3], [0, 27, 0], 0.6);
  rod(g, white, [9, 0, -3], [0, 27, 0], 0.6);
}
export function addCircuitScenery(parent, track) {
  const world = new T.Group();
  parent.add(world);
  const night = track.data.theme === "night",
    urban = night || track.data.id === "monaco";
  const concrete = mat("#d2d0c3"),
    steel = mat("#35434a", 0.5, 0.5),
    red = mat("#c35647"),
    glass = mat(night ? "#2c455b" : "#597480", 0.2, 0.55),
    windows = new T.MeshBasicMaterial({ color: night ? "#dfbd86" : "#b6d6d3" }),
    seats = mat("#8c9b9d");
  // Grandstands and pit buildings are kept clear of every road branch.
  for (const t of [0.01, 0.22, 0.49, 0.76]) {
    const p = track.at(t, track.width / 2 + 26);
    if (track.nearest(p.x, p.z).distance < 23) continue;
    const g = new T.Group();
    g.position.set(p.x, p.y - 1, p.z);
    g.rotation.y = p.heading;
    world.add(g);
    box(g, steel, 0, 4, 0, 13, 8, 40);
    for (let j = 0; j < 6; j++)
      box(g, j % 2 ? seats : red, -6 + j * 1.8, 2 + j * 0.85, 0, 1.7, 0.7, 37);
    box(g, concrete, 0, 8.5, 0, 16, 0.35, 44);
    for (const z of [-18, 18]) box(g, steel, -7.5, 5, z, 0.23, 8, 0.23);
  }
  if (urban) {
    for (let i = 0; i < 38; i++) {
      const p = track.at(
        i / 38,
        (i % 2 ? 1 : -1) * (track.width / 2 + 36 + (i % 3) * 15),
      );
      if (track.nearest(p.x, p.z).distance < 26) continue;
      const h = night ? 15 + ((i * 17) % 50) : 8 + ((i * 7) % 19),
        g = new T.Group();
      g.position.set(p.x, 0, p.z);
      g.rotation.y = p.heading;
      world.add(g);
      box(g, night ? glass : concrete, 0, h / 2, 0, 13, h, 17);
      box(g, steel, 0, h + 0.25, 0, 14, 0.5, 18);
      for (let y = 3; y < h - 1; y += 3) {
        box(g, windows, -6.52, y, 0, 0.035, 0.8, 13);
        box(g, windows, 0, y, 8.52, 9, 0.8, 0.035);
      }
    }
  } else {
    const green = mat("#4c674b");
    for (let i = 0; i < 95; i++) {
      const p = track.at(
        i / 95,
        (i % 2 ? 1 : -1) * (track.width / 2 + 22 + ((i * 13) % 50)),
      );
      if (track.nearest(p.x, p.z).distance < 18) continue;
      box(world, steel, p.x, 2, p.z, 0.45, 4, 0.45);
      const tree = add(
        world,
        new T.IcosahedronGeometry(3 + (i % 3), 1),
        green,
        p.x,
        5 + (i % 3),
        p.z,
      );
      tree.scale.y = 1.2;
    }
  }
  const b = track.bounds;
  if (track.data.id === "singapore") {
    // Original simplified Singapore silhouettes: three-tower skypark and Flyer.
    const landmark = new T.Group();
    landmark.position.set(b.minX - 85, 0, b.minZ + 90);
    landmark.rotation.y = 0.3;
    world.add(landmark);
    for (const x of [-30, 0, 30]) {
      box(landmark, glass, x, 31, 0, 13, 62, 18);
      for (let y = 3; y < 61; y += 4)
        box(landmark, windows, x, y, 9.03, 12, 0.4, 0.04);
    }
    box(landmark, concrete, 0, 64, 0, 103, 4, 25);
    box(landmark, mat("#526b59"), 0, 66.2, 0, 91, 0.5, 18);
    wheel(world, b.maxX + 50, 0, b.minZ + 75, true);
  }
  if (track.data.id === "suzuka")
    wheel(world, b.maxX + 50, 0, b.maxZ - 100, false);
  if (track.data.id === "monaco") {
    // A covered section follows the actual centerline; no invisible tunnel walls.
    const [start, end] = track.data.tunnel;
    for (let i = 0; i < 21; i++) {
      const t = start + (i * (end - start)) / 20,
        p = track.at(t),
        g = new T.Group();
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = p.heading;
      world.add(g);
      box(
        g,
        concrete,
        0,
        5.8,
        0,
        track.width + 3,
        0.55,
        (track.length * (end - start)) / 19,
      );
      if (i % 3 === 0) {
        for (const s of [-1, 1])
          box(g, concrete, s * (track.width / 2 + 1), 2.8, 0, 0.65, 5.6, 0.65);
        box(
          g,
          new T.MeshBasicMaterial({ color: "#f8dba5" }),
          0,
          5.49,
          0,
          3,
          0.06,
          0.24,
        );
      }
    }
  }
  // Braking references for the tightest direction changes.
  const board50 = sign("50"),
    board100 = sign("100");
  let last = -1;
  for (let i = 0; i < 200; i++) {
    const t = i / 200;
    if (track.curvature(t) < 0.024 || t - last < 0.035) continue;
    last = t;
    for (const [distance, material] of [
      [35, board50],
      [65, board100],
    ]) {
      const p = track.at(t - distance / track.length, track.width / 2 + 1.8),
        g = new T.Group();
      g.position.set(p.x, p.y + 1.4, p.z);
      g.rotation.y = p.heading + Math.PI;
      world.add(g);
      add(g, new T.PlaneGeometry(1.5, 0.8), material);
    }
  }
  // Batch all static scenery in world space, including nested landmark parts.
  world.updateMatrixWorld(true);
  const batches = new Map(),
    originals = [];
  world.traverse((o) => {
    if (!o.isMesh) return;
    const key =
      o.material.uuid +
      "|" +
      !!o.geometry.index +
      "|" +
      Object.keys(o.geometry.attributes).sort().join(",");
    if (!batches.has(key)) batches.set(key, { mat: o.material, geos: [] });
    batches.get(key).geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
    originals.push(o);
  });
  for (const o of originals) {
    o.removeFromParent();
    o.geometry.dispose();
  }
  for (const { mat, geos } of batches.values()) {
    add(world, mergeGeometries(geos), mat);
    geos.forEach((g) => g.dispose());
  }
}
