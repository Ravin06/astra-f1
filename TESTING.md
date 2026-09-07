# Validation report

Environment: Node.js 22.22.0, Vite 7.3.6, Three.js 0.180.0, Chromium 1228 through Playwright, Linux/WSL workspace on a Windows-mounted drive. Browser graphics use SwiftShader; this is functional validation, not a hardware FPS benchmark.

## Passed

- Production compilation and bundling with `npm run build`.
- Fourteen simulation tests using `npm test`, including complete AI laps and six-car wet races on all four Grand Circuit tracks, declared track dimensions, preserved legacy records, and Suzuka's 10 m crossover clearance with height-aware collisions.
- Track closure, projection onto the racing spline, and geometry continuity at the start line.
- Identical simulation outcomes across 30 Hz and 120 Hz render update groupings.
- Drift accumulation and release boost; meaningful tuning trade-offs.
- Ordered checkpoint enforcement, rejection of an unearned finish-line crossing, backward-only reset and its cooldown/time penalty.
- Single-use power-ups and Halo protection against Pulse.
- Pause freezes both kart movement and race timing.
- Save and imported preset validation, bounded values, rejected invalid vehicle identifiers.
- Exact 20 Hz replay sampling.
- Browser startup with no uncaught runtime or render errors in the final general regression run.
- Vehicle/driver selection, paint/preset interaction, and preserved named builds after browser reload.
- Real keyboard acceleration changes speed and world position; pause/resume and camera switching work.
- All four track selection paths render; screenshots captured for each.
- A complete keyboard-driven Marina Bay lap finished in 109.058 seconds with ordered checkpoints, followed by successful results, replay pause/seek, and saved-record checks. No runtime errors were reported. This automated driving time is not a performance benchmark.
- Desktop 1440 × 1000 and narrow 390 × 844 layouts were visually inspected. A separate test found and corrected overlapping controls at 800 × 600.
- npm reported zero dependency vulnerabilities after the build tool update and final formatter installation.

## Test artifacts

`test-results/` contains the latest browser screenshots and is excluded from source control. `tests/browser.mjs` is the repeatable menu, persistence, driving, and viewport regression. `tests/playthrough.mjs` drives a complete lap using keyboard events and read-only telemetry, then exercises results, replay and lap record saving. Neither test writes production kart state or skips checkpoint validation.

The complete-race test uses a reduced pixel ratio for software rendering. Set `CHROMIUM_PATH` to an installed Chromium if the automatically detected development-machine binary is unavailable. Both browser scripts require the server to be running.

## Remaining validation

Grand Circuit revision: the production build, all 14 simulation tests, four-track general browser regression, and complete-race results/replay/record regression passed. The general browser run reported no runtime/render errors or horizontal overflow at 390 px. Subsequent mobile camera, circuit-outline preview, and tunnel alignment adjustments compiled successfully; the complete-race test ran against the final source. The replay range-input error found in the previous complete-race test has been fixed and its pause/seek flow verified.

- Real GPU performance and prolonged races on the user's target hardware.
- Physical gamepad, steering wheel and touchscreen hardware.
- Cross-browser coverage (Firefox/Safari), audio quality/listening tests, and accessibility audit.
- Long-session memory profiling, ten-minute replay limits, save migration across future versions, and malformed-file fuzzing beyond the covered cases.
- The unimplemented systems listed in README.md have not been tested and are not represented as complete.

## Issues caught and addressed

- This machine's Node `--test <file>` path encountered a broken internal glob dependency. Running the explicit test module directly uses `node:test` successfully; the npm test script uses that working path.
- Restricted process/network access required permission to run Vite and headless Chromium. The game itself does not require privileged browser features.
- Native file notifications missed source changes on the Windows-mounted drive. Vite now polls source files, and the server was restarted before final visual verification.
- A geometry batching pass mixed indexed and non-indexed meshes. Batches now distinguish index layout, preserving every body part and removing the render errors.
- Keyboard steering was aligned with the +Z-facing vehicle and chase camera convention.
- Local favicon references and bundled font paths were corrected; the final browser regression had no failed asset requests.
