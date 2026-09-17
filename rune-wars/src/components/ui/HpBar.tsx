import React from 'react';

interface HpBarProps {
  current: number;
  max: number;
  label?: string;
  shield?: number;
  rage?: number;
  vertical?: boolean;
}

export const HpBar: React.FC<HpBarProps> = ({ 
  current, 
  max, 
  label,
  shield = 0,
  rage = 0,
  vertical = false 
}) => {
  const percentage = (current / max) * 100;
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: vertical ? 'column' : 'row',
    alignItems: 'center',
    gap: '8px',
  };

  const barContainerStyle: React.CSSProperties = {
    width: vertical ? '20px' : '200px',
    height: vertical ? '100px' : '20px',
    background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
    border: '2px solid #333',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative',
  };

  const barStyle: React.CSSProperties = {
    position: 'absolute',
    [vertical ? 'bottom' : 'left']: '0',
    [vertical ? 'height' : 'width']: `${percentage}%`,
    [vertical ? 'width' : 'height']: '100%',
    background: percentage > 50 ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' 
      : percentage > 25 ? 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)'
      : 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
    transition: 'all 0.3s',
  };

  const shieldStyle: React.CSSProperties = {
    position: 'absolute',
    [vertical ? 'bottom' : 'left']: '0',
    [vertical ? 'height' : 'width']: `${Math.min((shield / max) * 100, 100)}%`,
    [vertical ? 'width' : 'height']: '100%',
    background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
    opacity: 0.7,
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyle}>
      {label && (
        <span style={{ fontSize: '14px', fontWeight: 'bold', minWidth: '60px' }}>
          {label}
        </span>
      )}
      <div style={barContainerStyle}>
        <div style={barStyle} />
        {shield > 0 && <div style={shieldStyle} />}
        <span style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '12px',
          fontWeight: 'bold',
          textShadow: '1px 1px 2px #000',
          color: '#fff',
        }}>
          {current}/{max}
        </span>
      </div>
      {rage > 0 && (
        <div style={{
          width: '60px',
          height: '8px',
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${rage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
            transition: 'width 0.3s',
          }} />
        </div>
      )}
    </div>
  );
};
