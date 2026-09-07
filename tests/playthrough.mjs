import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const cached =
  "/home/ravin/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : existsSync(cached)
      ? { executablePath: cached }
      : {}),
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 0.25,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.addInitScript(() =>
    localStorage.setItem(
      "apex.coastline.v1",
      JSON.stringify({
        settings: {
          quality: "low",
          engine: 0,
          music: 0,
          effects: 0,
          assist: false,
        },
      }),
    ),
  );
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:8790", {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() => window.apex?.state.page === "home", null, {
    timeout: 60000,
  });
  await page.click('[data-action="setup"]');
  await page.selectOption('[data-field="config.mode"]', "trial");
  await page.selectOption('[data-field="config.laps"]', "1");
  await page.click('[data-action="start"]');
  // Test-only driver uses public telemetry and keyboard events. It does not write
  // kart state, checkpoints, the clock, results, or any production object.
  await page.evaluate(async () => {
    const { Track, angleDelta } = await import("/src/track.js"),
      { TRACKS } = await import("/src/data.js");
    const track = new Track(TRACKS[0]);
    let held = new Set(),
      pulse = 0;
    const tick = () => {
      const s = window.apex.state;
      if (s.page !== "race") {
        for (const code of held)
          window.dispatchEvent(
            new KeyboardEvent("keyup", { code, bubbles: true }),
          );
        return;
      }
      const k = s.race,
        next = new Set();
      if (k.state === "racing") {
        const look = 7 + Math.abs(k.speed) * 0.43,
          p = track.at(k.t + look / track.length);
        const error = angleDelta(Math.atan2(p.x - k.x, p.z - k.z) - k.heading),
          steer = Math.max(-1, Math.min(1, error * 2.1));
        const bend = Math.max(
            track.curvature(k.t),
            track.curvature(k.t + look / track.length),
          ),
          desired = Math.min(31, Math.sqrt(8.4 / Math.max(0.006, bend)));
        if (k.speed < desired) next.add("KeyW");
        if (k.speed > desired + 3) next.add("KeyS");
        pulse += Math.abs(steer);
        if (pulse >= 1) {
          pulse -= 1;
          next.add(steer > 0 ? "KeyA" : "KeyD");
        }
      }
      for (const code of held)
        if (!next.has(code))
          window.dispatchEvent(
            new KeyboardEvent("keyup", { code, bubbles: true }),
          );
      for (const code of next)
        if (!held.has(code))
          window.dispatchEvent(
            new KeyboardEvent("keydown", { code, bubbles: true }),
          );
      held = next;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(10000);
    const s = await page.evaluate(() => window.apex.state);
    console.log("Drive", JSON.stringify(s.race));
    if (s.page === "results") break;
  }
  assert.equal(
    await page.evaluate(() => window.apex.state.page),
    "results",
    "a real keyboard-driven race reaches results",
  );
  mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/results.png" });
  assert.ok(await page.locator(".result-table .you").count());
  await page.click('[data-action="replay"]');
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => window.apex.state.page), "replay");
  await page.click('[data-action="replay-toggle"]');
  await page.locator("#replay-scrub").fill("200");
  await page.locator("#replay-scrub").dispatchEvent("change");
  await page.screenshot({ path: "test-results/replay.png" });
  await page.click('[data-action="results"]');
  await page.click('[data-action="home"]');
  await page.click('nav [data-action="records"]');
  assert.equal(await page.locator(".record-row").count(), 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: keyboard-driven complete lap, results, replay pause/seek, recorded lap.",
  );
} finally {
  console.log("Runtime errors:", errors);
  await browser.close();
}
