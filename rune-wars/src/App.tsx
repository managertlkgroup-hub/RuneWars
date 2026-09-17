import React from 'react';
import { useGameStore } from './game/core/store';
import { MainMenu } from './components/screens/MainMenu';
import { BattleScreen } from './components/screens/BattleScreen';
import { RewardScreen } from './components/screens/RewardScreen';
import { GameOverScreen } from './components/screens/GameOverScreen';

function App() {
  const gameState = useGameStore(state => state.gameState);

  return (
    <>
      {gameState === 'MENU' && <MainMenu />}
      {gameState === 'BATTLE' && <BattleScreen />}
      {gameState === 'REWARD' && <RewardScreen />}
      {gameState === 'GAME_OVER' && <GameOverScreen />}
    </>
  );
}

export default App;
