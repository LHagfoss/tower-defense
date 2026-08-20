# 🎈 Cardboard Balloons — Tower Defense

A complete, original tower-defense browser game with a **handmade cardboard-diorama**
visual identity: layered paper, corrugated edges, cut-paper balloons and towers,
hand-drawn wobbly outlines, tape, pins, folds, and warm drop shadows that make every
piece look raised from the board. All visuals are generated in code (Canvas 2D, SVG,
CSS) — there are **no external image assets**.

Built with **Vite + React + TypeScript + Tailwind CSS**. The real-time game world runs
on an HTML `<canvas>`; menus, HUD, shop, and the contextual upgrade panel are React/DOM.

---

## Quick start

```bash
npm install        # install dependencies
npm run dev        # start dev server (http://localhost:5173)
npm test           # run the focused unit tests (vitest)
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # serve the production build
```

---

## How to play

| Input | Action |
|---|---|
| Click a tower card, then the board | Place that tower (grid-snapped) |
| Right-click / `Esc` | Cancel placement, or close the selected-tower panel, or pause |
| Click a placed tower | Select it → opens the contextual upgrade panel |
| `Space` | Toggle game speed 1× / 2× (2× is the default) |
| `Enter` | Start the next wave (when auto-start is off) |
| `P` | Pause / resume |

- **Goal:** survive all **10 authored waves**. Balloons that reach the exit cost you
  lives equal to their remaining layer count.
- **Money** is earned for every balloon layer popped, plus a bonus per cleared wave.
- Towers can only be placed on open board cells — never on the path, scenery, or
  another tower. While placing you see a translucent preview, its range circle, a
  green/red validity highlight, the cost, and a cancel affordance.

### Balloon layers (color = layers remaining)

| Color | Layers |
|---|---|
| Red | 1 |
| Blue | 2 |
| Green | 3 |
| Yellow | 4 |
| Pink | 5 |

Damage **removes layers** rather than subtracting generic health: one pop turns a blue
balloon into red, two pops destroy it, etc. The balloon's color and size update as its
remaining layers change.

### Balloon variants (introduced across the waves)

- **Standard** — plain balloon.
- **Speedy** (⚡) — 60% faster, pays a little extra.
- **Armored** (rivets) — absorbs 1 pop of damage per hit (a hit always deals ≥1).
- **Swarm** — small and quick, travels in dense packs.
- **Big Boss** (👑) — a giant 12-layer, heavily armored balloon on the final wave.

---

## Towers

| Tower | Cost | Role |
|---|---|---|
| **Needle Turret** | $100 | Cheap, fast, short range — shreds swarms of thin balloons |
| **Firecracker** | $220 | Medium cost, slow, **area-of-effect** splash — great for groups |
| **Heavy Ballista** | $450 | Expensive, very slow, long range, huge single-target damage — for armored/boss |

Every tower has a distinct cardboard look, visible projectile animation, and stats for
range, damage, attack speed, and projectile speed. Each supports four **targeting
modes** — First (furthest along), Last (closest to entrance), Strong (most layers),
Close (nearest) — and can be **sold** for 70% of everything invested.

### Upgrade system

Each tower has **three upgrade paths × three tiers**. You may buy from **at most two
paths**; the moment you purchase in two different paths, the unused third path is
**permanently locked** for that tower. Both chosen paths can reach tier 3. Upgrades are
not all flat percentages — they include extra pierce, larger splash, slow status
effects, armor penetration, and critical hits.

---

## Project structure

```
src/
├── main.tsx                 # React entry point
├── index.css                # Tailwind import + cardboard design system (buttons, cards, focus)
├── App.tsx                  # Layout, keyboard shortcuts, canvas pointer handling
├── hooks/
│   └── useGame.ts           # Bridges the imperative engine to React (rAF loop + throttled snapshots)
├── components/
│   ├── Hud.tsx              # Top bar: lives, money, wave, pause/speed/auto-start
│   ├── Shop.tsx             # External tower shop sidebar (cards, stats on hover, affordability)
│   ├── TowerPanel.tsx       # Contextual upgrade panel (smart placement, targeting, upgrades, sell)
│   └── Overlays.tsx         # Menu / win / lose full-board overlays
└── game/
    ├── types.ts             # All domain types (Tower, Balloon, Wave, Projectile, …)
    ├── engine.ts            # The simulation: waves, movement, targeting, damage, economy
    ├── path.ts              # Path geometry: cumulative distances, point-at-distance, blocked cells
    ├── renderer.ts          # Canvas drawing: static board (cached) + dynamic entities
    ├── audio.ts             # No-op audio service / event boundary (for future sound)
    ├── persist.ts           # localStorage: best wave + settings
    ├── engine.test.ts       # Focused unit tests for pure gameplay logic
    └── config/
        ├── layers.ts        # Balloon layer definitions (color, reward)
        ├── variants.ts      # Balloon variant definitions (speed, armor, size)
        ├── towers.ts        # Tower definitions + upgrade paths + stat computation
        ├── waves.ts         # The 10 authored waves + economy constants
        └── map.ts           # Board size, grid, path waypoints, scenery
```

---

## Architecture

The design keeps the **simulation separate from React rendering** so the game runs at a
stable frame rate without re-rendering React 60 times a second.

- **`GameEngine`** (`game/engine.ts`) is a plain TypeScript class with no DOM or React
  dependencies. It owns all mutable game state (balloons, towers, projectiles, effects,
  money, lives, wave) and advances it with a **delta-time** `update(dt)` call. All
  balance data lives in declarative `config/` objects, not scattered magic numbers.
- **`Renderer`** (`game/renderer.ts`) reads engine state each frame and draws to the
  canvas. The expensive static board (background, path, scenery, tape) is pre-rendered
  once to an offscreen canvas and blitted each frame; only dynamic entities are redrawn.
- **`useGame`** (`hooks/useGame.ts`) owns the engine + renderer in refs and runs a single
  `requestAnimationFrame` loop that calls `engine.update()` then `renderer.render()`.
  React re-renders only from a **throttled snapshot** (~10 Hz) and from explicit action
  calls (place, buy, sell, …), never per animation frame.
- **`audio.ts`** is a no-op service. The engine emits `GameEvent`s through a single
  `onEvent` boundary, so real sound effects can be added later without touching game
  logic.

### Key mechanics

- **Path movement** — balloons travel a distance `dist` along a polyline; `pointAt()`
  maps that to an (x, y) with smooth interpolation, so motion is frame-rate independent
  and correct at both 1× and 2× speed.
- **Placement validation** — `canPlace()` rejects out-of-bounds, path, scenery, and
  occupied cells, and requires the player to afford the tower.
- **Targeting** — `selectTarget()` scores in-range balloons by the active mode
  (First/Last/Strong/Close) and returns the best.
- **Damage** — `applyDamage()` subtracts armor first (a hit always deals ≥1 pop), then
  removes that many layers; `popBalloon()` awards money per layer and attributes pops to
  the source tower.
- **Projectiles** — single-target projectiles home and hit on proximity; splash
  projectiles explode on first contact and damage everything in the blast radius.
  Expired/off-board projectiles and destroyed balloons are cleaned up each frame.
- **Waves** — declarative spawn groups with counts, intervals, and delays. Clearing a
  wave pays a bonus; with auto-start on the next wave begins immediately, otherwise it
  waits for the player.

---

## Testing

`src/game/engine.test.ts` covers the pure gameplay logic (26 tests):

- Balloon layer damage (layer transitions, armor, armor-pierce, overkill)
- Leaked-life calculation and game-over
- Tower placement validation (path / scenery / occupied / affordability / bounds)
- Upgrade-path locking (two-path rule, tier caps, affordability)
- Target selection (all four modes, range culling, empty board)

Run with `npm test`.

---

## Notes & limitations

- Audio is intentionally a no-op boundary this version — no sound effects or music.
- Persistence stores only lightweight data (best completed wave, auto-start, speed).
- The board is a single fixed-aspect (16:9) canvas that scales responsively; on narrow
  screens the shop moves below the board.
# tower-defense
