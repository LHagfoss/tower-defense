import { describe, expect, it } from 'vitest';
import { GameEngine, BLOCKED_CELLS, SCENERY_CELLS } from './engine';
import { GRID_W } from './config/map';
import { TOWERS, computeStats } from './config/towers';
import { layerForCount } from './config/layers';

/** A free cell (row 0, col 16) — well away from the path. */
const FREE_CELL = 0 * GRID_W + 16;

function makeEngine() {
  const e = new GameEngine();
  e.phase = 'playing';
  return e;
}

describe('balloon layer damage', () => {
  it('one pop turns a blue (2-layer) balloon into red (1-layer)', () => {
    const e = makeEngine();
    const b = { id: 1, variant: 'normal' as const, layers: 2, maxLayers: 2, dist: 0, speed: 85, slowUntil: 0, slowFactor: 1, wobble: 0, x: 0, y: 0, dead: false };
    const removed = e.applyDamage(b, 1, 0);
    expect(removed).toBe(1);
    expect(b.layers).toBe(1);
    expect(b.dead).toBe(false);
    expect(layerForCount(b.layers).name).toBe('Red');
  });

  it('two pops destroy a blue balloon', () => {
    const e = makeEngine();
    const b = { id: 1, variant: 'normal' as const, layers: 2, maxLayers: 2, dist: 0, speed: 85, slowUntil: 0, slowFactor: 1, wobble: 0, x: 0, y: 0, dead: false };
    const removed = e.applyDamage(b, 2, 0);
    expect(removed).toBe(2);
    expect(b.dead).toBe(true);
  });

  it('two pops turn a green (3-layer) balloon into red', () => {
    const e = makeEngine();
    const b = { id: 1, variant: 'normal' as const, layers: 3, maxLayers: 3, dist: 0, speed: 85, slowUntil: 0, slowFactor: 1, wobble: 0, x: 0, y: 0, dead: false };
    e.applyDamage(b, 2, 0);
    expect(b.layers).toBe(1);
    expect(b.dead).toBe(false);
  });

  it('armor reduces damage but a hit always deals at least 1 pop', () => {
    const e = makeEngine();
    const b = { id: 1, variant: 'armored' as const, layers: 3, maxLayers: 3, dist: 0, speed: 85, slowUntil: 0, slowFactor: 1, wobble: 0, x: 0, y: 0, dead: false };
    // Armored has armor 1; a 1-damage hit is fully absorbed but still pops 1 layer.
    expect(e.applyDamage(b, 1, 0)).toBe(1);
    expect(b.layers).toBe(2);
    // A 2-damage hit is reduced to 1 pop by armor.
    expect(e.applyDamage(b, 2, 0)).toBe(1);
    expect(b.layers).toBe(1);
  });

  it('armor pierce ignores a fraction of armor', () => {
    const e = makeEngine();
    const b = { id: 1, variant: 'armored' as const, layers: 3, maxLayers: 3, dist: 0, speed: 85, slowUntil: 0, slowFactor: 1, wobble: 0, x: 0, y: 0, dead: false };
    // 50% armor pierce: armor 1 * 0.5 = 0.5, rounded damage 2 - 0.5 = 1.5 -> 2 pops.
    expect(e.applyDamage(b, 2, 0.5)).toBe(2);
    expect(b.layers).toBe(1);
  });

  it('damage never removes more layers than remain', () => {
    const e = makeEngine();
    const b = { id: 1, variant: 'normal' as const, layers: 1, maxLayers: 1, dist: 0, speed: 85, slowUntil: 0, slowFactor: 1, wobble: 0, x: 0, y: 0, dead: false };
    expect(e.applyDamage(b, 10, 0)).toBe(1);
    expect(b.layers).toBe(0);
    expect(b.dead).toBe(true);
  });
});

describe('leaked-life calculation', () => {
  it('a leaked balloon subtracts lives equal to its remaining layers', () => {
    const e = makeEngine();
    e.lives = 20;
    const b = { id: 1, variant: 'normal' as const, layers: 3, maxLayers: 5, dist: 0, speed: 85, slowUntil: 0, slowFactor: 1, wobble: 0, x: 0, y: 0, dead: false };
    // Force a leak by running the private path via update: place balloon at end.
    b.dist = 1e9; // beyond path end
    e.balloons.push(b);
    e.update(0.016);
    expect(e.lives).toBe(17);
  });

  it('losing more lives than remain ends the game', () => {
    const e = makeEngine();
    e.lives = 2;
    const b = { id: 1, variant: 'normal' as const, layers: 5, maxLayers: 5, dist: 1e9, speed: 85, slowUntil: 0, slowFactor: 1, wobble: 0, x: 0, y: 0, dead: false };
    e.balloons.push(b);
    e.update(0.016);
    expect(e.lives).toBe(0);
    expect(e.phase).toBe('lost');
  });
});

describe('tower placement validation', () => {
  it('rejects placement on path cells', () => {
    const e = makeEngine();
    const pathCell = [...BLOCKED_CELLS][0];
    expect(e.canPlace(pathCell, 'needle')).toBe(false);
  });

  it('rejects placement on scenery cells', () => {
    const e = makeEngine();
    // Find a scenery cell that is not on the path.
    const sceneryCell = [...SCENERY_CELLS].find((c) => !BLOCKED_CELLS.has(c))!;
    expect(e.canPlace(sceneryCell, 'needle')).toBe(false);
  });

  it('rejects placement on an occupied cell', () => {
    const e = makeEngine();
    e.money = 1000;
    const t = e.placeTower(FREE_CELL, 'needle');
    expect(t).not.toBeNull();
    expect(e.canPlace(FREE_CELL, 'firecracker')).toBe(false);
  });

  it('rejects placement when the player cannot afford it', () => {
    const e = makeEngine();
    e.money = 10;
    expect(e.canPlace(FREE_CELL, 'needle')).toBe(false);
    expect(e.placeTower(FREE_CELL, 'needle')).toBeNull();
  });

  it('allows placement on a free, affordable cell and deducts money', () => {
    const e = makeEngine();
    e.money = 500;
    const before = e.money;
    const t = e.placeTower(FREE_CELL, 'needle');
    expect(t).not.toBeNull();
    expect(e.money).toBe(before - TOWERS.needle.cost);
    expect(t!.invested).toBe(TOWERS.needle.cost);
  });

  it('rejects out-of-bounds cells', () => {
    const e = makeEngine();
    expect(e.canPlace(-1, 'needle')).toBe(false);
    expect(e.canPlace(GRID_W * 100, 'needle')).toBe(false);
  });
});

describe('upgrade-path locking', () => {
  it('keeps all paths open with no purchases', () => {
    const e = makeEngine();
    e.money = 1000;
    const t = e.placeTower(FREE_CELL, 'needle')!;
    const state = e.pathState(t);
    expect(state.a).toBe('open');
    expect(state.b).toBe('open');
    expect(state.c).toBe('open');
  });

  it('keeps the third path open after buying in one path', () => {
    const e = makeEngine();
    e.money = 1000;
    const t = e.placeTower(FREE_CELL, 'needle')!;
    e.buyUpgrade(t.id, 'a');
    const state = e.pathState(t);
    expect(state.a).toBe('open');
    expect(state.b).toBe('open');
    expect(state.c).toBe('open');
  });

  it('locks the unused third path once two paths are purchased', () => {
    const e = makeEngine();
    e.money = 1000;
    const t = e.placeTower(FREE_CELL, 'needle')!;
    e.buyUpgrade(t.id, 'a');
    e.buyUpgrade(t.id, 'b');
    const state = e.pathState(t);
    expect(state.a).toBe('open');
    expect(state.b).toBe('open');
    expect(state.c).toBe('locked');
    // The locked path cannot be bought.
    expect(e.nextUpgradeCost(t, 'c')).toBeNull();
    expect(e.buyUpgrade(t.id, 'c')).toBe(false);
  });

  it('allows both chosen paths to reach tier 3', () => {
    const e = makeEngine();
    e.money = 100000;
    const t = e.placeTower(FREE_CELL, 'needle')!;
    for (let i = 0; i < 3; i++) {
      expect(e.buyUpgrade(t.id, 'a')).toBe(true);
      expect(e.buyUpgrade(t.id, 'b')).toBe(true);
    }
    expect(t.tiers.a).toBe(3);
    expect(t.tiers.b).toBe(3);
    // Maxed paths report no next cost.
    expect(e.nextUpgradeCost(t, 'a')).toBeNull();
    expect(e.nextUpgradeCost(t, 'b')).toBeNull();
  });

  it('refuses upgrades the player cannot afford', () => {
    const e = makeEngine();
    e.money = 100; // just enough for the tower, not the upgrade
    const t = e.placeTower(FREE_CELL, 'needle')!;
    expect(e.buyUpgrade(t.id, 'a')).toBe(false);
    expect(t.tiers.a).toBe(0);
  });

  it('recomputes stats from purchased tiers', () => {
    const base = computeStats('needle', { a: 0, b: 0, c: 0 });
    const upgraded = computeStats('needle', { a: 3, b: 0, c: 0 });
    expect(upgraded.damage).toBeGreaterThan(base.damage);
  });
});

describe('target selection', () => {
  function balloonAt(id: number, dist: number, layers: number, x: number, y: number) {
    return { id, variant: 'normal' as const, layers, maxLayers: layers, dist, speed: 85, slowUntil: 0, slowFactor: 1, wobble: 0, x, y, dead: false };
  }

  it('first targets the balloon furthest along the path', () => {
    const e = makeEngine();
    const t = e.placeTower(FREE_CELL, 'needle')!;
    t.stats.range = 1000;
    e.balloons.push(
      balloonAt(1, 100, 1, t.x + 10, t.y),
      balloonAt(2, 500, 1, t.x + 20, t.y),
      balloonAt(3, 300, 1, t.x + 30, t.y),
    );
    expect(e.selectTarget(t)!.id).toBe(2);
  });

  it('last targets the balloon closest to the entrance', () => {
    const e = makeEngine();
    const t = e.placeTower(FREE_CELL, 'needle')!;
    t.stats.range = 1000;
    e.balloons.push(
      balloonAt(1, 100, 1, t.x + 10, t.y),
      balloonAt(2, 500, 1, t.x + 20, t.y),
      balloonAt(3, 300, 1, t.x + 30, t.y),
    );
    t.targeting = 'last';
    expect(e.selectTarget(t)!.id).toBe(1);
  });

  it('strong targets the balloon with the most layers', () => {
    const e = makeEngine();
    const t = e.placeTower(FREE_CELL, 'needle')!;
    t.stats.range = 1000;
    e.balloons.push(
      balloonAt(1, 500, 1, t.x + 10, t.y),
      balloonAt(2, 100, 5, t.x + 20, t.y),
      balloonAt(3, 400, 3, t.x + 30, t.y),
    );
    t.targeting = 'strong';
    expect(e.selectTarget(t)!.id).toBe(2);
  });

  it('close targets the nearest balloon in space', () => {
    const e = makeEngine();
    const t = e.placeTower(FREE_CELL, 'needle')!;
    t.stats.range = 1000;
    e.balloons.push(
      balloonAt(1, 500, 1, t.x + 100, t.y),
      balloonAt(2, 100, 1, t.x + 5, t.y),
      balloonAt(3, 400, 1, t.x + 50, t.y),
    );
    t.targeting = 'close';
    expect(e.selectTarget(t)!.id).toBe(2);
  });

  it('ignores balloons outside range', () => {
    const e = makeEngine();
    const t = e.placeTower(FREE_CELL, 'needle')!;
    t.stats.range = 50;
    e.balloons.push(balloonAt(1, 100, 1, t.x + 500, t.y + 500));
    expect(e.selectTarget(t)).toBeNull();
  });

  it('returns null when there are no balloons', () => {
    const e = makeEngine();
    const t = e.placeTower(FREE_CELL, 'needle')!;
    expect(e.selectTarget(t)).toBeNull();
  });
});
