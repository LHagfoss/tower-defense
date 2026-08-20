import type { BalloonVariant, VariantDef } from '../types';

/**
 * Balloon variants introduced across the campaign.
 * `armor` is a flat reduction applied to each incoming hit (a hit always
 * deals at least 1 pop of damage). `speedMult` scales the base path speed.
 */
export const VARIANTS: Record<BalloonVariant, VariantDef> = {
  normal: {
    id: 'normal',
    name: 'Standard',
    description: 'A plain party balloon. Nothing to see here.',
    speedMult: 1,
    armor: 0,
    radiusMult: 1,
    rewardMult: 1,
  },
  fast: {
    id: 'fast',
    name: 'Speedy',
    description: 'Zips along the path 60% faster. Pays a little extra.',
    speedMult: 1.6,
    armor: 0,
    radiusMult: 0.9,
    rewardMult: 1.2,
  },
  armored: {
    id: 'armored',
    name: 'Armored',
    description: 'A stiff shell absorbs 1 pop of damage per hit.',
    speedMult: 0.9,
    armor: 1,
    radiusMult: 1.05,
    rewardMult: 1.5,
  },
  swarm: {
    id: 'swarm',
    name: 'Swarm',
    description: 'Small and quick; travels in tight, dense packs.',
    speedMult: 1.3,
    armor: 0,
    radiusMult: 0.7,
    rewardMult: 0.6,
  },
  boss: {
    id: 'boss',
    name: 'Big Boss',
    description: 'A giant 12-layer balloon with heavy armor. Bring the ballista.',
    speedMult: 0.55,
    armor: 2,
    radiusMult: 2.2,
    rewardMult: 8,
  },
};

export const VARIANT_LIST: VariantDef[] = [
  VARIANTS.normal,
  VARIANTS.fast,
  VARIANTS.armored,
  VARIANTS.swarm,
  VARIANTS.boss,
];
