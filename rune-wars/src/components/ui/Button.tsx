import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary',
  disabled = false 
}) => {
  const baseStyles: React.CSSProperties = {
    padding: '12px 32px',
    fontSize: '18px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderRadius: '4px',
    transition: 'all 0.2s',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #c9a227 0%, #8b6914 100%)',
      color: '#fff',
      border: '2px solid #ffd700',
      boxShadow: '0 4px 15px rgba(201, 162, 39, 0.4)',
    },
    secondary: {
      background: 'linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%)',
      color: '#ccc',
      border: '2px solid #666',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
    },
    danger: {
      background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
      color: '#fff',
      border: '2px solid #ff4444',
      boxShadow: '0 4px 15px rgba(196, 30, 58, 0.4)',
    },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...baseStyles, ...variants[variant] }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = e.currentTarget.style.boxShadow.replace('0.4', '0.6');
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </button>
  );
};
