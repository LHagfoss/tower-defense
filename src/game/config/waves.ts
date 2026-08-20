import type { WaveDef } from '../types';

/**
 * Ten authored waves. Difficulty ramps through:
 *  - more and higher-layer balloons
 *  - fast balloons (wave 3+), armored (wave 5+), swarms (wave 6+)
 *  - a 12-layer boss on the final wave
 * Rewards are tuned so the economy supports ~2-3 new towers per wave.
 */
export const WAVES: WaveDef[] = [
  {
    index: 1,
    name: 'First Breeze',
    reward: 60,
    groups: [
      { variant: 'normal', layers: 1, count: 8, interval: 1.1, delay: 0 },
    ],
  },
  {
    index: 2,
    name: 'Double Trouble',
    reward: 70,
    groups: [
      { variant: 'normal', layers: 2, count: 8, interval: 1.0, delay: 0 },
      { variant: 'normal', layers: 1, count: 6, interval: 0.8, delay: 2 },
    ],
  },
  {
    index: 3,
    name: 'Quick Step',
    reward: 80,
    groups: [
      { variant: 'normal', layers: 2, count: 8, interval: 0.9, delay: 0 },
      { variant: 'fast', layers: 1, count: 8, interval: 0.7, delay: 1.5 },
      { variant: 'normal', layers: 3, count: 5, interval: 1.1, delay: 2 },
    ],
  },
  {
    index: 4,
    name: 'Green Machine',
    reward: 90,
    groups: [
      { variant: 'normal', layers: 3, count: 10, interval: 0.9, delay: 0 },
      { variant: 'fast', layers: 2, count: 8, interval: 0.7, delay: 1.5 },
      { variant: 'normal', layers: 2, count: 8, interval: 0.8, delay: 1 },
    ],
  },
  {
    index: 5,
    name: 'Hard Shell',
    reward: 110,
    groups: [
      { variant: 'armored', layers: 2, count: 6, interval: 1.2, delay: 0 },
      { variant: 'normal', layers: 3, count: 10, interval: 0.8, delay: 1 },
      { variant: 'fast', layers: 2, count: 8, interval: 0.6, delay: 1.5 },
    ],
  },
  {
    index: 6,
    name: 'Swarm Party',
    reward: 120,
    groups: [
      { variant: 'swarm', layers: 1, count: 18, interval: 0.35, delay: 0 },
      { variant: 'normal', layers: 4, count: 8, interval: 1.0, delay: 2 },
      { variant: 'swarm', layers: 2, count: 14, interval: 0.4, delay: 1.5 },
    ],
  },
  {
    index: 7,
    name: 'Yellow Storm',
    reward: 140,
    groups: [
      { variant: 'normal', layers: 4, count: 12, interval: 0.8, delay: 0 },
      { variant: 'armored', layers: 3, count: 8, interval: 1.0, delay: 1.5 },
      { variant: 'fast', layers: 3, count: 10, interval: 0.6, delay: 1 },
    ],
  },
  {
    index: 8,
    name: 'Pink Parade',
    reward: 160,
    groups: [
      { variant: 'normal', layers: 5, count: 10, interval: 0.9, delay: 0 },
      { variant: 'swarm', layers: 3, count: 16, interval: 0.4, delay: 1.5 },
      { variant: 'armored', layers: 4, count: 8, interval: 0.9, delay: 1 },
    ],
  },
  {
    index: 9,
    name: 'Full House',
    reward: 180,
    groups: [
      { variant: 'normal', layers: 5, count: 12, interval: 0.8, delay: 0 },
      { variant: 'fast', layers: 4, count: 12, interval: 0.6, delay: 1 },
      { variant: 'armored', layers: 5, count: 10, interval: 0.8, delay: 1.5 },
      { variant: 'swarm', layers: 4, count: 16, interval: 0.35, delay: 1 },
    ],
  },
  {
    index: 10,
    name: 'The Big One',
    reward: 250,
    groups: [
      { variant: 'normal', layers: 5, count: 10, interval: 0.8, delay: 0 },
      { variant: 'armored', layers: 5, count: 8, interval: 0.9, delay: 1.5 },
      { variant: 'boss', layers: 12, count: 1, interval: 1, delay: 3 },
      { variant: 'fast', layers: 4, count: 10, interval: 0.6, delay: 2 },
      { variant: 'swarm', layers: 5, count: 14, interval: 0.35, delay: 1.5 },
    ],
  },
];

export const TOTAL_WAVES = WAVES.length;

/** Base balloon speed in px/second before variant multipliers. */
export const BASE_BALLOON_SPEED = 85;

/** Seconds between waves when auto-start is on. */
export const WAVE_COUNTDOWN = 5;

/** Starting resources. */
export const START_MONEY = 400;
export const START_LIVES = 20;
