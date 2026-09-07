# Grand Circuit layouts

The four active circuits are hand-authored, arcade-scale interpretations of real circuit centerlines. Their direction changes and overall footprints follow the diagrams below. Road widths, corner radii, elevation, scenery, and distances are deliberately changed for accessible racing. The reference images are not bundled with the game. This is an original game with original cars and liveries, not an official Formula 1 product or a surveyed circuit simulator.

| Destination            | Playable length | Road width | Preserved characteristics                                                                                              |
| ---------------------- | --------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Singapore / Marina Bay | 2,500 m         | 22 m       | Opening esses, boulevard straight, Turn 13 hairpin, waterfront return; night lighting and original skyline silhouettes |
| Monaco / Monte Carlo   | 2,350 m         | 18 m       | Sainte Devote, Casino climb, widened hairpin, covered tunnel section, harbor chicane and swimming-pool esses           |
| Silverstone            | 2,900 m         | 26 m       | Abbey, Village loop, Copse, Maggotts–Becketts direction changes, Hangar Straight and final complex                     |
| Suzuka                 | 2,850 m         | 24 m       | S curves, Degners, hairpin, Spoon, 130R and an actual raised figure-eight crossing                                     |

The original kart circuits remain in `data.js` under `LEGACY_TRACKS`; the menu now uses `GRAND_CIRCUITS` from `circuits.js`. Existing vehicle presets and legacy records are preserved. New lap records use distinct track identifiers, so times from the old layouts do not become times for the new layouts.

## Layout references

- [Official Singapore circuit page](https://www.formula1.com/en/information/singapore-marina-baystreetcircuit.7LXNQUCHTyR5yMQPlIk7Lv). The current straightened waterfront configuration was referenced from the [2026 circuit diagram](https://media.formula1.com/image/upload/c_fit,w_1100/q_auto/v1740000001/common/f1/2026/track/2026tracksingaporedetailed.webp), rather than the older 23-corner map on the historical information page.
- [Official Monaco circuit page and diagram](https://www.formula1.com/en/racing/2026/monaco).
- [Official Silverstone circuit page and diagram](https://www.formula1.com/en/racing/2026/great-britain).
- [Official Suzuka circuit page and diagram](https://www.formula1.com/en/racing/2026/japan).

## Geometry details

Centerlines are smooth closed splines, normalized to the declared playable length. Monaco and Suzuka use explicitly authored height samples; Suzuka's upper and lower branches are separated by 10 m at the intersection. Nearest-road queries retain their progress hint to stay on the correct branch. Vehicle collision resolution ignores cars separated vertically by more than 2.2 m. Wider roads are an intentional arcade adaptation, especially at Monaco.

Cars have new open-wheel geometry: long narrow noses, slick tires, front-wing elements, rear wings, halo cockpits, sidepods, and low seated drivers. Configured unboosted speed limits increased from 39–48 m/s to 50–59 m/s before tuning. Actual speed still depends on acceleration, drag, grip, boost, cornering and chosen setup. The underlying simulation remains a simplified arcade vehicle model.
