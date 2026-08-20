import { SELL_REFUND, TOWERS } from '../game/config/towers';
import type { GameSnapshot, TargetingMode, Tower, UpgradePathId } from '../game/types';
import { BOARD_W, BOARD_H } from '../game/config/map';

interface Props {
  snap: GameSnapshot;
  tower: Tower;
  onUpgrade: (towerId: number, path: UpgradePathId) => void;
  onSell: (towerId: number) => void;
  onTargeting: (towerId: number, mode: TargetingMode) => void;
  onClose: () => void;
}

const TARGETING_MODES: { id: TargetingMode; label: string; hint: string }[] = [
  { id: 'first', label: 'First', hint: 'Target the balloon furthest along the path' },
  { id: 'last', label: 'Last', hint: 'Target the balloon closest to the entrance' },
  { id: 'strong', label: 'Strong', hint: 'Target the balloon with the most layers' },
  { id: 'close', label: 'Close', hint: 'Target the nearest balloon' },
];

const PANEL_W = 300;
const PANEL_H = 400;

/**
 * Contextual upgrade panel rendered inside the gameplay area.
 * Position: opposite side of the selected tower, clamped to the board,
 * never covering the tower.
 */
export function TowerPanel({ snap, tower, onUpgrade, onSell, onTargeting, onClose }: Props) {
  const def = TOWERS[tower.kind];
  const refund = Math.floor(tower.invested * SELL_REFUND);

  // Smart placement: tower on left half → panel right, and vice versa.
  const towerLeft = tower.x < BOARD_W / 2;
  const left = towerLeft ? Math.min(tower.x + 60, BOARD_W - PANEL_W - 12) : Math.max(12, tower.x - 60 - PANEL_W);
  const top = Math.min(Math.max(12, tower.y - PANEL_H / 2), BOARD_H - PANEL_H - 12);

  const pathState = (['a', 'b', 'c'] as UpgradePathId[]).map((p) => {
    const used = (['a', 'b', 'c'] as UpgradePathId[]).filter((q) => tower.tiers[q] > 0);
    const locked = used.length >= 2 && !used.includes(p);
    const path = def.paths[p];
    const tier = tower.tiers[p];
    const next = tier < 3 ? path.tiers[tier] : null;
    const cost = next ? next.cost : null;
    const affordable = cost !== null && snap.money >= cost;
    return { id: p, path, tier, next, cost, affordable, locked };
  });

  return (
    <div
      className="absolute z-20 bg-[#f6ead2] border-4 border-[#8a6a42] rounded-xl shadow-[0_8px_0_rgba(90,60,30,0.3)] p-3"
      style={{ left, top, width: PANEL_W, height: PANEL_H }}
      role="dialog"
      aria-label={`${def.name} details`}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-[#5d4527]">{def.name}</h3>
        <span className="text-xs text-[#8a6a42]">value ${tower.invested}</span>
        <button className="btn ml-auto !px-2 !py-1 text-xs" onClick={onClose} aria-label="Close panel">
          ✕
        </button>
      </div>

      {/* Targeting mode. */}
      <div className="mt-2">
        <div className="text-xs font-bold text-[#8a6a42] mb-1">Targeting</div>
        <div className="grid grid-cols-4 gap-1" role="group" aria-label="Targeting mode">
          {TARGETING_MODES.map((m) => (
            <button
              key={m.id}
              className={`btn !px-1 !py-1 text-xs ${tower.targeting === m.id ? 'btn-selected' : ''}`}
              aria-pressed={tower.targeting === m.id}
              title={m.hint}
              onClick={() => onTargeting(tower.id, m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current stats. */}
      <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-[#5d4527] bg-[#efe0c2] rounded-md p-2 border border-[#c9a86a]">
        <span>Dmg <b>{tower.stats.damage}</b></span>
        <span>Rate <b>{tower.stats.fireRate.toFixed(2)}/s</b></span>
        <span>Range <b>{tower.stats.range}</b></span>
        <span>Pops <b>{tower.pops}</b></span>
        {tower.stats.splash > 0 && <span>Splash <b>{tower.stats.splash}</b></span>}
        {tower.stats.pierce > 0 && <span>Pierce <b>+{tower.stats.pierce}</b></span>}
        {tower.stats.armorPierce > 0 && <span>Armor <b>{Math.round(tower.stats.armorPierce * 100)}%</b></span>}
        {tower.stats.critChance > 0 && <span>Crit <b>{Math.round(tower.stats.critChance * 100)}%</b></span>}
        {tower.stats.slowDuration > 0 && <span>Slow <b>{Math.round((1 - tower.stats.slowFactor) * 100)}%</b></span>}
      </div>

      {/* Upgrade paths. */}
      <div className="mt-2 flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 170 }}>
        {pathState.map(({ id, path, tier, next, cost, affordable, locked }) => (
          <div
            key={id}
            className={`rounded-lg border-2 p-2 ${
              locked ? 'border-[#b0a58a] bg-[#e5dcc8] opacity-60' : 'border-[#c9a86a] bg-[#efe0c2]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span aria-hidden>{path.icon}</span>
              <span className="text-xs font-bold text-[#5d4527]">{path.name}</span>
              <div className="ml-auto flex gap-0.5" aria-label={`${tier} of 3 tiers purchased`}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${i < tier ? 'bg-[#5aa84f]' : 'bg-[#c9a86a]'}`}
                  />
                ))}
              </div>
            </div>
            {locked ? (
              <div className="mt-1 text-xs text-[#8a6a42]">🔒 Locked — two other paths chosen</div>
            ) : next ? (
              <button
                className={`btn btn-primary mt-1.5 w-full !py-1 text-xs ${!affordable ? 'btn-disabled' : ''}`}
                disabled={!affordable}
                onClick={() => onUpgrade(tower.id, id)}
                aria-label={`Buy ${next.name} for ${cost} dollars${affordable ? '' : ', not affordable'}`}
              >
                <span className="font-bold">{next.name}</span>
                <span className="ml-2 tabular-nums">${cost}</span>
              </button>
            ) : (
              <div className="mt-1 text-xs font-bold text-[#3d6b35]">✓ Maxed out</div>
            )}
            {!locked && next && <div className="mt-1 text-[11px] text-[#8a6a42] leading-snug">{next.description}</div>}
          </div>
        ))}
      </div>

      {/* Sell. */}
      <button
        className="btn btn-danger mt-2 w-full"
        onClick={() => onSell(tower.id)}
        aria-label={`Sell tower for ${refund} dollars`}
      >
        Sell for ${refund} <span className="opacity-70">({Math.round(SELL_REFUND * 100)}%)</span>
      </button>
    </div>
  );
}
