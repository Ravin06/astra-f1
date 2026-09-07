import { DEFAULT_PROFILE, VEHICLES, COLORS } from "./data.js";
const KEY = "apex.coastline.v1";
const clamp = (v, lo, hi, fallback) =>
  Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : fallback;
export function sanitize(raw = {}) {
  const d = structuredClone(DEFAULT_PROFILE);
  if (VEHICLES.some((v) => v.id === raw.vehicle)) d.vehicle = raw.vehicle;
  for (const k of ["color", "helmet", "suit"])
    if (/^#[0-9a-f]{6}$/i.test(raw[k])) d[k] = raw[k];
  if (["metallic", "matte"].includes(raw.finish)) d.finish = raw.finish;
  d.spoiler = raw.spoiler !== false;
  d.driver = Math.round(clamp(raw.driver, 0, 2, 0));
  d.number = String(raw.number || "07")
    .replace(/\D/g, "")
    .slice(0, 2)
    .padStart(2, "0");
  for (const [k, lo, hi] of [
    ["engine", 0.8, 1.25],
    ["grip", 0.8, 1.2],
    ["aero", 0, 1],
    ["steering", 0.7, 1.3],
  ])
    d.tuning[k] = clamp(raw.tuning?.[k], lo, hi, d.tuning[k]);
  if (raw.settings) {
    if (["low", "medium", "high", "ultra"].includes(raw.settings.quality))
      d.settings.quality = raw.settings.quality;
    for (const k of ["engine", "effects", "music"])
      d.settings[k] = clamp(raw.settings[k], 0, 1, d.settings[k]);
    d.settings.camera = Math.round(clamp(raw.settings.camera, 0, 3, 0));
    d.settings.sensitivity = clamp(raw.settings.sensitivity, 0.5, 1.5, 1);
    d.settings.deadzone = clamp(raw.settings.deadzone, 0.02, 0.4, 0.12);
    for (const k of ["assist", "reducedMotion"])
      if (typeof raw.settings[k] === "boolean") d.settings[k] = raw.settings[k];
    for (const k of Object.keys(d.settings.bindings))
      if (
        /^(Key[A-Z]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Digit[0-9])$/.test(
          raw.settings.bindings?.[k],
        )
      )
        d.settings.bindings[k] = raw.settings.bindings[k];
  }
  if (raw.records && typeof raw.records === "object")
    for (const [k, v] of Object.entries(raw.records))
      if (
        /^(coast|canyon|night)-(clear|rain|fog)-/.test(k) &&
        Number.isFinite(v) &&
        v > 0
      )
        d.records[k] = v;
  for (const k of ["races", "wins", "distance"])
    d[k] = clamp(raw[k], 0, 1e9, 0);
  if (Array.isArray(raw.presets))
    d.presets = raw.presets
      .slice(0, 20)
      .filter(
        (p) =>
          p &&
          typeof p.name === "string" &&
          p.build &&
          typeof p.build === "object",
      )
      .map((p) => ({
        name: p.name.slice(0, 28),
        build: buildPreset(sanitize({ ...p.build, presets: [] })),
      }));
  return d;
}
export function loadProfile() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {
    return structuredClone(DEFAULT_PROFILE);
  }
}
export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
export function buildPreset(p) {
  return Object.fromEntries(
    [
      "vehicle",
      "color",
      "finish",
      "spoiler",
      "driver",
      "helmet",
      "suit",
      "number",
      "tuning",
    ].map((k) => [k, structuredClone(p[k])]),
  );
}
export function importPreset(text) {
  if (text.length > 20000) throw new Error("Preset file is too large.");
  const raw = JSON.parse(text);
  if (!raw || !VEHICLES.some((v) => v.id === raw.vehicle))
    throw new Error("Choose an APEX vehicle preset.");
  return buildPreset(sanitize(raw));
}
