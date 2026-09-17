import React from 'react';
import { useGameStore } from '../../game/core/store';
import { Button } from '../ui/Button';

export const GameOverScreen: React.FC = () => {
  const setGameState = useGameStore(state => state.setGameState);
  const turnCount = useGameStore(state => state.turnCount);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: 'linear-gradient(180deg, #0a0a0a 0%, #2e1a1a 50%, #0a0a0a 100%)',
      position: 'relative',
    }}>
      {/* Defeat text */}
      <h1 style={{
        fontSize: '56px',
        fontWeight: 'bold',
        color: '#c41e3a',
        textShadow: '0 0 20px rgba(196, 30, 58, 0.8)',
        letterSpacing: '4px',
        marginBottom: '20px',
      }}>
        DEFEATED
      </h1>
      
      <p style={{
        fontSize: '18px',
        color: '#888',
        marginBottom: '40px',
      }}>
        You fell in battle...
      </p>
      
      {/* Stats */}
      <div style={{
        padding: '20px 40px',
        background: 'rgba(20, 20, 30, 0.8)',
        border: '2px solid #c41e3a',
        borderRadius: '8px',
        marginBottom: '40px',
      }}>
        <p style={{ fontSize: '16px', color: '#ccc' }}>
          Turns Survived: {useGameStore.getState().turnCount}
        </p>
        <p style={{ fontSize: '16px', color: '#ccc', marginTop: '10px' }}>
          Gold Retained: 50%
        </p>
      </div>
      
      {/* Buttons */}
      <div style={{ display: 'flex', gap: '20px' }}>
        <Button onClick={() => setGameState('BATTLE')}>
          Try Again
        </Button>
        <Button variant="secondary" onClick={() => setGameState('MENU')}>
          Main Menu
        </Button>
      </div>
    </div>
  );
};
