# Solmar Bay: Neon Shores

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/taigedi123/gta6-01-v5/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/taigedi123/gta6-01-v5/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in a fictional sunny coastal city, built from scratch in vanilla JavaScript, Canvas and WebAudio — no libraries, no assets, no network.

You are **Sol Vega**, a wheel-woman in Solmar Bay who swore she was done with the life. Across **15 story missions** — market runs and pier errands that escalate through dockside debts, an accountant who gambles with other people's money, and a rehearsal in storm weather — you build toward one last job: **the Gilded Palm casino heist**.

The city is yours to roam: **14 named districts** (Downtown Solmar, Marina Azul, Coral Beachfront, Casino Row, the airport, Palmetto Suburbs, Rusthook Docks, Verdant Hills, Old Town Mercado, the University Quarter, the Neon Mile, the Canal District, Fisherman Flats and Airport Heights) on a full road grid with an ocean waterfront, docks and a metro line with 8 stations.

What's in the game:

- **12 driveable car types and 3 boats**, with traffic AI, parked cars to steal, and pedestrians who panic, flee and occasionally get in the way
- **9 weapons** — fists, pistol, micro SMG, shotgun, assault rifle, sniper rifle, grenades, molotovs and a minigun — with a gun shop to restock
- **A 1–5 star wanted system**: police cruisers chase, roadblocks appear at 3 stars, a helicopter with a searchlight joins at 4–5 stars, and you escape by breaking line of sight, respraying, or hiding out at a safehouse. Get cornered and you're busted; get flattened and you wake up at Solmar General
- **8 side activities**: taxi fares, package deliveries, boat time trials, three street races, rampages, casino hands of Bay 21, metro riding and property hunting
- **A playable casino mini-game**, buyable properties that act as save points, respray garages, and save/load through localStorage
- **A full HUD** — health and armor, cash, current weapon and ammo, wanted stars, a day clock and weather — plus a **live canvas minimap** with streets, the mission marker, side-job markers and police blips
- **A day/night cycle and changing weather** (sun, cloud, rain, fog) that relight the city, and **procedural WebAudio sound**: engines, horns, sirens, gunshots and a lazy marimba loop, all synthesised in code

Controls: WASD/arrows to move and drive, E to enter vehicles and use markers, Shift to sprint/boost, Space for the handbrake, mouse to aim and click to fire, 1–9 to switch weapons, J for a side job, R for a rampage, P/Esc to pause (F saves, L loads from the pause menu).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The game is static files under `game/` and needs no build step and no network.

<sub>Entered on [make.fun](https://make.fun/?ref=5xww654b&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
