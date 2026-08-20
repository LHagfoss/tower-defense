// Core domain types for the tower-defense simulation.

export type TowerKind = 'needle' | 'firecracker' | 'ballista';
export type TargetingMode = 'first' | 'last' | 'strong' | 'close';
export type BalloonVariant = 'normal' | 'fast' | 'armored' | 'swarm' | 'boss';
export type GamePhase = 'menu' | 'playing' | 'won' | 'lost';
export type UpgradePathId = 'a' | 'b' | 'c';

export interface Vec2 {
  x: number;
  y: number;
}

/** Declarative definition of a balloon layer (color = remaining layers). */
export interface LayerDef {
  layers: number;
  name: string;
  color: string;
  dark: string;
  reward: number; // money granted when this layer is popped
}

/** Declarative definition of a balloon variant. */
export interface VariantDef {
  id: BalloonVariant;
  name: string;
  description: string;
  speedMult: number;
  armor: number; // flat damage reduction per hit (min 1 damage still applies)
  radiusMult: number;
  rewardMult: number;
}

/** A single balloon in flight. */
export interface Balloon {
  id: number;
  variant: BalloonVariant;
  layers: number; // remaining layers (color derived from this)
  maxLayers: number;
  dist: number; // distance travelled along the path
  speed: number; // px per second (base * variant * slow effects)
  slowUntil: number; // game-time until which slow applies
  slowFactor: number;
  wobble: number; // phase offset for visual wobble
  x: number;
  y: number;
  dead: boolean;
}

/** Declarative definition of one upgrade tier within a path. */
export interface UpgradeTier {
  name: string;
  description: string;
  cost: number;
  apply: (stats: TowerStats) => void;
}

/** Declarative definition of an upgrade path (3 tiers). */
export interface UpgradePathDef {
  id: UpgradePathId;
  name: string;
  icon: string;
  tiers: [UpgradeTier, UpgradeTier, UpgradeTier];
}

/** Effective combat stats of a tower after upgrades. */
export interface TowerStats {
  damage: number;
  fireRate: number; // shots per second
  range: number;
  projectileSpeed: number; // px per second
  splash: number; // 0 = single target
  pierce: number; // extra targets a projectile can hit
  armorPierce: number; // fraction of armor ignored (0..1)
  slowFactor: number; // 1 = no slow; applied on hit
  slowDuration: number; // seconds
  critChance: number; // 0..1
  critMult: number; // damage multiplier on crit
}

/** Declarative definition of a tower type. */
export interface TowerDef {
  kind: TowerKind;
  name: string;
  role: string;
  description: string;
  cost: number;
  base: TowerStats;
  paths: Record<UpgradePathId, UpgradePathDef>;
}

/** A placed tower instance. */
export interface Tower {
  id: number;
  kind: TowerKind;
  cell: number; // grid cell index
  x: number;
  y: number;
  stats: TowerStats;
  targeting: TargetingMode;
  tiers: Record<UpgradePathId, number>; // 0..3 per path
  invested: number; // total money spent (base + upgrades) for sell refund
  pops: number; // total balloon layers this tower has popped
  cooldown: number; // seconds until next shot
  targetId: number | null;
  recoil: number; // visual recoil timer
}

/** A projectile in flight. */
export interface Projectile {
  id: number;
  kind: TowerKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  splash: number;
  pierce: number;
  armorPierce: number;
  slowFactor: number;
  slowDuration: number;
  critChance: number;
  critMult: number;
  crit: boolean; // resolved at fire time
  sourceTowerId: number | null; // tower that fired this projectile (for pop attribution)
  hitIds: number[]; // balloons already hit (for pierce)
  life: number; // seconds remaining
  trail: Vec2[];
}

/** A floating combat text / pop particle. */
export interface Effect {
  kind: 'pop' | 'text' | 'ring';
  x: number;
  y: number;
  text?: string;
  color: string;
  t: number; // elapsed
  duration: number;
  radius?: number;
}

/** One spawn entry inside a wave. */
export interface SpawnEntry {
  variant: BalloonVariant;
  layers: number;
  count: number;
  interval: number; // seconds between spawns in this group
  delay: number; // seconds after previous group finished
}

/** Declarative wave definition. */
export interface WaveDef {
  index: number; // 1-based
  name: string;
  groups: SpawnEntry[];
  reward: number; // wave clear bonus
}

/** Snapshot of the game state, consumed by the React layer. */
export interface GameSnapshot {
  phase: GamePhase;
  money: number;
  lives: number;
  maxLives: number;
  wave: number; // current wave number (1-based); 0 before first wave
  totalWaves: number;
  waveName: string;
  enemiesRemaining: number; // alive + unspawned
  countdown: number; // seconds until next wave (0 if wave active)
  paused: boolean;
  speed: 1 | 2;
  autoStart: boolean;
  selectedTowerId: number | null;
  placingKind: TowerKind | null;
  bestWave: number;
}

/** Events emitted by the engine for the audio boundary. */
export type GameEvent =
  | { type: 'pop'; layers: number }
  | { type: 'leak'; layers: number }
  | { type: 'shot'; kind: TowerKind }
  | { type: 'explosion'; x: number; y: number }
  | { type: 'place'; kind: TowerKind }
  | { type: 'sell' }
  | { type: 'upgrade' }
  | { type: 'wave-start'; wave: number }
  | { type: 'wave-clear'; wave: number }
  | { type: 'win' }
  | { type: 'lose' };
