// Game state types
export type GameState = 'MENU' | 'BATTLE' | 'REWARD' | 'GAME_OVER';

export interface HeroStats {
  maxHp: number;
  hp: number;
  shield: number;
  rage: number;
}

export interface EnemyStats {
  maxHp: number;
  hp: number;
  attack: number;
}

export interface Crystal {
  id: string;
  type: CrystalType;
  row: number;
  col: number;
  isMatching: boolean;
  isSelected: boolean;
  scale: number;
}

export type CrystalType = 'red' | 'blue' | 'green' | 'yellow';

export interface MatchResult {
  matches: Crystal[][];
  cascadeCount: number;
  damage: number;
  shieldGain: number;
  healAmount: number;
  rageGain: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameStore {
  // State
  gameState: GameState;
  
  // Battle
  board: (Crystal | null)[][];
  selectedCrystal: { row: number; col: number } | null;
  isSwapping: boolean;
  turnCount: number;
  enemyAttackTimer: number;
  
  // Entities
  hero: HeroStats;
  enemy: EnemyStats;
  
  // Visual
  particles: Particle[];
  screenShake: number;
  flashColor: string | null;
  flashDuration: number;
  
  // Log
  battleLog: string[];
  
  // Actions
  setGameState: (state: GameState) => void;
  initBattle: () => void;
  selectCrystal: (row: number, col: number) => void;
  swapCrystals: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
  processMatches: () => Promise<void>;
  enemyAttack: () => void;
  addParticle: (x: number, y: number, color: string) => void;
  triggerScreenShake: (intensity: number) => void;
  triggerFlash: (color: string, duration: number) => void;
  addLog: (message: string) => void;
}
