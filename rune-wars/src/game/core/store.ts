import { create } from 'zustand';
import type { GameStore, Crystal, CrystalType, Particle } from './GameState';

const BOARD_SIZE = 7;
const CRYSTAL_TYPES: CrystalType[] = ['red', 'blue', 'green', 'yellow'];

const generateCrystalId = () => Math.random().toString(36).substr(2, 9);

const createCrystal = (row: number, col: number, type?: CrystalType): Crystal => ({
  id: generateCrystalId(),
  type: type ?? CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)],
  row,
  col,
  isMatching: false,
  isSelected: false,
  scale: 1,
});

const createEmptyBoard = (): (Crystal | null)[][] => {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
};

const generateBoard = (): (Crystal | null)[][] => {
  const board = createEmptyBoard();
  
  // Fill board ensuring no initial matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let type: CrystalType;
      let attempts = 0;
      
      do {
        type = CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)];
        attempts++;
        
        // Check horizontal match
        const hasHorizontalMatch = col >= 2 && 
          board[row][col - 1]?.type === type && 
          board[row][col - 2]?.type === type;
        
        // Check vertical match
        const hasVerticalMatch = row >= 2 && 
          board[row - 1][col]?.type === type && 
          board[row - 2][col]?.type === type;
        
        if (!hasHorizontalMatch && !hasVerticalMatch) break;
      } while (attempts < 10);
      
      board[row][col] = createCrystal(row, col, type);
    }
  }
  
  return board;
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameState: 'MENU',
  board: createEmptyBoard(),
  selectedCrystal: null,
  isSwapping: false,
  turnCount: 0,
  enemyAttackTimer: 0,
  hero: { maxHp: 50, hp: 50, shield: 0, rage: 0 },
  enemy: { maxHp: 40, hp: 40, attack: 6 },
  particles: [],
  screenShake: 0,
  flashColor: null,
  flashDuration: 0,
  battleLog: [],

  setGameState: (state) => {
    set({ gameState: state });
    if (state === 'BATTLE') {
      get().initBattle();
    }
  },

  initBattle: () => {
    set({
      board: generateBoard(),
      selectedCrystal: null,
      isSwapping: false,
      turnCount: 0,
      enemyAttackTimer: 0,
      hero: { maxHp: 50, hp: 50, shield: 0, rage: 0 },
      enemy: { maxHp: 40, hp: 40, attack: 6 },
      particles: [],
      screenShake: 0,
      flashColor: null,
      flashDuration: 0,
      battleLog: ['Battle started!'],
    });
  },

  selectCrystal: (row: number, col: number) => {
    const { selectedCrystal, board } = get();
    
    if (!selectedCrystal) {
      // First selection
      set({ selectedCrystal: { row, col } });
      const newBoard = board.map(r => r.map(c => c ? { ...c, isSelected: c.row === row && c.col === col } : null));
      set({ board: newBoard });
    } else {
      // Second selection - try to swap
      const { row: r1, col: c1 } = selectedCrystal;
      const { row: r2, col: c2 } = { row, col };
      
      // Check if adjacent
      const isAdjacent = (Math.abs(r1 - r2) === 1 && c1 === c2) || 
                         (Math.abs(c1 - c2) === 1 && r1 === r2);
      
      if (isAdjacent) {
        get().swapCrystals(r1, c1, r2, c2);
      } else {
        // Select new crystal
        const newBoard = board.map(r => r.map(c => c ? { ...c, isSelected: c.row === row && c.col === col } : null));
        set({ board: newBoard, selectedCrystal: { row, col } });
      }
    }
  },

  swapCrystals: async (row1: number, col1: number, row2: number, col2: number) => {
    set({ isSwapping: true, selectedCrystal: null });
    
    const board = get().board.map(r => [...r]);
    const temp = board[row1][col1];
    board[row1][col1] = board[row2][col2];
    board[row2][col2] = temp;
    
    if (temp && board[row1][col1]) {
      temp.row = row2;
      temp.col = col2;
      board[row1][col1]!.row = row1;
      board[row1][col1]!.col = col1;
    }
    
    set({ board, isSwapping: false });
    
    // Will be checked by processMatches
    await get().processMatches();
    
    return true;
  },

  processMatches: async () => {
    const board = get().board;
    const matches: Crystal[][] = [];
    
    // Find all matches
    const visited = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
    
    // Horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        if (visited[row][col]) continue;
        
        const crystal = board[row][col];
        if (!crystal) continue;
        
        const match: Crystal[] = [crystal];
        for (let c = col + 1; c < BOARD_SIZE && board[row][c]?.type === crystal.type; c++) {
          if (!visited[row][c]) {
            match.push(board[row][c]!);
            visited[row][c] = true;
          }
        }
        
        if (match.length >= 3) {
          matches.push(match);
        }
      }
    }
    
    // Vertical matches
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 2; row++) {
        if (visited[row][col]) continue;
        
        const crystal = board[row][col];
        if (!crystal) continue;
        
        const match: Crystal[] = [crystal];
        for (let r = row + 1; r < BOARD_SIZE && board[r][col]?.type === crystal.type; r++) {
          if (!visited[r][col]) {
            match.push(board[r][col]!);
            visited[r][col] = true;
          }
        }
        
        if (match.length >= 3) {
          matches.push(match);
        }
      }
    }
    
    if (matches.length === 0) {
      // No matches - reset selection
      set({ selectedCrystal: null });
      return;
    }
    
    // Calculate effects
    let totalDamage = 0;
    let totalShield = 0;
    let totalHeal = 0;
    let totalRage = 0;
    
    const newBoard = board.map(r => r.map(c => c ? { ...c } : null));
    
    for (const match of matches) {
      const multiplier = match.length >= 5 ? 3 : match.length === 4 ? 2 : 1;
      const type = match[0].type;
      
      match.forEach(c => {
        newBoard[c.row][c.col] = null;
      });
      
      switch (type) {
        case 'red':
          totalDamage += 10 * multiplier;
          break;
        case 'blue':
          totalShield += 5 * multiplier;
          break;
        case 'green':
          totalHeal += 5 * multiplier;
          break;
        case 'yellow':
          totalRage += 10 * multiplier;
          break;
      }
      
      // Add particles
      const centerRow = match.reduce((sum, c) => sum + c.row, 0) / match.length;
      const centerCol = match.reduce((sum, c) => sum + c.col, 0) / match.length;
      for (let i = 0; i < 12; i++) {
        get().addParticle(centerCol * 50 + 100, centerRow * 50 + 100, 
          type === 'red' ? '#ff4444' : type === 'blue' ? '#4444ff' : type === 'green' ? '#44ff44' : '#ffff44');
      }
    }
    
    // Apply gravity and refill
    for (let col = 0; col < BOARD_SIZE; col++) {
      let writeRow = BOARD_SIZE - 1;
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (newBoard[row][col]) {
          newBoard[writeRow][col] = newBoard[row][col];
          newBoard[writeRow][col]!.row = writeRow;
          writeRow--;
        }
      }
      for (let row = writeRow; row >= 0; row--) {
        newBoard[row][col] = createCrystal(row, col);
      }
    }
    
    // Update game state
    const { hero, enemy, turnCount } = get();
    let newRage = Math.min(100, hero.rage + totalRage);
    
    // Apply rage bonus to damage
    let finalDamage = totalDamage;
    if (newRage >= 30 && totalDamage > 0) {
      finalDamage *= 2;
      newRage = 0;
    }
    
    const newEnemyHp = Math.max(0, enemy.hp - finalDamage);
    const newHeroHp = Math.min(hero.maxHp, hero.hp + totalHeal);
    const newHeroShield = hero.shield + totalShield;
    
    set({
      board: newBoard,
      turnCount: turnCount + 1,
      hero: { ...hero, hp: newHeroHp, shield: newHeroShield, rage: newRage },
      enemy: { ...enemy, hp: newEnemyHp },
      selectedCrystal: null,
    });
    
    // Log results
    if (finalDamage > 0) {
      get().addLog(`Attack! Enemy -${finalDamage} HP`);
      get().triggerScreenShake(5);
      get().triggerFlash('#ffffff', 50);
    }
    if (totalShield > 0) {
      get().addLog(`Shield +${totalShield}`);
    }
    if (totalHeal > 0) {
      get().addLog(`Heal +${totalHeal}`);
    }
    if (totalRage > 0) {
      get().addLog(`Rage +${totalRage}`);
    }
    
    // Check enemy death
    if (newEnemyHp <= 0) {
      get().addLog('Enemy defeated! Victory!');
      setTimeout(() => {
        set({ gameState: 'REWARD' });
      }, 1000);
      return;
    }
    
    // Enemy turn check
    const newTurnCount = turnCount + 1;
    if (newTurnCount % 3 === 0) {
      setTimeout(() => get().enemyAttack(), 500);
    }
  },

  enemyAttack: () => {
    const { hero, enemy } = get();
    let damage = enemy.attack;
    
    // Shield absorbs first
    if (hero.shield > 0) {
      const shieldDamage = Math.min(hero.shield, damage);
      damage -= shieldDamage;
      set({ hero: { ...hero, shield: hero.shield - shieldDamage } });
    }
    
    if (damage > 0) {
      const newHp = Math.max(0, hero.hp - damage);
      set({ hero: { ...hero, hp: newHp } });
      get().addLog(`Enemy attacks! -${damage} HP`);
      get().triggerScreenShake(8);
      get().triggerFlash('#ff0000', 150);
      
      if (newHp <= 0) {
        get().addLog('You were defeated...');
        setTimeout(() => {
          set({ gameState: 'GAME_OVER' });
        }, 1000);
      }
    }
  },

  addParticle: (x: number, y: number, color: string) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    const particle: Particle = {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      color,
      size: 3 + Math.random() * 4,
    };
    set(state => ({ particles: [...state.particles, particle] }));
  },

  triggerScreenShake: (intensity: number) => {
    set({ screenShake: intensity });
    setTimeout(() => set({ screenShake: 0 }), 100);
  },

  triggerFlash: (color: string, duration: number) => {
    set({ flashColor: color, flashDuration: duration });
    setTimeout(() => set({ flashColor: null }), duration);
  },

  addLog: (message: string) => {
    set(state => ({ battleLog: [message, ...state.battleLog.slice(0, 4)] }));
  },
}));
