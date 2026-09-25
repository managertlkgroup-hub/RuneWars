// RUNE WARS — рендерер игрового поля на canvas

import type { Gem, GemColor } from "../battle/types";
import type { BoardEngine } from "../battle/BoardEngine";
import { BOARD_SIZE, GEM_COLOR_HEX } from "../content/balance";
import { ParticlePool } from "./VFX";

export class BoardRenderer {
  ctx: CanvasRenderingContext2D | null = null;
  engine: BoardEngine;
  particles: ParticlePool;
  bgGradient: CanvasGradient | null = null;
  shake = 0;
  shakeIntensity = 0;
  // для фоновых "рун" — декоративные плавающие частицы фона
  private bgParticles: { x: number; y: number; vy: number; size: number; alpha: number; hue: string }[] = [];

  constructor(ctx: CanvasRenderingContext2D | null, engine: BoardEngine, particles: ParticlePool) {
    this.ctx = ctx;
    this.engine = engine;
    this.particles = particles;
    for (let i = 0; i < 26; i++) {
      this.bgParticles.push({
        x: Math.random(),
        y: Math.random(),
        vy: 0.01 + Math.random() * 0.03,
        size: 1 + Math.random() * 2.5,
        alpha: 0.1 + Math.random() * 0.3,
        hue: Math.random() < 0.5 ? "#c9a227" : "#6a4a9a",
      });
    }
  }

  addShake(intensity: number) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shake = 0.3;
  }

  render(canvasW: number, canvasH: number, dt: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    // тряска экрана
    let sx = 0,
      sy = 0;
    if (this.shake > 0) {
      this.shake -= dt;
      const s = this.shakeIntensity * Math.max(0, this.shake / 0.3);
      sx = (Math.random() - 0.5) * s * 2;
      sy = (Math.random() - 0.5) * s * 2;
      if (this.shake <= 0) this.shakeIntensity = 0;
    }
    ctx.save();
    ctx.translate(sx, sy);

    this.renderBackground(canvasW, canvasH, dt);
    this.renderBoardFrame();
    this.renderCells();
    this.renderGems();
    this.particles.render(ctx);
    this.renderSelection();

    ctx.restore();
  }

  private renderBackground(canvasW: number, canvasH: number, dt: number) {
    const ctx = this.ctx;
    // тёмный градиент фона
    const grad = ctx.createRadialGradient(
      canvasW / 2,
      canvasH / 2,
      0,
      canvasW / 2,
      canvasH / 2,
      Math.max(canvasW, canvasH) * 0.8
    );
    grad.addColorStop(0, "#1a0f2e");
    grad.addColorStop(0.6, "#0e0820");
    grad.addColorStop(1, "#070510");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // декоративные плавающие частицы (пыль/прун)
    for (const p of this.bgParticles) {
      p.y -= p.vy * dt;
      if (p.y < 0) {
        p.y = 1;
        p.x = Math.random();
      }
      const x = p.x * canvasW;
      const y = p.y * canvasH;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.hue;
      ctx.shadowColor = p.hue;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // виньетка
    const vig = ctx.createRadialGradient(
      canvasW / 2,
      canvasH / 2,
      canvasH * 0.3,
      canvasW / 2,
      canvasH / 2,
      canvasH * 0.9
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  private renderBoardFrame() {
    const ctx = this.ctx;
    const { originX, originY, cellSize, boardW, boardH } = this.engine.metrics;
    // подложка поля
    ctx.save();
    ctx.fillStyle = "rgba(8,5,18,0.85)";
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(201,162,39,0.5)";
    ctx.shadowBlur = 18;
    this.roundRect(ctx, originX - 8, originY - 8, boardW + 16, boardH + 16, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // клеточная сетка
    ctx.save();
    ctx.strokeStyle = "rgba(58,42,90,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= BOARD_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(originX + i * cellSize, originY);
      ctx.lineTo(originX + i * cellSize, originY + boardH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(originX, originY + i * cellSize);
      ctx.lineTo(originX + boardW, originY + i * cellSize);
      ctx.stroke();
    }
    // внутренние тёмные клетки в шахматном порядке
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.02)";
          ctx.fillRect(originX + c * cellSize, originY + r * cellSize, cellSize, cellSize);
        }
      }
    }
    ctx.restore();
  }

  private renderCells() {
    // Можно отрисовать декоративные слоты — пока пропустим, гемы сами дают форму
  }

  private renderGems() {
    const ctx = this.ctx;
    const grid = this.engine.grid;
    // Сначала отрисовываем idle/swapping, потом removing сверху для блеска
    const removing: Gem[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const g = grid[r][c];
        if (!g) continue;
        if (g.state === "removing" || g.state === "matched") {
          removing.push(g);
          continue;
        }
        this.drawGem(g);
      }
    }
    for (const g of removing) this.drawGem(g);
  }

  private drawGem(gem: Gem) {
    const ctx = this.ctx;
    const { cellSize } = this.engine.metrics;
    const color = GEM_COLOR_HEX[gem.color];
    const size = cellSize * 0.74;
    // пульсация для selected
    let pulseScale = 1;
    if (gem.state === "selected") {
      pulseScale = 1 + Math.sin(gem.pulse * Math.PI * 2 / 0.18) * 0.05 + 0.05;
    }
    const s = size * gem.scale * pulseScale;
    if (s <= 0.5) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, gem.alpha));
    ctx.translate(gem.px, gem.py);
    ctx.rotate(gem.rot);

    // свечение под камнем
    ctx.save();
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = gem.state === "selected" ? 22 : 14;
    ctx.globalAlpha *= gem.state === "selected" ? 1 : 0.85;
    ctx.fillStyle = color.glow;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // основной кристалл — огранённый ромб с фацетами
    this.drawFacetedGem(ctx, s, gem.color);

    ctx.restore();
  }

  private drawFacetedGem(ctx: CanvasRenderingContext2D, size: number, colorIdx: GemColor) {
    const color = GEM_COLOR_HEX[colorIdx];
    const r = size / 2;
    // форма: ромб с 6 гранями (бриллиант)
    // Точки огранки (вид сверху):
    //    top
    //  L_mid  R_mid
    //  L_low   R_low
    //    bottom
    const points = {
      top: { x: 0, y: -r },
      midL: { x: -r * 0.9, y: -r * 0.15 },
      midR: { x: r * 0.9, y: -r * 0.15 },
      lowL: { x: -r * 0.6, y: r * 0.3 },
      lowR: { x: r * 0.6, y: r * 0.3 },
      bot: { x: 0, y: r },
    };

    // внешняя тёмная обводка-контур
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points.top.x, points.top.y);
    ctx.lineTo(points.midR.x, points.midR.y);
    ctx.lineTo(points.lowR.x, points.lowR.y);
    ctx.lineTo(points.bot.x, points.bot.y);
    ctx.lineTo(points.lowL.x, points.lowL.y);
    ctx.lineTo(points.midL.x, points.midL.y);
    ctx.closePath();
    // основная заливка с вертикальным градиентом
    const grad = ctx.createLinearGradient(0, -r, 0, r);
    grad.addColorStop(0, color.light);
    grad.addColorStop(0.45, color.base);
    grad.addColorStop(1, color.dark);
    ctx.fillStyle = grad;
    ctx.fill();
    // контур
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.strokeStyle = "#0a0718";
    ctx.stroke();
    ctx.restore();

    // верхняя левая грань — светлый блик
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points.top.x, points.top.y);
    ctx.lineTo(points.midL.x, points.midL.y);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, points.midR.y);
    ctx.closePath();
    const hlGrad = ctx.createLinearGradient(-r * 0.5, -r, 0, 0);
    hlGrad.addColorStop(0, "rgba(255,255,255,0.55)");
    hlGrad.addColorStop(1, "rgba(255,255,255,0.05)");
    ctx.fillStyle = hlGrad;
    ctx.fill();
    ctx.restore();

    // правая нижняя грань — тень
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(points.midR.x, points.midR.y);
    ctx.lineTo(points.lowR.x, points.lowR.y);
    ctx.lineTo(points.bot.x, points.bot.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();
    ctx.restore();

    // линии огранки (внутренние рёбра)
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(points.midL.x, points.midL.y);
    ctx.lineTo(0, 0);
    ctx.lineTo(points.midR.x, points.midR.y);
    ctx.moveTo(0, 0);
    ctx.lineTo(points.lowL.x, points.lowL.y);
    ctx.moveTo(0, 0);
    ctx.lineTo(points.lowR.x, points.lowR.y);
    ctx.moveTo(0, 0);
    ctx.lineTo(points.bot.x, points.bot.y);
    ctx.stroke();
    ctx.restore();

    // маленький блик-звезда сверху
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.5, r * 0.08, r * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderSelection() {
    // выделенную клетку подсветим рамкой
    if (!this.engine.selected) return;
    const ctx = this.ctx;
    const { row, col } = this.engine.selected;
    const { originX, originY, cellSize } = this.engine.metrics;
    const x = originX + col * cellSize;
    const y = originY + row * cellSize;
    const t = performance.now() / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = `rgba(244, 211, 106, ${0.5 + 0.4 * pulse})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(244,211,106,0.7)";
    ctx.shadowBlur = 12;
    this.roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 6);
    ctx.stroke();
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
