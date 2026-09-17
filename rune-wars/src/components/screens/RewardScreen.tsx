import React from 'react';
import { useGameStore } from '../../game/core/store';
import { Button } from '../ui/Button';

export const RewardScreen: React.FC = () => {
  const initBattle = useGameStore(state => state.initBattle);
  const setGameState = useGameStore(state => state.setGameState);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: 'linear-gradient(180deg, #0a0a0a 0%, #1a2e1a 50%, #0a0a0a 100%)',
      position: 'relative',
    }}>
      {/* Victory text */}
      <h1 style={{
        fontSize: '56px',
        fontWeight: 'bold',
        color: '#c9a227',
        textShadow: '0 0 20px rgba(201, 162, 39, 0.8)',
        letterSpacing: '4px',
        marginBottom: '20px',
      }}>
        VICTORY!
      </h1>
      
      <p style={{
        fontSize: '20px',
        color: '#44ff44',
        marginBottom: '40px',
      }}>
        Enemy Defeated!
      </p>
      
      {/* Rewards placeholder */}
      <div style={{
        padding: '20px 40px',
        background: 'rgba(20, 20, 30, 0.8)',
        border: '2px solid #c9a227',
        borderRadius: '8px',
        marginBottom: '40px',
      }}>
        <p style={{ fontSize: '16px', color: '#ccc' }}>
          +10 Gold
        </p>
        <p style={{ fontSize: '16px', color: '#ccc' }}>
          +5 XP
        </p>
      </div>
      
      {/* Buttons */}
      <div style={{ display: 'flex', gap: '20px' }}>
        <Button onClick={initBattle}>
          Continue
        </Button>
        <Button variant="secondary" onClick={() => setGameState('MENU')}>
          Main Menu
        </Button>
      </div>
    </div>
  );
};
