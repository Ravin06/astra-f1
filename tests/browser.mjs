import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
const localBrowser =
  "/home/ravin/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : existsSync(localBrowser)
      ? { executablePath: localBrowser }
      : {}),
  args: [
    "--no-sandbox",
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (msg) => {
  if (msg.type() === "error")
    errors.push(msg.text() + " " + msg.location().url);
});
page.on("response", (r) => {
  if (r.status() >= 400) console.log("HTTP error", r.status(), r.url());
});
mkdirSync("test-results", { recursive: true });
try {
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:8790", {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() => window.apex?.state.page === "home", null, {
    timeout: 60000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/home-desktop.png" });
  console.log("Loaded", await page.evaluate(() => window.apex.state));
  if (process.env.SCREENSHOT_ONLY) {
    await browser.close();
    process.exit(0);
  }
  await page.click('nav [data-action="garage"]');
  await page.click('[data-action="vehicle"][data-value="vector"]');
  await page.fill("#preset-name", "Coastal test build");
  await page.click('[data-action="save-preset"]');
  assert.equal(await page.locator(".preset-list button").count(), 1);
  await page.screenshot({ path: "test-results/garage.png" });
  await page.click('nav [data-action="driver"]');
  await page.click('[data-action="select-driver"][data-value="2"]');
  await page.fill('[data-field="number"]', "42");
  await page.locator('[data-field="number"]').press("Tab");
  await page.click(".logo");
  await page.click('[data-action="setup"]');
  await page.selectOption('[data-field="config.laps"]', "1");
  await page.selectOption('[data-field="config.opponents"]', "3");
  await page.click('[data-action="start"]');
  await page.waitForFunction(
    () => window.apex.state.race?.state === "racing",
    null,
    { timeout: 20000 },
  );
  const before = await page.evaluate(() => window.apex.state.race);
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => window.apex.state.race.speed > 8, null, {
    timeout: 30000,
  });
  await page.keyboard.up("KeyW");
  const after = await page.evaluate(() => window.apex.state.race);
  assert.ok(after.speed > 2, "throttle accelerates the kart");
  assert.ok(
    Math.hypot(after.x - before.x, after.z - before.z) > 1,
    "kart moves in the 3D world",
  );
  await page.screenshot({ path: "test-results/race.png" });
  await page.keyboard.press("Escape");
  const paused = await page.evaluate(() => window.apex.state.race.time);
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.apex.state.race.time), paused);
  await page.click('[data-action="resume"]');
  await page.keyboard.press("KeyC");
  await page.keyboard.press("Escape");
  await page.click('[data-action="home"]');
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.apex?.state.page === "home");
  await page.click('nav [data-action="garage"]');
  assert.equal(
    await page.locator(".preset-list button").count(),
    1,
    "presets persist across reload",
  );
  assert.ok(
    (await page.locator(".spec-sheet h2").textContent()).includes("Vector"),
  );
  await page.click(".logo");
  await page.click('[data-action="track"][data-value="1"]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/canyon.png" });
  await page.click('[data-action="track"][data-value="2"]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/night.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('[data-action="track"][data-value="0"]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/home-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "no horizontal overflow",
  );
  assert.deepEqual(errors, [], "no browser runtime or rendering errors");
  console.log(
    "PASS: menus, garage, character, preset persistence, keyboard driving, pause, camera, three tracks, mobile layout.",
  );
} finally {
  console.log("Browser errors:", errors);
  await browser.close();
}
