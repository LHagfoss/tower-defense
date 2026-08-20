import { BOARD_H, BOARD_W, CELL, GRID_H, GRID_W, PATH_POINTS, PATH_WIDTH, SCENERY, cellCenter } from './config/map';
import { LAYERS, layerForCount } from './config/layers';
import { TOWERS } from './config/towers';
import { VARIANTS } from './config/variants';
import { BLOCKED_CELLS, PATH, type GameEngine } from './engine';
import type { Balloon, Tower } from './types';

/** Deterministic pseudo-random for stable "hand-drawn" wobble. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Wobbly hand-drawn circle path. */
function wobblyCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, wobble = 0.06) {
  const steps = 14;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r * (1 + (rand(seed + i) - 0.5) * 2 * wobble);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Wobbly line between two points. */
function wobblyLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, seed: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const segs = Math.max(2, Math.floor(len / 24));
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const off = (rand(seed + i) - 0.5) * 3;
    ctx.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
  }
}

// ---------------------------------------------------------------- static board

/** Pre-render the static board (background, path, scenery) to an offscreen canvas. */
function renderStaticBoard(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = BOARD_W;
  c.height = BOARD_H;
  const ctx = c.getContext('2d')!;

  // Cardboard base with warm gradient.
  const grad = ctx.createLinearGradient(0, 0, BOARD_W, BOARD_H);
  grad.addColorStop(0, '#e8d5b0');
  grad.addColorStop(0.5, '#e2cda4');
  grad.addColorStop(1, '#dcc49a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);

  // Subtle cardboard speckle.
  for (let i = 0; i < 900; i++) {
    const x = rand(i * 1.3) * BOARD_W;
    const y = rand(i * 2.7) * BOARD_H;
    ctx.fillStyle = `rgba(160, 120, 70, ${0.03 + rand(i) * 0.05})`;
    ctx.fillRect(x, y, 1.5 + rand(i * 3) * 2, 1.5 + rand(i * 5) * 2);
  }

  // Faint fold lines (like a folded card).
  ctx.strokeStyle = 'rgba(150, 110, 60, 0.10)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    const x = (BOARD_W / 4) * i;
    wobblyLine(ctx, x, 0, x, BOARD_H, i * 7);
    ctx.stroke();
  }
  for (let i = 1; i < 3; i++) {
    const y = (BOARD_H / 3) * i;
    wobblyLine(ctx, 0, y, BOARD_W, y, i * 13);
    ctx.stroke();
  }

  // --- Path: warm asphalt-like road with corrugated edges.
  const pts = PATH_POINTS;
  const drawPath = (width: number, style: string) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  };
  // Corrugated edge (darker outline, slightly wider, dashed to suggest corrugation).
  ctx.save();
  ctx.setLineDash([14, 8]);
  drawPath(PATH_WIDTH + 14, 'rgba(122, 84, 48, 0.55)');
  ctx.restore();
  drawPath(PATH_WIDTH + 8, '#b98d5a');
  drawPath(PATH_WIDTH, '#a87c4e');
  // Road surface texture: faint speckles along the path.
  for (let d = 0; d < PATH.totalLength; d += 26) {
    const p = pointAlong(d);
    const off = (rand(d) - 0.5) * (PATH_WIDTH - 18);
    const a = Math.atan2(p.y - (pts[0].y), p.x - pts[0].x);
    ctx.fillStyle = 'rgba(90, 60, 30, 0.18)';
    ctx.fillRect(p.x + Math.cos(a + Math.PI / 2) * off, p.y + Math.sin(a + Math.PI / 2) * off, 3, 3);
  }
  // Dashed center line.
  ctx.save();
  ctx.setLineDash([18, 16]);
  drawPath(3, 'rgba(255, 240, 210, 0.5)');
  ctx.restore();

  // --- Entrance & exit markers.
  const start = pts[0];
  const end = pts[pts.length - 1];
  drawGate(ctx, Math.max(0, start.x), start.y, 'IN', '#5aa84f');
  drawGate(ctx, Math.min(BOARD_W, end.x), end.y, 'OUT', '#b03a2e');

  // --- Scenery.
  for (const s of SCENERY) {
    const { x, y } = cellCenter(s.cell);
    drawScenery(ctx, s.type, x, y, s.cell);
  }

  // Corner tape strips for the diorama feel.
  drawTape(ctx, 18, 18, -0.5);
  drawTape(ctx, BOARD_W - 18, 18, 0.5);
  drawTape(ctx, 18, BOARD_H - 18, 0.5);
  drawTape(ctx, BOARD_W - 18, BOARD_H - 18, -0.5);

  return c;
}

function pointAlong(d: number) {
  const cum = PATH.cumulative;
  let i = 1;
  while (i < cum.length && cum[i] < d) i++;
  if (i >= PATH.points.length) i = PATH.points.length - 1;
  const a = PATH.points[i - 1];
  const b = PATH.points[i];
  const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function drawGate(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
  ctx.save();
  ctx.translate(x, y);
  // Two posts + banner.
  ctx.fillStyle = '#8a6a42';
  ctx.strokeStyle = '#5d4527';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.rect(side * 34 - 5, -46, 10, 52);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-34, -46);
  ctx.lineTo(34, -46);
  ctx.lineTo(28, -26);
  ctx.lineTo(-28, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff8ea';
  ctx.font = 'bold 15px "Comic Sans MS", "Chalkboard SE", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, -31);
  ctx.restore();
}

function drawTape(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(250, 235, 190, 0.75)';
  ctx.strokeStyle = 'rgba(180, 150, 90, 0.5)';
  ctx.lineWidth = 1;
  ctx.fillRect(-26, -10, 52, 20);
  ctx.strokeRect(-26, -10, 52, 20);
  ctx.restore();
}

function drawScenery(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, seed: number) {
  ctx.save();
  ctx.translate(x, y);
  // Warm drop shadow.
  ctx.fillStyle = 'rgba(90, 60, 30, 0.25)';
  ctx.beginPath();
  ctx.ellipse(3, 12, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'crate') {
    ctx.fillStyle = '#c99a5e';
    ctx.strokeStyle = '#7a5a30';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeRect(-16, -16, 32, 32);
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.lineTo(16, 16);
    ctx.moveTo(16, -16);
    ctx.lineTo(-16, 16);
    ctx.stroke();
  } else if (type === 'box') {
    ctx.fillStyle = '#b5824a';
    ctx.strokeStyle = '#6e4c26';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-18, -12, 36, 26);
    ctx.strokeRect(-18, -12, 36, 26);
    ctx.beginPath();
    ctx.moveTo(-18, -4);
    ctx.lineTo(18, -4);
    ctx.stroke();
    // Tape strip.
    ctx.fillStyle = 'rgba(250, 235, 190, 0.8)';
    ctx.fillRect(-4, -12, 8, 26);
  } else if (type === 'bush') {
    ctx.fillStyle = '#7fae5a';
    ctx.strokeStyle = '#4c7a33';
    ctx.lineWidth = 2.5;
    for (const [bx, by, r] of [[-8, 0, 11], [8, -2, 12], [0, -8, 12]] as const) {
      wobblyCircle(ctx, bx, by, r, seed + bx * 3 + by);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // rock
    ctx.fillStyle = '#a89a86';
    ctx.strokeStyle = '#6e6252';
    ctx.lineWidth = 2.5;
    wobblyCircle(ctx, 0, 0, 14, seed, 0.12);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- dynamic bits

function drawBalloon(ctx: CanvasRenderingContext2D, b: Balloon, time: number) {
  const layer = layerForCount(b.layers);
  const variant = VARIANTS[b.variant];
  const r = 13 * variant.radiusMult * (0.75 + 0.25 * (b.layers / Math.max(1, b.maxLayers)));
  const x = b.x;
  const y = b.y;

  // String.
  ctx.strokeStyle = 'rgba(90, 70, 50, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.quadraticCurveTo(x + Math.sin(time * 2 + b.wobble) * 5, y + r + 12, x + Math.sin(time * 1.5 + b.wobble) * 7, y + r + 24);
  ctx.stroke();

  // Shadow on the board.
  ctx.fillStyle = 'rgba(90, 60, 30, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + r * 0.9 + 8, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Balloon body (cut-paper look: fill + hand-drawn outline + highlight).
  const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.2, x, y, r * 1.2);
  grad.addColorStop(0, lighten(layer.color, 0.35));
  grad.addColorStop(1, layer.color);
  ctx.fillStyle = grad;
  wobblyCircle(ctx, x, y, r, b.id * 7.3, 0.05);
  ctx.fill();
  ctx.strokeStyle = layer.dark;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Knot.
  ctx.fillStyle = layer.dark;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + r * 0.92);
  ctx.lineTo(x + 3, y + r * 0.92);
  ctx.lineTo(x, y + r * 0.75);
  ctx.closePath();
  ctx.fill();

  // Highlight.
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();

  // Variant markers (shape, not just color).
  if (b.variant === 'fast') {
    // Lightning bolt.
    ctx.fillStyle = '#fff8ea';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - r * 0.5);
    ctx.lineTo(x - r * 0.35, y + r * 0.1);
    ctx.lineTo(x - 0.5, y + r * 0.1);
    ctx.lineTo(x - r * 0.25, y + r * 0.55);
    ctx.lineTo(x + r * 0.3, y - r * 0.05);
    ctx.lineTo(x + 0.5, y - r * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (b.variant === 'armored') {
    // Rivets around the rim.
    ctx.fillStyle = '#5d5d66';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + time * 0.5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#5d5d66';
    ctx.lineWidth = 2;
    wobblyCircle(ctx, x, y, r * 0.75, b.id * 3.1, 0.04);
    ctx.stroke();
  } else if (b.variant === 'boss') {
    // Crown + skull-ish face.
    ctx.fillStyle = '#f2d16b';
    ctx.strokeStyle = '#a8811f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.75);
    ctx.lineTo(x - r * 0.5, y - r * 1.15);
    ctx.lineTo(x - r * 0.25, y - r * 0.9);
    ctx.lineTo(x, y - r * 1.2);
    ctx.lineTo(x + r * 0.25, y - r * 0.9);
    ctx.lineTo(x + r * 0.5, y - r * 1.15);
    ctx.lineTo(x + r * 0.5, y - r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Face.
    ctx.fillStyle = 'rgba(60, 30, 40, 0.8)';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 30, 40, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y + r * 0.25, r * 0.3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // Slow effect: little droplet tint.
  if (b.slowUntil > 0 && b.slowFactor < 1) {
    ctx.fillStyle = 'rgba(120, 80, 40, 0.35)';
    wobblyCircle(ctx, x, y, r * 1.05, b.id * 5.5, 0.05);
    ctx.fill();
  }
}

function drawTower(ctx: CanvasRenderingContext2D, t: Tower, _time: number) {
  const x = t.x;
  const y = t.y;
  const recoil = t.recoil > 0 ? t.recoil / 0.12 : 0;

  // Shadow.
  ctx.fillStyle = 'rgba(90, 60, 30, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 14, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Base plate (cardboard disc).
  ctx.fillStyle = '#c99a5e';
  ctx.strokeStyle = '#7a5a30';
  ctx.lineWidth = 2.5;
  wobblyCircle(ctx, x, y + 6, 18, t.id * 11, 0.05);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.translate(x, y);
  if (t.kind === 'needle') {
    // Cardboard box with a spring pin.
    ctx.fillStyle = '#d9b06c';
    ctx.strokeStyle = '#7a5a30';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-12, -14, 24, 20);
    ctx.strokeRect(-12, -14, 24, 20);
    // Pin barrel pointing up, recoils.
    const ry = -14 - recoil * 6;
    ctx.fillStyle = '#8a8a94';
    ctx.fillRect(-2.5, ry - 14, 5, 14);
    ctx.fillStyle = '#5d5d66';
    ctx.beginPath();
    ctx.moveTo(-4, ry - 14);
    ctx.lineTo(4, ry - 14);
    ctx.lineTo(0, ry - 22);
    ctx.closePath();
    ctx.fill();
    // Spring coils.
    ctx.strokeStyle = '#5d5d66';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-5, -12 + i * 4);
      ctx.lineTo(5, -10 + i * 4);
      ctx.stroke();
    }
  } else if (t.kind === 'firecracker') {
    // A big firecracker on a stand.
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#7a2418';
    ctx.lineWidth = 2.5;
    const ry = -recoil * 5;
    ctx.save();
    ctx.translate(0, ry);
    ctx.rotate(0.3);
    ctx.fillRect(-7, -26, 14, 26);
    ctx.strokeRect(-7, -26, 14, 26);
    // Stripes.
    ctx.fillStyle = '#f2d16b';
    ctx.fillRect(-7, -20, 14, 5);
    ctx.fillRect(-7, -10, 14, 5);
    // Fuse.
    ctx.strokeStyle = '#5d4527';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(6, -34, 10, -32);
    ctx.stroke();
    ctx.restore();
    // Stand.
    ctx.fillStyle = '#8a6a42';
    ctx.strokeStyle = '#5d4527';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(10, 4);
    ctx.lineTo(6, -8);
    ctx.lineTo(-6, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Heavy ballista: big frame + arm.
    ctx.fillStyle = '#8a6a42';
    ctx.strokeStyle = '#5d4527';
    ctx.lineWidth = 3;
    // A-frame.
    ctx.beginPath();
    ctx.moveTo(-16, 8);
    ctx.lineTo(0, -20 - recoil * 8);
    ctx.lineTo(16, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Crossbeam.
    ctx.fillStyle = '#a87c4e';
    ctx.fillRect(-20, -6, 40, 8);
    ctx.strokeRect(-20, -6, 40, 8);
    // Arm + bolt.
    ctx.save();
    ctx.translate(0, -20 - recoil * 8);
    ctx.rotate(-0.5 + recoil * 0.3);
    ctx.fillStyle = '#6e4c26';
    ctx.fillRect(-2, -18, 4, 18);
    ctx.fillStyle = '#4a3319';
    ctx.beginPath();
    ctx.moveTo(-3, -18);
    ctx.lineTo(3, -18);
    ctx.lineTo(0, -26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Upgrade pips: small dots showing tiers purchased.
  const total = t.tiers.a + t.tiers.b + t.tiers.c;
  if (total > 0) {
    ctx.fillStyle = '#f2d16b';
    ctx.strokeStyle = '#a8811f';
    ctx.lineWidth = 1;
    for (let i = 0; i < Math.min(6, total); i++) {
      const a = -Math.PI / 2 + (i - (Math.min(6, total) - 1) / 2) * 0.5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 24, y + 6 + Math.sin(a) * 24, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: { x: number; y: number; vx: number; vy: number; kind: string; trail: { x: number; y: number }[]; crit: boolean }) {
  // Trail.
  for (let i = 0; i < p.trail.length; i++) {
    const t = p.trail[i];
    const a = (i / p.trail.length) * 0.4;
    ctx.fillStyle = p.kind === 'firecracker' ? `rgba(232, 132, 44, ${a})` : `rgba(90, 90, 100, ${a * 0.6})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, p.kind === 'firecracker' ? 4 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const angle = Math.atan2(p.vy, p.vx);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  if (p.kind === 'needle') {
    ctx.fillStyle = p.crit ? '#e0533d' : '#5d5d66';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -2.5);
    ctx.lineTo(-6, 2.5);
    ctx.closePath();
    ctx.fill();
  } else if (p.kind === 'firecracker') {
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#7a2418';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-6, -4, 12, 8);
    ctx.strokeRect(-6, -4, 12, 8);
    ctx.fillStyle = '#f2d16b';
    ctx.fillRect(-2, -4, 4, 8);
    // Spark.
    ctx.fillStyle = '#ffd76b';
    ctx.beginPath();
    ctx.arc(8, 0, 2.5 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Ballista bolt.
    ctx.fillStyle = p.crit ? '#e0533d' : '#4a3319';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -3.5);
    ctx.lineTo(-10, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2e2010';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10, -3.5);
    ctx.lineTo(-14, -6);
    ctx.moveTo(-10, 3.5);
    ctx.lineTo(-14, 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRange(ctx: CanvasRenderingContext2D, x: number, y: number, range: number, color: string) {
  ctx.save();
  ctx.fillStyle = color.replace('ALPHA', '0.10');
  ctx.strokeStyle = color.replace('ALPHA', '0.55');
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  wobblyCircle(ctx, x, y, range, 99, 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 255 * amt);
  const g = Math.min(255, ((n >> 8) & 255) + 255 * amt);
  const b = Math.min(255, (n & 255) + 255 * amt);
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

// ---------------------------------------------------------------- the renderer

export class Renderer {
  private staticBoard: HTMLCanvasElement;
  private hoverCell = -1;

  constructor() {
    this.staticBoard = renderStaticBoard();
  }

  setHoverCell(cell: number) {
    this.hoverCell = cell;
  }

  render(ctx: CanvasRenderingContext2D, engine: GameEngine, time: number) {
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    ctx.drawImage(this.staticBoard, 0, 0);

    // Placement grid (only while placing).
    if (engine.placingKind) {
      ctx.save();
      ctx.strokeStyle = 'rgba(120, 90, 50, 0.18)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= GRID_W; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, BOARD_H);
        ctx.stroke();
      }
      for (let r = 0; r <= GRID_H; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(BOARD_W, r * CELL);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Selected tower range (under everything).
    const selected = engine.getTower(engine.selectedTowerId);
    if (selected) {
      drawRange(ctx, selected.x, selected.y, selected.stats.range, 'rgba(63, 127, 212, ALPHA)');
    }

    // Towers.
    for (const t of engine.towers) drawTower(ctx, t, time);

    // Balloons (sorted by dist so later ones draw on top).
    const sorted = [...engine.balloons].sort((a, b) => a.dist - b.dist);
    for (const b of sorted) drawBalloon(ctx, b, time);

    // Projectiles.
    for (const p of engine.projectiles) drawProjectile(ctx, p);

    // Effects.
    for (const e of engine.effects) {
      const k = e.t / e.duration;
      if (e.kind === 'pop') {
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = e.color;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + e.x;
          const d = k * 26;
          ctx.beginPath();
          ctx.arc(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 3.5 * (1 - k), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (e.kind === 'text') {
        ctx.save();
        ctx.globalAlpha = 1 - k * k;
        ctx.fillStyle = e.color;
        ctx.font = 'bold 18px "Comic Sans MS", "Chalkboard SE", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(255, 248, 234, 0.9)';
        ctx.lineWidth = 4;
        ctx.strokeText(e.text ?? '', e.x, e.y - k * 26);
        ctx.fillText(e.text ?? '', e.x, e.y - k * 26);
        ctx.restore();
      } else if (e.kind === 'ring') {
        ctx.save();
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, (e.radius ?? 20) * k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Placement preview.
    if (engine.placingKind && this.hoverCell >= 0) {
      const def = TOWERS[engine.placingKind];
      const free = engine.isCellFree(this.hoverCell);
      const affordable = engine.money >= def.cost;
      const ok = free && affordable;
      const { x, y } = cellCenter(this.hoverCell);

      // Range circle.
      drawRange(ctx, x, y, def.base.range, ok ? 'rgba(90, 168, 79, ALPHA)' : 'rgba(176, 58, 46, ALPHA)');

      // Cell highlight.
      const col = this.hoverCell % GRID_W;
      const row = Math.floor(this.hoverCell / GRID_W);
      ctx.fillStyle = ok ? 'rgba(90, 168, 79, 0.3)' : 'rgba(176, 58, 46, 0.3)';
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      ctx.strokeStyle = ok ? '#5aa84f' : '#b03a2e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2);

      // Translucent tower preview.
      ctx.save();
      ctx.globalAlpha = 0.6;
      drawTower(ctx, { id: -1, kind: engine.placingKind, cell: this.hoverCell, x, y, stats: def.base, targeting: 'first', tiers: { a: 0, b: 0, c: 0 }, invested: 0, pops: 0, cooldown: 0, targetId: null, recoil: 0 }, time);
      ctx.restore();

      // Cost / status label.
      const label = ok ? `$${def.cost}` : free ? 'Too expensive' : 'Blocked';
      const color = ok ? '#3d6b35' : '#b03a2e';
      ctx.font = 'bold 15px "Comic Sans MS", "Chalkboard SE", sans-serif';
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = 'rgba(255, 248, 234, 0.92)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      const lx = Math.min(Math.max(x, w / 2 + 4), BOARD_W - w / 2 - 4);
      const ly = Math.max(20, y - 52);
      ctx.beginPath();
      ctx.roundRect(lx - w / 2, ly - 12, w, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(label, lx, ly + 5);
    }

    // Blocked-cell hint while placing (subtle X on path cells near cursor).
    if (engine.placingKind && this.hoverCell >= 0 && !engine.isCellFree(this.hoverCell)) {
      const { x, y } = cellCenter(this.hoverCell);
      ctx.strokeStyle = 'rgba(176, 58, 46, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 10);
      ctx.lineTo(x + 10, y + 10);
      ctx.moveTo(x + 10, y - 10);
      ctx.lineTo(x - 10, y + 10);
      ctx.stroke();
    }
  }
}

export { LAYERS, BLOCKED_CELLS };
