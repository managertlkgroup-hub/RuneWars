// RUNE WARS — рендерер героя и врага на canvas + всплывающие числа

import type { BattleEngine } from "../battle/BattleEngine";
import type { ParticlePool } from "./VFX";
import { AssetLoader } from "../core/AssetLoader";
import { GEM_COLOR_HEX } from "../content/balance";

interface FloatNum {
  value: number;
  kind: "damage" | "heal" | "shield" | "rage" | "enemyDamage" | "miss";
  side: "hero" | "enemy";
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
}

// расположение панелей героя/врага (синхронно с BattleScreen)
const HERO_X = 184;
const HERO_Y = 300;
const ENEMY_X = 968;
const ENEMY_Y = 300;
const PORTRAIT_W = 220;
const PORTRAIT_H = 200;

export class CharacterRenderer {
  ctx: CanvasRenderingContext2D | null = null;
  battle: BattleEngine;
  particles: ParticlePool;
  floats: FloatNum[] = [];

  // состояние визуала для анимаций
  heroHitFlash = 0;
  enemyHitFlash = 0;
  heroAttackLunge = 0;
  enemyAttackLunge = 0;

  constructor(battle: BattleEngine, particles: ParticlePool) {
    this.battle = battle;
    this.particles = particles;
  }

  spawnFloat(side: "hero" | "enemy", value: number, kind: FloatNum["kind"]) {
    const x = side === "hero" ? HERO_X : ENEMY_X + (Math.random() - 0.5) * 60;
    const y = side === "hero" ? HERO_Y - 60 : ENEMY_Y - 60;
    this.floats.push({
      value,
      kind,
      side,
      x,
      y,
      vy: -42,
      life: 1.0,
      maxLife: 1.0,
      scale: kind === "enemyDamage" ? 1.4 : 1.0,
    });
    if (this.floats.length > 40) this.floats.shift();
  }

  triggerHeroHit() {
    this.heroHitFlash = 0.35;
  }
  triggerEnemyHit() {
    this.enemyHitFlash = 0.35;
  }
  triggerHeroAttack() {
    this.heroAttackLunge = 0.25;
  }
  triggerEnemyAttack() {
    this.enemyAttackLunge = 0.3;
  }

  render(canvasW: number, canvasH: number, dt: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.heroHitFlash = Math.max(0, this.heroHitFlash - dt);
    this.enemyHitFlash = Math.max(0, this.enemyHitFlash - dt);
    this.heroAttackLunge = Math.max(0, this.heroAttackLunge - dt);
    this.enemyAttackLunge = Math.max(0, this.enemyAttackLunge - dt);

    // герой слева
    this.renderCharacter("hero", HERO_X, HERO_Y);
    // враг справа
    this.renderCharacter("enemy", ENEMY_X, ENEMY_Y);

    // полоски
    this.renderHeroBars();
    this.renderEnemyBar();

    // всплывающие числа
    this.renderFloats(dt);
  }

  private renderCharacter(side: "hero" | "enemy", cx: number, cy: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const hero = this.battle.hero;
    const enemy = this.battle.enemy;
    const def = side === "hero" ? hero.def : enemy.def;
    const isDead = side === "hero" ? hero.isDead() : enemy.isDead();

    // лёгкий лёрг/выпад при атаке
    const lunge =
      side === "hero" ? this.heroAttackLunge : this.enemyAttackLunge;
    const offsetX = side === "hero" ? lunge * 30 : -lunge * 30;
    ctx.save();
    ctx.translate(cx + offsetX, cy);

    // подставка-пьедестал
    ctx.save();
    const ped = ctx.createRadialGradient(0, PORTRAIT_H / 2 + 20, 0, 0, PORTRAIT_H / 2 + 20, PORTRAIT_W / 1.6);
    ped.addColorStop(0, side === "hero" ? "rgba(201,162,39,0.35)" : "rgba(139,26,26,0.35)");
    ped.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ped;
    ctx.beginPath();
    ctx.ellipse(0, PORTRAIT_H / 2 + 18, PORTRAIT_W / 1.6, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // вспышка при попадании
    const flash = side === "hero" ? this.heroHitFlash : this.enemyHitFlash;
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = (flash / 0.35) * 0.7;
      ctx.fillStyle = side === "hero" ? "#ff3333" : "#ffeebb";
      ctx.shadowColor = side === "hero" ? "#ff3333" : "#ffaa22";
      ctx.shadowBlur = 30;
      ctx.fillRect(-PORTRAIT_W / 2 - 10, -PORTRAIT_H / 2 - 10, PORTRAIT_W + 20, PORTRAIT_H + 20);
      ctx.restore();
    }

    // рамка портрета
    ctx.save();
    ctx.strokeStyle = side === "hero" ? "#c9a227" : "#8b1a1a";
    ctx.lineWidth = 3;
    ctx.shadowColor = side === "hero" ? "rgba(201,162,39,0.6)" : "rgba(139,26,26,0.6)";
    ctx.shadowBlur = 16;
    this.roundRect(ctx, -PORTRAIT_W / 2, -PORTRAIT_H / 2, PORTRAIT_W, PORTRAIT_H, 12);
    ctx.fillStyle = "rgba(8,5,18,0.85)";
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (!isDead) {
      // PNG-спрайт с fallback на процедурный
      let sprite: HTMLImageElement | null = null;
      if (side === "hero") {
        sprite = AssetLoader.getHero(def.mechanicId);
      } else {
        sprite = AssetLoader.getEnemy(def.archetype);
      }
      if (sprite) {
        ctx.save();
        ctx.drawImage(sprite, -PORTRAIT_W / 2, -PORTRAIT_H / 2, PORTRAIT_W, PORTRAIT_H);
        ctx.restore();
      } else if (side === "hero") {
        this.drawWarrior(ctx, def.palette);
      } else {
        this.drawEnemy(ctx, def.palette, def.archetype, enemy.def.isBoss);
      }
    } else {
      // могильный камень / X
      ctx.save();
      ctx.fillStyle = "#3a2a4a";
      ctx.font = "bold 64px var(--font-pixel)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("X", 0, 0);
      ctx.restore();
    }

    // имя
    ctx.save();
    ctx.fillStyle = side === "hero" ? "#f4d36a" : "#ff8866";
    ctx.font = "11px var(--font-pixel), monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.fillText(def.name.toUpperCase(), 0, PORTRAIT_H / 2 + 36);
    ctx.restore();

    ctx.restore();
  }

  // процедурный герой-воин
  private drawWarrior(
    ctx: CanvasRenderingContext2D,
    p: { body: string; accent: string; eye: string; cape: string }
  ) {
    const w = PORTRAIT_W * 0.7;
    const h = PORTRAIT_H * 0.85;
    // плащ
    ctx.save();
    ctx.fillStyle = p.cape;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -h / 2 + 18);
    ctx.lineTo(-w / 2 - 10, h / 2 - 10);
    ctx.lineTo(w / 2 + 10, h / 2 - 10);
    ctx.lineTo(w / 2 - 4, -h / 2 + 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // тело (броня)
    ctx.save();
    ctx.fillStyle = p.body;
    this.roundRect(ctx, -w / 3, -10, (w * 2) / 3, h / 2, 6);
    ctx.fill();
    // акцент — наплечники
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(-w / 3, -10, 14, 0, Math.PI * 2);
    ctx.arc(w / 3, -10, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // голова
    ctx.save();
    ctx.fillStyle = "#e8c8a8";
    ctx.beginPath();
    ctx.arc(0, -h / 4 - 8, 22, 0, Math.PI * 2);
    ctx.fill();
    // шлем
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(0, -h / 4 - 10, 22, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-22, -h / 4 - 10, 44, 4);
    // нос
    ctx.fillStyle = "#1a0a1e";
    ctx.fillRect(-2, -h / 4 - 4, 4, 8);
    ctx.restore();

    // глаза
    ctx.save();
    ctx.fillStyle = p.eye;
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 6;
    ctx.fillRect(-9, -h / 4 - 2, 5, 4);
    ctx.fillRect(4, -h / 4 - 2, 5, 4);
    ctx.restore();

    // меч в правой руке
    ctx.save();
    ctx.translate(w / 3 + 6, 6);
    ctx.rotate(-0.3);
    ctx.fillStyle = "#d8d8e8";
    ctx.fillRect(-3, -40, 6, 50);
    ctx.fillStyle = p.accent;
    ctx.fillRect(-7, 8, 14, 5);
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(-2, 13, 4, 14);
    ctx.restore();

    // щит слева
    ctx.save();
    ctx.translate(-w / 3 - 6, 4);
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(16, -18);
    ctx.lineTo(14, 16);
    ctx.lineTo(0, 26);
    ctx.lineTo(-14, 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // процедурный враг по архетипу
  private drawEnemy(
    ctx: CanvasRenderingContext2D,
    p: { body: string; accent: string; eye: string },
    archetype: string,
    isBoss: boolean
  ) {
    const scale = isBoss ? 1.15 : 1.0;
    ctx.save();
    ctx.scale(scale, scale);

    if (archetype.includes("goblin")) {
      this.drawGoblin(ctx, p);
    } else if (archetype.includes("skeleton") || archetype === "lich") {
      this.drawSkeleton(ctx, p, archetype === "lich");
    } else if (archetype.includes("slime") || archetype === "bone_slime") {
      this.drawSlime(ctx, p);
    } else if (archetype.includes("golem") || archetype === "stone_golem") {
      this.drawGolem(ctx, p);
    } else if (
      archetype.includes("shadow") ||
      archetype === "ghost" ||
      archetype === "dark_priest"
    ) {
      this.drawShadow(ctx, p, archetype === "dark_priest");
    } else if (
      archetype.includes("demon") ||
      archetype.includes("fire") ||
      archetype.includes("magma") ||
      archetype.includes("infernal") ||
      archetype === "ancient_master"
    ) {
      this.drawDemon(ctx, p, archetype === "ancient_master");
    } else {
      this.drawGoblin(ctx, p);
    }
    ctx.restore();
  }

  private drawGoblin(ctx: CanvasRenderingContext2D, p: { body: string; accent: string; eye: string }) {
    const h = PORTRAIT_H * 0.7;
    // тело
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.ellipse(0, h / 6, 38, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    // голова
    ctx.beginPath();
    ctx.ellipse(0, -h / 4, 30, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // уши
    ctx.beginPath();
    ctx.moveTo(-28, -h / 4 - 8);
    ctx.lineTo(-44, -h / 4 - 24);
    ctx.lineTo(-26, -h / 4 + 4);
    ctx.closePath();
    ctx.moveTo(28, -h / 4 - 8);
    ctx.lineTo(44, -h / 4 - 24);
    ctx.lineTo(26, -h / 4 + 4);
    ctx.closePath();
    ctx.fill();
    // глаза
    ctx.fillStyle = p.eye;
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-10, -h / 4 - 2, 4, 0, Math.PI * 2);
    ctx.arc(10, -h / 4 - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // зубы
    ctx.fillStyle = "#e8dcc0";
    ctx.fillRect(-6, -h / 4 + 8, 3, 6);
    ctx.fillRect(3, -h / 4 + 8, 3, 6);
    // пояс-акцент
    ctx.fillStyle = p.accent;
    ctx.fillRect(-30, h / 6 - 6, 60, 6);
  }

  private drawSkeleton(ctx: CanvasRenderingContext2D, p: { body: string; accent: string; eye: string }, isLich: boolean) {
    const h = PORTRAIT_H * 0.78;
    // череп
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.ellipse(0, -h / 5, 26, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    // челюсть
    ctx.fillRect(-16, -h / 5 + 14, 32, 12);
    // глазницы
    ctx.fillStyle = "#1a0a1e";
    ctx.beginPath();
    ctx.arc(-10, -h / 5 - 2, 7, 0, Math.PI * 2);
    ctx.arc(10, -h / 5 - 2, 7, 0, Math.PI * 2);
    ctx.fill();
    // светящиеся глаза
    ctx.fillStyle = p.eye;
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(-10, -h / 5 - 2, 3, 0, Math.PI * 2);
    ctx.arc(10, -h / 5 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // зубы
    ctx.fillStyle = p.body;
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 5 - 2, -h / 5 + 12, 3, 6);
    // рёбра
    ctx.strokeStyle = p.body;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, h / 8 + i * 14, 16 + i * 2, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
    // позвоночник
    ctx.beginPath();
    ctx.moveTo(0, -h / 5 + 14);
    ctx.lineTo(0, h / 4);
    ctx.stroke();
    // капюшон для лича
    if (isLich) {
      ctx.fillStyle = p.accent;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(-30, -h / 4);
      ctx.quadraticCurveTo(-44, -h / 2, 0, -h / 2 - 6);
      ctx.quadraticCurveTo(44, -h / 2, 30, -h / 4);
      ctx.lineTo(28, h / 3);
      ctx.lineTo(-28, h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawSlime(ctx: CanvasRenderingContext2D, p: { body: string; accent: string; eye: string }) {
    const h = PORTRAIT_H * 0.55;
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(-40, h / 2);
    ctx.quadraticCurveTo(-44, -h / 2, 0, -h / 2 - 6);
    ctx.quadraticCurveTo(44, -h / 2, 40, h / 2);
    ctx.closePath();
    ctx.fill();
    // блик
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(-14, -h / 4, 10, 14, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // глаза
    ctx.fillStyle = p.eye;
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-12, 4, 5, 0, Math.PI * 2);
    ctx.arc(12, 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // рот
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 18, 8, 0, Math.PI);
    ctx.stroke();
  }

  private drawGolem(ctx: CanvasRenderingContext2D, p: { body: string; accent: string; eye: string }) {
    const h = PORTRAIT_H * 0.8;
    // тело-глыба
    ctx.fillStyle = p.body;
    this.roundRect(ctx, -44, -h / 3, 88, h * 0.75, 8);
    ctx.fill();
    // голова
    this.roundRect(ctx, -26, -h / 2, 52, 36, 6);
    ctx.fill();
    // трещины-акцент
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, -10);
    ctx.lineTo(-10, 6);
    ctx.lineTo(-20, 18);
    ctx.moveTo(20, -8);
    ctx.lineTo(8, 10);
    ctx.stroke();
    // глаза
    ctx.fillStyle = p.eye;
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 14;
    ctx.fillRect(-14, -h / 2 + 10, 8, 8);
    ctx.fillRect(6, -h / 2 + 10, 8, 8);
    ctx.shadowBlur = 0;
    // руки-глыбы
    ctx.fillStyle = p.body;
    this.roundRect(ctx, -64, -h / 6, 18, 40, 6);
    this.roundRect(ctx, 46, -h / 6, 18, 40, 6);
    ctx.fill();
  }

  private drawShadow(ctx: CanvasRenderingContext2D, p: { body: string; accent: string; eye: string }, isPriest: boolean) {
    const h = PORTRAIT_H * 0.78;
    // тело-туман
    ctx.fillStyle = p.body;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-32, h / 2);
    ctx.quadraticCurveTo(-48, -h / 4, -20, -h / 2);
    ctx.quadraticCurveTo(0, -h / 2 - 10, 20, -h / 2);
    ctx.quadraticCurveTo(48, -h / 4, 32, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // глаза
    ctx.fillStyle = p.eye;
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(-10, -h / 4, 5, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(10, -h / 4, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // митра/корона для жреца
    if (isPriest) {
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.moveTo(-16, -h / 2 - 4);
      ctx.lineTo(0, -h / 2 - 24);
      ctx.lineTo(16, -h / 2 - 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawDemon(ctx: CanvasRenderingContext2D, p: { body: string; accent: string; eye: string }, isMaster: boolean) {
    const h = PORTRAIT_H * 0.82;
    // тело
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.ellipse(0, h / 6, 40, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    // голова
    ctx.beginPath();
    ctx.ellipse(0, -h / 5, 32, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    // рога
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(-22, -h / 5 - 14);
    ctx.lineTo(-34, -h / 5 - 38);
    ctx.lineTo(-16, -h / 5 - 18);
    ctx.closePath();
    ctx.moveTo(22, -h / 5 - 14);
    ctx.lineTo(34, -h / 5 - 38);
    ctx.lineTo(16, -h / 5 - 18);
    ctx.closePath();
    ctx.fill();
    // глаза
    ctx.fillStyle = p.eye;
    ctx.shadowColor = p.eye;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(-11, -h / 5 - 2, 5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(11, -h / 5 - 2, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // пасть
    ctx.fillStyle = "#1a0a1e";
    ctx.beginPath();
    ctx.arc(0, -h / 5 + 14, 9, 0, Math.PI);
    ctx.fill();
    // клыки
    ctx.fillStyle = "#e8dcc0";
    ctx.beginPath();
    ctx.moveTo(-6, -h / 5 + 14);
    ctx.lineTo(-4, -h / 5 + 22);
    ctx.lineTo(-2, -h / 5 + 14);
    ctx.moveTo(6, -h / 5 + 14);
    ctx.lineTo(4, -h / 5 + 22);
    ctx.lineTo(2, -h / 5 + 14);
    ctx.fill();
    // корона мастера
    if (isMaster) {
      ctx.fillStyle = p.accent;
      ctx.shadowColor = p.accent;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const x = i * 10;
        ctx.moveTo(x - 4, -h / 5 - 22);
        ctx.lineTo(x, -h / 5 - 38);
        ctx.lineTo(x + 4, -h / 5 - 22);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private renderHeroBars() {
    const ctx = this.ctx;
    if (!ctx) return;
    const s = this.battle.snapshot();
    const x = HERO_X - PORTRAIT_W / 2;
    const y = HERO_Y - PORTRAIT_H / 2 - 56;
    // HP
    this.drawBar(x, y, PORTRAIT_W, 14, s.heroHp, s.heroMaxHp, "#e23b3b", "#8b1a1a", "HP");
    // щит (золотой, поверх)
    if (s.heroShield > 0) {
      this.drawBar(
        x,
        y + 18,
        PORTRAIT_W,
        8,
        s.heroShield,
        50,
        "#7fb0ff",
        "#1a4a8b",
        "ЩИТ"
      );
    }
    // ярость (жёлтый)
    this.drawBar(x, y + 30, PORTRAIT_W, 8, s.heroRage, 60, "#f4d36a", "#8b7a1a", "ЯР");
    // индикатор готовности ярость-удара
    if (s.heroRageStrikeReady) {
      ctx.save();
      ctx.fillStyle = "#f4d36a";
      ctx.shadowColor = "#f4d36a";
      ctx.shadowBlur = 12;
      ctx.font = "9px var(--font-pixel), monospace";
      ctx.textAlign = "center";
      ctx.fillText("УЛЬТА ×2 ГОТОВА", HERO_X, y - 8);
      ctx.restore();
    }
  }

  private renderEnemyBar() {
    const ctx = this.ctx;
    if (!ctx) return;
    const s = this.battle.snapshot();
    const x = ENEMY_X - PORTRAIT_W / 2;
    const y = ENEMY_Y - PORTRAIT_H / 2 - 36;
    this.drawBar(
      x,
      y,
      PORTRAIT_W,
      s.enemyIsBoss ? 18 : 14,
      s.enemyHp,
      s.enemyMaxHp,
      s.enemyIsBoss ? "#c9a227" : "#8b1a1a",
      s.enemyIsBoss ? "#8b6a14" : "#4a0a0a",
      s.enemyIsBoss ? "БОСС" : "HP"
    );
    // отсчёт до атаки
    ctx.save();
    ctx.fillStyle = s.enemyAttackIn <= 1 ? "#ff3333" : "#f4d36a";
    ctx.font = "9px var(--font-pixel), monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.fillText(`АТАКА ЧЕРЕЗ ${s.enemyAttackIn}`, ENEMY_X, y - 8);
    ctx.restore();
  }

  private drawBar(
    x: number,
    y: number,
    w: number,
    h: number,
    value: number,
    max: number,
    color: string,
    dark: string,
    label: string
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const pct = Math.max(0, Math.min(1, value / max));
    ctx.save();
    ctx.fillStyle = "#0a0718";
    this.roundRect(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.strokeStyle = "#3a2a5a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (pct > 0) {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, dark);
      ctx.fillStyle = grad;
      this.roundRect(ctx, x + 1, y + 1, (w - 2) * pct, h - 2, 2);
      ctx.fill();
      // блик
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(x + 1, y + 1, (w - 2) * pct, Math.max(1, h / 3));
    }
    // label
    ctx.fillStyle = "rgba(232,220,192,0.9)";
    ctx.font = `${Math.max(7, h - 5)}px var(--font-pixel), monospace`;
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 3;
    ctx.fillText(label, x + 4, y + h - 3);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(value)}`, x + w - 4, y + h - 3);
    ctx.restore();
  }

  private renderFloats(dt: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.floats.splice(i, 1);
        continue;
      }
      f.y += f.vy * dt;
      f.vy += 30 * dt; // лёгкое замедление
      const t = f.life / f.maxLife;
      const alpha = t < 0.3 ? t / 0.3 : 1;
      const scale = f.scale * (1 + (1 - t) * 0.3);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(f.x, f.y);
      ctx.scale(scale, scale);
      let color = "#ffffff";
      let prefix = "";
      switch (f.kind) {
        case "enemyDamage":
          color = "#ffdd44";
          prefix = "-";
          break;
        case "damage":
          color = "#ff5555";
          prefix = f.value > 0 ? "-" : "";
          break;
        case "heal":
          color = "#7fff9f";
          prefix = "+";
          break;
        case "shield":
          color = "#7fb0ff";
          prefix = "+";
          break;
        case "rage":
          color = "#f4d36a";
          prefix = "+";
          break;
        case "miss":
          color = "#aaaaaa";
          prefix = "";
          break;
      }
      ctx.fillStyle = color;
      ctx.strokeStyle = "#1a0a1e";
      ctx.lineWidth = 4;
      ctx.font = "bold 22px var(--font-pixel), monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      const text =
        f.kind === "miss" ? "ПРОМАХ" : `${prefix}${Math.round(f.value)}`;
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
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

  clear() {
    this.floats = [];
  }
}

export { HERO_X, HERO_Y, ENEMY_X, ENEMY_Y, PORTRAIT_W, PORTRAIT_H };
