import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { VEHICLES } from "./data.js";

const material = (color, roughness = 0.5, metalness = 0.2) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });
function part(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent, mat, x, y, z, w, h, d, r = 0.025) {
  return part(
    parent,
    r ? new RoundedBoxGeometry(w, h, d, 2, r) : new T.BoxGeometry(w, h, d),
    mat,
    x,
    y,
    z,
  );
}
function rod(parent, mat, a, b, r = 0.025) {
  const va = new T.Vector3(...a),
    vb = new T.Vector3(...b),
    m = part(parent, new T.CylinderGeometry(r, r, va.distanceTo(vb), 8), mat);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    vb.sub(va).normalize(),
  );
  return m;
}
function loft(parent, mat, sections) {
  const positions = [],
    indices = [];
  for (const [z, w, lo, hi] of sections)
    positions.push(-w, lo, z, w, lo, z, w, hi, z, -w, hi, z);
  for (let i = 0; i < sections.length - 1; i++)
    for (let j = 0; j < 4; j++) {
      const a = i * 4 + j,
        b = i * 4 + ((j + 1) % 4);
      indices.push(a, b, a + 4, b, b + 4, a + 4);
    }
  indices.push(0, 3, 2, 0, 2, 1);
  const n = sections.length * 4 - 4;
  indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  let g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g = g.toNonIndexed();
  g.computeVertexNormals();
  return part(parent, g, mat);
}
function label(text, bg = "#ece7d9", fg = "#1c262a") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = fg;
  ctx.font = "italic 900 84px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 68);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return new T.MeshStandardMaterial({ map: tex, roughness: 0.4 });
}
function batch(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  for (const m of [...group.children])
    if (m.isMesh) {
      const key =
        m.material.uuid +
        "|" +
        !!m.geometry.index +
        "|" +
        Object.keys(m.geometry.attributes).sort().join(",");
      if (!batches.has(key)) batches.set(key, { mat: m.material, geos: [] });
      const geo = m.geometry.clone().applyMatrix4(m.matrix);
      batches.get(key).geos.push(geo);
      group.remove(m);
      m.geometry.dispose();
    }
  for (const b of batches.values()) {
    part(group, mergeGeometries(b.geos), b.mat);
    b.geos.forEach((g) => g.dispose());
  }
}

export function createFormulaCar(profile, withDriver = true) {
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const v = VEHICLES.find((v) => v.id === profile.vehicle) || VEHICLES[0];
  const paint = new T.MeshPhysicalMaterial({
    color: profile.color || v.color,
    metalness: profile.finish === "matte" ? 0.12 : 0.5,
    roughness: profile.finish === "matte" ? 0.72 : 0.28,
    clearcoat: profile.finish === "matte" ? 0 : 1,
    clearcoatRoughness: 0.2,
  });
  const carbon = material("#151e24", 0.53, 0.5),
    rubber = material("#101316", 0.95, 0),
    metal = material("#879196", 0.25, 0.85),
    white = material("#ece8db", 0.4, 0.2),
    accent = material("#e5d16c", 0.55, 0.1);
  // Floor, sculpted monocoque, tapering engine cover and long raised nose.
  box(body, carbon, 0, 0.23, -0.15, 2.04, 0.1, 3.58, 0.06);
  loft(body, paint, [
    [-2.0, 0.12, 0.29, 0.5],
    [-1.25, 0.3, 0.28, 1.04],
    [-0.55, 0.43, 0.3, 0.97],
    [0.38, 0.42, 0.27, 0.89],
    [1.1, 0.23, 0.3, 0.68],
    [2.2, 0.12, 0.31, 0.46],
  ]);
  for (const s of [-1, 1]) {
    const pod = box(body, paint, s * 0.68, 0.58, -0.38, 0.63, 0.46, 1.8, 0.18);
    pod.rotation.y = s * 0.06;
    box(body, carbon, s * 0.7, 0.61, 0.525, 0.45, 0.25, 0.03, 0.065);
    box(body, white, s * 0.68, 0.817, -0.48, 0.09, 0.012, 1.4, 0.005);
    box(body, carbon, s * 0.96, 0.29, -0.3, 0.12, 0.1, 2.25, 0.02);
    for (let i = 0; i < 5; i++)
      box(
        body,
        carbon,
        s * 0.52,
        0.88,
        -0.72 - i * 0.1,
        0.23,
        0.018,
        0.045,
        0.008,
      );
    rod(body, carbon, [s * 0.35, 0.53, 1.15], [s * 1.08, 0.47, 1.6]);
    rod(body, carbon, [s * 0.32, 0.48, 0.55], [s * 1.08, 0.47, 1.6]);
    rod(body, carbon, [s * 0.4, 0.56, -0.94], [s * 1.08, 0.48, -1.45]);
    rod(body, carbon, [s * 0.3, 0.4, -1.95], [s * 1.08, 0.48, -1.45]);
    box(body, carbon, s * 1.02, 0.46, 0.4, 0.045, 0.48, 0.45, 0.012);
  }
  // Multi-element front wing and vertical endplates; no kart bumper or headlights.
  for (let i = 0; i < 3; i++) {
    const wing = box(
      body,
      i === 1 ? paint : carbon,
      0,
      0.27 + i * 0.065,
      2.21 + i * 0.19,
      2.68 - i * 0.12,
      0.055,
      0.26,
      0.02,
    );
    wing.rotation.x = -0.14;
  }
  for (const s of [-1, 1])
    box(body, paint, s * 1.34, 0.4, 2.4, 0.055, 0.34, 0.7, 0.025);
  box(body, white, 0, 0.64, 1.13, 0.08, 0.012, 0.75, 0.005);
  const number = part(
    body,
    new T.PlaneGeometry(0.34, 0.43),
    label(profile.number || "07"),
    0,
    0.66,
    1.45,
  );
  number.rotation.x = -Math.PI / 2 + 0.14;
  // A small cockpit opening surrounds the seated driver and protective halo.
  box(body, rubber, 0, 0.94, 0.05, 0.69, 0.035, 0.85, 0.12);
  for (const s of [-1, 1])
    box(body, paint, s * 0.41, 1.015, -0.025, 0.13, 0.19, 1.0, 0.065);
  const hoop = new T.CatmullRomCurve3([
    new T.Vector3(-0.43, 1.13, -0.45),
    new T.Vector3(-0.48, 1.3, 0.23),
    new T.Vector3(0, 1.35, 0.78),
    new T.Vector3(0.48, 1.3, 0.23),
    new T.Vector3(0.43, 1.13, -0.45),
  ]);
  part(body, new T.TubeGeometry(hoop, 28, 0.045, 7, false), carbon);
  rod(body, carbon, [0, 0.83, 1.0], [0, 1.35, 0.78], 0.041);
  loft(body, paint, [
    [-1.12, 0.13, 0.85, 1.28],
    [-0.8, 0.2, 0.93, 1.5],
    [-0.56, 0.17, 0.99, 1.47],
  ]);
  box(body, rubber, 0, 1.38, -0.535, 0.21, 0.13, 0.035, 0.05);
  if (profile.spoiler !== false) {
    for (const s of [-1, 1])
      rod(body, carbon, [s * 0.3, 0.4, -1.7], [s * 0.3, 1.32, -2.06], 0.035);
    for (let i = 0; i < 2; i++) {
      const wing = box(
        body,
        i ? paint : carbon,
        0,
        1.27 + i * 0.13,
        -2.03 - i * 0.13,
        1.97,
        0.065,
        0.35,
        0.025,
      );
      wing.rotation.x = 0.13;
    }
    for (const s of [-1, 1])
      box(body, paint, s * 0.99, 1.25, -2.09, 0.045, 0.57, 0.64, 0.02);
  }
  for (let i = 0; i < 5; i++) {
    const fin = box(
      body,
      carbon,
      (i - 2) * 0.19,
      0.31,
      -1.9,
      0.035,
      0.25,
      0.5,
      0.01,
    );
    fin.rotation.x = 0.22;
  }
  const exhaust = part(
    body,
    new T.CylinderGeometry(0.075, 0.075, 0.38, 14),
    metal,
    0,
    0.61,
    -2,
  );
  exhaust.rotation.x = Math.PI / 2;
  box(
    body,
    new T.MeshStandardMaterial({
      color: "#f14736",
      emissive: "#fb3525",
      emissiveIntensity: 1.5,
    }),
    0,
    0.42,
    -2.17,
    0.14,
    0.12,
    0.025,
    0.01,
  );
  const wheels = [];
  for (const s of [-1, 1])
    for (const z of [-1.46, 1.61]) {
      const pivot = new T.Group();
      pivot.position.set(s * 1.12, 0.455, z);
      root.add(pivot);
      const tire = part(
        pivot,
        new T.CylinderGeometry(0.445, 0.445, z < 0 ? 0.55 : 0.44, 28),
        rubber,
      );
      tire.rotation.z = Math.PI / 2;
      const wheel = new T.Group();
      pivot.add(wheel);
      wheels.push({ pivot, wheel, front: z > 0 });
      const x = s * (z < 0 ? 0.283 : 0.227);
      const hub = part(
        wheel,
        new T.CylinderGeometry(0.265, 0.265, 0.026, 24),
        carbon,
        x,
        0,
        0,
      );
      hub.rotation.z = Math.PI / 2;
      const ring = part(
        wheel,
        new T.TorusGeometry(0.35, 0.012, 5, 36),
        accent,
        x + s * 0.006,
        0,
        0,
      );
      ring.rotation.y = Math.PI / 2;
      const rim = part(
        wheel,
        new T.TorusGeometry(0.251, 0.018, 5, 24),
        metal,
        x + s * 0.017,
        0,
        0,
      );
      rim.rotation.y = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spoke = box(
          wheel,
          metal,
          x + s * 0.026,
          Math.cos(a) * 0.115,
          Math.sin(a) * 0.115,
          0.025,
          0.031,
          0.23,
          0.005,
        );
        spoke.rotation.x = -a;
      }
      const nut = part(
        wheel,
        new T.CylinderGeometry(0.07, 0.07, 0.025, 6),
        accent,
        x + s * 0.046,
        0,
        0,
      );
      nut.rotation.z = Math.PI / 2;
      batch(wheel);
    }
  if (withDriver) {
    const suit = material(profile.suit || "#e9e3d8", 0.88, 0),
      helmet = new T.MeshPhysicalMaterial({
        color: profile.helmet || profile.color,
        roughness: 0.25,
        metalness: 0.25,
        clearcoat: 1,
      });
    box(body, suit, 0, 0.99, -0.12, 0.5, 0.26, 0.42, 0.1);
    for (const s of [-1, 1]) {
      rod(body, suit, [s * 0.22, 1.0, -0.06], [s * 0.23, 0.99, 0.39], 0.085);
      box(body, carbon, s * 0.19, 1.01, 0.42, 0.12, 0.11, 0.15, 0.04);
    }
    const head = part(
      body,
      new T.SphereGeometry(0.265, 24, 18),
      helmet,
      0,
      1.31,
      -0.13,
    );
    head.scale.y = 1.06;
    part(
      body,
      new T.SphereGeometry(
        0.27,
        24,
        12,
        0,
        Math.PI * 2,
        Math.PI * 0.34,
        Math.PI * 0.27,
      ),
      new T.MeshPhysicalMaterial({
        color: "#101f2a",
        roughness: 0.12,
        metalness: 0.72,
        clearcoat: 1,
      }),
      0,
      1.31,
      -0.13,
    );
    box(body, white, 0, 1.575, -0.15, 0.055, 0.012, 0.15, 0.006);
    box(body, carbon, 0, 1.01, 0.45, 0.38, 0.16, 0.07, 0.03);
    for (const s of [-1, 1])
      box(body, accent, s * 0.12, 1.02, 0.49, 0.026, 0.026, 0.01, 0.003);
  }
  const shadow = document.createElement("canvas");
  shadow.width = shadow.height = 64;
  const ctx = shadow.getContext("2d"),
    grad = ctx.createRadialGradient(32, 32, 5, 32, 32, 32);
  grad.addColorStop(0, "rgba(0,0,0,.55)");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const contact = part(
    root,
    new T.PlaneGeometry(3.7, 5.8),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(shadow),
      transparent: true,
      depthWrite: false,
    }),
    0,
    0.03,
    0,
  );
  contact.rotation.x = -Math.PI / 2;
  contact.castShadow = false;
  const shield = part(
    root,
    new T.SphereGeometry(2.0, 20, 12),
    new T.MeshBasicMaterial({
      color: "#78e2e9",
      wireframe: true,
      transparent: true,
      opacity: 0.17,
    }),
    0,
    0.8,
    0,
  );
  shield.scale.z = 1.5;
  shield.visible = false;
  const jets = [];
  for (const s of [-1, 1]) {
    const jet = part(
      root,
      new T.ConeGeometry(0.1, 1.0, 8),
      new T.MeshBasicMaterial({
        color: "#81e6ff",
        transparent: true,
        opacity: 0.75,
      }),
      s * 0.17,
      0.5,
      -2.6,
    );
    jet.rotation.x = -Math.PI / 2;
    jet.visible = false;
    jets.push(jet);
  }
  batch(body);
  root.userData = { body, wheels, shield, jets };
  return root;
}
