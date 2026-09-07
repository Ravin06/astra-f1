# APEX / Coastline Racing

An original, local, single-player 3D kart racer, built in a new independent folder. It runs in a modern desktop browser with WebGL 2 and hardware acceleration. No existing project or external account is required.

**Delivery status: playable vertical slice, not a finished AAA or commercially ready game.** The original procedural models and environments are stylized. They are not photorealistic assets. All available menu actions operate real local systems; there is no simulated multiplayer.

## Run

Requires Node.js 22.12+ (tested with 22.22) or a current supported Node release.

```sh
npm install
npm start
```

Open **http://localhost:8790**. If that port is occupied, Vite reports an error. To change it explicitly: `npm start -- --port 8800`.

```sh
npm run build
npm run preview
```

The `dist/` directory is a self-contained static build. Serve it with any HTTP static server. Do not double-click `index.html` with a `file://` URL. The game uses locally bundled code and fonts and needs no remote assets at runtime.

## Play

Choose a circuit and click **LET’S RACE**. The button beside it opens race setup. Garage changes are automatically saved; Test Drive launches unlimited practice on the selected track.

| Action          | Keyboard           | Standard gamepad            |
| --------------- | ------------------ | --------------------------- |
| Accelerate      | W / Up             | Right trigger               |
| Brake / reverse | S / Down           | Left trigger                |
| Steer           | A, D / Left, Right | Left stick                  |
| Drift           | Space + steering   | A + steering                |
| Boost           | Left Shift         | B                           |
| Use item        | E                  | X                           |
| Camera          | C                  | Y                           |
| Reset           | R                  | Keyboard / touch not mapped |
| Pause           | Escape             | Start                       |

Gamepad labels follow the standard Xbox-style browser mapping. Other controllers may label buttons differently. A physical controller was not available for hardware validation. Keyboard bindings are editable in Settings; duplicate keys swap the affected actions. Touch buttons appear on coarse-pointer devices, but desktop is the primary play target.

Hold drift through a corner, counter-steer to regulate the slide, then release after charging to receive a short boost. Boost reserve regenerates. Green road strips grant a boost. Golden diamonds supply one item: **Surge** (turbo), **Halo** (shield), or **Pulse** (nearby opponent slowdown). Halo counters Pulse and vehicle impact impulses. Reset returns to the last validated quarter checkpoint with a two-second penalty and a cooldown.

## Implemented

- Three original closed circuits: Azure Coast, Ember Canyon, and Afterlight. Each has its own road geometry and elevation profile. Scenery includes curbs, barriers, palms or rock formations, a paddock, sponsor signs, city towers, and a coastal harbor.
- Three kart configurations with different mass, power, speed limits, grip, braking, and nose shapes; procedural wheels, mechanical parts, bodywork, headlights, wing, driver suit, and helmet.
- Fixed 120 Hz driving simulation with longitudinal acceleration/braking, drag, lateral velocity, tire-force-limited yaw, drift, boost, off-road slowdown, barrier response, kart collisions, and optional impact-related performance damage.
- Ordered checkpoint validation, lap timing, race start countdown, position ranking, pause/resume, reset safeguards, best laps, and results. AI drivers use look-ahead steering, curvature-based corner speeds, lane variation, traffic avoidance, and items.
- Quick Race, Custom Race, Time Trial, and unlimited Practice. Up to seven AI opponents, three difficulty settings, configurable laps, collision rules, items, and performance damage.
- Clear, rain, and fog presets. Rain reduces tire grip and changes road material properties; rain particles and tire spray are implemented. Nighttime lighting belongs to the Afterlight track.
- Garage: vehicle selection, eight paint colors, matte/metallic finishes, wing visibility, engine output, tire grip, downforce, steering ratio, live statistics, and test drive. Named presets can be saved, duplicated by saving under another name, loaded, exported, and imported as JSON.
- Driver: three original identities, helmet and suit colors, and a two-digit racing number. Driver selection does not confer a performance advantage.
- Chase, cockpit, hood, and orbit/cinematic cameras. HUD includes speed, an automatic speed-derived gear/RPM display, position, laps, timers, minimap, boost reserve, drift charge, item status, and optional damage condition.
- Keyboard, standard Gamepad API input, touch controls, remapping, sensitivity, deadzone, optional steering assist, reduced ambient motion, and four graphics presets.
- Synthesized RPM-responsive engine sound, road/drift noise, impact and item tones, and a simple adaptive musical sequence with separate engine, effects, and music levels.
- Browser-local save/load for settings, driver, tuning, presets, race counts, wins, distance, achievements, and lap records separated by track/weather/vehicle/item rules. Invalid saves are sanitized. Storage failures produce a warning.
- Session race replay with pause and a seek slider, using recorded kart transforms. Replay is available from results and retained until leaving the race.
- Production bundle, simulation tests, browser checks, local fonts, and a documented asset replacement/expansion pipeline.

## Deliberately limited / partially implemented

- Handling is a lightweight planar arcade vehicle model with elevation following, not a rigid-body suspension or racing simulator. Body pitch/roll represents acceleration response visually; there is no independent wheel suspension, tire deformation, real aerodynamic balance, differential, gearing simulation, or manual transmission. Drivetrain labels identify configurations, but do not model individual driven axles.
- AI is competent at following the supplied racing line and completing laps. It has no alternate-route graph, learned strategy, deep defensive tactics, or destructible-object awareness. Difficulty changes target pace; there is no position-based teleportation or rubber banding.
- Graphics use physically based materials, environment lighting, shadow maps, fog, and procedural textures. There is no ray tracing, true wet-road planar reflection, screen-space ambient occlusion, volumetric lighting, global illumination solution, high-resolution asset library, or postprocess motion blur/depth of field.
- Weather is selected before a race; it does not evolve during a race. Track objects do not deform or break. Damage affects performance and telemetry, not mesh deformation.
- Tuning covers four parameters, not the entire requested motorsport tuning catalog. Cosmetic wing visibility is separate from the downforce slider. Headlights, wheels, bumpers, and engines are modeled but are not separately interchangeable parts.
- Character customization changes identity, colors, and number, not facial morphology, hair, proportions, animations, or voice packs.
- Gear and RPM are presentation estimates. Audio is synthesized, not recorded automotive sound. No licensed music, voice acting, or convolution reverb is included.
- Time Trial records times but does not yet provide a ghost. Replay is a bounded in-memory transform recording (approximately ten minutes), not persistent video export or deterministic input playback.
- Achievement progression is local and lightweight. All performance configurations are available immediately; there is no economy or unlock grind.
- A target of 60 FPS is an engineering goal, not a measured guarantee on unspecified hardware. Low quality disables shadows and lowers render resolution. The automated browser uses software graphics and is not a hardware performance benchmark.

## Not implemented

Grand Prix standings, elimination/team/battle modes, online services or multiplayer, local split-screen, matchmaking, reconnects, anti-cheat services, track editor, shortcuts/alternate routes, jumps/stunts, destructible objects, save synchronization, photo/video export, wheel-specific force feedback, full accessibility audit, gamepad menu navigation, extensive character creator, photorealistic art, and commercial packaging.

These are not represented as working buttons. See [DEVELOPMENT.md](DEVELOPMENT.md) for the staged continuation plan and architecture.

## Verification

```sh
npm test
npm run build
# Start the local server in a separate terminal first:
npm run test:browser
```

The browser test uses Playwright. If Chromium is not installed, run `npx playwright install chromium`. `CHROMIUM_PATH` can point to an existing Chromium executable; `GAME_URL` can override the default test URL. On the development machine it detects the preinstalled Chromium binary. Test screenshots are saved to `test-results/`.

Simulation tests exercise track closure, nearest-point projection, tuning trade-offs, fixed-step consistency, drift boosts, lap exploit rejection, checkpoint reset penalties, item counterplay, pause, imported data validation, and AI lap completion. Browser tests exercise real menus, customization, saved presets across reload, keyboard driving, pause/resume, camera switching, all tracks, and narrow viewport layout. See [TESTING.md](TESTING.md) for the latest observed validation and limits.

## Originality and third-party components

All game geometry, tracks, code, visual branding, fictional driver identities, item concepts, and synthesized audio were created for this project. No Nintendo assets, characters, music, track layouts, or names are used. Three.js is MIT licensed; Vite and Playwright retain their upstream licenses. Barlow is by Jeremy Tribby and distributed under the SIL Open Font License. The font license is included under `public/fonts/`.
