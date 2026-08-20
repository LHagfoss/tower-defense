import { TOWER_LIST } from '../game/config/towers';
import type { GameSnapshot, TowerKind } from '../game/types';

interface Props {
  snap: GameSnapshot;
  onBeginPlacing: (kind: TowerKind) => void;
}

/** External tower shop sidebar with cards, stats on hover/focus, affordability. */
export function Shop({ snap, onBeginPlacing }: Props) {
  return (
    <aside className="w-full lg:w-64 shrink-0 bg-[#f6ead2] border-t-4 lg:border-t-0 lg:border-l-4 border-[#8a6a42] p-3 flex flex-col gap-3 overflow-y-auto" aria-label="Tower shop">
      <h2 className="font-bold text-[#5d4527] text-lg tracking-wide">🏗️ Build Towers</h2>
      <div className="flex lg:flex-col gap-3 flex-row flex-wrap">
        {TOWER_LIST.map((def) => {
          const affordable = snap.money >= def.cost;
          const active = snap.placingKind === def.kind;
          return (
            <button
              key={def.kind}
              className={`tower-card group relative text-left w-56 lg:w-auto ${active ? 'tower-card-active' : ''} ${affordable ? '' : 'tower-card-disabled'}`}
              disabled={!affordable && !active}
              aria-pressed={active}
              aria-label={`${def.name}, ${def.role}, cost ${def.cost} dollars${affordable ? '' : ', not affordable'}`}
              onClick={() => onBeginPlacing(def.kind)}
            >
              <div className="flex items-center gap-2">
                <TowerIcon kind={def.kind} />
                <div className="min-w-0">
                  <div className="font-bold text-[#5d4527] leading-tight">{def.name}</div>
                  <div className="text-xs text-[#8a6a42]">{def.role}</div>
                </div>
                <div className={`ml-auto font-bold tabular-nums ${affordable ? 'text-[#3d6b35]' : 'text-[#b03a2e]'}`}>
                  ${def.cost}
                </div>
              </div>
              {/* Stats revealed on hover/focus. */}
              <div className="mt-2 hidden group-hover:block group-focus-visible:block text-xs text-[#5d4527] bg-[#efe0c2] rounded-md p-2 border border-[#c9a86a]">
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <span>Damage: <b>{def.base.damage}</b></span>
                  <span>Rate: <b>{def.base.fireRate.toFixed(2)}/s</b></span>
                  <span>Range: <b>{def.base.range}</b></span>
                  <span>Proj: <b>{def.base.projectileSpeed}</b></span>
                  {def.base.splash > 0 && <span className="col-span-2">Splash: <b>{def.base.splash}px</b></span>}
                </div>
                <p className="mt-1.5 text-[#8a6a42] leading-snug">{def.description}</p>
              </div>
              {active && (
                <div className="mt-1 text-xs font-bold text-[#3d6b35]">Click board to place · Esc to cancel</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto text-xs text-[#8a6a42] leading-relaxed border-t-2 border-dashed border-[#c9a86a] pt-2">
        <b>Legend:</b> balloon color = layers left (red 1 → pink 5).
        <br />⚡ fast · ⬢ armored · small = swarm · 👑 boss
      </div>
    </aside>
  );
}

/** Small inline SVG icon for each tower (cardboard style). */
export function TowerIcon({ kind }: { kind: TowerKind }) {
  if (kind === 'needle') {
    return (
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden className="shrink-0">
        <rect x="8" y="16" width="18" height="14" rx="2" fill="#d9b06c" stroke="#7a5a30" strokeWidth="2" />
        <rect x="15" y="6" width="4" height="10" fill="#8a8a94" />
        <polygon points="13,6 19,6 16,1" fill="#5d5d66" />
      </svg>
    );
  }
  if (kind === 'firecracker') {
    return (
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden className="shrink-0">
        <rect x="12" y="8" width="10" height="20" rx="2" fill="#c0392b" stroke="#7a2418" strokeWidth="2" />
        <rect x="12" y="13" width="10" height="4" fill="#f2d16b" />
        <path d="M17 8 Q22 3 25 5" fill="none" stroke="#5d4527" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden className="shrink-0">
      <polygon points="6,28 17,8 28,28" fill="#8a6a42" stroke="#5d4527" strokeWidth="2" />
      <rect x="4" y="20" width="26" height="6" fill="#a87c4e" stroke="#5d4527" strokeWidth="1.5" />
      <polygon points="15,8 19,8 17,2" fill="#4a3319" />
    </svg>
  );
}
