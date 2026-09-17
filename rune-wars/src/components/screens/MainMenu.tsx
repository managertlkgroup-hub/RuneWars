import React from 'react';
import { useGameStore } from '../../game/core/store';
import { Button } from '../ui/Button';

export const MainMenu: React.FC = () => {
  const setGameState = useGameStore(state => state.setGameState);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient particles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(139, 69, 19, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(139, 69, 19, 0.2) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />
      
      {/* Title */}
      <h1 style={{
        fontSize: '64px',
        fontWeight: 'bold',
        color: '#c9a227',
        textShadow: '0 0 20px rgba(201, 162, 39, 0.8), 0 0 40px rgba(201, 162, 39, 0.4)',
        letterSpacing: '8px',
        marginBottom: '40px',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        RUNE WARS
      </h1>
      
      {/* Subtitle */}
      <p style={{
        fontSize: '18px',
        color: '#888',
        marginBottom: '60px',
        letterSpacing: '2px',
      }}>
        MATCH-3 RPG ROGUELIKE
      </p>
      
      {/* Play button */}
      <Button onClick={() => setGameState('BATTLE')}>
        ИГРАТЬ
      </Button>
      
      {/* Version */}
      <p style={{
        position: 'absolute',
        bottom: '20px',
        fontSize: '12px',
        color: '#444',
      }}>
        v0.1.0 - Early Access
      </p>
    </div>
  );
};
