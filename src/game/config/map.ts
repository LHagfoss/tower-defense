import type { Vec2 } from '../types';

/** Logical board size (the canvas is scaled to fit while keeping this ratio). */
export const BOARD_W = 1280;
export const BOARD_H = 720;

/** Placement grid: 40px cells, 32 x 18. */
export const CELL = 40;
export const GRID_W = BOARD_W / CELL; // 32
export const GRID_H = BOARD_H / CELL; // 18

/** Visual width of the path corridor. */
export const PATH_WIDTH = 56;

/**
 * The winding path, from the balloon entrance (off-board left) to the exit
 * (off-board right). Balloons travel along these waypoints.
 */
export const PATH_POINTS: Vec2[] = [
  { x: -60, y: 180 },
  { x: 240, y: 180 },
  { x: 240, y: 520 },
  { x: 560, y: 520 },
  { x: 560, y: 200 },
  { x: 880, y: 200 },
  { x: 880, y: 560 },
  { x: 1340, y: 560 },
];

export const PATH_START = PATH_POINTS[0];
export const PATH_END = PATH_POINTS[PATH_POINTS.length - 1];

/** A decorative cardboard piece that also blocks placement. */
export interface SceneryDef {
  type: 'crate' | 'bush' | 'box' | 'rock';
  cell: number; // grid cell index (row * GRID_W + col)
}

/** Hand-placed scenery in open areas (each blocks its own cell). */
export const SCENERY: SceneryDef[] = [
  { type: 'crate', cell: 1 * GRID_W + 2 },
  { type: 'bush', cell: 8 * GRID_W + 10 },
  { type: 'box', cell: 10 * GRID_W + 18 },
  { type: 'crate', cell: 16 * GRID_W + 26 },
  { type: 'bush', cell: 15 * GRID_W + 4 },
  { type: 'box', cell: 2 * GRID_W + 28 },
];

export function cellCenter(cell: number): Vec2 {
  const col = cell % GRID_W;
  const row = Math.floor(cell / GRID_W);
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

export function cellAt(x: number, y: number): number {
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  if (col < 0 || row < 0 || col >= GRID_W || row >= GRID_H) return -1;
  return row * GRID_W + col;
}

export function inBounds(cell: number): boolean {
  return cell >= 0 && cell < GRID_W * GRID_H;
}
