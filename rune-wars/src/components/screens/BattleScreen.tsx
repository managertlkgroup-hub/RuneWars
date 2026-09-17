import React, { useCallback } from 'react';
import { useGameStore } from '../../game/core/store';
import { useCanvas } from '../../hooks/useCanvas';
import { HpBar } from '../ui/HpBar';

const BOARD_SIZE = 7;
const CELL_SIZE = 50;
const BOARD_OFFSET_X = 100;
const BOARD_OFFSET_Y = 80;

const CRYSTAL_COLORS = {
  red: '#ff4444',
  blue: '#4444ff',
  green: '#44ff44',
  yellow: '#ffff44',
};

export const BattleScreen: React.FC = () => {
  const state = useGameStore();
  const { board, hero, enemy, turnCount, battleLog, particles, screenShake, flashColor, flashDuration } = state;
  const selectCrystal = useGameStore(state => state.selectCrystal);

  const render = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Screen shake
    ctx.save();
    if (screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * screenShake;
      const shakeY = (Math.random() - 0.5) * screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // Flash effect
    if (flashColor && flashDuration > 0) {
      ctx.fillStyle = flashColor;
      ctx.globalAlpha = flashDuration / 300;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    // Draw background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0a0a0a');
    bgGradient.addColorStop(0.5, '#1a1a2e');
    bgGradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw torch lights
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const torchPositions = [[80, 150], [width - 80, 150], [width / 2, 100]];
    torchPositions.forEach(([x, y]) => {
      const flicker = Math.sin(Date.now() / 200 + x) * 20 + 100;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, flicker);
      gradient.addColorStop(0, 'rgba(139, 69, 19, 0.4)');
      gradient.addColorStop(0.5, 'rgba(139, 69, 19, 0.1)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    });
    ctx.restore();

    // Draw board background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
    ctx.fillRect(
      BOARD_OFFSET_X - 10,
      BOARD_OFFSET_Y - 10,
      BOARD_SIZE * CELL_SIZE + 20,
      BOARD_SIZE * CELL_SIZE + 20
    );

    // Draw cells and crystals
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const x = BOARD_OFFSET_X + col * CELL_SIZE;
        const y = BOARD_OFFSET_Y + row * CELL_SIZE;

        // Cell background
        ctx.fillStyle = (row + col) % 2 === 0 ? 'rgba(30, 30, 40, 0.5)' : 'rgba(40, 40, 50, 0.5)';
        ctx.fillRect(x, y, CELL_SIZE - 2, CELL_SIZE - 2);

        // Crystal
        const crystal = board[row][col];
        if (crystal) {
          const centerX = x + CELL_SIZE / 2;
          const centerY = y + CELL_SIZE / 2;
          const size = (CELL_SIZE - 8) / 2 * crystal.scale;

          // Glow effect
          ctx.save();
          ctx.shadowColor = CRYSTAL_COLORS[crystal.type];
          ctx.shadowBlur = crystal.isSelected ? 20 : 10;

          // Crystal shape (circle with glow)
          ctx.beginPath();
          ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
          ctx.fillStyle = CRYSTAL_COLORS[crystal.type];
          ctx.fill();

          // Inner highlight
          ctx.beginPath();
          ctx.arc(centerX - size * 0.3, centerY - size * 0.3, size * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fill();

          ctx.restore();

          // Selection pulse
          if (crystal.isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size + 5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
    }

    // Draw particles
    particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }, [board, particles, screenShake, flashColor, flashDuration]);

  const canvasRef = useCanvas(render);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
    }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left - BOARD_OFFSET_X;
          const y = e.clientY - rect.top - BOARD_OFFSET_Y;
          
          if (x >= 0 && x < BOARD_SIZE * CELL_SIZE && y >= 0 && y < BOARD_SIZE * CELL_SIZE) {
            const col = Math.floor(x / CELL_SIZE);
            const row = Math.floor(y / CELL_SIZE);
            selectCrystal(row, col);
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'pointer',
        }}
      />

      {/* Top UI */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        {/* Hero stats */}
        <div style={{ pointerEvents: 'auto' }}>
          <HpBar 
            current={hero.hp} 
            max={hero.maxHp} 
            label="HERO"
            shield={hero.shield}
            rage={hero.rage}
          />
        </div>

        {/* Turn counter */}
        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#c9a227',
          textShadow: '1px 1px 2px #000',
        }}>
          TURN: {turnCount}
        </div>

        {/* Enemy stats */}
        <div style={{ pointerEvents: 'auto' }}>
          <HpBar 
            current={enemy.hp} 
            max={enemy.maxHp} 
            label="GOBLIN"
            vertical
          />
        </div>
      </div>

      {/* Battle log */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'none',
      }}>
        {battleLog.map((log, index) => (
          <div key={index} style={{
            fontSize: '14px',
            color: index === 0 ? '#fff' : '#888',
            fontWeight: index === 0 ? 'bold' : 'normal',
            textShadow: '1px 1px 2px #000',
            opacity: 1 - index * 0.2,
          }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};
