// RUNE WARS — хук для canvas + игровой цикл requestAnimationFrame с delta-time

import { useEffect, useRef } from "react";

interface CanvasLoopOpts {
  width: number;
  height: number;
  onUpdate: (dt: number) => void;
  onRender: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void;
}

export function useCanvasLoop(opts: CanvasLoopOpts) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const loopRef = useRef<() => void>(() => {});

  // держим свежие колбэки в рефе, обновляем в эффекте (после каждого рендера)
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  useEffect(() => {
    // назначаем функцию цикла
    loopRef.current = () => {
      const now = performance.now();
      const last = lastTimeRef.current || now;
      let dt = (now - last) / 1000;
      if (dt > 0.1) dt = 0.1; // защита от больших скачков (вкладка была неактивна)
      lastTimeRef.current = now;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          optsRef.current.onUpdate(dt);
          optsRef.current.onRender(ctx, optsRef.current.width, optsRef.current.height, dt);
        }
      }
      rafRef.current = requestAnimationFrame(loopRef.current);
    };
    rafRef.current = requestAnimationFrame(loopRef.current);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return canvasRef;
}
