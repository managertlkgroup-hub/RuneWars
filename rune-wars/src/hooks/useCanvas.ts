import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../game/core/store';

export const useCanvas = (renderCallback: (ctx: CanvasRenderingContext2D, width: number, height: number) => void) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      // Clear
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render
      renderCallback(ctx, canvas.width, canvas.height);

      // Update particles
      const state = useGameStore.getState();
      const newParticles = state.particles
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // gravity
          life: p.life - 0.02,
        }))
        .filter(p => p.life > 0);

      if (newParticles.length !== state.particles.length) {
        useGameStore.setState({ particles: newParticles });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderCallback]);

  return canvasRef;
};
