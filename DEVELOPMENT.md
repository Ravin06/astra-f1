# Development plan and architecture

## Environment assessment

The supplied workspace is a general Downloads directory containing unrelated projects. No root AGENTS.md was found. Node.js/npm and an installed Playwright Chromium are available. Unreal Editor, Unity Editor, Godot, and Blender were not found on PATH. No new project assets or target GPU specifications were supplied. This implementation lives entirely in `apex-kart/` and does not modify the other projects.

Engine choice: Three.js WebGL 2 with JavaScript ES modules and Vite. It is immediately runnable and testable with the available tools. The source uses Three.js 0.180 and Vite 7.3.6. The renderer uses [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) and physically based materials following the [MeshStandardMaterial documentation](https://threejs.org/docs/pages/MeshStandardMaterial.html). This choice supports a playable browser vertical slice, not the maximum fidelity of a properly staffed Unreal production.

## System boundaries

| Module                | Owns                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `data.js`             | Track control points, vehicle configs, driver identities, defaults, derived tuning stats |
| `track.js`            | Arc-length sampled spline, elevation, tangent, nearest-point projection, curvature       |
| `physics.js`          | Pure kart state, fixed step, vehicle integration, collisions, AI control generation      |
| `race.js`             | Countdown, simulation accumulator, checkpoint/lap rules, ranking, items, replay samples  |
| `graphics.js`         | Render lifecycle, procedural assets, PBR materials, cameras, weather, particles          |
| `input.js`            | Keyboard state, remapping, focus safety, touch, standard gamepad mapping                 |
| `audio.js`            | Web Audio synthesis and per-channel gain controls                                        |
| `persistence.js`      | Save version, schema bounds, preset import validation, browser storage                   |
| `ui.js` / `style.css` | Screens, semantic controls, HTML escaping, HUD and minimap                               |
| `main.js`             | Application state, screen transitions, system coordination, profile updates              |

Physics is independent of the renderer and does not read wall-clock time. `Race.update` accumulates render delta and advances in `1/120` second increments. Long render stalls are capped to 100 ms to avoid a simulation spiral; on severely overloaded hardware the game therefore slows instead of doing unbounded catch-up. Pausing and loss of focus freeze racing. AI receives the same kart state integration and collision treatment as the player.

Race progress uses a continuously unwrapped track parameter, while lap legitimacy uses ordered quarter-track gates plus the finish-line crossing. Reset moves backward to the last validated gate, never directly to a future location. Records are local user data, not competitive leaderboard submissions.

Memory management: old scene groups dispose their geometry, materials, and owned textures. Vehicle static body parts are batched by material. Track curbs, road markings, and barriers are merged into batches. Tire effects use a fixed reusable particle pool. The renderer provides frustum culling; quality presets control pixel ratio and shadow map resolution. There is no bespoke occlusion system or texture streaming. Profiling is still needed on representative hardware.

## Executed milestones

1. Built and unit-verified a 3D closed track, player kart, fixed-step driving, drifting, AI, chase camera, ordered checkpoints, HUD, and race start/finish.
2. Added three layouts and environments, three vehicle configurations, garage tuning and presets, limited character customization, original power-ups, local records, and full screen navigation.
3. Added weather presets, gamepad/touch input plumbing, render quality settings, simple synthesized audio, basic achievements, and an in-memory race replay.
4. Built the production bundle and tested the simulation and browser paths. Validation results and remaining gaps are recorded separately.

## Next milestones, in order

1. **Driving and performance pass:** playtest on real hardware and a physical controller; measure GPU/CPU time; tune steering sensitivity and tire curves; add transform interpolation, proper reverse/brake transitions, track recovery for blocked AI, and automated long multi-kart races. Add accessibility review and gamepad menu navigation.
2. **Art production:** create authored kart bodies, independent axles/suspension, rigged driver meshes, terrain, vegetation LODs, track details, and recorded sound. Keep the current meshes as fallback/debug representations.
3. **Expanded racing:** championship scoring, elimination rules, team scoring, time-trial ghosts, persistent input replays, multiple racing lines, alternate routes, and better overtaking. Add mode-specific test cases before exposing menu entries.
4. **Vehicle depth:** replace the simplified tire/weight-transfer model with an independently tested chassis/wheel model; expose gearing, suspension, brake balance, tire compounds, and meaningful axle-drive differences only after they affect the simulation.
5. **Network proof:** a separate server package owns race ticks, accepted inputs, checkpoints, item decisions, collision results, and scoring. Clients send sequenced inputs and render predicted local state plus interpolated remote state. Test reconciliation, dropped packets, late joins, rate limits, invalid input, reconnects, and latency under an actual two-client session before adding an Online menu.
6. **Production readiness:** asset license review, crash/error reporting with consent, supported platform matrix, save migrations and backups, localization, accessibility, input certification, deployment packaging, QA soak tests, hardware benchmarks, and commercial release planning.

## Asset replacement pipeline

Use glTF/GLB for authored meshes, meter units, +Y up, and +Z as vehicle forward. Keep the vehicle origin at ground level between its axles. Wheel pivots should remain independent objects so steering and wheel rotation can be animated. Preserve clear material slots for paint, rubber, metal, glass, driver suit, and helmet. Avoid embedding gameplay parameters in an art file: register vehicle performance in `data.js`.

Track spline control points define racing geometry and checkpoint progress. An authored environment should be aligned with that reference spline, or supply a new spline and collision metadata together. Export physically based textures in sensible packed channels and create lower-detail versions before increasing scene density. Introduce asset manifests, loading progress and missing-asset fallback before adding network-dependent loading.

Audio replacement should preserve engine/effects/music buses. Sample recordings can replace oscillator layers while retaining RPM/load parameters and user volume settings. Check licensing for every new asset; include attribution/license files alongside the assets.
