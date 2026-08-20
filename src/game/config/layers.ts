import type { LayerDef } from '../types';

/**
 * Balloon layers. A balloon's color always reflects its REMAINING layer count:
 * red = 1 layer left, blue = 2, green = 3, yellow = 4, pink = 5.
 * Damage removes layers; each removed layer pays its reward.
 */
export const LAYERS: LayerDef[] = [
  { layers: 1, name: 'Red', color: '#e0533d', dark: '#9c3524', reward: 5 },
  { layers: 2, name: 'Blue', color: '#3f7fd4', dark: '#2a5694', reward: 6 },
  { layers: 3, name: 'Green', color: '#5aa84f', dark: '#3c7a33', reward: 7 },
  { layers: 4, name: 'Yellow', color: '#e8b93c', dark: '#a8811f', reward: 8 },
  { layers: 5, name: 'Pink', color: '#e07ab0', dark: '#a85187', reward: 9 },
];

export const MAX_LAYERS = 5;

/** Look up the layer definition for a given remaining layer count (clamped). */
export function layerForCount(count: number): LayerDef {
  const n = Math.max(1, Math.min(MAX_LAYERS, Math.round(count)));
  return LAYERS[n - 1];
}
