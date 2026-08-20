import { CELL, GRID_H, GRID_W, PATH_WIDTH } from './config/map';
import type { Vec2 } from './types';

export interface PathGeometry {
  points: Vec2[];
  /** Cumulative distance at each waypoint. */
  cumulative: number[];
  totalLength: number;
}

/** Build the path geometry: cumulative distances along the polyline. */
export function buildPath(points: Vec2[]): PathGeometry {
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    total += Math.hypot(b.x - a.x, b.y - a.y);
    cumulative.push(total);
  }
  return { points, cumulative, totalLength: total };
}

/**
 * Position + heading at a given distance along the path.
 * `dist` is clamped to [0, totalLength].
 */
export function pointAt(path: PathGeometry, dist: number): { x: number; y: number; angle: number } {
  const d = Math.max(0, Math.min(path.totalLength, dist));
  const pts = path.points;
  const cum = path.cumulative;
  let i = 1;
  while (i < cum.length && cum[i] < d) i++;
  if (i >= pts.length) i = pts.length - 1;
  const a = pts[i - 1];
  const b = pts[i];
  const segLen = cum[i] - cum[i - 1] || 1;
  const t = (d - cum[i - 1]) / segLen;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

/**
 * Grid cells that the path corridor covers (towers may not be placed on them).
 * A cell is blocked if the path centerline passes within PATH_WIDTH/2 of the
 * cell center, or if any point of the cell is within PATH_WIDTH/2 of the path.
 */
export function computeBlockedCells(path: PathGeometry): Set<number> {
  const blocked = new Set<number>();
  const half = PATH_WIDTH / 2;
  // Sample the path densely and mark cells whose center is within half + margin.
  const step = 8;
  for (let d = 0; d <= path.totalLength; d += step) {
    const p = pointAt(path, d);
    const col = Math.floor(p.x / CELL);
    const row = Math.floor(p.y / CELL);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || r < 0 || c >= GRID_W || r >= GRID_H) continue;
        const cx = c * CELL + CELL / 2;
        const cy = r * CELL + CELL / 2;
        if (Math.hypot(cx - p.x, cy - p.y) <= half + CELL * 0.55) {
          blocked.add(r * GRID_W + c);
        }
      }
    }
  }
  return blocked;
}
