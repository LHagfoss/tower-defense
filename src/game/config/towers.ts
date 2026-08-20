import type { TowerDef, TowerKind, TowerStats } from '../types';

/**
 * The three tower types. Base stats are tuned so each has a clear role:
 *  - needle: cheap, rapid, short range — shreds swarms of low-layer balloons
 *  - firecracker: medium cost, slow, splash — great for groups and armored packs
 *  - ballista: expensive, very slow, long range, huge single-target damage —
 *    the answer to armored and boss balloons
 */
export const TOWERS: Record<TowerKind, TowerDef> = {
  needle: {
    kind: 'needle',
    name: 'Needle Turret',
    role: 'Rapid single-target',
    description: 'A spring-loaded pin gun. Cheap and fast — ideal against crowds of thin balloons.',
    cost: 100,
    base: {
      damage: 1,
      fireRate: 2.2,
      range: 130,
      projectileSpeed: 620,
      splash: 0,
      pierce: 0,
      armorPierce: 0,
      slowFactor: 1,
      slowDuration: 0,
      critChance: 0,
      critMult: 1,
    },
    paths: {
      a: {
        id: 'a',
        name: 'Barbed Tips',
        icon: '🪡',
        tiers: [
          { name: 'Barbed Tips', description: '+1 pop damage (2 total).', cost: 120, apply: (s) => { s.damage += 1; } },
          { name: 'Twin Barbs', description: '+1 pop damage (3 total).', cost: 200, apply: (s) => { s.damage += 1; } },
          { name: 'Needle Storm', description: '+1 damage and +0.8 shots/sec.', cost: 320, apply: (s) => { s.damage += 1; s.fireRate += 0.8; } },
        ],
      },
      b: {
        id: 'b',
        name: 'Trigger Tuning',
        icon: '⚙️',
        tiers: [
          { name: 'Quick Trigger', description: '+0.6 shots/sec.', cost: 100, apply: (s) => { s.fireRate += 0.6; } },
          { name: 'Rapid Coil', description: '+0.6 shots/sec and +20 range.', cost: 180, apply: (s) => { s.fireRate += 0.6; s.range += 20; } },
          { name: 'Overclock', description: '+1.0 shots/sec and +30 range.', cost: 300, apply: (s) => { s.fireRate += 1.0; s.range += 30; } },
        ],
      },
      c: {
        id: 'c',
        name: 'Piercing Needles',
        icon: '🎯',
        tiers: [
          { name: 'Piercing Needle', description: 'Needles pierce 1 extra balloon.', cost: 160, apply: (s) => { s.pierce += 1; } },
          { name: 'Deep Pierce', description: 'Pierce 2 extra balloons.', cost: 260, apply: (s) => { s.pierce += 1; } },
          { name: 'Rail Spike', description: 'Pierce 3 extra and +1 damage.', cost: 400, apply: (s) => { s.pierce += 1; s.damage += 1; } },
        ],
      },
    },
  },

  firecracker: {
    kind: 'firecracker',
    name: 'Firecracker',
    role: 'Area splash',
    description: 'Lobs a firecracker that bursts on impact, popping every balloon in the blast.',
    cost: 220,
    base: {
      damage: 1,
      fireRate: 0.55,
      range: 150,
      projectileSpeed: 340,
      splash: 62,
      pierce: 0,
      armorPierce: 0,
      slowFactor: 1,
      slowDuration: 0,
      critChance: 0,
      critMult: 1,
    },
    paths: {
      a: {
        id: 'a',
        name: 'Bigger Fuse',
        icon: '🧨',
        tiers: [
          { name: 'Bigger Fuse', description: '+1 pop damage (2 total).', cost: 200, apply: (s) => { s.damage += 1; } },
          { name: 'Double Charge', description: '+1 pop damage (3 total).', cost: 320, apply: (s) => { s.damage += 1; } },
          { name: 'Mega Charge', description: '+1 damage (4 total) and +18 splash radius.', cost: 480, apply: (s) => { s.damage += 1; s.splash += 18; } },
        ],
      },
      b: {
        id: 'b',
        name: 'Blast Radius',
        icon: '💥',
        tiers: [
          { name: 'Wide Blast', description: '+22 splash radius.', cost: 180, apply: (s) => { s.splash += 22; } },
          { name: 'Ripple Fuse', description: '+22 splash radius and +0.15 shots/sec.', cost: 300, apply: (s) => { s.splash += 22; s.fireRate += 0.15; } },
          { name: 'Shockwave', description: '+26 splash radius and +0.2 shots/sec.', cost: 460, apply: (s) => { s.splash += 26; s.fireRate += 0.2; } },
        ],
      },
      c: {
        id: 'c',
        name: 'Sticky Goo',
        icon: '🍯',
        tiers: [
          { name: 'Sticky Goo', description: 'Blasts slow balloons by 25% for 1.5s.', cost: 220, apply: (s) => { s.slowFactor = 0.75; s.slowDuration = 1.5; } },
          { name: 'Tacky Sludge', description: 'Slow 40% for 2s.', cost: 340, apply: (s) => { s.slowFactor = 0.6; s.slowDuration = 2; } },
          { name: 'Tar Barrel', description: 'Slow 55% for 2.5s and +1 damage.', cost: 520, apply: (s) => { s.slowFactor = 0.45; s.slowDuration = 2.5; s.damage += 1; } },
        ],
      },
    },
  },

  ballista: {
    kind: 'ballista',
    name: 'Heavy Ballista',
    role: 'Heavy single-target',
    description: 'A massive cardboard catapult. Slow, long-ranged, and devastating on one target.',
    cost: 450,
    base: {
      damage: 4,
      fireRate: 0.3,
      range: 230,
      projectileSpeed: 480,
      splash: 0,
      pierce: 0,
      armorPierce: 0,
      slowFactor: 1,
      slowDuration: 0,
      critChance: 0,
      critMult: 1,
    },
    paths: {
      a: {
        id: 'a',
        name: 'Warhead',
        icon: '🗼',
        tiers: [
          { name: 'Heavy Warhead', description: '+2 pop damage (6 total).', cost: 300, apply: (s) => { s.damage += 2; } },
          { name: 'Crushing Warhead', description: '+3 pop damage (9 total).', cost: 480, apply: (s) => { s.damage += 3; } },
          { name: 'Annihilator', description: '+4 damage (13 total) and +0.05 shots/sec.', cost: 700, apply: (s) => { s.damage += 4; s.fireRate += 0.05; } },
        ],
      },
      b: {
        id: 'b',
        name: 'Armor Splitter',
        icon: '🛡️',
        tiers: [
          { name: 'Armor Splitter', description: 'Ignores 50% of a target’s armor.', cost: 320, apply: (s) => { s.armorPierce = 0.5; } },
          { name: 'Rending Bolt', description: 'Ignores 75% of armor and +1 damage.', cost: 500, apply: (s) => { s.armorPierce = 0.75; s.damage += 1; } },
          { name: 'Obliterator', description: 'Ignores all armor and +2 damage.', cost: 750, apply: (s) => { s.armorPierce = 1; s.damage += 2; } },
        ],
      },
      c: {
        id:
          'c',
        name: 'Critical Aim',
        icon: '🎯',
        tiers: [
          { name: 'Critical Aim', description: '25% chance to deal 2× damage.', cost: 280, apply: (s) => { s.critChance = 0.25; s.critMult = 2; } },
          { name: 'Deadly Focus', description: '40% chance, 2.5× damage.', cost: 440, apply: (s) => { s.critChance = 0.4; s.critMult = 2.5; } },
          { name: 'Executioner', description: '55% chance, 3× damage and +0.05 shots/sec.', cost: 680, apply: (s) => { s.critChance = 0.55; s.critMult = 3; s.fireRate += 0.05; } },
        ],
      },
    },
  },
};

export const TOWER_LIST: TowerDef[] = [TOWERS.needle, TOWERS.firecracker, TOWERS.ballista];

/** Sell refund is 70% of everything invested (base + upgrades). */
export const SELL_REFUND = 0.7;

/**
 * Recompute a tower's effective stats from its base definition plus the
 * tiers purchased on each path. Pure function — safe to call any time.
 */
export function computeStats(kind: TowerKind, tiers: Record<'a' | 'b' | 'c', number>): TowerStats {
  const def = TOWERS[kind];
  const stats: TowerStats = { ...def.base };
  (['a', 'b', 'c'] as const).forEach((pathId) => {
    const path = def.paths[pathId];
    for (let i = 0; i < tiers[pathId]; i++) {
      path.tiers[i].apply(stats);
    }
  });
  return stats;
}
