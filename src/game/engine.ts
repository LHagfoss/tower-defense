import { LAYERS, layerForCount, MAX_LAYERS } from './config/layers';
import { VARIANTS } from './config/variants';
import {
  BASE_BALLOON_SPEED,
  START_LIVES,
  START_MONEY,
  TOTAL_WAVES,
  WAVES,
} from './config/waves';
import { SELL_REFUND, TOWERS, computeStats } from './config/towers';
import { BOARD_H, BOARD_W, GRID_H, GRID_W, SCENERY, cellCenter, cellAt } from './config/map';
import { buildPath, computeBlockedCells, pointAt, type PathGeometry } from './path';
import type {
  Balloon,
  Effect,
  GameEvent,
  GamePhase,
  GameSnapshot,
  Projectile,
  SpawnEntry,
  TargetingMode,
  Tower,
  TowerKind,
  UpgradePathId,
  Vec2,
} from './types';

export const PATH: PathGeometry = buildPath([
  { x: -60, y: 180 },
  { x: 240, y: 180 },
  { x: 240, y: 520 },
  { x: 560, y: 520 },
  { x: 560, y: 200 },
  { x: 880, y: 200 },
  { x: 880, y: 560 },
  { x: 1340, y: 560 },
]);

export const BLOCKED_CELLS = computeBlockedCells(PATH);
export const SCENERY_CELLS = new Set(SCENERY.map((s) => s.cell));

let nextId = 1;
const genId = () => nextId++;

/**
 * The full simulation. Pure-ish: no React, no DOM. The renderer reads its
 * state each frame; React reads snapshots on demand.
 */
export class GameEngine {
  phase: GamePhase = 'menu';
  money = START_MONEY;
  lives = START_LIVES;
  maxLives = START_LIVES;
  wave = 0; // 0 = before the first wave
  paused = false;
  speed: 1 | 2 = 2;
  autoStart = true;

  balloons: Balloon[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  effects: Effect[] = [];

  selectedTowerId: number | null = null;
  placingKind: TowerKind | null = null;

  /** Spawn queue for the current wave. */
  private spawnQueue: { entry: SpawnEntry; spawned: number; timer: number }[] = [];
  private countdown = 0;
  private waveActive = false;

  /** Best completed wave (persisted by the UI layer). */
  bestWave = 0;

  /** Audio boundary — the UI layer subscribes here. */
  onEvent: ((e: GameEvent) => void) | null = null;

  constructor() {
    this.reset();
  }

  private emit(e: GameEvent) {
    this.onEvent?.(e);
  }

  reset() {
    this.phase = 'playing';
    this.money = START_MONEY;
    this.lives = this.maxLives;
    this.wave = 0;
    this.paused = false;
    this.balloons = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
    this.selectedTowerId = null;
    this.placingKind = null;
    this.spawnQueue = [];
    this.waveActive = false;
    this.countdown = 0;
  }

  // ------------------------------------------------------------------ waves

  /** Begin the next wave (no-op if one is already active). */
  startNextWave() {
    if (this.phase !== 'playing' || this.waveActive || this.wave >= TOTAL_WAVES) return;
    this.wave += 1;
    const def = WAVES[this.wave - 1];
    this.spawnQueue = def.groups.map((entry) => ({ entry, spawned: 0, timer: entry.delay }));
    this.waveActive = true;
    this.countdown = 0;
    this.emit({ type: 'wave-start', wave: this.wave });
  }

  private spawnBalloon(entry: SpawnEntry) {
    const variant = VARIANTS[entry.variant];
    const layers = Math.min(MAX_LAYERS, entry.layers);
    const start = pointAt(PATH, 0);
    this.balloons.push({
      id: genId(),
      variant: entry.variant,
      layers,
      maxLayers: layers,
      dist: 0,
      speed: BASE_BALLOON_SPEED * variant.speedMult,
      slowUntil: 0,
      slowFactor: 1,
      wobble: Math.random() * Math.PI * 2,
      x: start.x,
      y: start.y,
      dead: false,
    });
  }

  // ------------------------------------------------------------- placement

  /** Whether a tower of `kind` can be placed on `cell`. */
  canPlace(cell: number, kind: TowerKind): boolean {
    if (cell < 0 || cell >= GRID_W * GRID_H) return false;
    if (BLOCKED_CELLS.has(cell)) return false;
    if (SCENERY_CELLS.has(cell)) return false;
    if (this.towers.some((t) => t.cell === cell)) return false;
    return this.money >= TOWERS[kind].cost;
  }

  /** Placement validity ignoring money (for preview feedback). */
  isCellFree(cell: number): boolean {
    if (cell < 0 || cell >= GRID_W * GRID_H) return false;
    if (BLOCKED_CELLS.has(cell)) return false;
    if (SCENERY_CELLS.has(cell)) return false;
    return !this.towers.some((t) => t.cell === cell);
  }

  placeTower(cell: number, kind: TowerKind): Tower | null {
    if (!this.canPlace(cell, kind)) return null;
    const def = TOWERS[kind];
    this.money -= def.cost;
    const pos = cellCenter(cell);
    const tower: Tower = {
      id: genId(),
      kind,
      cell,
      x: pos.x,
      y: pos.y,
      stats: computeStats(kind, { a: 0, b: 0, c: 0 }),
      targeting: 'first',
      tiers: { a: 0, b: 0, c: 0 },
      invested: def.cost,
      pops: 0,
      cooldown: 0,
      targetId: null,
      recoil: 0,
    };
    this.towers.push(tower);
    this.placingKind = null;
    this.selectedTowerId = tower.id;
    this.emit({ type: 'place', kind });
    return tower;
  }

  sellTower(id: number): number {
    const idx = this.towers.findIndex((t) => t.id === id);
    if (idx === -1) return 0;
    const tower = this.towers[idx];
    const refund = Math.floor(tower.invested * SELL_REFUND);
    this.money += refund;
    this.towers.splice(idx, 1);
    if (this.selectedTowerId === id) this.selectedTowerId = null;
    this.emit({ type: 'sell' });
    return refund;
  }

  // -------------------------------------------------------------- upgrades

  /**
   * Which paths are still open for a tower. A path is locked once the tower
   * has purchased tiers in two *other* paths (the unused third path dies).
   */
  pathState(tower: Tower): Record<UpgradePathId, 'open' | 'locked'> {
    const used = (['a', 'b', 'c'] as const).filter((p) => tower.tiers[p] > 0);
    const state = {} as Record<UpgradePathId, 'open' | 'locked'>;
    (['a', 'b', 'c'] as const).forEach((p) => {
      if (used.length >= 2 && !used.includes(p)) state[p] = 'locked';
      else state[p] = 'open';
    });
    return state;
  }

  /** Cost of the next tier on a path, or null if maxed/locked. */
  nextUpgradeCost(tower: Tower, pathId: UpgradePathId): number | null {
    if (this.pathState(tower)[pathId] === 'locked') return null;
    const tier = tower.tiers[pathId];
    if (tier >= 3) return null;
    return TOWERS[tower.kind].paths[pathId].tiers[tier].cost;
  }

  buyUpgrade(towerId: number, pathId: UpgradePathId): boolean {
    const tower = this.towers.find((t) => t.id === towerId);
    if (!tower) return false;
    const cost = this.nextUpgradeCost(tower, pathId);
    if (cost === null || this.money < cost) return false;
    this.money -= cost;
    tower.invested += cost;
    tower.tiers[pathId] += 1;
    tower.stats = computeStats(tower.kind, tower.tiers);
    this.emit({ type: 'upgrade' });
    return true;
  }

  setTargeting(towerId: number, mode: TargetingMode) {
    const tower = this.towers.find((t) => t.id === towerId);
    if (tower) tower.targeting = mode;
  }

  // --------------------------------------------------------------- damage

  /**
   * Apply `rawDamage` pops to a balloon. Armor absorbs flat damage first
   * (a hit always deals at least 1 pop). Returns the number of layers
   * actually removed.
   */
  applyDamage(b: Balloon, rawDamage: number, armorPierce: number): number {
    const armor = VARIANTS[b.variant].armor * (1 - armorPierce);
    const pops = Math.max(1, Math.round(rawDamage - armor));
    const removed = Math.min(pops, b.layers);
    b.layers -= removed;
    if (b.layers <= 0) {
      b.dead = true;
    }
    return removed;
  }

  /** Pop a balloon: award money for every layer removed, spawn effects. */
  private popBalloon(b: Balloon, removed: number, sourceTowerId: number | null = null) {
    if (removed > 0 && sourceTowerId !== null) {
      const src = this.towers.find((t) => t.id === sourceTowerId);
      if (src) src.pops += removed;
    }
    const variant = VARIANTS[b.variant];
    let reward = 0;
    for (let i = 0; i < removed; i++) {
      // The layers just removed were (remaining+1) .. (remaining+removed).
      const layer = b.layers + 1 + i;
      reward += layerForCount(layer).reward * variant.rewardMult;
    }
    this.money += Math.round(reward);
    const color = layerForCount(Math.max(1, b.layers)).color;
    this.effects.push({ kind: 'pop', x: b.x, y: b.y, color, t: 0, duration: 0.45 });
    if (b.dead) {
      this.effects.push({
        kind: 'text',
        x: b.x,
        y: b.y - 14,
        text: `+${Math.round(reward)}`,
        color: '#3d6b35',
        t: 0,
        duration: 0.9,
      });
    }
    this.emit({ type: 'pop', layers: b.layers });
  }

  /** Balloon reached the exit: lose lives equal to remaining layers. */
  private leakBalloon(b: Balloon) {
    this.lives = Math.max(0, this.lives - b.layers);
    this.effects.push({
      kind: 'text',
      x: Math.min(b.x, BOARD_W - 40),
      y: b.y,
      text: `-${b.layers}`,
      color: '#b03a2e',
      t: 0,
      duration: 1.1,
    });
    this.emit({ type: 'leak', layers: b.layers });
    if (this.lives <= 0) {
      this.phase = 'lost';
      this.emit({ type: 'lose' });
    }
  }

  // --------------------------------------------------------------- targeting

  /**
   * Pick a target for a tower.
   *  - first: furthest along the path
   *  - last: closest to the entrance
   *  - strong: most remaining layers (then furthest along)
   *  - close: nearest in Euclidean distance
   */
  selectTarget(tower: Tower): Balloon | null {
    const r2 = tower.stats.range * tower.stats.range;
    let best: Balloon | null = null;
    let bestScore = -Infinity;
    for (const b of this.balloons) {
      if (b.dead) continue;
      const dx = b.x - tower.x;
      const dy = b.y - tower.y;
      if (dx * dx + dy * dy > r2) continue;
      let score: number;
      switch (tower.targeting) {
        case 'first':
          score = b.dist;
          break;
        case 'last':
          score = -b.dist;
          break;
        case 'strong':
          score = b.layers * 1000 + b.dist;
          break;
        case 'close':
          score = -Math.hypot(dx, dy);
          break;
      }
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    return best;
  }

  // ----------------------------------------------------------------- firing

  private fire(tower: Tower, target: Balloon) {
    const s = tower.stats;
    const dx = target.x - tower.x;
    const dy = target.y - tower.y;
    const d = Math.hypot(dx, dy) || 1;
    const crit = Math.random() < s.critChance;
    const speed = s.projectileSpeed;
    this.projectiles.push({
      id: genId(),
      kind: tower.kind,
      x: tower.x,
      y: tower.y - 18,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed,
      damage: s.damage * (crit ? s.critMult : 1),
      splash: s.splash,
      pierce: s.pierce,
      armorPierce: s.armorPierce,
      slowFactor: s.slowFactor,
      slowDuration: s.slowDuration,
      critChance: 0,
      critMult: 1,
      crit,
      sourceTowerId: tower.id,
      hitIds: [],
      life: 2.5,
      trail: [],
    });
    tower.cooldown = 1 / s.fireRate;
    tower.recoil = 0.12;
    this.emit({ type: 'shot', kind: tower.kind });
  }

  /**
   * Damage a balloon with a projectile. Returns true if the projectile
   * should be consumed (no pierce left).
   */
  private hitBalloon(p: Projectile, b: Balloon): boolean {
    if (p.hitIds.includes(b.id)) return false;
    p.hitIds.push(b.id);
    const removed = this.applyDamage(b, p.damage, p.armorPierce);
    if (removed > 0) {
      this.popBalloon(b, removed, p.sourceTowerId);
    }
    if (p.slowDuration > 0 && !b.dead) {
      b.slowFactor = Math.min(b.slowFactor, p.slowFactor);
      b.slowUntil = Math.max(b.slowUntil, this.gameTime + p.slowDuration);
    }
    return p.pierce > 0; // keep flying if it can pierce
  }

  // ------------------------------------------------------------------ update

  /** Game-time in seconds (advances only while unpaused). */
  gameTime = 0;

  /**
   * Advance the simulation by `dt` seconds of real time.
   * Internally scales by `speed` (1 or 2). No-op while paused or not playing.
   */
  update(dt: number) {
    if (this.phase !== 'playing' || this.paused) return;
    const step = Math.min(dt, 0.1) * this.speed;
    this.gameTime += step;
    this.updateWaves(step);
    this.updateBalloons(step);
    this.updateTowers(step);
    this.updateProjectiles(step);
    this.updateEffects(step);
  }

  private updateWaves(dt: number) {
    if (this.waveActive) {
      // Spawn from the queue.
      for (const group of this.spawnQueue) {
        if (group.spawned >= group.entry.count) continue;
        group.timer -= dt;
        while (group.timer <= 0 && group.spawned < group.entry.count) {
          this.spawnBalloon(group.entry);
          group.spawned += 1;
          group.timer += group.entry.interval;
        }
      }
      const allSpawned = this.spawnQueue.every((g) => g.spawned >= g.entry.count);
      if (allSpawned && this.balloons.length === 0) {
        // Wave cleared.
        const def = WAVES[this.wave - 1];
        this.money += def.reward;
        this.effects.push({
          kind: 'text',
          x: BOARD_W / 2,
          y: BOARD_H / 2 - 60,
          text: `Wave ${this.wave} cleared! +$${def.reward}`,
          color: '#3d6b35',
          t: 0,
          duration: 1.6,
        });
        this.emit({ type: 'wave-clear', wave: this.wave });
        this.bestWave = Math.max(this.bestWave, this.wave);
        this.waveActive = false;
        if (this.wave >= TOTAL_WAVES) {
          this.phase = 'won';
          this.emit({ type: 'win' });
        } else if (this.autoStart) {
          // Instant auto-start: begin the next wave immediately.
          this.startNextWave();
        } else {
          this.countdown = 0; // waiting for the player (Space)
        }
      }
    } else if (this.wave < TOTAL_WAVES) {
      if (this.autoStart) {
        this.countdown -= dt;
        if (this.countdown <= 0) this.startNextWave();
      } else {
        this.countdown = 0; // waiting for the player (Space)
      }
    }
  }

  private updateBalloons(dt: number) {
    for (const b of this.balloons) {
      if (b.dead) continue;
      const slowed = this.gameTime < b.slowUntil ? b.slowFactor : 1;
      b.dist += b.speed * slowed * dt;
      if (b.dist >= PATH.totalLength) {
        b.dead = true;
        this.leakBalloon(b);
        continue;
      }
      const p = pointAt(PATH, b.dist);
      const wobble = Math.sin(this.gameTime * 3 + b.wobble) * 3;
      b.x = p.x;
      b.y = p.y + wobble;
    }
    this.balloons = this.balloons.filter((b) => !b.dead);
  }

  private updateTowers(dt: number) {
    for (const t of this.towers) {
      t.cooldown -= dt;
      t.recoil = Math.max(0, t.recoil - dt);
      if (t.cooldown > 0) continue;
      // Re-acquire: keep the current target if still valid, else pick a new one.
      let target: Balloon | null = this.balloons.find((b) => b.id === t.targetId && !b.dead) ?? null;
      if (!target || !this.inRange(t, target)) {
        target = this.selectTarget(t);
      }
      t.targetId = target ? target.id : null;
      if (target) this.fire(t, target);
    }
  }

  private inRange(t: Tower, b: Balloon): boolean {
    const dx = b.x - t.x;
    const dy = b.y - t.y;
    return dx * dx + dy * dy <= t.stats.range * t.stats.range;
  }

  private updateProjectiles(dt: number) {
    const alive: Projectile[] = [];
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 6) p.trail.shift();
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -40 || p.x > BOARD_W + 40 || p.y < -40 || p.y > BOARD_H + 40) continue;

      let consumed = false;
      if (p.splash > 0) {
        // Explode on first contact: damage everything in the blast.
        for (const b of this.balloons) {
          if (b.dead) continue;
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          if (dx * dx + dy * dy <= p.splash * p.splash) {
            const removed = this.applyDamage(b, p.damage, p.armorPierce);
            if (removed > 0) this.popBalloon(b, removed, p.sourceTowerId);
            if (p.slowDuration > 0 && !b.dead) {
              b.slowFactor = Math.min(b.slowFactor, p.slowFactor);
              b.slowUntil = Math.max(b.slowUntil, this.gameTime + p.slowDuration);
            }
          }
        }
        this.effects.push({ kind: 'ring', x: p.x, y: p.y, color: '#e8842c', t: 0, duration: 0.35, radius: p.splash });
        this.emit({ type: 'explosion', x: p.x, y: p.y });
        consumed = true;
      } else {
        // Homing single-target: hit the closest balloon within a small radius.
        const hitR = 16;
        for (const b of this.balloons) {
          if (b.dead) continue;
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          if (dx * dx + dy * dy <= hitR * hitR) {
            const keepGoing = this.hitBalloon(p, b);
            if (!keepGoing) {
              consumed = true;
              break;
            }
          }
        }
      }
      if (!consumed) alive.push(p);
    }
    this.projectiles = alive;
  }

  private updateEffects(dt: number) {
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.duration);
  }

  // --------------------------------------------------------------- snapshot

  getSnapshot(): GameSnapshot {
    const unspawned = this.spawnQueue.reduce((n, g) => n + (g.entry.count - g.spawned), 0);
    return {
      phase: this.phase,
      money: this.money,
      lives: this.lives,
      maxLives: this.maxLives,
      wave: this.wave,
      totalWaves: TOTAL_WAVES,
      waveName: this.wave > 0 ? WAVES[this.wave - 1].name : '',
      enemiesRemaining: this.balloons.length + unspawned,
      countdown: this.waveActive ? 0 : Math.max(0, this.countdown),
      paused: this.paused,
      speed: this.speed,
      autoStart: this.autoStart,
      selectedTowerId: this.selectedTowerId,
      placingKind: this.placingKind,
      bestWave: this.bestWave,
    };
  }

  getTower(id: number | null): Tower | null {
    if (id === null) return null;
    return this.towers.find((t) => t.id === id) ?? null;
  }

  /** Grid cell under a board-space point. */
  cellAtPoint(x: number, y: number): number {
    return cellAt(x, y);
  }

  /** Convert a canvas pixel point to logical board coordinates. */
  static toBoard(clientX: number, clientY: number, canvas: HTMLCanvasElement): Vec2 {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * BOARD_W,
      y: ((clientY - rect.top) / rect.height) * BOARD_H,
    };
  }
}

export { LAYERS, MAX_LAYERS };
