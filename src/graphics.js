import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { VEHICLES } from "./data.js";
const mat = (color, roughness = 0.7, metalness = 0) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });
const seeded =
  (seed = 42) =>
  () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
function mesh(g, m, parent, x = 0, y = 0, z = 0) {
  const o = new T.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function box(parent, m, x, y, z, w, h, d, r = 0) {
  return mesh(
    r ? new RoundedBoxGeometry(w, h, d, 2, r) : new T.BoxGeometry(w, h, d),
    m,
    parent,
    x,
    y,
    z,
  );
}
function cylinder(parent, m, x, y, z, r1, r2, h, segments = 16) {
  return mesh(new T.CylinderGeometry(r1, r2, h, segments), m, parent, x, y, z);
}
function textTexture(
  text,
  bg = "#191e20",
  fg = "#f5f1e7",
  width = 512,
  height = 128,
) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = fg;
  ctx.font = `italic 900 ${height * 0.65}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height * 0.53);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
export function createKart(profile, withDriver = true) {
  const g = new T.Group(),
    v = VEHICLES.find((v) => v.id === profile.vehicle) || VEHICLES[0];
  const paint = new T.MeshPhysicalMaterial({
    color: profile.color || v.color,
    metalness: profile.finish === "matte" ? 0.1 : 0.55,
    roughness: profile.finish === "matte" ? 0.8 : 0.27,
    clearcoat: profile.finish === "matte" ? 0 : 1,
    clearcoatRoughness: 0.18,
  });
  const dark = mat("#1d2429", 0.45, 0.45),
    rubber = mat("#141718", 0.94),
    chrome = mat("#9da7a8", 0.25, 0.85),
    orange = mat("#ed5b2c", 0.4, 0.4),
    white = mat("#e5e5da", 0.4);
  const body = new T.Group();
  g.add(body);
  g.userData.body = body;
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const sc = shadowCanvas.getContext("2d"),
    gradient = sc.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, "rgba(0,0,0,.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  sc.fillStyle = gradient;
  sc.fillRect(0, 0, 64, 64);
  const contact = mesh(
    new T.PlaneGeometry(3.7, 4.5),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
    }),
    g,
    0,
    0.032,
    0,
  );
  contact.rotation.x = -Math.PI / 2;
  contact.castShadow = false;
  contact.receiveShadow = false;
  box(body, dark, 0, 0.4, 0, 1.5, 0.19, 2.8, 0.07);
  for (const s of [-1, 1]) {
    box(body, paint, s * 0.8, 0.65, 0.06, 0.38, 0.5, 1.65, 0.12);
    box(body, dark, s * 0.84, 0.69, -0.16, 0.39, 0.035, 0.7);
    for (let i = 0; i < 5; i++)
      box(body, chrome, s * 0.84, 0.71, -0.42 + i * 0.12, 0.26, 0.015, 0.04);
    box(body, chrome, s * 0.63, 0.35, 0.1, 0.06, 0.06, 2.8, 0.025);
    box(body, dark, s * 0.81, 0.4, -0.93, 0.6, 0.12, 0.16, 0.02);
  }
  const nose = box(
    body,
    paint,
    0,
    0.59,
    1.05,
    v.body === 1 ? 1.14 : v.body === 2 ? 0.74 : 0.93,
    0.35,
    v.body === 2 ? 1.23 : 1.05,
    0.16,
  );
  nose.rotation.x = -0.08;
  box(body, white, 0, 0.779, 1.13, 0.16, 0.008, 0.8);
  box(body, dark, 0, 0.34, 1.64, 1.78, 0.12, 0.22, 0.05);
  box(body, paint, 0, 0.52, 1.51, 1.54, 0.19, 0.26, 0.06);
  const numberMat = new T.MeshStandardMaterial({
    map: textTexture(profile.number || "07", "#eeeade", "#191e20", 128, 128),
    roughness: 0.45,
  });
  const num = mesh(
    new T.PlaneGeometry(0.36, 0.38),
    numberMat,
    body,
    0,
    0.79,
    1.09,
  );
  num.rotation.x = -Math.PI / 2 - 0.08;
  for (const s of [-1, 1]) {
    const light = box(
      body,
      new T.MeshStandardMaterial({
        color: "#fcffec",
        emissive: "#fdf1bf",
        emissiveIntensity: 2,
      }),
      s * 0.59,
      0.6,
      1.656,
      0.26,
      0.042,
      0.025,
      0.008,
    );
  }
  box(body, dark, 0, 0.66, -0.82, 1.05, 0.42, 0.55, 0.04);
  for (let i = 0; i < 7; i++)
    box(body, chrome, 0, 0.82 + i * 0.02, -0.82, 0.8, 0.012, 0.36);
  for (const s of [-1, 1]) {
    const exhaust = cylinder(
      body,
      chrome,
      s * 0.47,
      0.59,
      -1.28,
      0.075,
      0.08,
      0.45,
    );
    exhaust.rotation.x = Math.PI / 2;
    const hole = cylinder(
      body,
      rubber,
      s * 0.47,
      0.59,
      -1.515,
      0.061,
      0.061,
      0.01,
    );
    hole.rotation.x = Math.PI / 2;
  }
  if (profile.spoiler !== false) {
    for (const s of [-1, 1])
      box(body, chrome, s * 0.55, 0.99, -1.14, 0.05, 0.55, 0.1);
    box(body, paint, 0, 1.29, -1.19, 1.9, 0.1, 0.43, 0.025);
    for (const s of [-1, 1])
      box(body, dark, s * 0.94, 1.29, -1.19, 0.045, 0.28, 0.47, 0.015);
  }
  const seat = box(body, rubber, 0, 0.81, -0.26, 0.68, 0.7, 0.55, 0.1);
  seat.rotation.x = -0.15;
  box(body, rubber, 0, 0.62, 0.04, 0.66, 0.16, 0.64, 0.05);
  const wheels = [];
  for (const s of [-1, 1])
    for (const z of [-0.94, 0.99]) {
      const pivot = new T.Group();
      pivot.position.set(s * 1.01, 0.43, z);
      g.add(pivot);
      const tire = cylinder(pivot, rubber, 0, 0, 0, 0.4, 0.4, 0.36, 28);
      tire.rotation.z = Math.PI / 2;
      const wheel = new T.Group();
      pivot.add(wheel);
      wheels.push({ pivot, wheel, front: z > 0 });
      const hub = cylinder(
        wheel,
        chrome,
        s * 0.19,
        0,
        0,
        0.245,
        0.245,
        0.026,
        24,
      );
      hub.rotation.z = Math.PI / 2;
      const inset = cylinder(wheel, dark, s * 0.21, 0, 0, 0.2, 0.2, 0.03, 24);
      inset.rotation.z = Math.PI / 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spoke = box(
          wheel,
          chrome,
          s * 0.233,
          Math.cos(a) * 0.113,
          Math.sin(a) * 0.113,
          0.025,
          0.047,
          0.235,
          0.007,
        );
        spoke.rotation.x = -a;
      }
      const cap = cylinder(wheel, orange, s * 0.253, 0, 0, 0.075, 0.075, 0.015);
      cap.rotation.z = Math.PI / 2;
      for (const off of [-0.105, 0, 0.105]) {
        const tread = mesh(
          new T.TorusGeometry(0.401, 0.008, 4, 28),
          dark,
          pivot,
          off,
          0,
          0,
        );
        tread.rotation.y = Math.PI / 2;
      }
      const axle = cylinder(body, chrome, s * 0.65, 0.38, z, 0.045, 0.045, 0.8);
      axle.rotation.z = Math.PI / 2;
      const suspension = mesh(
        new T.TorusGeometry(0.065, 0.016, 5, 8, Math.PI * 10),
        orange,
        body,
        s * 0.69,
        0.55,
        z,
      );
      suspension.rotation.x = 0.4;
    }
  if (withDriver) {
    const suit = mat(profile.suit || "#eee7d7", 0.88),
      helmet = new T.MeshPhysicalMaterial({
        color: profile.helmet || profile.color,
        roughness: 0.28,
        metalness: 0.3,
        clearcoat: 1,
      });
    const torso = box(body, suit, 0, 1.07, -0.12, 0.61, 0.72, 0.4, 0.16);
    torso.rotation.x = -0.13;
    for (const s of [-1, 1]) {
      const arm = box(body, suit, s * 0.38, 1.08, 0.21, 0.2, 0.22, 0.67, 0.09);
      arm.rotation.x = 0.3;
      arm.rotation.y = s * 0.28;
      const leg = box(body, suit, s * 0.19, 0.69, 0.46, 0.24, 0.22, 0.69, 0.08);
      box(body, dark, s * 0.22, 0.65, 0.87, 0.26, 0.2, 0.35, 0.07);
      box(body, dark, s * 0.29, 1.02, 0.51, 0.17, 0.17, 0.22, 0.05);
      box(body, orange, s * 0.19, 1.15, 0.107, 0.055, 0.4, 0.018);
    }
    const head = mesh(
      new T.SphereGeometry(0.35, 28, 20),
      helmet,
      body,
      0,
      1.65,
      -0.085,
    );
    head.scale.set(1, 1.08, 1);
    const visor = mesh(
      new T.SphereGeometry(
        0.357,
        28,
        12,
        0,
        Math.PI * 2,
        0.33 * Math.PI,
        0.32 * Math.PI,
      ),
      new T.MeshPhysicalMaterial({
        color: "#142a33",
        metalness: 0.75,
        roughness: 0.12,
        clearcoat: 1,
      }),
      body,
      0,
      1.65,
      -0.085,
    );
    box(body, white, 0, 1.97, -0.04, 0.075, 0.018, 0.26, 0.007);
    const steering = mesh(
      new T.TorusGeometry(0.23, 0.027, 8, 20),
      dark,
      body,
      0,
      1.02,
      0.54,
    );
    steering.rotation.x = -0.6;
    const stem = cylinder(body, chrome, 0, 0.85, 0.49, 0.025, 0.025, 0.43);
    stem.rotation.x = -0.4;
  }
  const shield = mesh(
    new T.SphereGeometry(1.8, 20, 12),
    new T.MeshBasicMaterial({
      color: "#7ae6e7",
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    }),
    g,
    0,
    0.6,
    0,
  );
  shield.visible = false;
  const jets = [];
  for (const s of [-1, 1]) {
    const jet = mesh(
      new T.ConeGeometry(0.12, 0.95, 8),
      new T.MeshBasicMaterial({
        color: "#80e6ff",
        transparent: true,
        opacity: 0.8,
      }),
      g,
      s * 0.47,
      0.59,
      -1.92,
    );
    jet.rotation.x = -Math.PI / 2;
    jet.visible = false;
    jets.push(jet);
  }
  // Bake stationary body parts by material; wheels and effects remain animated.
  body.updateMatrixWorld(true);
  const batches = new Map();
  for (const child of [...body.children])
    if (child.isMesh) {
      const key =
        child.material.uuid +
        "|" +
        Boolean(child.geometry.index) +
        "|" +
        Object.keys(child.geometry.attributes).sort().join(",");
      if (!batches.has(key))
        batches.set(key, { material: child.material, geos: [] });
      const geo = child.geometry.clone();
      geo.applyMatrix4(child.matrix);
      batches.get(key).geos.push(geo);
      body.remove(child);
      child.geometry.dispose();
    }
  for (const { material, geos } of batches.values()) {
    const merged = mergeGeometries(geos);
    if (merged) mesh(merged, material, body);
    geos.forEach((g) => g.dispose());
  }
  g.userData = { ...g.userData, wheels, shield, jets };
  return g;
}
function ribbon(track, left, right, lift, material) {
  const positions = [],
    uv = [],
    indices = [];
  const n = track.samples;
  for (let i = 0; i <= n; i++) {
    for (const offset of [left, right]) {
      const p = track.at(i / n, offset);
      positions.push(p.x, p.y + lift, p.z);
      uv.push(offset === left ? 0 : 1, ((i / n) * track.length) / 12);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, material);
  m.receiveShadow = true;
  return m;
}
function batchBoxes(group, geometries, material) {
  if (!geometries.length) return;
  const geo = mergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  const m = mesh(geo, material, group);
  return m;
}
export class Graphics {
  constructor(canvas, settings) {
    this.settings = settings;
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor("#bdd5d8");
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.scene = new T.Scene();
    this.scene.environmentIntensity = 0.55;
    this.renderer.toneMappingExposure = 0.95;
    this.camera = new T.PerspectiveCamera(42, 1, 0.1, 1600);
    this.camera.position.set(8, 5, 8);
    const pmrem = new T.PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this.environment;
    room.dispose();
    pmrem.dispose();
    this.hemi = new T.HemisphereLight("#dff2ff", "#a29677", 2.3);
    this.scene.add(this.hemi);
    this.sun = new T.DirectionalLight("#ffe4ba", 4);
    this.sun.position.set(-50, 95, 40);
    this.sun.castShadow = true;
    this.sun.shadow.camera.left = -45;
    this.sun.shadow.camera.right = 45;
    this.sun.shadow.camera.top = 45;
    this.sun.shadow.camera.bottom = -45;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 230;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.025;
    this.scene.add(this.sun, this.sun.target);
    this.group = new T.Group();
    this.scene.add(this.group);
    this.karts = [];
    this.time = 0;
    this.weather = "clear";
    this.mode = "menu";
    this.cameraReady = false;
    this.particles = [];
    this.particlePool = [];
    for (let i = 0; i < 100; i++) {
      const m = new T.Mesh(
        new T.SphereGeometry(0.1, 5, 4),
        new T.MeshBasicMaterial({
          color: "#eee5c9",
          transparent: true,
          opacity: 0.4,
        }),
      );
      m.visible = false;
      this.scene.add(m);
      this.particlePool.push(m);
    }
    this.applyQuality();
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }
  applyQuality() {
    const levels = {
        low: [1, 512],
        medium: [1.25, 1024],
        high: [1.6, 2048],
        ultra: [2, 4096],
      },
      [pixel, shadow] = levels[this.settings.quality] || levels.high;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixel));
    this.renderer.shadowMap.enabled = this.settings.quality !== "low";
    if (this.sun) {
      this.sun.shadow.mapSize.set(shadow, shadow);
      if (this.sun.shadow.map) {
        this.sun.shadow.map.dispose();
        this.sun.shadow.map = null;
      }
    }
    this.resize();
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
  disposeGroup(group) {
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    group.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m);
          for (const v of Object.values(m))
            if (v?.isTexture && v !== this.environment) textures.add(v);
        }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    group.clear();
  }
  buildWorld(track, weather = "clear") {
    this.disposeGroup(this.group);
    this.track = track;
    this.weather = weather;
    const night = track.data.theme === "night",
      canyon = track.data.theme === "canyon",
      rain = weather === "rain",
      fog = weather === "fog";
    this.night = night;
    this.scene.background = new T.Color(
      night ? "#162335" : rain ? "#91a3ad" : canyon ? "#d3c2ad" : "#bbd4d5",
    );
    this.scene.fog = new T.Fog(
      this.scene.background,
      fog ? 28 : night ? 85 : 160,
      fog ? 155 : night ? 490 : 780,
    );
    this.hemi.color.set(night ? "#728eb9" : "#dff2ff");
    this.hemi.groundColor.set(canyon ? "#b58058" : "#b6ad90");
    this.hemi.intensity = night ? 0.8 : rain ? 1.15 : 1.25;
    this.sun.color.set(night ? "#91b5ec" : "#ffe2b2");
    this.sun.intensity = night ? 0.9 : rain ? 1.1 : 2.6;
    const ground = mat(
      canyon ? "#a87953" : night ? "#313e42" : "#939f73",
      0.97,
    );
    const earth = mesh(
      new T.PlaneGeometry(1800, 1800),
      ground,
      this.group,
      0,
      -1.2,
      0,
    );
    earth.rotation.x = -Math.PI / 2;
    if (!canyon) {
      const sea = mesh(
        new T.PlaneGeometry(2000, 2000),
        new T.MeshPhysicalMaterial({
          color: night ? "#172c39" : "#468f9a",
          metalness: 0.4,
          roughness: 0.28,
          clearcoat: 1,
        }),
        this.group,
        -1100,
        -0.7,
        0,
      );
      sea.rotation.x = -Math.PI / 2;
      const beach = box(
        this.group,
        mat("#c2b694"),
        -129,
        -0.8,
        0,
        50,
        0.5,
        1400,
      );
      // Original harbor silhouettes: boats, breakwater and a coastal beacon.
      for (let i = 0; i < 6; i++) {
        const boat = new T.Group();
        boat.position.set(-183 - i * 18, -0.3, -80 + i * 37);
        boat.rotation.y = 0.3 + i * 0.35;
        this.group.add(boat);
        const hull = mesh(
          new T.SphereGeometry(1, 12, 8),
          mat("#e3e1d3", 0.4),
          boat,
        );
        hull.scale.set(1.3, 0.55, 4.5);
        box(boat, mat("#dedbc9"), 0, 8, 0, 0.09, 16, 0.09);
        const sailGeo = new T.BufferGeometry();
        sailGeo.setAttribute(
          "position",
          new T.Float32BufferAttribute([0, 1, 0, 0, 15, 0, 0, 1, 5.5], 3),
        );
        sailGeo.computeVertexNormals();
        mesh(
          sailGeo,
          new T.MeshStandardMaterial({
            color: i % 2 ? "#efe4c9" : "#d88662",
            side: T.DoubleSide,
          }),
          boat,
        );
      }
      const beacon = new T.Group();
      beacon.position.set(-137, 0, 125);
      this.group.add(beacon);
      cylinder(beacon, mat("#d6cbb1"), 0, 8, 0, 1.5, 2.6, 16, 16);
      cylinder(beacon, mat("#c96743"), 0, 13, 0, 1.85, 1.85, 2);
      cylinder(beacon, mat("#34434a"), 0, 16.5, 0, 2.1, 2.1, 0.5);
      cylinder(beacon, mat("#d8b574"), 0, 17.5, 0, 1.4, 1.4, 1.6);
      cylinder(beacon, mat("#354449"), 0, 18.8, 0, 0, 2.2, 1.3);
      // Fine parallel wave crests, batched into one geometry.
      const waveGeo = [],
        rng = seeded(76);
      for (let i = 0; i < 110; i++) {
        const geo = new T.PlaneGeometry(4 + rng() * 35, 0.16);
        geo.rotateX(-Math.PI / 2);
        geo.translate(-165 - rng() * 260, -0.67, (rng() - 0.5) * 900);
        waveGeo.push(geo);
      }
      batchBoxes(
        this.group,
        waveGeo,
        new T.MeshBasicMaterial({
          color: "#a5cace",
          transparent: true,
          opacity: night ? 0.08 : 0.26,
        }),
      );
    }
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d"),
      rng = seeded();
    ctx.fillStyle = "#55585a";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18000; i++) {
      const v = 50 + Math.floor(rng() * 68);
      ctx.fillStyle = `rgba(${v},${v},${v},0.4)`;
      ctx.fillRect(rng() * 256, rng() * 256, 1 + rng() * 2, 1 + rng() * 2);
    }
    const asphalt = new T.CanvasTexture(c);
    asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping;
    asphalt.anisotropy = 4;
    asphalt.colorSpace = T.SRGBColorSpace;
    this.roadMat = new T.MeshStandardMaterial({
      color: rain ? "#8c969b" : "#a2a5a8",
      map: asphalt,
      roughness: rain ? 0.22 : 0.94,
      metalness: rain ? 0.55 : 0.08,
      side: T.DoubleSide,
    });
    this.group.add(
      ribbon(
        track,
        -track.width / 2 - 2.8,
        track.width / 2 + 2.8,
        -0.02,
        mat(canyon ? "#c19774" : "#bdb9a8"),
      ),
    );
    this.group.add(
      ribbon(track, -track.width / 2, track.width / 2, 0, this.roadMat),
    );
    for (const side of [-1, 1])
      this.group.add(
        ribbon(
          track,
          side * (track.width / 2 - 0.15) - 0.06,
          side * (track.width / 2 - 0.15) + 0.06,
          0.014,
          mat("#f4efe1"),
        ),
      );
    const curbGeo = [[], []],
      barrierGeo = [[], []],
      dashGeo = [];
    for (let i = 0; i < track.samples; i += 3) {
      for (const side of [-1, 1]) {
        const p = track.at(i / track.samples, side * (track.width / 2 + 0.35));
        const geo = new T.BoxGeometry(
          0.7,
          0.13,
          (track.length / track.samples) * 3 + 0.03,
        );
        geo.rotateY(p.heading);
        geo.translate(p.x, p.y + 0.025, p.z);
        curbGeo[Math.floor(i / 3) % 2].push(geo);
        if (i % 9 === 0) {
          const q = track.at(
            i / track.samples,
            side * (track.width / 2 + 3.25),
          );
          const g = new T.BoxGeometry(
            0.5,
            0.8,
            (track.length / track.samples) * 9 + 0.08,
          );
          g.rotateY(q.heading);
          g.translate(q.x, q.y + 0.32, q.z);
          barrierGeo[Math.floor(i / 9) % 7 === 0 ? 1 : 0].push(g);
        }
      }
      if (i % 12 === 0) {
        const p = track.at(i / track.samples);
        const g = new T.BoxGeometry(0.09, 0.012, 2);
        g.rotateY(p.heading);
        g.translate(p.x, p.y + 0.013, p.z);
        dashGeo.push(g);
      }
    }
    batchBoxes(this.group, curbGeo[0], mat("#e26f4c"));
    batchBoxes(this.group, curbGeo[1], mat("#e9e3d4"));
    batchBoxes(this.group, barrierGeo[0], mat("#d6d3c8"));
    batchBoxes(this.group, barrierGeo[1], mat("#d95e36"));
    batchBoxes(this.group, dashGeo, mat("#c6c6b9"));
    const start = track.at(0.008),
      startGroup = new T.Group();
    startGroup.position.set(start.x, start.y, start.z);
    startGroup.rotation.y = start.heading;
    this.group.add(startGroup);
    for (let x = 0; x < 14; x++)
      for (let z = 0; z < 2; z++)
        box(
          startGroup,
          mat((x + z) % 2 ? "#eeeeea" : "#252e30"),
          x - track.width / 2 + 0.5,
          0.026,
          z * 0.5,
          1,
          0.02,
          0.5,
        );
    for (const side of [-1, 1])
      box(
        startGroup,
        mat("#202c30"),
        side * (track.width / 2 + 1),
        3.3,
        0,
        0.38,
        6.6,
        0.4,
      );
    const arch = box(
      startGroup,
      mat("#222c2e"),
      0,
      6.6,
      0,
      track.width + 3,
      1.1,
      0.6,
    );
    const banner = mesh(
      new T.PlaneGeometry(track.width + 2.7, 0.95),
      new T.MeshBasicMaterial({
        map: textTexture(
          "APEX   /   COASTLINE RACING",
          "#20292c",
          "#f0ecdf",
          1536,
          128,
        ),
      }),
      startGroup,
      0,
      6.61,
      0.31,
    );
    for (const t of [0.23, 0.72]) {
      const p = track.at(t),
        g = new T.Group();
      g.position.set(p.x, p.y + 0.03, p.z);
      g.rotation.y = p.heading;
      this.group.add(g);
      for (let i = 0; i < 4; i++) {
        const stripe = box(
          g,
          new T.MeshStandardMaterial({
            color: "#b8d8b0",
            emissive: "#91bb7d",
            emissiveIntensity: night ? 1 : 0.35,
          }),
          0,
          0.01,
          -i * 0.7,
          5,
          0.025,
          0.24,
        );
      }
    }
    this.pickupMeshes = [];
    for (const t of [0.15, 0.39, 0.64, 0.86]) {
      const p = track.at(t);
      const item = mesh(
        new T.OctahedronGeometry(0.8),
        new T.MeshStandardMaterial({
          color: "#f9cf6e",
          emissive: "#e6a64c",
          emissiveIntensity: 0.75,
          metalness: 0.6,
          roughness: 0.25,
        }),
        this.group,
        p.x,
        p.y + 1.7,
        p.z,
      );
      this.pickupMeshes.push(item);
    }
    const random = seeded(canyon ? 94 : 13);
    const treePositions = [];
    for (let i = 0; i < 130; i++) {
      const t = random(),
        side = random() > 0.4 ? 1 : -1,
        offset = side * (track.width / 2 + 7 + random() * 34);
      const p = track.at(t, offset);
      if (p.x < -119 && !canyon) continue;
      if (track.nearest(p.x, p.z).distance < track.width / 2 + 5) continue;
      treePositions.push(p);
    }
    if (canyon) {
      for (const p of treePositions) {
        const rock = mesh(
          new T.DodecahedronGeometry(2 + random() * 6, 0),
          mat(["#af7e58", "#a36b47", "#bc906c"][Math.floor(random() * 3)]),
          this.group,
          p.x,
          p.y,
          p.z,
        );
        rock.scale.set(1, 1.3 + random() * 2, 1);
        rock.rotation.y = random() * 6;
      }
    } else
      for (const [i, p] of treePositions.entries())
        this.palm(p.x, p.y, p.z, 0.75 + random() * 0.65, i);
    // The paddock, grandstand, and original track sponsors.
    const p = track.at(0.055, 28),
      building = new T.Group();
    building.position.set(p.x, p.y, p.z);
    building.rotation.y = p.heading;
    this.group.add(building);
    box(building, mat("#d7d3c5"), 0, 2, 0, 12, 4, 25);
    box(building, mat("#33484f", 0.2, 0.5), -6.03, 2.6, 0, 0.04, 1.6, 23);
    box(building, mat("#383f3e"), 0, 4.15, 0, 14, 0.35, 27);
    for (let i = 0; i < 7; i++)
      box(building, mat("#9ba6a1"), -6.1, 1.3, -10 + i * 3.3, 0.03, 2.2, 2.4);
    const signs = [
      "APEX /",
      "SALT MOTOR CO.",
      "FIND YOUR LINE",
      "VORTEX RACING",
    ];
    for (let i = 0; i < 12; i++) {
      const p = track.at(0.045 + i * 0.079, track.width / 2 + 3.6),
        g = new T.Group();
      g.position.set(p.x, p.y + 1, p.z);
      g.rotation.y = p.heading - Math.PI / 2;
      this.group.add(g);
      box(g, mat("#273436"), 0, 0, 0, 7, 1.25, 0.12);
      const face = mesh(
        new T.PlaneGeometry(6.8, 1.1),
        new T.MeshBasicMaterial({
          map: textTexture(
            signs[i % 4],
            i % 3 ? "#263435" : "#d96337",
            "#f6f0df",
            768,
            128,
          ),
          side: T.DoubleSide,
        }),
        g,
        0,
        0,
        0.07,
      );
    }
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2,
        rad = 340 + random() * 100,
        x = 70 + Math.cos(a) * rad,
        z = Math.sin(a) * rad;
      if (x < -120 && !canyon) continue;
      if (night) {
        const h = 20 + random() * 80,
          b = box(
            this.group,
            mat("#283b50", 0.4, 0.35),
            x,
            h / 2 - 1,
            z,
            12 + random() * 15,
            h,
            12 + random() * 15,
          );
        const windows = [];
        for (let j = 2; j < h; j += 3) {
          const geo = new T.BoxGeometry(10, 0.38, 13);
          geo.translate(x, j, z);
          windows.push(geo);
        }
        batchBoxes(
          this.group,
          windows,
          new T.MeshBasicMaterial({ color: i % 3 ? "#849caf" : "#e5a968" }),
        );
      } else {
        const rock = mesh(
          new T.ConeGeometry(65 + random() * 60, 60 + random() * 110, 7),
          mat(canyon ? "#ba8a67" : "#809591"),
          this.group,
          x,
          25,
          z,
        );
        rock.rotation.y = random() * 6;
      }
    }
    if (night) {
      for (let i = 0; i < 24; i++) {
        const p = track.at(i / 24, track.width / 2 + 4);
        box(this.group, mat("#3d4952"), p.x, p.y + 4, p.z, 0.13, 8, 0.13);
        box(
          this.group,
          new T.MeshBasicMaterial({ color: "#f4d6a1" }),
          p.x,
          p.y + 8,
          p.z,
          1.3,
          0.12,
          0.4,
        );
      }
    }
    this.makeRain();
    this.cameraReady = false;
  }
  palm(x, y, z, scale, index) {
    const g = new T.Group();
    g.position.set(x, y - 0.3, z);
    g.scale.setScalar(scale);
    this.group.add(g);
    const trunk = mesh(
      new T.CylinderGeometry(0.18, 0.34, 7, 7),
      mat("#8c8064"),
      g,
      0.3,
      3.4,
      0,
    );
    trunk.rotation.z = -0.08;
    const leafMat = mat(index % 2 ? "#4f6651" : "#5e7752", 0.85);
    leafMat.side = T.DoubleSide;
    const leafGeometries = [];
    for (let j = 0; j < 7; j++) {
      const angle = (j / 7) * Math.PI * 2 + index,
        verts = [],
        inds = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6,
          dist = t * 4,
          w = Math.sin(t * Math.PI) * 0.55,
          yy = 7.05 + Math.sin(t * Math.PI) * 1.1 - t * 1.3;
        for (const s of [-1, 1])
          verts.push(
            0.55 + Math.sin(angle) * dist + Math.cos(angle) * w * s,
            yy,
            Math.cos(angle) * dist - Math.sin(angle) * w * s,
          );
        if (i < 6) {
          const a = i * 2;
          inds.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
      geo.setIndex(inds);
      geo.computeVertexNormals();
      leafGeometries.push(geo);
    }
    mesh(mergeGeometries(leafGeometries), leafMat, g);
    leafGeometries.forEach((g) => g.dispose());
  }
  makeRain() {
    const pos = new Float32Array(700 * 3);
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = (Math.random() - 0.5) * 80;
      pos[i + 1] = Math.random() * 35;
      pos[i + 2] = (Math.random() - 0.5) * 80;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    this.rain = new T.Points(
      geo,
      new T.PointsMaterial({
        color: "#cde6ef",
        size: 0.12,
        transparent: true,
        opacity: 0.65,
      }),
    );
    this.rain.visible = this.weather === "rain";
    this.group.add(this.rain);
  }
  setKarts(profiles) {
    for (const g of this.karts) {
      this.scene.remove(g);
      this.disposeGroup(g);
    }
    this.karts = profiles.map((p) => {
      const g = createKart(p);
      this.scene.add(g);
      return g;
    });
    this.cameraReady = false;
  }
  updateKart(g, k, dt) {
    g.position.set(k.x, k.y + 0.02, k.z);
    g.rotation.y = k.heading;
    g.userData.body.rotation.z = k.roll || 0;
    g.userData.body.rotation.x = k.pitch || 0;
    for (const w of g.userData.wheels) {
      w.pivot.rotation.y = w.front ? (k.steer || 0) * 0.32 : 0;
      w.wheel.rotation.x += ((k.speed || 0) * dt) / 0.4;
    }
    g.userData.shield.visible = k.shield > 0;
    for (const jet of g.userData.jets) {
      jet.visible = k.boostTime > 0;
      jet.scale.y = 0.75 + Math.sin(this.time * 50) * 0.25;
    }
  }
  render(dt, race, profile, page, replayFrame = null) {
    this.time += dt;
    const racing =
      !!race && ["race", "pause", "results", "replay"].includes(page);
    let p;
    if (racing) {
      const states = replayFrame?.karts || race.karts;
      states.forEach((k, i) => {
        if (this.karts[i]) this.updateKart(this.karts[i], k, dt);
      });
      p = states[0];
    } else {
      p = { ...this.track.at(0.9, -1.6), speed: 0, steer: 0.22 };
      this.updateKart(this.karts[0], p, dt);
    }
    const target = new T.Vector3(p.x, p.y + 0.85, p.z),
      pos = new T.Vector3(),
      look = new T.Vector3();
    if (!racing) {
      const orbit = this.settings.reducedMotion
        ? 0
        : Math.sin(this.time * 0.13) * 0.06;
      const a = p.heading - 1.0 + orbit;
      pos.set(p.x + Math.sin(a) * 8.8, p.y + 3.4, p.z + Math.cos(a) * 8.8);
      const right = new T.Vector3(Math.cos(a), 0, -Math.sin(a));
      look.copy(target).addScaledVector(right, innerWidth < 700 ? -0.1 : -1.8);
      look.y -= 0.6;
      this.camera.fov = page === "garage" || page === "driver" ? 39 : 42;
    } else {
      const mode = page === "replay" ? 3 : profile.settings.camera;
      const forward = new T.Vector3(
        Math.sin(p.heading),
        0,
        Math.cos(p.heading),
      );
      if (mode === 0) {
        pos
          .copy(target)
          .addScaledVector(forward, -7.4 - Math.abs(p.speed) * 0.045);
        pos.y += 3.2;
        look.copy(target).addScaledVector(forward, 6);
      }
      if (mode === 1) {
        pos.copy(target).addScaledVector(forward, 0.4);
        pos.y += 0.88;
        look.copy(pos).addScaledVector(forward, 12);
        look.y -= 0.5;
      }
      if (mode === 2) {
        pos.copy(target).addScaledVector(forward, 1.5);
        pos.y += 0.1;
        look.copy(pos).addScaledVector(forward, 15);
      }
      if (mode === 3) {
        const a = this.time * 0.2;
        pos
          .copy(target)
          .add(new T.Vector3(Math.sin(a) * 12, 6, Math.cos(a) * 12));
        look.copy(target);
      }
      this.camera.fov =
        mode === 0 ? 57 + Math.min(12, Math.abs(p.speed) * 0.23) : 65;
    }
    if (!this.cameraReady) {
      this.camera.position.copy(pos);
      this.look = look.clone();
      this.cameraReady = true;
    } else {
      const smooth = 1 - Math.exp(-dt * (racing ? 6 : 2));
      this.camera.position.lerp(pos, smooth);
      this.look.lerp(look, smooth);
    }
    this.camera.lookAt(this.look);
    this.camera.updateProjectionMatrix();
    this.sun.position.set(p.x - 45, p.y + 80, p.z + 35);
    this.sun.target.position.set(p.x, p.y, p.z);
    this.pickupMeshes.forEach((m, i) => {
      m.rotation.y = this.time;
      m.position.y =
        this.track.height([0.15, 0.39, 0.64, 0.86][i]) +
        1.6 +
        Math.sin(this.time * 2 + i) * 0.2;
      m.visible =
        !racing || (race.config.items && race.pickups[i].cooldown <= 0);
    });
    if (this.rain.visible) {
      this.rain.position.set(p.x, p.y, p.z);
      const a = this.rain.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        a.array[i * 3 + 1] -= dt * 25;
        if (a.array[i * 3 + 1] < 0) a.array[i * 3 + 1] = 35;
      }
      a.needsUpdate = true;
    }
    if (
      racing &&
      page === "race" &&
      !this.settings.reducedMotion &&
      (p.drifting ||
        p.boostTime > 0 ||
        (this.weather === "rain" && p.speed > 12))
    ) {
      for (let j = 0; j < 2; j++) {
        const m = this.particlePool.find((m) => !m.visible);
        if (!m) break;
        const side = j ? 1 : -1;
        m.visible = true;
        m.userData.life = 0.55;
        m.position.set(
          p.x - Math.sin(p.heading) + Math.cos(p.heading) * side,
          p.y + 0.3,
          p.z - Math.cos(p.heading) - Math.sin(p.heading) * side,
        );
        m.material.color.set(
          p.boostTime > 0
            ? "#8ce5f5"
            : p.driftCharge > 1.5
              ? "#f9b15c"
              : "#d4cfbd",
        );
        m.scale.setScalar(1);
      }
    }
    for (const m of this.particlePool)
      if (m.visible) {
        m.userData.life -= dt;
        m.visible = m.userData.life > 0;
        m.position.y += dt * 0.65;
        m.scale.addScalar(dt * 3);
        m.material.opacity = Math.max(0, m.userData.life * 0.65);
      }
    this.renderer.render(this.scene, this.camera);
  }
}
