// RUNE WARS — система частиц (пул 200, макс 100 активных одновременно)

export type ParticleType = "spark" | "magic" | "star" | "smoke" | "explosion" | "combo";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;
  rot: number;
  vrot: number;
  active: boolean;
  gravity: number;
  fade: number;
}

const POOL_SIZE = 200;
const MAX_ACTIVE = 100;

export class ParticlePool {
  pool: Particle[] = [];
  private activeCount = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 4,
        color: "#fff",
        type: "spark",
        rot: 0,
        vrot: 0,
        active: false,
        gravity: 0,
        fade: 1,
      });
    }
  }

  /** Найти свободную частицу. */
  private findFree(): Particle | null {
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    return null;
  }

  spawn(
    x: number,
    y: number,
    opts: Partial<Particle> & { type?: ParticleType; color?: string } = {}
  ): void {
    if (this.activeCount >= MAX_ACTIVE) return;
    const p = this.findFree();
    if (!p) return;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = opts.vx ?? 0;
    p.vy = opts.vy ?? 0;
    p.maxLife = opts.maxLife ?? 0.6;
    p.life = p.maxLife;
    p.size = opts.size ?? 4;
    p.color = opts.color ?? "#ffffff";
    p.type = opts.type ?? "spark";
    p.rot = opts.rot ?? Math.random() * Math.PI * 2;
    p.vrot = opts.vrot ?? (Math.random() - 0.5) * 6;
    p.gravity = opts.gravity ?? 0;
    p.fade = opts.fade ?? 1;
    this.activeCount++;
  }

  /** Взрыв частиц вокруг точки. */
  burst(
    x: number,
    y: number,
    count: number,
    color: string,
    type: ParticleType = "spark",
    speed = 220,
    size = 4
  ) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const sp = speed * (0.6 + Math.random() * 0.7);
      this.spawn(x, y, {
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp,
        maxLife: 0.5 + Math.random() * 0.4,
        size: size * (0.7 + Math.random() * 0.6),
        color,
        type,
        gravity: 480,
      });
    }
  }

  update(dt: number) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.activeCount--;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const t = p.life / p.maxLife; // 1 -> 0
      const alpha = Math.max(0, Math.min(1, t * p.fade));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const sz = p.size * (0.4 + 0.6 * t);
      if (p.type === "spark" || p.type === "explosion") {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      } else if (p.type === "magic") {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, sz / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "star") {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        this.drawStar(ctx, 0, 0, 5, sz / 2, sz / 4);
        ctx.fill();
      } else if (p.type === "smoke") {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, sz / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "combo") {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, sz / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outer: number,
    inner: number
  ) {
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outer);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
      rot += step;
    }
    ctx.lineTo(cx, cy - outer);
    ctx.closePath();
  }

  get count() {
    return this.activeCount;
  }

  clear() {
    for (const p of this.pool) p.active = false;
    this.activeCount = 0;
  }
}
